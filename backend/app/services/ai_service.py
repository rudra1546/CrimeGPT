import os
import re
import time
import logging
from typing import Optional
from fastapi import HTTPException, status

logger = logging.getLogger("crimegpt.services.ai")

# Officially recommended Groq production model (migrated from retired llama-3.3-70b-versatile)
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
RETIRED_MODELS = {"llama-3.3-70b-versatile", "llama-3.1-70b-versatile"}

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

def sanitize_reasoning(content: str) -> str:
    """
    Strips internal reasoning tokens, thought blocks, and XML tags (<think>...</think>,
    <thought>...</thought>, <reasoning>...</reasoning>) from GPT-OSS model responses,
    ensuring only clean, user-facing legal prose reaches the CrimeGPT UI.
    """
    if not content:
        return ""
    cleaned = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
    cleaned = re.sub(r'<thought>.*?</thought>', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'<reasoning>.*?</reasoning>', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()

def handle_groq_exception(e: Exception, model_name: str, timeout: float = 30.0) -> None:
    """
    Translates Groq API and provider errors into clean, descriptive HTTP exceptions
    so that model failures and provider outages do not surface as unexplained HTTP 500 errors.
    """
    if isinstance(e, HTTPException):
        raise e

    try:
        import groq
    except ImportError:
        groq = None

    err_str = str(e)
    err_lower = err_str.lower()
    status_code = getattr(e, "status_code", None)

    # 1. Model Not Found / Retired (HTTP 404)
    if (
        (groq and hasattr(groq, "NotFoundError") and isinstance(e, groq.NotFoundError))
        or status_code == 404
        or "model_not_found" in err_lower
        or "does not exist" in err_lower
        or "model not found" in err_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configured Groq AI model '{model_name}' was not found or has been retired. Officially recommended model is '{DEFAULT_GROQ_MODEL}'."
        )

    # 2. Rate Limit / Quota Exceeded (HTTP 429)
    if (
        (groq and hasattr(groq, "RateLimitError") and isinstance(e, groq.RateLimitError))
        or status_code == 429
        or "rate_limit" in err_lower
        or "quota" in err_lower
        or "too many requests" in err_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Groq AI quota exceeded or rate limit reached. Please try again later."
        )

    # 3. Authentication / Key Invalid (HTTP 401)
    if (
        (groq and hasattr(groq, "AuthenticationError") and isinstance(e, groq.AuthenticationError))
        or status_code == 401
        or "invalid_api_key" in err_lower
        or "authentication" in err_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq AI provider authentication failed: Invalid or expired GROQ_API_KEY."
        )

    # 4. Timeout (HTTP 504)
    if (
        (groq and hasattr(groq, "APITimeoutError") and isinstance(e, groq.APITimeoutError))
        or status_code == 504
        or "timeout" in err_lower
        or "timed out" in err_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Groq AI generation request timed out after {timeout}s."
        )

    # 5. Connection / Service Unavailable (HTTP 503)
    if (
        (groq and hasattr(groq, "APIConnectionError") and isinstance(e, groq.APIConnectionError))
        or status_code == 503
        or "connection error" in err_lower
        or "service unavailable" in err_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq AI service is temporarily unavailable or unreachable. Please try again later."
        )

    # 6. Bad Request / Invalid Parameters (HTTP 400)
    if (
        (groq and hasattr(groq, "BadRequestError") and isinstance(e, groq.BadRequestError))
        or status_code == 400
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Groq AI bad request: {err_str}"
        )

    # 7. General Upstream Provider Failure (HTTP 502)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Groq AI generation failure (model '{model_name}'): {err_str}"
    )

