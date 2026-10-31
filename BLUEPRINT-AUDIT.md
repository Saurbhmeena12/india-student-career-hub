# BLUEPRINT AUDIT — check of all 20 sections

Checked against **India_Student_Career_Hub_Full_Functional_Blueprint.pdf** (12 pages, dated 31 October 2026).
Legend: **✅ built** · **🟡 partial** · **⬜ not built** · **⛔ deliberately excluded** (with reason)

---

## Summary scorecard

| # | Blueprint section | Status | Notes |
|---|---|---|---|
| 1 | Product goals & user groups | ✅ | All 7 audiences addressed in content model |
| 2 | Information architecture & navigation | 🟡 | 20 pages + full nav; mega-menu and breadcrumbs not built |
| 3 | Multi-page website plan (A–K) | 🟡 | 8 of 11 page types built; detail pages now open as a drawer |
| 4 | Universal AI assistant | 🟡 | Floating assistant + grounding + citations built; compare/translate/checklist modes not built |
| 5 | Admin portal & CMS | 🟡 | 11 content managers, stats, import/export; roles/MFA/audit log not built |
| 6 | Edit anything without code | 🟡 | All content CRUD is live; page builder / nav editor / versioning not built |
| 7 | Automatic update engine | ⛔→🟡 | Scheduling + source registry + review fields built; crawler excluded (see below) |
| 8 | Trackers & calendars | ✅ | Bookmarks, application tracker with 9 stages, deadline calendar |
| 9 | Notifications & alerts | 🟡 | Signup + preferences fields + admin view; email delivery not wired |
| 10 | Database & entities | 🟡 | 16 tables; missing organisations/sources/snapshots/review_tasks/versions |
| 11 | Search, filters, recommendations | 🟡 | Keyword search + filters + grounded AI search; no autocomplete/Hindi search |
| 12 | Technical architecture | 🟡 | Different stack by design (free tier), same logical services |
| 13 | Security, privacy, governance | 🟡 | JWT, bcrypt, httpOnly cookies, rate limits, input checks; no MFA/audit/CSRF token |
| 14 | Content trust & disclaimer | 🟡 | Verification fields + status labels; editorial workflow not enforced |
| 15 | Analytics & performance | ⬜ | No analytics yet |
| 16 | Implementation roadmap (Phases 0–9) | 🟡 | Phases 1–4, 7 partially shipped |
| 17 | Acceptance tests | 🟡 | 9 of 17 pass today (listed below) |
| 18 | Master build prompt | 🟡 | Matches the above partials |
| 19 | Portal directory starter set | ✅ | All named portals present, plus 26 more |
| 20 | Final product definition | ✅ | Positioning, promise and disclaimer present |

---

## Section-by-section detail

### 1. Product goals — ✅
Target groups map 1:1 onto seeded content: 10th/12th pass, ITI, diploma, UG (BA/BSc/BCom/BCA/BTech), PG, research, job seekers, professionals. Outcomes (discover, understand, track, alert) each have a working surface.

### 2. Information architecture — 🟡
Built: logo/home, 16 primary nav links, universal search box, AI Help button (desktop + mobile), Hindi/English switch, sign in, theme toggle.
**Missing:** mega-menu grouping (Jobs / Education / Skills / Schemes / Resources), notification bell, breadcrumbs, footer policy links, admin-editable nav.

### 3. Multi-page plan — 🟡
| Blueprint page | Status |
|---|---|
| A. Home | ✅ hero, AI CTA, categories, qualification shortcuts, latest, closing-soon countdown, free learning, newsletter |
| B. Jobs listing | ✅ filters (search + state), sort by newest/featured |
| C. Job detail | ✅ **new** drawer with all fields, status chip, official link, Save, Track |
| D. Scholarships & schemes | ✅ listing + detail + filters |
| E. Courses & training | ✅ free-vs-paid fee fields shown separately |
| F. Internships & apprenticeships | ✅ |
| G. Exams, admissions, results | 🟡 exams + admissions pages; results/admit-card/answer-key fields exist but no separate result pages |
| H. Portal directory | ✅ 36 portals, category + state filters, verification status, last-checked |
| I. State & district pages | 🟡 state explorer with filters; **no district filter** |
| J. User dashboard | ✅ **new** saved items, tracker, deadline calendar |
| K. Policy pages | ⬜ About/Contact exist; Privacy, Terms, Disclaimer, Editorial, Correction, Accessibility not built |

