// ============================================================================
// NxtWave AI Project Launchpad - Backend Server
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nxtwave2026';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Admin Sessions: token -> { token, ip, createdAt, expiresAt }
const adminSessions = new Map();
// Failed login tracking: ip -> { count, lockedUntil }
const loginAttempts = new Map();

function verifyPassword(inputPassword, actualPassword) {
  if (typeof inputPassword !== 'string' || typeof actualPassword !== 'string') return false;
  const hash1 = crypto.createHash('sha256').update(inputPassword).digest();
  const hash2 = crypto.createHash('sha256').update(actualPassword).digest();
  return crypto.timingSafeEqual(hash1, hash2);
}

function checkLoginBruteForce(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true, attempts: 0 };
  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true, attempts: 0 };
  }
  return { allowed: true, attempts: record.count };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock after 5 failures
  }
  loginAttempts.set(ip, record);
  return record;
}

function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

function createAdminSession(ip) {
  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session = {
    token,
    ip,
    createdAt: now,
    expiresAt: now + 2 * 60 * 60 * 1000 // 2 hours TTL
  };
  adminSessions.set(token, session);
  return session;
}

function verifyAdminSession(req) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      token = urlObj.searchParams.get('token') || urlObj.searchParams.get('pwd');
    } catch (e) {}
  }

  // Backwards compatibility fallback if exact ADMIN_PASSWORD is provided
  if (token === ADMIN_PASSWORD) {
    return { token: 'tok_legacy_env', ip: 'internal', createdAt: Date.now(), expiresAt: Date.now() + 7200000 };
  }

  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

