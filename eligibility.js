/* ============================================================================
   eligibility.js — preliminary matching engine
   ----------------------------------------------------------------------------
   Reads the existing free-text qualification / income / age columns and turns
   them into a ranked, explained match. It never claims certainty: every result
   carries a confidence level and the reason it matched, and anything it cannot
   read is returned as "check_notification" rather than dropped.
   ============================================================================ */

const db = require('./db');

/* ---------------------------------------------------------------- vocabulary */
const LEVELS = [
  { key: 'below10', rank: 0, label: 'Below class 10' },
  { key: '10th',    rank: 1, label: 'Class 10 pass' },
  { key: '12th',    rank: 2, label: 'Class 12 pass' },
  { key: 'iti',     rank: 3, label: 'ITI certificate' },
  { key: 'diploma', rank: 4, label: 'Diploma' },
  { key: 'graduate',rank: 5, label: 'Graduation (BA/BSc/BCom/BTech/BCA)' },
  { key: 'pg',      rank: 6, label: 'Post graduation' },
  { key: 'phd',     rank: 7, label: 'PhD' }
];

const RANK = Object.fromEntries(LEVELS.map(l => [l.key, l.rank]));

const QUAL_ALIASES = {
  below10: ['below 10', 'no formal', 'illiterate'],
  '10th': ['10th', 'class 10', 'matric', 'matriculation', 'high school', 'sslc', '10 pass'],
  '12th': ['12th', 'class 12', 'intermediate', 'higher secondary', 'hsc', 'senior secondary', '10+2', '12 pass'],
  iti: ['iti', 'trade certificate', 'nctvt'],
  diploma: ['diploma', 'polytechnic'],
  graduate: ['graduat', 'bachelor', 'b.tech', 'btech', 'b.e', 'bsc', 'b.sc', 'ba ', ' b.a', 'bcom',
             'b.com', 'bca', 'b.pharma', 'bpharma', 'degree', 'any discipline', 'undergraduate',
             'b.voc', 'bsw', 'b.ed'],
  pg: ['post graduat', 'post-graduat', 'master', 'm.tech', 'mtech', 'msc', 'm.sc', 'ma ', 'm.a',
       'mcom', 'm.com', 'mba', 'mca', 'm.phil'],
  phd: ['phd', 'ph.d', 'doctorate', 'research scholar']
};

/* strings that mean "anything goes" and must never be treated as a filter */
const OPEN_TERMS = ['any', 'all', 'not applicable', 'varies', 'ongoing', 'as per', 'open to all'];

/* ------------------------------------------------------------------ helpers */
function detectLevels(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return [];
  const hits = [];
  for (const [level, words] of Object.entries(QUAL_ALIASES)) {
    if (words.some(w => t.includes(w))) hits.push(level);
  }
  return [...new Set(hits)];
}

/* "Rs 2.5 lakh", "2,50,000", "₹1.8 lakh" -> number in rupees, or null */
function parseRupees(text) {
  const t = String(text || '').toLowerCase().replace(/,/g, '');
  if (!t.trim()) return null;
  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)/);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);
  const crore = t.match(/(\d+(?:\.\d+)?)\s*crore/);
  if (crore) return Math.round(parseFloat(crore[1]) * 10000000);
  const plain = t.match(/(?:rs\.?|₹|inr)?\s*(\d{4,9})/);
  if (plain) return parseInt(plain[1], 10);
  return null;
}

/* "18-32 years", "18 years and above", "up to 27 years" -> {min,max} */
function parseAge(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  const range = t.match(/(\d{2})\s*(?:-|to)\s*(\d{2})/);
  if (range) return { min: +range[1], max: +range[2] };
  const above = t.match(/(\d{2})\s*(?:\+|and above|or above|years and above)/);
  if (above) return { min: +above[1], max: null };
  const below = t.match(/(?:up to|below|maximum)\s*(\d{2})/);
  if (below) return { min: null, max: +below[1] };
  return null;
}

