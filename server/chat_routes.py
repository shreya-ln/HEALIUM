# server/chat_routes.py
from flask import Blueprint, request, jsonify
import openai
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Setup
chat_routes = Blueprint('chat_routes', __name__)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def get_current_user():
    user_id = request.headers.get('Authorization')
    if not user_id:
        return None
    return user_id

# ─── 1. Chat Endpoint ────────────────────────────────────────────────────────
@chat_routes.route('/chat', methods=['POST'])
@chat_routes.route('/chat', methods=['POST'])
def chat_with_ai():
    user_id = get_current_user()
    data = request.get_json()
    user_question = data.get('question')

    if not user_id or not user_question:
        return jsonify({"error": "Missing user_id or question"}), 400

    # 1. basic info
    patient_resp = supabase.table('patients').select('id, name, dob, preferredlanguage').eq('id', user_id).single().execute()
    patient = patient_resp.data
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    # 2. chat history
    chat_resp = (
        supabase
        .table('chat_messages')
        .select('sender, message')
        .eq('patient_id', user_id)
        .order('created_at')
        .limit(10)
        .execute()
    )
    chat_history = chat_resp.data or []

    # 3. recent visits
    visits_resp = (
        supabase
        .table('visits')
        .select('visitdate, bloodpressure, oxygenlevel, sugarlevel, doctorrecommendation')
        .eq('patient_id', user_id)
        .order('visitdate', desc=True)
        .limit(3)
        .execute()
    )
    visits = visits_resp.data or []

    # 4. OCR reports
    reports_resp = (
        supabase
        .table('reports')
        .select('reportdate, reportcontent')
        .eq('patient_id', user_id)
        .order('reportdate', desc=True)
        .limit(3)
        .execute()
    )
    reports = reports_resp.data or []

    # 5. Prompt
    prompt = f"""
You are a friendly and caring AI healthcare assistant.
When you answer, ALWAYS consider the patient's own health history, doctor notes, and reports first.
If the patient's health information does not mention any restrictions, you can say it seems fine based on available data, but kindly remind the patient that it is always best to double-check with their doctor.


Patient Info:
- Name: {patient['name']}
- Date of Birth: {patient['dob']}
- Preferred Language: {patient['preferredlanguage']}

Recent Health Visits:
"""

    for v in visits:
        prompt += f"\n• Visit on {v['visitdate']}:"
        if v.get('bloodpressure'):
            prompt += f" Blood pressure: {v['bloodpressure']}."
        if v.get('oxygenlevel'):
            prompt += f" Oxygen level: {v['oxygenlevel']}%."
        if v.get('sugarlevel'):
            prompt += f" Blood sugar: {v['sugarlevel']} mg/dL."
        if v.get('doctorrecommendation'):
            prompt += f" Doctor's recommendation: {v['doctorrecommendation']}."

    prompt += "\n\nOCR Reports (uploaded health documents):"
    for r in reports:
        prompt += f"\n• {r['reportdate']}: {r['reportcontent'][:300]}..."  # 길면 300자 정도만 잘라

    prompt += "\n\nRecent Chat History:\n"
    for chat in chat_history:
        role = "User" if chat['sender'] == 'user' else "AI"
        prompt += f"\n{role}: {chat['message']}"

    prompt += f"\n\nPatient's new question: {user_question}\n\nAnswer:"

    # 6. OpenAI call
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a warm and gentle medical assistant who explains health information in simple, caring words."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    answer = response.choices[0].message.content

    # 7. save chat
    supabase.table('chat_messages').insert([
        {"patient_id": user_id, "sender": "user", "message": user_question},
        {"patient_id": user_id, "sender": "bot", "message": answer}
    ]).execute()

    return jsonify({"answer": answer}), 200