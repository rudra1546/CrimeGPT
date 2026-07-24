import os
import time
import logging
from typing import Optional
from fastapi import HTTPException, status

logger = logging.getLogger("crimegpt.services.ai")

def _get_groq_client():
    """
    Initializes and returns the Groq client if GROQ_API_KEY is available.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key or groq_key.lower() in ["your-groq-api-key-here", "mock"]:
        return None, "GROQ_API_KEY is not configured or in mock mode"
    try:
        from groq import Groq
        timeout = float(os.getenv("GROQ_TIMEOUT", "30.0"))
        client = Groq(api_key=groq_key, timeout=timeout)
        return client, None
    except Exception as e:
        return None, f"Failed to initialize Groq client: {e}"

def generate_groq_response(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Sends a completion request to the Groq cloud API.
    Raises Exception if Groq is unconfigured or request fails.
    """
    client, init_err = _get_groq_client()
    if not client:
        raise Exception(init_err)

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    temperature = float(os.getenv("GROQ_TEMPERATURE", "0.2"))

    logger.info(f"[AI Provider - Groq] Sending request (model: '{model}', temp: {temperature})...")
    start_time = time.time()

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        elapsed_time = round(time.time() - start_time, 2)

        if response and response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            if content and len(content.strip()) > 0:
                logger.info(f"[AI Provider - Groq] Successfully served request using Groq (model: '{model}') in {elapsed_time}s.")
                return content.strip()
            else:
                raise Exception("Groq returned empty response text")
        else:
            raise Exception("Groq response choices are missing")
    except Exception as e:
        elapsed_time = round(time.time() - start_time, 2) if 'start_time' in locals() else 0
        logger.error(f"[AI Provider - Groq] Generation failed after {elapsed_time}s: {e}")
        raise e

def generate_ai_response(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Centralized Production AI Service Layer entrypoint for all CrimeGPT AI features.
    Uses Groq as the single production cloud LLM provider.
    """
    return generate_groq_response(prompt=prompt, system_prompt=system_prompt)
