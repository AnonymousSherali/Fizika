/* Mashq testi (testlar_online.html): mavzu tanlash, test savollari va hisoblash masalalari.
   Savollar banki — bank.js (TOPICS, questions, problems; correct = to'g'ri javob indeksi 0–3). */

// ================== MAVZULAR VA TANLOV ==================
// Teg ko'rinishi: "<Mavzu> · Asosiy/Chuqur/Hisoblash"

const topicOf = tag => tag.split(' · ')[0];
const levelOf = tag => tag.split(' · ')[1] || '';
const COUNT_OPTIONS = ['10', '20', '40', 'all'];
const SEL_KEY = 'fizika-testlar-tanlov';

let selTopics = new Set(TOPICS);
let qCount = '20';

let current = 0;
let answers = [];
// Har bir sessiyada savollar va variantlar aralashtiriladi
let quiz = [];

// HTML sifatida chiqariladigan matnlarni xavfsiz qilish (umumiy funksiya — theme.js)
const esc = window.Fizika.esc;

// Fisher-Yates aralashtirish
function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function loadSelection() {
    try {
        const s = JSON.parse(localStorage.getItem(SEL_KEY) || 'null');
        if (s && Array.isArray(s.topics)) selTopics = new Set(s.topics.filter(t => TOPICS.indexOf(t) > -1));
        if (s && COUNT_OPTIONS.indexOf(s.count) > -1) qCount = s.count;
    } catch (e) { /* xotira yopiq bo'lsa standart tanlov qoladi */ }
}
function saveSelection() {
    try { localStorage.setItem(SEL_KEY, JSON.stringify({ topics: Array.from(selTopics), count: qCount })); }
    catch (e) { /* e'tiborsiz */ }
}

const countIn = (arr, t) => arr.filter(x => topicOf(x.tag) === t).length;
const selectedQuestions = () => questions.filter(q => selTopics.has(topicOf(q.tag)));
const selectedProblems = () => problems.filter(p => selTopics.has(topicOf(p.tag)));
function quizSize() {
    const n = selectedQuestions().length;
    return qCount === 'all' ? n : Math.min(n, +qCount);
}

function buildPicker() {
    const box = document.getElementById('topicChips');
    box.innerHTML = '';
    TOPICS.forEach(t => {
        const nq = countIn(questions, t), np = countIn(problems, t);
        const lab = document.createElement('label');
        lab.className = 'chip';
        lab.title = nq + ' ta test savoli, ' + np + ' ta masala';
        lab.innerHTML = '<input type="checkbox" value="' + esc(t) + '">' +
            '<span class="chip__body"><span>' + esc(t) + '</span>' +
            '<span class="chip__n" aria-hidden="true">' + nq + '</span></span>';
        const inp = lab.querySelector('input');
        inp.setAttribute('aria-label', t + ': ' + lab.title);
        inp.checked = selTopics.has(t);
        inp.addEventListener('change', () => {
            if (inp.checked) selTopics.add(t); else selTopics.delete(t);
            refreshStart();
        });
        box.appendChild(lab);
    });
    // onchange (addEventListener emas): bank serverdan kelganda buildPicker qayta chaqiriladi
    document.getElementById('allTopics').onchange = function () {
        selTopics = this.checked ? new Set(TOPICS) : new Set();
        box.querySelectorAll('input').forEach(i => { i.checked = this.checked; });
        refreshStart();
    };
    document.querySelectorAll('input[name="qcount"]').forEach(r => {
        r.checked = r.value === qCount;
        r.onchange = () => { if (r.checked) { qCount = r.value; refreshStart(); } };
    });
    document.getElementById('topicTotal').textContent = TOPICS.length;
}

// Boshlang'ich ekrandagi jami sonlar va tugmalar holatini yangilaydi
function refreshStart() {
    const all = document.getElementById('allTopics');
    all.checked = selTopics.size === TOPICS.length;
    all.indeterminate = selTopics.size > 0 && selTopics.size < TOPICS.length;
    const bank = selectedQuestions().length, n = quizSize(), m = selectedProblems().length;
    document.getElementById('totalQ').textContent = n;
    document.getElementById('totalP').textContent = m;
    document.getElementById('totalMin').textContent = '~' + Math.max(5, Math.round(n * 0.6 / 5) * 5);
    const sum = document.getElementById('selSummary');
    if (!selTopics.size) {
        sum.className = 'sel-summary warn';
        sum.textContent = 'Kamida bitta mavzuni tanlang.';
    } else {
        sum.className = 'sel-summary';
        sum.innerHTML = 'Tanlandi: <strong>' + selTopics.size + ' ta mavzu</strong> — testda <strong>' + n +
            ' ta savol</strong>' + (n < bank ? ' (bankdagi ' + bank + ' tadan)' : '') +
            ', hisoblashda <strong>' + m + ' ta masala</strong>.';
    }
    document.getElementById('startBtn').disabled = n === 0;
    document.getElementById('calcBtn').disabled = m === 0;
    saveSelection();
}

