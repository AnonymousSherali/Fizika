/* otilgan_jism_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('projectileCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { sky1: '#e0f2fe', sky2: '#f8fafc', ink: '#0f2a4a', muted: '#475569',
                grid: 'rgba(30,58,138,0.10)', gridMajor: 'rgba(30,58,138,0.22)', axis: '#1e3a8a',
                ground: '#86a35a', groundTop: '#4d7c0f', soil: '#a78b6d',
                tower: '#94a3b8', towerEdge: '#475569',
                barrel: '#334155', barrelHi: '#64748b', wheel: '#1e293b',
                ball1: '#fed7aa', ball2: '#ea580c', ballEdge: '#9a3412',
                trace: '#ea580c', v: '#dc2626', vx: '#2563eb', vy: '#16a34a',
                hMark: '#7c3aed', lMark: '#b45309', band: 'rgba(255,255,255,0.72)',
                old: ['#7c3aed', '#0891b2', '#db2777', '#65a30d', '#475569'] };
const DARK  = { sky1: '#0b1424', sky2: '#111c30', ink: '#dbeafe', muted: '#94a3b8',
                grid: 'rgba(147,197,253,0.08)', gridMajor: 'rgba(147,197,253,0.18)', axis: '#93c5fd',
                ground: '#2f3d24', groundTop: '#65a30d', soil: '#3b3127',
                tower: '#475569', towerEdge: '#94a3b8',
                barrel: '#94a3b8', barrelHi: '#cbd5e1', wheel: '#e2e8f0',
                ball1: '#fed7aa', ball2: '#f97316', ballEdge: '#ffedd5',
                trace: '#fb923c', v: '#f87171', vx: '#60a5fa', vy: '#4ade80',
                hMark: '#c4b5fd', lMark: '#fbbf24', band: 'rgba(11,20,36,0.72)',
                old: ['#a78bfa', '#22d3ee', '#f472b6', '#a3e635', '#cbd5e1'] };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const bodies = {
    earth: { name: 'Yer',  g: 9.81 },
    moon:  { name: 'Oy',   g: 1.62 },
    mars:  { name: 'Mars', g: 3.71 }
};

// Kanvas joylashuvi: yuqori lenta — ma'lumot matni, pastda — o'q yozuvlari
const PLOT = { left: 82, right: 780, top: 92, ground: 528 };
const MAX_TRACES = 5;

let state = {
    v0: 20,
    alphaDeg: 30,
    h0: 0,
    g: 9.81,
    bodyName: 'Yer',
    t: 0,
    phase: 'ready',     // 'ready' | 'flying' | 'landed'
    running: false,
    hMax: null,         // o'lchangan eng katta balandlik (cho'qqidan o'tgandan keyin)
    landed: null,       // { t, x } — qo'nish paytidagi o'lchov
    scale: 10,          // px / m
    gridStep: 5,        // m
    timeScale: 1        // modelda 1 real soniyaga to'g'ri keladigan vaqt
};
let traces = [];        // oldingi otishlar: { v0, alphaDeg, h0, g }

let animationId = null;
let lastTimestamp = null;

// ---------- Fizika (analitik yechim — kadr chastotasiga bog'liq emas) ----------
function theory(p) {
    p = p || state;
    const a = p.alphaDeg * Math.PI / 180;
    const vx = p.v0 * Math.cos(a);
    const vy0 = p.v0 * Math.sin(a);
    // y(t) = 0 tenglamaning musbat ildizi
    const tf = (vy0 + Math.sqrt(vy0 * vy0 + 2 * p.g * p.h0)) / p.g;
    const tPeak = Math.max(0, vy0 / p.g);
    const H = p.h0 + vy0 * vy0 / (2 * p.g);
    return { vx, vy0, tf, tPeak, H, L: vx * tf, xPeak: vx * tPeak };
}
function posAt(p, th, t) {
    return { x: th.vx * t, y: p.h0 + th.vy0 * t - p.g * t * t / 2 };
}

// ---------- Masshtab: butun traektoriya (va saqlangan izlar) sig'sin ----------
function niceStep(raw) {
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / pow;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}
function rescale() {
    let xMax = 0, yMax = 0;
    [state].concat(traces).forEach(function (p) {
        const th = theory(p);
        xMax = Math.max(xMax, th.L);
        yMax = Math.max(yMax, th.H);
    });
    xMax = Math.max(xMax * 1.06, 5);
    yMax = Math.max(yMax * 1.12, 3);
    const w = PLOT.right - PLOT.left, h = PLOT.ground - PLOT.top;
    state.scale = Math.min(w / xMax, h / yMax);
    state.gridStep = niceStep(55 / state.scale);   // to'r kataklari ~55 px dan kam emas
    // Juda uzun parvozlar (Oy) ekranda 5 s atrofida o'tsin
    state.timeScale = Math.max(1, theory().tf / 5);
}
function toPx(x, y) {
    return { X: PLOT.left + x * state.scale, Y: PLOT.ground - y * state.scale };
}

// ---------- Sozlamalar ----------
// Har qanday o'zgarish joriy otishni bekor qiladi (izchil xulq: yangi shart — yangi otish)
function applySetting() { resetThrow(); }

document.getElementById('speedSlider').oninput = function () {
    state.v0 = parseFloat(this.value);
    document.getElementById('speedValue').textContent = state.v0.toFixed(0) + ' m/s';
    applySetting();
};
document.getElementById('angleSlider').oninput = function () {
    state.alphaDeg = parseInt(this.value, 10);
    document.getElementById('angleValue').textContent = state.alphaDeg + '°';
    applySetting();
};
document.getElementById('heightSlider').oninput = function () {
    state.h0 = parseFloat(this.value);
    document.getElementById('heightValue').textContent = state.h0.toFixed(1) + ' m';
    applySetting();
};

function selectBody(key, evt) {
    document.querySelectorAll('.planet-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
    });
    const t = (evt || window.event) ? (evt || window.event).target : null;
    if (t) {
        const btn = t.closest ? t.closest('.planet-btn') : t;
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
    }
    state.g = bodies[key].g;
    state.bodyName = bodies[key].name;
    applySetting();
}

// ---------- Harakat ----------
function updatePhysics(dt) {
    const th = theory();
    const prevT = state.t;
    let t = prevT + dt * state.timeScale;
    // "O'lchov" — formuladan emas, kadrlarda kuzatilgan holatlardan olinadi
    // (xuddi video tahlilidagidek): H — kuzatilgan eng katta y,
    // qo'nish — y ishorasi o'zgargan ikki kadr orasida chiziqli interpolyatsiya.
    const yNow = posAt(state, th, Math.min(t, th.tf)).y;
    state.ySeen = Math.max(state.ySeen == null ? state.h0 : state.ySeen, yNow);
    if (state.hMax === null && t >= th.tPeak) state.hMax = state.ySeen;
    if (t >= th.tf) {
        const y1 = posAt(state, th, prevT).y, y2 = posAt(state, th, t).y;
        const tl = y1 - y2 > 1e-12 ? prevT + (t - prevT) * y1 / (y1 - y2) : th.tf;
        state.landed = { t: tl, x: th.vx * tl };
        if (state.hMax === null) state.hMax = state.ySeen;
        t = th.tf;
        finishThrow();
    }
    state.t = t;
}

function finishThrow() {
    state.running = false;
    state.phase = 'landed';
    // Izni saqlaymiz (aynan shu shartli iz bo'lsa — takrorlamaymiz)
    const rec = { v0: state.v0, alphaDeg: state.alphaDeg, h0: state.h0, g: state.g };
    if (state.landed.t <= 0) return;   // α = 0, h₀ = 0: parvoz yo'q — iz saqlanmaydi
    traces = traces.filter(function (p) {
        return !(p.v0 === rec.v0 && p.alphaDeg === rec.alphaDeg && p.h0 === rec.h0 && p.g === rec.g);
    });
    traces.push(rec);
    if (traces.length > MAX_TRACES) traces.shift();
}

function fmt(v, d) { return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d); }

function updateStats() {
    const th = theory();
    const pos = posAt(state, th, state.t);
    const vy = th.vy0 - state.g * state.t;
    document.getElementById('tValue').textContent = state.t.toFixed(2) + ' s';
    document.getElementById('xyValue').textContent = fmt(pos.x, 2) + ' m; ' + fmt(Math.max(0, pos.y), 2) + ' m';
    document.getElementById('vxyValue').textContent = fmt(th.vx, 2) + '; ' + fmt(vy, 2) + ' m/s';
    document.getElementById('vValue').textContent = Math.hypot(th.vx, vy).toFixed(2) + ' m/s';

    document.getElementById('tTheory').textContent = th.tf.toFixed(3) + ' s';
    document.getElementById('hTheory').textContent = th.H.toFixed(2) + ' m';
    document.getElementById('lTheory').textContent = fmt(th.L, 2) + ' m';

    document.getElementById('hMeas').textContent = state.hMax === null ? '-' : state.hMax.toFixed(2) + ' m';
    if (state.landed) {
        document.getElementById('tMeas').textContent = state.landed.t.toFixed(3) + ' s';
        document.getElementById('lMeas').textContent = fmt(state.landed.x, 2) + ' m';
        document.getElementById('lErr').textContent = th.L > 0.01
            ? fmt((state.landed.x - th.L) / th.L * 100, 2) + '%' : '-';
    } else {
        document.getElementById('tMeas').textContent = '-';
        document.getElementById('lMeas').textContent = '-';
        document.getElementById('lErr').textContent = '-';
    }
}

// ---------- Chizish ----------
function drawArrow(x1, y1, x2, y2, color, label, lw, lx, ly) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 3) return;
    const headLen = Math.min(11, len * 0.45);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - headLen * 0.6 * Math.cos(ang), y2 - headLen * 0.6 * Math.sin(ang));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(ang - Math.PI / 7), y2 - headLen * Math.sin(ang - Math.PI / 7));
    ctx.lineTo(x2 - headLen * Math.cos(ang + Math.PI / 7), y2 - headLen * Math.sin(ang + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + (lx || 0), y2 + (ly || 0));
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
}

function drawGrid(p) {
    const s = state.scale, step = state.gridStep;
    ctx.lineWidth = 1;
    ctx.font = '13px Arial';
    ctx.fillStyle = p.muted;
    // Vertikal chiziqlar (x yozuvlari yer ustiga drawGround dan keyin chiziladi)
    for (let i = 1; ; i++) {
        const X = PLOT.left + i * step * s;
        if (X > PLOT.right + 0.5) break;
        ctx.strokeStyle = i % 2 === 0 ? p.gridMajor : p.grid;
        ctx.beginPath(); ctx.moveTo(X, PLOT.top - 10); ctx.lineTo(X, PLOT.ground); ctx.stroke();
    }
    // Gorizontal chiziqlar va y yozuvlari
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; ; i++) {
        const Y = PLOT.ground - i * step * s;
        if (Y < PLOT.top - 10) break;
        ctx.strokeStyle = i % 2 === 0 ? p.gridMajor : p.grid;
        ctx.beginPath(); ctx.moveTo(PLOT.left, Y); ctx.lineTo(PLOT.right + 12, Y); ctx.stroke();
        if (i > 0) ctx.fillText(+(i * step).toFixed(2), PLOT.left - 26, Y);
    }
    ctx.textBaseline = 'alphabetic';
    // y o'qi (x = 0 da)
    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PLOT.left, PLOT.top - 22); ctx.lineTo(PLOT.left, PLOT.ground); ctx.stroke();
    ctx.fillStyle = p.axis;
    ctx.beginPath();
    ctx.moveTo(PLOT.left, PLOT.top - 30); ctx.lineTo(PLOT.left - 5, PLOT.top - 20); ctx.lineTo(PLOT.left + 5, PLOT.top - 20);
    ctx.closePath(); ctx.fill();
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('y, m', PLOT.left - 12, PLOT.top - 22);
    ctx.textAlign = 'left';
}

function drawGround(p) {
    const soil = ctx.createLinearGradient(0, PLOT.ground, 0, canvas.height);
    soil.addColorStop(0, p.ground);
    soil.addColorStop(1, p.soil);
    ctx.fillStyle = soil;
    ctx.fillRect(0, PLOT.ground, canvas.width, canvas.height - PLOT.ground);
    ctx.fillStyle = p.groundTop;
    ctx.fillRect(0, PLOT.ground, canvas.width, 4);
}

// Analitik egri chiziq (0..tEnd oralig'ida)
function pathCurve(p, th, tEnd) {
    const n = 90;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
        const q = posAt(p, th, tEnd * i / n);
        const P2 = toPx(q.x, q.y);
        if (i === 0) ctx.moveTo(P2.X, P2.Y); else ctx.lineTo(P2.X, P2.Y);
    }
}

function drawOldTraces(p) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, PLOT.ground + 1);
    ctx.clip();
    traces.forEach(function (tr, i) {
        // Joriy (hozir uchayotgan yoki qo'ngan) otish o'zi to'liq chiziladi
        if (state.phase !== 'ready' && tr.v0 === state.v0 && tr.alphaDeg === state.alphaDeg &&
            tr.h0 === state.h0 && tr.g === state.g) return;
        const th = theory(tr);
        const col = p.old[i % p.old.length];
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        pathCurve(tr, th, th.tf);
        ctx.stroke();
        ctx.setLineDash([]);
        // Yorliq cho'qqi ustida: 30° va 60° bir nuqtaga qo'nsa ham ajralib turadi
        const top = toPx(th.xPeak, th.H);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = col;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        let lab = tr.alphaDeg + '°';
        if (tr.v0 !== state.v0) lab += ', ' + tr.v0 + ' m/s';
        if (tr.h0 !== state.h0) lab += ', h₀=' + tr.h0;
        if (tr.g !== state.g) lab += ', g=' + tr.g;
        ctx.fillText(lab, Math.min(Math.max(top.X, PLOT.left + 20), PLOT.right - 20), Math.max(top.Y - 8, PLOT.top - 14));
        const end = toPx(th.L, 0);
        ctx.beginPath(); ctx.arc(end.X, end.Y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawLauncher(p) {
    const O = toPx(0, state.h0);
    const a = state.alphaDeg * Math.PI / 180;
    // Minora (h₀ > 0 bo'lsa)
    if (state.h0 > 0) {
        const w = 34;
        ctx.fillStyle = p.tower;
        ctx.fillRect(O.X - w / 2, O.Y + 8, w, PLOT.ground - O.Y - 8);
        ctx.strokeStyle = p.towerEdge;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(O.X - w / 2, O.Y + 8, w, PLOT.ground - O.Y - 8);
        // g'isht chiziqlari
        ctx.lineWidth = 1;
        for (let y = O.Y + 22; y < PLOT.ground; y += 14) {
            ctx.beginPath(); ctx.moveTo(O.X - w / 2, y); ctx.lineTo(O.X + w / 2, y); ctx.stroke();
        }
        // h₀ o'lchov chizig'i
        ctx.strokeStyle = p.muted;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(O.X + 26, O.Y); ctx.lineTo(O.X + 26, PLOT.ground); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.muted;
        ctx.font = 'bold 13px Arial';
        ctx.fillText('h₀', O.X + 31, (O.Y + PLOT.ground) / 2 + 4);
    }
    // Stvol (α burchakka burilgan)
    ctx.save();
    ctx.translate(O.X, O.Y);
    ctx.rotate(-a);
    const bg = ctx.createLinearGradient(0, -9, 0, 9);
    bg.addColorStop(0, p.barrelHi);
    bg.addColorStop(1, p.barrel);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-14, -10); ctx.lineTo(44, -7); ctx.lineTo(44, 7); ctx.lineTo(-14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.barrel;
    ctx.fillRect(40, -9, 6, 18);
    ctx.restore();
    // G'ildirak / tayanch
    ctx.fillStyle = p.wheel;
    ctx.beginPath(); ctx.arc(O.X, O.Y + 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.barrelHi;
    ctx.beginPath(); ctx.arc(O.X, O.Y + 2, 3, 0, Math.PI * 2); ctx.fill();
    // Burchak yoyi
    if (state.alphaDeg > 0) {
        ctx.strokeStyle = p.hMark;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(O.X, O.Y); ctx.lineTo(O.X + 78, O.Y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(O.X, O.Y, 62, -a, 0); ctx.stroke();
        ctx.fillStyle = p.hMark;
        ctx.font = 'bold 14px Arial';
        const mid = -a / 2;
        ctx.fillText('α', O.X + 70 * Math.cos(mid), O.Y + 70 * Math.sin(mid) + 5);
    }
}

function drawCurrent(p) {
    const th = theory();
    if (state.phase === 'ready' || state.t <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, PLOT.ground + 1);
    ctx.clip();
    // Ingichka yo'l chizig'i
    ctx.strokeStyle = p.trace;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    pathCurve(state, th, state.t);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Teng vaqt oraliqlaridagi nuqtalar (stroboskop): x bo'yicha qadam doimiy!
    const dtDot = th.tf / 30;
    ctx.fillStyle = p.trace;
    for (let k = 0; k * dtDot <= state.t + 1e-9; k++) {
        const q = toPx(posAt(state, th, k * dtDot).x, posAt(state, th, k * dtDot).y);
        ctx.beginPath(); ctx.arc(q.X, q.Y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Eng yuqori nuqta belgisi (α = 0 da cho'qqi otish nuqtasining o'zi — belgi kerak emas)
    if (state.hMax !== null && th.tPeak > 0) {
        const A = toPx(th.xPeak, th.H);
        ctx.strokeStyle = p.hMark;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(PLOT.left, A.Y); ctx.lineTo(A.X, A.Y);
        ctx.moveTo(A.X, A.Y); ctx.lineTo(A.X, PLOT.ground);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.hMark;
        ctx.beginPath(); ctx.arc(A.X, A.Y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = 'bold 14px Arial';
        const txt = 'H = ' + state.hMax.toFixed(2) + ' m';
        const w = ctx.measureText(txt).width;
        let tx = A.X + 10;
        if (tx + w > canvas.width - 8) tx = A.X - 10 - w;
        ctx.fillText(txt, tx, Math.max(A.Y - 10, PLOT.top - 14));
    }

    // Qo'nish nuqtasi belgisi
    if (state.landed) {
        const E = toPx(state.landed.x, 0);
        ctx.fillStyle = p.lMark;
        ctx.strokeStyle = p.lMark;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(E.X, E.Y); ctx.lineTo(E.X, E.Y - 34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(E.X, E.Y - 34); ctx.lineTo(E.X + 18, E.Y - 28); ctx.lineTo(E.X, E.Y - 22); ctx.closePath(); ctx.fill();
        ctx.font = 'bold 14px Arial';
        const txt = 'L = ' + fmt(state.landed.x, 2) + ' m';
        const w = ctx.measureText(txt).width;
        let tx = E.X - w - 8;
        if (tx < PLOT.left + 30) tx = E.X + 24;
        ctx.fillText(txt, tx, E.Y - 12);
    }
}

function drawBall(p) {
    const th = theory();
    const pos = posAt(state, th, state.t);
    const B = toPx(pos.x, Math.max(0, pos.y));
    const r = 9;
    // Tezlik vektori va tashkil etuvchilari (v₀ har doim ~85 px);
    // qo'ngandan keyin jism to'xtagan — vektorlar chizilmaydi
    if (!state.landed) {
        const k = 85 / state.v0;
        const vy = th.vy0 - state.g * state.t;
        const ex = B.X + th.vx * k, ey = B.Y - vy * k;
        // Proyeksiyalar to'rtburchagi
        ctx.strokeStyle = p.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ex, ey); ctx.lineTo(B.X, ey);
        ctx.moveTo(ex, ey); ctx.lineTo(ex, B.Y);
        ctx.stroke();
        ctx.setLineDash([]);
        drawArrow(B.X, B.Y, ex, B.Y, p.vx, 'vₓ', 2.5, 0, 14);
        drawArrow(B.X, B.Y, B.X, ey, p.vy, 'v_y', 2.5, -22, 0);
        drawArrow(B.X, B.Y, ex, ey, p.v, 'v', 3.5, 10, vy >= 0 ? -8 : 8);
    }
    const grad = ctx.createRadialGradient(B.X - 3, B.Y - 3, 1, B.X, B.Y, r);
    grad.addColorStop(0, p.ball1);
    grad.addColorStop(1, p.ball2);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(B.X, B.Y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.ballEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawInfo(p) {
    ctx.fillStyle = p.band;
    ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('v₀ = ' + state.v0 + ' m/s   α = ' + state.alphaDeg + '°   h₀ = ' + state.h0.toFixed(1) +
                 ' m   g = ' + state.g.toFixed(2) + ' m/s² (' + state.bodyName + ')', 16, 31);
    ctx.textAlign = 'right';
    ctx.fillText('t = ' + state.t.toFixed(2) + ' s', canvas.width - 16, 31);
    ctx.font = '13px Arial';
    ctx.fillStyle = p.muted;
    if (state.timeScale > 1.05) {
        ctx.fillText('vaqt ×' + state.timeScale.toFixed(1) + ' tezlashtirilgan', canvas.width - 16, 70);
    }
    ctx.textAlign = 'left';
    // Vektorlar legendasi
    const items = [['v', p.v], ['vₓ', p.vx], ['v_y', p.vy]];
    let x = PLOT.left + 10;
    ctx.font = 'bold 13px Arial';
    items.forEach(function (it) {
        ctx.fillStyle = it[1];
        ctx.fillRect(x, 64, 18, 4);
        ctx.fillText(it[0], x + 23, 70);
        x += 62;
    });
    ctx.fillStyle = p.muted;
    ctx.font = '13px Arial';
    ctx.fillText('nuqtalar — teng vaqt oraliqlari (t_p / 30)', x + 6, 70);
}

function draw() {
    const p = P();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = ctx.createLinearGradient(0, 0, 0, PLOT.ground);
    bg.addColorStop(0, p.sky1);
    bg.addColorStop(1, p.sky2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(p);
    drawGround(p);
    // x o'qi yozuvlari (yer ustida)
    ctx.fillStyle = p.ink;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; ; i++) {
        const X = PLOT.left + i * state.gridStep * state.scale;
        if (X > PLOT.right + 0.5) break;
        ctx.fillRect(X - 0.5, PLOT.ground, 1, 6);
        ctx.fillText(+(i * state.gridStep).toFixed(2), X, PLOT.ground + 22);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = p.axis;
    ctx.font = 'bold 14px Arial';
    ctx.fillText('x, m', PLOT.right + 14, PLOT.ground + 46);
    ctx.textAlign = 'left';

    drawOldTraces(p);
    drawCurrent(p);
    drawLauncher(p);
    drawBall(p);
    drawInfo(p);
}

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

function startThrow() {
    if (state.running) return;
    if (state.phase === 'landed') {
        // Oldingi otish izlarga saqlangan — yangisini boshlaymiz
        prepareThrow();
    }
    state.phase = 'flying';
    state.running = true;
    lastTimestamp = null;
    animationId = requestAnimationFrame(loop);
}

function pauseThrow() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function prepareThrow() {
    state.t = 0;
    state.phase = 'ready';
    state.hMax = null;
    state.ySeen = null;
    state.landed = null;
    rescale();
    updateStats();
}

function resetThrow() {
    pauseThrow();
    prepareThrow();
    draw();
}

function clearTraces() {
    traces = [];
    rescale();
    if (!state.running) draw();
}

resetThrow();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
function num(v, d) { return Number(v.toFixed(d)); }
window.modelControls = { start: startThrow, pause: pauseThrow, reset: resetThrow };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'v₀ (m/s)',          get: function () { return state.v0; } },
    { label: 'α (°)',             get: function () { return state.alphaDeg; } },
    { label: 'h₀ (m)',            get: function () { return num(state.h0, 1); } },
    { label: 'g (m/s²)',          get: function () { return num(state.g, 2); } },
    { label: 'H nazariy (m)',     get: function () { return num(theory().H, 2); } },
    { label: 'H o\'lch. (m)',     get: function () { return labNum('hMeas'); } },
    { label: 'L nazariy (m)',     get: function () { return num(theory().L, 2); } },
    { label: 'L o\'lch. (m)',     get: function () { return labNum('lMeas'); } },
    { label: 't_p o\'lch. (s)',   get: function () { return labNum('tMeas'); } }
];
