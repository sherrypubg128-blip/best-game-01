// All canvas drawing: the starfield background, the arena, every entity, the
// HUD, and the title / pause / win / game-over screens. Nothing here changes
// game state; it only reads the world.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const ARENA = CONFIG.arena;

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Fixed starfield, seeded so it never shimmers between runs.
    const rng = makeRng(424242);
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: rng.range(0, CONFIG.width),
        y: rng.range(0, CONFIG.height),
        r: rng.range(0.5, 1.8),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.4, 1.6),
        layer: rng.int(0, 2),
      });
    }
    // Pre-rendered nebula blobs, painted once into an offscreen canvas.
    this.nebula = document.createElement('canvas');
    this.nebula.width = CONFIG.width;
    this.nebula.height = CONFIG.height;
    const nctx = this.nebula.getContext('2d');
    const blobs = [
      { x: 220, y: 180, r: 300, c: 'rgba(93, 80, 255, 0.10)' },
      { x: 1080, y: 520, r: 340, c: 'rgba(255, 93, 122, 0.08)' },
      { x: 700, y: 120, r: 260, c: 'rgba(93, 242, 255, 0.07)' },
      { x: 900, y: 640, r: 280, c: 'rgba(200, 107, 255, 0.08)' },
    ];
    for (const b of blobs) {
      const g = nctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.c);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      nctx.fillStyle = g;
      nctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  }

  render(world, now) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawBackground(now);
    this.drawArenaFrame();
    if (world.state === 'title') {
      this.drawEntities(world, now, false);
      this.drawTitle(world, now);
    } else {
      this.drawEntities(world, now, true);
      this.drawHUD(world);
      if (world.banner) this.drawBanner(world);
      if (world.state === 'paused') this.drawPaused();
      if (world.state === 'win') this.drawWin(world);
      if (world.state === 'gameover') this.drawGameOver(world);
    }
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${world.flash * 0.28})`;
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }
    ctx.restore();
  }

  drawBackground(now) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, '#0a0e24');
    g.addColorStop(0.55, CONFIG.colors.bg);
    g.addColorStop(1, '#0b0618');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.drawImage(this.nebula, 0, 0);
    for (const s of this.stars) {
      const tw = 0.45 + 0.55 * Math.sin(now * s.speed + s.phase);
      ctx.globalAlpha = tw * (0.35 + s.layer * 0.25);
      ctx.fillStyle = '#cfe6ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint grid so motion and distance read at a glance.
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 80) {
      ctx.moveTo(x, ARENA.y);
      ctx.lineTo(x, ARENA.y + ARENA.h);
    }
    for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 80) {
      ctx.moveTo(ARENA.x, y);
      ctx.lineTo(ARENA.x + ARENA.w, y);
    }
    ctx.stroke();
  }

  drawArenaFrame() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(93, 242, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  }

  drawEntities(world, now, showPlayer) {
    const ctx = this.ctx;
    for (const s of world.shards) this.drawShard(s, now);
    for (const p of world.powerups) this.drawPowerUp(p, now);
    for (const e of world.enemies) this.drawEnemy(e, now);
    if (showPlayer && world.state !== 'gameover') this.drawPlayer(world.player, now);
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawShard(s, now) {
    const ctx = this.ctx;
    const pulse = 1 + 0.18 * Math.sin(s.phase);
    const r = s.radius * pulse;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.phase * 0.4);
    ctx.shadowColor = CONFIG.colors.shard;
    ctx.shadowBlur = 14;
    ctx.fillStyle = CONFIG.colors.shard;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(r * 0.32, 0);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r * 0.32, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(e, now) {
    const ctx = this.ctx;
    const grow = Math.min(1, e.spawnT * 4);
    const r = e.radius * grow;
    if (r <= 0.5) return;
    const color = CONFIG.colors[e.kind];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.85)';
    ctx.lineWidth = 2.5;
    if (e.kind === 'drifter') {
      // Spiked void mine.
      ctx.rotate(now * 0.6 + e.phase);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * 0.55;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'hunter') {
      ctx.rotate(Math.atan2(e.vy, e.vx));
      ctx.beginPath();
      ctx.moveTo(r * 1.15, 0);
      ctx.lineTo(-r * 0.8, r * 0.75);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(-r * 0.8, -r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(r * 0.25, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Spinner: a turning diamond on a faint orbit ring.
      ctx.strokeStyle = 'rgba(200, 107, 255, 0.25)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, e.orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.rotate(now * 1.8 + e.phase);
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(10, 8, 24, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.8, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayer(p, now) {
    const ctx = this.ctx;
    if (p.invuln > 0 && Math.floor(now * 14) % 2 === 0 && !p.dashing) return; // blink while invulnerable
    ctx.save();
    // Engine trail.
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const f = i / p.trail.length;
      ctx.globalAlpha = f * 0.35;
      ctx.fillStyle = CONFIG.colors.player;
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.radius * (0.3 + f * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = CONFIG.colors.player;
    ctx.shadowBlur = p.dashing ? 30 : 18;
    ctx.fillStyle = '#0e2a33';
    ctx.strokeStyle = CONFIG.colors.player;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.radius * 1.4, 0);
    ctx.lineTo(-p.radius * 0.9, p.radius * 0.95);
    ctx.lineTo(-p.radius * 0.45, 0);
    ctx.lineTo(-p.radius * 0.9, -p.radius * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#dffaff';
    ctx.beginPath();
    ctx.arc(p.radius * 0.35, 0, p.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Shield ring.
    if (p.shield) {
      ctx.save();
      ctx.strokeStyle = CONFIG.colors.shield;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(now * 5);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = CONFIG.colors.shield;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawPowerUp(p, now) {
    const ctx = this.ctx;
    const color = CONFIG.colors[p.kind];
    const bob = Math.sin(p.phase) * 3;
    const blink = p.life < 3 ? (Math.floor(now * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(p.x, p.y + bob);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = p.kind === 'shield' ? '◉' : p.kind === 'magnet' ? 'U' : '⚡';
    ctx.fillText(glyph, 0, 1);
    ctx.font = '10px monospace';
    ctx.fillText(p.kind.toUpperCase(), 0, p.radius + 12);
    ctx.restore();
  }

  drawHUD(world) {
    const ctx = this.ctx;
    ctx.textBaseline = 'alphabetic';
    // Score, left.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f4ff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`SCORE ${String(world.score).padStart(6, '0')}`, 28, 40);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#8fa8c8';
    ctx.fillText(`BEST ${world.best}`, 28, 62);
    // Wave + quota, centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8f4ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`WAVE ${Math.max(1, world.wave)} / ${CONFIG.waves.total}`, CONFIG.width / 2, 36);
    const barW = 220;
    const barX = CONFIG.width / 2 - barW / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(barX, 48, barW, 10);
    ctx.fillStyle = CONFIG.colors.shard;
    const quotaFrac = world.quota > 0 ? world.collected / world.quota : 0;
    ctx.fillRect(barX, 48, barW * Math.min(1, quotaFrac), 10);
    ctx.fillStyle = '#8fa8c8';
    ctx.font = '12px monospace';
    ctx.fillText(`SHARDS ${world.collected} / ${world.quota}`, CONFIG.width / 2, 72);
    // Lives, right.
    ctx.textAlign = 'right';
    ctx.font = '24px monospace';
    let hearts = '';
    for (let i = 0; i < CONFIG.lives; i++) hearts += i < world.lives ? '♥' : '♡';
    ctx.fillStyle = '#ff5d7a';
    ctx.fillText(hearts, CONFIG.width - 28, 40);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#8fa8c8';
    ctx.fillText(`TIME ${fmtTime(world.elapsed)}`, CONFIG.width - 28, 62);
    // Combo, under the score.
    if (world.combo >= 2) {
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.colors.shard;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`COMBO x${world.multiplier}  (${world.combo})`, 28, 92);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(28, 100, 120, 6);
      ctx.fillStyle = CONFIG.colors.shard;
      ctx.fillRect(28, 100, 120 * Math.max(0, world.comboTimer / CONFIG.shard.comboWindow), 6);
    }
    // Dash meter, bottom-left inside the arena.
    const p = world.player;
    const dashFrac = p.dashReady ? 1 : 1 - p.dashCooldown / CONFIG.player.dashCooldown;
    ctx.textAlign = 'left';
    ctx.fillStyle = p.dashReady ? CONFIG.colors.player : '#8fa8c8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(p.dashing ? 'DASH!' : p.dashReady ? 'DASH READY — SPACE / CLICK' : 'DASH…', 28, CONFIG.height - 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(28, CONFIG.height - 12, 150, 6);
    ctx.fillStyle = CONFIG.colors.player;
    ctx.fillRect(28, CONFIG.height - 12, 150 * dashFrac, 6);
    // Active power-ups, bottom-right.
    ctx.textAlign = 'right';
    ctx.font = '13px monospace';
    const active = [];
    if (p.shield) active.push('SHIELD');
    if (p.magnet > 0) active.push(`MAGNET ${Math.ceil(p.magnet)}s`);
    if (p.overdrive > 0) active.push(`OVERDRIVE ${Math.ceil(p.overdrive)}s`);
    if (active.length > 0) {
      ctx.fillStyle = CONFIG.colors.shield;
      ctx.fillText(active.join('   '), CONFIG.width - 28, CONFIG.height - 16);
    }
  }

  drawBanner(world) {
    const ctx = this.ctx;
    const b = world.banner;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.t * 2);
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.colors.player;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 54px monospace';
    ctx.fillText(b.text, CONFIG.width / 2, 300);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '18px monospace';
    ctx.fillText(b.sub, CONFIG.width / 2, 336);
    ctx.restore();
  }

  dimScreen(alpha) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(4, 6, 15, ${alpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  drawTitle(world, now) {
    const ctx = this.ctx;
    this.dimScreen(0.45);
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.colors.player;
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 92px monospace';
    ctx.fillText('LUMEN DRIFT', CONFIG.width / 2, 250);
    ctx.shadowBlur = 0;
    ctx.fillStyle = CONFIG.colors.shard;
    ctx.font = '20px monospace';
    ctx.fillText('Collect the light. Dodge the void. Survive 10 waves.', CONFIG.width / 2, 292);
    ctx.fillStyle = '#cfe0f5';
    ctx.font = '16px monospace';
    const lines = [
      'MOVE  —  WASD / ARROW KEYS or MOUSE',
      'DASH  —  SPACE / SHIFT / CLICK  (dash through a void shape to shatter it)',
      'CHAIN SHARDS  —  quick pickups raise the combo up to x8',
      'POWER-UPS  —  SHIELD blocks one hit · MAGNET pulls shards · OVERDRIVE halves dash cooldown',
      'P PAUSE    ·    M MUTE    ·    R RESTART',
    ];
    lines.forEach((line, i) => ctx.fillText(line, CONFIG.width / 2, 350 + i * 28));
    const pulse = 0.65 + 0.35 * Math.sin(now * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('PRESS ENTER OR CLICK TO START', CONFIG.width / 2, 540);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.fillStyle = '#8fa8c8';
      ctx.font = '16px monospace';
      ctx.fillText(`BEST SCORE  ${world.best}`, CONFIG.width / 2, 580);
    }
  }

  drawPaused() {
    this.dimScreen(0.6);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('PAUSED', CONFIG.width / 2, 340);
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '18px monospace';
    ctx.fillText('Press P to resume', CONFIG.width / 2, 380);
  }

  drawWin(world) {
    this.dimScreen(0.55);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.colors.shard;
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('DRIFT COMPLETE!', CONFIG.width / 2, 260);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '22px monospace';
    ctx.fillText(`All 10 waves cleared in ${fmtTime(world.elapsed)}`, CONFIG.width / 2, 310);
    ctx.fillText(`TIME BONUS  +${world.winBonus}`, CONFIG.width / 2, 348);
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = CONFIG.colors.shard;
    ctx.fillText(`FINAL SCORE  ${world.score}`, CONFIG.width / 2, 400);
    if (world.newBest) {
      ctx.fillStyle = CONFIG.colors.shield;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('★ NEW BEST SCORE ★', CONFIG.width / 2, 440);
    }
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '18px monospace';
    ctx.fillText('Press R to play again', CONFIG.width / 2, 500);
  }

  drawGameOver(world) {
    this.dimScreen(0.6);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.colors.drifter;
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffd7de';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('THE LIGHT FADES', CONFIG.width / 2, 260);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '22px monospace';
    ctx.fillText(`The void took your ship on wave ${Math.max(1, world.wave)}`, CONFIG.width / 2, 310);
    ctx.fillText(`SHARDS ${world.collected} / ${world.quota}    ·    TIME ${fmtTime(world.elapsed)}`, CONFIG.width / 2, 348);
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = CONFIG.colors.shard;
    ctx.fillText(`SCORE  ${world.score}`, CONFIG.width / 2, 400);
    ctx.fillStyle = '#8fa8c8';
    ctx.font = '18px monospace';
    ctx.fillText(`BEST  ${world.best}`, CONFIG.width / 2, 440);
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText('Press R to try again', CONFIG.width / 2, 500);
  }
}
