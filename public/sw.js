/* Service worker — Scott English Academy
 *
 * Estratégia:
 *  - Navegação (HTML): network-first com fallback para a home em cache.
 *    Garante conteúdo fresco quando online, mas a PWA abre mesmo offline.
 *  - Assets estáticos (/_next/static, /icons, /brand): cache-first.
 *  - API (/api/*): network-only, com resposta de erro amigável offline.
 */

const VERSION = "v2";
const STATIC_CACHE = `sea-static-${VERSION}`;
const RUNTIME_CACHE = `sea-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand/icon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-icon.png"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: sempre rede
  if (url.pathname.startsWith("/api/")) return;

  // Assets: cache-first
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Sessões e páginas privadas nunca ficam em cache entre usuários.
  if (url.pathname === "/app" || url.pathname.startsWith("/app/") || url.pathname === "/login" || url.pathname === "/cadastro") {
    if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then(response => response || new Response("Você está offline", { status: 503 }))));
    return;
  }

  // Navegação pública: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok && !response.redirected) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response(
            "<!doctype html><meta charset='utf-8'><title>Offline</title><body style='font-family:system-ui;padding:3rem;text-align:center'><h1>Você está offline</h1><p>Conecte-se para continuar estudando.</p></body>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
  }
});
