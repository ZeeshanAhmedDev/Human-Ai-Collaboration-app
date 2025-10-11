import os
import requests
from dotenv import load_dotenv

# Load .env file
load_dotenv()

HF_API = os.getenv("HUGGINGFACE_API")
HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_API or not HF_TOKEN:
    raise SystemExit("❌ Missing HUGGINGFACE_API or HF_TOKEN in .env file")

prompt = "Explain how to build a to-do app using FastAPI and React."

headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json"
}
payload = {"inputs": prompt}

print(f"🔍 Testing Hugging Face API: {HF_API}")
print("----------------------------------------------------")

try:
    response = requests.post(HF_API, headers=headers, json=payload, timeout=180)
    print(f"✅ HTTP {response.status_code}")
    print("----------------------------------------------------")
    print("🧠 Model Output:")
    print(response.json())
except requests.exceptions.RequestException as e:
    print("❌ Request failed:", e)
