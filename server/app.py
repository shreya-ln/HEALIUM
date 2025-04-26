from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # Load environment variables from .env

app = Flask(__name__)
CORS(app)  # Allow React dev server to talk to Flask

# Connect to Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_API_KEY")
supabase: Client = create_client(url, key)

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

@app.route('/signin', methods=['POST'])
def signin():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    try:
        # Supabase login
        result = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        return jsonify({"message": "Signin success!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/health')
def health():
    return jsonify(status='OK')

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
