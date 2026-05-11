import json
import os
import re
import time
from datetime import datetime, timezone
from uuid import uuid4

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app import agents

load_dotenv()

app = FastAPI(title="Orchestrator Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TASK_BASE_URL = os.getenv("TASK_BASE_URL", "http://task_service:8002").rstrip("/")
TASK_REQUEST_TIMEOUT = int(os.getenv("TASK_REQUEST_TIMEOUT", "20"))
MODEL_NAME = os.getenv("OLLAMA_MODEL") or "qwen3-coder:480b"

SMALL_TALK_RESPONSE = (
    "I am ready to help you with your Human-AI collaboration project. "
    "Please describe a software task when you want the AI team to assist."
)
ATTACHMENT_CONTEXT_LIMIT = int(os.getenv("ATTACHMENT_CONTEXT_LIMIT", "24000"))


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _task_request(method: str, path: str, **kwargs) -> dict:
    try:
        response = requests.request(
            method,
            f"{TASK_BASE_URL}{path}",
            timeout=TASK_REQUEST_TIMEOUT,
            **kwargs,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=status_code, detail=detail) from exc
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=503, detail=f"Task service unavailable: {exc}") from exc


def _safe_float(value, default=0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _count_generated_tests(tests_response: str) -> int:
    test_patterns = re.findall(r"\bdef\s+test_|\btest\(|\bit\(", tests_response or "")
    return len(test_patterns)


def _count_lines(*sections) -> int:
    total = 0
    for section in sections:
        if isinstance(section, dict):
            total += _count_lines(*section.values())
        elif isinstance(section, list):
            total += _count_lines(*section)
        elif section:
            total += len(str(section).splitlines())
    return total


def _prepare_attachments(attachments) -> tuple[list[dict], str]:
    prepared = []
    blocks = []
    used_chars = 0

    for attachment in attachments or []:
        if not isinstance(attachment, dict):
            continue

        filename = str(attachment.get("filename") or "attachment").strip()
        text = str(attachment.get("text") or "").strip()
        if not text:
            continue

        remaining = max(0, ATTACHMENT_CONTEXT_LIMIT - used_chars)
        if remaining <= 0:
            break

        truncated_text = text[:remaining].rstrip()
        used_chars += len(truncated_text)
        was_truncated = bool(attachment.get("truncated")) or len(text) > len(truncated_text)

        prepared.append(
            {
                "filename": filename,
                "content_type": attachment.get("content_type") or "",
                "size_bytes": _safe_int(attachment.get("size_bytes")),
                "text_characters": len(truncated_text),
                "truncated": was_truncated,
            }
        )
        blocks.append(
            "\n".join(
                [
                    f"Attachment: {filename}",
                    f"Characters extracted: {len(truncated_text)}",
                    "Extracted text:",
                    truncated_text,
                ]
            )
        )

    if not blocks:
        return prepared, ""

    return prepared, "\n\n---\n\n".join(blocks)


def _agent_context(goal: str, attachment_context: str = "") -> str:
    goal_text = str(goal or "").strip()
    if not attachment_context:
        return goal_text

    return (
        f"{goal_text}\n\n"
        "Attached document context for the AI agents. Use this content as supporting context, "
        "but keep the human approval workflow and do not assume the attachment is automatically correct.\n\n"
        f"{attachment_context}"
    )


def _task_agent_context(task: dict) -> str:
    return _agent_context(task.get("original_prompt", ""), task.get("attachment_context", ""))


def _classification_source(goal: str, attachment_context: str) -> str:
    goal_intent = _classify_intent(goal)
    if goal_intent != "unknown" or not attachment_context:
        return goal
    return _agent_context(goal, attachment_context[:4000])


def _classify_intent(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.lower()).strip(" .!?")

    small_talk_phrases = {
        "hi",
        "hello",
        "hey",
        "how are u",
        "how are you",
        "how are you doing",
        "ok",
        "okay",
        "thanks",
        "thank you",
        "good morning",
        "good evening",
        "what's up",
        "whats up",
    }
    if normalized in small_talk_phrases or len(normalized.split()) <= 2 and normalized in small_talk_phrases:
        return "small_talk"

    review_terms = ["review", "audit", "quality check", "security risk", "find bugs", "inspect this code"]
    test_terms = ["write tests", "generate tests", "pytest", "jest", "test plan", "validation strategy"]
    planning_terms = ["plan", "architecture", "roadmap", "design the system", "project planning"]
    explicit_code_terms = [
        "write code",
        "generate code",
        "implement this approved",
        "code this",
        "generate implementation",
    ]
    software_terms = [
        "api",
        "endpoint",
        "fastapi",
        "react",
        "mongodb",
        "database",
        "frontend",
        "backend",
        "login",
        "registration",
        "jwt",
        "app",
        "service",
        "component",
        "docker",
        "microservice",
        "function",
        "class",
    ]
    software_verbs = ["create", "build", "develop", "make", "add", "design", "fix"]

    if any(term in normalized for term in review_terms):
        return "code_review"
    if any(term in normalized for term in test_terms):
        return "test_generation"
    if any(term in normalized for term in planning_terms):
        return "project_planning"
    if any(term in normalized for term in explicit_code_terms):
        return "code_generation"
    if any(term in normalized for term in software_terms) and any(
        normalized.startswith(verb) or f" {verb} " in normalized for verb in software_verbs
    ):
        return "software_task"

    return "unknown"


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _record_event(
    task_id: str,
    actor_type: str,
    actor_name: str,
    action: str,
    content: str = "",
    duration_seconds: float = 0.0,
    metadata: dict | None = None,
) -> dict:
    return _task_request(
        "POST",
        "/events",
        json={
            "task_id": task_id,
            "actor_type": actor_type,
            "actor_name": actor_name,
            "action": action,
            "content": content,
            "timestamp": _utc_now(),
            "duration_seconds": duration_seconds,
            "metadata": metadata or {},
        },
    )


def _create_task(
    prompt: str,
    intent: str,
    status: str = "classified",
    message: str | None = None,
    attachments: list[dict] | None = None,
    attachment_context: str = "",
) -> dict:
    task = _task_request(
        "POST",
        "/tasks",
        json={
            "task_id": str(uuid4()),
            "original_prompt": prompt,
            "intent": intent,
            "status": status,
            "model": MODEL_NAME,
            "message": message,
            "attachments": attachments or [],
            "attachment_count": len(attachments or []),
            "attachment_context": attachment_context,
            "start_time": _utc_now(),
        },
    )
    _record_event(task["task_id"], "human", "User", "created_task", prompt)
    if attachments:
        attachment_names = ", ".join(item.get("filename", "attachment") for item in attachments)
        _record_event(
            task["task_id"],
            "human",
            "User",
            "attached_documents",
            attachment_names,
            metadata={"attachments": attachments},
        )
    _record_event(
        task["task_id"],
        "ai",
        "IntentRouter",
        "classified_intent",
        intent,
        metadata={"intent": intent},
    )
    return _get_task(task["task_id"])


def _get_task(task_id: str) -> dict:
    return _task_request("GET", f"/tasks/{task_id}")


def _update_task(task_id: str, updates: dict) -> dict:
    return _task_request("PATCH", f"/tasks/{task_id}", json=updates)


def _timed_agent_call(agent_name, agent_func, payload):
    started_at = time.perf_counter()
    result = agent_func(payload)
    response_text = result.get("response", "") if isinstance(result, dict) else str(result)
    metadata = result.get("metadata", {}) if isinstance(result, dict) else {}
    elapsed = round(time.perf_counter() - started_at, 3)

    metadata = {
        "agent": agent_name,
        **metadata,
    }

    return response_text, metadata, elapsed


def _metric_updates(task: dict, new_metadata: list[dict], outputs: dict) -> dict:
    existing_metadata = list(task.get("llm_metadata") or [])
    all_metadata = existing_metadata + new_metadata
    new_response_time = sum(_safe_float(item.get("response_time_seconds")) for item in new_metadata)
    new_cost = sum(_safe_float(item.get("estimated_cost")) for item in new_metadata)
    models = sorted({item.get("model") for item in all_metadata if item.get("model")})
    generated_lines = _count_lines(outputs)

    updates = {
        "llm_metadata": all_metadata,
        "ai_response_time_seconds": round(
            _safe_float(task.get("ai_response_time_seconds")) + new_response_time,
            3,
        ),
        "estimated_cost": round(_safe_float(task.get("estimated_cost")) + new_cost, 6),
        "model": ", ".join(models) if models else MODEL_NAME,
    }

    if generated_lines > 0:
        updates["ai_generated_lines"] = _safe_int(task.get("ai_generated_lines")) + generated_lines

    if outputs.get("tests"):
        updates["tests_total"] = _count_generated_tests(outputs.get("tests", ""))

    failed_metadata = [item for item in new_metadata if item.get("status") == "failed"]
    if failed_metadata:
        updates["error_message"] = "; ".join(
            item.get("error_message", "") for item in failed_metadata if item.get("error_message")
        )
        updates["status"] = "failed"

    return updates


def _run_agent_and_record(task: dict, agent_name: str, agent_func, payload, action: str) -> tuple[str, dict, dict]:
    output, metadata, elapsed = _timed_agent_call(agent_name, agent_func, payload)
    _record_event(
        task["task_id"],
        "ai",
        agent_name.title(),
        action,
        output,
        duration_seconds=elapsed,
        metadata=metadata,
    )
    return output, metadata, _metric_updates(task, [metadata], {agent_name: output})


def _plan_task(task: dict) -> dict:
    task = _update_task(task["task_id"], {"status": "ai_generating"})
    plan, metadata, metric_updates = _run_agent_and_record(
        task,
        "planner",
        agents.planner,
        _task_agent_context(task),
        "generated_plan",
    )
    updates = {
        **metric_updates,
        "plan": plan,
        "status": "waiting_human_approval",
        "plan_generated_at": _utc_now(),
        "message": "Plan generated. Waiting for human approval before implementation.",
    }
    if metadata.get("status") == "failed":
        updates["status"] = "failed"
    return _update_task(task["task_id"], updates)


def _generate_full_output(task: dict, payload: str | None = None) -> dict:
    task = _update_task(task["task_id"], {"status": "ai_generating"})
    approved_context = payload or task.get("plan") or _task_agent_context(task)
    if task.get("attachment_context") and payload:
        approved_context = (
            f"{approved_context}\n\n"
            "Original attachment context for implementation and validation:\n"
            f"{task.get('attachment_context')}"
        )

    code, developer_metadata, _ = _run_agent_and_record(
        task,
        "developer",
        agents.developer,
        approved_context,
        "generated_code",
    )
    refreshed_task = _get_task(task["task_id"])
    tests, tester_metadata, _ = _run_agent_and_record(
        refreshed_task,
        "tester",
        agents.tester,
        code,
        "generated_tests",
    )
    refreshed_task = _get_task(task["task_id"])
    review, reviewer_metadata, _ = _run_agent_and_record(
        refreshed_task,
        "reviewer",
        agents.reviewer,
        f"{code}\n\nTESTS:\n{tests}",
        "reviewed_code",
    )

    refreshed_task = _get_task(task["task_id"])
    metric_updates = _metric_updates(
        refreshed_task,
        [developer_metadata, tester_metadata, reviewer_metadata],
        {"code": code, "tests": tests, "review": review},
    )
    status = "failed" if metric_updates.get("status") == "failed" else "under_human_review"

    return _update_task(
        task["task_id"],
        {
            **metric_updates,
            "code": code,
            "tests": tests,
            "review": review,
            "status": status,
            "ai_output_generated_at": _utc_now(),
            "message": "AI output generated. Waiting for human review.",
        },
    )


def _run_single_agent_task(task: dict, agent_name: str, agent_func, payload: str, output_key: str, action: str) -> dict:
    task = _update_task(task["task_id"], {"status": "ai_generating"})
    output, metadata, metric_updates = _run_agent_and_record(task, agent_name, agent_func, payload, action)
    status = "failed" if metadata.get("status") == "failed" else "under_human_review"
    return _update_task(
        task["task_id"],
        {
            **metric_updates,
            output_key: output,
            "status": status,
            "ai_output_generated_at": _utc_now(),
            "message": "AI output generated. Waiting for human review.",
        },
    )


def _initial_workflow(goal: str, attachments: list[dict] | None = None) -> dict:
    prepared_attachments, attachment_context = _prepare_attachments(attachments)
    intent = _classify_intent(_classification_source(goal, attachment_context))
    task = _create_task(goal, intent, attachments=prepared_attachments, attachment_context=attachment_context)
    agent_goal = _agent_context(goal, attachment_context)

    if intent == "small_talk":
        _record_event(task["task_id"], "ai", "Assistant", "answered_small_talk", SMALL_TALK_RESPONSE)
        return _update_task(
            task["task_id"],
            {
                "status": "answered",
                "message": SMALL_TALK_RESPONSE,
                "end_time": _utc_now(),
            },
        )

    if intent == "unknown":
        message = (
            "Please clarify the software development task, for example planning, code generation, "
            "test generation, or code review."
        )
        _record_event(task["task_id"], "ai", "IntentRouter", "requested_clarification", message)
        return _update_task(task["task_id"], {"status": "classified", "message": message})

    if intent in {"software_task", "project_planning"}:
        return _plan_task(task)

    if intent == "code_generation":
        return _generate_full_output(task, agent_goal)

    if intent == "test_generation":
        return _run_single_agent_task(
            task,
            "tester",
            agents.tester,
            agent_goal,
            "tests",
            "generated_tests",
        )

    if intent == "code_review":
        return _run_single_agent_task(
            task,
            "reviewer",
            agents.reviewer,
            agent_goal,
            "review",
            "reviewed_code",
        )

    return task


@app.post("/run")
def run_workflow(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    return _initial_workflow(goal, payload.get("attachments") or [])


def _stream_agent(agent_name, stream_func, payload):
    started_at = time.perf_counter()
    response_text = ""
    metadata = {}

    yield _sse("agent_start", {"agent": agent_name})

    for item in stream_func(payload):
        if item.get("type") == "chunk":
            chunk = item.get("chunk", "")
            response_text += chunk
            yield _sse("chunk", {"agent": agent_name, "chunk": chunk})
        elif item.get("type") == "final":
            response_text = item.get("response", response_text)
            metadata = item.get("metadata", {})

    elapsed = round(time.perf_counter() - started_at, 3)
    metadata = {"agent": agent_name, **metadata}
    yield _sse(
        "agent_done",
        {
            "agent": agent_name,
            "response": response_text,
            "metadata": metadata,
            "seconds": elapsed,
        },
    )
    return response_text, metadata, elapsed


@app.post("/run/stream")
def stream_workflow(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")
    prepared_attachments, attachment_context = _prepare_attachments(payload.get("attachments") or [])
    agent_goal = _agent_context(goal, attachment_context)

    def event_generator():
        try:
            intent = _classify_intent(_classification_source(goal, attachment_context))
            task = _create_task(
                goal,
                intent,
                attachments=prepared_attachments,
                attachment_context=attachment_context,
            )
            yield _sse("classified", {"task": task, "intent": intent, "status": task.get("status")})

            if intent == "small_talk":
                _record_event(task["task_id"], "ai", "Assistant", "answered_small_talk", SMALL_TALK_RESPONSE)
                task = _update_task(
                    task["task_id"],
                    {"status": "answered", "message": SMALL_TALK_RESPONSE, "end_time": _utc_now()},
                )
                yield _sse("final", task)
                return

            if intent == "unknown":
                message = (
                    "Please clarify the software development task, for example planning, code generation, "
                    "test generation, or code review."
                )
                _record_event(task["task_id"], "ai", "IntentRouter", "requested_clarification", message)
                task = _update_task(task["task_id"], {"status": "classified", "message": message})
                yield _sse("final", task)
                return

            if intent in {"software_task", "project_planning"}:
                task = _update_task(task["task_id"], {"status": "ai_generating"})
                plan, metadata, elapsed = yield from _stream_agent("planner", agents.planner_stream, agent_goal)
                _record_event(
                    task["task_id"],
                    "ai",
                    "Planner",
                    "generated_plan",
                    plan,
                    duration_seconds=elapsed,
                    metadata=metadata,
                )
                metric_updates = _metric_updates(task, [metadata], {"plan": plan})
                task = _update_task(
                    task["task_id"],
                    {
                        **metric_updates,
                        "plan": plan,
                        "status": "waiting_human_approval"
                        if metadata.get("status") != "failed"
                        else "failed",
                        "plan_generated_at": _utc_now(),
                        "message": "Plan generated. Waiting for human approval before implementation.",
                    },
                )
                yield _sse("final", task)
                return

            if intent == "code_generation":
                task = _generate_full_output(task, agent_goal)
                yield _sse("final", task)
                return

            if intent == "test_generation":
                task = _run_single_agent_task(
                    task,
                    "tester",
                    agents.tester,
                    agent_goal,
                    "tests",
                    "generated_tests",
                )
                yield _sse("final", task)
                return

            if intent == "code_review":
                task = _run_single_agent_task(
                    task,
                    "reviewer",
                    agents.reviewer,
                    agent_goal,
                    "review",
                    "reviewed_code",
                )
                yield _sse("final", task)
                return

            yield _sse("final", task)
        except GeneratorExit:
            print("Client disconnected from orchestrator stream")
            raise
        except Exception as exc:
            yield _sse("error", {"error": f"Orchestration failed: {str(exc)}"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/tasks/{task_id}/approve-plan")
def approve_plan(task_id: str, payload: dict | None = None):
    task = _get_task(task_id)
    if not task.get("plan"):
        raise HTTPException(status_code=400, detail="No plan is available to approve")

    approved_plan = str((payload or {}).get("approved_plan") or task.get("plan"))
    _record_event(task_id, "human", "User", "approved_plan", approved_plan)
    task = _update_task(task_id, {"status": "plan_approved", "plan": approved_plan})
    return _generate_full_output(task, approved_plan)


@app.post("/tasks/{task_id}/edit-plan")
def edit_plan(task_id: str, payload: dict):
    edited_plan = str(payload.get("plan") or payload.get("edited_plan") or "").strip()
    if not edited_plan:
        raise HTTPException(status_code=400, detail="Edited plan is required")

    task = _get_task(task_id)
    _record_event(task_id, "human", "User", "edited_plan", edited_plan)
    return _update_task(
        task_id,
        {
            "plan": edited_plan,
            "status": "waiting_human_approval",
            "revision_count": _safe_int(task.get("revision_count")) + 1,
            "human_modified_lines": _count_lines(edited_plan),
            "message": "Plan edited by human. Waiting for approval.",
        },
    )


@app.post("/tasks/{task_id}/request-revision")
def request_revision(task_id: str, payload: dict | None = None):
    task = _get_task(task_id)
    feedback = str((payload or {}).get("feedback") or "Revision requested by human.").strip()
    _record_event(task_id, "human", "User", "requested_revision", feedback)
    return _update_task(
        task_id,
        {
            "status": "revision_requested",
            "revision_count": _safe_int(task.get("revision_count")) + 1,
            "message": "Revision requested. The human can edit the plan or submit a refined task.",
        },
    )


@app.post("/tasks/{task_id}/approve-output")
def approve_output(task_id: str, payload: dict | None = None):
    _record_event(task_id, "human", "User", "approved_output", (payload or {}).get("notes", ""))
    updates = {
        "status": "validated",
        "message": "AI output validated by human.",
        "user_feedback_score": (payload or {}).get("user_feedback_score"),
        "tests_passed": (payload or {}).get("tests_passed"),
        "human_modified_lines": (payload or {}).get("human_modified_lines"),
    }
    return _update_task(task_id, {key: value for key, value in updates.items() if value is not None})


@app.post("/tasks/{task_id}/reject-output")
def reject_output(task_id: str, payload: dict | None = None):
    reason = str((payload or {}).get("reason") or "Rejected by human.")
    _record_event(task_id, "human", "User", "rejected_output", reason)
    return _update_task(task_id, {"status": "rejected", "message": reason, "error_message": reason})


@app.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, payload: dict | None = None):
    notes = str((payload or {}).get("notes") or "Task completed by human.")
    _record_event(task_id, "human", "User", "completed_task", notes)
    updates = {
        "status": "completed",
        "message": "Task completed. KPI values updated.",
        "user_feedback_score": (payload or {}).get("user_feedback_score"),
        "tests_passed": (payload or {}).get("tests_passed"),
        "human_modified_lines": (payload or {}).get("human_modified_lines"),
    }
    return _update_task(task_id, {key: value for key, value in updates.items() if value is not None})


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "orchestrator",
        "cors_enabled": True,
    }
