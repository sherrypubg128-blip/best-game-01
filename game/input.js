// Emberfall Keep — input.
// Mouse and keyboard, translated into game actions through callbacks the
// main module supplies. This file knows nothing about the simulation.

import { BAR_Y, GRID_Y, VIEW_H, VIEW_W } from './config.js';
import { cardLayout, hudLayout, towerPanelLayout } from './render.js';
import { tileFromPixel } from './state.js';

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function bindInput(canvas, hooks) {
  const mouse = { x: 0, y: 0 };

  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((ev.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  canvas.addEventListener('mousemove', (ev) => {
    const p = canvasPos(ev);
    mouse.x = p.x;
    mouse.y = p.y;
    hooks.onHover(p.x, p.y);
  });

  canvas.addEventListener('click', (ev) => {
    const p = canvasPos(ev);
    hooks.onClick(p.x, p.y);
  });

  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    hooks.onRightClick();
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    hooks.onKey(ev.key);
  });

  return mouse;
}

// Hit-test a click, in priority order: HUD buttons, build-bar cards, tower
// panel, then the grid. Returns a description the main module acts on.
export function hitTest(x, y, game) {
  const hud = hudLayout();
  for (const [id, r] of Object.entries(hud)) {
    if (inRect(x, y, r)) return { kind: 'hud', id };
  }
  if (y >= BAR_Y && y <= VIEW_H) {
    if (game.selectedTower) {
      const p = towerPanelLayout();
      if (inRect(x, y, p.upgrade)) return { kind: 'upgrade' };
      if (inRect(x, y, p.sell)) return { kind: 'sell' };
      return { kind: 'bar' };
    }
    for (const card of cardLayout()) {
      if (inRect(x, y, card)) return { kind: 'card', type: card.type };
    }
    return { kind: 'bar' };
  }
  if (y >= GRID_Y && y < BAR_Y) {
    const tile = tileFromPixel(x, y);
    if (tile) return { kind: 'tile', col: tile.col, row: tile.row };
  }
  return { kind: 'none' };
}