### 4. AI assistant — 🟡
Built: persistent floating button, side panel, page-aware context, grounded retrieval over 9 tables, citations with official links, feedback link, sensitive-input guard (refuses Aadhaar/OTP/password), free-quota limiter, graceful no-key fallback.
**Missing:** compare two opportunities, translate-summary button, checklist generator, resume drafting, admin AI control centre, logged conversations, thumbs up/down storage.

### 5. Admin portal — 🟡
Built: separate `/admin.html`, secure login, 11 content managers with field-level forms, statistics strip, student/newsletter/message views, CSV+JSON import, JSON export, connector registry.
**Missing:** MFA, role permissions (7 roles listed in blueprint), audit log, session controls, page builder, AI control centre, analytics, notification manager.

### 6. Edit anything without code — 🟡
Every opportunity field, portal, update and career-chart row is editable and persists in SQLite. **Not yet:** logo/brand/tagline, nav items, homepage hero copy, footer text, SEO fields, banners, translation strings, draft/preview/schedule/rollback.

### 7. Automatic updates — ⛔ → 🟡
Deliberately **no crawler**. Scraping UPSC/SSC/state portals and bypassing CAPTCHAs or access restrictions is out of scope; I will not build that.
Instead the pipeline slots exist: `connectors` table (source URL + target table + frequency + last run), `is_auto` flag, `verification_status` on portals, `status` + `auto_status` computed daily, and a documented import API a permitted fetcher can call. Your blueprint itself requires "permitted APIs, RSS feeds and public pages" and human approval — that is the shape supported here.

### 8. Trackers & calendars — ✅ (new in this update)
- **Opportunity tracker:** computed status (open / closing / closed / upcoming) on every record.
- **User application tracker:** 9 stages, notes, reminder date, per-user isolation.
- **Deadline calendar:** 45-day rolling view aggregating 6 tables.
- **Portal tracker:** verification status + last-checked stored per portal.
- **Source change tracker:** ⬜ not built (needs snapshots).

### 9. Notifications — 🟡
Newsletter signup with category/state fields and an admin subscriber list. **Not built:** email sending, browser push, Telegram/WhatsApp, quiet hours, notification history, dedupe.

### 10. Database — 🟡
16 tables: users, user_preferences, admins, govt_portals, schemes, jobs, scholarships, courses, training, internships, apprenticeships, entrance_exams, updates, career_chart, newsletter, contact_messages, connectors, bookmarks, application_tracker. Common opportunity fields are present (qualification, age, location, dates, status, official URLs, timestamps).
**Missing:** organisations, departments, districts, tags, vacancy_breakdowns, institutions, sources, source_snapshots, source_checks, extracted_candidates, review_tasks, content_versions, notifications, subscriptions, AI_conversations, admin_audit_logs, automation_runs.
**Engine:** SQLite (free) instead of PostgreSQL (Supabase free would also be ₹0 but needs a paid-tier-free 500 MB limit and a rewrite; see FREE-STACK.md).

### 11. Search, filters, recommendations — 🟡
Server-side `search=`, `state=`, `status=`, `sector=`, `featured=`, `limit=` on every listing; client filters per page; unified AI search across 9 tables with citations.
**Missing:** autocomplete, spelling tolerance, Hindi search, age/salary/fee ranges, "why this matched" explanation, saved preferences.

### 12. Architecture — 🟡
| Blueprint recommendation | This build | Why |
|---|---|---|
| Next.js + TypeScript | Express + vanilla JS | Runs on a 512 MB free tier; no build step |
| Tailwind + shadcn | Hand-written CSS design system | Zero dependencies, dark mode included |
| PostgreSQL / Supabase | SQLite file or Turso | Free, no 30-day expiry, no card |
| Vercel hosting | Oracle Always Free or Render free | Vercel free cannot host a long-running server + SQLite |

### 13. Security — 🟡
Done: HTTPS via Let's Encrypt, bcrypt hashing, JWT in httpOnly cookies, separate admin token, server-side validation, parameterised SQL throughout, AI input guard, AI rate limits, upload size limits via multer.
**Missing:** MFA, CSRF tokens, RBAC, audit logs, malware scanning, key rotation, tested restore.

