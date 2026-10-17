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

    // Lo que va a la nube (Supabase) no se guarda: sus datos tienen que
    // llegar siempre frescos, nunca una copia vieja
    if (new URL(evento.request.url).hostname.endsWith(".supabase.co")) {
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


// Avisos (recordatorios): el servidor envía un aviso y el navegador
// despierta a sw.js, aunque Ergon esté cerrada. Llega como texto JSON:
// { tipo, titulo, texto }. Hay que enseñarlo siempre (el iPhone lo exige).
self.addEventListener("push", function (evento) {
    let aviso = { titulo: "Ergon", texto: "" };
    if (evento.data) {
        try {
            aviso = evento.data.json();
        } catch (error) {
            aviso.texto = evento.data.text();
        }
    }

    evento.waitUntil(
        self.registration.showNotification(aviso.titulo || "Ergon", {
            body: aviso.texto,
            icon: "iconos/icono-192.png",
            // Un aviso nuevo del mismo tipo sustituye al anterior
            tag: aviso.tipo
        })
    );
});

// Al tocar el aviso: si Ergon ya estaba abierta, se trae delante; si no,
// se abre.
self.addEventListener("notificationclick", function (evento) {
    evento.notification.close();

    evento.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ventanas) {
            if (ventanas.length > 0) {
                return ventanas[0].focus();
            }
            return self.clients.openWindow(self.registration.scope);
        })
    );
});
