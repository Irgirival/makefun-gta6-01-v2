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
    KeyB: 'photo',         // v5: photo mode (free camera + filters + snapshot)
    KeyL: 'locker',        // v5: safehouse outfit shop + weapon locker
    KeyH: 'suspension',    // v5: garage sport suspension (better handling)
    KeyK: 'nitrotank',     // v5: garage nitro tank (bigger bottle, instant fill)
    // v6: X takes a VIP / parcel job, Z sits at the Verde poker table.
    KeyX: 'vip',
    KeyZ: 'poker',
    KeyT: 'weather',
    KeyM: 'mute',
    Digit7: 'delivery',   // v7: Solmar Express job board
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

// v7: the binding table — the pause menu's help line and any headless
// test that wants to press the right key without guessing. (The Digit7
// delivery binding itself lives in the KEYMAP inside createInput.)
export const V7_BINDINGS = [
  ['W A S D', 'Move / drive'],
  ['Mouse', 'Look around'],
  ['Space', 'Jump (sprint + jump = dodge roll)'],
  ['Shift', 'Sprint / nitro'],
  ['E', 'Enter or exit a car, boat, heli or jet ski'],
  ['F', 'Punch'],
  ['Q', 'Switch weapon'],
  ['R', 'Reload'],
  ['J', 'Taxi job'],
  ['C', 'Courier run'],
  ['G', 'Street race'],
  ['U / I / O', 'Garage: paint / engine / armor'],
  ['H / K', 'Garage: suspension / nitro tank'],
  ['N', 'Cycle radio'],
  ['V', 'Vigilante contract'],
  ['B', 'Photo mode'],
  ['L', 'Safehouse locker'],
  ['X', 'VIP / parcel job'],
  ['Z', 'Poker table'],
  ['T', 'Cycle weather'],
  ['M', 'Mute'],
  ['7', 'Delivery job board'],
  ['P / Esc', 'Pause'],
];

export function bindingHelpText() {
  return V7_BINDINGS.map(([k, what]) => `${k} — ${what}`).join('\n');
}

// v8: the binding table for the new systems. The v8 keys reuse the
// bindings the game already has — no new keys were invented, so the
// table below documents what the old keys do now:
//   7  — delivery board: now shows the Express tier and the boss run
//   T  — cycle weather: now also prints the v8 forecast on the ticker
//   N  — cycle radio: the news desk now reacts to the story
//   B  — photo mode: the walk, the gardens and the eclipse are new shots
//   E  — enter/exit: also boards heli tours and the sunset charter
//   G  — street race: season 3 runs from the same banner
export const V8_BINDINGS = [
  ['7', 'Delivery board — Express tier, boss run, streak'],
  ['T', 'Cycle weather — forecast on the HUD ticker'],
  ['N', 'Cycle radio — news reacts to the story'],
  ['B', 'Photo mode — walk stops, gardens, eclipse'],
  ['E', 'Enter/exit — cars, boats, helis, tours, charter'],
  ['G', 'Street race — season 3 from the same banner'],
  ['X', 'VIP / parcel job — boss deliveries at streak 2+'],
  ['Z', 'Poker table — tournament + craps at the Verde'],
];

export function bindingHelpTextV8() {
  return V8_BINDINGS.map(([k, what]) => `${k} — ${what}`).join('\n');
}

export function bindingHelpTextAll() {
  return `${bindingHelpText()}\n--- v8 ---\n${bindingHelpTextV8()}`;
}
