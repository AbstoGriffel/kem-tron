/**
 * Test logic lưu lên mây với Postgres thật (không cần Neon):
 *   docker run -d --rm --name kt-pg -e POSTGRES_PASSWORD=kt -p 127.0.0.1:55432:5432 postgres:16-alpine
 *   PG_URL=postgres://postgres:kt@127.0.0.1:55432/postgres npm run test:cloud
 */
import pg from 'pg';
import assert from 'node:assert/strict';
import { makeStore, LIMITS, normCode } from '../api/_store.js';

const url = process.env.PG_URL || 'postgres://postgres:kt@127.0.0.1:55432/postgres';
// These tests DROP the test tables. Never run them against a remote/production database.
const hostname = new URL(url).hostname;
if (!['localhost','127.0.0.1','::1'].includes(hostname)) throw new Error('Refusing destructive cloud tests against non-local database');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP TABLE IF EXISTS kem_tron_devices, kem_tron_saves, kem_tron_limits');
const run = makeStore(async (t, p) => (await client.query(t, p)).rows);
const ago = (s) => client.query(`UPDATE kem_tron_saves SET updated_at = NOW() - make_interval(secs => $1)`, [s]);

const dev = (n) => String(n).padStart(22, 'd');
const st = (day, money = 100) => ({ v: 1, day, money, stock: { a: 1 } });
let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log('ok -', name); };

