/* ============================================================================
   ai.js — AI assistant on a FREE API
   ----------------------------------------------------------------------------
   Provider: Google Gemini API, free tier (no credit card).
     Free-tier facts (verified Oct 2026): Flash and Flash-Lite models only,
     roughly 10-30 requests/minute and 250-1,500 requests/day depending on model.
     Pro models moved to paid-only in April 2026.
     Source: ai.google.dev pricing / rate-limit docs.

   Design rules taken from the blueprint:
     - Answers must be grounded in platform records, never invented.
     - Every answer cites the record + official source link.
     - If nothing matches, say so instead of guessing.
     - Eligibility is framed as "potential match", never a guarantee.
     - Free tier means Google may use prompts for training, so we send only
       public opportunity data — never user emails, passwords or profiles.

   With no API key the module still works in RETRIEVAL mode: it performs the
   same database lookup and returns a structured, citation-backed summary with
   zero cost and zero external calls. So the site works even before you get a key.
   ============================================================================ */

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || '400', 10);
const PER_MINUTE_LIMIT = parseInt(process.env.AI_RPM_LIMIT || '8', 10);

/* ---- simple in-memory rate limiter, keeps us inside the free quota ---- */
const bucket = { day: new Date().toDateString(), dayCount: 0, minute: Date.now(), minuteCount: 0 };

function allowRequest() {
  const now = Date.now();
  const today = new Date().toDateString();
  if (bucket.day !== today) { bucket.day = today; bucket.dayCount = 0; }
  if (now - bucket.minute > 60000) { bucket.minute = now; bucket.minuteCount = 0; }
  if (bucket.dayCount >= DAILY_LIMIT) return { ok: false, reason: 'daily' };
  if (bucket.minuteCount >= PER_MINUTE_LIMIT) return { ok: false, reason: 'minute' };
  bucket.minuteCount++; bucket.dayCount++;
  return { ok: true };
}

function usage() {
  return { day: bucket.day, used_today: bucket.dayCount, daily_limit: DAILY_LIMIT, per_minute_limit: PER_MINUTE_LIMIT };
}

/* ============================================================================
   RETRIEVAL — pull matching records out of the platform's own database
   ============================================================================ */
const TABLES = [
  { name: 'jobs', label: 'Government Job', icon: 'briefcase',
    title: ['post_name'], org: ['organisation'], text: ['post_name', 'organisation', 'qualification', 'subject_requirements', 'state', 'advertisement_number', 'job_type', 'salary'],
    link: 'application_link', date: 'last_date' },
  { name: 'scholarships', label: 'Scholarship', icon: 'money-bill-wave',
    title: ['title'], org: ['department'], text: ['title', 'department', 'category', 'eligible_students', 'qualification', 'state', 'course_eligibility'],
    link: 'link', date: 'application_dates' },
  { name: 'schemes', label: 'Government Scheme', icon: 'inbox',
    title: ['title'], org: ['ministry'], text: ['title', 'ministry', 'description', 'sector', 'category', 'eligibility', 'benefits'],
    link: 'link', date: null },
  { name: 'courses', label: 'Free Course', icon: 'laptop-code',
    title: ['title'], org: ['provider'], text: ['title', 'provider', 'subject', 'sector', 'level'],
    link: 'link', date: 'enrollment_deadline' },
  { name: 'training', label: 'Training Programme', icon: 'certificate',
    title: ['title'], org: ['provider'], text: ['title', 'provider', 'sector', 'type', 'location'],
    link: 'link', date: null },
  { name: 'internships', label: 'Internship', icon: 'user-graduate',
    title: ['post_title'], org: ['organisation'], text: ['post_title', 'organisation', 'qualification', 'location'],
    link: 'link', date: 'last_date' },
  { name: 'apprenticeships', label: 'Apprenticeship', icon: 'hard-hat',
    title: ['trade'], org: ['organisation'], text: ['trade', 'organisation', 'qualification', 'location'],
    link: 'link', date: 'last_date' },
  { name: 'entrance_exams', label: 'Entrance Exam', icon: 'file-alt',
    title: ['exam_name'], org: ['conducting_body'], text: ['exam_name', 'conducting_body', 'qualification', 'syllabus'],
    link: 'link', date: 'last_date' },
  { name: 'govt_portals', label: 'Official Portal', icon: 'sitemap',
    title: ['name'], org: [], text: ['name', 'category', 'description', 'state'],
    link: 'url', date: null }
];

/** Very small keyword scorer — no dependencies, works offline. */
function query(question, limitPerTable = 2) {
  const words = String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return Promise.resolve([]);

  return Promise.all(TABLES.map(t => new Promise(resolve => {
    const like = words.map(() => t.text.map(c => `${c} LIKE ?`).join(' OR ')).map(g => `(${g})`).join(' OR ');
    const params = [];
    words.forEach(w => t.text.forEach(() => params.push(`%${w}%`)));

    db.all(`SELECT * FROM ${t.name} WHERE ${like} LIMIT 40`, params, (err, rows) => {
      if (err || !rows) return resolve([]);
      const scored = rows.map(r => {
        const hay = t.text.map(c => r[c] || '').join(' ').toLowerCase();
        let score = 0;
        words.forEach(w => { if (hay.includes(w)) score += 2; });
        if (t.title.some(c => words.some(w => (r[c] || '').toLowerCase().includes(w)))) score += 5;
        return { table: t, record: r, score };
      });
      resolve(scored.sort((a, b) => b.score - a.score).slice(0, limitPerTable));
    });
  }))).then(groups => groups.flat().filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8));
}

