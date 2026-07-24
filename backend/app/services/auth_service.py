from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin
from app.utils.security import hash_password, verify_password

from datetime import datetime
from app.models.user_audit_log import UserAuditLog

def register_user(db: Session, user_data: UserRegister) -> User:
    """
    Registers a new user in the database.
    Raises HTTPException if email is already registered.
    """
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    # Hash password
    hashed = hash_password(user_data.password)
    
    # Create database object
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed,
        role=user_data.role.value,  # store string representation
        status="ACTIVE",
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log user registration audit entry
    audit = UserAuditLog(
        user_id=new_user.id,
        user_name=new_user.name,
        user_email=new_user.email,
        role=new_user.role,
        action="CREATED",
        status_after_action="ACTIVE",
        performed_by="Self Registration",
        details="Account created via portal registration",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return new_user

def authenticate_user(db: Session, login_data: UserLogin) -> User:
    """
    Authenticates a user using email and password.
    Returns the User model if authentication is successful.
    Raises HTTPException for incorrect credentials or inactive/deleted account.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account status clearance
    user_status = getattr(user, "status", "ACTIVE") or "ACTIVE"
    if user_status.upper() in ["INACTIVE", "DELETED"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated or deleted. Contact Station Administrator.",
        )
        
    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return user
