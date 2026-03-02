import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, ChevronRight, BarChart2, Download, Copy, Briefcase, FileUp, FileDown, Loader2, Search, Mail, MessageSquare, Printer, Edit3, Save, Send, History, Settings, X, Trash2, Eye, EyeOff, Plane, ShieldCheck, Users, Layout, Activity, FileStack, Cloud, Check, Lock, Globe, LogOut, UserPlus, Edit, Shield, UserX, UserCheck, CreditCard, Zap, Key, ScrollText, Bell, Menu, Plus, LockKeyhole, Receipt } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- INTERFACES (JSDoc for JSX) ---
/**
 * @typedef {Object} User
 * @property {string} [id]
 * @property {string} [username]
 * @property {string} [password]
 * @property {string} [role]
 * @property {string} [status]
 * @property {string} [fullName]
 * @property {string} [email]
 * @property {number} [credits]
 */

/**
 * @typedef {Object} AppSettings
 * @property {string} tone
 * @property {string} format
 * @property {string} strictness
 */

// --- CLIENT-SIDE LOGIC ---

// UNIVERSAL AI ROUTER
const generateAIContent = async (prompt) => {
  try {
    const providers = JSON.parse(localStorage.getItem('ats_ai_providers') || '[]');
    const activeProviders = providers.filter((p) => p.status);
    
    if (activeProviders.length === 0) {
      throw new Error("AI Processing is currently disabled. An administrator must enable an AI provider in the Admin Dashboard before processing.");
    }

    const genAI = new GoogleGenerativeAI("");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("AI Error:", err);
    throw err;
  }
};

