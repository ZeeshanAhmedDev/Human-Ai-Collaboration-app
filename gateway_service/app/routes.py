
# from fastapi import APIRouter, HTTPException
# import requests, os
# from dotenv import load_dotenv

# load_dotenv()
# router = APIRouter(prefix="/api", tags=["Gateway"])

# ORCH_URL = os.getenv("ORCH_URL", "http://127.0.0.1:8001/run")
# TASK_URL = os.getenv("TASK_URL", "http://127.0.0.1:8002/task")

# @router.post("/execute")
# def execute_goal(payload: dict):
#     goal = payload.get("goal")
#     try:
#         ai_output = requests.post(ORCH_URL, json={"goal": goal}, timeout=120).json()
#         requests.post(TASK_URL, json={"goal": goal, "output": ai_output})
#         return ai_output
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Service call failed: {e}")





from fastapi import APIRouter, HTTPException
import requests, os, time
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["Gateway"])

# Use Docker service names
ORCH_URL = os.getenv("ORCH_URL", "http://orchestrator_service:8001/run")
TASK_URL = os.getenv("TASK_URL", "http://task_service:8002/task")

@router.post("/execute")
def execute_goal(payload: dict):
    goal = payload.get("goal")
    try:
        print(f"🚀 Gateway: Sending goal to orchestrator: {goal}")
        
        # Increase timeout and add better error handling
        ai_output = requests.post(ORCH_URL, json={"goal": goal}, timeout=300).json()
        
        print(f"✅ Gateway: Received AI output, saving to task service")
        requests.post(TASK_URL, json={"goal": goal, "output": ai_output}, timeout=30)
        
        return ai_output
    except requests.exceptions.ConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to orchestrator service: {e}")
    except requests.exceptions.Timeout as e:
        raise HTTPException(status_code=504, detail=f"Orchestrator service timeout: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service call failed: {e}")

@router.get("/health")
def gateway_health():
    """Health check that tests all service connections"""
    try:
        # Test orchestrator connection
        orch_response = requests.get(ORCH_URL.replace("/run", "/health"), timeout=10)
        # Test task service connection  
        task_response = requests.get(TASK_URL.replace("/task", "/health"), timeout=10)
        
        return {
            "status": "healthy",
            "orchestrator": orch_response.json() if orch_response.status_code == 200 else "unhealthy",
            "task_service": task_response.json() if task_response.status_code == 200 else "unhealthy"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}