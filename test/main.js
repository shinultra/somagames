import * as THREE from 'three';

// --- Global Variables ---
let scene, camera, renderer;
let penguin;
let enemies = [];
let keys = {};
let isGameOver = false;

// Physics
let velocityY = 0;
let isJumping = false;
const GRAVITY = -0.5;
const JUMP_FORCE = 0.8;
const SPEED = 0.2;

// --- Audio ---
let audioCtx;
let bgmOscillator;
let bgmGain;

function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Simple BGM (LFO modulating a chord helper)
    // Just a simple looping beep sequence or drone for "loose" feel
    playBGM();
}

function playBGM() {
    if (!audioCtx) return;

    // Drone
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220; // A3
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.1;
    osc.start();

    // Melody loop (loose random)
    setInterval(() => {
        if (isGameOver) return;
        const note = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        note.type = 'sine';
        // Pentatonic ish random
        const freqs = [261.63, 293.66, 329.63, 392.00, 440.00];
        note.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
        note.connect(g);
        g.connect(audioCtx.destination);

        g.gain.setValueAtTime(0.05, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        note.start();
        note.stop(audioCtx.currentTime + 0.5);
    }, 1000);
}

function playCrashSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('app').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    scene.add(dirLight);

    // Ground (Ice)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xE0FFFF }); // Light Cyan
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create Characters
    createPenguin();

    // Create Enemies
    for (let i = 0; i < 8; i++) {
        spawnEnemy();
    }

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        initAudio(); // Start audio on first interaction
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // Start Loop
    animate();
}

function createPenguin() {
    penguin = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.8, 1.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Black
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1;
    body.castShadow = true;
    penguin.add(body);

    // Belly (White)
    const bellyGeo = new THREE.CapsuleGeometry(0.7, 1.2, 4, 8);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.9, 0.25);
    penguin.add(belly);

    // Beak (Orange)
    const beakGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.6, 0.6);
    penguin.add(beak);

    // Eyes (Black)
    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.3, 1.7, 0.5);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.3, 1.7, 0.5);
    penguin.add(leftEye);
    penguin.add(rightEye);

    scene.add(penguin);
}

function spawnEnemy() {
    const bear = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(1, 1.8, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFFAFA }); // Snow white
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    bear.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.7, 8, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 2.0, 0.5);
    bear.add(head);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.25, 4, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(-0.5, 2.5, 0.5);
    const rightEar = new THREE.Mesh(earGeo, bodyMat);
    rightEar.position.set(0.5, 2.5, 0.5);
    bear.add(leftEar);
    bear.add(rightEar);

    // Random Position relative to center
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 20;
    bear.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

    // Custom properties for logic
    bear.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            0,
            (Math.random() - 0.5) * 0.1
        ),
        changeDirTimer: 0
    };

    scene.add(bear);
    enemies.push(bear);
}

function updateEnemies() {
    enemies.forEach(bear => {
        // Move
        bear.position.add(bear.userData.velocity);

        // Random direction change
        bear.userData.changeDirTimer++;
        if (bear.userData.changeDirTimer > 100) {
            bear.userData.velocity.set(
                (Math.random() - 0.5) * 0.1,
                0,
                (Math.random() - 0.5) * 0.1
            );
            bear.userData.changeDirTimer = 0;
        }

        // Bounds check (bounce back usually or just wrap, let's bounce)
        if (bear.position.length() > 40) {
            bear.userData.velocity.multiplyScalar(-1);
        }

        // Look at movement direction
        const target = bear.position.clone().add(bear.userData.velocity);
        bear.lookAt(target.x, bear.position.y, target.z);
    });
}

function checkCollisions() {
    const penguinBox = new THREE.Box3().setFromObject(penguin);
    // Shrink box slightly for forgiveness
    penguinBox.expandByScalar(-0.2);

    for (let bear of enemies) {
        const bearBox = new THREE.Box3().setFromObject(bear);
        bearBox.expandByScalar(-0.2);

        if (penguinBox.intersectsBox(bearBox)) {
            gameOver();
        }
    }
}

function gameOver() {
    isGameOver = true;
    playCrashSound();
    if (audioCtx) audioCtx.close();
    document.getElementById('game-over').classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (isGameOver) return;

    // Movement
    let moved = false;
    if (keys['ArrowUp']) { penguin.position.z -= SPEED; moved = true; }
    if (keys['ArrowDown']) { penguin.position.z += SPEED; moved = true; }
    if (keys['ArrowLeft']) { penguin.position.x -= SPEED; moved = true; }
    if (keys['ArrowRight']) { penguin.position.x += SPEED; moved = true; }

    if (moved) {
        // Basic rotation to face direction could be added here, but prompt didn't strictly ask
    }

    // Jump
    if (keys['Space'] && !isJumping) {
        velocityY = JUMP_FORCE;
        isJumping = true;
    }

    // Physics Application
    penguin.position.y += velocityY;

    // Ground Collision
    if (penguin.position.y > 0) {
        velocityY += GRAVITY * 0.05; // Apply gravity
    } else {
        penguin.position.y = 0;
        velocityY = 0;
        isJumping = false;
    }

    updateEnemies();
    checkCollisions();

    // Camera Follow
    const targetCamPos = new THREE.Vector3(penguin.position.x, 5, penguin.position.z + 10);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(penguin.position.x, 1, penguin.position.z);

    renderer.render(scene, camera);
}

init();
