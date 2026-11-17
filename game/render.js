// Emberfall Keep — rendering.
// Every pixel the player sees, drawn on one Canvas 2D context. No images,
// no fonts from the network: shapes, gradients and system fonts only.

import {
  BAR_H,
  BAR_Y,
  CELL,
  COLS,
  GRID_Y,
  HUD_H,
  PALETTE,
  ROWS,
  towerDamage,
  towerRange,
  TOWERS,
  TOWER_ORDER,
  upgradeCost,
  VIEW_H,
  VIEW_W,
  WAVE_COUNT,
} from './config.js';

// --- layout helpers (shared with input handling) ---------------------------

export function hudLayout() {
  // Buttons on the right of the top bar, left to right.
  const h = 34;
  const y = (HUD_H - h) / 2;
  return {
    sendWave: { x: VIEW_W - 560, y, w: 150, h },
    pause: { x: VIEW_W - 400, y, w: 90, h },
    speed: { x: VIEW_W - 300, y, w: 90, h },
    mute: { x: VIEW_W - 200, y, w: 90, h },
    help: { x: VIEW_W - 100, y, w: 84, h },
  };
}

export function cardLayout() {
  const cards = [];
  const w = 168;
  const h = BAR_H - 16;
  for (let i = 0; i < TOWER_ORDER.length; i++) {
    cards.push({ type: TOWER_ORDER[i], x: 16 + i * (w + 10), y: BAR_Y + 8, w, h });
  }
  return cards;
}

export function towerPanelLayout() {
  return {
    upgrade: { x: VIEW_W - 340, y: BAR_Y + 14, w: 150, h: 34 },
    sell: { x: VIEW_W - 180, y: BAR_Y + 14, w: 150, h: 34 },
  };
}

// --- small drawing helpers --------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- tower and enemy icons --------------------------------------------------