const STOP = new Set(['the', 'and', 'for', 'any', 'are', 'how', 'can', 'you', 'get', 'what', 'with', 'about',
  'from', 'job', 'jobs', 'tell', 'give', 'show', 'find', 'want', 'need', 'please', 'there', 'this', 'that',
  'which', 'when', 'where', 'have', 'has', 'will', 'would', 'should', 'could', 'my', 'me', 'in', 'on', 'of',
  'to', 'is', 'a', 'an', 'or', 'do', 'does', 'i']);

const db = require('./db'); // circular-safe: server.js already loaded it

/* ---- build the citation block that goes into the prompt and the response ---- */
function toCitations(matches) {
  return matches.map((m, i) => {
    const t = m.table, r = m.record;
    const title = t.title.map(c => r[c]).filter(Boolean)[0] || 'Record';
    const org = t.org.map(c => r[c]).filter(Boolean)[0] || '';
    const fields = [];
    ['qualification', 'eligibility', 'age_limit', 'salary', 'stipend', 'scholarship_amount',
     'benefits', 'duration', 'course_fee', 'total_vacancies', 'last_date', 'application_dates',
     'enrollment_deadline', 'exam_date', 'state', 'status'].forEach(c => {
      if (r[c] && String(r[c]).trim()) fields.push(`${c.replace(/_/g, ' ')}: ${r[c]}`);
    });
    return {
      n: i + 1,
      label: t.label,
      title,
      organisation: org,
      detail: fields.slice(0, 6).join(' · '),
      official_link: r[t.link] || '',
      record_link: `/${t.name.replace(/_/g, '-')}`,
      last_verified: r.updated_at || r.created_at || r.last_checked || null
    };
  });
}

/* ============================================================================
   LOCAL ANSWER (no API key) — deterministic, grounded, free
   ============================================================================ */
function localAnswer(question, citations) {
  if (!citations.length) {
    return {
      answer: `I could not find a matching record in this platform's database for "${question}". ` +
        `Try a qualification ("12th pass"), a state ("Rajasthan"), a category ("scholarship", "railway", "internship") ` +
        `or browse the Government Jobs, Scholarships and Schemes pages. I will not guess details that are not in our verified records.`,
      mode: 'retrieval'
    };
  }
  const lines = citations.slice(0, 6).map(c =>
    `• ${c.title}${c.organisation ? ' — ' + c.organisation : ''} (${c.label})\n   ${c.detail}`).join('\n');
  return {
    answer:
      `Here is what our verified records show for "${question}":\n\n${lines}\n\n` +
      `This is a potential match based on the fields published in our database, not a confirmation of eligibility. ` +
      `Always open the official link and check the current notification before applying.`,
    mode: 'retrieval'
  };
}

/* ============================================================================
   GEMINI ANSWER (free tier) — grounded on the same records
   ============================================================================ */
async function geminiAnswer(question, citations, lang, pageContext) {
  const context = citations.map(c => `[${c.n}] ${c.label}: ${c.title}
  Organisation: ${c.organisation || 'not stated'}
  Key fields: ${c.detail || 'none recorded'}
  Official link: ${c.official_link || 'not recorded'}`).join('\n\n');

  const system = `You are the India Student & Career Hub assistant for Indian students.
STRICT RULES:
- Use ONLY the numbered records below. Never invent vacancies, dates, fees, salary, eligibility or URLs.
- Cite the record number in square brackets after each fact, e.g. [2].
- If the records do not answer the question, say so plainly and suggest what to search instead.
- Never say a user is definitely eligible. Say "potential match" and list what they must verify.
- Keep answers under 220 words, plain language, short paragraphs or bullets.
- Add one final line: "Verify on the official portal before applying."
${lang === 'hi' ? '- Answer in simple Hindi (Devanagari).' : '- Answer in simple English.'}

RECORDS:
${context || '(no matching records found)'}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body = {
    contents: [{
      role: 'user',
      parts: [{
        text: `${system}\n\n${pageContext ? `User is currently viewing: ${pageContext}\n` : ''}QUESTION: ${question}`
      }]
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini error ${res.status}`;
      return { answer: null, mode: 'error', error: msg };
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n').trim();
    if (!text) return { answer: null, mode: 'error', error: 'Empty response from model' };
    return { answer: text, mode: 'gemini:' + GEMINI_MODEL };
  } catch (e) {
    return { answer: null, mode: 'error', error: e.name === 'AbortError' ? 'Gemini request timed out' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================================
   PUBLIC ENTRY POINT
   ============================================================================ */
async function ask({ question, lang = 'en', pageContext = '' }) {
  const matches = await query(question);
  const citations = toCitations(matches);

  // No key configured -> free deterministic retrieval answer
  if (!GEMINI_KEY) {
    const local = localAnswer(question, citations);
    return { ...local, citations, usage: usage(), ai_enabled: false };
  }

  const gate = allowRequest();
  if (!gate.ok) {
    const local = localAnswer(question, citations);
    return {
      ...local,
      citations,
      usage: usage(),
      ai_enabled: true,
      note: gate.reason === 'daily'
        ? 'Daily free AI quota reached — showing database results instead. Quota resets at midnight.'
        : 'Too many questions in the last minute (free-tier rate limit) — showing database results instead.'
    };
  }

  const gem = await geminiAnswer(question, citations, lang, pageContext);
  if (!gem.answer) {
    const local = localAnswer(question, citations);
    return { ...local, citations, usage: usage(), ai_enabled: true, note: 'AI temporarily unavailable: ' + gem.error };
  }
  return { answer: gem.answer, mode: gem.mode, citations, usage: usage(), ai_enabled: true };
}

module.exports = { ask, usage, query, toCitations, aiConfigured: Boolean(GEMINI_KEY), model: GEMINI_MODEL };
