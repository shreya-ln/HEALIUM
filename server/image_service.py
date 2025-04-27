import io
import os
from openai import OpenAI
from datetime import datetime
from supabase import Client
from dotenv import load_dotenv


load_dotenv()

def upload_image_to_supabase(
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
    path    = f"images/{ts}_{safe_fn}"  # Save under 'images/' folder in the bucket

    # Read into bytes
    file_obj.stream.seek(0)
    data: bytes = file_obj.read()

    # Upload
    supabase.storage.from_(bucket_name).upload(
        file         = data,
        path         = path,
        file_options = {"content-type": file_obj.mimetype}
    )

    # Get public URL
    public_url: str = supabase.storage.from_(bucket_name).get_public_url(path)
    return public_url