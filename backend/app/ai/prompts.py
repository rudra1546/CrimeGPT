# Prompt templates for Indian Criminal Documentation format

SEIZURE_MEMO_PROMPT_TEMPLATE = """
You are an expert Indian police officer drafting a formal **Seizure Memo** (under Section 102/103 of the Code of Criminal Procedure, 1973 / Section 105 of the Bharatiya Nagarik Suraksha Sanhita, 2023).

Draft a professional, legally-sound Seizure Memo based STRICTLY on the following case details and retrieved legal reference context.

### STRICT RULES FOR COMPLIANCE:
1. Do NOT invent or hallucinate any facts, dates, names, or evidence.
2. Use ONLY the case details provided below.
3. If any field or detail is missing, you MUST write "[Information Required]" instead of leaving it blank or guessing.
4. Use the provided RAG legal context as the official legal basis for wording or references in the document.

### RETRIEVED LEGAL CONTEXT (RAG):
{rag_context}

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Category**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Investigating Officer**: {investigating_officer}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Witnesses Details**: {witnesses}
- **Evidence / Seized Items**: {evidence_details}
- **Incident Narrative**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE POLICE STATION OF: {police_station}
SEIZURE MEMO
(Prepared under Section 102 / 103 of the Code of Criminal Procedure, 1973 / 
 Section 105 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

1. CASE REFERENCE DETAILS:
   - FIR Number: {fir_number}
   - Date and Time of Incident: {incident_date}
   - Sections of Law: {ipc_sections}
   - Investigating Officer: {investigating_officer}
   - Complainant / Victim: {victim_details}
   - Accused / Suspect: {accused_details}

2. RECOVERY DETAILS:
   - Date & Time of Recovery: [Information Required]
   - Place of Recovery: [Information Required]
   - Seized From: [Information Required]

3. DESCRIPTION OF SEIZED ARTICLES:
   (List each article clearly based on the provided evidence details. Do not invent items. If evidence details are missing, write [Information Required].)
   {evidence_details}

4. WITNESS SECTION:
   (List the witnesses and statements provided in the case details. If none or missing, write [Information Required] for Name, Contact, Address, and Statement.)
   Witnesses List: {witnesses}

5. ACCUSED ACKNOWLEDGEMENT:
   - Acknowledged by Accused: [Information Required]
   - Signature/Thumb Impression of Accused: _______________________

6. SEIZING OFFICER DETAILS:
   - Name & Designation: {investigating_officer}
   - Police Station: {police_station}
   - Signature: _______________________

--------------------------------------------------------------------------------
AI REASONING & EXPLAINABILITY REPORT
--------------------------------------------------------------------------------
- **Evidence Used**: [List the specific evidence items used in this seizure memo from Case Details]
- **Witnesses Referenced**: [List the specific witnesses referenced in this seizure memo from Case Details]
- **IPC/BNS Sections Used**: [List the legal sections applied based on Case Details and context]
- **RAG Legal References Retrieved**: [List or quote specific legal reference fragments retrieved from RAG context that supported this draft]
"""

