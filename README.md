# CrimeGPT: AI-Powered Legal Document Drafting & Investigation Co-Pilot

A Comprehensive Web Application for Law Enforcement and Police Departments. Suitable for BE IT Final Year Project Submission.

---

## 1. Project Overview
**CrimeGPT** is an intelligent assistant designed to streamline and automate legal document drafting, case dossier management, and procedural guidance for police departments. By integrating Retrieval-Augmented Generation (RAG) using **ChromaDB** and the **Google Gemini API**, the system assists investigating officers in drafting legally-sound police documents (such as Seizure Memos, Remand Applications, and Charge Sheets) matching Indian legal structures.

---

## 2. Problem Statement
Law enforcement agencies face challenges due to:
- **High Administrative Burden**: Officers spend significant hours manually drafting forms and case records.
- **Complexity of Legal Frameworks**: Accessing relevant codes (IPC, CrPC, Indian Evidence Act, or the new BNS guidelines) on the spot is difficult.
- **Risk of Procedural Faults**: Minor structural mistakes in seizure records or remand requests can compromise prosecutions in court.
- **Information Fragmentation**: Scattered files make it hard to audit case statuses, evidence tracking, and timeline details.

---

## 3. Project Objectives
- **Automate Legal Drafting**: Draft remand applications, seizure memos, and charge sheets based on case details, without inventing facts.
- **Ensure Grounded Responses (RAG)**: Retrieve context from verified legal PDF reference manuals to prevent AI hallucinations.
- **Establish Evidence Lockers**: Manage case attachments (images, PDFs, documents) securely.
- **Track Timeline Milestones**: Maintain a chronological, tamper-evident log of investigative checkpoints (arrests, filings, evidence collections).
- **Command Telemetry**: Expose an administrative dashboard visualizing crime category breakdowns, document generation stats, and system activities.

---

## 4. System Architecture
The application follows a **Decoupled Client-Server Architecture**:

```
+-----------------------------------------------------------------------+
|                             React Web Client                          |
|  (Vite, Tailwind CSS, Axios, Lucide Icons, Recharts Visualizations)   |
+---------------------------------------+-------------------------------+
                                        |
                               HTTP / HTTPS (JWT)
                                        |
+---------------------------------------v-------------------------------+
|                            FastAPI REST API                           |
|       (Uvicorn ASGI Server, JWT Authentication, Logging Systems)      |
+----+---------------------+------------+------------+------------------+
     |                     |                         |
+----v-----+          +----v-----+              +----v-----+
| SQLite / |          |  Chroma  |              |  Google  |
| Postgres |          |  Vector  |              |  Gemini  |
| Database |          |  Database|              |  GenAI   |
+----------+          +----------+              +----------+
```

1. **Presentation Layer**: Built with **React** (using Vite for bundling) styled with a police dashboard theme. Charts are rendered using **Recharts**.
2. **Application Layer**: A **FastAPI** web service handling JWT authorization, CRUD transactions, and file systems.
3. **Data Layer**:
   - **SQL Database**: SQLite (for development) and PostgreSQL (for production), mapped using **SQLAlchemy ORM**.
   - **Vector Database**: **ChromaDB** stores vectorized chunks of legal manuals.
4. **AI Core**: The **Google Gemini API** (using the GenAI SDK) executes document synthesis and contextual case co-pilot resolutions.

---

## 5. Technology Stack

### Backend
- **Framework**: FastAPI (python-based ASGI)
- **Database ORM**: SQLAlchemy
- **Token Security**: PyJWT & bcrypt
- **PDF Extraction**: PyPDF
- **Document Export Tools**: ReportLab (PDF) & python-docx (DOCX)
- **ASGI Process Manager**: Uvicorn

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (Guarded Private Routes)
- **Charts Engine**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

### AI & Vector Indexing
- **Generative AI Platform**: Google GenAI SDK (Gemini-1.5-flash)
- **Vector Search Engine**: ChromaDB
- **RAG Orchestrator**: LangChain

---

## 6. Database Design (ERD Description)

