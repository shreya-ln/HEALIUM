#server/app.py
import os
import json
import re
from flask import Flask, request, jsonify
from supabase import create_client, Client
import openai
import speech_recognition as sr
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract
from dotenv import load_dotenv
from flask_cors import CORS
from datetime import datetime
from audio_service import upload_audio_to_supabase, transcribe_with_whisper
from chat_routes import chat_routes  # <-- import
from visit_routes import visit_routes
from image_service import upload_image_to_supabase
import base64
from wolfram_service import query_wolfram

load_dotenv()


app = Flask(__name__)
CORS(app)

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

llm = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_current_user():
    user_id = request.headers.get('Authorization')
    if not user_id:
        return None
    return user_id

app.register_blueprint(visit_routes)
# ---------- signin / signup API endpoints -------------- #
@app.route('/signin', methods=['POST'])
def signin():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    try:
        result = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        user_id = result.user.id

        # Role check
        patient = supabase.table('patients').select('id').eq('id', user_id).execute()
        doctor = supabase.table('doctors').select('id').eq('id', user_id).execute()

        if patient.data:
            role = "patient"
        elif doctor.data:
            role = "doctor"
        else:
            role = "unknown"

        return jsonify({
            "message": "Signin success!",
            "user_id": user_id,
            "role": role
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')  # "doctor" or "patient"
    extra_info = data.get('extra_info')  # dict

    try:
        # 1. Supabase Auth signup
        result = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        user_id = result.user.id

        # 2. Save additional user info to database
        table = 'doctors' if role == 'doctor' else 'patients'
        supabase.table(table).insert([{ "id": user_id, **extra_info }]).execute()

        # 3. Check if email verification is required
        if result.session is None:
            message = "Verification email sent. Please check your inbox."
        else:
            message = "Signup success! You can log in now."

        return jsonify({"message": message}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ------------------------ #
@app.route('/api/health')
def health():
    return jsonify(status='OK')

@app.route('/api/patients', methods=['GET'])
def get_patients():
    response = supabase.table('patients').select('*').execute()
    return jsonify(response.data), 200


# ---------- Doctor API endpoints -------------- #
#load doctors info
@app.route('/doctor-profile', methods=['GET'])
def doctor_profile():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    resp = (
        supabase
        .table('doctors')
        .select('name, hospital, specialization, email')
        .eq('id', user_id)
        .single()
        .execute()
    )

    if not resp.data:
        return jsonify({"error": "Doctor profile not found"}), 404

    return jsonify(resp.data), 200

@app.route('/pending-questions-for-doctor', methods=['GET'])
def pending_questions_for_doctor():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    questions_resp = (
        supabase
        .table('questions')
        .select('id, patient_id, questiontext, daterecorded')
        .eq('doctor_id', user_id)
        .eq('status', 'Not')
        .order('daterecorded', desc=True)
        .execute()
    )

    questions = questions_resp.data or []
    return jsonify(questions), 200



# Fetch the list of patients
@app.route('/list-patients', methods=['GET'])
def list_patients():
    # 1) Get doctorId from query string
    doctor_id = request.args.get('doctorId')
    if doctor_id is None:
        abort(400, description="Missing required query parameter: doctorId")

    # 2) Fetch all visits for that doctor
    visits_resp = (
        supabase
        .table('visits')
        .select('patient_id, visitdate')
        .eq('doctor_id', doctor_id)
        .execute()
    )
    visits = visits_resp.data

    # 3) Compute the latest visit date per patient
    last_visits = {}
    for v in visits:
        pid      = v['patient_id']
        date_str = v['visitdate'].split('T')[0]
        if pid not in last_visits or date_str > last_visits[pid]:
            last_visits[pid] = date_str

    if not last_visits:
        return jsonify([]), 200

    # 4) Fetch patient names for just those IDs
    patient_ids = list(last_visits.keys())
    patients_resp = (
        supabase
        .table('patients')
        .select('id, name')
        .in_('id', patient_ids)
        .execute()
    )
    patients = patients_resp.data

    # 5) Build and return the payload
    result = []
    for p in patients:
        pid = p['id']
        result.append({
            "patient_id": f"p{pid}",
            "name":       p['name'],
            "last_visit": last_visits.get(pid)
        })

    return jsonify(result), 200

# Fetch the patient profile
@app.route('/patient-profile/<patient_id>', methods=['GET'])
def patient_profile(patient_id):
    # 1. Fetch patient_info
    patient_resp = (
        supabase
        .table('patients')
        .select('name, dob, email, phone, address, preferredlanguage')
        .eq('id', patient_id)
        .single()
        .execute()
    )
    if patient_resp.data is None:
        abort(404, description="Patient not found")
    patient = patient_resp.data

    # 2. Fetch all visits for this patient
    visits_resp = (
        supabase
        .table('visits')
        .select('visitdate, content, bloodpressure, oxygenlevel, sugarlevel')
        .eq('patient_id', patient_id)
        .order('visitdate', desc=False)
        .execute()
    )
    visits = visits_resp.data or []

    # 3. Build health_trends and visit_history
    blood_pressure = []
    oxygen_level  = []
    sugar_level   = []
    visit_history = []

    for v in visits:
        date_str = v['visitdate'].split('T')[0]

        if v.get('bloodpressure') is not None:
            blood_pressure.append({'date': date_str, 'value': v['bloodpressure']})
        if v.get('oxygenlevel') is not None:
            oxygen_level.append({'date': date_str, 'value': v['oxygenlevel']})
        if v.get('sugarlevel') is not None:
            sugar_level.append({'date': date_str, 'value': v['sugarlevel']})

        if v.get('content'):
            visit_history.append({
                'date':    date_str,
                'summary': v['content']
            })

    # 4. Fetch pending (unanswered) questions
    q_resp = (
        supabase
        .table('questions')
        .select('id, questiontext')
        .eq('patient_id', patient_id)
        .eq('status', 'Not')
        .execute()
    )
    questions = q_resp.data or []
    pending_questions = [
        {'id': f"q{q['id']}", 'question_text': q['questiontext']}
        for q in questions
    ]

    # 5. Return combined profile
    return jsonify({
        'patient_info': {
            'name':  patient['name'],
            'dob':   patient['dob'],
            'email': patient['email'],
            'phone': patient['phone'],
            'address': patient['address'],
            'preferredlanguage': patient['preferredlanguage']
        },
        'health_trends': {
            'blood_pressure': blood_pressure,
            'oxygen_level':   oxygen_level,
            'sugar_level':    sugar_level
        },
        'visit_history':     visit_history,
        'pending_questions': pending_questions
    }), 200

# Create a new visit
@app.route('/api/visits', methods=['POST'])
def create_visit():
    data = request.get_json() or {}

    # 1) Validate required fields
    required = ['patient_id', 'doctor_id', 'content']
    missing = [f for f in required if f not in data]
    if missing:
        abort(400, description=f"Missing fields: {', '.join(missing)}")

    # 2) Build insert payload (map your JSON keys to DB column names)
    new_visit = {
        'patient_id':             data['patient_id'],
        'doctor_id':              data['doctor_id'],
        'content':               data['content'],
        'bloodpressure':         data.get('blood_pressure'),
        'oxygenlevel':           data.get('oxygen_level'),
        'sugarlevel':            data.get('sugar_level'),
        'weight':                data.get('weight'),
        'height':                data.get('height'),
        'visitsummaryaudio':     data.get('visit_summary_audio'),
        'doctorrecommendation': data.get('doctor_recommendation'),
        'visitdate':             data.get('visit_date') or datetime.utcnow().isoformat()
    }

    # 3) Insert into Supabase
    resp = supabase.table('visits').insert(new_visit).execute()

    # 4) Check for success
    if not resp.data:
        abort(resp.status_code or 500, description="Failed to create visit")

    # 5) Return the newly created visit record
    created = resp.data[0]
    return jsonify(created), 201

# patient apis #
# ─── 1. Dashboard Data ────────────────────────────────────────────────────────
@app.route("/dashboard-data", methods=["GET"])
def dashboard_data():
    patient_id = get_current_user()
    if not patient_id:
        return jsonify({"error": "unauthorized"}), 401

    # a) Latest visit as health summary
    latest_resp = (
        supabase
        .table("visits")
        .select("bloodpressure, oxygenlevel, sugarlevel, weight, height, doctorrecommendation, visitdate")
        .eq("patient_id", patient_id)
        .order("visitdate", desc=True)
        .limit(1)
        .execute()
    )
    latest = latest_resp.data or []

    # b) Build full visit history for trends
    visits_resp = (
        supabase
        .table("visits")
        .select("visitdate, bloodpressure, oxygenlevel, sugarlevel")
        .eq("patient_id", patient_id)
        .order("visitdate", desc=False)
        .execute()
    )
    visits = visits_resp.data or []

    blood_pressure = []
    oxygen_level  = []
    sugar_level   = []
    for v in visits:
        date_str = v["visitdate"].split("T")[0]
        if v.get("bloodpressure") is not None:
            blood_pressure.append({"date": date_str, "value": v["bloodpressure"]})
        if v.get("oxygenlevel") is not None:
            oxygen_level.append({"date": date_str, "value": v["oxygenlevel"]})
        if v.get("sugarlevel") is not None:
            sugar_level.append({"date": date_str, "value": v["sugarlevel"]})

    # c) All medications
    meds = (
        supabase
        .table("medications")
        .select("*")
        .eq("patient_id", patient_id)
        .execute()
    ).data or []

    # d) Active (unanswered) questions
    active_qs = (
        supabase
        .table("questions")
        .select("id, questiontext")
        .eq("patient_id", patient_id)
        .eq("status", "Not")
        .execute()
    ).data or []
    # format questions as you like, e.g. prefixing id
    active_questions = [
        {"id": f"q{q['id']}", "question_text": q["questiontext"]}
        for q in active_qs
    ]

    reports = (
        supabase
        .table("reports")
        .select("id, reporttype, reportcontent, reportdate, image_url")
        .eq("patient_id", patient_id)
        .order("reportdate", desc=True)
        .execute()
    ).data or []
    formatted_reports = [
        {
            "report_id":      r["id"],
            "type":           r["reporttype"],
            "content":        r["reportcontent"],
            "date":           r["reportdate"],
            "image_url":      r.get("image_url")
        }
        for r in reports
    ]

    llm_result = trend_recommendations({
            "blood_pressure": blood_pressure,
            "oxygen_level":   oxygen_level,
            "sugar_level":    sugar_level
    })

    return jsonify({
        "health_summary": latest[0] if latest else {},
        "health_trends": {
            "blood_pressure": blood_pressure,
            "oxygen_level":   oxygen_level,
            "sugar_level":    sugar_level
        },
        "medications":        meds,
        "active_questions":   active_questions,
        "recommendations":    llm_result,
        "reports":            formatted_reports
    }), 200

@app.route('/get-questions', methods=['GET'])
def get_questions():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    qs = (
        supabase
        .table("questions")
        .select("questiontext")
        .eq("patient_id", user_id)
        .neq("status", "Answered")        # only unanswered
        .order("daterecorded", desc=True)
        .execute()
    ).data or []

    return jsonify(qs)


@app.route("/ask-ai-old", methods=["POST"])
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
        "patient_id":      user_id,
        "questiontext":   question,
        "doctorresponse": answer,
        "status":         "answered_by_ai",
        "daterecorded":   datetime.utcnow().isoformat()
    }).execute()

    return jsonify({"answer": answer})



# ─── 3. Upload Question Audio ─────────────────────────────────────────────────
@app.route("/upload-question-audio", methods=["POST"])
def upload_question_audio():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    # 1) Upload to Supabase Storage
    try:
        public_url = upload_audio_to_supabase(
            supabase,
            os.getenv("SUPABASE_AUDIO_BUCKET", "audio-uploads"),
            f
        )
    except Exception as e:
        return jsonify({"error": f"Storage upload failed: {e}"}), 500

    # 2) Transcribe with Whisper
    f.stream.seek(0)
    raw = f.read()
    try:
        transcript = transcribe_with_whisper(raw, f.filename)
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {e}"}), 500

    # 3) Persist to your `questions` table
    record = {
        "patient_id":    user_id,
        "questiontext":  transcript,
        "questionaudio": public_url,
        "status":        "Not",
        "daterecorded":  datetime.utcnow().isoformat(),
        "doctor_id":     request.form.get('doctor_id'),
        "visit_id":      request.form.get('visit_id')
    }
    supabase.table("questions").insert(record).execute()

    return jsonify({
        "transcript": transcript,
        "audioUrl":   public_url
    }), 200

@app.route("/upload-question-audio-for-chat", methods=["POST"])
def upload_question_audio_for_chat():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    # 1) Transcribe with Whisper
    f.stream.seek(0)
    raw = f.read()
    try:
        transcript = transcribe_with_whisper(raw, f.filename)
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {e}"}), 500

    return jsonify({"transcript": transcript}), 200



# ─── 5. Get Past Visits (limit 10) ─────────────────────────────────────────────
@app.route("/get-past-visits", methods=["GET"])
def get_past_visits():
    patient_id = get_current_user()
    if not patient_id:
        return jsonify({"error": "unauthorized"}), 401

    # 1) Build “now” ISO string (UTC)
    now_iso = datetime.utcnow().isoformat()

    # 2) Query only visits before today, most recent first, limit 10
    resp = (
        supabase
        .table("visits")
        .select("*")
        .eq("patient_id", patient_id)
        .lt("visitdate", now_iso)          # <— only dates strictly before now
        .order("visitdate", desc=True)
        .limit(10)
        .execute()
    )
    visits = resp.data or []
    return jsonify(visits), 200

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
        "patient_id":    user_id,
        "reportcontent": text,
        "reporttype":   ext.lstrip("."),
        "reportdate":   datetime.utcnow().date().isoformat()
    }).execute()

    return jsonify({"extracted_text": text})

