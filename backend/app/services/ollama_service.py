import os
import time
import logging
import requests
from fastapi import HTTPException, status

logger = logging.getLogger("crimegpt.services.ollama")

def get_ollama_config():
    return {
        "url": os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip('/'),
        "model": os.getenv("OLLAMA_MODEL", "qwen2.5:3b"),
        "timeout": int(os.getenv("OLLAMA_TIMEOUT", "300")),
        "num_ctx": int(os.getenv("OLLAMA_NUM_CTX", "2048")),
        "temperature": float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
    }

def generate_ollama_response(prompt: str, system_prompt: str = None) -> str:
    """
    Sends an optimized generation request to the local Ollama server API.
    Only returns 503 if Ollama server connection fails.
    """
    cfg = get_ollama_config()
    endpoint = f"{cfg['url']}/api/generate"

    payload = {
        "model": cfg["model"],
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": cfg["temperature"],
            "num_ctx": cfg["num_ctx"]
        }
    }
    if system_prompt:
        payload["system"] = system_prompt

    start_time = time.time()
    logger.info(f"[Ollama] Prompt sent (model={cfg['model']}, num_ctx={cfg['num_ctx']}, temp={cfg['temperature']})...")

    try:
        response = requests.post(endpoint, json=payload, timeout=(3, cfg["timeout"]))
        elapsed_time = round(time.time() - start_time, 2)
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get("response", "").strip()
            logger.info(f"[Ollama] Response received in {elapsed_time} seconds")
            return answer
        else:
            logger.error(f"[Ollama] Server returned HTTP {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama generation failed (Status {response.status_code}): {response.text}"
            )
    except requests.exceptions.Timeout:
        elapsed_time = round(time.time() - start_time, 2)
        logger.error(f"[Ollama] Generation request timed out after {elapsed_time} seconds.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Ollama generation request timed out after {cfg['timeout']} seconds."
        )
    except requests.exceptions.ConnectionError as ce:
        elapsed_time = round(time.time() - start_time, 2)
        logger.error(f"[Ollama] Server connection failure after {elapsed_time}s to {endpoint}: {ce}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama server is not running. Please start Ollama and try again."
        )
    except requests.exceptions.RequestException as e:
        elapsed_time = round(time.time() - start_time, 2)
        logger.error(f"[Ollama] Request exception after {elapsed_time}s: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama server is not running. Please start Ollama and try again."
        )
