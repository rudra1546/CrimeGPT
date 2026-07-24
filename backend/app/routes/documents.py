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

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.post("/generate", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate(
    request: DocumentGenerateRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a legal case document using AI based on Case details, and saves it in the database.
    """
    doc = document_service.generate_and_save_document(db, request, user_id=current_user.id)
    
    pdf_path = None
    docx_path = None
    template_name = None
    preview_text = None

    if doc.generated_content and doc.generated_content.startswith('{'):
        try:
            payload = json.loads(doc.generated_content)
            pdf_path = payload.get("pdf_path")
            docx_path = payload.get("docx_path")
            template_name = payload.get("template_name")
            preview_text = payload.get("preview_text")
        except Exception:
            pass

    return {
        "id": doc.id,
        "case_id": doc.case_id,
        "document_type": doc.document_type,
        "generated_content": doc.generated_content,
        "created_date": doc.created_date,
        "created_by": doc.created_by,
        "pdf_path": pdf_path,
        "docx_path": docx_path,
        "template_name": template_name,
        "preview_text": preview_text
    }


import os
import json
from fastapi.responses import StreamingResponse, FileResponse

@router.get("/{document_id}/pdf")
def export_pdf(document_id: int, db: Session = Depends(get_db)):
    """
    Downloads or views the generated AI document as a PDF file.
    """
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    
    # Check if generated_content contains JSON metadata with pdf_path
    try:
        if db_doc.generated_content and db_doc.generated_content.startswith('{'):
            payload = json.loads(db_doc.generated_content)
            pdf_path = payload.get("pdf_path")
            if pdf_path and os.path.exists(pdf_path):
                return FileResponse(
                    pdf_path,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f"inline; filename=document_{document_id}.pdf"}
                )
    except Exception:
        pass

    # Fallback to dynamic PDF bytes buffer
    buffer = generate_pdf_bytes(db_doc.generated_content)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=document_{document_id}.pdf"}
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
    
    # Check if generated_content contains JSON metadata with docx_path
    try:
        if db_doc.generated_content and db_doc.generated_content.startswith('{'):
            payload = json.loads(db_doc.generated_content)
            docx_path = payload.get("docx_path")
            if docx_path and os.path.exists(docx_path):
                return FileResponse(
                    docx_path,
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={"Content-Disposition": f"attachment; filename=document_{document_id}.docx"}
                )
    except Exception:
        pass

    # Fallback to dynamic docx bytes buffer
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
                
        pdf_path = None
        docx_path = None
        template_name = None
        preview_text = None

        if doc.generated_content and doc.generated_content.startswith('{'):
            try:
                payload = json.loads(doc.generated_content)
                pdf_path = payload.get("pdf_path")
                docx_path = payload.get("docx_path")
                template_name = payload.get("template_name")
                preview_text = payload.get("preview_text")
            except Exception:
                pass

        response_data.append({
            "id": doc.id,
            "case_id": doc.case_id,
            "fir_number": fir,
            "document_type": doc.document_type,
            "generated_content": doc.generated_content,
            "created_date": doc.created_date,
            "created_by": doc.created_by,
            "created_by_name": creator_name,
            "pdf_path": pdf_path,
            "docx_path": docx_path,
            "template_name": template_name,
            "preview_text": preview_text
        })
    return response_data

@router.get("/case/{case_id}", response_model=list[DocumentListResponse])
def get_case_documents(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieve all generated legal documents linked to a specific case.
    """
    from app.models.case import Case
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    response_data = []
    for doc in docs:
        case = db.query(Case).filter(Case.id == doc.case_id).first()
        fir = case.fir_number if case else "N/A"
        
        creator_name = "N/A"
        if doc.created_by:
            user = db.query(User).filter(User.id == doc.created_by).first()
            if user:
                creator_name = user.name

        pdf_path = None
        docx_path = None
        template_name = None
        preview_text = None

        if doc.generated_content and doc.generated_content.startswith('{'):
            try:
                payload = json.loads(doc.generated_content)
                pdf_path = payload.get("pdf_path")
                docx_path = payload.get("docx_path")
                template_name = payload.get("template_name")
                preview_text = payload.get("preview_text")
            except Exception:
                pass
                
        response_data.append({
            "id": doc.id,
            "case_id": doc.case_id,
            "fir_number": fir,
            "document_type": doc.document_type,
            "generated_content": doc.generated_content,
            "created_date": doc.created_date,
            "created_by": doc.created_by,
            "created_by_name": creator_name,
            "pdf_path": pdf_path,
            "docx_path": docx_path,
            "template_name": template_name,
            "preview_text": preview_text
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
    doc = document_service.regenerate_document(db, document_id, user_id=current_user.id)

    pdf_path = None
    docx_path = None
    template_name = None
    preview_text = None

    if doc.generated_content and doc.generated_content.startswith('{'):
        try:
            payload = json.loads(doc.generated_content)
            pdf_path = payload.get("pdf_path")
            docx_path = payload.get("docx_path")
            template_name = payload.get("template_name")
            preview_text = payload.get("preview_text")
        except Exception:
            pass

    return {
        "id": doc.id,
        "case_id": doc.case_id,
        "document_type": doc.document_type,
        "generated_content": doc.generated_content,
        "created_date": doc.created_date,
        "created_by": doc.created_by,
        "pdf_path": pdf_path,
        "docx_path": docx_path,
        "template_name": template_name,
        "preview_text": preview_text
    }

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document_route(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a generated legal document record from DB and deletes DOCX and PDF storage files.
    """
    return document_service.delete_document(db, document_id, user_id=current_user.id, user_role=current_user.role)

