/* ============================================================
   i18n.js — interfeysni rus tiliga o'girish (ixtiyoriy)
   theme.js tanlangan til "ru" bo'lsa shu faylni va lug'atni
   (i18n-ru.js) yuklaydi. Sahifa HTML i o'zgarmaydi: matn tugunlari
   va placeholder/title/aria-label atributlari lug'at bo'yicha
   almashtiriladi. Keyin qo'shilgan elementlar (jurnal, natijalar)
   MutationObserver orqali tarjima qilinadi.
   Lug'atda yo'q matn o'zbekcha qoladi (masalan test savollari).
   ============================================================ */
(function () {
    'use strict';
    var DICT = window.FIZIKA_RU || {};
    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, KBD: 1, TEXTAREA: 1 };

    function norm(t) { return t.replace(/\s+/g, ' ').trim(); }

    function tr(text) {
        var k = norm(text);
        if (!k) return null;
        var v = DICT[k];
        return v === undefined ? null : v;
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
        if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
        element(root);
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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
    window.fizikaTr = function (s) { var v = tr(s); return v === null ? s : v; };
})();
