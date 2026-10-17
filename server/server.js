#!/usr/bin/env node
/* SetFlow sync server. One file, no dependencies, Node 18+.

   Accounts: every user has a login and a password. Passwords are stored only as
   scrypt hashes, a login returns a long random session token (stored as a hash).
   Each user has their own state file, so results never mix.

   API  (JSON; all except /health, /api/register and /api/login need
         Authorization: Bearer <session token>):
     POST /api/register   { username, password }   -> { token, username }
     POST /api/login      { username, password }   -> { token, username }
     POST /api/logout                               -> { ok: true }
     GET  /api/me                                   -> { username }
     GET  /api/state                                -> { rev, updatedAt, state }
     PUT  /api/state      { baseRev, state }        -> { rev, updatedAt }
                          409 + current copy when baseRev is stale

   Old setups keep working: the SETFLOW_TOKEN from before is still accepted and
   opens the LEGACY_USER account (default "admin"). The old single file
   state.json is copied into that account the first time the server starts.

   Command line (run on the server, see setflow-user in install.sh):
     node server.js --set-password <username>      create the user or change the password
                                                    (password from SETFLOW_PASSWORD or stdin) */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const LEGACY_TOKEN = process.env.SETFLOW_TOKEN || '';
const LEGACY_USER = (process.env.LEGACY_USER || 'admin').toLowerCase();
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://paulshubko.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);
const KEEP_BACKUPS = parseInt(process.env.KEEP_BACKUPS || '90', 10);
const ALLOW_REGISTER = process.env.ALLOW_REGISTER !== '0';
const MAX_USERS = parseInt(process.env.MAX_USERS || '50', 10);
const SESSION_DAYS = 180;
const MAX_SESSIONS_PER_USER = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const NAME_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/;

const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const USERS_DIR = path.join(DATA_DIR, 'users');
const OLD_STATE_FILE = path.join(DATA_DIR, 'state.json');
fs.mkdirSync(USERS_DIR, { recursive: true });

/* ---------- small helpers ---------- */
function writeAtomic(file, text) {
  const tmp = file + '.tmp-' + process.pid;
  const fd = fs.openSync(tmp, 'w', 0o600);
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function dayStr(d) { return d.toISOString().slice(0, 10); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function scrypt(password, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (e, key) => e ? reject(e) : resolve(key)));
}
function normName(u) { return String(u || '').trim().toLowerCase(); }

/* ---------- accounts ---------- */
let accounts = (function load() {
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; return { users: {}, sessions: {} }; }
})();
function saveAccounts() { writeAtomic(ACCOUNTS_FILE, JSON.stringify(accounts)); }

