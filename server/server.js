#!/usr/bin/env node
/* SetFlow sync server. One file, no dependencies, Node 18+.

   API (all except /health need  Authorization: Bearer <token>):
     GET  /api/state            -> { rev, updatedAt, state }
     PUT  /api/state            body { baseRev, state } -> { rev, updatedAt }
                                409 + current copy when baseRev is stale
   The app merges on the client, the server only stores the latest copy,
   guards against concurrent writes (rev) and keeps daily backups. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const TOKEN = process.env.SETFLOW_TOKEN || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://paulshubko.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);
const KEEP_BACKUPS = parseInt(process.env.KEEP_BACKUPS || '90', 10);
const MAX_BYTES = 5 * 1024 * 1024;

if (TOKEN.length < 20) {
  console.error('SETFLOW_TOKEN is missing or too short (min 20 chars). Refusing to start.');
  process.exit(1);
}

const STATE_FILE = path.join(DATA_DIR, 'state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

/* ---------- storage ---------- */
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return { rev: 0, updatedAt: 0, state: null };
    throw e;
  }
}
function writeAtomic(file, text) {
  const tmp = file + '.tmp-' + process.pid;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function dayStr(d) { return d.toISOString().slice(0, 10); }

/* First write of the day: copy what is on disk before overwriting it.
   Old backups beyond KEEP_BACKUPS days are removed. */
function dailyBackup() {
  if (!fs.existsSync(STATE_FILE)) return;
  const target = path.join(BACKUP_DIR, `state-${dayStr(new Date())}.json`);
  if (!fs.existsSync(target)) fs.copyFileSync(STATE_FILE, target);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))
    .forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {} });
}

/* ---------- auth ---------- */
const tokenBuf = Buffer.from(TOKEN);
function tokenOk(header) {
  const m = /^Bearer (.+)$/.exec(header || '');
  if (!m) return false;
  const got = Buffer.from(m[1]);
  return got.length === tokenBuf.length && crypto.timingSafeEqual(got, tokenBuf);
}
/* Global brake against token guessing (the public URL is reachable by anyone) */
let fails = [];
function locked() {
  const now = Date.now();
  fails = fails.filter(t => now - t < 10 * 60 * 1000);
  return fails.length >= 20;
}

/* ---------- helpers ---------- */
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BYTES) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function validState(s) {
  return s && typeof s === 'object' && !Array.isArray(s) &&
    s.history && typeof s.history === 'object' &&
    s.weights && typeof s.weights === 'object';
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname !== '/api/state') return send(res, 404, { error: 'not found' });

    /* A correct token always works; only wrong guesses are throttled,
       so a scanner cannot lock the owner out. */
    if (!tokenOk(req.headers.authorization)) {
      if (locked()) return send(res, 429, { error: 'too many failed attempts, try later' });
      fails.push(Date.now());
      return send(res, 401, { error: 'unauthorized' });
    }

    if (req.method === 'GET') return send(res, 200, readStore());

    if (req.method === 'PUT') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) {
        if (e.code === 413) return send(res, 413, { error: 'too large' });
        return send(res, 400, { error: 'bad json' });
      }
      if (!body || !validState(body.state)) return send(res, 400, { error: 'bad state' });
      const cur = readStore();
      if (typeof body.baseRev !== 'number' || body.baseRev !== cur.rev) {
        return send(res, 409, Object.assign({ error: 'stale rev' }, cur));
      }
      dailyBackup();
      const next = { rev: cur.rev + 1, updatedAt: Date.now(), state: body.state };
      writeAtomic(STATE_FILE, JSON.stringify(next));
      return send(res, 200, { rev: next.rev, updatedAt: next.updatedAt });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server error' });
  }
});
server.requestTimeout = 15000;
server.listen(PORT, HOST, () => console.log(`SetFlow sync listening on ${HOST}:${PORT}, data in ${DATA_DIR}`));
