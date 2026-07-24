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
    Delegates document generation to the centralized AI service layer
    (supporting Groq primary model with automatic Ollama fallback).
    """
    from app.services.ai_service import generate_ai_response
    return generate_ai_response(prompt=prompt)
