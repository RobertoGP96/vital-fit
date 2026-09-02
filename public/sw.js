/* VitalFit service worker — deliberadamente minimalista.
   - Precache del shell mínimo (página offline + ícono).
   - Navegaciones: network-first con fallback a /offline.
   - Estáticos de Next (_next/static, iconos): cache-first (inmutables).
   - NUNCA cachea peticiones a Supabase (REST/auth/storage): riesgo de fuga
     de sesión y de datos entre usuarios. */

const VERSION = "vitalfit-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo mismo origen y GET; Supabase y APIs quedan totalmente fuera.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Estáticos inmutables: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Navegaciones: red primero; si no hay conexión, página offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit || Response.error()),
      ),
    );
  }
});
