from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from auth import router as auth_router, get_current_user
from db import notes_collection, chats_collection, saved_chats_collection, users_collection, fs
from models import Note
from datetime import datetime
from zoneinfo import ZoneInfo
from ai_formatter import format_notes
import shutil
import os
from audio_transcriber import transcribe_audio_chunks
import tempfile
import re
from collections import Counter
from pdf_processor import extract_pages
from chatbot import store_note_embeddings, ask_chatbot, delete_note_embeddings

app = FastAPI()

IST = ZoneInfo("Asia/Kolkata")


def get_ist_timestamp():
    # Store ISO timestamp with +05:30 offset so clients render correct India time.
    return datetime.now(IST).isoformat()

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


def extract_subject(note_doc):
    """Extract subject line from structured/raw note text."""
    note_text = (note_doc.get("structured_note") or note_doc.get("raw_note") or "")
    if not isinstance(note_text, str):
        return ""

    # Remove bold markdown before matching `Subject:` lines.
    clean_text = note_text.replace("**", "")
    match = re.search(r"Subject:\s*([^\n]+)", clean_text, flags=re.IGNORECASE)
    if not match:
        return ""

    return match.group(1).strip()

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
        "user_id": str(user["_id"]),  
        "email": user["email"],
        "raw_note": raw_text,
        "structured_note": structured_note,
        "created_at": get_ist_timestamp()
    }

    result = notes_collection.insert_one(note_data)

    store_note_embeddings(
        structured_note,
        str(user["_id"]),
        str(result.inserted_id)
    )

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
        "created_at": get_ist_timestamp()
    }

    result = notes_collection.insert_one(note_data)

    store_note_embeddings(
        structured_notes,
        str(user["_id"]),
        str(result.inserted_id)
    )

    return {
        "message": "Audio converted successfully",
        "note": structured_notes
    }

@app.get("/subject_count")
def subject_count(user=Depends(get_current_user)):
    notes = list(
        notes_collection.find(
            notes_filter_for_user(user),
            {"structured_note": 1, "raw_note": 1},
        )
    )

    subjects = [extract_subject(note) for note in notes]
    subjects = [subject for subject in subjects if subject]

    return dict(Counter(subjects))

@app.get("/subject_list")
def subject_list(user=Depends(get_current_user)):
    notes = list(
        notes_collection.find(
            notes_filter_for_user(user),
            {"structured_note": 1, "raw_note": 1},
        )
    )

    subjects = [extract_subject(note) for note in notes]
    subjects = sorted(set(subject for subject in subjects if subject))

    return subjects

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), user=Depends(get_current_user)):

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        shutil.copyfileobj(file.file, temp)
        temp_path = temp.name

    try:
        pages = extract_pages(temp_path)

        if not pages:
            return {"error": "Could not extract text from PDF"}

        # Combine all pages
        combined_text = " ".join(page["text"] for page in pages)

        # Clean text
        combined_text = re.sub(r"\s+", " ", combined_text)

        # Limit size (important for large PDFs)
        important_text = combined_text[:6000]

        structured_notes = format_notes(important_text)

        note_data = {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "raw_note": important_text,
            "structured_note": structured_notes,
            "created_at": get_ist_timestamp()
        }

        result = notes_collection.insert_one(note_data)
        store_note_embeddings(
            structured_notes,
            str(user["_id"]),
            str(result.inserted_id)
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "message": "PDF processed successfully",
        "note": structured_notes
    }

@app.get("/get-chats")
def get_chats(user=Depends(get_current_user)):
    """Get all chats for the user with their titles."""
    user_id = str(user["_id"])
    
    # Get all unique chat IDs for this user
    chat_ids = chats_collection.distinct("chat_id", {"user_id": user_id})
    
    chats_list = []
    for chat_id in chat_ids:
        # Ensure chat_id is a string for consistent queries
        chat_id_str = str(chat_id)
        
        # Get the first message (usually the user's first question) to use as title
        first_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str, "role": "user"},
            sort=[("timestamp", 1)]
        )
        
        # Get the latest message timestamp for sorting
        latest_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str},
            sort=[("timestamp", -1)]
        )
        
        if first_message:
            # Check if chat has a custom title (from rename)
            custom_title = None
            if latest_message and "chat_title" in latest_message:
                custom_title = latest_message["chat_title"]
            
            # Use custom title if available, otherwise use first message
            if custom_title:
                title = custom_title
            else:
                title = first_message["message"][:50]  # First 50 chars of first message
                if len(first_message["message"]) > 50:
                    title += "..."
            
            chats_list.append({
                "id": chat_id_str,
                "title": title,
                "timestamp": latest_message["timestamp"] if latest_message else None
            })
    
    # Sort by timestamp (newest first)
    chats_list.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return chats_list


