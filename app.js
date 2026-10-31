/* ============================================================================
   INDIA STUDENT & CAREER HUB — homepage logic (v3)
   Builds category cards, qualification chips, live counters, latest updates,
   closing-soon deadlines and free courses. All markup matches style.css v3.
   ============================================================================ */

const API = '/api';

const CATEGORIES = [
  { title: 'Central Government Jobs', desc: 'UPSC, SSC, Railway, Banking, India Post and central ministries.', icon: 'landmark', link: 'pages/jobs.html' },
  { title: 'State Government Jobs', desc: 'State PSCs, police, teaching, health and subordinate services.', icon: 'map-marked-alt', link: 'pages/states.html' },
  { title: 'PSU Recruitment', desc: 'ONGC, IOCL, NTPC, BHEL, GAIL, SAIL and other public sector units.', icon: 'industry', link: 'pages/jobs.html' },
  { title: 'Defence Jobs', desc: 'Army, Navy, Air Force, NDA, CAPF and paramilitary forces.', icon: 'shield-alt', link: 'pages/jobs.html' },
  { title: 'Scholarships', desc: 'Pre-matric, post-matric, merit, SC/ST/OBC and minority scholarships.', icon: 'money-bill-wave', link: 'pages/scholarships.html' },
  { title: 'Government Schemes', desc: 'Education, employment, financial assistance and welfare schemes.', icon: 'inbox', link: 'pages/schemes.html' },
  { title: 'Free Online Courses', desc: 'SWAYAM, NPTEL, NIELIT and government-certified free courses.', icon: 'laptop-code', link: 'pages/courses.html' },
  { title: 'Skill Development', desc: 'PMKVY, Skill India and sector-wise vocational training.', icon: 'handshake', link: 'pages/skillsindia.html' },
  { title: 'Internships', desc: 'PM Internship Scheme, AICTE and ministry internships.', icon: 'user-graduate', link: 'pages/internships.html' },
  { title: 'Apprenticeships', desc: 'NATS, NAPS, PSU and railway apprenticeship programmes.', icon: 'hard-hat', link: 'pages/apprenticeships.html' },
  { title: 'Entrance Exams', desc: 'CUET, JEE, NEET, GATE, UGC NET and state entrance exams.', icon: 'file-alt', link: 'pages/exams.html' },
  { title: 'University Admissions', desc: 'Polytechnic, ITI and government college admissions.', icon: 'university', link: 'pages/admissions.html' }
];

const QUALIFICATIONS = [
  '5th / 8th Pass', '10th Pass', '12th Pass', 'ITI', 'Diploma', 'Graduation',
  'BA', 'BSc', 'BCom', 'BCA', 'BTech / BE', 'BSc PCM', 'BSc Biology',
  'BSc Agriculture', 'MA / MSc / MCom', 'MBA / MCA', 'PhD'
];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- categories */
function renderCategories() {
  const grid = $('categoryGrid');
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map(c => {
    const ic = window.__icon ? window.__icon(c.icon) : '';
    return `<a href="${c.link}" class="card">
      <span class="card-ico">${ic}</span>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <span class="card-cta">Explore ${window.__icon ? window.__icon('arrow-right') : ''}</span>
    </a>`;
  }).join('');
}

/* ------------------------------------------------------------ qualification */
const QUAL_KEY = {
  '5th / 8th Pass': 'below10', '10th Pass': '10th', '12th Pass': '12th',
  'ITI': 'iti', 'Diploma': 'diploma', 'Graduation': 'graduate',
  'BA': 'graduate', 'BSc': 'graduate', 'BCom': 'graduate', 'BCA': 'graduate',
  'BTech / BE': 'graduate', 'BSc PCM': 'graduate', 'BSc Biology': 'graduate',
  'BSc Agriculture': 'graduate', 'MA / MSc / MCom': 'pg', 'MBA / MCA': 'pg', 'PhD': 'phd'
};

