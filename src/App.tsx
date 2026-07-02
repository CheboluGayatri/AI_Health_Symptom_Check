import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Search, 
  Mic, 
  MicOff, 
  Heart, 
  Download, 
  History, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Stethoscope, 
  ShieldCheck, 
  Bot, 
  User, 
  Send, 
  Sun, 
  Moon, 
  CheckCircle, 
  AlertCircle,
  X,
  RefreshCw,
  LogOut,
  Database,
  Home,
  LayoutDashboard,
  Lock,
  Mail,
  Paperclip,
  Plus,
  Zap,
  TrendingUp,
  Archive,
  Trash2,
  ArchiveRestore,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { jsPDF } from 'jspdf';

// --- TYPES ---
interface Prediction {
  disease: string;
  confidence: number;
}

interface Recommendations {
  precautions: string[];
  medicines: string[];
  advice: string;
  tips: string;
}

interface DiagnosisResult {
  report_id: number;
  symptoms_analyzed: string[];
  predictions: Prediction[];
  recommendations: Recommendations;
  created_at?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface SavedChat {
  id: string;
  title: string;
  messages: Message[];
  isArchived: boolean;
  createdAt: string;
}

interface LoggedInUser {
  username: string;
  email: string;
  role: string;
}

export default function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- MAIN APPLICATION STATE ---
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInputText, setCustomInputText] = useState('');
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  
  // Tab/Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'assistant' | 'dashboard' | 'admin'>('home');
  const [profileOpen, setProfileOpen] = useState(false);

  // Diagnosis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(() => {
    const saved = localStorage.getItem('last_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState<DiagnosisResult[]>(() => {
    const saved = localStorage.getItem('diagnostics_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Admin Panel Users list
  const [registeredUsers, setRegisteredUsers] = useState<LoggedInUser[]>([]);

  // Hugging Face Integration State
  const [hfAnalysis, setHfAnalysis] = useState<string>('');
  const [hfLoading, setHfLoading] = useState<boolean>(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'dark';
  });
  
  // Saved Chats / History State
  const [savedChats, setSavedChats] = useState<SavedChat[]>(() => {
    const saved = localStorage.getItem('saved_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    return localStorage.getItem('current_chat_id');
  });

  const [historyFilter, setHistoryFilter] = useState<'all' | 'archived'>('all');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [diagSearchQuery, setDiagSearchQuery] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    const savedId = localStorage.getItem('current_chat_id');
    const savedChatsRaw = localStorage.getItem('saved_chats');
    if (savedId && savedChatsRaw) {
      const chats: SavedChat[] = JSON.parse(savedChatsRaw);
      const activeChat = chats.find(c => c.id === savedId);
      if (activeChat) {
        return activeChat.messages;
      }
    }
    return [
      {
        id: '1',
        sender: 'bot',
        text: "Hello! I am your AI Clinical Assistant. You can describe your symptoms, ask about diagnostic tests, precaution guidelines, supportive medications, or home remedies here.",
        timestamp: new Date()
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'danger' | 'info' }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- TOAST NOTIFICATION HANDLER ---
  const triggerToast = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- INITIALIZE SYMPTOMS & SPEECH RECOGNITION ---
  useEffect(() => {
    fetch('/api/symptoms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSymptoms(data);
        }
      })
      .catch(() => {
        setSymptoms([
          "Itching", "Skin Rash", "Continuous Sneezing", "Chills", "Joint Pain", 
          "Stomach Pain", "Acidity", "Vomiting", "Fatigue", "Weight Loss", 
          "Cough", "High Fever", "Breathlessness", "Headache", "Yellowish Skin", 
          "Nausea", "Loss Of Appetite", "Abdominal Pain", "Diarrhoea", "Chest Pain", 
          "Dizziness", "Loss Of Balance", "Stiff Neck", "Muscle Pain"
        ]);
      });

    applyTheme(theme);

    // Setup Web Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening carefully... Speak symptoms clearly.');
      };

      rec.onerror = () => {
        setIsListening(false);
        setVoiceStatus('Speech recognition failed. Try again.');
        setTimeout(() => setVoiceStatus(''), 3000);
      };

      rec.onend = () => {
        setIsListening(false);
        setVoiceStatus('');
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        let addedCount = 0;

        // Populate search input or active chat/text input
        if (activeTab === 'home') {
          setCustomInputText(prev => prev ? `${prev}, ${transcript}` : transcript);
          triggerToast(`Recognized vocal text: "${transcript}"`, 'success');
        } else if (activeTab === 'assistant') {
          setChatInput(prev => prev ? `${prev} ${transcript}` : transcript);
          triggerToast(`Recognized vocal text: "${transcript}"`, 'success');
        } else {
          // Dashboard checklist fuzzy match
          symptoms.forEach(s => {
            const sLower = s.toLowerCase();
            if (transcript.includes(sLower) && !selectedSymptoms.includes(s)) {
              setSelectedSymptoms(prev => [...prev, s]);
              addedCount++;
            }
          });
          if (addedCount > 0) {
            triggerToast(`Checked ${addedCount} symptoms from voice input!`, 'success');
          } else {
            triggerToast(`Spoken text: "${transcript}". No direct checkbox match.`, 'info');
          }
        }
      };

      recognitionRef.current = rec;
    }
  }, [symptoms, selectedSymptoms, activeTab, theme]);

  // Sync registered users for Admin panel
  useEffect(() => {
    if (currentUser && currentUser.role === 'Admin') {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRegisteredUsers(data);
          }
        })
        .catch(err => console.error("Admin: failed to fetch users list", err));
    }
  }, [currentUser]);

  // Save state helpers
  useEffect(() => {
    if (result) {
      localStorage.setItem('last_result', JSON.stringify(result));
    }
  }, [result]);

  useEffect(() => {
    localStorage.setItem('diagnostics_history', JSON.stringify(history));
  }, [history]);

  // Persist Saved Chats List
  useEffect(() => {
    localStorage.setItem('saved_chats', JSON.stringify(savedChats));
  }, [savedChats]);

  // Persist Current Chat ID
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('current_chat_id', currentChatId);
    } else {
      localStorage.removeItem('current_chat_id');
    }
  }, [currentChatId]);

  // Synchronously save or update chat session in history
  const saveOrUpdateChat = (messages: Message[], activeChatId: string | null): string | null => {
    const hasUserMsg = messages.some(m => m.sender === 'user');
    if (!hasUserMsg) return activeChatId;

    if (activeChatId) {
      setSavedChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return { ...c, messages };
        }
        return c;
      }));
      return activeChatId;
    } else {
      const firstUserMsg = messages.find(m => m.sender === 'user')?.text || 'New Conversation';
      const title = firstUserMsg.length > 25 ? firstUserMsg.substring(0, 25) + '...' : firstUserMsg;
      const newId = Math.random().toString();
      const newChat: SavedChat = {
        id: newId,
        title,
        messages,
        isArchived: false,
        createdAt: new Date().toLocaleString()
      };
      setSavedChats(prev => [newChat, ...prev]);
      setCurrentChatId(newId);
      return newId;
    }
  };

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const applyTheme = (t: 'light' | 'dark') => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  // --- CORE LOGIN / REGISTER HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      triggerToast("Please fill in all credentials.", "danger");
      return;
    }
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      setAuthLoading(false);

      if (res.status !== 200 || data.error) {
        triggerToast(data.error || "Authentication failed.", "danger");
        return;
      }

      setCurrentUser(data.user);
      localStorage.setItem('user_profile', JSON.stringify(data.user));
      triggerToast(`Welcome back, ${data.user.username}!`, "success");
      setActiveTab('home');
    } catch {
      setAuthLoading(false);
      triggerToast("Server connection error during login.", "danger");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
      triggerToast("Please fill in all registration fields.", "danger");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      triggerToast("Passwords do not match.", "danger");
      return;
    }
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword
        })
      });
      const data = await res.json();
      setAuthLoading(false);

      if (res.status !== 200 || data.error) {
        triggerToast(data.error || "Registration failed.", "danger");
        return;
      }

      triggerToast("Account created successfully! Please log in.", "success");
      setAuthView('login');
      setLoginEmail(registerEmail);
      setLoginPassword('');
    } catch {
      setAuthLoading(false);
      triggerToast("Server connection error during registration.", "danger");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user_profile');
    localStorage.removeItem('last_result');
    setResult(null);
    triggerToast("Logged out successfully.", "info");
  };

  // --- SELECTION & QUICK ACTIONS ---
  const handleCheckboxToggle = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleClearSelections = () => {
    setSelectedSymptoms([]);
    triggerToast("Selections cleared.", "info");
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setChatMessages([
      {
        id: Math.random().toString(),
        sender: 'bot',
        text: "Clean chat room initiated! Feel free to describe your current symptoms or concerns.",
        timestamp: new Date()
      }
    ]);
    setCustomInputText('');
    setChatInput('');
    setSelectedSymptoms([]);
    triggerToast("Fresh session initiated.", "success");
    setActiveTab('assistant');
  };

  const loadSavedChat = (chat: SavedChat) => {
    setChatMessages(chat.messages);
    setCurrentChatId(chat.id);
    setActiveTab('assistant');
    triggerToast(`Loaded "${chat.title}"`, 'success');
  };

  const deleteChat = (id: string) => {
    setSavedChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      setChatMessages([
        {
          id: Math.random().toString(),
          sender: 'bot',
          text: "Conversation cleared. Feel free to describe your current symptoms or concerns.",
          timestamp: new Date()
        }
      ]);
      setCurrentChatId(null);
    }
    triggerToast("Conversation deleted.", "success");
  };

  const toggleArchiveChat = (id: string) => {
    setSavedChats(prev => prev.map(c => {
      if (c.id === id) {
        const nextArchived = !c.isArchived;
        triggerToast(nextArchived ? "Conversation archived." : "Conversation restored.", "success");
        return { ...c, isArchived: nextArchived };
      }
      return c;
    }));
  };

  const clearAllDiagnosticHistory = () => {
    if (window.confirm("Are you sure you want to clear all diagnostic history logs? This cannot be undone.")) {
      setHistory([]);
      setResult(null);
      localStorage.removeItem('last_result');
      triggerToast("All diagnostic logs deleted successfully.", "success");
    }
  };

  const clearAllSavedChats = () => {
    if (window.confirm("Are you sure you want to clear all saved conversations? This cannot be undone.")) {
      setSavedChats([]);
      setCurrentChatId(null);
      setChatMessages([
        {
          id: Math.random().toString(),
          sender: 'bot',
          text: "Clean chat room initiated! Feel free to describe your current symptoms or concerns.",
          timestamp: new Date()
        }
      ]);
      triggerToast("All saved conversations deleted successfully.", "success");
    }
  };

  // Click quick recommendation bento cards
  const handleQuickSuggestionClick = (phrase: string, correspondingSymptoms: string[]) => {
    setSelectedSymptoms(correspondingSymptoms);
    setCustomInputText(phrase);
    triggerToast(`Applied suggestion: "${phrase}"`, 'success');
    
    // Auto calculate diagnosis
    handleCalculateDiagnosis(correspondingSymptoms);
  };

  // Trigger voice listening
  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      triggerToast("Web Speech API is not supported in this browser version.", "danger");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // --- DISPATCH MACHINE LEARNING ADVISORY PREDICTIONS ---
  const handleCalculateDiagnosis = async (targetSymptomsList?: string[]) => {
    const listToAnalyze = targetSymptomsList || selectedSymptoms;
    
    if (listToAnalyze.length === 0) {
      // Parse custom text field
      if (customInputText.trim()) {
        const textLower = customInputText.toLowerCase();
        const matches = symptoms.filter(s => textLower.includes(s.toLowerCase()));
        if (matches.length > 0) {
          triggerToast(`Identified ${matches.length} symptoms from your written description!`, 'success');
          setSelectedSymptoms(matches);
          handleCalculateDiagnosis(matches);
          return;
        }
      }
      triggerToast("Please select at least one symptom checklist trait or describe it in the input area.", "danger");
      return;
    }

    setHfAnalysis('');
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: listToAnalyze })
      });

      const data = await response.json();
      setIsAnalyzing(false);

      if (response.status !== 200 || data.error) {
        triggerToast(data.error || "Pre-clinical classification failed.", "danger");
        return;
      }

      const timestamp = new Date().toLocaleString();
      const newResult: DiagnosisResult = {
        ...data,
        created_at: timestamp
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev]);
      triggerToast("Diagnostic predictions calculated!");
      
      // Open Dashboard automatically to visualize predictions and Recharts charts!
      setActiveTab('dashboard');

      // Sync active chat context
      const userDiagMsg: Message = {
        id: Math.random().toString(),
        sender: 'user',
        text: `Evaluate symptoms: ${listToAnalyze.join(", ")}`,
        timestamp: new Date()
      };
      const diagnosisBotMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: `I evaluated the mapped symptoms: **${listToAnalyze.join(", ")}**.\n\nMy machine learning model predicts **${data.predictions[0].disease.toUpperCase()}** with **${data.predictions[0].confidence}%** match probability. Let's discuss preventative advice or suggested remedies for this!`,
        timestamp: new Date()
      };
      const updatedChatWithDiagnosis = [...chatMessages, userDiagMsg, diagnosisBotMsg];
      setChatMessages(updatedChatWithDiagnosis);
      saveOrUpdateChat(updatedChatWithDiagnosis, currentChatId);
    } catch {
      setIsAnalyzing(false);
      triggerToast("Server connection failure.", "danger");
    }
  };

  const handleFetchHuggingFaceOpinion = async () => {
    if (!result) return;
    setHfLoading(true);
    try {
      const response = await fetch('/api/huggingface/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: result.symptoms_analyzed,
          disease: result.predictions[0]?.disease
        })
      });
      const data = await response.json();
      setHfLoading(false);
      if (data.analysis) {
        setHfAnalysis(data.analysis);
        triggerToast("Hugging Face clinical analysis updated!", "success");
      } else {
        triggerToast("Hugging Face API returned no analysis.", "danger");
      }
    } catch {
      setHfLoading(false);
      triggerToast("Failed to fetch Hugging Face analysis.", "danger");
    }
  };

  // --- CHAT DIALOGUE SUBMIT ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    setChatInput('');
    const userMsgId = Math.random().toString();
    const userMsg: Message = { id: userMsgId, sender: 'user', text: query, timestamp: new Date() };
    const updatedWithUser = [...chatMessages, userMsg];
    
    setChatMessages(updatedWithUser);
    const activeId = saveOrUpdateChat(updatedWithUser, currentChatId);

    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          disease_context: result ? result.predictions[0].disease : null
        })
      });

      const data = await res.json();
      setIsTyping(false);

      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: data.reply || "Unable to retrieve clinical analysis. Please try again.",
        timestamp: new Date()
      };
      
      const fullyUpdated = [...updatedWithUser, botMsg];
      setChatMessages(fullyUpdated);
      saveOrUpdateChat(fullyUpdated, activeId);
    } catch {
      setIsTyping(false);
      const errBotMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: "I can answer only health-related questions. Direct urgent queries to professional local hospital care.",
        timestamp: new Date()
      };
      const fullyUpdatedWithErr = [...updatedWithUser, errBotMsg];
      setChatMessages(fullyUpdatedWithErr);
      saveOrUpdateChat(fullyUpdatedWithErr, activeId);
    }
  };

  // --- PDF REPORT EXPORT ENGINE ---
  const handleDownloadPDF = () => {
    if (!result) return;

    try {
      const doc = new jsPDF();
      
      // Header Banner color block
      doc.setFillColor(5, 150, 105); // Rich Clinical Green
      doc.rect(0, 0, 210, 42, 'F');

      // Header Texts
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("AI HEALTH CLINICAL REPORT", 15, 24);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("Pre-clinical diagnostic model prediction summary", 15, 32);

      // Section I: Patient Profile
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text("I. Diagnostic Assessment Profile", 15, 56);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Patient Name: ${currentUser?.username || 'Gayathri C'}`, 15, 66);
      doc.text(`Email Profile: ${currentUser?.email || 'gayathrichebolu6@gmail.com'}`, 15, 72);
      doc.text(`Assessment Date: ${result.created_at || new Date().toLocaleString()}`, 15, 78);
      doc.text(`Diagnostic Code: REF-00${result.report_id}`, 15, 84);

      // Section II: Symptoms Mapping
      doc.setFont('helvetica', 'bold');
      doc.text("II. Mapped Symptoms Evaluated", 15, 96);
      doc.setFont('helvetica', 'normal');
      doc.text(result.symptoms_analyzed.join(", "), 15, 103, { maxWidth: 180 });

      // Section III: Machine Learning Output
      doc.setFont('helvetica', 'bold');
      doc.text("III. Custom Model Classifier Predictions", 15, 120);
      
      let curY = 128;
      result.predictions.forEach((p, index) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`${index + 1}. Condition: ${p.disease.toUpperCase()}`, 15, curY);
        doc.setFont('helvetica', 'bold');
        doc.text(`Match Confidence: ${p.confidence}%`, 130, curY);
        curY += 8;
      });

      // Section IV: Support Recommendations
      doc.setFont('helvetica', 'bold');
      doc.text("IV. Suggested Precautionary Protocols", 15, curY + 6);
      
      doc.setFont('helvetica', 'normal');
      let precY = curY + 14;
      result.recommendations.precautions.forEach(p => {
        doc.text(`• ${p}`, 15, precY, { maxWidth: 180 });
        precY += 6;
      });

      doc.setFont('helvetica', 'bold');
      doc.text("General Medication Guidelines:", 15, precY + 4);
      doc.setFont('helvetica', 'normal');
      let medY = precY + 11;
      result.recommendations.medicines.forEach(m => {
        doc.text(`• ${m}`, 15, medY, { maxWidth: 180 });
        medY += 6;
      });

      doc.setFont('helvetica', 'bold');
      doc.text("Clinical Advice:", 15, medY + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(result.recommendations.advice, 15, medY + 10, { maxWidth: 180 });

      // Disclaimer Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("CLINICAL DISCLAIMER: This document is an automated clinical analysis. It is not a replacement for full physical laboratories, blood tests, or primary care doctor counseling.", 15, 275, { maxWidth: 180 });

      doc.save(`Clinical_Assessment_${result.report_id}.pdf`);
      triggerToast("PDF Diagnostic Report exported successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Failed to compile client-side PDF.", "danger");
    }
  };

  // Filter symptoms list
  const filteredSymptoms = symptoms.filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER REGULAR LOGIN & REGISTER SCREENS ---
  if (!currentUser) {
    return (
      <div className="bg-[#0b0f19] text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl relative z-10 shadow-2xl">
          
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">AI Health Suite</h2>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pre-Clinical Diagnostics Portal</p>
          </div>

          <AnimatePresence mode="wait">
            {authView === 'login' ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Profile</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="email" 
                      placeholder="tulasi@gmail.com" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Secure Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full py-3.5 font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Sign In to Diagnostic Workspace"}
                </button>

                <div className="pt-4 border-t border-slate-850/50 text-center text-xs text-slate-400">
                  <span>New user? </span>
                  <button 
                    type="button" 
                    onClick={() => setAuthView('register')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                  >
                    Create standard profile
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="tulasi" 
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="email" 
                      placeholder="user@gmail.com" 
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full py-3.5 font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Establish Diagnostic Profile"}
                </button>

                <div className="pt-4 border-t border-slate-850/50 text-center text-xs text-slate-400">
                  <span>Already have an account? </span>
                  <button 
                    type="button" 
                    onClick={() => setAuthView('login')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

        </div>

        {/* TOAST SYSTEM IN AUTH */}
        <div className="fixed bottom-5 right-5 z-50 space-y-2">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`p-4 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2 transition-all ${
                toast.type === 'danger' 
                  ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' 
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

      </div>
    );
  }

  // --- MAIN APP COMPILATION ---
  return (
    <div className={`flex min-h-screen font-sans ${theme === 'dark' ? 'bg-[#0e1322] text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-300`}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#090e1a] shrink-0 border-r border-slate-850/50 flex flex-col justify-between p-4 text-white select-none">
        
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-2 shrink-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight">AI Health</span>
          </div>

          {/* New Chat Action */}
          <button 
            onClick={startNewChat}
            className="w-full py-3 px-4 rounded-xl border border-slate-800/80 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700/60 active:scale-[0.98] transition-all text-xs font-bold flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ New Chat</span>
          </button>

          {/* Tabs Menu */}
          <nav className="space-y-1.5 pt-2 shrink-0">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'home' ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'}`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button 
              onClick={() => setActiveTab('assistant')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'assistant' ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'}`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            {currentUser.role === 'Admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </nav>

          {/* Saved Conversations (ChatGPT Style) */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-slate-800/40 pt-4 overflow-hidden">
            <div className="flex items-center justify-between px-2 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Conversations</span>
              </div>
              {savedChats.length > 0 && (
                <button
                  onClick={clearAllSavedChats}
                  className="text-[9px] text-rose-400 hover:text-rose-300 transition-colors normal-case hover:underline cursor-pointer"
                  title="Clear all saved chats"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Compact Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-850/30 pb-2 mb-2 shrink-0">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 text-center py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-slate-900 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setHistoryFilter('archived')}
                className={`flex-1 text-center py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  historyFilter === 'archived'
                    ? 'bg-slate-900 text-amber-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Archive ({savedChats.filter(c => c.isArchived).length})
              </button>
            </div>

            {/* Scrollable list of chats */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs select-none custom-scrollbar">
              {(() => {
                const filtered = savedChats.filter(c => historyFilter === 'all' ? !c.isArchived : c.isArchived);
                if (filtered.length === 0) {
                  return (
                    <div className="px-3 py-6 text-center text-[11px] text-slate-500 italic leading-relaxed">
                      {historyFilter === 'all' 
                        ? "No saved conversations. Describe symptoms to start one!" 
                        : "No archived conversations."}
                    </div>
                  );
                }
                return filtered.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => loadSavedChat(chat)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      currentChatId === chat.id
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.04)]'
                        : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent'
                    }`}
                  >
                    <span className="truncate flex-1 pr-1" title={chat.title}>
                      {chat.title}
                    </span>

                    {/* Hover action buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchiveChat(chat.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          chat.isArchived ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-emerald-400'
                        }`}
                        title={chat.isArchived ? "Unarchive conversation" : "Archive conversation"}
                      >
                        {chat.isArchived ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>

        {/* Lower Sidebar controls */}
        <div className="space-y-4 pt-4 border-t border-slate-850/50">
          
          {/* Dark Mode Switch */}
          <div className="flex items-center justify-between px-2 text-slate-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Dark Mode</span>
            </div>
            
            <button 
              onClick={handleToggleTheme}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {/* User Profile Capsule Card */}
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-850/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.username[0].toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser.username}</div>
                  <div className="text-[10px] text-slate-400 truncate font-medium">{currentUser.role}</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile dropdown actions */}
            {profileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-1.5 bg-slate-950 border border-slate-850 rounded-xl p-2 z-30 shadow-2xl">
                <div className="px-2 py-1.5 border-b border-slate-850/60 mb-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Account profile</div>
                  <div className="text-xs text-slate-300 truncate font-semibold mt-0.5">{currentUser.email}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left p-1.5 text-xs text-rose-400 hover:bg-rose-950/20 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Profile</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </aside>

      {/* CENTRAL AREA */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        
        {/* TOP STATUS ROW */}
        <header className="px-6 py-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Section Context:</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${theme === 'dark' ? 'bg-slate-900/60 text-emerald-400' : 'bg-white text-emerald-600 border border-slate-200'}`}>
              {activeTab} Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Online Pulse Indicator */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${theme === 'dark' ? 'bg-[#0f2122] text-emerald-400 border border-emerald-950/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>
        </header>

        {/* CONTAINER SWITCHES */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 min-h-0 relative">
          
          <AnimatePresence mode="wait">
            
            {/* TABS 1: HOME PANEL */}
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto flex flex-col items-center justify-between min-h-[75vh]"
              >
                
                {/* Center Pulse Brand Header */}
                <div className="flex flex-col items-center text-center mt-6">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
                    <span className="text-emerald-500">AI Health</span> <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Symptom Checker</span>
                  </h1>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Your AI-powered health assistant</p>
                </div>

                {/* HEARTBEAT CONCENTRIC RINGS */}
                <div className="relative my-8 flex items-center justify-center">
                  {/* Concentric rings waves */}
                  <div className="absolute w-44 h-44 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 animate-ping"></div>
                  <div className="absolute w-36 h-36 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 animate-pulse"></div>
                  
                  {/* Glowing central core container */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-center relative shadow-[0_0_35px_rgba(16,185,129,0.2)]">
                    <Heart className="w-12 h-12 text-emerald-400 animate-pulse" />
                    
                    {/* Floating stars decorations */}
                    <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-emerald-300 opacity-60 animate-bounce" />
                    <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-emerald-300 opacity-40" />
                  </div>
                </div>

                {/* Core Title Description */}
                <div className="text-center space-y-2 max-w-lg mb-4">
                  <h2 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>How can I help you today?</h2>
                  <p className="text-slate-400 text-sm">Describe your symptoms and I'll try to help you.</p>
                </div>

                {/* 4 CLICKABLE suggestion cards in 1x4 / 2x2 grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl my-6">
                  <button 
                    onClick={() => handleQuickSuggestionClick("I have a headache and nausea", ["Headache", "Nausea"])}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 cursor-pointer transition-all ${theme === 'dark' ? 'bg-[#111827]/40 border-slate-800/80 hover:bg-[#111827]/80 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500/30 shadow-sm'}`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Neurological matches</h4>
                      <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>I have a headache and nausea</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleQuickSuggestionClick("High fever and chills", ["High Fever", "Chills"])}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 cursor-pointer transition-all ${theme === 'dark' ? 'bg-[#111827]/40 border-slate-800/80 hover:bg-[#111827]/80 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500/30 shadow-sm'}`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Immunological traits</h4>
                      <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>High fever and chills</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleQuickSuggestionClick("Stomach pain and vomiting", ["Stomach Pain", "Vomiting"])}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 cursor-pointer transition-all ${theme === 'dark' ? 'bg-[#111827]/40 border-slate-800/80 hover:bg-[#111827]/80 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500/30 shadow-sm'}`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Stethoscope className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Gastrointestinal patterns</h4>
                      <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Stomach pain and vomiting</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleQuickSuggestionClick("Fatigue and body ache", ["Fatigue", "Muscle Pain"])}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 cursor-pointer transition-all ${theme === 'dark' ? 'bg-[#111827]/40 border-slate-800/80 hover:bg-[#111827]/80 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500/30 shadow-sm'}`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Systemic indicators</h4>
                      <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Fatigue and body ache</p>
                    </div>
                  </button>
                </div>

                {/* BOTTOM CHAT STYLE BAR WITH VOICE OPTIONS RIGHT BESIDE SEND */}
                <div className="w-full max-w-3xl mt-6 relative shrink-0">
                  
                  {voiceStatus && (
                    <div className="absolute top-0 -translate-y-full left-4 bg-emerald-500 text-white font-bold text-[11px] py-1 px-3 rounded-t-xl animate-pulse shadow-md flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" />
                      <span>{voiceStatus}</span>
                    </div>
                  )}

                  <div className={`p-1.5 rounded-2xl border flex items-center gap-2 shadow-xl ${theme === 'dark' ? 'bg-[#121826] border-slate-800 focus-within:border-emerald-500/50' : 'bg-white border-slate-250 focus-within:border-emerald-500/50'} transition-all`}>
                    
                    <input 
                      type="text" 
                      placeholder="Enter your symptoms separated by commas (e.g. fever, chills, vomiting) or describe them..."
                      value={customInputText}
                      onChange={(e) => setCustomInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCalculateDiagnosis()}
                      className="flex-1 bg-transparent border-none text-sm px-3.5 py-2 outline-none focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400"
                    />

                    <div className="flex items-center gap-1.5 pr-1.5 shrink-0">
                      {selectedSymptoms.length > 0 && (
                        <div className="text-[10px] text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10 hidden sm:block">
                          {selectedSymptoms.length} Selected
                        </div>
                      )}

                      <button 
                        type="button" 
                        onClick={handleToggleVoice}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${isListening ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-900/40'}`}
                        title="Speak symptoms"
                      >
                        {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                      </button>

                      <button 
                        onClick={() => handleCalculateDiagnosis()}
                        disabled={isAnalyzing || !customInputText.trim() && selectedSymptoms.length === 0}
                        className={`p-2 rounded-xl transition-all flex items-center justify-center min-w-[36px] ${
                          isAnalyzing || (!customInputText.trim() && selectedSymptoms.length === 0)
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg active:scale-95 cursor-pointer'
                        }`}
                      >
                        {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>

                  </div>

                  <p className="text-center text-[11px] text-slate-500 mt-4 italic leading-relaxed max-w-lg mx-auto">
                    Disclaimer: This is not a substitute for professional medical advice. Always consult a qualified healthcare professional.
                  </p>
                </div>

              </motion.div>
            )}

            {/* TABS 2: AI ASSISTANT CHATROOM */}
            {activeTab === 'assistant' && (
              <motion.div 
                key="assistant"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`max-w-4xl mx-auto flex flex-col h-[78vh] border rounded-3xl overflow-hidden shadow-2xl relative ${theme === 'dark' ? 'bg-[#0f1424] border-slate-800' : 'bg-white border-slate-200'}`}
              >
                
                {/* Chatbot Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between shrink-0 z-10 bg-slate-50/50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-850">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Bot className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">AI Clinical Assistant</h3>
                      <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Clinical agent online. Describe predicted condition concerns.</span>
                      </span>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-[#101e1e] text-emerald-400 border-emerald-950/40' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                    Context: {result ? result.predictions[0].disease.toUpperCase() : "GENERAL HEALTH ADVICE"}
                  </span>
                </div>

                {/* Messages Room lists */}
                <div className={`p-6 overflow-y-auto flex-1 space-y-4 min-h-0 ${theme === 'dark' ? 'bg-[#0a0f1d]/30' : 'bg-slate-50/30'}`}>
                  {chatMessages.map(msg => {
                    const isBot = msg.sender === 'bot';
                    return (
                      <div key={msg.id} className={`flex items-start gap-3.5 max-w-2xl ${isBot ? '' : 'ml-auto flex-row-reverse'}`}>
                        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border border-slate-200/10 ${isBot ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {isBot ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                        </div>
                        <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm relative ${isBot ? 'bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 text-slate-700 dark:text-slate-200' : 'bg-emerald-500 text-white shadow-emerald-500/10'}`}>
                          <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {isTyping && (
                    <div className="flex items-start gap-3.5 max-w-2xl">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-slate-200/10">
                        <Bot className="w-4.5 h-4.5 animate-pulse" />
                      </div>
                      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span>Evaluating clinical advice parameters...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* BOTTOM CHAT CONTROLS WITH VOICE MICROPHONE PLACED ON THE RIGHT CORNER EXACTLY LIKE CHATGPT */}
                <div className="p-4 border-t shrink-0 bg-slate-50/50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-850 relative">
                  
                  {voiceStatus && (
                    <div className="absolute top-0 -translate-y-full left-6 bg-emerald-500 text-white font-bold text-[10px] py-1 px-3 rounded-t-xl animate-pulse shadow-md">
                      {voiceStatus}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className={`p-1.5 rounded-2xl border flex items-center gap-2 ${theme === 'dark' ? 'bg-[#121826] border-slate-800 focus-within:border-emerald-500/50' : 'bg-white border-slate-250 focus-within:border-emerald-500/50'} transition-all shadow-sm`}>
                    
                    <input 
                      type="text" 
                      placeholder="Ask any question about your predicted condition, symptoms, medications, precautions..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm px-3.5 py-2 outline-none focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400"
                    />

                    <div className="flex items-center gap-1.5 pr-1.5 shrink-0">
                      <button 
                        type="button" 
                        onClick={handleToggleVoice}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${isListening ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-900/40'}`}
                        title="Speak input"
                      >
                        {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                      </button>

                      <button 
                        type="submit" 
                        disabled={!chatInput.trim()}
                        className={`p-2 rounded-xl transition-all flex items-center justify-center min-w-[36px] ${
                          chatInput.trim() 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg active:scale-95 cursor-pointer' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                  </form>
                </div>

              </motion.div>
            )}

            {/* TABS 3: ADVANCED SYMPTOMS SELECTION & DIAGNOSIS RECHARTS WORKSPACE */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                
                {/* DYNAMIC SYMPTOM SEVERITY & PREDICTION CONFIDENCE TREND */}
                <div className={`border rounded-3xl p-6 shadow-md ${theme === 'dark' ? 'bg-[#0f1424] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-6 border-slate-150 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h3 className="font-extrabold text-base">Symptom Severity & Diagnosis Trend</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Chronological progression of symptom loads and condition confidence scores</p>
                      </div>
                    </div>
                    {history.length > 0 && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold self-start sm:self-auto">
                        {history.length} Sessions Tracked
                      </span>
                    )}
                  </div>

                  {history.length > 0 ? (
                    <div>
                      {/* Dual-axis Line Chart container */}
                      <div className="h-72 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[...history].reverse().map((log, index) => {
                              // Nice formatting of creation date
                              let displayDate = `Session ${index + 1}`;
                              if (log.created_at) {
                                const parts = log.created_at.split(' ');
                                if (parts.length >= 2) {
                                  const dParts = parts[0].split('-');
                                  const dateFormatted = dParts.length >= 3 ? `${dParts[1]}/${dParts[2]}` : parts[0];
                                  displayDate = `${dateFormatted} ${parts[1]}`;
                                } else {
                                  displayDate = log.created_at;
                                }
                              }
                              return {
                                name: displayDate,
                                shortName: `Session ${index + 1}`,
                                symptomCount: log.symptoms_analyzed?.length || 0,
                                confidence: log.predictions[0]?.confidence || 0,
                                primaryDisease: log.predictions[0]?.disease || 'Undetermined'
                              };
                            })}
                            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} opacity={0.5} />
                            <XAxis 
                              dataKey="shortName" 
                              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                              tick={{ fontSize: 11, fontWeight: 600 }}
                            />
                            {/* Left Y-axis for confidence (%) */}
                            <YAxis 
                              yAxisId="left"
                              orientation="left"
                              stroke="#6366f1"
                              domain={[0, 100]}
                              tick={{ fontSize: 10, fontWeight: 600 }}
                              label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#6366f1', fontSize: 10, fontWeight: 600 } }}
                            />
                            {/* Right Y-axis for symptom counts */}
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              stroke="#10b981"
                              tick={{ fontSize: 10, fontWeight: 600 }}
                              label={{ value: 'Symptom Count', angle: 90, position: 'insideRight', offset: 0, style: { fill: '#10b981', fontSize: 10, fontWeight: 600 } }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="p-4 bg-slate-950/95 border border-emerald-500/35 rounded-xl text-xs space-y-2 shadow-2xl">
                                      <p className="font-extrabold text-emerald-400 border-b border-slate-800 pb-1.5">{data.name}</p>
                                      <div className="space-y-1 text-slate-300">
                                        <p className="flex justify-between gap-4">
                                          <span>Top Condition:</span>
                                          <span className="font-bold text-slate-100 uppercase">{data.primaryDisease}</span>
                                        </p>
                                        <p className="flex justify-between gap-4">
                                          <span>Match Confidence:</span>
                                          <span className="font-bold text-indigo-400">{data.confidence}%</span>
                                        </p>
                                        <p className="flex justify-between gap-4">
                                          <span>Symptom Count:</span>
                                          <span className="font-bold text-emerald-400">{data.symptomCount} symptoms</span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="confidence" 
                              stroke="#6366f1" 
                              name="Prediction Confidence" 
                              strokeWidth={3}
                              dot={{ r: 5, strokeWidth: 2, stroke: '#6366f1', fill: theme === 'dark' ? '#0f1424' : '#ffffff' }}
                              activeDot={{ r: 7 }}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="symptomCount" 
                              stroke="#10b981" 
                              name="Symptom Count (Symptom Load)" 
                              strokeWidth={3}
                              dot={{ r: 5, strokeWidth: 2, stroke: '#10b981', fill: theme === 'dark' ? '#0f1424' : '#ffffff' }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-3 text-center">
                        Horizontal axis represents diagnostic sessions from oldest to newest. Point hover displays top disease mapping.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="max-w-md">
                        <h4 className="font-extrabold text-sm text-slate-300">Symptom Timeline is Empty</h4>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Once you select symptoms and run diagnostics, a chronological line chart tracking symptom load (symptom count) and match confidence will generate here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left checklist core */}
                  <div className="lg:col-span-2 space-y-8">
                    
                    <div className={`border rounded-3xl p-6 shadow-md ${theme === 'dark' ? 'bg-[#0f1424] border-slate-800' : 'bg-white border-slate-200'}`}>
                      
                      <div className="flex items-center justify-between border-b pb-4 mb-6 border-slate-150 dark:border-slate-850">
                        <div className="flex items-center gap-2">
                          <Search className="w-5 h-5 text-emerald-500" />
                          <h3 className="font-extrabold text-base">Advanced Symptom Picker</h3>
                        </div>

                        <button 
                          onClick={handleToggleVoice}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${isListening ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-250 dark:border-slate-700'}`}
                        >
                          {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                          <span>Dictation Mode</span>
                        </button>
                      </div>

                      {/* Search Bar filter */}
                      <div className="mb-6 relative">
                        <input 
                          type="text" 
                          placeholder="Filter symptoms (e.g. skin, vomiting, stomach, headache)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full px-4 py-2.5 pl-10 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-800'}`}
                        />
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                          <Search className="w-4 h-4" />
                        </span>
                      </div>

                      {/* Checkbox matrix layout */}
                      <div className={`max-h-72 overflow-y-auto border rounded-2xl p-4 ${theme === 'dark' ? 'border-slate-850 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredSymptoms.map(symptom => {
                            const isChecked = selectedSymptoms.includes(symptom);
                            return (
                              <label 
                                key={symptom}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${isChecked ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : theme === 'dark' ? 'bg-slate-900/50 border-slate-850 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-emerald-500/30'}`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => handleCheckboxToggle(symptom)}
                                  className="rounded text-emerald-500 focus:ring-emerald-500 h-4.5 w-4.5 border-slate-300 dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                                />
                                <span className="text-xs font-semibold">{symptom}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Badges of Checked Symptoms */}
                      {selectedSymptoms.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-150 dark:border-slate-850/60">
                          {selectedSymptoms.map(s => (
                            <div key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                              <span>{s}</span>
                              <button onClick={() => handleCheckboxToggle(s)} className="hover:text-rose-500 text-slate-400 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Run predict controls row */}
                      <div className="mt-6 pt-5 border-t flex items-center justify-between border-slate-150 dark:border-slate-850/60">
                        <button 
                          onClick={handleClearSelections}
                          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900 text-slate-400' : 'border-slate-250 hover:bg-slate-100 text-slate-500'}`}
                        >
                          Clear Selection
                        </button>
                        <button 
                          onClick={() => handleCalculateDiagnosis()}
                          disabled={isAnalyzing}
                          className="px-6 py-2.5 text-xs font-black rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                          <span>{isAnalyzing ? "Evaluating classifier..." : "Process Model Prediction"}</span>
                        </button>
                      </div>

                    </div>

                    {/* DYNAMIC COMPREHENSIVE OUTPUT SECTION */}
                    {result && (
                      <div className={`border rounded-3xl p-6 shadow-md space-y-6 ${theme === 'dark' ? 'bg-[#0f1424] border-slate-800' : 'bg-white border-slate-200'}`}>
                        
                        <div className="flex items-center justify-between border-b pb-4 border-slate-150 dark:border-slate-850">
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-rose-500" />
                            <h3 className="font-extrabold text-base">Classifier Diagnostics Results</h3>
                          </div>

                          <button 
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Export PDF Report</span>
                          </button>
                        </div>

                        {/* Highlight Primary Disease card */}
                        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Top Predicted Medical Condition</span>
                            <h4 className="text-2xl font-black mt-1 text-emerald-500">{result.predictions[0].disease.toUpperCase()}</h4>
                          </div>

                          <div className="p-3 bg-slate-900/60 border border-emerald-500/20 rounded-xl text-center min-w-[120px]">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Confidence Ratio</span>
                            <span className="text-xl font-black text-emerald-400 mt-0.5 block">{result.predictions[0].confidence}%</span>
                          </div>
                        </div>

                        {/* Recharts chart & details grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Top 3 List */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Differential Diagnoses (Top 3 Matches)</h4>
                            <div className="space-y-3">
                              {result.predictions.map((p, index) => {
                                const barColor = index === 0 ? '#10b981' : index === 1 ? '#06b6d4' : '#3b82f6';
                                return (
                                  <div key={p.disease} className="p-4 rounded-xl border border-slate-850 bg-slate-950/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold">{p.disease}</span>
                                      <span className="text-xs font-bold text-slate-400">{p.confidence}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${p.confidence}%`, backgroundColor: barColor }}></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Recharts Bar representation */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bar Distribution Chart</h4>
                            <div className="h-44 w-full bg-slate-950/20 border border-slate-850 p-2.5 rounded-2xl">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={result.predictions} layout="vertical" margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                                  <XAxis type="number" domain={[0, 100]} hide />
                                  <YAxis type="category" dataKey="disease" width={110} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                  <Tooltip formatter={(value: any) => [`${value}%`, 'Match Rate']} contentStyle={{ background: '#090e1a', border: '1px solid #10b981', borderRadius: '8px', fontSize: '11px' }} />
                                  <Bar dataKey="confidence" radius={4} barSize={12}>
                                    {result.predictions.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#06b6d4' : '#3b82f6'} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>

                        {/* Precautions and remedies info logs */}
                        <div className="pt-5 border-t border-slate-150 dark:border-slate-850/60 space-y-5">
                          
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Suggested Precaution Protocols & Remedies</h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-850">
                              <span className="text-xs font-bold text-emerald-400 block mb-2 uppercase tracking-wider">Safety Precautions</span>
                              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                                {result.recommendations.precautions.map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-850">
                              <span className="text-xs font-bold text-emerald-400 block mb-2 uppercase tracking-wider">Supportive Care Remedies</span>
                              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                                {result.recommendations.medicines.map((m, i) => <li key={i}>{m}</li>)}
                              </ul>
                            </div>
                          </div>

                          {/* Consultation Advisory box */}
                          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-500 text-xs">
                            <div className="flex gap-2">
                              <Stethoscope className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Advisory:</span>
                                <span className="block mt-1 leading-relaxed text-slate-400">{result.recommendations.advice}</span>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                  {/* Right columns lists of previous evaluations */}
                  <div className="space-y-8">
                    
                    {/* Diagnostic evaluation history logs */}
                    <div className={`border rounded-3xl p-6 shadow-md ${theme === 'dark' ? 'bg-[#0f1424] border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-150 dark:border-slate-850">
                        <div className="flex items-center gap-2">
                          <History className="w-4.5 h-4.5 text-emerald-400" />
                          <h4 className="font-extrabold text-sm">Diagnostic History Logs</h4>
                        </div>
                        {history.length > 0 && (
                          <button
                            onClick={clearAllDiagnosticHistory}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-extrabold flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear All</span>
                          </button>
                        )}
                      </div>

                      {/* Search & Filter bar for past diagnostic logs */}
                      <div className="relative mb-4">
                        <input
                          type="text"
                          placeholder="Filter logs by disease or date..."
                          value={diagSearchQuery}
                          onChange={(e) => setDiagSearchQuery(e.target.value)}
                          className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                            theme === 'dark' 
                              ? 'bg-slate-900/50 border-slate-800 text-slate-200 placeholder-slate-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        {diagSearchQuery && (
                          <button
                            onClick={() => setDiagSearchQuery('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {(() => {
                          const filteredHistory = history.filter(log => {
                            if (!diagSearchQuery) return true;
                            const query = diagSearchQuery.toLowerCase().trim();
                            const matchesDisease = log.predictions[0]?.disease?.toLowerCase().includes(query);
                            const matchesDate = log.created_at?.toLowerCase().includes(query);
                            const matchesSymptoms = log.symptoms_analyzed?.some(s => s.toLowerCase().includes(query));
                            return matchesDisease || matchesDate || matchesSymptoms;
                          });

                          if (filteredHistory.length > 0) {
                            return filteredHistory.map((log, index) => (
                              <div key={index} className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-950/10 hover:border-emerald-500/20 transition-all text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-200">{log.predictions[0].disease.toUpperCase()}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 font-bold">{log.predictions[0].confidence}%</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 truncate">Symptoms: {log.symptoms_analyzed.join(", ")}</div>
                                <div className="text-[9px] text-slate-400 mt-2 text-right">{log.created_at}</div>
                              </div>
                            ));
                          } else {
                            return (
                              <div className="text-center py-8 text-slate-400 space-y-2">
                                <Database className="w-8 h-8 mx-auto text-slate-700" />
                                <p className="text-xs">
                                  {diagSearchQuery 
                                    ? "No matching diagnostic logs found." 
                                    : "No local diagnostic sessions recorded yet."}
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>



                    {/* Wellness Tip */}
                    <div className="p-5 border border-emerald-500/10 rounded-3xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/0">
                      <div className="flex items-center gap-2 text-emerald-400 mb-3">
                        <Sparkles className="w-4.5 h-4.5 animate-bounce" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Clinical Guidance Tip</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "Pre-clinical pattern mappings identify correlations based on training studies. Direct persistent high fever or severe pain markers to physical diagnostics."
                      </p>
                    </div>

                  </div>

                </div>

              </motion.div>
            )}

            {/* TABS 4: SYSTEM ADMIN PANEL (ONLY VISIBLE FOR ADMIN ROLES) */}
            {activeTab === 'admin' && currentUser.role === 'Admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stats cards 1 */}
                  <div className="p-5 border border-slate-850 rounded-2xl bg-slate-900/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registered Users</span>
                      <h4 className="text-2xl font-black mt-1">{registeredUsers.length || 2}</h4>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                      <User className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Stats cards 2 */}
                  <div className="p-5 border border-slate-850 rounded-2xl bg-slate-900/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Diagnostic Runs</span>
                      <h4 className="text-2xl font-black mt-1">{history.length + 8}</h4>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Stats cards 3 */}
                  <div className="p-5 border border-slate-850 rounded-2xl bg-slate-900/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Model Training Status</span>
                      <h4 className="text-lg font-black mt-1.5 text-emerald-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Active Standby</span>
                      </h4>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                      <Database className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Users list database grid */}
                <div className="border border-slate-850 rounded-3xl p-6 bg-[#0f1424]">
                  <div className="flex items-center gap-2 border-b pb-4 mb-4 border-slate-850">
                    <Database className="w-4.5 h-4.5 text-emerald-400" />
                    <h3 className="font-extrabold text-sm">Diagnostic Portal Registered Users</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-400">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-500 uppercase font-bold tracking-wider">
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Email Account</th>
                          <th className="py-3 px-4">System Role</th>
                          <th className="py-3 px-4">Workspace Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {registeredUsers.length > 0 ? (
                          registeredUsers.map((u, i) => (
                            <tr key={i} className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-slate-200">{u.username}</td>
                              <td className="py-3 px-4">{u.email}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'Admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-semibold">Vite-Express Node</td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-slate-200">tulasi</td>
                              <td className="py-3 px-4">tulasi@gmail.com</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">User</span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-semibold">Offline cached</td>
                            </tr>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-slate-200">Gayathri C</td>
                              <td className="py-3 px-4">gayathrichebolu6@gmail.com</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">Admin</span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-semibold">Offline cached</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* GLOBAL TOAST SYSTEM */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2.5 transition-all ${
              toast.type === 'danger' 
                ? 'bg-rose-950/45 text-rose-400 border-rose-900/40 shadow-rose-950/5' 
                : toast.type === 'info'
                ? 'bg-slate-900/80 text-slate-300 border-slate-800'
                : 'bg-emerald-950/45 text-emerald-400 border-emerald-900/40 shadow-emerald-950/5'
            }`}
          >
            {toast.type === 'danger' ? <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
