// Game Configuration
const CONFIG = {
    gameDuration: 60, // seconds
    scrollSpeed: 300, // pixels per second (background)
    obstacleSpeed: 350, // pixels per second - slightly faster
    obstacleSpawnRate: 0.5, // seconds between spawns - High difficulty
    playerSpeed: 400, // pixels per second
};

// Assets
const ASSETS = {
    camel: new Image(),
    pyramid: new Image(),
    loaded: 0,
    total: 2
};

ASSETS.camel.src = 'assets/camel.png';
ASSETS.pyramid.src = 'assets/pyramid.png';
ASSETS.camel.onload = () => checkAssets();
ASSETS.pyramid.onload = () => checkAssets();

function checkAssets() {
    ASSETS.loaded++;
    if (ASSETS.loaded === ASSETS.total) {
        initGame();
    }
}

// Game State
const STATE = {
    screen: 'START', // START, PLAYING, GAME_OVER, WIN
    lastTime: 0,
    timeLeft: CONFIG.gameDuration,
    spawnTimer: 0,
    obstacles: [],
    particles: [], // For destruction effect
    bgOffsetY: 0,
    isMouseDown: false,
    inputX: 0,
    inputY: 0
};

// Player Object
const player = {
    x: 0,
    y: 0,
    width: 50, // slightly smaller hitbox than visual
    height: 60,
    targetX: 0,
    targetY: 0
};

// Audio Context
let audioCtx;
let bgmOscillators = [];
let nextNoteTime = 0;
let noteIndex = 0;
let isMuted = false;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiScreens = {
    start: document.getElementById('start-screen'),
    gameOver: document.getElementById('game-over-screen'),
    win: document.getElementById('win-screen')
};
const timeDisplay = document.getElementById('time-display');

// Initialization
function initGame() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Input Listeners
    setupInputs();

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn-fail').addEventListener('click', startGame);
    document.getElementById('restart-btn-win').addEventListener('click', startGame);

    // Enter Key to Restart
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') {
            if (STATE.screen === 'GAME_OVER' || STATE.screen === 'WIN') {
                startGame();
            }
        }
    });

    // Initial Render
    resetGame();
    draw();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.y = canvas.height - 150;
    player.x = canvas.width / 2;
    player.targetX = player.x;
    player.targetY = player.y;
}

