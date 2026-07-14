# Pydantic schemas package
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token, TokenData, UserRole
from app.schemas.case import (
    CaseDetailsCreate, CaseCreate, CaseDetailsUpdate, CaseUpdate,
    CaseDetailsResponse, CaseResponse
)

from app.schemas.document import DocumentType, DocumentGenerateRequest, DocumentResponse

__all__ = [
    "UserRegister", "UserLogin", "UserResponse", "Token", "TokenData", "UserRole",
    "CaseDetailsCreate", "CaseCreate", "CaseDetailsUpdate", "CaseUpdate",
    "CaseDetailsResponse", "CaseResponse",
    "DocumentType", "DocumentGenerateRequest", "DocumentResponse"
]
