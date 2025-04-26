from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime
import os

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.route('/api/health')
def health():
    return jsonify(status='OK', time=str(request.date if hasattr(request, 'date') else 'now'))

@app.route('/api/patients', methods=['GET'])
def get_patients():
    response = supabase.table('patients').select('*').execute()
    return jsonify(response.data), 200


# ---------- Doctor API endpoints -------------- #
# Fetch the list of patients
@app.route('/list-patients', methods=['GET'])
def list_patients():
    # 1) Get doctorId from query string
    doctor_id = request.args.get('doctorId', type=int)
    if doctor_id is None:
        abort(400, description="Missing required query parameter: doctorId")

    # 2) Fetch all visits for that doctor
    visits_resp = (
        supabase
        .table('visits')
        .select('patientid, visitdate')
        .eq('doctorid', doctor_id)
        .execute()
    )
    visits = visits_resp.data

    # 3) Compute the latest visit date per patient
    last_visits = {}
    for v in visits:
        pid      = v['patientid']
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
@app.route('/patient-profile/<int:patient_id>', methods=['GET'])
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
        .eq('patientid', patient_id)
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
        .eq('patientid', patient_id)
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
        'patientid':             data['patient_id'],
        'doctorid':              data['doctor_id'],
        'content':               data['content'],
        'bloodpressure':         data.get('blood_pressure'),
        'oxygenlevel':           data.get('oxygen_level'),
        'sugarlevel':            data.get('sugar_level'),
        'weight':                data.get('weight'),
        'height':                data.get('height'),
        'visitsummaryaudio':     data.get('visit_summary_audio'),
        'doctorrecommendations': data.get('doctor_recommendations'),
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True)
