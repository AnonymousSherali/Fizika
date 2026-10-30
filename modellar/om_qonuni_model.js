/* om_qonuni_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('circuitCanvas');
const ctx = canvas.getContext('2d');

let state = { U: 6, R: 10, running: false, t: 0 };
let animationId = null;
let lastTs = null;

// Zanjir konturi (to'rtburchak yo'l)
const L = 150, Rt = 650, T = 140, B = 400;
const perim = 2 * (Rt - L) + 2 * (B - T);

document.getElementById('voltageSlider').oninput = function() {
    state.U = parseFloat(this.value);
    document.getElementById('voltageValue').textContent = state.U.toFixed(1) + ' V';
    updateStats();
    if (!state.running) draw();
};
document.getElementById('resistanceSlider').oninput = function() {
    state.R = parseInt(this.value);
    document.getElementById('resistanceValue').textContent = state.R + ' Ω';
    updateStats();
    if (!state.running) draw();
};

// Kalit ochiq (tok yoqilmagan yoki to'xtatilgan) bo'lsa zanjirda tok yo'q
function current() { return state.running ? state.U / state.R : 0; }

function updateStats() {
    const I = current();
    document.getElementById('uValue').textContent = state.U.toFixed(1) + ' V';
    document.getElementById('rValue').textContent = state.R + ' Ω';
    document.getElementById('iValue').textContent = I.toFixed(2) + ' A';
    const P = state.U * I;
    document.getElementById('pValue').textContent = P.toFixed(2) + ' W';
    // Amaliy chegaradan oshganda ogohlantiramiz (real fizikaviy tushuncha)
    const warn = document.getElementById('powerWarn');
    if (warn) warn.hidden = P <= 10;
}

// Perimetr bo'ylab t (0..1) -> nuqta koordinatasi
function pointOnLoop(t) {
    let d = ((t % 1) + 1) % 1 * perim;
    const w = Rt - L, h = B - T;
    if (d < w) return { x: L + d, y: T };          // yuqori: chapdan o'ngga
    d -= w;
    if (d < h) return { x: Rt, y: T + d };          // o'ng: pastga
    d -= h;
    if (d < w) return { x: Rt - d, y: B };          // past: o'ngdan chapga
    d -= w;
    return { x: L, y: B - d };                      // chap: yuqoriga
}

function drawWireLoop() {
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(L, T, Rt - L, B - T);
    ctx.stroke();
}

function drawBattery() {
    // Chap tomonda manba (uzun/qisqa plastinka)
    const cy = (T + B) / 2;
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(L - 12, cy - 32, 24, 64);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 4;
    ctx.beginPath(); // uzun plastinka (+)
    ctx.moveTo(L - 14, cy - 26);
    ctx.lineTo(L + 14, cy - 26);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath(); // qisqa plastinka (-)
    ctx.moveTo(L - 7, cy + 22);
    ctx.lineTo(L + 7, cy + 22);
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('+', L - 22, cy - 20);
    ctx.fillText('−', L - 22, cy + 30);
    ctx.textAlign = 'left';
    ctx.fillText('U = ' + state.U.toFixed(1) + ' V', L - 130, cy + 5);
}

function drawResistor() {
    // Yuqorida zigzag rezistor, qizishi P ga bog'liq
    const x0 = 340, x1 = 460, y = T;
    const P = state.U * current();
    const heat = Math.min(1, P / 15);
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(x0 - 4, y - 16, x1 - x0 + 8, 32);
    ctx.strokeStyle = 'rgb(255,' + Math.round(160 - 100 * heat) + ',' + Math.round(60 - 50 * heat) + ')';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y);
    let px = x0;
    let up = true;
    while (px < x1) {
        ctx.lineTo(px + 7.5, up ? y - 13 : y + 13);
        px += 15;
        up = !up;
    }
    ctx.lineTo(x1 + 4, y);
    ctx.stroke();
    // Qizish shu'lasi
    if (heat > 0.15) {
        ctx.fillStyle = 'rgba(255,120,40,' + (0.25 * heat).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc((x0 + x1) / 2, y, 45, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#ffcc80';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('R = ' + state.R + ' Ω', (x0 + x1) / 2, y + 36);
}

function drawMeter(x, y, letter, value, unit) {
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#eceff1';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(letter, x, y + 7);
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#80deea';
    ctx.fillText(value + ' ' + unit, x, y + 48);
}

function drawVoltmeter() {
    // Rezistorga parallel voltmetr
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, T);
    ctx.lineTo(340, 68);
    ctx.lineTo(374, 68);
    ctx.moveTo(460, T);
    ctx.lineTo(460, 68);
    ctx.lineTo(426, 68);
    ctx.stroke();
    // Voltmetr rezistorga parallel: U_R = I·R (kalit ochiq bo'lsa 0)
    drawMeter(400, 68, 'V', (current() * state.R).toFixed(1), 'V');
}

function draw() {
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawWireLoop();
    drawResistor();
    drawVoltmeter();
    drawBattery();
    drawMeter(400, B, 'A', current().toFixed(2), 'A');
    if (!state.running) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Kalit ochiq — tok yo\'q. «Tokni yoqish» ni bosing', 400, B + 80);
    }

    // Tok zarralari (shartli musbat zaryad yo'nalishi: + dan -)
    const I = current();
    const n = 26;
    ctx.fillStyle = '#ffee58';
    for (let i = 0; i < n; i++) {
        const p = pointOnLoop(state.t + i / n);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Yo'nalish strelkasi (yuqori simda)
    ctx.strokeStyle = '#ffee58';
    ctx.fillStyle = '#ffee58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(230, T - 18);
    ctx.lineTo(270, T - 18);
    ctx.lineTo(262, T - 24);
    ctx.moveTo(270, T - 18);
    ctx.lineTo(262, T - 12);
    ctx.stroke();
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('I = ' + I.toFixed(2) + ' A', 278, T - 13);
}

function loop(ts) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    // Zarralar tezligi tok kuchiga proporsional
    state.t += dt * current() * 0.12;
    draw();
    if (state.running) animationId = requestAnimationFrame(loop);
}

function startCircuit() {
    if (!state.running) {
        state.running = true;
        lastTs = null;
        updateStats();
        animationId = requestAnimationFrame(loop);
    }
}
function pauseCircuit() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
    updateStats();
    draw();
}
// Qayta: tok o'chiriladi, zarralar boshlang'ich joyiga qaytadi.
// U va R sozlamalari saqlanadi (boshqa modellardagi "Qayta" bilan bir xil)
function resetCircuit() {
    pauseCircuit();
    state.t = 0;
    updateStats();
    draw();
}

updateStats();
draw();

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startCircuit, pause: pauseCircuit, reset: resetCircuit };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: "U (V)", get: function () { return state.U.toFixed(1); } },
    { label: "R (Ω)", get: function () { return state.R; } },
    { label: "I (A)", get: function () { return current().toFixed(3); } },
    { label: "P (W)", get: function () { return (state.U*current()).toFixed(2); } }
];