```
             +------------------+
             |      users       |
             +------------------+
             | id (PK)          |<----------+
             | name             |           |
             | email (Unique)   |           |
             | password_hash    |           |
             | role             |           |
             +------------------+           |
                      |                     |
             +--------v---------+           |
             |      cases       |           |
             +------------------+           |
             | id (PK)          |           |
             | fir_number (UQ)  |           |
             | police_station   |           |
             | crime_type       |           |
             | status           |           |
             | created_by (FK)  |           |
             +------------------+           |
              /       |        \            |
             /        |         \           |
   +--------v-+  +----v----+  +--v-------+  |
   | details  |  |evidence |  |documents |  |
   +----------+  +---------+  +----------+  |
   | case_id  |  | case_id |  | case_id  |  |
   | victim   |  | file_name| | doc_type |  |
   | accused  |  | file_path| | content  |  |
   | narrative|  | uploader|  | creator  |--+
   +----------+  +---------+  +----------+
```

- **`users`**: Manages police officers and admins.
- **`cases`**: Records core case reference indexes (FIR, Station, Incident Date).
- **`case_details`**: 1-to-1 relationship mapping case narratives, sections, and suspect/victim details.
- **`evidence`**: Tracks uploaded physical evidence attachments (images, PDFs, documents).
- **`documents`**: Stores drafts generated by Gemini.
- **`case_timeline`**: Records chronological timeline milestones (such as FIR filing or evidence collections).

---

## 7. AI & RAG Workflow
1. **Ingestion**: PDFs of legal manuals (IPC/CrPC/BNS) are uploaded via the `/api/legal/upload` route, split into semantic chunks, and embedded in ChromaDB.
2. **Retrieval**: When an officer queries the Assistant, ChromaDB uses similarity search to retrieve the top $K$ relevant legal fragments.
3. **Synthesis**:
   - If querying a case copilot, the system fetches the database case record (FIR details, evidence checklist, generated docs, timeline) and serializes the chat history.
   - A system prompt instructing the AI to act as a senior police copilot and enforce fragment citations is compiled.
   - The compiled context is sent to the Gemini API to produce a grounded response.

---

## 8. API Documentation

### Authentication (`/api/auth`)
- `POST /register`: Registers new police or admin accounts.
- `POST /login`: Validates credentials and returns JWT Bearer access token.
- `GET /me`: Restores user credentials from token payload.

### Case Dossiers (`/api/cases`)
- `POST /`: Registers a new case.
- `GET /`: Lists all cases.
- `GET /{id}`: Retrieves case dossier details, evidence lists, and timeline checkpoints.
- `PUT /{id}`: Updates case metadata.
- `POST /{id}/evidence`: Uploads physical evidence to storage.
- `POST /{id}/timeline`: Logs a custom timeline event.

### AI Drafts & Exports (`/api/documents`)
- `POST /generate`: Drafts a legal document (Seizure Memo, Remand Application, or Charge Sheet) using case facts.
- `POST /{id}/regenerate`: Re-drafts an existing document.
- `GET /{id}/pdf`: Streams the document draft as a downloadable PDF.
- `GET /{id}/docx`: Streams the document draft as a downloadable Word (.docx) file.

### Legal Assistant RAG (`/api/legal`)
- `POST /upload`: Indexes a custom legal PDF manual.
- `POST /query/case`: Launches context-aware chat queries for a specific case.

### System Telemetry (`/api/admin`)
- `GET /stats`: Returns counts, recent activities, and charts data arrays.

---

## 9. Installation & Running Steps

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend Setup
1. Clone the project and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```ini
   DATABASE_URL=sqlite:///./crimegpt.db
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret_key
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Launch Vite server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at `http://localhost:3000`.

---

## 10. Future Scope
- **CCTNS Integration**: Connect with the national Crime and Criminal Tracking Network & Systems database to sync national FIR registers.
- **Audio Statement Transcription**: Integrate speech-to-text libraries to transcribe witness statements on the spot.
- **Multilingual Drafting**: Support document generations in regional Indian languages (Hindi, Marathi, Tamil, etc.).
- **Blockchain Timelines**: Store timeline hashes on a private blockchain to prevent retrospective tampering of case files.
