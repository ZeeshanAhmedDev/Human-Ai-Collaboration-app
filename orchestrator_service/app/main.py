from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app import agents

load_dotenv()

app = FastAPI(title="Orchestrator Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for internal services
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/run")
def run_agents(payload: dict):
    goal = payload.get("goal", "Create a sample app")
    
    print(f"🎯 Processing goal: {goal}")
    
    try:
        plan = agents.planner(goal)
        code = agents.developer(goal)
        tests = agents.tester(code)
        review = agents.reviewer(code)
        
        return {
            "goal": goal,
            "plan": plan,
            "code": code,
            "tests": tests,
            "review": review
        }
    except Exception as e:
        return {"error": f"Orchestration failed: {str(e)}"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "service": "orchestrator",
        "cors_enabled": True
    }