REMAND_APPLICATION_PROMPT_TEMPLATE = """
You are an expert Indian police investigator drafting a **Remand Application** (under Section 167 of the Code of Criminal Procedure, 1973 / Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023) to be presented before the Judicial Magistrate.

Draft a professional, persuasive, and legally-sound Remand Application based STRICTLY on the following case details and retrieved legal reference context.

### STRICT RULES FOR COMPLIANCE:
1. Do NOT invent or hallucinate any facts, dates, names, or evidence.
2. Use ONLY the case details provided below.
3. If any field or detail is missing, you MUST write "[Information Required]" instead of leaving it blank or guessing.
4. Use the provided RAG legal context as the official legal basis for wording or references in the document.

### RETRIEVED LEGAL CONTEXT (RAG):
{rag_context}

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Category**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Investigating Officer**: {investigating_officer}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Witnesses Details**: {witnesses}
- **Evidence / Seized Items**: {evidence_details}
- **Incident Narrative**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE COURT OF THE HON'BLE JUDICIAL MAGISTRATE FIRST CLASS, [Information Required]
APPLICATION FOR POLICE REMAND
(Under Section 167 of the Code of Criminal Procedure, 1973 / 
 Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

In the Matter of:
State (through Police Station {police_station})  ... Complainant
Versus
Accused Person(s): {accused_details}

1. REFERENCE:
   - FIR Number: {fir_number}
   - Under Sections: {ipc_sections}
   - Crime Category: {crime_type}
   - Investigating Officer: {investigating_officer}

2. BRIEF FACTS OF THE CASE:
   - Date & Time of Occurrence: {incident_date}
   - Narrative of Crime: {incident_description}

3. ARREST DETAILS:
   - Name of Accused: {accused_details}
   - Date and Time of Arrest: [Information Required]
   - Place of Arrest: [Information Required]
   - Date and Time of Production Before Court: [Information Required]

4. GROUNDS FOR POLICE CUSTODY REMAND:
   (Develop grounds based strictly on the case's evidence and incident details. Do not invent new elements. Focus on the following objectives:)
   - Interrogation of accused regarding their involvement.
   - Recovery of seized items/evidence: {evidence_details}.
   - Verification of crime scene and checking co-conspirators.
   - Narrative details: {incident_description}

5. PRAYER:
   It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to grant Police Custody Remand of the accused for a period of [Information Required] days in the interest of proper and complete investigation.

Respectfully submitted,

Date: _______________________
Location: [Information Required]

INVESTIGATING OFFICER:
- Name: {investigating_officer}
- Police Station: {police_station}
- Signature: _______________________

--------------------------------------------------------------------------------
AI REASONING & EXPLAINABILITY REPORT
--------------------------------------------------------------------------------
- **Evidence Used**: [List the specific evidence items used in this remand application from Case Details]
- **Witnesses Referenced**: [List the specific witnesses referenced in this remand application from Case Details]
- **IPC/BNS Sections Used**: [List the legal sections applied based on Case Details and context]
- **RAG Legal References Retrieved**: [List or quote specific legal reference fragments retrieved from RAG context that supported this draft]
"""

CHARGE_SHEET_PROMPT_TEMPLATE = """
You are an expert Indian police officer drafting a formal **Charge Sheet** / Final Report (under Section 173 of the Code of Criminal Procedure, 1973 / Section 193 of the Bharatiya Nagarik Suraksha Sanhita, 2023).

Draft a professional and legally-sound Charge Sheet summary based STRICTLY on the following case details and retrieved legal reference context.

### STRICT RULES FOR COMPLIANCE:
1. Do NOT invent or hallucinate any facts, dates, names, or evidence.
2. Use ONLY the case details provided below.
3. If any field or detail is missing, you MUST write "[Information Required]" instead of leaving it blank or guessing.
4. Use the provided RAG legal context as the official legal basis for wording or references in the document.

### RETRIEVED LEGAL CONTEXT (RAG):
{rag_context}

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Category**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Investigating Officer**: {investigating_officer}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Witnesses Details**: {witnesses}
- **Evidence / Seized Items**: {evidence_details}
- **Incident Narrative**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE COURT OF THE HON'BLE JUDICIAL MAGISTRATE FIRST CLASS, [Information Required]
CHARGE SHEET / FINAL REPORT
(Submitted under Section 173 of the Code of Criminal Procedure, 1973 / 
 Section 193 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

1. GENERAL CASE DATA:
   - Police Station: {police_station}
   - FIR Number: {fir_number}
   - Date of FIR: [Information Required]
   - Charge Sheet Number: [Information Required]
   - Date of Charge Sheet: [Information Required]
   - Investigating Officer: {investigating_officer}

2. DETAILS OF COMPLAINANT / INFORMER:
   - Victim / Complainant Details: {victim_details}

3. DETAILS OF ACCUSED PERSON(S) CHARGED:
   - Accused Details: {accused_details}
   - Arrest Status: [Information Required]
   - Custody Status: [Information Required]

4. SUMMARY OF INVESTIGATION (BRIEF FACTS):
   - Narrative of Crime: {incident_description}
   - Investigation Findings: (Summarize based strictly on facts, mentioning victim and accused details)

5. PARTICULARS OF PROPERTIES / EVIDENCE SEIZED:
   - Seized Evidence: {evidence_details}

6. MEMO OF EVIDENCE (LIST OF PROSECUTION WITNESSES):
   {witnesses}

7. CHARGES MADE OUT:
   - Based on the facts of the investigation, the accused has committed offenses punishable under Sections {ipc_sections} for the crime category {crime_type}.

Date: _______________________
Location: [Information Required]

SUBMITTED BY:
- Name: {investigating_officer}
- Police Station: {police_station}
- Signature: _______________________

--------------------------------------------------------------------------------
AI REASONING & EXPLAINABILITY REPORT
--------------------------------------------------------------------------------
- **Evidence Used**: [List the specific evidence items used in this charge sheet from Case Details]
- **Witnesses Referenced**: [List the specific witnesses referenced in this charge sheet from Case Details]
- **IPC/BNS Sections Used**: [List the legal sections applied based on Case Details and context]
- **RAG Legal References Retrieved**: [List or quote specific legal reference fragments retrieved from RAG context that supported this draft]
"""

