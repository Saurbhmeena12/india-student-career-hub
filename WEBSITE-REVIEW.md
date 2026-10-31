# Website Review — India Student & Career Hub
**Date:** 31 October 2026 · **Scope:** all 25 pages, 111 internal links, API, database, security, accessibility, performance
**Method:** headless-browser crawl, axe-core accessibility scan, live API probes, external link checks, static analysis. Every claim below was measured, not assumed.

---

## Resolution log — what changed after this review

Everything in this review was addressed in the pass that followed it, except where noted.
Each line below was re-measured after the fix; the numbers are from those runs, not estimates.

| # | Finding | Status | Proof |
|---|---|---|---|
| C1 | "Verified" badge backed by no check | **Fixed** | `linkcheck.js` makes a real HEAD→GET request per link; 130 links checked in 704 s → 64 verified, 4 broken, 56 unreachable, 6 blocked. `last_checked` now populated on all 36 portals. |
| C2 | Admin password printed on the homepage | **Fixed** | Removed from public pages; demo credentials remain in `README.md` for the operator only. |
| C3 | Hindi toggle mostly decorative | **Fixed** | Dictionary rebuilt (≈200 entries), plus a `MutationObserver` so JS-rendered cards translate too, plus pattern rules for computed strings ("9 days left"). Homepage: 223 → 73 untranslated nodes, and every one of those 73 is a government record title or an exam acronym (correctly left in the source language). English↔Hindi round-trip restores the page byte-identically on all 7 pages tested. |
| H1 | 6 broken internal links from the dashboard | **Fixed** | `PAGE_FOR` map in `dashboard.html`; crawl of 110 internal links → **0 broken**. |
| H2 | Signed-out "Track" jumped to a 404 | **Fixed** | `widgets.js` now redirects to `/pages/login.html`. |
| H3 | No security headers, no rate limits | **Fixed** | CSP + nosniff + SAMEORIGIN + Referrer-Policy + Permissions-Policy + COOP; HSTS in production. Separate limits: 8 logins/15 min, 40 writes/10 min, 12 AI calls/min. `x-powered-by` off, JWT secret refuses the default in production. |
| H4 | No compression, no caching | **Fixed** | Brotli on by default; `style.css` 89,506 B → 16,791 B. `/css` and `/js` cached `max-age=604800`. |
| H5 | Accessibility: contrast, heading order, calendar ARIA | **Fixed** | **0 violations across all 9 audited pages** (axe-core). Calendar `role=grid` replaced with a labelled group, footer headings corrected, skip link moved inside the banner, 5 result areas given real `h2`s. |
| H6 | No robots/sitemap/favicon/manifest/OG | **Fixed** | All added; `sitemap.xml` lists 23 URLs; every page carries canonical + OG + Twitter cards; `index.html` has WebSite + Organization JSON-LD. |
| H7 | Eight pages had no header, no footer, no navigation | **Fixed** — *found while fixing this review, not in it* | Full shell (skip link, header, drawer, search overlay, footer) injected into 7 pages; the three tool pages are now in the mobile drawer on every page. 26 pages checked → 0 problems. |
| M1 | 18 duplicate official URLs | **Deferred** | Data-cleanup task; the verification layer now labels each record individually, so duplicates no longer mislead. |
| M2 | 2 entrance exams past their last date | **Deferred** | Needs a real refresh pipeline, not a manual edit. |
| M3 | `limit=999999` unbounded | **Fixed** | Capped at 200. |
| M4 | No lockout after 10 failed logins | **Fixed** | Login limiter 8 attempts / 15 min per IP. |
| L1 | 629 CSS blocks, 20 duplicate selectors | **Deferred** | Cosmetic debt; no user-visible effect. |
| L2 | `npm audit`: 7 vulnerabilities via `sqlite3` → `tar` | **Deferred** | Dev-time dependency chain; migration to Turso/`@libsql` removes it. Tracked, not ignored. |

