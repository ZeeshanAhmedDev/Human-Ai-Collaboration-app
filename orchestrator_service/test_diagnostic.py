# test_qwen_coder.py
import requests
import json

def test_qwen_coder():
    payload = {
        "model": "qwen3-coder:480b-cloud",
        "prompt": "Write a complete FastAPI application with user authentication using JWT tokens:",
        "stream": False
    }
    
    print("🧪 Testing qwen3-coder:480b-cloud...")
    
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS!")
            print(f"Response: {data['response'][:500]}...")
        else:
            print(f"❌ FAILED: {response.text}")
            
    except Exception as e:
        print(f"💥 ERROR: {e}")

if __name__ == "__main__":
    test_qwen_coder()