/* ============================================================================
   site.js — shared shell behaviour for every page
   theme · language · mobile drawer · search overlay · scroll reveal
   ============================================================================ */
(function () {
  const html = document.documentElement;
  const KEY_THEME = 'theme';
  const KEY_LANG = 'lang';

  /* ---------------- theme ---------------- */
  function applyTheme(t) {
    if (t === 'dark') html.setAttribute('data-theme', 'dark');
    else html.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      const useDark = btn.querySelector('[data-ico="moon"]');
      const useLight = btn.querySelector('[data-ico="sun"]');
      if (useDark) useDark.style.display = t === 'dark' ? 'none' : '';
      if (useLight) useLight.style.display = t === 'dark' ? '' : 'none';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0b1017' : '#ffffff');
  }
  const savedTheme = localStorage.getItem(KEY_THEME) ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY_THEME, next);
    applyTheme(next);
  });

  /* ---------------- language ---------------- */
  function applyLang(l) {
    localStorage.setItem(KEY_LANG, l);
    html.setAttribute('lang', l === 'hi' ? 'hi' : 'en');
    document.querySelectorAll('[data-lang-set]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.langSet === l));
    if (window.applyLanguage) window.applyLanguage(l);
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang-set]');
    if (!btn) return;
    applyLang(btn.dataset.langSet);
  });
  window.setLang = function (l) { applyLang(l); };

  /* ---------------- mobile drawer ---------------- */
  const drawer = document.getElementById('drawer');
  function openDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
    const b = document.querySelector('[data-drawer-toggle]');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) drawer.querySelector('a,button')?.focus();
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-toggle]')) { openDrawer(!drawer?.classList.contains('is-open')); return; }
    if (e.target.closest('[data-drawer-close]')) { openDrawer(false); return; }
    if (e.target.closest('#drawer a')) openDrawer(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { openDrawer(false); closeSearch(); } });

  /* ---------------- search overlay ---------------- */
  const overlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('globalSearchInput');
  function openSearch() {
    if (!overlay) { window.location.href = base('pages/search.html'); return; }
    overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    setTimeout(() => searchInput?.focus(), 40);
  }
  function closeSearch() {
    overlay?.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }
  window.openSearch = openSearch;
  window.closeSearch = closeSearch;

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search-open]')) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest('[data-search-close]') || e.target === overlay) closeSearch();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  document.getElementById('globalSearchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput?.value.trim();
    window.location.href = base('pages/search.html') + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  function base(rel) {
    // pages inside /pages/ need one level up
    return location.pathname.includes('/pages/') ? rel.replace('pages/', '') : rel;
  }

  /* ---------------- scroll reveal ---------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const observe = () => document.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
    observe();
    new MutationObserver(observe).observe(document.body, { childList: true, subtree: true });
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
  }

  /* ---------------- footer year ---------------- */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------------- smooth internal links ---------------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
})();