async function setPassword(username, password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt);
  const prev = accounts.users[username];
  accounts.users[username] = {
    salt: salt.toString('hex'), hash: hash.toString('hex'),
    createdAt: prev ? prev.createdAt : Date.now()
  };
  if (prev) {                       // new password: old sessions stop working
    Object.keys(accounts.sessions).forEach(k => { if (accounts.sessions[k].user === username) delete accounts.sessions[k]; });
  }
  saveAccounts();
}
async function checkPassword(username, password) {
  const u = accounts.users[username];
  /* unknown user: still do the work so timing does not reveal who exists */
  const salt = Buffer.from(u ? u.salt : '00'.repeat(16), 'hex');
  const got = await scrypt(password, salt);
  if (!u) return false;
  const want = Buffer.from(u.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
function newSession(username) {
  const token = 'sf_' + crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const mine = Object.keys(accounts.sessions)
    .filter(k => accounts.sessions[k].user === username)
    .sort((a, b) => accounts.sessions[a].exp - accounts.sessions[b].exp);
  mine.slice(0, Math.max(0, mine.length - (MAX_SESSIONS_PER_USER - 1))).forEach(k => delete accounts.sessions[k]);
  Object.keys(accounts.sessions).forEach(k => { if (accounts.sessions[k].exp < now) delete accounts.sessions[k]; });
  accounts.sessions[sha256(token)] = { user: username, exp: now + SESSION_DAYS * 864e5 };
  saveAccounts();
  return token;
}

/* Who is calling?  -> { username, session } or null */
const legacyBuf = Buffer.from(LEGACY_TOKEN);
function authenticate(header) {
  const m = /^Bearer (.+)$/.exec(header || '');
  if (!m) return null;
  const tok = m[1];
  if (LEGACY_TOKEN.length >= 20) {
    const got = Buffer.from(tok);
    if (got.length === legacyBuf.length && crypto.timingSafeEqual(got, legacyBuf)) return { username: LEGACY_USER, session: null };
  }
  const key = sha256(tok);
  const s = accounts.sessions[key];
  if (!s || s.exp < Date.now() || !accounts.users[s.user]) return null;
  if (s.exp - Date.now() < (SESSION_DAYS / 2) * 864e5) {       // keep active sessions alive
    s.exp = Date.now() + SESSION_DAYS * 864e5; saveAccounts();
  }
  return { username: s.user, session: key };
}

/* ---------- brakes against guessing ---------- */
const WINDOW = 15 * 60 * 1000;
const failsByUser = new Map();     // username -> [timestamps]
let failsAll = [], registers = [];
function recent(list) { const now = Date.now(); return list.filter(t => now - t < WINDOW); }
function userLocked(u) { const l = recent(failsByUser.get(u) || []); failsByUser.set(u, l); return l.length >= 8; }
function noteFail(u) { const l = recent(failsByUser.get(u) || []); l.push(Date.now()); failsByUser.set(u, l); failsAll = recent(failsAll); failsAll.push(Date.now()); }
function allLocked() { failsAll = recent(failsAll); return failsAll.length >= 80; }
function registerLocked() { const now = Date.now(); registers = registers.filter(t => now - t < 3600e3); return registers.length >= 10; }
setInterval(() => { for (const [k, v] of failsByUser) if (!recent(v).length) failsByUser.delete(k); }, 10 * 60 * 1000).unref();

/* ---------- per-user state ---------- */
function userDir(u) { return path.join(USERS_DIR, u); }
function stateFile(u) { return path.join(userDir(u), 'state.json'); }
function backupDir(u) { return path.join(userDir(u), 'backups'); }
function readStore(u) {
  try { return JSON.parse(fs.readFileSync(stateFile(u), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { rev: 0, updatedAt: 0, state: null }; throw e; }
}
function dailyBackup(u) {
  const file = stateFile(u);
  if (!fs.existsSync(file)) return;
  const dir = backupDir(u);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `state-${dayStr(new Date())}.json`);
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
  const files = fs.readdirSync(dir).filter(f => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))
    .forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} });
}
/* Old single-user file -> LEGACY_USER (copy, the original stays as a backup) */
function migrateOld() {
  if (!fs.existsSync(OLD_STATE_FILE) || fs.existsSync(stateFile(LEGACY_USER))) return;
  fs.mkdirSync(userDir(LEGACY_USER), { recursive: true });
  fs.copyFileSync(OLD_STATE_FILE, stateFile(LEGACY_USER));
  const oldBackups = path.join(DATA_DIR, 'backups');
  if (fs.existsSync(oldBackups)) {
    fs.mkdirSync(backupDir(LEGACY_USER), { recursive: true });
    fs.readdirSync(oldBackups).forEach(f => {
      try { fs.copyFileSync(path.join(oldBackups, f), path.join(backupDir(LEGACY_USER), f)); } catch (e) {}
    });
  }
  console.log(`Moved old state.json into the "${LEGACY_USER}" account`);
}
function validState(s) {
  return s && typeof s === 'object' && !Array.isArray(s) &&
    s.history && typeof s.history === 'object' &&
    s.weights && typeof s.weights === 'object';
}

