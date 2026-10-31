# INDIA STUDENT & CAREER HUB

**One Platform. All Opportunities. One Future.**

> **This project runs at ₹0 — no paid hosting, database, AI API or domain.**
> Free stack in use: Oracle Cloud Always Free VM (or Render free) + local SQLite / Turso free + Google Gemini free tier + free is-a.dev subdomain + free Let's Encrypt HTTPS.
> Full plan, verified free limits and step-by-step deploy: [`FREE-STACK.md`](FREE-STACK.md) · Blueprint gap check: [`BLUEPRINT-AUDIT.md`](BLUEPRINT-AUDIT.md)

An all-in-one government opportunities, education, skills and career portal for Indian students. Built with Node.js + Express + SQLite, with a full admin CMS, student accounts, bookmarks, application tracker and a grounded AI assistant.

---

## Quick Start

```bash
cd /home/user/student-career-portal
npm install
npm start
```

| | |
|---|---|
| Website | http://localhost:3000 |
| Admin dashboard | http://localhost:3000/admin.html |
| Admin username | `admin` |
| Admin password ||
| Link health | http://localhost:3000/api/health/links |

The admin login page only shows the seeded credentials while the server is still in demo mode (`GET /api/config` → `{demo:true}`). Set `ADMIN_PASSWORD` and `NODE_ENV=production` and the hint disappears.

The SQLite database (`database.sqlite`) is created automatically on first run and seeded with real Indian government opportunity data. Delete the file to reset everything.

---

## What ships above the header

Every page opens with a 36 px announcement bar (`.topbar`, `public/js/topbar.js`):

- **Left** — the newest update from `/api/updates`, linking to its official source.
- **Right** — verification freshness pulled from `/api/health/links` ("checked 12 min ago"), plus links to the deadline calendar and the eligibility finder.
- Dismissible for 7 days (`localStorage`), and it removes itself entirely if both APIs fail, so the header never sits under an empty strip.

## Verification is a real check, not a badge

`linkcheck.js` requests every outbound official link (HEAD first, forced GET fallback because many `.gov.in` hosts reject HEAD), records the HTTP status and the exact time, and writes both back to the database.

```bash
# check everything, politely (9s timeout, 700ms gap per host)
node -e "require('./linkcheck').runAll().then(r=>console.log(r))"

# current health
curl -s localhost:3000/api/health/links
```

Statuses are deliberately conservative: `verified` (2xx/3xx), `broken` (404/410), `blocked` (403/429 — a WAF, not a dead page), `unreachable` (no response from our network), `unverified` (never checked). The UI prints those as sentences, never as a raw machine word.

## Languages

English and Hindi are both first-class. `public/js/i18n.js` swaps text nodes against a ~200-entry dictionary, remembers each original in a `WeakMap` so switching back is exact, re-translates anything JavaScript renders later via a `MutationObserver`, and handles computed strings ("9 days left") with pattern rules. Government record titles stay in the language the ministry published them in — that is deliberate.

## Pages (20)

