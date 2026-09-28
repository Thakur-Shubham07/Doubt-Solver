# Studyroom: AI Doubt Solver

Studyroom is a lesson-focused learning app. Students choose a lesson, ask questions about its material, receive answers grounded in that lesson, and continue follow-up conversations with source excerpts attached.

## How It Works

1. Lesson metadata is stored in SQLite. Transcripts and study material are split into chunks, embedded with Gemini, and stored in Qdrant with lesson and source metadata.
2. When a student asks a question, the backend embeds it and searches Qdrant with a filter for the selected lesson. Chunks from other lessons are excluded.
3. Gemini receives only the retrieved lesson context and relevant conversation history. It returns a supported answer or the fixed message that the information is unavailable in the selected material.
4. The API returns the answer and source excerpts. Questions, answers, support status, lesson IDs, and conversation IDs are stored in SQLite for history and follow-ups.
5. The React frontend displays lessons, video links, the tutor conversation, expandable citations, and saved doubt history.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style components
- Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy, SQLite
- Retrieval: Qdrant
- Embeddings and answer generation: Google Gemini API

## Prerequisites

- Git
- Python 3.12 or newer
- Node.js 20.19+ or 22.12+ and npm (Node 22 LTS or newer recommended)
- Docker Desktop or Docker Engine
- A Gemini API key from Google AI Studio

## Clone and Install

Clone the repository and enter its root directory:

```bash
git clone <repository-url>
cd task-indoscot
```

Create a virtual environment at the repository root and install backend dependencies.

PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Bash (macOS, Linux, or Git Bash):

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set `GEMINI_API_KEY` to your Google AI Studio key. Keep the key in this backend environment file; never add it to frontend configuration or commit it.

For local Qdrant, leave `QDRANT_API_KEY` blank and keep `QDRANT_URL=http://localhost:6333`. Local Qdrant does not require an API key by default. The backend's SQLite database is created automatically at `backend/db/app.db` when the API starts.

## Start Local Qdrant

Start Qdrant in a terminal. The ports are bound to localhost, and the named Docker volume retains indexed data between container restarts:

```bash
docker run -d --name learning-qdrant --restart unless-stopped -p 127.0.0.1:6333:6333 -p 127.0.0.1:6334:6334 -v learning-qdrant-storage:/qdrant/storage qdrant/qdrant
```

On subsequent runs, start the existing container with:

```bash
docker start learning-qdrant
```

If you use Qdrant Cloud or enable Qdrant authentication, set its URL and API key in `backend/.env` instead. Do not expose an unauthenticated local Qdrant instance to a public network.

## Ingest the Example Lesson

Run this once after Qdrant is running and `backend/.env` contains a valid Gemini key. Use a terminal with the repository virtual environment activated:

```bash
cd backend
python -m app.ingest_lesson
```

This creates the `learning_content` collection if needed, embeds every lesson JSON file in `backend/app/data/`, and saves lesson records and their transcript/study-material vectors. Ingestion requires Gemini API access and uses your account's quota.

## Run the Application

Keep the services running in separate terminals.

Backend terminal, from the `backend` directory with the virtual environment activated:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed in the frontend terminal, normally `http://localhost:5173`. The development server proxies `/api` and `/health` to FastAPI at `http://127.0.0.1:8000`, so a separate browser CORS configuration is not needed for the standard local setup.

Useful URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://127.0.0.1:8000/health`
- Backend API documentation: `http://127.0.0.1:8000/docs`

## Try the Main Flow

1. Select **Human Digestive System** from the lesson list. If the list is empty, run the ingestion command above.
2. Ask a question in the tutor panel, for example: `Where are most nutrients absorbed?`
3. Inspect the answer's support status and expand its source references to see the lesson excerpts used.
4. Ask a follow-up in the same conversation. Use the new-conversation button to start a separate thread.
5. Open doubt history to revisit saved questions and conversations.

Example API request:

```json
{
  "lesson_id": "digestive-system",
  "question": "Where are most nutrients absorbed?"
}
```

Include the `conversation_id` from the previous response to continue a conversation. The API also provides `GET /api/lessons`, `GET /api/lessons/{lesson_id}`, `GET /api/lessons/{lesson_id}/content`, `POST /api/doubts`, and `GET /api/history/{lesson_id}`.

## Checks

Backend syntax and dependency checks, from the repository root:

```bash
.venv/bin/python -m compileall -q backend/app
.venv/bin/python -m pip check
```

On Windows PowerShell, use `.venv\Scripts\python.exe` instead of `.venv/bin/python`.

Frontend checks, from `frontend/`:

```bash
npm run lint
npm run build
```

## Troubleshooting

- **No lessons appear:** confirm Qdrant is running, check `GEMINI_API_KEY`, then run `python -m app.ingest_lesson` from `backend/`.
- **Backend connection error:** start Uvicorn on port `8000`; the Vite development proxy expects that address.
- **Gemini returns 503:** check API key validity, model access, network connectivity, and account quota. The configured fallback is used for transient `429` and `503` errors, but provider capacity or quota limits can still interrupt requests.
- **Qdrant connection error:** check that the container is running and that port `6333` is available. A local unauthenticated instance should use `http://localhost:6333` with an empty `QDRANT_API_KEY`.

This is a local MVP intended for evaluation. It does not include user authentication, authorization, or production database migrations. `/health` reports API process health; it does not guarantee Gemini or Qdrant availability.