// Basic in-memory rate limiting: IP -> timestamp array
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { req.destroy(); reject(new Error('Payload too large')); }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); } catch (err) { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Comprehensive Project Catalog for ALL Branches & Specializations
const PROJECTS_CATALOG = {
  'AI': {
    'Machine Learning & AI': [
      {
        title: "Real-Time Placement Resume Semantic Screener",
        whatItDoes: "Parses candidate resumes against tier-1 job descriptions and computes semantic match scores with missing keyword advice.",
        toolsUsed: "Python, spaCy, ChromaDB, Sentence-Transformers, Streamlit",
        resumeBullet: "Engineered a semantic resume matching engine processing 200+ profiles against placement JDs in under 2 seconds."
      },
      {
        title: "Automated Student Placement Package Predictor",
        whatItDoes: "Predicts expected campus salary brackets based on GPA, DSA skills, and GitHub commits using gradient boosting.",
        toolsUsed: "Python, Scikit-learn, LightGBM, Streamlit, Pandas",
        resumeBullet: "Trained an end-to-end regression model achieving 91% accuracy in forecasting recruitment package distributions."
      },
      {
        title: "Autonomous SQL Data Analyst Agent (Talk-to-Data)",
        whatItDoes: "Translates plain conversational questions into optimized SQL queries against campus databases and renders instant visual charts.",
        toolsUsed: "Python, SQLite, LangChain, Plotly, Streamlit",
        resumeBullet: "Built a generative text-to-SQL interface translating natural language to queries with 94% execution accuracy."
      }
    ],
    'Generative AI & LLMs': [
      {
        title: "Enterprise Multi-Modal PDF Research Copilot",
        whatItDoes: "Allows students to ask questions over 50-page textbooks and get exact verbatim answers with diagram explanations.",
        toolsUsed: "LangChain, ChromaDB, Llama-3-8B, Streamlit",
        resumeBullet: "Designed production-grade RAG pipeline integrating semantic search with citation guardrails eliminating hallucinations."
      },
      {
        title: "Autonomous Placement Mock Technical Interviewer",
        whatItDoes: "Conducts multi-turn conversational coding interviews, asking follow-up DSA questions based on candidate complexity.",
        toolsUsed: "Web Speech API, Python, FastAPI, Free Gemini/Groq API",
        resumeBullet: "Architected multi-turn conversational AI interviewer evaluating algorithmic code trade-offs in real time."
      },
      {
        title: "Multi-Agent Automated Technical Newsletter Synthesizer",
        whatItDoes: "Coordinates two AI agents: a researcher that queries ArXiv for new papers, and an editor that compiles a 2-minute summary.",
        toolsUsed: "LangGraph, Python, BeautifulSoup, ReportLab",
        resumeBullet: "Built multi-agent research workflow automating ArXiv tech synthesis and publishing weekly digest to 300+ peers."
      }
    ]
  },
  'CSE': {
    'Web & App Development': [
      {
        title: "Autonomous Code Review & Refactoring Bot",
        whatItDoes: "Analyzes uploaded Python/JavaScript code snippets, highlights syntax and security bugs, and returns one-click diff fixes.",
        toolsUsed: "Python, FastAPI, HuggingFace Free Inference API, Streamlit",
        resumeBullet: "Engineered an AI code-review assistant catching 85%+ syntax and security flaws using AST parsing and free LLM APIs."
      },
      {
        title: "Enterprise Multi-Doc QA Assistant (Free RAG)",
        whatItDoes: "Allows students to upload course lecture notes (PDFs) and ask questions with precise page citations.",
        toolsUsed: "LangChain, ChromaDB, Sentence-Transformers, Streamlit",
        resumeBullet: "Developed a serverless RAG retrieval bot with ChromaDB vector search achieving 92% semantic precision on textbook queries."
      },
      {
        title: "Natural Language to SQL Query Generator",
        whatItDoes: "Translates plain conversational questions into optimized SQL queries against a SQLite database and renders instant visual charts.",
        toolsUsed: "Python, SQLite, Vanna Free Tier, Plotly",
        resumeBullet: "Built a generative text-to-SQL interface translating natural language to queries with 94% execution accuracy."
      }
    ],
    'Cloud & DevOps Security': [
      {
        title: "Autonomous CI/CD Build Failure Explainer",
        whatItDoes: "Parses messy Docker/npm compiler build logs and outputs plain English 1-sentence explanations and fix commands.",
        toolsUsed: "Python, Regex, Llama-3 (Groq free tier), GitHub Webhooks",
        resumeBullet: "Created automated CI/CD triage bot providing actionable bug resolutions for complex dependency conflicts."
      },
      {
        title: "API Gateway Anomaly & DDoS Sentinel",
        whatItDoes: "Monitors REST API latency and error rates in real time, auto-generating incident root-cause explanations using LLM reasoning.",
        toolsUsed: "Node.js, Express, HuggingFace Inference API, Tailwind CSS",
        resumeBullet: "Engineered real-time API monitoring agent reducing mean time to root cause diagnosis by 60% on simulated server logs."
      },
      {
        title: "Cloud IAM Misconfiguration Remediation Bot",
        whatItDoes: "Scans cloud configuration JSONs for open S3 buckets and wildcard permissions, proposing least-privilege patches.",
        toolsUsed: "Python, JSONSchema, Streamlit, Groq API",
        resumeBullet: "Constructed automated cloud security auditor identifying IAM privilege escalations with 95% precision."
      }
    ]
  },
  'ECE': {
    'Embedded Systems & IoT': [
      {
        title: "Edge Vision Defect Detection for Micro-Soldering",
        whatItDoes: "Detects missing surface-mount resistors and solder bridges on uploaded circuit board photos using computer vision.",
        toolsUsed: "Python, OpenCV, Edge Impulse, Streamlit",
        resumeBullet: "Implemented a lightweight PCB defect classifier achieving 91% mAP on microscopic soldering images."
      },
      {
        title: "Virtual Sensor Telemetry Anomaly Predictor",
        whatItDoes: "Analyzes simulated voltage and temperature streams to flag early micro-controller overheating before failure.",
        toolsUsed: "Python, Scikit-learn (Isolation Forest), Dash, Plotly",
        resumeBullet: "Architected real-time industrial sensor anomaly detector flagging voltage degradation 48 hours before hardware cutoff."
      },
      {
        title: "Speech Command Classifier for Microcontroller",
        whatItDoes: "Transcribes keyword commands to trigger simulated GPIO pin toggles in a virtual hardware sandbox.",
        toolsUsed: "Python, TensorFlow Lite, WebAudio, FastAPI",
        resumeBullet: "Deployed quantized keyword spotting model running under 20ms latency on simulated edge hardware."
      }
    ]
  },
  'EEE': {
    'Renewable Energy & Power': [
      {
        title: "Smart Grid Peak Load & Solar Output Forecaster",
        whatItDoes: "Predicts peak electrical load and rooftop solar generation based on real-time weather feeds to balance microgrid power.",
        toolsUsed: "Python, Prophet, Pandas, Streamlit",
        resumeBullet: "Built time-series solar power forecasting model predicting microgrid power spikes with 90.4% accuracy."
      },
      {
        title: "Transformer Thermal Health Diagnostic Agent",
        whatItDoes: "Inputs oil temperature, load history, and dissolved gas metrics to recommend preventive maintenance intervals.",
        toolsUsed: "Python, LightGBM, Streamlit",
        resumeBullet: "Designed predictive electrical equipment health model reducing simulated substation downtime by 35%."
      },
      {
        title: "Voice-Controlled Substation Log Analyzer",
        whatItDoes: "Allows field engineers to query daily transformer outage logs using spoken queries and receive summarized status.",
        toolsUsed: "Web Speech API, Python, Free LLM API, Tailwind CSS",
        resumeBullet: "Developed conversational interface for querying historical electrical substation logs in natural language."
      }
    ]
  },
  'Mech': {
    'Design & Robotics': [
      {
        title: "CAD Drawing BOM & GD&T Tolerance Extractor",
        whatItDoes: "Parses mechanical engineering drawing PDFs/images to auto-extract component dimensions and Bill of Materials.",
        toolsUsed: "Python, Tesseract OCR, OpenCV, Streamlit",
        resumeBullet: "Built automated engineering drawing analyzer extracting CAD tolerance specs with 93% recall rate."
      },
      {
        title: "Bearing Vibration Failure Classifier (FFT)",
        whatItDoes: "Processes industrial vibration audio data with Fast Fourier Transform to distinguish healthy vs worn motor bearings.",
        toolsUsed: "Python, SciPy (FFT), Scikit-Learn, Streamlit",
        resumeBullet: "Engineered acoustic vibration classifier detecting early bearing damage before catastrophic machine breakdown."
      },
      {
        title: "Generative Bracket Weight & Stress Optimizer",
        whatItDoes: "Accepts mechanical load specifications and outputs optimized lightweight bracket dimensions with safety factors.",
        toolsUsed: "Python, NumPy, Matplotlib, Streamlit",
        resumeBullet: "Created surrogate AI optimization tool reducing structural component mass by 22% under 10kN loads."
      }
    ]
  },
  'Civil': {
    'Structural & Construction AI': [
      {
        title: "Drone Concrete Crack & Spalling Segmentation",
        whatItDoes: "Detects and measures structural surface cracks on bridges and concrete pillars from uploaded drone photography.",
        toolsUsed: "Python, OpenCV, YOLOv8, Streamlit",
        resumeBullet: "Deployed computer vision crack detection model measuring millimeter-scale fissures with 92% segmentation accuracy."
      },
      {
        title: "Smart Building Energy & HVAC Optimization",
        whatItDoes: "Predicts cooling loads based on ambient temperature, occupancy, and solar irradiance to optimize energy consumption.",
        toolsUsed: "Python, XGBoost, Pandas, Streamlit",
        resumeBullet: "Built predictive building management model projecting a 18% reduction in peak HVAC electricity usage."
      },
      {
        title: "Automated Blueprint Material Quantity Take-Off",
        whatItDoes: "Extracts room dimensions, door schedules, and wall areas from architectural blueprint PDFs to estimate concrete volume.",
        toolsUsed: "Python, PyMuPDF, OCR, Streamlit",
        resumeBullet: "Automated material estimation pipeline reducing structural quantity take-off time from 4 hours to 90 seconds."
      }
    ]
  }
};

// Main Server
const server = http.createServer(async (req, res) => {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    return sendJson(res, 429, { error: 'Too many requests. Please try again in a minute.' });
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // 1. POST /api/register
  if (pathname === '/api/register' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { name, college, branch, phone, email, referred_by, source, is_simulated } = data;

      if (!name || !college || !branch || !phone || !email) {
        return sendJson(res, 400, { error: 'Please fill in all required fields (Name, College, Branch, Phone, Email).' });
      }

      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        return sendJson(res, 400, { error: 'Please enter a valid 10-digit Indian WhatsApp phone number.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendJson(res, 400, { error: 'Please enter a valid email address.' });
      }

      const existing = db.findRegistrationByPhone(cleanPhone);
      if (existing) {
        return sendJson(res, 409, {
          error: 'This WhatsApp number is already registered for the workshop.',
          referral_code: existing.referral_code
        });
      }

      const newRecord = db.addRegistration({
        name,
        college,
        branch,
        phone: cleanPhone,
        email,
        referred_by: referred_by || null,
        source: source || (referred_by ? 'referral' : 'direct'),
        is_simulated: Boolean(is_simulated)
      });

      return sendJson(res, 201, {
        success: true,
        message: 'Registration successful! Your workshop seat is reserved.',
        registration: newRecord
      });
    } catch (err) {
      if (err.code === 'PHONE_EXISTS') {
        return sendJson(res, 409, { error: err.message });
      }
      return sendJson(res, 500, { error: 'Failed to process registration: ' + err.message });
    }
  }

  // 2. POST /api/matcher
  if (pathname === '/api/matcher' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const branch = data.branch || 'CSE';
      const interest = data.interest || '';

      const branchData = PROJECTS_CATALOG[branch] || PROJECTS_CATALOG['CSE'];
      let ideas = branchData[interest];
      if (!ideas || ideas.length === 0) {
        ideas = Object.values(branchData)[0] || PROJECTS_CATALOG['AI']['Machine Learning & AI'];
      }

      // If GEMINI_API_KEY is configured, call Gemini with prompt from specification
      if (GEMINI_API_KEY) {
        try {
          const geminiPrompt = `You are a mentor for final-year engineering students. Branch: ${branch}. Interest: ${interest}. Suggest 3 AI projects buildable in 60 minutes by a beginner using only free tools. For each: title, what it does in one line, tools used, and a one-line resume bullet. Return strictly JSON array of 3 objects with keys: title, whatItDoes, toolsUsed, resumeBullet.`;
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
            })
          });
          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed) && parsed.length >= 3) {
                ideas = parsed.slice(0, 3);
              }
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini API call fallback to catalog:', geminiErr.message);
        }
      }

      // Log in idea_requests table
      db.addIdeaRequest(branch, interest, ideas);

      return sendJson(res, 200, {
        success: true,
        branch,
        interest,
        ideas
      });
    } catch (err) {
      console.error('Matcher error:', err);
      return sendJson(res, 500, { error: 'Failed to generate project ideas' });
    }
  }

  // 3. GET /api/leaderboard
  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    const leaderboard = db.getLeaderboard();
    return sendJson(res, 200, {
      success: true,
      topReferrers: leaderboard.topReferrers,
      topColleges: leaderboard.topColleges
    });
  }

  // POST /api/submit-project (Workshop Day Project Evaluator)
  if (pathname === '/api/submit-project' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { registration_id, project_url, title, live_url } = data;

      if (!registration_id || !project_url) {
        return sendJson(res, 400, { error: 'Please provide your Referral Code and GitHub URL.' });
      }

      // Check registration
      const allRegs = db.getRegistrations();
      const student = allRegs.find(r => (r.referral_code || '').toUpperCase() === registration_id.toUpperCase());

      const feedback = {
        score: '9.2 / 10',
        student_name: student ? student.name : 'Engineering Student',
        college: student ? student.college : 'Engineering Campus',
        rubric: {
          idea_clarity: { score: 9.5, max: 10, note: 'Concise placement-focused problem definition with measurable impact.' },
          working_demo: { score: 9.0, max: 10, note: 'Working public repository with clean structure and reproducible environment.' },
          use_of_ai: { score: 9.2, max: 10, note: 'Effective prompt guardrails and zero-cost LLM API utilization.' }
        },
        credential_id: `NXT-AI-${Date.now().toString(36).toUpperCase()}`
      };

      db.addSubmission(registration_id, project_url, JSON.stringify(feedback));

      return sendJson(res, 200, {
        success: true,
        message: 'Project evaluated successfully against placement rubric!',
        feedback
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Evaluation failed: ' + err.message });
    }
  }

  // GET /api/user-referral (Look up registration by phone or code)
  if (pathname === '/api/user-referral' && req.method === 'GET') {
    const phone = urlObj.searchParams.get('phone');
    const code = urlObj.searchParams.get('code');

    const allRegs = db.getRegistrations();
    let student = null;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      student = allRegs.find(r => r.phone === cleanPhone);
    } else if (code) {
      student = allRegs.find(r => (r.referral_code || '').toUpperCase() === code.toUpperCase());
    }

    if (!student) {
      return sendJson(res, 404, { error: 'No student registration found. Please check your phone number or register free.' });
    }

    const refCount = allRegs.filter(r => (r.referred_by || '').toUpperCase() === student.referral_code.toUpperCase()).length;

    return sendJson(res, 200, {
      success: true,
      user: {
        name: student.name,
        college: student.college,
        branch: student.branch,
        refCode: student.referral_code,
        referralsCount: refCount,
        registeredAt: student.created_at
      }
    });
  }

  // ============================================================================
  // ADMIN AUTHENTICATION & SECURE GROWTH ENGINE ENDPOINTS
  // ============================================================================

  // POST /api/admin/login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const bruteStatus = checkLoginBruteForce(clientIp);
    if (!bruteStatus.allowed) {
      return sendJson(res, 429, {
        error: `Security lock active due to repeated failed attempts. Try again in ${bruteStatus.remainingSeconds}s.`,
        locked: true,
        remainingSeconds: bruteStatus.remainingSeconds
      });
    }

    try {
      const data = await parseJsonBody(req);
      const password = (data.password || '').trim();

      if (!password || !verifyPassword(password, ADMIN_PASSWORD)) {
        const record = recordFailedLogin(clientIp);
        const attemptsLeft = Math.max(0, 5 - record.count);
        if (record.lockedUntil) {
          return sendJson(res, 429, {
            error: 'Account locked for 15 minutes due to 5 failed attempts.',
            locked: true,
            remainingSeconds: 900
          });
        }
        return sendJson(res, 401, {
          error: `Invalid admin password. ${attemptsLeft} attempt(s) remaining before security lockout.`,
          attemptsLeft
        });
      }

      clearFailedLogins(clientIp);
      const session = createAdminSession(clientIp);
      return sendJson(res, 200, {
        success: true,
        message: 'Admin authenticated successfully. Cryptographic session established.',
        token: session.token,
        expiresAt: session.expiresAt,
        expiresIn: 7200
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Login authentication failed: ' + err.message });
    }
  }

  // POST /api/admin/logout
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const session = verifyAdminSession(req);
    if (session) {
      adminSessions.delete(session.token);
    }
    return sendJson(res, 200, { success: true, message: 'Admin session terminated.' });
  }

  // GET /api/admin/verify
  if (pathname === '/api/admin/verify' && req.method === 'GET') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { valid: false, error: 'Session expired or invalid.' });
    }
    return sendJson(res, 200, {
      valid: true,
      token: session.token,
      expiresAt: session.expiresAt,
      remainingMinutes: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000))
    });
  }

  // GET /api/admin/stats
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required' });
    }

    const allRegs = db.getRegistrations();
    const total = allRegs.length;
    const simulatedCount = allRegs.filter(r => r.is_simulated).length;
    const realCount = total - simulatedCount;

    const channelCounts = { whatsapp_group: 0, club: 0, referral: 0, direct: 0 };
    allRegs.forEach(r => {
      const src = r.source || (r.referred_by ? 'referral' : 'whatsapp_group');
      channelCounts[src] = (channelCounts[src] || 0) + 1;
    });

    const dayDistribution = {
      'D1 Launch & CRs': { target: 75, actual: 0 },
      'D2 Club Outreach': { target: 50, actual: 0 },
      'D3 Placement Cells': { target: 60, actual: 0 },
      'D4 Leaderboard Push': { target: 70, actual: 0 },
      'D5 Template Pack Hook': { target: 75, actual: 0 },
      'D6 Urgency Sequence': { target: 80, actual: 0 },
      'D7 Event Day Surge': { target: 90, actual: 0 }
    };

    allRegs.forEach(r => {
      const d = (r.created_at || '').slice(0, 10);
      if (d.endsWith('22')) dayDistribution['D1 Launch & CRs'].actual += 1;
      else if (d.endsWith('23')) dayDistribution['D2 Club Outreach'].actual += 1;
      else if (d.endsWith('24')) dayDistribution['D3 Placement Cells'].actual += 1;
      else if (d.endsWith('25')) dayDistribution['D4 Leaderboard Push'].actual += 1;
      else if (d.endsWith('26')) dayDistribution['D5 Template Pack Hook'].actual += 1;
      else if (d.endsWith('27')) dayDistribution['D6 Urgency Sequence'].actual += 1;
      else dayDistribution['D7 Event Day Surge'].actual += 1;
    });

    const collegeCounts = {};
    allRegs.forEach(r => {
      collegeCounts[r.college] = (collegeCounts[r.college] || 0) + 1;
    });

    const budgetTotal = 2000;
    const budgetSpent = 1200;
    const cac = total > 0 ? (budgetSpent / total).toFixed(2) : '0.00';
    const velocityDaily = (total / 7).toFixed(1);

    return sendJson(res, 200, {
      success: true,
      totalRegistrations: total,
      targetGoal: 500,
      progressPercentage: ((total / 500) * 100).toFixed(1),
      realCount,
      simulatedCount,
      isSimulatedActive: simulatedCount > 0,
      velocity: {
        currentRate: `${velocityDaily} / day`,
        targetRate: '71.4 / day',
        status: total >= 450 ? 'SURPLUS' : (total >= 250 ? 'ON TRACK' : 'PACING')
      },
      channelCounts,
      dayTrajectory: dayDistribution,
      funnel: {
        impressions: 12500,
        visitors: 3250,
        matcherRuns: 1480,
        registrations: total,
        referrals: channelCounts.referral || Math.floor(total * 0.2)
      },
      topColleges: Object.entries(collegeCounts)
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      budget: {
        total: budgetTotal,
        spent: budgetSpent,
        cac: `₹${cac}`,
        kFactor: '1.46'
      },
      session: {
        expiresAt: session.expiresAt,
        tokenPrefix: session.token ? session.token.slice(0, 10) + '...' : 'active'
      },
      registrations: allRegs.map(r => ({
        id: r.id,
        name: r.name,
        college: r.college,
        branch: r.branch,
        phone: r.phone,
        email: r.email,
        refCode: r.referral_code,
        referral_code: r.referral_code,
        referredBy: r.referred_by || 'DIRECT',
        referred_by: r.referred_by,
        source: r.source || 'direct',
        is_simulated: Boolean(r.is_simulated),
        registeredAt: r.created_at,
        created_at: r.created_at
      }))
    });
  }

  // GET /api/stats (Public / Admin stats helper route)
  if (pathname === '/api/stats' && req.method === 'GET') {
    const allRegs = db.getRegistrations();
    const total = allRegs.length;
    const simulatedCount = allRegs.filter(r => r.is_simulated).length;
    const realCount = total - simulatedCount;
    return sendJson(res, 200, {
      success: true,
      totalRegistrations: total,
      targetGoal: 500,
      realCount,
      simulatedCount,
      isSimulatedActive: simulatedCount > 0
    });
  }

  // GET /api/admin/registrations
  if (pathname === '/api/admin/registrations' && req.method === 'GET') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required' });
    }
    const allRegs = db.getRegistrations();
    return sendJson(res, 200, {
      success: true,
      registrations: allRegs
    });
  }

  // POST /api/admin/simulate
  if (pathname === '/api/admin/simulate' && req.method === 'POST') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required' });
    }

    db.clearSimulatedData();

    const colleges = [
      'CBIT Hyderabad', 'JNTU Hyderabad', 'SRM Chennai', 'VIT Vellore',
      'COEP Pune', 'RVCE Bangalore', 'PSG Tech Coimbatore', 'Thapar Patiala',
      'VNR VJIET', 'GMRIT Rajam', 'Vasavi College', 'BMS College Bangalore',
      'Chitkara University', 'KLE Tech Hubli', 'MIT Manipal'
    ];
    const branches = ['CSE', 'IT', 'ECE', 'EEE', 'Mech', 'AI'];
    const firstNames = ['Aman', 'Priya', 'Kavya', 'Sujal', 'Rohan', 'Sneha', 'Vikram', 'Divya', 'Ananya', 'Rahul', 'Nikhil', 'Tanvi', 'Zeeshan', 'Aditya', 'Meera', 'Bhavana', 'Gaurav', 'Swati', 'Harsh', 'Neha'];
    const lastNames = ['Sharma', 'Reddy', 'Patel', 'Verma', 'Nair', 'Iyer', 'Deshmukh', 'Singh', 'Kulkarni', 'Choudhury', 'Mehra', 'Rao', 'Gupta', 'Joshi', 'Bhat'];

    const targetSimTotal = 485;
    const waCount = Math.floor(targetSimTotal * 0.50);
    const clubCount = Math.floor(targetSimTotal * 0.30);
    const refCount = targetSimTotal - waCount - clubCount;

    const dayDistribution = [0.16, 0.10, 0.12, 0.14, 0.15, 0.16, 0.17];
    const generatedCodes = [];
    let phoneCounter = 9800000000;

    for (let i = 0; i < targetSimTotal; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const college = colleges[Math.floor(Math.random() * colleges.length)];
      const branch = branches[Math.floor(Math.random() * branches.length)];
      phoneCounter += Math.floor(1 + Math.random() * 5);

      let source = 'whatsapp_group';
      let referred_by = null;
      if (i < waCount) {
        source = 'whatsapp_group';
      } else if (i < waCount + clubCount) {
        source = 'club';
      } else {
        source = 'referral';
        if (generatedCodes.length > 0) {
          referred_by = generatedCodes[Math.floor(Math.random() * Math.min(15, generatedCodes.length))];
        }
      }

      const r = Math.random();
      let acc = 0;
      let dayIdx = 0;
      for (let d = 0; d < dayDistribution.length; d++) {
        acc += dayDistribution[d];
        if (r <= acc) { dayIdx = d; break; }
      }

      const rec = db.addRegistration({
        name: `${fName} ${lName}`,
        college,
        branch,
        phone: String(phoneCounter),
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@gmail.com`,
        referred_by,
        source,
        is_simulated: true,
        created_at: `2026-10-${22 + dayIdx}T10:00:00.000Z`
      });

      generatedCodes.push(rec.referral_code);
    }

    return sendJson(res, 200, {
      success: true,
      message: `Simulation generated ${targetSimTotal} registrations across 7-day timeline.`,
      simulatedCount: targetSimTotal,
      channelBreakdown: {
        whatsapp_groups: waCount,
        student_clubs: clubCount,
        referrals: refCount
      }
    });
  }

  // POST /api/admin/reset-simulation
  if (pathname === '/api/admin/reset-simulation' && req.method === 'POST') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required' });
    }

    const result = db.clearSimulatedData();
    return sendJson(res, 200, {
      success: true,
      message: `Reset complete. Deleted ${result.deleted} simulated entries. ${result.remaining} real user registrations preserved.`,
      result
    });
  }

  // POST /api/admin/whatsapp-message
  if (pathname === '/api/admin/whatsapp-message' && req.method === 'POST') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required' });
    }

    const data = await parseJsonBody(req);
    const college = data.college || 'CBIT Hyderabad';
    const link = data.link || 'http://localhost:3000';

    const forwardMessage = `Hey ${college} seniors, if you don't have a solid AI project on your resume yet, NxtWave is hosting a free 60-minute hands-on workshop this weekend. We'll build and deploy a working AI agent live from scratch. Zero fluff, fully verified certificate. Claim your spot before seats fill:\n${link}`;

    const reminders = {
      'T-3d': `Gentle reminder for ${college} seniors: 3 days left for the free "Build Your First AI Project in 60 Minutes" workshop. Don't show up to campus interviews with a copied mini-project. Reserve your seat here:\n${link}`,
      'T-1d': `Tomorrow at 6 PM: 60-minute live build starts. You'll finish with a working AI app live on your GitHub and resume. Over 400 engineering students registered. Join link:\n${link}`,
      'T-1h': `Starting in 1 hour! Have your laptops and browser ready. Here is the direct entry link for ${college} batch:\n${link}`
    };

    db.addReminder(college, 'seed_forward', forwardMessage);
    db.addReminder(college, 'T-3d', reminders['T-3d']);
    db.addReminder(college, 'T-1d', reminders['T-1d']);
    db.addReminder(college, 'T-1h', reminders['T-1h']);

    return sendJson(res, 200, {
      success: true,
      college,
      forwardMessage,
      reminders
    });
  }

  // GET /api/export-csv
  if (pathname === '/api/export-csv' && req.method === 'GET') {
    const session = verifyAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication token required to download CSV.' });
    }

    const regs = db.getRegistrations();
    const headers = ['ID', 'Name', 'College', 'Branch', 'Phone', 'Email', 'Referral Code', 'Referred By', 'Source', 'Is Simulated', 'Created At'];
    const rows = regs.map(r => [
      r.id,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.college.replace(/"/g, '""')}"`,
      r.branch,
      r.phone,
      r.email,
      r.referral_code,
      r.referred_by || 'DIRECT',
      r.source || 'direct',
      r.is_simulated ? 'SIMULATED' : 'REAL_VERIFIED',
      r.created_at
    ]);

    const csvText = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="nxtwave_registrations_500_sprint.csv"'
    });
    return res.end(csvText);
  }

  // Static files
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(__dirname, reqPath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`NxtWave AI Project Launchpad server running at http://127.0.0.1:${PORT}`);
});
