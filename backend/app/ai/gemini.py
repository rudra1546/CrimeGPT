import os
import logging
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

# Ensure environment variables are loaded
load_dotenv(override=True)

logger = logging.getLogger("crimegpt.ai")

# Setup API Key configuration check
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IS_MOCK = not GEMINI_API_KEY or GEMINI_API_KEY in ["your-gemini-api-key-here", "mock"]

# Initialize the reusable Gemini Client
client = None
if not IS_MOCK:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        IS_MOCK = True

def generate_document(prompt: str) -> str:
    """
    Calls the Gemini API to generate documentation or analytical reports based on a prompt.
    If the GEMINI_API_KEY is missing or set to the placeholder, returns a mock document 
    to facilitate development and local testing.
    """
    if IS_MOCK or client is None:
        logger.warning(
            "Gemini API key is not configured or client initialization failed. "
            "Returning mock generation."
        )
        return (
            "[MOCK GENERATION - DEVELOPMENT MODE]\n"
            "--------------------------------------------------\n"
            "This is a mock document generated for development because the GEMINI_API_KEY is not configured.\n"
            "Configure a valid GEMINI_API_KEY in your .env file to enable live Gemini API execution.\n\n"
            f"Prompt received:\n\"{prompt}\"\n\n"
            "Generated Analysis:\n"
            "1. Found analytical matches on suspect behaviors matching incident report description.\n"
            "2. Associated standard IPC sections applicable to the input context.\n"
            "3. Document drafting generated successfully."
        )

    try:
        # Execute query using standard gemini-2.5-flash model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except APIError as e:
        logger.error(f"Gemini API Error occurred: {e}")
        raise RuntimeError(f"Gemini API failure: {e.message}") from e
    except Exception as e:
        logger.error(f"Unexpected error calling Gemini API: {e}")
        raise RuntimeError(f"Unexpected error calling Gemini API: {str(e)}") from e
