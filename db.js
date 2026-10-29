// ============================================================================
// NxtWave AI Project Launchpad - Database Module
// Schema: registrations, idea_requests, reminders, submissions
// ============================================================================

const fs = require('fs');
const path = require('path');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const DATA_DIR = isServerless ? '/tmp' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BUNDLED_DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Filesystem read-only, using memory mode:', e.message);
}

// Initial Database Structure
const INITIAL_DB = {
  registrations: [],
  idea_requests: [],
  reminders: [],
  submissions: []
};

class Database {
  constructor() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DB));
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        return;
      }
      if (fs.existsSync(BUNDLED_DB_FILE)) {
        const raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        this.save();
        return;
      }
      this.data = JSON.parse(JSON.stringify(INITIAL_DB));
      this.save();
    } catch (err) {
      console.warn('Database load warning, using in-memory state:', err.message);
      if (fs.existsSync(BUNDLED_DB_FILE)) {
        try {
          this.data = JSON.parse(fs.readFileSync(BUNDLED_DB_FILE, 'utf8'));
        } catch (e) {}
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      // In serverless read-only mode, memory is maintained
      console.warn('Filesystem save skipped (memory maintained):', err.message);
    }
  }

  // --- REGISTRATIONS TABLE ---
  /*
    Schema:
    id: string
    name: string
    college: string
    branch: string
    phone: string (UNIQUE)
    email: string
    referral_code: string (UNIQUE 6-char e.g. NW7K2P)
    referred_by: string | null
    source: string | null (e.g. 'whatsapp_group', 'club', 'referral', 'instagram')
    is_simulated: boolean (DEFAULT false)
    created_at: ISO timestamp
  */
  getRegistrations(filter = {}) {
    let list = this.data.registrations;
    if (filter.is_simulated !== undefined) {
      list = list.filter(r => r.is_simulated === filter.is_simulated);
    }
    if (filter.branch) {
      list = list.filter(r => r.branch === filter.branch);
    }
    if (filter.college) {
      list = list.filter(r => r.college === filter.college);
    }
    return list;
  }

  findRegistrationByPhone(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    return this.data.registrations.find(r => r.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone);
  }

  findRegistrationByCode(code) {
    if (!code) return null;
    return this.data.registrations.find(r => r.referral_code.toUpperCase() === code.toUpperCase());
  }

  addRegistration(record) {
    const cleanPhone = record.phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Invalid phone number: must be 10 digits');
    }

    if (this.findRegistrationByPhone(cleanPhone)) {
      const err = new Error('This phone number is already registered for the workshop.');
      err.code = 'PHONE_EXISTS';
      throw err;
    }

    // Ensure unique 6-character referral code (e.g. NW + 4 alphanum)
    let code = record.referral_code;
    if (!code) {
      code = this.generateUniqueReferralCode();
    }

    const newRecord = {
      id: record.id || `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: record.name.trim(),
      college: record.college.trim(),
      branch: record.branch,
      phone: cleanPhone,
      email: record.email.trim().toLowerCase(),
      referral_code: code,
      referred_by: record.referred_by ? record.referred_by.trim().toUpperCase() : null,
      source: record.source || (record.referred_by ? 'referral' : 'whatsapp_group'),
      is_simulated: Boolean(record.is_simulated),
      created_at: record.created_at || new Date().toISOString()
    };

    this.data.registrations.push(newRecord);
    this.save();
    return newRecord;
  }

  generateUniqueReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let exists = true;
    while (exists) {
      code = 'NW';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      exists = !!this.findRegistrationByCode(code);
    }
    return code; // Exact 6 characters, e.g. NW4K9A
  }

  // --- IDEA REQUESTS TABLE ---
  /*
    Schema:
    id: string
    branch: string
    interest: string
    ideas_json: string (JSON string of 3 ideas)
    created_at: ISO timestamp
  */
  addIdeaRequest(branch, interest, ideas) {
    const record = {
      id: `IDEA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      branch,
      interest,
      ideas_json: typeof ideas === 'string' ? ideas : JSON.stringify(ideas),
      created_at: new Date().toISOString()
    };
    this.data.idea_requests.push(record);
    this.save();
    return record;
  }

  // --- REMINDERS TABLE ---
  /*
    Schema:
    id: string
    college: string
    message_type: string ('seed_forward', 'T-3d', 'T-1d', 'T-1h')
    message_text: string
    created_at: ISO timestamp
  */
  addReminder(college, message_type, message_text) {
    const record = {
      id: `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      college,
      message_type,
      message_text,
      created_at: new Date().toISOString()
    };
    this.data.reminders.push(record);
    this.save();
    return record;
  }

  getReminders(college = null) {
    if (!college) return this.data.reminders;
    return this.data.reminders.filter(r => r.college.toLowerCase() === college.toLowerCase());
  }

  // --- SUBMISSIONS TABLE (Phase 5) ---
  /*
    Schema:
    id: string
    registration_id: string
    project_url: string
    ai_feedback: string
    created_at: ISO timestamp
  */
  addSubmission(registration_id, project_url, ai_feedback) {
    const record = {
      id: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registration_id,
      project_url,
      ai_feedback,
      created_at: new Date().toISOString()
    };
    this.data.submissions.push(record);
    this.save();
    return record;
  }

  getSubmissions() {
    return this.data.submissions;
  }

  // --- LEADERBOARD COMPUTATION ---
  getLeaderboard() {
    // 1. Top Referrers
    const referralMap = {};
    // Seed with all registered students so even 0 referrals appear
    this.data.registrations.forEach(r => {
      referralMap[r.referral_code] = {
        name: r.name,
        college: r.college,
        branch: r.branch,
        referral_code: r.referral_code,
        referrals_count: 0
      };
    });

    // Count referrals
    this.data.registrations.forEach(r => {
      if (r.referred_by && referralMap[r.referred_by]) {
        referralMap[r.referred_by].referrals_count += 1;
      }
    });

    const topReferrers = Object.values(referralMap)
      .sort((a, b) => b.referrals_count - a.referrals_count)
      .slice(0, 10);

    // 2. Top Colleges
    const collegeMap = {};
    this.data.registrations.forEach(r => {
      if (!r.college) return;
      collegeMap[r.college] = (collegeMap[r.college] || 0) + 1;
    });

    const topColleges = Object.entries(collegeMap)
      .map(([college, count]) => ({ college, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topReferrers, topColleges };
  }

  // --- SIMULATION MANAGEMENT ---
  clearSimulatedData() {
    const beforeCount = this.data.registrations.length;
    this.data.registrations = this.data.registrations.filter(r => !r.is_simulated);
    this.save();
    return {
      deleted: beforeCount - this.data.registrations.length,
      remaining: this.data.registrations.length
    };
  }
}

const db = new Database();
module.exports = db;

