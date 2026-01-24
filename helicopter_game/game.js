const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const PLAYER_SPEED = 5;
const SCROLL_SPEED = 3;
const GAME_DURATION = 90; // seconds

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let lastTime = 0;
let score = 0;
let timeRemaining = GAME_DURATION;
let gameTimer = null;
let bgOffsetY = 0;

// Assets
const assets = {
    helicopter: new Image(),
    tree: new Image(),
    rock: new Image(),
    bg: new Image()
};

let assetsLoaded = 0;
const totalAssets = 4;

function checkAssetLoad() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        // Assets ready
        console.log("Assets loaded");
    }
}

assets.helicopter.onload = checkAssetLoad;
assets.helicopter.src = 'helicopter.png';

assets.tree.onload = checkAssetLoad;
assets.tree.src = 'tree.png';

assets.rock.onload = checkAssetLoad;
assets.rock.src = 'rock.png';

assets.bg.onload = checkAssetLoad;
assets.bg.src = 'bg.png';

// Input Handling
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Entities
const player = {
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 150,
    width: 60,
    height: 60,
    speed: PLAYER_SPEED,
    invulnerable: false,
    invulnerableTimer: 0
};

let obstacles = []; // Trees and Rocks mixed? Or separate layers?
// We want trees to be separate perhaps, or just generic "Entity" list.
// Let's keep separate lists for specific logic.
let trees = [];
let rockRows = []; // Pairs of rocks

// DOM Elements
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const gameOverTitle = document.getElementById('game-over-title');

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    timeRemaining = GAME_DURATION;
    scoreEl.textContent = score;
    timeEl.textContent = timeRemaining;

    // Reset Entity Positions
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    player.y = CANVAS_HEIGHT - 150;

    trees = [];
    rockRows = [];

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');

    // Start Timer
    if (gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        if (gameState !== 'PLAYING') return;
        timeRemaining--;
        timeEl.textContent = timeRemaining;
        if (timeRemaining <= 0) {
            endGame(true); // Time's up
        }
    }, 1000);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame(isTimeUp) {
    gameState = 'GAMEOVER';
    clearInterval(gameTimer);
    finalScoreEl.textContent = score;
    if (isTimeUp) {
        gameOverTitle.textContent = "MISSION COMPLETE";
        gameOverTitle.style.color = "#00ffff"; // Blue for success/time up
    } else {
        gameOverTitle.textContent = "CRITICAL FAILURE";
        gameOverTitle.style.color = "#ff3333"; // Red for crash
    }
    gameOverScreen.classList.add('active');
}

function spawnObstacles() {
    // Spawn Tree (Random)
    if (Math.random() < 0.02) {
        const treeX = Math.random() * (CANVAS_WIDTH - 60);
        trees.push({
            x: treeX,
            y: -70,
            width: 60,
            height: 60
        });
    }

    // Spawn Rock Row (Less frequent)
    if (Math.random() < 0.008) { // 0.8% chance per frame
        const rockSize = 70;
        const minGap = 120; // Enough for player (60px) + margin
        const maxGap = 200;
        const gapWidth = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;

        // Gap position (x-coordinate of the left edge of the gap)
        // Ensure gap is within screen bounds
        const minGapX = 50;
        const maxGapX = CANVAS_WIDTH - gapWidth - 50;
        const gapX = Math.floor(Math.random() * (maxGapX - minGapX + 1)) + minGapX;

        // We create two rocks: Left of gap, Right of gap.
        // Left rock: from 0 to gapX.
        // Right rock: from gapX + gapWidth to CANVAS_WIDTH.
        // But we want them to look like objects, not solid walls.
        // So we just place two specific rock objects that "create" the gap visually?
        // No, user said "Rock and Rock narrow gap". 
        // Let's create two rocks that ARE the boundaries. Assumes rocks can be wide? 
        // Our rock asset is round. 
        // Let's cheat: We place two rocks, one at gapX - rockSize, one at gapX + gapWidth.
        // The space between them is the gap. 
        // The rest of the screen is open? 
        // Or "Rock WALL with a gap"?
        // "Rock and rock narrow gap... pass through +100".
        // Usually interpretted as a "Gate". Two rocks forming a gate.

        rockRows.push({
            y: -100,
            passed: false,
            leftRock: { x: gapX - rockSize, width: rockSize, height: rockSize, collided: false },
            rightRock: { x: gapX + gapWidth, width: rockSize, height: rockSize, collided: false },
            gapZone: { x: gapX, width: gapWidth } // Used for scoring
        });
    }
}

