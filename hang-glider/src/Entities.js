export class Player {
    constructor(gameW, gameH, imgSrc) {
        this.gameW = gameW;
        this.gameH = gameH;
        this.img = new Image();
        this.img.src = imgSrc;
        this.width = 64;
        this.height = 64;
        this.x = 100;
        this.y = gameH / 2;
        this.speed = 5;
    }

    update(input) {
        if (input.keys['ArrowUp']) this.y -= this.speed;
        if (input.keys['ArrowDown']) this.y += this.speed;
        if (input.keys['ArrowLeft']) this.x -= this.speed;
        if (input.keys['ArrowRight']) this.x += this.speed;

        // Containment
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.gameW) this.x = this.gameW - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > this.gameH) this.y = this.gameH - this.height;
    }

    draw(ctx) {
        if (this.img.complete) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return { x: this.x + 10, y: this.y + 10, w: this.width - 20, h: this.height - 20 };
    }
}

export class Obstacle {
    constructor(gameW, gameH, type, imgSrc, speed) {
        this.gameW = gameW;
        this.gameH = gameH;
        this.type = type; // 'roof', 'cutter', 'construction'
        this.img = new Image();
        this.img.src = imgSrc;
        this.width = 64;
        this.height = 64;
        this.x = gameW;
        this.y = Math.random() * (gameH - this.height);
        this.speed = speed;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        if (this.img.complete) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'gray';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return { x: this.x + 5, y: this.y + 5, w: this.width - 10, h: this.height - 10 };
    }
}

export class Item {
    constructor(gameW, gameH, imgSrc, speed) {
        this.gameW = gameW;
        this.gameH = gameH;
        this.img = new Image();
        this.img.src = imgSrc;
        this.width = 48;
        this.height = 48;
        this.x = gameW;
        this.y = Math.random() * (gameH - this.height);
        this.speed = speed;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        if (this.img.complete) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }
}
