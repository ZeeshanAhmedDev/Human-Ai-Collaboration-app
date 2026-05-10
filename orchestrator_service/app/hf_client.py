import json
import os
import time
from datetime import datetime, timezone

import requests


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_generate_url() -> str:
    base_url = os.getenv("OLLAMA_BASE_URL") or os.getenv("OLLAMA_HOST")

    if not base_url:
        return "https://ollama.com/api/generate"

    base_url = base_url.rstrip("/")
    if base_url.endswith("/api/generate"):
        return base_url

    return f"{base_url}/api/generate"


def _estimate_cost(prompt: str, response: str, cost_per_1k_tokens: float) -> float:
    # Approximate token count for cost tracking when provider token usage is unavailable.
    estimated_tokens = max(1, round((len(prompt) + len(response)) / 4))
    return round((estimated_tokens / 1000) * cost_per_1k_tokens, 6)


class OllamaClient:
    def __init__(self):
        self.base_url = _get_generate_url()
        self.model = os.getenv("OLLAMA_MODEL") or "qwen3-coder:480b"
        self.api_key = os.getenv("OLLAMA_API_KEY")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "180"))
        self.num_predict = int(os.getenv("OLLAMA_NUM_PREDICT", "900"))
        self.cost_per_1k_tokens = float(os.getenv("OLLAMA_COST_PER_1K_TOKENS", "0"))

    def _metadata(
        self,
        prompt: str,
        response: str,
        status: str,
        start_time: str,
        end_time: str,
        response_time_seconds: float,
        error_message: str | None = None,
    ) -> dict:
        return {
            "model": self.model,
            "prompt": prompt,
            "response": response,
            "status": status,
            "error_message": error_message,
            "start_time": start_time,
            "end_time": end_time,
            "response_time_seconds": response_time_seconds,
            "estimated_cost": _estimate_cost(prompt, response, self.cost_per_1k_tokens),
        }

    def query_ai(self, prompt: str) -> dict:
        start_time = _utc_now_iso()
        started_at = time.perf_counter()

        if "ollama.com" in self.base_url and not self.api_key:
            end_time = _utc_now_iso()
            error_message = "OLLAMA_API_KEY is missing for Ollama Cloud."
            elapsed = round(time.perf_counter() - started_at, 3)
            return {
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.5,
                "num_predict": self.num_predict,
            },
        }

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()

            if response.status_code == 200:
                result = response.json().get("response", "")
                print(f"Ollama returned {len(result)} chars from {self.model} in {elapsed:.1f}s")
                return {
                    "response": result,
                    "metadata": self._metadata(
                        prompt,
                        result,
                        "success",
                        start_time,
                        end_time,
                        elapsed,
                    ),
                }

            error_message = f"Error {response.status_code}: {response.text}"
            return {
                "response": error_message,
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        except requests.exceptions.Timeout:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = (
                f"AI model request timed out after {self.timeout}s. "
                "Try a smaller model or lower OLLAMA_NUM_PREDICT."
            )
            return {
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        except requests.exceptions.ConnectionError:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = f"Cannot connect to AI model endpoint {self.base_url}."
            return {
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        except Exception as exc:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = str(exc)
            return {
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

    def stream_ai(self, prompt: str):
        start_time = _utc_now_iso()
        started_at = time.perf_counter()

        if "ollama.com" in self.base_url and not self.api_key:
            end_time = _utc_now_iso()
            error_message = "OLLAMA_API_KEY is missing for Ollama Cloud."
            elapsed = round(time.perf_counter() - started_at, 3)
            yield {
                "type": "final",
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }
            return

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": 0.5,
                "num_predict": self.num_predict,
            },
        }

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response_chunks = []

        try:
            with requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=self.timeout,
                stream=True,
            ) as response:
                elapsed = round(time.perf_counter() - started_at, 3)

                if response.status_code != 200:
                    error_message = f"Error {response.status_code}: {response.text}"
                    end_time = _utc_now_iso()
                    yield {
                        "type": "final",
                        "response": error_message,
                        "metadata": self._metadata(
                            prompt,
                            "",
                            "failed",
                            start_time,
                            end_time,
                            elapsed,
                            error_message,
                        ),
                    }
                    return

                for line in response.iter_lines(decode_unicode=True):
                    if not line:
                        continue

                    try:
                        payload_line = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    chunk = payload_line.get("response", "")
                    if chunk:
                        response_chunks.append(chunk)
                        yield {
                            "type": "chunk",
                            "chunk": chunk,
                        }

                    if payload_line.get("done"):
                        result = "".join(response_chunks)
                        elapsed = round(time.perf_counter() - started_at, 3)
                        end_time = _utc_now_iso()
                        print(
                            f"Ollama streamed {len(result)} chars from "
                            f"{self.model} in {elapsed:.1f}s"
                        )
                        yield {
                            "type": "final",
                            "response": result,
                            "metadata": self._metadata(
                                prompt,
                                result,
                                "success",
                                start_time,
                                end_time,
                                elapsed,
                            ),
                        }
                        return

                result = "".join(response_chunks)
                elapsed = round(time.perf_counter() - started_at, 3)
                end_time = _utc_now_iso()
                error_message = None if result else "Model stream ended without a response."
                yield {
                    "type": "final",
                    "response": result,
                    "metadata": self._metadata(
                        prompt,
                        result,
                        "success" if result else "failed",
                        start_time,
                        end_time,
                        elapsed,
                        error_message,
                    ),
                }

        except requests.exceptions.Timeout:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = (
                f"AI model request timed out after {self.timeout}s. "
                "Try a smaller model or lower OLLAMA_NUM_PREDICT."
            )
            yield {
                "type": "final",
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        except requests.exceptions.ConnectionError:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = f"Cannot connect to AI model endpoint {self.base_url}."
            yield {
                "type": "final",
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }

        except Exception as exc:
            elapsed = round(time.perf_counter() - started_at, 3)
            end_time = _utc_now_iso()
            error_message = str(exc)
            yield {
                "type": "final",
                "response": f"Error: {error_message}",
                "metadata": self._metadata(
                    prompt,
                    "",
                    "failed",
                    start_time,
                    end_time,
                    elapsed,
                    error_message,
                ),
            }


client = OllamaClient()


def query_ai(prompt: str) -> dict:
    return client.query_ai(prompt)


def stream_ai(prompt: str):
    yield from client.stream_ai(prompt)
