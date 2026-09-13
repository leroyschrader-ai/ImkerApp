// ImkerApp service worker
// Zorgt dat de app zelf (het "casco") ook zonder internetverbinding opent,
// maar geeft altijd voorrang aan de nieuwste versie zodra er internet is
// (zodat je nooit meer handmatig het icoon hoeft te verwijderen en opnieuw
// toe te voegen om een update te zien).

const CACHE_NAAM = 'imkerapp-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAAM).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(
        namen.filter((naam) => naam !== CACHE_NAAM).map((naam) => caches.delete(naam))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Netwerk eerst voor alles (app-eigen bestanden én externe bronnen zoals
  // kaarttegels, lettertypen, Leaflet/Chart.js, het weer): zo zie je altijd
  // de nieuwste versie zodra je online bent. Alleen zonder internetverbinding
  // valt de app terug op wat eerder is opgeslagen.
  event.respondWith(
    fetch(request)
      .then((netwerkResponse) => {
        caches.open(CACHE_NAAM).then((cache) => cache.put(request, netwerkResponse.clone())).catch(() => {});
        return netwerkResponse;
      })
      .catch(() => caches.match(request))
  );
});
