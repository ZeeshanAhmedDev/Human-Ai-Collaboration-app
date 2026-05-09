from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db_client import calculate_kpis, save_ai_task_result, save_task

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
def create_task(task: dict):
    task_id = save_task(task)
    return {"status": "saved", "id": task_id}


@app.post("/ai-task")
def create_ai_task_result(task_result: dict):
    task_id = save_ai_task_result(task_result)
    return {"status": "saved", "id": task_id}


@app.get("/kpis")
def get_kpis():
    return calculate_kpis()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "task", "cors_enabled": True}
