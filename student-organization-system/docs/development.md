# Development Guidelines

## Git Workflow

1. Always branch off `development`.
2. Do NOT commit or work directly on `main`.
3. Flow: `development` → testing/finalization → `main` (upon explicit approval).

## Setup Instructions

### Backend Setup
1. `cd student-organization-system/backend`
2. `uv venv .venv`
3. `uv pip install -r requirements.txt`
4. `.venv\Scripts\uvicorn app.main:app --reload`

### Frontend Setup
1. `cd student-organization-system/frontend`
2. `npm install`
3. `npm run dev`
