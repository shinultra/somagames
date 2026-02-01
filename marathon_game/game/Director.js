import { World } from './World.js';

export class Director {
    constructor() {
        this.world = new World();
        this.isRunning = false;
        this.lastTime = 0;
        this.startTime = 0;
    }

    init() {
        this.world.init();

        document.getElementById('start-screen').addEventListener('click', () => {
            this.startGame();
        });

        this.animate = this.animate.bind(this);
    }

    startGame() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = performance.now();
        document.getElementById('start-screen').classList.add('hidden');
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate);
    }

    animate(time) {
        if (!this.isRunning) return;

        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.world.update(delta);
        this.world.render();

        // Update HUD
        if (this.world.player && this.world.player.mesh) {
            const dist = Math.abs(this.world.player.mesh.position.z);
            const speed = Math.floor(this.world.player.speed * 3.6); // Convert to approx km/h
            const currentTime = performance.now();
            const runTime = (currentTime - this.startTime) / 1000;

            document.getElementById('speed').innerText = `SPEED: ${speed} km/h`;
            document.getElementById('distance').innerText = `DIST: ${Math.floor(dist)} / 1000m`;
            document.getElementById('time').innerText = `TIME: ${this.formatTime(runTime)}`;

            // Win Condition
            if (dist >= 1000) {
                this.gameWin(runTime);
                return;
            }
        }

        requestAnimationFrame(this.animate);
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds * 100) % 100);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    gameWin(finalTime) {
        this.isRunning = false;
        const formattedTime = this.formatTime(finalTime);
        document.getElementById('result-time').innerText = `Time: ${formattedTime}`;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('result-title').innerText = "GOAL!";

        const bestTime = localStorage.getItem('marathon_best_time');
        if (!bestTime || finalTime < parseFloat(bestTime)) {
            localStorage.setItem('marathon_best_time', finalTime);
            document.getElementById('new-record').classList.remove('hidden');
        } else {
            document.getElementById('new-record').classList.add('hidden');
        }

        document.getElementById('restart-btn').onclick = () => location.reload();
    }
}
