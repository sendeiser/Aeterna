// Service Worker para Aeterna Parque San Nicolás - PWA
const CACHE_NAME = 'aeterna-cache-v1'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo_aeterna.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// Instalación: Precarga recursos esenciales del shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA SW] Precaching error:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación: Limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch: Manejo inteligente de peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignorar llamadas a Supabase API y websockets (deben ser siempre en red viva)
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return
  }

  // Para peticiones de navegación (HTML), usar Network-First con fallback a cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/')
        })
    )
    return
  }

  // Para recursos estáticos (imágenes, fuentes, css, js), Cache-First con actualización de fondo
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano revalida
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse))
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        })
        .catch(() => {
          // Si falla y es una imagen, devolver fallback si existe
          if (event.request.destination === 'image') {
            return caches.match('/logo_aeterna.png')
          }
        })
    })
  )
})
