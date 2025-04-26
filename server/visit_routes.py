from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

visit_routes = Blueprint('visit_routes', __name__)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@visit_routes.route('/future-visits', methods=['GET'])
def get_future_visits():
    # Step 1: get current logged-in doctor ID
    current_doctor_id = request.headers.get('Authorization-Id')  # adjust this to match how you do it for patients!

    if not current_doctor_id:
        return jsonify({'error': 'Unauthorized: Doctor ID missing'}), 401

    # Step 2: get today's date
    today = datetime.utcnow().isoformat()

    # Step 3: find only this doctor's future visits
    resp = (
        supabase
        .table('visits')
        .select('id, patient_id, doctor_id, visitdate')
        .gt('visitdate', today)
        .eq('doctor_id', current_doctor_id)
        .order('visitdate')
        .execute()
    )

    future_visits = resp.data or []

    return jsonify(future_visits), 200

@visit_routes.route('/today-visits', methods=['GET'])
def get_today_visits():
    current_doctor_id = request.headers.get('Authorization-Id')

    if not current_doctor_id:
        return jsonify({'error': 'Unauthorized: Doctor ID missing'}), 401


    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()

    # todays aap
    resp = (
        supabase
        .table('visits')
        .select('id, patient_id, doctor_id, visitdate')
        .gte('visitdate', start_of_day)
        .lte('visitdate', end_of_day)
        .eq('doctor_id', current_doctor_id)
        .order('visitdate')
        .execute()
    )

    today_visits = resp.data or []

    return jsonify(today_visits), 200



@visit_routes.route('/update-visit/<visit_id>', methods=['PATCH'])
def update_visit(visit_id):
    try:
        data = request.get_json()

        supabase.table('visits').update(data).eq('id', visit_id).execute()

        return jsonify({"message": "Visit updated successfully"}), 200
    except Exception as e:
        print('Error in update_visit:', e)
        return jsonify({'error': 'Internal Server Error'}), 500