def generate_groq_response(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_completion_tokens: Optional[int] = None,
) -> str:
    """
    Sends a completion request to the Groq cloud API using openai/gpt-oss-120b.
    Translates provider errors into descriptive HTTP exceptions.
    Maps token limits to Groq's recommended max_completion_tokens parameter.
    Isolates GPT-OSS reasoning chains so internal thinking is never exposed to the frontend.
    """
    client, init_err = _get_groq_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Provider service unavailable: {init_err}"
        )

    try:
        timeout = float(os.getenv("GROQ_TIMEOUT", "30.0"))
    except (ValueError, TypeError):
        timeout = 30.0

    # Resolve model configuration
    if model is None:
        model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
        if not model:
            model = DEFAULT_GROQ_MODEL

    # Proactive migration guard: if configured model is a retired model
    if model in RETIRED_MODELS:
        logger.warning(
            f"[AI Provider - Groq] Configured model '{model}' was retired by Groq on August 16, 2026. "
            f"Automatically migrating request to officially recommended '{DEFAULT_GROQ_MODEL}'."
        )
        model = DEFAULT_GROQ_MODEL

    # Resolve temperature (default: 0.2 for deterministic legal reasoning)
    if temperature is None:
        try:
            temperature = float(os.getenv("GROQ_TEMPERATURE", "0.2"))
        except (ValueError, TypeError):
            temperature = 0.2

    # Map max_tokens / GROQ_MAX_TOKENS to Groq's recommended max_completion_tokens parameter
    target_completion_tokens = max_completion_tokens if max_completion_tokens is not None else max_tokens
    if target_completion_tokens is None:
        max_tokens_env = os.getenv("GROQ_MAX_TOKENS", "").strip()
        if max_tokens_env:
            try:
                target_completion_tokens = int(max_tokens_env)
            except (ValueError, TypeError):
                target_completion_tokens = 4096
        else:
            target_completion_tokens = 4096

    # For reasoning models like openai/gpt-oss-120b, ensure completion budget accounts for internal reasoning tokens
    if target_completion_tokens is not None and target_completion_tokens < 1024:
        target_completion_tokens = 1024

    logger.info(
        f"[AI Provider - Groq] Sending request (model: '{model}', temp: {temperature}, "
        f"max_completion_tokens: {target_completion_tokens})..."
    )
    start_time = time.time()

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    request_kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    # Use max_completion_tokens (Groq recommended)
    if target_completion_tokens is not None:
        request_kwargs["max_completion_tokens"] = target_completion_tokens

    # GPT-OSS Reasoning control: use reasoning_format='parsed' so reasoning is separated from content
    reasoning_fmt = os.getenv("GROQ_REASONING_FORMAT", "parsed").strip()
    if reasoning_fmt and reasoning_fmt.lower() in ["parsed", "hidden"]:
        request_kwargs["reasoning_format"] = reasoning_fmt.lower()

    # Optional top_p support
    top_p_env = os.getenv("GROQ_TOP_P", "").strip()
    if top_p_env:
        try:
            request_kwargs["top_p"] = float(top_p_env)
        except (ValueError, TypeError):
            pass

    try:
        response = client.chat.completions.create(**request_kwargs)
        elapsed_time = round(time.time() - start_time, 2)

        if response and response.choices and len(response.choices) > 0:
            choice = response.choices[0]
            raw_content = choice.message.content or ""

            # Ensure internal reasoning is logged for telemetry but excluded from user response
            if hasattr(choice.message, "reasoning") and choice.message.reasoning:
                reasoning_len = len(str(choice.message.reasoning))
                logger.debug(
                    f"[AI Provider - Groq] GPT-OSS reasoning isolated ({reasoning_len} chars) - excluded from response."
                )

            # Defensive post-processing: remove any <think> tags if raw tokens appear
            final_content = sanitize_reasoning(raw_content)

            if final_content and len(final_content.strip()) > 0:
                logger.info(
                    f"[AI Provider - Groq] Successfully served request using Groq (model: '{model}') in {elapsed_time}s."
                )
                return final_content.strip()
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Groq returned empty response text after reasoning filtering."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Groq response choices are missing"
            )
    except Exception as e:
        elapsed_time = round(time.time() - start_time, 2) if 'start_time' in locals() else 0
        logger.error(f"[AI Provider - Groq] Generation failed after {elapsed_time}s (model: '{model}'): {e}")

        # Reactive fallback: if 404 model_not_found occurs on a non-default model, retry with DEFAULT_GROQ_MODEL
        err_lower = str(e).lower()
        is_404_not_found = (
            getattr(e, "status_code", None) == 404 or
            "model_not_found" in err_lower or
            "does not exist" in err_lower
        )
        if is_404_not_found and model != DEFAULT_GROQ_MODEL:
            logger.warning(
                f"[AI Provider - Groq Fallback] Model '{model}' not found (404). "
                f"Attempting fallback to recommended model '{DEFAULT_GROQ_MODEL}'..."
            )
            try:
                fallback_kwargs = dict(request_kwargs)
                fallback_kwargs["model"] = DEFAULT_GROQ_MODEL
                fb_start = time.time()
                fb_response = client.chat.completions.create(**fallback_kwargs)
                fb_elapsed = round(time.time() - fb_start, 2)
                if fb_response and fb_response.choices and len(fb_response.choices) > 0:
                    fb_choice = fb_response.choices[0]
                    fb_raw = fb_choice.message.content or ""
                    fb_content = sanitize_reasoning(fb_raw)
                    if fb_content and len(fb_content.strip()) > 0:
                        logger.info(
                            f"[AI Provider - Groq Fallback] Successfully served request using fallback model '{DEFAULT_GROQ_MODEL}' in {fb_elapsed}s."
                        )
                        return fb_content.strip()
            except Exception as fb_err:
                logger.error(f"[AI Provider - Groq Fallback] Fallback to '{DEFAULT_GROQ_MODEL}' also failed: {fb_err}")
                handle_groq_exception(fb_err, model_name=DEFAULT_GROQ_MODEL, timeout=timeout)

        handle_groq_exception(e, model_name=model, timeout=timeout)

def generate_ai_response(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_completion_tokens: Optional[int] = None,
) -> str:
    """
    Centralized Production AI Service Layer entrypoint for all CrimeGPT AI features.
    Uses Groq as the production cloud LLM provider (default: openai/gpt-oss-120b).
    """
    return generate_groq_response(
        prompt=prompt,
        system_prompt=system_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        max_completion_tokens=max_completion_tokens,
    )
