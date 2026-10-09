import { neon } from '@neondatabase/serverless';
import { makeStore } from './_store.js';

/** POST /api/cloud — body JSON { op: create|peek|restore|save|remove, code?, device, state?, rev? }. Xem api/_store.js. */
let run = null;

/** DATABASE_URL / POSTGRES_URL, hoặc biến có tiền tố riêng (tích hợp Neon trên Vercel cho đặt prefix, vd KEMTRON_DATABASE_URL). */
function dbUrl() {
  const env = process.env;
  if (env.DATABASE_URL || env.POSTGRES_URL) return env.DATABASE_URL || env.POSTGRES_URL;
  const k = Object.keys(env).find((x) => /(^|_)DATABASE_URL$/.test(x)) || Object.keys(env).find((x) => /(^|_)POSTGRES_URL$/.test(x));
  return k ? env[k] : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (Number(req.headers['content-length'] || 0) > 130_000) return res.status(413).json({ ok: false, error: 'SAVE_TOO_LARGE' });
  const url = dbUrl();
  if (!url) return res.status(503).json({ ok: false, error: 'CLOUD_NOT_CONFIGURED' });
  if (!run) {
    const sql = neon(url);
    run = makeStore((text, params) => sql.query(text, params));
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const out = await run(body, ip);
  return res.status(out.status).json(out.body);
}
