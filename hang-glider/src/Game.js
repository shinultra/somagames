import { Player, Obstacle, Item } from './Entities.js';
import { InputHandler } from './Input.js';
import { AudioHandler } from './Audio.js';

export class Game {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.player = new Player(this.width, this.height, 'assets/player.png');
        this.input = new InputHandler();
        this.audio = new AudioHandler();

        this.obstacles = [];
        this.items = [];
        this.bgX = 0;
        this.bgSpeed = 2; // Scroll speed
        this.bgImg = new Image();
        this.bgImg.src = 'assets/cloud_bg.png';

        this.score = 0;
        this.lives = 3;
        this.gameTime = 0;
        this.maxTime = 270; // 4 minutes 30 seconds

        this.state = 'START'; // START, PLAYING, GAMEOVER, WIN

        this.enemyTimer = 0;
        this.enemyInterval = 2000; // ms
        this.itemTimer = 0;
        this.itemInterval = 5000; // ms

        // Obstacle types
        this.obstacleTypes = [
            { type: 'roof', src: 'assets/obstacle_roof.png' },
            { type: 'cutter', src: 'assets/obstacle_cutter.png' },
            { type: 'construction', src: 'assets/obstacle_construction.png' }
        ];
    }

    update(deltaTime) {
        if (this.state === 'PLAYING') {
            this.gameTime += deltaTime / 1000;
            this.bgX -= this.bgSpeed;
            if (this.bgX <= -this.width) this.bgX = 0;

            this.player.update(this.input);

            // Spawning Obstacles
            if (this.enemyTimer > this.enemyInterval) {
                const randomType = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
                this.obstacles.push(new Obstacle(this.width, this.height, randomType.type, randomType.src, this.bgSpeed + 2));
                this.enemyTimer = 0;
            } else {
                this.enemyTimer += deltaTime;
            }

            // Spawning Items
            if (this.itemTimer > this.itemInterval) {
                this.items.push(new Item(this.width, this.height, 'assets/item_candy.png', this.bgSpeed + 2));
                this.itemTimer = 0;
            } else {
                this.itemTimer += deltaTime;
            }

            // Update Entities
            this.obstacles.forEach(obj => obj.update());
            this.items.forEach(obj => obj.update());

            // Remove off-screen
            this.obstacles = this.obstacles.filter(obj => !obj.markedForDeletion);
            this.items = this.items.filter(obj => !obj.markedForDeletion);

            // Collision Detection
            this.checkCollisions();

            // Win Condition
            if (this.gameTime >= this.maxTime) {
                this.state = 'WIN';
                this.audio.stopBGM();
                this.audio.playWin();
            }
        } else if (this.state === 'START' || this.state === 'GAMEOVER' || this.state === 'WIN') {
            // Check for restart
            // Allow replay if game over or win
            if (this.state !== 'START' && (this.input.keys['Enter'] || this.input.keys['Space'])) {
                this.reset();
            }
            // Start game on first input
            if (this.state === 'START' && (this.input.keys['Enter'] || this.input.keys['Space'])) {
                this.state = 'PLAYING';
                this.audio.start();
                this.audio.playBGM();
            }
        }
    }

    draw(ctx) {
        // Draw Background
        if (this.bgImg.complete) {
            ctx.drawImage(this.bgImg, this.bgX, 0, this.width, this.height);
            ctx.drawImage(this.bgImg, this.bgX + this.width, 0, this.width, this.height);
        } else {
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.state === 'PLAYING') {
            this.player.draw(ctx);
            this.obstacles.forEach(obj => obj.draw(ctx));
            this.items.forEach(obj => obj.draw(ctx));

            // UI
            this.drawUI(ctx);
        } else if (this.state === 'START') {
            this.drawPixelText(ctx, "ハンググライダー", this.width / 2, this.height / 2 - 40, 40, 'center');
            this.drawPixelText(ctx, "アドベンチャー", this.width / 2, this.height / 2 + 10, 40, 'center');
            this.drawPixelText(ctx, "PRESS SPACE TO START", this.width / 2, this.height / 2 + 60, 20, 'center');
        } else if (this.state === 'GAMEOVER') {
            this.drawPixelText(ctx, "GAME OVER", this.width / 2, this.height / 2 - 20, 50, 'center');
            this.drawPixelText(ctx, "SCORE: " + this.score, this.width / 2, this.height / 2 + 40, 30, 'center');
            this.drawPixelText(ctx, "PRESS SPACE TO REPLAY", this.width / 2, this.height / 2 + 80, 20, 'center');
        } else if (this.state === 'WIN') {
            this.drawPixelText(ctx, "GOAL REACHED!", this.width / 2, this.height / 2 - 20, 50, 'center');
            this.drawPixelText(ctx, "SCORE: " + this.score, this.width / 2, this.height / 2 + 40, 30, 'center');
            this.drawPixelText(ctx, "PRESS SPACE TO REPLAY", this.width / 2, this.height / 2 + 80, 20, 'center');
        }
    }

    drawUI(ctx) {
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE: ' + this.score, 20, 40);
        ctx.fillText('LIVES: ' + this.lives, 20, 70);

        const remainingTime = Math.max(0, this.maxTime - this.gameTime);
        const mins = Math.floor(remainingTime / 60);
        const secs = Math.floor(remainingTime % 60);
        ctx.fillText('TIME: ' + mins + ':' + (secs < 10 ? '0' : '') + secs, this.width - 150, 40);
    }

    drawPixelText(ctx, text, x, y, size, align) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = `${size}px Arial`; // Using standard font for simplicity, could import pixel font
        ctx.textAlign = align;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }

    checkCollisions() {
        const pb = this.player.getBounds();

        // Obstacles
        this.obstacles.forEach(obs => {
            if (obs.markedForDeletion) return;
            const ob = obs.getBounds();
            if (this.rectIntersect(pb, ob)) {
                obs.markedForDeletion = true;
                this.lives--;
                this.audio.playHit();
                if (this.lives <= 0) {
                    this.state = 'GAMEOVER';
                    this.audio.stopBGM();
                }
            }
        });

        // Items
        this.items.forEach(item => {
            if (item.markedForDeletion) return;
            const ib = item.getBounds();
            if (this.rectIntersect(pb, ib)) {
                item.markedForDeletion = true;
                this.score += 100;
                this.audio.playCollect();
            }
        });
    }

    rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w ||
            r2.x + r2.w < r1.x ||
            r2.y > r1.y + r1.h ||
            r2.y + r2.h < r1.y);
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.gameTime = 0;
        this.obstacles = [];
        this.items = [];
        this.player.x = 100;
        this.player.y = this.height / 2;
        this.state = 'PLAYING';
        this.audio.start();
        this.audio.playBGM();
    }
}
