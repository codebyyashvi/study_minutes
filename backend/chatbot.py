import requests
import uuid
import time
from zoneinfo import ZoneInfo
from db import chats_collection
from datetime import datetime
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from groq import Groq
from dotenv import load_dotenv
import os

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
IST = ZoneInfo("Asia/Kolkata")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = "user_notes"

_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Groq API key not found. Please set GROQ_API or GROQ_API_KEY in backend/.env")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        pass

_client = None

def get_client():
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        try:
            _client.get_collection(COLLECTION)
        except Exception as e:
            if "not found" in str(e).lower() or "doesn't exist" in str(e).lower():
                _client.create_collection(
                    collection_name=COLLECTION,
                    vectors_config=VectorParams(size=2048, distance=Distance.COSINE)
                )
                _client.create_payload_index(
                    collection_name=COLLECTION,
                    field_name="user_id",
                    field_schema="keyword"
                )
            else:
                _client = None
                raise
    return _client

def get_embedding(text, max_retries=3):

    url = "https://openrouter.ai/api/v1/embeddings"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    model = os.getenv("OPENROUTER_EMBEDDING_MODEL") or os.getenv("EMBEDDING_MODEL") or "nvidia/llama-nemotron-embed-vl-1b-v2:free"

    data = {
        "model": model,
        "input": text
    }

    last_error = None
    for attempt in range(max_retries):
        try:
            r = requests.post(url, headers=headers, json=data, timeout=30)
            response = r.json()

            if "data" in response and len(response["data"]) > 0:
                return response["data"][0]["embedding"]

            last_error = response
        except Exception as e:
            last_error = str(e)

        if attempt < max_retries - 1:
            time.sleep(1.5 * (attempt + 1))

    raise Exception(f"Embedding error: {last_error}")


def split_text(text, chunk_size=120):

    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunks.append(" ".join(words[i:i+chunk_size]))

    return chunks


def store_note_embeddings(note_text, user_id, note_id):

    chunks = split_text(note_text)

    points = []

    for chunk in chunks:

        embedding = get_embedding(chunk)

        points.append({
            "id": str(uuid.uuid4()),
            "vector": embedding,
            "payload": {
                "user_id": user_id,
                "note_id": note_id,
                "text": chunk
            }
        })

    get_client().upsert(
        collection_name=COLLECTION,
        points=points
    )


def search_notes(query, user_id):

    query_vector = get_embedding(query)

    results = get_client().query_points(
        collection_name=COLLECTION,
        query=query_vector,
        limit=5,
        query_filter={
            "must": [
                {"key": "user_id", "match": {"value": user_id}}
            ]
        }
    )

    return [point.payload["text"] for point in results.points]


def delete_note_embeddings(note_id):
    """Delete all embeddings associated with a note from Qdrant.

    Returns:
        tuple[bool, str | None]: (success, error_message)
    """
    try:
        get_client().delete(
            collection_name=COLLECTION,
            points_selector={
                "filter": {
                    "must": [
                        {"key": "note_id", "match": {"value": note_id}}
                    ]
                }
            }
        )
        return True, None
    except Exception as e:
        # Embedding cleanup is best-effort and should not block note deletion.
        return False, str(e)


def ask_chatbot(question, user_id, chat_id):

    try:
        contexts = search_notes(question, user_id)
    except Exception as e:
        print(f"Warning: Note search failed ({e}), continuing without note context.")
        contexts = []

    if not contexts:
        context = "No relevant notes found."
    else:
        context = "\n".join(contexts)

    prompt = f"""You are an AI Study Assistant. You help students by answering questions about their study notes.

IMPORTANT: Always maintain context from the conversation history. If the user is discussing a specific topic or subject, continue referring to that same topic unless they explicitly ask about something different.

User's Study Notes:
{context}

Answer the user's question based on their notes. Keep track of what subject or topic is being discussed throughout the conversation."""
    
    history = get_chat_history(user_id, chat_id)
    message = [{"role": "system", "content": prompt}]
    message += history
    message.append({"role": "user", "content": question})

    model = os.getenv("GROQ_MODEL") or GROQ_MODEL or "openai/gpt-oss-120b"
    groq_client = get_groq_client()
    response = groq_client.chat.completions.create(
        model=model,
        messages=message
    )
    answer = response.choices[0].message.content
    save_chat(user_id, chat_id, "user", question)
    save_chat(user_id, chat_id, "assistant", answer)
    return answer

def save_chat(user_id, chat_id, role, message):
    chats_collection.insert_one({
        "user_id": user_id,
        "chat_id": str(chat_id),  # Ensure chat_id is stored as string
        "role": role,
        "message": message,
        "timestamp": datetime.now(IST).isoformat()
    })

def get_chat_history(user_id, chat_id):

    history = chats_collection.find(
        {"user_id": user_id, "chat_id": str(chat_id)}  # Ensure consistent string comparison
    ).sort("timestamp", -1).limit(50)  # Keep last 50 messages for better context

    messages = []

    for h in reversed(list(history)):
        messages.append({
            "role": h["role"],
            "content": h["message"]
        })

    return messages