| Page | File | Contents |
|---|---|---|
| Home | `public/index.html` | Hero + search, live stats, 12 category cards, qualification filters, latest updates, closing-soon deadlines, free learning, AI search, newsletter |
| Government Jobs | `pages/jobs.html` | Central, state, PSU, defence, banking, railway vacancies with state filters and auto status |
| Scholarships | `pages/scholarships.html` | Pre/post-matric, merit, SC/ST/OBC/minority, girls, PhD with category filters |
| Govt Schemes | `pages/schemes.html` | Education, employment, skills, finance, governance schemes |
| Free Courses | `pages/courses.html` | SWAYAM, NPTEL, NIELIT, Skill India courses with level filters |
| Skill Development | `pages/skillsindia.html` | Skills India mission courses by sector |
| Training | `pages/training.html` | PMKVY, ITI, NSTI, RSLDC, DDU-GKY, vocational training |
| Internships | `pages/internships.html` | PM Internship, AICTE, ministry and PSU internships |
| Apprenticeships | `pages/apprenticeships.html` | NATS, NAPS, railway, PSU and ITI apprenticeships |
| Entrance Exams | `pages/exams.html` | CUET, JEE, NEET, GATE, UGC NET, CSIR NET, REET |
| Admissions | `pages/admissions.html` | CUET, polytechnic, ITI and government college admissions |
| Govt Portals | `pages/directory.html` | 36-portal searchable directory with verification status |
| State-wise | `pages/states.html` | All 28 states and 8 union territories |
| Notifications | `pages/notifications.html` | Latest updates and auto-collected notices |
| Career Guidance | `pages/career.html` | Career chart by education stage + stream-wise options |
| AI Search | `pages/search.html` | Unified search across all nine content tables |
| Login / Register | `pages/login.html` | Student profile creation for eligibility matching |
| About | `pages/about.html` | Mission, vision, services |
| Contact | `pages/contact.html` | Support details + working contact form |
| My Dashboard | `pages/dashboard.html` | Saved opportunities, 9-stage application tracker, 45-day deadline calendar |
| Admin | `admin.html` | Full CMS, statistics, import/export, students, messages |

Every page shares the same navigation bar with all 16 primary links, English/Hindi switch, dark mode toggle and admin access.

---

## Seeded Content (real Indian government opportunities)

| Table | Records | Examples |
|---|---|---|
| Jobs | 12 | SSC CGL 8,148 posts, RRB NTPC 8,113, IBPS PO 4,455, UPSC CSE 979, RPSC RAS 733, Rajasthan Police 3,578, India Post GDS 44,228, UPPSC PCS, ISRO, AIIMS Nursing, NTPC, Bihar Police |
| Scholarships | 10 | Post-matric SC, Central Sector CSSS, MCM minority, PM YASASVI, Rajasthan SJE post-matric, Mukhyamantri Higher Education, Top Class SC, Ishan Uday, AICTE Pragati |
| Schemes | 10 | NSP, PM Internship, NCS, Vidya Lakshmi, PMKVY, NATS/NAPS, myScheme, SWAYAM, SSC CGL, UPSC |
| Courses | 10 | Python (IIT Madras), AI/ML (IIT KGP), Data Science (IIT Roorkee), Digital Marketing, MS Excel, Cyber Security, CCC, Tally/GST, Entrepreneurship |
| Training | 8 | PMKVY 4.0, ITI Electrician, NSTI, RSLDC, NIELIT O Level, DDU-GKY, Jan Shikshan Sansthan |
| Internships | 7 | PM Internship (1.25 lakh seats), AICTE, Digital India, MoE, NITI Aayog, ISRO, DRDO |
| Apprenticeships | 7 | NATS, NAPS, Indian Railways, NTPC, IOCL, BHEL, RSLDC |
| Entrance Exams | 10 | CUET UG/PG, JEE Main, NEET UG, GATE, UGC NET, CSIR NET, IIT JAM, REET, Polytechnic |
| Govt Portals | 36 | NSP, myScheme, UMANG, NCS, Employment News, Skill India Digital, SWAYAM, NPTEL, NIELIT, AICTE, UGC, UPSC, SSC, NTA, Apprenticeship India, NATS, DigiLocker, India.gov.in, MyGov, Startup India, PM Internship, ISRO, DRDO, CSIR, PMKVY + 10 Rajasthan portals (SSO, SJE, RPSC, RSSB, Employment, Shala Darpan, RSLDC, Jan Aadhaar, e-Mitra, Yuva Sathi) |
| Career Chart | 8 | After 10th, 12th Science/Commerce/Arts, Graduation, job aspirants, skill seekers, scholarship seekers |
| Updates | 8 | Auto-collected style notifications |

Each job record carries organisation, advertisement number, post name, vacancies, category split, qualification, age limits and relaxation, salary, selection procedure, exam pattern, fee, opening and last date, notification link, apply link, exam date.

Each portal record carries a **verification status** and **last checked** timestamp.

---

## Admin Dashboard

