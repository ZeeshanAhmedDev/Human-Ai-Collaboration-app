from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.llm_client import generate_plan

app = FastAPI(title="Planner Service", version="1.0")

class TaskRequest(BaseModel):
    goal: str

@app.post("/plan")
def plan_task(request: TaskRequest):
    try:
        plan = generate_plan(request.goal)
        return {"agent": "planner", "goal": request.goal, "plan": plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
