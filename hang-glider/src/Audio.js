export class AudioHandler {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgmOscillators = [];
        this.isPlaying = false;
        this.tempo = 120;
    }

    start() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playBGM() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.scheduleNotes();
    }

    stopBGM() {
        this.isPlaying = false;
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
        });
        this.bgmOscillators = [];
    }

    scheduleNotes() {
        // Simple major scale loop
        const notes = [
            261.63, 329.63, 392.00, 523.25, // C E G C
            349.23, 440.00, 523.25, 698.46, // F A C F
            392.00, 493.88, 587.33, 783.99, // G B D G
            261.63, 329.63, 392.00, 523.25  // C E G C
        ];

        let startTime = this.ctx.currentTime;
        const beatLength = 60 / this.tempo;

        const loop = () => {
            if (!this.isPlaying) return;

            notes.forEach((freq, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.value = freq;

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                const noteTime = startTime + index * 0.25; // Quarter notes? No, playing fast

                gain.gain.setValueAtTime(0.1, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.2);

                osc.start(noteTime);
                osc.stop(noteTime + 0.2);

                this.bgmOscillators.push(osc);
            });

            startTime += notes.length * 0.25;
            // Schedule next loop
            setTimeout(loop, (notes.length * 0.25 * 1000) - 50);
        };

        loop();
    }

    playJump() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playHit() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playCollect() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
        osc.frequency.setValueAtTime(1500, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playWin() {
        // Simple win fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const time = this.ctx.currentTime + i * 0.2;
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
            osc.start(time);
            osc.stop(time + 0.5);
        });
    }
}
