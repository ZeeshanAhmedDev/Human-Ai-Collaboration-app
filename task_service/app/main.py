from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db_client import (
    add_collaboration_event,
    calculate_kpis,
    create_workflow_task,
    get_collaboration_events,
    get_workflow_task,
    save_ai_task_result,
    save_task,
    update_workflow_task,
)

load_dotenv()

app = FastAPI(title="Task Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/task")
def create_legacy_task(task: dict):
    task_id = save_task(task)
    return {"status": "saved", "id": task_id}


@app.post("/ai-task")
def create_ai_task_result(task_result: dict):
    task_id = save_ai_task_result(task_result)
    return {"status": "saved", "id": task_id}


@app.post("/tasks")
def create_task(task: dict):
    return create_workflow_task(task)


@app.get("/tasks/{task_id}")
def get_task(task_id: str):
    task = get_workflow_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task["events"] = get_collaboration_events(task_id)
    return task


@app.patch("/tasks/{task_id}")
def patch_task(task_id: str, updates: dict):
    task = update_workflow_task(task_id, updates)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task["events"] = get_collaboration_events(task_id)
    return task


@app.post("/events")
def create_event(event: dict):
    return add_collaboration_event(event)


@app.get("/tasks/{task_id}/events")
def list_events(task_id: str):
    return {"task_id": task_id, "events": get_collaboration_events(task_id)}


@app.get("/kpis")
def get_kpis():
    return calculate_kpis()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "task", "cors_enabled": True}
