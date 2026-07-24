import os
import logging
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError
from fastapi import HTTPException, status
from app.services.ollama_service import generate_ollama_response

# Ensure environment variables are loaded
load_dotenv(override=True)

logger = logging.getLogger("crimegpt.ai")

# Setup API Key configuration check
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IS_MOCK = not GEMINI_API_KEY or GEMINI_API_KEY in ["your-gemini-api-key-here", "mock"]

# Configurable Gemini Models
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

# Initialize the reusable Gemini Client
client = None
if not IS_MOCK:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")

def handle_gemini_exception(e: Exception, action_name: str = "generation"):
    """
    Translates Gemini API errors into clean HTTP status codes instead of generic 500 errors.
    """
    err_str = str(e).upper()
    logger.error(f"Gemini API Error during {action_name}: {e}")

    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "QUOTA" in err_str:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gemini AI quota exceeded or rate limit reached. Please try again later."
        )
    elif "503" in err_str or "UNAVAILABLE" in err_str:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI service is temporarily unavailable. Please try again later."
        )
    elif "404" in err_str or "NOT_FOUND" in err_str:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configured Gemini AI model '{GEMINI_CHAT_MODEL}' is unavailable or not found."
        )
    elif isinstance(e, HTTPException):
        raise e
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI {action_name} failure: {str(e)}"
        )

def generate_document(prompt: str) -> str:
    """
    Calls the Gemini API (Primary Model) to generate documentation or analytical reports based on a prompt.
    If Gemini fails for any reason (429 quota, 503 service unavailable, timeout, network error, or missing key),
    automatically falls back to the local Ollama model (qwen2.5 or configured model) using the EXACT SAME prompt.
    Logs which model generated the document (Gemini or Ollama).
    """
    gemini_error = None

    # Step 1: Attempt Primary Generation via Gemini API
    if client is not None and not IS_MOCK:
        try:
            logger.info(f"[Primary - Gemini] Sending document generation request using model '{GEMINI_CHAT_MODEL}'...")
            response = client.models.generate_content(
                model=GEMINI_CHAT_MODEL,
                contents=prompt,
            )
            if response and response.text:
                logger.info(f"Document generated successfully using Primary model (Gemini - {GEMINI_CHAT_MODEL}).")
                return response.text
            else:
                gemini_error = "Gemini returned empty response text"
        except Exception as e:
            gemini_error = str(e)
            logger.warning(f"Primary Gemini generation failed ({gemini_error}). Switching to local Ollama fallback model...")
    else:
        gemini_error = "Gemini API key is not configured or in mock mode"
        logger.warning(f"Gemini primary model unavailable ({gemini_error}). Switching to local Ollama fallback model...")

    # Step 2: Fallback Generation via Local Ollama Model
    try:
        ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
        logger.info(f"[Fallback - Ollama] Sending document generation request to local Ollama model '{ollama_model}'...")
        ollama_response = generate_ollama_response(prompt=prompt)
        if ollama_response and len(ollama_response.strip()) > 0:
            logger.info(f"Document generated successfully using Fallback model (Ollama - {ollama_model}).")
            return ollama_response
        else:
            raise Exception("Ollama returned empty response content")
    except Exception as ollama_err:
        logger.error(f"Fallback Ollama model generation failed: {ollama_err}")
        # Step 3: Handle double failure
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document generation failed: Both Primary model (Gemini: {gemini_error}) and Fallback model (Ollama: {str(ollama_err)}) encountered errors."
        )
