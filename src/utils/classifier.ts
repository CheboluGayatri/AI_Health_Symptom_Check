import fs from 'fs';
import path from 'path';

export interface Prediction {
  disease: string;
  confidence: number;
}

export interface Recommendation {
  precautions: string[];
  medicines: string[];
  advice: string;
  tips: string;
}

// Medical Knowledge recommendations fallback matching our Python/Flask DB
export const RECOMMENDATIONS: Record<string, Recommendation> = {
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
};

export class SymptomClassifier {
    private datasetPath: string;
    private symptomColumns: string[] = [];
    private centroids: Record<string, number[]> = {};

    constructor() {
        this.datasetPath = path.resolve(process.cwd(), 'dataset.csv');
        this.parseDatasetAndBuildCentroids();
    }

    private parseDatasetAndBuildCentroids() {
        try {
            if (!fs.existsSync(this.datasetPath)) {
                console.warn(`dataset.csv missing at: ${this.datasetPath}. Classifier in offline standby.`);
                return;
            }

            const data = fs.readFileSync(this.datasetPath, 'utf-8');
            const lines = data.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length < 2) return;

            // Parse Header
            const headers = lines[0].split(',');
            this.symptomColumns = headers.slice(0, -1); // Exclude 'prognosis'

            const counts: Record<string, number> = {};
            const sums: Record<string, number[]> = {};

            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',');
                if (parts.length !== headers.length) continue;

                const label = parts[parts.length - 1].trim();
                const features = parts.slice(0, -1).map(Number);

                if (!sums[label]) {
                    sums[label] = new Array(this.symptomColumns.length).fill(0);
                    counts[label] = 0;
                }

                for (let col = 0; col < features.length; col++) {
                    sums[label][col] += features[col];
                }
                counts[label] += 1;
            }

            // Calculate centroids
            for (const label of Object.keys(sums)) {
                this.centroids[label] = sums[label].map(s => s / counts[label]);
            }
            console.log("Classifier compiled dynamically from dataset.csv. Classes loaded:", Object.keys(this.centroids).length);
        } catch (e) {
            console.error("Failed to parse dataset.csv:", e);
        }
    }

    public getSymptomColumns(): string[] {
        if (this.symptomColumns.length === 0) {
            this.parseDatasetAndBuildCentroids();
        }
        return this.symptomColumns;
    }

    public predict(userSymptoms: string[]): Prediction[] {
        if (this.symptomColumns.length === 0) {
            this.parseDatasetAndBuildCentroids();
        }

        const inputVector = new Array(this.symptomColumns.length).fill(0);
        let matched = 0;

        const normalizedUserSymptoms = userSymptoms.map(s => s.toLowerCase().trim().replace(/ /g, '_'));
        for (const s of normalizedUserSymptoms) {
            const idx = this.symptomColumns.indexOf(s);
            if (idx !== -1) {
                inputVector[idx] = 1;
                matched++;
            }
        }

        if (matched === 0) {
            return [];
        }

        const results: { disease: string; score: number }[] = [];

        for (const [disease, centroid] of Object.entries(this.centroids)) {
            let matchedWeighted = 0;
            let totalDiseaseWeight = 0;
            let totalUserWeight = matched;

            for (let col = 0; col < centroid.length; col++) {
                if (centroid[col] > 0.05) {
                    totalDiseaseWeight += centroid[col];
                    if (inputVector[col] > 0) {
                        matchedWeighted += centroid[col];
                    }
                }
            }

            const recall = totalDiseaseWeight > 0 ? (matchedWeighted / totalDiseaseWeight) : 0;
            const precision = totalUserWeight > 0 ? (matchedWeighted / totalUserWeight) : 0;
            
            const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

            if (f1 > 0) {
                results.push({ disease, score: f1 });
            }
        }

        // Sort descending
        results.sort((a, b) => b.score - a.score);

        const top3 = results.slice(0, 3);
        if (top3.length === 0) return [];

        // Return direct confidence scores (as percentages up to 100)
        return top3.map(item => ({
            disease: item.disease,
            confidence: Math.round(item.score * 100 * 10) / 10
        }));
    }
}

export const classifier = new SymptomClassifier();
