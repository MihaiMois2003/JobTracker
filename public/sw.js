// Ledger service worker: makes the app open offline and instantly from the home screen.
// Data itself is cached by Firestore (IndexedDB); this only caches the app shell and assets.
const VERSION = 'ledger-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Fonts: serve from cache, refresh in the background.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached ?? network
      }),
    )
    return
  }

  // Everything else cross-origin (Firebase, APIs) and Firebase reserved paths go straight to network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return

  // App navigation: network first so deploys show up, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((cache) => cache.put(request, copy))
            }
            return res
          }),
      ),
    )
  }
})
