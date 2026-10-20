// =====================================================================
// UpMizik Service Worker: fè paj "Mizik offline" la mache san entènèt
// Estrateji: REZO AN PREMYE (toujou dènye vèsyon an), kopi lokal sèlman si pa gen rezo.
// Mizik offline yo li menm sere pa src/lib/offline.ts (cache "upmizik-offline-v1").
// =====================================================================
const SHELL = "upmizik-shell-v1";
const OFFLINE_PAGE = "/telechaje";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(OFFLINE_PAGE))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Efase ansyen vèsyon cache "shell" la (pa janm touche mizik offline yo)
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("upmizik-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok && cacheKey) cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey || request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase elatriye: navigatè a jere yo

  // Navigasyon (louvri yon paj)
  if (request.mode === "navigate") {
    const isOfflinePage = url.pathname === OFFLINE_PAGE;
    event.respondWith(
      networkFirst(request, isOfflinePage ? OFFLINE_PAGE : null).catch(async () => {
        // San entènèt: voye moun nan sou mizik offline li yo
        const cache = await caches.open(SHELL);
        if (isOfflinePage) return (await cache.match(OFFLINE_PAGE)) || Response.error();
        return (await cache.match(OFFLINE_PAGE)) ? Response.redirect(OFFLINE_PAGE, 302) : Response.error();
      }),
    );
    return;
  }

  // Fichye JS/CSS/fon Next.js ak ikòn yo: sove yo pou paj offline la ka chaje
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(networkFirst(request, request));
  }
});