### 14. Content trust — 🟡
Every record has official URL, created/updated timestamps, and computed status. Portals carry verification status + last-checked. Detail drawer shows an "information compiled from the official notification — confirm before applying" note.
**Missing:** visible 6-level verification labels, named editor, content versioning, correction log, report-error action per record (the AI panel links to Contact instead).

### 15. Analytics — ⬜
Not implemented. Free options when added: Umami self-hosted, Plausible Community, or a simple SQL counter table.

### 16. Roadmap — 🟡
Phase 1 (shell, nav, home, auth, DB) ✅ · Phase 2 (CMS CRUD) 🟡 · Phase 3 (public modules) ✅ · Phase 4 (search, profile, bookmarks, tracker, calendar) ✅ · Phase 5 (automation) ⛔ · Phase 6 (live feeds) 🟡 · Phase 7 (AI assistant) 🟡 · Phase 8 (hardening) ⬜ · Phase 9 (expansion) ⬜

### 17. Acceptance tests — 9 / 17 pass
| Test | Status |
|---|---|
| Admin can create/edit/delete records without code | ✅ |
| Navigation/homepage/banners editable in CMS | ⬜ |
| Every detail page shows source, last-verified, status | ✅ |
| Search and filters return correct records | ✅ |
| Source change creates a review task | ⬜ |
| Unapproved high-risk changes do not go live | ⬜ |
| Approved changes update pages + feed | ✅ (manual approval = admin save) |
| Deadline status changes by date rules | ✅ |
| Broken links appear in admin tracker | 🟡 (status field, no checker) |
| Users can save and track applications | ✅ |
| Alerts respect preferences | 🟡 (stored, not sent) |
| AI answers cite official sources | ✅ |
| AI flags missing info, no fabrication | ✅ |
| Admin actions + automation logged | ⬜ |
| Backups restore in test env | 🟡 (export exists, restore = import endpoint) |
| Mobile/keyboard/accessibility pass | 🟡 (responsive ✅, a11y audit ⬜) |
| No dummy data or fabricated links in production | ✅ (records compiled from public notifications; disclaimers shown) |

### 18. Master build prompt — 🟡
Everything listed above, at the partial levels described.

### 19. Portal directory — ✅
All 26 portals named in the blueprint are seeded (UPSC, SSC, NCS, Employment News, RPSC, RSSB, NSP, myScheme, UMANG, India.gov.in, DigiLocker, PFMS, SWAYAM, NPTEL, DIKSHA, NIELIT, Skill India Digital, AICTE, NATS, Apprenticeship India, AICTE Internship, PM Internship, Rajasthan SSO/SJE/Employment/RSLDC/Jan Aadhaar/e-Mitra) plus 10 more, each with verification status and last-checked timestamp.

### 20. Final definition — ✅
Discovery, understanding (AI), tracking (tracker + calendar), admin control (CMS), and a documented automation slot — all at ₹0.

---

## What I recommend building next, in order

1. **CMS settings module** — brand name, hero copy, banner, footer, nav items, SEO (closes §6 gap; biggest visible win for you as owner).
2. **Policy pages** — Privacy, Terms, Disclaimer, Editorial Policy, Correction, Accessibility (cheap, required before public launch).
3. **Email alerts** — Brevo free tier (300/day), daily digest respecting preferences.
4. **Link-health checker** — weekly cron that HEAD-checks every portal URL and marks `broken` (free, closes an acceptance test).
5. **Audit log + admin roles** — table + middleware; replaces "logged actions" gap.
6. **District filter + state landing pages** — extend the existing state explorer.
7. **AI modes** — compare two records, translate summary, checklist generator (all prompt-level, no new infra).

---

## Honest limitations to state publicly

- Records are compiled from published notifications and verified manually; **this is not an automated live feed**. Dates can change after publication — the disclaimer and official-source links exist for that reason.
- No crawler, by design.
- Free hosting means the Render route sleeps when idle; the Oracle route does not.
- The AI assistant summarises this platform's records. It is not an official government advisory service, and it never claims a user is definitely eligible.
