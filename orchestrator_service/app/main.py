# from fastapi import FastAPI
# from . import agents

# app = FastAPI(title="AI Orchestrator")

# @app.post("/run")
# def run_team(payload: dict):
#     goal = payload.get("goal", "Create a system")
#     plan = agents.planner(goal)
#     code = agents.developer(goal)
#     tests = agents.tester(code)
#     review = agents.reviewer(code)
#     return {"goal": goal, "plan": plan, "code": code, "tests": tests, "review": review}


# from fastapi import FastAPI
# from dotenv import load_dotenv
# from . import agents

# load_dotenv()
# app = FastAPI(title="Orchestrator Service")

# @app.post("/run")
# def run_agents(payload: dict):
#     goal = payload.get("goal", "Create a sample app")

#     plan = agents.planner(goal)
#     code = agents.developer(goal)
#     tests = agents.tester(code)
#     review = agents.reviewer(code)

#     return {
#         "goal": goal,
#         "plan": plan,
#         "code": code,
#         "tests": tests,
#         "review": review
#     }



from fastapi import FastAPI
from dotenv import load_dotenv
from app import agents

load_dotenv()

app = FastAPI(title="Orchestrator Service")

@app.post("/run")
def run_agents(payload: dict):
    goal = payload.get("goal", "Create a sample app")
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
