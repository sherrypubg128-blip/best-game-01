// Procedural sound: every effect is synthesised with WebAudio, so the game
// ships no audio files. Music is a quiet step sequencer (bass line + sparkle)
// that starts on the first player gesture; M mutes everything.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicStep = 0;
    this.musicTimer = null;
    // A slow minor bass line, one note per step, 0 = rest.
    this.bassLine = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 58.27, 0, 73.42, 0];
    this.sparkleNotes = [880, 1046.5, 1174.66, 1318.51];
  }

  // Call from a user gesture; creating the context earlier would stay suspended.
  // Any failure leaves ctx null and every tone() no-ops: sound never breaks play.
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, { dur = 0.12, type = 'sine', vol = 0.2, slideTo = null, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  click() {
    this.tone(660, { dur: 0.06, type: 'triangle', vol: 0.15 });
  }

  // Pickup pitch climbs with the combo, so a hot streak sounds like one.
  pickup(combo) {
    const base = 520 * Math.pow(1.059, Math.min(combo, 12));
    this.tone(base, { dur: 0.09, type: 'sine', vol: 0.22 });
    this.tone(base * 1.5, { dur: 0.12, type: 'sine', vol: 0.13, delay: 0.04 });
  }

  shatter() {
    this.tone(300, { dur: 0.16, type: 'square', vol: 0.15, slideTo: 90 });
    this.tone(1200, { dur: 0.08, type: 'sine', vol: 0.1, slideTo: 2400 });
  }

  hit() {
    this.tone(160, { dur: 0.35, type: 'sawtooth', vol: 0.3, slideTo: 40 });
  }

  dash() {
    this.tone(900, { dur: 0.14, type: 'sine', vol: 0.11, slideTo: 220 });
  }

  powerup() {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone(f, { dur: 0.1, type: 'triangle', vol: 0.16, delay: i * 0.06 }),
    );
  }

  waveClear() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone(f, { dur: 0.16, type: 'triangle', vol: 0.18, delay: i * 0.09 }),
    );
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      this.tone(f, { dur: 0.22, type: 'triangle', vol: 0.2, delay: i * 0.11 }),
    );
  }

  lose() {
    [392, 329.63, 261.63, 196].forEach((f, i) =>
      this.tone(f, { dur: 0.28, type: 'sawtooth', vol: 0.13, delay: i * 0.14 }),
    );
  }

  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.ctx) return;
      const step = this.musicStep % 16;
      const bass = this.bassLine[step];
      if (bass) this.tone(bass, { dur: 0.2, type: 'triangle', vol: 0.07 });
      if (step === 0 || step === 6 || step === 11) {
        const note = this.sparkleNotes[(this.musicStep / 16 | 0) % this.sparkleNotes.length];
        this.tone(note, { dur: 0.3, type: 'sine', vol: 0.045 });
      }
      this.musicStep += 1;
    }, 210);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
