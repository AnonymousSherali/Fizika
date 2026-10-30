/* ============================================================
   Umumiy UI xulqi: dark mode, tepaga qaytish, scroll-reveal.
   Barcha sahifalarda <script src="theme.js"></script> bilan ulanadi.
   Suzuvchi tugmalar avtomatik qo'shiladi.
   ============================================================ */
/* Umumiy yordamchilar — barcha sahifa skriptlari shu yerdan oladi (theme.js har sahifada birinchi yuklanadi) */
window.Fizika = window.Fizika || {};
/** Matnni HTML ichiga xavfsiz qo'yish uchun (serverdan, admin paneldan kelgan har qanday matn) */
window.Fizika.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
};

/*
 * Tugma bosilishi: HTML'da onclick="..." o'rniga data-click="funksiya('qiymat', event)".
 * Sabab — CSP (script-src 'self'): HTML ichidagi kod bajarilmaydi. Bu yerda eval YO'Q: faqat global
 * funksiya nomi va oddiy qiymatlar (satr, son, true/false/null, event, this) qat'iy tahlil qilinadi.
 */
(function () {
    'use strict';
    var CALL = /^\s*([A-Za-z_$][\w$]*)\s*\((.*)\)\s*;?\s*$/;
    var ARG = /\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null|event|this)\s*(,|$)/y;
    function parseArgs(src, ev, el) {
        var out = [];
        ARG.lastIndex = 0;
        if (!src.trim()) return out;
        while (ARG.lastIndex < src.length) {
            var start = ARG.lastIndex, m = ARG.exec(src);
            if (!m) throw new Error('data-click: tushunilmagan argument — ' + src.slice(start));
            var t = m[1];
            if (t === 'event') out.push(ev);
            else if (t === 'this') out.push(el);
            else if (t === 'true' || t === 'false' || t === 'null') out.push(JSON.parse(t));
            else if (t[0] === "'") out.push(t.slice(1, -1).replace(/\\(.)/g, '$1'));
            else if (t[0] === '"') out.push(JSON.parse(t));
            else out.push(Number(t));
            if (!m[2]) break;
        }
        return out;
    }
    window.Fizika.callAttr = function (el, attr, ev) {
        var m = CALL.exec(el.getAttribute(attr) || '');
        var fn = m && window[m[1]];
        if (typeof fn !== 'function') {
            if (window.console) console.error('data-click: funksiya topilmadi — ' + el.getAttribute(attr));
            return;
        }
        return fn.apply(el, parseArgs(m[2], ev, el));
    };
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-click]') : null;
        if (el && !el.disabled) window.Fizika.callAttr(el, 'data-click', e);
    });
})();

