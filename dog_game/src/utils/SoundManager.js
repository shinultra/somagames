export default class SoundManager {
    constructor(scene) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playJump() {
        this.playTone(400, 'square', 0.1, 0.1);
    }

    playStomp() {
        this.playTone(150, 'sawtooth', 0.1, 0.2);
    }

    playWin() {
        // Arpeggio
        const now = this.ctx.currentTime;
        this.playToneAt(523.25, 'sine', 0.1, 0.2, now);
        this.playToneAt(659.25, 'sine', 0.1, 0.2, now + 0.1);
        this.playToneAt(783.99, 'sine', 0.1, 0.4, now + 0.2);
    }

    playLOSE() {
        const now = this.ctx.currentTime;
        this.playToneAt(300, 'sawtooth', 0.2, 0.3, now);
        this.playToneAt(200, 'sawtooth', 0.2, 0.5, now + 0.3);
    }

    playBGM() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.noteIndex = 0;

        // Simple upbeat POP melody (C Major Scale)
        // [Note, Duration]
        this.melody = [
            [523.25, 0.2], [523.25, 0.2], [587.33, 0.2], [523.25, 0.2], [659.25, 0.2], [587.33, 0.4], // C C D C E D
            [523.25, 0.2], [523.25, 0.2], [587.33, 0.2], [523.25, 0.2], [698.46, 0.2], [659.25, 0.4], // C C D C F E
            [523.25, 0.2], [523.25, 0.2], [783.99, 0.4], [659.25, 0.2], [587.33, 0.2], [523.25, 0.2], // C C G E D C
            [698.46, 0.2], [698.46, 0.2], [659.25, 0.2], [523.25, 0.2], [587.33, 0.2], [523.25, 0.4]  // F F E C D C
        ];

        this.nextNoteTime = this.ctx.currentTime;
        this.scheduleNextNote();
    }

    scheduleNextNote() {
        if (!this.bgmPlaying) return;

        const note = this.melody[this.noteIndex];
        const freq = note[0];
        const duration = note[1];

        // Play note slightly ahead of time
        this.playToneAt(freq, 'triangle', 0.05, duration - 0.05, this.nextNoteTime);

        // Advance time
        this.nextNoteTime += duration;

        // Loop
        this.noteIndex = (this.noteIndex + 1) % this.melody.length;

        // Schedule next call
        const delay = this.nextNoteTime - this.ctx.currentTime;
        setTimeout(() => this.scheduleNextNote(), delay * 1000);
    }

    stopBGM() {
        this.bgmPlaying = false;
    }

    playTone(freq, type, attack, decay) {
        this.playToneAt(freq, type, attack, decay, this.ctx.currentTime);
    }

    playToneAt(freq, type, attack, decay, startTime) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + attack + decay);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + attack + decay);
    }
}
