const CACHE = "ergon-v1";

const ARCHIVOS = [
    "./",
    "index.html",
    "style.css",
    "script.js",
    "citas.json",
    "manifest.json",
    "iconos/icono-192.png"
];

self.addEventListener("install", function (evento) {
    evento.waitUntil (
        caches.open(CACHE).then(function (cache) {
            return cache.addAll(ARCHIVOS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
    evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (evento) {
    if (evento.request.method !== "GET") {
        return;
    }

    evento.respondWith(
        fetch(evento.request)
            .then(function (respuesta) {
                const copia = respuesta.clone();
                caches.open(CACHE).then(function (cache) {
                    cache.put(evento.request, copia);
                });
                return respuesta;
            })
            .catch(function () {
                return caches.match(evento.request);
            })
    );
});

