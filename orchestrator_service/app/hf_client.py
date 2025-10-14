import requests, time

class OllamaClient:
    def __init__(self):
        # self.base_url = "http://localhost:11434/api/generate"
        self.base_url = "http://host.docker.internal:11434/api/generate"
        self.model = "qwen3-coder:480b-cloud"  # Your chosen model
        # self.model = "deepseek-v3.1:671b-cloud"  # Your chosen model
    
    def query_ai(self, prompt: str):
        """
        Query the qwen3-coder model - specialized for coding tasks
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 2000  # Good balance for coding tasks
            }
        }

        print(f"🚀 Calling {self.model}...")
        print(f"📝 Prompt: {prompt[:150]}...")
        
        try:
            response = requests.post(self.base_url, json=payload, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data['response']
                print(f"✅ Response received ({len(response_text)} characters)")
                return response_text
            else:
                error_msg = f"Error {response.status_code}: {response.text}"
                print(f"❌ {error_msg}")
                return error_msg
                
        except requests.exceptions.ConnectionError:
            return "Error: Cannot connect to Ollama. Please make sure Ollama is running on localhost:11434"
        except requests.exceptions.Timeout:
            return "Error: Request timeout - model is taking too long to respond"
        except Exception as e:
            return f"Error: {str(e)}"

# Global instance
client = OllamaClient()

def query_ai(prompt: str):
    """Main function - uses only qwen3-coder"""
    return client.query_ai(prompt)

def test_model():
    """Test qwen3-coder with a coding task"""
    test_prompt = "Write a Python FastAPI endpoint for user registration with email validation:"
    print("🧪 Testing qwen3-coder...")
    result = query_ai(test_prompt)
    print(f"🧪 Test Result: {result}")
    return result

def get_model_info():
    """Get information about the current model"""
    return {
        "current_model": "qwen3-coder:480b-cloud",
        "specialization": "Coding and software development",
        "size": "480B parameters (cloud)",
        "capabilities": ["Code generation", "Code review", "Testing", "Architecture planning"]
    }