Login at `/admin.html` (admin / admin123).

- **Statistics strip** — live counts for all 11 content tables
- **11 content managers** — jobs, scholarships, schemes, courses, training, internships, apprenticeships, entrance exams, govt portals, updates, career chart. Each has a full field-level form and a delete-enabled record table, all driven by a single configuration object.
- **Students & Alerts** — registered student profiles and newsletter subscribers
- **Messages** — contact form submissions with delete
- **Import / Export**
  - JSON backup of all content tables
  - JSON restore (export format)
  - **CSV import** into any table (header row = column names)
  - Official portal connectors (name, URL, target table, check frequency)

All writes are persisted to SQLite and appear immediately on the public site.

---

## REST API

### Public
```
GET  /api/jobs | scholarships | schemes | courses | training
GET  /api/internships | apprenticeships | entrance_exams
GET  /api/govt-portals | updates | career_chart
GET  /api/states
POST /api/register          { name, email, password, qualification, state, category, ... }
POST /api/login             { email, password }
POST /api/logout
GET  /api/me
POST /api/newsletter        { email }
POST /api/contact           { name, email, subject, message }

GET  /api/<table>/:id       single record (detail drawer)
POST /api/ai-search         { query }            -> citations
POST /api/ai-chat           { question, lang }   -> grounded answer + citations
GET  /api/ai-status         AI key present? quota used?

GET  /api/bookmarks         saved opportunities (auth)
POST /api/bookmarks         { table_name, record_id, title, link }
DEL  /api/bookmarks/:id
GET  /api/tracker           application tracker (auth)
POST /api/tracker           { table_name, record_id, title, status }
PUT  /api/tracker/:id       { status, notes, reminder_date }
DEL  /api/tracker/:id
```

Query parameters supported on all content routes: `featured=true`, `state=`, `status=`, `sector=`, `search=`, `limit=`.

Every record is returned with a computed `auto_status` field derived from its last date:
`closed` (deadline passed) · `closing` (within 7 days) · `upcoming` · `open`.

### Admin (JWT in httpOnly `admin_token` cookie)
```
POST   /api/admin/login     { username, password }
POST   /api/admin/logout
GET    /api/admin/me
GET    /api/admin/stats
GET    /api/admin/users
GET    /api/admin/newsletter
GET    /api/contact-messages
DELETE /api/contact-messages/:id
POST   /api/connectors      { name, url, target_table, frequency }
GET    /api/connectors
POST   /api/<table>         create
PUT    /api/<table>/:id     update
DELETE /api/<table>/:id     delete
GET    /api/export
POST   /api/import          multipart file + table
```

---

## Project Structure

```
student-career-portal/
├── server.js              Express app, SQLite schema, auth, all APIs, seed data
├── db.js                  Free DB adapter: local SQLite file  <->  Turso free cloud
├── ai.js                  Free Gemini assistant + grounded retrieval + quota guard
├── render.yaml            Render free-tier blueprint
├── Dockerfile             Image for Oracle Always Free VM / any free VPS
├── docker-compose.yml
├── .env.example           All config, both DB modes documented
├── deploy/oracle-setup.sh One-command free VM setup (Node, PM2, Nginx, HTTPS, backups)
├── FREE-STACK.md          Every free service, verified limits, deploy routes
├── BLUEPRINT-AUDIT.md     20-section check of the supplied blueprint PDF
├── package.json
├── .env                   PORT, JWT_SECRET
├── database.sqlite        auto-created
├── uploads/               import staging
└── public/
    ├── index.html         homepage
    ├── admin.html         admin dashboard + login
    ├── css/style.css      design system incl. dark mode
    ├── js/app.js          homepage logic
    ├── js/i18n.js         English ⇄ Hindi text dictionary and switcher
    └── pages/             18 inner pages
```

---

## AI Assistant (free)

A floating **AI Help** button appears on every page. It searches this platform's own database, then either:

- asks **Google Gemini** (free tier) to explain the results, or
- with no API key set, returns a deterministic database-only summary.

