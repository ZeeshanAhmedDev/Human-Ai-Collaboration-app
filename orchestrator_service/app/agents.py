from app.hf_client import query_ai, stream_ai


def _planner_prompt(goal: str) -> str:
    return f"""
    You are the Planner agent in a Human-AI Collaboration Platform.
    Only create a software development plan for a valid software task.
    Do not answer casual chat. Produce a plan that can be reviewed by a human
    before implementation.

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


def _developer_prompt(task: str) -> str:
    return f"""
    You are the Developer agent. Generate implementation only after the human
    has approved the plan.

    APPROVED TASK OR PLAN:
    {task}

    Provide a compact, working implementation outline using FastAPI, React,
    and MongoDB where relevant. Include the most important code snippets and
    file names, but avoid unnecessary boilerplate.

    Keep the answer under 900 words.
    """


def _tester_prompt(code: str) -> str:
    return f"""
    You are the Tester agent. Generate tests and validation strategy for the
    approved implementation.

    APPROVED IMPLEMENTATION TO TEST:
    {code}

    Create a focused test plan and representative pytest/Jest test snippets.
    Cover success cases, failure cases, and one integration flow.

    Keep the answer under 600 words.
    """


def _reviewer_prompt(code: str) -> str:
    return f"""
    You are the Reviewer agent. Review the generated output for quality,
    security, maintainability, and missing requirements.

    GENERATED OUTPUT TO REVIEW:
    {code}

    Provide a concise code review with:
    - Critical issues
    - Security or validation risks
    - Performance risks
    - Concrete improvements

    Keep the answer under 600 words.
    """


def planner(goal: str):
    prompt = _planner_prompt(goal)
    return query_ai(prompt)


def developer(task: str):
    prompt = _developer_prompt(task)
    return query_ai(prompt)


def tester(code: str):
    prompt = _tester_prompt(code)
    return query_ai(prompt)


def reviewer(code: str):
    prompt = _reviewer_prompt(code)
    return query_ai(prompt)


def planner_stream(goal: str):
    yield from stream_ai(_planner_prompt(goal))


def developer_stream(task: str):
    yield from stream_ai(_developer_prompt(task))


def tester_stream(code: str):
    yield from stream_ai(_tester_prompt(code))


def reviewer_stream(code: str):
    yield from stream_ai(_reviewer_prompt(code))
