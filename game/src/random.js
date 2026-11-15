// Small random helpers. Gameplay rolls on Math.random; the screenshot scenes
// in world.js use a seeded generator so their renders are stable run to run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    angle() {
      return next() * Math.PI * 2;
    },
  };
}

// The live game's generator: same shape as makeRng, backed by Math.random.
export function liveRng() {
  return {
    next: Math.random,
    range(min, max) {
      return min + (max - min) * Math.random();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * Math.random());
    },
    pick(items) {
      return items[Math.floor(Math.random() * items.length)];
    },
    angle() {
      return Math.random() * Math.PI * 2;
    },
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Squared distance: collision checks compare against a squared radius,
// so no square root is paid on the hot path.
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
