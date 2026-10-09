/* Service worker tối giản cho bản cài ra màn hình chính.
 * Trang game: luôn lấy bản mới từ mạng (không bao giờ kẹt bản cũ); mất mạng mới dùng bản đã lưu lần trước → vẫn mở chơi offline được.
 * Không đụng /api/ và /_vercel/. */
const CACHE = 'kem-tron-shell';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); }
        return res;
      })
      .catch(() => caches.match('/').then((r) => r || Response.error())),
  );
});