function update(deltaTime) {
    // Move Player
    if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y < CANVAS_HEIGHT - player.height) player.y += player.speed;
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < CANVAS_WIDTH - player.width) player.x += player.speed;

    // Scroll Background
    bgOffsetY += SCROLL_SPEED;
    if (bgOffsetY >= CANVAS_HEIGHT) bgOffsetY = 0;

    // Move Trees
    for (let i = trees.length - 1; i >= 0; i--) {
        trees[i].y += SCROLL_SPEED;
        // Collision
        if (checkCollision(player, trees[i])) {
            endGame(false); // Crash
            return;
        }
        // Remove if off screen
        if (trees[i].y > CANVAS_HEIGHT) {
            trees.splice(i, 1);
        }
    }

    // Move Rock Rows
    for (let i = rockRows.length - 1; i >= 0; i--) {
        const row = rockRows[i];
        row.y += SCROLL_SPEED;

        // Check Collision with Left Rock
        const leftRockAbs = {
            x: row.leftRock.x,
            y: row.y,
            width: row.leftRock.width,
            height: row.leftRock.height
        };
        if (!row.leftRock.collided && checkCollision(player, leftRockAbs)) {
            score -= 100;
            scoreEl.textContent = score;
            row.leftRock.collided = true; // Only hit once
            triggerHitFeedback('ROCK HIT! -100');
        }

        // Check Collision with Right Rock
        const rightRockAbs = {
            x: row.rightRock.x,
            y: row.y,
            width: row.rightRock.width,
            height: row.rightRock.height
        };
        if (!row.rightRock.collided && checkCollision(player, rightRockAbs)) {
            score -= 100;
            scoreEl.textContent = score;
            row.rightRock.collided = true; // Only hit once
            triggerHitFeedback('ROCK HIT! -100');
        }

        // Check Gap Passing
        // If player is roughly at the same Y level as the center of rocks
        // and is strictly within the gap X
        const rowCenterY = row.y + row.leftRock.height / 2;
        const playerCenterY = player.y + player.height / 2;

        // We trigger pass when the row passes BELOW the player's center?
        // Or when player crosses the line.
        // Let's use a "Sensor" line.
        // If player passed the row Y, AND wasn't collided, AND passes check.

        // Simpler: If row.y > player.y + player.height (row has passed player completely)
        // And !row.passed
        // And player center X was within gap?
        // Wait, player moves too, so simple check is:
        // Detect overlap with the "Gap Zone" rectangle.
        const gapRect = {
            x: row.gapZone.x,
            y: row.y,
            width: row.gapZone.width,
            height: row.leftRock.height // Same height as rocks
        };

        // But "Passing through" implies going all the way.
        // If we just check overlap, we might trigger it while hitting a rock if we are sloppy.
        // Requirement: "Well passed through gap -> 100pts".
        // Let's award points if player center Y crosses the row center Y while inside the gap X range.

        if (!row.passed && playerCenterY > row.y && playerCenterY < row.y + row.leftRock.height) {
            // Player is inside the horizontal band of the rocks
            const playerCenterX = player.x + player.width / 2;
            if (playerCenterX > row.gapZone.x && playerCenterX < row.gapZone.x + row.gapZone.width) {
                // Player is in gap
                // Wait until they leave the band or just trigger once?
                // Let's trigger once.
                row.passed = true;
                score += 100;
                scoreEl.textContent = score;
                triggerHitFeedback('GAP PASSED! +100', '#00ffff');
            }
        }

        // Remove if off screen
        if (row.y > CANVAS_HEIGHT) {
            rockRows.splice(i, 1);
        }
    }

    spawnObstacles();
}

function checkCollision(rect1, rect2) {
    // Simple AABB
    // Shrink hitboxes slightly for forgiveness
    const padding = 10;
    return (
        rect1.x + padding < rect2.x + rect2.width - padding &&
        rect1.x + rect1.width - padding > rect2.x + padding &&
        rect1.y + padding < rect2.y + rect2.height - padding &&
        rect1.y + rect1.height - padding > rect2.y + padding
    );
}