// --- HELPER: DOCX HTML WRAPPER ---
const getDocxHtml = (content, template = 'professional') => {
  let fontFamily = "'Times New Roman', serif";
  let headingColor = "#000000";
  let textColor = "#000000";

  if (template === 'modern') {
    fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    headingColor = "#2c3e50";
    textColor = "#333333";
  } else if (template === 'minimal') {
    fontFamily = "'Inter', 'Segoe UI', Roboto, sans-serif";
    headingColor = "#111827";
    textColor = "#4b5563";
  }

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export</title>
        <style>
          @page { size: 21cm 29.7cm; margin: 1.27cm 1.27cm 1.27cm 1.27cm; mso-page-orientation: portrait; }
          @page WordSection1 { size: 21cm 29.7cm; margin: 1.27cm 1.27cm 1.27cm 1.27cm; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: ${fontFamily}; font-size: 12.0pt; line-height: 1.15; color: ${textColor}; background: #ffffff; margin: 0; padding: 0; }
          div, p, ul, li, h1, h2, h3, h4 { display: block !important; width: 100% !important; float: none !important; clear: both !important; }
          h1 { font-size: 16pt; font-weight: bold; text-align: left; text-transform: uppercase; color: ${headingColor}; margin: 0 0 4pt 0; padding: 0; }
          p.contact { text-align: left; font-size: 12pt; margin: 0 0 12pt 0; color: ${textColor}; }
          h3 { font-size: 12pt; font-weight: bold; text-transform: uppercase; text-align: left; border: none !important; text-decoration: none !important; margin-top: 12pt; margin-bottom: 6pt; color: ${headingColor}; }
          h4 { font-size: 12pt; margin-top: 6pt; margin-bottom: 2pt; color: ${headingColor}; font-weight: bold; }
          p { margin: 0; text-align: justify; margin-bottom: 4pt; }
          ul { margin-top: 0; margin-bottom: 8pt; padding-left: 18pt; }
          li { margin-bottom: 2pt; padding-left: 0; }
          strong, b { color: ${headingColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="WordSection1">${content}</div>
      </body>
    </html>
  `;
};

// --- AI FUNCTIONS ---
const AIRLINE_ATS_PROFILES = {
  "General / Other": { system: "Generic ATS", focus: "General Compliance" },
  "Delta Air Lines": { system: "Taleo", focus: "Keyword Matching, Formatting Rigidity" },
  "United Airlines": { system: "Workday", focus: "Skills Parsing, Chronological Flow" },
  "American Airlines": { system: "BrassRing", focus: "Technical Certifications, Scannability" },
  "Lufthansa": { system: "SAP SuccessFactors", focus: "Structured Data, Multilingual Support" },
  "British Airways": { system: "Workday", focus: "Competency Frameworks" },
  "Emirates": { system: "SAP", focus: "Psychometric Keywords, Cultural Fit" },
  "Qatar Airways": { system: "Workday", focus: "Experience Verification, Safety Compliance" },
  "Singapore Airlines": { system: "Custom/Proprietary", focus: "Academic Excellence, Brand Alignment" },
  "Ryanair": { system: "Custom", focus: "Operational Efficiency, Cost Awareness" }
};

const AVIATION_KEYWORDS = `
  Technical: ATP Certificate, Type Ratings (B737, A320, B777), CFII, MEI, CFI, Class 1 Medical.
  Safety: SMS (Safety Management System), FAA Regulations, ICAO Standards, ORM.
  Operational: CRM (Crew Resource Management), ETOPS, RVSM, CAT II/III.
  Soft Skills: Decision Making Under Pressure, Multi-Crew Coordination, Situational Awareness.
`;

const analyzeWithGemini = async (resumeText, jobDescription, settings, airlineProfile) => {
  try {
    const toneInstruction = settings?.tone || "Balanced";
    const formatInstruction = settings?.format || "Chronological";
    const strictnessInstruction = settings?.strictness === "Aggressive" ? "MAXIMUM keyword stuffing." : "Balanced optimization.";
    const atsSystem = airlineProfile ? (AIRLINE_ATS_PROFILES[airlineProfile]?.system || "Generic ATS") : "Generic ATS";
    const atsFocus = airlineProfile ? (AIRLINE_ATS_PROFILES[airlineProfile]?.focus || "General") : "General";

    const prompt = `
      ACT AS: Senior ATS Optimization Expert and Master Executive Resume Writer.
      OBJECTIVE: Optimise for maximum ATS score. Rewrite the resume to FILL EXACTLY ONE A4 PAGE (12pt font).
      CONTEXT: ATS SYSTEM: ${atsSystem} (${atsFocus}), INDUSTRY KEYWORDS: ${AVIATION_KEYWORDS}, TONE: ${toneInstruction}, FORMAT: ${formatInstruction}, STRATEGY: ${strictnessInstruction}
      INPUT DATA: [RESUME]: ${resumeText}, [JOB DESCRIPTION]: ${jobDescription}
      TASK 1: SCORING (Calculate ATS Score, Impact, Brevity, Keywords). TASK 2: REWRITE (STRICT PLAIN TEXT).
      FORMATTING RULES: NO Emojis, Icons, Graphics, Colors, Tables, Columns. FONT: Times New Roman, Size 12.
      STRUCTURE: HEADER (H1, Uppercase, Bold, LEFT ALIGNED), SECTIONS (H3 tags): PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS.
      RETURN JSON FORMAT ONLY: { "score": number, "score_breakdown": { "impact": number, "brevity": number, "keywords": number }, "summary_critique": "string", "missing_keywords": [], "matched_keywords": [], "optimized_content": "Valid HTML string..." }
    `;

    let text = await generateAIContent(prompt);
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    if (data.optimized_content) {
      data.optimized_content = data.optimized_content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    if (!data.score_breakdown) {
      data.score_breakdown = { impact: 85, brevity: 90, keywords: data.score };
    }
    return data;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error(error.message || "Optimization failed.");
  }
};

const generateCoverLetterWithGemini = async (optimizedResumeHtml, jobDescription, settings) => {
  try {
    const tone = settings?.tone || "Professional";
    const prompt = `ACT AS: Expert Career Coach. Write a targeted Cover Letter. TONE: ${tone}. INPUT: [RESUME HTML]: ${optimizedResumeHtml}, [JOB]: ${jobDescription}. Return JSON { "cover_letter_content": "html..." }`;
    let text = await generateAIContent(prompt);
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    if (data.cover_letter_content) data.cover_letter_content = data.cover_letter_content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return data;
  } catch (error) {
    throw new Error(error.message || "Cover Letter generation failed.");
  }
};

const generateInterviewPrepWithGemini = async (resumeHtml, jobDescription) => {
  try {
    const prompt = `ACT AS: Lead Interviewer. Generate 5 likely interview questions and STAR answers. INPUT: [RESUME]: ${resumeHtml}, [JOB]: ${jobDescription}. OUTPUT JSON: { "questions": [{ "question": "string", "star_answer": "string" }] }`;
    let text = await generateAIContent(prompt);
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    throw new Error(error.message || "Interview Prep generation failed.");
  }
};

const parseFile = async (file) => {
  if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (window.mammoth) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else { throw new Error("DOCX parser not loaded yet."); }
  } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
    const genAI = new GoogleGenerativeAI(""); 
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
    const result = await model.generateContent([{ inlineData: { mimeType: 'application/pdf', data: base64Data } }, { text: "Extract all text verbatim." }]);
    return result.response.text();
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};

const fetchJobWithGemini = async (url) => {
  try {
    const genAI = new GoogleGenerativeAI("");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025", tools: [{ googleSearch: {} }] });
    const result = await model.generateContent(`You are a job analyst. TARGET URL: ${url}. Summarize Title, Company, Responsibilities, Hard Skills, Soft Skills.`);
    return result.response.text();
  } catch (error) { throw new Error("Could not automatically fetch job details."); }
};

// --- COMPONENTS ---
const FitAnalyzer = ({ contentLength }) => {
  const minTarget = 2750;
  const maxTarget = 2900;
  const percentage = Math.min((contentLength / maxTarget) * 100, 100);
  let statusColor = "bg-emerald-500";
  let statusText = "Perfect A4 Fit";
  if (contentLength < minTarget) { statusColor = "bg-amber-500"; statusText = "Too Short"; }
  else if (contentLength > maxTarget) { statusColor = "bg-red-500"; statusText = "Risk of Overflow"; }
  return (
    <div className="bg-slate-100 p-2 rounded-lg text-xs border border-slate-200 mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-slate-700">A4 Fit Meter</span>
        <span className={`${statusColor.replace('bg-', 'text-')} font-bold`}>{statusText} ({contentLength} chars)</span>
      </div>
      <div className="w-full bg-slate-300 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${statusColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

const HistorySidebar = ({ isOpen, onClose, history, onLoad, onDelete }) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500" /> History</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
      </div>
      <div className="overflow-y-auto flex-1 p-4 space-y-3">
        {history.length === 0 ? <div className="text-center text-slate-400 text-sm py-10">No history yet.</div> : history.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-all group">
            <div className="flex justify-between items-start mb-1">
              <div className="font-bold text-slate-700 text-sm truncate w-48">{item.jobTitle || "Untitled"}</div>
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-slate-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="text-xs text-slate-500 mb-3 truncate flex items-center gap-1"><Briefcase className="w-3 h-3" /> {item.company || new Date(item.id).toLocaleDateString()}</div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{item.score}% Match</span>
              <button onClick={() => onLoad(item)} className="text-xs text-indigo-600 font-bold hover:underline">Load</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- LOGIN VIEW ---
const LoginView = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) setError("Invalid credentials or account suspended.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-xl mb-4"><Plane className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-800">ATS<span className="text-indigo-600">Pro</span> Login</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to access the Optimizer Engine</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-md mt-2">Sign In</button>
        </form>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ currentUser, users, setUsers, onClose, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('ats_audit_logs') || '[]'));
  const [systemSettings, setSystemSettings] = useState(() => JSON.parse(localStorage.getItem('ats_sys_settings') || '{"budgetCap":1000,"charLimit":4000,"defaultCredits":2,"adminDefaultCredits":100,"cfToken":""}'));
  const [apiKeys, setApiKeys] = useState(() => JSON.parse(localStorage.getItem('ats_api_keys') || '[]'));
  const [aiProviders, setAiProviders] = useState(() => JSON.parse(localStorage.getItem('ats_ai_providers') || '[{"id":1,"name":"Google Gemini","tags":["Free","Vision"],"priority":1,"model":"gemini-2.0-flash","status":false,"tokens":0,"spend":0},{"id":2,"name":"Groq","tags":["Free","Vision"],"priority":2,"model":"qwen-32b","status":false,"tokens":0,"spend":0}]'));
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({ username: '', password: '', fullName: '', email: '', role: 'user', status: 'active', credits: 0 });
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => { localStorage.setItem('ats_audit_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('ats_sys_settings', JSON.stringify(systemSettings)); }, [systemSettings]);
  useEffect(() => { localStorage.setItem('ats_api_keys', JSON.stringify(apiKeys)); }, [apiKeys]);
  useEffect(() => { localStorage.setItem('ats_ai_providers', JSON.stringify(aiProviders)); }, [aiProviders]);

  const addLog = (action, entity) => {
    const newLog = { id: Date.now(), date: new Date().toLocaleString('en-GB'), user: currentUser.email || currentUser.username, action, entity, ip: '192.168.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const openUserModal = (user = null) => {
    if (user) { setEditingUser(user); setUserFormData({ ...user, password: '', credits: user.credits || 0 }); }
    else { setEditingUser(null); setUserFormData({ username: '', password: '', fullName: '', email: '', role: 'user', status: 'active', credits: systemSettings.defaultCredits }); }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (editingUser) {
      const updatedUsers = users.map(u => String(u.id) === String(editingUser.id) ? { ...u, ...userFormData, password: userFormData.password || u.password } : u);
      setUsers(updatedUsers);
      addLog('USER_UPDATED', `User (${userFormData.email})`);
    } else {
      if (!userFormData.password) return setAlertMessage({ title: "Error", message: "Password required.", type: "error" });
      const initialCredits = userFormData.role === 'admin' ? parseInt(systemSettings.adminDefaultCredits || 100) : parseInt(systemSettings.defaultCredits || 2);
      const newUser = { ...userFormData, id: Date.now().toString(), credits: initialCredits };
      setUsers([...users, newUser]);
      addLog('USER_CREATED', `User (${userFormData.email})`);
    }
    setIsUserModalOpen(false);
  };

  const handleToggleAiProvider = (id) => {
    setAiProviders(aiProviders.map(p => p.id === id ? { ...p, status: !p.status } : p));
    addLog('AI_PROVIDER_TOGGLED', `AIProvider (${id})`);
  };

  const handleGenerateApiKey = () => {
    const newKey = { id: Date.now(), name: currentUser.email || currentUser.username, key: 'ats_' + Math.random().toString(36).substr(2, 10).toUpperCase() + '...', limit: '100/day', usage: 0, status: 'Active' };
    setApiKeys([newKey, ...apiKeys]);
    addLog('API_KEY_GENERATED', `APIKey (${newKey.key.substring(0,8)})`);
  };

  const navItems = [
    { id: 'overview', icon: Layout, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'ai-providers', icon: Zap, label: 'AI Providers' },
    { id: 'api-keys', icon: Key, label: 'API Keys' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'indigo' },
          { label: 'Active Users', value: users.filter(u=>u.status==='active').length, icon: CheckCircle, color: 'emerald' },
          { label: 'Pending Approvals', value: 0, icon: AlertCircle, color: 'amber' },
          { label: 'Total Optimizations', value: 35, icon: Activity, color: 'purple' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{item.label}</span><div className={`bg-${item.color}-100 p-2 rounded-lg text-${item.color}-600`}><item.icon className="w-5 h-5" /></div></div>
            <div className="text-3xl font-bold text-slate-800 mt-4">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">User Directory</h3>
        <button onClick={() => openUserModal()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"><UserPlus className="w-4 h-4" /> Add New User</button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200"><th className="p-4 font-bold">Name / Email</th><th className="p-4 font-bold">Role</th><th className="p-4 font-bold">Credits</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition">
              <td className="p-4"><div className="font-bold text-slate-800">{user.fullName}</div><div className="text-slate-500 text-xs">{user.email}</div></td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>{user.role}</span></td>
              <td className="p-4 font-medium text-slate-700">{user.credits || 0}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span></td>
              <td className="p-4 text-right flex justify-end gap-2">
                <button onClick={() => openUserModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"><Edit className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAiProviders = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h3 className="font-bold text-slate-800">AI Provider Configuration</h3></div>
      <div className="divide-y divide-slate-100">
        {aiProviders.map(p => (
          <div key={p.id} className={`p-6 flex items-center justify-between transition ${p.status ? 'bg-indigo-50/30' : 'bg-white opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className={`${p.status ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'} p-3 rounded-lg`}><Zap className="w-6 h-6" /></div>
              <div>
                <h4 className={`font-bold ${p.status ? 'text-slate-800' : 'text-slate-500'}`}>{p.name}</h4>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  <span>{p.status ? 'Active' : 'Disabled'}</span><span>Model: {p.model}</span>
                </div>
              </div>
            </div>
            <button onClick={()=>handleToggleAiProvider(p.id)} className={`w-12 h-6 rounded-full relative transition-colors ${p.status ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${p.status ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApiKeys = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">API Keys</h3>
        <button onClick={handleGenerateApiKey} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"><Plus className="w-4 h-4" /> Generate Key</button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200"><th className="p-4 font-bold">Name</th><th className="p-4 font-bold">Key</th><th className="p-4 font-bold">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {apiKeys.map(k => (
            <tr key={k.id} className="hover:bg-slate-50">
              <td className="p-4 text-slate-700">{k.name}</td>
              <td className="p-4 font-mono text-xs text-slate-500"><div className="bg-slate-100 px-2 py-1 rounded">{k.key}</div></td>
              <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">{k.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6">System Settings</h3>
        <div className="grid grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">AI Budget Cap ($)</label><input type="number" value={systemSettings.budgetCap} onChange={e=>setSystemSettings({...systemSettings, budgetCap: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg"/></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Default Credits (Users)</label><input type="number" value={systemSettings.defaultCredits} onChange={e=>setSystemSettings({...systemSettings, defaultCredits: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg"/></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      <div className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-xl z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Plane className="w-6 h-6 text-indigo-500 mr-2" /><span className="font-bold text-lg text-white">Admin Panel</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2 w-full transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h1 className="text-xl font-bold text-slate-800 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h1>
          <button onClick={onClose} className="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition border border-indigo-100">Exit Admin Mode</button>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'ai-providers' && renderAiProviders()}
          {activeTab === 'api-keys' && renderApiKeys()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsUserModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label><input type="text" value={userFormData.fullName} onChange={e => setUserFormData({...userFormData, fullName: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" required /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Email</label><input type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" required /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Username</label><input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" required /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Password</label><input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" className="px-4 py-2 rounded text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- OPTIMIZER VIEW ---
const OptimizerView = ({ currentUser, onLogout, onGoToAdmin }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isFetchingJob, setIsFetchingJob] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [settings, setSettings] = useState({ tone: "Balanced", format: "Chronological", strictness: "Balanced" });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [appError, setAppError] = useState("");
  const [appSuccess, setAppSuccess] = useState("");
  const [targetAirline, setTargetAirline] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState(null);
  const [coverLetterResult, setCoverLetterResult] = useState(null);
  const [interviewResult, setInterviewResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [isEditing, setIsEditing] = useState(false);
  const [editorCharCount, setEditorCharCount] = useState(0);
  const fileInputRef = useRef(null);
  const resumePreviewRef = useRef(null);

  useEffect(() => {
    const scriptMammoth = document.createElement('script');
    scriptMammoth.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    scriptMammoth.async = true;
    document.body.appendChild(scriptMammoth);
    const scriptPdf = document.createElement('script');
    scriptPdf.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    scriptPdf.async = true;
    document.body.appendChild(scriptPdf);
    return () => { document.body.contains(scriptMammoth) && document.body.removeChild(scriptMammoth); document.body.contains(scriptPdf) && document.body.removeChild(scriptPdf); };
  }, []);

  useEffect(() => {
    const savedResume = localStorage.getItem('ats_resumeText');
    const savedJob = localStorage.getItem('ats_jobText');
    const savedHistory = localStorage.getItem('ats_history');
    if (savedResume) setResumeText(savedResume);
    if (savedJob) setJobText(savedJob);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => { localStorage.setItem('ats_resumeText', resumeText); }, [resumeText]);
  useEffect(() => { localStorage.setItem('ats_jobText', jobText); }, [jobText]);
  useEffect(() => { localStorage.setItem('ats_history', JSON.stringify(history)); }, [history]);

  useEffect(() => {
    if(result && result.optimized_content && resumePreviewRef.current && !isEditing) {
      let content = result.optimized_content;
      resumePreviewRef.current.innerHTML = content;
      setEditorCharCount(resumePreviewRef.current.innerText.length);
    }
  }, [result, isEditing]);

  const saveToHistory = (dataResult) => {
    const newItem = { id: Date.now(), date: new Date().toISOString(), resumeText, jobText, jobUrl, result: dataResult, jobTitle: "Job Application", company: "Company", score: dataResult.score };
    setHistory(prev => [newItem, ...prev]);
  };

  const loadFromHistory = (item) => {
    setResumeText(item.resumeText); setJobText(item.jobText); setResult(item.result); setStep(3); setShowHistory(false);
  };

  const deleteHistoryItem = (id) => { setHistory(prev => prev.filter(item => item.id !== id)); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true); setAppError("");
    try { const text = await parseFile(file); setResumeText(text); }
    catch (error) { setAppError("Error parsing file: " + error.message); }
    finally { setIsParsing(false); }
  };

  const handleDownloadResume = () => {
    let content = resumePreviewRef.current?.innerHTML;
    if (!content) return;
    const sourceHTML = getDocxHtml(content, selectedTemplate);
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'Optimized_Resume.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleJobFetch = async () => {
    if (!jobUrl) return;
    setIsFetchingJob(true); setAppError(""); setJobText("");
    try { const text = await fetchJobWithGemini(jobUrl); setJobText(text); }
    catch (error) { setAppError(error.message); }
    finally { setIsFetchingJob(false); }
  };

  const runOptimization = async () => {
    if (!resumeText || !jobText) { setAppError("Please provide both resume content and job description."); return; }
    setLoading(true); setAppError(""); setResult(null); setCoverLetterResult(null); setInterviewResult(null);
    try {
      const data = await analyzeWithGemini(resumeText, jobText, settings, targetAirline);
      setResult(data); saveToHistory(data); setStep(3);
    } catch (e) { setAppError(e.message); }
    finally { setLoading(false); }
  };

  const handleGenerateCoverLetter = async () => {
    if (!result?.optimized_content || !jobText) return;
    setIsGeneratingCoverLetter(true); setAppError("");
    try {
      const currentContent = resumePreviewRef.current ? resumePreviewRef.current.innerHTML : result.optimized_content;
      const data = await generateCoverLetterWithGemini(currentContent, jobText, settings);
      setCoverLetterResult(data.cover_letter_content);
    } catch (e) { setAppError(e.message); }
    finally { setIsGeneratingCoverLetter(false); }
  };

  const handleGenerateInterview = async () => {
    if (!result?.optimized_content || !jobText) return;
    setLoading(true); setAppError("");
    try {
      const currentContent = resumePreviewRef.current ? resumePreviewRef.current.innerHTML : result.optimized_content;
      const data = await generateInterviewPrepWithGemini(currentContent, jobText);
      setInterviewResult(data.questions); setStep(4);
    } catch (e) { setAppError(e.message); }
    finally { setLoading(false); }
  };

  const handleSaveEdits = () => {
    if (resumePreviewRef.current) {
      setResult({ ...result, optimized_content: resumePreviewRef.current.innerHTML });
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative overflow-x-hidden flex flex-col">
      <HistorySidebar isOpen={showHistory} onClose={() => setShowHistory(false)} history={history} onLoad={loadFromHistory} onDelete={deleteHistoryItem} />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 h-16 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Plane className="w-5 h-5" /></div> ATSPro
        </div>
        <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
          <div className="px-4 py-1.5 text-sm font-medium text-slate-600 flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-500" /> {currentUser?.credits || 0} credits</div>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button onClick={() => setShowHistory(true)} className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-full flex items-center gap-2 transition"><History className="w-4 h-4" /> History</button>
          {currentUser?.role === 'admin' && (
            <><div className="w-px h-4 bg-slate-300 mx-1"></div><button onClick={onGoToAdmin} className="px-4 py-1.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 rounded-full flex items-center gap-2 transition"><Shield className="w-4 h-4" /> Admin</button></>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-slate-700 hidden md:block">{currentUser?.fullName || currentUser?.username}</div>
          <button onClick={onLogout} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold hover:bg-indigo-200 transition">{currentUser?.fullName?.charAt(0) || 'U'}</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {!result && step < 4 && (
          <div className="animate-fade-in space-y-8">
            {appError && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm"><AlertCircle className="w-6 h-6 shrink-0"/><span className="font-medium text-sm">{appError}</span></div>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-700"><FileText className="w-5 h-5 text-indigo-500" /> The Tailor <span className="text-xs font-normal text-slate-400 ml-2">Resume Input</span></div>
                <div className="p-6 flex flex-col flex-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload Resume (TXT, PDF, DOCX)</label>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.pdf,.docx,.doc" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isParsing} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-400 hover:bg-indigo-50 transition bg-slate-50">
                      {isParsing ? <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" /> : <Upload className="w-6 h-6 text-slate-400 mb-2" />}
                      <span className="text-sm font-medium">{isParsing ? "Extracting text..." : "Choose File or drag and drop"}</span>
                    </button>
                  </div>
                  <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or paste resume content</span><div className="flex-grow border-t border-slate-200"></div></div>
                  <textarea className="w-full flex-1 min-h-[250px] p-4 text-sm text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono bg-white shadow-inner" placeholder="Paste your resume content here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} disabled={isParsing} />
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-700"><Briefcase className="w-5 h-5 text-indigo-500" /> Job Context</div>
                <div className="p-6 flex flex-col flex-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Skip the copy-paste — fetch automatically</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Paste LinkedIn/Indeed URL" className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-slate-50" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJobFetch()} />
                      <button onClick={handleJobFetch} disabled={isFetchingJob || !jobUrl} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-6 rounded-xl text-sm font-bold transition border border-indigo-200 disabled:opacity-50">{isFetchingJob ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}</button>
                    </div>
                  </div>
                  <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or enter manually</span><div className="flex-grow border-t border-slate-200"></div></div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target ATS Profile / Airline (Optional)</label>
                    <select className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={targetAirline} onChange={(e) => setTargetAirline(e.target.value)}>
                      <option value="">Select ATS Profile...</option>
                      {Object.keys(AIRLINE_ATS_PROFILES).map(airline => (<option key={airline} value={airline}>{airline} ({AIRLINE_ATS_PROFILES[airline].system})</option>))}
                    </select>
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Job Description</label>
                    <textarea className="w-full flex-1 min-h-[160px] p-4 text-sm text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono bg-white shadow-inner" placeholder="Paste job description text here..." value={jobText} onChange={(e) => setJobText(e.target.value)} disabled={isFetchingJob} />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                  <select className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.tone} onChange={(e) => setSettings({...settings, tone: e.target.value})}>
                    <option value="Balanced">Balanced</option><option value="Formal">Formal</option><option value="Business">Business</option><option value="Corporate">Corporate</option><option value="Creative">Creative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Format Style</label>
                  <select className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.format} onChange={(e) => setSettings({...settings, format: e.target.value})}>
                    <option value="Chronological">Chronological</option><option value="Functional">Functional</option><option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-center pt-4">
              <button onClick={runOptimization} disabled={!resumeText.trim() || !jobText.trim() || loading || isFetchingJob} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-full font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 text-lg">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Activity className="w-6 h-6" />} {loading ? "Optimizing ATS Match..." : "Tailor My Resume"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            {appError && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm"><AlertCircle className="w-6 h-6 shrink-0"/><span className="font-medium text-sm">{appError}</span></div>}
            {appSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm"><CheckCircle className="w-6 h-6 shrink-0"/><span className="font-medium text-sm">{appSuccess}</span></div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="text-4xl font-extrabold text-indigo-600 mb-1">{result.score}%</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">ATS Score</div>
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-indigo-50"><div className="h-full bg-indigo-600" style={{width: `${result.score}%`}}></div></div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-extrabold text-slate-800 mb-1">{(result.matched_keywords?.length || 0) + (result.missing_keywords?.length || 0)}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Keywords Found</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="text-4xl font-extrabold text-emerald-500 mb-1">{result.matched_keywords?.length || 0}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Keywords Matched</div>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm"><MessageSquare className="w-6 h-6" /></div>
                <div><div className="font-bold text-indigo-900 text-base">Practice Interview</div><div className="text-sm text-indigo-700">Get AI-powered questions tailored to this specific optimization</div></div>
              </div>
              <button onClick={handleGenerateInterview} disabled={loading} className="w-full sm:w-auto text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Start Prep"} <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                  <button className="px-6 py-2 rounded-lg bg-white shadow-sm text-sm font-bold text-indigo-600">Resume</button>
                  <button onClick={handleGenerateCoverLetter} className="px-6 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-800 transition">{isGeneratingCoverLetter ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Cover Letter"}</button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                  <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Edit Input</button>
                  <button onClick={handleDownloadResume} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition"><FileDown className="w-4 h-4" /> Download Docx</button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Resume Template</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['professional', 'modern', 'minimal'].map(template => (
                    <div key={template} onClick={() => setSelectedTemplate(template)} className={`border-2 ${selectedTemplate === template ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'} rounded-xl p-4 cursor-pointer relative transition`}>
                      {selectedTemplate === template && <div className="absolute top-3 right-3 bg-indigo-500 rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                      <div className={`font-bold text-sm mb-1 ${selectedTemplate === template ? 'text-indigo-900' : 'text-slate-800'}`}>{template.charAt(0).toUpperCase() + template.slice(1)}</div>
                      <div className={`text-xs ${selectedTemplate === template ? 'text-indigo-600' : 'text-slate-500'}`}>{template === 'professional' ? 'Classic ATS-friendly format' : template === 'modern' ? 'Clean with subtle accents' : 'Simple and elegant flow'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-[#f3f4f6] rounded-3xl p-8 lg:p-12 flex justify-center overflow-x-auto shadow-inner border border-slate-200 relative group">
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 shadow-sm border border-slate-200 flex items-center gap-2 z-10">
                {isEditing ? <button onClick={handleSaveEdits} className="text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition"><Save className="w-3 h-3" /> Save Edits</button> : <button onClick={() => setIsEditing(true)} className="text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition"><Edit3 className="w-3 h-3" /> Live Edit</button>}
              </div>
              <div className={`w-[21cm] min-h-[29.7cm] bg-white flex-shrink-0 transition-all ${isEditing ? 'shadow-2xl ring-4 ring-indigo-100 cursor-text' : 'shadow-xl cursor-default'}`}>
                <div id="resume-preview" ref={resumePreviewRef} contentEditable={isEditing} suppressContentEditableWarning={true} className={`p-12 text-sm leading-relaxed prose prose-sm max-w-none outline-none ${selectedTemplate === 'professional' ? 'font-serif text-black' : selectedTemplate === 'modern' ? 'font-sans text-slate-800' : 'font-sans text-gray-700 font-light'}`}></div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && interviewResult && (
          <div className="animate-fade-in max-w-4xl mx-auto py-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="bg-amber-100 p-3 rounded-xl"><MessageSquare className="w-8 h-8 text-amber-600" /></div>
                <div><h2 className="text-2xl font-bold text-slate-800">Interview Prep Guide</h2><p className="text-slate-500 text-sm mt-1">Tailored Q&A based on the specific skills optimized in your resume.</p></div>
              </div>
              <div className="space-y-6">
                {interviewResult.map((item, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-800 text-lg mb-4 flex gap-3"><span className="text-indigo-600">Q{i+1}:</span> {String(item.question)}</h3>
                    <div className="bg-white p-5 rounded-lg border border-slate-200 text-slate-600 italic shadow-sm">
                      <span className="font-bold text-emerald-600 not-italic block mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> STAR Method Strategy:</span>
                      {String(item.star_answer)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end pt-6 border-t border-slate-100"><button onClick={() => setStep(3)} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition">Back to Resume</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- TOP LEVEL APP WRAPPER ---
// Helper function to get initial users
const getInitialUsers = () => {
  if (typeof window === 'undefined') return [];
  const storedUsers = localStorage.getItem('ats_users');
  if (storedUsers) return JSON.parse(storedUsers);
  const initialUsers = [{ id: 'admin-001', username: 'admin', password: 'Santafee@@@@@1972', role: 'admin', status: 'active', fullName: 'System Admin', email: 'admin@atspro.com', credits: 100 }];
  localStorage.setItem('ats_users', JSON.stringify(initialUsers));
  return initialUsers;
};

const getInitialCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const activeSession = localStorage.getItem('ats_active_user');
  return activeSession ? JSON.parse(activeSession) : null;
};

const getInitialAppView = () => {
  if (typeof window === 'undefined') return 'login';
  const activeSession = localStorage.getItem('ats_active_user');
  return activeSession ? 'optimizer' : 'login';
};

export default function App() {
  const [users, setUsers] = useState(getInitialUsers);
  const [currentUser, setCurrentUser] = useState(getInitialCurrentUser);
  const [appView, setAppView] = useState(getInitialAppView);

  useEffect(() => { if(users.length > 0) localStorage.setItem('ats_users', JSON.stringify(users)); }, [users]);

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('ats_active_user'); setAppView('login'); };

  const handleLogin = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user && user.status === 'active') { setCurrentUser(user); localStorage.setItem('ats_active_user', JSON.stringify(user)); setAppView('optimizer'); return true; }
    return false;
  };

  const handleNavigateAdmin = () => { if (currentUser?.role === 'admin') setAppView('admin'); };

  if (appView === 'login') return <LoginView onLogin={handleLogin} />;
  if (appView === 'admin' && currentUser?.role === 'admin') return <AdminDashboard currentUser={currentUser} users={users} setUsers={setUsers} onClose={() => setAppView('optimizer')} onLogout={handleLogout} />;
  return <OptimizerView currentUser={currentUser} onLogout={handleLogout} onGoToAdmin={handleNavigateAdmin} />;
}