@app.route('/upcoming-visits', methods=['GET'])
def upcoming_visits():
    # 1) Identify patient
    patient_id = get_current_user()
    if not patient_id:
        abort(401, description="Unauthorized")

    # 2) “Now” in ISO format for Postgres comparison
    now_iso = datetime.utcnow().isoformat()

    # 3) Query for visits after today
    resp = (
        supabase
        .table('visits')
        .select('id, doctor_id, visitdate, content')
        .eq('patient_id', patient_id)
        .gt('visitdate', now_iso)
        .order('visitdate', desc=False)
        .execute()
    )

    visits = resp.data or []

    # 4) Format for client
    upcoming = [
        {
            "visit_id":   v["id"],
            "date":       v["visitdate"].split("T")[0],
            "doctor_id":  v["doctor_id"],
            "summary":    v.get("content", "")
        }
        for v in visits
    ]

    return jsonify(upcoming), 200

@app.route('/visit/<visit_id>', methods=['GET'])
def get_visit(visit_id):
    # 1) Fetch the visit by its ID
    resp = (
        supabase
        .table('visits')
        .select('id, patient_id, doctor_id, visitdate, content, bloodpressure, oxygenlevel, sugarlevel, weight, height, visitsummaryaudio, doctorrecommendation')
        .eq('id', visit_id)
        .single()
        .execute()
    )

    # 2) Handle errors or not-found
    if not resp.data:
        abort(404, description="Visit not found")

    visit = resp.data

    # 2) Resolve public audio URL if present
    audio_url = visit.get('visitsummaryaudio')
    if audio_url:
        audio_path = audio_url.lstrip('/')
        audio_url = (
            supabase
            .storage
            .from_(os.getenv("SUPABASE_AUDIO_BUCKET", "audio-uploads"))
            .get_public_url(audio_path)
            .split('?', 1)[0]
        )

    # 3) Fetch all questions this patient has asked
    q_resp = (
        supabase
        .table('questions')
        .select('id, questiontext, status, questionaudio, daterecorded')
        .eq('patient_id', visit['patient_id'])
        .eq('doctor_id', visit['doctor_id'])
        .eq('visit_id', visit['id'])
        .order('daterecorded', desc=True)
        .execute()
    )
    questions = q_resp.data or []
    questions_list = [
        {
            'id': f"q{q['id']}",
            'transcript': q['questiontext'],
            'status': q['status'],
            'audioUrl': q['questionaudio'],
            'daterecorded': q['daterecorded'],
            'questiontext': q['questiontext'],
        }
        for q in questions
    ]

    # 4) Return combined payload
    return jsonify({
        'visit_id':             visit['id'],
        'patient_id':           visit['patient_id'],
        'doctor_id':            visit['doctor_id'],
        'visit_date':           visit['visitdate'],
        'summary':              visit.get('content'),
        'blood_pressure':       visit.get('bloodpressure'),
        'oxygen_level':         visit.get('oxygenlevel'),
        'sugar_level':          visit.get('sugarlevel'),
        'weight':               visit.get('weight'),
        'height':               visit.get('height'),
        'audio_summary_url':    audio_url,
        'doctor_recommendation': visit.get('doctorrecommendation'),
        'questions':            questions_list
    }), 200

