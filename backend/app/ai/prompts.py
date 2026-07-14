# Prompt templates for Indian Criminal Documentation format

SEIZURE_MEMO_PROMPT_TEMPLATE = """
You are an expert Indian police officer drafting a formal **Seizure Memo** (under Section 102/103 of the Code of Criminal Procedure, 1973 / Section 105 of the Bharatiya Nagarik Suraksha Sanhita, 2023).

Draft a professional, legally-sound Seizure Memo based STRICTLY on the following case details. 

### STRICT DOCUMENTATION RULE:
- Do NOT invent or hallucinate any facts.
- Use ONLY the case details provided below.
- If any required field is missing from the case details, you MUST write "[MISSING: <description>]". For example, if no witness names are provided, write "1. [MISSING: Name and Address of Witness 1]".

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Type**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Evidence / Seized Items**: {evidence_details}
- **Incident Description**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE POLICE STATION OF: {police_station}
DISTRICT: [MISSING: District Name]
STATE: [MISSING: State Name]

SEIZURE MEMO
(Prepared under Section 102 / 103 of the Code of Criminal Procedure, 1973 / 
 Section 105 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

1. CASE REFERENCE DETAILS:
   - FIR Number: {fir_number}
   - Date and Time of FIR Registration: [MISSING: Date and Time of FIR Registration]
   - Sections of Law: {ipc_sections}
   - Complainant / Victim: {victim_details}
   - Accused / Suspect: {accused_details}

2. RECOVERY DETAILS:
   - Date of Recovery / Seizure: [MISSING: Date of Recovery]
   - Time of Recovery / Seizure: [MISSING: Time of Recovery]
   - Place of Recovery / Seizure: [MISSING: Place of Recovery]
   - Seized From: [MISSING: Name of person from whom seized]

3. DESCRIPTION OF SEIZED ARTICLES:
   (List each article clearly. For each item, state its quantity, dimensions, weight, and serial numbers. If not provided in the case details, mark it as [MISSING: <field>].)
   - Seized Items from Case Data: {evidence_details}

4. WITNESS SECTION (Minimum of Two Local Witnesses Required):
   Witness 1:
   - Name: [MISSING: Name of Witness 1]
   - Father's Name: [MISSING: Father's Name of Witness 1]
   - Occupation: [MISSING: Occupation of Witness 1]
   - Address: [MISSING: Address of Witness 1]
   - Signature/Thumb Impression: _______________________

   Witness 2:
   - Name: [MISSING: Name of Witness 2]
   - Father's Name: [MISSING: Father's Name of Witness 2]
   - Occupation: [MISSING: Occupation of Witness 2]
   - Address: [MISSING: Address of Witness 2]
   - Signature/Thumb Impression: _______________________

5. ACCUSED ACKNOWLEDGEMENT:
   I, {accused_details}, hereby acknowledge that the above-mentioned articles were seized from my possession / premises in my presence, and a copy of this seizure memo has been handed over to me.
   - Signature/Thumb Impression of Accused: _______________________
   - Date: _______________________

6. SEIZING OFFICER DETAILS:
   - Signature: _______________________
   - Name: [MISSING: Name of Seizing Officer]
   - Designation: [MISSING: Designation of Seizing Officer]
   - Police Station: {police_station}
   - Date & Location: [MISSING: Seizure Officer Date & Location]
"""

REMAND_APPLICATION_PROMPT_TEMPLATE = """
You are an expert Indian police investigator drafting a **Remand Application** (under Section 167 of the Code of Criminal Procedure, 1973 / Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023) to be presented before the Judicial Magistrate.

Draft a professional, persuasive, and legally-sound Remand Application. Use STRICTLY the provided case details.

### STRICT DOCUMENTATION RULE:
- Do NOT invent or hallucinate any facts.
- Use ONLY the case details provided below.
- If any required field is missing from the case details, you MUST write "[MISSING: <description>]". For example, if the arrest date/time is not provided, write "[MISSING: Date and Time of Arrest]".

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Type**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Evidence Details**: {evidence_details}
- **Incident Description**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE COURT OF THE HON'BLE JUDICIAL MAGISTRATE FIRST CLASS, [MISSING: Court District/Location]

APPLICATION FOR POLICE REMAND
(Under Section 167 of the Code of Criminal Procedure, 1973 / 
 Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

In the Matter of:
State (through Police Station {police_station})  ... Complainant
Versus
{accused_details}                                 ... Accused Person(s)

1. REFERENCE:
   - FIR Number: {fir_number}
   - Date of Registration: [MISSING: Date of Registration]
   - Under Sections: {ipc_sections}
   - Crime Category: {crime_type}

2. BRIEF FACTS OF THE CASE:
   - Date & Time of Occurrence: {incident_date}
   - Brief Description: {incident_description}

3. ARREST DETAILS:
   - Name of Accused: {accused_details}
   - Date and Time of Arrest: [MISSING: Date and Time of Arrest]
   - Place of Arrest: [MISSING: Place of Arrest]
   - Date and Time of Production Before Court: [MISSING: Date and Time of Production]

4. GROUNDS FOR POLICE CUSTODY REMAND:
   (Develop grounds based strictly on the case's evidence and incident details. Do not invent new elements. Focus on the following objectives:)
   - Interrogation of accused {accused_details} regarding their involvement.
   - Recovery of seized items/evidence: {evidence_details}.
   - Verification of crime scene and checking co-conspirators.
   - [Add other factual grounds based strictly on: {incident_description}]

5. PRAYER:
   It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to grant Police Custody Remand of the accused {accused_details} for a period of [MISSING: Number of Remand Days] days in the interest of proper and complete investigation.

Respectfully submitted,

Date: _______________________
Location: [MISSING: Location of Submission]

INVESTIGATING OFFICER:
- Signature: _______________________
- Name: [MISSING: Name of Investigating Officer]
- Designation: [MISSING: Designation of Investigating Officer]
- Police Station: {police_station}
"""

