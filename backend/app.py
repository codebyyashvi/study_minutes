from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router, get_current_user
from db import notes_collection
from models import Note
from datetime import datetime
from ai_formatter import format_notes
import shutil
import os
from audio_transcriber import transcribe_audio_chunks
import tempfile

app = FastAPI()

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://study-minutes.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)


def notes_filter_for_user(user):
    # Support both current and older note records for the same account.
    return {
        "$or": [
            {"user_id": str(user["_id"])},
            {"email": user["email"]},
        ]
    }

# Example protected route
@app.get("/protected")
def protected(user = Depends(get_current_user)):
    return {
        "message": "You are authenticated",
        "email": user["email"]
    }

@app.get("/")
def root():
    return {"message": "StudyMinutes Backend is running 🚀"}

# Upload note
@app.post("/upload-note")
async def upload_note(data: dict, user=Depends(get_current_user)):

    raw_text = data["content"]

    # AI formats note
    structured_note = format_notes(raw_text)

    note_data = {
        "user_id": str(user["_id"]),   # taken from auth token
        "email": user["email"],
        "raw_note": raw_text,
        "structured_note": structured_note,
        "created_at": datetime.utcnow()
    }

    notes_collection.insert_one(note_data)

    return {
        "message": "Note saved with AI formatting",
        "note": structured_note
    }

# Get logged-in user's notes
@app.get("/my-notes")
async def get_notes(user=Depends(get_current_user)):

    notes = list(notes_collection.find(notes_filter_for_user(user)))

    for note in notes:
        note["_id"] = str(note["_id"])

    return notes

@app.get("/my-notes/count")
async def get_notes_count(user=Depends(get_current_user)):
    total_notes = notes_collection.count_documents(notes_filter_for_user(user))
    return {"total_notes": total_notes}

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...), user=Depends(get_current_user)):

    with tempfile.NamedTemporaryFile(delete=False) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    try:
        # Speech -> text
        raw_text = transcribe_audio_chunks(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    # Text -> structured notes
    structured_notes = format_notes(raw_text)

    note_data = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "raw_note": raw_text,
        "structured_note": structured_notes,
        "created_at": datetime.utcnow()
    }

    notes_collection.insert_one(note_data)

    return {
        "message": "Audio converted successfully",
        "note": structured_notes
    }