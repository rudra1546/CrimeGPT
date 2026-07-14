from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.document import DocumentGenerateRequest, DocumentResponse, DocumentListResponse
from app.services import document_service
from app.routes.deps import RoleChecker, get_current_user
from app.models.document import Document
from app.models.user import User
from app.utils.export import generate_pdf_bytes, generate_docx_bytes


# Secure all routes in this router to only allow ADMIN and POLICE_OFFICER roles

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER"]))])

@router.post("/generate", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate(
    request: DocumentGenerateRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a legal case document (seizure memo, remand application, or charge sheet)
    using AI based on Case details, and saves it in the database.
    """
    return document_service.generate_and_save_document(db, request, user_id=current_user.id)


@router.get("/{document_id}/pdf")
def export_pdf(document_id: int, db: Session = Depends(get_db)):
    """
    Downloads the generated AI document as a PDF file.
    """
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    
    buffer = generate_pdf_bytes(db_doc.generated_content)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=document_{document_id}.pdf"}
    )

@router.get("/{document_id}/docx")
def export_docx(document_id: int, db: Session = Depends(get_db)):
    """
    Downloads the generated AI document as a Word (.docx) file.
    """
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    
    buffer = generate_docx_bytes(db_doc.generated_content)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=document_{document_id}.docx"}
    )

@router.get("/", response_model=list[DocumentListResponse])
def get_all_documents(db: Session = Depends(get_db)):
    """
    Retrieve all generated legal documents across all cases.
    """
    from app.models.case import Case
    
    docs = db.query(Document).all()
    response_data = []
    for doc in docs:
        case = db.query(Case).filter(Case.id == doc.case_id).first()
        fir = case.fir_number if case else "N/A"
        
        creator_name = "N/A"
        if doc.created_by:
            user = db.query(User).filter(User.id == doc.created_by).first()
            if user:
                creator_name = user.name
                
        response_data.append({
            "id": doc.id,
            "case_id": doc.case_id,
            "fir_number": fir,
            "document_type": doc.document_type,
            "generated_content": doc.generated_content,
            "created_date": doc.created_date,
            "created_by": doc.created_by,
            "created_by_name": creator_name
        })
    return response_data

@router.post("/{document_id}/regenerate", response_model=DocumentResponse)
def regenerate_document_route(
    document_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regenerates the contents of a legal document using updated case details and Gemini.
    """
    return document_service.regenerate_document(db, document_id, user_id=current_user.id)

