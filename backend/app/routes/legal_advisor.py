import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User

logger = logging.getLogger("crimegpt.routes.legal_advisor")

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data"
)

def load_legal_sections():
    filepath = os.path.join(DATA_DIR, "legal_sections.json")
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading legal_sections.json: {e}")
        return []

def load_landmark_cases():
    filepath = os.path.join(DATA_DIR, "landmark_cases.json")
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading landmark_cases.json: {e}")
        return []

class AnalyzeFIRRequest(BaseModel):
    crime_type: str
    incident_description: str

@router.get("/sections")
def get_all_sections():
    """
    Get all pre-mapped legal sections.
    """
    return load_legal_sections()

@router.get("/sections/by-crime")
def get_sections_by_crime(crime_type: str):
    """
    Stage 1: Get deterministic BNS recommendations mapped for a selected crime type.
    """
    sections = load_legal_sections()
    for item in sections:
        if item.get("crime_type").lower() == crime_type.lower():
            return item.get("recommendations", [])
    return []

@router.get("/sections/search")
def search_sections(query: str):
    """
    Search available BNS/BNSS/BSA sections by number, title, or description.
    """
    sections = load_legal_sections()
    results = []
    query_lower = query.lower()
    
    # Flatten recommendations/sections to search individual sections
    for item in sections:
        sec_list = item.get("sections") or item.get("recommendations") or []
        for rec in sec_list:
            sec_num = str(rec.get("section", "")).lower()
            sec_title = str(rec.get("title", "")).lower()
            sec_desc = str(rec.get("description", "")).lower()
            if query_lower in sec_num or query_lower in sec_title or query_lower in sec_desc:
                if rec not in results:
                    results.append(rec)
    return results

@router.post("/analyze-fir")
def analyze_fir(request: AnalyzeFIRRequest):
    """
    Stage 2: On-demand AI narrative analysis. Suggests additional BNS sections and landmark cases.
    """
    prompt = (
        "You are CrimeGPT, an expert legal advisor assisting an Indian police officer.\n"
        "Audit the following case narrative and suggest additional relevant BNS/BNSS/BSA sections and landmark cases.\n\n"
        f"Crime Category: {request.crime_type}\n"
        f"Incident Narrative: {request.incident_description}\n\n"
        "Respond strictly in valid JSON format with the keys 'recommendations' and 'landmark_cases'.\n"
        "- 'recommendations' is an array of objects, each containing 'law', 'section', 'title', 'description', 'confidence' (integer 0-100), and 'reasoning'.\n"
        "- 'landmark_cases' is an array of objects, each containing 'citation', 'summary', and 'significance'.\n\n"
        "Do not include markdown triple backticks (e.g. ```json) in your response, just return the JSON string."
    )

    try:
        from app.ai.gemini import generate_document
        raw_text = generate_document(prompt).strip()
        
        # Clean up any potential markdown code blocks returned by Gemini
        if raw_text.startswith("```"):
            first_line_end = raw_text.find("\n")
            if first_line_end != -1:
                raw_text = raw_text[first_line_end:].strip()
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        parsed = json.loads(raw_text)
        return parsed
    except Exception as e:
        logger.error(f"Failed in Stage 2 AI Analysis: {e}")
        # Return fallback rule-based suggestions and custom warning
        fallback_cases = []
        cases = load_landmark_cases()
        for item in cases:
            if item.get("crime_type").lower() == request.crime_type.lower():
                fallback_cases = item.get("cases", [])
                break
                
        return {
            "recommendations": [],
            "landmark_cases": fallback_cases,
            "warning": "AI analysis pipeline was temporarily offline; returned default landmark cases."
        }
