import time
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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


def _timed_agent_call(agent_name, agent_func, payload):
    started_at = time.perf_counter()
    result = agent_func(payload)
    response_text = result.get("response", "") if isinstance(result, dict) else str(result)
    metadata = result.get("metadata", {}) if isinstance(result, dict) else {}

    metadata = {
        "agent": agent_name,
        **metadata,
    }

    return response_text, metadata, round(time.perf_counter() - started_at, 2)


def _is_error(result):
    return isinstance(result, str) and result.strip().lower().startswith("error")


@app.post("/run")
def run_agents(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    total_started_at = time.perf_counter()
    timings = {}
    llm_metadata = []

    try:
        print(f"Processing goal: {goal}")

        # Planner and developer do not depend on each other in this prototype,
        # so running them together avoids one full model round-trip.
        with ThreadPoolExecutor(max_workers=2) as executor:
            planner_future = executor.submit(_timed_agent_call, "planner", agents.planner, goal)
            developer_future = executor.submit(_timed_agent_call, "developer", agents.developer, goal)

            plan, planner_metadata, timings["planner_seconds"] = planner_future.result()
            code, developer_metadata, timings["developer_seconds"] = developer_future.result()
            llm_metadata.extend([planner_metadata, developer_metadata])

        if _is_error(code):
            tests = "Skipped because the developer agent did not return code."
            review = "Skipped because the developer agent did not return code."
            timings["tester_seconds"] = 0
            timings["reviewer_seconds"] = 0
        else:
            # Tester and reviewer both use the generated code and can run together.
            with ThreadPoolExecutor(max_workers=2) as executor:
                tester_future = executor.submit(_timed_agent_call, "tester", agents.tester, code)
                reviewer_future = executor.submit(_timed_agent_call, "reviewer", agents.reviewer, code)

                tests, tester_metadata, timings["tester_seconds"] = tester_future.result()
                review, reviewer_metadata, timings["reviewer_seconds"] = reviewer_future.result()
                llm_metadata.extend([tester_metadata, reviewer_metadata])

        timings["total_seconds"] = round(time.perf_counter() - total_started_at, 2)
        overall_status = (
            "failed"
            if any(item.get("status") == "failed" for item in llm_metadata)
            else "success"
        )

        return {
            "goal": goal,
            "plan": plan,
            "code": code,
            "tests": tests,
            "review": review,
            "status": overall_status,
            "timings": timings,
            "llm_metadata": llm_metadata,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failed: {str(exc)}") from exc


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "orchestrator",
        "cors_enabled": True
    }