function setupInputs() {
    // Keyboard
    const keys = {};
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    STATE.keys = keys;

    // Mouse / Touch
    canvas.addEventListener('mousedown', (e) => {
        STATE.isMouseDown = true;
        updateInputPos(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (STATE.isMouseDown) updateInputPos(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => STATE.isMouseDown = false);

    canvas.addEventListener('touchstart', (e) => {
        STATE.isMouseDown = true;
        updateInputPos(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
        if (STATE.isMouseDown) {
            e.preventDefault();
            updateInputPos(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });
    window.addEventListener('touchend', () => STATE.isMouseDown = false);
}

function updateInputPos(x, y) {
    player.targetX = x;
    player.targetY = y;
}

function startGame() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume audio context if suspended (browser policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    resetGame();
    STATE.screen = 'PLAYING';
    STATE.lastTime = performance.now();

    hideAllScreens();

    requestAnimationFrame(gameLoop);
    playBGM();
}

function resetGame() {
    STATE.timeLeft = CONFIG.gameDuration;
    STATE.obstacles = [];
    STATE.particles = [];
    STATE.spawnTimer = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
    player.targetX = player.x;
    player.targetY = player.y;
    timeDisplay.textContent = STATE.timeLeft.toFixed(1);

    // Resize hitbox based on image aspect ratio? 
    // Just hardcode a reasonable size for now, slightly smaller than sprite
    player.width = 40;
    player.height = 60;
}

function hideAllScreens() {
    Object.values(uiScreens).forEach(el => el.classList.add('hidden'));
}

function showScreen(screenName) {
    uiScreens[screenName].classList.remove('hidden');
}

function gameLoop(timestamp) {
    if (STATE.screen !== 'PLAYING') return;

    const dt = (timestamp - STATE.lastTime) / 1000;
    STATE.lastTime = timestamp;

    update(dt);
    draw();

    if (STATE.screen === 'PLAYING') {
        requestAnimationFrame(gameLoop);
    }
}

function update(dt) {
    // Timer
    STATE.timeLeft -= dt;
    if (STATE.timeLeft <= 0) {
        STATE.timeLeft = 0;
        winGame();
        return;
    }
    timeDisplay.textContent = Math.ceil(STATE.timeLeft);

    // Update Audio
    updateBGM(audioCtx.currentTime);

    // Movement (Keyboard overrides Mouse if pressed)
    let dx = 0;
    let dy = 0;
    const speed = CONFIG.playerSpeed * dt;

    if (STATE.keys['ArrowLeft']) dx = -speed;
    if (STATE.keys['ArrowRight']) dx = speed;
    if (STATE.keys['ArrowUp']) dy = -speed;
    if (STATE.keys['ArrowDown']) dy = speed;

    if (dx !== 0 || dy !== 0) {
        player.x += dx;
        player.y += dy;
        // Update target to current pos to prevent snapping back to old mouse pos
        player.targetX = player.x;
        player.targetY = player.y;
    } else if (STATE.isMouseDown) {
        // Move towards target (lerp or constant speed)
        const distBeforeX = player.targetX - player.x;
        const distBeforeY = player.targetY - player.y;
        const dist = Math.sqrt(distBeforeX * distBeforeX + distBeforeY * distBeforeY);

        if (dist > 5) {
            const moveAmt = Math.min(dist, speed);
            player.x += (distBeforeX / dist) * moveAmt;
            player.y += (distBeforeY / dist) * moveAmt;
        }
    }

    // Bounds check
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    // Background Scroll (Visual only)
    STATE.bgOffsetY = (STATE.bgOffsetY + CONFIG.scrollSpeed * dt) % 100; // repeating pattern

    // Spawning Obstacles
    STATE.spawnTimer -= dt;
    if (STATE.spawnTimer <= 0) {
        spawnObstacle();
        STATE.spawnTimer = CONFIG.obstacleSpawnRate;
    }

    // Update Obstacles
    for (let i = STATE.obstacles.length - 1; i >= 0; i--) {
        const ob = STATE.obstacles[i];
        ob.y += CONFIG.obstacleSpeed * dt;

        // Collision
        if (checkCollision(player, ob)) {
            gameOver();
            return;
        }

        // Remove if off screen
        if (ob.y > canvas.height + 100) {
            STATE.obstacles.splice(i, 1);
        }
    }

    // Update Particles
    for (let i = STATE.particles.length - 1; i >= 0; i--) {
        const p = STATE.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) STATE.particles.splice(i, 1);
    }
}

function spawnObstacle() {
    const ob = {
        x: Math.random() * (canvas.width - 60) + 30,
        y: -100,
        width: 60,
        height: 60
    };
    STATE.obstacles.push(ob);
}

function checkCollision(p, ob) {
    // Simple AABB box collision
    // Player coordinates are center-based, obstacles are corner-based (simplified above, wait let's fix)

    // Let's standardise: P is center based. OB is currently center based? No, in spawnObstacle I set x/y.
    // Let's treat OB x/y as center too for consistency.

    // Adjust obstacle rendering to center
    return (
        p.x - p.width / 2 < ob.x + ob.width / 2 &&
        p.x + p.width / 2 > ob.x - ob.width / 2 &&
        p.y - p.height / 2 < ob.y + ob.height / 2 &&
        p.y + p.height / 2 > ob.y - ob.height / 2
    );
}

function draw() {
    // Clear
    ctx.fillStyle = '#fceea7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background pattern (scrolling lines or dots)
    ctx.fillStyle = '#e6d690';
    const patternGap = 100;
    const offset = STATE.bgOffsetY;
    for (let y = -patternGap + offset; y < canvas.height; y += patternGap) {
        for (let x = 0; x < canvas.width; x += patternGap) {
            if ((Math.floor(x / patternGap) + Math.floor(y / patternGap)) % 2 === 0) {
                ctx.fillRect(x, y, 10, 10);
                ctx.fillRect(x + 50, y + 50, 5, 5);
            }
        }
    }

    // Draw Obstacles
    for (const ob of STATE.obstacles) {
        if (ASSETS.pyramid.complete) {
            ctx.drawImage(ASSETS.pyramid, ob.x - ob.width / 2, ob.y - ob.height / 2, ob.width, ob.height);
        } else {
            ctx.fillStyle = 'orange';
            ctx.fillRect(ob.x - ob.width / 2, ob.y - ob.height / 2, ob.width, ob.height);
        }
    }

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    // Add a little bounce/wobble
    if (STATE.screen === 'PLAYING') {
        ctx.translate(0, Math.sin(Date.now() / 100) * 3);
    }

    if (ASSETS.camel.complete) {
        // Assume aspect ratio of sprite. Scale to fixed height of 80px?
        // Original images might be small.
        // Let's draw centered.
        const drawW = 60;
        const drawH = 80;
        ctx.drawImage(ASSETS.camel, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        ctx.fillStyle = 'brown';
        ctx.fillRect(-20, -30, 40, 60);
    }

    ctx.restore();

    // Draw Particles
    for (const p of STATE.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
}

function gameOver() {
    STATE.screen = 'GAME_OVER';
    stopBGM();
    playCrashSound();

    // Create particles for destruction effect
    createExplosion(player.x, player.y);

    showScreen('gameOver');
}

function winGame() {
    STATE.screen = 'WIN';
    stopBGM();
    // Play win sound?
    playWinSound();

    showScreen('win');
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        STATE.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 500,
            vy: (Math.random() - 0.5) * 500,
            life: 1.0,
            color: Math.random() > 0.5 ? 'red' : 'yellow',
            size: Math.random() * 5 + 2
        });
    }
}

// --- Audio ---

function playCrashSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playWinSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
    });
}

// Simple Egyptian-style scale (Phrygian Dominant: Root, m2, M3, P4, P5, m6, m7)
// E Phrygian Dominant: E, F, G#, A, B, C, D
const SCALE = [
    196.00, // G3 (low)
    207.65, // G#3 (M3 of E) - slightly weird choice for "key" but let's just pick notes
    220.00, // A3
    233.08, // A#3 
    246.94, // B3
    261.63, // C4
    293.66, // D4
    311.13, // D#4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    415.30, // G#4
];

// Simple sequencer
let sequence = [
    { note: 8, dur: 0.25 }, { note: 9, dur: 0.25 }, { note: 8, dur: 0.5 },
    { note: 6, dur: 0.25 }, { note: 8, dur: 0.25 }, { note: 6, dur: 0.5 },
    { note: 5, dur: 0.25 }, { note: 6, dur: 0.25 }, { note: 5, dur: 0.5 },
    { note: 3, dur: 0.5 }, { note: 4, dur: 0.5 },
];
let currentSeqIndex = 0;
let noteTimer = 0;

function playBGM() {
    // We'll run the sequencer in the update loop instead of scheduling way ahead
    // to allow easy stopping
    nextNoteTime = audioCtx.currentTime;
    currentSeqIndex = 0;
}

function updateBGM(currentTime) {
    if (currentTime >= nextNoteTime) {
        playNote(sequence[currentSeqIndex]);
        nextNoteTime += sequence[currentSeqIndex].dur;
        currentSeqIndex = (currentSeqIndex + 1) % sequence.length;
    }
}

function playNote(noteInfo) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Low drone
    const drone = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    drone.type = 'triangle';
    drone.frequency.value = 82.41; // E2
    droneGain.gain.value = 0.1;
    drone.connect(droneGain);
    droneGain.connect(audioCtx.destination);
    drone.start();
    drone.stop(audioCtx.currentTime + noteInfo.dur);

    // Melody
    osc.type = 'sine';
    // Map index to frequency roughly
    osc.frequency.value = SCALE[noteInfo.note];

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + noteInfo.dur - 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + noteInfo.dur);
}

function stopBGM() {
    // Just stop scheduling
    // Since we create nodes on the fly, they will stop naturally
}
