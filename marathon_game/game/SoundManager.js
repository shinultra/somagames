export class SoundManager {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.bpm = 165; // High energy
        this.nextNoteTime = 0;
        this.step = 0; // 16th note step counter

        this.scheduleAheadTime = 0.1;
        this.lookahead = 25.0;
        this.timerID = null;

        // E Minor / G Major Pentatonic scale notes
        this.leadNotes = [
            659.25, // E5
            783.99, // G5
            880.00, // A5
            987.77, // B5
            1174.66, // D6
            1318.51, // E6
            1174.66, // D6
            987.77  // B5
        ];
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
        this.step = 0;
        this.timerID = setInterval(() => this.scheduler(), this.lookahead);
    }

    stopBGM() {
        this.isPlaying = false;
        clearInterval(this.timerID);
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.step, this.nextNoteTime);
            this.nextStep();
        }
    }

    nextStep() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += secondsPerBeat * 0.25; // 16th notes
        this.step = (this.step + 1) % 16;
    }

    scheduleNote(step, time) {
        // --- KICK (Every beat: 0, 4, 8, 12) ---
        if (step % 4 === 0) {
            this.playKick(time);
        }

        // --- HI-HAT (Off-beats: 2, 6, 10, 14) ---
        if (step % 4 === 2) {
            this.playHiHat(time);
        }

        // --- BASS (Driving 8th notes, rolling) ---
        // Play on steps 0, 2, 3, 5, 6, 8, 10, 11, 13, 14...
        // Simple offbeat pattern: 2, 3, 6, 7, 10, 11, 14, 15
        if (step % 4 !== 0) {
            this.playBass(time, step);
        }

        // --- LEAD (Arpeggiated) ---
        // Play constantly but lower volume, moving through scale
        if (step % 2 === 0) {
            this.playLead(time, step);
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playHiHat(time) {
        // White noise buffer would be better, but using high frequency triangle/square for simplicity
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Create a highpass filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Approximate noise/metal with random frequencies or non-harmonic cluster?
        // Let's stick to a simple high square "closed hat" sound
        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, time); // Little variation

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    playBass(time, step) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        // Base note E2 (82.41 Hz) or G2 (98.00 Hz) depending on phrase?
        // Let's switch base note every 8 steps (2 beats)
        const freq = (this.step < 8) ? 82.41 : 98.00;

        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playLead(time, step) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';

        // Pick note from array based on step
        // Slow arpeggio: index changes every 4 steps? 
        // Or fast run: index = step % length
        const noteIndex = Math.floor(step / 2) % this.leadNotes.length;
        const freq = this.leadNotes[noteIndex];

        osc.frequency.setValueAtTime(freq, time);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.05, time); // Subtle background lead
        gain.gain.linearRampToValueAtTime(0, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.2);
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

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Louder win
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}
