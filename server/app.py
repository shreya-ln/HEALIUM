import os
import io
from flask import Flask, request, jsonify
from supabase import create_client, Client
from dotenv import load_dotenv
import openai
import speech_recognition as sr
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_current_user():
    return 1

@app.route('/api/health')
def health():
    return jsonify(status='OK', time=str(request.date if hasattr(request, 'date') else 'now'))

@app.route('/api/patients', methods=['GET'])
def get_patients():
    response = supabase.table('patients').select('*').execute()
    return jsonify(response.data), 200

# patient apis #
# ─── 1. Dashboard Data ────────────────────────────────────────────────────────
@app.route("/dashboard-data", methods=["GET"])
def dashboard_data():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    # a) Latest visit as health summary
    visit = (
        supabase
        .table("visits")
        .select("bloodpressure,oxygenlevel,sugarlevel,weight,height,doctorrecommendations,visitdate")
        .eq("patientid", user_id)
        .order("visitdate", desc=True)
        .limit(1)
        .execute()
    ).data or []

    # b) All medications
    meds = (
        supabase
        .table("medications")
        .select("*")
        .eq("patientid", user_id)
        .execute()
    ).data or []

    # c) Active questions
    active_qs = (
        supabase
        .table("questions")
        .select("*")
        .eq("patientid", user_id)
        .eq("status", "Not")
        .execute()
    ).data or []

    return jsonify({
        "health_summary": visit[0] if visit else {},
        "medications":    meds,
        "active_questions": active_qs
    })

@app.route('/get-questions', methods=['GET'])
def get_questions():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    qs = (
        supabase
        .table("questions")
        .select("*")
        .eq("patientid", user_id)
        .neq("doctorresponse", "Answered")        # only unanswered
        .order("daterecorded", desc=True)
        .execute()
    ).data or []

    return jsonify(qs)


@app.route("/ask-ai", methods=["POST"])
def ask_ai():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json() or {}
    question = data.get("question")
    if not question:
        return jsonify({"error": "question is required"}), 400

    # Call GPT
    resp = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a multilingual medical assistant."},
            {"role": "user",   "content": question}
        ]
    )
    answer = resp.choices[0].message.content

    # Save to questions table
    supabase.table("questions").insert({
        "patientid":      user_id,
        "questiontext":   question,
        "doctorresponse": answer,
        "status":         "answered",
        "daterecorded":   datetime.utcnow().isoformat()
    }).execute()

    return jsonify({"answer": answer})



# ─── 3. Upload Question Audio ─────────────────────────────────────────────────
@app.route("/upload-question-audio", methods=["POST"])
def upload_question_audio():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get("file") # record and have react convert to a file 
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    filename = secure_filename(f.filename)
    audio_bytes = f.read()

    # Transcribe
    recognizer = sr.Recognizer()
    with sr.AudioFile(io.BytesIO(audio_bytes)) as src:
        audio_data = recognizer.record(src)
        text = recognizer.recognize_google(audio_data)

    # Insert as active question
    supabase.table("questions").insert({
        "patientid":    user_id,
        "questiontext": text,
        "questionaudio": filename,
        "status":       "Not",
        "daterecorded": datetime.utcnow().isoformat()
    }).execute()

    return jsonify({"transcript": text})
    
# ─── 5. Get Past Visits (limit 10) ─────────────────────────────────────────────
@app.route("/get-past-visits", methods=["GET"])
def get_past_visits():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    resp = (
        supabase
        .table("visits")
        .select("*")
        .eq("patientid", user_id)
        .order("visitdate", desc=True)
        .limit(10)                        # <— only grab the latest 10
        .execute()
    )

    visits = resp.data or []
    return jsonify(visits)

# ─── 6. Upload OCR Report ────────────────────────────────────────────────────
@app.route("/upload-ocr-report", methods=["POST"])
def upload_ocr_report():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    filename = secure_filename(f.filename)
    ext = os.path.splitext(filename)[1].lower()

    # PDF → images → OCR, else image → OCR
    if ext == ".pdf":
        pages = convert_from_bytes(f.read())
        text = "".join(pytesseract.image_to_string(page) for page in pages)
    else:
        img = Image.open(f.stream)
        text = pytesseract.image_to_string(img)

    # Save into reports
    supabase.table("reports").insert({
        "patientid":    user_id,
        "reportcontent": text,
        "reporttype":   ext.lstrip("."),
        "reportdate":   datetime.utcnow().date().isoformat()
    }).execute()

    return jsonify({"extracted_text": text})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True)
