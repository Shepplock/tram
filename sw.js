const CACHE = 'printpak-v35';
const FILES = ['./', './index.html'];
// icônes et manifeste volontairement absents : addAll() est tout-ou-rien,
// un fichier manquant ferait échouer l'ensemble du cache hors ligne.

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Les URL portant un paramètre sont laissées au réseau : c'est ainsi que
  // tests.html obtient le fichier en ligne plutôt que la copie en cache.
  if (new URL(e.request.url).search) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
