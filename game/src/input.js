// input.js — keyboard + mouse state. One object, updated by listeners, read
// by player.js, vehicles.js and combat.js. Pointer lock is requested on the
// canvas click; mouse-look also works as a drag when lock is unavailable
// (headless / screenshot runs), so the game is playable either way.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    mouseDown: false,
    mouseClicked: false,   // consumed once per frame by combat.js
    locked: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  const KEYMAP = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    Space: 'jump',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    KeyE: 'enter',
    KeyF: 'punch',
    KeyQ: 'weapon',
    KeyR: 'reload',
    KeyJ: 'taxi',
    KeyC: 'courier',
    KeyG: 'race',          // v3: street racing at the plaza start banner
    KeyU: 'paint',         // v3: garage repaint at Vic's garage
    KeyI: 'engine',        // v3: garage engine upgrade
    KeyO: 'armor',         // v3: garage armor plating
    KeyN: 'radio',         // v3: cycle the radio station
    KeyV: 'vigilante',     // v3: take a vigilante contract
    KeyY: 'neon',          // v3: garage neon underglow
    KeyT: 'weather',
    KeyM: 'mute',
    KeyP: 'pause', Escape: 'pause',
  };

  // Edge-triggered actions live in their own queue: a quick tap must still
  // be seen by the next frame even if keyup already fired. The queue is
  // cleared at the end of each frame (see endFrame), never by keyup.
  const pressedQueue = new Set();

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      if (!e.repeat) {
        input.keys.add(action);
        pressedQueue.add(action);
      }
      if (action === 'jump' || action === 'pause') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('click', () => {
    if (!input.locked && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch (err) { /* drag fallback */ }
    }
  });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (e) => {
    if (input.locked) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    } else if (input.dragging) {
      input.mouseDX += e.clientX - input.lastX;
      input.mouseDY += e.clientY - input.lastY;
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.mouseClicked = true;
    input.dragging = true;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    if (e.button === 2) input.keys.add('aim');
  });
  window.addEventListener('mouseup', (e) => {
    input.mouseDown = false;
    input.dragging = false;
    if (e.button === 2) input.keys.delete('aim');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Edge-triggered actions: true once on the frame the key went down.
  // The first reader in a frame consumes the press.
  input.pressed = (action) => {
    if (pressedQueue.has(action)) {
      pressedQueue.delete(action);
      return true;
    }
    return false;
  };
  input.down = (action) => input.keys.has(action);

  // Called at the end of each frame: mouse deltas, clicks and the pressed
  // queue are per-frame.
  input.endFrame = () => {
    input.mouseDX = 0;
    input.mouseDY = 0;
    input.mouseClicked = false;
    pressedQueue.clear();
  };

  return input;
}
