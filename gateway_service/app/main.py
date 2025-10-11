# from fastapi import FastAPI
# from .routes import router

# app = FastAPI(title="AI Collab Gateway")
# app.include_router(router)

# @app.get("/")
# def health():
#     return {"status": "ok"}



# from fastapi import FastAPI
# from dotenv import load_dotenv
# from .routes import router

# load_dotenv()
# app = FastAPI(title="Gateway Service")
# app.include_router(router)

# @app.get("/")
# def health():
#     return {"status": "ok"}




from fastapi import FastAPI
from dotenv import load_dotenv
from app.routes import router

load_dotenv()
app = FastAPI(title="Gateway Service")
app.include_router(router)

@app.get("/")
def health():
    return {"status": "ok"}
