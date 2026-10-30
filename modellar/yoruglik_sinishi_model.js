/* yoruglik_sinishi_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('refractionCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg: '#f8fbff', medium: [3, 105, 161], mediumA: 0.10, ink: '#0c2a43', muted: '#5b7387',
                boundary: '#0c4a6e', normal: '#64748b', prot: 'rgba(12,74,110,0.45)', protText: '#47657c',
                ray: [220, 38, 38], glow: 'rgba(248,113,113,0.55)',
                aArc: '#c2410c', gArc: '#7c3aed', bArc: '#047857', crit: '#d97706',
                panel: 'rgba(255,255,255,0.88)', panelEdge: '#bae6fd', laser: '#334155', laserHi: '#94a3b8',
                pulse: '#fff7ed', tir: '#b45309' };
const DARK  = { bg: '#08131f', medium: [56, 189, 248], mediumA: 0.08, ink: '#e0f2fe', muted: '#8fb0c8',
                boundary: '#7dd3fc', normal: '#7b8fa3', prot: 'rgba(125,211,252,0.40)', protText: '#9cc3dd',
                ray: [248, 113, 113], glow: 'rgba(248,113,113,0.45)',
                aArc: '#fb923c', gArc: '#c4b5fd', bArc: '#34d399', crit: '#fbbf24',
                panel: 'rgba(8,26,43,0.9)', panelEdge: '#0c4a6e', laser: '#94a3b8', laserHi: '#e2e8f0',
                pulse: '#ffffff', tir: '#fbbf24' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const C_LIGHT = 3.00e8;          // m/s
const SEG_M = 0.25;              // har bir nur kesmasi 25 cm
const SLOW = 0.6e-9;             // 1 s real vaqtda 0.6 ns simulyatsiya vaqti o'tadi
const OX = 400, OY = 300;        // tushish nuqtasi
const RAY = 240;                 // nur kesmasi uzunligi (px) ≙ 25 cm
const RP = 196;                  // burchak o'lchagich radiusi (px)
const PRESETS = [[1.00, 'Havo'], [1.33, 'Suv'], [1.50, 'Shisha'], [2.42, 'Olmos']];
const D2R = Math.PI / 180;

let state = {
    n1: 1.00,
    n2: 1.50,
    alpha: 30,        // gradus
    running: false,
    // impuls: phase 0 — 1-muhitda tushmoqda, 1 — chegaradan keyin, 2 — tugadi (kutish)
    phase: 0,
    t: 0,             // impuls yo'lga chiqqandan beri simulyatsiya vaqti, s
    s1: 0,            // tushuvchi nur bo'ylab bosilgan yo'l, m
    sR: 0, sT: 0,     // qaytgan va singan nur bo'ylab yo'l, m
    tHit: 0,          // impuls chegaraga yetgan vaqt
    wait: 0,          // keyingi impulsgacha real kutish, s
    v1m: null, v2m: null   // impuls bo'yicha o'lchangan tezliklar, m/s
};

let animationId = null;
let lastTimestamp = null;

// ----- Fizika -----
function mediumName(n) {
    for (const [v, name] of PRESETS) if (Math.abs(n - v) < 0.005) return name;
    return 'Muhit';
}
function critAngle() { return state.n1 > state.n2 ? Math.asin(state.n2 / state.n1) / D2R : null; }
// Singan nurning yo'nalishi: chegara bo'ylab to'lqin vektorining tashkil etuvchisi
// saqlanadi, k₁·sinα = k₂·sinβ, k = n·k₀. Mavjud bo'lmasa — to'liq ichki qaytish
function refracted() {
    const a = state.alpha * D2R;
    const kt = state.n1 * Math.sin(a);           // tangensial tashkil etuvchi (k₀ birligida)
    if (kt > state.n2) return null;
    const kn = Math.sqrt(state.n2 * state.n2 - kt * kt);
    return { dx: kt / state.n2, dy: kn / state.n2, beta: Math.atan2(kt, kn) / D2R };
}
// Frenel formulalari, qutblanmagan yorug'lik uchun qaytish koeffitsiyenti
function reflectance() {
    const r = refracted();
    if (!r) return 1;
    const a = state.alpha * D2R, b = r.beta * D2R;
    const ca = Math.cos(a), cb = Math.cos(b), n1 = state.n1, n2 = state.n2;
    const rs = (n1 * ca - n2 * cb) / (n1 * ca + n2 * cb);
    const rp = (n1 * cb - n2 * ca) / (n1 * cb + n2 * ca);
    return Math.min(1, (rs * rs + rp * rp) / 2);
}
function v1() { return C_LIGHT / state.n1; }
function v2() { return C_LIGHT / state.n2; }

// ----- Boshqaruv -----
function syncPresets() {
    [1, 2].forEach(k => {
        const n = k === 1 ? state.n1 : state.n2;
        document.querySelectorAll('#sel' + k + ' .planet-btn').forEach(b => {
            const on = Math.abs(parseFloat(b.dataset.n) - n) < 0.005;
            b.classList.toggle('active', on);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    });
    document.getElementById('n1Slider').value = state.n1;
    document.getElementById('n2Slider').value = state.n2;
    document.getElementById('n1Value').textContent = state.n1.toFixed(2);
    document.getElementById('n2Value').textContent = state.n2.toFixed(2);
}

// Sozlama o'zgarsa impuls boshidan yuboriladi — eski yo'l bilan yangi
// geometriya aralashib ketmasin; o'lchangan tezliklar ham yangilanadi
function onSettingChanged() {
    restartPulse();
    state.v1m = null; state.v2m = null;
    updateNote();
    updateStats();
    if (!state.running) draw();
}

function selectMedium(k, n) {
    if (k === 1) state.n1 = n; else state.n2 = n;
    syncPresets();
    onSettingChanged();
}
function swapMedia() {
    const t = state.n1; state.n1 = state.n2; state.n2 = t;
    syncPresets();
    onSettingChanged();
}
document.getElementById('n1Slider').oninput = function () {
    state.n1 = parseFloat(this.value); syncPresets(); onSettingChanged();
};
document.getElementById('n2Slider').oninput = function () {
    state.n2 = parseFloat(this.value); syncPresets(); onSettingChanged();
};
document.getElementById('alphaSlider').oninput = function () {
    state.alpha = parseFloat(this.value);
    document.getElementById('alphaValue').textContent = state.alpha.toFixed(1) + '°';
    onSettingChanged();
};

function updateNote() {
    const n1 = state.n1, n2 = state.n2;
    let html;
    if (Math.abs(n1 - n2) < 0.005) html = 'n₁ = n₂: optik zichliklar teng — nur <strong>sinmaydi</strong>, chegaradan to\'g\'ri o\'tadi.';
    else if (n1 < n2) html = 'Yorug\'lik optik <strong>zichroq</strong> muhitga o\'tmoqda: β &lt; α, singan nur normalga yaqinlashadi.';
    else html = 'Yorug\'lik optik <strong>siyrakroq</strong> muhitga o\'tmoqda: β &gt; α. α &gt; α<sub>kr</sub> = ' + critAngle().toFixed(1) + '° da to\'liq ichki qaytish bo\'ladi.';
    document.getElementById('modeNote').innerHTML = html;
    document.getElementById('tirWarn').hidden = !!refracted();
}

// ----- Impuls -----
function restartPulse() {
    state.phase = 0; state.t = 0; state.s1 = 0; state.sR = 0; state.sT = 0;
    state.tHit = 0; state.wait = 0;
}

function updatePhysics(dtReal) {
    if (state.phase === 2) {
        state.wait -= dtReal;
        if (state.wait <= 0) restartPulse();
        return;
    }
    const dt = dtReal * SLOW;           // simulyatsiya vaqti, s
    state.t += dt;
    if (state.phase === 0) {
        state.s1 += v1() * dt;
        if (state.s1 >= SEG_M) {
            // Chegaraga yetdi: ortiqcha vaqt keyingi muhitda davom etadi
            const over = (state.s1 - SEG_M) / v1();
            state.tHit = state.t - over;
            state.v1m = SEG_M / state.tHit;          // o'lchov: yo'l / vaqt
            state.s1 = SEG_M;
            state.phase = 1;
            state.sR = v1() * over;
            state.sT = v2() * over;
        }
    } else {
        state.sR = Math.min(SEG_M, state.sR + v1() * dt);
        const hasT = !!refracted();
        if (hasT) {
            const prev = state.sT;
            state.sT += v2() * dt;
            if (prev < SEG_M && state.sT >= SEG_M) {
                const over = (state.sT - SEG_M) / v2();
                state.v2m = SEG_M / (state.t - over - state.tHit);
                state.sT = SEG_M;
            }
            state.sT = Math.min(SEG_M, state.sT);
        }
        if (state.sR >= SEG_M && (!hasT || state.sT >= SEG_M)) {
            state.phase = 2;
            state.wait = 0.6;
        }
    }
}

// ----- Formatlash -----
function fmtV(v) { return v == null ? '-' : (v / 1e8).toFixed(2) + '·10⁸ m/s'; }

function updateStats() {
    const r = refracted();
    const R = reflectance();
    document.getElementById('alphaStat').textContent = state.alpha.toFixed(1) + '°';
    document.getElementById('betaStat').textContent = r ? r.beta.toFixed(1) + '°' : 'yo\'q (to\'liq qaytish)';
    const ratio = (r && state.alpha > 0.05) ? Math.sin(state.alpha * D2R) / (r.dx) : null;
    document.getElementById('ratioStat').textContent = ratio == null ? '-' : ratio.toFixed(3);
    document.getElementById('nRatioStat').textContent = (state.n2 / state.n1).toFixed(3);
    const ac = critAngle();
    document.getElementById('critStat').textContent = ac == null ? 'yo\'q (n₁ ≤ n₂)' : ac.toFixed(1) + '°';
    document.getElementById('rtStat').textContent = (R * 100).toFixed(1) + '% / ' + ((1 - R) * 100).toFixed(1) + '%';
    document.getElementById('v1Stat').textContent = fmtV(state.v1m);
    document.getElementById('v2Stat').textContent = r ? fmtV(state.v2m) : '-';
    document.getElementById('vRatioStat').textContent = (state.v1m && state.v2m && r) ? (state.v1m / state.v2m).toFixed(3) : '-';
}

// ----- Chizish -----
function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

function drawMedia(p) {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Optik zichlik qancha katta bo'lsa, muhit shuncha to'q bo'yaladi
    const a1 = p.mediumA + (state.n1 - 1) * 0.16, a2 = p.mediumA + (state.n2 - 1) * 0.16;
    ctx.fillStyle = rgba(p.medium, a1);
    ctx.fillRect(0, 0, canvas.width, OY);
    ctx.fillStyle = rgba(p.medium, a2);
    ctx.fillRect(0, OY, canvas.width, canvas.height - OY);
    ctx.strokeStyle = p.boundary;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, OY); ctx.lineTo(canvas.width, OY); ctx.stroke();

    // Muhit nomlari
    ctx.textAlign = 'left';
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('1-muhit: ' + mediumName(state.n1), 16, 28);
    ctx.fillText('2-muhit: ' + mediumName(state.n2), 16, canvas.height - 36);
    ctx.font = '14px Arial';
    ctx.fillStyle = p.muted;
    ctx.fillText('n₁ = ' + state.n1.toFixed(2) + ',  v₁ = c/n₁ = ' + (v1() / 1e8).toFixed(2) + '·10⁸ m/s', 16, 48);
    ctx.fillText('n₂ = ' + state.n2.toFixed(2) + ',  v₂ = c/n₂ = ' + (v2() / 1e8).toFixed(2) + '·10⁸ m/s', 16, canvas.height - 16);
}

function drawProtractor(p) {
    ctx.strokeStyle = p.prot;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(OX, OY, RP, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p.protText;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Gradus normaldan o'lchanadi: 0° — normal, 90° — chegara
    for (let q = 0; q < 4; q++) {
        for (let g = 0; g <= 90; g += 5) {
            if (q % 2 === 1 && (g === 0 || g === 90)) continue;   // takror chizilmasin
            const sx = (q === 0 || q === 3) ? -1 : 1, sy = (q < 2) ? -1 : 1;
            const ang = g * D2R;
            const ux = sx * Math.sin(ang), uy = sy * Math.cos(ang);
            const len = g % 10 === 0 ? 11 : 6;
            ctx.strokeStyle = p.prot;
            ctx.beginPath();
            ctx.moveTo(OX + ux * RP, OY + uy * RP);
            ctx.lineTo(OX + ux * (RP - len), OY + uy * (RP - len));
            ctx.stroke();
            if (g % 10 === 0 && g !== 90) {
                ctx.fillText(String(g), OX + ux * (RP - 22), OY + uy * (RP - 22));
            }
        }
    }
    ctx.textBaseline = 'alphabetic';
    // Chegaraviy burchak belgisi
    const ac = critAngle();
    if (ac != null) {
        const a = ac * D2R;
        ctx.strokeStyle = p.crit;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(OX - Math.sin(a) * (RP - 14), OY - Math.cos(a) * (RP - 14));
        ctx.lineTo(OX - Math.sin(a) * (RP + 10), OY - Math.cos(a) * (RP + 10));
        ctx.stroke();
        ctx.fillStyle = p.crit;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('α_kr', OX - Math.sin(a) * (RP + 14), OY - Math.cos(a) * (RP + 14) + 4);
    }
}

function drawArrowHead(x, y, dx, dy, color, size) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + dx * size, y + dy * size);
    ctx.lineTo(x - dx * size * 0.6 - dy * size * 0.55, y - dy * size * 0.6 + dx * size * 0.55);
    ctx.lineTo(x - dx * size * 0.6 + dy * size * 0.55, y - dy * size * 0.6 - dx * size * 0.55);
    ctx.closePath();
    ctx.fill();
}

// Nur: (x0,y0) → (x1,y1), I — nisbiy intensivlik (0..1)
function drawRay(p, x0, y0, x1, y1, I) {
    const a = 0.18 + 0.82 * Math.sqrt(I);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.glow;
    ctx.globalAlpha = a * 0.5;
    ctx.lineWidth = 3 + 7 * I;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(p.ray, a);
    ctx.lineWidth = 1.6 + 2.2 * I;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
    const L = Math.hypot(x1 - x0, y1 - y0);
    const dx = (x1 - x0) / L, dy = (y1 - y0) / L;
    drawArrowHead(x0 + dx * L * 0.55, y0 + dy * L * 0.55, dx, dy, rgba(p.ray, Math.min(1, a + 0.1)), 9);
}

function drawArc(r, a0, a1, color, label, lr) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(OX, OY, r, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
    if (Math.abs(a1 - a0) < 0.02) return;
    const m = (a0 + a1) / 2;
    ctx.fillStyle = color;
    ctx.font = 'italic bold 17px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, OX + Math.cos(m) * lr, OY + Math.sin(m) * lr);
    ctx.textBaseline = 'alphabetic';
}

function drawLaser(p, x, y, dx, dy) {
    // dx, dy — nur yo'nalishi (manbadan O ga)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx));
    const g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, p.laserHi);
    g.addColorStop(1, p.laser);
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-46, -9, 46, 18, 4); else ctx.rect(-46, -9, 46, 18);
    ctx.fill();
    ctx.fillStyle = rgba(p.ray, 1);
    ctx.fillRect(-4, -4, 4, 8);
    ctx.restore();
}

function drawPulse(p, x, y, I) {
    if (I <= 0.003) return;
    const a = 0.25 + 0.75 * Math.sqrt(I);
    const r = 5 + 6 * Math.sqrt(I);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(0.35, rgba(P().ray, a));
    g.addColorStop(1, rgba(P().ray, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawReadout(p, r) {
    const x = 588, y = 446, w = 200, h = 142;
    ctx.fillStyle = p.panel;
    ctx.strokeStyle = p.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    const rows = [
        ['α', state.alpha.toFixed(1) + '°', p.aArc],
        ['β', r ? r.beta.toFixed(1) + '°' : '—', p.bArc],
        ['sinα/sinβ', (r && state.alpha > 0.05) ? (Math.sin(state.alpha * D2R) / r.dx).toFixed(3) : '—', p.ink],
        ['n₂/n₁', (state.n2 / state.n1).toFixed(3), p.ink],
        ['α_kr', critAngle() == null ? '—' : critAngle().toFixed(1) + '°', p.crit],
        ['t', (state.t * 1e9).toFixed(2) + ' ns', p.muted]
    ];
    rows.forEach((row, i) => {
        const yy = y + 24 + i * 22;
        ctx.fillStyle = row[2];
        ctx.font = 'italic bold 16px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(row[0] + ' =', x + 12, yy);
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = p.ink;
        ctx.fillText(row[1], x + w - 12, yy);
    });
}

function draw() {
    const p = P();
    drawMedia(p);
    drawProtractor(p);

    const a = state.alpha * D2R;
    const sa = Math.sin(a), ca = Math.cos(a);
    const r = refracted();
    const R = reflectance(), T = 1 - R;

    // Normal
    ctx.strokeStyle = p.normal;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(OX, OY - RP - 26); ctx.lineTo(OX, OY + RP + 26); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.muted;
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('normal', OX + 6, OY - RP - 14);

    // Nurlar: tushuvchi, qaytgan, singan
    const sx = OX - sa * RAY, sy = OY - ca * RAY;
    drawRay(p, sx, sy, OX, OY, 1);
    const rx = OX + sa * RAY, ry = OY - ca * RAY;
    drawRay(p, OX, OY, rx, ry, R);
    let tx, ty;
    if (r) {
        tx = OX + r.dx * RAY; ty = OY + r.dy * RAY;
        drawRay(p, OX, OY, tx, ty, T);
    }
    drawLaser(p, sx, sy, sa, ca);

    // Burchak yoylari
    const up = -Math.PI / 2, down = Math.PI / 2;
    drawArc(58, up - a, up, p.aArc, 'α', 76);
    drawArc(46, up, up + a, p.gArc, 'γ', 64);
    if (r) drawArc(58, down - r.beta * D2R, down, p.bArc, 'β', 76);

    // Nur nomlari — nurning yon tomonida, nurni kesib o'tmasligi uchun
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = p.ink;
    ctx.textBaseline = 'middle';
    const L1 = RP + 20;     // o'lchagich raqamlaridan tashqarida
    ctx.textAlign = 'right';
    ctx.fillText('tushuvchi', OX - sa * L1 - ca * 12, OY - ca * L1 + sa * 12);
    ctx.textAlign = 'left';
    ctx.fillText('qaytgan ' + (R * 100).toFixed(1) + '%', OX + sa * L1 + ca * 12, OY - ca * L1 + sa * 12);
    if (r) {
        ctx.fillText('singan ' + (T * 100).toFixed(1) + '%', OX + r.dx * L1 + r.dy * 12, OY + r.dy * L1 - r.dx * 12);
        ctx.textBaseline = 'alphabetic';
    } else {
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = p.tir;
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('To\'liq ichki qaytish!', 16, 486);
        ctx.font = '14px Arial';
        ctx.fillText('α = ' + state.alpha.toFixed(1) + '° > α_kr = ' + critAngle().toFixed(1) + '°', 16, 508);
        ctx.fillText('singan nur yo\'q, R = 100%', 16, 528);
    }

    // Impuls
    if (state.phase === 0 && (state.running || state.s1 > 0)) {
        const f = state.s1 / SEG_M;
        drawPulse(p, sx + (OX - sx) * f, sy + (OY - sy) * f, 1);
    } else if (state.phase === 1) {
        const fr = state.sR / SEG_M;
        if (fr < 1) drawPulse(p, OX + sa * RAY * fr, OY - ca * RAY * fr, R);
        if (r) {
            const ft = state.sT / SEG_M;
            if (ft < 1) drawPulse(p, OX + r.dx * RAY * ft, OY + r.dy * RAY * ft, T);
        }
    }
    // Tushish nuqtasi
    ctx.fillStyle = p.boundary;
    ctx.beginPath(); ctx.arc(OX, OY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('O', OX - 8, OY + 18);

    drawReadout(p, r);
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

function startPulse() {
    if (!state.running) {
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pausePulse() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    updateStats();
    draw();
}

function resetPulse() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    restartPulse();
    state.v1m = null; state.v2m = null;
    updateNote();
    updateStats();
    draw();
}

syncPresets();
resetPulse();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startPulse, pause: pausePulse, reset: resetPulse };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'n₁',            get: function () { return +state.n1.toFixed(2); } },
    { label: 'n₂',            get: function () { return +state.n2.toFixed(2); } },
    { label: 'α (°)',         get: function () { return +state.alpha.toFixed(1); } },
    { label: 'β (°)',         get: function () { return labNum('betaStat'); } },
    { label: 'sinα',          get: function () { return +Math.sin(state.alpha * D2R).toFixed(4); } },
    { label: 'sinβ',          get: function () { const r = refracted(); return r ? +r.dx.toFixed(4) : '—'; } },
    { label: 'sinα/sinβ',     get: function () { return labNum('ratioStat'); } },
    { label: 'n₂/n₁',         get: function () { return +(state.n2 / state.n1).toFixed(3); } },
    { label: 'α_kr (°)',      get: function () { return labNum('critStat'); } },
    { label: 'R (%)',         get: function () { return +(reflectance() * 100).toFixed(1); } },
    { label: 'v₁ (10⁸ m/s)',  get: function () { return labNum('v1Stat'); } },
    { label: 'v₂ (10⁸ m/s)',  get: function () { return labNum('v2Stat'); } }
];
