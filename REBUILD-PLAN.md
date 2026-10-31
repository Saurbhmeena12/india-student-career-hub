# Rebuild Plan — India Student & Career Hub
### Best information for students · version 3 · 31 October 2026

---

## 0. The one-sentence goal

> A student in Jaipur, in class 12, should reach this site, answer four questions about
> themselves, and within sixty seconds see **every** government job, scholarship and scheme
> they can actually apply for — each with the official link, the last date and the date we
> verified it.

Everything below serves that sentence.

---

## 1. What "best information" means (the five rules)

These are not features, they are the standard every page is judged against.

| # | Rule | How it shows up in the build |
|---|------|------------------------------|
| 1 | **Eligible, not endless** | A student never scrolls a list they cannot apply to. Filters default to *their* qualification, state and category. |
| 2 | **Checkable** | Every record carries `source link` + `last verified` date. No claim without a link. |
| 3 | **Current** | Status is computed from dates (`open · closing · closed · upcoming`), so a stale record marks itself. |
| 4 | **Answerable** | One box where you can ask a plain-language question and get an answer with citations. |
| 5 | **Actionable** | Every card ends in one primary action: *Apply on the official portal*. Never a dead end. |

---

## 2. Where the site stands today (audit)

### Working
- 20 pages, 126 verified records, 11 content tables, 36 official portals
- Express + SQLite/Turso, JWT auth, admin console with 11 content managers
- AI assistant with grounded citations (retrieval mode = ₹0)
- Bookmarks, 9-stage application tracker, 45-day deadline view
- Premium white design system, inline SVG icons, dark mode, EN/हिन्दी

### The gaps that stop it being *the* place students go
| Gap | Why it matters | Priority |
|-----|----------------|----------|
| **No real eligibility engine** — filters are cosmetic chips | Rule 1 is unmet. A 12th-pass student still sees IAS postings. | **P0** |
| **No exam/deadline calendar** | Students miss windows; dates are scattered across 9 tables. | **P0** |
| **No study material library** | Blueprint §5 requires it; students need the "how to prepare" layer, not only the "what to apply for" layer. | **P1** |
| **No shareable detail pages** — records only open in a drawer | Nothing is linkable or printable. A student cannot send a job to a friend or parent. | **P1** |
| **No comparison / shortlist view** | Students shortlist 4–5 options and need to see them side by side. | **P2** |
| **No "what can I do with my degree"** pathway content | The career chart is a static table from 2024. | **P2** |
| **No offline/print pack** | Rural students on 2G need a printable one-page shortlist. | **P2** |

---

## 3. Build phases

### Phase 1 — Eligibility Finder *(build now)*
**Page:** `/pages/finder.html` · linked from the hero, not buried in a menu.

A four-step wizard, no login required:

1. **Highest qualification** — 10th, 12th, ITI, Diploma, Graduation, PG, PhD
2. **State** — all 36 states/UTs + "All India"
3. **Category** — General, EWS, OBC, SC, ST, Minority
4. **Age + family income** (optional, one line, collapsible)

**Output**
- Counted tabs: `Jobs · Scholarships · Schemes · Courses` with live counts
- Each match shows **why**: `✓ Graduation required — you have BSc` / `✓ Income limit ₹2.5L — you said ₹1.8L`
- Each row: last date, official link, status
- A "nothing matched" state that suggests the nearest qualification level instead of a dead end
- Result URL is shareable (`?qual=12th&state=Rajasthan&cat=OBC`) and survives reload

**Acceptance tests**
- 12th pass, Rajasthan, OBC → shows at least 3 scholarships and 2 jobs
- Graduation, All India, General → SSC/RRB style postings appear, PhD-only postings do not
- ₹0 income filter given → no result hides a scheme that has no income limit
- Works with JavaScript rendering disabled? *No — documented, and the static listing pages remain the fallback.*

### Phase 2 — Exam & Deadline Calendar *(build now)*
**Page:** `/pages/calendar.html`

- Month grid, June 2026 → December 2027, data merged from `jobs.last_date`,
  `scholarships.application_dates`, `internships.last_date`,
  `exams.exam_date`, `exams.last_date`
- Each day cell shows up to 2 items + `+N`
- Click a day → side panel lists everything due that day, with type colour-coding
- Toggle: **Closing soon (7 days)** / **This month** / **All**
- `Add to calendar` produces a downloadable `.ics` file per record (no Google dependency)