export function drawTowerIcon(ctx, type, x, y, s) {
  const def = TOWERS[type];
  // Stone base.
  ctx.fillStyle = '#3a2c1e';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a4026';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = def.color;
  if (type === 'ember') {
    // Flame teardrop.
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.42);
    ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.05, x, y + s * 0.28);
    ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.05, x, y - s * 0.42);
    ctx.fill();
  } else if (type === 'cinder') {
    // Snare coil: ring with ember dots.
    ctx.beginPath();
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17120e';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'storm') {
    // Orb with a lightning zigzag.
    ctx.beginPath();
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#17120e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.12, y - s * 0.22);
    ctx.lineTo(x + s * 0.08, y - s * 0.02);
    ctx.lineTo(x - s * 0.06, y + s * 0.02);
    ctx.lineTo(x + s * 0.14, y + s * 0.24);
    ctx.stroke();
  } else if (type === 'mortar') {
    // Stubby barrel, angled up.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6);
    ctx.fillRect(-s * 0.12, -s * 0.34, s * 0.24, s * 0.56);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y + s * 0.18, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sun lance: tall crystal.
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.44);
    ctx.lineTo(x + s * 0.2, y);
    ctx.lineTo(x, y + s * 0.44);
    ctx.lineTo(x - s * 0.2, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnemyShape(ctx, e, t) {
  const wob = Math.sin(e.wobble) * 2;
  ctx.save();
  ctx.translate(e.x, e.y + wob * 0.4);
  // Shadow body.
  ctx.fillStyle = e.type === 'boss' ? '#1d1426' : '#241a2e';
  ctx.strokeStyle = '#4a3560';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (e.type === 'skitter') {
    ctx.ellipse(0, 0, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2);
  } else if (e.type === 'wraith') {
    ctx.moveTo(0, -e.radius);
    ctx.quadraticCurveTo(e.radius, 0, 0, e.radius);
    ctx.quadraticCurveTo(-e.radius, 0, 0, -e.radius);
    // Wispy tail.
    ctx.moveTo(-e.radius * 0.6, e.radius * 0.5);
    ctx.quadraticCurveTo(0, e.radius * 1.6 + Math.sin(t * 6 + e.id) * 4, e.radius * 0.6, e.radius * 0.5);
  } else {
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  if (e.type === 'armoured') {
    // Shell plates.
    ctx.strokeStyle = '#6b543a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.62, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.62, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  if (e.type === 'boss') {
    // Horns.
    ctx.fillStyle = '#4a3560';
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.7, -e.radius * 0.55);
    ctx.lineTo(-e.radius * 1.15, -e.radius * 1.25);
    ctx.lineTo(-e.radius * 0.25, -e.radius * 0.85);
    ctx.closePath();
    ctx.moveTo(e.radius * 0.7, -e.radius * 0.55);
    ctx.lineTo(e.radius * 1.15, -e.radius * 1.25);
    ctx.lineTo(e.radius * 0.25, -e.radius * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  // Glowing eyes.
  const eyeColor = e.type === 'wraith' ? '#c084fc' : e.type === 'boss' ? '#ff2e2e' : '#ff5340';
  ctx.fillStyle = eyeColor;
  const ex = e.radius * 0.38;
  const ey = -e.radius * 0.15;
  ctx.beginPath();
  ctx.arc(-ex, ey, Math.max(2, e.radius * 0.14), 0, Math.PI * 2);
  ctx.arc(ex, ey, Math.max(2, e.radius * 0.14), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Health bar when hurt.
  if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    const y = e.y - e.radius - 10;
    ctx.fillStyle = '#120d09';
    ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#ffb347' : '#ff5340';
    ctx.fillRect(e.x - w / 2, y, w * (e.hp / e.maxHp), 4);
  }
}

// --- the board ---------------------------------------------------------------

function drawGround(ctx, game) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? PALETTE.groundA : PALETTE.groundB;
      ctx.fillRect(c * CELL, GRID_Y + r * CELL, CELL, CELL);
    }
  }
  // Path stones.
  for (const key of game.pathTiles) {
    const [c, r] = key.split(',').map(Number);
    const x = c * CELL;
    const y = GRID_Y + r * CELL;
    ctx.fillStyle = PALETTE.path;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = PALETTE.pathEdge;
    ctx.fillRect(x + 1, y + 1, CELL - 2, 3);
    ctx.fillRect(x + 1, y + CELL - 4, CELL - 2, 3);
  }
  // Ember dots along the path centre, for readability.
  ctx.fillStyle = PALETTE.pathGlow;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < game.waypoints.length - 1; i++) {
    const a = game.waypoints[i];
    const b = game.waypoints[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 32; d < len; d += 64) {
      const x = a.x + ((b.x - a.x) / len) * d;
      const y = a.y + ((b.y - a.y) / len) * d;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The Ember Keep at the path's end.
  const kx = (COLS - 1) * CELL + CELL / 2;
  const ky = GRID_Y + 7 * CELL + CELL / 2;
  const pulse = 0.75 + 0.25 * Math.sin((game.animTime || 0) * 3);
  const glow = ctx.createRadialGradient(kx, ky, 4, kx, ky, 70);
  glow.addColorStop(0, `rgba(255, 179, 71, ${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(kx - 70, ky - 70, 140, 140);
  ctx.fillStyle = '#3a2c1e';
  rr(ctx, kx - 26, ky - 18, 52, 44, 6);
  ctx.fill();
  ctx.strokeStyle = '#5a4026';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(kx, ky - 34);
  ctx.quadraticCurveTo(kx + 12, ky - 8, kx, ky + 6);
  ctx.quadraticCurveTo(kx - 12, ky - 8, kx, ky - 34);
  ctx.fill();
}

function drawTowers(ctx, game) {
  for (const t of game.towers) {
    // Range ring for the selected tower or the placement preview.
    if (game.selectedTower === t) {
      ctx.fillStyle = 'rgba(255, 179, 71, 0.08)';
      ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, towerRange(t.type, t.level), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    drawTowerIcon(ctx, t.type, t.x, t.y, 52);
    if (t.flash > 0) {
      ctx.fillStyle = `rgba(255, 230, 150, ${t.flash / 0.09})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t.level > 1) {
      text(ctx, '★'.repeat(t.level - 1), t.x, t.y + 30, 13, '#ffd166', 'center');
    }
  }
  // Placement preview.
  if (game.selectedType && game.hover.col >= 0) {
    const { col, row } = game.hover;
    const cx = col * CELL + CELL / 2;
    const cy = GRID_Y + row * CELL + CELL / 2;
    const def = TOWERS[game.selectedType];
    const ok = game.gold >= def.cost;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = ok ? 'rgba(255, 179, 71, 0.12)' : 'rgba(255, 83, 64, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawTowerIcon(ctx, game.selectedType, cx, cy, 52);
  }
}

