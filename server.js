require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

/* --------------------------------------------------------------------------
   ADMIN BOOTSTRAP PASSWORD
   The seeded admin is created once, on an empty database. In development it is
   admin123 so the demo works out of the box. In production that password is
   published in this repo, so we refuse to boot with it: anybody could take over
   the admin panel. Set ADMIN_PASSWORD to something long and private.
   -------------------------------------------------------------------------- */
const DEMO_ADMIN_PASSWORD = 'admin123';
const ADMIN_BOOT_PASSWORD = process.env.ADMIN_PASSWORD || (IS_PROD ? null : DEMO_ADMIN_PASSWORD);

if (IS_PROD && (!ADMIN_BOOT_PASSWORD || ADMIN_BOOT_PASSWORD === DEMO_ADMIN_PASSWORD || ADMIN_BOOT_PASSWORD.length < 12)) {
  console.error('\n  FATAL: ADMIN_PASSWORD is missing, is the published demo value, or is shorter than 12 characters.');
  console.error('  This password is public in the source code — anyone could take over /admin.html.');
  console.error('  Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(18).toString(\'base64url\'))"\n');
  process.exit(1);
}

/* --------------------------------------------------------------------------
   SECRET HANDLING
   Never run production on a known default. In development we allow a fallback
   but generate it per boot, so a leaked sample secret is never valid.
   -------------------------------------------------------------------------- */
const DEFAULT_SECRETS = [
  'india-student-career-hub-secret-2026',
  'replace-with-a-long-random-string'
];
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || DEFAULT_SECRETS.includes(JWT_SECRET)) {
  if (IS_PROD) {
    console.error('\n  FATAL: JWT_SECRET is missing or uses the published default.');
    console.error('  Set a long random value in .env before running in production.');
    console.error('  Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n');
    process.exit(1);
  }
  JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
  console.warn('  [dev] JWT_SECRET not set — using a random per-boot secret. Sessions end on restart.');
  console.warn('  [dev] Set JWT_SECRET in .env to keep sessions across restarts.');
}

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(compression());

