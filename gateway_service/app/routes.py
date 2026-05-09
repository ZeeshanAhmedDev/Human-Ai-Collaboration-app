import os
import re
from datetime import datetime, timezone
from uuid import uuid4
from urllib.parse import urlparse, urlunparse

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

load_dotenv()

router = APIRouter(prefix="/api", tags=["Gateway"])

ORCH_URL = os.getenv("ORCH_URL", "http://orchestrator_service:8001/run")
TASK_URL = os.getenv("TASK_URL", "http://task_service:8002/task")
ORCH_TIMEOUT = int(os.getenv("ORCH_TIMEOUT", "900"))
TASK_TIMEOUT = int(os.getenv("TASK_TIMEOUT", "8"))


def _with_health_path(service_url: str) -> str:
    parsed_url = urlparse(service_url)
    return urlunparse(parsed_url._replace(path="/health", params="", query="", fragment=""))


def _with_path(service_url: str, path: str) -> str:
    parsed_url = urlparse(service_url)
    return urlunparse(parsed_url._replace(path=path, params="", query="", fragment=""))


def _safe_float(value, default=0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _count_generated_tests(tests_response: str) -> int:
    test_patterns = re.findall(r"\bdef\s+test_|\btest\(|\bit\(", tests_response or "")
    return len(test_patterns)


def _count_generated_lines(ai_output: dict) -> int:
    response_sections = [
        ai_output.get("plan", ""),
        ai_output.get("code", ""),
        ai_output.get("tests", ""),
        ai_output.get("review", ""),
    ]
    return sum(len(str(section).splitlines()) for section in response_sections if section)


def _build_kpi_payload(goal: str, ai_output: dict) -> dict:
    metadata = ai_output.get("llm_metadata", [])
    timings = ai_output.get("timings", {})
    failed_metadata = [item for item in metadata if item.get("status") == "failed"]
    models = sorted({item.get("model", "unknown") for item in metadata if item.get("model")})
    validation_time_seconds = sum(
        _safe_float(item.get("response_time_seconds"))
        for item in metadata
        if item.get("agent") in {"tester", "reviewer"}
    )
    tests_total = _count_generated_tests(ai_output.get("tests", ""))

    return {
        "task_id": str(uuid4()),
        "prompt": goal,
        "ai_response": {
            "plan": ai_output.get("plan", ""),
            "code": ai_output.get("code", ""),
            "tests": ai_output.get("tests", ""),
            "review": ai_output.get("review", ""),
        },
        "model": ", ".join(models) if models else "unknown",
        "status": "failed" if failed_metadata or ai_output.get("status") == "failed" else "success",
        "response_time_seconds": _safe_float(timings.get("total_seconds")),
        "validation_time_seconds": validation_time_seconds,
        "tests_total": tests_total,
        "tests_passed": 0,
        "user_feedback_score": None,
        "human_modified_lines": 0,
        "ai_generated_lines": _count_generated_lines(ai_output),
        "estimated_cost": round(
            sum(_safe_float(item.get("estimated_cost")) for item in metadata),
            6,
        ),
        "error_message": "; ".join(
            item.get("error_message", "") for item in failed_metadata if item.get("error_message")
        )
        or None,
        "llm_metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/execute")
def execute_goal(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    try:
        print(f"Gateway: sending goal to orchestrator: {goal}")

        response = requests.post(ORCH_URL, json={"goal": goal}, timeout=ORCH_TIMEOUT)
        response.raise_for_status()
        ai_output = response.json()

        save_warnings = []
        try:
            kpi_response = requests.post(
                _with_path(TASK_URL, "/ai-task"),
                json=_build_kpi_payload(goal, ai_output),
                timeout=TASK_TIMEOUT
            )
            kpi_response.raise_for_status()
        except Exception as exc:
            save_warnings.append(f"KPI record was not saved: {str(exc)}")

        try:
            history_response = requests.post(
                TASK_URL,
                json={"goal": goal, "output": ai_output},
                timeout=TASK_TIMEOUT
            )
            history_response.raise_for_status()
        except Exception as exc:
            save_warnings.append(f"Task history was not saved: {str(exc)}")

        if save_warnings:
            ai_output["save_warning"] = " ".join(save_warnings)

        return ai_output
    except requests.exceptions.ConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to orchestrator service: {exc}"
        ) from exc
    except requests.exceptions.Timeout as exc:
        raise HTTPException(
            status_code=504,
            detail=(
                f"Orchestrator service timed out after {ORCH_TIMEOUT}s. "
                "The AI model is still too slow for this request."
            )
        ) from exc
    except requests.exceptions.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=status_code, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Service call failed: {exc}") from exc


@router.get("/health")
def gateway_health():
    try:
        orch_response = requests.get(_with_health_path(ORCH_URL), timeout=10)
        task_response = requests.get(_with_health_path(TASK_URL), timeout=10)

        return {
            "status": "healthy",
            "orchestrator": orch_response.json()
            if orch_response.status_code == 200
            else "unhealthy",
            "task_service": task_response.json()
            if task_response.status_code == 200
            else "unhealthy"
        }
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}


@router.get("/kpis")
def get_kpis():
    try:
        response = requests.get(_with_path(TASK_URL, "/kpis"), timeout=TASK_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError as exc:
        raise HTTPException(status_code=503, detail=f"Cannot connect to task service: {exc}") from exc
    except requests.exceptions.Timeout as exc:
        raise HTTPException(status_code=504, detail="Task service KPI request timed out") from exc
    except requests.exceptions.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=status_code, detail=detail) from exc
