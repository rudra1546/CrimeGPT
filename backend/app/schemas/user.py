from enum import Enum
from pydantic import BaseModel, EmailStr, Field

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    POLICE_OFFICER = "POLICE_OFFICER"
    SHO = "SHO"
    LEGAL_ADVISOR = "LEGAL_ADVISOR"

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, description="Plaintext password, min 6 characters")
    role: UserRole = Field(UserRole.POLICE_OFFICER, description="Role of the user, must be ADMIN or POLICE_OFFICER")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: str | None = None
    role: str | None = None