function renderQualificationFilters() {
  const box = $('qualFilters');
  if (!box) return;
  box.innerHTML = QUALIFICATIONS.map(q =>
    `<button class="chip-btn" data-qual="${esc(q)}" type="button">${esc(q)}</button>`
  ).join('');
  box.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      box.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      window.location.href = `pages/finder.html?qual=${encodeURIComponent(QUAL_KEY[chip.dataset.qual] || '12th')}`;
    });
  });
}

/* -------------------------------------------------------------- live counters */
async function loadStats() {
  const endpoints = [
    { url: `${API}/jobs`, el: 'countJobs' },
    { url: `${API}/scholarships`, el: 'countScholarships' },
    { url: `${API}/schemes`, el: 'countSchemes' },
    { url: `${API}/courses`, el: 'countCourses' },
    { url: `${API}/internships`, el: 'countInternships' },
    { url: `${API}/govt-portals`, el: 'countPortals' }
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      const data = await res.json();
      animateCount(ep.el, Array.isArray(data) ? data.length : 0);
    } catch (err) {
      animateCount(ep.el, 0);
    }
  }
}

function animateCount(id, target) {
  const el = $(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || target === 0) { el.textContent = target || '—'; return; }
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 24));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = String(current);
  }, 28);
}

/* ------------------------------------------------------------------- updates */
function emptyState(text) {
  return `<div class="empty"><p>${text}</p></div>`;
}

async function loadUpdates() {
  const grid = $('updatesGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/updates?limit=6`);
    const updates = await res.json();
    if (!Array.isArray(updates) || updates.length === 0) {
      grid.innerHTML = emptyState('Updates appear here as new government notifications are published.');
      return;
    }
    grid.innerHTML = updates.map(u => `
      <article class="card">
        <div class="card-meta" style="margin-bottom:10px">
          <span class="chip chip--line">${esc(u.meta || 'Update')}</span>
          ${u.is_auto ? '<span class="chip chip--green">Auto</span>' : ''}
          ${u.featured ? '<span class="chip chip--accent">Featured</span>' : ''}
        </div>
        <h3>${esc(u.title)}</h3>
        <p>${esc(u.excerpt || '')}</p>
        <a href="${esc(u.link || '#')}" class="card-cta">Read more ${window.__icon ? window.__icon('arrow-right') : ''}</a>
      </article>
    `).join('');
  } catch (err) {
    grid.innerHTML = emptyState('Unable to load updates right now.');
  }
}

