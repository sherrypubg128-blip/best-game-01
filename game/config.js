// Emberfall Keep — configuration.
// Everything the simulation and the renderer share lives here, so tuning the
// game means editing this file, not hunting through the code. All money is in
// gold, all distances in pixels, all times in seconds.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const BAR_H = 88;
export const CELL = 64;
export const COLS = 20;
export const ROWS = 9;
export const GRID_Y = HUD_H;
export const GRID_H = ROWS * CELL;
export const BAR_Y = HUD_H + GRID_H;

export const START_GOLD = 200;
export const START_LIVES = 20;
export const WAVE_COUNT = 12;
export const SELL_RATE = 0.7;
export const FIXED_DT = 1 / 60;

// Warm ember palette on deep charcoal. No neon: amber, ember orange and gold
// on dark browns, with a violet shadow for the enemy side.
export const PALETTE = {
  bg: '#17120e',
  groundA: '#241c15',
  groundB: '#201812',
  groundLine: '#2e2318',
  path: '#4a3b2c',
  pathEdge: '#33281d',
  pathGlow: '#ff9a3c',
  hud: '#120d09',
  hudLine: '#3a2c1e',
  bar: '#120d09',
  card: '#2a1f16',
  cardSel: '#5a3413',
  cardLine: '#5a4026',
  cardDim: '#6b543a',
  text: '#ffe8c2',
  textDim: '#c9a886',
  gold: '#ffd166',
  heart: '#ff5d5d',
  keep: '#ffb347',
  shadow: '#241a2e',
  shadowEdge: '#4a3560',
  eye: '#ff5340',
};

// The enemy path, as grid points. The first and last points sit off the board
// (x = -1 enters from the left, x = COLS leaves to the right) so enemies
// walk in from outside and out into the keep at the far end.
export const PATH_POINTS = [
  [-1, 1],
  [14, 1],
  [14, 4],
  [4, 4],
  [4, 7],
  [COLS, 7],
];

// Towers. range is in pixels; rate is shots per second; dmg is per hit.
// Upgrades multiply damage by DMG_PER_LEVEL and range by RANGE_PER_LEVEL.
export const DMG_PER_LEVEL = 1.6;
export const RANGE_PER_LEVEL = 1.1;
export const RATE_PER_LEVEL = 1.08;

export const TOWERS = {
  ember: {
    name: 'Ember Bolt',
    key: '1',
    cost: 50,
    range: 160,
    dmg: 12,
    rate: 2.0,
    projSpeed: 520,
    color: '#ffb347',
    blurb: 'Fast ember bolts',
  },
  cinder: {
    name: 'Cinder Snare',
    key: '2',
    cost: 75,
    range: 135,
    dmg: 5,
    rate: 1.0,
    projSpeed: 380,
    slow: 0.55,
    slowDur: 1.6,
    color: '#ff8c42',
    blurb: 'Sticky cinders slow',
  },
  storm: {
    name: 'Storm Coil',
    key: '3',
    cost: 120,
    range: 170,
    dmg: 11,
    rate: 0.85,
    chain: 3,
    chainFalloff: 0.6,
    color: '#ffd166',
    blurb: 'Lightning chains x3',
  },
  mortar: {
    name: 'Mortar',
    key: '4',
    cost: 150,
    range: 235,
    minRange: 95,
    dmg: 34,
    splash: 70,
    rate: 0.5,
    color: '#ff6b35',
    blurb: 'Splashing fireballs',
  },
  lance: {
    name: 'Sun Lance',
    key: '5',
    cost: 200,
    range: 340,
    dmg: 68,
    rate: 0.4,
    color: '#ffe66d',
    blurb: 'Long-range piercing beam',
  },
};
export const TOWER_ORDER = ['ember', 'cinder', 'storm', 'mortar', 'lance'];

