# AI Health Symptom Checker using Machine Learning

A complete, production-ready **Final Year Academic Project** implementing a pre-clinical assessment tool utilizing custom supervised machine learning classifiers to map symptom lists onto predicted medical conditions in real-time.

---

## 🚀 Key Features

- **Random Forest ML Classification**: Dynamic prediction calculation featuring Top-3 differential matches with specific probability allocation percentages.
- **Zero-Hardcoding Pipeline**: Automatically parses training parameters dynamically from the source dataset (`dataset.csv`).
- **Hands-Free Voice Dictation**: Real-time microphone audio processing in-browser using the Web Speech API to match vocal phrases against system checkboxes instantly.
- **Medical AI Chatbot**: Conversational agent powered by Hugging Face free Inference API to answer health concerns, precaution guidelines, and medication suggestions.
- **Clinical Report Generator**: Compiles and serves professional multi-page PDF diagnostics reports using ReportLab, embedding beautiful custom-rendered Matplotlib probability charts.
- **SQLite Database Persistence**: Full security login systems powered by Flask-Login and password hashing schemas.
- **Aesthetic Dual-Theme Layout**: Clean emerald-teal clinical visual themes with full Dark Mode support and responsive layouts.

---

## 📂 Project Directory Structure

```text
AI_Health_Symptom_Checker/
├── app.py                      # Flask Server Core & REST Endpoints
├── symptom_checker.py          # Scikit-Learn RandomForest Model and Preprocessor
├── report_generator.py         # ReportLab Clinical PDF Generator
├── visualizations.py           # Matplotlib Chart Renderer Engine
├── database.py                 # SQLite Table Initializations and Queries
├── auth.py                     # Flask-Login & Cryptographic Password Hashing
├── chatbot.py                  # Hugging Face AI Conversational Agent Client
├── voice_input.py              # Subprocess Voice recognition stub
├── dataset.csv                 # Source 15-Disease Training Dataset
├── requirements.txt            # Python Package Dependencies List
├── README.md                   # Complete Setup Documentation
├── instance/
│   └── users.db                # Auto-generated SQLite database
├── reports/
│   └── report_*.pdf            # Pre-compiled PDF diagnostic assessments
├── static/
│   ├── css/
│   │   └── style.css           # Global custom layout stylings
│   ├── js/
│   │   ├── script.js           # AJAX form validations and UI controls
│   │   ├── voice.js            # Web Speech Recognition controller
│   │   └── theme.js            # LocalStorage light/dark theme toggle
│   └── charts/
│       ├── probability_pie.png # Matplotlib Pie chart asset
│       └── confidence_bar.png # Matplotlib Bar chart asset
└── templates/
    ├── login.html              # Dark-mode compatible authentication
    ├── register.html           # New user profile registration
    ├── dashboard.html          # Medical Diagnostic Center Workspace
    ├── report.html             # Detailed clinical diagnostics card
    └── chatbot.html            # AI Conversational Chatroom interface
```

---

## 🔧 Installation & Local Setup Instructions

Follow these step-by-step instructions to run the Python full-stack Flask/ML application locally on your computer:

### Prerequisite Checklist
- Install Python 3.10 or higher.
- Verify pip is installed (`python -m pip --version`).

### Step 1: Clone or Unzip Project Folder
Unpack this directory into your preferred local workspace:
```bash
cd AI_Health_Symptom_Checker
```

### Step 2: Establish Virtual Environment (Recommended)
Create a clean python environment to avoid package dependency conflicts:
```bash
python -m venv venv
```
Activate on macOS/Linux:
```bash
source venv/bin/activate
```
Activate on Windows Command Prompt:
```bash
venv\Scripts\activate
```

### Step 3: Install Required Packages
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables (Optional)
To activate the Hugging Face AI Chatbot assistant, configure your free API token:
```bash
# Linux/macOS
export HF_API_TOKEN="your_huggingface_inference_api_token"

# Windows Command Prompt
set HF_API_TOKEN=your_huggingface_inference_api_token
```
*Note: If no HF_API_TOKEN is supplied, the chatbot automatically falls back to a highly reliable, custom rule-based expert system, operating entirely offline!*

### Step 5: Run App Server
Initiate model training and boot up the server:
```bash
python app.py
```
Open your browser and navigate to:
**`http://localhost:5000`**

---

## 🧠 Machine Learning Engine Summary

Our supervised model architecture utilizes a **Random Forest Classifier** configured with 100 decision trees to ensure high accuracy and mitigate overfitting risks on training symptom feature matrices.
1. **Feature Parsing**: Loads columns from `dataset.csv` dynamically, generating a binary 24-symptom feature vector for inputs.
2. **Label Encoding**: Uses Scikit-Learn `LabelEncoder` to translate target disease labels dynamically.
3. **Probability Modeling**: Leverages `predict_proba` matrix metrics to extract confidence intervals, returning the Top-3 diagnostic differentials.

---

## 📈 Database Schema Mapping

Stored securely in SQLite (`instance/users.db`):
- `users`: Standard registration profiles including auto-increment identifiers, unique email mappings, and cryptographic password hashing salts.
- `diagnostic_reports`: Tracks chronological assessment history records, linking patients, checked symptoms, predictions, confidence rates, and recommendation logs.

---

## 🛡️ Medical Disclaimer
This software represents a pre-clinical computational study project. It does not replace formal laboratory diagnostics, and is not suitable for severe cardiac, cerebral, or pulmonary emergent states. Consult qualified hospital practitioners for standard medical advice.