// Har bir tanlangan mavzudan navbat bilan olinadi — kichik testda ham mavzular teng qamraladi
function drawBalanced(pool, n) {
    const by = {};
    pool.forEach(q => { const t = topicOf(q.tag); (by[t] || (by[t] = [])).push(q); });
    const lists = shuffled(Object.keys(by).map(t => shuffled(by[t])));
    const out = [];
    while (out.length < n && lists.some(l => l.length)) {
        lists.forEach(l => { if (out.length < n && l.length) out.push(l.pop()); });
    }
    return shuffled(out);
}

// Savol variantlarini aralashtirib, to'g'ri javob indeksini yangilaydi
function prepareQuiz() {
    quiz = drawBalanced(selectedQuestions(), quizSize()).map(q => {
        const correctText = q.o[q.correct];
        const opts = shuffled(q.o);
        return { tag: q.tag, q: q.q, o: opts, correct: opts.indexOf(correctText), ex: q.ex };
    });
}

function startQuiz() {
    if (!quizSize()) return;
    current = 0;
    prepareQuiz();
    answers = new Array(quiz.length).fill(null);
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('quizScreen').classList.remove('hidden');
    renderQuestion();
    window.scrollTo(0, 0);
}

function renderQuestion() {
    const q = quiz[current];
    document.getElementById('qCounter').textContent = `Savol ${current + 1} / ${quiz.length}`;
    document.getElementById('qTag').textContent = q.tag;
    document.getElementById('qText').textContent = q.q;

    const letters = ['A', 'B', 'C', 'D'];
    const optsEl = document.getElementById('options');
    optsEl.innerHTML = '';
    q.o.forEach((opt, i) => {
        const div = document.createElement('div');
        const isSel = answers[current] === i;
        div.className = 'option' + (isSel ? ' selected' : '');
        div.innerHTML = `<span class="letter">${letters[i]}</span><span>${esc(opt)}</span>`;
        // Klaviatura bilan ham tanlash mumkin (Tab bilan o'tib, Enter/Probel bilan belgilash)
        div.tabIndex = 0;
        div.setAttribute('role', 'radio');
        div.setAttribute('aria-checked', isSel ? 'true' : 'false');
        div.onclick = () => selectOption(i);
        div.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(i); }
        };
        optsEl.appendChild(div);
    });

    const answered = answers.filter(a => a !== null).length;
    document.getElementById('progressBar').style.width = (answered / quiz.length * 100) + '%';

    document.getElementById('prevBtn').style.visibility = current === 0 ? 'hidden' : 'visible';
    document.getElementById('nextBtn').disabled = answers[current] === null;
    document.getElementById('nextBtn').textContent = current === quiz.length - 1 ? '✓ Yakunlash' : 'Keyingi →';
}

function selectOption(i) {
    answers[current] = i;
    // Variantlar qayta chiziladi — klaviatura fokusini tanlangan variantga qaytaramiz
    const hadFocus = document.activeElement && document.activeElement.closest &&
                     document.activeElement.closest('#options');
    renderQuestion();
    if (hadFocus) document.getElementById('options').children[i].focus();
}