(function () {
    'use strict';

    // Sayt ildizi (theme.js shu papkada turadi) — har qanday chuqurlikdagi sahifadan
    var ROOT = (function () {
        var src = document.currentScript && document.currentScript.src;
        return src ? src.replace(/theme\.js(\?.*)?$/, '') : '';
    })();

    // Miltillashning oldini olish: rejim <body> tayyor bo'lishidan oldin
    // <html> elementiga qo'llanadi (styles.css uni ham hisobga oladi)
    try {
        var early = localStorage.getItem('fizika-theme');
        if (early === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}

    // ----- Rejimni qo'llash -----
    function applyTheme(theme) {
        var isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = isDark ? '☀️' : '🌙';
            btn.setAttribute('aria-pressed', String(isDark));
        }
        // Kanvasli sahifalar o'z palitrasini yangilashi uchun xabar beramiz
        try {
            window.dispatchEvent(new CustomEvent('fizika:theme', { detail: { dark: isDark } }));
        } catch (e) {}
    }

    // Sahifa kodi uchun qulay yordamchi
    window.isDarkTheme = function () {
        return document.body.classList.contains('dark');
    };

    function toggleTheme() {
        var next = document.body.classList.contains('dark') ? 'light' : 'dark';
        try { localStorage.setItem('fizika-theme', next); } catch (e) {}
        applyTheme(next);
    }

    // ----- Suzuvchi tugmalarni yaratish -----
    function createFloatingButtons() {
        if (!document.getElementById('themeToggle')) {
            var t = document.createElement('button');
            t.id = 'themeToggle';
            t.className = 'floating-btn';
            t.title = 'Yorug\'/Qorong\'i rejim';
            t.setAttribute('aria-label', 'Rejimni almashtirish');
            t.onclick = toggleTheme;
            document.body.appendChild(t);
        }
        if (!document.getElementById('langToggle')) {
            var lg = document.createElement('button');
            lg.id = 'langToggle';
            lg.className = 'floating-btn';
            var ru = getLang() === 'ru';
            lg.textContent = ru ? 'UZ' : 'RU';
            lg.title = ru ? 'O\'zbek tiliga o\'tish' : 'Русский язык';
            lg.setAttribute('aria-label', lg.title);
            lg.setAttribute('data-no-i18n', '');
            lg.onclick = function () {
                try { localStorage.setItem('fizika-lang', ru ? 'uz' : 'ru'); } catch (e) {}
                location.reload();
            };
            document.body.appendChild(lg);
        }
        if (!document.getElementById('scrollTop')) {
            var s = document.createElement('button');
            s.id = 'scrollTop';
            s.className = 'floating-btn';
            s.textContent = '↑';
            s.title = 'Tepaga';
            s.setAttribute('aria-label', 'Tepaga qaytish');
            s.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
            document.body.appendChild(s);
        }
    }

    // ----- Til (o'zbek / rus) -----
    function getLang() {
        try { return localStorage.getItem('fizika-lang') === 'ru' ? 'ru' : 'uz'; } catch (e) { return 'uz'; }
    }
    function loadLang() {
        if (getLang() !== 'ru' || !ROOT) return;
        var d = document.createElement('script');
        d.src = ROOT + 'i18n-ru.js?v=' + I18N_VER;
        function run() {
            var r = document.createElement('script');
            r.src = ROOT + 'i18n.js?v=' + I18N_VER;
            document.head.appendChild(r);
        }
        d.onload = function () {
            // Backend ishlayotgani ma'lum bo'lsa (api.js shu sessiyada tekshirgan): admin panelda tahrirlangan
            // tarjimalar serverdan olinib, fayldagilar ustiga yoziladi — export_i18n ni kutish shart emas
            // Sessiyaning birinchi sahifasida server holati hali noma'lum — baribir bir marta urinib ko'riladi
            // (backendsiz statik hostingda bitta muvaffaqiyatsiz so'rov, keyin api.js «server yo'q» deb eslab qoladi)
            var api = null;
            try { api = JSON.parse(sessionStorage.getItem('fizika-api-ok') || 'null'); } catch (e) {}
            if (api && !api.v) return run();
            var apiBase = api && api.base;
            if (!apiBase) {
                try { apiBase = localStorage.getItem('fizika-api'); } catch (e) {}
                apiBase = apiBase || (/^https?:/.test(location.protocol) ? ROOT + 'api/v1/' : null);
            }
            if (!apiBase) return run();
            var base = window.FIZIKA_RU || {};
            var done = false;
            function finish() { if (!done) { done = true; run(); } }
            var x = document.createElement('script');
            x.src = apiBase + 'i18n/ru.js';
            // Server lug'ati fayldagisi ustiga qo'shiladi (kech kelsa ham — fayldagi lug'at yo'qolmaydi)
            x.onload = function () {
                if (window.FIZIKA_RU !== base) window.FIZIKA_RU = Object.assign({}, base, window.FIZIKA_RU || {});
                finish();
            };
            x.onerror = function () { window.FIZIKA_RU = base; finish(); };
            setTimeout(finish, 2500);   // server javob bermasa sahifa kutib qolmasin
            document.head.appendChild(x);
        };
        document.head.appendChild(d);
    }
    var I18N_VER = '20261101h';
    window.fizikaLang = getLang;

    // ----- Scroll-to-top ko'rinishi -----
    function initScrollTop() {
        function sync() {
            var s = document.getElementById('scrollTop');
            if (s) s.classList.toggle('show', window.scrollY > 300);
        }
        window.addEventListener('scroll', sync);
        // Anchor havola bilan kirilganda sahifa allaqachon pastda bo'lishi mumkin
        sync();
    }

    // ----- Scroll-reveal animatsiya -----
    function initReveal() {
        var targets = document.querySelectorAll('[data-reveal], .section, .info-box');
        if (!targets.length || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('visible'); });
            return;
        }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        targets.forEach(function (el) {
            el.classList.add('reveal');
            obs.observe(el);
        });
    }

    // ----- Oflayn ishlash (PWA) -----
    // Manifest (telefonga "ilova" sifatida o'rnatish) va Service Worker (internetsiz ishlash).
    // file:// orqali ochilganda Service Worker ishlamaydi — u holda jim o'tkazib yuboramiz.
    function initPwa() {
        if (!ROOT || !/^https?:/.test(location.protocol)) return;
        if (!document.querySelector('link[rel="manifest"]')) {
            var m = document.createElement('link');
            m.rel = 'manifest';
            m.href = ROOT + 'manifest.webmanifest';
            document.head.appendChild(m);
            var t = document.createElement('meta');
            t.name = 'theme-color';
            t.content = '#4338ca';
            document.head.appendChild(t);
            var a = document.createElement('link');
            a.rel = 'apple-touch-icon';
            a.href = ROOT + 'img/icons/apple-touch-icon.png';
            document.head.appendChild(a);
        }
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(function () {});
            });
        }
    }

    // ----- O'qituvchi rejimi (?oqituvchi=1 / ?oqituvchi=0) -----
    // Har qanday sahifadan yoqiladi; modellarda kutilgan natijalarni model-tools.js ko'rsatadi
    function initTeacherFlag() {
        var q = null;
        try { q = new URLSearchParams(location.search).get('oqituvchi'); } catch (e) {}
        if (q !== '1' && q !== '0') return;
        try {
            if (q === '1') localStorage.setItem('fizika-teacher', '1');
            else localStorage.removeItem('fizika-teacher');
        } catch (e) {}
        var t = document.createElement('div');
        t.className = 'toast';
        t.setAttribute('role', 'status');
        t.textContent = q === '1' ? '👩‍🏫 O\'qituvchi rejimi yoqildi — modellarda kutilgan natijalar ko\'rinadi'
                                  : 'O\'qituvchi rejimi o\'chirildi';
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('toast--hide'); }, 3200);
        setTimeout(function () { t.remove(); }, 3800);
    }

    // ----- Backend bilan aloqa (api.js) va hisob tugmasi -----
    // api.js har sahifada avtomatik yuklanadi. «Kirish» tugmasi faqat server ishlayotgan bo'lsa
    // ko'rinadi — backendsiz (faqat statik hosting) saytda ortiqcha tugma chiqmaydi.
    function loadApi() {
        if (!ROOT || !/^https?:/.test(location.protocol) || window.FizikaAPI) return;
        var s = document.createElement('script');
        s.src = ROOT + 'api.js?v=' + I18N_VER;
        s.onload = function () { renderAccount(); };
        document.head.appendChild(s);
        window.addEventListener('fizika:auth', renderAccount);
    }

    function renderAccount() {
        var api = window.FizikaAPI;
        if (!api) return;
        var u = api.user();
        var slots = document.querySelectorAll('[data-account]');
        var show = function (ok) {
            if (!ok && !u) {
                slots.forEach(function (el) { el.hidden = true; });
                return;
            }
            var href, text;
            if (u) {
                href = ROOT + (api.isTeacher() ? 'oqituvchi/index.html' : 'oquvchi/index.html');
                text = '👤 ' + (u.first_name || u.username);
            } else {
                href = api.loginUrl(location.pathname + location.search);
                text = '👤 Kirish';
            }
            if (!slots.length) {
                var a = document.createElement('a');
                a.id = 'accountBtn';
                a.className = 'account-btn';
                a.setAttribute('data-account', '');
                document.body.appendChild(a);
                slots = [a];
            }
            slots.forEach(function (el) {
                el.hidden = false;
                el.href = href;
                el.textContent = text;
                el.title = u ? 'Mening sahifam' : 'Tizimga kirish';
            });
        };
        if (u) show(true);
        else api.available().then(show);
    }

    // ----- Ishga tushirish -----
    // Rejimni iloji boricha erta qo'llaymiz (miltillashning oldini olish)
    function boot() {
        var saved = 'light';
        try { saved = localStorage.getItem('fizika-theme') || 'light'; } catch (e) {}
        createFloatingButtons();
        applyTheme(saved);
        initScrollTop();
        initReveal();
        initPwa();
        initTeacherFlag();
        loadLang();
        loadApi();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Tashqaridan chaqirish uchun
    window.toggleTheme = toggleTheme;
})();