app.register_blueprint(chat_routes)


@app.route('/visit/<visit_id>', methods=['GET'])
def get_visit_by_id(visit_id):
    try:
        resp = (
            supabase
            .table('visits')
            .select('id, patient_id, doctor_id, visitdate')
            .eq('id', visit_id)
            .single()
            .execute()
        )

        if not resp.data:
            return jsonify({'error': 'Visit not found'}), 404

        return jsonify(resp.data), 200

    except Exception as e:
        print(e)
        return jsonify({'error': 'Internal Server Error'}), 500

# ======================================
#GET patient/:patient_id
@app.route('/patient/<patient_id>', methods=['GET'])
def get_patient_by_id(patient_id):
    try:
        resp = (
            supabase
            .table('patients')
            .select('id, name, dob, phone, address, preferredlanguage')
            .eq('id', patient_id)
            .single()
            .execute()
        )

        if not resp.data:
            return jsonify({'error': 'Patient not found'}), 404

        return jsonify(resp.data), 200

    except Exception as e:
        print(e)
        return jsonify({'error': 'Internal Server Error'}), 500
# app.py
@app.route('/patient-summary/<patient_id>', methods=['GET'])
def patient_summary(patient_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    # a) Basic patient info
    patient = supabase.table('patients') \
        .select('id, name, dob, phone, address, preferredlanguage') \
        .eq('id', patient_id) \
        .single() \
        .execute().data
    if not patient:
        abort(404, description="Patient not found")

    # b) Last 5 visits with metrics
    visits = supabase.table('visits') \
        .select('visitdate, bloodpressure, oxygenlevel, sugarlevel') \
        .eq('patient_id', patient_id) \
        .order('visitdate', desc=True) \
        .limit(5) \
        .execute().data or []

    # build trend arrays (ordered oldest→newest)
    visits_sorted = sorted(visits, key=lambda v: v['visitdate'])
    trends = {
        "blood_pressure": [
            {"date": v['visitdate'].split("T")[0], "value": v['bloodpressure']}
            for v in visits_sorted if v.get('bloodpressure') is not None
        ],
        "oxygen_level": [
            {"date": v['visitdate'].split("T")[0], "value": v['oxygenlevel']}
            for v in visits_sorted if v.get('oxygenlevel') is not None
        ],
        "sugar_level": [
            {"date": v['visitdate'].split("T")[0], "value": v['sugarlevel']}
            for v in visits_sorted if v.get('sugarlevel') is not None
        ]
    }

    # c) Other sections as before...
    meds = supabase.table('medications') \
        .select('medicationid, medicationname, dosage, frequency, startdate, enddate, notes') \
        .eq('patient_id', patient_id) \
        .order('startdate', desc=True) \
        .execute().data or []

    reports = supabase.table('reports') \
        .select('id, reporttype, reportcontent, reportdate, image_url') \
        .eq('patient_id', patient_id) \
        .order('reportdate', desc=True) \
        .execute().data or []

    questions = supabase.table('questions') \
        .select('id, patient_id, doctor_id, questiontext, daterecorded') \
        .eq('patient_id', patient_id) \
        .eq('doctor_id', user_id) \
        .eq('status', 'Not') \
        .order('daterecorded', desc=True) \
        .execute().data or []

    # d) Generate single recommendation sentence
    recommendation = generate_recommendation(trends)
    print("recommendation: ", recommendation)

    return jsonify({
        "patient":           patient,
        "recent_visits":     visits,
        "medications":       meds,
        "reports":           reports,
        "pending_questions": questions,
        "recommendation":    recommendation
    }), 200


@app.route('/search-patient', methods=['POST'])
def search_patient():
    try:
        data = request.json
        name = data.get('name')
        dob = data.get('dob')

        if not name or not dob:
            return jsonify({'error': 'Missing name or dob'}), 400

        # 이름 부분 매칭 + 정확한 생일 매칭
        resp = (
            supabase
            .table('patients')
            .select('id, name, dob')
            .ilike('name', f'%{name}%')   # 부분 일치
            .eq('dob', dob)               # DOB는 정확히
            .execute()
        )

        patients = resp.data or []
        return jsonify(patients), 200

    except Exception as e:
        print('Error in search_patient:', e)
        return jsonify({'error': 'Internal Server Error'}), 500

# server/visit_routes.py
@app.route('/create-appointment', methods=['POST'])
def create_appointment():
    try:
        data = request.json
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')
        visitdate = data.get('visitdate')
        memo = data.get('memo')  # Optional

        if not patient_id or not doctor_id or not visitdate:
            return jsonify({'error': 'Missing patient_id, doctor_id, or visitdate'}), 400

        # Create a new visit
        supabase.table('visits').insert({
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'visitdate': visitdate,
            'content': memo or '',
        }).execute()

        return jsonify({'message': 'Appointment created successfully'}), 200

    except Exception as e:
        print('Error in create_appointment:', e)
        return jsonify({'error': 'Internal Server Error'}), 500

# summarize audio
@app.route('/summarize-audio', methods=['POST'])
def summarize_audio():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get('file')
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    # 1. Transcribe
    f.stream.seek(0)
    raw = f.read()
    try:
        # Upload first (need fresh FileStorage because we just read it)
        f.stream.seek(0)
        audio_url = upload_audio_to_supabase(
            supabase,
            os.getenv("SUPABASE_AUDIO_BUCKET", "audio-uploads"),
            f
        )
    except Exception as e:
        print("Upload error:", e)
        return jsonify({"error": f"Storage upload failed: {e}"}), 500


    try:
        transcript = transcribe_with_whisper(raw, f.filename)
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {e}"}), 500

    # 2. Summarize
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Summarize the following medical visit notes in a clear, short paragraph suitable for a patient summary. Keep it easy to understand, concise, and professional."},
                {"role": "user", "content": transcript}
            ],
            temperature=0.5
        )
        summary = resp.choices[0].message.content
    except Exception as e:
        return jsonify({"error": f"Summarization failed: {e}"}), 500

    return jsonify({
        "transcript": transcript,
        "summary": summary,
        "audioUrl": audio_url
    }), 200

