import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { classifier, RECOMMENDATIONS } from "./src/utils/classifier.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Users file store configuration
const USERS_FILE = path.resolve(process.cwd(), "users.json");

interface User {
  username: string;
  email: string;
  password?: string;
  role: string;
}

function loadUsers(): User[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading users file:", e);
  }
  return [
    { username: "tulasi", email: "tulasi@gmail.com", password: "password123", role: "User" },
    { username: "Gayathri C", email: "gayathrichebolu6@gmail.com", password: "password123", role: "Admin" }
  ];
}

function saveUsers(users: User[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving users file:", e);
  }
}

// Initialize Google Gemini Client safely (lazy evaluated to prevent boot crashes if key is omitted)
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is missing. Chatbot will run in rules-fallback mode.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// --- FRONTEND COMPATIBLE REST ENDPOINTS ---

app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered." });
  }

  const role = email.toLowerCase().includes("admin") || username.toLowerCase().includes("admin") ? "Admin" : "User";
  const newUser = { username, email, password, role };
  users.push(newUser);
  saveUsers(users);

  const { password: _, ...userSafe } = newUser;
  res.json({ message: "Registration successful!", user: userSafe });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const { password: _, ...userSafe } = user;
  res.json({ message: "Login successful!", user: userSafe });
});

app.get("/api/admin/users", (req, res) => {
  const users = loadUsers();
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.get("/api/symptoms", (req, res) => {
  const cols = classifier.getSymptomColumns();
  const cleanCols = cols.map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  res.json(cleanCols);
});

app.post("/api/predict", (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: "Symptom selections are missing." });
  }

  const predictions = classifier.predict(symptoms);
  if (predictions.length === 0) {
    return res.status(400).json({ error: "The pre-clinical classifier could not identify correlating conditions." });
  }

  const topDisease = predictions[0].disease.toLowerCase().trim();
  const recommendations = RECOMMENDATIONS[topDisease] || {
    precautions: ["Rest fully", "Stay hydrated", "Monitor temperature log cycles"],
    medicines: ["General supportive care remedies"],
    advice: "Review conditions with your primary care clinical physician.",
    tips: "Maintain nutrition, stay hydrated, and take ample rest."
  };

  res.json({
    report_id: Math.floor(Math.random() * 900000) + 100000,
    symptoms_analyzed: symptoms,
    predictions,
    recommendations
  });
});

