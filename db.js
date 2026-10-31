/* ============================================================================
   db.js — zero-cost database adapter
   ----------------------------------------------------------------------------
   Two modes, both completely free, chosen automatically by env vars:

   1. LOCAL FILE MODE (default)
      Storage: ./database.sqlite on disk
      Cost: Rs 0 forever — the file lives on your free server disk
      Used by: local development, Oracle Cloud Always Free VM, any free VPS
      Driver: sqlite3

   2. TURSO CLOUD MODE (free managed SQLite)
      Storage: Turso free tier (5 GB, ~500M row reads / month, no credit card)
      Used by: Render / Koyeb / Vercel free tiers where the disk is wiped on redeploy
      Driver: @libsql/client (libSQL is a SQLite fork, same SQL dialect)
      Activate by setting:
        TURSO_DATABASE_URL = libsql://your-db-name.turso.io
        TURSO_AUTH_TOKEN   = <token from `turso db tokens create`>

   Both modes expose the exact same sqlite3-style callback API
   (db.run / db.get / db.all / db.serialize / db.prepare) so the rest of the
   application does not care which one is active.
   ============================================================================ */

const path = require('path');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'database.sqlite');

/* --------------------------------------------------------------------------
   TURSO MODE — sqlite3-compatible shim over @libsql/client
   Every statement is queued so ordering matches sqlite3's serialized mode.
   -------------------------------------------------------------------------- */
function createTursoAdapter() {
  const { createClient } = require('@libsql/client');
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

  // FIFO promise chain — guarantees statements run in the order they were issued
  let queue = Promise.resolve();
  const enqueue = (task) => {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  };

  const normalise = (args) => {
    if (args === undefined || args === null) return [];
    if (!Array.isArray(args)) return [args];
    return args.map(v => (v === undefined ? null : v));
  };

  function exec(sql, args) {
    return enqueue(async () => {
      const res = await client.execute({ sql, args: normalise(args) });
      return {
        lastID: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
        changes: res.rowsAffected
      };
    });
  }

  function select(sql, args) {
    return enqueue(async () => {
      const res = await client.execute({ sql, args: normalise(args) });
      return res.rows.map(r => ({ ...r }));
    });
  }

  const adapter = {
    driver: 'turso',

    serialize(fn) { if (typeof fn === 'function') fn(); },

    run(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      exec(sql, params).then(
        (info) => cb && cb.call({ lastID: info.lastID, changes: info.changes }, null),
        (err) => cb && cb(err)
      );
      return adapter;
    },

    get(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      select(sql, params).then(
        (rows) => cb && cb(null, rows[0]),
        (err) => cb && cb(err)
      );
      return adapter;
    },

    all(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      select(sql, params).then(
        (rows) => cb && cb(null, rows),
        (err) => cb && cb(err)
      );
      return adapter;
    },

    prepare(sql) {
      return {
        run(params, cb) {
          if (typeof params === 'function') { cb = params; params = []; }
          exec(sql, params).then(
            (info) => cb && cb.call({ lastID: info.lastID, changes: info.changes }, null),
            (err) => cb && cb(err)
          );
          return this;
        },
        finalize(cb) { if (cb) cb(null); }
      };
    },

    // Promise API for new code
    async allAsync(sql, params = []) { return select(sql, params); },
    async getAsync(sql, params = []) { const r = await select(sql, params); return r[0]; },
    async runAsync(sql, params = []) { return exec(sql, params); },

    close(cb) { client.close(); if (cb) cb(); }
  };

  return adapter;
}

/* --------------------------------------------------------------------------
   LOCAL FILE MODE — real sqlite3
   -------------------------------------------------------------------------- */
function createLocalAdapter() {
  const sqlite3 = require('sqlite3').verbose();
  const raw = new sqlite3.Database(DB_FILE);

  raw.allAsync = (sql, params = []) => new Promise((res, rej) => raw.all(sql, params, (e, r) => e ? rej(e) : res(r)));
  raw.getAsync = (sql, params = []) => new Promise((res, rej) => raw.get(sql, params, (e, r) => e ? rej(e) : res(r)));
  raw.runAsync = (sql, params = []) => new Promise((res, rej) => raw.run(sql, params, function (e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); }));

  raw.driver = 'sqlite-file';
  raw.dbFile = DB_FILE;
  return raw;
}

const db = TURSO_URL ? createTursoAdapter() : createLocalAdapter();

module.exports = db;
