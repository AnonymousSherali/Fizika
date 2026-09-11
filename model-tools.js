/* ============================================================
   model-tools.js — interaktiv modellar uchun umumiy vositalar
   Har bir model sahifasi theme.js dan keyin ulaydi.

   Beradi:
   1. Modellar orasida tezkor navigatsiya
   2. Klaviatura yorliqlari (Space / R / ?)
   3. Laboratoriya jurnali — o'lchovlarni jadvalga yozib borish
   ============================================================ */
(function () {
    'use strict';

    // ---------- Modellar ro'yxati ----------
    var MODELS = [
        { file: 'rezerford_model.html',     icon: '⚛️', name: 'Rezerford' },
        { file: 'kepler_model.html',        icon: '🪐', name: 'Kepler' },
        { file: 'mayatnik_model.html',      icon: '🕰️', name: 'Mayatnik' },
        { file: 'qiya_tekislik_model.html', icon: '📐', name: 'Qiya tekislik' },
        { file: 'om_qonuni_model.html',     icon: '🔌', name: 'Om qonuni' },
        { file: 'induksiya_model.html',     icon: '🧲', name: 'Induksiya' }
    ];

    function currentFile() {
        var p = location.pathname.split('/').pop();
        return p || '';
    }

    // ---------- 1) Modellar navigatsiyasi ----------
    function buildNav() {
        var host = document.querySelector('.model-nav');
        if (!host) return;
        var cur = currentFile();
        var html = '<span class="model-nav__label">Boshqa modellar:</span>';
        MODELS.forEach(function (m) {
            if (m.file === cur) return;
            html += '<a class="model-nav__item" href="' + m.file + '">' +
                    '<span aria-hidden="true">' + m.icon + '</span> ' + m.name + '</a>';
        });
        host.innerHTML = html;
    }

    // ---------- 2) Klaviatura yorliqlari ----------
    // Sahifa o'z funksiyalarini window.modelControls orqali e'lon qiladi:
    //   window.modelControls = { start: fn, pause: fn, reset: fn };
    function initKeyboard() {
        document.addEventListener('keydown', function (e) {
            var t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            var c = window.modelControls;
            if (!c) return;

            if (e.code === 'Space') {
                e.preventDefault();
                // Boshlash/pauza almashadi
                if (window.modelIsRunning && window.modelIsRunning()) {
                    if (c.pause) c.pause();
                } else if (c.start) {
                    c.start();
                }
            } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
                if (c.reset) { e.preventDefault(); c.reset(); }
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ы') {
                if (window.labLog) { e.preventDefault(); window.labLog.capture(); }
            }
        });
    }

    // ---------- 3) Laboratoriya jurnali ----------
    // Sahifa o'lchov manbasini e'lon qiladi:
    //   window.labFields = [{ key: 'L', label: "Uzunlik (m)", get: fn }, ...]
    function initLabLog() {
        var host = document.querySelector('.lab-log');
        if (!host || !window.labFields || !window.labFields.length) return;

        var rows = [];
        var fields = window.labFields;

        host.innerHTML =
            '<div class="lab-log__head">' +
              '<h3>📋 Laboratoriya jurnali</h3>' +
              '<span class="lab-log__hint">O\'lchovlarni yozib boring va tahlil qiling</span>' +
            '</div>' +
            '<div class="lab-log__actions">' +
              '<button type="button" class="lab-btn lab-btn--main" id="labCapture">➕ O\'lchovni yozish</button>' +
              '<button type="button" class="lab-btn" id="labCopy">📄 Nusxalash</button>' +
              '<button type="button" class="lab-btn" id="labClear">🗑️ Tozalash</button>' +
            '</div>' +
            '<div class="lab-log__wrap"><table class="lab-table"><thead><tr>' +
              '<th>#</th>' + fields.map(function (f) { return '<th>' + f.label + '</th>'; }).join('') +
            '</tr></thead><tbody id="labBody"></tbody></table></div>' +
            '<p class="lab-log__empty" id="labEmpty">Hali o\'lchov yozilmagan. Tajribani o\'tkazing va ' +
              '<strong>«O\'lchovni yozish»</strong> tugmasini bosing (yoki <kbd>S</kbd> tugmasi).</p>';

        var body = host.querySelector('#labBody');
        var empty = host.querySelector('#labEmpty');

        function render() {
            body.innerHTML = rows.map(function (r, i) {
                return '<tr><td>' + (i + 1) + '</td>' +
                       r.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>';
            }).join('');
            empty.style.display = rows.length ? 'none' : '';
        }

        function capture() {
            if (rows.length >= 30) return; // jurnal cheksiz o'smasin
            rows.push(fields.map(function (f) {
                try { return f.get(); } catch (e) { return '-'; }
            }));
            render();
            // Oxirgi qatorni ko'rsatish
            var wrap = host.querySelector('.lab-log__wrap');
            if (wrap) wrap.scrollTop = wrap.scrollHeight;
        }

        host.querySelector('#labCapture').onclick = capture;

        host.querySelector('#labClear').onclick = function () {
            rows = [];
            render();
        };

        host.querySelector('#labCopy').onclick = function () {
            var head = ['#'].concat(fields.map(function (f) { return f.label; })).join('\t');
            var text = [head].concat(rows.map(function (r, i) {
                return [i + 1].concat(r).join('\t');
            })).join('\n');
            var btn = this;
            var done = function () {
                var old = btn.textContent;
                btn.textContent = '✓ Nusxalandi';
                setTimeout(function () { btn.textContent = old; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
            } else {
                fallbackCopy(text, done);
            }
        };

        function fallbackCopy(text, done) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(ta);
        }

        window.labLog = { capture: capture };
        render();
    }

    // ---------- Ishga tushirish ----------
    function boot() {
        buildNav();
        initKeyboard();
        initLabLog();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
