# import os
# import requests
# from dotenv import load_dotenv

# # Load .env file
# load_dotenv()

# HF_API = os.getenv("HUGGINGFACE_API")
# HF_TOKEN = os.getenv("HF_TOKEN")

# def query_huggingface(prompt: str):
#     if not HF_API or not HF_TOKEN:
#         raise ValueError("Missing Hugging Face API or token. Check your .env configuration.")

#     headers = {"Authorization": f"Bearer {HF_TOKEN}"}
#     payload = {"inputs": prompt}
#     response = requests.post(HF_API, headers=headers, json=payload, timeout=60)

#     if response.status_code != 200:
#         return {"error": response.text}
#     return response.json()[0]["generated_text"]



# import requests, os
# from dotenv import load_dotenv
# load_dotenv()

# HF_API = os.getenv("HUGGINGFACE_API")
# HF_TOKEN = os.getenv("HF_TOKEN")

# headers = {"Authorization": f"Bearer {HF_TOKEN}"}
# payload = {"inputs": "Explain what a to-do list app is."}
# r = requests.post(HF_API, headers=headers, json=payload)
# print(r.status_code, r.text[:200])




# import requests, os
# from dotenv import load_dotenv

# load_dotenv()

# HF_TOKEN = os.getenv("HF_TOKEN")
# HF_API = os.getenv("HUGGINGFACE_API", "https://api-inference.huggingface.co/models/google/flan-t5-small")

# def query_huggingface(prompt: str):
#     headers = {"Authorization": f"Bearer {HF_TOKEN}"}
#     payload = {"inputs": prompt}

#     try:
#         r = requests.post(HF_API, headers=headers, json=payload, timeout=60)
#         if r.status_code == 200:
#             data = r.json()
#             if isinstance(data, list) and "generated_text" in data[0]:
#                 return data[0]["generated_text"]
#             if isinstance(data, list) and "summary_text" in data[0]:
#                 return data[0]["summary_text"]
#         else:
#             return {"error": f"HF API Error {r.status_code}: {r.text}"}
#     except Exception as e:
#         return {"error": str(e)}





import requests, os, time
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
HF_API = os.getenv("HUGGINGFACE_API")

def query_huggingface(prompt: str, max_retries=3):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    # Better payload structure
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.7,
            "return_full_text": False
        },
        "options": {
            "wait_for_model": True
        }
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(HF_API, headers=headers, json=payload, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                # Handle different response formats
                if isinstance(data, list) and len(data) > 0:
                    return data[0].get('generated_text', str(data[0]))
                elif isinstance(data, dict):
                    return data.get('generated_text', str(data))
                return str(data)
            
            elif response.status_code == 503:
                # Model is loading
                wait_time = (attempt + 1) * 10
                print(f"Model loading, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
                
            else:
                return f"API Error {response.status_code}: {response.text}"
                
        except requests.exceptions.Timeout:
            return "Request timeout - model might be loading"
        except Exception as e:
            return f"Request failed: {str(e)}"
    
    return "Max retries exceeded - model unavailable"