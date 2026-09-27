# Learning Doubt Solver Backend

FastAPI backend for lesson-scoped, retrieval-grounded student questions. SQLite stores lessons, conversations, and doubt history. Qdrant stores transcript and study-material chunks. Gemini creates embeddings and grounded answers.

## Requirements

- Python 3.12 or newer
- A Gemini API key from Google AI Studio
- A running Qdrant instance (local or hosted)

## Setup on Windows

Run these commands from the `backend` directory:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `GEMINI_API_KEY`. Set `QDRANT_URL` to your Qdrant endpoint. For a local Qdrant instance, the default URL is `http://localhost:6333`; set `QDRANT_API_KEY` only when your instance requires one. The API key values are read from the environment and are never included in API responses.

The default SQLite database is `db/app.db` relative to the backend working directory. It is created automatically when the application starts. Set `DATABASE_URL` to use another SQLAlchemy-supported database URL.

## Start Qdrant Locally

If Docker is installed, start a local Qdrant service in a separate terminal:

```powershell
docker run --name learning-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

The collection is created automatically when lesson content is ingested. Gemini embedding output and the Qdrant collection are configured to use 768-dimensional vectors.

## Ingest the Example Lesson

With Qdrant running and `GEMINI_API_KEY` set, run from the `backend` directory:

```powershell
python -m app.ingest_lesson
```

This loads `app/data/digestive_system.json`, stores lesson metadata in SQLite, and adds transcript and study-material chunks to Qdrant. The script uses real Gemini embeddings, so it requires a working API key and network access.

## Run the API

```powershell
uvicorn app.main:app --reload
```

The API listens at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /health` returns application process health.
- `GET /api/lessons` lists lessons.
- `GET /api/lessons/{lesson_id}` returns one lesson.
- `POST /api/doubts` retrieves context, generates a grounded answer, and stores the doubt.
- `GET /api/history/{lesson_id}` returns the lesson's doubt history in chronological order.

Example doubt request:

```json
{
  "lesson_id": "digestive-system",
  "question": "What is the role of the small intestine?"
}
```

Include the `conversation_id` returned by a prior doubt response to ask a follow-up question in that conversation.

## Configuration

The supported settings are documented in `.env.example`. `CORS_ORIGINS` is a JSON array of allowed browser origins. Update it for the frontend's actual origin before deployment. Do not commit `.env` or put service credentials in frontend code.

`GET /health` checks that the API process responds; it does not perform dependency readiness checks against Gemini or Qdrant.
