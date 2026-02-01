import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.length = 1000;
        this.width = 20;
        this.obstacles = [];
        this.walls = [];
        this.segmentLength = 2; // Resolution of the track

        this.init();
    }

    init() {
        // Generate Curved Track Mesh
        this.createTrackMesh();

        // Finish Line
        this.createFinishLine();

        // Random Obstacles
        this.createObstacles();

        // Scenery (Trees & Mountains)
        this.createScenery();
    }

    // Returns the track's Center X, Floor Y, and rotation angles at a given Z
    getTrackState(z) {
        // Curve Logic: Math.sin(z)
        // Adjust these coefficients to change the track shape
        const curveFreqX = 0.01;
        const curveAmpX = 20;
        const hillFreqY = 0.015;
        const hillAmpY = 5;

        const x = Math.sin(z * curveFreqX) * curveAmpX;
        const y = Math.sin(z * hillFreqY) * hillAmpY;

        // Calculate tangent (derivative) for rotation
        const dx = Math.cos(z * curveFreqX) * curveAmpX * curveFreqX;
        const dy = Math.cos(z * hillFreqY) * hillAmpY * hillFreqY;

        const angleY = Math.atan2(dx, 1); // Yaw (Turning) approx
        // Technically pure Yaw is atan(dx/dz), here dz is 1 per unit step roughly

        return { x, y, angleY };
    }

    createTrackMesh() {
        const segments = Math.floor(this.length / this.segmentLength);
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colors = [];

        for (let i = 0; i <= segments; i++) {
            const z = -i * this.segmentLength;
            const state = this.getTrackState(z);

            // Left and Right points
            // We rotate the width vector based on the turn? 
            // For simplicity, just offset X, keeping cross-section flat (no banking for now)

            const xL = state.x - this.width / 2;
            const xR = state.x + this.width / 2;
            const y = state.y;

            vertices.push(xL, y, z); // Left Vertex
            vertices.push(xR, y, z); // Right Vertex

            if (i < segments) {
                const base = i * 2;
                // 2 Triangles per segment
                // base, base+1, base+2
                indices.push(base, base + 2, base + 1);
                // base+1, base+2, base+3
                indices.push(base + 1, base + 2, base + 3);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x006400, // Dark Green Track
            roughness: 0.8,
            side: THREE.DoubleSide
        });

        const trackMesh = new THREE.Mesh(geometry, material);
        this.scene.add(trackMesh);

        // Sidebar Walls (Generated similarly or just placed objects)
        // Let's generate them as separate objects for collision reference if needed, 
        // or just visual strips. For existing collision logic, walls were simpler.
        // Let's generate "Wall" meshes along the sides.
        this.createWallMesh();
    }

    createWallMesh() {
        const wallHeight = 2;
        const segments = Math.floor(this.length / this.segmentLength);

        const leftParams = { vertices: [], indices: [] };
        const rightParams = { vertices: [], indices: [] };

        const addSegment = (params, xOffset) => {
            for (let i = 0; i <= segments; i++) {
                const z = -i * this.segmentLength;
                const state = this.getTrackState(z);
                const x = state.x + xOffset;
                const yBase = state.y;
                const yTop = state.y + wallHeight;

                // Vertices: Bottom, Top
                params.vertices.push(x, yBase, z);
                params.vertices.push(x, yTop, z);

                if (i < segments) {
                    const base = i * 2;
                    params.indices.push(base, base + 2, base + 1);
                    params.indices.push(base + 1, base + 2, base + 3);
                }
            }
        };

        addSegment(leftParams, -this.width / 2 - 0.5);
        addSegment(rightParams, this.width / 2 + 0.5);

        const mat = new THREE.MeshStandardMaterial({ color: 0x880000 });

        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftParams.vertices, 3));
        lGeo.setIndex(leftParams.indices);
        lGeo.computeVertexNormals();
        this.scene.add(new THREE.Mesh(lGeo, mat));

        const rGeo = new THREE.BufferGeometry();
        rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightParams.vertices, 3));
        rGeo.setIndex(rightParams.indices);
        rGeo.computeVertexNormals();
        this.scene.add(new THREE.Mesh(rGeo, mat));
    }

    createFinishLine() {
        const z = -this.length;
        const state = this.getTrackState(z);

        const geo = new THREE.BoxGeometry(this.width, 0.1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(geo, mat);
        line.position.set(state.x, state.y + 0.05, z);
        line.rotation.y = state.angleY;
        this.scene.add(line);

        // Arch
        const poleGeo = new THREE.BoxGeometry(1, 10, 1);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });

        const poleL = new THREE.Mesh(poleGeo, poleMat);
        poleL.position.set(state.x - this.width / 2, state.y + 5, z);
        poleL.rotation.y = state.angleY;
        this.scene.add(poleL);

        const poleR = new THREE.Mesh(poleGeo, poleMat);
        poleR.position.set(state.x + this.width / 2, state.y + 5, z);
        poleR.rotation.y = state.angleY;
        this.scene.add(poleR);

        const bannerGeo = new THREE.BoxGeometry(this.width, 2, 1);
        const banner = new THREE.Mesh(bannerGeo, poleMat);
        banner.position.set(state.x, state.y + 9, z);
        banner.rotation.y = state.angleY;
        this.scene.add(banner);
    }

    createObstacles() {
        const obsGeo = new THREE.BoxGeometry(2, 2, 2);
        const obsMat = new THREE.MeshStandardMaterial({ color: 0xff9900 });

        for (let i = 0; i < 50; i++) {
            const z = -Math.random() * (this.length - 20) - 10;
            // Get track center at this Z
            const state = this.getTrackState(z);

            // Random offset from center
            const xOff = (Math.random() - 0.5) * (this.width - 4);

            const obs = new THREE.Mesh(obsGeo, obsMat);
            // Position relative to track
            obs.position.set(state.x + xOff, state.y + 1, z);
            obs.rotation.y = state.angleY;

            this.scene.add(obs);
            this.obstacles.push(obs);
        }
    }

    createScenery() {
        // Trees
        const treeTrunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const treeLeavesGeo = new THREE.ConeGeometry(2, 4, 8);
        const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

        for (let i = 0; i < 200; i++) {
            const z = -Math.random() * this.length;
            const state = this.getTrackState(z);

            const side = Math.random() > 0.5 ? 1 : -1;
            const xOff = side * (this.width / 2 + 5 + Math.random() * 50);

            const group = new THREE.Group();

            const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
            trunk.position.y = 1;
            group.add(trunk);

            const leaves = new THREE.Mesh(treeLeavesGeo, treeLeavesMat);
            leaves.position.y = 3;
            group.add(leaves);

            // Position relative to track
            group.position.set(state.x + xOff, state.y, z);
            // No need to rotate trees, usually upright

            this.scene.add(group);
        }

        // Mountains
        const mountainGeo = new THREE.ConeGeometry(40, 60, 4);
        const mountainMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0 });

        for (let i = 0; i < 20; i++) {
            const z = -Math.random() * (this.length * 1.5) + this.length * 0.2;
            const state = this.getTrackState(z < 0 && z > -this.length ? z : 0); // Approx height if in range

            const side = Math.random() > 0.5 ? 1 : -1;
            const xOff = side * (this.width + 50 + Math.random() * 100);

            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(state.x + xOff, -5, z); // Lower base
            mountain.scale.set(1 + Math.random(), 1 + Math.random() * 0.5, 1 + Math.random());
            this.scene.add(mountain);
        }
    }
}
