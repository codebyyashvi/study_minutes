from openai import AzureOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("OPEN_AI_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("OPEN_AI_ENDPOINT")
)

def transcribe_audio(file_path):

    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )

    return transcription.text