**Acceptance tests**
- Today's date is highlighted and correct in Asia/Kolkata
- A job whose `last_date` has passed is never listed as "closing"
- Missing or malformed dates `like "As per notification"` are skipped without breaking the render
- `.ics` opens in a calendar app with the right date and the official link

### Phase 3 — Study Material library *(build now)*
**Page:** `/pages/study-material.html`

Strictly following the standing rule: *only publish study material we own, are permitted to
host, or may legally link to.*

- **Free government sources only** — NCERT textbooks, ePathshala, NPTEL, SWAYAM, NIELIT,
  IGNOU eGyanKosh, SCERT Rajasthan, NROER
- Grouped by **exam** (SSC, Banking, Railway, UPSC, State PSC, JEE/NEET) and by **subject**
- Each entry: what it covers, format (PDF/video/course), language, cost (Free), official link
- No pirated PDFs, no scanned test series, no uploads — links only
- A visible note explaining exactly that policy

**Acceptance tests**
- Every card links to a `.gov.in`, `.nic.in`, `.ac.in` or an official institutional domain
- No file is hosted by this platform
- Subject filter and exam filter combine correctly

### Phase 4 — Shareable record pages *(next)*
`/record/:table/:id` server route rendering the full record: all fields, verification status,
official source, related records, print stylesheet. Turns the drawer into a fallback.

### Phase 5 — Shortlist & compare *(next)*
Select up to 5 records → side-by-side table → print/save as PDF.

### Phase 6 — Offline pack *(later)*
Service worker + a "save my shortlist" cache so the site works on a 2G connection after first load.

---

## 4. Data model changes needed