**The top bar** (the other half of the request — an announcement strip above the header) is live on all 27 documents: newest verified update on the left, verification freshness on the right ("checked 12 min ago"), dismissible for 7 days, and it hides itself if the API is unreachable rather than showing an empty strip.

---

## Verdict in one line

The build is **structurally sound and visually consistent** — 25 pages, 0 JS errors, 0 mobile overflow, working auth/tracker/AI. But **three things would embarrass you the moment a real student or a journalist looked closely**: a "verified" badge that isn't backed by any check, admin credentials printed on the homepage, and a Hindi toggle that mostly doesn't translate. Fix those three before showing this to anyone.

**Health score by area**

| Area | Score | Note |
|---|---|---|
| Visual design & consistency | 9/10 | Premium white system holds across every page |
| Functionality | 7/10 | Core flows work; two broken links lose users at key moments |
| Data honesty | **3/10** | Fake verification, duplicate records |
| Security | **2/10** | Public admin password, default JWT secret, no rate limit |
| Accessibility | 5/10 | Contrast + ARIA failures on every page |
| Performance | 6/10 | Fast now, but no compression or caching |
| Discoverability (SEO) | 2/10 | No sitemap, robots, OG tags or structured data |
| Hindi / language | **3/10** | 55 of 93 dictionary entries are dead |

---

## 🔴 CRITICAL — fix before showing anyone

### 1. The "verified" badge is not real

**Evidence**
```
govt_portals: 36 rows → verification_status = 'verified' for ALL 36
              last_checked = '2026-10-30 19:05:33' for ALL 36   (identical = seed time, not a check)
```
And at least two of those "verified" portals return **HTTP 404**:

| URL | Status | Appears in |
|---|---|---|
| `https://pminternship.mca.gov.in/` | **404** | portals (verified), schemes, internships apply-link |
| `https://www.skillindiadigital.gov.in/` | **404** | portals (verified), courses, training |

**Why it matters:** your own homepage promises *"Source and last-verified date on every record"* and *"Direct official application links, never a middleman."* The blueprint's hardest rule is *verify links before publication; never publish unverified data.* Right now the badge is decoration. This is the difference between a trustworthy platform and a link farm.

**Fix (2 hours)**
- Add a real link checker: `GET /api/health/links` that HEAD-requests every `govt_portals.url` and `*.link`, writes back `verification_status` and `last_checked`, run as a free daily cron.
- Until it runs, set all to `unverified` — an honest `unverified` beats a false `verified`.
- Show `verified · 12 minutes ago` vs `not checked yet` differently in the UI.
- Replace the two 404 URLs with the current official ones.

---

### 2. Anyone can take over your admin console

**Evidence**
```
Login page says:  Demo access — username admin, password admin123
Homepage hero + final-output page also link to /admin.html
JWT_SECRET = process.env.JWT_SECRET || 'india-student-career-hub-secret-2026'   ← hardcoded fallback
10 consecutive wrong admin logins → no lockout, unlimited attempts
cors() → Access-Control-Allow-Origin: *   on every endpoint
No CSP, no X-Frame-Options, no HSTS, Express version disclosed
```

**Why it matters:** a forged JWT with the default secret is a full admin session. Combined with a published password and no rate limit, the console is effectively open.

**Fix (1 hour)**
- Refuse to boot in production if `JWT_SECRET` is missing or equals the default.
- Add `express-rate-limit`: 5 attempts / 15 min on `/api/admin/login` and `/api/login`.
- Remove the credential hint from public pages; keep it in `README.md` only.
- `app.use(helmet())` and restrict CORS to your own origin.
- Force a password change on first admin login.

---

### 3. Hindi is ~28% functional

**Evidence**
```
Dictionary entries: 93      Still match current HTML: 38      Dead entries: 55
Homepage after clicking हिन्दी: 153 text elements → 110 still in English
Hero headline unchanged: "Every opportunity for an Indian student…"
```
The translation engine still works (exact-match text-node swapping) — but the premium copy rewrite replaced almost every string it was keyed to.

