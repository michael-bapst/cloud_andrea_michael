self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('cloud-cache').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/dashboard.html',
                '/folder.html',
                '/css/style.css',
                '/css/dropzone.css',
                '/js/app.js',
                '/js/auth.js',
                '/js/drive.js',
                '/js/dashboard.js',
                '/js/folder.js',
                'https://cdn.jsdelivr.net/npm/uikit@3.16.0/dist/css/uikit.min.css',
                'https://cdn.jsdelivr.net/npm/uikit@3.16.0/dist/js/uikit.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request))
    );
});