def trend_recommendations(trendData):
    """
    Expects JSON body:
    {
      "blood_pressure": [ {"date":"2025-01-01","value":120}, ... ],
      "oxygen_level":   [ {"date":"2025-01-01","value":98},  ... ],
      "sugar_level":    [ {"date":"2025-01-01","value":90},  ... ]
    }
    Returns:
    {
      "blood_pressure": "...",
      "oxygen_level":   "...",
      "sugar_level":    "..."
    }
    """
    # validate presence of keys
    for key in ("blood_pressure", "oxygen_level", "sugar_level"):
        if key not in trendData:
            return jsonify({"error": f"Missing '{key}' array in payload."}), 400

    # build prompt
    prompt = (
        "Here are a patient’s health trends for three metrics:\n"
        f"{json.dumps(trendData)}\n\n"
        "For each metric—blood_pressure, oxygen_level, sugar_level—"
        "provide a single-sentence recommendation (max 8 words) that either "
        "flags an issue or affirms a healthy range. "
        "Return only a JSON object with keys "
        "'blood_pressure_info', 'oxygen_level_info', and 'sugar_level_info'."
    )

    # call the LLM
    resp = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a concise healthcare assistant."},
            {"role": "user",   "content": prompt}
        ],
        temperature=0.5
    )

    print("LLM Response: ", resp.choices[0].message.content)
    raw = resp.choices[0].message.content.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    json_str = m.group(1) if m else raw
    # parse LLM output
    try:
        recs = json.loads(json_str)
    except Exception:
        # fallback if LLM response isn't valid JSON
        recs = {
            "blood_pressure_info": "Unable to generate recommendation.",
            "oxygen_level_info":   "Unable to generate recommendation.",
            "sugar_level_info":    "Unable to generate recommendation."
        }

    print("Final response: ", recs)
    return recs



