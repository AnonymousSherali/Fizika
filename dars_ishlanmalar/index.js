/* index.html sahifasining skripti (avval HTML ichida edi). */
// Qidiruv + filtr: kartalar matni bo'yicha (katta-kichik harf va apostrof farqsiz)
(function () {
    var input = document.getElementById('darsSearch');
    var chips = document.querySelectorAll('.chip');
    var filter = 'all';
    function norm(t) { return t.toLowerCase().replace(/[ʻʼ‘’'`]/g, ''); }
    function apply() {
        var q = norm(input.value.trim());
        var total = 0;
        document.querySelectorAll('.section[id^="sinf"]').forEach(function (sec) {
            var shown = 0;
            sec.querySelectorAll('.card').forEach(function (card) {
                // Faqat sarlavha va dars turi bo'yicha (tugma yozuvlari "PDF", "DOCX" emas)
                var txt = card.querySelector('h3').textContent + ' ' +
                          (card.querySelector('.type-tag') || { textContent: '' }).textContent;
                var ok = (!q || norm(txt).indexOf(q) > -1) &&
                    (filter === 'all' ||
                     (filter === sec.id) ||
                     (filter === 'model' && card.querySelector('.model-badge')) ||
                     (filter === 'docx' && card.querySelector('.docx-link')));
                card.hidden = !ok;
                if (ok) shown++;
            });
            sec.hidden = shown === 0;
            var c = sec.querySelector('.count');
            var all = sec.querySelectorAll('.card').length;
            c.textContent = shown === all ? all + ' ta dars ishlanma' : shown + ' / ' + all + ' ta dars ishlanma';
            total += shown;
        });
        document.getElementById('noResult').hidden = total > 0;
    }
    input.addEventListener('input', apply);
    chips.forEach(function (ch) {
        ch.addEventListener('click', function () {
            filter = ch.dataset.f;
            chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === ch)); });
            apply();
        });
    });
    // Backend bo'lsa: o'qituvchilar yuklagan (tasdiqlangan) ishlanmalar qo'shiladi va
    // yuklab olishlar hisoblanadi (FT-7.4, FT-7.5). Backend bo'lmasa — statik ro'yxat o'zgarmaydi.
    function withApi(fn) {
        if (window.FizikaAPI) fn(window.FizikaAPI);
        else window.addEventListener('fizika:api', function (e) { fn(e.detail); }, { once: true });
    }
    withApi(function (api) {
        api.available().then(function (ok) {
            if (!ok) return;
            api.getAll('lesson-plans/').then(function (results) {
                var r = { results: results };   // barcha sahifalar (100 tadan ko'p bo'lsa ham)
                // Kirgan o'qituvchi/admin uchun API o'z qoralamalarini ham qaytaradi — saytda faqat nashr etilganlar
                r.results = r.results.filter(function (p) { return p.status === 'published'; });
                var byPath = {};
                r.results.forEach(function (p) { if (p.static_pdf) byPath[p.static_pdf] = p; });
                // Ishlanmalar bazaga import qilingan bo'lsa: admin panelda nashrdan olingan (rad etilgan,
                // o'chirilgan) statik ishlanma saytda ham yashiriladi
                var imported = Object.keys(byPath).length > 0;
                document.querySelectorAll('.card a[href$=".pdf"], .card a[href$=".docx"]').forEach(function (a) {
                    var path = 'dars_ishlanmalar/' + a.getAttribute('href');
                    var p = byPath[path] || byPath[path.replace(/\.docx$/, '.pdf')];
                    if (!p) {
                        if (imported && a.closest('.card')) a.closest('.card').hidden = true;
                        return;
                    }
                    var kind = /\.docx$/.test(path) ? 'docx' : 'pdf';
                    a.href = api.base() + 'lesson-plans/' + p.id + '/download/?type=' + kind;
                    a.removeAttribute('download');
                });
                var esc = window.Fizika.esc;   // theme.js
                r.results.filter(function (p) { return !p.static_pdf; }).forEach(function (p) {
                    var sec = document.querySelector('#sinf' + p.grade + ' .cards');
                    if (!sec) return;
                    var d = document.createElement('div');
                    d.className = 'card';
                    d.innerHTML = '<div class="card-icon" aria-hidden="true">' + esc(p.icon || '📄') + '</div>' +
                        '<h3>' + esc(p.title) + '</h3><p class="meta"><span class="type-tag">' + esc(p.lesson_type || 'Dars ishlanma') +
                        '</span>' + (p.simulation_page ? ' <a href="../' + esc(p.simulation_page) + '" class="model-badge">🎮 Interaktiv model bor</a>' : '') +
                        '</p><p class="meta" style="margin-top:-8px">✍️ ' + esc(p.author_name || '') + '</p><div class="card-links">' +
                        (p.has_pdf ? '<a href="' + api.base() + 'lesson-plans/' + p.id + '/download/?type=pdf" class="btn">📄 PDF</a>' : '') +
                        (p.has_docx ? '<a href="' + api.base() + 'lesson-plans/' + p.id + '/download/?type=docx" class="docx-link">✏️ DOCX</a>' : '') +
                        '</div>';
                    sec.appendChild(d);
                });
                apply();
            }, function () {});
        });
    });

    // Sarlavhadagi "10-sinf / 11-sinf" havolalari yashirin bo'limga olib bormasin
    document.querySelectorAll('.grade-nav a').forEach(function (a) {
        a.addEventListener('click', function () {
            if (filter === 'all' && !input.value) return;
            input.value = '';
            filter = 'all';
            chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.f === 'all')); });
            apply();
        });
    });
})();
