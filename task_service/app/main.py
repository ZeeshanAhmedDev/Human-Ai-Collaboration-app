# from fastapi import FastAPI
# from .db_client import save_task

# app = FastAPI(title="Task Service")

# @app.post("/task")
# def create_task(task: dict):
#     task_id = save_task(task)
#     return {"status": "saved", "id": task_id}


# from fastapi import FastAPI
# from .db_client import save_task
# from dotenv import load_dotenv

# load_dotenv()
# app = FastAPI(title="Task Service")

# @app.post("/task")
# def create_task(task: dict):
#     task_id = save_task(task)
#     return {"status": "saved", "id": task_id}




from fastapi import FastAPI
from app.db_client import save_task
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Task Service")

@app.post("/task")
def create_task(task: dict):
    task_id = save_task(task)
    return {"status": "saved", "id": task_id}
