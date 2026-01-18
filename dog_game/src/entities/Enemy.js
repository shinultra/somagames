export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'tree');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setBounce(0.2);
        this.setCollideWorldBounds(false);

        // Random size
        const scale = Phaser.Math.FloatBetween(0.08, 0.12);
        this.setScale(scale);

        // Speed
        this.moveSpeed = Phaser.Math.Between(50, 150);
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.setVelocityX(this.moveSpeed * this.direction);
        this.setFlipX(this.direction > 0);

        // Timer to change direction
        scene.time.addEvent({ delay: 2000, callback: this.changeDirection, callbackScope: this, loop: true });
    }

    changeDirection() {
        if (!this.active) return;
        this.direction *= -1;
        this.setVelocityX(this.moveSpeed * this.direction);
        this.setFlipX(this.direction > 0);
    }

    takeDamage() {
        this.destroy(); // Simplify: one hit kill
    }
}
