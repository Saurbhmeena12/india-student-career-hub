/* ============================================================================
   linkcheck.js — real verification for every outbound official link
   ----------------------------------------------------------------------------
   The whole promise of this platform is "verified". This module makes that
   word literal: it requests each URL, records the HTTP status and the exact
   time it was checked, and writes both back to the database.

   Run manually:   node -e "require('./linkcheck').runAll().then(r=>console.log(r))"
   Or add to cron: 0 6 * * * cd /srv/career && node -e "require('./linkcheck').runAll()"

   Rules
     • HEAD first, GET fallback (many .gov.in hosts reject HEAD)
     • Polite: 1 request per host at a time, 700 ms gap, browser UA
     • Never mark "verified" on an ambiguous result — DNS/blocked = "unreachable"
     • A dead link is downgraded to "broken", never silently left as "verified"
   ============================================================================ */

const db = require('./db');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const TIMEOUT_MS = 9000;
const HOST_GAP_MS = 700;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const all = (sql, p = []) => new Promise(res => db.all(sql, p, (e, rows) => res(e ? [] : rows)));
const run = (sql, p = []) => new Promise(res => db.run(sql, p, function (e) { res(e ? null : this); }));

/* --------------------------------------------------------------- one check */
async function checkUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { status: 'skipped', code: 0, note: 'not an http(s) url' };
  }

  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' }
      });
      return { code: res.status, final: res.url };
    } catch (err) {
      return { code: 0, error: err.name === 'AbortError' ? 'timeout' : err.message };
    } finally {
      clearTimeout(timer);
    }
  };

  /* Many Indian government servers answer HEAD with 404 even when the page
     exists. So a HEAD result is only ever treated as a hint: anything that is
     not 2xx/3xx is re-tested with GET before we draw a conclusion. */
  let r = await attempt('HEAD');
  const headOk = r.code >= 200 && r.code < 400;
  if (!headOk) {
    const g = await attempt('GET');
    // A successful GET always wins over a misleading HEAD.
    if (g.code >= 200 && g.code < 400) r = g;
    else if (!r.code || r.code === 405 || r.code === 403 || r.code === 501) r = g;
    else r = { code: g.code || r.code, final: g.final || r.final, error: g.error || r.error };
  }

  if (r.code >= 200 && r.code < 400) {
    return { status: 'verified', code: r.code, note: r.final && r.final !== url ? 'redirects to ' + r.final : '' };
  }
  if (r.code === 404 || r.code === 410) {
    return { status: 'broken', code: r.code, note: 'page no longer exists' };
  }
  if (r.code === 0) {
    return { status: 'unreachable', code: 0, note: r.error || 'no response' };
  }
  if (r.code === 403 || r.code === 429) {
    return { status: 'blocked', code: r.code, note: 'server refuses automated checks (CAPTCHA/WAF) — may be fine in a browser' };
  }
  return { status: 'unreachable', code: r.code, note: 'blocked or error response' };
}

/* ---------------------------------------------------------------- the crawl */
async function runAll(options = {}) {
  const started = Date.now();
  const targets = [];

  const portals = await all('SELECT id, name, url FROM govt_portals');
  portals.forEach(p => targets.push({ table: 'govt_portals', id: p.id, url: p.url, label: p.name, urlCol: 'url' }));

  const linkCols = [
    ['jobs', 'application_link'], ['jobs', 'official_notification'],
    ['scholarships', 'link'], ['scholarships', 'official_guidelines'],
    ['schemes', 'link'], ['schemes', 'official_guidelines'],
    ['courses', 'link'], ['training', 'link'],
    ['internships', 'link'], ['apprenticeships', 'link'],
    ['entrance_exams', 'link'], ['study_material', 'link']
  ];

  for (const [table, col] of linkCols) {
    const rows = await all(`SELECT id, ${col} AS url FROM ${table} WHERE ${col} IS NOT NULL AND TRIM(${col}) <> ''`);
    rows.forEach(r => targets.push({ table, id: r.id, url: r.url, urlCol: col }));
  }

  // unique URLs only — the same portal appears in several tables
  const seen = new Set();
  const unique = targets.filter(t => {
    const k = t.url + '|' + t.table + '|' + t.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const results = [];
  let lastHost = '', lastAt = 0;

  for (const t of unique) {
    let host = '';
    try { host = new URL(t.url).hostname; } catch (e) { host = t.url; }
    if (host === lastHost) {
      const wait = HOST_GAP_MS - (Date.now() - lastAt);
      if (wait > 0) await sleep(wait);
    }
    const r = await checkUrl(t.url);
    lastHost = host; lastAt = Date.now();
    results.push({ ...t, ...r });

    if (options.verbose) {
      console.log(`  ${r.status.padEnd(12)} ${String(r.code).padEnd(4)} ${t.table}:${t.id} ${t.url.slice(0, 62)}`);
    }
  }

  /* ---- write results back ---- */
  await run(`CREATE TABLE IF NOT EXISTS link_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    status TEXT,
    http_code INTEGER,
    note TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let updated = 0;

  for (const r of results) {
    if (r.table === 'govt_portals' && r.urlCol === 'url') {
      await run('UPDATE govt_portals SET verification_status = ?, last_checked = ? WHERE id = ?',
        [r.status === 'verified' ? 'verified' : r.status, now, r.id]);
      updated++;
    } else {
      // every other table gets a verification column pair on demand
      const col = r.urlCol.replace(/[^a-z_]/g, '');
      try {
        await run(`ALTER TABLE ${r.table} ADD COLUMN link_status TEXT`, []);
      } catch (e) { /* exists */ }
      try {
        await run(`ALTER TABLE ${r.table} ADD COLUMN link_checked_at TEXT`, []);
      } catch (e) { /* exists */ }
      await run(`UPDATE ${r.table} SET link_status = ?, link_checked_at = ? WHERE id = ?`,
        [r.status, now, r.id]);
      updated++;
    }
    await run(`INSERT INTO link_checks (table_name, record_id, url, status, http_code, note, checked_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.table, r.id, r.url, r.status, r.code, r.note || '', now]);
  }

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Link check finished in', Math.round((Date.now() - started) / 1000), 's ->', summary);
  return {
    checked: results.length,
    updated,
    summary,
    problems: results.filter(r => r.status === 'broken' || r.status === 'unreachable')
  };
}

/* ------------------------------------------------- health summary for the UI */
async function health() {
  await run(`CREATE TABLE IF NOT EXISTS link_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL, record_id INTEGER NOT NULL, url TEXT NOT NULL,
    status TEXT, http_code INTEGER, note TEXT, checked_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  const [rows, recent] = await Promise.all([
    all('SELECT verification_status AS s, COUNT(*) AS c FROM govt_portals GROUP BY verification_status'),
    all('SELECT MAX(checked_at) AS last FROM link_checks')
  ]);
  const byStatus = Object.fromEntries(rows.map(r => [r.s, r.c]));
  return {
    portals: byStatus,
    total_portals: rows.reduce((n, r) => n + r.c, 0),
    last_checked: recent[0] && recent[0].last ? recent[0].last : null
  };
}

module.exports = { checkUrl, runAll, health, _DB_PATH: require('path').join(__dirname, 'database.sqlite') };

if (require.main === module) {
  runAll({ verbose: true }).then(r => {
    console.log('\nProblems found:', r.problems.length);
    r.problems.slice(0, 20).forEach(p =>
      console.log(`   ${p.status.toUpperCase()}  ${p.table}:${p.id}  ${p.url}`));
    process.exit(0);
  });
}
