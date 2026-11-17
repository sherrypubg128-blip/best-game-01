// Seeded random numbers for Emberfall Keep.
// Gameplay randomness (spawn jitter, enemy wobble) comes from here so a run
// is reproducible from its seed; purely visual particles may use Math.random.

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

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// A float in [min, max) from a seeded generator.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