// Enemies. hp is the base before the per-wave multiplier. slowResist cuts
// the slow effect (a wraith at 0.5 is slowed half as much).
export const ENEMIES = {
  shambler: { name: 'Shambler', hp: 42, speed: 62, reward: 6, radius: 14, lives: 1, color: '#3a2b4d', eye: '#ff5340' },
  skitter: { name: 'Skitter', hp: 30, speed: 125, reward: 5, radius: 10, lives: 1, color: '#33263f', eye: '#ffb347' },
  armoured: { name: 'Husk', hp: 160, speed: 44, reward: 12, radius: 17, lives: 1, color: '#2c2138', eye: '#ff7b24' },
  wraith: { name: 'Wraith', hp: 70, speed: 98, reward: 10, radius: 12, lives: 1, color: '#241a2e', eye: '#c084fc', slowResist: 0.5 },
  boss: { name: 'The Hollow King', hp: 2200, speed: 30, reward: 160, radius: 27, lives: 5, color: '#1d1426', eye: '#ff2e2e' },
};

// A wave is a list of spawn groups. Each group spawns `count` enemies of one
// type, `interval` seconds apart, starting `delay` seconds into the wave.
export const WAVES = [
  [{ type: 'shambler', count: 6, interval: 1.2, delay: 0 }],
  [{ type: 'shambler', count: 10, interval: 1.0, delay: 0 }],
  [
    { type: 'shambler', count: 6, interval: 1.0, delay: 0 },
    { type: 'skitter', count: 5, interval: 0.8, delay: 5 },
  ],
  [
    { type: 'skitter', count: 10, interval: 0.7, delay: 0 },
    { type: 'shambler', count: 4, interval: 1.0, delay: 4 },
  ],
  [
    { type: 'armoured', count: 5, interval: 2.0, delay: 0 },
    { type: 'shambler', count: 6, interval: 1.0, delay: 3 },
  ],
  [
    { type: 'armoured', count: 6, interval: 1.8, delay: 0 },
    { type: 'skitter', count: 8, interval: 0.7, delay: 4 },
  ],
  [
    { type: 'wraith', count: 8, interval: 1.2, delay: 0 },
    { type: 'skitter', count: 6, interval: 0.7, delay: 3 },
  ],
  [
    { type: 'skitter', count: 16, interval: 0.5, delay: 0 },
    { type: 'armoured', count: 4, interval: 2.0, delay: 6 },
  ],
  [
    { type: 'armoured', count: 8, interval: 1.6, delay: 0 },
    { type: 'wraith', count: 8, interval: 1.0, delay: 4 },
  ],
  [
    { type: 'armoured', count: 10, interval: 1.4, delay: 0 },
    { type: 'shambler', count: 10, interval: 0.8, delay: 5 },
  ],
  [
    { type: 'wraith', count: 12, interval: 0.9, delay: 0 },
    { type: 'armoured', count: 8, interval: 1.4, delay: 4 },
    { type: 'skitter', count: 10, interval: 0.6, delay: 8 },
  ],
  [
    { type: 'boss', count: 1, interval: 1, delay: 0 },
    { type: 'wraith', count: 6, interval: 1.0, delay: 8 },
    { type: 'armoured', count: 4, interval: 1.6, delay: 14 },
  ],
];

export function hpMultiplier(wave) {
  return Math.pow(1.16, wave - 1);
}

export function waveBonus(wave) {
  return 30 + wave * 5;
}

export function upgradeCost(type, level) {
  // level is the level being bought (2 or 3).
  const base = TOWERS[type].cost;
  return Math.round(base * (level === 2 ? 0.8 : 1.2));
}

export function towerDamage(type, level) {
  return TOWERS[type].dmg * Math.pow(DMG_PER_LEVEL, level - 1);
}

export function towerRange(type, level) {
  return TOWERS[type].range * Math.pow(RANGE_PER_LEVEL, level - 1);
}

export function towerRate(type, level) {
  return TOWERS[type].rate * Math.pow(RATE_PER_LEVEL, level - 1);
}
