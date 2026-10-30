/* index.html sahifasining skripti (avval HTML ichida edi). */
// ===== Katalog: qidiruv, bo'lim/sinf filtrlari, saralash, ko'rinish =====
(function () {
    var grid = document.getElementById('sims');
    var sims = Array.prototype.slice.call(grid.querySelectorAll('.sim'));
    var q = document.getElementById('q'), heroQ = document.getElementById('heroQ');
    var catBoxes = document.querySelectorAll('input[name="cat"]');
    var gradeBoxes = document.querySelectorAll('input[name="grade"]');
    var tiles = document.querySelectorAll('.cat-tile');
    var mobileChips = document.querySelectorAll('.chip-m');
    var found = document.getElementById('found');
    var empty = document.getElementById('empty');

    // Apostrof va katta-kichik harf farqsiz qidiruv
    function norm(t) { return t.toLowerCase().replace(/[ʻʼ‘’'`]/g, '').replace(/\s+/g, ' '); }
    sims.forEach(function (s) { s._text = norm(s.textContent); });

    function checked(list) {
        return Array.prototype.filter.call(list, function (b) { return b.checked; }).map(function (b) { return b.value; });
    }
    function apply() {
        var text = norm(q.value.trim());
        var cats = checked(catBoxes), grades = checked(gradeBoxes);
        var n = 0;
        sims.forEach(function (s) {
            var ok = (!text || s._text.indexOf(text) > -1) &&
                     (!cats.length || cats.indexOf(s.dataset.cat) > -1) &&
                     (!grades.length || grades.indexOf(s.dataset.grade) > -1);
            s.hidden = !ok;
            if (ok) n++;
        });
        found.textContent = n + ' ta simulyatsiya';
        empty.style.display = n ? 'none' : 'block';
        tiles.forEach(function (t) { t.setAttribute('aria-pressed', String(cats.length === 1 && cats[0] === t.dataset.cat)); });
        mobileChips.forEach(function (c) {
            c.setAttribute('aria-pressed', String(c.dataset.g === (grades.length === 1 ? grades[0] : '')));
        });
    }
    function sortBy(mode) {
        var arr = sims.slice();
        arr.sort(function (a, b) {
            if (mode === 'name') return a.dataset.name.localeCompare(b.dataset.name, 'uz');
            if (mode === 'grade') return (a.dataset.grade - b.dataset.grade) || (a.dataset.order - b.dataset.order);
            return a.dataset.order - b.dataset.order;
        });
        arr.forEach(function (s) { grid.appendChild(s); });
    }
    function setCat(cat) {
        catBoxes.forEach(function (b) { b.checked = b.value === cat; });
        apply();
        document.getElementById('modellar').scrollIntoView({ behavior: 'smooth' });
    }

    q.addEventListener('input', function () { heroQ.value = q.value; apply(); });
    document.getElementById('heroSearch').addEventListener('submit', function (e) {
        e.preventDefault();
        q.value = heroQ.value;
        apply();
        document.getElementById('modellar').scrollIntoView({ behavior: 'smooth' });
    });
    heroQ.addEventListener('input', function () { q.value = heroQ.value; apply(); });
    catBoxes.forEach(function (b) { b.addEventListener('change', apply); });
    gradeBoxes.forEach(function (b) { b.addEventListener('change', apply); });
    tiles.forEach(function (t) {
        t.addEventListener('click', function () {
            // Tanlangan bo'limni qayta bossa — filtr olib tashlanadi
            setCat(t.getAttribute('aria-pressed') === 'true' ? '' : t.dataset.cat);
        });
    });
    document.querySelectorAll('[data-cat-link]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); setCat(a.dataset.catLink); });
    });
    mobileChips.forEach(function (c) {
        c.addEventListener('click', function () {
            gradeBoxes.forEach(function (b) { b.checked = b.value === c.dataset.g; });
            apply();
        });
    });
    document.getElementById('clearFilters').addEventListener('click', function () {
        catBoxes.forEach(function (b) { b.checked = false; });
        gradeBoxes.forEach(function (b) { b.checked = false; });
        q.value = heroQ.value = '';
        apply();
    });
    document.getElementById('sort').addEventListener('change', function () { sortBy(this.value); });

    // Backend bo'lsa: katalog admin paneldagi holatga moslanadi — o'chirilgan (nofaol) model yashiriladi,
    // tartib, nom va tavsif admin panelda o'zgartirilgani bo'yicha. Backend bo'lmasa — statik katalog.
    function withApi(fn) {
        if (window.FizikaAPI) fn(window.FizikaAPI);
        else window.addEventListener('fizika:api', function (e) { fn(e.detail); }, { once: true });
    }
    withApi(function (api) {
        api.available().then(function (ok) { return ok ? api.get('simulations/') : null; }).then(function (list) {
            if (!Array.isArray(list) || !list.length) return;
            var byPath = {};
            list.forEach(function (m) { byPath[m.page_path] = m; });
            // i18n.js lang atributini keyinroq o'zgartirishi mumkin — tanlangan tilni theme.js dan olamiz
            var uz = (window.fizikaLang ? window.fizikaLang() : 'uz') === 'uz';
            sims = sims.filter(function (s) {
                var m = byPath[s.getAttribute('href')];
                if (!m) { s.remove(); return false; }
                s.dataset.order = m.order;
                // Ruscha rejimda matnlarni i18n lug'ati tarjima qiladi — faqat o'zbekchada almashtiramiz
                if (uz && m.title) {
                    var tt = s.querySelector('.sim__title');
                    if (norm(tt.textContent) !== norm(m.title)) tt.textContent = m.title;
                    s.dataset.name = m.title;
                    // Tavsif o'zgarmagan bo'lsa tegilmaydi — sahifadagi formatlash (Eₖ, T½) saqlanadi
                    var desc = s.querySelector('.sim__desc');
                    if (m.description && norm(desc.textContent) !== norm(m.description)) desc.textContent = m.description;
                    s._text = norm(s.textContent);
                }
                return true;
            });
            sortBy(document.getElementById('sort').value);
            apply();
        }).catch(function () { /* statik katalog qoladi */ });
    });
    document.querySelectorAll('.viewsw button').forEach(function (b) {
        b.addEventListener('click', function () {
            var list = b.dataset.view === 'list';
            grid.classList.toggle('is-list', list);
            document.querySelectorAll('.viewsw button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            try { localStorage.setItem('fizika-view', b.dataset.view); } catch (e) {}
        });
    });
    try {
        if (localStorage.getItem('fizika-view') === 'list') document.querySelector('.viewsw [data-view="list"]').click();
    } catch (e) {}
    apply();
})();
