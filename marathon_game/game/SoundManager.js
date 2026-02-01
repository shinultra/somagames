export class SoundManager {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.bpm = 150; // Running tempo
        this.nextNoteTime = 0;
        this.noteIndex = 0;

        // Simple scale (Pentatonicish)
        this.frequencies = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            392.00, // G4
            440.00, // A4
            523.25, // C5
            440.00, // A4
            392.00  // G4
        ];

        this.scheduleAheadTime = 0.1;
        this.lookahead = 25.0;
        this.timerID = null;
    }

    init() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    startBGM() {
        if (this.isPlaying) return;

        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.timerID = setInterval(() => this.scheduler(), this.lookahead);
    }

    stopBGM() {
        this.isPlaying = false;
        clearInterval(this.timerID);
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.noteIndex, this.nextNoteTime);
            this.nextNote();
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += secondsPerBeat * 0.5; // 8th notes
        this.noteIndex = (this.noteIndex + 1) % this.frequencies.length;
    }

    scheduleNote(beamIndex, time) {
        // Melody
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.value = this.frequencies[beamIndex];

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        osc.start(time);
        osc.stop(time + 0.1);

        // Bass (on beat)
        if (beamIndex % 2 === 0) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.connect(bassGain);
            bassGain.connect(this.ctx.destination);

            bassOsc.type = 'sawtooth';
            bassOsc.frequency.value = 65.41; // C2

            bassGain.gain.setValueAtTime(0.1, time);
            bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

            bassOsc.start(time);
            bassOsc.stop(time + 0.2);
        }
    }

    playWinSound() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.linearRampToValueAtTime(1046.50, this.ctx.currentTime + 0.5); // C6

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}
