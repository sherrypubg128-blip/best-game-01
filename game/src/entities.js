// The things that live in the arena: the player's light-ship, the shards it
// collects, the three kinds of void shapes, particles and power-ups.
// Each class owns its own movement; collisions and scoring live in world.js.

import { CONFIG } from './config.js';
import { clamp } from './random.js';

const ARENA = CONFIG.arena;

export class Player {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 0;
    this.dashDirY = -1;
    this.invuln = 0;
    this.shield = false;
    this.magnet = 0;
    this.overdrive = 0;
    this.trail = [];
  }

  get radius() {
    return CONFIG.player.radius;
  }

  get dashing() {
    return this.dashTimer > 0;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  startDash(dirX, dirY) {
    if (!this.dashReady) return false;
    this.dashTimer = CONFIG.player.dashTime;
    this.dashCooldown = CONFIG.player.dashCooldown * (this.overdrive > 0 ? 0.5 : 1);
    this.dashDirX = dirX;
    this.dashDirY = dirY;
    this.invuln = Math.max(this.invuln, 0.35);
    return true;
  }

  update(dt, move, pointer, pointerActive) {
    const cfg = CONFIG.player;
    if (this.dashing) {
      this.vx = this.dashDirX * cfg.dashSpeed;
      this.vy = this.dashDirY * cfg.dashSpeed;
      this.dashTimer -= dt;
    } else if (move.fromKeys) {
      this.vx += move.x * cfg.accel * dt;
      this.vy += move.y * cfg.accel * dt;
      const speed = Math.hypot(this.vx, this.vy);
      const max = cfg.maxSpeed * (this.overdrive > 0 ? 1.25 : 1);
      if (speed > max) {
        this.vx = (this.vx / speed) * max;
        this.vy = (this.vy / speed) * max;
      }
    } else if (pointerActive) {
      // No keys held and the mouse recently moved: steer toward the pointer.
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const pull = Math.min(1, d / 120);
        this.vx += (dx / d) * cfg.accel * 0.9 * pull * dt;
        this.vy += (dy / d) * cfg.accel * 0.9 * pull * dt;
        const speed = Math.hypot(this.vx, this.vy);
        const max = cfg.maxSpeed * (this.overdrive > 0 ? 1.25 : 1);
        if (speed > max) {
          this.vx = (this.vx / speed) * max;
          this.vy = (this.vy / speed) * max;
        }
      } else {
        this.vx *= Math.exp(-cfg.drag * dt);
        this.vy *= Math.exp(-cfg.drag * dt);
      }
    } else {
      this.vx *= Math.exp(-cfg.drag * dt);
      this.vy *= Math.exp(-cfg.drag * dt);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < ARENA.x + this.radius) {
      this.x = ARENA.x + this.radius;
      this.vx = Math.abs(this.vx) * 0.4;
    }
    if (this.x > ARENA.x + ARENA.w - this.radius) {
      this.x = ARENA.x + ARENA.w - this.radius;
      this.vx = -Math.abs(this.vx) * 0.4;
    }
    if (this.y < ARENA.y + this.radius) {
      this.y = ARENA.y + this.radius;
      this.vy = Math.abs(this.vy) * 0.4;
    }
    if (this.y > ARENA.y + ARENA.h - this.radius) {
      this.y = ARENA.y + ARENA.h - this.radius;
      this.vy = -Math.abs(this.vy) * 0.4;
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 24) this.angle = Math.atan2(this.vy, this.vx); // face the way we fly

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > cfg.trailLength) this.trail.shift();

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.overdrive = Math.max(0, this.overdrive - dt);
  }
}

export class Shard {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    const a = rng.angle();
    const s = rng.range(6, CONFIG.shard.driftSpeed);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.phase = rng.next() * Math.PI * 2;
    this.radius = CONFIG.shard.radius;
  }

  update(dt, player, magnetRadius) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < magnetRadius && d > 1) {
      const pull = CONFIG.shard.magnetPull * dt * (1 - d / (magnetRadius + 40));
      this.vx += (dx / d) * pull;
      this.vy += (dy / d) * pull;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > 430) {
        this.vx = (this.vx / speed) * 430;
        this.vy = (this.vy / speed) * 430;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < ARENA.x + this.radius || this.x > ARENA.x + ARENA.w - this.radius) {
      this.vx = -this.vx;
      this.x = clamp(this.x, ARENA.x + this.radius, ARENA.x + ARENA.w - this.radius);
    }
    if (this.y < ARENA.y + this.radius || this.y > ARENA.y + ARENA.h - this.radius) {
      this.vy = -this.vy;
      this.y = clamp(this.y, ARENA.y + this.radius, ARENA.y + ARENA.h - this.radius);
    }
    this.phase += dt * 3;
  }
}

