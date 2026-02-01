import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.speed = 10;
        this.maxSpeed = 20;
        this.velocity = new THREE.Vector3();
        this.input = { forward: false, backward: false, left: false, right: false };

        this.distance = 0;

        this.init();
    }

    init() {
        // Simple Robot Character
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(1, 1.5, 0.8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.3, metalness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.5;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.8;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.2, 2.9, 0.45);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.2, 2.9, 0.45);
        group.add(eyeL);
        group.add(eyeR);

        this.mesh = group;
        this.scene.add(this.mesh);

        // Input listeners
        window.addEventListener('keydown', (e) => this.onKey(e, true));
        window.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onKey(e, pressed) {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW': this.input.forward = pressed; break;
            case 'ArrowDown':
            case 'KeyS': this.input.backward = pressed; break;
            case 'ArrowLeft':
            case 'KeyA': this.input.left = pressed; break;
            case 'ArrowRight':
            case 'KeyD': this.input.right = pressed; break;
        }
    }

    update(delta, obstacles, trackWidth, npcs) {
        // Acceleration / Deceleration
        if (this.input.forward) {
            this.speed = Math.min(this.speed + delta * 5, this.maxSpeed);
        } else if (this.input.backward) {
            this.speed = Math.max(this.speed - delta * 10, 0);
        } else {
            // Natural friction
            if (this.speed > 0) this.speed -= delta * 2;
            if (this.speed < 0) this.speed = 0;
        }

        const moveDist = this.speed * delta;

        // Potential new position
        const testPos = this.mesh.position.clone();
        testPos.z -= moveDist;

        // Collision Check (Obstacles)
        if (this.checkCollisions(testPos, obstacles)) {
            this.speed = 2; // Hit obstacle
        }
        // Collision Check (NPCs)
        else if (this.checkCollisions(testPos, npcs)) {
            this.speed = Math.max(this.speed - 5, 2); // Hit NPC
        }
        else {
            this.mesh.position.z = testPos.z;
        }

        // Lateral movement
        const latSpeed = 8 * delta;
        if (this.input.left) {
            this.mesh.position.x -= latSpeed;
        }
        if (this.input.right) {
            this.mesh.position.x += latSpeed;
        }

        // Wall limits
        const limit = trackWidth / 2 - 1;
        if (this.mesh.position.x < -limit) {
            this.mesh.position.x = -limit;
            this.speed *= 0.8; // Wall friction
        }
        if (this.mesh.position.x > limit) {
            this.mesh.position.x = limit;
            this.speed *= 0.8;
        }

        // Camera Follow
        this.camera.position.x = this.mesh.position.x;
        this.camera.position.z = this.mesh.position.z + 8;
        this.camera.position.y = this.mesh.position.y + 4;
        this.camera.lookAt(this.mesh.position.x, this.mesh.position.y + 2, this.mesh.position.z - 10);
    }

    checkCollisions(newPos, objects) {
        if (!objects) return false;
        const playerRadius = 0.6;
        for (const obj of objects) {
            // Support both direct meshes and objects with a mesh property
            const pos = obj.mesh ? obj.mesh.position : obj.position;

            const dx = newPos.x - pos.x;
            const dz = newPos.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < playerRadius + 1) {
                return true;
            }
        }
        return false;
    }
}
