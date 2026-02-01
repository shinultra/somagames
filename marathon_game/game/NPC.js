import * as THREE from 'three';

export class NPC {
    constructor(scene, startZ, trackWidth) {
        this.scene = scene;
        this.mesh = null;
        this.speed = 5 + Math.random() * 5; // vary speed
        this.trackWidth = trackWidth;

        this.init(startZ);
    }

    init(startZ) {
        const group = new THREE.Group();

        // Simple humanoid shape
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.5);
        // Random color for variety
        const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.4;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.3);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 2.4;
        group.add(head);

        this.mesh = group;

        // Random start position
        const x = (Math.random() - 0.5) * (this.trackWidth - 4);
        this.mesh.position.set(x, 0, startZ);

        this.scene.add(this.mesh);
    }

    update(delta) {
        this.mesh.position.z -= this.speed * delta;

        // Simple bobbing animation
        this.mesh.position.y = 0.2 * Math.sin(Date.now() * 0.01 * this.speed);
    }
}
