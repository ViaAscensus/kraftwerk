/* Kraftwerk – Service Worker
   Zweck: Die App-Hülle (Seite, Skripte, Schriften, Icons) bleibt auf dem Gerät, damit Kraftwerk
   auch bei schlechtem Empfang im Studio öffnet. Daten kommen weiterhin live aus PocketBase
   (anderer Ursprung, wird hier nie angefasst) – gespeichert wird also nur mit Verbindung.
   Bei jeder inhaltlichen Änderung an Dateien der Hülle VERSION hochzählen. */
const VERSION = 'kw-2';
const SHELL = [
  './', 'index.html', 'login.html', 'kw-app.js', 'manifest.webmanifest',
  'ascensus.css', 'ascensus.js', 'pocketbase.umd.js', 'logo-wordmark.png',
  'Inter-Variable.woff2', 'Inter-Variable-Italic.woff2',
  'fonts/Bungee-Regular.woff2', 'fonts/Outfit-Variable.woff2', 'fonts/Graduate-Regular.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCopy(req, res){
  if(res && res.ok && res.type === 'basic'){
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;           // PocketBase u. a.: nie anfassen
  if(url.pathname === '/sw.js') return;

  // Seiten: zuerst das Netz (immer die neueste Fassung), nach 4 s oder ohne Netz die gespeicherte
  if(req.mode === 'navigate'){
    e.respondWith((async () => {
      const cached = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
      try{
        const res = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NAV_TIMEOUT_MS))
        ]);
        return putCopy(req, res);
      }catch(err){
        return (await cached()) || Response.error();
      }
    })());
    return;
  }

  // Alles andere: gespeicherte Fassung sofort, im Hintergrund erneuern
  e.respondWith((async () => {
    const hit = await caches.match(req);
    const net = fetch(req).then(res => putCopy(req, res)).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
