// Emberfall Keep — simulation.
// Fixed-timestep update: spawning, enemy movement, tower fire, projectiles,
// deaths, leaks, wave end, win and lose. No drawing and no DOM here.

import {
  BAR_Y,
  CELL,
  ENEMIES,
  GRID_Y,
  towerDamage,
  towerRange,
  towerRate,
  TOWERS,
  VIEW_W,
  waveBonus,
  WAVES,
} from './config.js';
import { showMessage, spawnEnemy, startWave } from './state.js';

export { startWave };

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function burst(game, x, y, color, n, speed = 120) {
  for (let i = 0; i < n; i++) {
    const a = game.rng() * Math.PI * 2;
    const v = speed * (0.4 + game.rng() * 0.8);
    game.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      ttl: 0.5 + game.rng() * 0.5,
      maxTtl: 1,
      color,
      size: 2 + game.rng() * 3,
      grav: 160,
    });
  }
}

export function damageEnemy(game, enemy, dmg) {
  if (!enemy.alive) return;
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    game.kills += 1;
    game.gold += enemy.reward;
    game.goldEarned += enemy.reward;
    game.score += enemy.reward * 10 + game.wave * 2;
    burst(game, enemy.x, enemy.y, '#ffb347', enemy.type === 'boss' ? 40 : 12);
    burst(game, enemy.x, enemy.y, '#ff6b35', 8);
    game.floaters.push({ x: enemy.x, y: enemy.y - 18, text: `+${enemy.reward}g`, ttl: 1, color: '#ffd166' });
  }
}

function applySlow(game, enemy, factor, dur) {
  const resisted = factor + (1 - factor) * (enemy.slowResist || 0);
  enemy.slowFactor = Math.min(enemy.slowFactor, resisted);
  enemy.slowUntil = Math.max(enemy.slowUntil, game.time + dur);
}

function fireTower(game, tower) {
  const def = TOWERS[tower.type];
  const dmg = towerDamage(tower.type, tower.level);
  const range = towerRange(tower.type, tower.level);
  // Furthest-along enemy in range is the target.
  let target = null;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = dist(tower.x, tower.y, e.x, e.y);
    if (d > range) continue;
    if (def.minRange && d < def.minRange) continue;
    if (!target || e.dist > target.dist) target = e;
  }
  if (!target) return;
  tower.flash = 0.09;
  tower.cd = 1 / towerRate(tower.type, tower.level);

  if (tower.type === 'storm') {
    // Instant chain: jump to the nearest enemies near the last hit.
    let from = { x: tower.x, y: tower.y };
    let current = target;
    let hitDmg = dmg;
    for (let jump = 0; jump < def.chain && current; jump++) {
      game.beams.push({ x1: from.x, y1: from.y, x2: current.x, y2: current.y, ttl: 0.16, maxTtl: 0.16, color: def.color, width: 3 });
      damageEnemy(game, current, hitDmg);
      from = { x: current.x, y: current.y };
      hitDmg *= def.chainFalloff;
      let next = null;
      let best = 130;
      for (const e of game.enemies) {
        if (!e.alive || e === current) continue;
        const d = dist(from.x, from.y, e.x, e.y);
        if (d < best) { best = d; next = e; }
      }
      current = next;
    }
    return;
  }

  if (tower.type === 'lance') {
    game.beams.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, ttl: 0.14, maxTtl: 0.14, color: def.color, width: 4 });
    damageEnemy(game, target, dmg);
    burst(game, target.x, target.y, '#ffe66d', 6, 80);
    return;
  }

  if (tower.type === 'mortar') {
    game.projectiles.push({
      kind: 'mortar',
      x: tower.x, y: tower.y,
      tx: target.x, ty: target.y,
      sx: tower.x, sy: tower.y,
      speed: 300,
      dmg,
      splash: def.splash,
      target: null,
      progress: 0,
    });
    return;
  }

  // Ember bolt and cinder snare: homing orbs.
  game.projectiles.push({
    kind: tower.type,
    x: tower.x, y: tower.y,
    target,
    tx: target.x, ty: target.y,
    speed: def.projSpeed,
    dmg,
    slow: def.slow || 0,
    slowDur: def.slowDur || 0,
    progress: 0,
  });
}

function updateProjectiles(game, dt) {
  for (const p of game.projectiles) {
    if (p.kind === 'mortar') {
      const total = dist(p.sx, p.sy, p.tx, p.ty);
      const step = (p.speed * dt) / Math.max(total, 1);
      p.progress += step;
      const px = p.sx + (p.tx - p.sx) * Math.min(p.progress, 1);
      const py = p.sy + (p.ty - p.sy) * Math.min(p.progress, 1);
      p.x = px;
      p.y = py;
      if (p.progress >= 1) {
        p.done = true;
        burst(game, p.tx, p.ty, '#ff6b35', 14, 160);
        burst(game, p.tx, p.ty, '#ffd166', 8, 120);
        for (const e of game.enemies) {
          if (!e.alive) continue;
          if (dist(p.tx, p.ty, e.x, e.y) <= p.splash + e.radius * 0.5) damageEnemy(game, e, p.dmg);
        }
      }
      continue;
    }
    // Homing orb: chase the target's current position, or the last known one.
    const tx = p.target && p.target.alive ? p.target.x : p.tx;
    const ty = p.target && p.target.alive ? p.target.y : p.ty;
    const d = dist(p.x, p.y, tx, ty);
    const step = p.speed * dt;
    if (d <= Math.max(step, 10)) {
      p.done = true;
      if (p.target && p.target.alive) {
        damageEnemy(game, p.target, p.dmg);
        if (p.slow) applySlow(game, p.target, p.slow, p.slowDur);
        burst(game, tx, ty, p.kind === 'cinder' ? '#ff8c42' : '#ffb347', 4, 60);
      }
    } else {
      p.x += ((tx - p.x) / d) * step;
      p.y += ((ty - p.y) / d) * step;
    }
  }
  game.projectiles = game.projectiles.filter((p) => !p.done);
}

