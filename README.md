# NxtWave AI Project Launchpad
### "Build Your First AI Project in 60 Minutes" — Growth & Referral Engine

> **Official Campaign & Interview Submission:** See [SUBMISSION.md](file:///d:/Sujalsai/nxtwave/assignment/SUBMISSION.md) for the 5-Slide Growth Plan, AI Learning Notes, 3-Minute Video Script, and Evaluation Answers.
> 
> **Campaign Goal:** 500 registrations from final-year engineering students (Batch 2025/2026) in 7 days.  
> **Budget:** ₹2,000 (Target CAC: ≤ ₹4.00 per registration).  
> **Primary Growth Vector:** K > 1.4 Viral Referral Loop & Campus Seeding.

---

## 1. Growth Strategy & Channel Architecture

Final-year B.Tech / BE engineering students in Tier-2/3 colleges face severe placement anxiety and often lack distinctive, non-trivial projects on their resumes. This campaign gives them an irresistible, concrete outcome: **"Walk out with a working, deployed AI agent on your resume in 60 minutes."**

### Acquisition Channel Mix

| Channel | Share | Target Registrations | Tactical Execution |
| :--- | :--- | :--- | :--- |
| **College WhatsApp Groups & CRs** | **50%** | **250** | Seeded with a ready-made, senior-toned forward message + personal referral link |
| **Student Clubs / Coding Clubs** | **30%** | **150** | Outreached via LinkedIn / IG DMs with an inter-college "Club Leaderboard" bounty |
| **Peer Referral Loop** | **20%** | **100** | Post-registration share screen: *"Invite 3 friends, unlock the GitHub Template Pack"* |
| **Total** | **100%** | **500** | **Blended CAC: ₹2.47** (well under ₹4.00 limit) |

### Budget Allocation (₹2,000 Total)
- **₹1,000:** Grand prizes for top 3 campus referrers (vouchers/recharges).
- **₹500:** Domain and server infrastructure reserve.
- **₹300:** Micro-boost on Instagram reels for initial seed spark.
- **₹200:** Emergency contingency reserve.

---

## 2. Core Working Modules

### 1. High-Converting Landing Page
- **Hero & Outcome Promise:** Targeted directly at final-year engineers fearing resume rejection.
- **Scarcity & Urgency:** Real-time seat counter (`38 seats remaining`) and 7-day sprint countdown clock.
- **3-Line Practical Agenda:**
  - `00–15m`: Why recruiters reject basic CRUD apps; free tools setup.
  - `15–45m`: Live Build: Code and deploy an intelligent AI agent from scratch.
  - `45–60m`: Placement Playbook: STAR resume bullets & interview trade-off tactics.
- **Interactive FAQ Accordion:** Answers common student objections (zero prerequisites, 100% free guarantee, verified certificate, non-CSE eligibility).
- **Sticky Mobile Registration Bar:** 1-tap quick action for mobile traffic.

### 2. AI Project Idea Matcher
- Tailored for 6 engineering streams: **CSE/IT, AI & Data Science, ECE, EEE, Mechanical, Civil**.
- Select branch and specialization focus to instantly render 3 beginner-friendly, 60-minute buildable capstone projects.
- Each idea provides:
  - Exact **STAR-method resume bullet point** with quantifiable metrics.
  - Free tech stack list (`Python`, `LangChain`, `ChromaDB`, `FastAPI`, `Streamlit`).
  - 1-Click **"Register To Build This One"** CTA that pre-fills the registration form and scrolls directly to it.

### 3. Student Referral Hub & Unique 6-Char Code
- Automatically generates a unique 6-character referral code (e.g. `NW7K2P`) and shareable URL (`?ref=CODE`).
- **1-Tap WhatsApp Share:** Pre-filled with peer-toned copy designed for college batch groups.
- **Milestone Reward Progression:**
  - `1 Referral`: Generative AI Cheatsheet & Prompt Bible (Unlocked).
  - `3 Referrals`: Production GitHub Template Pack & Architecture Boilerplate.
  - `5 Referrals`: VIP Pass: 1-on-1 AI Resume Review with Senior NxtWave Mentors.

### 4. Dual-View Live Leaderboard
- **Top 10 Student Referrers:** Podium for Top 3 with Gold, Silver, Bronze badges and rank progression.
- **Top 10 Engineering Colleges:** Ranks colleges by total signups (CBIT, VIT, SRM, JNTUH, COEP) to spark inter-college rivalry.
- **10-Second Auto-Sync:** Live updates via background polling against `/api/leaderboard`.

### 5. Secure Executive Admin Cockpit (Password: `nxtwave2026`)
- **Cryptographic Session Authentication:**
  - Authenticated via `POST /api/admin/login` using timing-safe password evaluation (`crypto.timingSafeEqual`).
  - Issues 64-character hex session tokens (`Bearer tok_...`) stored in `sessionStorage` with a 2-hour TTL.
  - **Brute-Force Shield:** Automatic IP rate-limiting locks the gateway for 15 minutes after 5 consecutive failed attempts.
  - One-click session termination (`Lock Cockpit`) with token revocation.
- **500 Goal Velocity & Unit Economics:**
  - Radial/horizontal visual progress bar to 500 registrations.
  - Dual count badges: **Verified Organic Students** vs **Simulated Test Leads**.
  - Daily run-rate velocity calculator (required rate: 71.4 leads/day vs actual).
  - Unit CAC tracker (Target: ≤ ₹4.00, Current: ₹2.47).
- **7-Day Sprint Trajectory Timeline Chart:**
  - Interactive visual bar chart displaying Day 1 through Day 7 (Launch spike, CR forwards, Club outreach, Placement cells, Mid-sprint push, Urgency sequence, Event day surge).
  - Compares planned daily sprint targets against actual/simulated volume.
- **Growth Funnel Pipeline Visualizer:**
  - 5-stage conversion funnel: Impressions (12,500) → Landing Page Visitors (3,250 / 26%) → AI Idea Matcher Runs (1,480 / 45.5%) → Registrations → Viral Referrals.
- **Channel Attribution Mix:**
  - Live progress meters for WhatsApp Groups (50% / 250), Student Clubs (30% / 150), and Referral Loops (20% / 100).
- **Simulation Mode Console:**
  - Generates 485 simulated registrations across a realistic 7-day timeline.
  - High-visibility animated **`SIMULATED DATA ACTIVE`** badge in the cockpit header.
  - One-click **"Reset Sim"** button to instantly wipe synthetic records while safely preserving all real student registrations.
- **WhatsApp Forward & Reminder Copy Suite:**
  - Select any college to generate localized, senior-toned copy (< 60 words, 0-1 emoji, senior tone).
  - Generates full sequence: **Initial Forward**, **T-3 Days**, **T-1 Day**, **T-1 Hour**.
  - **Strictly Copy Text Only:** Includes a 1-click **"Copy Text"** button and never sends messages automatically.
- **Registrations Table & CSV Export:**
  - Filter by record type (Verified Organic Only vs Simulated), search by name, college, or phone, and download raw CSV reports with Bearer token authentication.

### 6. Workshop-Day Tools
- **Live Audience Poll:** Interactive barrier diagnostic with live vote percentage animations.
- **Project Submission & AI Rubric Evaluator:** Submits GitHub and demo links, evaluates against a 3-point rubric (Idea Clarity, Working Demo, Use of AI), and issues a verified NxtWave credential.

---

## 3. Tech Stack & Architecture

- **Frontend:** HTML5, Tailwind CSS (via CDN), Lucide Icons, Canvas Confetti, JetBrains Mono & Plus Jakarta Sans typography.
- **Backend:** Node.js (Zero external npm dependency requirement).
- **Data Layer:** Schema-enforced JSON database (`data/db.json`) supporting phone deduplication, 6-character unique codes, referral attribution, and rate limiting.
- **Hosting / Deployment:** Ready for Vercel (`vercel.json`), Netlify, or local runtime (`server.js`).

---

## 4. Quick Start & Demo Steps

### 1. Launch Local Server
Double-click `node.bat` or run:
```bash
node server.js
```
The server will start at: `http://localhost:3000`

### 2. Verify Key User Flows

1. **Test Registration & Referral Loop:**
   - Go to `http://localhost:3000`.
   - Scroll to the registration form and enter a 10-digit Indian mobile number.
   - Click **"Confirm Registration"**: observe the **Success Modal** with your unique 6-character code (`NWxxxx`) and the 1-tap WhatsApp button.
   - Copy your referral link (`http://localhost:3000/?ref=NWxxxx`).
   - Open an incognito window, paste the referral link, and register a second student.
   - Verify that your first account is immediately credited with +1 referral on the leaderboard!

2. **Test AI Project Idea Matcher:**
   - Click **Project Matcher** in the navbar.
   - Select **AI & Data Science** (or **ECE**, **EEE**, **Mech**, **Civil**).
   - Click **"Generate 3 Matched Projects"**: observe the 3 tailored, 60-min capstone project ideas with STAR resume bullets.
   - Click **"Register To Build This One"**: verifies that the branch is pre-selected and smoothly scrolls to the form.

3. **Test Admin Dashboard & Simulation Mode:**
   - Click **Admin** in the navbar.
   - Enter password: `nxtwave2026` (or leave empty and click **Unlock**).
   - Click **"Run 7-Day Simulation"**: watch the progress bar climb to ~97% of 500, CAC recalculate to ₹2.47, and the `SIMULATED DATA ACTIVE` badge appear.
   - Test the **WhatsApp Message Generator**: pick a college (e.g. *CBIT Hyderabad*), switch between *T-3 Days*, *T-1 Day*, *T-1 Hour*, and click **"Copy Text"**.
   - Click **"CSV"** to download the complete campaign registration records.
   - Click **"Reset"** to return the database to clean organic state.

4. **Test Workshop Day Tools:**
   - Click **Workshop Day** in the navbar.
   - Vote in the live poll to see animated percentage bars.
   - Enter your referral code and GitHub repo link in the submission form to receive instant AI rubric evaluation and a verified credential.

