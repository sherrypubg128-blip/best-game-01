// Keyboard + mouse input.
// Edge-triggered actions (start, pause, dash, restart) are queued as pressed
// codes and consumed once per frame, so a key held down never double-fires.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.pointer = { x: 0, y: 0, active: false, lastMove: 0 };
    this.clicked = false;
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      // Arrows and Space would scroll the page; the game owns them.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.pointer.y = (e.clientY - r.top) * (canvas.height / r.height);
      this.pointer.active = true;
      this.pointer.lastMove = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.clicked = true;
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumePressed(code) {
    const had = this.pressed.has(code);
    if (had) this.pressed.delete(code);
    return had;
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  endFrame() {
    this.pressed.clear();
  }

  // Unit movement vector from WASD / arrow keys, or zero when none are held.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0, fromKeys: false };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len, fromKeys: true };
  }

  pointerFresh(now) {
    return this.pointer.active && now - this.pointer.lastMove < 2500;
  }
}
