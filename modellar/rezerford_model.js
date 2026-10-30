/* rezerford_model.html sahifasining skripti (avval HTML ichida edi). */
const canvas = document.getElementById('experimentCanvas');
const ctx = canvas.getContext('2d');

let animationId;
let isRunning = false;
let particles = [];
let nucleus = { x: 200 + 50 * 4.5, y: canvas.height / 2, radius: 20 };

let stats = {
    total: 0,
    passed: 0,
    scattered: 0,
    reflected: 0
};

let settings = {
    speed: 1.5e7,
    distance: 50,
    count: 20
};

// Nazariy hisob: E = mv^2/2, r_min = k*q1*q2/E (to'g'ri to'qnashuvda)
function updateTheory() {
    const mAlpha = 6.64e-27;   // alfa zarra massasi, kg
    const e = 1.602e-19;       // elementar zaryad, C
    const kC = 8.99e9;         // Kulon doimiysi
    const E = 0.5 * mAlpha * settings.speed * settings.speed;
    const rMin = kC * 2 * 79 * e * e / E;
    document.getElementById('energyValue').textContent = (E / 1.602e-13).toFixed(1) + ' MeV';
    document.getElementById('rMinValue').textContent = (rMin * 1e15).toFixed(1) + ' fm';
}

document.getElementById('speedSlider').oninput = function() {
    settings.speed = parseFloat(this.value) * 1e7;
    document.getElementById('speedValue').textContent = settings.speed.toExponential(1);
    updateTheory();
};

document.getElementById('distanceSlider').oninput = function() {
    settings.distance = parseInt(this.value);
    document.getElementById('distanceValue').textContent = this.value;
    // Masofa yadro pozitsiyasini belgilaydi: uzoq masofa = yadro o'ngroqda
    nucleus.x = 200 + settings.distance * 4.5;
    resetExperiment();
};

document.getElementById('countSlider').oninput = function() {
    settings.count = parseInt(this.value);
    document.getElementById('countValue').textContent = this.value;
    // Yangi son eski seriya bilan aralashmasligi uchun seriya qaytadan boshlanadi
    // (aks holda pauzadan keyin seriya qolgan bir necha zarra bilan tugardi)
    if (particles.length > 0 || pendingCount > 0) resetExperiment();
};

class AlphaParticle {
    constructor(y) {
        this.x = 50;
        this.y = y;
        // Tezlik slayderiga bog'liq: tez zarra kam og'adi (yadro yonida qisqa vaqt)
        this.vx = (settings.speed / 1e7) * 3.33;
        this.vy = 0;
        this.charge = 2;
        this.mass = 6.64e-27;
        this.trail = [];
        this.status = 'flying'; // flying, passed, scattered, reflected
        this.color = '#ff0000';
    }

    update() {
        if (this.status !== 'flying') return;

        // Kulonning itaruvchi kuchi
        const dx = this.x - nucleus.x;
        const dy = this.y - nucleus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < nucleus.radius + 5) {
            // Deyarli to'g'ridan-to'g'ri to'qnashuv - orqaga qaytadi
            this.vx = -Math.abs(this.vx);
        } else if (distance < 150) {
            const force = 5000 / (distance * distance);
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * force * 0.1;
            this.vy += Math.sin(angle) * force * 0.1;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 30) this.trail.shift();

        // Ekrandan chiqqanda og'ish burchagiga qarab tasniflanadi
        if (this.x > canvas.width || this.x < -10 || this.y < -10 || this.y > canvas.height + 10) {
            const deflection = Math.abs(Math.atan2(this.vy, this.vx)) * 180 / Math.PI;
            if (this.x < 0 || deflection > 90) {
                this.status = 'reflected';
                this.color = '#ff6b6b';
                stats.reflected++;
            } else if (deflection > 10) {
                this.status = 'scattered';
                this.color = '#ffa500';
                stats.scattered++;
            } else {
                this.status = 'passed';
                this.color = '#00ff00';
                stats.passed++;
            }
        }
    }

    draw() {
        ctx.strokeStyle = this.color + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length - 1; i++) {
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
        }
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

let spawnTimers = [];
let pendingCount = 0;

function createParticles(count) {
    const n = count || settings.count;
    const spacing = (canvas.height - 100) / settings.count;
    const offset = settings.count - n;
    pendingCount = n;
    for (let i = 0; i < n; i++) {
        spawnTimers.push(setTimeout(() => {
            particles.push(new AlphaParticle(50 + (offset + i) * spacing));
            stats.total++;
            pendingCount--;
            updateStats();
        }, i * 200));
    }
}

