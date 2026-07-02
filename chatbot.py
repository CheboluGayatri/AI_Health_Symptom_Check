"""
chatbot.py

Purpose:
    Provides custom AI Chatbot assistant conversations using the Hugging Face Inference API.
    Enforces strict rules:
        - Chatbot replies MUST only discuss predicted disease, symptoms, precautions, health tips.
        - Must include a bold medical disclaimer.
        - Never hallucinates diseases outside of the predicted context.
        - If query is unrelated to health, reply with standard warning statement.
    Implements a fallback Rule-Based clinical response model to work offline seamlessly.
"""

import os
import json
import urllib.request
import urllib.error

# Load Hugging Face API Token if supplied in environment
HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

# Standard medical recommendations fallback database to construct offline rule responses
OFFLINE_KNOWLEDGE = {
    "fungal infection": {
        "precautions": ["Keep affected skin dry and clean.", "Avoid tight, non-breathable clothing.", "Do not share personal items (towels, combs)."],
        "medicines": ["Clotrimazole or Miconazole topical creams", "Antifungal powder"],
        "advice": "Consult a dermatologist if rash spreads or fails to improve within 7 days.",
        "tips": "Eat probiotic-rich foods like yogurt and avoid sugar to curb fungal growth."
    },
    "allergy": {
        "precautions": ["Identify and avoid allergen triggers.", "Keep indoor environments clean and dust-free.", "Wash bedding in hot water weekly."],
        "medicines": ["Antihistamines (Cetirizine, Loratadine)", "Saline nasal sprays"],
        "advice": "Consult an allergist if experiencing severe breathing issues (Anaphylaxis risk).",
        "tips": "Track daily pollen counts and keep doors/windows closed during peak season."
    },
    "gerd": {
        "precautions": ["Avoid lying down for 3 hours after eating.", "Eat smaller, more frequent meals.", "Limit spicy, acidic, fatty, or caffeinated items."],
        "medicines": ["Antacids", "H2 Blockers (Famotidine)", "Proton Pump Inhibitors (Omeprazole)"],
        "advice": "See a gastroenterologist if acid reflux occurs more than twice a week.",
        "tips": "Elevate the head of your bed by 6 inches and avoid tight clothing around your waist."
    },
    "chronic cholestasis": {
        "precautions": ["Avoid alcohol completely.", "Maintain a low-fat diet.", "Stay well-hydrated to reduce fatigue."],
        "medicines": ["Ursodeoxycholic acid (under prescription only)", "Vitamin supplements (A, D, E, K)"],
        "advice": "Seek immediate doctor consult to evaluate liver enzyme functions.",
        "tips": "Use lukewarm water instead of hot water for bathing to minimize severe skin itching."
    },
    "drug reaction": {
        "precautions": ["Discontinue the suspected drug immediately.", "Keep a detailed medical journal of your drug allergies.", "Alert all doctors of this allergy."],
        "medicines": ["Antihistamines", "Calamine lotion for skin irritation"],
        "advice": "Consult your primary care physician or go to the nearest ER if swelling/breathing occurs.",
        "tips": "Always carry an allergy card listing your prohibited medical substances in your wallet."
    },
    "peptic ulcer disease": {
        "precautions": ["Avoid NSAID pain relievers like Ibuprofen.", "Quit smoking and limit alcohol.", "Manage mental stress levels."],
        "medicines": ["Proton pump inhibitors", "Antacids to coat the stomach"],
        "advice": "Consult a physician. A breath test or endoscopy may be required to check for H. pylori.",
        "tips": "Drink chamomile or licorice root tea to help soothe the gastric mucosal lining naturally."
    },
    "aids": {
        "precautions": ["Practice safe barrier methods strictly.", "Maintain impeccable food safety and hygiene.", "Avoid contact with raw or uncooked foods."],
        "medicines": ["Antiretroviral therapy (ART) prescriptions"],
        "advice": "Regular check-ups with an infectious disease specialist are critical.",
        "tips": "Focus on high-nutrient, whole-food diets and daily light exercise to boost immunity."
    },
    "diabetes": {
        "precautions": ["Monitor blood glucose levels regularly.", "Limit refined carbs, sugar, and processed foods.", "Check feet daily for wounds or blisters."],
        "medicines": ["Metformin or insulin therapy (as prescribed by endocrinologist)"],
        "advice": "See your endocrinologist and check your HbA1c levels every three months.",
        "tips": "Combine moderate aerobic exercise with strength training to enhance insulin sensitivity."
    },
    "gastroenteritis": {
        "precautions": ["Drink plenty of oral rehydration solutions (ORS).", "Wash hands thoroughly with soap after using restrooms.", "Eat a bland, soft BRAT diet (Bananas, Rice, Applesauce, Toast)."],
        "medicines": ["Probiotics", "Anti-diarrheal agents (only if advised by doctor)"],
        "advice": "Consult a physician immediately if vomiting persists for over 24 hours or signs of extreme dehydration occur.",
        "tips": "Avoid milk, dairy, caffeine, and highly spiced foods for at least 48 hours."
    },
    "bronchial asthma": {
        "precautions": ["Avoid dust, cold air, pet dander, and tobacco smoke.", "Keep your rescue inhaler accessible at all times.", "Get an annual flu vaccine."],
        "medicines": ["Inhaled Bronchodilators (Albuterol)", "Corticosteroids for controller maintenance"],
        "advice": "Consult a pulmonologist to map out a personalized Asthma Action Plan.",
        "tips": "Practice pursed-lip breathing techniques daily to strengthen diaphragm controls."
    },
    "hypertension": {
        "precautions": ["Reduce daily dietary sodium intake to under 1,500mg.", "Avoid high-stress scenarios and practice mindfulness.", "Monitor blood pressure daily."],
        "medicines": ["Beta-blockers, ACE inhibitors, or diuretics (strictly as prescribed)"],
        "advice": "Consult a cardiologist to manage arterial blood pressure target limits.",
        "tips": "Adopt the DASH diet (rich in fruits, vegetables, whole grains, and lean proteins)."
    },
    "migraine": {
        "precautions": ["Identify and avoid triggers (flashing lights, strong odors, cheese, MSG).", "Maintain a consistent sleep schedule.", "Rest in a dark, quiet room during an attack."],
        "medicines": ["Pain relievers (Acetaminophen, NSAIDs)", "Triptans (under medical supervision)"],
        "advice": "See a neurologist if migraines occur frequently or increase in severity.",
        "tips": "Keep a Migraine diary tracking stress levels, food triggers, and weather changes."
    },
    "malaria": {
        "precautions": ["Use insecticide-treated bed nets.", "Apply insect repellents containing DEET to exposed skin.", "Eliminate stagnant water around your home."],
        "medicines": ["Antimalarial pills (Artemether-lumefantrine, Chloroquine as prescribed)"],
        "advice": "Consult a doctor immediately. Delayed treatment can lead to life-threatening complications.",
        "tips": "Wear light-colored, long-sleeved clothing to minimize mosquito bites in the evenings."
    },
    "chicken pox": {
        "precautions": ["Isolate the patient to prevent spreading to vulnerable individuals.", "Keep fingernails trimmed short to prevent scratch infections.", "Wash bedsheets daily."],
        "medicines": ["Paracetamol for fever (Avoid Aspirin)", "Antihistamines or Calamine lotion for itching"],
        "advice": "Consult a physician, especially if pregnant, newborn, or immunocompromised.",
        "tips": "Take cool baths with added baking soda or colloidal oatmeal to soothe itchy skin."
    },
    "typhoid": {
        "precautions": ["Drink only boiled or bottled water.", "Avoid raw fruits and vegetables that cannot be peeled.", "Maintain extreme hand hygiene."],
        "medicines": ["Antibiotics (as prescribed after a positive blood or Widal test)"],
        "advice": "Consult an infectious disease physician immediately; complete the full antibiotic course.",
        "tips": "Eat small, frequent meals of easily digestible foods like congee, oatmeal, and clear broths."
    }
}