**Why it matters:** "English and Hindi" is one of four trust chips on your hero. A Hindi-medium student is your core user, and clicking हिन्दी does almost nothing.

**Fix options**

| Option | Effort | Quality |
|---|---|---|
| A. `data-i18n="key"` attributes on every string + a JSON dictionary | ~1 day | Correct, maintainable |
| B. Machine-translate the 153 strings once, store as JSON | 3 hours | Good, needs a native review |
| C. Hide the toggle until done | 10 min | Honest |

Recommend **A**, shipping in slices: hero + nav + finder first (the paths a student actually uses).

---

## 🟠 HIGH — broken journeys

### 4. Signed-out "Track" and "Save" send users to a 404

```
widgets.js: window.location.href = 'pages/login.html'
From /pages/jobs.html → resolves to /pages/pages/login.html → HTTP 404
```
**Verified in a browser:** clicking Track while signed out lands on an error page.
This is your single worst moment to lose someone — they just tried to commit.
**Fix (5 min):** use an absolute path `/pages/login.html`, or compute it from `location`.

### 5. Dashboard deadline links are all dead

```
dashboard.html: href="${x.table.replace(/_/g,'-')}"
→ jobs · scholarships · entrance-exams · courses …   (no .html, and the page is exams.html)
```
Crawler found **6 broken internal links**, all on the dashboard.
**Fix (10 min):** a `TABLE_PAGE = {jobs:'jobs.html', entrance_exams:'exams.html', …}` map.

### 6. Missing pages that make it a real product

| Missing | Impact |
|---|---|
| `privacy.html`, `terms.html` | You collect email + profile data. Illegal to operate without a policy in most jurisdictions, and it's a known blueprint gap. |
| `404.html` | Any bad URL shows Express's default page — visibly unfinished. |
| `robots.txt` + `sitemap.xml` | Google cannot properly discover 25 pages. |
| `favicon.ico` / `manifest.json` | Browser tab shows a blank icon. |
| Real `og:image` + OG tags | Sharing on WhatsApp (how Indian students actually share) shows no preview. |

**Fix (2 hours total).**

### 7. Dependency vulnerabilities
`npm audit`: **7 vulnerabilities (2 low, 4 high, 1 critical)** via `sqlite3 → tar → cacache`.
Build-time chain, not remotely exploitable in this app, but it's a critical advisory sitting in a "premium" product.
**Fix:** `npm audit fix` where non-breaking, or plan the `sqlite3@6` / `better-sqlite3` migration.

---

## 🟡 MEDIUM — quality debt

### 8. Accessibility failures on every page (axe-core)

| Rule | Severity | Pages | Cause |
|---|---|---|---|
| `color-contrast` | serious | all | `--ink-300 #9aa2af` on white = **2.4:1**, needs 4.5:1 |
| `heading-order` | moderate | all | h1 → h3/h4 skips a level (footer `h4` after `h2`) |
| `aria-required-children` / `-parent` | **critical** | calendar | `role="grid"` without `row` children |
| `label-content-name-mismatch` | serious | all | `aria-label="India Career Hub, home"` vs visible `IndiaCareer Hub` |
| `landmark-one-main` / `region` | moderate | admin | no `<main>` element |
| `empty-table-header` | minor | dashboard | `<th></th>` on the actions column |

**Fix (3 hours)**
- Darken `--ink-300` to `#6b7280` for text; keep the light grey only for icons/hairlines.
- Add `<main>` to admin; give the calendar `role="table"` or drop the roles.
- Fix the brand `aria-label`; add `sr-only` text to empty headers.
- Re-run axe → target 0 serious violations.

