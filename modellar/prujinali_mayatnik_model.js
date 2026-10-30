/* prujinali_mayatnik_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('springCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg1: '#fdf2f8', bg2: '#fce7f3', ink: '#500724', muted: '#9d5c7d', guide: '#b48aa0',
                mount: '#6b4f5c', mountEdge: '#3f2a35', spring: '#475569', springHi: '#cbd5e1',
                block1: '#f9a8d4', block2: '#be185d', blockEdge: '#831843', blockText: '#ffffff',
                ruler: '#fff7ed', rulerEdge: '#c2a07a', tick: '#5b4636',
                panel: 'rgba(255,255,255,0.72)', panelEdge: 'rgba(190,24,93,0.18)', grid: 'rgba(157,23,77,0.10)',
                trace: '#db2777', amp: 'rgba(219,39,119,0.35)',
                vel: '#0f766e', acc: '#c2410c',
                ek: '#0ea5e9', ep: '#f59e0b', et: '#db2777', barBg: 'rgba(80,7,36,0.08)' };
const DARK  = { bg1: '#1a0f17', bg2: '#22121d', ink: '#fbcfe8', muted: '#c08aa8', guide: '#7a5268',
                mount: '#4a3640', mountEdge: '#2a1d24', spring: '#cbd5e1', springHi: '#f8fafc',
                block1: '#f472b6', block2: '#9d174d', blockEdge: '#fbcfe8', blockText: '#ffffff',
                ruler: '#2b2026', rulerEdge: '#8a6a52', tick: '#e7d3c0',
                panel: 'rgba(255,255,255,0.05)', panelEdge: 'rgba(244,114,182,0.25)', grid: 'rgba(244,114,182,0.12)',
                trace: '#f472b6', amp: 'rgba(244,114,182,0.40)',
                vel: '#34d399', acc: '#fb923c',
                ek: '#38bdf8', ep: '#fbbf24', et: '#f472b6', barBg: 'rgba(255,255,255,0.08)' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const G = 9.81;

let state = {
    m: 0.5,
    k: 20,
    A: 0.10,
    b: 0,
    x: 0.10,      // muvozanatdan siljish, m (pastga musbat)
    v: 0,         // tezlik, m/s
    running: false,
    time: 0,
    oscillations: 0,
    crossTimes: [],
    history: []   // x(t) grafigi uchun [t, x] juftliklari
};

let animationId = null;
let lastTimestamp = null;

function omega0() { return Math.sqrt(state.k / state.m); }
function theoreticalPeriod() { return 2 * Math.PI * Math.sqrt(state.m / state.k); }
function accel(x, v) { return -(state.k / state.m) * x - (state.b / state.m) * v; }
function staticStretch() { return state.m * G / state.k; }

document.getElementById('massSlider').oninput = function () {
    state.m = parseFloat(this.value);
    document.getElementById('massValue').textContent = state.m.toFixed(2) + ' kg';
    updateWarn();
    relaunch();
};

document.getElementById('kSlider').oninput = function () {
    state.k = parseFloat(this.value);
    document.getElementById('kValue').textContent = state.k.toFixed(0) + ' N/m';
    updateWarn();
    relaunch();
};

// m yoki k o'zgarsa yuk A dan qaytadan qo'yib yuboriladi. Aks holda ω o'zgarib,
// x va v esa eskicha qolib, amplituda va energiya A ga mos kelmay qolardi
// (masalan muvozanatdan o'tayotganda m 4 barobar oshsa, amplituda 2 barobar o'sardi)
function relaunch() {
    const wasRunning = state.running;
    resetSpring();
    if (wasRunning) startSpring();
}

document.getElementById('dampSlider').oninput = function () {
    state.b = parseFloat(this.value);
    document.getElementById('dampValue').textContent = state.b.toFixed(2) + ' kg/s';
    restartMeasurement();
};

document.getElementById('ampSlider').oninput = function () {
    state.A = parseFloat(this.value);
    document.getElementById('ampValue').textContent = state.A.toFixed(2) + ' m';
    updateWarn();
    // Amplituda o'zgarsa yuk qaytadan tortib qo'yib yuboriladi;
    // ishlab turgan bo'lsa — avtomatik davom ettiramiz
    const wasRunning = state.running;
    resetSpring();
    if (wasRunning) startSpring();
};

// Yuqori nuqtada prujina siqilsa (A > mg/k) ogohlantiramiz
function updateWarn() {
    document.getElementById('ampWarn').hidden = state.A <= staticStretch();
}

// Tebranishni to'xtatmasdan o'lchov hisoblarini nolga qaytaradi
function restartMeasurement() {
    state.oscillations = 0;
    state.crossTimes = [];
    document.getElementById('measuredT').textContent = '-';
    document.getElementById('tError').textContent = '-';
    updateStats();
    if (!state.running) draw();
}

// Aniq (analitik) qadam: chiziqli tenglama x'' + 2γx' + ω₀²x = 0 uchun.
// b = 0 da energiya umuman "suzmaydi", kadr tezligiga ham bog'liq emas.
function stepExact(h) {
    const w0 = omega0();
    const gam = state.b / (2 * state.m);
    const wd = Math.sqrt(Math.max(w0 * w0 - gam * gam, 1e-12));
    const e = Math.exp(-gam * h);
    const c = Math.cos(wd * h), s = Math.sin(wd * h);
    const x0 = state.x, v0 = state.v;
    state.x = e * (x0 * c + (v0 + gam * x0) / wd * s);
    state.v = e * (v0 * c - (w0 * w0 * x0 + gam * v0) / wd * s);
}

function updatePhysics(dt) {
    const steps = 8;
    const h = dt / steps;
    let t = state.time;
    for (let i = 0; i < steps; i++) {
        const prevX = state.x;
        stepExact(h);
        if ((prevX < 0 && state.x >= 0) || (prevX > 0 && state.x <= 0)) {
            // Nol nuqtadan o'tish vaqti chiziqli interpolyatsiya bilan aniqlanadi
            const frac = prevX / (prevX - state.x);
            state.oscillations += 0.5;
            state.crossTimes.push(t + frac * h);
            // Faqat oxirgi 40 ta kesishish saqlanadi
            if (state.crossTimes.length > 40) state.crossTimes.shift();
        }
        t += h;
    }
    state.time += dt;
    state.history.push([state.time, state.x]);
    const win = graphWindow();
    while (state.history.length > 2 && state.history[0][0] < state.time - win - 0.2) state.history.shift();
}

// Grafik oynasi: taxminan 3 ta davr ko'rinadi
function graphWindow() { return Math.min(12, Math.max(1.5, 3 * theoreticalPeriod())); }

// ===== Chizish =====
const PX_PER_M = 700;          // siljish masshtabi: 1 sm = 7 px
const Y_EQ = 330;              // muvozanat holatidagi yuk markazi
const MOUNT_Y = 52;            // shiftning pastki qirrasi
const SPRING_X = 200;
const BLOCK_W = 104, BLOCK_H = 64;
const RULER_X = 318, RULER_W = 44;
const GX0 = 420, GX1 = 776;    // x(t) grafigi gorizontal chegaralari

function yOf(x) { return Y_EQ + x * PX_PER_M; }

function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawSpring(p, top, bottom) {
    const lead = 14;            // yuqori va pastki to'g'ri uchlar
    const coils = 13;
    const half = 22;            // o'ram yarim kengligi
    const y0 = top + lead, y1 = bottom - lead;
    const seg = (y1 - y0) / (coils * 2);
    const pts = [[SPRING_X, top], [SPRING_X, y0]];
    for (let i = 0; i < coils * 2; i++) {
        const side = (i % 2 === 0) ? 1 : -1;
        pts.push([SPRING_X + side * half, y0 + seg * (i + 0.5)]);
    }
    pts.push([SPRING_X, y1], [SPRING_X, bottom]);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Asosiy sim va ustidagi yaltiroq chiziq — metall effekti
    [[p.spring, 4.5], [p.springHi, 1.4]].forEach(function (st, idx) {
        ctx.strokeStyle = st[0];
        ctx.lineWidth = st[1];
        ctx.beginPath();
        pts.forEach(function (q, i) {
            const dx = idx ? -1 : 0;
            if (i === 0) ctx.moveTo(q[0] + dx, q[1]); else ctx.lineTo(q[0] + dx, q[1]);
        });
        ctx.stroke();
    });
}

function drawArrow(p, color, x, y, len, label) {
    if (Math.abs(len) < 3) return;
    const dir = Math.sign(len);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len - dir * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + len);
    ctx.lineTo(x - 6, y + len - dir * 10);
    ctx.lineTo(x + 6, y + len - dir * 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + len + dir * 14 + (dir > 0 ? 2 : 0));
}

function draw() {
    const p = P();
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, p.bg1);
    bg.addColorStop(1, p.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const ampPx = state.A * PX_PER_M;
    const yBlock = yOf(state.x);
    const blockTop = yBlock - BLOCK_H / 2;

    // x(t) grafigi paneli (orqa fon)
    ctx.fillStyle = p.panel;
    ctx.strokeStyle = p.panelEdge;
    ctx.lineWidth = 1;
    roundRectPath(GX0 - 10, 130, GX1 - GX0 + 18, 390, 10);
    ctx.fill();
    ctx.stroke();

    // Chizg'ich (sm): 0 — muvozanat, pastga musbat
    const rTop = yOf(-0.25), rBot = yOf(0.25);
    ctx.fillStyle = p.ruler;
    ctx.strokeStyle = p.rulerEdge;
    ctx.lineWidth = 1.5;
    roundRectPath(RULER_X, rTop - 10, RULER_W, rBot - rTop + 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = p.tick;
    ctx.fillStyle = p.tick;
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let cm = -25; cm <= 25; cm++) {
        const y = yOf(cm / 100);
        const len = cm % 5 === 0 ? 14 : 7;
        ctx.lineWidth = cm % 5 === 0 ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(RULER_X, y);
        ctx.lineTo(RULER_X + len, y);
        ctx.stroke();
        if (cm % 5 === 0) ctx.fillText(String(cm), RULER_X + RULER_W - 3, y);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('x, sm', RULER_X + RULER_W / 2, rTop - 16);

    // Muvozanat chizig'i (yuk, chizg'ich va grafik orqali)
    ctx.strokeStyle = p.guide;
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(110, Y_EQ);
    ctx.lineTo(GX1, Y_EQ);
    ctx.stroke();
    // Amplituda chegaralari ±A
    ctx.strokeStyle = p.amp;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(130, Y_EQ - ampPx); ctx.lineTo(GX1, Y_EQ - ampPx);
    ctx.moveTo(130, Y_EQ + ampPx); ctx.lineTo(GX1, Y_EQ + ampPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.muted;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('muvozanat', 12, Y_EQ - 6);
    ctx.fillText('−A', 270, Y_EQ - ampPx - 4);
    ctx.fillText('+A', 270, Y_EQ + ampPx - 4);

    // Shift (mahkamlash joyi)
    ctx.fillStyle = p.mount;
    ctx.fillRect(SPRING_X - 90, MOUNT_Y - 14, 180, 14);
    ctx.strokeStyle = p.mountEdge;
    ctx.lineWidth = 2;
    for (let i = -84; i <= 90; i += 14) {
        ctx.beginPath();
        ctx.moveTo(SPRING_X + i, MOUNT_Y - 14);
        ctx.lineTo(SPRING_X + i - 10, MOUNT_Y - 28);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(SPRING_X - 90, MOUNT_Y - 14);
    ctx.lineTo(SPRING_X + 90, MOUNT_Y - 14);
    ctx.stroke();
    // Ilgak plastinkasi
    ctx.fillStyle = p.mountEdge;
    ctx.fillRect(SPRING_X - 10, MOUNT_Y, 20, 6);

    // Prujina (cho'ziladigan zig-zag)
    drawSpring(p, MOUNT_Y + 6, blockTop - 8);
    // Yuk ilgagi
    ctx.strokeStyle = p.spring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SPRING_X, blockTop - 4, 5, Math.PI, 0);
    ctx.stroke();

    // Yuk (blok)
    const bx = SPRING_X - BLOCK_W / 2;
    const grad = ctx.createLinearGradient(bx, blockTop, bx + BLOCK_W, blockTop + BLOCK_H);
    grad.addColorStop(0, p.block1);
    grad.addColorStop(1, p.block2);
    ctx.fillStyle = grad;
    roundRectPath(bx, blockTop, BLOCK_W, BLOCK_H, 8);
    ctx.fill();
    ctx.strokeStyle = p.blockEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.blockText;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.m.toFixed(2) + ' kg', SPRING_X, yBlock + 6);

    // Yuk markazidan chizg'ichgacha ko'rsatkich
    ctx.strokeStyle = p.trace;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + BLOCK_W, yBlock);
    ctx.lineTo(RULER_X + RULER_W + 2, yBlock);
    ctx.stroke();
    ctx.fillStyle = p.trace;
    ctx.beginPath();
    ctx.moveTo(RULER_X - 1, yBlock);
    ctx.lineTo(RULER_X - 9, yBlock - 5);
    ctx.lineTo(RULER_X - 9, yBlock + 5);
    ctx.closePath();
    ctx.fill();

    // Tezlik va tezlanish vektorlari (amplitudaga nisbatan)
    const w0 = omega0();
    const vRef = w0 * state.A, aRef = w0 * w0 * state.A;
    const a = accel(state.x, state.v);
    drawArrow(p, p.vel, 124, yBlock - 4, (state.v / vRef) * 58, 'v');
    drawArrow(p, p.acc, 98, yBlock - 4, (a / aRef) * 58, 'a');

    // ----- x(t) grafigi -----
    const win = graphWindow();
    const tNow = state.time;
    const tx = function (t) { return GX1 - (tNow - t) / win * (GX1 - GX0); };
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    const tStep = win > 6 ? 2 : (win > 3 ? 1 : 0.5);
    for (let t = Math.ceil((tNow - win) / tStep) * tStep; t <= tNow; t += tStep) {
        const gx = tx(t);
        if (gx < GX0) continue;
        ctx.beginPath();
        ctx.moveTo(gx, 140);
        ctx.lineTo(gx, 510);
        ctx.stroke();
    }
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('x(t) grafigi', GX0, 152);
    ctx.fillStyle = p.muted;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('oxirgi ' + win.toFixed(1) + ' s  ·  t →', GX1, 152);

    const hist = state.history;
    if (hist.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(GX0, 135, GX1 - GX0, 380);
        ctx.clip();
        ctx.strokeStyle = p.trace;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        hist.forEach(function (q, i) {
            const gx = tx(q[0]), gy = yOf(q[1]);
            if (i === 0) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
        });
        ctx.stroke();
        ctx.restore();
    }
    // Yozuvchi pero: yuk bilan bir balandlikda
    ctx.strokeStyle = p.amp;
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_X + RULER_W + 4, yBlock);
    ctx.lineTo(GX1, yBlock);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.trace;
    ctx.beginPath();
    ctx.arc(GX1, yBlock, 5, 0, Math.PI * 2);
    ctx.fill();

    // ----- Yuqori o'ng: parametrlar va joriy qiymatlar -----
    ctx.fillStyle = p.ink;
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('k = ' + state.k.toFixed(0) + ' N/m    T = 2π√(m/k) = ' + theoreticalPeriod().toFixed(3) + ' s', GX0 - 10, 34);
    ctx.font = '15px Arial';
    ctx.fillText('x = ' + fmtSigned(state.x * 100, 1) + ' sm', GX0 - 10, 62);
    ctx.fillText('t = ' + state.time.toFixed(2) + ' s', GX0 + 170, 62);
    ctx.fillStyle = p.vel;
    ctx.fillText('v = ' + fmtSigned(state.v, 3) + ' m/s', GX0 - 10, 86);
    ctx.fillStyle = p.acc;
    ctx.fillText('a = ' + fmtSigned(a, 2) + ' m/s²', GX0 + 170, 86);
    ctx.fillStyle = p.muted;
    ctx.font = '12px Arial';
    ctx.fillText('x — muvozanatdan siljish, pastga musbat', GX0 - 10, 110);

    // ----- Pastki qism: energiya ustunlari -----
    const ek = 0.5 * state.m * state.v * state.v;
    const ep = 0.5 * state.k * state.x * state.x;
    const e0 = 0.5 * state.k * state.A * state.A;
    const rows = [['Eₖ', ek, p.ek], ['Eₚ', ep, p.ep], ['E', ek + ep, p.et]];
    const BX = 70, BW = 460;
    rows.forEach(function (r, i) {
        const y = 530 + i * 22;
        ctx.fillStyle = p.barBg;
        roundRectPath(BX, y, BW, 15, 4);
        ctx.fill();
        const frac = Math.max(0, Math.min(1, r[1] / e0));
        if (frac > 0.002) {
            ctx.fillStyle = r[2];
            roundRectPath(BX, y, Math.max(6, BW * frac), 15, 4);
            ctx.fill();
        }
        ctx.fillStyle = p.ink;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(r[0], BX - 10, y + 12);
        ctx.textAlign = 'left';
        ctx.font = '14px Arial';
        ctx.fillText(fmtEnergy(r[1]) + ' J', BX + BW + 12, y + 12);
    });
    ctx.fillStyle = p.muted;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('E₀ = kA²/2 = ' + fmtEnergy(e0) + ' J', W - 16, 586);
}

function fmtSigned(v, d) {
    const s = v.toFixed(d);
    if (parseFloat(s) === 0) return (0).toFixed(d);
    return (v > 0 ? '+' : '') + s;
}
function fmtEnergy(e) { return e < 0.1 ? e.toFixed(4) : e.toFixed(3); }

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    if (dt > 0.05) dt = 0.05;

    if (state.running) {
        updatePhysics(dt);
        updateStats();
    }
    draw();

    if (state.running) {
        animationId = requestAnimationFrame(loop);
    }
}

function updateStats() {
    const T = theoreticalPeriod();
    const a = accel(state.x, state.v);
    const ek = 0.5 * state.m * state.v * state.v;
    const ep = 0.5 * state.k * state.x * state.x;
    document.getElementById('xValue').textContent = fmtSigned(state.x * 100, 1) + ' sm';
    document.getElementById('vValue').textContent = fmtSigned(state.v, 3) + ' m/s';
    document.getElementById('aValue').textContent = fmtSigned(a, 2) + ' m/s²';
    document.getElementById('periodValue').textContent = T.toFixed(3) + ' s';
    document.getElementById('oscValue').textContent = Math.floor(state.oscillations);
    document.getElementById('ekValue').textContent = fmtEnergy(ek) + ' J';
    document.getElementById('epValue').textContent = fmtEnergy(ep) + ' J';
    document.getElementById('eValue').textContent = fmtEnergy(ek + ep) + ' J';
    document.getElementById('dl0Value').textContent = (staticStretch() * 100).toFixed(1) + ' sm';

    // Davr qo'shni nol nuqtadan o'tishlar orasi = T/2 ekanligidan o'lchanadi
    const ct = state.crossTimes;
    if (ct.length >= 2) {
        const measuredT = 2 * (ct[ct.length - 1] - ct[0]) / (ct.length - 1);
        document.getElementById('measuredT').textContent = measuredT.toFixed(3) + ' s';
        const errPct = (measuredT - T) / T * 100;
        document.getElementById('tError').textContent = fmtSigned(errPct, 2) + '%';
    }
}

function startSpring() {
    if (!state.running) {
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pauseSpring() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
}

// Qayta: yuk yana +A ga tortib qo'yiladi, sozlamalar (m, k, A, b) saqlanadi
function resetSpring() {
    pauseSpring();
    state.x = state.A;
    state.v = 0;
    state.time = 0;
    state.oscillations = 0;
    state.crossTimes = [];
    state.history = [[0, state.x]];
    document.getElementById('measuredT').textContent = '-';
    document.getElementById('tError').textContent = '-';
    updateStats();
    draw();
}

resetSpring();
updateWarn();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startSpring, pause: pauseSpring, reset: resetSpring };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'm (kg)',          get: function () { return +state.m.toFixed(2); } },
    { label: 'k (N/m)',         get: function () { return state.k; } },
    { label: 'A (m)',           get: function () { return +state.A.toFixed(2); } },
    { label: 'b (kg/s)',        get: function () { return +state.b.toFixed(2); } },
    { label: 'T nazariy (s)',   get: function () { return +theoreticalPeriod().toFixed(3); } },
    { label: 'T o\'lch. (s)',   get: function () { return labNum('measuredT'); } },
    { label: 'Farq (%)',        get: function () { return labNum('tError'); } },
    { label: 'Tebranish',       get: function () { return Math.floor(state.oscillations); } },
    { label: 'E (J)',           get: function () { return labNum('eValue'); } }
];
