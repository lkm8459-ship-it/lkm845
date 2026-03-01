// V2.91: 사령관님 가이드 기반 '알림 전용' 서비스워커
const CACHE_NAME = 'workout-routine-v2.91';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/icon-512.png'
];

// 설치 및 캐싱
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

// 활성화 및 이전 캐시 삭제
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

// 네트워크 가용성 확보
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(res => res || fetch(event.request))
    );
});

// [핵심] 사령관님 필살기 가이드: 알림 클릭 핸들러
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('./');
        })
    );
});
