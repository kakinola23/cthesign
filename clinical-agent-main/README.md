# Clinical Decision Support Agent

FastAPI service with React frontend for NICE NG12 Cancer Guidelines assessment and conversational queries.

## Quick Start

### 1. Environment Setup
```bash
# Create .env file
echo "GOOGLE_API_KEY=your_key_here" > .env
```

### 2. Download NG12 PDF
Download from: https://www.nice.org.uk/guidance/ng12/resources/suspected-cancer-recognition-and-referral-pdf-1837268071621

Save to: `data/n12.pdf`

### 3. Run with Docker Compose (Recommended - Full Stack)

**Option A: Run Everything with Docker (Recommended for Production)**
```bash
# First, ingest the PDF (one-time setup)
docker-compose --profile ingest run --rm ingest

# Then start both backend and frontend
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Option B: Run Backend with Docker, Frontend Locally (Development)**
```bash
# Build and ingest
docker-compose --profile ingest run --rm ingest

# Run only the API
docker-compose up api

# In another terminal, run frontend locally
cd frontend
npm install
npm start
```

### 4. Docker Commands Reference

```bash
# Build all services
docker-compose build

# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f frontend

# Rebuild and restart
docker-compose up --build

# Remove volumes (clears ChromaDB data)
docker-compose down -v
```

### 5. Test Endpoints (Optional - API Testing)
```bash
# Assessment
curl -X POST http://localhost:8000/assess/PT-103

# Chat - Send message
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-123", "message": "What symptoms trigger urgent lung cancer referral?"}'

# Chat - Get session history
curl http://localhost:8000/chat/test-123/history

# Chat - List all sessions
curl http://localhost:8000/chat/sessions

# Chat - Delete session
curl -X DELETE http://localhost:8000/chat/test-123

# Patients - List all
curl http://localhost:8000/patients

# Patients - Export
curl http://localhost:8000/patients/export

# Health check
curl http://localhost:8000/health
```

## API Endpoints

### Patient Management
- `GET /patients` - List all available patients
- `POST /patients/import` - Import patients from JSON file (with overwrite option)
- `GET /patients/export` - Export all patients as JSON

### Clinical Assessment
- `POST /assess/{patient_id}` - Assess patient against NG12 guidelines

### Chat & Sessions
- `POST /chat` - Send conversational query (requires session_id)
- `GET /chat/{session_id}/history` - Retrieve conversation history for a session
- `GET /chat/sessions` - List all active chat sessions
- `DELETE /chat/{session_id}` - Delete a chat session

### System
- `GET /health` - Health check endpoint

## Project Structure
```
.
├── app/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic models
│   ├── prompts/             # Markdown prompts
│   └── services/            # Business logic
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientAssessment.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   └── StandaloneChat.tsx
│   │   ├── services/
│   │   │   └── api.ts       # API service
│   │   └── App.tsx
│   ├── Dockerfile           # Frontend Dockerfile
│   ├── nginx.conf           # Nginx configuration
│   └── package.json
├── data/
│   ├── patients.json        # Patient records
│   └── n12.pdf             # NG12 Guidelines (download separately)
├── ingest.py               # PDF ingestion
├── Dockerfile              # Backend Dockerfile
├── docker-compose.yml      # Docker Compose configuration
└── .dockerignore           # Docker ignore file
```

## Frontend Features

### Tabbed Interface
- **Patient Management Tab**: Upload patient JSON files, manage patient records, and run assessments
- **Chat with Guidelines Tab**: Standalone chat interface for querying NG12 guidelines (PDF only, no patient context)

### Patient Management
- **Upload Patient JSON**: Upload patient data files with overwrite/merge options
- **Export Patients**: Download all patients as JSON
- **Patient List**: View all uploaded patients with search functionality
- **Patient Assessment**: Run clinical assessments with detailed results including:
  - Prediction (Urgent Referral, Urgent Investigation, Routine/GP Management)
  - Risk Level (High, Moderate, Low)
  - Reasoning and recommended actions
  - Citations from NG12 guidelines

### Chat Features
- **Session Management**: 
  - View all active chat sessions
  - Switch between sessions
  - Load session by ID
  - Create new sessions
  - Delete sessions
- **Conversational Interface**: Ask questions about NG12 guidelines with:
  - Conversation history
  - Citation support
  - Grounding verification
- **Patient-Specific Chat**: Chat interface linked to patient context (accessible from assessment page)

## Session Management

Chat sessions are stored in-memory by default. Each session maintains:
- Unique session ID
- Full conversation history
- Timestamps (created_at, last_updated)
- Message citations

**Session Features:**
- Create new sessions automatically or manually
- Switch between multiple active sessions
- Load existing sessions by ID
- View all active sessions
- Delete sessions individually
- Session persistence during API runtime

**Note:** Sessions are stored in-memory and will be lost on API restart. For production, consider using Redis or a database for session persistence.

## Prompts
Prompts are stored in `app/prompts/` as markdown files for easy editing:
- `assessment.md` - Clinical assessment system prompt
- `chat.md` - Chat system prompt with grounding rules
