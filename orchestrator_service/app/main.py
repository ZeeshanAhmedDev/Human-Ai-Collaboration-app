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
    return result, round(time.perf_counter() - started_at, 2)


def _is_error(result):
    return isinstance(result, str) and result.strip().lower().startswith("error")


@app.post("/run")
def run_agents(payload: dict):
    goal = str(payload.get("goal", "")).strip()
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    total_started_at = time.perf_counter()
    timings = {}

    try:
        print(f"Processing goal: {goal}")

        # Planner and developer do not depend on each other in this prototype,
        # so running them together avoids one full model round-trip.
        with ThreadPoolExecutor(max_workers=2) as executor:
            planner_future = executor.submit(_timed_agent_call, "planner", agents.planner, goal)
            developer_future = executor.submit(_timed_agent_call, "developer", agents.developer, goal)

            plan, timings["planner_seconds"] = planner_future.result()
            code, timings["developer_seconds"] = developer_future.result()

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

                tests, timings["tester_seconds"] = tester_future.result()
                review, timings["reviewer_seconds"] = reviewer_future.result()

        timings["total_seconds"] = round(time.perf_counter() - total_started_at, 2)

        return {
            "goal": goal,
            "plan": plan,
            "code": code,
            "tests": tests,
            "review": review,
            "timings": timings
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
