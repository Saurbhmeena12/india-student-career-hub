#!/usr/bin/env python3
"""
Rebuilds the premium shell (header, drawer, search overlay, footer, scripts)
on every page while keeping each page's own content intact.

    python3 tools/rebuild-shell.py
"""
import re, pathlib, posixpath

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'

PAGES = {
    'index':           'index.html',
    'jobs':            'pages/jobs.html',
    'scholarships':    'pages/scholarships.html',
    'schemes':         'pages/schemes.html',
    'courses':         'pages/courses.html',
    'skillsindia':     'pages/skillsindia.html',
    'training':        'pages/training.html',
    'internships':     'pages/internships.html',
    'apprenticeships': 'pages/apprenticeships.html',
    'exams':           'pages/exams.html',
    'admissions':      'pages/admissions.html',
    'directory':       'pages/directory.html',
    'states':          'pages/states.html',
    'notifications':   'pages/notifications.html',
    'career':          'pages/career.html',
    'search':          'pages/search.html',
    'dashboard':       'pages/dashboard.html',
    'about':           'pages/about.html',
    'contact':         'pages/contact.html',
}

GROUPS = [
    ('Opportunities', [
        ('jobs', 'Government Jobs', 'Central, state, PSU and defence vacancies'),
        ('scholarships', 'Scholarships', 'Pre-matric, post-matric, merit and category'),
        ('schemes', 'Government Schemes', 'Education, employment and welfare'),
        ('states', 'State-wise', 'All 28 states and 8 union territories'),
        ('notifications', 'Latest Updates', 'New notices and deadline changes'),
    ]),
    ('Learn & Skill Up', [
        ('courses', 'Free Courses', 'SWAYAM, NPTEL, NIELIT and Skill India'),
        ('skillsindia', 'Skill Development', 'Sector-wise certified programmes'),
        ('training', 'Training', 'PMKVY, ITI, NSTI and state missions'),
        ('internships', 'Internships', 'PM Internship, AICTE and ministries'),
        ('apprenticeships', 'Apprenticeships', 'NATS, NAPS, railway and PSU'),
    ]),
    ('Exams & Guidance', [
        ('exams', 'Entrance Exams', 'CUET, JEE, NEET, GATE, UGC NET'),
        ('admissions', 'Admissions', 'University, polytechnic and ITI'),
        ('career', 'Career Guidance', 'Pathways by education stage'),
        ('search', 'AI Search', 'Ask across every record'),
    ]),
]

SIMPLE = [('directory', 'Govt Portals'), ('about', 'About'), ('contact', 'Contact')]

ICONS = {
    'jobs': 'briefcase', 'scholarships': 'money-bill-wave', 'schemes': 'inbox',
    'states': 'map-marked-alt', 'notifications': 'bell', 'courses': 'laptop-code',
    'skillsindia': 'handshake', 'training': 'certificate', 'internships': 'user-graduate',
    'apprenticeships': 'hard-hat', 'exams': 'file-alt', 'admissions': 'university',
    'career': 'road', 'search': 'wand-magic-sparkles', 'directory': 'sitemap',
    'about': 'info-circle', 'contact': 'envelope', 'dashboard': 'user',
}

LOGO_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>')

SHIM = """  <script>
  /* safe element accessor — keeps legacy inline handlers from throwing */
  window.__el = function (id) {
    return document.getElementById(id) || {
      checked: false, value: '', textContent: '', style: {}, dataset: {},
      addEventListener: function () {}, removeEventListener: function () {},
      classList: { add: function () {}, remove: function () {}, toggle: function () {} }
    };
  };
  </script>
</head>"""

CDN_PATTERNS = [
    r'<link rel="preconnect"[^>]*>\s*',
    r'<link href="https://fonts\.googleapis[^"]*"[^>]*>\s*',
    r'<link rel="stylesheet" href="https://cdnjs[^"]*">\s*',
]


def ico(name):
    return f'<i class="fas fa-{name}" aria-hidden="true"></i>'


def linker(current_path):
    cur_dir = posixpath.dirname(current_path) or '.'
    return lambda target: posixpath.relpath(target, cur_dir).replace('\\', '/')