function triggerHitFeedback(text, color = '#ff3333') {
    // Small text popup could be added here, but for now we just flash score?
    // Let's just create a floating text element briefly
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.left = (player.x + 20) + 'px';
    el.style.top = (player.y - 20) + 'px';
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.fontSize = '20px';
    el.style.textShadow = '0 0 5px black';
    el.style.pointerEvents = 'none';
    el.style.transition = 'opacity 1s, transform 1s';
    document.getElementById('game-container').appendChild(el);

    // Animate
    requestAnimationFrame(() => {
        el.style.transform = 'translateY(-50px)';
        el.style.opacity = '0';
    });

    setTimeout(() => {
        el.remove();
    }, 1000);
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Background
    // Tiled background scrolling
    // We draw two images to loop
    // -CANVAS_HEIGHT + bgOffsetY  AND bgOffsetY
    // Actually our bg image might be small. Assuming 512x512 ish from generation?
    // Let's draw pattern.
    if (assets.bg.complete) {
        const ptrn = ctx.createPattern(assets.bg, 'repeat');
        ctx.fillStyle = ptrn;

        // We need to translate matrix to scroll pattern
        ctx.save();
        ctx.translate(0, bgOffsetY);
        ctx.fillRect(0, -bgOffsetY, CANVAS_WIDTH, CANVAS_HEIGHT + bgOffsetY);
        // Logic check: Pattern repeats automatically?
        // If we fillRect a huge area, it repeats.
        // We just need to offset the fillRect start or translate.
        // Easiest: Translate context, fill huge rect covering everything.
        // But fillRect is in world space.

        // Better:
        ctx.translate(0, -bgOffsetY); // Undo the previous translate idea
        // Reset
    }

    // Fallback simple scrolling drawing manually
    const bgH = CANVAS_HEIGHT; // Assuming we stretch it or it is big enough
    ctx.drawImage(assets.bg, 0, bgOffsetY - bgH, CANVAS_WIDTH, bgH);
    ctx.drawImage(assets.bg, 0, bgOffsetY, CANVAS_WIDTH, bgH);


    // Draw Trees
    for (const tree of trees) {
        ctx.drawImage(assets.tree, tree.x, tree.y, tree.width, tree.height);
        // Debug hitbox
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(tree.x, tree.y, tree.width, tree.height);
    }

    // Draw Rock Rows
    for (const row of rockRows) {
        // Left Rock
        ctx.drawImage(assets.rock, row.leftRock.x, row.y, row.leftRock.width, row.leftRock.height);
        // Right Rock
        ctx.drawImage(assets.rock, row.rightRock.x, row.y, row.rightRock.width, row.rightRock.height);

        // Debug Gap
        // ctx.strokeStyle = 'green';
        // ctx.strokeRect(row.gapZone.x, row.y, row.gapZone.width, row.leftRock.height);
    }

    // Draw Player
    ctx.drawImage(assets.helicopter, player.x, player.y, player.width, player.height);
}

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Initial Draw (Menu Background)
assets.bg.onload = () => {
    ctx.drawImage(assets.bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Audio System
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgmOscs = [];
        this.bgmGain = null;
        this.isPlaying = false;
    }

    startBGM() {
        if (this.isPlaying) return;
        this.ctx.resume();
        this.isPlaying = true;

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.4;
        this.bgmGain.connect(this.ctx.destination);

        // 1. Dissonant Drone Layer
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 55;

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = 59; // Faster 4Hz beat

        // Filter for drone
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.bgmGain);

        // 2. High-Tension "Radar" Pulse Layer
        const radarOsc = this.ctx.createOscillator();
        radarOsc.type = 'sine';
        radarOsc.frequency.value = 1200; // High pitch

        const radarGain = this.ctx.createGain();
        radarGain.gain.value = 0; // Starts silent, modulated by LFO

        // LFO for Radar (Fast beeping)
        const lfo = this.ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 6; // 6 pulses per second

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.05; // Volume of the beep

        // Connect LFO to Radar Gain
        // We need to map LFO (-1 to 1) to Gain (0 to 0.05)
        // Standard LFO connection to AudioParam adds the value.
        // If we connect Square LFO (-1/1) to Gain (base 0), we get -1 and 1. Negative gain is valid (phase inv) but we want simple on/off.
        // Let's use a simpler approach: Connect LFO to a Gain that connects to the radarGain's gain? No.
        // Let's just use the custom pulse logic or a simple connection implies:
        // base value + lfo value.
        // Set radarGain base to 0.05.
        // LFO connects to radarGain.gain.
        // Actually, let's keep it simple: Sawtooth modulation on filter cutoff is easier for tension.

        // Let's go with a fast "Helicopter Rotor" like thumping sound + The High Radar.
        // Rotor Sound: White Noise -> Lowpass Filter modulated by LFO.
        const noiseBufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 100;

        const rotorLFO = this.ctx.createOscillator();
        rotorLFO.type = 'sawtooth';
        rotorLFO.frequency.value = 12; // Fast rotor speed

        const rotorLFOGain = this.ctx.createGain();
        rotorLFOGain.gain.value = 300; // Filter modulation

        rotorLFO.connect(rotorLFOGain);
        rotorLFOGain.connect(noiseFilter.frequency);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.6;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.bgmGain);

        osc1.start();
        osc2.start();
        noise.start();
        rotorLFO.start();

        this.bgmOscs = [osc1, osc2, noise, rotorLFO];
    }

    stopBGM() {
        if (!this.isPlaying) return;
        this.bgmOscs.forEach(o => o.stop());
        this.bgmOscs = [];
        this.isPlaying = false;
    }

    playCrash() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        // Noise burst for impact
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        osc.start();
        noise.start();
        osc.stop(this.ctx.currentTime + 0.5);
        noise.stop(this.ctx.currentTime + 0.5);
    }

    playScore() {
        // High-tech ding
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1); // A6

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}

const soundManager = new SoundManager();

// Hook into game events
const originalStartGame = startGame;
startGame = function () {
    soundManager.startBGM();
    originalStartGame();
}

const originalEndGame = endGame;
endGame = function (isTimeUp) {
    soundManager.stopBGM();
    if (!isTimeUp) soundManager.playCrash(); // Play crash on failure
    originalEndGame(isTimeUp);
}

const originalTriggerHit = triggerHitFeedback;
triggerHitFeedback = function (text, color) {
    if (color === '#ff3333') soundManager.playCrash(); // Penalty
    else soundManager.playScore(); // Score
    originalTriggerHit(text, color);
}
