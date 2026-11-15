// Lumen Drift — tuning constants.
// Every number the game balances on lives here, so the feel can be tuned
// without touching the logic in world.js or the drawing in render.js.

export const CONFIG = {
  width: 1280,
  height: 720,
  hudHeight: 76,
  arena: { x: 20, y: 84, w: 1240, h: 616 },

  player: {
    radius: 14,
    accel: 2600,
    maxSpeed: 345,
    drag: 2.4, // velocity damping per second when no input is held
    dashSpeed: 980,
    dashTime: 0.18,
    dashCooldown: 1.5,
    invulnTime: 1.6,
    trailLength: 14,
  },

  shard: {
    radius: 9,
    value: 10,
    driftSpeed: 16,
    magnetRadius: 130,
    magnetPull: 950,
    comboWindow: 3.0,
    comboCap: 8,
  },

  enemy: {
    drifterSpeed: [62, 118],
    hunterAccel: 300,
    hunterMaxSpeed: 168,
    spinnerOrbit: [56, 110],
    spinnerTurn: [1.1, 2.0],
    spinnerDrift: 46,
    shatterScore: 25,
  },

  powerup: {
    interval: 14,
    magnetTime: 8,
    overdriveTime: 6,
  },

  waves: {
    total: 10,
    clearBonus: 250,
    bannerTime: 2.4,
  },

  lives: 3,

  colors: {
    bg: '#070a18',
    shard: '#ffd94d',
    player: '#5df2ff',
    drifter: '#ff5d7a',
    hunter: '#ff9f43',
    spinner: '#c86bff',
    shield: '#7dff9e',
    magnet: '#5da8ff',
    overdrive: '#ff5df2',
  },
};

// What wave n throws at the player: a shard quota to collect, and the mix of
// void shapes. Difficulty grows through count and speed, never through luck.
// Wave 1 opens gentle (7 shards, 3 drifters); wave 10 fields 25 shards and
// 19 shapes, so the last wave is a real test of dash timing.
export function waveSpec(n) {
  return {
    quota: 5 + 2 * n,
    drifters: 2 + n,
    hunters: n >= 2 ? Math.min(1 + Math.floor((n - 2) / 2), 4) : 0,
    spinners: n >= 3 ? Math.min(Math.floor((n - 1) / 2), 3) : 0,
    speedScale: 1 + 0.06 * (n - 1),
  };
}
