// Emberfall Keep — bootstrap and game loop.
// Owns the canvas, the fixed-timestep loop, the screen state machine, input
// handling and the ?shot= staging used for screenshots. The simulation and
// the rendering live in their own modules.

import { FIXED_DT, TOWERS, TOWER_ORDER, VIEW_H, VIEW_W } from './config.js';
import { createGame, isBuildable, startWave, tileFromPixel, towerAt } from './state.js';
import { draw } from './render.js';
import { placeTower, sellTower, update, upgradeTower } from './sim.js';
import { bindInput, hitTest } from './input.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

let game = createGame();
let frozen = false; // staged screenshots: render, do not advance
let endAt = 0; // wall-clock ms the current end screen appeared

// --- staging for screenshots (?shot=title|play|win|lose) -------------------
// These run the simulation a fixed number of ticks synchronously, so a shot
// is the same every time it is taken. A dev aid, documented in the README.

function stageTowers(list) {
  game.gold = 99999;
  for (const [type, col, row] of list) placeTower(game, type, col, row);
  game.gold = 180;
}

function stagePlay(waveNo, ticks) {
  game.phase = 'playing';
  stageTowers([
    ['ember', 13, 0],
    ['ember', 15, 3],
    ['cinder', 5, 3],
    ['storm', 13, 5],
    ['mortar', 6, 6],
  ]);
  game.wave = waveNo - 1;
  startWave(game);
  for (let i = 0; i < ticks; i++) update(game, FIXED_DT);
  frozen = true;
}

function stageEnd(won, waveNo, score, kills, lives) {
  game.phase = 'playing';
  stageTowers([
    ['ember', 13, 0],
    ['cinder', 5, 3],
    ['storm', 13, 5],
    ['mortar', 6, 6],
  ]);
  game.wave = waveNo - 1;
  startWave(game);
  for (let i = 0; i < 240; i++) update(game, FIXED_DT);
  game.score = score;
  game.kills = kills;
  game.lives = lives;
  game.wave = waveNo;
  game.goldEarned = won ? 2140 : 980;
  // The fight is over: stop the wave clock so the bar reads as an end screen.
  game.waveActive = false;
  game.spawnQueue = [];
  game.phase = won ? 'victory' : 'gameover';
  frozen = true;
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot === 'play') stagePlay(4, 480);
else if (shot === 'win') stageEnd(true, 12, 12480, 187, 14);
else if (shot === 'lose') stageEnd(false, 7, 4210, 96, 0);

// --- actions -----------------------------------------------------------------

function startGame() {
  game = createGame((Math.random() * 1e9) | 0);
  game.phase = 'playing';
  sfx.unlock();
}

function sendWave() {
  if (game.phase !== 'playing' || game.waveActive) return;
  if (startWave(game)) {
    sfx.wave();
  }
}

function togglePause() {
  if (game.phase === 'playing') game.phase = 'paused';
  else if (game.phase === 'paused') game.phase = 'playing';
}

function restart() {
  startGame();
}

function onTile(col, row) {
  if (game.phase !== 'playing') return;
  const existing = towerAt(game, col, row);
  if (game.selectedType) {
    if (existing) {
      game.selectedTower = existing;
      game.selectedType = null;
      return;
    }
    if (!isBuildable(game, col, row)) return;
    const def = TOWERS[game.selectedType];
    if (game.gold < def.cost) return;
    if (placeTower(game, game.selectedType, col, row)) {
      sfx.build();
      if (game.gold < def.cost) game.selectedType = null;
    }
    return;
  }
  game.selectedTower = existing;
  if (existing) sfx.click();
}