def build_header(active, href):
    def nav_link(key, label):
        on = ' is-active' if key == active else ''
        return f'<a class="nav-link{on}" href="{href(PAGES[key])}">{label}</a>'

    groups = ''
    for title, items in GROUPS:
        is_active = any(k == active for k, _, _ in items)
        menu = ''.join(
            f'<a class="menu-link" href="{href(PAGES[k])}">{ico(ICONS[k])}'
            f'<span><b>{label}</b><small>{desc}</small></span></a>'
            for k, label, desc in items)
        groups += (f'<div class="nav-group">'
                   f'<button class="nav-link{" is-active" if is_active else ""}" '
                   f'aria-haspopup="true" aria-expanded="false">{title}{ico("chevron-down")}</button>'
                   f'<div class="menu">{menu}</div></div>')

    simple = ''.join(nav_link(k, l) for k, l in SIMPLE)

    dgroups = ''
    for title, items in GROUPS:
        links = ''.join(
            f'<a class="drawer-link{" is-active" if k == active else ""}" '
            f'href="{href(PAGES[k])}">{label}{ico("arrow-right")}</a>'
            for k, label, _ in items)
        dgroups += f'<div class="drawer-group"><span>{title}</span>{links}</div>'
    dsimple = ''.join(
        f'<div class="drawer-group"><a class="drawer-link{" is-active" if k == active else ""}" '
        f'href="{href(PAGES[k])}">{l}{ico("arrow-right")}</a></div>'
        for k, l in SIMPLE)
    ddash = (f'<div class="drawer-group"><a class="drawer-link'
             f'{" is-active" if active == "dashboard" else ""}" href="{href(PAGES["dashboard"])}">'
             f'My Dashboard{ico("arrow-right")}</a></div>')

    return f"""<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="{href(PAGES['index'])}" aria-label="India Career Hub, home">
      <span class="brand-mark">{LOGO_SVG}</span>
      <span>
        <span class="brand-name">India<span>Career</span> Hub</span>
        <span class="brand-tag">Opportunities for every student</span>
      </span>
    </a>

    <nav class="nav" aria-label="Primary">
      {nav_link('index', 'Home')}
      {groups}
      {simple}
    </nav>

    <div class="header-actions">
      <button class="icon-btn" data-search-open aria-label="Search">{ico("search")}</button>

      <div class="lang" role="group" aria-label="Language">
        <button data-lang-set="en" class="is-active">EN</button>
        <button data-lang-set="hi">हिन्दी</button>
      </div>

      <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" aria-pressed="false">
        {ico("shield-alt")}
      </button>

      <span class="header-sep"></span>
      <a class="btn btn-secondary btn-sm hide-sm" href="{href('admin.html')}">Admin</a>
      <a class="btn btn-primary btn-sm" href="{href('pages/login.html')}">Sign in</a>

      <button class="icon-btn burger" data-drawer-toggle aria-label="Open menu" aria-expanded="false">
        {ico("bars")}
      </button>
    </div>
  </div>
</header>

<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="drawer-head">
    <a class="brand" href="{href(PAGES['index'])}">
      <span class="brand-mark">{LOGO_SVG}</span>
      <span><span class="brand-name">India<span>Career</span> Hub</span></span>
    </a>
    <button class="icon-btn" data-drawer-close aria-label="Close menu">{ico("close")}</button>
  </div>
  <div class="drawer-body">
    {dgroups}{dsimple}{ddash}
    <div class="drawer-cta">
      <a class="btn btn-primary btn-block" href="{href('pages/login.html')}">Sign in / Create account</a>
      <a class="btn btn-secondary btn-block" href="{href('admin.html')}">Admin panel</a>
    </div>
  </div>
</div>

<div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search">
  <div class="search-box">
    <form class="search-field" id="globalSearchForm">
      {ico("search")}
      <input id="globalSearchInput" type="search" autocomplete="off"
             placeholder="Search jobs, scholarships, courses, schemes…" aria-label="Search all opportunities">
      <button type="button" class="icon-btn" data-search-close aria-label="Close search">{ico("close")}</button>
    </form>
    <div class="search-hints">
      <a href="{href(PAGES['jobs'])}">{ico("briefcase")} Government jobs <kbd>enter</kbd></a>
      <a href="{href(PAGES['scholarships'])}">{ico("money-bill-wave")} Scholarships</a>
      <a href="{href(PAGES['courses'])}">{ico("laptop-code")} Free certified courses</a>
      <a href="{href(PAGES['directory'])}">{ico("sitemap")} Official government portals</a>
    </div>
  </div>
</div>
"""


