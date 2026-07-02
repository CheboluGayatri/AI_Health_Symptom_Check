# -*- coding: utf-8 -*-
"""
app.py

Purpose:
    Core Flask full-stack application.
    Integrates user authentication, ML symptom predictions, visual charts, 
    clinical ReportLab PDFs, and Hugging Face medical chatbot helper API.
    Utilizes SQLite for profile and report storage.
"""

import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import database
import auth
from symptom_checker import classifier
import visualizations
import report_generator
import chatbot

# Initialize SQLite tables on boot
database.init_db()

# Ensure standard dataset/model directories are initialized
classifier.load_model()

# Create Flask application instance
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "clinical-symptom-checker-key-1948")

# Configure Login Manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def user_loader_callback(user_id):
    """
    Session loader mapping database profiles onto Active user credentials.
    """
    return auth.load_user(user_id)

# --- WEB AUTH ROUTES ---

@app.route('/')
def home():
    """
    Redirects root requests directly to the patient dashboard.
    """
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles secure patient logins.
    """
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()

        if not email or not password:
            flash("All fields are required.", "danger")
            return render_template('login.html')

        user = auth.User.get_by_email(email)
        if user and user.verify_password(password):
            login_user(user, remember=True)
            flash("Logged in successfully! Welcome back.", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("Invalid email or password.", "danger")

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """
    Handles new user signups.
    """
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not email or not password:
            flash("All fields are required.", "danger")
            return render_template('register.html')

        # Run registration
        success = auth.User.register(username, email, password)
        if success:
            flash("Account registered successfully! Please log in.", "success")
            return redirect(url_for('login'))
        else:
            flash("Username or Email already registered.", "danger")

    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    """
    Flushes cookies and closes active sessions.
    """
    logout_user()
    flash("Successfully logged out.", "info")
    return redirect(url_for('login'))

# --- WEB INTERFACE LAYOUT ROUTES ---

@app.route('/dashboard')
@login_required
def dashboard():
    """
    Loads main workspace diagnostics card panel.
    """
    all_symptoms = classifier.get_all_symptoms()
    user_history = database.get_user_diagnostic_history(current_user.id)
    return render_template(
        'dashboard.html', 
        symptoms=all_symptoms, 
        history=user_history,
        user=current_user
    )

@app.route('/chatbot')
@login_required
def chatbot_page():
    """
    Loads medical conversational chatbot interface.
    """
    return render_template('chatbot.html', user=current_user)

@app.route('/report/<int:report_id>')
@login_required
def report_view(report_id):
    """
    Fetches detailed clinical overview of a past log record.
    """
    conn = database.get_db_connection()
    report = conn.execute(
        "SELECT * FROM diagnostic_reports WHERE id = ? AND user_id = ?",
        (report_id, current_user.id)
    ).fetchone()
    conn.close()

    if not report:
        flash("Record not found.", "danger")
        return redirect(url_for('dashboard'))

    return render_template('report.html', report=report, user=current_user)

# --- BACKEND REST API ENDPOINTS ---

@app.route('/api/symptoms', methods=['GET'])
def api_symptoms():
    """
    Returns lists of all indexable symptoms for autocomplete support.
    """
    return jsonify(classifier.get_all_symptoms())

@app.route('/api/predict', methods=['POST'])
@login_required
def api_predict():
    """
    Receives list of symptoms, triggers ML prediction, renders charts,
    saves history to database, and triggers clinical PDF reports compilation.
    """
    data = request.get_json() or {}
    selected_symptoms = data.get('symptoms', [])

    if not selected_symptoms:
        return jsonify({"error": "No symptoms selected."}), 400

    # Run predictions using pre-loaded Random Forest Classifier
    raw_result = classifier.predict(selected_symptoms)
    if "error" in raw_result:
        return jsonify(raw_result), 400

    predictions = raw_result['predictions']
    if not predictions:
        return jsonify({"error": "The model could not identify any correlating conditions."}), 400

    top_disease = predictions[0]['disease']
    top_confidence = predictions[0]['confidence']

    # Get medical suggestions dynamically based on disease prognosis
    clean_disease = top_disease.lower().strip()
    recommendations = chatbot.OFFLINE_KNOWLEDGE.get(
        clean_disease, 
        {
            "precautions": ["Rest fully", "Stay hydrated", "Avoid heavy stress or fatigue"],
            "medicines": ["General symptom support relievers"],
            "advice": "Consult a local healthcare physician to diagnose the condition properly.",
            "tips": "Eat a healthy balanced diet, sleep 8 hours, and monitor temperature."
        }
    )

    # 1. Regenerate Matplotlib charts in static directory
    visualizations.generate_prediction_charts(predictions)

    # 2. Save assessment log to database
    symptoms_str = ", ".join(selected_symptoms)
    recs_json_str = json_str = chatbot.json.dumps(recommendations)
    report_id = database.save_diagnostic_report(
        current_user.id,
        symptoms_str,
        top_disease,
        top_confidence,
        recs_json_str
    )

    # 3. Pre-generate physical PDF on the server
    report_generator.generate_pdf_report(
        current_user.username,
        selected_symptoms,
        predictions,
        recommendations,
        output_path=f'reports/report_{report_id}.pdf'
    )

    return jsonify({
        "report_id": report_id,
        "symptoms_analyzed": selected_symptoms,
        "predictions": predictions,
        "recommendations": recommendations
    })

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    """
    Chat bot routing bridging conversational user queries to Hugging Face models.
    """
    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    disease_context = data.get('disease_context', None)

    if not user_message:
        return jsonify({"error": "No query provided."}), 400

    bot_reply = chatbot.get_medical_chat_response(user_message, disease_context)
    return jsonify({"reply": bot_reply})

@app.route('/api/download_report/<int:report_id>', methods=['GET'])
@login_required
def download_report(report_id):
    """
    Serves physical compiled ReportLab diagnostic reports for download.
    """
    report_file_path = f'reports/report_{report_id}.pdf'
    
    # If file was not compiled yet, attempt to compile on-the-fly
    if not os.path.exists(report_file_path):
        # Query report metadata
        conn = database.get_db_connection()
        row = conn.execute(
            "SELECT * FROM diagnostic_reports WHERE id = ? AND user_id = ?",
            (report_id, current_user.id)
        ).fetchone()
        conn.close()

        if not row:
            return "Report record not found.", 404

        # Read JSON parameters
        try:
            recs = chatbot.json.loads(row['recommendations'])
        except Exception:
            recs = {
                "precautions": ["Rest fully", "Stay hydrated"],
                "medicines": ["Symptom support care"],
                "advice": "Consult your family physician.",
                "tips": "Maintain healthy sleep and nutrition."
            }

        symptoms_list = [s.strip() for s in row['symptoms'].split(',')]
        predictions_mock = [{"disease": row['predicted_disease'], "confidence": row['confidence']}]

        report_generator.generate_pdf_report(
            current_user.username,
            symptoms_list,
            predictions_mock,
            recs,
            output_path=report_file_path
        )

    return send_file(
        report_file_path, 
        mimetype='application/pdf', 
        as_attachment=True, 
        download_name=f"AI_Health_Report_{report_id}.pdf"
    )

if __name__ == "__main__":
    # Start server locally
    app.run(host="0.0.0.0", port=3000, debug=True)
