import * as THREE from 'three';
import { Player } from './Player.js';
import { Track } from './Track.js';
import { NPC } from './NPC.js';

export class World {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.player = null;
        this.track = null;
        this.npcs = [];
    }

    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupLights();

        this.track = new Track(this.scene);
        this.player = new Player(this.scene, this.camera);

        this.createNPCs();

        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    createNPCs() {
        // Create a crowd of runners
        for (let i = 0; i < 30; i++) {
            const startZ = -Math.random() * 200; // Start near the player and ahead
            // Also some behind?
            const npc = new NPC(this.scene, startZ, this.track.width);
            this.npcs.push(npc);
        }
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
        // Ground (Grass)
        const geometry = new THREE.PlaneGeometry(1000, 2000); // Widen ground
        const material = new THREE.MeshStandardMaterial({ color: 0x55aa55 }); // Brighter Green
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.z = -500; // Center along track
        ground.position.y = -0.05; // Lower slightly to prevent Z-fighting with track
        this.scene.add(ground);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 50);
        this.scene.add(dirLight);
    }

    update(delta) {
        if (this.player) {
            this.player.update(delta, this.track.obstacles, this.track.width, this.npcs);
        }

        // Update NPCs
        this.npcs.forEach(npc => npc.update(delta));
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
