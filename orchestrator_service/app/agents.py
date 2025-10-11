# from .hf_client import query_huggingface

# def planner(goal: str):
#     return query_huggingface(f"Break down this goal into smaller development tasks: {goal}")

# def developer(task: str):
#     return query_huggingface(f"Write a Python code implementation for: {task}")

# def tester(code: str):
#     return query_huggingface(f"Generate pytest test cases for this code:\n{code}")

# def reviewer(code: str):
#     return query_huggingface(f"Review and improve this Python code:\n{code}")



# from app.hf_client import query_huggingface

# def planner(goal: str):
#     return query_huggingface(f"Break down this goal into smaller development tasks: {goal}")

# def developer(task: str):
#     return query_huggingface(f"Write a Python code implementation for: {task}")

# def tester(code: str):
#     return query_huggingface(f"Generate pytest test cases for this code:\n{code}")

# def reviewer(code: str):
#     return query_huggingface(f"Review and improve this Python code:\n{code}")




from app.hf_client import query_huggingface

def planner(goal: str):
    prompt = f"""
    As a software architect, break down this project into specific development tasks: {goal}
    
    Provide a clear, step-by-step plan including:
    1. Frontend components needed
    2. Backend API endpoints  
    3. Database schema
    4. File structure
    
    Be specific and practical:"""
    return query_huggingface(prompt)

def developer(task: str):
    prompt = f"""
    As a senior Python/FastAPI and React developer, write clean, production-ready code for:
    {task}
    
    Requirements:
    - Use FastAPI for backend
    - Use React for frontend  
    - Use MongoDB for database
    - Include proper error handling
    - Write complete, runnable code
    
    Code:"""
    return query_huggingface(prompt)

def tester(code: str):
    prompt = f"""
    As a QA engineer, write comprehensive pytest test cases for this Python code:
    ```python
    {code}
    ```
    
    Write complete test suites with assertions:"""
    return query_huggingface(prompt)

def reviewer(code: str):
    prompt = f"""
    As a senior code reviewer, review and improve this Python code:
    ```python
    {code}
    ```
    
    Provide:
    1. Code improvements
    2. Bug fixes  
    3. Best practices
    4. Security considerations
    
    Improved code:"""
    return query_huggingface(prompt)