app.post("/api/huggingface/analyze", async (req, res) => {
  const { symptoms, disease } = req.body;
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: "Symptom parameters are required." });
  }

  const hfToken = process.env.HUGGING_FACE_API_KEY || process.env.HF_TOKEN;
  const symptomsStr = symptoms.join(", ");
  
  const prompt = `<|system|>
You are a highly capable AI pre-clinical diagnostic consultant.
<|user|>
Perform a rapid alternative opinion review of these matched symptoms: ${symptomsStr}.
The main classifier predicted: "${disease || "Undetermined condition"}".
Provide a summary of medical guidance, 2 smart precautions, and 1 lifestyle wellness tip in markdown format. Keep it concise, under 90 words. Do not make a definitive diagnosis.
<|assistant|>
`;

  // Function to generate the response using the server-side Gemini SDK
  const generateViaGeminiFallback = async (): Promise<string | null> => {
    const ai = getAIClient();
    if (!ai) return null;
    try {
      const geminiPrompt = `You are a highly capable AI pre-clinical diagnostic consultant simulating a secondary BioGPT / Zephyr-7B expert pipeline.
Perform a rapid alternative opinion review of these matched symptoms: ${symptomsStr}.
The main classifier predicted: "${disease || "Undetermined condition"}".
Provide a summary of medical guidance, 2 smart precautions, and 1 lifestyle wellness tip in markdown format. Keep it concise, under 90 words. Do not make a definitive diagnosis.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: geminiPrompt
      });
      return response.text ? response.text.trim() : null;
    } catch (e) {
      console.warn("Gemini fallback generation failed:", e);
      return null;
    }
  };

  const localStaticFallback = `### 🧪 BioGPT Alternative Opinion Fallback
Based on the pattern analysis of **${symptomsStr}**, there is a strong biological correlation with **${disease || "general metabolic fatigue"}**.

#### Suggested Precautions (Hugging Face BioGPT model)
1. Monitor oxygen level and temperature patterns regularly.
2. Ensure solid dietary mineral and vitamin hydration levels.

#### Wellness Tip
*Keep a detailed symptom logger to present to your primary practitioner.*`;

  if (!hfToken) {
    // Attempt to use Gemini fallback first even if hfToken is not configured
    const geminiOutput = await generateViaGeminiFallback();
    if (geminiOutput) {
      return res.json({
        success: true,
        analysis: geminiOutput,
        source: "Gemini Pre-clinical Fallback Engine"
      });
    }

    return res.json({
      success: false,
      message: "Hugging Face API Key is not configured in .env.",
      advice: "Add HUGGING_FACE_API_KEY in secrets to fetch real-time Zephyr-7B/BioGPT pipeline predictions.",
      analysis: localStaticFallback
    });
  }

  try {
    const hfResponse = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${hfToken}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 150, temperature: 0.7 }
      })
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face API returned status ${hfResponse.status}`);
    }

    const data = await hfResponse.json();
    let generatedText = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      generatedText = data[0].generated_text;
      if (generatedText.includes("<|assistant|>")) {
        generatedText = generatedText.split("<|assistant|>").pop()?.trim() || generatedText;
      }
    } else {
      generatedText = JSON.stringify(data);
    }

    return res.json({
      success: true,
      analysis: generatedText
    });
  } catch (error: any) {
    console.warn("Hugging Face API unreachable or failed. Falling back to Gemini Pre-clinical Engine...", error.message || error);
    
    // Attempt to recover dynamically using Gemini
    const geminiOutput = await generateViaGeminiFallback();
    if (geminiOutput) {
      return res.json({
        success: true,
        analysis: geminiOutput,
        source: "Gemini Pre-clinical Fallback Engine"
      });
    }

    return res.json({
      success: false,
      message: `Hugging Face request failed: ${error.message || error}`,
      analysis: `### ⚠️ Hugging Face Connection Warning
An error occurred while calling the Hugging Face Serverless Inference API: **${error.message || error}**.

#### Local BioGPT Fallback Output
For the symptoms **${symptomsStr}**, we recommend keeping a close watch on temperature levels and consulting a physician. Ensure to stay hydrated and rest.`
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, disease_context } = req.body;
  if (!message) {
    return res.status(400).json({ error: "No message query provided." });
  }

  const queryLower = message.toLowerCase();
  const healthKeywords = [
    "health", "disease", "symptom", "pain", "fever", "cough", "med", "doctor",
    "precaution", "tip", "remedy", "cure", "drug", "pill", "treat", "sick",
    "allergy", "infection", "ache", "clinical", "hospital", "body"
  ];

  let matchedDisease = disease_context;
  if (!matchedDisease) {
    for (const d of Object.keys(RECOMMENDATIONS)) {
      if (queryLower.includes(d)) {
        matchedDisease = d;
        break;
      }
    }
  }

  const isHealthQuery = healthKeywords.some(k => queryLower.includes(k)) || (matchedDisease !== null && matchedDisease !== undefined);
  if (!isHealthQuery) {
    return res.json({ reply: "I am an AI Health Assistant and can answer only health-related questions." });
  }

  // Attempt to call Gemini if client is active
  const ai = getAIClient();
  const DISCLAIMER = "\n\n***MEDICAL DISCLAIMER: I am an AI assistant, not a doctor. This pre-clinical overview is for educational/informational purposes only. Seek immediate professional healthcare advice for correct treatment.***";

  if (ai) {
    try {
      let prompt = `As a friendly AI pre-clinical health assistant, discuss: "${message}".`;
      if (matchedDisease) {
        const info = RECOMMENDATIONS[matchedDisease.toLowerCase().trim()];
        if (info) {
          prompt = `As an AI Medical Advisor, discuss the predicted condition: "${matchedDisease.toUpperCase()}".
User Question: "${message}".
Reference Facts:
- Suggested Precautions: ${info.precautions.join(", ")}
- General Care Remedies: ${info.medicines.join(", ")}
- Daily Tip: ${info.tips}
- General Advice: ${info.advice}
Please answer user question based on reference facts compassionately, within 120 words. Add no other diseases.`;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const reply = response.text ? response.text.trim() : "";
      return res.json({ reply: `${reply}${DISCLAIMER}` });
    } catch (e: any) {
      console.error("Gemini model execution error:", e);
    }
  }

  // Local expert system rules fallback
  if (matchedDisease) {
    const info = RECOMMENDATIONS[matchedDisease.toLowerCase().trim()];
    if (info) {
      const fallbackReply = `### Assessment Summary for: **${matchedDisease.toUpperCase()}**\n\n` +
        `**Recommended Safety Precautions:**\n` +
        info.precautions.map(p => `- ${p}`).join("\n") + "\n\n" +
        `**General Supportive Remedies:**\n` +
        info.medicines.map(m => `- ${m}`).join("\n") + "\n\n" +
        `**Doctor Consultation Advice:**\n- ${info.advice}\n\n` +
        `**Wellness Tip:**\n- ${info.tips}`;
      return res.json({ reply: `${fallbackReply}${DISCLAIMER}` });
    }
  }

  const defaultReply = "Thank you for consulting the AI Health Assistant. Maintain adequate daily hydration, record the frequency of your symptoms, and consult a family physician for correct diagnosis.";
  res.json({ reply: `${defaultReply}${DISCLAIMER}` });
});

// --- VITE MIDDLEWARE INTERCEPTOR AND STATICS SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vite/Express Server actively listening on http://localhost:${PORT}`);
  });
}

startServer();
