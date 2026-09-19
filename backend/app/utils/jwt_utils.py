import os
from datetime import datetime, timedelta, timezone
import jwt
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-fallback-super-secret-key-for-jwt")
ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Generate a JWT token containing the data dictionary.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=DEFAULT_EXPIRE_MINUTES)
    
    # Store token expiration timestamp as 'exp' claim (standard JWT claim)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT token. Returns the payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        # Token is expired
        return None
    except jwt.PyJWTError:
        # Token is invalid (signature failure, structure failure, etc.)
        return None

def create_media_ticket(user_email: str, case_id: int, attachment_id: int, expires_seconds: int = 120) -> str:
    """
    Generate a short-lived (120s), single-attachment scoped ticket
    for safe HTML5 media streaming without exposing master JWT access tokens in query parameters.
    """
    payload = {
        "sub": user_email,
        "type": "media_ticket",
        "case_id": case_id,
        "attachment_id": attachment_id,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_seconds)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_media_ticket(token: str, expected_case_id: int | None = None, expected_attachment_id: int | None = None) -> dict | None:
    """
    Decode and validate a scoped media ticket.
    Checks signature, expiration, ticket type, and matches case/attachment IDs if provided.
    """
    payload = decode_access_token(token)
    if not payload:
        return None
    if payload.get("type") != "media_ticket":
        return None
    if expected_case_id is not None and payload.get("case_id") != expected_case_id:
        return None
    if expected_attachment_id is not None and payload.get("attachment_id") != expected_attachment_id:
        return None
    return payload


