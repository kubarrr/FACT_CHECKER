// Minimalny service worker – umożliwia instalację PWA i działanie offline (powłoka aplikacji).
const CACHE = "factchecker-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./prompt.js",
  "./gemini.js",
  "./backend.js",
  "./learn.js",
  "./config.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Nie cache'ujemy zapytań do API Gemini – zawsze sieć.
  if (url.hostname.includes("generativelanguage.googleapis.com")) return;
  if (e.request.method !== "GET") return;

  // Powłoka aplikacji: najpierw cache, potem sieć.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