/* ---------- http helpers ---------- */
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req, res, limit) {
  try { return JSON.parse(await readBody(req, limit)); }
  catch (e) {
    send(res, e.code === 413 ? 413 : 400, { error: e.code === 413 ? 'too large' : 'bad json' });
    return undefined;
  }
}
function credentials(body) {
  const username = normName(body && body.username);
  const password = body && typeof body.password === 'string' ? body.password : '';
  return { username, password };
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/health') return send(res, 200, { ok: true });

    if (url.pathname === '/api/register' && req.method === 'POST') {
      if (!ALLOW_REGISTER) return send(res, 403, { error: 'registration is closed' });
      if (registerLocked()) return send(res, 429, { error: 'too many registrations, try later' });
      const body = await readJson(req, res, 4096); if (body === undefined) return;
      const { username, password } = credentials(body);
      if (!NAME_RE.test(username)) return send(res, 400, { error: 'bad username' });
      if (password.length < 8 || password.length > 200) return send(res, 400, { error: 'bad password' });
      /* the owner account is created only from the command line, never through open registration */
      if (accounts.users[username] || username === LEGACY_USER) return send(res, 409, { error: 'username taken' });
      if (Object.keys(accounts.users).length >= MAX_USERS) return send(res, 403, { error: 'user limit reached' });
      registers.push(Date.now());
      await setPassword(username, password);
      return send(res, 200, { token: newSession(username), username });
    }

    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await readJson(req, res, 4096); if (body === undefined) return;
      const { username, password } = credentials(body);
      if (allLocked() || userLocked(username)) return send(res, 429, { error: 'too many failed attempts, try later' });
      if (!(await checkPassword(username, password))) {
        noteFail(username);
        return send(res, 401, { error: 'wrong login or password' });
      }
      failsByUser.delete(username);
      return send(res, 200, { token: newSession(username), username });
    }

    if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });

    const who = authenticate(req.headers.authorization);
    if (!who) {
      if (allLocked()) return send(res, 429, { error: 'too many failed attempts, try later' });
      failsAll.push(Date.now());
      return send(res, 401, { error: 'unauthorized' });
    }

    if (url.pathname === '/api/me' && req.method === 'GET') return send(res, 200, { username: who.username });

    if (url.pathname === '/api/logout' && req.method === 'POST') {
      if (who.session) { delete accounts.sessions[who.session]; saveAccounts(); }
      return send(res, 200, { ok: true });
    }

    if (url.pathname !== '/api/state') return send(res, 404, { error: 'not found' });

    if (req.method === 'GET') return send(res, 200, readStore(who.username));

    if (req.method === 'PUT') {
      const body = await readJson(req, res, MAX_BYTES); if (body === undefined) return;
      if (!body || !validState(body.state)) return send(res, 400, { error: 'bad state' });
      const cur = readStore(who.username);
      if (typeof body.baseRev !== 'number' || body.baseRev !== cur.rev) {
        return send(res, 409, Object.assign({ error: 'stale rev' }, cur));
      }
      fs.mkdirSync(userDir(who.username), { recursive: true });
      dailyBackup(who.username);
      const next = { rev: cur.rev + 1, updatedAt: Date.now(), state: body.state };
      writeAtomic(stateFile(who.username), JSON.stringify(next));
      return send(res, 200, { rev: next.rev, updatedAt: next.updatedAt });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server error' });
  }
});
server.requestTimeout = 15000;

/* ---------- start ---------- */
async function cli() {
  const i = process.argv.indexOf('--set-password');
  if (i < 0) return false;
  const username = normName(process.argv[i + 1]);
  if (!NAME_RE.test(username)) { console.error('Username: 3-32 chars, a-z 0-9 _ -'); process.exit(1); }
  let password = process.env.SETFLOW_PASSWORD;
  if (!password) {
    password = await new Promise(r => { let s = ''; process.stdin.on('data', d => s += d).on('end', () => r(s.replace(/\r?\n$/, ''))); });
  }
  if (!password || password.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }
  const existed = !!accounts.users[username];
  await setPassword(username, password);
  console.log(`${existed ? 'Password changed' : 'Account created'}: ${username}`);
  return true;
}

(async () => {
  if (await cli()) return;
  if (LEGACY_TOKEN && LEGACY_TOKEN.length < 20) {
    console.error('SETFLOW_TOKEN is too short (min 20 chars). Remove it or use a longer one.');
    process.exit(1);
  }
  migrateOld();
  server.listen(PORT, HOST, () => console.log(`SetFlow sync listening on ${HOST}:${PORT}, data in ${DATA_DIR}, users: ${Object.keys(accounts.users).length}`));
})();
