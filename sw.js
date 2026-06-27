const CACHE_NAME = 'offline-tasks-v2'
const STATIC_ASSETS = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/state.js',
  './js/theme.js',
  './js/components/TaskItem.js',
  './js/components/TaskList.js',
  './manifest.json',
  './192x192.png',
  './512x512.png'
]

const OFFLINE_FALLBACK = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      try {
        await cache.addAll(STATIC_ASSETS)
      } catch (err) {
        console.error('Failed to cache some assets:', err)
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(event.request)
        if (cached) return cached

        const response = await fetch(event.request)

        if (response && response.status === 200 && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME)
          cache.put(event.request, response.clone())
        }

        return response
      } catch (err) {
        const cached = await caches.match(OFFLINE_FALLBACK)
        if (cached) return cached
        return new Response('Offline', { status: 503 })
      }
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
