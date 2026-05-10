import os
from urllib.parse import urlparse, urlunparse

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

load_dotenv()

router = APIRouter(prefix="/api", tags=["Gateway"])

ORCH_URL = os.getenv("ORCH_URL", "http://orchestrator_service:8001/run")
TASK_URL = os.getenv("TASK_URL", "http://task_service:8002/task")
ORCH_TIMEOUT = int(os.getenv("ORCH_TIMEOUT", "900"))
TASK_TIMEOUT = int(os.getenv("TASK_TIMEOUT", "20"))


def _with_path(service_url: str, path: str) -> str:
    parsed_url = urlparse(service_url)
    return urlunparse(parsed_url._replace(path=path, params="", query="", fragment=""))


def _orch_path(path: str) -> str:
    return _with_path(ORCH_URL, path)


def _task_path(path: str) -> str:
    return _with_path(TASK_URL, path)


def _forward_json(method: str, url: str, payload: dict | None = None, timeout: int = 30):
    try:
        response = requests.request(method, url, json=payload, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError as exc:
        raise HTTPException(status_code=503, detail=f"Cannot connect to service: {exc}") from exc
    except requests.exceptions.Timeout as exc:
        raise HTTPException(status_code=504, detail="Service request timed out") from exc
    except requests.exceptions.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.post("/execute")
def execute_goal(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")
    return _forward_json("POST", ORCH_URL, {"goal": goal}, ORCH_TIMEOUT)


@router.post("/execute/stream")
def execute_goal_stream(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    def event_generator():
        try:
            with requests.post(
                _orch_path("/run/stream"),
                json={"goal": goal},
                timeout=ORCH_TIMEOUT,
                stream=True,
            ) as response:
                if response.status_code != 200:
                    yield (
                        "event: error\n"
                        f"data: {{\"error\": \"Orchestrator stream failed with {response.status_code}\"}}\n\n"
                    )
                    return

                for line in response.iter_lines(decode_unicode=True):
                    if line is None:
                        continue
                    yield f"{line}\n"
        except GeneratorExit:
            print("Client disconnected from gateway stream")
            raise
        except requests.exceptions.ConnectionError as exc:
            yield f"event: error\ndata: {{\"error\": \"Cannot connect to orchestrator: {exc}\"}}\n\n"
        except requests.exceptions.Timeout:
            yield f"event: error\ndata: {{\"error\": \"Orchestrator timed out after {ORCH_TIMEOUT}s\"}}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {{\"error\": \"Streaming failed: {exc}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/kpis")
def get_kpis():
    return _forward_json("GET", _task_path("/kpis"), timeout=TASK_TIMEOUT)


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    return _forward_json("GET", _task_path(f"/tasks/{task_id}"), timeout=TASK_TIMEOUT)


@router.get("/tasks/{task_id}/events")
def get_task_events(task_id: str):
    return _forward_json("GET", _task_path(f"/tasks/{task_id}/events"), timeout=TASK_TIMEOUT)


@router.post("/tasks/{task_id}/approve-plan")
def approve_plan(task_id: str, payload: dict | None = None):
    return _forward_json(
        "POST",
        _orch_path(f"/tasks/{task_id}/approve-plan"),
        payload or {},
        ORCH_TIMEOUT,
    )


@router.post("/tasks/{task_id}/edit-plan")
def edit_plan(task_id: str, payload: dict):
    return _forward_json("POST", _orch_path(f"/tasks/{task_id}/edit-plan"), payload, ORCH_TIMEOUT)


@router.post("/tasks/{task_id}/request-revision")
def request_revision(task_id: str, payload: dict | None = None):
    return _forward_json(
        "POST",
        _orch_path(f"/tasks/{task_id}/request-revision"),
        payload or {},
        ORCH_TIMEOUT,
    )


@router.post("/tasks/{task_id}/approve-output")
def approve_output(task_id: str, payload: dict | None = None):
    return _forward_json(
        "POST",
        _orch_path(f"/tasks/{task_id}/approve-output"),
        payload or {},
        ORCH_TIMEOUT,
    )


@router.post("/tasks/{task_id}/reject-output")
def reject_output(task_id: str, payload: dict | None = None):
    return _forward_json(
        "POST",
        _orch_path(f"/tasks/{task_id}/reject-output"),
        payload or {},
        ORCH_TIMEOUT,
    )


@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, payload: dict | None = None):
    return _forward_json(
        "POST",
        _orch_path(f"/tasks/{task_id}/complete"),
        payload or {},
        ORCH_TIMEOUT,
    )


@router.get("/health")
def gateway_health():
    try:
        orch_response = requests.get(_orch_path("/health"), timeout=10)
        task_response = requests.get(_task_path("/health"), timeout=10)

        return {
            "status": "healthy",
            "orchestrator": orch_response.json()
            if orch_response.status_code == 200
            else "unhealthy",
            "task_service": task_response.json()
            if task_response.status_code == 200
            else "unhealthy",
        }
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}
