import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.length = 1000;
        this.width = 20;
        this.obstacles = [];
        this.walls = [];

        this.init();
    }

    init() {
        // Track Floor
        const geo = new THREE.PlaneGeometry(this.width, this.length);
        const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const track = new THREE.Mesh(geo, mat);
        track.rotation.x = -Math.PI / 2;
        track.position.z = -this.length / 2;
        this.scene.add(track);

        // Side Walls
        const wallGeo = new THREE.BoxGeometry(1, 2, this.length);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x880000 });

        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(-this.width / 2 - 0.5, 1, -this.length / 2);
        this.scene.add(leftWall);
        this.walls.push(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(this.width / 2 + 0.5, 1, -this.length / 2);
        this.scene.add(rightWall);
        this.walls.push(rightWall);

        // Finish Line
        this.createFinishLine();

        // Random Obstacles
        this.createObstacles();

        // Scenery (Trees & Mountains)
        this.createScenery();
    }

    createScenery() {
        // Trees
        const treeTrunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const treeLeavesGeo = new THREE.ConeGeometry(2, 4, 8);
        const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

        for (let i = 0; i < 200; i++) {
            const z = -Math.random() * this.length;
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (this.width / 2 + 5 + Math.random() * 50);

            const group = new THREE.Group();

            const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
            trunk.position.y = 1;
            group.add(trunk);

            const leaves = new THREE.Mesh(treeLeavesGeo, treeLeavesMat);
            leaves.position.y = 3;
            group.add(leaves);

            group.position.set(x, 0, z);
            this.scene.add(group);
        }

        // Mountains
        const mountainGeo = new THREE.ConeGeometry(40, 60, 4);
        const mountainMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0 });

        for (let i = 0; i < 20; i++) {
            const z = -Math.random() * (this.length * 1.5) + this.length * 0.2;
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (this.width + 50 + Math.random() * 100);

            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(x, 0, z);
            // Randomize shape slightly
            mountain.scale.set(1 + Math.random(), 1 + Math.random() * 0.5, 1 + Math.random());
            this.scene.add(mountain);
        }
    }

    createFinishLine() {
        const geo = new THREE.BoxGeometry(this.width, 0.1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Checkered pattern would be better but keeping it simple
        const line = new THREE.Mesh(geo, mat);
        line.position.set(0, 0.05, -this.length);
        this.scene.add(line);

        // Arch
        const poleGeo = new THREE.BoxGeometry(1, 10, 1);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });

        const poleL = new THREE.Mesh(poleGeo, poleMat);
        poleL.position.set(-this.width / 2, 5, -this.length);
        this.scene.add(poleL);

        const poleR = new THREE.Mesh(poleGeo, poleMat);
        poleR.position.set(this.width / 2, 5, -this.length);
        this.scene.add(poleR);

        const bannerGeo = new THREE.BoxGeometry(this.width, 2, 1);
        const banner = new THREE.Mesh(bannerGeo, poleMat);
        banner.position.set(0, 9, -this.length);
        this.scene.add(banner);
    }

    createObstacles() {
        const obsGeo = new THREE.BoxGeometry(2, 2, 2);
        const obsMat = new THREE.MeshStandardMaterial({ color: 0xff9900 });

        for (let i = 0; i < 50; i++) {
            const z = -Math.random() * (this.length - 20) - 10; // Avoid start
            const x = (Math.random() - 0.5) * (this.width - 4);

            const obs = new THREE.Mesh(obsGeo, obsMat);
            obs.position.set(x, 1, z);
            this.scene.add(obs);
            this.obstacles.push(obs);
        }
    }
}
