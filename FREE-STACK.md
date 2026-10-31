# 100% FREE STACK — ₹0 / $0 to run this project

**Rule for this project: nothing paid. No credit card, no trial that expires, no "free for 12 months".**

This document lists the exact free services this build uses, the verified free limits (checked October 2026), and the two deployment routes. Every layer has a genuinely free option, and the code already supports both.

---

## The stack at a glance

| Layer | Service used | Free limits (verified Oct 2026) | Card needed? | Code support |
|---|---|---|---|---|
| **Hosting (always-on)** | **Oracle Cloud Always Free** VM | 2 AMD VMs *or* up to 4 ARM Ampere cores / 24 GB RAM, **200 GB** block storage, 10 TB egress/month, **never expires** | Card for identity check only, not charged | `Dockerfile`, `deploy/oracle-setup.sh` |
| **Hosting (instant, no card)** | **Render** free web service | 750 instance-hours/month, 512 MB RAM, sleeps after 15 min idle, ephemeral disk | No | `render.yaml` |
| **Database** | **Local SQLite file** on the free VM | Unlimited for this app size; file lives on the 200 GB free disk | No | `db.js` local mode (default) |
| **Database (cloud)** | **Turso** free tier (libSQL / SQLite) | **5 GB** storage, ~**500 M row reads**/month, ~10–25 M writes/month, 100+ databases | No | `db.js` Turso mode |
| **AI API** | **Google Gemini API** free tier | Flash / Flash-Lite only (~10–30 req/min, ~250–1,500 req/day). Pro models are paid-only since Apr 2026 | No | `ai.js` |
| **Domain** | **is-a.dev** / **js.org** free subdomain, or host subdomain | Free forever, PR-based, on the Public Suffix List | No | DNS records in `DEPLOY.md` |
| **HTTPS** | **Let's Encrypt** via Certbot | Free, auto-renewing 90-day certs | No | `deploy/oracle-setup.sh` |
| **Email alerts (optional)** | **Brevo** free tier | 300 emails/day | No | planned |
| **Uptime monitoring** | **UptimeRobot** free | 50 monitors, 5-min checks — also keeps Render awake | No | planned |
| **Backups** | JSON export + cron | Local rotation of 8 weekly files, free | No | `deploy/oracle-setup.sh` step 7 |
| **Source control** | **GitHub** free | Unlimited public/private repos, 2,000 Actions minutes | No | — |

**Total monthly cost: ₹0.**

---

## Two free routes — pick one

### Route A — Oracle Cloud Always Free (recommended: always on, keeps SQLite everywhere)

Why: it is the only free tier that is **permanently free, never sleeps, and gives you a real 200 GB disk** — so the existing SQLite database just works, with no cloud DB at all.

```bash
# On a fresh Ubuntu 22.04 / 24.04 VM:
git clone <your-repo> india-career-hub && cd india-career-hub
sudo bash deploy/oracle-setup.sh career.is-a.dev
```

The script installs Node 20, PM2 (auto-restart + boot start), Nginx reverse proxy, Let's Encrypt HTTPS, a firewall (SSH/HTTP/HTTPS only) and a weekly JSON backup cron. It generates a random `JWT_SECRET` on first run.

Result: `https://career.is-a.dev` — always on, free forever.

**Caveats to know:** Oracle asks for a card for identity verification (not charged), and ARM capacity is sometimes unavailable in busy regions — pick a quieter region or the AMD 1 GB shapes.

### Route B — Render + Turso (recommended: zero setup, no card, but sleeps)

Why: deploy straight from GitHub in ~3 minutes with no server administration. Render's disk is ephemeral (wiped on every deploy), so the database moves to Turso's free cloud SQLite.

```bash
# 1. Free database
turso db create india-career-hub
turso db show india-career-hub --url          # -> libsql://india-career-hub-xxx.turso.io
turso db tokens create india-career-hub       # -> token

# 2. Push repo to GitHub, then Render dashboard -> New -> Blueprint -> select repo
#    paste TURSO_DATABASE_URL and TURSO_AUTH_TOKEN when prompted
```

**Caveats to know:** free services sleep after 15 minutes idle (~50 s cold start on the next visit), 512 MB RAM, and Render's own free Postgres expires after 30 days — which is exactly why this build uses Turso instead.

