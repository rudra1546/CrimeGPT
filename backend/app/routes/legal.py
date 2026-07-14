import os
import shutil
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.rag import load_pdf_text, split_text_to_chunks, add_documents_to_store, answer_query_with_rag
from app.rag.retriever import retrieve_context
from app.routes.deps import RoleChecker

logger = logging.getLogger("crimegpt.routes.legal")

# Secure legal search/indexing to ADMIN and POLICE_OFFICER roles
router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER"]))])

class QueryRequest(BaseModel):
    query: str

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_legal_document(file: UploadFile = File(...)):
    """
    Upload a legal PDF document, parse it, chunk its content, 
    generate embeddings, and index it inside ChromaDB.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF files are allowed."
        )

    # Save to a local temporary directory inside the workspace
    temp_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "temp_uploads"
    )
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)

    try:
        # Write binary stream to file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract text content
        text = load_pdf_text(temp_file_path)
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded PDF does not contain any extractable text."
            )

        # Split text into overlapping semantic chunks
        chunks = split_text_to_chunks(text)

        # Embed and index chunks inside ChromaDB
        add_documents_to_store(chunks)

        return {
            "filename": file.filename,
            "chunks_added": len(chunks),
            "status": "indexed successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed processing PDF upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing and indexing the PDF: {str(e)}"
        )
    finally:
        # Cleanup temporary uploaded file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"Could not clean up temp file {temp_file_path}: {e}")

@router.post("/query")
def query_legal_database(request: QueryRequest):
    """
    Accepts an analytical query, retrieves relevant legal context from ChromaDB, 
    and returns a Gemini-generated answer grounded in the retrieved details.
    """
    try:
        answer = answer_query_with_rag(request.query)
        return {
            "query": request.query,
            "response": answer
        }
    except Exception as e:
        logger.error(f"RAG query execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while answering the query: {str(e)}"
        )

class CaseQueryRequest(BaseModel):
    case_id: int
    query: str
    history: list[dict] = []

@router.post("/query/case")
def query_legal_case_database(
    request: CaseQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Query CrimeGPT AI Assistant preloaded with the specific Case context.
    RAG-grounded and supports conversation memory.
    """
    from app.models.case import Case
    
    # 1. Fetch case details
    case = db.query(Case).filter(Case.id == request.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {request.case_id} not found."
        )
        
    # Compile Case Data Profile
    details = case.details
    evidence_names = [ev.file_name for ev in case.evidence]
    doc_types = [doc.document_type for doc in case.documents]
    timeline_logs = [f"[{t.event_name}] {t.description} ({t.timestamp.strftime('%Y-%m-%d')})" for t in case.timeline]

    case_profile = (
        f"CASE DETAILS PROFILE:\n"
        f"- FIR Number: {case.fir_number}\n"
        f"- Police Station: {case.police_station}\n"
        f"- Crime Category: {case.crime_type}\n"
        f"- Occurrence Date/Time: {case.incident_date}\n"
        f"- Status: {case.status}\n"
        f"- Complainant / Victim: {details.victim_details if details else 'None'}\n"
        f"- Accused Person(s): {details.accused_details if details else 'None'}\n"
        f"- Narrative Summary: {details.incident_description if details else 'None'}\n"
        f"- Penal Code Sections: {details.ipc_sections if details else 'None'}\n"
        f"- Listed Evidence: {details.evidence_details if details else 'None'}\n"
        f"- Physical Evidence Files Uploaded: {', '.join(evidence_names) if evidence_names else 'No files uploaded'}\n"
        f"- Generated AI Documents: {', '.join(doc_types) if doc_types else 'No documents generated'}\n"
        f"- Case Timeline Milestones:\n  * " + "\n  * ".join(timeline_logs) if timeline_logs else "No timeline logs registered"
    )

    # 2. Retrieve semantic context from legal database (RAG)
    retrieved_context = retrieve_context(request.query)

    # 3. Format Conversation History (Memory)
    history_str = ""
    if request.history:
        history_parts = []
        for msg in request.history:
            role = "Officer" if msg.get("role") == "user" else "CrimeGPT"
            history_parts.append(f"{role}: {msg.get('content')}")
        history_str = "CONVERSATION HISTORY MEMORY:\n" + "\n".join(history_parts) + "\n\n"

    # 4. Compose rich system prompt
    prompt = (
        "You are CrimeGPT, an expert Indian legal investigator and senior police AI co-pilot.\n"
        "You are assisting an officer with the specific case file profile described below.\n\n"
        "--- START CASE DATA PROFILE ---\n"
        f"{case_profile}\n"
        "--- END CASE DATA PROFILE ---\n\n"
    )

    if retrieved_context:
        prompt += (
            "--- START RETRIEVED LEGAL CONTEXT (RAG) ---\n"
            f"{retrieved_context}\n"
            "--- END RETRIEVED LEGAL CONTEXT (RAG) ---\n\n"
        )

    prompt += (
        "INSTRUCTIONS:\n"
        "- Answer the officer's query based strictly on the Case Profile, the custom legal context, and standard Indian penal law (IPC/CrPC/BNS).\n"
        "- Do NOT invent facts or guess about the Case details. If the case profile lacks certain information (e.g. Complainant details, specific item sizes), state clearly that it is missing.\n"
        "- If asked to prepare questions for a witness, verify the case facts (who is the victim, what happened, what evidence is collected) and draft professional, highly targeted questions.\n"
        "- Respond in a direct, professional, and clear officer-oriented tone.\n\n"
        f"{history_str}"
        f"Officer's Query: {request.query}\n\n"
        "CrimeGPT Response:"
    )

    try:
        from app.ai.gemini import generate_document
        response = generate_document(prompt)
        return {
            "case_id": request.case_id,
            "response": response
        }
    except Exception as e:
        logger.error(f"Contextual case query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI resolution failed: {str(e)}"
        )

