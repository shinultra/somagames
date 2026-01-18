export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'dog');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(false); // Can fall off world (pit)
        this.setBounce(0.1);
        this.setGravityY(0); // Inherits from world, but ensure it's set

        // Scale adjustment
        this.setScale(0.08);

        // Adjust physics body to fix floating
        // Reduce height to make feet sink slightly into ground
        // Original size: 698x781
        this.body.setSize(500, 650);
        this.body.setOffset(99, 50); // Center x, push down slightly from top (effectively lifting bottom more)

        // Input initialization
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Stats
        this.isDead = false;
    }

    update() {
        if (this.isDead) return;

        if (this.cursors.left.isDown) {
            this.setVelocityX(-200);
            this.setFlipX(true); // Face left
        } else if (this.cursors.right.isDown) {
            this.setVelocityX(200);
            this.setFlipX(false); // Face right
        } else {
            this.setVelocityX(0);
        }

        if (this.spaceKey.isDown && this.body.touching.down) {
            this.setVelocityY(-600);
            if (this.soundManager) this.soundManager.playJump();
        }

        // Camera follow (simple check if we want to force camera logic here or in scene)

        // Check if fallen (Game Over)
        if (this.y > this.scene.physics.world.bounds.height + 100) {
            this.scene.gameOver();
        }
    }
}
