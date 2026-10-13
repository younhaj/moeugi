// 네트워크 우선, 실패하면 캐시 (오프라인에서도 열림 + 배포하면 바로 반영)
const C = 'v12';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'index.html', 'app.js', 'calc.js', 'manifest.json', 'icon.png', 'icons.js', 'levels.html'])));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // no-cache: 브라우저 HTTP 캐시의 오래된 파일 대신 항상 서버에 새 버전 확인 (바뀐 게 없으면 304라 가벼움)
  e.respondWith(fetch(e.request, { cache: 'no-cache' })
    .then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
