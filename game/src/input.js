// input.js — SALERO. Keyboard + mouse, one job: turn raw events into the small
// input object the sim consumes each fixed step. Edge detection (pressed this
// frame) lives here so the sim never sees DOM events.

// Movement keys, shared by keyboard play and the click-to-walk fallback.
export function isMoveKey(code) {
  return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code);
}

export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let click = null;
  return {
    keys,
    pressed,
    get click() {
      return click;
    },
    set click(v) {
      click = v;
    },
    attach(canvas) {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        if (!e.repeat) pressed.add(e.code);
        keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => keys.delete(e.code));
      canvas.addEventListener('mousedown', (e) => {
        const r = canvas.getBoundingClientRect();
        click = {
          x: ((e.clientX - r.left) / r.width) * 1280,
          y: ((e.clientY - r.top) / r.height) * 720,
        };
      });
      window.addEventListener('blur', () => keys.clear());
    },
    // Build the sim input for this step, then clear the edge set.
    poll() {
      const out = {
        up: keys.has('KeyW') || keys.has('ArrowUp'),
        down: keys.has('KeyS') || keys.has('ArrowDown'),
        left: keys.has('KeyA') || keys.has('ArrowLeft'),
        right: keys.has('KeyD') || keys.has('ArrowRight'),
        interact: keys.has('KeyE') || keys.has('Space'),
        interactPressed: pressed.has('KeyE') || pressed.has('Space'),
        enterPressed: pressed.has('Enter'),
        pausePressed: pressed.has('KeyP'),
        mutePressed: pressed.has('KeyM'),
        click: this.click,
      };
      pressed.clear();
      this.click = null;
      return out;
    },
  };
}
