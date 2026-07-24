import os
import json
import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("crimegpt.routes.crimes")

router = APIRouter()

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data"
)

@router.get("/categories")
def get_crime_categories():
    filepath = os.path.join(DATA_DIR, "crime_types.json")
    if not os.path.exists(filepath):
        # Fallback bundled structure
        return [
            "Murder", "Attempt to Murder", "Theft", "Robbery", "Dacoity",
            "Burglary", "Kidnapping", "Assault", "Domestic Violence", "Dowry",
            "Rape", "Sexual Harassment", "Cyber Fraud", "Cheating", "Forgery",
            "Extortion", "Criminal Breach of Trust", "Drug Offences", "Arms Act Offences",
            "Traffic Offences", "Missing Person", "Accident", "Fraud", "Financial Crime",
            "Juvenile Crime", "Trespassing", "Rioting", "Public Nuisance", "Other"
        ]
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading crime_types.json: {e}")
        raise HTTPException(status_code=500, detail="Error reading crime types dataset.")

@router.get("/evidence-categories")
def get_evidence_categories():
    filepath = os.path.join(DATA_DIR, "evidence_categories.json")
    fallback = [
        "Physical Weapon/Object", "Digital Storage/CCTV", "Document Record", "Photograph",
        "Video Recording", "Audio Recording", "Mobile Phone", "Computer / Laptop",
        "Storage Device (USB, Hard Disk, Memory Card)", "Fingerprint Evidence",
        "DNA / Biological Sample", "Blood Sample", "Clothing / Fabric", "Narcotics / Drugs",
        "Currency / Cash", "Jewelry / Valuables", "Vehicle", "Tool / Burglary Equipment",
        "Medical Record", "Forensic Report", "Identity Document", "Bank Record",
        "Financial Record", "Call Detail Record (CDR)", "Email / SMS / Chat Record",
        "Firearm", "Ammunition", "Explosive Material", "Miscellaneous"
    ]
    if not os.path.exists(filepath):
        return fallback
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading evidence_categories.json: {e}")
        return fallback

@router.get("/config")
def get_system_config():
    filepath = os.path.join(DATA_DIR, "system_config.json")
    if not os.path.exists(filepath):
        return {
            "government_name": "Government of India",
            "department_name": "State Police Department",
            "police_station_name": "District Headquarters Police Station",
            "logo_url": "/logo_placeholder.png",
            "address": "Administrative Block, State Police Headquarters, India"
        }
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading system_config.json: {e}")
        return {
            "government_name": "Government of India",
            "department_name": "State Police Department",
            "police_station_name": "District Headquarters Police Station",
            "logo_url": "/logo_placeholder.png",
            "address": "Administrative Block, State Police Headquarters, India"
        }