### What NOT to use (these are traps)

| Service | Why it is not "free" for this project |
|---|---|
| Render free **Postgres** | Deleted automatically after 30 days |
| Railway | Only a limited trial credit, not a permanent free tier |
| Heroku | Free tier removed in 2022 |
| Vercel free | Serverless only — no long-running Express process or SQLite file |
| Freenom (.tk/.ml/.ga) | Service shut down in 2024 |
| Any "free for 12 months" AWS/GCP/Azure trial | Expires, then bills |

---

## Free AI: how it is set up and how it degrades

The assistant (`ai.js`) is **grounded retrieval + optional LLM**:

1. It searches this platform's own database for matching jobs, scholarships, schemes, courses, internships, apprenticeships, exams and portals.
2. It sends **only those public records** to Gemini with strict rules: cite records, never invent dates/vacancies/fees/URLs, never guarantee eligibility.
3. Every answer returns citations with the **official government link**.

**Free-tier protection is built in:** an in-memory limiter caps requests at `AI_RPM_LIMIT` per minute (default 8) and `AI_DAILY_LIMIT` per day (default 400), so you never exceed the free quota and never trigger billing.

**If you never add a key:** the assistant still answers, using a deterministic database-only summariser (`mode: "retrieval"`). The site is fully functional with zero API cost. Add a key only when you want natural-language answers.

**Privacy note (free tier):** Google may use free-tier prompts to improve its models. The assistant therefore sends *only public opportunity data*, never user emails, profiles or tracker entries. This is stated in the UI.

Get a free key: https://aistudio.google.com/apikey — no card.

---

## Free domain

| Option | Address shape | Notes |
|---|---|---|
| Host subdomain | `india-career-hub.onrender.com` | Instant, zero effort |
| **is-a.dev** | `career.is-a.dev` | Free forever, PR to `is-a-dev/register`, on the Public Suffix List |
| **js.org** | `career.js.org` | Free, but must be a JavaScript project |
| **EU.org** | `career.eu.org` | Free, slower approval, non-commercial |
| DuckDNS | `career.duckdns.org` | Free dynamic DNS, good for the Oracle VM |
| GitHub Student Pack | `.me`, `.tech` etc. | Real domain, **1 year only**, then paid — not permanent |

DNS for a Web Service:

```
CNAME  career  ->  india-career-hub.onrender.com
```
For the Oracle VM (A record + optional `www`):

```
A      career  ->  <VM public IP>
```

---

## Environment variables (all free)

```env
PORT=3000
JWT_SECRET=<64-char random string>     # generated by the setup script

# Database — leave TURSO_* empty on the VM route
SQLITE_FILE=/opt/india-career-hub/database.sqlite
TURSO_DATABASE_URL=                    # Route B only
TURSO_AUTH_TOKEN=                      # Route B only

# AI — optional, free tier
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
AI_DAILY_LIMIT=400
AI_RPM_LIMIT=8
```

---

## Cost table if you ever outgrow free

| Upgrade | Price | When you would need it |
|---|---|---|
| Render Starter (no sleep) | ~$7/month | You want no cold starts without running a VM |
| Turso Scaler | ~$5/month | >5 GB data or >500 M reads |
| Gemini paid tier | metered | >1,500 AI requests/day |
| Domain (.in) | ~₹500–900/year | You want `indiastudentcareerhub.in` |

Nothing above is required to launch. The project runs at ₹0 indefinitely on Route A.

---

## Verification checklist for "is everything actually free?"

- [ ] No credit card was charged — confirm on the provider billing page.
- [ ] `npm install` includes only open-source packages (no paid SDK).
- [ ] `curl /api/ai-status` shows `ai_enabled:false` when no key is set, and answers still work.
- [ ] After a Render redeploy, save a job in the admin panel — confirm it survives (proves Turso is connected, not the ephemeral disk).
- [ ] `pm2 list` shows the app online after a VM reboot.
- [ ] `sudo certbot certificates` shows a valid Let's Encrypt cert with auto-renew.
- [ ] `ls /opt/india-career-hub/backups` has dated JSON files after the first 3 AM cron run.
