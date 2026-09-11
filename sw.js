// ImkerApp service worker
// Zorgt dat de app zelf (het "casco") ook zonder internetverbinding opent.
// Kaarttegels en het actuele weer blijven wel een internetverbinding nodig hebben.

const CACHE_NAAM = 'imkerapp-v1';

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

  const url = new URL(request.url);
  const isAppShell = url.origin === self.location.origin;

  if (isAppShell) {
    // App-eigen bestanden: toon direct uit cache (snel, werkt offline),
    // en ververs de cache op de achtergrond met de nieuwste versie.
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const netwerkFetch = fetch(request)
          .then((netwerkResponse) => {
            caches.open(CACHE_NAAM).then((cache) => cache.put(request, netwerkResponse.clone()));
            return netwerkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || netwerkFetch;
      })
    );
  } else {
    // Externe bronnen (kaarttegels, lettertypen, Leaflet/Chart.js, het weer):
    // probeer eerst het netwerk, val anders terug op wat eerder is opgeslagen.
    event.respondWith(
      fetch(request)
        .then((netwerkResponse) => {
          caches.open(CACHE_NAAM).then((cache) => cache.put(request, netwerkResponse.clone())).catch(() => {});
          return netwerkResponse;
        })
        .catch(() => caches.match(request))
    );
  }
});