Either way every answer carries **citations with the official government link**, never invents vacancies, dates or fees, and never claims a user is definitely eligible. Free-quota protection is built in (`AI_RPM_LIMIT`, `AI_DAILY_LIMIT`).

```bash
curl -X POST localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"question":"12th pass government jobs in Rajasthan"}'
```

## Design System

- **Fonts** — Poppins (headings), Inter (body)
- **Palette** — trust blue `#1e3a8a`, growth green `#059669`, energy amber `#f59e0b`
- Dark mode persisted in `localStorage`, toggle in every navbar
- English / हिन्दी switch in every navbar — translates navigation, section headings, buttons and placeholders via `public/js/i18n.js` (plain dictionary, easy to extend)
- Responsive down to mobile (collapsible menu below 1280px)
- Cards, badges, filter chips, countdown badges, hero stat bar, career chart table

---

## How the blueprint maps to this build

**Implemented now:** all navigation and pages, opportunity categories, qualification filters, latest updates, closing-soon with computed status, free learning, state-wise pages, newsletter alerts, student registration and profile fields, opportunity databases for jobs/scholarships/schemes/courses/training/internships/apprenticeships/exams, official portal directory with Rajasthan section and verification status, career chart, admin CMS with statistics, roles-ready admin table, CSV/JSON import/export, connector registry, contact and message handling.

**Deliberately not auto-scraped:** the blueprint's automated crawling of UPSC/SSC/state portals (Part 6). Scraping government portals without permission and bypassing CAPTCHAs is not something this build does. The architecture is prepared for it instead:
- every table has a clean JSON/CSV import endpoint,
- a `connectors` table stores approved sources and check frequency,
- `is_auto` flags mark machine-collected records pending verification,
- admin verification queue is represented by `verification_status` and `status`.

To go live with automation, add a scheduled job that fetches only permitted sources (official APIs, RSS, published PDFs), writes into the import endpoint, and leaves records flagged for admin approval.

---

## Deployment

1. Push to any Node.js host (Render, Railway, Fly.io, VPS).
2. Set `JWT_SECRET` and `PORT` environment variables.
3. Mount a persistent volume for `database.sqlite` and `uploads/`.
4. Change the default admin password before going public.

---

*All opportunity details are compiled from official government notifications. This is an information platform, not a government website — always verify on the official portal before applying.*

## New in v3 — three decision tools

| Page | What it does |
|------|--------------|
| `/pages/finder.html` | **Eligibility Finder.** Four answers produce a ranked list of everything you can apply for, with the reason each result matched. Powered by `eligibility.js` + `POST /api/eligibility`. |
| `/pages/calendar.html` | **Deadline Calendar.** Every closing date across jobs, scholarships, internships and exams in one month view, plus a 7-day "closing soon" strip and `.ics` export. |
| `/pages/study-material.html` | **Study Material.** 18 official, legally linkable resources (NCERT, ePathshala, NROER, NPTEL, SWAYAM, eGyanKosh, SSC, UPSC, NTA, NIELIT, NDLI). Links only — nothing is hosted here. |

### Eligibility API

```bash
curl -X POST /api/eligibility -H 'Content-Type: application/json' \
  -d '{"qualification":"12th","state":"Rajasthan","category":"OBC","age":18,"income":180000}'
```

Qualification keys: `below10 · 10th · 12th · iti · diploma · graduate · pg · phd`.
Returns `{ profile, jobs, scholarships, schemes, courses, summary }`; each row carries
`match.confidence` (`confirmed` / `unknown`), `match.reasons[]` and `match.days_left`.
Records whose eligibility text cannot be parsed are returned as `unknown` — never silently dropped.

### Seed totals (v3)

jobs 12 · scholarships 10 · schemes 10 · courses 10 · training 8 · internships 7 ·
apprenticeships 7 · entrance_exams 10 · govt_portals 36 · updates 8 · career_chart 8 ·
study_material 18 → **144 records across 12 tables, 25 pages**.
