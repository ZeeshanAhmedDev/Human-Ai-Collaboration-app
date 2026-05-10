import os
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
DB_NAME = os.getenv("DB_NAME", "ai_collab_team")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

legacy_tasks = db["tasks"]
ai_task_results = db["ai_task_results"]
workflow_tasks = db["workflow_tasks"]
collaboration_events = db["collaboration_events"]


FINAL_STATUSES = {"completed", "rejected", "failed", "validated"}
AI_TASK_INTENTS = {
    "software_task",
    "project_planning",
    "code_generation",
    "test_generation",
    "code_review",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_datetime(value):
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


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


def _safe_average(values: list[float]) -> float:
    numbers = [value for value in values if value is not None]
    if not numbers:
        return 0.0
    return round(sum(numbers) / len(numbers), 4)


def _count_lines(value) -> int:
    if isinstance(value, dict):
        return sum(_count_lines(item) for item in value.values())
    if isinstance(value, list):
        return sum(_count_lines(item) for item in value)
    return len(str(value or "").splitlines()) if value else 0


def _serialize_doc(document: dict | None) -> dict | None:
    if not document:
        return None

    serialized = {}
    for key, value in document.items():
        if key == "_id":
            serialized["mongo_id"] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized


def _completion_seconds(start_time, end_time) -> float:
    started_at = _parse_datetime(start_time)
    ended_at = _parse_datetime(end_time)
    if not started_at or not ended_at:
        return 0.0
    return round(max(0.0, (ended_at - started_at).total_seconds()), 3)


def _validation_seconds(task: dict, end_time: str) -> float:
    generated_at = task.get("ai_output_generated_at") or task.get("plan_generated_at")
    started_at = _parse_datetime(generated_at)
    ended_at = _parse_datetime(end_time)
    if not started_at or not ended_at:
        return _safe_float(task.get("human_validation_time_seconds"))
    return round(max(0.0, (ended_at - started_at).total_seconds()), 3)


def _normalize_task_data(task_data: dict) -> dict:
    now = _utc_now()
    task_id = str(task_data.get("task_id") or uuid4())
    start_time = task_data.get("start_time") or now

    return {
        "task_id": task_id,
        "original_prompt": str(task_data.get("original_prompt") or task_data.get("prompt") or ""),
        "intent": str(task_data.get("intent") or "unknown"),
        "status": str(task_data.get("status") or "created"),
        "model": str(task_data.get("model") or "unknown"),
        "message": task_data.get("message"),
        "plan": task_data.get("plan"),
        "code": task_data.get("code"),
        "tests": task_data.get("tests"),
        "review": task_data.get("review"),
        "start_time": start_time,
        "end_time": task_data.get("end_time"),
        "created_at": task_data.get("created_at") or now,
        "updated_at": now,
        "plan_generated_at": task_data.get("plan_generated_at"),
        "ai_output_generated_at": task_data.get("ai_output_generated_at"),
        "final_decision_at": task_data.get("final_decision_at"),
        "completion_time_seconds": _safe_float(task_data.get("completion_time_seconds")),
        "ai_response_time_seconds": _safe_float(task_data.get("ai_response_time_seconds")),
        "human_validation_time_seconds": _safe_float(
            task_data.get("human_validation_time_seconds")
        ),
        "revision_count": _safe_int(task_data.get("revision_count")),
        "tests_total": _safe_int(task_data.get("tests_total")),
        "tests_passed": _safe_int(task_data.get("tests_passed")),
        "user_feedback_score": task_data.get("user_feedback_score"),
        "ai_generated_lines": _safe_int(task_data.get("ai_generated_lines")),
        "human_modified_lines": _safe_int(task_data.get("human_modified_lines")),
        "post_generation_modification_rate": _safe_float(
            task_data.get("post_generation_modification_rate")
        ),
        "estimated_cost": _safe_float(task_data.get("estimated_cost")),
        "error_message": task_data.get("error_message"),
        "llm_metadata": task_data.get("llm_metadata", []),
        "metadata": task_data.get("metadata", {}),
    }


def save_task(task_data: dict):
    result = legacy_tasks.insert_one(task_data)
    return str(result.inserted_id)


def create_workflow_task(task_data: dict) -> dict:
    task = _normalize_task_data(task_data)
    workflow_tasks.insert_one(task)
    return _serialize_doc(task)


def get_workflow_task(task_id: str) -> dict | None:
    return _serialize_doc(workflow_tasks.find_one({"task_id": task_id}))


def update_workflow_task(task_id: str, updates: dict) -> dict | None:
    current = workflow_tasks.find_one({"task_id": task_id})
    if not current:
        return None

    updates = dict(updates or {})
    updates["updated_at"] = _utc_now()

    status = updates.get("status")
    if status in FINAL_STATUSES:
        end_time = updates.get("end_time") or _utc_now()
        updates["end_time"] = end_time
        updates["final_decision_at"] = updates.get("final_decision_at") or end_time
        updates["completion_time_seconds"] = _completion_seconds(
            current.get("start_time"),
            end_time,
        )
        updates["human_validation_time_seconds"] = _validation_seconds(current, end_time)

    ai_generated_lines = _safe_int(updates.get("ai_generated_lines"), _safe_int(current.get("ai_generated_lines")))
    human_modified_lines = _safe_int(
        updates.get("human_modified_lines"),
        _safe_int(current.get("human_modified_lines")),
    )
    if ai_generated_lines > 0:
        # Post-generation modification rate: human edited lines divided by AI-generated lines.
        updates["post_generation_modification_rate"] = round(
            (human_modified_lines / ai_generated_lines) * 100,
            2,
        )

    workflow_tasks.update_one({"task_id": task_id}, {"$set": updates})
    return get_workflow_task(task_id)


def add_collaboration_event(event_data: dict) -> dict:
    event = {
        "event_id": str(event_data.get("event_id") or uuid4()),
        "task_id": str(event_data.get("task_id") or ""),
        "actor_type": str(event_data.get("actor_type") or "ai"),
        "actor_name": str(event_data.get("actor_name") or "System"),
        "action": str(event_data.get("action") or "updated_task"),
        "content": str(event_data.get("content") or ""),
        "timestamp": event_data.get("timestamp") or _utc_now(),
        "duration_seconds": _safe_float(event_data.get("duration_seconds")),
        "metadata": event_data.get("metadata", {}),
    }
    collaboration_events.insert_one(event)
    return _serialize_doc(event)


def get_collaboration_events(task_id: str) -> list[dict]:
    events = collaboration_events.find({"task_id": task_id}).sort("timestamp", 1)
    return [_serialize_doc(event) for event in events]


def normalize_ai_task_result(task_data: dict) -> dict:
    ai_response = task_data.get("ai_response", "")
    ai_generated_lines = _safe_int(
        task_data.get("ai_generated_lines"),
        _count_lines(ai_response),
    )

    return {
        "task_id": str(task_data.get("task_id") or ""),
        "prompt": str(task_data.get("prompt") or ""),
        "ai_response": ai_response,
        "model": str(task_data.get("model") or "unknown"),
        "status": str(task_data.get("status") or "failed"),
        "response_time_seconds": _safe_float(task_data.get("response_time_seconds")),
        "validation_time_seconds": _safe_float(task_data.get("validation_time_seconds")),
        "tests_total": _safe_int(task_data.get("tests_total")),
        "tests_passed": _safe_int(task_data.get("tests_passed")),
        "user_feedback_score": task_data.get("user_feedback_score"),
        "human_modified_lines": _safe_int(task_data.get("human_modified_lines")),
        "ai_generated_lines": ai_generated_lines,
        "estimated_cost": _safe_float(task_data.get("estimated_cost")),
        "error_message": task_data.get("error_message"),
        "llm_metadata": task_data.get("llm_metadata", []),
        "created_at": task_data.get("created_at") or _utc_now(),
    }


def save_ai_task_result(task_data: dict):
    normalized_task = normalize_ai_task_result(task_data)
    result = ai_task_results.insert_one(normalized_task)
    return str(result.inserted_id)


def calculate_kpis() -> dict:
    records = list(workflow_tasks.find({}))
    total_tasks = len(records)

    if total_tasks == 0:
        return {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "small_talk_messages": 0,
            "software_tasks": 0,
            "ai_success_rate": 0.0,
            "average_completion_time_seconds": 0.0,
            "average_ai_response_time_seconds": 0.0,
            "average_human_validation_time_seconds": 0.0,
            "validation_time_ratio": 0.0,
            "test_pass_rate": 0.0,
            "average_revision_count": 0.0,
            "post_generation_modification_rate": 0.0,
            "average_feedback_score": 0.0,
            "average_cost_per_task": 0.0,
        }

    ai_records = [record for record in records if record.get("intent") in AI_TASK_INTENTS]
    total_ai_tasks = len(ai_records)
    completed_tasks = sum(1 for record in records if record.get("status") == "completed")
    failed_tasks = sum(1 for record in records if record.get("status") in {"failed", "rejected"})
    small_talk_messages = sum(1 for record in records if record.get("intent") == "small_talk")
    software_tasks = total_ai_tasks
    successful_ai_tasks = sum(
        1
        for record in ai_records
        if record.get("status") not in {"failed", "rejected"}
    )

    completion_times = [
        _safe_float(record.get("completion_time_seconds"))
        for record in records
        if _safe_float(record.get("completion_time_seconds")) > 0
    ]
    ai_response_times = [_safe_float(record.get("ai_response_time_seconds")) for record in ai_records]
    validation_times = [
        _safe_float(record.get("human_validation_time_seconds"))
        for record in records
        if _safe_float(record.get("human_validation_time_seconds")) > 0
    ]
    revision_counts = [_safe_int(record.get("revision_count")) for record in ai_records]
    feedback_scores = [
        _safe_float(record.get("user_feedback_score"))
        for record in records
        if record.get("user_feedback_score") is not None
    ]
    costs = [_safe_float(record.get("estimated_cost")) for record in ai_records]

    tests_total = sum(_safe_int(record.get("tests_total")) for record in ai_records)
    tests_passed = sum(_safe_int(record.get("tests_passed")) for record in ai_records)
    ai_generated_lines = sum(_safe_int(record.get("ai_generated_lines")) for record in ai_records)
    human_modified_lines = sum(_safe_int(record.get("human_modified_lines")) for record in ai_records)

    total_ai_response_time = sum(ai_response_times)
    total_validation_time = sum(validation_times)

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "failed_tasks": failed_tasks,
        "small_talk_messages": small_talk_messages,
        "software_tasks": software_tasks,
        # AI Success Rate: successful AI tasks divided by all AI tasks.
        "ai_success_rate": round((successful_ai_tasks / total_ai_tasks) * 100, 2)
        if total_ai_tasks
        else 0.0,
        # Task Completion Time: end time minus start time, stored per task when final.
        "average_completion_time_seconds": _safe_average(completion_times),
        # Average Response Time: AI response time divided by total AI task count.
        "average_ai_response_time_seconds": _safe_average(ai_response_times),
        # Human Validation Time: time between generated AI output and human decision.
        "average_human_validation_time_seconds": _safe_average(validation_times),
        # Validation Time Ratio: human validation time divided by AI response time.
        "validation_time_ratio": round(total_validation_time / total_ai_response_time, 4)
        if total_ai_response_time > 0
        else 0.0,
        # Test Pass Rate: passed tests divided by all tests.
        "test_pass_rate": round((tests_passed / tests_total) * 100, 2)
        if tests_total > 0
        else 0.0,
        "average_revision_count": _safe_average(revision_counts),
        # Post-Generation Modification Rate: human-modified lines divided by AI lines.
        "post_generation_modification_rate": round(
            (human_modified_lines / ai_generated_lines) * 100,
            2,
        )
        if ai_generated_lines > 0
        else 0.0,
        # Average Feedback Score: feedback sum divided by number of feedbacks.
        "average_feedback_score": _safe_average(feedback_scores),
        # Average Cost per Task: total estimated cost divided by total AI task count.
        "average_cost_per_task": round(sum(costs) / total_ai_tasks, 6)
        if total_ai_tasks
        else 0.0,
    }
