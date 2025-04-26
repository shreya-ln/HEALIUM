import io
import os
from openai import OpenAI
from datetime import datetime
from supabase import Client
from dotenv import load_dotenv

load_dotenv()

# load your OPENAI_API_KEY from env
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def upload_audio_to_supabase(
    supabase: Client,
    bucket_name: str,
    file_obj
) -> str:
    """
    Uploads raw bytes from Flask’s FileStorage into Supabase Storage
    and returns its public URL.
    """
    ts      = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_fn = file_obj.filename.replace(" ", "_")
    path    = f"audio/{ts}_{safe_fn}"

    # read into bytes
    file_obj.stream.seek(0)
    data: bytes = file_obj.read()

    # upload per Supabase docs
    supabase.storage.from_(bucket_name).upload(
        file         = data,
        path         = path,
        file_options = {"content-type": file_obj.mimetype}
    )

    # get public URL (returns a plain string)
    public_url: str = supabase.storage.from_(bucket_name).get_public_url(path)
    return public_url

def transcribe_with_whisper(file_bytes: bytes, filename: str) -> str:
    """
    Uses OpenAI Whisper to transcribe arbitrary audio.
    We set `audio.name` so Whisper knows the format by extension.
    """
    audio = io.BytesIO(file_bytes)
    audio.name = filename  # e.g. "test.m4a" or "recording.wav"
    resp = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio,
        response_format='text'
    )
    print("Response: ", resp)
    return resp
