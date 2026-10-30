/* mayatnik_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('pendulumCanvas');
const ctx = canvas.getContext('2d');

// Rejimga mos palitra — kanvas JS bilan chizilgani uchun CSS filter ish bermaydi
const LIGHT = { sky1: '#e0f7fa', sky2: '#b2ebf2', ink: '#0f3443', guide: '#90a4ae',
                beam: '#5d4037', beamEdge: '#3e2723', rod: '#37474f', pivot: '#263238',
                arc: 'rgba(2,119,189,0.35)', angle: '#d35400',
                bob1: '#80d8ff', bob2: '#0277bd', bobEdge: '#01579b' };
const DARK  = { sky1: '#0e1b24', sky2: '#12232e', ink: '#9fe6d8', guide: '#4a6572',
                beam: '#3e2b24', beamEdge: '#241713', rod: '#8fa6b2', pivot: '#b0bec5',
                arc: 'rgba(125,211,252,0.45)', angle: '#ffa552',
                bob1: '#7dd3fc', bob2: '#0369a1', bobEdge: '#bae6fd' };
function P() { return (window.isDarkTheme && window.isDarkTheme()) ? DARK : LIGHT; }

const bodies = {
    earth:   { name: 'Yer',     g: 9.81 },
    moon:    { name: 'Oy',      g: 1.62 },
    mars:    { name: 'Mars',    g: 3.71 },
    jupiter: { name: 'Yupiter', g: 24.79 },
    venus:   { name: 'Venera',  g: 8.87 },
    sun:     { name: 'Quyosh',  g: 274.0 }
};

let state = {
    L: 1.0,
    theta0: 10 * Math.PI / 180,
    theta: 10 * Math.PI / 180,
    omega: 0,
    g: 9.81,
    running: false,
    time: 0,
    oscillations: 0,
    crossTimes: []
};

let animationId = null;
let lastTimestamp = null;

document.getElementById('lengthSlider').oninput = function() {
    state.L = parseFloat(this.value);
    document.getElementById('lengthValue').textContent = state.L.toFixed(2) + ' m';
    // Tebranish davom etadi, faqat o'lchov hisoblari qayta boshlanadi
    restartMeasurement();
};

document.getElementById('angleSlider').oninput = function() {
    const deg = parseInt(this.value);
    state.theta0 = deg * Math.PI / 180;
    document.getElementById('angleValue').textContent = deg + '°';
    // Kichik burchak sharti buzilganda darhol ogohlantiramiz
    document.getElementById('angleWarn').hidden = deg <= 15;
    // Amplituda o'zgarishi mayatnikni boshidan qo'yib yuborishni talab qiladi,
    // lekin ishlab turgan bo'lsa - avtomatik davom ettiramiz
    const wasRunning = state.running;
    resetPendulum();
    if (wasRunning) startPendulum();
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
    restartMeasurement();
}

// Tebranishni to'xtatmasdan o'lchov hisoblarini nolga qaytaradi
function restartMeasurement() {
    state.time = 0;
    state.oscillations = 0;
    state.crossTimes = [];
    document.getElementById('measuredG').textContent = '-';
    document.getElementById('gError').textContent = '-';
    document.getElementById('oscValue').textContent = '0';
    const T = theoreticalPeriod();
    document.getElementById('periodValue').textContent = T.toFixed(3) + ' s';
    document.getElementById('frequencyValue').textContent = (1 / T).toFixed(3) + ' Hz';
    if (!state.running) draw();
}

function theoreticalPeriod() {
    return 2 * Math.PI * Math.sqrt(state.L / state.g);
}

function updatePhysics(dt) {
    // Haqiqiy mayatnik tenglamasi: θ'' = -(g/L) sin θ
    const steps = 8;
    const h = dt / steps;
    let t = state.time;
    for (let i = 0; i < steps; i++) {
        const alpha = -(state.g / state.L) * Math.sin(state.theta);
        state.omega += alpha * h;
        const prevTheta = state.theta;
        state.theta += state.omega * h;
        t += h;
        if ((prevTheta < 0 && state.theta >= 0) || (prevTheta > 0 && state.theta <= 0)) {
            state.oscillations += 0.5;
            state.crossTimes.push(t);
            // Faqat oxirgi 40 ta kesishish saqlanadi: xotira o'smaydi va
            // o'lchangan davr yangi ma'lumotlarga sezgir qoladi
            if (state.crossTimes.length > 40) state.crossTimes.shift();
        }
    }
    state.time += dt;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const p = P();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, p.sky1);
    bg.addColorStop(1, p.sky2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pivotX = canvas.width / 2;
    const pivotY = 80;

    const pxPerMeter = 150;
    const lenPx = state.L * pxPerMeter;
    const maxLen = canvas.height - pivotY - 60;
    const drawLen = Math.min(lenPx, maxLen);

    const bobX = pivotX + drawLen * Math.sin(state.theta);
    const bobY = pivotY + drawLen * Math.cos(state.theta);

    // Shift (tavan)
    ctx.fillStyle = p.beam;
    ctx.fillRect(pivotX - 60, pivotY - 12, 120, 12);
    for (let i = -50; i <= 50; i += 14) {
        ctx.strokeStyle = p.beamEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX + i, pivotY - 12);
        ctx.lineTo(pivotX + i - 8, pivotY);
        ctx.stroke();
    }

    // Muvozanat chizig'i
    ctx.strokeStyle = p.guide;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY + drawLen + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tebranish yo'li yoyi (amplituda chegaralari)
    ctx.strokeStyle = p.arc;
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, drawLen, Math.PI / 2 - state.theta0, Math.PI / 2 + state.theta0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Burchak yoyi
    ctx.strokeStyle = p.angle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const arcR = 50;
    const a0 = Math.PI / 2;
    ctx.arc(pivotX, pivotY, arcR, a0, a0 + state.theta, state.theta < 0);
    ctx.stroke();
    ctx.fillStyle = p.angle;
    ctx.font = 'bold 16px Arial';
    ctx.fillText((state.theta * 180 / Math.PI).toFixed(1) + '°', pivotX + 16, pivotY + 40);

    // Ip
    ctx.strokeStyle = p.rod;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Sharcha (bob)
    const grad = ctx.createRadialGradient(bobX - 6, bobY - 6, 2, bobX, bobY, 22);
    grad.addColorStop(0, p.bob1);
    grad.addColorStop(1, p.bob2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bobX, bobY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.bobEdge;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pivot nuqta
    ctx.fillStyle = p.pivot;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ma'lumot matni
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('L = ' + state.L.toFixed(2) + ' m', 20, 40);
    ctx.fillText('g = ' + state.g.toFixed(2) + ' m/s²', 20, 66);
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

function updateStats() {
    const T = theoreticalPeriod();
    document.getElementById('periodValue').textContent = T.toFixed(3) + ' s';
    document.getElementById('frequencyValue').textContent = (1 / T).toFixed(3) + ' Hz';
    document.getElementById('oscValue').textContent = Math.floor(state.oscillations);

    // Davr ikki qo'shni kesishish orasi = T/2 ekanligidan o'lchanadi
    const ct = state.crossTimes;
    if (ct.length >= 2) {
        const measuredT = 2 * (ct[ct.length - 1] - ct[0]) / (ct.length - 1);
        const gMeasured = 4 * Math.PI * Math.PI * state.L / (measuredT * measuredT);
        document.getElementById('measuredG').textContent = gMeasured.toFixed(2) + ' m/s²';
        // Laboratoriya uslubi: nisbiy xatolikni baholash
        const errPct = (gMeasured - state.g) / state.g * 100;
        document.getElementById('gError').textContent = (errPct >= 0 ? '+' : '') + errPct.toFixed(1) + '%';
    }
}

function startPendulum() {
    if (!state.running) {
        state.running = true;
        lastTimestamp = null;
        animationId = requestAnimationFrame(loop);
    }
}

function pausePendulum() {
    state.running = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function resetPendulum() {
    pausePendulum();
    state.theta = state.theta0;
    state.omega = 0;
    state.time = 0;
    state.oscillations = 0;
    state.crossTimes = [];
    document.getElementById('periodValue').textContent = theoreticalPeriod().toFixed(3) + ' s';
    document.getElementById('frequencyValue').textContent = (1 / theoreticalPeriod()).toFixed(3) + ' Hz';
    document.getElementById('oscValue').textContent = '0';
    document.getElementById('measuredG').textContent = '-';
    document.getElementById('gError').textContent = '-';
    draw();
}

resetPendulum();
document.getElementById('angleWarn').hidden = (state.theta0 * 180 / Math.PI) <= 15;

// Rejim almashganda kanvasni qayta chizamiz
window.addEventListener('fizika:theme', function () { if (!state.running) draw(); });

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startPendulum, pause: pausePendulum, reset: resetPendulum };
window.modelIsRunning = function () { return state.running; };
window.labFields = [
    { label: 'L (m)',        get: function () { return state.L.toFixed(2); } },
    { label: 'θ₀ (°)',       get: function () { return Math.round(state.theta0 * 180 / Math.PI); } },
    { label: 'g (m/s²)',     get: function () { return state.g.toFixed(2); } },
    { label: 'T nazariy (s)',get: function () { return theoreticalPeriod().toFixed(3); } },
    { label: 'Tebranish',    get: function () { return Math.floor(state.oscillations); } },
    { label: 'g o\'lch. (m/s²)', get: function () { return labNum('measuredG'); } },
    { label: 'Xatolik (%)',  get: function () { return labNum('gError'); } }
];
