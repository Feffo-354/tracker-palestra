const CACHE_NAME = 'fittrack-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Fase di installazione: mettiamo in cache l'interfaccia dell'app (App Shell)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Salvataggio file statici in cache...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Fase di attivazione: pulizia vecchie cache
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Cancellazione vecchia cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Intercettazione delle richieste di rete (Strategia: Cache First, fallback su Network)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Ritorna il file dalla cache immediatamente
      }
      return fetch(e.request).catch(() => {
        // Opzione di fallback se offline totale e risorsa non in cache
        console.log('Risorsa non trovata offline');
      });
    })
  );
});
