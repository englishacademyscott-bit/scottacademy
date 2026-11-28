/* Service worker — Scott English Academy
 *
 * Estratégia segura para Next.js App Router + PWA:
 *  - Navegação (HTML): sempre rede (network-only) com fallback apenas para /offline
 *    quando sem conexão. Evita servir HTML antigo com hashes de chunks obsoletos
 *    ao retornar de apps externos (ex.: WhatsApp).
 *  - Ícones e imagens da marca (/icons, /brand): cache-first (somente HTTP 200).
 *  - /_next/* e /api/*: gerenciados diretamente pelo navegador/rede (nunca cacheados
 *    de forma cruzada entre deploys).
 */

const VERSION = "v5";
const STATIC_CACHE = `sea-static-${VERSION}`;
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
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isBrandAsset(url) {
  return (
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

  // API e bundles do Next.js: sempre deixados para o navegador / HTTP cache nativo
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return;
  }

  // Ícones e ativos de marca: cache-first seguro (somente respostas 200 OK)
  if (isBrandAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.status === 200) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navegação HTML: sempre rede fresca; fallback somente para /offline se desconectado
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
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
