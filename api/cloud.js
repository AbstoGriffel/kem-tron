import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';

let client, ready;
const allowedEvents = new Set(['cloud_enabled','session_start','session_end','game_started','day_completed','customer_served','mix_failed','game_finished']);
const reply = (res, status, value) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(value);
};
async function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!client) client = neon(url);
  if (!ready) {
    ready = (async () => {
      await client.query('CREATE TABLE IF NOT EXISTS kem_tron_players (player_id TEXT PRIMARY KEY, state JSONB NOT NULL, client_updated_ms BIGINT NOT NULL, day INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      await client.query('CREATE TABLE IF NOT EXISTS kem_tron_events (player_id TEXT NOT NULL, event_id TEXT NOT NULL, event_name TEXT NOT NULL, day INTEGER, event_value INTEGER, occurred_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (player_id,event_id))');
      await client.query('CREATE INDEX IF NOT EXISTS kem_tron_events_day_idx ON kem_tron_events (event_name,occurred_at DESC)');
    })().catch(e => { ready = null; throw e; });
  }
  await ready;
  return client;
}
export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return reply(res, 405, { error:'METHOD_NOT_ALLOWED' });
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  if (!/^kt1_[A-Za-z0-9_-]{43}$/.test(token || '')) return reply(res, 401, { error:'INVALID_KEY' });
  if (Number(req.headers['content-length'] || 0) > 128000) return reply(res, 413, { error:'SAVE_TOO_LARGE' });
  const player = createHash('sha256').update(token).digest('hex');
  let sql;
  try { sql = await db(); }
  catch (err) { console.error('DB setup failed', err?.message); return reply(res, 503, { error:'DATABASE_UNAVAILABLE' }); }
  if (!sql) return reply(res, 503, { error:'CLOUD_NOT_CONFIGURED' });
  try {
    if (req.method === 'GET') {
      const [p] = await sql.query('SELECT state,client_updated_ms FROM kem_tron_players WHERE player_id=$1 LIMIT 1',[player]);
      return p ? reply(res,200,{state:p.state,updatedAt:Number(p.client_updated_ms)}) : reply(res,404,{error:'SAVE_NOT_FOUND'});
    }
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const state = b?.state, ms = b?.updatedAt, events = b?.events || [];
    if (!state || state.v !== 1 || !Number.isInteger(state.day) || state.day < 1 || state.day > 100 ||
        !Number.isSafeInteger(ms) || ms < 1700000000000 || ms > Date.now()+600000 ||
        !Array.isArray(events) || events.length > 30) return reply(res,400,{error:'INVALID_SAVE'});
    const json = JSON.stringify(state);
    if (Buffer.byteLength(json,'utf8') > 120000) return reply(res,413,{error:'SAVE_TOO_LARGE'});
    const updated = await sql.query(
      'INSERT INTO kem_tron_players (player_id,state,client_updated_ms,day) VALUES ($1,$2::jsonb,$3,$4) ON CONFLICT (player_id) DO UPDATE SET state=EXCLUDED.state,client_updated_ms=EXCLUDED.client_updated_ms,day=EXCLUDED.day,updated_at=NOW() WHERE kem_tron_players.client_updated_ms <= EXCLUDED.client_updated_ms RETURNING player_id',
      [player,json,ms,state.day]);
    if (!updated.length) return reply(res,409,{error:'CLOUD_HAS_NEWER_SAVE'});
    for (const e of events) {
      if (!e || !allowedEvents.has(e.name) || !/^[0-9a-f-]{36}$/.test(e.id || '') ||
          !Number.isSafeInteger(e.at) || e.at < 1700000000000 || e.at > Date.now()+600000) continue;
      await sql.query('INSERT INTO kem_tron_events (player_id,event_id,event_name,day,event_value,occurred_at) VALUES ($1,$2,$3,$4,$5,$6::timestamptz) ON CONFLICT DO NOTHING',
        [player,e.id,e.name,Number.isInteger(e.day) ? Math.max(1,Math.min(100,e.day)) : null,
          Number.isInteger(e.value) ? Math.max(0,Math.min(100000,e.value)) : null,new Date(e.at).toISOString()]);
    }
    return reply(res,200,{ok:true,updatedAt:ms});
  } catch (err) {
    console.error('Save API failed',err?.message);
    return reply(res,500,{error:'CLOUD_API_ERROR'});
  }
}
