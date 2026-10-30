/* induksiya_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('inductionCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { bg: '#f5f7fa', ink: '#37474f', rail: '#cfd8dc', coil: '#a1580e',
                frame: '#78909c', wire: '#5d4037', dial: '#ffffff', dialEdge: '#37474f',
                tick: '#90a4ae' };
const DARK  = { bg: '#0e1620', ink: '#cfe3ef', rail: '#31485a', coil: '#d98324',
                frame: '#5d7a8c', wire: '#8d6e63', dial: '#182634', dialEdge: '#7fa3b8',
                tick: '#4a6572' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const coilY = 230; // g'altak o'qining balandligi
const magY = 230;

let state = {
    mode: 'auto',
    running: false,
    phase: -Math.PI / 2, // avto tebranish fazasi (magX = 55 dan boshlanadi)
    magX: 120,         // magnit markazi
    prevFlux: 0,
    emf: 0,
    emfSmooth: 0,
    emfMax: 0,         // shu sozlamalardagi eng katta |EYK| (topshiriq uchun)
    speed: 1,
    N: 10
};
let animationId = null;
let lastTs = null;

function setMode(m, evt) {
    state.mode = m;
    const bA = document.getElementById('modeAuto'), bM = document.getElementById('modeManual');
    bA.classList.toggle('active', m === 'auto');
    bM.classList.toggle('active', m === 'manual');
    bA.setAttribute('aria-checked', m === 'auto' ? 'true' : 'false');
    bM.setAttribute('aria-checked', m === 'manual' ? 'true' : 'false');
    document.getElementById('posSlider').disabled = (m === 'auto');
    if (m === 'auto') {
        // Fazani magnitning hozirgi joyiga moslaymiz — aks holda bir kadrda
        // sakrab, EYK keskin (o'nlab marta) oshib ketardi
        const k = Math.max(-1, Math.min(1, (state.magX - 250) / 195));
        state.phase = Math.asin(k);
    }
    resetEmfMax();
    if (m === 'manual') startInduction();
}

document.getElementById('posSlider').oninput = function() {
    if (state.mode === 'manual') {
        state.magX = 55 + (parseFloat(this.value) / 100) * 390; // 55..445
        // Pauzada ham magnit siljishi ko'rinishi uchun qayta chizamiz
        if (!state.running) {
            // Pauzada magnit qo'lda qo'yiladi: oqim yangilanadi, EYK esa 0
            // (tajriba to'xtagan — oqim o'zgarish tezligi o'lchanmaydi)
            const flux = fluxSingle(state.magX);
            state.prevFlux = flux;
            state.emf = 0; state.emfSmooth = 0;
            updateReadouts(flux);
            draw();
        }
    }
};
document.getElementById('speedSlider').oninput = function() {
    state.speed = parseFloat(this.value);
    document.getElementById('speedValue').textContent = state.speed.toFixed(1) + 'x';
    resetEmfMax();
};
document.getElementById('turnsSlider').oninput = function() {
    state.N = parseInt(this.value);
    document.getElementById('turnsValue').textContent = state.N;
    // O'ramlar soni g'altak enini o'zgartiradi -> oqim bazasi ham yangilanadi
    state.prevFlux = fluxSingle(state.magX);
    resetEmfMax();
    if (!state.running) draw();
};

// Sozlama o'zgarsa maksimum qaytadan o'lchanadi
function resetEmfMax() {
    state.emfMax = 0;
    document.getElementById('emfMaxValue').textContent = '0.0 sh.b.';
}

// G'altakning magnitga qaragan chap cheti QOTIRILGAN: o'ramlar qo'shilganda
// g'altak o'ngga uzayadi. Shunda bitta o'ram oqimi Φ N ga bog'liq bo'lmaydi
// va EYK = −N·ΔΦ/Δt da N ga to'g'ri proporsionallik aniq bajariladi.
const COIL_LEFT = 500;
function coilWidth() { return Math.min(180, 30 + state.N * 9); }

// Bitta o'ram orqali o'tuvchi magnit oqimi (shartli birlikda, 0..1).
// Magnit uchi g'altak chetiga yetganda (d = 0) maksimal bo'ladi.
function fluxSingle(magX) {
    const d = Math.max(0, COIL_LEFT - (magX + 55));
    return 1 / (1 + Math.pow(d / 70, 2));
}

function physicsStep(dt) {
    if (state.mode === 'auto') {
        state.phase += dt * state.speed * 1.4;
        // Diapazon qo'lda rejim bilan bir xil (60..480) - rejim almashganda sakramaydi
        state.magX = 250 + 195 * Math.sin(state.phase); // 55..445: g'altak chetiga yetadi
        document.getElementById('posSlider').value = ((state.magX - 55) / 390 * 100).toFixed(0);
    }
    const flux = fluxSingle(state.magX);
    // EYK = -N * dPhi/dt (shartli birliklarda -> mV masshtabi)
    state.emf = -state.N * (flux - state.prevFlux) / Math.max(dt, 1e-4) * 12;
    state.prevFlux = flux;
    // Strelka silliq harakatlanishi uchun
    state.emfSmooth += (state.emf - state.emfSmooth) * Math.min(1, dt * 10);

    updateReadouts(flux);
}

// Pozitsiya, Φ, Ψ, EYK va yo'nalish ko'rsatkichlari
function updateReadouts(flux) {
    const posPct = Math.round((state.magX - 55) / 390 * 100);
    document.getElementById('posValue').textContent = posPct + '%';
    // Φ - BITTA o'ram orqali oqim (N ga bog'liq emas!), Ψ = N·Φ - oqim ilashishi
    document.getElementById('fluxValue').textContent = (flux * 10).toFixed(2) + ' sh.b.';
    document.getElementById('linkageValue').textContent = (flux * state.N * 10).toFixed(1) + ' sh.b.';
    document.getElementById('emfValue').textContent = state.emfSmooth.toFixed(1) + ' sh.b.';
    if (state.running && Math.abs(state.emfSmooth) > state.emfMax) {
        state.emfMax = Math.abs(state.emfSmooth);
        document.getElementById('emfMaxValue').textContent = state.emfMax.toFixed(1) + ' sh.b.';
    }
    // Lens qoidasi: oqim ORTSA (magnit yaqinlashmoqda) g'altak magnitni ITARADI.
    // Oqim ortganda EYK = -N*dPhi/dt < 0 bo'ladi.
    const dir = Math.abs(state.emfSmooth) < 1 ? '— (tok yo\'q)' :
        (state.emfSmooth < 0 ? '↻ itaradi (yaqinlashmoqda)' : '↺ tortadi (uzoqlashmoqda)');
    document.getElementById('dirValue').textContent = dir;
}

function drawMagnet() {
    const x = state.magX, y = magY;
    // N qutb (qizil) va S qutb (ko'k)
    ctx.fillStyle = '#c62828';
    ctx.fillRect(x, y - 22, 55, 44);
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(x - 55, y - 22, 55, 44);
    ctx.strokeStyle = P().ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 55, y - 22, 110, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', x + 27, y + 7);
    ctx.fillText('S', x - 27, y + 7);

    // Maydon chiziqlari (N qutbdan chiqadi)
    ctx.strokeStyle = 'rgba(198,40,40,0.4)';
    ctx.lineWidth = 1.5;
    for (const dy of [-30, -15, 0, 15, 30]) {
        ctx.beginPath();
        ctx.moveTo(x + 57, y + dy * 0.4);
        ctx.quadraticCurveTo(x + 110, y + dy, x + 165, y + dy * 1.3);
        ctx.stroke();
    }
}

function drawCoil() {
    const n = state.N;
    const w = coilWidth();
    const x0 = COIL_LEFT;
    // Har bir o'ram - ellips
    for (let i = 0; i < n; i++) {
        const ex = x0 + (i + 0.5) * (w / n);
        ctx.strokeStyle = P().coil;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(ex, coilY, 9, 62, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    // Karkas chiziqlari
    ctx.strokeStyle = P().frame;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 - 12, coilY - 62);
    ctx.lineTo(x0 + w + 12, coilY - 62);
    ctx.moveTo(x0 - 12, coilY + 62);
    ctx.lineTo(x0 + w + 12, coilY + 62);
    ctx.stroke();
    ctx.setLineDash([]);

    // Galvanometrga simlar
    ctx.strokeStyle = P().wire;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, coilY + 62);
    ctx.lineTo(x0, 440);
    ctx.lineTo(560, 440);
    ctx.moveTo(x0 + w, coilY + 62);
    ctx.lineTo(x0 + w, 415);
    ctx.lineTo(640, 415);
    ctx.lineTo(640, 440);
    ctx.stroke();

    ctx.fillStyle = P().ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N = ' + n + ' o\'ram', x0 + w / 2, coilY - 78);
}

function drawGalvanometer() {
    const gx = 600, gy = 440;
    const gp = P();
    ctx.fillStyle = gp.dial;
    ctx.beginPath();
    ctx.arc(gx, gy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gp.dialEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Shkala
    ctx.strokeStyle = gp.tick;
    ctx.lineWidth = 1.5;
    for (let a = -60; a <= 60; a += 15) {
        const rad = (a - 90) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(gx + 34 * Math.cos(rad), gy + 34 * Math.sin(rad));
        ctx.lineTo(gx + 40 * Math.cos(rad), gy + 40 * Math.sin(rad));
        ctx.stroke();
    }
    // Strelka: EYK ga proporsional og'adi (chegaralangan)
    // Yumshoq to'yinish: kichik va katta EYK farqi strelkada ko'rinadi
    const angle = 60 * Math.tanh(state.emfSmooth / 400);
    const rad = (angle - 90) * Math.PI / 180;
    ctx.strokeStyle = '#d84315';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 36 * Math.cos(rad), gy + 36 * Math.sin(rad));
    ctx.stroke();
    ctx.fillStyle = gp.dialEdge;
    ctx.beginPath();
    ctx.arc(gx, gy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gp.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('G', gx, gy + 28);
    ctx.fillText('0', gx, gy - 48);
}

function draw() {
    const pal = P();
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Harakat yo'li
    ctx.strokeStyle = pal.rail;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, magY + 32);
    ctx.lineTo(500, magY + 32);
    ctx.stroke();

    drawCoil();
    drawMagnet();
    drawGalvanometer();

    // Sarlavha
    ctx.fillStyle = pal.ink;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('EYK = −N·ΔΦ/Δt = ' + state.emfSmooth.toFixed(1) + ' sh.b.', 20, 36);
}

function loop(ts) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    physicsStep(dt);
    draw();
    if (state.running) animationId = requestAnimationFrame(loop);
}

function startInduction() {
    if (!state.running) {
        state.running = true;
        lastTs = null;
        state.prevFlux = fluxSingle(state.magX);
        animationId = requestAnimationFrame(loop);
    }
}
function pauseInduction() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
}
function resetInduction() {
    pauseInduction();
    state.phase = -Math.PI / 2;   // sin = -1 -> magX = 55: startda sakramaydi
    state.magX = 55;
    state.emf = 0;
    state.emfSmooth = 0;
    state.prevFlux = fluxSingle(state.magX);
    // Slayder va yozuvlar magnitning haqiqiy joyiga mos bo'lsin
    document.getElementById('posSlider').value = 0;
    resetEmfMax();
    updateReadouts(state.prevFlux);
    draw();
}

document.getElementById('posSlider').disabled = true;
resetInduction();

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startInduction, pause: pauseInduction, reset: resetInduction };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: "Tezlik (x)", get: function () { return +state.speed.toFixed(1); } },
    { label: "N", get: function () { return state.N; } },
    { label: "Φ (sh.b.)", get: function () { return labNum('fluxValue'); } },
    { label: "EYK (sh.b.)", get: function () { return labNum('emfValue'); } },
    { label: "Maks. |EYK|", get: function () { return labNum('emfMaxValue'); } },
    { label: "Yo'nalish", get: function () { return document.getElementById('dirValue').textContent; } }
];
