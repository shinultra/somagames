const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');

// --- Constants ---
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const DURATION_SEC = 120;
const SPAWN_RATE = 60; // Frames

// --- State ---
let gameState = 'start'; // start, playing, gameover
let score = 0;
let frames = 0;
let player = {
    x: SCREEN_WIDTH / 2,
    y: 100,
    width: 40,
    height: 60,
    speed: 5
};
let objects = [];
let keys = {};
let audioCtx;

// --- Audio ---
function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    playBGM();
}

function playBGM() {
    if (!audioCtx) return;

    // Simple sequence player
    const checkInterval = 200; // ms
    let tick = 0;
    const notes = [
        261.63, 0, 329.63, 0, 392.00, 0, 523.25, 0,
        392.00, 329.63, 261.63, 0,
        293.66, 0, 349.23, 0, 440.00, 0, 587.33, 0
    ];

    setInterval(() => {
        if (gameState !== 'playing') return;

        const freq = notes[tick % notes.length];
        if (freq > 0) {
            playTone(freq, 0.1, 0.05, 'triangle');
        }
        tick++;
    }, checkInterval);
}

function playTone(freq, duration, vol, type = 'sine') {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playSound(type) {
    if (type === 'collect') {
        playTone(880, 0.1, 0.2, 'sine'); // High ping
        setTimeout(() => playTone(1100, 0.1, 0.2, 'sine'), 50);
    } else if (type === 'hit') {
        playTone(100, 0.3, 0.5, 'sawtooth'); // Low crash
    } else if (type === 'gameover') {
        playTone(55, 1.0, 0.5, 'square');
    }
}

// --- Game Logic ---
function startGame() {
    initAudio();
    gameState = 'playing';
    startScreen.classList.add('hidden');
    score = 0;
    frames = 0;
    objects = [];
    player.x = SCREEN_WIDTH / 2;
    loop();
}

function spawnObject() {
    const types = ['candy', 'candy', 'umbrella', 'meteor', 'meteor'];
    const type = types[Math.floor(Math.random() * types.length)];

    // x random, y starts below screen
    const obj = {
        type: type,
        x: Math.random() * (SCREEN_WIDTH - 40),
        y: SCREEN_HEIGHT + 20,
        width: 40,
        height: 40,
        active: true
    };
    objects.push(obj);
}

function update() {
    if (gameState !== 'playing') return;

    // Time
    frames++;
    const timeLeft = Math.max(0, DURATION_SEC - Math.floor(frames / 60));
    scoreEl.innerText = `Score: ${score}`;
    timeEl.innerText = `Time: ${timeLeft}`;

    if (timeLeft <= 0) {
        endGame(true);
        return;
    }

    // Player Movement
    if (keys['ArrowLeft']) player.x -= player.speed;
    if (keys['ArrowRight']) player.x += player.speed;

    // Clamp
    if (player.x < 0) player.x = 0;
    if (player.x > SCREEN_WIDTH - player.width) player.x = SCREEN_WIDTH - player.width;

    // Spawning
    if (frames % SPAWN_RATE === 0) {
        spawnObject();
    }

    // Objects Update
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        obj.y -= 3; // Scroll speed

        // Collision
        if (checkCollision(player, obj)) {
            if (obj.type === 'meteor') {
                score -= 100;
                playSound('hit');
            } else {
                score += 100;
                playSound('collect');
            }
            objects.splice(i, 1);

            if (score < 0) {
                endGame(false);
                return;
            }
            continue;
        }

        // Out of bounds
        if (obj.y + obj.height < 0) {
            objects.splice(i, 1);
        }
    }
}

function checkCollision(p, o) {
    return (p.x < o.x + o.width &&
        p.x + p.width > o.x &&
        p.y < o.y + o.height &&
        p.y + p.height > o.y);
}

function endGame(win) {
    gameState = 'gameover';
    finalScoreEl.innerText = win ? `CONGRATULATIONS! Score: ${score}` : `GAME OVER (Score < 0)`;
    gameOverScreen.classList.remove('hidden');
    if (!win) playSound('gameover');
}

// --- Rendering ---
function draw() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Ground approaching visualized (optional)
    const progress = frames / (DURATION_SEC * 60);
    const groundY = SCREEN_HEIGHT * 0.8 + (1 - progress) * (SCREEN_HEIGHT * 10);
    if (groundY < SCREEN_HEIGHT) {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, groundY, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Player
    ctx.save();
    ctx.translate(player.x, player.y);

    // Parachute (Red Arc)
    ctx.beginPath();
    ctx.arc(20, 20, 20, Math.PI, 0);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Lines
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(15, 45);
    ctx.moveTo(40, 20);
    ctx.lineTo(25, 45);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Body
    ctx.fillStyle = 'blue';
    ctx.fillRect(15, 45, 10, 15);

    ctx.restore();

    // Objects
    objects.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);

        if (obj.type === 'candy') {
            ctx.fillStyle = 'hotpink';
            ctx.beginPath();
            ctx.arc(20, 20, 15, 0, Math.PI * 2);
            ctx.fill();
            // Wrapper details
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(15, 15, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (obj.type === 'umbrella') {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(20, 20, 15, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(20, 20);
            ctx.lineTo(20, 35);
            ctx.arc(15, 35, 5, 0, Math.PI); // handle
            ctx.stroke();
        } else if (obj.type === 'meteor') {
            ctx.fillStyle = 'gray';
            ctx.beginPath();
            ctx.arc(20, 20, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(15, 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

function loop() {
    if (gameState === 'start') return;
    update();
    draw();
    if (gameState !== 'start') requestAnimationFrame(loop);
}

// --- Events ---
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

startScreen.addEventListener('click', startGame);

draw(); // Initial draw
