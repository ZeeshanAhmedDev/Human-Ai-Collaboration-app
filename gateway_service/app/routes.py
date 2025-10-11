# from fastapi import APIRouter, HTTPException
# import requests
# import os
# from dotenv import load_dotenv

# # Load environment variables from .env if present
# load_dotenv()

# router = APIRouter(prefix="/api")

# # Detect environment (local or docker)
# ENV_MODE = os.getenv("ENV_MODE", "local").lower()

# # Determine service URLs dynamically
# if ENV_MODE == "docker":
#     ORCH_URL = "http://orchestrator_service:8001/run"
#     TASK_URL = "http://task_service:8002/task"
# else:
#     ORCH_URL = "http://127.0.0.1:8001/run"
#     TASK_URL = "http://127.0.0.1:8002/task"

# @router.post("/execute")
# def execute_goal(payload: dict):
#     """
#     Main endpoint: sends user goal to orchestrator → gets AI plan →
#     stores result in task service → returns output to frontend.
#     """
#     goal = payload.get("goal")
#     if not goal:
#         raise HTTPException(status_code=400, detail="Missing 'goal' in request payload")

#     try:
#         # Step 1: Send to Orchestrator service
#         orch_response = requests.post(ORCH_URL, json={"goal": goal}, timeout=60)
#         orch_response.raise_for_status()
#         ai_output = orch_response.json()

#         # Step 2: Send result to Task service
#         task_response = requests.post(TASK_URL, json={"goal": goal, "output": ai_output}, timeout=30)
#         task_response.raise_for_status()

#         # Step 3: Return combined response
#         return {
#             "goal": goal,
#             "ai_output": ai_output,
#             "task_saved": task_response.status_code == 200
#         }

#     except requests.exceptions.RequestException as e:
#         raise HTTPException(status_code=500, detail=f"Service call failed: {e}")


# from fastapi import APIRouter, HTTPException
# import requests
# import os
# from dotenv import load_dotenv

# load_dotenv()
# router = APIRouter(prefix="/api", tags=["Gateway"])

# ORCH_URL = os.getenv("ORCH_URL", "http://127.0.0.1:8001/run")
# TASK_URL = os.getenv("TASK_URL", "http://127.0.0.1:8002/task")

# @router.post("/execute")
# def execute_goal(payload: dict):
#     goal = payload.get("goal")
#     try:
#         # Step 1: Send to AI orchestrator
#         ai_output = requests.post(ORCH_URL, json={"goal": goal}, timeout=120).json()
#         # Step 2: Save to DB
#         requests.post(TASK_URL, json={"goal": goal, "output": ai_output})
#         return ai_output
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Service call failed: {e}")




from fastapi import APIRouter, HTTPException
import requests, os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api", tags=["Gateway"])

ORCH_URL = os.getenv("ORCH_URL", "http://127.0.0.1:8001/run")
TASK_URL = os.getenv("TASK_URL", "http://127.0.0.1:8002/task")

@router.post("/execute")
def execute_goal(payload: dict):
    goal = payload.get("goal")
    try:
        ai_output = requests.post(ORCH_URL, json={"goal": goal}, timeout=120).json()
        requests.post(TASK_URL, json={"goal": goal, "output": ai_output})
        return ai_output
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service call failed: {e}")