@app.get("/get-chat-history/{chat_id}")
def get_chat_history(chat_id: str, user=Depends(get_current_user)):
    """Get all messages in a specific chat."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)  # Ensure chat_id is a string
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get all messages in this chat
    messages = list(chats_collection.find(
        {"user_id": user_id, "chat_id": chat_id}
    ).sort("timestamp", 1))
    
    return [
        {
            "role": "user" if msg["role"] == "user" else "bot",
            "content": msg["message"]
        }
        for msg in messages
    ]


@app.post("/chatbot")
def chatbot(data: dict, user=Depends(get_current_user)):

    question = data.get("question", "").strip()
    chat_id = str(data.get("chat_id"))  # Convert to string for consistent MongoDB storage
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if not chat_id or chat_id == "None":
        raise HTTPException(status_code=400, detail="Chat ID is required.")

    try:
        answer = ask_chatbot(
            question,
            str(user["_id"]),
            chat_id
        )
    except Exception as e:
        error_msg = str(e)
        if "getaddrinfo" in error_msg or "ConnectError" in error_msg or "ResponseHandlingException" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Could not connect to the vector database. Please check your Qdrant cloud cluster is active."
            )
        raise HTTPException(status_code=500, detail=f"Chatbot error: {error_msg}")

    return {
        "question": question,
        "answer": answer
    }

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    """Delete a note and its embeddings."""
    from bson import ObjectId
    
    try:
        # Verify the note exists and belongs to the user
        note = notes_collection.find_one({
            "_id": ObjectId(note_id),
            "$or": [
                {"user_id": str(user["_id"])},
                {"email": user["email"]}
            ]
        })
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found or you don't have permission to delete it.")
        
        # Delete embeddings from Qdrant
        delete_note_embeddings(note_id)
        
        # Delete note from MongoDB
        notes_collection.delete_one({"_id": ObjectId(note_id)})
        
        return {"message": "Note deleted successfully"}
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")


@app.put("/rename-chat/{chat_id}")
def rename_chat(chat_id: str, data: dict, user=Depends(get_current_user)):
    """Rename a chat."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    new_title = data.get("title", "").strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Update all messages in this chat with the new title
    # Store title in the first message or create a metadata document
    result = chats_collection.update_many(
        {"user_id": user_id, "chat_id": chat_id},
        {"$set": {"chat_title": new_title}}
    )
    
    return {
        "message": "Chat renamed successfully",
        "chat_id": chat_id,
        "new_title": new_title,
        "modified_count": result.modified_count
    }


@app.delete("/delete-chat/{chat_id}")
def delete_chat(chat_id: str, user=Depends(get_current_user)):
    """Delete a chat and all its messages."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete all messages in this chat
    result = chats_collection.delete_many(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    return {
        "message": "Chat deleted successfully",
        "chat_id": chat_id,
        "deleted_count": result.deleted_count
    }


@app.post("/save-chat/{chat_id}")
def save_chat_permanently(chat_id: str, user=Depends(get_current_user)):
    """Save a chat to the user's saved chats."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if already saved
    already_saved = saved_chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if already_saved:
        return {
            "message": "Chat already saved",
            "chat_id": chat_id
        }
    
    # Add to saved chats
    saved_chats_collection.insert_one({
        "user_id": user_id,
        "chat_id": chat_id,
        "saved_at": get_ist_timestamp()
    })
    
    return {
        "message": "Chat saved successfully",
        "chat_id": chat_id
    }


