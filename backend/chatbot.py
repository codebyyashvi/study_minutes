import requests
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from openai import AzureOpenAI
from dotenv import load_dotenv
import os
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = "user_notes"

client = AzureOpenAI(
    api_key=os.getenv("OPEN_AI_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("OPEN_AI_ENDPOINT")
)

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

def get_embedding(text):

    url = "https://openrouter.ai/api/v1/embeddings"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "nvidia/llama-nemotron-embed-vl-1b-v2:free",
        "input": text
    }

    r = requests.post(url, headers=headers, json=data)

    response = r.json()

    if "data" not in response:
        raise Exception(f"Embedding error: {response}")

    return response["data"][0]["embedding"]


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


def ask_chatbot(question, user_id):

    contexts = search_notes(question, user_id)

    if not contexts:
        context = "No relevant notes found."
    else:
        context = "\n".join(contexts)

    prompt = f"""
Answer the question using the user's study notes.

Notes:
{context}

Question:
{question}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content