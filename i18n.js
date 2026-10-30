/* ============================================================
   i18n.js — interfeysni rus tiliga o'girish (ixtiyoriy)
   theme.js tanlangan til "ru" bo'lsa shu faylni va lug'atni
   (i18n-ru.js) yuklaydi. Sahifa HTML i o'zgarmaydi: matn tugunlari
   va placeholder/title/aria-label atributlari lug'at bo'yicha
   almashtiriladi. Keyin qo'shilgan elementlar (jurnal, natijalar)
   MutationObserver orqali tarjima qilinadi.
   Lug'atda yo'q matn o'zbekcha qoladi. Kalitdagi "{}" — o'zgaruvchan qism (andoza).
   ============================================================ */
(function () {
    'use strict';
    var DICT = window.FIZIKA_RU || {};
    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, KBD: 1, TEXTAREA: 1 };

    function norm(t) { return t.replace(/\s+/g, ' ').trim(); }

    // Andozalar: kalitda "{}" — o'zgaruvchan qism (son, ism, sana). Masalan
    // "Savol {} / {}": "Вопрос {} / {}". Ushlangan qism ham lug'atda bo'lsa tarjima qilinadi
    // ("Holat: {}" + "Qoralama" → "Статус: Черновик").
    var PATTERNS = [];
    Object.keys(DICT).forEach(function (k) {
        if (k.indexOf('{}') < 0) return;
        var parts = k.split('{}').map(function (x) { return x.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/[{}]/g, '\\$&'); });
        PATTERNS.push({ re: new RegExp('^' + parts.join('([\\s\\S]+?)') + '$'), to: DICT[k], lit: k.length });
    });
    PATTERNS.sort(function (a, b) { return b.lit - a.lit; });   // aniqroq (uzunroq) andoza oldin

    function exact(k) {
        var v = DICT[k];
        return v === undefined ? null : v;
    }
    function tr(text) {
        var k = norm(text);
        if (!k) return null;
        var v = exact(k);
        if (v !== null || !PATTERNS.length || !/[A-Za-z]/.test(k)) return v;
        for (var i = 0; i < PATTERNS.length; i++) {
            var m = PATTERNS[i].re.exec(k);
            if (!m) continue;
            var n = 1;
            return PATTERNS[i].to.replace(/\{\}/g, function () {
                var part = m[n++] || '';
                // Qism ham tarjima qilinadi (andoza bilan ham: "Kepler · Chuqur"); qism har doim qisqaroq — cheksiz takrorlanmaydi
                var t = part.length < k.length ? tr(part) : exact(part);
                return t === null ? part : t;
            });
        }
        return null;
    }

    function textNode(n) {
        var p = n.parentNode;
        if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-no-i18n]'))) return;
        var v = tr(n.nodeValue);
        if (v === null) return;
        // Bosh va oxiridagi bo'shliqlar saqlanadi (yonidagi <strong> bilan yopishmasin)
        var m = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
        var next = m[1] + v + m[2];
        if (n.nodeValue !== next) n.nodeValue = next;
    }

    function element(el) {
        for (var i = 0; i < ATTRS.length; i++) {
            var a = el.getAttribute && el.getAttribute(ATTRS[i]);
            if (a) {
                var v = tr(a);
                if (v !== null && v !== a) el.setAttribute(ATTRS[i], v);
            }
        }
    }

    function walk(root) {
        if (root.nodeType === 3) { textNode(root); return; }
        if (root.nodeType !== 1) return;
        element(root);   // textarea'ning ham placeholder'i tarjima qilinadi (ichki matni emas)
        if (SKIP[root.nodeName]) return;
        var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        var n;
        while ((n = w.nextNode())) {
            if (n.nodeType === 3) textNode(n); else element(n);
        }
    }

    function run() {
        document.documentElement.lang = 'ru';
        var t = tr(document.title);
        if (t) document.title = t;
        walk(document.body);
        var busy = false;
        new MutationObserver(function (list) {
            if (busy) return;
            busy = true;
            list.forEach(function (m) {
                if (m.type === 'characterData') textNode(m.target);
                else if (m.type === 'attributes') element(m.target);
                else m.addedNodes.forEach(walk);
            });
            busy = false;
        }).observe(document.body, { childList: true, subtree: true, characterData: true,
                                    attributes: true, attributeFilter: ATTRS });
        // Kanvaslar lug'at yuklanishidan oldin chizilgan — qayta chizdiramiz
        // (modellar "fizika:theme" hodisasida to'xtab turgan holatini qayta chizadi)
        try {
            window.dispatchEvent(new CustomEvent('fizika:theme', {
                detail: { dark: document.body.classList.contains('dark') } }));
        } catch (e) {}
    }

    // Kanvasga chiziladigan matnlar (model yozuvlari) ham lug'at bo'yicha
    var C2D = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (C2D) ['fillText', 'strokeText', 'measureText'].forEach(function (fn) {
        var orig = C2D[fn];
        C2D[fn] = function (text) {
            var args = Array.prototype.slice.call(arguments);
            if (typeof text === 'string') { var v = DICT[text] !== undefined ? DICT[text] : tr(text); if (v !== null && v !== undefined) args[0] = v; }
            return orig.apply(this, args);
        };
    });

    // confirm/alert/prompt oynalari DOM'da emas — matni shu yerda tarjima qilinadi
    ['alert', 'confirm', 'prompt'].forEach(function (fn) {
        var orig = window[fn];
        if (typeof orig !== 'function') return;
        window[fn] = function (msg) {
            var args = Array.prototype.slice.call(arguments);
            if (typeof msg === 'string') {
                // Ko'p qatorli xabar: har qator alohida
                args[0] = msg.split('\n').map(function (line) { var v = tr(line); return v === null ? line : v; }).join('\n');
            }
            return orig.apply(window, args);
        };
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
    window.fizikaTr = function (s) { var v = tr(s); return v === null ? s : v; };
})();