@app.delete("/save-chat/{chat_id}")
def unsave_chat(chat_id: str, user=Depends(get_current_user)):
    """Remove a chat from the user's saved chats."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Remove from saved chats
    result = saved_chats_collection.delete_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    return {
        "message": "Chat unsaved successfully",
        "chat_id": chat_id,
        "deleted": result.deleted_count > 0
    }


@app.get("/get-saved-chats")
def get_saved_chats(user=Depends(get_current_user)):
    """Get all saved chats for the user."""
    user_id = str(user["_id"])
    
    # Get all saved chat IDs
    saved_chat_ids = saved_chats_collection.distinct("chat_id", {"user_id": user_id})
    
    chats_list = []
    for chat_id in saved_chat_ids:
        chat_id_str = str(chat_id)
        
        # Get the first message (usually the user's first question) to use as title
        first_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str, "role": "user"},
            sort=[("timestamp", 1)]
        )
        
        # Get the latest message timestamp for sorting
        latest_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str},
            sort=[("timestamp", -1)]
        )
        
        if first_message:
            # Check if chat has a custom title (from rename)
            custom_title = None
            if latest_message and "chat_title" in latest_message:
                custom_title = latest_message["chat_title"]
            
            # Use custom title if available, otherwise use first message
            if custom_title:
                title = custom_title
            else:
                title = first_message["message"][:50]  # First 50 chars of first message
                if len(first_message["message"]) > 50:
                    title += "..."
            
            chats_list.append({
                "id": chat_id_str,
                "title": title,
                "timestamp": latest_message["timestamp"] if latest_message else None
            })
    
    # Sort by timestamp (newest first)
    chats_list.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return chats_list


@app.post("/update-profile-picture")
async def update_profile_picture(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Update user's profile picture."""
    from bson import ObjectId
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
        
        # Delete old profile picture if exists
        user_doc = users_collection.find_one({"_id": user["_id"]})
        if user_doc and user_doc.get("profile_picture_id"):
            try:
                fs.delete(ObjectId(user_doc["profile_picture_id"]))
            except Exception:
                pass
        
        # Store new image in GridFS
        filename = f"profile_{str(user['_id'])}_{file.filename}"
        file_id = fs.put(
            file_content,
            filename=filename,
            content_type=file.content_type,
            user_id=str(user["_id"])
        )
        
        # Update user document with file ID
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "profile_picture_id": str(file_id),
                    "updated_at": get_ist_timestamp()
                }
            }
        )
        
        return {
            "message": "Profile picture updated successfully",
            "picture_url": f"http://127.0.0.1:8000/profile-picture/{str(file_id)}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile picture: {str(e)}")


@app.get("/profile-picture/{file_id}")
def get_profile_picture(file_id: str):
    """Get profile picture from GridFS."""
    from bson import ObjectId
    from io import BytesIO
    
    try:
        # Retrieve file from GridFS
        grid_out = fs.get(ObjectId(file_id))
        file_content = grid_out.read()
        
        # Return image as streaming response
        return StreamingResponse(
            BytesIO(file_content),
            media_type=grid_out.content_type,
            headers={"Content-Disposition": f"inline; filename={grid_out.filename}"}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Profile picture not found")


@app.delete("/delete-profile-picture")
def delete_profile_picture(user=Depends(get_current_user)):
    """Delete user's profile picture."""
    from bson import ObjectId
    
    try:
        user_doc = users_collection.find_one({"_id": user["_id"]})
        
        if not user_doc or not user_doc.get("profile_picture_id"):
            raise HTTPException(status_code=400, detail="No profile picture to delete")
        
        # Delete file from GridFS
        try:
            fs.delete(ObjectId(user_doc["profile_picture_id"]))
        except Exception:
            pass
        
        # Remove profile_picture_id from user document
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$unset": {"profile_picture_id": ""},
                "$set": {"updated_at": get_ist_timestamp()}
            }
        )
        
        return {
            "message": "Profile picture deleted successfully",
            "picture": None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting profile picture: {str(e)}")


@app.get("/export-notes")
def export_notes(user=Depends(get_current_user)):
    """Export all user notes as a text file."""
    from io import BytesIO
    
    try:
        # Fetch all notes for the user
        notes = list(notes_collection.find({"user_id": str(user["_id"])}))
        
        if not notes:
            raise HTTPException(status_code=404, detail="No notes to export")
        
        # Format notes as readable text
        export_text = f"StudyMinutes - Notes Export\n"
        export_text += f"User: {user.get('name', 'Unknown')}\n"
        export_text += f"Export Date: {get_ist_timestamp()}\n"
        export_text += "=" * 80 + "\n\n"
        
        for idx, note in enumerate(notes, 1):
            export_text += f"--- Note {idx} ---\n"
            export_text += f"Created: {note.get('created_at', 'N/A')}\n"
            
            if note.get("structured_note"):
                export_text += f"Content:\n{note['structured_note']}\n"
            elif note.get("raw_note"):
                export_text += f"Content:\n{note['raw_note']}\n"
            
            export_text += "\n" + "=" * 80 + "\n\n"
        
        # Create binary stream
        file_content = export_text.encode('utf-8')
        
        return StreamingResponse(
            BytesIO(file_content),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=StudyMinutes_Notes_{get_ist_timestamp().replace(':', '-')}.txt"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting notes: {str(e)}")


@app.put("/update-profile-name")
def update_profile_name(data: dict, user=Depends(get_current_user)):
    """Update user's name/username."""
    user_id = str(user["_id"])
    new_name = data.get("name", "").strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    if len(new_name) > 100:
        raise HTTPException(status_code=400, detail="Name is too long (max 100 characters)")
    
    try:
        # Update user document in MongoDB
        result = users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "name": new_name,
                    "updated_at": get_ist_timestamp()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "message": "Profile name updated successfully",
            "name": new_name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile name: {str(e)}")