// kind: 'drifter' (straight line, bounces), 'hunter' (steers at the player),
// 'spinner' (orbits a slowly drifting centre).
export class Enemy {
  constructor(kind, x, y, rng, speedScale) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.phase = rng.next() * Math.PI * 2;
    this.spawnT = 0;
    this.radius = kind === 'spinner' ? 16 : kind === 'hunter' ? 15 : 18;
    if (kind === 'drifter') {
      const a = rng.angle();
      const s = rng.range(CONFIG.enemy.drifterSpeed[0], CONFIG.enemy.drifterSpeed[1]) * speedScale;
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
    } else if (kind === 'hunter') {
      this.vx = 0;
      this.vy = 0;
      this.maxSpeed = CONFIG.enemy.hunterMaxSpeed * speedScale;
    } else {
      this.orbitR = rng.range(CONFIG.enemy.spinnerOrbit[0], CONFIG.enemy.spinnerOrbit[1]);
      this.turn = rng.range(CONFIG.enemy.spinnerTurn[0], CONFIG.enemy.spinnerTurn[1])
        * (rng.next() < 0.5 ? -1 : 1);
      this.cx = x;
      this.cy = y;
      this.driftA = rng.angle();
      this.driftS = CONFIG.enemy.spinnerDrift;
    }
  }

  update(dt, player) {
    this.spawnT += dt;
    if (this.kind === 'drifter') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < ARENA.x + this.radius || this.x > ARENA.x + ARENA.w - this.radius) {
        this.vx = -this.vx;
        this.x = clamp(this.x, ARENA.x + this.radius, ARENA.x + ARENA.w - this.radius);
      }
      if (this.y < ARENA.y + this.radius || this.y > ARENA.y + ARENA.h - this.radius) {
        this.vy = -this.vy;
        this.y = clamp(this.y, ARENA.y + this.radius, ARENA.y + ARENA.h - this.radius);
      }
    } else if (this.kind === 'hunter') {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx += (dx / d) * CONFIG.enemy.hunterAccel * dt;
      this.vy += (dy / d) * CONFIG.enemy.hunterAccel * dt;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.maxSpeed) {
        this.vx = (this.vx / speed) * this.maxSpeed;
        this.vy = (this.vy / speed) * this.maxSpeed;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < ARENA.x + this.radius || this.x > ARENA.x + ARENA.w - this.radius) {
        this.vx = -this.vx;
        this.x = clamp(this.x, ARENA.x + this.radius, ARENA.x + ARENA.w - this.radius);
      }
      if (this.y < ARENA.y + this.radius || this.y > ARENA.y + ARENA.h - this.radius) {
        this.vy = -this.vy;
        this.y = clamp(this.y, ARENA.y + this.radius, ARENA.y + ARENA.h - this.radius);
      }
    } else {
      this.cx += Math.cos(this.driftA) * this.driftS * dt;
      this.cy += Math.sin(this.driftA) * this.driftS * dt;
      if (this.cx < ARENA.x + this.orbitR || this.cx > ARENA.x + ARENA.w - this.orbitR) {
        this.driftA = Math.PI - this.driftA;
        this.cx = clamp(this.cx, ARENA.x + this.orbitR, ARENA.x + ARENA.w - this.orbitR);
      }
      if (this.cy < ARENA.y + this.orbitR || this.cy > ARENA.y + ARENA.h - this.orbitR) {
        this.driftA = -this.driftA;
        this.cy = clamp(this.cy, ARENA.y + this.orbitR, ARENA.y + ARENA.h - this.orbitR);
      }
      this.phase += this.turn * dt;
      this.x = this.cx + Math.cos(this.phase) * this.orbitR;
      this.y = this.cy + Math.sin(this.phase) * this.orbitR;
    }
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-2.2 * dt);
    this.vy *= Math.exp(-2.2 * dt);
    this.life -= dt;
  }

  get dead() {
    return this.life <= 0;
  }
}

export function burst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    particles.push(
      new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.5, 2 + Math.random() * 3, color),
    );
  }
}

export class PowerUp {
  constructor(kind, x, y) {
    this.kind = kind; // 'shield' | 'magnet' | 'overdrive'
    this.x = x;
    this.y = y;
    this.phase = 0;
    this.radius = 15;
    this.life = 10;
  }

  update(dt) {
    this.phase += dt * 2;
    this.life -= dt;
    this.y += Math.sin(this.phase) * 10 * dt;
  }

  get dead() {
    return this.life <= 0;
  }
}