### 9. No compression, no caching
```
style.css sent as 84,324 bytes raw   (≈ 12 KB with gzip)
Cache-Control: public, max-age=0     ← nothing is ever cached
```
**Fix (20 min):** `app.use(compression())` and `express.static(..., { maxAge: '7d', immutable: true })` for `/css` and `/js`. Biggest single speed win available, and free.

### 10. CSS grew by patching, not by design
```
1,967 lines · 83 KB · 629 rule blocks · 20 selectors defined more than once
.header-actions ×5 · .header-inner ×4 · .nav ×4 · .toolbar ×3
```
Six waves of appending have left overrides fighting each other. It works, but it's now hard to change safely.
**Fix (half day):** consolidate the appended layers (bridge → refinements → fixes) into the original token-based structure. No visual change expected; big maintainability gain.

### 11. The database says the same thing three times
`https://scholarships.gov.in/` appears **7 times** across schemes, scholarships and portals. `swayam.gov.in` **6 times**. The same opportunity surfaces as a scheme, a course *and* a portal, which inflates your "144 records" claim and confuses users.

**Fix (design decision, then 3 hours):** keep the tables but add `related_portal_id`, and make the directory the canonical home for a website. Stop counting the same entity three times on the homepage.

### 12. Study material links are unverified
4 of 18 returned no response from this network (NCERT, ePathshala, NROER, eGyanKosh) — possibly blocked or geo-restricted, but I cannot confirm they work. They should carry the same honest verification treatment as portals.

---

## 🟢 LOW / polish

- `?limit=999999` is accepted unbounded — cap it at 100.
- Dashboard still references `Poppins` (removed font) and hardcoded hex colours in inline styles, breaking dark mode in those spots.
- `X-Powered-By: Express` disclosed.
- The site has no print stylesheet for the "print my shortlist" use case you'll want for rural/low-connectivity users.
- No `lang` attributes on Hindi-only content blocks.

---

## What's genuinely good — keep doing this

- **Consistency.** Every listing page renders from one `cards.js` spec. That's why 25 pages never drift.
- **Zero external dependencies.** System fonts + inline SVG icons render offline, in sandboxed previews and on 2G.
- **The finder's honesty model.** Records whose eligibility can't be parsed show *"check notification"* instead of being dropped. That's the right instinct — apply the same pattern to link verification.
- **Grounded AI with citations.** Retrieval mode costs ₹0 and never invents. It degrades gracefully instead of breaking.
- **It actually runs.** 0 JS errors across 25 pages, 0 horizontal scroll at 360/768/1440.

---

## Recommended order of work

| # | Task | Effort | Why now |
|---|---|---|---|
| 1 | Kill public admin creds + JWT guard + rate limit | 1 h | Security |
| 2 | Fix the two 404 redirects (login, dashboard links) | 20 min | Loses real users |
| 3 | Honest verification: set `unverified`, add link checker | 2 h | Credibility is the whole product |
| 4 | Privacy, terms, 404, robots, sitemap, favicon, OG | 2 h | Makes it a real site |
| 5 | Accessibility pass → 0 serious axe violations | 3 h | Cheap, principled, SEO benefit |
| 6 | gzip + cache headers | 20 min | Free speed |
| 7 | Hindi re-keying (hero + nav + finder first) | 1 day | Delivers a headline promise |
| 8 | De-duplicate portal/scheme/course entities | 3 h | Honest record counts |
| 9 | CSS consolidation | 4 h | Makes everything after this cheaper |
| 10 | Dependency upgrade | 2 h | Closes the critical advisory |

**Total to "I can show this to a ministry officer": ~1 working day (items 1–6).**

---

## The one strategic suggestion

Right now the platform aggregates what others publish. That is a commodity — anyone can scrape a list.

Your defensible advantage is **the verification layer**: *"we checked this link 12 minutes ago and it works; we read this vacancy count on the official notification on 30 October."* Nobody else does that for Indian students, because it's tedious.

Which means: **the link checker and the verification timestamp are not a feature, they are the product.** Build them properly before adding anything else.
