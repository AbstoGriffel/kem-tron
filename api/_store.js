/**
 * Logic lưu lên mây — tách khỏi driver DB để test được bằng Postgres thường (api/cloud.test.mjs).
 * Vercel bỏ qua file bắt đầu bằng "_" trong api/ (không thành route).
 *
 * Chống spam DB:
 *  - Mã do SERVER cấp (client không tự bịa mã để tạo dòng mới). Lưu chỉ được GHI ĐÈ dòng đã có.
 *  - Mỗi máy (device id ngẫu nhiên trong localStorage) gắn đúng 1 mã. Máy đã có mã thì không xin được mã thứ 2.
 *  - Mỗi mã gắn tối đa MAX_DEVICES máy; gắn máy mới thì máy cũ nhất bị gỡ.
 *  - Giới hạn theo IP: xin mã mới, nhập sai mã. Trần tổng số mã mới mỗi ngày (bảo vệ gói Neon miễn phí).
 *  - Một mã chỉ được ghi 1 lần mỗi SAVE_GAP_S giây; bản lưu trùng nội dung thì không ghi.
 *  - Xung đột nhiều máy: số phiên bản `rev` do server tăng, ghi phải khớp `rev` đang có (không dựa đồng hồ máy).
 */
import { createHash, randomBytes } from 'node:crypto';

