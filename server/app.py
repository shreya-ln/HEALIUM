from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # allow React dev server to talk to Flask

@app.route('/api/health')
def health():
    return jsonify(status='OK', time=str(request.date if hasattr(request, 'date') else 'now'))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
