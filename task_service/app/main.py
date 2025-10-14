from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db_client import save_task
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Task Service")

# Add CORS middleware
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

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "task", "cors_enabled": True}