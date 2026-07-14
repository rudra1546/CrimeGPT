from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token
from app.services.auth_service import register_user, authenticate_user
from app.utils.jwt_utils import create_access_token
from app.routes.deps import get_current_user, RoleChecker
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new user (POLICE_OFFICER or ADMIN).
    """
    user = register_user(db, user_data)
    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns a JWT access token.
    """
    user = authenticate_user(db, login_data)
    
    # Create access token with subject claim as email and custom claim for role
    token_data = {"sub": user.email, "role": user.role}
    access_token = create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns information about the currently authenticated user.
    Requires a valid JWT Bearer token in the Authorization header.
    """
    return current_user

@router.get("/admin-only", response_model=UserResponse)
def get_admin_only(current_user: User = Depends(RoleChecker(["ADMIN"]))):
    """
    Protected endpoint that only ADMINs can access.
    """
    return current_user
