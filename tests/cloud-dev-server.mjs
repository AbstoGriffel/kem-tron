/**
 * Server thử cục bộ giống Vercel: phục vụ dist/ + POST /api/cloud nối Postgres thường (thay Neon).
 *   PG_URL=postgres://postgres:kt@127.0.0.1:55432/postgres PORT=5190 node tests/cloud-dev-server.mjs
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import pg from 'pg';
import { makeStore } from '../api/_store.js';

const root = new URL('../dist/', import.meta.url).pathname;
const pool = new pg.Pool({ connectionString: process.env.PG_URL || 'postgres://postgres:kt@127.0.0.1:55432/postgres' });
const run = makeStore(async (t, p) => (await pool.query(t, p)).rows);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/cloud') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    let raw = '';
    for await (const c of req) raw += c;
    let body = null;
    try { body = JSON.parse(raw); } catch { /* */ }
    const out = await run(body, req.socket.remoteAddress);
    res.writeHead(out.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(out.body));
  }
  const path = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(Number(process.env.PORT || 5190), () => console.log('cloud dev server on', process.env.PORT || 5190));
