/* tekshiruv.html sahifasining skripti (avval HTML ichida edi). */
// ===== 1) styles.css YANGI versiyami yoki ESKI keshdanmi? =====
// CSS faylini o'qib, yangi dizayn tizimi o'zgaruvchilari bor-yo'qligini tekshiramiz.
// Eski CSS da --sp-*, --r-*, --shadow-* yo'q edi — natijada sayt bo'shliqsiz,
// yumaloq burchaksiz va soyasiz ochiladi (ranglar esa ishlayveradi).
(function () {
    var box = document.getElementById('cssver');
    box.style.display = '';
    box.innerHTML = '<h2>⏳ styles.css versiyasi tekshirilmoqda…</h2>';

    fetch('styles.css?nocache=' + Date.now(), { cache: 'no-store' })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(function (css) {
            var hasSp = css.indexOf('--sp-4') > -1;
            var hasR  = css.indexOf('--r-lg') > -1;
            var hasSh = css.indexOf('--shadow-sm') > -1;
            // Oxirgi versiya belgisi: mobil tuzatish (minmax(0, 1fr)), chop etish stillari
            // va yopishqoq kanvas (is-sticky)
            var latest = css.indexOf('minmax(0, 1fr)') > -1 && css.indexOf('@media print') > -1 &&
                         css.indexOf('is-sticky') > -1;
            if (hasSp && hasR && hasSh && !latest) {
                box.style.background = '#fffbeb';
                box.style.borderColor = '#fcd34d';
                box.innerHTML = '<h2>⚠️ styles.css — oraliq (eskiroq) versiya</h2>' +
                    '<p style="font-size:0.92rem">Dizayn tizimi bor, lekin oxirgi tuzatishlar yo\u2019q ' +
                    '(masalan telefonda modellar kesilishi). GitHub\u2019dagi yangi <code>styles.css</code> ni ' +
                    'qayta yuklang va <strong>Ctrl+F5</strong> bosing.</p>';
                return;
            }
            if (hasSp && hasR && hasSh) {
                box.style.background = '#f0fdf4';
                box.style.borderColor = '#86efac';
                box.innerHTML = '<h2>✅ styles.css — yangi versiya</h2>' +
                    '<p style="font-size:0.92rem">Dizayn tizimi to\u2019liq: bo\u2019shliq, ' +
                    'radius va soya o\u2019zgaruvchilari joyida (' + Math.round(css.length / 1024) + ' KB).</p>';
            } else {
                box.style.background = '#fef2f2';
                box.style.borderColor = '#fca5a5';
                box.innerHTML = '<h2>❌ Serverda ESKI styles.css turibdi!</h2>' +
                    '<p style="font-size:0.92rem">Aynan shu sababli sayt <strong>bo\u2019shliqsiz, ' +
                    'yumaloq burchaksiz va soyasiz</strong> ko\u2019rinadi (ranglar esa ishlaydi). ' +
                    'Yangi dizayn tizimi o\u2019zgaruvchilari topilmadi: ' +
                    (hasSp ? '' : '--sp-4 ') + (hasR ? '' : '--r-lg ') + (hasSh ? '' : '--shadow-sm') + '</p>' +
                    '<ol style="margin-left:18px;margin-top:10px;font-size:0.92rem">' +
                    '<li>GitHub\u2019dan <strong>yangi <code>styles.css</code></strong> ni yuklab oling</li>' +
                    '<li>Hostingdagi eski <code>styles.css</code> ustiga <strong>qayta yuklang</strong> (replace)</li>' +
                    '<li>Shu bilan birga <code>model-tools.css</code>, <code>theme.js</code>, ' +
                    '<code>model-tools.js</code> va barcha HTML fayllarni ham yangilang</li>' +
                    '<li>So\u2019ng brauzerda <strong>Ctrl+F5</strong> bosing</li></ol>';
            }
        })
        .catch(function (e) {
            box.style.background = '#fef2f2';
            box.style.borderColor = '#fca5a5';
            box.innerHTML = '<h2>❌ styles.css umuman yuklanmadi</h2>' +
                '<p style="font-size:0.92rem">Xato: ' + e.message + '. Fayl serverda yo\u2019q yoki ' +
                '<code>index.html</code> bilan bir xil papkada emas.</p>';
        });
})();

