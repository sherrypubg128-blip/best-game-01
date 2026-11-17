// Emberfall Keep — game state.
// Pure data plus the small helpers that build it. No drawing and no DOM here,
// so the simulation can run headless (the balance test does exactly that).

import {
  BAR_Y,
  CELL,
  COLS,
  ENEMIES,
  GRID_Y,
  hpMultiplier,
  PATH_POINTS,
  ROWS,
  START_GOLD,
  START_LIVES,
  WAVES,
} from './config.js';
import { mulberry32 } from './random.js';

// The path as pixel waypoints (cell centres, play-area origin included).
export function pathWaypoints() {
  return PATH_POINTS.map(([c, r]) => ({
    x: c * CELL + CELL / 2,
    y: GRID_Y + r * CELL + CELL / 2,
  }));
}

// The set of "col,row" keys the path covers, for buildability checks.
export function pathTiles() {
  const tiles = new Set();
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const [c1, r1] = PATH_POINTS[i];
    const [c2, r2] = PATH_POINTS[i + 1];
    const dc = Math.sign(c2 - c1);
    const dr = Math.sign(r2 - r1);
    let c = c1;
    let r = r1;
    for (;;) {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) tiles.add(`${c},${r}`);
      if (c === c2 && r === r2) break;
      c += dc;
      r += dr;
    }
  }
  return tiles;
}

export function createGame(seed = 20261117) {
  return {
    phase: 'title', // title | playing | paused | victory | gameover
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    wave: 0,
    waveActive: false,
    waveTime: 0,
    spawnQueue: [],
    towers: [],
    enemies: [],
    projectiles: [],
    beams: [],
    particles: [],
    floaters: [],
    selectedType: null, // tower type chosen for placement
    selectedTower: null, // placed tower being inspected
    hover: { col: -1, row: -1, x: 0, y: 0 },
    speed: 1,
    muted: false,
    kills: 0,
    leaked: 0,
    goldEarned: 0,
    towersBuilt: 0,
    rng: mulberry32(seed),
    nextId: 1,
    message: '',
    messageUntil: 0,
    pathTiles: pathTiles(),
    waypoints: pathWaypoints(),
  };
}

export function tileCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: GRID_Y + row * CELL + CELL / 2 };
}

export function tileFromPixel(x, y) {
  if (y < GRID_Y || y >= GRID_Y + ROWS * CELL) return null;
  const col = Math.floor(x / CELL);
  const row = Math.floor((y - GRID_Y) / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}

export function isBuildable(game, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (game.pathTiles.has(`${col},${row}`)) return false;
  return !game.towers.some((t) => t.col === col && t.row === row);
}

export function towerAt(game, col, row) {
  return game.towers.find((t) => t.col === col && t.row === row) || null;
}

// Queue the next wave's spawns. Called when the player presses Send Wave.
export function startWave(game) {
  if (game.waveActive || game.wave >= WAVES.length) return false;
  game.wave += 1;
  game.waveActive = true;
  game.waveTime = 0;
  const groups = WAVES[game.wave - 1];
  const queue = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      queue.push({ type: g.type, at: g.delay + i * g.interval });
    }
  }
  queue.sort((a, b) => a.at - b.at);
  game.spawnQueue = queue;
  return true;
}

export function spawnEnemy(game, type) {
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * hpMultiplier(game.wave));
  const start = game.waypoints[0];
  const enemy = {
    id: game.nextId++,
    type,
    name: def.name,
    x: start.x,
    y: start.y + (game.rng() - 0.5) * 20,
    hp,
    maxHp: hp,
    speed: def.speed,
    radius: def.radius,
    reward: def.reward,
    lives: def.lives,
    slowResist: def.slowResist || 0,
    slowUntil: 0,
    slowFactor: 1,
    wp: 1,
    dist: 0,
    wobble: game.rng() * Math.PI * 2,
    alive: true,
  };
  game.enemies.push(enemy);
  return enemy;
}

export function showMessage(game, text, seconds = 2.5) {
  game.message = text;
  game.messageUntil = game.time + seconds;
}

// Foes still to deal with in the current wave: alive plus queued to spawn.
export function remainingFoes(game) {
  return game.enemies.length + game.spawnQueue.length;
}
