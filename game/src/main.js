// Lumen Drift — bootstrap and game loop.
// Fixed 60 Hz simulation steps, decoupled from the display refresh, so the
// game plays the same on any monitor. Global keys (start / restart / pause /
// mute) are handled here; movement and dash live in world.js.
//
// ?shot=title|play|win|lose renders one frozen frame for the screenshots:
// a real render of the game's own code, from a fixed seed.

import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { World } from './world.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const debug = document.getElementById('debug');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const input = new Input(canvas);
const sound = new SoundEngine();
const world = new World(sound);
const renderer = new Renderer(canvas);

window.addEventListener('error', (e) => {
  debug.textContent = `ERROR: ${e.message}`;
});

function startFromTitle() {
  sound.ensure();
  sound.click();
  world.startGame();
  sound.startMusic();
}

function restart() {
  sound.ensure();
  sound.click();
  world.startGame();
  sound.startMusic();
}

function writeDebug() {
  debug.textContent = JSON.stringify({
    state: world.state,
    score: world.score,
    wave: world.wave,
    lives: world.lives,
    collected: world.collected,
    quota: world.quota,
    shards: world.shards.length,
    enemies: world.enemies.length,
    combo: world.combo,
  });
}

if (shot === 'title' || shot === 'play' || shot === 'win' || shot === 'lose') {
  // One frozen frame: the scene is set up, rendered once, and never advanced.
  // No animation loop starts, so a headless screenshot captures exactly this frame.
  world.setupShot(shot);
  renderer.render(world, 0.5);
  writeDebug();
} else {
  world.setupTitle();
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function frame(now) {
    window.requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (input.consumePressed('Enter') && world.state === 'title') startFromTitle();
    if (input.consumePressed('KeyR') && (world.state === 'win' || world.state === 'gameover')) restart();
    if (input.consumePressed('KeyP') || input.consumePressed('Escape')) {
      if (world.state === 'playing') {
        world.state = 'paused';
        input.consumeClick(); // drop a stale click so it cannot dash on resume
      } else if (world.state === 'paused') {
        world.state = 'playing';
      }
    }
    if (input.consumePressed('KeyM')) sound.setMuted(!sound.muted);
    // Clicks start / restart from menus; during play the world reads them as dashes,
    // so they are only consumed here while a menu is showing.
    if (world.state === 'title' || world.state === 'win' || world.state === 'gameover') {
      if (input.consumeClick()) {
        if (world.state === 'title') startFromTitle();
        else restart();
      }
    }

    if (!world.frozen) {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        world.update(STEP, input);
        acc -= STEP;
        steps += 1;
      }
      if (steps === 5) acc = 0;
    }
    input.endFrame();
    renderer.render(world, now / 1000);
    writeDebug();
  }

  window.requestAnimationFrame(frame);
}