def build_footer(href):
    return f"""<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-about">
        <a class="brand" href="{href(PAGES['index'])}">
          <span class="brand-mark">{LOGO_SVG}</span>
          <span><span class="brand-name">India<span>Career</span> Hub</span></span>
        </a>
        <p>A single, verified source for Indian government jobs, scholarships, schemes,
           free courses, internships and entrance exams — for every qualification level.</p>
        <form class="subscribe" onsubmit="ftSubscribe(event)">
          <input type="email" placeholder="Email for weekly alerts" required aria-label="Email address">
          <button class="btn btn-primary btn-sm" type="submit">Join</button>
        </form>
        <div class="alert alert--ok" id="ftMsg" style="margin-top:10px"></div>
      </div>

      <div class="footer-col">
        <h4>Opportunities</h4>
        <a href="{href(PAGES['jobs'])}">Government Jobs</a>
        <a href="{href(PAGES['scholarships'])}">Scholarships</a>
        <a href="{href(PAGES['schemes'])}">Government Schemes</a>
        <a href="{href(PAGES['states'])}">State-wise</a>
        <a href="{href(PAGES['notifications'])}">Latest Updates</a>
      </div>

      <div class="footer-col">
        <h4>Learn</h4>
        <a href="{href(PAGES['courses'])}">Free Courses</a>
        <a href="{href(PAGES['skillsindia'])}">Skill Development</a>
        <a href="{href(PAGES['training'])}">Training</a>
        <a href="{href(PAGES['internships'])}">Internships</a>
        <a href="{href(PAGES['apprenticeships'])}">Apprenticeships</a>
      </div>

      <div class="footer-col">
        <h4>More</h4>
        <a href="{href(PAGES['exams'])}">Entrance Exams</a>
        <a href="{href(PAGES['admissions'])}">Admissions</a>
        <a href="{href(PAGES['career'])}">Career Guidance</a>
        <a href="{href(PAGES['directory'])}">Govt Portals</a>
        <a href="{href(PAGES['dashboard'])}">My Dashboard</a>
      </div>

      <div class="footer-col">
        <h4>Platform</h4>
        <a href="{href(PAGES['about'])}">About</a>
        <a href="{href(PAGES['contact'])}">Contact</a>
        <a href="{href(PAGES['search'])}">AI Search</a>
        <a href="{href('admin.html')}">Admin</a>
      </div>
    </div>

    <div class="footer-note">
      <p>&copy; <span data-year>2026</span> India Student &amp; Career Hub. An independent
         information platform — not a government website. Always verify eligibility, dates and
         fees on the official portal before applying.</p>
      <p>Runs entirely on free infrastructure.</p>
    </div>
  </div>
</footer>

<script>
async function ftSubscribe(e) {{
  e.preventDefault();
  const input = e.target.querySelector('input');
  const msg = document.getElementById('ftMsg');
  try {{
    const r = await fetch('/api/newsletter', {{
      method: 'POST', headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ email: input.value }})
    }});
    if (!r.ok) throw new Error();
    msg.className = 'alert alert--ok is-visible';
    msg.textContent = 'Subscribed — weekly deadline alerts are on.';
    input.value = '';
  }} catch (err) {{
    msg.className = 'alert alert--err is-visible';
    msg.textContent = 'Subscription failed. Please try again.';
  }}
}}
</script>
"""


def strip_old(s):
    s = re.sub(r'<!--\s*Navbar\s*-->.*?</nav>', '', s, flags=re.S | re.I)
    s = re.sub(r'<nav class="navbar">.*?</nav>', '', s, flags=re.S | re.I)
    s = re.sub(r'<footer[^>]*>.*?</footer>', '', s, flags=re.S | re.I)
    for f in ['i18n', 'widgets', 'app', 'icons', 'site']:
        s = re.sub(r'<script src="[^"]*' + f + r'\.js"></script>\s*', '', s, flags=re.I)
    return s


def process(key, path):
    p = PUB / path
    if not p.exists():
        print('MISSING', path)
        return
    s = p.read_text()

    for pat in CDN_PATTERNS:
        s = re.sub(pat, '', s)
    if 'name="theme-color"' not in s:
        s = s.replace('</head>', '  <meta name="theme-color" content="#ffffff">\n'
                                 '  <meta name="color-scheme" content="light dark">\n</head>')

    s = strip_old(s)

    # neutralise references to elements that only existed in the old nav
    s = s.replace("document.getElementById('themeToggle')", "window.__el('themeToggle')")
    s = s.replace("document.getElementById('mobileMenu')", "window.__el('mobileMenu')")
    if 'window.__el = function' not in s:
        s = s.replace('</head>', SHIM)

    href = linker(path)
    header = build_header(key, href)
    footer = build_footer(href)

    m = re.search(r'<(?:section|main)\b', s)
    if m:
        s = s[:m.start()] + header + '\n<main id="main">\n' + s[m.start():]
    else:
        s = s.replace('<body>', '<body>\n' + header + '\n<main id="main">', 1)

    if '</main>' not in s:
        s = s.replace('</body>', '</main>\n' + footer + '\n</body>', 1)
    else:
        s = s.replace('</body>', footer + '\n</body>', 1)

    files = ['icons.js', 'i18n.js', 'site.js', 'widgets.js']
    if key == 'index':
        files.append('app.js')
    scripts = ''.join(f'<script src="{href("js/" + f)}"></script>\n' for f in files)
    s = s.replace('</body>', scripts + '</body>', 1)

    p.write_text(s)
    print('rebuilt', path)


if __name__ == '__main__':
    for key, path in PAGES.items():
        process(key, path)
    print('shell rebuild complete')
