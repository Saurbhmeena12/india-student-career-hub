/* ============================================================================
   widgets.js — shared UI: AI Help assistant + record detail drawer + bookmarks
   Loaded on every page. Zero dependencies, works offline except AI answers.
   ============================================================================ */
(function () {
  const API = '/api';
  const CSS = `
  /* ---- AI launcher: quiet, ink, hairline — no gradient ------------- */
  .ai-fab{position:fixed;right:20px;bottom:20px;z-index:9998;display:inline-flex;align-items:center;gap:8px;
    padding:11px 17px;border:1px solid var(--ink-900,#0a0f1a);border-radius:999px;cursor:pointer;
    background:var(--ink-900,#0a0f1a);color:#fff;font:600 0.865rem var(--font,system-ui);
    box-shadow:0 4px 16px rgba(10,15,26,.18);transition:transform .16s ease,background .16s ease}
  .ai-fab:hover{background:var(--accent,#1f3a8a);border-color:var(--accent,#1f3a8a);transform:translateY(-1px)}
  .ai-fab .ico{width:15px;height:15px}

  .ai-panel{position:fixed;right:20px;bottom:20px;width:min(420px,calc(100vw - 24px));
    height:min(620px,calc(100vh - 40px));background:var(--surface,#fff);
    border:1px solid var(--hairline,#e9ebef);border-radius:15px;z-index:9999;display:none;
    flex-direction:column;overflow:hidden;box-shadow:0 4px 16px rgba(10,15,26,.10);
    font-family:var(--font,system-ui)}
  .ai-panel.open{display:flex}
  .ai-head{padding:14px 16px;border-bottom:1px solid var(--hairline,#e9ebef);
    display:flex;align-items:flex-start;justify-content:space-between;gap:10px;background:var(--surface,#fff)}
  .ai-head h4{margin:0;font-size:0.95rem;font-weight:650;color:var(--ink-900,#0a0f1a);
    letter-spacing:-.015em;display:flex;align-items:center;gap:7px}
  .ai-head small{display:block;font-weight:400;color:var(--ink-400,#6b7280);font-size:.735rem;margin-top:3px}
  .ai-close{background:var(--surface,#fff);border:1px solid var(--hairline-strong,#dde1e7);
    color:var(--ink-500,#556070);width:28px;height:28px;border-radius:7px;cursor:pointer;
    font-size:.95rem;line-height:1;display:grid;place-items:center}
  .ai-close:hover{background:var(--surface-3,#f5f6f8)}

  .ai-body{flex:1;overflow-y:auto;padding:16px;background:var(--surface-2,#fbfbfc);
    display:flex;flex-direction:column;gap:11px}
  .ai-msg{max-width:92%;padding:10px 13px;border-radius:11px;font-size:.865rem;line-height:1.55;
    white-space:pre-wrap;word-break:break-word}
  .ai-msg.user{align-self:flex-end;background:var(--accent,#1f3a8a);color:#fff;border-bottom-right-radius:4px}
  .ai-msg.bot{align-self:flex-start;background:var(--surface,#fff);
    border:1px solid var(--hairline,#e9ebef);color:var(--ink-700,#1f2937);border-bottom-left-radius:4px}
  .ai-note{align-self:flex-start;background:var(--amber-soft,#fffbeb);border:1px solid var(--amber-line,#fde9b8);
    color:var(--amber,#b45309);font-size:.755rem;padding:8px 11px;border-radius:8px;max-width:95%;line-height:1.5}
  .ai-cites{display:flex;flex-direction:column;gap:6px;margin-top:2px;align-self:stretch}
  .ai-cite{background:var(--surface,#fff);border:1px solid var(--hairline,#e9ebef);
    border-left:2px solid var(--accent,#1f3a8a);border-radius:8px;padding:9px 11px;
    font-size:.775rem;color:var(--ink-500,#556070);line-height:1.5}
  .ai-cite b{color:var(--ink-900,#0a0f1a);display:block;margin-bottom:2px;font-size:.8rem;font-weight:620}
  .ai-cite a{color:var(--accent,#1f3a8a);font-weight:600;text-decoration:none}
  .ai-cite a:hover{text-decoration:underline}

  .ai-quick{display:flex;flex-wrap:wrap;gap:5px;padding:10px 14px;background:var(--surface,#fff);
    border-top:1px solid var(--hairline,#e9ebef)}
  .ai-quick button{background:var(--surface,#fff);border:1px solid var(--hairline-strong,#dde1e7);
    border-radius:999px;padding:5px 10px;font-size:.74rem;cursor:pointer;
    color:var(--ink-500,#556070);font-family:inherit;transition:all .14s ease}
  .ai-quick button:hover{background:var(--ink-900,#0a0f1a);color:#fff;border-color:var(--ink-900,#0a0f1a)}

  .ai-input{display:flex;gap:7px;padding:11px 14px;background:var(--surface,#fff);
    border-top:1px solid var(--hairline,#e9ebef)}
  .ai-input textarea{flex:1;resize:none;border:1px solid var(--hairline-strong,#dde1e7);border-radius:9px;
    padding:9px 11px;font:inherit;font-size:.855rem;max-height:88px;outline:none;
    background:var(--surface,#fff);color:var(--ink-900,#0a0f1a)}
  .ai-input textarea:focus{border-color:var(--accent,#1f3a8a);box-shadow:0 0 0 3px var(--accent-soft,#eef2fb)}
  .ai-send{background:var(--accent,#1f3a8a);color:#fff;border:none;border-radius:9px;
    width:40px;cursor:pointer;display:grid;place-items:center}
  .ai-send:hover{background:var(--accent-hover,#16296b)}
  .ai-send:disabled{opacity:.5;cursor:not-allowed}
  .ai-dot{display:inline-block;width:5px;height:5px;background:var(--green,#047857);
    border-radius:50%;margin-right:5px;vertical-align:middle}

  /* ---- record drawer --------------------------------------------- */
  .rec-overlay{position:fixed;inset:0;background:rgba(10,15,26,.42);z-index:9996;display:none}
  .rec-overlay.open{display:block}
  .rec-drawer{position:fixed;top:0;right:0;bottom:0;width:min(540px,100vw);
    background:var(--surface,#fff);z-index:9997;transform:translateX(100%);
    transition:transform .26s cubic-bezier(.22,.61,.36,1);overflow-y:auto;
    border-left:1px solid var(--hairline,#e9ebef);font-family:var(--font,system-ui)}
  .rec-drawer.open{transform:translateX(0)}
  .rec-top{position:sticky;top:0;background:var(--surface,#fff);
    border-bottom:1px solid var(--hairline,#e9ebef);padding:16px 20px;
    display:flex;justify-content:flex-start;align-items:flex-start;gap:12px;z-index:2}
  .rec-top h3{margin:0;font-size:1.06rem;font-weight:650;letter-spacing:-.02em;
    color:var(--ink-900,#0a0f1a);line-height:1.35}
  .rec-top .tag{font-size:.665rem;text-transform:uppercase;letter-spacing:.08em;
    color:var(--accent,#1f3a8a);font-weight:700}
  .rec-body{padding:18px 20px 90px}
  .rec-row{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--hairline,#e9ebef);
    font-size:.855rem;line-height:1.55}
  .rec-row .k{flex:0 0 38%;color:var(--ink-400,#6b7280);font-weight:600}
  .rec-row .v{flex:1;color:var(--ink-700,#1f2937);word-break:break-word}
  .rec-actions{position:sticky;bottom:0;background:var(--surface,#fff);
    border-top:1px solid var(--hairline,#e9ebef);padding:13px 20px;
    display:flex;gap:8px;flex-wrap:wrap}
  .rec-btn{border:1px solid transparent;border-radius:7px;padding:9px 14px;
    font:600 .83rem var(--font,system-ui);cursor:pointer}
  .rec-btn.primary{background:var(--accent,#1f3a8a);color:#fff}
  .rec-btn.primary:hover{background:var(--accent-hover,#16296b)}
  .rec-btn.ghost{background:var(--surface,#fff);color:var(--ink-700,#1f2937);
    border-color:var(--hairline-strong,#dde1e7)}
  .rec-btn.ghost:hover{background:var(--surface-3,#f5f6f8)}
  .rec-btn.green{background:var(--green-soft,#ecfdf5);color:var(--green,#047857);
    border-color:var(--green-line,#c7f0dd)}
  .rec-x{background:var(--surface,#fff);border:1px solid var(--hairline-strong,#dde1e7);
    width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:.95rem;
    color:var(--ink-500,#556070);display:grid;place-items:center;flex:none}
  .rec-note{background:var(--green-soft,#ecfdf5);border:1px solid var(--green-line,#c7f0dd);
    color:var(--green,#047857);font-size:.775rem;padding:9px 11px;border-radius:8px;margin:13px 0;line-height:1.55}
  .card{cursor:pointer}
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const pageLabel = (document.title || '').split('|')[0].trim();
  const lang = () => localStorage.getItem('lang') || 'en';

  /* ---------------- AI PANEL ---------------- */
  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> AI Help';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'ai-panel';
  panel.innerHTML = `
    <div class="ai-head">
      <div>
        <h4><i class="fas fa-wand-magic-sparkles"></i> Ask AI</h4>
        <small><span class="ai-dot"></span>Answers come from our verified records only</small>
      </div>
      <button class="ai-close" aria-label="Close">&times;</button>
    </div>
    <div class="ai-body" id="aiBody">
      <div class="ai-msg bot">Namaste! Ask me about government jobs, scholarships, schemes, courses, internships or exams.

I will answer only from this platform's records and always show the official source link. For example: "12th pass government jobs in Rajasthan" or "scholarship for SC students".</div>
    </div>
    <div class="ai-quick">
      <button data-q="scholarship for 12th pass students">Scholarship after 12th</button>
      <button data-q="government jobs for graduates in Rajasthan">Rajasthan jobs</button>
      <button data-q="free courses for cyber security">Cyber security course</button>
      <button data-q="internship for graduates">Internships</button>
    </div>
    <div class="ai-input">
      <textarea id="aiInput" rows="1" placeholder="Ask about jobs, schemes, courses or eligibility..."></textarea>
      <button class="ai-send" id="aiSend" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
    </div>`;
  document.body.appendChild(panel);

  const body = panel.querySelector('#aiBody');
  const input = panel.querySelector('#aiInput');
  const sendBtn = panel.querySelector('#aiSend');

  fab.addEventListener('click', () => {
    panel.classList.add('open');
    fab.style.display = 'none';
    input.focus();
  });
  panel.querySelector('.ai-close').addEventListener('click', () => {
    panel.classList.remove('open');
    fab.style.display = 'flex';
  });
  panel.querySelectorAll('.ai-quick button').forEach(b => {
    b.addEventListener('click', () => { input.value = b.dataset.q; send(); });
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  function bubble(html, cls) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + cls;
    div.innerHTML = html;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  async function send() {
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    bubble(escapeHtml(q), 'user');
    sendBtn.disabled = true;
    const thinking = bubble('Searching records…', 'bot');

    try {
      const res = await fetch(API + '/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang: lang(), page: pageLabel })
      });
      const data = await res.json();
      thinking.remove();

      if (!res.ok) {
        bubble(escapeHtml(data.message || 'Something went wrong.'), 'bot');
      } else {
        bubble(escapeHtml(data.answer || 'No answer available.'), 'bot');

        if (data.note) {
          const n = document.createElement('div');
          n.className = 'ai-note';
          n.textContent = data.note;
          body.appendChild(n);
        }

        if (data.citations && data.citations.length) {
          const wrap = document.createElement('div');
          wrap.className = 'ai-cites';
          wrap.innerHTML = data.citations.slice(0, 5).map(c => `
            <div class="ai-cite">
              <b>${escapeHtml(c.title)}</b>
              ${c.organisation ? escapeHtml(c.organisation) + ' · ' : ''}${escapeHtml(c.label)}<br>
              ${c.official_link ? `<a href="${escapeAttr(c.official_link)}" target="_blank" rel="noopener">Official source <i class="fas fa-external-link-alt"></i></a>` : 'Official link not recorded'}
            </div>`).join('');
          body.appendChild(wrap);
          body.scrollTop = body.scrollHeight;
        }

        const fb = document.createElement('div');
        fb.className = 'ai-note';
        fb.style.background = '#f8fafc';
        fb.style.borderColor = '#e2e8f0';
        fb.style.color = '#64748b';
        fb.innerHTML = 'Was this helpful? <a href="contact.html" style="color:#1e3a8a;font-weight:600;">Report incorrect information</a>';
        body.appendChild(fb);
      }
    } catch (e) {
      thinking.remove();
      bubble('Network error. Please try again.', 'bot');
    } finally {
      sendBtn.disabled = false;
      input.focus();
      body.scrollTop = body.scrollHeight;
    }
  }

  /* ---------------- RECORD DETAIL DRAWER ---------------- */
  const overlay = document.createElement('div');
  overlay.className = 'rec-overlay';
  document.body.appendChild(overlay);

  const drawer = document.createElement('div');
  drawer.className = 'rec-drawer';
  document.body.appendChild(drawer);

  overlay.addEventListener('click', closeDrawer);

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  const FIELD_LABELS = {
    organisation: 'Organisation', advertisement_number: 'Advertisement no.', post_name: 'Post name',
    total_vacancies: 'Total vacancies', category_wise_vacancies: 'Category-wise vacancies',
    qualification: 'Qualification', subject_requirements: 'Subject requirements', age_limit: 'Age limit',
    age_relaxation: 'Age relaxation', salary: 'Salary / Pay level', job_type: 'Job type',
    selection_procedure: 'Selection procedure', examination_pattern: 'Exam pattern',
    application_fee: 'Application fee', application_opening: 'Application opens',
    last_date: 'Last date', exam_date: 'Exam date', admit_card: 'Admit card', answer_key: 'Answer key',
    result: 'Result', state: 'State', sector: 'Sector', status: 'Status',
    title: 'Title', department: 'Department', ministry: 'Ministry', category: 'Category',
    eligible_students: 'Eligible students', family_income: 'Family income limit',
    scholarship_amount: 'Scholarship amount', course_eligibility: 'Course eligibility',
    application_dates: 'Application dates', required_documents: 'Required documents',
    renewal_requirements: 'Renewal requirements', benefits: 'Benefits', eligibility: 'Eligibility',
    income_limit: 'Income limit', age_requirements: 'Age requirements',
    application_process: 'Application process', description: 'Description', provider: 'Provider',
    subject: 'Subject', duration: 'Duration', learning_mode: 'Mode', course_fee: 'Course fee',
    examination_fee: 'Exam fee', certificate_fee: 'Certificate fee', enrollment_deadline: 'Enrolment deadline',
    course_start_date: 'Course starts', certification: 'Certification', stipend: 'Stipend',
    location: 'Location', fees: 'Fees', enrollment_process: 'Enrolment process', seats: 'Seats',
    start_date: 'Start date', selection_method: 'Selection method', trade: 'Trade',
    exam_name: 'Exam', conducting_body: 'Conducting body', syllabus: 'Syllabus',
    name: 'Portal', url: 'Website', verification_status: 'Verification', last_checked: 'Last checked',
    meta: 'Category', excerpt: 'Summary', stage: 'Stage', options: 'Study options',
    govt_jobs: 'Government jobs', skills: 'Skills to build'
  };
  const LINK_FIELDS = ['application_link', 'link', 'official_notification', 'official_guidelines', 'url'];
  const HIDDEN = ['id', 'created_at', 'updated_at', 'featured', 'is_auto', 'auto_status', 'type'];

  window.openRecord = async function (table, id) {
    drawer.innerHTML = '<div class="rec-top"><h3>Loading…</h3></div>';
    drawer.classList.add('open');
    overlay.classList.add('open');
    try {
      const res = await fetch(`${API}/${table}/${id}`);
      if (!res.ok) throw new Error('Record not found');
      const r = await res.json();

      const title = r.post_name || r.title || r.exam_name || r.trade || r.name || 'Record';
      const org = r.organisation || r.department || r.ministry || r.provider || r.conducting_body || '';
      const official = LINK_FIELDS.map(k => r[k]).find(Boolean) || '';
      const status = r.auto_status || r.status || '';

      const rows = Object.keys(r)
        .filter(k => !HIDDEN.includes(k) && !LINK_FIELDS.includes(k) && r[k] !== null && r[k] !== '' && String(r[k]).trim() !== '')
        .map(k => `<div class="rec-row"><div class="k">${FIELD_LABELS[k] || k.replace(/_/g, ' ')}</div>
                     <div class="v">${escapeHtml(String(r[k]))}</div></div>`).join('');

      drawer.innerHTML = `
        <div class="rec-top">
          <div>
            <div class="tag">${escapeHtml(org || table.replace(/_/g, ' '))}</div>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <button class="rec-x" onclick="document.querySelector('.rec-drawer').classList.remove('open');document.querySelector('.rec-overlay').classList.remove('open')">&times;</button>
        </div>
        <div class="rec-body">
          ${status ? `<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">
            <span style="background:${status === 'closed' ? '#fee2e2' : status === 'closing' ? '#fef3c7' : '#dcfce7'};
              color:${status === 'closed' ? '#991b1b' : status === 'closing' ? '#92400e' : '#166534'};
              padding:4px 11px;border-radius:999px;font-size:.75rem;font-weight:700;text-transform:capitalize;">
              ${escapeHtml(String(status).replace('_', ' '))}</span>
          </div>` : ''}
          <div class="rec-note">Information compiled from the official notification. Always confirm on the official portal before applying — this platform does not process applications.</div>
          ${rows || '<p>No further details recorded.</p>'}
        </div>
        <div class="rec-actions">
          ${official ? `<a class="rec-btn primary" href="${escapeAttr(official)}" target="_blank" rel="noopener">Official notification / apply <i class="fas fa-external-link-alt"></i></a>` : ''}
          <button class="rec-btn green" onclick="window.saveBookmark('${table}', ${id}, ${JSON.stringify(title).replace(/"/g, '&quot;')}, ${JSON.stringify(official).replace(/"/g, '&quot;')})">Save</button>
          <button class="rec-btn ghost" onclick="window.trackApplication('${table}', ${id}, ${JSON.stringify(title).replace(/"/g, '&quot;')}, ${JSON.stringify(org).replace(/"/g, '&quot;')})">Track application</button>
        </div>`;
    } catch (e) {
      drawer.innerHTML = `<div class="rec-top"><h3>Could not load record</h3>
        <button class="rec-x" onclick="document.querySelector('.rec-drawer').classList.remove('open');document.querySelector('.rec-overlay').classList.remove('open')">&times;</button></div>
        <div class="rec-body"><p>${escapeHtml(e.message)}</p></div>`;
    }
  };

  window.saveBookmark = async function (table, id, title, link) {
    const res = await fetch(API + '/bookmarks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: table, record_id: id, title, link })
    });
    if (res.status === 401) { alert('Please sign in to save opportunities.'); window.location.href = '/pages/login.html'; return; }
    const data = await res.json();
    toast(data.message || 'Saved');
  };

  window.trackApplication = async function (table, id, title, org) {
    const res = await fetch(API + '/tracker', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: table, record_id: id, title, organisation: org, status: 'interested' })
    });
    if (res.status === 401) { alert('Please sign in to use the tracker.'); window.location.href = '/pages/login.html'; return; }
    toast('Added to your application tracker');
  };

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:100px;background:#0f172a;color:#fff;' +
      'padding:10px 18px;border-radius:9px;font:600 .845rem var(--font,system-ui);z-index:10001;'
      + 'box-shadow:0 4px 16px rgba(10,15,26,.18)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* Make listing cards open the drawer.
     Each listing page renders <div class="card">…</div>; we attach by data attributes. */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-record]');
    if (!card) return;
    if (e.target.closest('a')) return;          // let real links work
    e.preventDefault();
    const [table, id] = card.dataset.record.split(':');
    window.openRecord(table, id);
  });

  /* Auto-attach data-record to cards on listing pages once data is rendered */
  window.attachRecordCards = function (table) {
    document.querySelectorAll('.grid .card, .updates-grid .update-card').forEach(card => {
      if (card.dataset.record) return;
      const link = card.querySelector('a[href*="http"]');
      if (link) card.dataset.record = table;
    });
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, ''); }
})();
