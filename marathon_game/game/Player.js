import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.speed = 0;
        this.maxSpeed = 15; // Reduced from 20
        this.velocity = new THREE.Vector3();
        this.input = { forward: false, backward: false, left: false, right: false };

        // Animation parts
        this.parts = {};

        this.init();
    }

    init() {
        const group = new THREE.Group();

        // Materials
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0, // Silver
            roughness: 0.3,
            metalness: 0.9
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.5
        });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        // --- Body ---
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 1.4;
        body.castShadow = true;
        group.add(body);
        this.parts.body = body;

        // Chest Panel
        const chestGeo = new THREE.BoxGeometry(0.6, 0.5, 0.1);
        const chest = new THREE.Mesh(chestGeo, darkMat);
        chest.position.set(0, 0.2, 0.25);
        body.add(chest);

        // Backpack (Battery)
        const packGeo = new THREE.BoxGeometry(0.6, 0.8, 0.2);
        const pack = new THREE.Mesh(packGeo, darkMat);
        pack.position.set(0, 0, -0.35);
        body.add(pack);

        // --- Head ---
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.7, 0);
        body.add(headGroup);

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const head = new THREE.Mesh(headGeo, armorMat);
        headGroup.add(head);

        // Antenna
        const antStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        const antStem = new THREE.Mesh(antStemGeo, darkMat);
        antStem.position.set(0, 0.45, 0);
        head.add(antStem);
        const antBulbGeo = new THREE.SphereGeometry(0.05);
        const antBulb = new THREE.Mesh(antBulbGeo, glowMat);
        antBulb.position.set(0, 0.15, 0);
        antStem.add(antBulb);

        // Ear Bolts
        const earGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7);
        const ear = new THREE.Mesh(earGeo, darkMat);
        ear.rotation.z = Math.PI / 2;
        head.add(ear);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
        const eyeL = new THREE.Mesh(eyeGeo, glowMat);
        eyeL.position.set(-0.15, 0.05, -0.31); // Face negative Z
        head.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, glowMat);
        eyeR.position.set(0.15, 0.05, -0.31);
        head.add(eyeR);

        // --- Limbs Helper ---
        const createLimb = (w, h, d, x, y, z, mat) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(0, -h / 2, 0); // Pivot at top
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            pivot.add(mesh);
            return { pivot, mesh };
        };

        // --- Arms ---
        // Left Arm
        const lArm = createLimb(0.25, 0.6, 0.25, -0.55, 0.5, 0, armorMat);
        body.add(lArm.pivot);
        const lForeArm = createLimb(0.2, 0.6, 0.2, 0, -0.6, 0, armorMat);
        lArm.pivot.children[0].add(lForeArm.pivot); // Attach to mesh bottom
        lForeArm.pivot.position.y = -0.6; // fix pos
        this.parts.armL = lArm.pivot;
        this.parts.foreArmL = lForeArm.pivot;

        // Right Arm
        const rArm = createLimb(0.25, 0.6, 0.25, 0.55, 0.5, 0, armorMat);
        body.add(rArm.pivot);
        const rForeArm = createLimb(0.2, 0.6, 0.2, 0, -0.6, 0, armorMat);
        rArm.pivot.children[0].add(rForeArm.pivot);
        rForeArm.pivot.position.y = -0.6;
        this.parts.armR = rArm.pivot;
        this.parts.foreArmR = rForeArm.pivot;

        // --- Legs ---
        // Left Leg
        const lLeg = createLimb(0.3, 0.7, 0.3, -0.25, -0.6, 0, armorMat);
        body.add(lLeg.pivot);
        const lShin = createLimb(0.25, 0.7, 0.25, 0, -0.7, 0, armorMat);
        lLeg.pivot.children[0].add(lShin.pivot);
        lShin.pivot.position.y = -0.7;
        this.parts.legL = lLeg.pivot;
        this.parts.shinL = lShin.pivot;

        // Right Leg
        const rLeg = createLimb(0.3, 0.7, 0.3, 0.25, -0.6, 0, armorMat);
        body.add(rLeg.pivot);
        const rShin = createLimb(0.25, 0.7, 0.25, 0, -0.7, 0, armorMat);
        rLeg.pivot.children[0].add(rShin.pivot);
        rShin.pivot.position.y = -0.7;
        this.parts.legR = rLeg.pivot;
        this.parts.shinR = rShin.pivot;

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

    update(delta, obstacles, trackWidth, npcs, trackRef) {
        // Acceleration / Deceleration
        if (this.input.forward) {
            this.speed = Math.min(this.speed + delta * 15, this.maxSpeed);
        } else if (this.input.backward) {
            this.speed = Math.max(this.speed - delta * 20, 0);
        } else {
            // Natural friction
            if (this.speed > 0) this.speed -= delta * 5;
            if (this.speed < 0) this.speed = 0;
        }

        // Move along Z
        let z = this.mesh.position.z - this.speed * delta;

        // Lateral movement (Relative to track center)
        const latSpeed = 8 * delta;
        // Store lateral offset in a separate property if possible, 
        // but current x is absolute. We need to maintain "offset from center".
        // Let's deduce current offset from current X and track X.
        // Actually, cleaner to store `lateralOffset`.
        if (this.lateralOffset === undefined) this.lateralOffset = 0;

        if (this.input.left) {
            this.lateralOffset -= latSpeed;
            this.parts.body.rotation.z = 0.1;
        } else if (this.input.right) {
            this.lateralOffset += latSpeed;
            this.parts.body.rotation.z = -0.1;
        } else {
            this.parts.body.rotation.z = 0;
        }

        // Wall limits
        const limit = trackWidth / 2 - 1;
        if (this.lateralOffset < -limit) {
            this.lateralOffset = -limit;
            this.speed *= 0.8;
        }
        if (this.lateralOffset > limit) {
            this.lateralOffset = limit;
            this.speed *= 0.8;
        }

        // Calculate new World Position
        const trackState = trackRef.getTrackState(z);
        const newPos = new THREE.Vector3(
            trackState.x + this.lateralOffset,
            trackState.y,
            z
        );

        // Collision Check (Obstacles)
        if (this.checkCollisions(newPos, obstacles)) {
            this.speed = 2;
        }
        // Collision Check (NPCs)
        else if (this.checkCollisions(newPos, npcs)) {
            this.speed = Math.max(this.speed - 5, 2);
        }
        else {
            this.mesh.position.copy(newPos);
            // Rotate to face track direction
            this.mesh.rotation.y = trackState.angleY;
        }

        // --- Animation ---
        this.updateAnimation(delta);

        // Camera Follow
        // Smoothen camera
        const camTargetX = this.mesh.position.x * 0.8;
        const camTargetY = this.mesh.position.y + 4;
        const camTargetZ = this.mesh.position.z + 8;

        this.camera.position.x += (camTargetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (camTargetY - this.camera.position.y) * 0.1;
        this.camera.position.z = camTargetZ; // Hard lock Z to keep up

        // Look ahead
        const lookZ = this.mesh.position.z - 10;
        const lookState = trackRef.getTrackState(lookZ);
        this.camera.lookAt(lookState.x, lookState.y + 2, lookZ);
    }

    updateAnimation(delta) {
        if (this.speed < 0.1) {
            // Idle Pose
            this.parts.armL.rotation.x = THREE.MathUtils.lerp(this.parts.armL.rotation.x, 0, delta * 10);
            this.parts.armR.rotation.x = THREE.MathUtils.lerp(this.parts.armR.rotation.x, 0, delta * 10);
            this.parts.legL.rotation.x = THREE.MathUtils.lerp(this.parts.legL.rotation.x, 0, delta * 10);
            this.parts.legR.rotation.x = THREE.MathUtils.lerp(this.parts.legR.rotation.x, 0, delta * 10);
            return;
        }

        const time = Date.now() * 0.01 * this.speed * 0.2;

        // Arms
        this.parts.armL.rotation.x = Math.sin(time) * 0.8;
        this.parts.armR.rotation.x = Math.sin(time + Math.PI) * 0.8;

        // Forearms (bent slightly)
        this.parts.foreArmL.rotation.x = Math.abs(Math.sin(time)) * 0.5 - 1;
        this.parts.foreArmR.rotation.x = Math.abs(Math.sin(time + Math.PI)) * 0.5 - 1;

        // Legs
        this.parts.legL.rotation.x = Math.sin(time + Math.PI) * 0.8;
        this.parts.legR.rotation.x = Math.sin(time) * 0.8;

        // Knees (bend when leg is moving forward)
        // Use negative sin to match the forward swing (negative rotation)
        this.parts.shinL.rotation.x = Math.max(0, -Math.sin(time + Math.PI)) * 1.5;
        this.parts.shinR.rotation.x = Math.max(0, -Math.sin(time)) * 1.5;

        // Bobbing
        this.parts.body.position.y = 1.4 + Math.abs(Math.sin(time * 2)) * 0.1;
    }

    checkCollisions(newPos, objects) {
        if (!objects) return false;
        const playerRadius = 0.6;
        for (const obj of objects) {
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
