# Studyroom Frontend

React, TypeScript, Vite, Tailwind CSS, and shadcn-style UI components for the AI Doubt Solver.

## Run locally

From this directory:

```powershell
npm install
npm run dev
```

The development server proxies `/api` and `/health` to `http://127.0.0.1:8000`. Start the FastAPI backend separately from `../backend`:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

By default, the Vite proxy is enough for local development. To use a different API origin, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend base URL. Configure the backend's CORS origins to include the frontend origin when bypassing the development proxy.

## Checks

```powershell
npm run lint
npm run build
```

The lesson list, lesson metadata, doubt submission, conversation continuity, history, and source references are loaded from the FastAPI API. No service credentials belong in frontend environment variables.
