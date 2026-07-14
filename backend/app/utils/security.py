import bcrypt

def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    """
    # bcrypt.gensalt() generates a random salt
    salt = bcrypt.gensalt()
    # Hash password (expects bytes, returns bytes)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a hashed password.
    """
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False
