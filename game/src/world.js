// The game itself: state machine (title / playing / paused / win / gameover),
// waves, scoring, combos, collisions and the deterministic screenshot scenes.
// Rendering lives in render.js; input handling in main.js.

import { CONFIG, waveSpec } from './config.js';
import { makeRng, liveRng, dist2 } from './random.js';
import { Player, Shard, Enemy, Particle, PowerUp, burst } from './entities.js';

const ARENA = CONFIG.arena;
const BEST_KEY = 'lumen-drift-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(v) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch (e) {
    // Storage unavailable (private mode, file://) — the game plays on regardless.
  }
}

export class World {
  constructor(sound) {
    this.sound = sound;
    this.rng = liveRng();
    this.state = 'title';
    this.frozen = false; // screenshot scenes render one frozen frame
    this.player = new Player(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
    this.shards = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.score = 0;
    this.best = loadBest();
    this.newBest = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.wave = 0;
    this.quota = 0;
    this.collected = 0;
    this.lives = CONFIG.lives;
    this.elapsed = 0;
    this.powerupTimer = CONFIG.powerup.interval;
    this.banner = null;
    this.clearing = false;
    this.clearTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.winBonus = 0;
  }

  get quotaLeft() {
    return Math.max(0, this.quota - this.collected);
  }

  // --- setup ---------------------------------------------------------------

  setupTitle() {
    this.state = 'title';
    this.frozen = false;
    // Keeps whatever generator is current: live play rolls on Math.random,
    // screenshot scenes set a seeded one first (see setupShot).
    this.player.reset(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
    this.shards = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    for (let i = 0; i < 14; i++) this.shards.push(this.makeShard());
    for (let i = 0; i < 5; i++) {
      this.enemies.push(new Enemy('drifter', this.rng.range(ARENA.x + 60, ARENA.x + ARENA.w - 60),
        this.rng.range(ARENA.y + 60, ARENA.y + ARENA.h - 60), this.rng, 1));
    }
  }

  startGame() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.lives = CONFIG.lives;
    this.elapsed = 0;
    this.newBest = false;
    this.winBonus = 0;
    this.clearing = false;
    this.banner = null;
    this.particles = [];
    this.powerups = [];
    this.player.reset(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
    this.state = 'playing';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    const spec = waveSpec(n);
    this.quota = spec.quota;
    this.collected = 0;
    this.powerupTimer = CONFIG.powerup.interval;
    this.shards = [];
    this.enemies = [];
    for (let i = 0; i < spec.quota + 3; i++) this.shards.push(this.makeShard());
    for (let i = 0; i < spec.drifters; i++) this.enemies.push(this.spawnEnemy('drifter', spec));
    for (let i = 0; i < spec.hunters; i++) this.enemies.push(this.spawnEnemy('hunter', spec));
    for (let i = 0; i < spec.spinners; i++) this.enemies.push(this.spawnEnemy('spinner', spec));
    this.banner = { text: `WAVE ${n}`, sub: `Collect ${spec.quota} shards — survive the void`, t: 2.0 };
  }

  // --- spawning ------------------------------------------------------------

  randomArenaPoint(margin) {
    return {
      x: this.rng.range(ARENA.x + margin, ARENA.x + ARENA.w - margin),
      y: this.rng.range(ARENA.y + margin, ARENA.y + ARENA.h - margin),
    };
  }

  makeShard() {
    const p = this.randomArenaPoint(30);
    return new Shard(p.x, p.y, this.rng);
  }

  spawnEnemy(kind, spec) {
    // Keep enemies out of a ring around the player so a wave never opens on top of them.
    let p = this.randomArenaPoint(50);
    let tries = 0;
    while (dist2(p.x, p.y, this.player.x, this.player.y) < 220 * 220 && tries < 12) {
      p = this.randomArenaPoint(50);
      tries += 1;
    }
    return new Enemy(kind, p.x, p.y, this.rng, spec.speedScale);
  }

  spawnPowerUp() {
    const kind = this.rng.pick(['shield', 'magnet', 'overdrive']);
    const p = this.randomArenaPoint(60);
    this.powerups.push(new PowerUp(kind, p.x, p.y));
  }

  // --- per-frame update ----------------------------------------------------

  update(dt, input) {
    if (this.state === 'title') {
      this.updateAmbient(dt);
      return;
    }
    if (this.state !== 'playing') {
      this.updateParticles(dt);
      return;
    }

    this.elapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }

    // Dash: Space, Shift, or a mouse click (dash toward the pointer).
    const move = input.moveVector();
    const wantDash = input.wasPressed('Space') || input.wasPressed('ShiftLeft')
      || input.wasPressed('ShiftRight') || input.consumeClick();
    if (wantDash) {
      let dx = move.x;
      let dy = move.y;
      if (!move.fromKeys && input.pointer.active) {
        const px = input.pointer.x - this.player.x;
        const py = input.pointer.y - this.player.y;
        const len = Math.hypot(px, py) || 1;
        dx = px / len;
        dy = py / len;
      }
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.player.angle);
        dy = Math.sin(this.player.angle);
      }
      if (this.player.startDash(dx, dy)) this.sound.dash();
    }
    input.consumePressed('Space');
    input.consumePressed('ShiftLeft');
    input.consumePressed('ShiftRight');