// Butun sahifada: A-D bilan javob tanlash, o'q tugmalari bilan navigatsiya
document.addEventListener('keydown', function(e) {
    if (document.getElementById('quizScreen').classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT') return;
    // Ctrl+C (nusxalash) va boshqa yorliqlar javobni o'zgartirib yubormasin
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    const idx = ['A', 'B', 'C', 'D'].indexOf(k);
    if (idx > -1 && idx < quiz[current].o.length) { selectOption(idx); return; }
    if (e.key === 'ArrowRight' && !document.getElementById('nextBtn').disabled) nextQuestion();
    if (e.key === 'ArrowLeft') prevQuestion();
});

function nextQuestion() {
    if (answers[current] === null) return;
    if (current === quiz.length - 1) {
        var unanswered = answers.filter(function (a) { return a === null; }).length;
        if (unanswered > 0 &&
            !confirm(unanswered + ' ta savol belgilanmagan. Baribir yakunlaysizmi?')) return;
        showResult();
    } else {
        current++;
        renderQuestion();
    }
}

function prevQuestion() {
    if (current > 0) { current--; renderQuestion(); }
}

function gradeFor(pct) {
    if (pct >= 90) return ['🏆 "5" (A\'lo)', 'linear-gradient(135deg,#28a745,#20c997)'];
    if (pct >= 75) return ['⭐ "4" (Yaxshi)', 'linear-gradient(135deg,#17a2b8,#4facfe)'];
    if (pct >= 60) return ['✓ "3" (Qoniqarli)', 'linear-gradient(135deg,#ffc107,#ff9800)'];
    return ['✗ "2" (Qoniqarsiz)', 'linear-gradient(135deg,#dc3545,#e83e8c)'];
}

// Mavzular bo'yicha natija: qaysi bo'limni takrorlash kerakligini ko'rsatadi
function renderTopicStats(items, isOk) {
    const groups = {};
    items.forEach((q, i) => {
        const g = groups[q.tag] || (groups[q.tag] = { ok: 0, all: 0 });
        g.all++;
        if (isOk(q, i)) g.ok++;
    });
    const LV = ['Asosiy', 'Chuqur', 'Hisoblash'];
    const key = tag => TOPICS.indexOf(topicOf(tag)) * 10 + LV.indexOf(levelOf(tag));
    const ts = document.getElementById('topicStats');
    ts.innerHTML = '';
    Object.keys(groups).sort((a, b) => key(a) - key(b)).forEach(tag => {
        const g = groups[tag], pc = Math.round(g.ok / g.all * 100);
        const col = pc >= 75 ? '#10b981' : pc >= 50 ? '#f59e0b' : '#ef4444';
        const row = document.createElement('div');
        row.innerHTML = `<div class="topic-row__head"><span>${esc(tag)}</span><span>${g.ok}/${g.all} · ${pc}%</span></div>
            <div class="topic-bar"><i style="width:${pc}%;background:${col}"></i></div>`;
        ts.appendChild(row);
    });
}

function showResult() {
    let correct = 0;
    quiz.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const pct = Math.round(correct / quiz.length * 100);

    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '100%';
    window.scrollTo(0, 0);

    document.getElementById('scorePct').textContent = pct + '%';
    document.getElementById('scoreFrac').textContent = correct + '/' + quiz.length;

    const [grade, color] = gradeFor(pct);
    const msg = pct >= 90 ? 'Ajoyib natija! Mavzularni mukammal o\'zlashtirgansiz.'
        : pct >= 75 ? 'Yaxshi natija! Ozgina mashq bilan a\'loga yetasiz.'
        : pct >= 60 ? 'Qoniqarli. Xatolaringizni ko\'rib chiqing va takrorlang.'
        : 'Mavzularni qayta o\'rganib, modellar bilan mashq qiling.';

    document.getElementById('scoreCircle').style.background = color;
    document.getElementById('gradeText').textContent = grade;
    document.getElementById('resultDetail').textContent = msg;

    renderTopicStats(quiz, (q, i) => answers[i] === q.correct);

    const letters = ['A', 'B', 'C', 'D'];
    const reviewEl = document.getElementById('reviewList');
    reviewEl.innerHTML = '';
    const wrong = quiz.filter((q, i) => answers[i] !== q.correct);
    if (wrong.length === 0) {
        reviewEl.innerHTML = '<div class="review-item ok"><div class="rq">🎉 Barcha savollarga to\'g\'ri javob berdingiz!</div></div>';
    } else {
        const heading = document.createElement('p');
        heading.style.cssText = 'font-weight:bold;color:#dc3545;margin-bottom:12px;';
        heading.textContent = `Xato javoblar (${wrong.length} ta):`;
        reviewEl.appendChild(heading);
        quiz.forEach((q, i) => {
            if (answers[i] === q.correct) return;
            const div = document.createElement('div');
            div.className = 'review-item no';
            const yourAns = answers[i] === null ? 'belgilanmagan' : `${letters[answers[i]]}) ${esc(q.o[answers[i]])}`;
            div.innerHTML = `<div class="rq">${i + 1}. ${esc(q.q)}</div>
                <div class="ra">❌ Sizning javobingiz: ${yourAns}<br>
                ✅ To'g'ri javob: ${letters[q.correct]}) ${esc(q.o[q.correct])}</div>
                ${q.ex ? `<div class="rx">💡 ${esc(q.ex)}</div>` : ''}`;
            reviewEl.appendChild(div);
        });
    }
}

// ================== HISOBLASH MASALALARI ==================
// Rezerford va Kepler masalalari testlar.md dagi 5-ballik masalalarga asoslangan

let pCurrent = 0;
let pScore = 0;
let pAnswered = false;
let calcSet = [];

// Javobni o'zbekcha ko'rinishda chiqarish (o'nli vergul)
const fmtNum = x => String(x).replace('.', ',');
const withUnit = p => fmtNum(p.ans) + (p.unit ? ' ' + p.unit : '');

function startCalc() {
    const pool = selectedProblems();
    if (!pool.length) return;
    pCurrent = 0;
    pScore = 0;
    calcSet = shuffled(pool).map(function (p) { return Object.assign({}, p, { _ok: false }); });
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('calcScreen').classList.remove('hidden');
    renderProblem();
    window.scrollTo(0, 0);
}

function renderProblem() {
    const p = calcSet[pCurrent];
    pAnswered = false;
    document.getElementById('pCounter').textContent = `Masala ${pCurrent + 1} / ${calcSet.length}`;
    document.getElementById('pTag').textContent = p.tag;
    document.getElementById('pText').textContent = p.q;
    document.getElementById('pUnit').textContent = p.unit;
    document.getElementById('pInput').value = '';
    document.getElementById('pInput').disabled = false;
    document.getElementById('pFeedback').innerHTML = '';
    document.getElementById('pCheckBtn').disabled = false;
    document.getElementById('pNextBtn').disabled = true;
    document.getElementById('pNextBtn').textContent = pCurrent === calcSet.length - 1 ? '✓ Yakunlash' : 'Keyingi →';
    document.getElementById('progressBar').style.width = (pCurrent / calcSet.length * 100) + '%';
    // Keyingi masalaga o'tilganda yozishni darhol davom ettirish mumkin bo'lsin
    // (birinchi masalada emas — telefonda klaviatura o'z-o'zidan ochilmasin)
    if (pCurrent > 0) document.getElementById('pInput').focus();
}

function checkProblem() {
    if (pAnswered) return;
    const p = calcSet[pCurrent];
    const inp = document.getElementById('pInput');
    // Vergul ham, nuqta ham qabul qilinadi (o'zbek yozuvida o'nli vergul odatiy)
    // Unicode minus (−) ham qabul qilinadi; oxiridagi birlik ("45 fm") e'tiborsiz,
    // lekin son davom etsa ("1.2.3") javob noaniq deb rad etiladi
    // Darajali yozuv ham: 4,22·10^7, 4.22×10⁷, 4.5*10^-3, 4.5e7
    const SUP = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+' };
    const raw = inp.value.trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.')
        .replace(/10([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, e) => '10^' + e.replace(/./g, c => SUP[c]));
    const m = raw.match(/^([-+]?(?:\d+\.?\d*|\.\d+))(?:e([-+]?\d+)|[·×x*]10\^?([-+]?\d+))?/i);
    const rest = m ? raw.slice(m[0].length) : '';
    const val = m && !/^[.\d·×*^]/.test(rest)
        ? parseFloat(m[1] + 'e' + (m[2] || m[3] || '0')) : NaN;
    if (isNaN(val)) {
        // Jim qaytish o'rniga aniq ko'rsatma beramiz
        document.getElementById('pFeedback').innerHTML =
            '<div class="review-item no"><div class="rq">⚠️ Avval raqamli javobni kiriting</div></div>';
        inp.style.borderColor = '#ef4444';
        inp.focus();
        setTimeout(function () { inp.style.borderColor = ''; }, 1800);
        return;
    }
    pAnswered = true;
    const ok = Math.abs(val - p.ans) <= Math.abs(p.ans) * p.tol / 100;
    p._ok = ok;
    if (ok) pScore++;
    const fb = document.getElementById('pFeedback');
    fb.innerHTML =
        '<div class="review-item ' + (ok ? 'ok' : 'no') + '">' +
        '<div class="rq">' + (ok ? '✅ To\'g\'ri! Javob: ' : '❌ Noto\'g\'ri. To\'g\'ri javob: ') +
        esc(withUnit(p)) + '</div>' +
        '<div class="ra"><strong>Yechim:</strong> ' + esc(p.sol) + '</div></div>';
    document.getElementById('pInput').disabled = true;
    document.getElementById('pCheckBtn').disabled = true;
    document.getElementById('pNextBtn').disabled = false;
    // Maydon o'chgach fokus BODY ga tushmasin — Enter bilan davom etish mumkin bo'lsin
    document.getElementById('pNextBtn').focus();
}

// Enter tugmasi bilan tekshirish
document.getElementById('pInput').addEventListener('keydown', function(e) {
    // preventDefault: aks holda shu Enter fokus o'tgan "Keyingi" tugmasini ham bosib yuboradi
    if (e.key === 'Enter') { e.preventDefault(); checkProblem(); }
});

function nextProblem() {
    if (pCurrent === calcSet.length - 1) {
        showCalcResult();
    } else {
        pCurrent++;
        renderProblem();
    }
}

function exitCalc() {
    document.getElementById('calcScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '0%';
}

function showCalcResult() {
    const pct = Math.round(pScore / calcSet.length * 100);
    document.getElementById('calcScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '100%';
    window.scrollTo(0, 0);
    document.getElementById('scorePct').textContent = pct + '%';
    document.getElementById('scoreFrac').textContent = pScore + '/' + calcSet.length;
    const [grade, color] = gradeFor(pct);
    const msg = pct >= 90 ? 'Hisoblash mahoratingiz ajoyib!'
        : pct >= 75 ? 'Yaxshi! Formulalarni yana bir bor takrorlang.'
        : pct >= 60 ? 'Qoniqarli. Yechimlarni diqqat bilan o\'rganib chiqing.'
        : 'Interaktiv modellar bilan mashq qilib, qayta urinib ko\'ring.';
    document.getElementById('scoreCircle').style.background = color;
    document.getElementById('gradeText').textContent = grade;
    document.getElementById('resultDetail').textContent = msg;

    // Masalalar bo'yicha ham mavzular tahlili (oldingi test natijasi o'rniga)
    renderTopicStats(calcSet, p => p._ok);

    // Xato qilingan masalalar yechimi bilan ko'rsatiladi
    const rev = document.getElementById('reviewList');
    const wrongP = calcSet.filter(function (p) { return !p._ok; });
    if (!wrongP.length) {
        rev.innerHTML = '<div class="review-item ok"><div class="rq">🎉 Barcha masalalarni to\'g\'ri yechdingiz!</div></div>';
    } else {
        let html = '<p style="font-weight:bold;color:#dc3545;margin-bottom:12px;">Xato yechilgan masalalar (' +
                   wrongP.length + ' ta):</p>';
        calcSet.forEach(function (p, i) {
            if (p._ok) return;
            html += '<div class="review-item no"><div class="rq">' + (i + 1) + '. ' + esc(p.q) + '</div>' +
                    '<div class="ra">✅ To\'g\'ri javob: <strong>' + esc(withUnit(p)) + '</strong><br>' +
                    '<strong>Yechim:</strong> ' + esc(p.sol) + '</div></div>';
        });
        rev.innerHTML = html;
    }
}

function restartQuiz() {
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '0%';
    refreshStart();
    window.scrollTo(0, 0);
}

loadSelection();
buildPicker();
refreshStart();

// Backend bo'lsa: savollar banki serverdan olinadi — admin panelda qo'shilgan, tasdiqlangan,
// tahrirlangan yoki arxivlangan savollar saytda ham shunday ko'rinadi. Server bo'lmasa (oflayn,
// statik hosting) yuqoridagi o'rnatilgan bank ishlatiladi.
(function () {
    function withApi(fn) {
        if (window.FizikaAPI) fn(window.FizikaAPI);
        else window.addEventListener('fizika:api', function (e) { fn(e.detail); }, { once: true });
    }
    withApi(function (api) {
        api.available().then(function (ok) {
            if (!ok) return null;
            return api.get('quiz/bank/');
        }).then(function (b) {
            if (!b || !b.questions || !b.questions.length) return;
            // Test boshlangan bo'lsa joriy savollar o'zgarmaydi
            if (quiz.length || calcSet.length) return;
            const had = new Set(TOPICS);
            TOPICS.splice(0, TOPICS.length, ...b.topics.filter(t => b.questions.some(q => topicOf(q.tag) === t)
                || b.problems.some(p => topicOf(p.tag) === t)));
            // Server ham tekshiradi; himoya uchun: aynan 4 variant va to'g'ri indeksli savollargina
            const valid = b.questions.filter(q => Array.isArray(q.o) && q.o.length === 4 &&
                Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4 && q.q);
            if (!valid.length) return;
            questions.splice(0, questions.length, ...valid);
            problems.splice(0, problems.length, ...b.problems);
            // Tanlov saqlanadi; admin qo'shgan yangi mavzu ham tanlangan bo'ladi
            selTopics = new Set(TOPICS.filter(t => selTopics.has(t) || !had.has(t)));
            buildPicker();
            refreshStart();
            document.body.dataset.bank = 'server';
        }).catch(function () { /* server xatosi — o'rnatilgan bank qoladi */ });
    });
})();
