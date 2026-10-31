/* ============================================================================
   topbar.js — the announcement strip above the header
   ----------------------------------------------------------------------------
   Pulls the newest update from /api/updates, shows it, and reports how fresh
   the portal verification data is. Dismissible for 7 days.
   If the API is unavailable the bar hides itself rather than showing a gap.
   ============================================================================ */
(function () {
  const KEY = 'topbar-dismissed-until';
  const SEVEN_DAYS = 7 * 86400000;

  function dismissed() {
    const until = Number(localStorage.getItem(KEY) || 0);
    return until > Date.now();
  }

  function relTime(iso) {
    if (!iso) return null;
    const then = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(then)) return null;
    const mins = Math.round((Date.now() - then.getTime()) / 60000);
    if (mins < 2) return 'checked just now';
    if (mins < 60) return 'checked ' + mins + ' min ago';
    const hours = Math.round(mins / 60);
    if (hours < 24) return 'checked ' + hours + 'h ago';
    const days = Math.round(hours / 24);
    return days === 1 ? 'checked yesterday' : 'checked ' + days + ' days ago';
  }

  async function init() {
    if (dismissed()) return;

    const mount = document.getElementById('topbar');
    if (!mount) return;

    let update = null;
    let health = null;

    try {
      const [uRes, hRes] = await Promise.all([
        fetch('/api/updates?limit=1'),
        fetch('/api/health/links')
      ]);
      if (uRes.ok) {
        const rows = await uRes.json();
        update = Array.isArray(rows) && rows.length ? rows[0] : null;
      }
      if (hRes.ok) health = await hRes.json();
    } catch (e) {
      mount.hidden = true;
      return;
    }

    if (!update && !health) { mount.hidden = true; return; }

    const fresh = health && health.last_checked ? relTime(health.last_checked) : null;
    const verifiedCount = health && health.portals ? (health.portals.verified || 0) : 0;
    const totalPortals = health && health.total_portals ? health.total_portals : 0;

    const freshnessClass = !fresh ? 'freshness--unknown'
      : (health.last_checked && Date.now() - new Date(String(health.last_checked).replace(' ', 'T')) < 604800000
        ? '' : 'freshness--stale');

    mount.innerHTML = `
      <div class="topbar-inner">
        <span class="topbar-badge"><span class="dot"></span> Live</span>

        ${update ? `<a class="topbar-link" href="${update.link || '#'}" target="_blank" rel="noopener">
            <b>${escapeHtml(update.title)}</b>
            ${update.meta ? `<span class="topbar-sep">·</span><span>${escapeHtml(update.meta)}</span>` : ''}
          </a>` : '<span class="topbar-link">Verified government opportunities, updated daily.</span>'}

        <span class="topbar-side">
          ${fresh ? `<span class="freshness ${freshnessClass}" title="${verifiedCount} of ${totalPortals} official portals responded to our last automated check">
              <i class="fas fa-shield-alt" aria-hidden="true"></i> ${fresh}
            </span>` : ''}
          <a href="${prefix()}calendar.html">Deadlines</a>
          <a href="${prefix()}finder.html">Find my options</a>
        </span>

        <button class="topbar-close" type="button" aria-label="Dismiss this notice">
          <i class="fas fa-close" aria-hidden="true"></i>
        </button>
      </div>`;

    mount.hidden = false;

    mount.querySelector('.topbar-close').addEventListener('click', () => {
      localStorage.setItem(KEY, String(Date.now() + SEVEN_DAYS));
      mount.hidden = true;
    });
  }

  /* root pages link into /pages/, subpages link their siblings */
  function prefix() {
    return location.pathname.includes('/pages/') ? '' : 'pages/';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