# summarize image
@app.route('/summarize-image', methods=['POST'])
def summarize_image():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    f = request.files.get('file')
    if not f:
        return jsonify({"error": "no file uploaded"}), 400

    # 1. Upload to Supabase Storage
    try:
        image_url = upload_image_to_supabase(
            supabase,
            os.getenv("SUPABASE_IMAGE_BUCKET", "image-uploads"),
            f
        )

    except Exception as e:
        print('Image upload error:', e)
        return jsonify({"error": "Failed to upload image"}), 500

    # 2. OCR and Summarization
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        vision_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical assistant. Analyze the uploaded medical report image and generate a short, professional summary of its contents (like imaging results, ECG findings, or written notes)."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Please summarize the contents of this medical report image concisely:"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        summary = vision_response.choices[0].message.content


    except Exception as e:
        print('Image summarization error:', e)
        return jsonify({"error": f"Failed to summarize image: {e}"}), 500

    return jsonify({
        "summary": summary,
        "imageUrl": image_url,
        "reporttype": "Report"
    }), 200


@app.route('/add-report', methods=['POST'])
def add_report():
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        report_content = data.get('report_content')
        report_type = data.get('report_type')
        image_url = data.get('image_url')
        if not patient_id or not report_content or not report_type:
            return jsonify({"error": "Missing fields"}), 400

        # Save to Supabase
        supabase.table('reports').insert({
            'patient_id': patient_id,
            'reportcontent': report_content,
            'reporttype': report_type,
            'reportdate': datetime.utcnow().isoformat(),
            'image_url': image_url
        }).execute()

        return jsonify({"message": "Report added successfully"}), 200

    except Exception as e:
        print('Error in add_report:', e)
        return jsonify({"error": "Internal Server Error"}), 500