function updateEnemies(game, dt) {
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const slowed = game.time < e.slowUntil;
    const speed = e.speed * (slowed ? e.slowFactor : 1);
    const wp = game.waypoints[e.wp];
    if (!wp) {
      // Ran off the end: the keep takes the hit.
      e.alive = false;
      game.lives -= e.lives;
      game.leaked += 1;
      burst(game, VIEW_W - 20, e.y, '#ff5340', 16, 140);
      showMessage(game, e.type === 'boss' ? 'The Hollow King breached the keep! -5 lives' : `A ${e.name} slipped through! -${e.lives} life`);
      if (game.lives <= 0) {
        game.lives = 0;
        game.phase = 'gameover';
      }
      continue;
    }
    const d = dist(e.x, e.y, wp.x, wp.y);
    const step = speed * dt;
    if (d <= step) {
      e.x = wp.x;
      e.y = wp.y;
      e.wp += 1;
    } else {
      e.x += ((wp.x - e.x) / d) * step;
      e.y += ((wp.y - e.y) / d) * step;
      e.dist += step;
    }
    if (!slowed) e.slowFactor = 1;
    e.wobble += dt * 3;
  }
  game.enemies = game.enemies.filter((e) => e.alive);
}

function updateTowers(game, dt) {
  for (const t of game.towers) {
    t.cd -= dt;
    if (t.flash > 0) t.flash -= dt;
    if (t.cd <= 0) fireTower(game, t);
  }
}

function updateFx(game, dt) {
  for (const b of game.beams) b.ttl -= dt;
  game.beams = game.beams.filter((b) => b.ttl > 0);
  for (const p of game.particles) {
    p.ttl -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
  }
  game.particles = game.particles.filter((p) => p.ttl > 0);
  for (const f of game.floaters) {
    f.ttl -= dt;
    f.y -= 22 * dt;
  }
  game.floaters = game.floaters.filter((f) => f.ttl > 0);
}

export function update(game, dt) {
  if (game.phase !== 'playing') return;
  game.time += dt;

  if (game.waveActive) {
    game.waveTime += dt;
    while (game.spawnQueue.length && game.spawnQueue[0].at <= game.waveTime) {
      spawnEnemy(game, game.spawnQueue.shift().type);
    }
    if (!game.spawnQueue.length && !game.enemies.length) {
      game.waveActive = false;
      const bonus = waveBonus(game.wave);
      game.gold += bonus;
      game.goldEarned += bonus;
      game.score += 100 + game.wave * 25;
      if (game.wave >= WAVES.length) {
        game.phase = 'victory';
        game.score += game.lives * 50;
      } else {
        showMessage(game, `Wave ${game.wave} cleared! +${bonus} gold — press Space for the next wave`);
      }
    }
  }

  updateEnemies(game, dt);
  if (game.phase !== 'playing') return; // a leak may have ended the game
  updateTowers(game, dt);
  updateProjectiles(game, dt);
  updateFx(game, dt);
}

// Place a tower. Returns true on success.
export function placeTower(game, type, col, row) {
  const def = TOWERS[type];
  if (!def || game.gold < def.cost) return false;
  const { x, y } = { x: col * CELL + CELL / 2, y: GRID_Y + row * CELL + CELL / 2 };
  game.gold -= def.cost;
  game.towers.push({
    id: game.nextId++,
    type, col, row, x, y,
    level: 1,
    cd: 0,
    flash: 0,
    invested: def.cost,
    kills: 0,
  });
  game.towersBuilt += 1;
  game.score += 5;
  burst(game, x, y, def.color, 10, 90);
  return true;
}

export function upgradeTower(game, tower) {
  if (tower.level >= 3) return false;
  const cost = Math.round(TOWERS[tower.type].cost * (tower.level === 1 ? 0.8 : 1.2));
  if (game.gold < cost) return false;
  game.gold -= cost;
  tower.invested += cost;
  tower.level += 1;
  burst(game, tower.x, tower.y, '#ffd166', 14, 110);
  return true;
}

export function sellTower(game, tower) {
  const refund = Math.round(tower.invested * 0.7);
  game.gold += refund;
  game.towers = game.towers.filter((t) => t !== tower);
  if (game.selectedTower === tower) game.selectedTower = null;
  burst(game, tower.x, tower.y, '#c9a886', 8, 70);
  return refund;
}
