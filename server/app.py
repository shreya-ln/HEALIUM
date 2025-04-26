from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True)
