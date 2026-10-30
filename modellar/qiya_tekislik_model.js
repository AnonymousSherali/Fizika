/* qiya_tekislik_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('inclineCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { sky1: '#e3f2fd', sky2: '#fff8e1', ground: '#8d6e63', groundEdge: '#5d4037',
                ramp: '#a1887f', rampEdge: '#4e342e', hatch: '#6d4c41', ink: '#4e342e',
                done: '#1b7f4a', angle: '#c0392b', height: '#2980b9',
                box1: '#ffb74d', box2: '#e65100', boxEdge: '#bf360c' };
const DARK  = { sky1: '#0d1520', sky2: '#1a1712', ground: '#3e2f29', groundEdge: '#241a16',
                ramp: '#4a3a34', rampEdge: '#8d7168', hatch: '#8d7168', ink: '#e8d5b5',
                done: '#4ade80', angle: '#ff8a70', height: '#7dd3fc',
                box1: '#fbbf24', box2: '#c2410c', boxEdge: '#fed7aa' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const G = 9.81;
const S = 2.0; // qiyalik uzunligi (m)

let state = {
    angle: 30 * Math.PI / 180,
    mu: 0.2,
    mass: 2.0,
    t: 0,          // yuk pozitsiyasi [0..1]
    running: false
};

let animationId = null;
let lastTimestamp = null;

// Sozlama o'zgarganda yuk boshiga qaytadi (yangi shart bilan tajriba),
// lekin faqat harakat tugagan yoki to'xtagan bo'lsa
function applySetting() {
    if (!state.running) {
        state.t = 0;
        updateStats();
        draw();
    } else {
        updateStats();
    }
}
document.getElementById('angleSlider').oninput = function() {
    state.angle = parseInt(this.value) * Math.PI / 180;
    document.getElementById('angleValue').textContent = this.value + '°';
    applySetting();
};
document.getElementById('muSlider').oninput = function() {
    state.mu = parseFloat(this.value);
    document.getElementById('muValue').textContent = state.mu.toFixed(2);
    applySetting();
};
document.getElementById('massSlider').oninput = function() {
    state.mass = parseFloat(this.value);
    document.getElementById('massValue').textContent = state.mass.toFixed(1) + ' kg';
    applySetting();
};

function physics() {
    const sinA = Math.sin(state.angle);
    const cosA = Math.cos(state.angle);
    const F = state.mass * G * (sinA + state.mu * cosA);
    const h = S * sinA;
    const Af = state.mass * G * h;                    // foydali ish
    const Aisq = state.mu * state.mass * G * cosA * S; // ishqalanishga isrof
    const Au = F * S;                                  // umumiy ish
    const eta = Af / Au;
    return { F, h, Af, Aisq, Au, eta };
}

function updateStats() {
    const p = physics();
    document.getElementById('forceValue').textContent = p.F.toFixed(2) + ' N';
    document.getElementById('heightValue').textContent = p.h.toFixed(2) + ' m';
    document.getElementById('usefulWork').textContent = p.Af.toFixed(2) + ' J';
    document.getElementById('totalWork').textContent = p.Au.toFixed(2) + ' J';
    document.getElementById('frictionWork').textContent = p.Aisq.toFixed(2) + ' J';
    document.getElementById('efficiencyValue').textContent = (p.eta * 100).toFixed(1) + '%';
    // Energiya saqlanish qonuni tekshiruvi: A_u = A_f + A_ishq
    const balanced = Math.abs(p.Au - (p.Af + p.Aisq)) < 0.01;
    document.getElementById('energyBalance').textContent =
        (p.Af + p.Aisq).toFixed(2) + ' J = ' + p.Au.toFixed(2) + ' J ' + (balanced ? '\u2713' : '\u2717');
}

function drawArrow(x1, y1, x2, y2, color, label) {
    const headLen = 10;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(ang - Math.PI / 6), y2 - headLen * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(ang + Math.PI / 6), y2 - headLen * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.font = 'bold 14px Arial';
        ctx.fillText(label, x2 + 8, y2 + 4);
    }
}

function draw() {
    // Fon
    const pal = P();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, pal.sky1);
    bg.addColorStop(1, pal.sky2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const baseX = 120, baseY = 520;
    const D = 480; // qiyalik piksel uzunligi
    const topX = baseX + D * Math.cos(state.angle);
    const topY = baseY - D * Math.sin(state.angle);

    // Yer
    ctx.fillStyle = pal.ground;
    ctx.fillRect(0, baseY, canvas.width, canvas.height - baseY);
    ctx.strokeStyle = pal.groundEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(canvas.width, baseY);
    ctx.stroke();

    // Qiya tekislik (uchburchak)
    ctx.fillStyle = pal.ramp;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(topX, baseY);
    ctx.lineTo(topX, topY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.rampEdge;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Yuza shtrixlari - ishqalanish mavjudligini bildiradi
    ctx.strokeStyle = pal.hatch;
    ctx.lineWidth = 1.5;
    for (let t = 0.06; t < 0.98; t += 0.06) {
        const hx = baseX + t * D * Math.cos(state.angle);
        const hy = baseY - t * D * Math.sin(state.angle);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + 9 * Math.sin(state.angle), hy + 9 * Math.cos(state.angle));
        ctx.stroke();
    }

    // Burchak yoyi va belgisi
    ctx.strokeStyle = pal.angle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 55, -state.angle, 0);
    ctx.stroke();
    ctx.fillStyle = pal.angle;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('α = ' + (state.angle * 180 / Math.PI).toFixed(0) + '°', baseX + 62, baseY - 12);

    // Balandlik chizig'i (h)
    ctx.strokeStyle = pal.height;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topX + 25, baseY);
    ctx.lineTo(topX + 25, topY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = pal.height;
    ctx.font = 'bold 15px Arial';
    ctx.fillText('h = ' + (S * Math.sin(state.angle)).toFixed(2) + ' m', topX + 32, (baseY + topY) / 2);

    // Yuk pozitsiyasi (qiyalik bo'ylab)
    const bx = baseX + state.t * D * Math.cos(state.angle);
    const by = baseY - state.t * D * Math.sin(state.angle);

    // Yuk (aylanma koordinatada chiziladi)
    const bw = 60, bh = 38;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-state.angle);
    const boxGrad = ctx.createLinearGradient(0, -bh, 0, 0);
    boxGrad.addColorStop(0, pal.box1);
    boxGrad.addColorStop(1, pal.box2);
    ctx.fillStyle = boxGrad;
    ctx.fillRect(0, -bh, bw, bh);
    ctx.strokeStyle = pal.boxEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -bh, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.mass.toFixed(1) + ' kg', bw / 2, -bh / 2 + 5);
    ctx.textAlign = 'left';
    ctx.restore();

    // Yuk markazi (kuch vektorlari shu nuqtadan chiqadi)
    const ccx = bx + (bw / 2) * Math.cos(state.angle) - (bh / 2) * Math.sin(state.angle);
    const ccy = by - (bw / 2) * Math.sin(state.angle) - (bh / 2) * Math.cos(state.angle);

    // Kuch vektorlari (masshtablangan)
    const p = physics();
    const fScale = 90 / (state.mass * G); // mg doim 90px — vektorlar aniq ko'rinadi
    const dirX = Math.cos(state.angle), dirY = -Math.sin(state.angle); // qiyalik bo'ylab yuqoriga
    const nX = Math.sin(state.angle), nY = Math.cos(state.angle);       // yuzaga perpendikulyar (tashqariga: -nX? )

    // mg — pastga
    drawArrow(ccx, ccy, ccx, ccy + state.mass * G * fScale, '#2980b9', 'mg');
    // F — qiyalik bo'ylab yuqoriga
    drawArrow(ccx, ccy, ccx + p.F * fScale * dirX, ccy + p.F * fScale * dirY, '#27ae60', 'F');
    // Ishqalanish — qiyalik bo'ylab pastga
    const Fr = state.mu * state.mass * G * Math.cos(state.angle);
    drawArrow(ccx, ccy, ccx - Fr * fScale * dirX, ccy - Fr * fScale * dirY, '#c0392b', 'F_ishq');
    // N — yuzadan tashqariga (chap-yuqoriga)
    const N = state.mass * G * Math.cos(state.angle);
    drawArrow(ccx, ccy, ccx - N * fScale * nX, ccy - N * fScale * nY, '#e67e22', 'N');

    // Sarlavha ma'lumotlari
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 17px Arial';
    ctx.fillText('s = ' + S.toFixed(1) + ' m (qiyalik uzunligi)', 20, 36);
    ctx.fillText('FIK η = ' + (p.eta * 100).toFixed(1) + '%', 20, 62);

    // Progress (bajarilgan ish)
    if (state.t > 0) {
        ctx.fillStyle = pal.done;
        ctx.font = 'bold 15px Arial';
        ctx.fillText('Bajarilgan ish: ' + (p.Au * state.t).toFixed(1) + ' J / ' + p.Au.toFixed(1) + ' J', 20, 88);
    }
}

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    if (dt > 0.05) dt = 0.05;

    if (state.running) {
        state.t += dt * 0.18; // doimiy tezlik bilan tortish
        if (state.t >= 1) {
            state.t = 1;
            state.running = false;
        }
    }
    draw();
    if (state.running) animationId = requestAnimationFrame(loop);
}

function startIncline() {
    if (!state.running) {
        if (state.t >= 1) state.t = 0;
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pauseIncline() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function resetIncline() {
    pauseIncline();
    state.t = 0;
    updateStats();
    draw();
}

resetIncline();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startIncline, pause: pauseIncline, reset: resetIncline };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: "α (°)", get: function () { return Math.round(state.angle*180/Math.PI); } },
    { label: "μ", get: function () { return state.mu.toFixed(2); } },
    { label: "m (kg)", get: function () { return state.mass.toFixed(1); } },
    { label: "F (N)", get: function () { return physics().F.toFixed(2); } },
    { label: "A_f (J)", get: function () { return physics().Af.toFixed(2); } },
    { label: "A_ishq (J)", get: function () { return physics().Aisq.toFixed(2); } },
    { label: "FIK (%)", get: function () { return (physics().eta*100).toFixed(1); } }
];
