/* ============================================================
   Umumiy UI xulqi: dark mode, tepaga qaytish, scroll-reveal.
   Barcha sahifalarda <script src="theme.js"></script> bilan ulanadi.
   Suzuvchi tugmalar avtomatik qo'shiladi.
   ============================================================ */
(function () {
    'use strict';

    // ----- Rejimni qo'llash -----
    function applyTheme(theme) {
        var isDark = theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = isDark ? '☀️' : '🌙';
            btn.setAttribute('aria-pressed', String(isDark));
        }
    }

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

    // ----- Scroll-to-top ko'rinishi -----
    function initScrollTop() {
        window.addEventListener('scroll', function () {
            var s = document.getElementById('scrollTop');
            if (s) s.classList.toggle('show', window.scrollY > 300);
        });
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

    // ----- Ishga tushirish -----
    // Rejimni iloji boricha erta qo'llaymiz (miltillashning oldini olish)
    function boot() {
        var saved = 'light';
        try { saved = localStorage.getItem('fizika-theme') || 'light'; } catch (e) {}
        createFloatingButtons();
        applyTheme(saved);
        initScrollTop();
        initReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Tashqaridan chaqirish uchun
    window.toggleTheme = toggleTheme;
})();