let A; // mã của máy 1
await t('xin mã mới', async () => {
  const r = await run({ op: 'create', device: dev(1), state: st(1) }, '1.1.1.1');
  assert.equal(r.status, 200); assert.match(r.body.code, /^[0-9A-Z]{12}$/); assert.equal(r.body.rev, 1);
  A = r.body.code;
});
await t('mỗi máy chỉ 1 mã: xin lần 2 bị 409, không tạo dòng mới', async () => {
  const r = await run({ op: 'create', device: dev(1), state: st(2) }, '1.1.1.1');
  assert.equal(r.status, 409); assert.equal(r.body.error, 'DEVICE_HAS_CODE'); assert.equal(r.body.day, 1);
  const { rows } = await client.query('SELECT count(*)::int n FROM kem_tron_saves');
  assert.equal(rows[0].n, 1);
});
await t('mã gõ tay có gạch, chữ thường, O/I vẫn nhận', async () => {
  assert.equal(normCode(A.slice(0, 4).toLowerCase() + '-' + A.slice(4, 8) + ' ' + A.slice(8)), A);
  assert.equal(normCode('0000-1111-2222'.replace(/0/g, 'o').replace(/1/g, 'l')), '000011112222');
  assert.equal(normCode('abc'), null);
});
await t('lưu ngay sau khi tạo → 429 (giãn cách ghi)', async () => {
  const r = await run({ op: 'save', code: A, device: dev(1), state: st(2), rev: 1 }, '1.1.1.1');
  assert.equal(r.status, 429); assert.equal(r.body.error, 'SAVE_TOO_SOON');
});
await t('lưu sau khoảng giãn → rev 2', async () => {
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r = await run({ op: 'save', code: A, device: dev(1), state: st(2), rev: 1 }, '1.1.1.1');
  assert.equal(r.status, 200); assert.equal(r.body.rev, 2); assert.equal(r.body.day, 2);
});
await t('lưu trùng nội dung → không ghi, không tăng rev', async () => {
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r = await run({ op: 'save', code: A, device: dev(1), state: st(2), rev: 2 }, '1.1.1.1');
  assert.equal(r.status, 200); assert.equal(r.body.unchanged, true); assert.equal(r.body.rev, 2);
});
await t('máy lạ cầm mã nhưng chưa khôi phục thì không ghi được', async () => {
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r = await run({ op: 'save', code: A, device: dev(9), state: st(9), rev: 2 }, '9.9.9.9');
  assert.equal(r.status, 403); assert.equal(r.body.error, 'DEVICE_NOT_BOUND');
});
await t('mã không tồn tại không tạo dòng (chặn bịa mã)', async () => {
  const r = await run({ op: 'save', code: '000000000000', device: dev(1), state: st(3), rev: 1 }, '1.1.1.1');
  assert.equal(r.status, 404);
  const { rows } = await client.query('SELECT count(*)::int n FROM kem_tron_saves');
  assert.equal(rows[0].n, 1);
});
await t('máy 2 xem trước rồi khôi phục → nhận đúng bản, được gắn', async () => {
  const p = await run({ op: 'peek', code: A }, '2.2.2.2');
  assert.equal(p.status, 200); assert.equal(p.body.day, 2); assert.equal(p.body.state, undefined);
  const r = await run({ op: 'restore', code: A, device: dev(2) }, '2.2.2.2');
  assert.equal(r.status, 200); assert.deepEqual(r.body.state, st(2)); assert.equal(r.body.rev, 2);
});
await t('2 máy cùng ghi: máy sau dựa rev cũ → 409 kèm tóm tắt bản mới', async () => {
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r2 = await run({ op: 'save', code: A, device: dev(2), state: st(3), rev: 2 }, '2.2.2.2');
  assert.equal(r2.status, 200); assert.equal(r2.body.rev, 3);
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r1 = await run({ op: 'save', code: A, device: dev(1), state: st(4), rev: 2 }, '1.1.1.1');
  assert.equal(r1.status, 409); assert.equal(r1.body.rev, 3); assert.equal(r1.body.day, 3);
  // máy 1 chọn "giữ bản máy này" → ghi lại với rev mới nhất
  const r1b = await run({ op: 'save', code: A, device: dev(1), state: st(4), rev: 3 }, '1.1.1.1');
  assert.equal(r1b.status, 200); assert.equal(r1b.body.rev, 4);
});
await t('khôi phục mã khác → máy chuyển sang mã đó (vẫn 1 máy 1 mã)', async () => {
  const B = (await run({ op: 'create', device: dev(3), state: st(5) }, '3.3.3.3')).body.code;
  await run({ op: 'restore', code: B, device: dev(2) }, '2.2.2.2');
  const { rows } = await client.query('SELECT count(*)::int n FROM kem_tron_devices WHERE device IN (SELECT device FROM kem_tron_devices) GROUP BY device HAVING count(*) > 1');
  assert.equal(rows.length, 0);
  await ago(LIMITS.SAVE_GAP_S + 1);
  const r = await run({ op: 'save', code: A, device: dev(2), state: st(6), rev: 4 }, '2.2.2.2');
  assert.equal(r.status, 403);
});
await t(`mỗi mã tối đa ${LIMITS.MAX_DEVICES} máy, máy cũ nhất bị gỡ`, async () => {
  for (let i = 10; i < 17; i++) {
    await run({ op: 'restore', code: A, device: dev(i) }, '4.4.4.4');
    await client.query(`UPDATE kem_tron_devices SET bound_at = bound_at - INTERVAL '1 second'`);
  }
  const { rows } = await client.query('SELECT count(*)::int n FROM kem_tron_devices d JOIN kem_tron_saves s ON s.id=d.save_id WHERE s.state->>\'day\' = \'4\'');
  assert.equal(rows[0].n, LIMITS.MAX_DEVICES);
});
await t(`1 IP xin quá ${LIMITS.CREATE_PER_IP_HOUR} mã/giờ → 429`, async () => {
  let last;
  for (let i = 0; i < LIMITS.CREATE_PER_IP_HOUR + 1; i++) last = await run({ op: 'create', device: dev(100 + i), state: st(1) }, '5.5.5.5');
  assert.equal(last.status, 429); assert.equal(last.body.error, 'TOO_MANY_CODES');
});
await t(`dò mã sai quá ${LIMITS.MISS_PER_IP_HOUR} lần/giờ → 429 kể cả mã đúng`, async () => {
  for (let i = 0; i < LIMITS.MISS_PER_IP_HOUR; i++) await run({ op: 'peek', code: String(i).padStart(12, '0') }, '6.6.6.6');
  const r = await run({ op: 'peek', code: A }, '6.6.6.6');
  assert.equal(r.status, 429);
  assert.equal((await run({ op: 'peek', code: A }, '7.7.7.7')).status, 200);
});
await t('dữ liệu rác bị từ chối', async () => {
  assert.equal((await run({ op: 'create', device: 'x', state: st(1) }, '8.8.8.8')).status, 400);
  assert.equal((await run({ op: 'create', device: dev(200), state: { v: 2, day: 1 } }, '8.8.8.8')).status, 400);
  assert.equal((await run({ op: 'create', device: dev(200), state: { v: 1, day: 1, pad: 'x'.repeat(130000) } }, '8.8.8.8')).status, 413);
  assert.equal((await run({ op: 'drop' }, '8.8.8.8')).status, 400);
  assert.equal((await run(null, '8.8.8.8')).status, 400);
});
await t('xoá: chỉ máy đang gắn mới xoá được; xoá xong máy được xin mã mới', async () => {
  assert.equal((await run({ op: 'remove', code: A, device: dev(1) }, '1.1.1.1')).status, 403); // máy 1 đã bị gỡ (quá 5 máy)
  assert.equal((await run({ op: 'remove', code: A, device: dev(16) }, '4.4.4.4')).status, 200);
  assert.equal((await run({ op: 'peek', code: A }, '7.7.7.7')).status, 404);
  assert.equal((await run({ op: 'create', device: dev(16), state: st(1) }, '4.4.4.4')).status, 200);
});
console.log(`\n${pass} test OK`);
await client.end();