function drawNucleus() {
    const gradient = ctx.createRadialGradient(nucleus.x, nucleus.y, 0, nucleus.x, nucleus.y, nucleus.radius);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(1, '#ff8c00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(nucleus.x, nucleus.y, nucleus.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#ffd70030';
    ctx.lineWidth = 1;
    for (let r = 40; r < 200; r += 20) {
        ctx.beginPath();
        ctx.arc(nucleus.x, nucleus.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+79', nucleus.x, nucleus.y + 5);
}

function drawSource() {
    // Alfa zarra manbasi (radiy) - chap tomonda
    ctx.fillStyle = '#37474f';
    ctx.fillRect(16, 40, 20, canvas.height - 80);
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(36, 40, 6, canvas.height - 80);
    ctx.save();
    ctx.translate(28, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ALFA MANBA (Ra)', 0, 4);
    ctx.restore();
}

// Qat'iy qadam (1/60 s): 120/144 Hz ekranda ham zarralar bir xil tezlikda uchadi
const STEP_MS = 1000 / 60;
let lastTs = null, acc = 0;

function animate(ts) {
    if (ts === undefined) ts = performance.now();
    if (lastTs === null) lastTs = ts - STEP_MS;
    acc += Math.min(ts - lastTs, 100);   // tab almashganda sakrash bo'lmasin
    lastTs = ts;
    let steps = 0;
    while (acc >= STEP_MS && steps < 6) {
        particles.forEach(particle => particle.update());
        acc -= STEP_MS;
        steps++;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNucleus();
    drawSource();
    particles.forEach(particle => particle.draw());
    updateStats();

    // Seriya tugadi: hamma zarra uchirildi va ekrandan chiqdi — siklni to'xtatamiz
    // (aks holda 60 fps da bekorga ishlab turardi, Space esa "pauza" qilardi)
    const seriesDone = pendingCount === 0 && particles.length > 0 &&
                       particles.every(p => p.status !== 'flying');
    if (seriesDone) {
        isRunning = false;
        animationId = null;
        return;
    }
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

function updateStats() {
    document.getElementById('totalParticles').textContent = stats.total;
    document.getElementById('passedParticles').textContent = stats.passed;
    document.getElementById('scatteredParticles').textContent = stats.scattered;
    document.getElementById('reflectedParticles').textContent = stats.reflected;

    // Maxraj — faqat natijasi aniq zarralar (hali uchayotganlar hisobga olinmaydi),
    // aks holda seriya o'rtasida foiz past chiqib, jurnalga noto'g'ri yozilardi
    const doneCount = stats.passed + stats.scattered + stats.reflected;
    const scatterRate = doneCount > 0 ? ((stats.scattered + stats.reflected) / doneCount * 100).toFixed(1) : 0;
    document.getElementById('scatteringRate').textContent = scatterRate + '%';
}

function startExperiment() {
    if (isRunning) return;
    isRunning = true;
    const allDone = pendingCount === 0 && particles.length > 0 &&
                    particles.every(p => p.status !== 'flying');
    if (particles.length === 0 || allDone) {
        // Yangi seriya: oldingi natijalar tozalanadi
        particles = [];
        stats = { total: 0, passed: 0, scattered: 0, reflected: 0 };
        updateStats();
        createParticles();
    } else if (pendingCount > 0) {
        // Pauzadan keyin qolgan zarralarni uchirishni davom ettiramiz
        createParticles(pendingCount);
    }
    lastTs = null; acc = 0;
    animate();
}

function pauseExperiment() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    // Kutayotgan zarra generatorlari ham to'xtaydi, aks holda pauzada
    // statistika o'sib, kanvas qotib qolardi.
    // pendingCount createParticles ichida hisoblanadi — bu yerda
    // qayta hisoblash slayder o'zgarganda noto'g'ri natija berardi
    spawnTimers.forEach(clearTimeout);
    spawnTimers = [];
    pendingCount = Math.max(0, pendingCount);
}

function resetExperiment() {
    pauseExperiment();
    spawnTimers.forEach(clearTimeout);
    spawnTimers = [];
    pendingCount = 0;
    particles = [];
    stats = { total: 0, passed: 0, scattered: 0, reflected: 0 };
    updateStats();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNucleus();
    drawSource();
}

// Boshlang'ich holat
resetExperiment();
updateTheory();

// ===== Umumiy vositalar uchun interfeys (model-tools.js) =====
window.modelControls = { start: startExperiment, pause: pauseExperiment, reset: resetExperiment };
window.modelIsRunning = function () { return isRunning; };
window.labFields = [
    { label: "v (×10⁷ m/s)", get: function () { return (settings.speed/1e7).toFixed(1); } },
    { label: "E (MeV)", get: function () { return labNum('energyValue'); } },
    { label: "r_min (fm)", get: function () { return labNum('rMinValue'); } },
    { label: "Umumiy", get: function () { return stats.total; } },
    { label: "O'tgan", get: function () { return stats.passed; } },
    { label: "Sochilgan", get: function () { return stats.scattered; } },
    { label: "Qaytgan", get: function () { return stats.reflected; } },
    { label: "Sochilish (%)", get: function () { return labNum('scatteringRate'); } }
];
