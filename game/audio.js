// Emberfall Keep — procedural sound.
// Every sound is synthesized with WebAudio: no audio files, no network.
// The context is created on the first user gesture; until then it stays null
// and every call is a silent no-op (headless runs included).

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = 0) {
  if (!ensure() || muted || !ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

export const sfx = {
  unlock() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  },
  setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.35;
  },
  shoot() { tone(720, 0.07, 'square', 0.12, 420); },
  snare() { tone(300, 0.1, 'triangle', 0.15, 180); },
  zap() { tone(980, 0.09, 'sawtooth', 0.12, 240); },
  thump() { tone(160, 0.12, 'sine', 0.3, 70); },
  lance() { tone(1240, 0.14, 'sine', 0.18, 520); },
  kill() { tone(520, 0.12, 'triangle', 0.22, 180); },
  leak() { tone(220, 0.35, 'sawtooth', 0.25, 90); },
  coin() { tone(880, 0.08, 'sine', 0.14, 1320); },
  click() { tone(660, 0.05, 'square', 0.1); },
  build() { tone(392, 0.12, 'triangle', 0.2, 523); },
  wave() { tone(196, 0.3, 'triangle', 0.25, 392); },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.22), i * 130));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.16), i * 160));
  },
};