    const pointerActive = input.pointerFresh(performance.now());
    this.player.update(dt, move, input.pointer, pointerActive);

    if (this.clearing) {
      this.clearTimer -= dt;
      this.updateParticles(dt);
      this.updateShards(dt);
      if (this.clearTimer <= 0) {
        this.clearing = false;
        if (this.wave >= CONFIG.waves.total) this.winGame();
        else this.startWave(this.wave + 1);
      }
      return;
    }

    for (const e of this.enemies) e.update(dt, this.player);
    this.updateShards(dt);
    for (const p of this.powerups) p.update(dt);
    this.powerups = this.powerups.filter((p) => !p.dead);
    this.updateParticles(dt);

    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0 && this.powerups.length === 0) {
      this.spawnPowerUp();
      this.powerupTimer = CONFIG.powerup.interval;
    }

    this.collideShards();
    this.collidePowerUps();
    this.collideEnemies();

    if (this.collected >= this.quota) this.beginWaveClear();
  }

  updateAmbient(dt) {
    for (const s of this.shards) s.update(dt, this.player, 0);
    for (const e of this.enemies) e.update(dt, this.player);
    this.updateParticles(dt);
  }

  updateShards(dt) {
    const magnetR = this.player.magnet > 0 ? CONFIG.shard.magnetRadius * 2.4 : CONFIG.shard.magnetRadius;
    for (const s of this.shards) s.update(dt, this.player, magnetR);
  }

  updateParticles(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => !p.dead);
  }

  // --- collisions ----------------------------------------------------------

  collideShards() {
    const pr = this.player.radius;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const rr = pr + s.radius;
      if (dist2(s.x, s.y, this.player.x, this.player.y) < rr * rr) {
        this.shards.splice(i, 1);
        this.combo += 1;
        this.comboTimer = CONFIG.shard.comboWindow;
        this.multiplier = Math.min(this.combo, CONFIG.shard.comboCap);
        const gained = CONFIG.shard.value * this.multiplier;
        this.score += gained;
        this.collected += 1;
        burst(this.particles, s.x, s.y, CONFIG.colors.shard, 10, 170);
        this.sound.pickup(this.combo);
        if (this.collected < this.quota) this.shards.push(this.makeShard());
      }
    }
  }

  collidePowerUps() {
    const pr = this.player.radius;
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      const rr = pr + p.radius;
      if (dist2(p.x, p.y, this.player.x, this.player.y) < rr * rr) {
        this.powerups.splice(i, 1);
        if (p.kind === 'shield') this.player.shield = true;
        if (p.kind === 'magnet') this.player.magnet = CONFIG.powerup.magnetTime;
        if (p.kind === 'overdrive') this.player.overdrive = CONFIG.powerup.overdriveTime;
        burst(this.particles, p.x, p.y, CONFIG.colors[p.kind], 14, 200);
        this.sound.powerup();
      }
    }
  }

  collideEnemies() {
    const pr = this.player.radius;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const rr = pr + e.radius;
      if (dist2(e.x, e.y, this.player.x, this.player.y) >= rr * rr) continue;
      if (this.player.dashing) {
        // A dash shatters a void shape: the dash is a weapon as well as an escape.
        this.enemies.splice(i, 1);
        this.score += CONFIG.enemy.shatterScore;
        burst(this.particles, e.x, e.y, CONFIG.colors[e.kind], 18, 260);
        this.sound.shatter();
        continue;
      }
      if (this.player.invuln > 0) continue;
      if (this.player.shield) {
        this.player.shield = false;
        this.player.invuln = 1.0;
        burst(this.particles, this.player.x, this.player.y, CONFIG.colors.shield, 16, 220);
        this.sound.hit();
        continue;
      }
      this.lives -= 1;
      this.combo = 0;
      this.multiplier = 1;
      this.shake = 16;
      this.flash = 0.7;
      burst(this.particles, this.player.x, this.player.y, CONFIG.colors.player, 30, 320);
      burst(this.particles, e.x, e.y, CONFIG.colors[e.kind], 14, 200);
      this.sound.hit();
      // Knock the player away from the hit and give them a breather.
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      this.player.vx = (dx / d) * 420;
      this.player.vy = (dy / d) * 420;
      this.player.invuln = CONFIG.player.invulnTime;
      if (this.lives <= 0) this.gameOver();
    }
  }

  // --- wave flow -----------------------------------------------------------

  beginWaveClear() {
    this.clearing = true;
    this.clearTimer = CONFIG.waves.bannerTime;
    this.score += CONFIG.waves.clearBonus;
    for (const e of this.enemies) {
      burst(this.particles, e.x, e.y, CONFIG.colors[e.kind], 12, 200);
    }
    this.enemies = [];
    this.banner = {
      text: `WAVE ${this.wave} CLEAR`,
      sub: `+${CONFIG.waves.clearBonus} bonus`,
      t: CONFIG.waves.bannerTime,
    };
    this.sound.waveClear();
  }

  gameOver() {
    this.state = 'gameover';
    this.recordBest();
    this.sound.stopMusic();
    this.sound.lose();
  }

  winGame() {
    this.state = 'win';
    this.winBonus = Math.max(0, Math.round((480 - this.elapsed) * 10));
    this.score += this.winBonus;
    this.recordBest();
    this.sound.stopMusic();
    this.sound.win();
  }

  recordBest() {
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      saveBest(this.score);
    }
  }

  // --- deterministic screenshot scenes ------------------------------------
  // ?shot=title|play|win|lose renders one frozen frame from a fixed seed,
  // so the screenshots are real renders of the game's own code.

  setupShot(scene) {
    this.frozen = true;
    this.rng = makeRng(20261116);
    this.best = 9840;
    this.particles = [];
    this.powerups = [];
    this.banner = null;
    this.clearing = false;
    this.shake = 0;
    this.flash = 0;

    if (scene === 'title') {
      this.rng = makeRng(20261116);
      this.setupTitle();
      this.frozen = true;
      return;
    }
    if (scene === 'win') {
      this.state = 'win';
      this.score = 9840;
      this.winBonus = 1250;
      this.elapsed = 272;
      this.wave = 10;
      this.quota = 25;
      this.collected = 25;
      this.lives = 2;
      this.newBest = true;
      for (let i = 0; i < 40; i++) {
        burst(this.particles, this.rng.range(200, 1080), this.rng.range(150, 600),
          this.rng.pick([CONFIG.colors.shard, CONFIG.colors.player, CONFIG.colors.spinner]), 3, 60);
      }
      return;
    }
    if (scene === 'lose') {
      this.state = 'gameover';
      this.score = 2310;
      this.wave = 4;
      this.quota = 13;
      this.collected = 9;
      this.lives = 0;
      this.elapsed = 148;
      this.player.reset(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
      burst(this.particles, this.player.x, this.player.y, CONFIG.colors.player, 40, 320);
      burst(this.particles, this.player.x - 60, this.player.y + 40, CONFIG.colors.drifter, 16, 200);
      return;
    }
    // 'play': a mid-game moment on wave 3, with a combo running.
    this.startGame();
    this.wave = 3;
    const spec = waveSpec(3);
    this.quota = spec.quota;
    this.collected = 8;
    // startGame left the wave-1 banner behind; the frame must name wave 3.
    this.banner = { text: 'WAVE 3', sub: `Collect ${spec.quota} shards — survive the void`, t: 2.0 };
    this.score = 1250;
    this.combo = 4;
    this.comboTimer = 2.1;
    this.multiplier = 4;
    this.lives = 2;
    this.elapsed = 96;
    this.player.reset(ARENA.x + ARENA.w / 2 - 120, ARENA.y + ARENA.h / 2 + 40);
    this.player.shield = false;
    this.shards = [];
    this.enemies = [];
    for (let i = 0; i < 9; i++) this.shards.push(this.makeShard());
    for (let i = 0; i < 5; i++) this.enemies.push(this.spawnEnemy('drifter', spec));
    for (let i = 0; i < 2; i++) this.enemies.push(this.spawnEnemy('hunter', spec));
    this.enemies.push(this.spawnEnemy('spinner', spec));
    this.powerups.push(new PowerUp('magnet', ARENA.x + ARENA.w - 260, ARENA.y + 140));

    // Run a short scripted burst of play so trails, particles and motion read.
    let tick = 0;
    const fakeInput = {
      moveVector: () => ({ x: 0.6, y: -0.6, fromKeys: true }),
      wasPressed: (code) => code === 'Space' && tick === 25,
      consumePressed: () => true,
      consumeClick: () => false,
      pointer: { x: 0, y: 0, active: false },
      pointerFresh: () => false,
    };
    this.state = 'playing';
    for (tick = 0; tick < 45; tick++) {
      this.update(1 / 60, fakeInput);
      if (this.state !== 'playing') break;
    }
    // Keep the frame exactly as the simulation left it.
    this.state = 'playing';
  }
}
