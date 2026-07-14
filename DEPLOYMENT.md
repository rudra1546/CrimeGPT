# CrimeGPT Production Deployment Manual

This guide describes the steps and environment variables required to deploy the CrimeGPT application to production.

---

## 1. System Architecture

CrimeGPT is structured as:
1. **Backend Service**: A FastAPI ASGI web application running under Uvicorn, proxying analytics requests, and generating documents.
2. **Database Engine**: PostgreSQL relational database storing users, cases, evidence indices, documents, and chronological timeline logs.
3. **Vector Store**: ChromaDB database indexing parsed PDF semantic chunks.
4. **Frontend Client**: React client built with Vite and code-split using Rollup, served as static HTML/JS assets.

---

## 2. Backend Production Configurations

### Environment Variables Checklist
Create a `.env` file in the `backend/` root directory containing:

```ini
# Server Configuration
ENV=production
HOST=127.0.0.1
PORT=8000

# PostgreSQL Database Connection
# Replace with actual PostgreSQL credentials
DATABASE_URL=postgresql://db_user:db_password@localhost:5432/crimegpt_db

# Security & Encryption
# Run "openssl rand -hex 32" to generate a secure secret
JWT_SECRET=production_hex_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Core Configuration
# Configure your live Google AI Studio API key
GEMINI_API_KEY=your_gemini_api_key_here

# Allowed CORS Origins
ALLOWED_ORIGINS=["https://crimegpt.gov.in", "http://localhost:5173"]
```

### Installation & Execution
1. Install Python production dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the ASGI process using Uvicorn with multiple workers behind a reverse proxy:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4
   ```

---

## 3. Server Logging & Health Check

### Health Check Telemetry
FastAPI exposes a health telemetry route at `/health`. It executes test queries to verify database connectivity.

- **URL**: `GET /health`
- **Response Format**:
  ```json
  {
    "status": "healthy",
    "database": "connected"
  }
  ```

### Production Logging
The server writes structured log events (format: `%(asctime)s [%(levelname)s] %(name)s: %(message)s`) to stdout and appends logs to `backend/crimegpt_production.log`. Monitor files using:
```bash
tail -f backend/crimegpt_production.log
```

---

## 4. Frontend Production Deployment

### Build Configurations
1. Set the production backend URL using the environment variable during build:
   - In a `.env.production` file inside the `frontend/` directory:
     ```ini
     VITE_API_URL=https://api.crimegpt.gov.in/api
     ```
   - Alternatively, build uses the relative path `/api` proxy.

2. Run the optimized build compiler:
   ```bash
   npm run build
   ```
   This generates static assets in the `dist/` directory.

### Code Splitting Optimizations
Vite uses Rollup to split dependencies. Third-party packages inside `node_modules` are compiled into a separate `vendor.js` chunk, keeping the main application bundle `index.js` under **110 kB** for fast page loads.

---

## 5. Nginx Proxy Configurations

Below is a sample Nginx server configuration block proxying API requests and serving built static assets:

```nginx
server {
    listen 80;
    server_name crimegpt.gov.in;

    # Serve built React static assets
    location / {
        root /var/www/crimegpt/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend Uvicorn server
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