CASE_SUMMARY_PROMPT_TEMPLATE = """
You are an expert Indian police officer writing a formal **Case Summary** / Investigation Report.

Draft a professional, legally-sound Case Summary based STRICTLY on the following case details and retrieved legal reference context.

### STRICT RULES FOR COMPLIANCE:
1. Do NOT invent or hallucinate any facts, dates, names, or evidence.
2. Use ONLY the case details provided below.
3. If any field or detail is missing, you MUST write "[Information Required]" instead of leaving it blank or guessing.
4. Use the provided RAG legal context as the official legal basis for wording or references in the document.

### RETRIEVED LEGAL CONTEXT (RAG):
{rag_context}

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Category**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Investigating Officer**: {investigating_officer}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Witnesses Details**: {witnesses}
- **Evidence / Seized Items**: {evidence_details}
- **Incident Narrative**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
POLICE DEPARTMENT - INVESTIGATION CASE SUMMARY
--------------------------------------------------------------------------------

1. EXECUTIVE SYNOPSIS:
   - FIR Number: {fir_number}
   - Police Station: {police_station}
   - Crime Category: {crime_type}
   - Incident Date & Time: {incident_date}
   - Investigating Officer: {investigating_officer}
   - Penal Provisions: {ipc_sections}

2. VICTIM PROFILE:
   {victim_details}

3. ACCUSED / SUSPECT DETAILS:
   {accused_details}

4. CHRONOLOGICAL SUMMARY OF THE INCIDENT:
   - Event Occurrence: {incident_date}
   - Narrative of Crime: {incident_description}

5. WITNESS STATEMENTS SUMMARY:
   {witnesses}

6. EVIDENCE CHECKLIST & SEIZURES:
   {evidence_details}

7. INVESTIGATION FINDINGS & PROGRESS STATUS:
   [Provide a summary of the findings based strictly on the narrative, evidence, and witness statements. Mention the status of the investigation.]

--------------------------------------------------------------------------------
AI REASONING & EXPLAINABILITY REPORT
--------------------------------------------------------------------------------
- **Evidence Used**: [List the specific evidence items used in this case summary from Case Details]
- **Witnesses Referenced**: [List the specific witnesses referenced in this case summary from Case Details]
- **IPC/BNS Sections Used**: [List the legal sections applied based on Case Details and context]
- **RAG Legal References Retrieved**: [List or quote specific legal reference fragments retrieved from RAG context that supported this draft]
"""

def get_prompt_template(document_type: str) -> str:
    """
    Returns the appropriate prompt template for a document type.
    """
    doc_lower = document_type.lower()
    if doc_lower == "seizure_memo":
        return SEIZURE_MEMO_PROMPT_TEMPLATE
    elif doc_lower == "remand_application":
        return REMAND_APPLICATION_PROMPT_TEMPLATE
    elif doc_lower == "charge_sheet":
        return CHARGE_SHEET_PROMPT_TEMPLATE
    elif doc_lower == "case_summary":
        return CASE_SUMMARY_PROMPT_TEMPLATE
    else:
        raise ValueError(f"Unsupported document type: {document_type}")
