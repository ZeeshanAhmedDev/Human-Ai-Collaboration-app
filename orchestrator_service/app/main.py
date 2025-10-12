from fastapi import FastAPI
from dotenv import load_dotenv
from app import agents

load_dotenv()

app = FastAPI(title="AI Collab System - qwen3-coder")

@app.post("/run")
def run_agents(payload: dict):
    goal = payload.get("goal", "Create a software application")
    
    print(f"🎯 Starting AI Team with qwen3-coder for: {goal}")
    
    try:
        print("📋 Planner agent working...")
        plan = agents.planner(goal)
        
        print("💻 Developer agent working...")
        code = agents.developer(f"Based on this plan: {plan}\n\nImplement: {goal}")
        
        print("🧪 Tester agent working...")
        tests = agents.tester(code)
        
        print("🔍 Reviewer agent working...")
        review = agents.reviewer(code)
        
        print("✅ All agents completed successfully!")
        
        return {
            "goal": goal,
            "plan": plan,
            "code": code,
            "tests": tests,
            "review": review
        }
        
    except Exception as e:
        return {"error": f"Orchestration failed: {str(e)}"}

@app.get("/test")
def test_system():
    """Test the system with qwen3-coder"""
    from app.hf_client import test_model
    result = test_model()
    return {"test_result": result}

@app.get("/model-info")
def model_info():
    from app.hf_client import get_model_info
    return get_model_info()

@app.get("/health")
def health_check():
    return {
        "status": "ready",
        "ai_model": "qwen3-coder:480b-cloud",
        "specialization": "Code generation and software development",
        "service": "AI Team Collaboration System"
    }