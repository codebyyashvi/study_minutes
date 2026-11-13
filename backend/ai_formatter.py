from groq import Groq
from dotenv import load_dotenv
import os

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Groq API key not found. Please set GROQ_API or GROQ_API_KEY in backend/.env")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

# Default module-level client
client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        pass


def format_notes(user_text):

    prompt = f"""
    Convert the following messy student notes into structured study notes.
    Rules:
    1. Keep abbreviations exactly as written unless the full form is clearly known.
    2. If the subject full form is clearly known then write it in brackets next to the abbreviation. For example, if the note says "CS (Computer Science)", keep it as is. But if it just says "CS" and it's not clear what it stands for, keep it as "CS".

    Return format:
    Subject:
    Title:
    Explanation:
    Key Points:

    Notes:
    {user_text}
    """

    model = os.getenv("GROQ_MODEL") or GROQ_MODEL or "openai/gpt-oss-120b"
    groq_client = get_groq_client()
    response = groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are an AI that organizes student notes."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content
