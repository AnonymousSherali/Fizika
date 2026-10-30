/* gaz_qonunlari_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('gasCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg1: '#f4f8ec', bg2: '#e6efd8', ink: '#1f2e10', muted: '#55654a',
                wall: '#78848c', wallEdge: '#455a64', gas: 'rgba(132,204,22,0.08)',
                piston: '#4b5563', pistonEdge: '#1f2937', rod: '#6b7280',
                dial: '#ffffff', dialEdge: '#37474f', tick: '#607d8b',
                glass: '#ffffff', glassEdge: '#90a4ae',
                grid: 'rgba(55,71,79,0.12)', axis: '#37474f', ref: 'rgba(96,125,139,0.38)',
                curve: '#4d7c0f', point: '#c2410c', box: 'rgba(255,255,255,0.75)', boxEdge: '#c5d6ae' };
const DARK  = { bg1: '#0e1710', bg2: '#122016', ink: '#e3f2d0', muted: '#9fb38e',
                wall: '#5b6b75', wallEdge: '#90a4ae', gas: 'rgba(163,230,53,0.06)',
                piston: '#64748b', pistonEdge: '#cbd5e1', rod: '#94a3b8',
                dial: '#18241a', dialEdge: '#9fb38e', tick: '#7c9473',
                glass: '#1c2a1e', glassEdge: '#5f7a63',
                grid: 'rgba(200,230,180,0.10)', axis: '#b8cca8', ref: 'rgba(160,190,150,0.32)',
                curve: '#a3e635', point: '#fb923c', box: 'rgba(20,32,22,0.8)', boxEdge: '#2f4a2c' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

// ===== Fizik kattaliklar =====
const NU = 0.05;       // mol
const R = 8.31;        // J/(mol·K)
const M = 0.028;       // kg/mol (azot)
const V_MIN = 0.5, V_MAX = 3.0;     // L
const T_MIN = 100, T_MAX = 600;     // K
const P_SCALE = 500;                // manometr shkalasi, kPa

const MODES = {
    isoT: { name: 'Izotermik', law: 'Boyl–Mariott qonuni: pV = const (T = const)' },
    isoP: { name: 'Izobarik',  law: 'Gey-Lyussak qonuni: V/T = const (p = const)' },
    isoV: { name: 'Izoxorik',  law: 'Sharl qonuni: p/T = const (V = const)' }
};

let state = {
    mode: 'isoT',
    V: 2.0,           // L
    T: 300,           // K
    p0: 0,            // izobarik jarayondagi o'zgarmas bosim, kPa
    start: null,      // jarayon boshlangan holat {V, T}
    running: false
};

// p = νRT / V  (V litrda -> m³; natija kPa)
function pressure() { return NU * R * state.T / (state.V * 1e-3) / 1000; }
function vrms() { return Math.sqrt(3 * R * state.T / M); }

let animationId = null;
let lastTimestamp = null;

// ===== Molekulalar =====
const N_MOL = 80;
const MOL_R = 4;
let molecules = [];
function initMolecules() {
    molecules = [];
    for (let i = 0; i < N_MOL; i++) {
        const a = Math.random() * Math.PI * 2;
        molecules.push({
            u: Math.random(), v: Math.random(),     // gaz sohasidagi normallashgan koordinata
            dx: Math.cos(a), dy: Math.sin(a),       // yo'nalish
            f: 0.55 + Math.random() * 0.9           // tezliklar taqsimoti (Maksvell taxminan)
        });
    }
}

// ===== Kanvas geometriyasi =====
const CYL = { outerL: 130, outerR: 340, wall: 10, bottom: 520, top: 128 };
const PX_PER_L = 120;
function gasRect() {
    const x0 = CYL.outerL + CYL.wall, x1 = CYL.outerR - CYL.wall;
    const h = state.V * PX_PER_L;
    return { x0: x0, x1: x1, y1: CYL.bottom, y0: CYL.bottom - h };
}

function updatePhysics(dt) {
    const g = gasRect();
    const W = g.x1 - g.x0 - 2 * MOL_R, H = g.y1 - g.y0 - 2 * MOL_R;
    const s = 140 * Math.sqrt(state.T / 300);   // px/s, v ~ √T
    for (const m of molecules) {
        m.u += m.dx * m.f * s * dt / W;
        m.v += m.dy * m.f * s * dt / H;
        if (m.u < 0) { m.u = -m.u; m.dx = Math.abs(m.dx); }
        if (m.u > 1) { m.u = 2 - m.u; m.dx = -Math.abs(m.dx); }
        if (m.v < 0) { m.v = -m.v; m.dy = Math.abs(m.dy); }
        if (m.v > 1) { m.v = 2 - m.v; m.dy = -Math.abs(m.dy); }
    }
}

// ===== Boshqaruv =====
const volSlider = document.getElementById('volSlider');
const tempSlider = document.getElementById('tempSlider');

function paintSlider(s) {
    const min = parseFloat(s.min), max = parseFloat(s.max);
    const pct = max > min ? (parseFloat(s.value) - min) / (max - min) * 100 : 0;
    s.style.setProperty('--fill', Math.max(0, Math.min(100, pct)) + '%');
}

volSlider.oninput = function () {
    if (state.mode !== 'isoT') return;
    state.V = parseFloat(this.value);
    refresh();
};
tempSlider.oninput = function () {
    if (state.mode === 'isoT') return;
    state.T = parseFloat(this.value);
    if (state.mode === 'isoP') {
        // p o'zgarmas: V = νRT / p
        state.V = NU * R * state.T / (state.p0 * 1000) * 1000;
    }
    refresh();
};

function setMode(m, evt) {
    state.mode = m;
    ['isoT', 'isoP', 'isoV'].forEach(function (k) {
        const b = document.getElementById('modeIso' + k.slice(3));
        b.classList.toggle('active', k === m);
        b.setAttribute('aria-checked', k === m ? 'true' : 'false');
    });
    beginProcess();
    refresh();
}

// Jarayon hozirgi holatdan boshlanadi: o'zgarmas kattalik shu holatdan olinadi
function beginProcess() {
    state.start = { V: state.V, T: state.T };
    state.p0 = pressure();
    volSlider.disabled = state.mode !== 'isoT';
    tempSlider.disabled = state.mode === 'isoT';
    const tr = document.getElementById('tempRange');
    if (state.mode === 'isoP') {
        // Porshen silindrdan chiqmasligi uchun: V_MIN <= νRT/p <= V_MAX
        const k = NU * R / (state.p0 * 1000) * 1000;          // L/K
        // (1e-6 — suzuvchi nuqta xatosi chegarani bir qadamga surib yubormasin)
        const lo = Math.min(state.T, Math.max(T_MIN, Math.ceil(V_MIN / k / 5 - 1e-6) * 5));
        const hi = Math.max(state.T, Math.min(T_MAX, Math.floor(V_MAX / k / 5 + 1e-6) * 5));
        tempSlider.min = lo; tempSlider.max = hi;
        tr.hidden = false;
        tr.innerHTML = 'Porshen silindrdan chiqmasligi uchun bu bosimda T: <strong>' + lo + '–' + hi + ' K</strong>';
    } else {
        tempSlider.min = T_MIN; tempSlider.max = T_MAX;
        tr.hidden = true;
    }
    const hint = document.getElementById('modeHint');
    if (state.mode === 'isoT') hint.innerHTML = '🔒 <strong>T = ' + state.T.toFixed(0) + ' K</strong> o\'zgarmas (termostat). Hajmni o\'zgartiring — bosim hisoblanadi.';
    else if (state.mode === 'isoP') hint.innerHTML = '🔒 <strong>p = ' + state.p0.toFixed(1) + ' kPa</strong> o\'zgarmas (porshen erkin). Haroratni o\'zgartiring — hajm hisoblanadi.';
    else hint.innerHTML = '🔒 <strong>V = ' + state.V.toFixed(2) + ' L</strong> o\'zgarmas (porshen mahkamlangan). Haroratni o\'zgartiring — bosim hisoblanadi.';
}

function invariant() {
    const p = pressure();
    if (state.mode === 'isoT') return { label: 'pV (T = const):', text: (p * state.V).toFixed(2) + ' J', short: 'pV = ' + (p * state.V).toFixed(2) + ' J' };
    if (state.mode === 'isoP') return { label: 'V/T (p = const):', text: (state.V / state.T * 1000).toFixed(3) + ' mL/K', short: 'V/T = ' + (state.V / state.T * 1000).toFixed(3) + ' mL/K' };
    return { label: 'p/T (V = const):', text: (p * 1000 / state.T).toFixed(1) + ' Pa/K', short: 'p/T = ' + (p * 1000 / state.T).toFixed(1) + ' Pa/K' };
}

function updateStats() {
    const p = pressure();
    document.getElementById('volValue').textContent = state.V.toFixed(2) + ' L';
    document.getElementById('tempValue').textContent = state.T.toFixed(0) + ' K';
    document.getElementById('procValue').textContent = MODES[state.mode].name;
    document.getElementById('pValue').textContent = p.toFixed(1) + ' kPa';
    document.getElementById('vValue').textContent = state.V.toFixed(2) + ' L';
    document.getElementById('tValue').textContent = state.T.toFixed(0) + ' K (' + (state.T - 273).toFixed(0) + ' °C)';
    const inv = invariant();
    document.getElementById('invLabel').textContent = inv.label;
    document.getElementById('invValue').textContent = inv.text;
    document.getElementById('speedValue').textContent = vrms().toFixed(0) + ' m/s';
}

// Slayderlarni holatga moslash (hisoblangan kattalik ham ko'rinsin)
function syncSliders() {
    volSlider.value = state.V;
    tempSlider.value = state.T;
    paintSlider(volSlider);
    paintSlider(tempSlider);
}

function refresh() {
    syncSliders();
    updateStats();
    if (!state.running) draw();
}

// ===== Chizish =====
function tempHue(T) {
    const k = Math.max(0, Math.min(1, (T - T_MIN) / (T_MAX - T_MIN)));
    // ko'k (sovuq) -> binafsha -> qizil (issiq); yashil fon bilan qo'shilib ketmasin
    return (215 + 145 * k) % 360;
}

function drawCylinder(pal) {
    const g = gasRect();
    const hue = tempHue(state.T);
    const dark = pal === DARK;

    // Termostat plitasi
    const plate = ctx.createLinearGradient(CYL.outerL - 12, 0, CYL.outerR + 12, 0);
    plate.addColorStop(0, 'hsl(' + hue + ',75%,' + (dark ? 38 : 50) + '%)');
    plate.addColorStop(0.5, 'hsl(' + hue + ',85%,' + (dark ? 50 : 62) + '%)');
    plate.addColorStop(1, 'hsl(' + hue + ',75%,' + (dark ? 38 : 50) + '%)');
    ctx.fillStyle = plate;
    roundRect(CYL.outerL - 14, CYL.bottom + 14, CYL.outerR - CYL.outerL + 28, 18, 5);
    ctx.fill();
    ctx.fillStyle = pal.muted;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('termostat', (CYL.outerL + CYL.outerR) / 2, CYL.bottom + 50);

    // Gaz sohasi (harorat rangida juda och fon)
    ctx.fillStyle = 'hsla(' + hue + ',80%,55%,' + (dark ? 0.12 : 0.10) + ')';
    ctx.fillRect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0);

    // Molekulalar
    const W = g.x1 - g.x0 - 2 * MOL_R, H = g.y1 - g.y0 - 2 * MOL_R;
    for (const m of molecules) {
        const x = g.x0 + MOL_R + m.u * W;
        const y = g.y1 - MOL_R - m.v * H;
        const light = (dark ? 52 : 46) + (m.f - 1) * 14;
        ctx.fillStyle = 'hsl(' + hue + ',85%,' + light + '%)';
        ctx.beginPath();
        ctx.arc(x, y, MOL_R, 0, Math.PI * 2);
        ctx.fill();
    }

    // Silindr devorlari (yuqorisi ochiq)
    ctx.fillStyle = pal.wall;
    ctx.fillRect(CYL.outerL, CYL.top, CYL.wall, CYL.bottom - CYL.top + CYL.wall);
    ctx.fillRect(CYL.outerR - CYL.wall, CYL.top, CYL.wall, CYL.bottom - CYL.top + CYL.wall);
    ctx.fillRect(CYL.outerL, CYL.bottom, CYL.outerR - CYL.outerL, CYL.wall);
    ctx.strokeStyle = pal.wallEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(CYL.outerL, CYL.top, CYL.outerR - CYL.outerL, CYL.bottom - CYL.top + CYL.wall);

    // Hajm shkalasi (o'ng devor tashqarisida)
    ctx.strokeStyle = pal.tick;
    ctx.fillStyle = pal.muted;
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.lineWidth = 1.5;
    for (let v = 0.5; v <= V_MAX + 1e-9; v += 0.5) {
        const y = CYL.bottom - v * PX_PER_L;
        const major = Math.abs(v - Math.round(v)) < 1e-9;
        ctx.beginPath();
        ctx.moveTo(CYL.outerR, y);
        ctx.lineTo(CYL.outerR + (major ? 10 : 6), y);
        ctx.stroke();
        if (major) ctx.fillText(v.toFixed(0) + ' L', CYL.outerR + 13, y + 4);
    }

    // Porshen va dasta
    const pTop = g.y0 - 18;
    ctx.fillStyle = pal.rod;
    ctx.fillRect((g.x0 + g.x1) / 2 - 5, 70, 10, pTop - 70);
    ctx.fillRect((g.x0 + g.x1) / 2 - 34, 62, 68, 10);
    const pg = ctx.createLinearGradient(0, pTop, 0, g.y0);
    pg.addColorStop(0, pal.piston);
    pg.addColorStop(1, pal.pistonEdge);
    ctx.fillStyle = pg;
    ctx.fillRect(g.x0, pTop, g.x1 - g.x0, 18);
    ctx.strokeStyle = pal.pistonEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.x0, pTop, g.x1 - g.x0, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('V = ' + state.V.toFixed(2) + ' L', (g.x0 + g.x1) / 2, pTop + 13.5);

    // Izoxorik: porshen mahkamlangan (to'xtatgichlar)
    if (state.mode === 'isoV') {
        ctx.fillStyle = pal.point;
        ctx.fillRect(g.x0, pTop - 8, 14, 8);
        ctx.fillRect(g.x1 - 14, pTop - 8, 14, 8);
    }
}

function drawManometer(pal, p) {
    const cx = 425, cy = 205, r = 54;
    // Ulovchi trubka
    ctx.strokeStyle = pal.wall;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(CYL.outerR, 500);
    ctx.lineTo(cx, 500);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    ctx.fillStyle = pal.dial;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.dialEdge;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Shkala: 0..500 kPa, 270° yoy
    const a0 = 135 * Math.PI / 180, sweep = 270 * Math.PI / 180;
    ctx.lineWidth = 1.5;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let v = 0; v <= P_SCALE; v += 50) {
        const a = a0 + sweep * v / P_SCALE;
        const major = v % 100 === 0;
        ctx.strokeStyle = pal.tick;
        ctx.beginPath();
        ctx.moveTo(cx + (r - (major ? 11 : 7)) * Math.cos(a), cy + (r - (major ? 11 : 7)) * Math.sin(a));
        ctx.lineTo(cx + (r - 3) * Math.cos(a), cy + (r - 3) * Math.sin(a));
        ctx.stroke();
        if (major) {
            ctx.fillStyle = pal.muted;
            ctx.fillText(v, cx + (r - 22) * Math.cos(a), cy + (r - 22) * Math.sin(a) + 3.5);
        }
    }
    // Strelka
    const a = a0 + sweep * Math.min(1, p / P_SCALE);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * Math.cos(a), cy - 8 * Math.sin(a));
    ctx.lineTo(cx + (r - 9) * Math.cos(a), cy + (r - 9) * Math.sin(a));
    ctx.stroke();
    ctx.fillStyle = pal.dialEdge;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.muted;
    ctx.font = '11px Arial';
    ctx.font = '10px Arial';
    ctx.fillText('kPa', cx, cy + 42);

    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 15px Arial';
    ctx.fillText('p = ' + p.toFixed(1) + ' kPa', cx, cy - r - 10);
    ctx.fillStyle = pal.muted;
    ctx.font = '12px Arial';
    ctx.fillText('manometr', cx, cy - r - 30);
}

function drawThermometer(pal) {
    const x = 75, yTop = 170, yBot = 492, bulbY = 510;
    const yOf = function (T) { return 470 - (T - T_MIN) / (T_MAX - T_MIN) * 280; };
    // Shisha
    ctx.fillStyle = pal.glass;
    ctx.strokeStyle = pal.glassEdge;
    ctx.lineWidth = 2;
    roundRect(x - 8, yTop, 16, yBot - yTop + 8, 8);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, bulbY, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Suyuqlik ustuni
    const col = '#dc2626';   // termometr suyuqligi (spirt) — an'anaviy qizil
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, bulbY, 10, 0, Math.PI * 2);
    ctx.fill();
    const yT = yOf(state.T);
    ctx.fillRect(x - 4, yT, 8, bulbY - yT);
    // Shkala
    ctx.strokeStyle = pal.tick;
    ctx.fillStyle = pal.muted;
    ctx.lineWidth = 1.2;
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    for (let T = T_MIN; T <= T_MAX; T += 50) {
        const y = yOf(T);
        const major = T % 100 === 0;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x - (major ? 17 : 13), y);
        ctx.stroke();
        if (major) ctx.fillText(T, x - 20, y + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('T, K', x - 14, yTop - 10);
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(state.T.toFixed(0) + ' K', x, bulbY + 34);
    ctx.fillStyle = pal.muted;
    ctx.font = '12px Arial';
    ctx.fillText('(' + (state.T - 273).toFixed(0) + ' °C)', x, bulbY + 50);
}

// Jarayon grafigi: p–V, V–T yoki p–T
function drawDiagram(pal, p) {
    const X0 = 548, X1 = 772, Y0 = 92, Y1 = 392;
    let xMax, yMax, xLab, yLab, xStep, yStep, xLabelEvery, title;
    if (state.mode === 'isoT') { xMax = 3.2; yMax = 520; xLab = 'V, L'; yLab = 'p, kPa'; xStep = 0.5; xLabelEvery = 1; yStep = 100; title = 'p–V diagramma (izoterma)'; }
    else if (state.mode === 'isoP') { xMax = 650; yMax = 3.2; xLab = 'T, K'; yLab = 'V, L'; xStep = 100; xLabelEvery = 200; yStep = 0.5; title = 'V–T diagramma (izobara)'; }
    else { xMax = 650; yMax = 520; xLab = 'T, K'; yLab = 'p, kPa'; xStep = 100; xLabelEvery = 200; yStep = 100; title = 'p–T diagramma (izoxora)'; }
    const sx = function (x) { return X0 + x / xMax * (X1 - X0); };
    const sy = function (y) { return Y1 - y / yMax * (Y1 - Y0); };

    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, (X0 + X1) / 2 - 10, Y0 - 34);

    // To'r va bo'linmalar
    ctx.lineWidth = 1;
    ctx.font = '11px Arial';
    for (let x = 0; x <= xMax + 1e-9; x += xStep) {
        ctx.strokeStyle = pal.grid;
        ctx.beginPath(); ctx.moveTo(sx(x), Y0); ctx.lineTo(sx(x), Y1); ctx.stroke();
        const lbl = Math.abs(x / xLabelEvery - Math.round(x / xLabelEvery)) < 1e-9;
        if (lbl) { ctx.fillStyle = pal.muted; ctx.textAlign = 'center'; ctx.fillText(+x.toFixed(1), sx(x), Y1 + 15); }
    }
    for (let y = 0; y <= yMax + 1e-9; y += yStep) {
        ctx.strokeStyle = pal.grid;
        ctx.beginPath(); ctx.moveTo(X0, sy(y)); ctx.lineTo(X1, sy(y)); ctx.stroke();
        const lbl = yStep < 1 ? Math.abs(y - Math.round(y)) < 1e-9 : true;
        if (lbl) { ctx.fillStyle = pal.muted; ctx.textAlign = 'right'; ctx.fillText(+y.toFixed(1), X0 - 6, sy(y) + 4); }
    }
    // O'qlar
    ctx.strokeStyle = pal.axis;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(X0, Y0 - 12); ctx.lineTo(X0, Y1); ctx.lineTo(X1 + 12, Y1);
    ctx.stroke();
    ctx.fillStyle = pal.axis;
    ctx.beginPath(); ctx.moveTo(X0, Y0 - 18); ctx.lineTo(X0 - 5, Y0 - 8); ctx.lineTo(X0 + 5, Y0 - 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(X1 + 18, Y1); ctx.lineTo(X1 + 8, Y1 - 5); ctx.lineTo(X1 + 8, Y1 + 5); ctx.fill();
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(yLab, X0 + 8, Y0 - 10);
    ctx.textAlign = 'right';
    ctx.fillText(xLab, X1 + 16, Y1 + 30);

    ctx.save();
    ctx.beginPath();
    ctx.rect(X0, Y0 - 12, X1 - X0 + 12, Y1 - Y0 + 12);
    ctx.clip();

    // Solishtirish uchun boshqa chiziqlar (xira) va joriy jarayon chizig'i
    const curve = function (fn, a, b, style, width, dash) {
        ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
        ctx.beginPath();
        const n = 80;
        for (let i = 0; i <= n; i++) {
            const x = a + (b - a) * i / n;
            const y = fn(x);
            if (i === 0) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y));
        }
        ctx.stroke();
        ctx.setLineDash([]);
    };
    const nuR = NU * R;
    let curLabel;
    if (state.mode === 'isoT') {
        // Izotermalar p = νRT/V
        for (let T = 100; T <= 600; T += 100) {
            if (Math.abs(T - state.T) < 1) continue;
            curve(function (V) { return nuR * T / V; }, 0.12, xMax, pal.ref, 1, [4, 4]);
        }
        curve(function (V) { return nuR * state.T / V; }, 0.12, xMax, pal.curve, 1.5, [5, 4]);
        curve(function (V) { return nuR * state.T / V; }, V_MIN, V_MAX, pal.curve, 3.2);
        curLabel = 'T = ' + state.T.toFixed(0) + ' K';
    } else if (state.mode === 'isoP') {
        // Izobaralar V = νRT/p (koordinata boshidan)
        [50, 100, 200, 400].forEach(function (pp) {
            if (Math.abs(pp - state.p0) < 2) return;
            curve(function (T) { return nuR * T / pp; }, 0, xMax, pal.ref, 1, [4, 4]);
        });
        const k = nuR / state.p0;
        curve(function (T) { return k * T; }, 0, xMax, pal.curve, 1.5, [5, 4]);
        curve(function (T) { return k * T; }, parseFloat(tempSlider.min), parseFloat(tempSlider.max), pal.curve, 3.2);
        curLabel = 'p = ' + state.p0.toFixed(1) + ' kPa';
    } else {
        // Izoxoralar p = νRT/V (koordinata boshidan)
        [0.5, 1, 2, 3].forEach(function (VV) {
            if (Math.abs(VV - state.V) < 0.01) return;
            curve(function (T) { return nuR * T / VV; }, 0, xMax, pal.ref, 1, [4, 4]);
        });
        curve(function (T) { return nuR * T / state.V; }, 0, xMax, pal.curve, 1.5, [5, 4]);
        curve(function (T) { return nuR * T / state.V; }, T_MIN, T_MAX, pal.curve, 3.2);
        curLabel = 'V = ' + state.V.toFixed(2) + ' L';
    }

    // Holat nuqtalari
    const pt = function (st) {
        const pp = nuR * st.T / st.V;
        if (state.mode === 'isoT') return [sx(st.V), sy(pp)];
        if (state.mode === 'isoP') return [sx(st.T), sy(st.V)];
        return [sx(st.T), sy(pp)];
    };
    const s1 = pt(state.start);
    ctx.strokeStyle = pal.point; ctx.lineWidth = 2;
    ctx.fillStyle = pal.dial;
    ctx.beginPath(); ctx.arc(s1[0], s1[1], 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const c = pt(state);
    ctx.fillStyle = pal.point;
    ctx.beginPath(); ctx.arc(c[0], c[1], 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.dial; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // Belgilar
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = pal.curve;
    ctx.textAlign = 'right';
    ctx.fillText(curLabel, X1, Y0 + 8);
    ctx.font = '11px Arial';
    ctx.fillStyle = pal.muted;
    ctx.textAlign = 'left';
    ctx.fillText('○ boshlang\'ich   ● hozirgi holat', X0 + 4, Y1 + 44);
}

function drawInfoBox(pal, p) {
    const x = 500, y = 456, w = 284, h = 124;
    ctx.fillStyle = pal.box;
    ctx.strokeStyle = pal.boxEdge;
    ctx.lineWidth = 1.5;
    roundRect(x, y, w, h, 10);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.muted;
    ctx.font = '13px Arial';
    ctx.fillText('ν = 0.05 mol N₂,  pV = νRT', x + 14, y + 22);
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 14px Arial';
    ctx.fillText('p = ' + p.toFixed(1) + ' kPa   V = ' + state.V.toFixed(2) + ' L   T = ' + state.T.toFixed(0) + ' K', x + 14, y + 46);
    ctx.fillStyle = pal.curve;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(invariant().short + ' = const', x + 14, y + 78);
    ctx.fillStyle = pal.muted;
    ctx.font = '13px Arial';
    ctx.fillText('v_kv = √(3RT/M) ≈ ' + vrms().toFixed(0) + ' m/s', x + 14, y + 106);
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function draw() {
    const pal = P();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, pal.bg1);
    bg.addColorStop(1, pal.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = pressure();

    // Sarlavha
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(MODES[state.mode].name + ' jarayon', 20, 32);
    ctx.fillStyle = pal.muted;
    ctx.font = '13px Arial';
    ctx.fillText(MODES[state.mode].law, 20, 52);

    drawThermometer(pal);
    drawManometer(pal, p);
    drawCylinder(pal);
    drawDiagram(pal, p);
    drawInfoBox(pal, p);
}

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    if (dt > 0.05) dt = 0.05;

    if (state.running) updatePhysics(dt);
    draw();

    if (state.running) {
        animationId = requestAnimationFrame(loop);
    }
}

function startGas() {
    if (!state.running) {
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pauseGas() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    draw();
}

function resetGas() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    state.V = 2.0;
    state.T = 300;
    initMolecules();
    beginProcess();
    refresh();
    draw();
}

resetGas();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startGas, pause: pauseGas, reset: resetGas };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'Jarayon',       get: function () { return MODES[state.mode].name; } },
    { label: 'p (kPa)',       get: function () { return pressure().toFixed(1); } },
    { label: 'V (L)',         get: function () { return state.V.toFixed(2); } },
    { label: 'T (K)',         get: function () { return state.T.toFixed(0); } },
    { label: 'pV (J)',        get: function () { return (pressure() * state.V).toFixed(2); } },
    { label: 'V/T (mL/K)',    get: function () { return (state.V / state.T * 1000).toFixed(3); } },
    { label: 'p/T (Pa/K)',    get: function () { return (pressure() * 1000 / state.T).toFixed(1); } }
];
