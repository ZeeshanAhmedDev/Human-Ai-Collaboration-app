import requests

OLLAMA_API = "http://host.docker.internal:11434/api/generate"  # allows access from Docker to local Ollama

def generate_plan(goal: str) -> str:
    prompt = f"You are a project planner. Break down this goal into subtasks:\nGoal: {goal}"
    payload = {"model": "mistral", "prompt": prompt}
    response = requests.post(OLLAMA_API, json=payload, stream=True)
    result = ""
    for line in response.iter_lines():
        if line:
            data = line.decode("utf-8")
            if '"response"' in data:
                text = data.split('"response":"')[1].split('"')[0]
                result += text
    return result.strip()
