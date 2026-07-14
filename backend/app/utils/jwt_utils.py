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