# BMI calculator using WOLFRAM ALPHA API
@app.route('/calculate-bmi', methods=['POST'])
def calculate_bmi():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json()
    weight = data.get('weight')  # in kg
    height = data.get('height')  # in cm

    if weight is None or height is None:
        return jsonify({"error": "Missing weight or height"}), 400

    try:
        question = f"What is the BMI of {weight} kilograms and {height} centimeters?"
        answer = query_wolfram(question)
        return jsonify({"bmi_result": answer}), 200
    except Exception as e:
        print('Error in calculate_bmi:', e)
        return jsonify({"error": "Internal Server Error"}), 500

# GET /health-joke
@app.route('/health-joke', methods=['GET'])
def health_joke():
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o",  # You can use gpt-4 or gpt-4o
            messages=[
                {
                    "role": "system",
                    "content": "You are a dad joke generator specializing in health and wellness topics. Always respond with a short, funny, light-hearted joke related to health, medicine, or fitness."
                },
                {
                    "role": "user",
                    "content": "Tell me a random health-related dad joke."
                }
            ],
            temperature=0.8,   # <-- a little more random
            max_tokens=100
        )
        joke = response.choices[0].message.content
        return jsonify({"joke": joke})

    except Exception as e:
        print('Error generating health joke:', e)
        return jsonify({"error": "Failed to generate joke"}), 500