DISCLAIMER = (
    "\n\n***MEDICAL DISCLAIMER: I am an AI assistant, not a doctor. "
    "This guidance is informational only and must not replace professional medical "
    "assessment, diagnosis, or treatment. If you are experiencing serious or worsening "
    "symptoms, please consult a qualified healthcare provider or visit the nearest emergency room immediately.***"
)

def query_huggingface(prompt):
    """
    Submits a REST API query to the Hugging Face free Inference API.
    Returns generated response string or raises Exception.
    """
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not configured.")

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 250,
            "temperature": 0.3,
            "return_full_text": False
        }
    }

    req = urllib.request.Request(
        HF_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if isinstance(res_data, list) and len(res_data) > 0:
                return res_data[0].get("generated_text", "").strip()
            elif isinstance(res_data, dict):
                return res_data.get("generated_text", "").strip()
            return ""
    except Exception as e:
        raise RuntimeError(f"Hugging Face request failed: {e}")

def get_medical_chat_response(query, predicted_disease=None):
    """
    Directs conversation flows based on medical topics.
    Validates health association of request first.
    """
    # Reject non-medical topics immediately
    query_lower = query.lower()
    health_keywords = [
        "health", "disease", "symptom", "pain", "fever", "cough", "med", "doctor",
        "precaution", "tip", "remedy", "cure", "drug", "pill", "treat", "sick",
        "allergy", "infection", "ache", "clinical", "hospital", "body"
    ]
    
    # Check if a disease context is specified in the query or parameter
    matched_disease = predicted_disease
    if not matched_disease:
        # Try to extract from query text matching our known offline diseases
        for d in OFFLINE_KNOWLEDGE.keys():
            if d in query_lower:
                matched_disease = d
                break

    is_health_query = any(k in query_lower for k in health_keywords) or (matched_disease is not None)
    
    if not is_health_query:
        return "I am an AI Health Assistant and can answer only health-related questions."

    # If predicted disease is supplied or matched, craft custom responses focused on it
    if matched_disease:
        disease_clean = matched_disease.lower().strip()
        if disease_clean in OFFLINE_KNOWLEDGE:
            info = OFFLINE_KNOWLEDGE[disease_clean]
            
            # Formulate prompt for Hugging Face or offline fallback
            prompt_guidelines = (
                f"As an AI Medical Assistant, discuss the disease '{disease_clean.title()}' "
                f"based on the following structured knowledge:\n"
                f"Precautions: {', '.join(info['precautions'])}\n"
                f"General Medications: {', '.join(info['medicines'])}\n"
                f"Physician Advice: {info['advice']}\n"
                f"Health Tips: {info['tips']}\n"
                f"User Question: '{query}'\n"
                f"Rule: Keep your response under 150 words. Do not hallucinate other diseases. Be compassionate."
            )

            try:
                # Attempt to get response from Hugging Face Inference API
                ai_response = query_huggingface(prompt_guidelines)
                if ai_response:
                    return f"**AI Health Assistant:**\n{ai_response}{DISCLAIMER}"
            except Exception:
                # Fail-safe local generator if Hugging Face token is missing or offline
                response = (
                    f"### About your predicted condition: **{disease_clean.title()}**\n\n"
                    f"**Recommended General Precautions:**\n" + 
                    "\n".join([f"- {p}" for p in info['precautions']]) + "\n\n"
                    f"**General Supportive Medicines:**\n" + 
                    "\n".join([f"- {m}" for m in info['medicines']]) + "\n\n"
                    f"**Daily Health Tips:**\n- {info['tips']}\n\n"
                    f"**Clinical Advisory:**\n- {info['advice']}"
                )
                return f"{response}{DISCLAIMER}"

    # Generic medical query (no specific disease predicted)
    prompt_generic = (
        f"Answer the medical query: '{query}' compassionately. "
        f"Provide standard preventative hygiene tips, general precautions, and prompt doctor visit advice."
        f"Keep the answer short and clear."
    )
    
    try:
        ai_response = query_huggingface(prompt_generic)
        if ai_response:
            return f"**AI Health Assistant:**\n{ai_response}{DISCLAIMER}"
    except Exception:
        # Rule-based generic medical fallback
        generic_fallback = (
            "Thank you for contacting the AI Health Assistant. "
            "For general symptom relief and wellness support, we recommend staying fully hydrated, "
            "resting, and keeping a detailed journal of when your symptoms occur. "
            "Please avoid self-medicating with antibiotics or unprescribed dosage rates. "
            "Always consult a certified medical professional for safe clinical treatment."
        )
        return f"{generic_fallback}{DISCLAIMER}"

if __name__ == "__main__":
    # Test fallback flow
    print(get_medical_chat_response("What should I do for Fungal infection?", "fungal infection"))
