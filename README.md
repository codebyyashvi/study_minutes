# StudyMinutes

StudyMinutes is an AI-powered study companion that helps students turn raw content into clean, usable notes and chat with those notes later.

It supports:
- Text note formatting
- Audio-to-notes transcription
- PDF-to-notes extraction
- Subject-wise organization and analytics
- AI chat grounded in the user's own notes
- Saved/renamed chat threads
- Google login and profile management

## Architecture

This repository is split into two apps:

- `backend/` -> FastAPI + MongoDB + Qdrant + Azure OpenAI/OpenRouter
- `frontend/` -> React + Vite + Tailwind

High-level flow:
1. User authenticates with Google OAuth.
2. User uploads text/audio/PDF.
3. Backend formats notes and stores structured data in MongoDB.
4. Notes are chunked + embedded and stored in Qdrant.
5. Chat queries retrieve relevant note chunks and generate contextual answers.

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Google OAuth (`@react-oauth/google`)

### Backend
- FastAPI
- PyMongo + GridFS
- Qdrant Vector DB
- Azure OpenAI SDK
- OpenRouter embeddings API
- SpeechRecognition + pydub
- pypdf

## Project Structure

```text
study_minutes/
  backend/
    app.py
    auth.py
    chatbot.py
    db.py
    ai_formatter.py
    audio_transcriber.py
    pdf_processor.py
    requirements.txt
  frontend/
    src/
    package.json
```

## Prerequisites

Install the following before running locally:
- Python 3.10+
- Node.js 18+
- MongoDB (local or cloud)
- Qdrant (cloud or self-hosted)
- FFmpeg (required by `pydub` for audio processing)

## Environment Variables

Create a `.env` file inside `backend/`:

```env
MONGO_URI=
SECRET_KEY=
ALGORITHM=HS256
GOOGLE_CLIENT_ID=
BACKEND_URL=http://127.0.0.1:8000

OPEN_AI_KEY=
OPEN_AI_ENDPOINT=
OPENROUTER_API_KEY=

QDRANT_URL=
QDRANT_API_KEY=
```

Create a `.env` file inside `frontend/`:

```env
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=
```

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies and run:

```bash
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

## API Snapshot

Key routes in `backend/app.py` include:

- Auth: `/auth/google`
- Notes: `/upload-note`, `/my-notes`, `/my-notes/count`, `/notes/{note_id}`
- Audio/PDF: `/upload-audio`, `/upload-pdf`
- Subjects: `/subject_count`, `/subject_list`
- Chat: `/chatbot`, `/get-chats`, `/get-chat-history/{chat_id}`
- Saved chats: `/save-chat/{chat_id}`, `/get-saved-chats`
- Profile: `/update-profile-picture`, `/profile-picture/{file_id}`, `/update-profile-name`
- Export: `/export-notes`

## Deployment Notes

- Set CORS origins in `backend/app.py` to match your frontend domain(s).
- Keep all secrets in environment variables, never in source control.
- Use managed MongoDB + Qdrant in production.
- Ensure `BACKEND_URL` points to the deployed API so profile image URLs resolve correctly.

## Troubleshooting

- Audio uploads failing:
  - Verify FFmpeg is installed and available in PATH.
- Google login failing:
  - Check `GOOGLE_CLIENT_ID` in both frontend and backend.
- Chat failing with vector DB errors:
  - Verify `QDRANT_URL` and `QDRANT_API_KEY` and that the cluster is active.
- Empty AI output/errors:
  - Verify `OPEN_AI_KEY`, `OPEN_AI_ENDPOINT`, and `OPENROUTER_API_KEY`.

## License

No license file is currently defined in this repository.
