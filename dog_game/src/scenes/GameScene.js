import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import SoundManager from '../utils/SoundManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        const cacheBust = '?v=' + Date.now();
        this.load.image('dog', 'assets/dog_transparent.png' + cacheBust);
        this.load.image('tree', 'assets/tree_transparent.png' + cacheBust);
        this.load.image('tiles', 'assets/tiles.png' + cacheBust);
        this.load.image('bg', 'assets/bg.png' + cacheBust);
    }

    create() {
        this.soundManager = new SoundManager(this);

        // Only tiles need runtime transparent processing
        this.makeTransparent('tiles', 'tiles_clear');

        // Start BGM
        this.soundManager.playBGM();

        // World bounds (long level 3 minutes = maybe 5000px?)
        const levelWidth = 5000;
        this.physics.world.bounds.width = levelWidth;
        this.physics.world.bounds.height = 800; // Allow falling down

        // Background
        this.bg = this.add.tileSprite(0, 0, this.sys.game.config.width, this.sys.game.config.height, 'bg');
        this.bg.setOrigin(0, 0);
        this.bg.setScrollFactor(0);
        // Scale background to fit height (1024 -> 600)
        const bgScale = this.sys.game.config.height / 1024;
        this.bg.tileScaleX = bgScale;
        this.bg.tileScaleY = bgScale;

        // Platforms (Static Group)
        this.platforms = this.physics.add.staticGroup();

        // Generate Level
        this.generateLevel(levelWidth);

        // Player
        this.player = new Player(this, 100, 300);
        // Player uses pre-processed transparent texture
        this.player.setTexture('dog');

        // Pass sound manager to player
        this.player.soundManager = this.soundManager;

        // Camera
        this.cameras.main.setBounds(0, 0, levelWidth, 600);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // Enemies
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });
        this.spawnEnemies(levelWidth);

        // Physics
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        // Overlap for attack (stomp) or damage
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, null, this);

        // UI
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' }).setScrollFactor(0);

        this.timeLeft = 180; // 3 minutes
        this.timerText = this.add.text(16, 50, 'Time: 180', { fontSize: '32px', fill: '#fff' }).setScrollFactor(0);

        this.timerEvent = this.time.addEvent({ delay: 1000, callback: this.onTimerTick, callbackScope: this, loop: true });

        // Spawn Invincibility (3 seconds)
        this.spawnTime = this.time.now;
        this.invincibilityDuration = 3000;

        // Goal
        this.goal = this.add.rectangle(levelWidth - 100, 300, 50, 400, 0xffff00);
        this.physics.add.existing(this.goal, true); // true = static
        this.physics.add.overlap(this.player, this.goal, this.winGame, null, this);

        // Input for Restart
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.isGameOver || this.isGameWon) {
                this.scene.restart();
                this.isGameOver = false;
                this.isGameWon = false;
            }
        });
    }

    update() {
        this.player.update();

        // Parallax background
        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5;

        // Debug: Log player position every second
        if (!this.lastDebugTime || this.time.now - this.lastDebugTime > 1000) {
            console.log('Player Y:', this.player.y, 'touchingDown:', this.player.body.touching.down, 'platforms count:', this.platforms.children.size);
            this.lastDebugTime = this.time.now;
        }

        // Cleanup enemies that fall
        this.enemies.children.each(enemy => {
            if (enemy.y > 700) {
                enemy.destroy();
            }
        });
    }

    generateLevel(width) {
        let x = 0;
        let y = 500;

        // Use TileSprite for seamless platforms
        // We'll scale the texture to 64x64, so we need to set tileScale
        const tileScale = 64 / 1024;

        // Safe Zone (Start) - One big block
        const startWidth = 800;

        // Backing
        const startBacking = this.add.rectangle(x, y + 16, startWidth, 48, 0x6d4e2d);
        startBacking.setOrigin(0, 0);

        const startPlatform = this.add.tileSprite(x, y, startWidth, 64, 'tiles_clear');
        startPlatform.setOrigin(0, 0);
        startPlatform.tileScaleX = tileScale;
        startPlatform.tileScaleY = tileScale;

        // Physics for start platform - Use Zone for invisible physics
        const startZone = this.add.zone(x + startWidth / 2, y + 20, startWidth, 16);
        this.physics.add.existing(startZone, true); // true = static
        this.platforms.add(startZone);

        x += 800;

        // Rest of the level
        while (x < width) {
            // Random Gap
            if (Math.random() < 0.1) {
                x += 100 + Math.random() * 50;
            } else {
                // Determine height
                if (Math.random() < 0.2) y -= 64;
                else if (Math.random() < 0.2) y += 64;
                y = Phaser.Math.Clamp(y, 200, 550);

                // Determine island width (multiple of 64 for alignment)
                let islandWidth = Math.floor(2 + Math.random() * 5) * 64;
                if (x + islandWidth > width) islandWidth = width - x;

                // Create Backing Rectangle to hide seams (Dirt Color)
                const backing = this.add.rectangle(x, y + 16, islandWidth, 48, 0x6d4e2d); // Brownish
                backing.setOrigin(0, 0);

                // Create Visual (TileSprite)
                // Note: TileSprite width is logical pixels. Texture is scaled via tileScale.
                const platform = this.add.tileSprite(x, y, islandWidth, 64, 'tiles_clear');
                platform.setOrigin(0, 0);
                platform.tileScaleX = tileScale;
                platform.tileScaleY = tileScale;

                // Create Physics Body using Zone
                const zone = this.add.zone(x + islandWidth / 2, y + 20, islandWidth, 16);
                this.physics.add.existing(zone, true); // true = static
                this.platforms.add(zone);

                x += islandWidth;
            }
        }
    }

    spawnEnemies(width) {
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(800, width - 200); // Don't spawn in safe zone
            const y = 0; // Drop from sky
            const enemy = new Enemy(this, x, y);
            enemy.setTexture('tree'); // pre-processed transparent texture
            this.enemies.add(enemy);
        }
    }

    handleEnemyCollision(player, enemy) {
        // Check spawn invincibility
        if (this.time.now - this.spawnTime < this.invincibilityDuration) {
            return; // Ignore collision during invincibility
        }

        // Simple stomp logic: if player is falling and above enemy
        if (player.body.velocity.y > 0 && player.y < enemy.y - enemy.body.height * 0.5) {
            enemy.takeDamage();
            player.setVelocityY(-300); // Bounce
            this.score += 100;
            this.scoreText.setText('Score: ' + this.score);
            this.soundManager.playStomp();
        } else {
            this.gameOver();
        }
    }

    onTimerTick() {
        if (this.isGameOver || this.isGameWon) return;

        this.timeLeft--;
        this.timerText.setText('Time: ' + this.timeLeft);
        if (this.timeLeft <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.isDead = true;
        this.player.setTint(0xff0000);
        this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 'GAME OVER\nPress Space to Retry', { fontSize: '64px', fill: '#ff0000', align: 'center' }).setOrigin(0.5);
        this.timerEvent.remove();
        this.soundManager.playLOSE();
        this.soundManager.stopBGM();
    }

    winGame() {
        if (this.isGameWon) return;
        this.isGameWon = true;
        this.physics.pause();
        this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 'YOU WIN!\nScore: ' + this.score + '\nPress Space to Retry', { fontSize: '64px', fill: '#00ff00', align: 'center' }).setOrigin(0.5);
        this.timerEvent.remove();
        this.soundManager.playWin();
        this.soundManager.stopBGM();
    }

    makeTransparent(srcKey, destKey) {
        const texture = this.textures.get(srcKey);
        if (!texture || texture.key === '__MISSING') return;

        const image = texture.getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Get background colors from corners (for checkerboard detection)
        const getPixel = (x, y) => {
            const idx = (y * width + x) * 4;
            return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
        };

        // Sample corner pixels to detect checkerboard colors
        const corners = [
            getPixel(0, 0),
            getPixel(1, 0),
            getPixel(0, 1),
            getPixel(1, 1)
        ];

        // Find unique colors (with tolerance)
        const bgColors = [];
        const tol = 30;

        for (const c of corners) {
            const isDuplicate = bgColors.some(
                bg => Math.abs(c.r - bg.r) < tol && Math.abs(c.g - bg.g) < tol && Math.abs(c.b - bg.b) < tol
            );
            if (!isDuplicate) {
                bgColors.push(c);
            }
        }

        // Check if pixel matches any background color
        const isBackground = (r, g, b) => {
            return bgColors.some(
                bg => Math.abs(r - bg.r) < tol && Math.abs(g - bg.g) < tol && Math.abs(b - bg.b) < tol
            );
        };

        // Flood Fill BFS from all corners
        const queue = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
        const visited = new Uint8Array(width * height);

        const getIdx = (x, y) => (y * width + x) * 4;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const visitIdx = y * width + x;

            if (visited[visitIdx]) continue;
            visited[visitIdx] = 1;

            const idx = getIdx(x, y);
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (isBackground(r, g, b)) {
                data[idx + 3] = 0; // Set Alpha to 0

                // Add neighbors
                if (x > 0) queue.push([x - 1, y]);
                if (x < width - 1) queue.push([x + 1, y]);
                if (y > 0) queue.push([x, y - 1]);
                if (y < height - 1) queue.push([x, y + 1]);
            }
        }

        ctx.putImageData(imgData, 0, 0);
        this.textures.addCanvas(destKey, canvas);
    }
}
