// Ofis Görüntüleyici - çevrimdışı çalışma ve "Paylaş" desteği
const VERSION = 'ofis-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './lib/pdf.min.js', './lib/pdf.worker.min.js', './lib/mammoth.browser.min.js',
  './lib/xlsx.full.min.js', './lib/jszip.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'ofis-shared').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Android "Paylaş" menüsünden gelen dosya
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get('file');
        if (file) {
          const c = await caches.open('ofis-shared');
          await c.put('shared-file', new Response(file, {
            headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name || 'dosya') }
          }));
        }
      } catch (err) { /* yoksay */ }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }

  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Önce önbellek, sonra ağ (uygulama internetsiz de açılır)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }))
  );
});
