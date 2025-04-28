self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('cloud-cache').then(function(cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/js/app.js',
                '/css/style.css',
                'https://cdn.jsdelivr.net/npm/uikit@3.16.0/dist/css/uikit.min.css'
            ]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});