function onClick(x, y) {
  sfx.unlock();
  if (game.showHelp) {
    game.showHelp = false;
    return;
  }
  if (game.phase === 'title') {
    startGame();
    return;
  }
  if (game.phase === 'victory' || game.phase === 'gameover') {
    if (performance.now() - endAt > 800) restart();
    return;
  }
  const hit = hitTest(x, y, game);
  if (hit.kind === 'hud') {
    if (hit.id === 'sendWave') sendWave();
    else if (hit.id === 'pause') togglePause();
    else if (hit.id === 'speed') game.speed = game.speed === 1 ? 2 : 1;
    else if (hit.id === 'mute') {
      game.muted = !game.muted;
      sfx.setMuted(game.muted);
    } else if (hit.id === 'help') game.showHelp = true;
    return;
  }
  if (hit.kind === 'card') {
    game.selectedTower = null;
    game.selectedType = game.selectedType === hit.type ? null : hit.type;
    sfx.click();
    return;
  }
  if (hit.kind === 'upgrade' && game.selectedTower) {
    if (upgradeTower(game, game.selectedTower)) sfx.build();
    return;
  }
  if (hit.kind === 'sell' && game.selectedTower) {
    sellTower(game, game.selectedTower);
    sfx.coin();
    return;
  }
  if (hit.kind === 'tile') {
    onTile(hit.col, hit.row);
    return;
  }
  game.selectedType = null;
  game.selectedTower = null;
}

function onKey(key) {
  sfx.unlock();
  if (game.showHelp) {
    game.showHelp = false;
    return;
  }
  if (key === 'Enter') {
    if (game.phase === 'title') startGame();
    else if (game.phase === 'victory' || game.phase === 'gameover') restart();
    return;
  }
  if (key === 'r' || key === 'R') {
    if (game.phase !== 'title') restart();
    return;
  }
  if (key === 'm' || key === 'M') {
    game.muted = !game.muted;
    sfx.setMuted(game.muted);
    return;
  }
  if (key === 'Escape') {
    game.selectedType = null;
    game.selectedTower = null;
    game.showHelp = false;
    return;
  }
  if (key === ' ') {
    if (game.phase === 'title') startGame();
    else if (game.phase === 'paused') togglePause();
    else if (game.phase === 'playing') {
      if (game.waveActive) togglePause();
      else sendWave();
    } else if (game.phase === 'victory' || game.phase === 'gameover') restart();
    return;
  }
  if (key === 'p' || key === 'P') {
    togglePause();
    return;
  }
  if (key === 'f' || key === 'F') {
    game.speed = game.speed === 1 ? 2 : 1;
    return;
  }
  const byKey = TOWER_ORDER.find((t) => TOWERS[t].key === key);
  if (byKey && game.phase === 'playing') {
    game.selectedTower = null;
    game.selectedType = game.selectedType === byKey ? null : byKey;
    sfx.click();
  }
}

bindInput(canvas, {
  onHover(x, y) {
    const tile = tileFromPixel(x, y);
    game.hover = tile ? { ...tile, x, y } : { col: -1, row: -1, x, y };
  },
  onClick,
  onRightClick() {
    game.selectedType = null;
    game.selectedTower = null;
  },
  onKey,
});

// --- loop ----------------------------------------------------------------------

let last = performance.now();
let acc = 0;
let lastPhase = game.phase;

function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - last) / 1000, 0.25);
  last = now;
  game.animTime = (game.animTime || 0) + frameDt;
  if (game.phase !== lastPhase) {
    if (game.phase === 'victory' || game.phase === 'gameover') {
      endAt = now;
      if (game.phase === 'victory') sfx.win();
      else sfx.lose();
    }
    lastPhase = game.phase;
  }
  if (!frozen && game.phase === 'playing') {
    acc += frameDt * game.speed;
    let steps = 0;
    while (acc >= FIXED_DT && steps < 10) {
      update(game, FIXED_DT);
      acc -= FIXED_DT;
      steps++;
      if (game.phase !== 'playing') break;
    }
    if (steps === 10) acc = 0;
  }
  draw(ctx, game);
}

requestAnimationFrame(frame);

// Test and staging hook (also lets the finalist review poke at the game).
window.__emberfall = {
  game: () => game,
  startGame,
  sendWave,
  placeTower: (type, col, row) => placeTower(game, type, col, row),
  startWave: () => startWave(game),
  update: (dt) => update(game, dt),
};
