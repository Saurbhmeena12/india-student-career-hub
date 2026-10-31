/* ============================================================================
   cards.js — one card design for every opportunity type
   ----------------------------------------------------------------------------
   window.renderCards(table, rows, opts) -> HTML string
   Keeps the markup identical across jobs, scholarships, schemes, courses,
   training, internships, apprenticeships, exams and portals, so the site looks
   the same on every listing page.
   ============================================================================ */
(function () {
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const ic = n => (window.__icon ? window.__icon(n) : '');

  /* field spec: title / chips / rows / date / link / source --------------- */
  const SPEC = {
    jobs: {
      title: r => r.post_name || 'Government vacancy',
      type: 'Government job',
      icon: 'briefcase',
      chips: r => [r.state, r.job_type, r.qualification],
      rows: r => [
        ['landmark', 'Organisation', r.organisation],
        ['users', 'Vacancies', r.total_vacancies],
        ['money-bill-wave', 'Pay', r.salary],
        ['calendar-days', 'Last date', r.last_date]
      ],
      link: r => r.application_link,
      source: r => r.official_notification
    },
    scholarships: {
      title: r => r.title,
      type: 'Scholarship',
      icon: 'money-bill-wave',
      chips: r => [r.state, r.category, r.qualification],
      rows: r => [
        ['landmark', 'Department', r.department],
        ['money-bill-wave', 'Amount', r.scholarship_amount],
        ['users', 'For', r.eligible_students],
        ['calendar-days', 'Apply by', r.application_dates]
      ],
      link: r => r.link,
      source: r => r.official_guidelines
    },
    schemes: {
      title: r => r.title,
      type: 'Government scheme',
      icon: 'inbox',
      chips: r => [r.state, r.category, r.sector],
      rows: r => [
        ['landmark', 'Ministry', r.ministry],
        ['users', 'Who can apply', r.eligibility],
        ['hand-holding-usd', 'Benefits', r.benefits],
        ['calendar-days', 'Window', r.application_dates]
      ],
      link: r => r.link,
      source: r => r.official_guidelines
    },
    courses: {
      title: r => r.title,
      type: 'Free course',
      icon: 'laptop-code',
      chips: r => [r.sector, r.level, r.duration],
      rows: r => [
        ['landmark', 'Provider', r.provider],
        ['certificate', 'Certificate', r.certificate_provider],
        ['money-bill-wave', 'Fee', r.course_fee],
        ['calendar-days', 'Enrol by', r.enrollment_deadline]
      ],
      link: r => r.link
    },
    training: {
      title: r => r.title,
      type: 'Skill training',
      icon: 'certificate',
      chips: r => [r.sector, r.type, r.duration],
      rows: r => [
        ['landmark', 'Provider', r.provider],
        ['certificate', 'Certification', r.certification],
        ['map-marked-alt', 'Location', r.location],
        ['money-bill-wave', 'Fees', r.fees]
      ],
      link: r => r.link
    },
    internships: {
      title: r => r.post_title || 'Internship',
      type: 'Internship',
      icon: 'user-graduate',
      chips: r => [r.location, r.type, r.duration],
      rows: r => [
        ['landmark', 'Organisation', r.organisation],
        ['money-bill-wave', 'Stipend', r.stipend],
        ['users', 'Seats', r.seats],
        ['calendar-days', 'Last date', r.last_date]
      ],
      link: r => r.link
    },
    apprenticeships: {
      title: r => r.trade || 'Apprenticeship',
      type: 'Apprenticeship',
      icon: 'hard-hat',
      chips: r => [r.location, r.type, r.duration],
      rows: r => [
        ['landmark', 'Organisation', r.organisation],
        ['money-bill-wave', 'Stipend', r.stipend],
        ['user-check', 'Eligibility', r.qualification],
        ['calendar-days', 'Last date', r.last_date]
      ],
      link: r => r.link
    },
    exams: {
      title: r => r.exam_name,
      type: 'Entrance exam',
      icon: 'file-alt',
      chips: r => [r.conducting_body, r.qualification],
      rows: r => [
        ['landmark', 'Conducted by', r.conducting_body],
        ['users', 'Eligibility', r.qualification],
        ['calendar-days', 'Exam date', r.exam_date],
        ['calendar-days', 'Apply by', r.last_date]
      ],
      link: r => r.link
    },
    'entrance-exams': {
      title: r => r.exam_name,
      type: 'Entrance exam',
      icon: 'file-alt',
      chips: r => [r.conducting_body, r.qualification],
      rows: r => [
        ['landmark', 'Conducted by', r.conducting_body],
        ['users', 'Eligibility', r.qualification],
        ['calendar-days', 'Exam date', r.exam_date],
        ['calendar-days', 'Apply by', r.last_date]
      ],
      link: r => r.link
    },
    'govt-portals': {
      title: r => r.name,
      type: 'Official portal',
      icon: 'sitemap',
      chips: r => [r.category, r.state],
      rows: r => [
        ['shield-alt', 'Verification', verifyLabel(r.verification_status)],
        ['calendar-days', 'Last checked', prettyDate(r.last_checked)],
        ['info-circle', 'About', r.description]
      ],
      link: r => r.url
    }
  };


  /* The link checker stores a machine word; readers deserve a sentence.
     "unreachable" is deliberately not worded as failure — our checker simply
     could not get through, and the site may open normally in a browser. */
  const VERIFY_LABEL = {
    verified: 'Verified — link responded',
    broken: 'Broken — page returns 404',
    blocked: 'Not checkable automatically',
    unreachable: 'Our checker could not reach it',
    unverified: 'Not checked yet',
    skipped: 'Not an http link'
  };
  function verifyLabel(v) {
    if (!v) return 'Not checked yet';
    return VERIFY_LABEL[String(v).toLowerCase()] || String(v);
  }

  const STATUS = {
    open: ['chip--green', 'Open'],
    closing: ['chip--amber', 'Closing soon'],
    upcoming: ['chip--accent', 'Upcoming'],
    closed: ['chip--red', 'Closed'],
    extended: ['chip--accent', 'Extended'],
    cancelled: ['chip--red', 'Cancelled'],
    verification_pending: ['chip--amber', 'Verification pending']
  };

  function prettyDate(v) {
    if (!v) return '';
    const s = String(v);
    const d = new Date(s);
    if (isNaN(d)) return s;               // ranges like "2026-09-01 to 2026-11-30"
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysTo(v) {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  function renderOne(table, r, opts) {
    const sp = SPEC[table];
    if (!sp) {
      return `<article class="card"><h3>${esc(r.title || r.name || 'Record')}</h3>
        <p>${esc(r.description || '')}</p></article>`;
    }

    const status = (r.auto_status || r.status || '').toLowerCase();
    const st = STATUS[status];
    const dateVal = (sp.rows(r).find(x => /date|by|window|checked/i.test(x[1])) || [])[2];
    const dl = daysTo(dateVal);
    const urgent = dl !== null && dl >= 0 && dl <= 10;

    const chips = (sp.chips(r) || [])
      .filter(Boolean)
      .slice(0, 3)
      .map(c => `<span class="chip chip--line">${esc(c)}</span>`)
      .join('');

    const rows = sp.rows(r)
      .filter(x => x[2])
      .slice(0, 4)
      .map(([icon, label, value]) => `
        <div class="card-row">
          <span class="card-row-ico">${ic(icon)}</span>
          <span><b>${esc(label)}</b> ${esc(String(value).length > 92 ? String(value).slice(0, 92) + '…' : value)}</span>
        </div>`).join('');

    const link = sp.link(r);
    const source = sp.source ? sp.source(r) : null;
    const recAttr = opts && opts.record && r.id ? ` data-record="${table}:${r.id}"` : '';

    return `<article class="card card--opp${urgent ? ' closing' : ''}"${recAttr}>
      <div class="card-top">
        <span class="chip chip--accent">${ic(sp.icon)} ${esc(sp.type)}</span>
        ${st ? `<span class="chip ${st[0]}">${st[1]}</span>` : ''}
        ${r.featured ? '<span class="chip chip--line">Featured</span>' : ''}
      </div>
      <h3>${esc(sp.title(r))}</h3>
      ${chips ? `<div class="card-chips">${chips}</div>` : ''}
      <div class="card-rows">${rows}</div>
      <div class="card-actions">
        ${link ? `<a class="card-cta" href="${esc(link)}" target="_blank" rel="noopener">
            Apply on official site ${ic('external-link-alt')}</a>` : ''}
        ${source && source !== link ? `<a class="card-link-quiet" href="${esc(source)}"
            target="_blank" rel="noopener">${ic('file-alt')} Notification</a>` : ''}
        ${opts && opts.track ? `<button class="card-link-quiet" onclick="trackApplication('${table}',${r.id})">
            ${ic('bookmark')} Track</button>` : ''}
      </div>
    </article>`;
  }

  window.renderCards = function (table, rows, opts) {
    if (!Array.isArray(rows) || !rows.length) {
      return `<div class="empty">
        <p>Nothing published here yet.</p>
        <p class="empty-sub">Records appear as soon as they are verified against the official portal.</p>
      </div>`;
    }
    return rows.map(r => renderOne(table, r, opts || {})).join('');
  };

  window.renderCard = renderOne;
  window.prettyDate = prettyDate;
})();
