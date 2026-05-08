import os
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

        try:
            task_response = requests.post(
                TASK_URL,
                json={"goal": goal, "output": ai_output},
                timeout=TASK_TIMEOUT
            )
            task_response.raise_for_status()
        except Exception as exc:
            ai_output["save_warning"] = f"Task history was not saved: {str(exc)}"

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
