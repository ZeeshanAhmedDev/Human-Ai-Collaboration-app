from app.hf_client import query_ai


def planner(goal: str):
    prompt = f"""
    You are the planner agent in a human-AI software collaboration platform.

    PROJECT GOAL:
    {goal}

    Create a concise implementation plan with:
    - 4 to 6 functional requirements
    - Backend API endpoints
    - Frontend component structure
    - Database collections or tables
    - Main development steps

    Keep the answer practical and under 700 words.
    """
    return query_ai(prompt)


def developer(task: str):
    prompt = f"""
    You are the developer agent in a human-AI software collaboration platform.

    TASK:
    {task}

    Provide a compact, working implementation outline using FastAPI, React,
    and MongoDB where relevant. Include the most important code snippets and
    file names, but avoid unnecessary boilerplate.

    Keep the answer under 900 words.
    """
    return query_ai(prompt)


def tester(code: str):
    prompt = f"""
    You are the tester agent.

    CODE OR IMPLEMENTATION TO TEST:
    {code}

    Create a focused test plan and representative pytest/Jest test snippets.
    Cover success cases, failure cases, and one integration flow.

    Keep the answer under 600 words.
    """
    return query_ai(prompt)


def reviewer(code: str):
    prompt = f"""
    You are the reviewer agent.

    CODE OR IMPLEMENTATION TO REVIEW:
    {code}

    Provide a concise code review with:
    - Critical issues
    - Security or validation risks
    - Performance risks
    - Concrete improvements

    Keep the answer under 600 words.
    """
    return query_ai(prompt)