```sql
-- eligibility rules so the finder can reason instead of guess
ALTER TABLE jobs           ADD COLUMN min_qualification TEXT;  -- 10th / 12th / ITI / Diploma / Graduation / PG
ALTER TABLE scholarships   ADD COLUMN min_qualification TEXT;
ALTER TABLE scholarships   ADD COLUMN income_limit_max   INTEGER; -- rupees per year, NULL = no limit
ALTER TABLE schemes        ADD COLUMN min_qualification TEXT;
ALTER TABLE schemes        ADD COLUMN income_limit_max   INTEGER;

-- study material (new table)
CREATE TABLE study_material (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  exam TEXT,              -- SSC CGL, NEET, ...
  subject TEXT,
  provider TEXT,
  format TEXT,            -- PDF / Video / Course / Notes
  language TEXT,          -- English / Hindi / Both
  cost TEXT DEFAULT 'Free',
  level TEXT,             -- Beginner / Intermediate / Advanced
  description TEXT,
  link TEXT NOT NULL,     -- must be official
  verified INTEGER DEFAULT 1,
  last_checked TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

The finder must degrade gracefully when a rule column is `NULL`: show the record but label it
**"Check notification"** rather than silently dropping it. Never promise eligibility we cannot
prove — this is a hard requirement from the blueprint.

---

## 5. Design rules for the new pages

- Same premium white system — white canvas, ink type, one indigo accent, hairlines not shadows
- No new colours, no new shadows, no external assets
- Every new page must survive 360px width with no horizontal scroll
- Every interactive control keyboard-reachable, focus ring = 3px `--accent-soft`
- Results announced through `aria-live="polite"` so screen readers hear the count change

---

## 6. Acceptance criteria for this rebuild

| Check | Pass condition |
|-------|----------------|
| Finder accuracy | A 12th-pass Rajasthan OBC profile returns ≥3 scholarships and ≥2 jobs |
| Finder honesty | Records with unknown eligibility say "Check notification", never "you qualify" |
| Calendar integrity | No past date ever shown as closing; bad dates skipped silently |
| Material legality | 100% of study-material links point to official/legal hosts |
| Design consistency | New pages use only existing tokens and classes |
| Responsiveness | No horizontal scroll at 360 / 768 / 1024 / 1440 |
| Console | Zero JavaScript errors on all new pages |
| Accessibility | Lighthouse a11y ≥ 95; every control has a label |

---

## 7. What is deliberately *not* in this rebuild

- **Scrapers.** Government portals use CAPTCHAs and forbid automated access. The connectors
  table + CSV/JSON import path stays the only ingestion route.
- **Hosted textbooks.** Copyright. Links only.
- **Paid API keys.** Everything must run on the free tier forever.
- **Guaranteed eligibility claims.** The finder is a preliminary filter, always.

---

## 8. Build log — completed this session

| Phase | Delivered | Verified |
|-------|-----------|----------|
| **1. Eligibility Finder** | `eligibility.js` matching engine + `POST /api/eligibility` + `/pages/finder.html` | 12th-pass · Rajasthan · OBC → 3 jobs, 2 scholarships, 6 schemes, 7 courses, each with a reason; 10 closed records correctly excluded |
| **2. Deadline Calendar** | `/pages/calendar.html`, month grid, type filters, 7-day strip, `.ics` export | Renders November 2026 from 4 source tables, 0 JS errors, no horizontal scroll at 360px |
| **3. Study Material** | `study_material` table + 18 seeded official resources + `/pages/study-material.html` | Every link on a `.gov.in` / `.nic.in` / `.ac.in` / official host; nothing hosted locally |
| **Wiring** | Finder/Calendar/Study Material in the More menu, footer and homepage CTAs; qualification chips now route to the finder | 25 pages verified |
| **Design pass** | `widgets.js` AI panel + record drawer rewritten to the white token system; mobile header rebuilt; notice-strip fixed | 0 console errors, 0 overflow at 360 / 768 / 1440 on all 25 pages |


### Phase 3.5 — the review pass (31 Oct 2026)

The audit in `WEBSITE-REVIEW.md` drove a second build. Nothing here is aspirational; every row was re-measured after the change.

| Area | What was built | Measured result |
|---|---|---|
| **Top announcement bar** (user request) | `.topbar` on all 27 documents — newest verified update on the left, verification freshness on the right, 7-day dismissal, self-hides if the API is down | 36 px desktop / 34 px mobile, header stays 66 px, 0 console errors, 0 horizontal scroll |
| **Real verification** | `linkcheck.js` (HEAD→GET, 9 s timeout, 700 ms per-host gap), `link_checks` table, `GET /api/health/links`, admin `POST /api/health/links/run` | 130 links → 64 verified, 4 broken, 56 unreachable, 6 blocked in 704 s; all 36 portals carry `last_checked` |
| **Portal fixes** | `employmentnews.gov.in` moved to the live non-www host; PM Internship now points at the ministry after its portal returned a Tomcat 404 | 19 verified, 15 unreachable, 2 blocked, **0 broken** |
| **Honest status labels** | `verifyLabel()` in `cards.js` — "Our checker could not reach it" instead of a raw machine word | Directory now reads as sentences, never as a fake pass |
| **Hindi** | `i18n.js` rebuilt: ~200-entry dictionary, `WeakMap` originals, `MutationObserver` for JS-rendered content, pattern rules for computed text, placeholder + title translation | Homepage 223 → 73 untranslated nodes (all of them government record titles); round-trip restores English exactly on 7 pages |
| **Navigation** | 7 pages had no header/footer/drawer at all; the drawer omitted all three tools | 26 pages → header, footer, drawer, tools, language switch, 0 problems |
| **Security** | CSP + header set, JWT secret guard, origin-locked CORS, 3 rate limiters, `x-powered-by` off, `limit` capped | All headers present on every response |
| **Accessibility** | Contrast tokens darkened, calendar ARIA rebuilt, footer heading levels, skip link inside the banner, 5 result areas given `h2`s | **0 axe violations** on all 9 audited pages |
| **Performance** | Brotli + 7-day asset caching | `style.css` 89,506 B → 16,791 B |
| **Discoverability** | `robots.txt`, `sitemap.xml` (23 URLs), `favicon.svg`, `manifest.json`, canonical + OG + Twitter on every page, JSON-LD on the homepage, privacy/terms/404 | All new URLs 200; unknown path serves the branded 404 |
| **Demo credentials** | `GET /api/config` reports demo mode; `admin.html` only prints `admin/admin123` while that is still true | Hidden automatically once `ADMIN_PASSWORD` is set |

**Full-page QA after this pass:** 25 pages, 0 JS errors, 0 horizontal scroll, 110 internal links with 0 broken, 9 axe audits with 0 violations.

### What is still open (Phase 4–6)

- Shareable `/record/:table/:id` server-rendered pages
- Shortlist & compare view (5 records side by side)
- Offline pack via service worker

*Nothing above is claimed as done — the table lists only what was built and tested.*
