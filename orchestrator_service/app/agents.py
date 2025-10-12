from app.hf_client import query_ai

def planner(goal: str):
    prompt = f"""
    As a software architect, create a comprehensive development plan for:

    PROJECT: {goal}

    Provide a detailed technical specification including:

    BACKEND ARCHITECTURE:
    - FastAPI endpoints and their purposes
    - Database schema design (MongoDB)
    - Authentication and authorization flow
    - API request/response models

    FRONTEND STRUCTURE:
    - React components hierarchy
    - State management approach
    - API integration strategy
    - UI/UX considerations

    DEVELOPMENT ROADMAP:
    - Phase 1: Core setup and basic functionality
    - Phase 2: Feature implementation
    - Phase 3: Testing and optimization
    - Phase 4: Deployment preparation

    Be specific and provide actionable technical details.
    """
    return query_ai(prompt)

def developer(task: str):
    prompt = f"""
    As a senior full-stack developer, write complete, production-ready code for:

    TASK: {task}

    TECHNICAL REQUIREMENTS:
    - Backend: Python with FastAPI
    - Frontend: React with modern hooks
    - Database: MongoDB with PyMongo
    - Authentication: JWT tokens
    - Validation: Pydantic models
    - Error handling: Comprehensive try-catch blocks

    CODE QUALITY STANDARDS:
    - Follow PEP 8 and React best practices
    - Include proper documentation comments
    - Implement input validation and sanitization
    - Use environment variables for configuration
    - Write modular, reusable code

    OUTPUT FORMAT:
    Provide the complete implementation with:
    1. All necessary imports and dependencies
    2. Full function/component implementations
    3. Database models and schemas
    4. API route definitions
    5. Example usage if applicable

    Write the complete, working code:
    """
    return query_ai(prompt)

def tester(code: str):
    prompt = f"""
    As a QA engineer, write comprehensive test suites for:

    CODE TO TEST:
    {code}

    TESTING REQUIREMENTS:
    - Use pytest for Python backend testing
    - Use Jest/React Testing Library for frontend testing
    - Cover all functions, endpoints, and components
    - Include unit tests, integration tests, and edge cases
    - Mock external dependencies (database, APIs)
    - Test both success and failure scenarios

    Provide complete test code with:
    - Test fixtures and setup/teardown procedures
    - Mock implementations for external services
    - Comprehensive assertions for expected behavior
    - Error case testing and validation

    Write the complete test suite:
    """
    return query_ai(prompt)

def reviewer(code: str):
    prompt = f"""
    As a senior code reviewer, conduct a thorough technical review:

    CODE TO REVIEW:
    {code}

    REVIEW CRITERIA:

    🔍 CODE QUALITY ANALYSIS:
    - Code readability and maintainability
    - Proper code organization and structure
    - Consistent naming conventions
    - Code duplication and DRY principles

    ⚡ PERFORMANCE CONSIDERATIONS:
    - Database query efficiency
    - Algorithm complexity and optimization
    - Memory usage patterns
    - Potential performance bottlenecks

    🛡️ SECURITY ASSESSMENT:
    - Input validation and sanitization
    - Authentication and authorization checks
    - Data protection and privacy
    - API security best practices
    - Error information disclosure

    🐛 BUGS & ROBUSTNESS:
    - Edge case handling completeness
    - Error recovery mechanisms
    - Race conditions and concurrency issues
    - Resource management and cleanup

    📚 BEST PRACTICES EVALUATION:
    - REST API conventions compliance
    - Python/React idioms and patterns
    - MongoDB usage best practices
    - Error handling strategies

    Provide specific, actionable feedback with:
    - Critical issues that must be addressed immediately
    - Important improvements recommended for production
    - Optimization suggestions for better performance
    - Code examples demonstrating the fixes

    Review feedback:
    """
    return query_ai(prompt)