from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes import router

load_dotenv()

app = FastAPI(title="Gateway Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(router)

@app.get("/")
def health():
    return {"status": "ok"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "gateway",
        "cors_enabled": True,
        "allowed_origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
    }