var FILES = [
    ['styles.css', 'Asosiy dizayn'],
    ['model-tools.css', 'Laboratoriya vositalari uslubi'],
    ['theme.js', 'Qorong’i rejim'],
    ['model-tools.js', 'Jurnal va navigatsiya'],
    ['index.html', 'Bosh sahifa'],
    ['modellar/rezerford_model.html', 'Rezerford modeli'],
    ['modellar/kepler_model.html', 'Kepler modeli'],
    ['modellar/mayatnik_model.html', 'Mayatnik modeli'],
    ['modellar/qiya_tekislik_model.html', 'Qiya tekislik modeli'],
    ['modellar/om_qonuni_model.html', 'Om qonuni modeli'],
    ['modellar/induksiya_model.html', 'Induksiya modeli'],
    ['modellar/prujinali_mayatnik_model.html', 'Prujinali mayatnik modeli'],
    ['modellar/otilgan_jism_model.html', 'Otilgan jism modeli'],
    ['modellar/gaz_qonunlari_model.html', 'Gaz qonunlari modeli'],
    ['modellar/kondensator_model.html', 'Kondensator modeli'],
    ['modellar/impuls_model.html', 'Impuls modeli'],
    ['modellar/yoruglik_sinishi_model.html', 'Yorug\'lik sinishi modeli'],
    ['modellar/linza_model.html', 'Linza modeli'],
    ['modellar/fotoeffekt_model.html', 'Fotoeffekt modeli'],
    ['modellar/radioaktiv_yemirilish_model.html', 'Radioaktiv yemirilish modeli'],
    ['sw.js', 'Oflayn ishlash (Service Worker)'],
    ['api.js', 'Backend bilan aloqa'],
    ['app.js', 'Hisob sahifalari (umumiy)'],
    ['app.css', 'Hisob sahifalari uslubi'],
    ['kirish.html', 'Kirish / ro\'yxatdan o\'tish'],
    ['oquvchi/index.html', 'O\'quvchi sahifasi'],
    ['oqituvchi/index.html', 'O\'qituvchi paneli'],
    ['testlar/nazorat.html', 'Nazorat testi'],
    ['manifest.webmanifest', 'Ilova manifesti'],
    ['fonts/inter-latin-wght-normal.woff2', 'Inter shrifti'],
    ['testlar/testlar_online.html', 'Onlayn test'],
    ['dars_ishlanmalar/index.html', 'Dars ishlanmalar'],
    ['hujjatlar/loyiha_algoritmi.html', 'Loyiha algoritmi']
];

var list = document.getElementById('list');
var done = 0, bad = 0;

FILES.forEach(function (item) {
    var path = item[0], label = item[1];
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span class="st">⏳</span><span class="nm">' + path +
                    '</span><span class="ms">' + label + '</span>';
    list.appendChild(row);

    fetch(path + '?nocache=' + Date.now(), { method: 'GET', cache: 'no-store' })
        .then(function (r) {
            var st = row.querySelector('.st'), ms = row.querySelector('.ms');
            if (r.ok) {
                row.className = 'row ok';
                st.textContent = '✅';
                var ct = (r.headers.get('content-type') || '').split(';')[0];
                ms.textContent = label + ' · ' + (ct || 'ok');
                // CSS/JS noto'g'ri MIME turi bilan kelsa - brauzer rad etadi
                if (path.endsWith('.css') && ct && ct.indexOf('css') === -1) {
                    row.className = 'row err';
                    st.textContent = '⚠️';
                    ms.textContent = 'MIME turi noto’g’ri: ' + ct + ' (text/css bo’lishi kerak)';
                    bad++;
                }
                if (path.endsWith('.js') && ct && ct.indexOf('javascript') === -1 && ct.indexOf('ecmascript') === -1) {
                    row.className = 'row err';
                    st.textContent = '⚠️';
                    ms.textContent = 'MIME turi noto’g’ri: ' + ct;
                    bad++;
                }
            } else {
                row.className = 'row err';
                st.textContent = '❌';
                ms.textContent = 'HTTP ' + r.status + ' — fayl topilmadi';
                bad++;
            }
        })
        .catch(function () {
            row.className = 'row err';
            row.querySelector('.st').textContent = '❌';
            row.querySelector('.ms').textContent = 'Yuklab bo’lmadi';
            bad++;
        })
        .then(function () {
            done++;
            if (done === FILES.length) {
                var sum = document.getElementById('summary');
                if (bad === 0) {
                    sum.style.background = '#f0fdf4';
                    sum.style.color = '#166534';
                    sum.textContent = '✅ Barcha ' + FILES.length + ' ta fayl to’g’ri yuklandi — sayt ishlashi kerak.';
                } else {
                    sum.style.background = '#fef2f2';
                    sum.style.color = '#991b1b';
                    sum.textContent = '❌ ' + bad + ' ta faylda muammo bor (pastda qizil bilan ko’rsatilgan).';
                }
            }
        });
});