function drawProjectiles(ctx, game) {
  for (const p of game.projectiles) {
    if (p.kind === 'mortar') {
      const h = Math.sin(Math.min(p.progress, 1) * Math.PI) * 46;
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.arc(p.x, p.y - h, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 179, 71, 0.5)';
      ctx.beginPath();
      ctx.arc(p.x, p.y - h, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const color = p.kind === 'cinder' ? '#ff8c42' : '#ffb347';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 230, 150, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const b of game.beams) {
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = b.ttl / b.maxTtl;
    ctx.lineWidth = b.width;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    // Jagged lightning for storm beams.
    if (b.width <= 3) {
      const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 26;
      const my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 26;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(p.ttl / p.maxTtl, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.min(f.ttl, 1);
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

// --- HUD and build bar --------------------------------------------------------

function drawButton(ctx, r, label, enabled = true, accent = false) {
  ctx.fillStyle = accent ? '#5a3413' : '#2a1f16';
  rr(ctx, r.x, r.y, r.w, r.h, 7);
  ctx.fill();
  ctx.strokeStyle = enabled ? PALETTE.cardLine : PALETTE.cardDim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 16, enabled ? PALETTE.text : PALETTE.textDim, 'center');
}

function drawHUD(ctx, game) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  text(ctx, 'EMBERFALL KEEP', 16, HUD_H / 2, 20, PALETTE.text);
  text(ctx, `◉ ${game.gold} gold`, 225, HUD_H / 2, 18, PALETTE.gold);
  text(ctx, `♥ ${game.lives} lives`, 365, HUD_H / 2, 18, PALETTE.heart);
  const waveLabel = game.wave === 0 ? 'Wave –/12' : `Wave ${game.wave}/${WAVE_COUNT}`;
  text(ctx, waveLabel, 495, HUD_H / 2, 18, PALETTE.text);
  text(ctx, `Score ${game.score}`, 600, HUD_H / 2, 16, PALETTE.textDim);
  const b = hudLayout();
  const canSend = !game.waveActive && game.wave < WAVE_COUNT && game.phase === 'playing';
  drawButton(ctx, b.sendWave, game.wave === 0 ? '▶ Start Wave' : '▶ Send Wave', canSend, canSend);
  drawButton(ctx, b.pause, game.phase === 'paused' ? '▶ Resume' : '❚❚ Pause', game.phase === 'playing' || game.phase === 'paused');
  drawButton(ctx, b.speed, game.speed === 1 ? 'Speed 1×' : 'Speed 2×', true);
  drawButton(ctx, b.mute, game.muted ? '🔇 Muted' : '🔊 Sound', true);
  drawButton(ctx, b.help, 'How to play', true);
}

function drawBar(ctx, game) {
  ctx.fillStyle = PALETTE.bar;
  ctx.fillRect(0, BAR_Y, VIEW_W, BAR_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, BAR_Y, VIEW_W, 2);
  if (game.selectedTower) {
    const t = game.selectedTower;
    const def = TOWERS[t.type];
    drawTowerIcon(ctx, t.type, 52, BAR_Y + BAR_H / 2, 56);
    text(ctx, `${def.name} — Lv ${t.level}`, 96, BAR_Y + 24, 18, PALETTE.text);
    text(ctx, `Damage ${towerDamage(t.type, t.level)}  •  Range ${Math.round(towerRange(t.type, t.level))}  •  Kills ${t.kills}`, 96, BAR_Y + 52, 14, PALETTE.textDim, 'left', 'normal');
    const p = towerPanelLayout();
    if (t.level < 3) {
      drawButton(ctx, p.upgrade, `⬆ Upgrade ${upgradeCost(t.type, t.level + 1)}g`, game.gold >= upgradeCost(t.type, t.level + 1), true);
    } else {
      drawButton(ctx, p.upgrade, '⬆ Max level', false);
    }
    drawButton(ctx, p.sell, `Sell +${Math.round(t.invested * 0.7)}g`, true);
    text(ctx, 'Click the map to deselect — Esc also works', 96, BAR_Y + 74, 13, PALETTE.cardDim, 'left', 'normal');
    return;
  }
  for (const card of cardLayout()) {
    const def = TOWERS[card.type];
    const afford = game.gold >= def.cost;
    const sel = game.selectedType === card.type;
    ctx.fillStyle = sel ? PALETTE.cardSel : PALETTE.card;
    rr(ctx, card.x, card.y, card.w, card.h, 8);
    ctx.fill();
    ctx.strokeStyle = sel ? '#ffb347' : PALETTE.cardLine;
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.stroke();
    drawTowerIcon(ctx, card.type, card.x + 30, card.y + card.h / 2, 44);
    text(ctx, def.name, card.x + 56, card.y + 20, 15, afford ? PALETTE.text : PALETTE.textDim);
    text(ctx, `${def.cost}g  [${def.key}]`, card.x + 56, card.y + 42, 14, afford ? PALETTE.gold : PALETTE.cardDim);
    text(ctx, def.blurb, card.x + 56, card.y + 60, 12, PALETTE.textDim, 'left', 'normal');
  }
  // Status line in the free space right of the tower cards.
  const statusX = 920;
  if (game.waveActive) {
    const foes = game.enemies.length + game.spawnQueue.length;
    text(ctx, `${foes} foes on the road`, statusX, BAR_Y + 30, 16, PALETTE.text);
    text(ctx, `Wave ${game.wave} of ${WAVE_COUNT} — hold the line`, statusX, BAR_Y + 56, 14, PALETTE.textDim, 'left', 'normal');
  } else if (game.wave < WAVE_COUNT && game.phase === 'playing') {
    text(ctx, `Wave ${game.wave + 1} of ${WAVE_COUNT} awaits — build, then send it`, statusX, BAR_Y + 30, 16, PALETTE.text);
    text(ctx, 'Click a card, then click a tile to build.', statusX, BAR_Y + 56, 14, PALETTE.textDim, 'left', 'normal');
  } else {
    text(ctx, 'Click a card, then click a tile to build.', statusX, BAR_Y + 30, 14, PALETTE.textDim, 'left', 'normal');
    text(ctx, '1–5 pick a tower  •  Space sends a wave', statusX, BAR_Y + 56, 14, PALETTE.textDim, 'left', 'normal');
  }
}

// --- screens -----------------------------------------------------------------

function overlay(ctx, alpha = 0.82) {
  ctx.fillStyle = `rgba(12, 8, 5, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, game) {
  overlay(ctx, 0.72);
  const flick = 0.85 + 0.15 * Math.sin((game.animTime || 0) * 2.2);
  text(ctx, 'EMBERFALL KEEP', VIEW_W / 2, 168, 64, `rgba(255, 179, 71, ${flick})`, 'center');
  text(ctx, 'A tower defense of the last hearth', VIEW_W / 2, 226, 22, PALETTE.text, 'center', 'normal');
  text(ctx, 'Shadow creatures crawl the winding road to snuff out the Ember Keep.', VIEW_W / 2, 262, 17, PALETTE.textDim, 'center', 'normal');
  text(ctx, 'Build ember towers on the open ground. Spend gold, hold the line, survive all 12 waves.', VIEW_W / 2, 290, 17, PALETTE.textDim, 'center', 'normal');
  // Tower roster.
  let x = VIEW_W / 2 - 4 * 90;
  for (const type of TOWER_ORDER) {
    drawTowerIcon(ctx, type, x, 360, 52);
    text(ctx, TOWERS[type].name, x, 398, 14, PALETTE.text, 'center');
    text(ctx, `${TOWERS[type].cost}g`, x, 420, 13, PALETTE.gold, 'center');
    x += 90;
  }
  text(ctx, '▶  CLICK OR PRESS ENTER TO START', VIEW_W / 2, 500, 22, '#ffd166', 'center');
  text(ctx, 'Mouse builds towers  •  1–5 pick a tower  •  Space sends a wave  •  P pauses  •  R restarts', VIEW_W / 2, 544, 15, PALETTE.textDim, 'center', 'normal');
}

function drawEnd(ctx, game, won) {
  overlay(ctx, 0.8);
  if (won) {
    text(ctx, 'THE KEEP STANDS!', VIEW_W / 2, 200, 56, '#ffb347', 'center');
    text(ctx, 'Twelve waves, and the ember still burns.', VIEW_W / 2, 258, 20, PALETTE.text, 'center', 'normal');
  } else {
    text(ctx, 'THE EMBERS FADE…', VIEW_W / 2, 200, 56, '#ff5340', 'center');
    text(ctx, `The shadows took the keep on wave ${game.wave} of ${WAVE_COUNT}.`, VIEW_W / 2, 258, 20, PALETTE.text, 'center', 'normal');
  }
  text(ctx, `Score ${game.score}   •   ${game.kills} foes felled   •   ${game.towersBuilt} towers built   •   ${game.goldEarned} gold earned`, VIEW_W / 2, 330, 18, PALETTE.textDim, 'center', 'normal');
  text(ctx, '↻  PRESS R TO PLAY AGAIN', VIEW_W / 2, 420, 22, '#ffd166', 'center');
}

function drawPaused(ctx) {
  overlay(ctx, 0.6);
  text(ctx, '❚❚ PAUSED', VIEW_W / 2, VIEW_H / 2 - 10, 48, PALETTE.text, 'center');
  text(ctx, 'Space or P to resume  •  R to restart', VIEW_W / 2, VIEW_H / 2 + 44, 17, PALETTE.textDim, 'center', 'normal');
}

function drawHelp(ctx) {
  overlay(ctx, 0.85);
  text(ctx, 'HOW TO PLAY', VIEW_W / 2, 130, 40, '#ffb347', 'center');
  const lines = [
    'Shadows walk the stone road from the left to the Ember Keep on the right.',
    'Click a tower card below, then click open ground to build it. Towers fire on their own.',
    'Foes you slay pay gold. Spend it on more towers — or upgrade one you own.',
    'Click one of your towers to see its range, upgrade it, or sell it back.',
    'If a foe reaches the keep you lose a life. Lose all 20 and the embers fade.',
    'Survive all 12 waves, including the Hollow King, and the keep stands.',
    '',
    'Keys: 1–5 pick a tower • Space send a wave / pause • P pause • R restart • M mute • Esc deselect',
  ];
  lines.forEach((line, i) => text(ctx, line, VIEW_W / 2, 200 + i * 30, 17, PALETTE.textDim, 'center', 'normal'));
  text(ctx, 'Click anywhere to close', VIEW_W / 2, 200 + lines.length * 30 + 20, 16, '#ffd166', 'center');
}

export function draw(ctx, game) {
  drawGround(ctx, game);
  drawTowers(ctx, game);
  for (const e of game.enemies) drawEnemyShape(ctx, e, game.time);
  drawProjectiles(ctx, game);
  drawHUD(ctx, game);
  drawBar(ctx, game);
  if (game.message && game.time < game.messageUntil) {
    ctx.fillStyle = 'rgba(18, 13, 9, 0.85)';
    const w = ctx.measureText(game.message).width + 36;
    rr(ctx, VIEW_W / 2 - w / 2, HUD_H + 10, w, 34, 8);
    ctx.fill();
    text(ctx, game.message, VIEW_W / 2, HUD_H + 28, 15, PALETTE.text, 'center');
  }
  if (game.phase === 'title') drawTitle(ctx, game);
  else if (game.phase === 'victory') drawEnd(ctx, game, true);
  else if (game.phase === 'gameover') drawEnd(ctx, game, false);
  else if (game.phase === 'paused') drawPaused(ctx);
  if (game.showHelp) drawHelp(ctx);
}