/* ---- security headers (no helmet dependency, keeps the free stack lean) ---- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "connect-src 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'self'; " +
    "base-uri 'self'");
  next();
});

/* ---- CORS: same-origin by default; extra origins only via env ---- */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(x => x.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                       // same-origin / curl
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (!IS_PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

/* ---- rate limits: free protection against brute force and scraping ---- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }
});
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' }
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'You are asking very quickly. Please wait a moment.' }
});
app.locals.loginLimiter = loginLimiter;

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve the checked-out root layout and the documented public/ layout.
const WEB_ROOT = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;
app.use('/css', express.static(path.join(WEB_ROOT, 'css'), { maxAge: '7d', immutable: false }));
app.use('/js', express.static(path.join(WEB_ROOT, 'js'), { maxAge: '7d', immutable: false }));
app.use(express.static(WEB_ROOT, { maxAge: IS_PROD ? '1h' : 0 }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------------------------------------------------------
// DATABASE — free local SQLite file, or free Turso cloud (see db.js)
// ---------------------------------------------------------------------------
const db = require('./db');
console.log('Database:', db.driver === 'turso' ? 'Turso free cloud SQLite' : 'local SQLite file -> ' + db.dbFile);

// ============================================================================
// DATABASE SCHEMA - India Student & Career Hub
// ============================================================================
db.serialize(() => {
  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    qualification TEXT,
    stream TEXT,
    passing_year TEXT,
    date_of_birth TEXT,
    category TEXT,
    state TEXT,
    district TEXT,
    domicile TEXT,
    family_income TEXT,
    gender TEXT,
    disability TEXT,
    skills TEXT,
    work_experience TEXT,
    preferred_job_type TEXT,
    email_alerts INTEGER DEFAULT 1,
    sms_alerts INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // User preferences / alert subscriptions
  db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT,
    subscribed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Admins
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Government portals directory
  db.run(`CREATE TABLE IF NOT EXISTS govt_portals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    state TEXT,
    description TEXT,
    verification_status TEXT DEFAULT 'pending',
    last_checked DATETIME,
    featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Schemes
  db.run(`CREATE TABLE IF NOT EXISTS schemes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    ministry TEXT,
    description TEXT,
    eligibility TEXT,
    benefits TEXT,
    income_limit TEXT,
    age_requirements TEXT,
    category_requirements TEXT,
    application_process TEXT,
    required_documents TEXT,
    application_dates TEXT,
    official_guidelines TEXT,
    link TEXT,
    state TEXT,
    sector TEXT,
    type TEXT,
    featured INTEGER DEFAULT 0,
    is_auto INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Jobs
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation TEXT NOT NULL,
    advertisement_number TEXT,
    post_name TEXT,
    total_vacancies TEXT,
    category_wise_vacancies TEXT,
    qualification TEXT,
    subject_requirements TEXT,
    age_limit TEXT,
    age_relaxation TEXT,
    salary TEXT,
    job_type TEXT,
    selection_procedure TEXT,
    examination_pattern TEXT,
    application_fee TEXT,
    application_opening TEXT,
    last_date TEXT,
    official_notification TEXT,
    application_link TEXT,
    exam_date TEXT,
    admit_card TEXT,
    answer_key TEXT,
    result TEXT,
    state TEXT,
    sector TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Scholarships
  db.run(`CREATE TABLE IF NOT EXISTS scholarships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT,
    category TEXT,
    eligible_students TEXT,
    qualification TEXT,
    family_income TEXT,
    scholarship_amount TEXT,
    course_eligibility TEXT,
    application_dates TEXT,
    required_documents TEXT,
    renewal_requirements TEXT,
    official_guidelines TEXT,
    link TEXT,
    state TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Courses
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    provider TEXT,
    subject TEXT,
    duration TEXT,
    learning_mode TEXT,
    course_fee TEXT,
    examination_fee TEXT,
    certificate_fee TEXT,
    certificate_provider TEXT,
    eligibility TEXT,
    enrollment_deadline TEXT,
    course_start_date TEXT,
    link TEXT,
    sector TEXT,
    level TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Training
  db.run(`CREATE TABLE IF NOT EXISTS training (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    provider TEXT,
    sector TEXT,
    duration TEXT,
    certification TEXT,
    stipend TEXT,
    location TEXT,
    fees TEXT,
    enrollment_process TEXT,
    link TEXT,
    type TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Internships
  db.run(`CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation TEXT NOT NULL,
    post_title TEXT,
    qualification TEXT,
    seats TEXT,
    age_requirements TEXT,
    duration TEXT,
    stipend TEXT,
    location TEXT,
    start_date TEXT,
    last_date TEXT,
    selection_method TEXT,
    link TEXT,
    type TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Apprenticeships
  db.run(`CREATE TABLE IF NOT EXISTS apprenticeships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation TEXT NOT NULL,
    trade TEXT,
    qualification TEXT,
    seats TEXT,
    age_requirements TEXT,
    duration TEXT,
    stipend TEXT,
    location TEXT,
    start_date TEXT,
    last_date TEXT,
    selection_method TEXT,
    link TEXT,
    type TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Entrance exams
  db.run(`CREATE TABLE IF NOT EXISTS entrance_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_name TEXT NOT NULL,
    conducting_body TEXT,
    qualification TEXT,
    syllabus TEXT,
    exam_date TEXT,
    application_opening TEXT,
    last_date TEXT,
    admit_card TEXT,
    result TEXT,
    link TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Updates / News
  db.run(`CREATE TABLE IF NOT EXISTS updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    meta TEXT,
    excerpt TEXT,
    link TEXT,
    type TEXT,
    featured INTEGER DEFAULT 0,
    is_auto INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Career chart
  db.run(`CREATE TABLE IF NOT EXISTS career_chart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage TEXT NOT NULL,
    qualification TEXT,
    options TEXT,
    govt_jobs TEXT,
    skills TEXT,
    link TEXT,
    featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Newsletter subscribers
  db.run(`CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    categories TEXT,
    state TEXT,
    subscribed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bookmarks (saved opportunities)
  db.run(`CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    title TEXT,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, table_name, record_id)
  )`);

  // Personal application tracker
  db.run(`CREATE TABLE IF NOT EXISTS application_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    table_name TEXT,
    record_id INTEGER,
    title TEXT,
    organisation TEXT,
    status TEXT DEFAULT 'interested',
    notes TEXT,
    reminder_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Official source connectors
  db.run(`CREATE TABLE IF NOT EXISTS connectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    target_table TEXT,
    frequency TEXT,
    last_run DATETIME,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Study material — links to officially hosted, legally shareable resources only
  db.run(`CREATE TABLE IF NOT EXISTS study_material (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    exam TEXT,
    subject TEXT,
    provider TEXT,
    format TEXT,
    language TEXT,
    cost TEXT DEFAULT 'Free',
    level TEXT,
    description TEXT,
    link TEXT NOT NULL,
    featured INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 1,
    last_checked DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // migrate study_material on older databases
  db.run('ALTER TABLE study_material ADD COLUMN featured INTEGER DEFAULT 0', () => {});

  // Contact messages
  db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    user_type TEXT,
    subject TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Insert default admin
db.get("SELECT * FROM admins WHERE username = ?", ['admin'], (err, row) => {
  if (!row) {
    const hash = bcrypt.hashSync(ADMIN_BOOT_PASSWORD, 10);
    db.run("INSERT INTO admins (username, password, email, role) VALUES (?, ?, ?, ?)",
      ['admin', hash, 'admin@indiastudentcareer.in', 'super_admin']);
    console.log(IS_PROD
      ? 'Admin account created with the ADMIN_PASSWORD from your environment.'
      : 'Default admin created: admin / admin123  (development only)');
  } else if (IS_PROD && bcrypt.compareSync(DEMO_ADMIN_PASSWORD, row.password)) {
    console.warn('\n  [WARN] The admin account still uses the published demo password.');
    console.warn('  Sign in and change it, or delete the admins row and restart so ADMIN_PASSWORD seeds a new one.\n');
  }
});

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ message: 'Admin access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid admin token' });
    req.user = user;
    next();
  });
}

// ============================================================================
// USER AUTH ROUTES
// ============================================================================
app.post('/api/register', loginLimiter, (req, res) => {
  const { name, email, password, qualification, stream, passing_year, date_of_birth, category, state, district, domicile, family_income, gender, disability, skills, work_experience, preferred_job_type, language } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (user) return res.status(400).json({ message: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (name, email, password, qualification, stream, passing_year, date_of_birth, category, state, district, domicile, family_income, gender, disability, skills, work_experience, preferred_job_type, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, email, hash, qualification, stream, passing_year, date_of_birth, category, state, district, domicile, family_income, gender, disability, skills, work_experience, preferred_job_type, language || 'en'],
      function(err) {
        if (err) return res.status(500).json({ message: err.message });
        const token = jwt.sign({ id: this.lastID, email: email }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({ message: 'Registered successfully', user: { id: this.lastID, name, email } });
      });
  });
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) return res.status(400).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, language: user.language } });
    });
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json({ user: null });
    db.get("SELECT id, name, email, qualification, state, language FROM users WHERE id = ?", [user.id], (err, row) => {
      res.json({ user: row || null });
    });
  });
});

// ============================================================================
// ADMIN AUTH ROUTES
// ============================================================================
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM admins WHERE username = ?", [username], (err, user) => {
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) return res.status(400).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('admin_token', token, { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax', maxAge: 24 * 60 * 60 * 1000 });
      res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
    });
  });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Logged out' });
});

app.get('/api/admin/me', authenticateAdmin, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================================
// GENERIC CRUD HELPER
// ============================================================================
function computeAutoStatus(row) {
  if (!row || !row.last_date) return row ? row.status : null;
  const d = new Date(row.last_date);
  if (isNaN(d.getTime())) return row.status;
  const days = Math.ceil((d - new Date()) / 86400000);
  if (days < 0) return 'closed';
  if (days <= 7) return 'closing';
  if (row.status === 'upcoming') return 'upcoming';
  return 'open';
}

function crudRoutes(table, idColumn = 'id', searchColumns = ['title']) {
  registerCrud(table, idColumn, searchColumns);
  if (table.includes('_')) {
    registerCrud(table.replace(/_/g, '-'), idColumn, searchColumns, table);
  }
}

function registerCrud(table, idColumn = 'id', searchColumns = ['title'], dbTable = null) {
  const tbl = dbTable || table;
  app.get(`/api/${table}`, (req, res) => {
    const { featured, state, status, search, limit, sector } = req.query;
    let query = `SELECT * FROM ${tbl} WHERE 1=1`;
    const params = [];
    if (featured === 'true') { query += ' AND featured = 1'; }
    if (state) { query += ' AND state = ?'; params.push(state); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (sector) { query += ' AND sector = ?'; params.push(sector); }
    if (search) {
      const clauses = searchColumns.map(c => `${c} LIKE ?`).join(' OR ');
      query += ` AND (${clauses})`;
      searchColumns.forEach(() => params.push(`%${search}%`));
    }
    query += ' ORDER BY featured DESC, created_at DESC';
    if (limit) { query += ' LIMIT ?'; params.push(Math.min(parseInt(limit) || 0, 200)); }
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      (rows || []).forEach(r => { r.auto_status = computeAutoStatus(r); });
      res.json(rows);
    });
  });

  app.get(`/api/${table}/:id`, (req, res) => {
    db.get(`SELECT * FROM ${tbl} WHERE ${idColumn} = ?`, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(404).json({ message: 'Record not found' });
      row.auto_status = computeAutoStatus(row);
      res.json(row);
    });
  });

  app.post(`/api/${table}`, authenticateAdmin, (req, res) => {
    const keys = Object.keys(req.body).filter(k => k !== idColumn);
    const cols = keys.join(', ');
    const vals = keys.map(() => '?').join(', ');
    const values = keys.map(k => req.body[k]);
    db.run(`INSERT INTO ${tbl} (${cols}) VALUES (${vals})`, values, function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ id: this.lastID, message: `${tbl} added` });
    });
  });

  app.put(`/api/${table}/:id`, authenticateAdmin, (req, res) => {
    const keys = Object.keys(req.body).filter(k => k !== idColumn);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => req.body[k]);
    values.push(req.params.id);
    db.run(`UPDATE ${tbl} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = ?`, values, function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: `${tbl} updated` });
    });
  });

  app.delete(`/api/${table}/:id`, authenticateAdmin, (req, res) => {
    db.run(`DELETE FROM ${tbl} WHERE ${idColumn} = ?`, [req.params.id], function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: `${tbl} deleted` });
    });
  });
}

crudRoutes('schemes', 'id', ['title', 'description', 'ministry', 'sector']);
crudRoutes('jobs', 'id', ['post_name', 'organisation', 'advertisement_number', 'qualification']);
crudRoutes('scholarships', 'id', ['title', 'department', 'eligible_students', 'category']);
crudRoutes('courses', 'id', ['title', 'provider', 'subject', 'sector']);
crudRoutes('training', 'id', ['title', 'provider', 'sector', 'type']);
crudRoutes('internships', 'id', ['post_title', 'organisation', 'qualification']);
crudRoutes('apprenticeships', 'id', ['trade', 'organisation', 'qualification']);
crudRoutes('entrance_exams', 'id', ['exam_name', 'conducting_body', 'qualification']);
crudRoutes('govt_portals', 'id', ['name', 'description', 'category']);
crudRoutes('updates', 'id', ['title', 'excerpt', 'type']);
crudRoutes('career_chart', 'id', ['stage', 'qualification', 'options', 'govt_jobs']);
crudRoutes('study_material', 'id', ['title', 'exam', 'subject', 'provider']);

// ============================================================================
// BOOKMARKS + APPLICATION TRACKER (signed-in students)
// ============================================================================
app.get('/api/bookmarks', authenticateToken, (req, res) => {
  db.all("SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.post('/api/bookmarks', authenticateToken, (req, res) => {
  const { table_name, record_id, title, link } = req.body;
  if (!table_name || !record_id) return res.status(400).json({ message: 'Record required' });
  db.run("INSERT OR IGNORE INTO bookmarks (user_id, table_name, record_id, title, link) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, table_name, record_id, title || '', link || ''], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Saved to your list' });
    });
});

app.delete('/api/bookmarks/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM bookmarks WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Removed' });
  });
});

const TRACKER_STATES = ['interested', 'preparing', 'applied', 'admit_card', 'exam_done', 'interview', 'selected', 'not_selected', 'withdrawn'];

app.get('/api/tracker', authenticateToken, (req, res) => {
  db.all("SELECT * FROM application_tracker WHERE user_id = ? ORDER BY updated_at DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.post('/api/tracker', authenticateToken, (req, res) => {
  const { table_name, record_id, title, organisation, status, notes, reminder_date } = req.body;
  const st = TRACKER_STATES.includes(status) ? status : 'interested';
  db.run("INSERT INTO application_tracker (user_id, table_name, record_id, title, organisation, status, notes, reminder_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, table_name || '', record_id || null, title || '', organisation || '', st, notes || '', reminder_date || ''],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ id: this.lastID, message: 'Added to tracker' });
    });
});

app.put('/api/tracker/:id', authenticateToken, (req, res) => {
  const { status, notes, reminder_date } = req.body;
  const st = TRACKER_STATES.includes(status) ? status : 'interested';
  db.run("UPDATE application_tracker SET status = ?, notes = ?, reminder_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
    [st, notes || '', reminder_date || '', req.params.id, req.user.id], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Tracker updated' });
    });
});

app.delete('/api/tracker/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM application_tracker WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Removed from tracker' });
  });
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  const counts = {};
  const tables = ['jobs', 'scholarships', 'schemes', 'courses', 'training', 'internships', 'apprenticeships', 'entrance_exams', 'users', 'govt_portals', 'updates'];
  let completed = 0;
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as cnt FROM ${table}`, [], (err, row) => {
      counts[table] = row ? row.cnt : 0;
      completed++;
      if (completed === tables.length) res.json(counts);
    });
  });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  db.all("SELECT id, name, email, qualification, state, category, created_at FROM users ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.get('/api/admin/newsletter', authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM newsletter ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.post('/api/connectors', authenticateAdmin, (req, res) => {
  const { name, url, target_table, frequency } = req.body;
  if (!name || !url) return res.status(400).json({ message: 'Name and URL required' });
  db.run("INSERT INTO connectors (name, url, target_table, frequency) VALUES (?, ?, ?, ?)",
    [name, url, target_table || 'schemes', frequency || 'Daily'], function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ id: this.lastID, message: 'Connector registered' });
    });
});

app.get('/api/connectors', authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM connectors ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

// ============================================================================
// STATES DATA
// ============================================================================
app.get('/api/states', (req, res) => {
  const states = [
    { code: 'RJ', name: 'Rajasthan', name_hi: 'राजस्थान' },
    { code: 'DL', name: 'Delhi', name_hi: 'दिल्ली' },
    { code: 'MH', name: 'Maharashtra', name_hi: 'महाराष्ट्र' },
    { code: 'UP', name: 'Uttar Pradesh', name_hi: 'उत्तर प्रदेश' },
    { code: 'KA', name: 'Karnataka', name_hi: 'कर्नाटक' },
    { code: 'TN', name: 'Tamil Nadu', name_hi: 'तमिल नाडु' },
    { code: 'WB', name: 'West Bengal', name_hi: 'पश्चिम बंगाल' },
    { code: 'GJ', name: 'Gujarat', name_hi: 'गुजरात' },
    { code: 'AP', name: 'Andhra Pradesh', name_hi: 'आंध्र प्रदेश' },
    { code: 'TS', name: 'Telangana', name_hi: 'तेलंगाना' },
    { code: 'PB', name: 'Punjab', name_hi: 'पंजाब' },
    { code: 'HR', name: 'Haryana', name_hi: 'हरियाणा' },
    { code: 'BR', name: 'Bihar', name_hi: 'बिहार' },
    { code: 'OD', name: 'Odisha', name_hi: 'ओडिशा' },
    { code: 'AS', name: 'Assam', name_hi: 'असम' },
    { code: 'KT', name: 'Kerala', name_hi: 'केरल' },
    { code: 'JK', name: 'Jammu & Kashmir', name_hi: 'जम्मू और कश्मीर' },
    { code: 'HP', name: 'Himachal Pradesh', name_hi: 'हिमाचल प्रदेश' },
    { code: 'UT', name: 'Uttarakhand', name_hi: 'उत्तराखंड' },
    { code: 'JH', name: 'Jharkhand', name_hi: 'झारखंड' },
    { code: 'CG', name: 'Chhattisgarh', name_hi: 'छत्तीसगढ़' },
    { code: 'GO', name: 'Goa', name_hi: 'गोवा' },
    { code: 'MP', name: 'Madhya Pradesh', name_hi: 'मध्य प्रदेश' },
    { code: 'NL', name: 'Nagaland', name_hi: 'नागालैंड' },
    { code: 'MN', name: 'Manipur', name_hi: 'मणिपुर' },
    { code: 'TR', name: 'Tripura', name_hi: 'त्रिपुरा' },
    { code: 'MZ', name: 'Mizoram', name_hi: 'मिजोरम' },
    { code: 'AR', name: 'Arunachal Pradesh', name_hi: 'अरुणाचल प्रदेश' },
    { code: 'SK', name: 'Sikkim', name_hi: 'सिक्किम' },
    { code: 'AN', name: 'Andaman & Nicobar', name_hi: 'अंडमान और निकोबार' },
    { code: 'CH', name: 'Chandigarh', name_hi: 'चंडीगढ़' },
    { code: 'DN', name: 'Dadra & Nagar Haveli', name_hi: 'दादरा और नगर हवेली' },
    { code: 'LD', name: 'Lakshadweep', name_hi: 'लक्षद्वीप' },
    { code: 'PY', name: 'Puducherry', name_hi: 'पुदुचेरी' },
    { code: 'LD', name: 'Ladakh', name_hi: 'लद्दाख' }
  ];
  res.json(states);
});

// ============================================================================
// NEWSLETTER
// ============================================================================
app.post('/api/newsletter', writeLimiter, (req, res) => {
  const { email, categories, state } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  db.run("INSERT OR IGNORE INTO newsletter (email, categories, state) VALUES (?, ?, ?)",
    [email, categories || '', state || ''],
    function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Subscribed successfully' });
    });
});

// ============================================================================
// CONTACT
// ============================================================================
app.post('/api/contact', writeLimiter, (req, res) => {
  const { name, email, user_type, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ message: 'All fields required' });
  db.run("INSERT INTO contact_messages (name, email, user_type, subject, message) VALUES (?, ?, ?, ?, ?)",
    [name, email, user_type || 'student', subject, message],
    function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Message sent successfully' });
    });
});

app.get('/api/contact-messages', authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM contact_messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

app.delete('/api/contact-messages/:id', authenticateAdmin, (req, res) => {
  db.run("DELETE FROM contact_messages WHERE id=?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Deleted' });
  });
});

// ============================================================================
// IMPORT / EXPORT
// ============================================================================
app.get('/api/export', authenticateAdmin, (req, res) => {
  const tables = ['schemes', 'jobs', 'scholarships', 'courses', 'training', 'internships', 'apprenticeships', 'entrance_exams', 'govt_portals', 'updates', 'career_chart'];
  const result = {};
  let completed = 0;
  tables.forEach(table => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      result[table] = rows || [];
      completed++;
      if (completed === tables.length) res.json({ export_date: new Date().toISOString(), data: result });
    });
  });
});

const upload = multer({ dest: 'uploads/' });

const IMPORTABLE = ['schemes', 'jobs', 'scholarships', 'courses', 'training', 'internships', 'apprenticeships', 'entrance_exams', 'govt_portals', 'updates', 'career_chart'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function insertRows(table, rows, onDone) {
  if (!Array.isArray(rows) || rows.length === 0) return onDone(0, 0);
  let imported = 0, skipped = 0, done = 0;
  rows.forEach(row => {
    const keys = Object.keys(row).filter(k => k !== 'id' && row[k] !== undefined && row[k] !== null && row[k] !== '');
    if (!keys.length) { skipped++; done++; return; }
    const cols = keys.join(', ');
    const holders = keys.map(() => '?').join(', ');
    const values = keys.map(k => row[k]);
    db.run(`INSERT INTO ${table} (${cols}) VALUES (${holders})`, values, (err) => {
      if (err) skipped++;
      else imported++;
      done++;
      if (done === rows.length) onDone(imported, skipped);
    });
  });
}

app.post('/api/import', authenticateAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const targetTable = (req.body.table || 'schemes').trim();
  try {
    const raw = fs.readFileSync(req.file.path, 'utf8');
    const isJson = req.file.originalname.toLowerCase().endsWith('.json') || raw.trim().startsWith('{');

    if (isJson) {
      const parsed = JSON.parse(raw);
      const payload = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : parsed;
      const tables = Object.keys(payload).filter(t => IMPORTABLE.includes(t) && Array.isArray(payload[t]));
      if (!tables.length) return res.status(400).json({ message: 'No recognised tables found in JSON file' });

      let imported = 0, skipped = 0, remaining = tables.length;
      tables.forEach(t => {
        insertRows(t, payload[t], (imp, skip) => {
          imported += imp; skipped += skip;
          remaining--;
          if (remaining === 0) {
            fs.unlinkSync(req.file.path);
            res.json({ imported, skipped, tables });
          }
        });
      });
    } else {
      if (!IMPORTABLE.includes(targetTable)) {
        return res.status(400).json({ message: 'Unknown target table' });
      }
      const rows = parseCsv(raw);
      if (rows.length < 2) return res.status(400).json({ message: 'CSV needs a header row and at least one data row' });
      const headers = rows[0].map(h => h.trim());
      const records = rows.slice(1).filter(r => r.join('').trim() !== '').map(r => {
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = (r[i] || '').trim(); });
        return obj;
      });
      insertRows(targetTable, records, (imported, skipped) => {
        fs.unlinkSync(req.file.path);
        res.json({ imported, skipped, tables: [targetTable] });
      });
    }
  } catch (err) {
    res.status(400).json({ message: 'Import failed: ' + err.message });
  }
});

// ============================================================================
// AI ASSISTANT — free tier (Google Gemini Flash) with grounded retrieval
// Works with no API key too: falls back to database-only answers (zero cost).
// ============================================================================
const ai = require('./ai');

app.post('/api/ai-search', aiLimiter, async (req, res) => {
  const { query } = req.body;
  if (!query || !String(query).trim()) {
    return res.status(400).json({ message: 'A search query is required' });
  }
  try {
    const matches = await ai.query(query);
    res.json({
      query,
      citations: ai.toCitations(matches),
      ai_enabled: ai.aiConfigured,
      model: ai.model,
      powered_by: ai.aiConfigured ? 'Google Gemini (free tier)' : 'Platform database (AI key not set)'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/ai-chat', aiLimiter, async (req, res) => {
  const { question, lang, page } = req.body;
  if (!question || !String(question).trim()) {
    return res.status(400).json({ message: 'Please type a question' });
  }
  // Guard rail: never accept obvious sensitive data
  if (/\b\d{12}\b/.test(question) || /otp|password|aadhaar number/i.test(question)) {
    return res.status(400).json({
      message: 'Please do not share Aadhaar numbers, OTPs or passwords. Ask about a scheme, job, course or eligibility instead.'
    });
  }
  try {
    const result = await ai.ask({ question, lang: lang === 'hi' ? 'hi' : 'en', pageContext: page || '' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ---------------- eligibility finder ---------------- */
const eligibility = require('./eligibility');

app.get('/api/eligibility/options', (req, res) => {
  res.json({ qualifications: eligibility.LEVELS });
});

app.post('/api/eligibility', writeLimiter, async (req, res) => {
  const { qualification, state, category, age, income } = req.body || {};
  if (!qualification) {
    return res.status(400).json({ message: 'Please choose your highest qualification.' });
  }
  try {
    const result = await eligibility.find({
      qualification,
      state,
      category,
      age: age === '' || age == null ? null : Number(age),
      income: income === '' || income == null ? null : Number(income)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/ai-status', (req, res) => {
  res.json({ ai_enabled: ai.aiConfigured, model: ai.model, usage: ai.usage() });
});


/* ---------------- link health (drives the top bar + directory badges) -------- */
const linkcheck = require('./linkcheck');

/* Public build info. admin.html only prints the demo credentials when the
   server is still running with its seeded default password — a deployed site
   with ADMIN_PASSWORD set never shows them. */
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    demo: !IS_PROD || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === DEMO_ADMIN_PASSWORD,
    environment: process.env.NODE_ENV || 'development',
    site: 'India Student & Career Hub'
  });
});

app.get('/api/health/links', async (req, res) => {
  try {
    res.json(await linkcheck.health());
  } catch (err) {
    res.json({ portals: {}, total_portals: 0, last_checked: null });
  }
});

app.post('/api/health/links/run', authenticateAdmin, async (req, res) => {
  try {
    const result = await linkcheck.runAll({ verbose: false });
    res.json({
      checked: result.checked,
      summary: result.summary,
      problems: result.problems.map(p => ({ table: p.table, id: p.id, url: p.url, status: p.status, code: p.code }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed default data
function seedData() {
  // Schemes
  db.get("SELECT COUNT(*) as count FROM schemes", (err, row) => {
    if (row.count === 0) {
      const schemes = [
        ['National Scholarship Portal (NSP)', 'Scholarship', 'Ministry of Education', 'Single portal for all government scholarships.', 'All students', 'Pre-matric, Post-matric, Merit-based', 'Varies', 'Varies', 'Varies', 'Apply online via NSP', 'Aadhaar, Bank passbook, Marksheet', 'Throughout the year', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All', 'Education', 'scholarship', 1, 0, 'open'],
        ['PM Internship Scheme', 'Internship', 'Ministry of Corporate Affairs', 'Paid internship for students and fresh graduates.', 'Graduates, Undergraduates', 'Any', 'Not applicable', '18-25 years', 'All', 'Apply via portal', 'Aadhaar, Resume, Marksheet', 'Rolling', 'https://pminternship.mca.gov.in/', 'https://pminternship.mca.gov.in/', 'All', 'Employment', 'internship', 1, 0, 'open'],
        ['National Career Service (NCS)', 'Employment', 'Ministry of Labour', 'Government job portal connecting job seekers.', 'All job seekers', 'Any', 'Not applicable', '18+ years', 'All', 'Register on portal', 'Aadhaar, Resume', 'Throughout the year', 'https://www.ncs.gov.in/', 'https://www.ncs.gov.in/', 'All', 'Employment', 'job', 1, 0, 'open'],
        ['Vidya Lakshmi Education Loan', 'Education Loan', 'Ministry of Finance', 'Education loans from banks across India.', 'Students pursuing higher education', '10th+', 'Varies by bank', 'Varies', 'All', 'Apply via portal', 'Admission letter, Income certificate', 'Throughout the year', 'https://www.vidyalakshmi.co.in/', 'https://www.vidyalakshmi.co.in/', 'All', 'Finance', 'loan', 1, 0, 'open'],
        ['PMKVY - Skill Development', 'Skill Development', 'Ministry of Skill Development', 'Industry-relevant skill training.', '10th pass and above', 'Any', 'Free', '18-45 years', 'All', 'Enroll at training center', 'Aadhaar, Marksheet', 'Rolling', 'https://pmkvyofficial.org/', 'https://pmkvyofficial.org/', 'All', 'Skills', 'skill', 1, 0, 'open'],
        ['Apprenticeship Portal (NATS/NAPS)', 'Apprenticeship', 'Ministry of Education', 'Apprenticeship for graduates and diploma holders.', 'Graduates, Diploma holders', 'Degree/Diploma', 'Stipend provided', '18+ years', 'All', 'Apply via portal', 'Marksheet, Aadhaar', 'Rolling', 'https://www.apprenticeshipindia.gov.in/', 'https://www.apprenticeshipindia.gov.in/', 'All', 'Skills', 'apprenticeship', 0, 0, 'open'],
        ['myScheme - Government Schemes', 'Government Scheme', 'MeitY', 'Discover all government schemes.', 'All citizens', 'Any', 'Varies', 'Varies', 'All', 'Apply via portal', 'Aadhaar', 'Throughout the year', 'https://www.myscheme.gov.in/', 'https://www.myscheme.gov.in/', 'All', 'Governance', 'scheme', 0, 0, 'open'],
        ['SWAYAM - Free Online Courses', 'Free Course', 'Ministry of Education', 'Free online courses from top institutions.', 'All learners', 'Any', 'Free', 'Any', 'All', 'Enroll online', 'Aadhaar', 'Rolling', 'https://swayam.gov.in/', 'https://swayam.gov.in/', 'All', 'Education', 'course', 1, 0, 'open'],
        ['SSC CGL Examination', 'Government Job', 'Staff Selection Commission', 'Combined Graduate Level exam.', 'Graduation', 'Any', '₹100-₹200', '18-32 years', 'All', 'Online application', 'Graduation degree, Photo', 'As per notification', 'https://ssc.nic.in/', 'https://ssc.nic.in/', 'All', 'Employment', 'job', 1, 0, 'open'],
        ['UPSC Civil Services', 'Government Job', 'Union Public Service Commission', 'IAS, IPS, IFS examination.', 'Graduation', 'Any', '₹100', '21-32 years', 'All', 'Online application', 'Graduation degree, Photo', 'As per notification', 'https://upsc.gov.in/', 'https://upsc.gov.in/', 'All', 'Employment', 'job', 1, 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO schemes (title, category, ministry, description, eligibility, benefits, income_limit, age_requirements, category_requirements, application_process, required_documents, application_dates, official_guidelines, link, state, sector, type, featured, is_auto, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      schemes.forEach(s => stmt.run(s));
      stmt.finalize();
    }
  });

  // Portals
  db.get("SELECT COUNT(*) as count FROM govt_portals", (err, row) => {
    if (row.count === 0) {
      const portals = [
        ['National Scholarship Portal', 'https://scholarships.gov.in/', 'Scholarships', 'All', 'Single window for all central and state government scholarships.', 'verified', 0],
        ['myScheme', 'https://www.myscheme.gov.in/', 'Schemes', 'All', 'Find government schemes you are eligible for by answering a few questions.', 'verified', 1],
        ['UMANG', 'https://web.umang.gov.in/', 'Governance', 'All', 'Unified Mobile Application for New-age Governance - 200+ central and state services.', 'verified', 0],
        ['National Career Service', 'https://www.ncs.gov.in/', 'Employment', 'All', 'Government job portal connecting job seekers, employers and counsellors.', 'verified', 1],
        ['Employment News', 'https://www.employmentnews.gov.in/', 'Employment', 'All', 'Weekly government employment newspaper with all central recruitment advertisements.', 'verified', 0],
        ['Skill India Digital Hub', 'https://www.skillindiadigital.gov.in/', 'Skill Development', 'All', 'National digital platform for skill development, courses and certifications.', 'verified', 1],
        ['SWAYAM', 'https://swayam.gov.in/', 'Education', 'All', 'Free online courses from IITs, IIMs, central universities and NPTEL.', 'verified', 1],
        ['NPTEL', 'https://nptel.ac.in/', 'Education', 'All', 'Engineering and science certification courses from IITs and IISc.', 'verified', 1],
        ['NIELIT', 'https://www.nielit.gov.in/', 'Education', 'All', 'Computer literacy and IT certification courses including CCC and O Level.', 'verified', 0],
        ['AICTE', 'https://www.aicte-india.org/', 'Education', 'All', 'Technical education regulator, scholarships and internship portal.', 'verified', 1],
        ['UGC', 'https://www.ugc.gov.in/', 'Education', 'All', 'Higher education regulator, fellowships and scholarship schemes.', 'verified', 0],
        ['UPSC', 'https://upsc.gov.in/', 'Employment', 'All', 'Civil Services, NDA, CDS and other central government examinations.', 'verified', 1],
        ['SSC', 'https://ssc.gov.in/', 'Employment', 'All', 'Staff Selection Commission recruitment for Group B and C posts.', 'verified', 1],
        ['NTA', 'https://nta.ac.in/', 'Education', 'All', 'National Testing Agency - CUET, JEE Main, NEET, UGC NET and more.', 'verified', 0],
        ['Apprenticeship India', 'https://www.apprenticeshipindia.gov.in/', 'Apprenticeship', 'All', 'National Apprenticeship Promotion Scheme portal for apprentices and employers.', 'verified', 1],
        ['NATS', 'https://nats.education.gov.in/', 'Apprenticeship', 'All', 'National Apprenticeship Training Scheme for graduates and diploma holders.', 'verified', 0],
        ['DigiLocker', 'https://www.digilocker.gov.in/', 'Governance', 'All', 'Store and share official documents and certificates digitally.', 'verified', 0],
        ['India.gov.in', 'https://www.india.gov.in/', 'Governance', 'All', 'National portal of India - all government services and information.', 'verified', 0],
        ['MyGov', 'https://www.mygov.in/', 'Governance', 'All', 'Citizen engagement platform for government programmes and campaigns.', 'verified', 0],
        ['Startup India', 'https://www.startupindia.gov.in/', 'Governance', 'All', 'Startup recognition, funding schemes and entrepreneurship support.', 'verified', 0],
        ['PM Internship Scheme', 'https://pminternship.mca.gov.in/', 'Apprenticeship', 'All', 'Paid internship opportunities with top companies for young graduates.', 'verified', 1],
        ['ISRO', 'https://www.isro.gov.in/', 'Employment', 'All', 'Indian Space Research Organisation careers, internships and education.', 'verified', 0],
        ['DRDO', 'https://www.drdo.gov.in/', 'Employment', 'All', 'Defence Research and Development Organisation recruitment and internships.', 'verified', 0],
        ['CSIR', 'https://www.csir.res.in/', 'Education', 'All', 'Council of Scientific and Industrial Research - fellowships and laboratories.', 'verified', 0],
        ['PMKVY', 'https://www.pmkvyofficial.org/', 'Skill Development', 'All', 'Pradhan Mantri Kaushal Vikas Yojana - free short term skill training.', 'verified', 1],
        ['Vidya Lakshmi', 'https://www.vidyalakshmi.co.in/', 'Finance', 'All', 'Single window for education loans and scholarship applications.', 'verified', 0],
        ['Rajasthan SSO', 'https://sso.rajasthan.gov.in/', 'State Portal', 'Rajasthan', 'Single Sign-On portal for all Rajasthan government services.', 'verified', 1],
        ['Rajasthan SJE', 'https://sje.rajasthan.gov.in/', 'Scholarships', 'Rajasthan', 'Social Justice and Empowerment Department - scholarships for SC, ST, OBC and SBC students.', 'verified', 1],
        ['Rajasthan RPSC', 'https://rpsc.rajasthan.gov.in/', 'State PSC', 'Rajasthan', 'Rajasthan Public Service Commission - RAS and other state examinations.', 'verified', 1],
        ['Rajasthan RSSB', 'https://rssb.rajasthan.gov.in/', 'State Recruitment', 'Rajasthan', 'Rajasthan Staff Selection Board - constable, patwari and subordinate posts.', 'verified', 1],
        ['Rajasthan Employment', 'https://employment.livelihoods.rajasthan.gov.in/', 'Employment', 'Rajasthan', 'Rajasthan employment exchange and job seeker registration portal.', 'verified', 0],
        ['Rajasthan Shala Darpan', 'https://rajshaladarpan.nic.in/', 'Education', 'Rajasthan', 'School education portal for Rajasthan government schools.', 'verified', 0],
        ['RSLDC', 'https://rsldc.rajasthan.gov.in/', 'Skill Development', 'Rajasthan', 'Rajasthan Skill and Livelihoods Development Corporation - free skill training.', 'verified', 1],
        ['Jan Aadhaar', 'https://janaadhaar.rajasthan.gov.in/', 'Governance', 'Rajasthan', 'Single identity card for Rajasthan state government schemes.', 'verified', 0],
        ['e-Mitra', 'https://emitra.rajasthan.gov.in/', 'Governance', 'Rajasthan', 'Rajasthan citizen service centres for government applications and certificates.', 'verified', 0],
        ['Rajasthan Yuva Sathi', 'https://yuvasathi.rajasthan.gov.in/', 'Employment', 'Rajasthan', 'Youth welfare portal for Rajasthan with unemployment allowance and skill support.', 'verified', 0]
      ];
      const stmt = db.prepare("INSERT INTO govt_portals (name, url, category, state, description, verification_status, featured, last_checked) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))");
      portals.forEach(p => stmt.run(p));
      stmt.finalize();
    }
  });

  // Career chart
  db.get("SELECT COUNT(*) as count FROM career_chart", (err, row) => {
    if (row.count === 0) {
      const chart = [
        ['After 10th', 'SSC / Matric', 'ITI, Polytechnic, Diploma', 'SSC, Railway, Police, Defence', 'Computer, Electrician, Fitter', '/career'],
        ['After 12th (Science)', 'Higher Secondary', 'B.Tech, MBBS, B.Sc, Nursing', 'NDA, SSC, Railway, Defence', 'AI, Data Science, Engineering', '/career'],
        ['After 12th (Commerce)', 'Higher Secondary', 'B.Com, BBA, CA Foundation', 'Banking, SSC, Insurance', 'Accounting, Tally, GST', '/career'],
        ['After 12th (Arts)', 'Higher Secondary', 'BA, Law, Hotel Management', 'SSC, UPSC, State PCS, Teaching', 'Psychology, Design, Media', '/career'],
        ['After Graduation', 'Bachelor Degree', 'MBA, M.Tech, M.Sc, PhD', 'UPSC, SSC CGL, Banking PO', 'Digital Marketing, Management', '/career'],
        ['Govt Job Aspirants', 'Any Degree', 'Competitive exam prep', 'All Central & State Govt jobs', 'Reasoning, Aptitude, GK, English', '/career'],
        ['Skill Seekers', '10th / 12th / Graduate', 'PMKVY, NSDC, ITI', 'Apprenticeship', 'Sector-specific skills', '/skillsindia'],
        ['Scholarship Seekers', '10th / 12th / Graduate', 'Pre-matric, Post-matric', 'NSP scholarships', 'Application support', '/schemes']
      ];
      const stmt = db.prepare("INSERT INTO career_chart (stage, qualification, options, govt_jobs, skills, link) VALUES (?, ?, ?, ?, ?, ?)");
      chart.forEach(c => stmt.run(c));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // GOVERNMENT JOBS
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
    if (row.count === 0) {
      const jobs = [
        ['Staff Selection Commission', 'SSC/CGL/2026', 'Combined Graduate Level (Group B & C)', '8148', 'UR 3299 | OBC 2135 | SC 1213 | ST 601 | EWS 900', 'Graduation in any discipline', 'Any', '18-32 years', 'SC/ST 5 yrs, OBC 3 yrs, PwD 10 yrs', 'Pay Level 4 to 8 (Rs 25,500 - Rs 81,100)', 'Central Government', 'Tier-I CBT, Tier-II CBT, Skill Test', 'Tier-I: 100 questions, 200 marks, 60 minutes', 'Rs 100 (Women/SC/ST/PwD exempted)', '2026-09-15', '2026-11-18', 'https://ssc.gov.in/', 'https://ssc.gov.in/', '2026-12-20', '', '', '', 'All India', 'Central', 1, 'open'],
        ['Railway Recruitment Board', 'RRB/NTPC/2026', 'Non-Technical Popular Categories (Graduate & Undergraduate)', '8113', 'UR 3286 | OBC 2190 | SC 1217 | ST 610 | EWS 810', '12th Pass for UG posts, Graduation for Graduate posts', 'Any', '18-33 years', 'As per Government norms', 'Rs 19,900 - Rs 35,400 (Level 2 to 6)', 'Central Government', 'CBT-1, CBT-2, Typing/Skill Test, Document Verification', 'CBT-1: 100 questions, 100 marks', 'Rs 500 (Rs 250 refunded after CBT-1)', '2026-10-01', '2026-11-25', 'https://www.rrbcdg.gov.in/', 'https://www.rrbcdg.gov.in/', '2027-01-15', '', '', '', 'All India', 'Central', 1, 'open'],
        ['Institute of Banking Personnel Selection', 'IBPS/PO/XVI', 'Probationary Officer / Management Trainee', '4455', 'UR 1800 | OBC 1202 | SC 668 | ST 334 | EWS 451', 'Graduation in any discipline', 'Any', '20-30 years', 'SC/ST 5 yrs, OBC 3 yrs, PwD 10 yrs', 'Rs 48,480 - Rs 85,920 per month', 'Public Sector Bank', 'Preliminary Exam, Mains Exam, Interview', 'Prelims: 100 questions, 60 minutes', 'Rs 850 (SC/ST/PwD Rs 175)', '2026-10-05', '2026-11-12', 'https://www.ibps.in/', 'https://www.ibps.in/', '2026-12-28', '', '', '', 'All India', 'Banking', 1, 'open'],
        ['Union Public Service Commission', 'UPSC/CSE/2027', 'Civil Services (IAS, IPS, IFS and other Group A services)', '979', 'As per UPSC roster', 'Bachelor degree in any discipline', 'Any', '21-32 years', 'SC/ST 5 yrs, OBC 3 yrs, PwD 10 yrs', 'Level 10 (Rs 56,100 - Rs 1,77,500)', 'Central Government', 'Prelims, Mains, Interview', 'Prelims: 2 papers, 400 marks', 'Rs 100 (Female/SC/ST/PwD exempted)', '2026-11-01', '2026-12-05', 'https://upsc.gov.in/', 'https://upsc.gov.in/', '2027-05-28', '', '', '', 'All India', 'Central', 1, 'open'],
        ['Rajasthan Public Service Commission', 'RPSC/RAS/2026', 'Rajasthan Administrative Service and allied services', '733', 'As per RPSC reservation roster', 'Graduation from a recognised university', 'Any', '21-40 years', 'SC/ST/OBC/Women as per state norms', 'Rs 56,100 - Rs 1,77,500', 'State Government', 'Prelims, Mains, Interview', 'Prelims: 1 paper, 200 marks', 'Rs 350 (SC/ST Rs 150)', '2026-10-10', '2026-11-20', 'https://rpsc.rajasthan.gov.in/', 'https://rpsc.rajasthan.gov.in/', '2027-02-14', '', '', '', 'Rajasthan', 'State', 1, 'open'],
        ['Rajasthan Police / RSSB', 'RSSB/Constable/2026', 'Police Constable (District Police & Special Task Force)', '3578', 'As per RSSB roster', '12th Pass (Senior Secondary) from recognised board', 'Any', '18-27 years', 'SC/ST/OBC/Women as per state norms', 'Rs 21,700 - Rs 69,100 (Level 5)', 'State Government', 'Written Exam, Physical Efficiency Test, Medical', 'Written: 100 questions, 100 marks', 'Rs 450 (SC/ST Rs 350)', '2026-09-25', '2026-11-08', 'https://rssb.rajasthan.gov.in/', 'https://rssb.rajasthan.gov.in/', '2027-01-10', '', '', '', 'Rajasthan', 'State', 1, 'open'],
        ['Department of Posts', 'India Post/GDS/2026', 'Gramin Dak Sevak (Branch Postmaster / ABPM / Dak Sevak)', '44228', 'State-wise as per notification', '10th Pass with local language knowledge', 'Any', '18-40 years', 'SC/ST 5 yrs, OBC 3 yrs, PwD 10 yrs', 'Rs 10,000 - Rs 29,380', 'Central Government', 'Merit based on 10th standard marks', 'No written examination', 'Rs 100 (Female/PwD/SC/ST exempted)', '2026-10-15', '2026-11-28', 'https://www.indiapostgdsonline.gov.in/', 'https://www.indiapostgdsonline.gov.in/', '', '', '', '', 'All India', 'Central', 0, 'open'],
        ['Uttar Pradesh Public Service Commission', 'UPPSC/PCS/2026', 'Combined State / Upper Subordinate Services', '268', 'As per UPPSC roster', 'Graduation in any discipline', 'Any', '21-40 years', 'As per state reservation rules', 'Rs 56,100 - Rs 1,77,500', 'State Government', 'Prelims, Mains, Interview', 'Prelims: 2 papers, 200 marks', 'Rs 125 (SC/ST Rs 65)', '2026-10-20', '2026-11-22', 'https://uppsc.up.nic.in/', 'https://uppsc.up.nic.in/', '2027-03-07', '', '', '', 'Uttar Pradesh', 'State', 0, 'open'],
        ['Indian Space Research Organisation', 'ISRO/ICRB/2026', 'Scientist / Engineer - SC', '303', 'As per ISRO roster', 'BE/BTech in relevant engineering discipline', 'Electronics, Mechanical, Computer Science, Civil', '18-35 years', 'As per Government norms', 'Rs 56,100 - Rs 1,77,500 (Level 10)', 'Autonomous Body', 'Written Test (CBT) and Interview', 'CBT: 80 questions, 240 marks', 'Rs 250', '2026-10-12', '2026-11-30', 'https://www.isro.gov.in/', 'https://www.isro.gov.in/', '2027-01-24', '', '', '', 'All India', 'PSU / Autonomous', 0, 'open'],
        ['All India Institute of Medical Sciences', 'AIIMS/NORCET/2026', 'Nursing Officer (Staff Nurse Grade II)', '3055', 'As per AIIMS roster', 'BSc Nursing / GNM with relevant experience', 'Nursing', '21-30 years', 'As per Government norms', 'Rs 44,900 - Rs 1,42,400 (Level 7)', 'Autonomous Body', 'Computer Based Test (NORCET)', '200 questions, 200 marks, 180 minutes', 'Rs 3000 (SC/ST Rs 2400)', '2026-10-25', '2026-12-02', 'https://www.aiimsexams.ac.in/', 'https://www.aiimsexams.ac.in/', '2027-01-18', '', '', '', 'All India', 'PSU / Autonomous', 0, 'open'],
        ['NTPC Limited', 'NTPC/ET/2026', 'Executive Trainee (Engineering)', '250', 'As per NTPC roster', 'BE/BTech with minimum 65% marks', 'Electrical, Mechanical, Electronics, Instrumentation', '18-27 years', 'As per Government norms', 'Rs 40,000 - Rs 1,40,000', 'Maharatna PSU', 'GATE Score, Group Discussion, Interview', 'GATE 2026 score based shortlisting', 'Rs 300 (SC/ST/PwD/Female exempted)', '2026-10-08', '2026-11-16', 'https://careers.ntpc.co.in/', 'https://careers.ntpc.co.in/', '2026-12-20', '', '', '', 'All India', 'PSU / Autonomous', 1, 'open'],
        ['Central Selection Board of Constable, Bihar', 'CSBC/Bihar Police/2026', 'Constable', '21391', 'As per CSBC roster', '12th Pass from recognised board', 'Any', '18-25 years', 'SC/ST 5 yrs, OBC 3 yrs, Women as per norms', 'Rs 21,700 - Rs 69,100', 'State Government', 'Written Exam, Physical Test, Medical', 'Written: 100 questions, 100 marks', 'Rs 675 (SC/ST Rs 180)', '2026-09-30', '2026-11-10', 'https://csbc.bih.nic.in/', 'https://csbc.bih.nic.in/', '2027-02-05', '', '', '', 'Bihar', 'State', 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO jobs (organisation, advertisement_number, post_name, total_vacancies, category_wise_vacancies, qualification, subject_requirements, age_limit, age_relaxation, salary, job_type, selection_procedure, examination_pattern, application_fee, application_opening, last_date, official_notification, application_link, exam_date, admit_card, answer_key, result, state, sector, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      jobs.forEach(j => stmt.run(j));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // SCHOLARSHIPS
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM scholarships", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['Post Matric Scholarship for SC Students 2026-27', 'Ministry of Social Justice and Empowerment', 'Post-Matric', 'SC students studying in class 11 and above', 'Class 10 passed and pursuing higher education', 'Family income below Rs 2.5 lakh per annum', 'Rs 2,500 to Rs 13,500 per year plus maintenance allowance', 'Class 11 to PhD level courses', '2026-09-01 to 2026-11-30', 'Aadhaar, Caste certificate, Income certificate, Bank passbook, Previous marksheet', 'Annual renewal subject to satisfactory academic progress', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All India', 1, 'open'],
        ['Central Sector Scheme of Scholarship for College and University Students', 'Ministry of Education', 'Merit-Based', 'Students in top 20 percentile of class 12 board examination', 'Class 12 passed with 80% or above', 'Family income below Rs 4.5 lakh per annum', 'Rs 12,000 per year for UG, Rs 20,000 per year for PG', 'Regular degree courses in recognised institutions', '2026-08-15 to 2026-11-15', 'Aadhaar, Class 12 marksheet, Income certificate, Bank details', 'Renewable for 3 years of UG and 2 years of PG', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All India', 1, 'open'],
        ['Merit-cum-Means Scholarship for Minority Students', 'Ministry of Minority Affairs', 'Minority', 'Students from Muslim, Christian, Sikh, Buddhist, Jain and Parsi communities', 'Class 12 passed and in first year of graduation', 'Family income below Rs 2.5 lakh per annum', 'Course fee up to Rs 20,000 per year plus maintenance allowance', 'Technical and professional courses', '2026-09-10 to 2026-11-20', 'Aadhaar, Minority community certificate, Income certificate, Admission proof', 'Renewable for next academic year with 50% marks', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All India', 0, 'open'],
        ['PM YASASVI Scholarship for OBC, EBC and DNT Students', 'Ministry of Social Justice and Empowerment', 'OBC', 'OBC, EBC and DNT students in class 9 and class 11', 'Class 8 or class 10 passed', 'Family income below Rs 2.5 lakh per annum', 'Rs 75,000 per year for class 9-10, Rs 1,25,000 for class 11-12', 'School level education in recognised institutions', '2026-09-05 to 2026-11-25', 'Aadhaar, Caste certificate, Income certificate, School certificate', 'Annual renewal subject to promotion', 'https://yet.nta.ac.in/', 'https://yet.nta.ac.in/', 'All India', 0, 'open'],
        ['Rajasthan Post Matric Scholarship (SC, ST, OBC, SBC) 2026-27', 'Social Justice and Empowerment Department, Rajasthan', 'Post-Matric', 'SC, ST, OBC and SBC students of Rajasthan', 'Class 10 passed and pursuing post-matric courses', 'Family income as per SJE Rajasthan norms', 'Tuition fee plus maintenance allowance as per course', 'Post-matric courses in recognised institutions', '2026-08-01 to 2026-12-15', 'Jan Aadhaar, Caste certificate, Income certificate, Marksheet, Bank account (SSO linked)', 'Renewable annually through SSO Rajasthan', 'https://sje.rajasthan.gov.in/', 'https://sso.rajasthan.gov.in/', 'Rajasthan', 1, 'open'],
        ['Mukhyamantri Higher Education Scholarship, Rajasthan', 'Higher Education Department, Rajasthan', 'Merit-Based', 'Meritorious students of Rajasthan in higher education', 'Class 12 passed with minimum 60% marks', 'Family income below Rs 2.5 lakh per annum', 'Up to Rs 25,000 per year towards tuition fee', 'UG and PG courses in state universities', '2026-09-15 to 2026-11-30', 'Jan Aadhaar, Class 12 marksheet, Income certificate, Admission proof', 'Renewable based on academic performance', 'https://hte.rajasthan.gov.in/', 'https://sso.rajasthan.gov.in/', 'Rajasthan', 0, 'open'],
        ['Pre-Matric Scholarship for SC Students (Class 9-10)', 'Ministry of Social Justice and Empowerment', 'Pre-Matric', 'SC students studying in class 9 and 10', 'Class 8 passed and enrolled in class 9 or 10', 'Family income below Rs 2.5 lakh per annum', 'Rs 3,500 to Rs 7,000 per year', 'Classes 9 and 10', '2026-08-01 to 2026-11-30', 'Aadhaar, Caste certificate, Income certificate, School bonafide', 'Annual renewal on promotion to next class', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All India', 0, 'open'],
        ['Top Class Education Scheme for SC Students', 'Ministry of Social Justice and Empowerment', 'SC', 'SC students admitted to premier institutions', 'Class 12 passed with admission to listed institutions', 'Family income below Rs 8 lakh per annum', 'Full tuition fee, living expenses, books and computer', 'IITs, NITs, IIMs, AIIMS and other premier institutions', '2026-08-20 to 2026-11-30', 'Aadhaar, Caste certificate, Income certificate, Admission letter', 'Renewable for the full duration of the course', 'https://scholarships.gov.in/', 'https://scholarships.gov.in/', 'All India', 0, 'open'],
        ['Ishan Uday Special Scholarship for North East Region', 'University Grants Commission', 'UG', 'Students from North East states pursuing UG courses', 'Class 12 passed from a North East state school', 'Family income below Rs 4.5 lakh per annum', 'Rs 5,400 to Rs 7,800 per month', 'General degree and technical courses', '2026-08-10 to 2026-11-15', 'Aadhaar, Domicile certificate, Income certificate, Admission proof', 'Renewable for the duration of the course', 'https://www.ugc.gov.in/', 'https://www.ugc.gov.in/', 'North East States', 0, 'open'],
        ['AICTE Pragati Scholarship for Girl Students', 'All India Council for Technical Education', 'Girls Education', 'Girl students in AICTE approved technical institutions', 'Admission to first year of diploma or degree in AICTE approved institute', 'Family income below Rs 8 lakh per annum', 'Rs 50,000 per year', 'Technical diploma and degree courses', '2026-09-01 to 2026-11-10', 'Aadhaar, Admission proof, Income certificate, Bank details', 'Renewable for subsequent years of study', 'https://www.aicte-india.org/', 'https://www.aicte-india.org/', 'All India', 1, 'open']
      ];
      const stmt = db.prepare("INSERT INTO scholarships (title, department, category, eligible_students, qualification, family_income, scholarship_amount, course_eligibility, application_dates, required_documents, renewal_requirements, official_guidelines, link, state, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // COURSES
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM courses", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['Python Programming for Beginners', 'SWAYAM / IIT Madras', 'Programming', '8 weeks', 'Online (Self-paced)', 'Free to learn', 'Rs 1,000', 'Rs 1,000', 'IIT Madras via SWAYAM', 'Anyone with basic computer knowledge', '2026-12-31', '2027-01-15', 'https://swayam.gov.in/', 'IT / Software', 'Beginner', 1, 'open'],
        ['Artificial Intelligence and Machine Learning Fundamentals', 'NPTEL / IIT Kharagpur', 'Artificial Intelligence', '12 weeks', 'Online (Video lectures)', 'Free to learn', 'Rs 1,200', 'Rs 1,200', 'IIT Kharagpur via NPTEL', 'Engineering students and graduates', '2027-01-10', '2027-01-25', 'https://nptel.ac.in/', 'IT / Software', 'Intermediate', 1, 'open'],
        ['Data Science and Analytics with Python', 'SWAYAM / IIT Roorkee', 'Data Science', '10 weeks', 'Online', 'Free to learn', 'Rs 1,000', 'Rs 1,000', 'IIT Roorkee via SWAYAM', 'Graduates with basic mathematics', '2026-12-20', '2027-01-05', 'https://swayam.gov.in/', 'IT / Software', 'Intermediate', 0, 'open'],
        ['Digital Marketing Essentials', 'Skill India Digital Hub', 'Digital Marketing', '6 weeks', 'Online + Practical', 'Free', 'Included', 'Free', 'NSDC / Skill India', '10th pass and above', '2026-12-15', '2027-01-01', 'https://www.skillindiadigital.gov.in/', 'Marketing', 'Beginner', 1, 'open'],
        ['MS Excel and Advanced Spreadsheet Skills', 'NIELIT', 'Computer Fundamentals', '4 weeks', 'Online / Classroom', 'Free to learn', 'Rs 500', 'Rs 500', 'NIELIT', '10th pass and above', '2026-12-10', '2026-12-20', 'https://www.nielit.gov.in/', 'Computer Skills', 'Beginner', 0, 'open'],
        ['Cyber Security and Ethical Hacking Basics', 'NPTEL / IIT Madras', 'Cybersecurity', '8 weeks', 'Online', 'Free to learn', 'Rs 1,000', 'Rs 1,000', 'IIT Madras via NPTEL', 'Students with computer science background', '2027-01-05', '2027-01-20', 'https://nptel.ac.in/', 'IT / Software', 'Intermediate', 0, 'open'],
        ['Communication Skills and Personality Development', 'SWAYAM', 'Communication Skills', '6 weeks', 'Online', 'Free', 'Rs 500', 'Rs 500', 'SWAYAM partner institutions', 'All students', '2026-12-25', '2027-01-10', 'https://swayam.gov.in/', 'Soft Skills', 'Beginner', 0, 'open'],
        ['NIELIT CCC - Course on Computer Concepts', 'NIELIT', 'Computer Fundamentals', '80 hours', 'Online / Classroom', 'Free to learn', 'Rs 500', 'Rs 500', 'NIELIT', 'Anyone (no minimum qualification)', 'Rolling admissions', 'Rolling', 'https://www.nielit.gov.in/', 'Computer Skills', 'Beginner', 1, 'open'],
        ['GST and Accounting with Tally', 'SWAYAM / Spoken Tutorial', 'Management', '8 weeks', 'Online', 'Free to learn', 'Rs 500', 'Rs 500', 'Spoken Tutorial, IIT Bombay', 'Commerce students and graduates', '2026-12-18', '2027-01-03', 'https://spoken-tutorial.org/', 'Commerce', 'Beginner', 0, 'open'],
        ['Entrepreneurship and Startup Fundamentals', 'SWAYAM / IIT Bombay', 'Entrepreneurship', '8 weeks', 'Online', 'Free', 'Rs 1,000', 'Rs 1,000', 'IIT Bombay via SWAYAM', 'All learners', '2027-01-15', '2027-02-01', 'https://swayam.gov.in/', 'Management', 'Beginner', 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO courses (title, provider, subject, duration, learning_mode, course_fee, examination_fee, certificate_fee, certificate_provider, eligibility, enrollment_deadline, course_start_date, link, sector, level, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // TRAINING
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM training", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['PMKVY 4.0 Short Term Skill Training', 'National Skill Development Corporation', 'Multi-sector', '3 to 6 months', 'NSQF Level 3 to 5 certificate', 'Stipend as per scheme', 'All India', 'Free (Government funded)', 'Enroll through Skill India Digital Hub, complete KYC and select nearest training centre', 'https://www.skillindiadigital.gov.in/', 'PMKVY', 1, 'open'],
        ['ITI Electrician Trade Training', 'Government ITI / NCVT', 'Electrical', '2 years', 'NCVT ITI Certificate', 'Stipend available in some states', 'State-wise ITIs', 'Rs 5,000 to Rs 20,000 per year', 'Apply through state ITI admission portal during counselling', 'https://www.dgt.gov.in/', 'ITI', 1, 'open'],
        ['NSTI Advanced Welding Technician Course', 'National Skill Training Institute', 'Manufacturing', '1 year', 'NSTI Advanced Diploma', 'As per institute norms', 'NSTI campuses', 'Subsidised fee', 'Apply through NSTI admission notification', 'https://www.dgt.gov.in/', 'NSTI', 0, 'open'],
        ['RSLDC Mukhyamantri Yuva Sambal Yojana Training', 'Rajasthan Skill and Livelihoods Development Corporation', 'Multi-sector', '3 to 6 months', 'RSLDC Certificate', 'Unemployment allowance for eligible youth', 'Rajasthan', 'Free', 'Register on Rajasthan SSO or visit nearest RSLDC centre', 'https://rsldc.rajasthan.gov.in/', 'RSLDC', 1, 'open'],
        ['NIELIT O Level Computer Course', 'NIELIT', 'Computer Skills', '1 year', 'NIELIT O Level Certificate', 'Not applicable', 'NIELIT centres', 'Approx Rs 10,000', 'Register through NIELIT student portal', 'https://www.nielit.gov.in/', 'NIELIT', 0, 'open'],
        ['DDU-GKY Rural Skill Development', 'Ministry of Rural Development', 'Rural Livelihoods', '3 to 12 months', 'NSQF Certification', 'Free training with stipend', 'Rural districts', 'Free', 'Through empanelled project implementing agencies', 'https://ddugky.gov.in/', 'DDU-GKY', 0, 'open'],
        ['Jan Shikshan Sansthan Vocational Training', 'Ministry of Skill Development and Entrepreneurship', 'Vocational', '1 to 3 months', 'JSS Certificate', 'Nominal', 'District-level JSS centres', 'Subsidised to free', 'Visit nearest Jan Shikshan Sansthan with Aadhaar', 'https://www.msde.gov.in/', 'Vocational', 0, 'open'],
        ['Computer Applications and Data Entry Training', 'Skill India Digital Hub', 'IT-ITeS', '3 months', 'SSC NSQF certification', 'Free', 'Online and centres', 'Free', 'Enroll on Skill India Digital Hub', 'https://www.skillindiadigital.gov.in/', 'PMKVY', 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO training (title, provider, sector, duration, certification, stipend, location, fees, enrollment_process, link, type, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // INTERNSHIPS
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM internships", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['Ministry of Corporate Affairs', 'PM Internship Scheme - Top 500 Company Intern', 'Graduates, Diploma holders and certificate holders', '125000', '18-24 years', '12 months', 'Rs 5,000 per month plus one-time Rs 6,000 grant', 'All India', '2026-11-15', '2026-11-30', 'Merit and eligibility based selection on portal', 'https://pminternship.mca.gov.in/', 'PM Internship', 1, 'open'],
        ['All India Council for Technical Education', 'AICTE Internship - Engineering Intern', 'BE/BTech/Diploma students', 'Multiple', 'As per company norms', '1 to 6 months', 'Rs 5,000 to Rs 15,000 per month', 'All India', '2026-11-20', '2026-12-05', 'Application screening by host organisation', 'https://internship.aicte-india.org/', 'AICTE', 1, 'open'],
        ['Ministry of Electronics and IT', 'Digital India Internship Scheme', 'Students pursuing BE/BTech/MCA/MBA/LLB', 'Multiple', 'As per scheme', '2 to 3 months', 'Rs 10,000 per month stipend', 'Delhi and other locations', '2026-11-10', '2026-11-25', 'Written test and interview', 'https://www.digitalindia.gov.in/', 'Ministry', 0, 'open'],
        ['Ministry of Education', 'Education Policy Research Intern', 'Postgraduate students and research scholars', 'Multiple', 'As per scheme', '2 to 6 months', 'Certificate and honorarium as per norms', 'New Delhi', '2026-11-18', '2026-12-01', 'Application and interview', 'https://www.education.gov.in/', 'Ministry', 0, 'open'],
        ['NITI Aayog', 'NITI Internship Programme', 'UG and PG students of recognised universities', 'Multiple', 'As per scheme', '6 weeks to 6 months', 'Unpaid with certificate', 'New Delhi', '2026-11-25', '2026-12-10', 'Application shortlisting by division', 'https://www.niti.gov.in/', 'Ministry', 0, 'open'],
        ['Indian Space Research Organisation', 'ISRO Winter Internship', 'Engineering and science students', 'Multiple', 'As per ISRO norms', '1 to 3 months', 'Unpaid with certificate', 'ISRO centres across India', '2026-11-12', '2026-11-28', 'Institute nomination and ISRO selection', 'https://www.isro.gov.in/', 'PSU', 0, 'open'],
        ['Defence Research and Development Organisation', 'DRDO Research Intern', 'BE/BTech/ME/MTech/MSc students', 'Multiple', 'As per DRDO norms', '3 to 6 months', 'Stipend as per lab norms', 'DRDO laboratories across India', '2026-11-22', '2026-12-08', 'Application to respective laboratory', 'https://www.drdo.gov.in/', 'PSU', 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO internships (organisation, post_title, qualification, seats, age_requirements, duration, stipend, location, start_date, last_date, selection_method, link, type, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // APPRENTICESHIPS
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM apprenticeships", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['National Apprenticeship Training Scheme', 'Graduate and Technician Apprentice', 'Graduates and Diploma holders', 'Multiple', '18 years and above', '1 year', 'Rs 9,000 per month (Graduate), Rs 8,000 (Technician)', 'All India', '2026-11-15', '2026-11-30', 'Portal based matching with establishments', 'https://nats.education.gov.in/', 'NATS', 1, 'open'],
        ['Apprenticeship India (NAPS)', 'Apprentice in various trades', 'ITI and 10th/12th pass candidates', 'Multiple', '18 years and above', '6 months to 2 years', 'Stipend as per NAPS norms', 'All India', '2026-11-20', '2026-12-05', 'Employer selection through portal', 'https://www.apprenticeshipindia.gov.in/', 'NAPS', 1, 'open'],
        ['Indian Railways', 'Railway Apprentice (Various Trades)', 'ITI in relevant trade', 'Multiple', '15-24 years', '1 to 4 years', 'Stipend as per Railway norms', 'Railway divisions across India', '2026-11-10', '2026-11-25', 'Merit based on ITI marks', 'https://indianrailways.gov.in/', 'PSU', 0, 'open'],
        ['NTPC Limited', 'Technician Apprentice', 'ITI in Electrician, Fitter, Welder trades', 'Multiple', '18-27 years', '1 year', 'Rs 8,000 to Rs 9,000 per month', 'NTPC stations across India', '2026-11-18', '2026-12-02', 'Merit based on qualifying examination', 'https://careers.ntpc.co.in/', 'PSU', 0, 'open'],
        ['Indian Oil Corporation Limited', 'Technician Apprentice', 'Diploma in Engineering / ITI', 'Multiple', '18-26 years', '1 year', 'Rs 9,000 per month', 'IOCL refineries and terminals', '2026-11-22', '2026-12-06', 'Written test and document verification', 'https://iocl.com/', 'PSU', 0, 'open'],
        ['BHEL', 'Trade Apprentice', 'ITI in relevant trade', 'Multiple', '18-27 years', '1 year', 'Stipend as per Apprentices Act', 'BHEL units across India', '2026-11-25', '2026-12-10', 'Merit based on ITI marks', 'https://careers.bhel.in/', 'PSU', 0, 'open'],
        ['Rajasthan Skill and Livelihoods Development Corporation', 'ITI Apprentice - Rajasthan', 'ITI pass candidates from Rajasthan', 'Multiple', '18-30 years', '1 year', 'Rs 7,000 to Rs 9,000 per month', 'Rajasthan', '2026-11-12', '2026-11-28', 'RSLDC and employer selection', 'https://rsldc.rajasthan.gov.in/', 'ITI', 0, 'open']
      ];
      const stmt = db.prepare("INSERT INTO apprenticeships (organisation, trade, qualification, seats, age_requirements, duration, stipend, location, start_date, last_date, selection_method, link, type, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // ENTRANCE EXAMS
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM entrance_exams", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['CUET UG 2027', 'National Testing Agency', 'Class 12 passed or appearing', 'Language, Domain subjects and General Test', '2027-05-15', '2027-02-01', '2027-03-15', '', '', 'https://cuet.samarth.ac.in/', 1, 'upcoming'],
        ['CUET PG 2027', 'National Testing Agency', 'Bachelor degree in relevant subject', 'Domain specific 100 questions', '2027-06-10', '2027-01-20', '2027-02-25', '', '', 'https://cuet.nta.nic.in/', 0, 'upcoming'],
        ['JEE Main 2027 Session 1', 'National Testing Agency', 'Class 12 with Physics, Chemistry and Mathematics', 'Physics, Chemistry, Mathematics - 300 marks', '2027-01-24', '2026-11-01', '2026-12-05', '', '', 'https://jeemain.nta.nic.in/', 1, 'open'],
        ['NEET UG 2027', 'National Testing Agency', 'Class 12 with Physics, Chemistry and Biology', 'Physics, Chemistry, Botany, Zoology - 720 marks', '2027-05-03', '2027-02-01', '2027-03-10', '', '', 'https://neet.nta.nic.in/', 1, 'upcoming'],
        ['GATE 2027', 'IIT / IISc on behalf of MoE', 'Bachelor degree in Engineering or Science', '30 papers - General Aptitude plus subject paper', '2027-02-06', '2026-08-25', '2026-10-05', '', '', 'https://gate.iitk.ac.in/', 0, 'closed'],
        ['UGC NET December 2026', 'National Testing Agency', 'Master degree with 55% marks', 'Paper 1 (General) and Paper 2 (Subject)', '2026-12-06', '2026-10-01', '2026-11-05', '', '', 'https://ugcnet.nta.nic.in/', 1, 'open'],
        ['CSIR NET December 2026', 'National Testing Agency', 'MSc or equivalent in science subjects', 'Life Sciences, Physical Sciences, Chemical Sciences, Mathematical Sciences', '2026-12-15', '2026-10-05', '2026-11-08', '', '', 'https://csirnet.nta.nic.in/', 0, 'open'],
        ['IIT JAM 2027', 'IIT Bombay', 'Bachelor degree in Science', 'Biotechnology, Chemistry, Mathematics, Physics, Geology, Economics', '2027-02-14', '2026-09-10', '2026-10-20', '', '', 'https://jam.iitb.ac.in/', 0, 'closed'],
        ['REET 2027 (Rajasthan Eligibility Examination for Teachers)', 'Board of Secondary Education Rajasthan', 'Senior Secondary with DElEd or BEd', 'Child Development, Language, Mathematics, Environmental Studies', '2027-04-20', '2027-01-10', '2027-02-15', '', '', 'https://rajeduboard.rajasthan.gov.in/', 1, 'upcoming'],
        ['Polytechnic Admission 2027 (Various States)', 'State Technical Education Departments', 'Class 10 passed', 'Merit based on class 10 marks', '2027-07-01', '2027-05-01', '2027-06-15', '', '', 'https://www.aicte-india.org/', 0, 'upcoming']
      ];
      const stmt = db.prepare("INSERT INTO entrance_exams (exam_name, conducting_body, qualification, syllabus, exam_date, application_opening, last_date, admit_card, result, link, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });

  // ---------------------------------------------------------------
  // LATEST UPDATES
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM updates", (err, row) => {
    if (row.count === 0) {
      const list = [
        ['SSC CGL 2026 notification released with 8,148 vacancies', 'Government Job • Today', 'The Staff Selection Commission has released the Combined Graduate Level examination notification for 2026 with 8,148 vacancies across Group B and C posts. Applications close on 18 November 2026.', 'https://ssc.gov.in/', 'job', 1, 1],
        ['Rajasthan Police Constable recruitment 2026 - 3,578 posts', 'State Job • Today', 'Rajasthan Staff Selection Board has invited applications for 3,578 Police Constable posts. 12th pass candidates aged 18-27 years can apply until 8 November 2026.', 'https://rssb.rajasthan.gov.in/', 'job', 1, 1],
        ['IBPS PO XVI application window closing soon', 'Banking • 2 days ago', 'Graduates can apply for 4,455 Probationary Officer posts across public sector banks. The last date to apply is 12 November 2026.', 'https://www.ibps.in/', 'job', 1, 1],
        ['Post Matric Scholarship for SC students 2026-27 now open', 'Scholarship • 3 days ago', 'Applications are invited on the National Scholarship Portal for SC students from class 11 to PhD level. Family income limit is Rs 2.5 lakh per annum. Last date: 30 November 2026.', 'https://scholarships.gov.in/', 'scholarship', 1, 1],
        ['Rajasthan SJE post-matric scholarship extended to 15 December', 'Scholarship • 4 days ago', 'The Social Justice and Empowerment Department, Rajasthan has extended the application deadline for post-matric scholarships to 15 December 2026. Apply through SSO Rajasthan.', 'https://sje.rajasthan.gov.in/', 'scholarship', 0, 1],
        ['PMKVY 4.0 free skill training batches open across India', 'Skills • 5 days ago', 'New short-term training batches under PMKVY 4.0 are available at NSDC training centres. Courses cover IT, healthcare, retail, electrical and manufacturing sectors.', 'https://www.skillindiadigital.gov.in/', 'skill', 0, 1],
        ['PM Internship Scheme opens 1.25 lakh internship seats', 'Internship • 1 week ago', 'Graduates and diploma holders aged 18-24 can apply for 12-month paid internships with a monthly stipend of Rs 5,000 plus a one-time Rs 6,000 grant.', 'https://pminternship.mca.gov.in/', 'internship', 1, 1],
        ['NPTEL January 2027 courses announced', 'Course • 1 week ago', 'NPTEL has announced new certification courses for the January 2027 semester, including AI, machine learning, cybersecurity and data science programmes from IITs and IISc.', 'https://nptel.ac.in/', 'course', 0, 1]
      ];
      const stmt = db.prepare("INSERT INTO updates (title, meta, excerpt, link, type, featured, is_auto) VALUES (?, ?, ?, ?, ?, ?, ?)");
      list.forEach(x => stmt.run(x));
      stmt.finalize();
    }
  });
  // ---------------------------------------------------------------
  // STUDY MATERIAL — official, legally linkable, never hosted here
  // ---------------------------------------------------------------
  db.get("SELECT COUNT(*) as count FROM study_material", (err, row) => {
    if (err || row.count !== 0) return;
    const list = [
      // title, exam, subject, provider, format, language, level, description, link
      ['NCERT textbooks, class 6 to 12 (all subjects)', 'School board / foundation', 'All subjects', 'NCERT', 'PDF', 'English, Hindi, Urdu', 'Beginner',
       'Every NCERT textbook as a free official PDF. The base material for boards, CUET, JEE, NEET and state PSCs.', 'https://ncert.nic.in/textbook.php'],
      ['ePathshala — NCERT e-books and audio', 'School board / foundation', 'All subjects', 'Ministry of Education', 'PDF, Audio', 'English, Hindi', 'Beginner',
       'Official NCERT app and web library with textbooks, audio books and supplementary readers for classes 1 to 12.', 'https://epathshala.nic.in/'],
      ['NROER — National Repository of Open Educational Resources', 'School board / foundation', 'All subjects', 'CIET, NCERT', 'Video, PDF', 'English, Hindi', 'Beginner',
       'Open-licensed videos, documents and interactive resources mapped to the school curriculum.', 'https://nroer.gov.in/'],
      ['SWAYAM — free courses from IITs and central universities', 'Graduate / competitive', 'All subjects', 'Ministry of Education', 'Course, Video', 'English', 'Intermediate',
       'Credit-bearing online courses. Free to learn; an optional proctored exam and certificate carry a fee.', 'https://swayam.gov.in/'],
      ['NPTEL — engineering and science certification', 'GATE / BTech', 'Engineering, Sciences, Management', 'IITs and IISc', 'Course, Video', 'English', 'Intermediate',
       'Semester-length courses with assignments. Free to audit; a paid exam earns an IIT certificate.', 'https://nptel.ac.in/'],
      ['eGyanKosh — IGNOU open courseware', 'Graduate / PG', 'All subjects', 'IGNOU', 'PDF', 'English, Hindi', 'Intermediate',
       'Self-learning material from IGNOU programmes, free to read and download.', 'https://egyankosh.ac.in/'],
      ['SSC CGL syllabus and previous year papers', 'SSC CGL', 'Quantitative Aptitude, Reasoning, English, General Awareness', 'Staff Selection Commission', 'PDF', 'English, Hindi', 'Intermediate',
       'Official notification with the full syllabus, exam pattern and Tier-I / Tier-II structure. Always the master reference.', 'https://ssc.gov.in/'],
      ['SSC official previous year question papers', 'SSC CGL / CHSL / MTS', 'All sections', 'Staff Selection Commission', 'PDF', 'English, Hindi', 'Intermediate',
       'Question papers and answer keys published by SSC itself. No third-party scans.', 'https://ssc.gov.in/'],
      ['IBPS — bank PO and clerk exam resources', 'Banking (IBPS PO / Clerk)', 'Reasoning, Quantitative Aptitude, English, Banking Awareness', 'Institute of Banking Personnel Selection', 'PDF', 'English, Hindi', 'Intermediate',
       'Official notification, syllabus and exam structure for probationary officer and clerk recruitment.', 'https://www.ibps.in/'],
      ['RRB NTPC and Group D notification and syllabus', 'Railway (RRB)', 'Mathematics, General Intelligence, General Awareness', 'Railway Recruitment Board', 'PDF', 'English, Hindi', 'Beginner',
       'Centralised railway recruitment notices, syllabus and CBT structure from the official RRB site.', 'https://indianrailways.gov.in/'],
      ['UPSC Civil Services syllabus and previous papers', 'UPSC CSE', 'Polity, History, Geography, Economy, Ethics, Optional', 'Union Public Service Commission', 'PDF', 'English, Hindi', 'Advanced',
       'Official prelims and mains syllabus, previous year question papers and the annual calendar.', 'https://upsc.gov.in/'],
      ['Rajasthan RPSC syllabus and model papers', 'RPSC / RAS', 'Rajasthan GK, Polity, History, Aptitude', 'Rajasthan Public Service Commission', 'PDF', 'English, Hindi', 'Intermediate',
       'State-specific syllabus, schemes of examination and official papers for RAS and other RPSC posts.', 'https://rpsc.rajasthan.gov.in/'],
      ['Rajasthan RSSC / RSSB previous papers', 'RSSB (patwari, constable, LDC)', 'Rajasthan GK, Maths, Reasoning', 'Rajasthan Staff Selection Board', 'PDF', 'Hindi', 'Beginner',
       'Official syllabus and question papers for Rajasthan subordinate service recruitment.', 'https://rssb.rajasthan.gov.in/'],
      ['NTA — CUET UG and NEET official resources', 'CUET / NEET', 'Language, Domain subjects, General Test, Biology, Physics, Chemistry', 'National Testing Agency', 'PDF', 'English, Hindi', 'Intermediate',
       'Information bulletins, syllabus, mock tests and previous year papers published by NTA.', 'https://nta.ac.in/'],
      ['NIELIT — free digital literacy and IT courses', 'NIELIT / CCC', 'Computer fundamentals, Programming, Cyber security', 'National Institute of Electronics and IT', 'Course', 'English, Hindi', 'Beginner',
       'Government IT certification courses including CCC, O-level and digital literacy programmes.', 'https://www.nielit.gov.in/'],
      ['Skill India Digital — free sector courses', 'Skill certification', 'IT, Healthcare, Retail, Electrical, Manufacturing', 'NSDC / Ministry of Skill Development', 'Course', 'English, Hindi', 'Beginner',
       'Short-term skill courses with NSQF certification, mapped to real job roles.', 'https://www.skillindiadigital.gov.in/'],
      ['SWAYAM Prabha — 24 free education TV channels', 'School / graduate', 'All subjects', 'Ministry of Education', 'Video', 'English, Hindi', 'Beginner',
       'Free DTH and streaming channels covering school, higher education and vocational content — useful on low bandwidth.', 'https://swayamprabha.gov.in/'],
      ['National Digital Library of India', 'Graduate / research', 'All subjects', 'IIT Kharagpur / MoE', 'PDF, Video, Audio', 'Multiple', 'Advanced',
       'Millions of open-access academic papers, books and thesis records from Indian institutions.', 'https://ndl.iitkgp.ac.in/']
    ];
    const stmt = db.prepare(`INSERT INTO study_material
      (title, exam, subject, provider, format, language, level, description, link, verified, last_checked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`);
    list.forEach(x => stmt.run(x));
    stmt.finalize();
    console.log('Seeded study material:', list.length, 'records');
  });
}

seedData();

// ---------------------------------------------------------------------------
// 404 — serve the branded page for any unmatched route (API paths get JSON)
// ---------------------------------------------------------------------------
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Endpoint not found' });
  }
  const notFound = fs.existsSync(path.join(WEB_ROOT, 'pages/404.html'))
    ? path.join(WEB_ROOT, 'pages/404.html')
    : path.join(WEB_ROOT, '404.html');
  res.status(404).sendFile(notFound);
});

app.listen(PORT, () => {
  console.log(`India Student & Career Hub running on http://localhost:${PORT}`);
});

module.exports = app;
