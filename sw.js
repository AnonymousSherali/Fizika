/* ============================================================
   sw.js — oflayn ishlash (Service Worker)
   Sayt bir marta internet bilan ochilgach, barcha sahifalar, modellar,
   testlar, uslublar va shriftlar brauzer xotirasiga saqlanadi va
   internetsiz ham ochiladi. PDF/DOCX fayllar faqat bir marta
   ochilgandan keyin saqlanadi (hajmi katta).

   Yangilash: fayllar o'zgarganda pastdagi VERSION ni o'zgartiring —
   eski kesh o'chiriladi va yangi fayllar yuklanadi.
   ============================================================ */
var VERSION = 'fizika-20261101h';
var CORE = [
    './',
    './api.js',
    './app.css',
    './app.js',
    './dars_ishlanmalar/index.html',
    './dars_ishlanmalar/index.js',
    './fonts/inter-latin-ext-wght-normal.woff2',
    './fonts/inter-latin-wght-normal.woff2',
    './hujjatlar/index.html',
    './hujjatlar/loyiha_algoritmi.html',
    './hujjatlar/loyiha_algoritmi.js',
    './i18n-ru.js',
    './i18n.js',
    './img/fotoeffekt.jpg',
    './img/gaz_qonunlari.jpg',
    './img/icons/apple-touch-icon.png',
    './img/icons/icon-192.png',
    './img/icons/icon-512.png',
    './img/impuls.jpg',
    './img/induksiya.jpg',
    './img/kepler.jpg',
    './img/kondensator.jpg',
    './img/linza.jpg',
    './img/mayatnik.jpg',
    './img/om_qonuni.jpg',
    './img/otilgan_jism.jpg',
    './img/prujinali_mayatnik.jpg',
    './img/qiya_tekislik.jpg',
    './img/radioaktiv_yemirilish.jpg',
    './img/rezerford.jpg',
    './img/yoruglik_sinishi.jpg',
    './index.html',
    './index.js',
    './kirish.html',
    './kirish.js',
    './manifest.webmanifest',
    './maxfiylik.html',
    './model-tools.css',
    './model-tools.js',
    './modellar/fotoeffekt_model.html',
    './modellar/fotoeffekt_model.js',
    './modellar/gaz_qonunlari_model.html',
    './modellar/gaz_qonunlari_model.js',
    './modellar/impuls_model.html',
    './modellar/impuls_model.js',
    './modellar/index.html',
    './modellar/induksiya_model.html',
    './modellar/induksiya_model.js',
    './modellar/kepler_model.html',
    './modellar/kepler_model.js',
    './modellar/kondensator_model.html',
    './modellar/kondensator_model.js',
    './modellar/linza_model.html',
    './modellar/linza_model.js',
    './modellar/mayatnik_model.html',
    './modellar/mayatnik_model.js',
    './modellar/om_qonuni_model.html',
    './modellar/om_qonuni_model.js',
    './modellar/otilgan_jism_model.html',
    './modellar/otilgan_jism_model.js',
    './modellar/prujinali_mayatnik_model.html',
    './modellar/prujinali_mayatnik_model.js',
    './modellar/qiya_tekislik_model.html',
    './modellar/qiya_tekislik_model.js',
    './modellar/radioaktiv_yemirilish_model.html',
    './modellar/radioaktiv_yemirilish_model.js',
    './modellar/rezerford_model.html',
    './modellar/rezerford_model.js',
    './modellar/yoruglik_sinishi_model.html',
    './modellar/yoruglik_sinishi_model.js',
    './oqituvchi/index.html',
    './oqituvchi/index.js',
    './oquvchi/index.html',
    './oquvchi/index.js',
    './profil.html',
    './profil.js',
    './styles.css',
    './tekshiruv.html',
    './tekshiruv.js',
    './testlar/bank.js',
    './testlar/index.html',
    './testlar/nazorat.html',
    './testlar/nazorat.js',
    './testlar/testlar_online.html',
    './testlar/testlar_online.js',
    './theme-init.js',
    './theme.js'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(VERSION).then(function (c) {
            // Bitta fayl topilmasa ham qolganlari saqlansin (addAll hammasini bekor qilardi)
            return Promise.all(CORE.map(function (u) {
                return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) {
                return k.indexOf('fizika-') === 0 && k !== VERSION;
            }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

function putCache(req, res) {
    if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
    }
    return res;
}

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== location.origin) return;
    // Backend (API, admin, yuklangan fayllar) hech qachon keshlanmaydi — har doim tarmoqdan
    if (/\/(api|admin|media|static)\//.test(url.pathname)) return;

    // HTML: avval tarmoq (yangi versiya darhol ko'rinsin), internet bo'lmasa — kesh
    if (req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.slice(-1) === '/') {
        e.respondWith(
            fetch(req).then(function (res) { return putCache(req, res); }).catch(function () {
                return caches.match(req, { ignoreSearch: true }).then(function (r) {
                    return r || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // CSS/JS/rasm/shrift: aynan shu manzil (versiya ?v= bilan) keshda bo'lsa — keshdan,
    // bo'lmasa tarmoqdan; internet yo'q bo'lsa — versiyasiz nusxasi
    e.respondWith(
        caches.match(req).then(function (hit) {
            if (hit) return hit;
            return fetch(req).then(function (res) { return putCache(req, res); }).catch(function () {
                return caches.match(req, { ignoreSearch: true });
            });
        })
    );
});