const dayMs = 86400000;
function daysLeft(v) {
  if (!v) return null;
  const d = new Date(String(v).split(' to ')[0]);
  if (isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / dayMs);
}

function statusOf(row) {
  const auto = (row.auto_status || row.status || '').toLowerCase();
  if (['closed', 'cancelled'].includes(auto)) return 'closed';
  const dl = daysLeft(row.last_date) ?? daysLeft(row.application_dates);
  if (dl === null) return auto || 'open';
  if (dl < 0) return 'closed';
  if (dl <= 10) return 'closing';
  return 'open';
}

/* ---------------------------------------------------------------- matching */
/**
 * @param {{qualification:string,state:string,category:string,age?:number,income?:number}} p
 * @returns {Promise<{profile:object, jobs:object[], scholarships:object[], schemes:object[], courses:object[], summary:object}>}
 */
async function find(p) {
  const wantRank = RANK[p.qualification] ?? 5;
  const studentState = (p.state || '').trim().toLowerCase();
  const studentCat = (p.category || '').trim().toLowerCase();
  const age = Number.isFinite(p.age) ? p.age : null;
  const income = Number.isFinite(p.income) ? p.income : null;

  const all = async (sql) => new Promise((resolve) => db.all(sql, [], (e, rows) => resolve(e ? [] : rows)));

  const [jobs, scholarships, schemes, courses] = await Promise.all([
    all('SELECT * FROM jobs'),
    all('SELECT * FROM scholarships'),
    all('SELECT * FROM schemes'),
    all('SELECT * FROM courses')
  ]);

  function assessQualification(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim() || OPEN_TERMS.some(o => t.startsWith(o) || t === o)) {
      return { ok: true, confidence: 'open', reason: 'Open to all qualifications' };
    }
    const levels = detectLevels(t);
    if (!levels.length) {
      return { ok: true, confidence: 'unknown', reason: 'Eligibility not machine-readable — check the notification' };
    }
    const minNeeded = Math.min(...levels.map(l => RANK[l]));
    if (wantRank >= minNeeded) {
      const needLabel = LEVELS.find(l => l.key === levels.find(x => RANK[x] === minNeeded))?.label || 'the stated level';
      return { ok: true, confidence: 'confirmed', reason: `Requires ${needLabel.toLowerCase()} — you meet it` };
    }
    return { ok: false };
  }

  function assessState(text) {
    const t = String(text || '').trim().toLowerCase();
    if (!t || ['all', 'all india', 'central', 'any'].includes(t) || t.includes('all india')) {
      return { ok: true, reason: 'All India' };
    }
    if (!studentState) return { ok: true, reason: t };
    if (t === studentState || t.includes(studentState) || studentState.includes(t)) {
      return { ok: true, reason: `Your state (${text})` };
    }
    return { ok: false };
  }

  function assessCategory(text) {
    const t = String(text || '').trim().toLowerCase();
    if (!t || OPEN_TERMS.some(o => t.includes(o)) || t === 'all') return { ok: true, reason: null };
    if (!studentCat) return { ok: true, reason: t };
    if (t.includes(studentCat)) return { ok: true, reason: `Reserved for ${text}` };
    return { ok: false };
  }

  function assessIncome(text) {
    const limit = parseRupees(text);
    if (limit === null) return { ok: true, reason: null };
    if (income === null) return { ok: true, reason: `Income limit ₹${limit.toLocaleString('en-IN')}` };
    if (income <= limit) return { ok: true, reason: `Income limit ₹${limit.toLocaleString('en-IN')} — you qualify` };
    return { ok: false };
  }

  function assessAge(text) {
    const r = parseAge(text);
    if (!r) return { ok: true, reason: null };
    if (age === null) return { ok: true, reason: text.trim() };
    if (r.min !== null && age < r.min) return { ok: false };
    if (r.max !== null && age > r.max) return { ok: false };
    return { ok: true, reason: `Age ${text.trim()}` };
  }

  function decorate(row, table, checks) {
    const reasons = checks.map(c => c.reason).filter(Boolean);
    const hasUnknown = checks.some(c => c.confidence === 'unknown');
    const table2type = { jobs: 'jobs', scholarships: 'scholarships', schemes: 'schemes', courses: 'courses' };
    return {
      ...row,
      table: table2type[table],
      match: {
        confidence: hasUnknown ? 'unknown' : 'confirmed',
        reasons,
        days_left: daysLeft(row.last_date) ?? daysLeft(row.application_dates),
        status: statusOf(row)
      }
    };
  }

  /* ---- jobs ---- */
  const jobHits = [];
  for (const j of jobs) {
    const q = assessQualification(j.qualification);
    if (!q.ok) continue;
    const s = assessState(j.state);
    if (!s.ok) continue;
    const a = assessAge(j.age_limit);
    if (!a.ok) continue;
    jobHits.push(decorate(j, 'jobs', [q, s, a]));
  }

  /* ---- scholarships ---- */
  const schHits = [];
  for (const s0 of scholarships) {
    const q = assessQualification(s0.qualification || s0.course_eligibility);
    if (!q.ok) continue;
    const s = assessState(s0.state);
    if (!s.ok) continue;
    const c = assessCategory(`${s0.category || ''} ${s0.eligible_students || ''}`);
    if (!c.ok) continue;
    const inc = assessIncome(s0.family_income);
    if (!inc.ok) continue;
    schHits.push(decorate(s0, 'scholarships', [q, s, c, inc]));
  }

  /* ---- schemes ---- */
  const schemeHits = [];
  for (const s0 of schemes) {
    const q = assessQualification(s0.eligibility);
    if (!q.ok) continue;
    const s = assessState(s0.state);
    if (!s.ok) continue;
    const c = assessCategory(`${s0.category_requirements || ''} ${s0.eligibility || ''}`);
    if (!c.ok) continue;
    const inc = assessIncome(s0.income_limit);
    if (!inc.ok) continue;
    const a = assessAge(s0.age_requirements);
    if (!a.ok) continue;
    schemeHits.push(decorate(s0, 'schemes', [q, s, c, inc, a]));
  }

  /* ---- courses ---- */
  const courseHits = [];
  for (const c0 of courses) {
    const q = assessQualification(c0.eligibility);
    if (!q.ok) continue;
    courseHits.push(decorate(c0, 'courses', [q]));
  }

  /* ---- rank: open + soonest deadline first, unreadable last ---- */
  const sortFn = (a, b) => {
    const rank = (r) => r.match.confidence === 'confirmed' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const da = a.match.days_left, db2 = b.match.days_left;
    if (da === null && db2 === null) return 0;
    if (da === null) return 1;
    if (db2 === null) return -1;
    return da - db2;
  };

  const trim = (arr, n) => arr.sort(sortFn).slice(0, n).map(r => ({
    ...r,
    match: { ...r.match, reasons: r.match.reasons.slice(0, 4) }
  }));

  const jobsOut = trim(jobHits, 40);
  const schOut = trim(schHits, 40);
  const schemeOut = trim(schemeHits, 40);
  const courseOut = trim(courseHits, 24);

  return {
    profile: {
      qualification: p.qualification || null,
      state: p.state || null,
      category: p.category || null,
      age: age,
      income: income
    },
    jobs: jobsOut,
    scholarships: schOut,
    schemes: schemeOut,
    courses: courseOut,
    summary: {
      jobs: jobsOut.length,
      scholarships: schOut.length,
      schemes: schemeOut.length,
      courses: courseOut.length,
      closed_excluded: [...jobs, ...scholarships, ...schemes]
        .filter(r => statusOf(r) === 'closed').length,
      total_checked: jobs.length + scholarships.length + schemes.length + courses.length
    }
  };
}

module.exports = { find, LEVELS, parseRupees, parseAge, detectLevels };
