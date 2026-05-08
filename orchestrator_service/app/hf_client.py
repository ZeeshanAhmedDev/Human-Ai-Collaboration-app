import os
import time

import requests


def _get_generate_url() -> str:
    base_url = os.getenv("OLLAMA_BASE_URL") or os.getenv("OLLAMA_HOST")

    if not base_url:
        return "https://ollama.com/api/generate"

    base_url = base_url.rstrip("/")
    if base_url.endswith("/api/generate"):
        return base_url

    return f"{base_url}/api/generate"


class OllamaClient:
    def __init__(self):
        self.base_url = _get_generate_url()
        self.model = os.getenv("OLLAMA_MODEL", "qwen3-coder:480b")
        self.api_key = os.getenv("OLLAMA_API_KEY")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "180"))
        self.num_predict = int(os.getenv("OLLAMA_NUM_PREDICT", "900"))
        self.session = requests.Session()

    def query_ai(self, prompt: str):
        if "ollama.com" in self.base_url and not self.api_key:
            return "Error: OLLAMA_API_KEY is missing for Ollama Cloud."

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.5,
                "num_predict": self.num_predict
            }
        }

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        started_at = time.perf_counter()

        try:
            response = self.session.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=self.timeout
            )
            elapsed = time.perf_counter() - started_at

            if response.status_code == 200:
                result = response.json().get("response", "")
                print(
                    f"Ollama returned {len(result)} chars from {self.model} "
                    f"in {elapsed:.1f}s"
                )
                return result

            return f"Error {response.status_code}: {response.text}"

        except requests.exceptions.Timeout:
            return (
                f"Error: AI model request timed out after {self.timeout}s. "
                "Try a smaller model or lower OLLAMA_NUM_PREDICT."
            )

        except requests.exceptions.ConnectionError:
            return f"Error: Cannot connect to AI model endpoint {self.base_url}."

        except Exception as exc:
            return f"Error: {str(exc)}"


client = OllamaClient()


def query_ai(prompt: str):
    return client.query_ai(prompt)
