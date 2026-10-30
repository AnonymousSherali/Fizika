/* linza_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('lensCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg1: '#fdf4ff', bg2: '#fae8ff', ink: '#3b0a3f', muted: '#86638a', axis: '#6b4a70',
                tick: 'rgba(107,74,112,0.55)', lensFill: 'rgba(56,189,248,0.22)', lensEdge: '#0284c7',
                focus: '#a21caf', obj: '#16a34a', img: '#dc2626',
                r1: '#ea580c', r2: '#2563eb', r3: '#0d9488',
                panel: 'rgba(255,255,255,0.88)', panelEdge: '#f0abfc', trace: 'rgba(220,38,38,0.45)',
                grip: 'rgba(22,163,74,0.18)' };
const DARK  = { bg1: '#170b1b', bg2: '#1f0f25', ink: '#fae8ff', muted: '#c4a3c9', axis: '#d8b4dd',
                tick: 'rgba(216,180,221,0.45)', lensFill: 'rgba(56,189,248,0.20)', lensEdge: '#7dd3fc',
                focus: '#f0abfc', obj: '#4ade80', img: '#f87171',
                r1: '#fb923c', r2: '#60a5fa', r3: '#2dd4bf',
                panel: 'rgba(36,16,42,0.9)', panelEdge: '#701a75', trace: 'rgba(248,113,113,0.5)',
                grip: 'rgba(74,222,128,0.2)' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const S = 9;                // px / cm — gorizontal masshtab
// Vertikal masshtab kattaroq: chiziqlar to'g'ri, kesishishlar va parallellik saqlanadi
// (affin almashtirish), lekin buyum va tasvir yaxshiroq ko'rinadi
const SY = 22;              // px / cm — vertikal masshtab
const LX = 400, AY = 300;   // linza markazi
const D_MIN = 1, D_MAX = 44;
const SPEED = 3;            // buyumning harakat tezligi, cm/s
const LENS_H = 226;         // linza yarim balandligi (px)

let state = {
    type: 'conv',     // 'conv' — yig'uvchi, 'div' — sochuvchi
    Fabs: 10,         // cm
    d: 30,            // cm (joriy)
    dUser: 30,        // cm (foydalanuvchi qo'ygan; "Qayta" shu holatga qaytaradi)
    h: 3,             // cm
    running: false,
    trace: []         // tasvir uchining izi [x, y] (cm)
};

let animationId = null;
let lastTimestamp = null;

function F() { return state.type === 'conv' ? state.Fabs : -state.Fabs; }
function X(xcm) { return LX + xcm * S; }
function Y(ycm) { return AY - ycm * SY; }

// ----- Nurlar yo'li (geometrik optika) -----
// Koordinatalar: x — linzadan (o'ngga musbat), y — bosh optik o'qdan (yuqoriga musbat), cm
function rays() {
    const d = state.d, h = state.h, Fv = F();
    // 1) optik markazdan o'tuvchi: y = −(h/d)·x (linzadan keyin ham sinmaydi)
    const ray1 = { yL: 0, slope: -h / d };
    // 2) o'qqa parallel: linzaga h balandlikda keladi, keyin (F, 0) orqali
    const ray2 = { yL: h, slope: -h / Fv };
    // 3) fokus (−F, 0) orqali: linzadan keyin o'qqa parallel
    let ray3 = null;
    if (Math.abs(d - Fv) > 1e-9) ray3 = { yL: -h * Fv / (d - Fv), slope: 0 };
    return { ray1, ray2, ray3 };
}

// Tasvir — linzadan chiqqan 1- va 2-nurlar (yoki ularning davomlari) kesishgan nuqta
function image() {
    const { ray1, ray2 } = rays();
    const ds = ray1.slope - ray2.slope;
    if (Math.abs(ds) < 1e-9) return null;          // parallel — tasvir cheksizlikda
    const x = (ray2.yL - ray1.yL) / ds;
    const y = ray1.yL + ray1.slope * x;
    if (!isFinite(x) || Math.abs(x) > 1e5) return null;
    return { f: x, H: y };
}

function describe(img) {
    if (!img) return null;
    const real = img.f > 0;
    const G = Math.abs(img.f) / state.d;
    let size;
    if (Math.abs(G - 1) < 0.005) size = 'kattaligi teng';
    else size = G > 1 ? 'kattalashgan' : 'kichiklashgan';
    const orient = img.H < 0 ? 'teskari' : 'to\'g\'ri';
    let place;
    if (real) {
        const Fa = state.Fabs, r = img.f / Fa;
        if (Math.abs(r - 2) < 0.005) place = '2F nuqtada';
        else if (r < 2) place = 'F va 2F oralig\'ida';
        else place = '2F dan narida';
    } else {
        place = 'buyum tomonida';
    }
    return { real, G, size, orient, place, nature: real ? 'haqiqiy' : 'mavhum' };
}

// ----- Boshqaruv -----
function setLensType(t) {
    state.type = t;
    const bc = document.getElementById('typeConv'), bd = document.getElementById('typeDiv');
    bc.classList.toggle('active', t === 'conv');
    bd.classList.toggle('active', t === 'div');
    bc.setAttribute('aria-checked', t === 'conv' ? 'true' : 'false');
    bd.setAttribute('aria-checked', t === 'div' ? 'true' : 'false');
    onSettingChanged();
}

function onSettingChanged() {
    state.trace = [];
    updateStats();
    if (!state.running) draw();
}

function setD(v, fromUser) {
    state.d = Math.max(D_MIN, Math.min(D_MAX, v));
    if (fromUser) state.dUser = state.d;
    document.getElementById('distSlider').value = state.d;
    document.getElementById('distValue').textContent = state.d.toFixed(1) + ' cm';
}

document.getElementById('focusSlider').oninput = function () {
    state.Fabs = parseFloat(this.value);
    document.getElementById('focusValue').textContent = state.Fabs.toFixed(1) + ' cm';
    onSettingChanged();
};
document.getElementById('distSlider').oninput = function () {
    // Qo'lda surilsa harakat to'xtaydi — buyumni foydalanuvchi boshqaradi
    if (state.running) pauseMove();
    setD(parseFloat(this.value), true);
    onSettingChanged();
};
document.getElementById('heightSlider').oninput = function () {
    state.h = parseFloat(this.value);
    document.getElementById('heightValue').textContent = state.h.toFixed(1) + ' cm';
    onSettingChanged();
};

// Buyumni kanvasda surish
let dragging = false;
function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
}
function overObject(pt) {
    const ox = X(-state.d);
    const top = Y(state.h);
    return Math.abs(pt[0] - ox) < 20 && pt[1] > top - 22 && pt[1] < AY + 14;
}
canvas.addEventListener('pointerdown', function (e) {
    const pt = canvasPoint(e);
    if (!overObject(pt)) return;
    dragging = true;
    if (state.running) pauseMove();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
});
canvas.addEventListener('pointermove', function (e) {
    const pt = canvasPoint(e);
    if (dragging) {
        setD(Math.round((LX - pt[0]) / S * 2) / 2, true);
        onSettingChanged();
    } else {
        canvas.style.cursor = overObject(pt) ? 'grab' : '';
    }
});
function endDrag() { dragging = false; canvas.style.cursor = ''; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function updateNote() {
    document.getElementById('typeNote').innerHTML = state.type === 'conv'
        ? 'O\'rtasi qalin linza: parallel nurlarni <strong>haqiqiy fokusda</strong> to\'playdi. F &gt; 0, D &gt; 0.'
        : 'O\'rtasi yupqa linza: parallel nurlarni sochadi, ularning <strong>davomlari</strong> mavhum fokusda kesishadi. F &lt; 0, D &lt; 0.';
}

function fmt(v, n) { return (v >= 0 ? '' : '−') + Math.abs(v).toFixed(n); }

function updateStats() {
    updateNote();
    const Fv = F();
    const Dp = 100 / Fv;
    document.getElementById('powerStat').textContent = (Dp > 0 ? '+' : '−') + Math.abs(Dp).toFixed(2) + ' dptr';
    document.getElementById('dStat').textContent = state.d.toFixed(1) + ' cm';
    const img = image();
    const ds = describe(img);
    document.getElementById('infWarn').hidden = !!img;
    if (!img) {
        document.getElementById('fStat').textContent = '∞ (tasvir yo\'q)';
        document.getElementById('hImgStat').textContent = '-';
        document.getElementById('gammaStat').textContent = '-';
        document.getElementById('natureStat').textContent = 'hosil bo\'lmaydi';
        document.getElementById('placeStat').textContent = 'cheksizlikda';
        document.getElementById('checkStat').textContent = '-';
        return;
    }
    document.getElementById('fStat').textContent = fmt(img.f, 1) + ' cm';
    document.getElementById('hImgStat').textContent = Math.abs(img.H).toFixed(2) + ' cm';
    document.getElementById('gammaStat').textContent = ds.G.toFixed(2);
    document.getElementById('natureStat').textContent = ds.nature + ', ' + ds.orient + ', ' + ds.size;
    document.getElementById('placeStat').textContent = ds.place;
    const chk = 100 / state.d + 100 / img.f;
    document.getElementById('checkStat').textContent = fmt(chk, 2) + ' dptr';
}

// ----- Chizish -----
function line(x0, y0, x1, y1, color, w, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([]);
}

function arrow(x, y0, y1, color, w, dashed) {
    // Vertikal strelka: (x, y0) asos, (x, y1) uchi
    line(x, y0, x, y1, color, w, dashed ? [6, 5] : null);
    const dir = y1 < y0 ? 1 : -1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - 7, y1 + dir * 13);
    ctx.lineTo(x + 7, y1 + dir * 13);
    ctx.closePath();
    if (dashed) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    else ctx.fill();
}

function rayHead(x, y, dx, dy, color) {
    const L = Math.hypot(dx, dy); dx /= L; dy /= L;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + dx * 8, y + dy * 8);
    ctx.lineTo(x - dx * 5 - dy * 5, y - dy * 5 + dx * 5);
    ctx.lineTo(x - dx * 5 + dy * 5, y - dy * 5 - dx * 5);
    ctx.closePath();
    ctx.fill();
}

function drawAxis(p) {
    line(0, AY, canvas.width, AY, p.axis, 1.6);
    ctx.fillStyle = p.muted;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    // Shkala: har 1 cm — kichik, har 10 cm — katta belgi
    for (let c = -44; c <= 44; c++) {
        const x = X(c);
        const big = c % 10 === 0, mid = c % 5 === 0;
        const len = big ? 7 : (mid ? 5 : 2.5);
        line(x, AY - len, x, AY + len, p.tick, 1);
        if (big && c !== 0) ctx.fillText(String(c), x, AY + 22);
    }
    ctx.textAlign = 'right';
    ctx.fillText('x, cm', canvas.width - 26, AY - 10);
    // Vertikal shkala (o'ng chetda): balandliklar shu bo'yicha o'qiladi
    const vx = canvas.width - 14;
    line(vx, Y(9), vx, Y(-9), p.tick, 1);
    for (let c = -9; c <= 9; c++) {
        if (c === 0) continue;
        const big = c % 2 === 0;
        line(vx - (big ? 6 : 3), Y(c), vx, Y(c), p.tick, 1);
        if (big) ctx.fillText(String(c), vx - 9, Y(c) + 4);
    }
    ctx.fillText('y, cm', vx, Y(9) - 8);
}

function drawLens(p) {
    const conv = state.type === 'conv';
    const H = LENS_H, w = 16;
    ctx.fillStyle = p.lensFill;
    ctx.strokeStyle = p.lensEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (conv) {
        ctx.moveTo(LX, AY - H);
        ctx.quadraticCurveTo(LX + 2 * w, AY, LX, AY + H);
        ctx.quadraticCurveTo(LX - 2 * w, AY, LX, AY - H);
    } else {
        ctx.moveTo(LX - w, AY - H);
        ctx.lineTo(LX + w, AY - H);
        ctx.quadraticCurveTo(LX + 2, AY, LX + w, AY + H);
        ctx.lineTo(LX - w, AY + H);
        ctx.quadraticCurveTo(LX - 2, AY, LX - w, AY - H);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Sxematik belgi: chiziq va uchlaridagi strelkalar
    line(LX, AY - H, LX, AY + H, p.lensEdge, 2.5);
    ctx.fillStyle = p.lensEdge;
    for (const s of [-1, 1]) {
        const y = AY + s * H;
        ctx.beginPath();
        if (conv) {   // tashqariga qaragan strelkalar
            ctx.moveTo(LX, y + s * 2); ctx.lineTo(LX - 9, y - s * 12); ctx.lineTo(LX + 9, y - s * 12);
        } else {      // ichkariga qaragan strelkalar
            ctx.moveTo(LX, y - s * 12); ctx.lineTo(LX - 9, y + s * 2); ctx.lineTo(LX + 9, y + s * 2);
        }
        ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('O', LX + 6, AY + 18);
}

function drawFoci(p) {
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    for (const s of [-1, 1]) {
        for (const k of [1, 2]) {
            const x = X(s * k * state.Fabs);
            ctx.fillStyle = p.focus;
            ctx.beginPath(); ctx.arc(x, AY, k === 1 ? 5 : 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillText(k === 1 ? 'F' : '2F', x, AY - 12);
        }
    }
}

// Linzadan keyingi nur: (LX, y) dan berilgan qiyalik bilan o'ng chetgacha
function emergent(r, color) {
    const x1 = 50;  // cm — kanvasdan tashqari
    line(X(0), Y(r.yL), X(x1), Y(r.yL + r.slope * x1), color, 2.2);
    rayHead(X(16), Y(r.yL + r.slope * 16), S, -r.slope * SY, color);
}
function backExt(r, xTo, color) {
    line(X(0), Y(r.yL), X(xTo), Y(r.yL + r.slope * xTo), color, 1.6, [6, 5]);
}

function drawRays(p, img) {
    const { ray1, ray2, ray3 } = rays();
    const d = state.d, h = state.h, Fv = F();
    const ox = X(-d), oy = Y(h);
    const virt = img && img.f < 0;

    // 1) Optik markaz orqali
    line(ox, oy, X(0), Y(0), p.r1, 2.2);
    rayHead((ox + X(0)) / 2, (oy + Y(0)) / 2, X(0) - ox, Y(0) - oy, p.r1);
    emergent(ray1, p.r1);
    if (virt && img.f < -d) backExt(ray1, img.f, p.r1);

    // 2) O'qqa parallel
    line(ox, oy, X(0), Y(h), p.r2, 2.2);
    rayHead((ox + X(0)) / 2, oy, 1, 0, p.r2);
    emergent(ray2, p.r2);
    if (virt) backExt(ray2, Math.min(img.f, Fv < 0 ? Fv : 0), p.r2);

    // 3) Fokus orqali (yoki fokusga yo'nalgan)
    if (ray3 && Math.abs(ray3.yL) * SY < 4000) {
        line(ox, oy, X(0), Y(ray3.yL), p.r3, 2.2);
        rayHead((ox + X(0)) / 2, (oy + Y(ray3.yL)) / 2, X(0) - ox, Y(ray3.yL) - oy, p.r3);
        const fx = -Fv;   // nur yo'nalgan fokus: yig'uvchida chapda, sochuvchida o'ngda
        if (fx < -d) line(X(fx), Y(0), ox, oy, p.r3, 1.6, [6, 5]);          // fokus buyumdan nariroqda
        else if (fx > 0) line(X(0), Y(ray3.yL), X(fx), Y(0), p.r3, 1.6, [6, 5]); // sochuvchi: davomi
        emergent(ray3, p.r3);
        if (virt) backExt(ray3, img.f, p.r3);
    }
}

function drawObjectImage(p, img) {
    // Buyum va uni ushlash joyi
    const ox = X(-state.d);
    ctx.fillStyle = p.grip;
    ctx.beginPath(); ctx.arc(ox, AY, 13, 0, Math.PI * 2); ctx.fill();
    arrow(ox, AY, Y(state.h), p.obj, 3.5, false);
    ctx.fillStyle = p.obj;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('buyum', ox, AY + 42);

    // Tasvir izi (harakat paytida)
    if (state.trace.length > 1) {
        ctx.strokeStyle = p.trace;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        let pen = false;   // tasvir cheksizlikka ketgan joyda iz uziladi
        state.trace.forEach(t => {
            if (!isFinite(t[0])) { pen = false; return; }
            const x = X(t[0]), y = Y(t[1]);
            if (!pen) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            pen = true;
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (!img) return;
    const ix = X(img.f), iy = Y(img.H);
    const virt = img.f < 0;
    arrow(ix, AY, iy, p.img, 3.5, virt);
    ctx.fillStyle = p.img;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    // Buyum yozuvi bilan ustma-ust tushmasin: yaqin bo'lsa tasvir yozuvi uning uchida
    const near = Math.abs(ix - ox) < 100;
    const ly = img.H >= 0 ? (near ? iy - 12 : AY + 42) : iy + 24;
    if (ix > -40 && ix < canvas.width + 40) ctx.fillText(virt ? 'mavhum tasvir' : 'tasvir', ix, Math.max(16, Math.min(canvas.height - 64, ly)));
}

function dimLine(p, x0, x1, y, text, color) {
    line(x0, y, x1, y, color, 1.4);
    for (const x of [x0, x1]) line(x, y - 5, x, y + 5, color, 1.4);
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const mx = Math.max(60, Math.min(canvas.width - 60, (x0 + x1) / 2));
    ctx.fillText(text, mx, y - 6);
}

function panel(p, x, y, w, h) {
    ctx.fillStyle = p.panel;
    ctx.strokeStyle = p.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
}

function draw() {
    const p = P();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, p.bg1);
    bg.addColorStop(1, p.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = image();
    drawAxis(p);
    drawLens(p);
    drawRays(p, img);
    drawFoci(p);
    drawObjectImage(p, img);

    // O'lcham chiziqlari
    dimLine(p, X(-state.d), X(0), canvas.height - 44, 'd = ' + state.d.toFixed(1) + ' cm', p.obj);
    if (img) {
        const fx = Math.max(-20, Math.min(canvas.width + 20, X(img.f)));
        dimLine(p, X(0), fx, canvas.height - 14, 'f = ' + fmt(img.f, 1) + ' cm', p.img);
    }

    // Ma'lumot panellari
    const Fv = F();
    panel(p, 12, 12, 236, 70);
    ctx.textAlign = 'left';
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(state.type === 'conv' ? 'Yig\'uvchi linza' : 'Sochuvchi linza', 24, 36);
    ctx.font = '14px Arial';
    ctx.fillText('F = ' + fmt(Fv, 1) + ' cm,  D = ' + (Fv > 0 ? '+' : '−') + Math.abs(100 / Fv).toFixed(1) + ' dptr', 24, 58);
    ctx.fillStyle = p.muted;
    ctx.fillText('h = ' + state.h.toFixed(1) + ' cm', 24, 75);

    const ds = describe(img);
    panel(p, 468, 12, 250, 92);
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 15px Arial';
    ctx.fillText('Tasvir:', 480, 35);
    ctx.font = '14px Arial';
    if (ds) {
        ctx.fillStyle = p.img;
        ctx.fillText(ds.nature + ', ' + ds.orient + ',', 480, 56);
        ctx.fillText(ds.size + ' (Γ = ' + ds.G.toFixed(2) + ')', 480, 75);
        ctx.fillStyle = p.muted;
        ctx.fillText('H = ' + Math.abs(img.H).toFixed(2) + ' cm', 480, 94);
    } else {
        ctx.fillStyle = p.img;
        ctx.fillText('hosil bo\'lmaydi — nurlar', 480, 56);
        ctx.fillText('parallel (cheksizlikda)', 480, 75);
    }
    if (img && (X(img.f) < 0 || X(img.f) > canvas.width || Math.abs(img.H) * SY > AY)) {
        ctx.fillStyle = p.muted;
        ctx.font = 'italic 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('tasvir kanvasdan tashqarida', LX, 128);
    }

    // Nurlar legendasi
    const lg = [[p.r1, 'markaz orqali'], [p.r2, 'o\'qqa parallel'], [p.r3, 'fokus orqali']];
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    lg.forEach((l, i) => {
        const x = 268, y = 24 + i * 18;
        line(x, y - 4, x + 22, y - 4, l[0], 3);
        ctx.fillStyle = p.ink;
        ctx.fillText(l[1], x + 28, y);
    });
}

function updatePhysics(dt) {
    setD(state.d - SPEED * dt, false);
    const img = image();
    if (img && Math.abs(img.f) < 60 && Math.abs(img.H) < 40) state.trace.push([img.f, img.H]);
    else if (state.trace.length) state.trace.push([NaN, NaN]);
    if (state.trace.length > 2000) state.trace.shift();
    if (state.d <= D_MIN + 1e-9) pauseMove();
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

function startMove() {
    if (!state.running) {
        // Buyum linza yonida bo'lsa — uzoqdan qayta boshlaymiz
        if (state.d <= D_MIN + 0.25) { setD(D_MAX, false); state.trace = []; }
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pauseMove() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    updateStats();
    draw();
}

function resetMove() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    setD(state.dUser, false);
    state.trace = [];
    updateStats();
    draw();
}

resetMove();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startMove, pause: pauseMove, reset: resetMove };
window.modelIsRunning = function () { return state.running; };
function imgVal(fn) { const im = image(); return im ? fn(im) : '—'; }
window.labFields = [
    { label: 'Linza',          get: function () { return state.type === 'conv' ? 'yig\'uvchi' : 'sochuvchi'; } },
    { label: 'F (cm)',         get: function () { return F(); } },
    { label: 'D (dptr)',       get: function () { return +(100 / F()).toFixed(2); } },
    { label: 'd (cm)',         get: function () { return +state.d.toFixed(1); } },
    { label: 'h (cm)',         get: function () { return state.h; } },
    { label: 'f (cm)',         get: function () { return imgVal(im => +im.f.toFixed(2)); } },
    { label: 'H (cm)',         get: function () { return imgVal(im => +Math.abs(im.H).toFixed(2)); } },
    { label: 'Γ',              get: function () { return imgVal(im => +(Math.abs(im.f) / state.d).toFixed(3)); } },
    { label: '1/d + 1/f (dptr)', get: function () { return imgVal(im => +(100 / state.d + 100 / im.f).toFixed(2)); } },
    { label: 'Tasvir',         get: function () { const s = describe(image()); return s ? s.nature + ', ' + s.orient + ', ' + s.size : 'yo\'q'; } }
];
