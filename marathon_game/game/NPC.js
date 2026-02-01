import * as THREE from 'three';

export class NPC {
    constructor(scene, startZ, trackWidth) {
        this.scene = scene;
        this.mesh = null;
        this.speed = 5 + Math.random() * 5; // vary speed
        this.trackWidth = trackWidth;

        // Animation parts
        this.parts = {};

        this.init(startZ);
    }

    init(startZ) {
        const group = new THREE.Group();

        // Random color for variety
        const hue = Math.random();
        const mainColor = new THREE.Color().setHSL(hue, 0.8, 0.5);
        const jointColor = new THREE.Color().setHSL(hue, 0.5, 0.3);

        const armorMat = new THREE.MeshStandardMaterial({
            color: mainColor,
            roughness: 0.3,
            metalness: 0.6
        });

        // --- Body ---
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 1.4; // Center of body
        body.castShadow = true;
        group.add(body);
        this.parts.body = body;

        // --- Head ---
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.7, 0); // Relative to body
        body.add(headGroup);

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const head = new THREE.Mesh(headGeo, armorMat);
        headGroup.add(head);

        // Eyes (Simple geometric eyes)
        const eyeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow eyes for NPCs
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.15, 0.05, -0.3); // Facing forward (negative Z)
        head.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.15, 0.05, -0.3);
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
        lArm.pivot.children[0].add(lForeArm.pivot);
        lForeArm.pivot.position.y = -0.6;
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

        // Random start position
        const x = (Math.random() - 0.5) * (this.trackWidth - 4);
        this.mesh.position.set(x, 0, startZ);

        this.scene.add(this.mesh);
    }

    update(delta) {
        this.mesh.position.z -= this.speed * delta;

        this.updateAnimation(delta);
    }

    updateAnimation(delta) {
        // Offset time by speed to desync runners
        const time = Date.now() * 0.01 * this.speed * 0.2 + this.mesh.id;

        // Arms
        this.parts.armL.rotation.x = Math.sin(time) * 0.8;
        this.parts.armR.rotation.x = Math.sin(time + Math.PI) * 0.8;

        // Forearms
        this.parts.foreArmL.rotation.x = Math.abs(Math.sin(time)) * 0.5 - 1;
        this.parts.foreArmR.rotation.x = Math.abs(Math.sin(time + Math.PI)) * 0.5 - 1;

        // Legs
        this.parts.legL.rotation.x = Math.sin(time + Math.PI) * 0.8;
        this.parts.legR.rotation.x = Math.sin(time) * 0.8;

        // Knees (bend when leg is forward)
        this.parts.shinL.rotation.x = Math.max(0, -Math.sin(time + Math.PI)) * 1.5;
        this.parts.shinR.rotation.x = Math.max(0, -Math.sin(time)) * 1.5;

        // Bobbing
        this.parts.body.position.y = 1.4 + Math.abs(Math.sin(time * 2)) * 0.1;
    }
}
