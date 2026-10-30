/* radioaktiv_yemirilish_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('decayCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg1: '#fefce8', bg2: '#fef9c3', ink: '#422006', muted: '#8a6a2f', grid: 'rgba(161,98,7,0.13)',
                nuc1: '#fde047', nuc2: '#ca8a04', nucEdge: '#854d0e',
                dec1: '#e2e8f0', dec2: '#94a3b8', decEdge: '#64748b',
                flash: 'rgba(234,88,12,0.9)', alpha: '#dc2626', beta: '#2563eb',
                panel: 'rgba(255,255,255,0.85)', panelEdge: 'rgba(161,98,7,0.28)',
                sim: '#b45309', theory: '#2563eb', marker: '#9ca3af', box: 'rgba(161,98,7,0.06)' };
const DARK  = { bg1: '#17130a', bg2: '#1f1a0c', ink: '#fef3c7', muted: '#c8b27a', grid: 'rgba(253,224,71,0.11)',
                nuc1: '#fde047', nuc2: '#a16207', nucEdge: '#fde68a',
                dec1: '#64748b', dec2: '#334155', decEdge: '#475569',
                flash: 'rgba(251,146,60,0.95)', alpha: '#f87171', beta: '#60a5fa',
                panel: 'rgba(41,33,14,0.9)', panelEdge: 'rgba(253,224,71,0.25)',
                sim: '#fbbf24', theory: '#93c5fd', marker: '#6b7280', box: 'rgba(253,224,71,0.05)' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

// Haqiqiy izotoplar: T½ va parchalanish turi
const isotopes = {
    free: { name: 'Erkin model', sym: 'X', half: null, unit: '', type: 'α', daughter: 'Y' },
    rn:   { name: 'Radon-222',  sym: '²²²Rn', half: 3.8,  unit: 'kun', type: 'α',  daughter: '²¹⁸Po' },
    i:    { name: 'Iod-131',    sym: '¹³¹I',  half: 8.02, unit: 'kun', type: 'β⁻', daughter: '¹³¹Xe' },
    co:   { name: 'Kobalt-60',  sym: '⁶⁰Co',  half: 5.27, unit: 'yil', type: 'β⁻', daughter: '⁶⁰Ni' },
    c:    { name: 'Uglerod-14', sym: '¹⁴C',   half: 5730, unit: 'yil', type: 'β⁻', daughter: '¹⁴N' }
};

const GRID = { x: 20, y: 58, w: 420, h: 400 };
// Faollikni o'lchash oynasi: T½ ning ~10% i (0.25…1 s) — o'rtacha qiymat oniy λN dan kam farq qilsin
function actWin() { return Math.min(1, Math.max(0.25, 0.1 * state.T)); }

let state = {
    N0: 400, T: 5, iso: 'free', stopAtHalf: true,
    nuclei: [],        // har bir yadro: parchalangan vaqti yoki −1
    N: 400,
    time: 0,
    running: false,
    nextStop: 1,       // keyingi to'xtash: nextStop·T½
    hist: [],          // [t, N]
    decayTimes: [],    // faollik uchun
    particles: [],
    t50: null, t25: null,
    pos: []
};

const PART_LIFE = 0.9;   // zarra ko'rinish vaqti, s

let animationId = null;
let lastTimestamp = null;

function lambda() { return Math.LN2 / state.T; }
function nTheory(t) { return state.N0 * Math.pow(2, -t / state.T); }

// ----- Yadrolar to'ri -----
function layout() {
    const N = state.N0;
    const cols = Math.ceil(Math.sqrt(N * GRID.w / GRID.h));
    const rows = Math.ceil(N / cols);
    const cell = Math.min(GRID.w / cols, GRID.h / rows);
    const ox = GRID.x + (GRID.w - cols * cell) / 2, oy = GRID.y + (GRID.h - rows * cell) / 2;
    state.cell = cell;
    state.pos = [];
    for (let i = 0; i < N; i++) {
        // Kichik siljish (tabiiyroq ko'rinish), har safar bir xil — indeksdan
        const jx = Math.sin(i * 12.9898) * 0.12, jy = Math.sin(i * 78.233) * 0.12;
        state.pos.push([ox + (i % cols + 0.5 + jx) * cell, oy + (Math.floor(i / cols) + 0.5 + jy) * cell]);
    }
}

function createNuclei() {
    state.nuclei = new Array(state.N0).fill(-1);
    state.N = state.N0;
    layout();
}

function updatePhysics(dtIn) {
    let dt = dtIn;
    let stopNow = false;
    // "Har T½ da to'xtash": vaqt aynan k·T½ ga yetganda to'xtaydi
    if (state.stopAtHalf) {
        const tStop = state.nextStop * state.T;
        if (state.time + dt >= tStop - 1e-9) {
            dt = Math.max(0, tStop - state.time);
            stopNow = true;
        }
    }
    const t1 = state.time + dt;
    const p = 1 - Math.exp(-lambda() * dt);
    const anyBeta = isotopes[state.iso].type !== 'α';
    for (let i = 0; i < state.nuclei.length; i++) {
        if (state.nuclei[i] >= 0) continue;
        if (Math.random() < p) {
            const td = state.time + Math.random() * dt;
            state.nuclei[i] = td;
            state.N--;
            state.decayTimes.push(td);
            if (state.particles.length < 160) {
                const ang = Math.random() * Math.PI * 2;
                const sp = anyBeta ? 260 : 170;
                state.particles.push({ x: state.pos[i][0], y: state.pos[i][1],
                    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t0: t1 });
            }
        }
    }
    state.time = t1;
    // N₀/2 va N₀/4 ga birinchi marta tushgan vaqt
    if (state.t50 === null && state.N <= state.N0 / 2) state.t50 = t1;
    if (state.t25 === null && state.N <= state.N0 / 4) state.t25 = t1;
    const last = state.hist[state.hist.length - 1];
    if (!last || t1 - last[0] >= 0.05 || stopNow || last[1] !== state.N) state.hist.push([t1, state.N]);
    while (state.decayTimes.length && state.decayTimes[0] < t1 - actWin()) state.decayTimes.shift();
    state.particles = state.particles.filter(q => t1 - q.t0 < PART_LIFE);
    if (stopNow) {
        state.nextStop++;
        pauseDecay();
    }
    if (state.N === 0 && state.running) pauseDecay();
}

function measuredActivity() {
    if (state.time <= 0) return null;
    const win = Math.min(actWin(), state.time);
    return state.decayTimes.filter(t => t > state.time - win).length / win;
}

// ----- Sozlamalar -----
function onStructuralChange() {
    // N₀ yoki T½ o'zgarsa — tajriba boshidan (yangi yadrolar bilan) boshlanadi
    const wasRunning = state.running;
    resetDecay();
    if (wasRunning) startDecay();
}
document.getElementById('n0Slider').oninput = function() {
    state.N0 = parseInt(this.value);
    document.getElementById('n0Value').textContent = state.N0;
    onStructuralChange();
};
document.getElementById('tSlider').oninput = function() {
    state.T = parseFloat(this.value);
    document.getElementById('tValue').textContent = state.T.toFixed(1) + ' s';
    onStructuralChange();
};

function selectIsotope(key, evt) {
    document.querySelectorAll('.iso-selector .planet-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
    });
    const t = (evt || window.event) ? (evt || window.event).target : null;
    if (t) {
        const btn = t.closest ? t.closest('.planet-btn') : t;
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
    }
    state.iso = key;
    // Izotop faqat vaqt masshtabini va zarra turini belgilaydi — yemirilish jarayoni davom etadi
    updateStats();
    if (!state.running) draw();
}

function setStopMode(on, evt) {
    state.stopAtHalf = on;
    const bC = document.getElementById('modeCont'), bS = document.getElementById('modeStop');
    bC.classList.toggle('active', !on);
    bS.classList.toggle('active', on);
    bC.setAttribute('aria-checked', on ? 'false' : 'true');
    bS.setAttribute('aria-checked', on ? 'true' : 'false');
    // Keyingi to'xtash — hozirgi vaqtdan keyingi birinchi k·T½
    state.nextStop = Math.floor(state.time / state.T + 1e-9) + 1;
}

// ----- Formatlash -----
function fmtReal(tModel) {
    const iso = isotopes[state.iso];
    if (!iso.half) return null;
    const v = tModel / state.T * iso.half;
    const s = v >= 100 ? Math.round(v).toLocaleString('ru-RU').replace(/\u00A0/g, ' ') : v.toFixed(v >= 10 ? 1 : 2);
    return s + ' ' + iso.unit;
}
function scaleText() {
    const iso = isotopes[state.iso];
    if (!iso.half) return null;
    const k = iso.half / state.T;
    const s = k >= 100 ? Math.round(k).toLocaleString('ru-RU').replace(/\u00A0/g, ' ') : k.toPrecision(3);
    return 'modelda 1 s = ' + s + ' ' + iso.unit;
}

function updateStats() {
    const t = state.time;
    document.getElementById('timeValue').textContent = t.toFixed(2) + ' s';
    document.getElementById('ratioValue').textContent = (t / state.T).toFixed(2);
    const r = fmtReal(t);
    document.getElementById('realValue').textContent = r === null ? '—' : r;
    document.getElementById('nValue').textContent = state.N;
    document.getElementById('nThValue').textContent = nTheory(t).toFixed(1);
    document.getElementById('decValue').textContent = state.N0 - state.N;
    const a = measuredActivity();
    document.getElementById('actValue').textContent = a === null ? '-' : a.toFixed(1) + ' Bk';
    document.getElementById('actThValue').textContent = (lambda() * state.N).toFixed(1) + ' Bk';
    document.getElementById('th1Value').textContent = state.t50 === null ? '-' : state.t50.toFixed(2) + ' s';
    document.getElementById('th2Value').textContent = state.t25 === null ? '-' : (state.t25 / 2).toFixed(2) + ' s';
    const iso = isotopes[state.iso];
    document.getElementById('isoNote').innerHTML = iso.half
        ? iso.name + ': T½ = ' + iso.half + ' ' + iso.unit + ', ' + iso.type + '-yemirilish → ' + iso.daughter +
          '. Vaqt masshtablangan: <strong>' + scaleText() + '</strong>.'
        : 'Erkin model: T½ ni slayder bilan tanlang. Izotop tanlansa vaqt <strong>masshtablanadi</strong> (modeldagi T½ = haqiqiy T½).';
}

// ----- Chizish -----
function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function panel(p, x, y, w, h) {
    ctx.fillStyle = p.panel;
    ctx.strokeStyle = p.panelEdge;
    ctx.lineWidth = 1.5;
    rr(x, y, w, h, 12);
    ctx.fill(); ctx.stroke();
}

function drawNuclei(p) {
    const r = Math.max(3, state.cell * 0.36);
    const t = state.time;
    ctx.fillStyle = p.box;
    ctx.strokeStyle = p.panelEdge;
    ctx.lineWidth = 1.5;
    rr(GRID.x - 6, GRID.y - 6, GRID.w + 12, GRID.h + 12, 12);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < state.nuclei.length; i++) {
        const [x, y] = state.pos[i];
        const td = state.nuclei[i];
        const alive = td < 0;
        ctx.fillStyle = alive ? p.nuc1 : p.dec1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (r > 4) {
            ctx.fillStyle = alive ? p.nuc2 : p.dec2;
            ctx.beginPath(); ctx.arc(x + r * 0.18, y + r * 0.18, r * 0.62, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = alive ? p.nucEdge : p.decEdge;
        ctx.lineWidth = r > 6 ? 1.2 : 0.8;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        // Yaqinda parchalangan yadro — yorqin halqa
        if (!alive && t - td < 0.45) {
            const k = (t - td) / 0.45;
            ctx.strokeStyle = p.flash;
            ctx.globalAlpha = 1 - k;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 2 + 8 * k, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
    // Zarralar (α — qizil qo'shaloq, β — ko'k nuqta)
    const beta = isotopes[state.iso].type !== 'α';
    for (const q of state.particles) {
        const a = t - q.t0;
        const x = q.x + q.vx * a, y = q.y + q.vy * a;
        const col = beta ? p.beta : p.alpha;
        ctx.globalAlpha = Math.max(0, 1 - a / PART_LIFE);
        // iz (trek)
        const tr = Math.min(a, 0.12);
        const g = ctx.createLinearGradient(x - q.vx * tr, y - q.vy * tr, x, y);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, col);
        ctx.strokeStyle = g;
        ctx.lineWidth = beta ? 1.8 : 3;
        ctx.beginPath(); ctx.moveTo(x - q.vx * tr, y - q.vy * tr); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = col;
        if (beta) {
            ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(x - 2.5, y, 3.8, 0, Math.PI * 2); ctx.arc(x + 2.5, y + 1, 3.8, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    // Sarlavha va legenda
    const iso = isotopes[state.iso];
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('N₀ = ' + state.N0 + ' yadro' + (iso.half ? '  ·  ' + iso.name : ''), GRID.x, 36);
    const ly = GRID.y + GRID.h + 30;
    ctx.font = '13px Arial';
    const items = [[p.nuc1, p.nucEdge, 'parchalanmagan (' + iso.sym + ')'], [p.dec1, p.decEdge, 'qiz yadro (' + iso.daughter + ')']];
    let lx = GRID.x;
    items.forEach(it => {
        ctx.fillStyle = it[0]; ctx.strokeStyle = it[1]; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(lx + 7, ly - 4, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.ink;
        ctx.fillText(it[2], lx + 19, ly);
        lx += ctx.measureText(it[2]).width + 44;
    });
    ctx.fillStyle = beta ? p.beta : p.alpha;
    ctx.beginPath(); ctx.arc(lx + 6, ly - 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.ink;
    ctx.fillText(beta ? 'β⁻-zarra' : 'α-zarra', lx + 16, ly);
    // N/N₀ ustuni
    const by = ly + 22, bw = GRID.w;
    const frac = state.N / state.N0;
    ctx.fillStyle = p.dec1;
    rr(GRID.x, by, bw, 22, 6); ctx.fill();
    ctx.fillStyle = p.nuc2;
    rr(GRID.x, by, Math.max(0, bw * frac), 22, 6); ctx.fill();
    // N₀/2, N₀/4, N₀/8 belgilari
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    [[0.5, '½'], [0.25, '¼'], [0.125, '⅛']].forEach(m => {
        const xm = GRID.x + bw * m[0];
        ctx.beginPath(); ctx.moveTo(xm, by - 3); ctx.lineTo(xm, by + 25); ctx.stroke();
        ctx.fillStyle = p.muted;
        ctx.fillText(m[1], xm, by + 40);
    });
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('N / N₀ = ' + (frac * 100).toFixed(1) + '%', GRID.x + bw, by + 40);
}

function drawGraph(p) {
    const x = 458, y = 12, w = 330, h = 360;
    panel(p, x, y, w, h);
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('N(t): simulyatsiya va nazariya', x + 12, y + 22);
    const gx = x + 48, gy = y + 40, gw = w - 74, gh = h - 112;
    const kMax = Math.max(5, Math.ceil(state.time / state.T + 0.001));
    const tMax = kMax * state.T;
    const X = t => gx + t / tMax * gw;
    const Y = n => gy + gh - n / state.N0 * gh;
    // To'r
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const yy = gy + gh * i / 4; ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke(); }
    // T½ belgilari va N₀/2ᵏ darajalari
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = p.marker;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    for (let k = 1; k <= kMax; k++) {
        const xt = X(k * state.T);
        ctx.beginPath(); ctx.moveTo(xt, gy); ctx.lineTo(xt, gy + gh); ctx.stroke();
        if (k <= 3) {
            const yn = Y(state.N0 / Math.pow(2, k));
            ctx.beginPath(); ctx.moveTo(gx, yn); ctx.lineTo(xt, yn); ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    ctx.fillStyle = p.muted;
    const step = kMax > 8 ? 2 : 1;
    for (let k = 0; k <= kMax; k += step) {
        ctx.fillText(k === 0 ? '0' : (k === 1 ? 'T½' : k + 'T½'), X(k * state.T), gy + gh + 17);
    }
    ctx.fillText('t (T½ = ' + state.T.toFixed(1) + ' s)', gx + gw / 2, gy + gh + 35);
    ctx.textAlign = 'right';
    ctx.fillText(String(state.N0), gx - 5, Y(state.N0) + 5);
    ctx.fillText(String(state.N0 / 2), gx - 5, Y(state.N0 / 2) + 5);
    ctx.fillText(String(state.N0 / 4), gx - 5, Y(state.N0 / 4) + 5);
    ctx.fillText('0', gx - 5, gy + gh + 5);
    ctx.save();
    ctx.translate(x + 13, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, 0);
    ctx.restore();
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    // Nazariy egri
    ctx.strokeStyle = p.theory;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
        const t = tMax * i / 160;
        i ? ctx.lineTo(X(t), Y(nTheory(t))) : ctx.moveTo(X(t), Y(nTheory(t)));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Simulyatsiya (zinapoya)
    if (state.hist.length) {
        ctx.strokeStyle = p.sim;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        let prevN = state.N0;
        ctx.moveTo(X(0), Y(state.N0));
        for (const hh of state.hist) {
            ctx.lineTo(X(hh[0]), Y(prevN));
            ctx.lineTo(X(hh[0]), Y(hh[1]));
            prevN = hh[1];
        }
        ctx.stroke();
        ctx.fillStyle = p.sim;
        ctx.beginPath(); ctx.arc(X(state.time), Y(state.N), 4, 0, Math.PI * 2); ctx.fill();
    }
    // Legenda
    const ly = y + h - 14;
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    ctx.strokeStyle = p.sim; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x + 14, ly - 4); ctx.lineTo(x + 34, ly - 4); ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.fillText('simulyatsiya', x + 40, ly);
    ctx.strokeStyle = p.theory; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(x + 140, ly - 4); ctx.lineTo(x + 166, ly - 4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('N₀·2^(−t/T½)', x + 172, ly);
}

function drawReadout(p) {
    const x = 458, y = 384, w = 330, h = 204;
    panel(p, x, y, w, h);
    const t = state.time;
    const a = measuredActivity();
    const real = fmtReal(t);
    const lines = [
        ['t', t.toFixed(2) + ' s  (' + (t / state.T).toFixed(2) + ' T½)'],
        ['N', state.N + '   (nazariy ' + nTheory(t).toFixed(1) + ')'],
        ['λ', lambda().toFixed(3) + ' s⁻¹'],
        ['A', (a === null ? '—' : a.toFixed(1)) + ' Bk  (λN = ' + (lambda() * state.N).toFixed(1) + ')'],
        ['T½', state.t50 === null ? 'o\'lchanmoqda…' : state.t50.toFixed(2) + ' s (o\'lch.)']
    ];
    lines.forEach((ln, i) => {
        const yy = y + 30 + i * 30;
        ctx.fillStyle = p.ink;
        ctx.font = 'italic bold 17px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(ln[0] + ' =', x + 14, yy);
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(ln[1], x + w - 14, yy);
    });
    ctx.fillStyle = p.muted;
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    const sc = scaleText();
    ctx.fillText(sc ? sc + (real ? '  →  t = ' + real : '') : 'Erkin model: vaqt model sekundlarida', x + 14, y + h - 14);
}

function draw() {
    const p = P();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, p.bg1);
    bg.addColorStop(1, p.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNuclei(p);
    drawGraph(p);
    drawReadout(p);
}

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    if (dt > 0.05) dt = 0.05;

    if (state.running && dt > 0) {
        updatePhysics(dt);
        updateStats();
    }
    draw();

    if (state.running) {
        animationId = requestAnimationFrame(loop);
    }
}

function startDecay() {
    if (!state.running && state.N > 0) {
        state.running = true;
        // To'xtash nuqtasi hozirgi vaqtdan keyin bo'lsin
        state.nextStop = Math.max(state.nextStop, Math.floor(state.time / state.T + 1e-9) + 1);
        if (!state.hist.length) state.hist.push([0, state.N0]);
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pauseDecay() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    updateStats();
    draw();
}

function resetDecay() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    createNuclei();
    state.time = 0;
    state.nextStop = 1;
    state.hist = [];
    state.decayTimes = [];
    state.particles = [];
    state.t50 = null;
    state.t25 = null;
    updateStats();
    draw();
}

resetDecay();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startDecay, pause: pauseDecay, reset: resetDecay };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'N₀',            get: function () { return state.N0; } },
    { label: 'T½ (s)',        get: function () { return state.T; } },
    { label: 't (s)',         get: function () { return +state.time.toFixed(2); } },
    { label: 't/T½',          get: function () { return +(state.time / state.T).toFixed(2); } },
    { label: 'N',             get: function () { return state.N; } },
    { label: 'N nazariy',     get: function () { return +nTheory(state.time).toFixed(1); } },
    { label: 'N/N₀',          get: function () { return +(state.N / state.N0).toFixed(3); } },
    { label: 'A o\'lch. (Bk)', get: function () { return labNum('actValue'); } },
    { label: 'A = λN (Bk)',   get: function () { return +(lambda() * state.N).toFixed(1); } },
    { label: 'T½ o\'lch. (s)', get: function () { return labNum('th1Value'); } }
];