/* -------------------------------------------------------------- closing soon */
function daysLeft(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

async function loadClosingSoon() {
  const grid = $('closingGrid');
  if (!grid) return;
  try {
    const [jobs, scholarships, internships] = await Promise.all([
      fetch(`${API}/jobs`).then(r => r.json()),
      fetch(`${API}/scholarships`).then(r => r.json()),
      fetch(`${API}/internships`).then(r => r.json())
    ]);

    const items = [];
    const push = (list, type, titleKey, orgKey, dateKey, linkKey, table) => {
      (list || []).forEach(x => {
        const days = daysLeft(x[dateKey]);
        if (days === null || days < 0 || days > 30) return;
        items.push({
          id: x.id, table, days,
          title: x[titleKey] || x.title || 'Opportunity',
          org: x[orgKey] || x.department || 'Government of India',
          dates: x[dateKey],
          link: x[linkKey] || '#'
        });
      });
    };

    push(jobs, 'Job', 'post_name', 'organisation', 'last_date', 'application_link', 'jobs');
    push(scholarships, 'Scholarship', 'title', 'department', 'application_dates', 'link', 'scholarships');
    push(internships, 'Internship', 'post_title', 'organisation', 'last_date', 'link', 'internships');

    items.sort((a, b) => a.days - b.days);
    const top = items.slice(0, 6);

    if (!top.length) {
      grid.innerHTML = emptyState('No deadlines in the next 30 days. Check back soon.');
      return;
    }

    grid.innerHTML = top.map(i => {
      const urgent = i.days <= 7 ? 'closing' : '';
      const label = i.days === 0 ? 'Last day' : `${i.days} day${i.days > 1 ? 's' : ''} left`;
      return `<article class="card ${urgent}" data-record="${i.table}:${i.id}">
        <span class="badge-float badge-float--closing">${label}</span>
        <div class="card-meta" style="margin-bottom:10px"><span class="chip chip--line">${i.table.replace(/s$/, '')}</span></div>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.org)}</p>
        <div class="card-meta"><span>${window.__icon ? window.__icon('calendar-days') : ''} ${esc(i.dates)}</span></div>
        <a href="${esc(i.link)}" target="_blank" rel="noopener" class="card-cta">Apply on official portal ${window.__icon ? window.__icon('external-link-alt') : ''}</a>
      </article>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = emptyState('Unable to load deadlines right now.');
  }
}

/* ------------------------------------------------------------- free courses */
async function loadFreeCourses() {
  const grid = $('freeCoursesGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/courses?limit=6`);
    const courses = await res.json();
    if (!Array.isArray(courses) || courses.length === 0) {
      grid.innerHTML = emptyState('Free courses appear here once published.');
      return;
    }
    grid.innerHTML = courses.slice(0, 6).map(c => `
      <article class="card">
        <span class="card-ico">${window.__icon ? window.__icon('laptop-code') : ''}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.provider || 'Government of India')} · ${esc(c.duration || 'Self-paced')}</p>
        <div class="card-meta">
          <span class="chip chip--line">${esc(c.sector || 'General')}</span>
          <span class="chip chip--green">${esc(c.course_fee || 'Free')}</span>
        </div>
        <a href="${esc(c.link || '#')}" target="_blank" rel="noopener" class="card-cta">Enrol ${window.__icon ? window.__icon('external-link-alt') : ''}</a>
      </article>
    `).join('');
  } catch (err) {
    grid.innerHTML = emptyState('Unable to load courses right now.');
  }
}

/* ------------------------------------------------------------ state chips */
const STATES = ['Rajasthan', 'Uttar Pradesh', 'Bihar', 'Madhya Pradesh', 'Maharashtra',
  'Gujarat', 'Punjab', 'Haryana', 'Delhi', 'Tamil Nadu', 'Karnataka', 'West Bengal',
  'Kerala', 'Odisha', 'Assam', 'Telangana', 'Andhra Pradesh', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand'];

function renderStateChips() {
  const box = $('stateChips');
  if (!box) return;
  box.innerHTML = STATES.map(s =>
    `<a class="chip-btn" href="pages/states.html?state=${encodeURIComponent(s)}">${esc(s)}</a>`
  ).join('');
}

/* ---------------------------------------------------------------- AI search */
function performAISearch() {
  const input = $('aiSearchInput');
  const q = input ? input.value.trim() : '';
  window.location.href = `pages/search.html${q ? '?q=' + encodeURIComponent(q) : ''}`;
}

/* --------------------------------------------------------------- newsletter */
async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = $('newsletterEmail').value;
  const msg = $('newsletterMsg');
  try {
    const res = await fetch(`${API}/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error();
    msg.className = 'alert alert--ok is-visible';
    msg.textContent = 'Subscribed. You will receive weekly job and scholarship alerts.';
    $('newsletterForm').reset();
  } catch (err) {
    msg.className = 'alert alert--err is-visible';
    msg.textContent = 'Subscription failed. Please try again.';
  }
}

/* -------------------------------------------------------------- hero search */
function searchHero() {
  const q = $('heroSearch')?.value.trim();
  window.location.href = `pages/search.html${q ? '?q=' + encodeURIComponent(q) : ''}`;
}

/* --------------------------------------------------------------------- init */
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderQualificationFilters();
  renderStateChips();
  loadStats();
  loadUpdates();
  loadClosingSoon();
  loadFreeCourses();
  $('heroSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchHero(); });
});