export const LIMITS = {
  MAX_STATE_BYTES: 120_000,
  MAX_DEVICES: 5,
  SAVE_GAP_S: 15,
  CREATE_PER_IP_HOUR: 10,
  MISS_PER_IP_HOUR: 30,
  CREATE_PER_DAY: 2000,
  STALE_DAYS: 180,
};

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kem_tron_saves (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    state_hash TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 1,
    day INTEGER NOT NULL,
    money INTEGER NOT NULL DEFAULT 0,
    ended TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS kem_tron_devices (
    device TEXT PRIMARY KEY,
    save_id TEXT NOT NULL REFERENCES kem_tron_saves(id) ON DELETE CASCADE,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS kem_tron_devices_save_idx ON kem_tron_devices (save_id, bound_at)`,
  `CREATE TABLE IF NOT EXISTS kem_tron_limits (
    bucket TEXT PRIMARY KEY,
    n INTEGER NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL)`,
];

/** Bảng chữ Crockford base32 (không có I, L, O, U — khỏi đọc nhầm khi gõ tay). */
const ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newCode() {
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += ABC[b[i] & 31];
  return s; // 60 bit
}
/** Chuẩn hoá mã người dùng gõ: bỏ gạch/khoảng trắng, O→0, I/L→1. */
export function normCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(s) ? s : null;
}
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const DEVICE_RE = /^[A-Za-z0-9_-]{22}$/;

class Fail extends Error {
  constructor(status, error, extra) { super(error); this.status = status; this.extra = extra; }
}
const fail = (status, error, extra) => { throw new Fail(status, error, extra); };

/** Kiểm tra SaveState v1 tối thiểu + rút vài cột tóm tắt. */
function checkState(state) {
  if (!state || typeof state !== 'object' || state.v !== 1 || !Number.isInteger(state.day) || state.day < 1 || state.day > 100) fail(400, 'INVALID_SAVE');
  const json = JSON.stringify(state);
  if (Buffer.byteLength(json, 'utf8') > LIMITS.MAX_STATE_BYTES) fail(413, 'SAVE_TOO_LARGE');
  const money = Number.isFinite(state.money) ? Math.max(-1e9, Math.min(1e9, Math.round(state.money))) : 0;
  const ended = typeof state.ended === 'string' ? state.ended.slice(0, 20) : null;
  return { json, hash: sha(json), day: state.day, money, ended };
}

/**
 * @param q (text, params) => Promise<rows[]>
 */
export function makeStore(q) {
  let ready = null;
  const init = () => {
    if (!ready) ready = (async () => { for (const s of SCHEMA) await q(s, []); })().catch((e) => { ready = null; throw e; });
    return ready;
  };

  /** Tăng bộ đếm `bucket`, trả về số lần trong cửa sổ hiện tại. */
  async function hit(bucket, seconds) {
    const [r] = await q(
      `INSERT INTO kem_tron_limits (bucket, n, reset_at) VALUES ($1, 1, NOW() + make_interval(secs => $2))
       ON CONFLICT (bucket) DO UPDATE SET
         n = CASE WHEN kem_tron_limits.reset_at < NOW() THEN 1 ELSE kem_tron_limits.n + 1 END,
         reset_at = CASE WHEN kem_tron_limits.reset_at < NOW() THEN EXCLUDED.reset_at ELSE kem_tron_limits.reset_at END
       RETURNING n`, [bucket, seconds]);
    return Number(r.n);
  }
  async function peekLimit(bucket) {
    const [r] = await q('SELECT n FROM kem_tron_limits WHERE bucket=$1 AND reset_at > NOW()', [bucket]);
    return r ? Number(r.n) : 0;
  }

  async function findSave(code) {
    const id = sha(code);
    const [s] = await q('SELECT id, state, rev, day, money, ended, updated_at FROM kem_tron_saves WHERE id=$1', [id]);
    return s || null;
  }
  const summary = (s) => ({ rev: Number(s.rev), day: Number(s.day), money: Number(s.money), ended: s.ended, savedAt: new Date(s.updated_at).getTime() });

  /** Mã sai → đếm theo IP để chặn dò mã. */
  async function needSave(code, ipH) {
    if (await peekLimit(`miss:${ipH}`) >= LIMITS.MISS_PER_IP_HOUR) fail(429, 'TOO_MANY_TRIES');
    const s = await findSave(code);
    if (!s) { await hit(`miss:${ipH}`, 3600); fail(404, 'CODE_NOT_FOUND'); }
    return s;
  }

  /** Gắn máy vào mã (gỡ khỏi mã cũ nếu có), giữ tối đa MAX_DEVICES máy mỗi mã. */
  async function bind(saveId, devH) {
    await q(`INSERT INTO kem_tron_devices (device, save_id) VALUES ($1, $2)
             ON CONFLICT (device) DO UPDATE SET save_id = EXCLUDED.save_id, bound_at = NOW()`, [devH, saveId]);
    await q(`DELETE FROM kem_tron_devices WHERE save_id = $1 AND device IN (
               SELECT device FROM kem_tron_devices WHERE save_id = $1 ORDER BY bound_at DESC, device OFFSET $2)`, [saveId, LIMITS.MAX_DEVICES]);
  }

  const ops = {
    /** Xin mã mới kèm bản lưu đầu tiên. Máy đã có mã → 409, trả lại ngày của bản đang gắn. */
    async create({ device, state, ip }) {
      const devH = sha(device), ipH = sha(ip).slice(0, 32);
      const st = checkState(state);
      const [bound] = await q(`SELECT s.day FROM kem_tron_devices d JOIN kem_tron_saves s ON s.id = d.save_id WHERE d.device=$1`, [devH]);
      if (bound) fail(409, 'DEVICE_HAS_CODE', { day: Number(bound.day) });
      if (await hit(`create:${ipH}`, 3600) > LIMITS.CREATE_PER_IP_HOUR) fail(429, 'TOO_MANY_CODES');
      if (await hit('create:all', 86400) > LIMITS.CREATE_PER_DAY) fail(503, 'CLOUD_FULL_TODAY');
      let code, row;
      for (let i = 0; i < 3 && !row; i++) {
        code = newCode();
        [row] = await q(
          `INSERT INTO kem_tron_saves (id, state, state_hash, day, money, ended) VALUES ($1, $2::jsonb, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING RETURNING rev, day, money, ended, updated_at`,
          [sha(code), st.json, st.hash, st.day, st.money, st.ended]);
      }
      if (!row) fail(500, 'CODE_COLLISION');
      await bind(sha(code), devH);
      // dọn rác thỉnh thoảng (chỉ khi có mã mới): bộ đếm hết hạn + bản lưu bỏ hoang lâu
      await q(`DELETE FROM kem_tron_limits WHERE reset_at < NOW() - INTERVAL '1 day'`, []);
      // Do NOT silently delete old player saves based on inactivity. A future retention policy needs player-facing disclosure.
      return { code, ...summary(row) };
    },

    /** Xem trước bản trên mây (trước khi khôi phục). Không gắn máy. */
    async peek({ code, ip }) {
      const s = await needSave(code, sha(ip).slice(0, 32));
      return summary(s);
    },

    /** Khôi phục: gắn máy này vào mã + trả bản lưu đầy đủ. */
    async restore({ code, device, ip }) {
      const s = await needSave(code, sha(ip).slice(0, 32));
      await bind(s.id, sha(device));
      return { ...summary(s), state: s.state };
    },

    /** Ghi đè bản lưu. `rev` = phiên bản máy này đang dựa vào. */
    async save({ code, device, state, rev }) {
      const st = checkState(state);
      if (!Number.isInteger(rev) || rev < 1) fail(400, 'INVALID_REV');
      const id = sha(code), devH = sha(device);
      const [row] = await q(
        `UPDATE kem_tron_saves s SET state=$2::jsonb, state_hash=$3, day=$4, money=$5, ended=$6, rev=s.rev+1, updated_at=NOW()
         WHERE s.id=$1 AND s.rev=$7 AND s.state_hash <> $3
           AND s.updated_at < NOW() - make_interval(secs => $8)
           AND EXISTS (SELECT 1 FROM kem_tron_devices d WHERE d.device=$9 AND d.save_id=s.id)
         RETURNING rev, day, money, ended, updated_at`,
        [id, st.json, st.hash, st.day, st.money, st.ended, rev, LIMITS.SAVE_GAP_S, devH]);
      if (row) return summary(row);
      // không ghi được → tìm lý do
      const [s] = await q(
        `SELECT s.rev, s.day, s.money, s.ended, s.updated_at, s.state_hash,
                EXISTS (SELECT 1 FROM kem_tron_devices d WHERE d.device=$2 AND d.save_id=s.id) AS bound,
                s.updated_at >= NOW() - make_interval(secs => $3) AS recent
         FROM kem_tron_saves s WHERE s.id=$1`, [id, devH, LIMITS.SAVE_GAP_S]);
      if (!s) fail(404, 'CODE_NOT_FOUND');
      if (!s.bound) fail(403, 'DEVICE_NOT_BOUND');
      if (Number(s.rev) !== rev) fail(409, 'CLOUD_HAS_NEWER_SAVE', summary(s));
      if (s.state_hash === st.hash) return { ...summary(s), unchanged: true };
      fail(429, 'SAVE_TOO_SOON', { retryIn: LIMITS.SAVE_GAP_S });
    },

    /** Xoá bản trên mây (mọi máy đang gắn mã này cũng mất liên kết). Chỉ máy đang gắn mới được xoá. */
    async remove({ code, device }) {
      const [r] = await q(
        `DELETE FROM kem_tron_saves s WHERE s.id=$1
           AND EXISTS (SELECT 1 FROM kem_tron_devices d WHERE d.device=$2 AND d.save_id=s.id) RETURNING s.id`,
        [sha(code), sha(device)]);
      if (!r) fail(403, 'DEVICE_NOT_BOUND');
      return { ok: true };
    },
  };

  /** Điểm vào chung: body = { op, code?, device, state?, rev? } — trả { status, body }. */
  return async function run(body, ip) {
    try {
      const op = body?.op;
      if (!['create', 'peek', 'restore', 'save', 'remove'].includes(op)) fail(400, 'UNKNOWN_OP');
      const device = String(body.device || '');
      if (op !== 'peek' && !DEVICE_RE.test(device)) fail(400, 'INVALID_DEVICE');
      let code = null;
      if (op !== 'create') { code = normCode(body.code); if (!code) fail(400, 'INVALID_CODE'); }
      await init();
      const out = await ops[op]({ code, device, state: body.state, rev: body.rev, ip: ip || 'unknown' });
      return { status: 200, body: { ok: true, ...(code ? { code } : {}), ...out } };
    } catch (e) {
      if (e instanceof Fail) return { status: e.status, body: { ok: false, error: e.message, ...(e.extra || {}) } };
      console.error('cloud store error', e?.message);
      return { status: 500, body: { ok: false, error: 'CLOUD_API_ERROR' } };
    }
  };
}
