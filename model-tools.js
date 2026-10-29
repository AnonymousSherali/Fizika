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
        { file: 'induksiya_model.html',     icon: '🧲', name: 'Induksiya' },
        { file: 'prujinali_mayatnik_model.html', icon: '🌀', name: 'Prujinali mayatnik' },
        { file: 'otilgan_jism_model.html',  icon: '🎯', name: 'Otilgan jism' },
        { file: 'gaz_qonunlari_model.html', icon: '🎈', name: 'Gaz qonunlari' },
        { file: 'kondensator_model.html',   icon: '🔋', name: 'Kondensator' },
        { file: 'impuls_model.html',        icon: '🎱', name: 'Impuls' },
        { file: 'yoruglik_sinishi_model.html', icon: '🌈', name: 'Yorug\'lik sinishi' },
        { file: 'linza_model.html',         icon: '🔍', name: 'Linza' },
        { file: 'fotoeffekt_model.html',    icon: '💡', name: 'Fotoeffekt' },
        { file: 'radioaktiv_yemirilish_model.html', icon: '☢️', name: 'Radioaktiv yemirilish' }
    ];

    // Simulyatsiya sahifasi uslubi — darhol (sahifa chizilishidan oldin) qo'llanadi
    if (document.body && document.querySelector('.canvas-section')) document.body.classList.add('sim-page');

    // ---------- Pastki navigatsiya paneli ----------
    function buildSimBar() {
        if (!document.body.classList.contains('sim-page') || document.querySelector('.sim-bar')) return;
        var cur = currentFile();
        var idx = -1;
        MODELS.forEach(function (m, i) { if (m.file === cur) idx = i; });
        var h1 = document.querySelector('.header h1');
        var title = h1 ? h1.textContent.trim() : document.title;
        var prev = idx > -1 ? MODELS[(idx - 1 + MODELS.length) % MODELS.length] : null;
        var next = idx > -1 ? MODELS[(idx + 1) % MODELS.length] : null;
        var bar = document.createElement('nav');
        bar.className = 'sim-bar';
        bar.setAttribute('aria-label', 'Simulyatsiya navigatsiyasi');
        bar.innerHTML =
            '<a class="sim-bar__home" href="../index.html#modellar" title="Bosh sahifa" aria-label="Bosh sahifa">🏠</a>' +
            '<span class="sim-bar__title">' + title + '</span>' +
            (prev ? '<a href="' + prev.file + '" title="' + prev.name + '" aria-label="Oldingi model">‹ <span class="sim-bar__txt">Oldingi</span></a>' : '') +
            (next ? '<a href="' + next.file + '" title="' + next.name + '" aria-label="Keyingi model"><span class="sim-bar__txt">Keyingi</span> ›</a>' : '') +
            '<span class="sim-bar__brand"><img src="../img/icons/icon-192.png" alt="" width="26" height="26">Fizika 10–11</span>';
        document.body.appendChild(bar);
    }

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
        // Fokus qanday olingan: sichqoncha/sensor bilanmi yoki Tab bilanmi.
        // (:focus-visible bu yerda ishonchsiz — Chrome tugma bosilgan zahoti uni yoqadi)
        var pointerFocus = false;
        document.addEventListener('pointerdown', function () { pointerFocus = true; }, true);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') pointerFocus = false;
        }, true);

        document.addEventListener('keydown', function (e) {
            // Brauzer yorliqlari (Ctrl+R yangilash, Ctrl+S, Cmd+C ...) ga aralashmaymiz
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            var t = e.target;
            // Slayder (range) istisno: Space/R/S unda hech narsa qilmaydi, aks holda
            // slayderni surgandan keyin yorliqlar "o'lib" qolardi
            if (t && ((t.tagName === 'INPUT' && t.type !== 'range') || t.tagName === 'TEXTAREA' ||
                      t.tagName === 'SELECT' || t.isContentEditable)) return;
            var c = window.modelControls;
            if (!c) return;

            if (e.code === 'Space') {
                // Klaviatura bilan (Tab orqali) fokuslangan tugma bo'lsa, Space o'sha
                // tugmani bossin. Sichqoncha bilan bosilgandan keyin fokus tugmada qoladi,
                // lekin :focus-visible bo'lmaydi — bu holda Space boshlash/pauza qiladi.
                var ctl = t && t.closest && t.closest('button, a, summary, [role="button"], [role="radio"], [role="tab"]');
                if (ctl) {
                    // Tab bilan kelingan bo'lsa — Space o'sha tugmani bosadi (standart xulq)
                    if (!pointerFocus) return;
                    // Sichqoncha bilan bosilgan tugmada fokus qolgan: uni olib qo'yamiz,
                    // aks holda Space'ning keyup'i "Boshlash"ni qayta bosib, pauzani bekor qilardi
                    ctl.blur();
                }
                e.preventDefault();
                if (e.repeat) return;
                if (window.modelIsRunning && window.modelIsRunning()) {
                    if (c.pause) c.pause();
                } else if (c.start) {
                    c.start();
                }
            } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
                if (c.reset && !e.repeat) { e.preventDefault(); c.reset(); }
            } else if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
                // Tugmani bosib turish jurnalni bir zumda to'ldirib yubormasin
                if (window.labLog && !e.repeat) { e.preventDefault(); window.labLog.capture(); }
            }
        });
    }

    // Klaviatura yordamini har bir model paneliga avtomatik qo'shamiz
    function addKbdHint() {
        var c = window.modelControls;
        if (!c || document.querySelector('.kbd-hint')) return;
        var anchor = document.querySelector('.controls .stats');
        if (!anchor) return;
        var p = document.createElement('p');
        p.className = 'kbd-hint';
        var items = ['<kbd>Space</kbd> boshlash/pauza'];
        if (c.reset) items.push('<kbd>R</kbd> qayta');
        if (window.labFields) items.push('<kbd>S</kbd> o\'lchovni yozish');
        p.innerHTML = items.map(function (x) { return '<span>' + x + '</span>'; }).join('');
        anchor.parentNode.insertBefore(p, anchor);
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
              '<button type="button" class="lab-btn" id="labCsv">⬇️ CSV (Excel)</button>' +
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
            listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
        }
        var listeners = [];

        var LIMIT = 30;
        function capture() {
            // Sahifa hozir o'lchov olish mumkin emasligini aytishi mumkin (masalan boshqa tab)
            // Jurnal hozir ko'rinmayotgan bo'limda bo'lsa (kepler 2-3 bo'lim) — yozmaymiz
            if (window.labCanCapture && !window.labCanCapture()) return;
            if (rows.length >= LIMIT) {
                flash('Jurnal to\'ldi (' + LIMIT + ' ta) — nusxalab, keyin tozalang');
                return;
            }
            rows.push(fields.map(function (f) {
                try { return f.get(); } catch (e) { return '-'; }
            }));
            render();
            // Oxirgi qatorni ko'rsatish
            var wrap = host.querySelector('.lab-log__wrap');
            if (wrap) wrap.scrollTop = wrap.scrollHeight;
        }

        // Qisqa xabar (jurnal to'lganda va h.k.) — jim qaytish o'rniga
        function flash(msg) {
            empty.textContent = '⚠️ ' + msg;
            empty.style.display = '';
            clearTimeout(flash._t);
            flash._t = setTimeout(function () {
                empty.innerHTML = emptyHtml;
                render();
            }, 2200);
        }
        var emptyHtml = empty.innerHTML;

        host.querySelector('#labCapture').onclick = capture;

        host.querySelector('#labClear').onclick = function () {
            rows = [];
            // "Jurnal to'ldi" ogohlantirishi bo'sh jadval ustida qolib ketmasin
            clearTimeout(flash._t);
            empty.innerHTML = emptyHtml;
            render();
        };

        host.querySelector('#labCopy').onclick = function () {
            var head = ['#'].concat(fields.map(function (f) { return f.label; })).join('\t');
            var text = [head].concat(rows.map(function (r, i) {
                return [i + 1].concat(r).join('\t');
            })).join('\n');
            var btn = this;
            // Asl yozuv bir marta saqlanadi: tez ikki marta bosilsa ham
            // tugma "✓ Nusxalandi" holatida qotib qolmaydi
            if (!btn.dataset.label) btn.dataset.label = btn.textContent;
            var done = function () {
                btn.textContent = '✓ Nusxalandi';
                clearTimeout(btn._t);
                btn._t = setTimeout(function () { btn.textContent = btn.dataset.label; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
            } else {
                fallbackCopy(text, done);
            }
        };

        // CSV fayl: ";" ajratuvchi va o'nli vergul — rus/o'zbek tilidagi Excel shu
        // formatni to'g'ridan-to'g'ri ustunlarga ajratadi. BOM — kirill/lotin harflar
        // (o', Φ, Ω) buzilmasligi uchun.
        host.querySelector('#labCsv').onclick = function () {
            if (!rows.length) { flash('Avval kamida bitta o\'lchov yozing'); return; }
            function cell(v) {
                var t = String(v);
                // Son (yoki "6.0" kabi son-matn) bo'lsa o'nli nuqta vergulga almashadi
                if (/^[-+]?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(t)) t = t.replace('.', ',');
                return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
            }
            var lines = [['#'].concat(fields.map(function (f) { return f.label; })).map(cell).join(';')];
            rows.forEach(function (r, i) { lines.push([i + 1].concat(r).map(cell).join(';')); });
            var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
            var a = document.createElement('a');
            var d = new Date();
            var stamp = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
            a.href = URL.createObjectURL(blob);
            a.download = (currentFile().replace(/_model\.html$|\.html$/, '') || 'jurnal') + '_jurnal_' + stamp + '.csv';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
        };

        function fallbackCopy(text, done) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) {}
            if (ok) done();
            else window.prompt('Nusxalab bo\'lmadi. Matnni qo\'lda nusxalang (Ctrl+C):', text);
            document.body.removeChild(ta);
        }

        window.labLog = {
            capture: capture,
            fields: fields,
            rows: function () { return rows; },
            onChange: function (fn) { listeners.push(fn); }
        };
        render();
    }

    // ---------- Jurnal uchun yordamchi ----------
    // "4.7 MeV" -> 4.7 : ustun sarlavhasida birlik bor, katakda faqat son bo'lsin
    // (Excel'ga nusxalanganda son sifatida o'qiladi). O'lchov yo'q bo'lsa "—".
    window.labNum = function (id) {
        var el = document.getElementById(id);
        if (!el) return '—';
        var v = parseFloat(String(el.textContent).replace(',', '.').replace('+', ''));
        return isNaN(v) ? '—' : v;
    };

    // ---------- Slayderning to'ldirilgan qismi ----------
    // Trekning chap qismi (min..qiymat) rang bilan bo'yaladi: --fill CSS o'zgaruvchisi.
    // Qiymat dasturiy o'zgarganda (masalan "Qayta" tugmasi) input hodisasi bo'lmaydi,
    // shuning uchun har bir bosishdan keyin ham sinxronlaymiz.
    function initSliderFill() {
        var sliders = document.querySelectorAll('input[type="range"]');
        if (!sliders.length) return;
        function paint(s) {
            var min = parseFloat(s.min) || 0;
            var max = s.max === '' ? 100 : parseFloat(s.max);
            var pct = max > min ? (parseFloat(s.value) - min) / (max - min) * 100 : 0;
            s.style.setProperty('--fill', Math.max(0, Math.min(100, pct)) + '%');
        }
        function paintAll() { sliders.forEach(paint); }
        sliders.forEach(function (s) {
            s.addEventListener('input', function () { paint(s); });
            s.addEventListener('change', function () { paint(s); });
        });
        document.addEventListener('click', function () { setTimeout(paintAll, 0); });
        document.addEventListener('keyup', function () { setTimeout(paintAll, 0); });
        paintAll();
    }

    // ---------- Kanvas ekranda qolishi (katta ekran) ----------
    // Boshqaruv paneli uzun bo'lsa ham model ko'rinib tursin. Faqat kanvas bloki
    // oynaga to'liq sig'ganda yopishtiramiz — aks holda pastki qismi yetib bo'lmay qoladi.
    function initStickyCanvas() {
        var sections = document.querySelectorAll('.canvas-section');
        if (!sections.length) return;
        function sync() {
            var wide = window.innerWidth > 1024;
            sections.forEach(function (sec) {
                var h = sec.offsetHeight;
                sec.classList.toggle('is-sticky', wide && h > 0 && h < window.innerHeight - 32);
            });
            clamp();
        }
        // Chromium grid elementida sticky chegarasini grid qatori emas, butun grid
        // bo'yicha oladi — kanvas pastdagi jurnal ustiga chiqib qolardi. Shuning uchun
        // "top" ni qo'lda cheklaymiz: kanvas qator (boshqaruv paneli) oxiridan pastga tushmasin.
        var ticking = false;
        function clamp() {
            ticking = false;
            sections.forEach(function (sec) {
                if (!sec.classList.contains('is-sticky')) { sec.style.top = ''; return; }
                var rowEnd = 0;
                Array.prototype.forEach.call(sec.parentNode.children, function (el) {
                    var cs = getComputedStyle(el);
                    if (el !== sec && cs.gridColumnStart !== '1' && el.offsetHeight) {
                        rowEnd = Math.max(rowEnd, el.getBoundingClientRect().bottom);
                    }
                });
                if (!rowEnd) return;
                sec.style.top = Math.min(16, rowEnd - sec.offsetHeight) + 'px';
            });
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(clamp); }
        }, { passive: true });
        window.addEventListener('resize', sync);
        if ('ResizeObserver' in window) {
            var ro = new ResizeObserver(sync);
            sections.forEach(function (sec) { ro.observe(sec); });
        }
        sync();
    }

    // ---------- Jurnal grafigi va chiziqli tahlil ----------
    // Har bir model uchun tavsiya etilgan o'qlar: ustun sarlavhasining boshlanishi bo'yicha.
    // xp/yp — daraja (2: kvadrat, -1: teskari, 0.5: ildiz). hint(k, b) — qiyalikdan nima topiladi.
    var GRAPH_PRESETS = {
        'mayatnik_model.html': { x: 'L', y: 'T nazariy', yp: 2,
            hint: function (k) { return 'T² = (4π²/g)·L → g = 4π²/k ≈ ' + fx(4 * Math.PI * Math.PI / k, 2) + ' m/s²'; } },
        'prujinali_mayatnik_model.html': { x: 'm', y: "T o'lch", yp: 2,
            hint: function (k) { return 'T² = (4π²/k_p)·m → k_p = 4π²/qiyalik ≈ ' + fx(4 * Math.PI * Math.PI / k, 1) + ' N/m (bikrlik bir xil bo\'lsa)'; } },
        'om_qonuni_model.html': { x: 'U', y: 'I',
            hint: function (k) { return 'I = U/R → R = 1/qiyalik ≈ ' + fx(1 / k, 1) + ' Ω (R o\'zgarmas bo\'lsa)'; } },
        'gaz_qonunlari_model.html': { x: 'V', xp: -1, y: 'p',
            hint: function (k) { return 'Izotermik jarayonda p = (pV)·(1/V) → pV = qiyalik ≈ ' + fx(k, 1) + ' J'; } },
        'kondensator_model.html': { x: 'd', xp: -1, y: 'C',
            hint: function (k) { return 'C = εε₀S·(1/d) → qiyalik = εε₀S (pF·mm) ≈ ' + fx(k, 1); } },
        'induksiya_model.html': { x: 'N', y: 'Maks',
            hint: function () { return 'Tezlik bir xil bo\'lsa EYK o\'ramlar soniga proporsional (b ≈ 0)'; } },
        'qiya_tekislik_model.html': { x: 'α', y: 'FIK' },
        'otilgan_jism_model.html': { x: 'α', y: "L o'lch" },
        'rezerford_model.html': { x: 'v', y: 'r_min' },
        'kepler_model.html': { x: 'a', xp: 3, y: 'T²/a³' },
        'impuls_model.html': { x: 'p (', y: 'p′',
            hint: function (k) { return 'p′ = p bo\'lsa qiyalik 1 bo\'ladi: hozir ' + fx(k, 3) + ' — impuls saqlanadi'; } },
        'yoruglik_sinishi_model.html': { x: 'sinβ', y: 'sinα',
            hint: function (k) { return 'n₁·sinα = n₂·sinβ → n₂/n₁ = qiyalik ≈ ' + fx(k, 3); } },
        'fotoeffekt_model.html': { x: 'U', y: "I o'lch" },
        'radioaktiv_yemirilish_model.html': { x: 't (s)', y: 'N',
            hint: function () { return 'Y o\'qini ln N qilib bo\'lmaydi — lekin N har T½ da 2 marta kamayishini jadvaldan tekshiring'; } },
        'linza_model.html': { x: 'd', xp: -1, y: 'f', yp: -1,
            hint: function (k, b) { return '1/f = −1/d + 1/F → qiyalik ≈ −1, kesishma 1/F ≈ ' + fx(b, 4) + ' 1/cm → F ≈ ' + fx(1 / b, 1) + ' cm'; } }
    };
    var POWS = [[1, 'x'], [2, 'x²'], [3, 'x³'], [0.5, '√x'], [-1, '1/x']];

    function fx(v, d) { return isFinite(v) ? Number(v).toFixed(d) : '—'; }
    function num(v) {
        var n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
        return isFinite(n) ? n : NaN;
    }
    function powf(v, p) { return p === 1 ? v : p === -1 ? 1 / v : p === 0.5 ? Math.sqrt(v) : Math.pow(v, p); }

    // Eng kichik kvadratlar usuli: y = k·x + b, R²
    function linfit(pts) {
        var n = pts.length;
        if (n < 2) return null;
        var sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
        pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; syy += p[1] * p[1]; });
        var den = n * sxx - sx * sx;
        if (Math.abs(den) < 1e-12) return null;
        var k = (n * sxy - sx * sy) / den, b = (sy - k * sx) / n;
        var ssTot = syy - sy * sy / n, ssRes = 0;
        pts.forEach(function (p) { var e = p[1] - (k * p[0] + b); ssRes += e * e; });
        return { k: k, b: b, r2: ssTot > 1e-12 ? 1 - ssRes / ssTot : 1 };
    }

    function niceTicks(lo, hi, n) {
        var span = hi - lo || Math.abs(hi) || 1;
        var step = Math.pow(10, Math.floor(Math.log10(span / n)));
        var m = span / n / step;
        step *= m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10;
        var t = [], v = Math.ceil(lo / step) * step;
        for (; v <= hi + step * 1e-6; v += step) t.push(+v.toPrecision(12));
        return t;
    }

    function initLabGraph() {
        var host = document.querySelector('.lab-log');
        var log = window.labLog;
        if (!host || !log) return;
        var fields = log.fields;
        var preset = GRAPH_PRESETS[currentFile()] || {};
        function findCol(prefix, fallback) {
            if (prefix) for (var i = 0; i < fields.length; i++) {
                if (fields[i].label.indexOf(prefix) === 0) return i;
            }
            return fallback;
        }
        var opts = fields.map(function (f, i) { return '<option value="' + i + '">' + f.label + '</option>'; }).join('');
        var powOpts = POWS.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
        var box = document.createElement('div');
        box.className = 'lab-graph';
        box.innerHTML =
            '<div class="lab-graph__head"><h4>📈 Grafik va chiziqli tahlil</h4>' +
              '<span class="lab-log__hint">Jurnaldagi o\'lchovlar bo\'yicha — eng kichik kvadratlar usuli</span></div>' +
            '<div class="lab-graph__ctrl">' +
              '<label>Y: <select id="gY" aria-label="Y o\'qi ustuni">' + opts + '</select></label>' +
              '<select id="gYp" aria-label="Y darajasi">' + powOpts.replace(/>x/g, '>y') + '</select>' +
              '<label>X: <select id="gX" aria-label="X o\'qi ustuni">' + opts + '</select></label>' +
              '<select id="gXp" aria-label="X darajasi">' + powOpts + '</select>' +
            '</div>' +
            '<canvas id="labGraph" width="720" height="300" role="img" aria-label="Jurnal grafigi"></canvas>' +
            '<p class="lab-graph__fit" id="gFit"></p>';
        host.appendChild(box);
        var sx = box.querySelector('#gX'), sy = box.querySelector('#gY');
        var sxp = box.querySelector('#gXp'), syp = box.querySelector('#gYp');
        sx.value = findCol(preset.x, 0);
        sy.value = findCol(preset.y, Math.min(fields.length - 1, 1));
        sxp.value = String(preset.xp || 1);
        syp.value = String(preset.yp || 1);
        var canvas = box.querySelector('#labGraph');
        var fitEl = box.querySelector('#gFit');

        function axisName(sel, psel, letter) {
            var lab = fields[+sel.value].label, p = +psel.value;
            return p === 1 ? lab : (p === -1 ? '1/' + lab : p === 0.5 ? '√' + lab : lab + (p === 2 ? '²' : '³'));
        }
        function points() {
            var xi = +sx.value, yi = +sy.value, xp = +sxp.value, yp = +syp.value;
            var pts = [];
            log.rows().forEach(function (r) {
                var x = powf(num(r[xi]), xp), y = powf(num(r[yi]), yp);
                if (isFinite(x) && isFinite(y)) pts.push([x, y]);
            });
            return pts;
        }
        // light=true — hisobot (chop etish) uchun har doim oq fonda
        function draw(ctx, W, H, light) {
            var dark = !light && window.isDarkTheme && window.isDarkTheme();
            var C = dark ? { bg: '#151a26', grid: '#2a3242', axis: '#94a3b8', text: '#cbd5e1', pt: '#a5b4fc', line: '#f472b6' }
                         : { bg: '#ffffff', grid: '#e5e7eb', axis: '#475569', text: '#334155', pt: '#4338ca', line: '#db2777' };
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
            var pts = points(), fit = linfit(pts);
            ctx.font = '13px ' + getComputedStyle(document.body).fontFamily;
            if (pts.length === 0) {
                ctx.fillStyle = C.text; ctx.textAlign = 'center';
                ctx.fillText('Grafik uchun jurnalga kamida 2 ta o\'lchov yozing (S tugmasi)', W / 2, H / 2);
                return { pts: pts, fit: null };
            }
            var L = 64, Rm = 18, T = 16, B = 46;
            var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
            var x0 = Math.min.apply(null, xs.concat(0)), x1 = Math.max.apply(null, xs);
            var y0 = Math.min.apply(null, ys.concat(0)), y1 = Math.max.apply(null, ys);
            if (x1 === x0) x1 = x0 + 1;
            if (y1 === y0) y1 = y0 + 1;
            x1 += (x1 - x0) * 0.08; y1 += (y1 - y0) * 0.1;
            var X = function (v) { return L + (v - x0) / (x1 - x0) * (W - L - Rm); };
            var Y = function (v) { return H - B - (v - y0) / (y1 - y0) * (H - T - B); };
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.text;
            ctx.textAlign = 'center';
            niceTicks(x0, x1, 6).forEach(function (t) {
                ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), H - B); ctx.stroke();
                ctx.fillText(+t.toPrecision(4), X(t), H - B + 16);
            });
            ctx.textAlign = 'right';
            niceTicks(y0, y1, 5).forEach(function (t) {
                ctx.beginPath(); ctx.moveTo(L, Y(t)); ctx.lineTo(W - Rm, Y(t)); ctx.stroke();
                ctx.fillText(+t.toPrecision(4), L - 6, Y(t) + 4);
            });
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, H - B); ctx.lineTo(W - Rm, H - B); ctx.stroke();
            ctx.textAlign = 'center'; ctx.font = '600 13px ' + getComputedStyle(document.body).fontFamily;
            ctx.fillText(axisName(sx, sxp), (L + W - Rm) / 2, H - 8);
            ctx.save(); ctx.translate(14, (T + H - B) / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText(axisName(sy, syp), 0, 0); ctx.restore();
            if (fit) {
                ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
                ctx.beginPath(); ctx.moveTo(X(x0), Y(fit.k * x0 + fit.b)); ctx.lineTo(X(x1), Y(fit.k * x1 + fit.b)); ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.fillStyle = C.pt;
            pts.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4.5, 0, Math.PI * 2); ctx.fill(); });
            return { pts: pts, fit: fit };
        }
        function fitText(res) {
            if (!res.fit) return res.pts.length < 2 ? '' : 'X qiymatlari bir xil — chiziq o\'tkazib bo\'lmaydi. X ni o\'zgartirib o\'lchang.';
            var f = res.fit;
            // Yaxlitlash shovqini (4.4e-16) o'rniga 0 ko'rsatamiz
            var scale = Math.max.apply(null, res.pts.map(function (p) { return Math.abs(p[1]); }).concat(1e-300));
            if (Math.abs(f.b) < scale * 1e-9) f.b = 0;
            var t = 'Y = ' + f.k.toPrecision(4) + '·X ' + (f.b < 0 ? '− ' : '+ ') + Math.abs(f.b).toPrecision(3) +
                    ' &nbsp;·&nbsp; R² = ' + f.r2.toFixed(4) + ' &nbsp;·&nbsp; ' + res.pts.length + ' ta nuqta';
            var isPreset = preset.hint && +sx.value === findCol(preset.x, -1) && +sy.value === findCol(preset.y, -1) &&
                           +sxp.value === (preset.xp || 1) && +syp.value === (preset.yp || 1);
            if (isPreset) t += '<br>💡 ' + preset.hint(f.k, f.b);
            if (f.r2 < 0.98 && res.pts.length > 2) t += '<br>ℹ️ R² &lt; 0.98 — bog\'lanish chiziqli emas yoki boshqa kattalik ham o\'zgargan.';
            return t;
        }
        function redraw() {
            var ctx = canvas.getContext('2d');
            fitEl.innerHTML = fitText(draw(ctx, canvas.width, canvas.height, false));
        }
        [sx, sy, sxp, syp].forEach(function (el) { el.addEventListener('change', redraw); });
        log.onChange(redraw);
        window.addEventListener('fizika:theme', redraw);
        log.graph = {
            image: function () {
                var c = document.createElement('canvas');
                c.width = 720; c.height = 300;
                var res = draw(c.getContext('2d'), 720, 300, true);
                return { url: res.pts.length ? c.toDataURL('image/png') : '', text: fitText(res),
                         title: axisName(sy, syp) + ' ning ' + axisName(sx, sxp) + ' ga bog\'liqligi' };
            }
        };
        redraw();
    }

    // ---------- Hisobot (chop etish / PDF) ----------
    function initReport() {
        var host = document.querySelector('.lab-log');
        var log = window.labLog;
        if (!host || !log) return;
        var actions = host.querySelector('.lab-log__actions');
        var who = document.createElement('div');
        who.className = 'lab-who';
        who.innerHTML =
            '<input type="text" id="labName" placeholder="O\'quvchi F.I.Sh." aria-label="O\'quvchi familiyasi va ismi" autocomplete="name">' +
            '<input type="text" id="labClass" placeholder="Sinf (masalan 10-A)" aria-label="Sinf">' +
            '<button type="button" class="lab-btn" id="labPrint">🖨️ Hisobot (PDF)</button>';
        actions.parentNode.insertBefore(who, actions.nextSibling);
        var nameEl = who.querySelector('#labName'), clsEl = who.querySelector('#labClass');
        try {
            nameEl.value = localStorage.getItem('fizika-name') || '';
            clsEl.value = localStorage.getItem('fizika-class') || '';
        } catch (e) {}
        function save() {
            try {
                localStorage.setItem('fizika-name', nameEl.value);
                localStorage.setItem('fizika-class', clsEl.value);
            } catch (e) {}
        }
        nameEl.addEventListener('change', save);
        clsEl.addEventListener('change', save);

        function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

        who.querySelector('#labPrint').onclick = function () {
            var rows = log.rows();
            var title = (document.querySelector('.header h1') || { textContent: document.title }).textContent.trim();
            var d = new Date();
            var date = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
            var task = document.querySelector('.task-card ol');
            var g = log.graph ? log.graph.image() : { url: '' };
            var table = '<table><thead><tr><th>#</th>' + log.fields.map(function (f) { return '<th>' + esc(f.label) + '</th>'; }).join('') +
                '</tr></thead><tbody>' + (rows.length ? rows.map(function (r, i) {
                    return '<tr><td>' + (i + 1) + '</td>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
                }).join('') : '<tr><td colspan="' + (log.fields.length + 1) + '">O\'lchovlar yo\'q</td></tr>') + '</tbody></table>';
            var rep = document.getElementById('printReport') || document.createElement('div');
            rep.id = 'printReport';
            rep.innerHTML =
                '<h1>Laboratoriya ishi hisoboti</h1>' +
                '<p class="rep-sub">' + esc(title) + '</p>' +
                '<table class="rep-meta"><tr><td><b>O\'quvchi:</b> ' + (esc(nameEl.value) || '______________________') +
                '</td><td><b>Sinf:</b> ' + (esc(clsEl.value) || '________') + '</td><td><b>Sana:</b> ' + date + '</td></tr></table>' +
                (task ? '<h2>Topshiriq</h2><ol>' + task.innerHTML + '</ol>' : '') +
                '<h2>O\'lchov natijalari</h2>' + table +
                (g.url ? '<h2>Grafik: ' + esc(g.title) + '</h2><img src="' + g.url + '" alt=""><p>' + g.text + '</p>' : '') +
                '<h2>Xulosa</h2><div class="rep-lines"></div>' +
                '<p class="rep-foot">O\'qituvchi imzosi: ____________ &nbsp;&nbsp; Baho: ______</p>';
            document.body.appendChild(rep);
            document.body.classList.add('print-report');
            var done = function () {
                document.body.classList.remove('print-report');
                window.removeEventListener('afterprint', done);
            };
            window.addEventListener('afterprint', done);
            // Rasm yuklanib bo'lgach chop etamiz
            setTimeout(function () { window.print(); }, 60);
        };
    }

    // ---------- O'qituvchi rejimi: kutilgan natijalar ----------
    // Yoqish: sahifa manziliga ?oqituvchi=1 qo'shing (bir marta — eslab qolinadi);
    // o'chirish: ?oqituvchi=0 yoki kutilgan natijalar blokidagi «Yashirish».
    var TEACHER = {
        'mayatnik_model.html': [
            'L = 1.00 m, θ = 10°: T ≈ 2.006 s, g o\'lch. ≈ 9.77 m/s² (xatolik ≈ 0.4%)',
            'L = 0.5 / 1.5 / 2 m: T ≈ 1.419 / 2.457 / 2.837 s — g har safar ≈ 9.8 m/s²',
            'θ = 20°: xatolik ≈ 1.5%; θ = 45°: ≈ 7.5%; θ = 60°: ≈ 13% (g ≈ 8.5 m/s²) — T = 2π√(L/g) faqat kichik burchakda aniq',
            'Grafik: T² ning L ga bog\'liqligi to\'g\'ri chiziq, qiyalik 4π²/g ≈ 4.02 s²/m'],
        'prujinali_mayatnik_model.html': [
            'm = 0.5 kg, k = 20 N/m: T ≈ 0.993 s',
            'm = 1 kg: T ≈ 1.405 s (√2 marta); k = 80 N/m, m = 0.5 kg: T ≈ 0.497 s (2 marta kam)',
            'Amplituda davrga ta\'sir qilmaydi (garmonik tebranish)',
            'b > 0 da to\'liq energiya E eksponensial kamayadi, davr juda oz ortadi'],
        'qiya_tekislik_model.html': [
            'μ = 0.20: FIK = sinα / (sinα + μ·cosα)',
            'α = 15°: ≈ 57.3%; 25°: ≈ 70.0%; 35°: ≈ 77.8%; 45°: ≈ 83.3% — burchak ortsa FIK ortadi',
            'Massa FIK ga ta\'sir qilmaydi: foydali ish ham, ishqalanish ishi ham m ga proporsional'],
        'om_qonuni_model.html': [
            'U = 6 V, R = 10 Ω: I = 0.60 A, P = 3.6 W',
            'U = 12 V: I = 1.20 A (2 marta), P = 14.4 W (4 marta — ogohlantirish chiqadi)',
            'U = 6 V, R = 20 Ω: I = 0.30 A (2 marta kam)',
            'Grafik: I(U) to\'g\'ri chiziq, qiyalik 1/R'],
        'induksiya_model.html': [
            'Maks. |EYK| tezlikka taxminan proporsional: 0.5x → 2x da ≈ 4 marta ortadi',
            'N = 10 → 25: EYK ≈ 2.5 marta ortadi (ε = −N·ΔΦ/Δt)',
            'Magnit to\'xtasa ΔΦ/Δt = 0 → EYK = 0, galvanometr nolni ko\'rsatadi'],
        'rezerford_model.html': [
            'v = 1.0·10⁷ m/s: E ≈ 2.07 MeV, r_min ≈ 110 fm',
            'v = 3.0·10⁷ m/s: E 9 marta katta, r_min ≈ 12.2 fm (9 marta kichik, r_min ∝ 1/v²)',
            'Tez zarralar kamroq og\'adi — sochilish foizi kamayadi'],
        'kepler_model.html': [
            'Yer: perigeliy ≈ 0.983 AU, afeliy ≈ 1.017 AU; Mars: ≈ 1.38 / 1.66 AU',
            'e ortganda orbita cho\'ziladi, Quyosh fokus markazdan uzoqlashadi',
            '2-qonun: yuzalar nisbati ≈ 1.00',
            '3-qonun: barcha sayyoralarda T²/a³ ≈ 1 (yil²/AU³) — bitta markaziy jism (Quyosh) atrofida'],
        'otilgan_jism_model.html': [
            'v₀ = 20 m/s, h₀ = 0: L(30°) = L(60°) ≈ 35.31 m (sin60° = sin120°)',
            'Eng katta L: α = 45° da ≈ 40.77 m (40° va 50° da ≈ 40.16 m)',
            'H(30°) ≈ 5.10 m, H(60°) ≈ 15.29 m',
            'h₀ = 10 m: 40° da L ≈ 49.77 m, 45° da ≈ 49.08 m — eng qulay burchak ≈ 39°'],
        'gaz_qonunlari_model.html': [
            'Boshlang\'ich: V = 2.00 L, T = 300 K, p ≈ 62.3 kPa',
            'Izotermik V: 2 → 1 L: p ≈ 124.7 kPa (2 marta), pV ≈ 124.65 J o\'zgarmas',
            'Izobarik T: 300 → 600 K: V = 2 L (2 marta), V/T ≈ 3.333 mL/K',
            'Izoxorik T: 600 → 300 K: p 2 marta kamayadi, p/T ≈ 207.8 Pa/K — gaz boshlang\'ich holatga qaytadi'],
        'kondensator_model.html': [
            'S = 100 cm², d = 2 mm, havo, U = 20 V: C ≈ 44.25 pF, q ≈ 0.885 nC, E = 10 kV/m, W ≈ 8.85 nJ',
            'd = 4 mm (ulangan): C, q, E — 2 marta kam',
            'Shisha (ε = 7): C va q — 7 marta katta (≈ 309.8 pF, 6.2 nC)',
            'Uzilgan, d: 2 → 4 mm: q o\'zgarmas, U = 40 V (2 marta), E o\'zgarmas, W 2 marta ortadi — plastinkalarni ajratishda bajarilgan ish hisobiga'],
        'impuls_model.html': [
            'Elastik, m₁ = m₂ = 1 kg, v₁ = 2 m/s, v₂ = 0: tezliklar almashinadi (v₁′ = 0, v₂′ = 2 m/s)',
            'Noelastik, m₁ = m₂: umumiy tezlik 1 m/s, kinetik energiyaning yarmi issiqlikka aylanadi',
            'Elastik, m₁ = 1 kg, m₂ = 4 kg, v₁ = 2 m/s: v₁′ = −1.2 m/s (orqaga qaytadi), v₂′ = 0.8 m/s',
            'Qisman elastik, k = 0.5 (m₁ = m₂ = 1 kg, v₁ = 2): v₁′ = 0.5, v₂′ = 1.5 m/s, Q = 0.75 J',
            'Noelastik, v₁ = +2, v₂ = −2 m/s: aravachalar to\'xtaydi, p = 0, butun Eₖ = 4 J issiqlikka aylanadi',
            'Barcha holatlarda umumiy impuls saqlanadi (Δp = 0)'],
        'yoruglik_sinishi_model.html': [
            'Havo → shisha (n = 1.5): α = 30° → β ≈ 19.5°; 45° → ≈ 28.1°; 60° → ≈ 35.3°; sinα/sinβ = 1.5',
            'Impuls tezligi: v₁/v₂ = n₂/n₁ = 1.5 (havoda 3.00, shishada 2.00·10⁸ m/s)',
            'Shisha → havo: chegaraviy burchak α_kr = arcsin(1/1.5) ≈ 41.8°',
            'Suv → havo: α_kr ≈ 48.8°; olmos → havo: ≈ 24.4°'],
        'linza_model.html': [
            'F = 10 cm, d = 30 cm (3F): f = 15 cm, Γ = 0.5 — haqiqiy, teskari, kichiklashgan',
            'd = 20 cm (2F): f = 20 cm, Γ = 1 — haqiqiy, teskari, kattaligi teng',
            'd = 15 cm (1.5F): f = 30 cm, Γ = 2 — haqiqiy, teskari, kattalashgan',
            'd = 5 cm (0.5F): f = −10 cm, Γ = 2 — mavhum, to\'g\'ri, kattalashgan (lupa), ekranda tutib bo\'lmaydi',
            'Har qatorda 1/d + 1/f = 10 dptr; sochuvchi linza (F = −10 cm), d = 20 cm: f ≈ −6.67 cm'],
        'fotoeffekt_model.html': [
            'Sezyi (A ≈ 1.9 eV): λ_kr = hc/A ≈ 654 nm',
            'λ = 400 nm: hν ≈ 3.11 eV, E_k max ≈ 1.21 eV, to\'xtatuvchi kuchlanish ≈ 1.21 V',
            'Rux (A = 4.3 eV): 400 nm da fotoeffekt yo\'q (λ_kr ≈ 289 nm); 250 nm da U_t ≈ 0.67 V',
            'Yorug\'lik intensivligi tok kuchini o\'zgartiradi, lekin to\'xtatuvchi kuchlanishni emas'],
        'radioaktiv_yemirilish_model.html': [
            'N₀ = 400, T½ = 5 s: t = 5 / 10 / 15 s da N ≈ 200 / 100 / 50 (statistik tebranish ±√N, masalan ±10–14)',
            'N₀ = 100 da nisbiy tebranish kattaroq (≈ ±10%) — qonun statistik',
            'Har bir yadroning yemirilish vaqtini oldindan aytib bo\'lmaydi, lekin ko\'p yadrolar uchun N = N₀·2^(−t/T½)']
    };

    function initTeacherMode() {
        var on = false;
        try {
            var q = new URLSearchParams(location.search).get('oqituvchi');
            if (q === '1') localStorage.setItem('fizika-teacher', '1');
            if (q === '0') localStorage.removeItem('fizika-teacher');
            on = localStorage.getItem('fizika-teacher') === '1';
        } catch (e) {}
        var list = TEACHER[currentFile()];
        var card = document.querySelector('.task-card');
        if (!on || !list || !card) return;
        var box = document.createElement('div');
        box.className = 'teacher-box';
        box.innerHTML = '<div class="teacher-box__head"><strong>👩‍🏫 O\'qituvchi uchun: kutilgan natijalar</strong>' +
            '<button type="button" class="lab-btn" id="teacherOff">Yashirish</button></div>' +
            '<ul>' + list.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
            '<p class="hint-note">Taxminiy qiymatlar (g = 9.81 m/s²). O\'quvchilar ekraniga ko\'rsatmang. ' +
            'O\'chirish: <code>?oqituvchi=0</code></p>';
        card.parentNode.insertBefore(box, card.nextSibling);
        box.querySelector('#teacherOff').onclick = function () {
            try { localStorage.removeItem('fizika-teacher'); } catch (e) {}
            box.remove();
        };
    }

    // ---------- To'liq ekran (proyektor va telefon uchun) ----------
    function initFullscreen() {
        var el0 = document.documentElement;
        var req = el0.requestFullscreen || el0.webkitRequestFullscreen;
        if (!req) return;
        document.querySelectorAll('.canvas-section').forEach(function (sec) {
            if (!sec.querySelector('canvas')) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'fs-btn';
            b.title = 'To\'liq ekran';
            b.setAttribute('aria-label', 'Modelni to\'liq ekranda ochish');
            b.textContent = '⛶';
            b.onclick = function () {
                var cur = document.fullscreenElement || document.webkitFullscreenElement;
                if (cur) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                else (sec.requestFullscreen || sec.webkitRequestFullscreen).call(sec);
            };
            sec.appendChild(b);
        });
    }

    // ---------- Ishga tushirish ----------
    function boot() {
        buildNav();
        buildSimBar();
        initKeyboard();
        initLabLog();
        addKbdHint();
        initSliderFill();
        initStickyCanvas();
        initLabGraph();
        initReport();
        initTeacherMode();
        initFullscreen();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
