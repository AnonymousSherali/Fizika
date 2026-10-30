/* ============================================================
   api.js — sayt va backend (fizika-api) o'rtasidagi aloqa
   theme.js uni avtomatik yuklaydi. Tayyor bo'lganda window.FizikaAPI
   paydo bo'ladi va "fizika:api" hodisasi yuboriladi.

   Asosiy tamoyil: backend ishlamasa yoki foydalanuvchi kirmagan bo'lsa,
   sayt hozirgidek (oflayn) ishlaydi — bu fayl hech qachon xato tashlamaydi.

   API manzili:
     - standart: sayt bilan bir domenda, <sayt>/api/v1/  (Nginx, TZ 9.3)
     - boshqa domenda bo'lsa: pastdagi API_BASE ga yozing,
       masalan 'https://api.maktab.uz/api/v1/'
     - sinov uchun: localStorage.setItem('fizika-api', 'http://127.0.0.1:8000/api/v1/')
   ============================================================ */
(function () {
    'use strict';

    var API_BASE = '';   // bo'sh — sayt bilan bir domen

    var ROOT = (function () {
        var src = document.currentScript && document.currentScript.src;
        return src ? src.replace(/api\.js(\?.*)?$/, '') : '';
    })();

    function base() {
        var custom = null;
        try { custom = localStorage.getItem('fizika-api'); } catch (e) {}
        var b = custom || API_BASE || (ROOT + 'api/v1/');
        return b.charAt(b.length - 1) === '/' ? b : b + '/';
    }

    // ---------- Tokenlar va foydalanuvchi ----------
    var KEY = 'fizika-auth';
    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
    }
    function save(auth) {
        try {
            if (auth) localStorage.setItem(KEY, JSON.stringify(auth));
            else localStorage.removeItem(KEY);
        } catch (e) {}
        emit('fizika:auth', { user: auth ? auth.user : null });
    }
    function emit(name, detail) {
        try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {}
    }

    function ApiError(status, body) {
        var err = (body && body.error) || {};
        this.status = status;
        this.code = err.code || (status === 0 ? 'network' : 'error');
        this.message = err.message || (status === 0 ? 'Server bilan aloqa yo\'q' : 'Xatolik');
        this.fields = err.fields || null;
        this.body = body;
    }
    ApiError.prototype = Object.create(Error.prototype);
    ApiError.prototype.toString = function () { return this.message; };
    /** Maydon xatolarini bitta matn qilib beradi (formalar uchun) */
    ApiError.prototype.text = function () {
        // Ruscha rejimda server xabarlari lug'at bo'yicha (birlashtirilgan matn lug'atda topilmaydi)
        var tr = window.fizikaTr || function (s) { return s; };
        if (!this.fields) return tr(this.message);
        var parts = [];
        Object.keys(this.fields).forEach(function (k) {
            var v = this.fields[k];
            if (Array.isArray(v)) v.forEach(function (x) { parts.push(tr(String(x))); });
            else parts.push(typeof v === 'object' ? JSON.stringify(v) : tr(String(v)));
        }, this);
        return parts.join(' · ') || tr(this.message);
    };

    var refreshing = null;
    function refresh() {
        var auth = load();
        if (!auth || !auth.refresh) return Promise.reject(new ApiError(401, null));
        if (!refreshing) {
            refreshing = raw('POST', 'auth/refresh/', { refresh: auth.refresh }, false).then(function (r) {
                var cur = load() || {};
                cur.access = r.access;
                if (r.refresh) cur.refresh = r.refresh;
                save(cur);
                return cur;
            }, function (e) {
                if (e.status === 401) save(null);   // sessiya tugagan
                throw e;
            }).then(function (v) { refreshing = null; return v; }, function (e) { refreshing = null; throw e; });
        }
        return refreshing;
    }

    function raw(method, path, body, withAuth, opts) {
        opts = opts || {};
        var headers = { 'Accept': 'application/json' };
        var lang = 'uz';
        try { lang = localStorage.getItem('fizika-lang') === 'ru' ? 'ru' : 'uz'; } catch (e) {}
        if (opts.lang) lang = opts.lang;   // ma'lum tildagi matn kerak bo'lsa (masalan, solishtirish uchun)
        headers['Accept-Language'] = lang;
        var auth = load();
        if (withAuth && auth && auth.access) headers['Authorization'] = 'Bearer ' + auth.access;
        var init = { method: method, headers: headers };
        if (body instanceof FormData) {
            init.body = body;
        } else if (body !== undefined && body !== null) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }
        var ctrl = 'AbortController' in window ? new AbortController() : null;
        if (ctrl) init.signal = ctrl.signal;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || 15000) : null;
        return fetch(base() + path.replace(/^\//, ''), init).then(function (res) {
            clearTimeout(timer);
            if (opts.blob && res.ok) return res.blob();
            var ct = res.headers.get('content-type') || '';
            var p = ct.indexOf('json') > -1 ? res.json().catch(function () { return null; }) : Promise.resolve(null);
            return p.then(function (data) {
                if (res.ok) return data;
                throw new ApiError(res.status, data);
            });
        }, function () {
            clearTimeout(timer);
            throw new ApiError(0, null);
        });
    }

    /** Asosiy so'rov: kerak bo'lsa tokenni yangilab, bir marta qayta urinadi. */
    function request(method, path, body, opts) {
        var withAuth = !!(load() && load().access);
        return raw(method, path, body, withAuth, opts).catch(function (e) {
            if (e.status === 401 && withAuth && e.code !== 'invalid_credentials') {
                return refresh().then(function () { return raw(method, path, body, true, opts); });
            }
            throw e;
        });
    }

    // ---------- Server mavjudligi (kesh 60 s) ----------
    // Natija sahifalar orasida ham 10 daqiqa eslab qolinadi — backendsiz statik hostingda
    // har sahifada /api/v1/health/ ga ortiqcha so'rov (va 404) yuborilmasin
    var health = null, healthAt = 0;
    function available() {
        if (health && Date.now() - healthAt < 60000) return health;
        try {
            var c = JSON.parse(sessionStorage.getItem('fizika-api-ok') || 'null');
            // «Server yo'q» natijasi qisqa (30 s) eslab qolinadi: bitta sekin javob sahifalarni uzoq bloklamasin
            if (c && c.base === base() && Date.now() - c.t < (c.v ? 60000 : 30000)) {
                healthAt = Date.now();
                health = Promise.resolve(c.v);
                return health;
            }
        } catch (e) {}
        healthAt = Date.now();
        health = raw('GET', 'health/', null, false, { timeout: 4000 }).then(function () { return true; },
            function () { return false; }).then(function (v) {
                try { sessionStorage.setItem('fizika-api-ok', JSON.stringify({ v: v, t: Date.now(), base: base() })); } catch (e) {}
                return v;
            });
        return health;
    }

    // ---------- Oflayn navbat (IndexedDB) — FT-4.3 ----------
    // Navbatdagi har bir yozuv: { key, owner, method, path, body } — key bir xil bo'lsa eskisi almashtiriladi
    // (masalan bitta jurnalning oxirgi holati), shuning uchun server dublikat ko'rmaydi.
    // owner — yozuv egasi: umumiy kompyuterda A o'quvchining jurnali B nomidan yuborilmasin
    // (A qayta kirganda yuboriladi).
    var DB_NAME = 'fizika-outbox';
    function db() {
        return new Promise(function (resolve, reject) {
            if (!('indexedDB' in window)) { reject(new Error('IndexedDB yo\'q')); return; }
            var r = indexedDB.open(DB_NAME, 1);
            r.onupgradeneeded = function () { r.result.createObjectStore('outbox', { keyPath: 'key' }); };
            r.onsuccess = function () { resolve(r.result); };
            r.onerror = function () { reject(r.error); };
        });
    }
    function tx(mode, fn) {
        return db().then(function (d) {
            return new Promise(function (resolve, reject) {
                var t = d.transaction('outbox', mode);
                var out = fn(t.objectStore('outbox'));
                t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
                t.onerror = function () { reject(t.error); };
            });
        });
    }
    function enqueue(item) {
        return tx('readwrite', function (s) { return s.put(item); }).catch(function () {});
    }
    var flushing = false;
    function flush() {
        if (flushing || !isLoggedIn()) return Promise.resolve();
        flushing = true;
        var me = (user() || {}).id;
        return tx('readonly', function (s) { return s.getAll(); }).then(function (items) {
            return (items || []).reduce(function (p, it) {
                return p.then(function () {
                    // Egasiz (eski versiyadagi) yozuvni kimga tegishli ekani noma'lum — o'chiriladi
                    if (!it.owner) return tx('readwrite', function (s) { return s.delete(it.key); });
                    if (it.owner !== me) return null;   // boshqa foydalanuvchiniki — o'zi kirganda yuboriladi
                    return request(it.method, it.path, it.body).then(function (res) {
                        emit('fizika:synced', { key: it.key, result: res });
                        return tx('readwrite', function (s) { return s.delete(it.key); });
                    }, function (e) {
                        // 4xx (ma'lumot xatosi) — qayta urinish foydasiz, navbatdan olinadi
                        if (e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429) {
                            emit('fizika:sync-error', { key: it.key, error: e });
                            return tx('readwrite', function (s) { return s.delete(it.key); });
                        }
                        throw e;
                    });
                });
            }, Promise.resolve());
        }).catch(function () {}).then(function () { flushing = false; });
    }
    /** Avval to'g'ridan-to'g'ri yuboradi; tarmoq yo'q bo'lsa navbatga qo'yadi. */
    function sendOrQueue(key, method, path, body) {
        return request(method, path, body).then(function (res) {
            // Shu kalit bilan navbatda eski nusxa qolgan bo'lsa — o'chiriladi (aks holda keyingi flush
            // yangi saqlangan jurnalni eski holati bilan almashtirib yuborardi)
            tx('readwrite', function (s) { return s.delete(key); }).catch(function () {});
            return { sent: true, result: res };
        }, function (e) {
            if (e.status === 0 || e.status >= 500) {
                return enqueue({ key: key, owner: (user() || {}).id, method: method, path: path, body: body }).then(function () {
                    return { sent: false, queued: true };
                });
            }
            throw e;
        });
    }
    window.addEventListener('online', function () { flush(); });
    setInterval(function () { if (navigator.onLine) flush(); }, 60000);

    // ---------- Qulay yordamchilar ----------
    function user() { var a = load(); return a ? a.user : null; }
    function isLoggedIn() { var a = load(); return !!(a && a.access); }
    function setAuth(r) {
        save({ access: r.access, refresh: r.refresh, user: r.user });
        flush();
        return r.user;
    }
    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });
    }
    function device() {
        var w = Math.min(screen.width, screen.height);
        return w < 600 ? 'mobile' : (w < 1000 ? 'tablet' : 'desktop');
    }

    window.FizikaAPI = {
        root: ROOT,
        base: base,
        ApiError: ApiError,
        get: function (p, o) { return request('GET', p, null, o); },
        /** Sahifalangan ro'yxatning barcha sahifalari (results birlashtiriladi; 100 tadan oshsa ham hech narsa tushib qolmaydi) */
        getAll: function (p) {
            var all = [];
            var sep = p.indexOf('?') > -1 ? '&' : '?';
            function page(n) {
                return request('GET', p + sep + 'page_size=100&page=' + n).then(function (r) {
                    if (Array.isArray(r)) return r;
                    all = all.concat(r.results || []);
                    return r.next && n < 50 ? page(n + 1) : all;
                });
            }
            return page(1);
        },
        post: function (p, b, o) { return request('POST', p, b === undefined ? {} : b, o); },
        patch: function (p, b) { return request('PATCH', p, b); },
        del: function (p) { return request('DELETE', p, null); },
        available: available,
        user: user,
        isLoggedIn: isLoggedIn,
        isTeacher: function () { var u = user(); return !!(u && (u.role === 'teacher' || u.role === 'school_admin' || u.role === 'admin')); },
        login: function (login, password) {
            return raw('POST', 'auth/login/', { login: login, password: password }, false).then(setAuth);
        },
        setAuth: setAuth,
        logout: function () {
            var a = load();
            var done = function () { save(null); };
            if (!a) return Promise.resolve(done());
            return raw('POST', 'auth/logout/', { refresh: a.refresh }, true).then(done, done);
        },
        refreshMe: function () {
            return request('GET', 'me/').then(function (u) {
                var a = load();
                if (a) { a.user = u; save(a); }
                return u;
            });
        },
        sendOrQueue: sendOrQueue,
        flush: flush,
        uuid: uuid,
        device: device,
        loginUrl: function (next) {
            return ROOT + 'kirish.html' + (next ? '?next=' + encodeURIComponent(next) : '');
        }
    };

    if (isLoggedIn()) flush();
    emit('fizika:api', window.FizikaAPI);
})();