CHARGE_SHEET_PROMPT_TEMPLATE = """
You are an expert Indian police officer drafting a formal **Charge Sheet** / Final Report (under Section 173 of the Code of Criminal Procedure, 1973 / Section 193 of the Bharatiya Nagarik Suraksha Sanhita, 2023).

Draft a professional and legally-sound Charge Sheet summary using STRICTLY the provided case details.

### STRICT DOCUMENTATION RULE:
- Do NOT invent or hallucinate any facts.
- Use ONLY the case details provided below.
- If any required field is missing from the case details, you MUST write "[MISSING: <description>]". For example, if the complainant details are not provided, write "[MISSING: Complainant Details]".

### CASE DETAILS:
- **FIR Number**: {fir_number}
- **Police Station**: {police_station}
- **Crime Type**: {crime_type}
- **Incident Date/Time**: {incident_date}
- **Victim Details**: {victim_details}
- **Accused Details**: {accused_details}
- **Evidence Details**: {evidence_details}
- **Incident Description**: {incident_description}
- **Applicable Sections**: {ipc_sections}

### REQUIRED STRUCTURAL FORMAT:

--------------------------------------------------------------------------------
IN THE COURT OF THE HON'BLE JUDICIAL MAGISTRATE FIRST CLASS, [MISSING: Court District/Location]

CHARGE SHEET / FINAL REPORT
(Submitted under Section 173 of the Code of Criminal Procedure, 1973 / 
 Section 193 of the Bharatiya Nagarik Suraksha Sanhita, 2023)
--------------------------------------------------------------------------------

1. GENERAL CASE DATA:
   - Police Station: {police_station}
   - District: [MISSING: District Name]
   - State: [MISSING: State Name]
   - FIR Number: {fir_number}
   - Date of FIR: [MISSING: Date of FIR]
   - Charge Sheet Number: [MISSING: Charge Sheet Number]
   - Date of Charge Sheet: [MISSING: Date of Charge Sheet]

2. DETAILS OF COMPLAINANT / INFORMER:
   - Name: {victim_details}
   - Details: [MISSING: Address and Complainant Particulars]

3. DETAILS OF ACCUSED PERSON(S) CHARGED:
   - Name: {accused_details}
   - Arrest Status: [MISSING: Arrest Status of Accused]
   - Address: [MISSING: Address of Accused]
   - Whether Bailed / In Custody: [MISSING: Custody Status of Accused]

4. SUMMARY OF INVESTIGATION (BRIEF FACTS):
   - Narrative of Crime: {incident_description}
   - Investigation Findings: (Summarize based strictly on facts, mentioning victim {victim_details} and accused {accused_details})

5. PARTICULARS OF PROPERTIES / EVIDENCE SEIZED:
   - Seized Evidence: {evidence_details}

6. MEMO OF EVIDENCE (LIST OF PROSECUTION WITNESSES):
   - Witness 1 (Complainant/Victim): {victim_details}
   - Witness 2 (Independent Witness): [MISSING: Name of Witness 2]
   - Witness 3 (Seizure Witness): [MISSING: Name of Witness 3]
   - Witness 4 (Investigating Officer): [MISSING: Name of Investigating Officer]

7. CHARGES MADE OUT:
   - Based on the facts of the investigation, the accused {accused_details} has committed offenses punishable under Sections {ipc_sections} for the crime category {crime_type}.

Date: _______________________
Location: [MISSING: Location of Submission]

SUBMITTED BY:
- Signature: _______________________
- Name: [MISSING: Name of Submitting Officer]
- Designation: [MISSING: Designation of Submitting Officer]
- Police Station: {police_station}
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
    else:
        raise ValueError(f"Unsupported document type: {document_type}")