@app.route('/update-visit/<visit_id>', methods=['PATCH'])
def update_visit(visit_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        update_fields = {}


        for field in ['bloodpressure', 'oxygenlevel', 'sugarlevel', 'weight', 'height', 'doctorrecommendation', 'content', 'visitsummaryaudio']:
            if field in data:
                update_fields[field] = data[field]

        if not update_fields:
            return jsonify({"error": "No valid fields to update"}), 400

        supabase.table('visits').update(update_fields).eq('id', visit_id).execute()

        return jsonify({"message": "Visit updated successfully"}), 200

    except Exception as e:
        print('Error updating visit:', e)
        return jsonify({"error": "Internal Server Error"}), 500
@app.route('/add-medication', methods=['POST'])
def add_medication():
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        medicationname = data.get('medicationname')
        dosage = data.get('dosage')
        frequency = data.get('frequency')
        startdate = data.get('startdate')
        enddate = data.get('enddate')
        notes = data.get('notes')

        if not all([patient_id, medicationname, dosage, frequency, startdate, enddate]):
            return jsonify({'error': 'Missing fields'}), 400

        supabase.table('medications').insert({
            'patient_id': patient_id,
            'medicationname': medicationname,
            'dosage': dosage,
            'frequency': frequency,
            'startdate': startdate,
            'enddate': enddate,
            'notes': notes
        }).execute()

        return jsonify({'message': 'Medication added successfully'}), 200

    except Exception as e:
        print('Error in add_medication:', e)
        return jsonify({'error': 'Internal Server Error'}), 500



@app.route('/visit-detail/<visit_id>', methods=['GET'])
def visit_detail(visit_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    # 1) Fetch Visit
    visit_resp = (
        supabase
        .table('visits')
        .select('id, patient_id, doctor_id, visitdate, content, bloodpressure, oxygenlevel, sugarlevel, weight, height, visitsummaryaudio, doctorrecommendation')
        .eq('id', visit_id)
        .single()
        .execute()
    )

    if not visit_resp.data:
        return jsonify({'error': 'Visit not found'}), 404

    visit = visit_resp.data

    # 2) Resolve public audio URL if any
    audio_url = None
    if visit.get('visitsummaryaudio'):
        path = visit['visitsummaryaudio'].lstrip('/')
        audio_url = supabase.storage.from_(os.getenv('SUPABASE_AUDIO_BUCKET', 'audio-uploads')).get_public_url(path).split('?', 1)[0]

    # 3) Fetch all questions for this visit
    q_resp = (
        supabase
        .table('questions')
        .select('id, questiontext, status, questionaudio')
        .eq('visit_id', visit['id'])
        .eq('patient_id', visit['patient_id'])
        .eq('doctor_id', visit['doctor_id'])
        .order('daterecorded', desc=True)
        .execute()
    )
    questions = [
        {
            'id': f"q{q['id']}",
            'transcript': q['questiontext'],
            'status': q['status'],
            'audioUrl': q['questionaudio']
        }
        for q in (q_resp.data or [])
    ]

    # 4) Fetch all medications for this patient
    meds_resp = (
        supabase
        .table('medications')
        .select('medicationid, medicationname, dosage, frequency, startdate, enddate, notes')
        .eq('patient_id', visit['patient_id'])
        .order('startdate', desc=False)
        .execute()
    )
    medications = meds_resp.data or []

    # 5) Split medications: newly prescribed vs ongoing
    visit_date = visit.get('visitdate', '').split('T')[0]
    newly_prescribed = []
    ongoing_medications = []

    for med in medications:
        med_start_date = (med.get('startdate') or '').split('T')[0]
        if med_start_date == visit_date:
            newly_prescribed.append(med)
        else:
            ongoing_medications.append(med)

    # 6) Return final combined JSON
    return jsonify({
        'visit': {
            'visit_id': visit['id'],
            'patient_id': visit['patient_id'],
            'doctor_id': visit['doctor_id'],
            'visit_date': visit['visitdate'],
            'summary': visit.get('content'),
            'blood_pressure': visit.get('bloodpressure'),
            'oxygen_level': visit.get('oxygenlevel'),
            'sugar_level': visit.get('sugarlevel'),
            'weight': visit.get('weight'),
            'height': visit.get('height'),
            'audio_summary_url': audio_url,
            'doctor_recommendation': visit.get('doctorrecommendation')
        },
        'questions': questions,
        'newly_prescribed': newly_prescribed,
        'ongoing_medications': ongoing_medications
    }), 200

def generate_recommendation(trends):
    """
    trends: {
      "blood_pressure": [...],
      "oxygen_level":   [...],
      "sugar_level":    [...]
    }
    Returns a single-sentence string recommendation.
    """
    prompt = (
        "You are a concise clinical assistant. "
        "Here are a patient’s recent health trends:\n\n"
        f"{json.dumps(trends, indent=2)}\n\n"
        "Provide exactly one sentence (max 15 words) summarizing any concerns or notable stability "
        "across these metrics for a doctor’s quick review."
    )

    resp = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a concise healthcare assistant."},
            {"role": "user",   "content": prompt}
        ],
        temperature=0.3
    )
    text = resp.choices[0].message.content.strip()

    # strip markdown fences if present
    m = re.search(r"```(?:\w*\n)?([\s\S]*?)```", text)
    return (m.group(1).strip() if m else text).rstrip(".")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True)



