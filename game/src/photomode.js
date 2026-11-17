// photomode.js — Mara's camera: press B anywhere in free roam and the
// world freezes while a free orbit camera swings around her. Mouse drag
// orbits, Q cycles the five film filters, R hides or shows the HUD, Space
// snaps a PNG straight to the downloads folder. Every snapshot is counted
// on the career scorecard, and the mode is wired so a screenshot run can
// drive it headlessly through window.__solmar.photomode.

import * as THREE from 'three';

// Five film looks, applied as a CSS filter on the WebGL canvas — the 3D
// scene itself never changes, only how the frame is graded.
const FILTERS = [
  { id: 'solmar-gold', name: 'Solmar Gold', css: 'sepia(0.28) saturate(1.25) contrast(1.06) brightness(1.03)' },
  { id: 'midnight', name: 'Midnight Blue', css: 'brightness(0.82) contrast(1.18) saturate(1.1) hue-rotate(185deg)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.25) brightness(1.05)' },
  { id: 'verde-pop', name: 'Verde Pop', css: 'saturate(1.7) contrast(1.12) brightness(1.02)' },
  { id: 'dawn', name: 'Dawn Haze', css: 'sepia(0.45) saturate(1.1) brightness(1.12) contrast(0.94)' },
  { id: 'clean', name: 'Clean', css: 'none' },
];

const HELP_LINES = [
  'PHOTO MODE — the city is holding still for you.',
  'Drag the mouse to orbit · Scroll the wheel to zoom in and out',
  'Q — next film filter · R — hide / show the HUD · Space — take the shot',
  'B or Esc — back to the streets. The world starts moving again.',
];

export function createPhotoMode(G) {
  const photo = {
    active: false,
    frozen: false,
    yaw: 0,
    pitch: 0.42,
    dist: 9,
    filterIndex: 0,
    hudHidden: false,
    snaps: 0,
    lastSnapAt: -999,
    lastSnapBytes: 0,
    overlay: null,
    filterLabel: null,
  };

  // The help card: one small panel, bottom centre, built once.
  const overlay = document.createElement('div');
  overlay.id = 'photomode';
  overlay.className = 'hidden';
  overlay.style.cssText = [
    'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;',
    'background:rgba(8,12,20,0.78);border:1px solid rgba(255,210,62,0.55);border-radius:10px;',
    'padding:10px 16px;color:#f5e9c8;font-size:13px;line-height:1.5;text-align:center;',
    'pointer-events:none;max-width:640px;',
  ].join('');
  overlay.innerHTML = HELP_LINES.map((l) => `<div>${l}</div>`).join('') +
    '<div id="photoFilter" style="margin-top:4px;color:#ffd23e;font-weight:700"></div>';
  document.body.appendChild(overlay);
  photo.overlay = overlay;
  photo.filterLabel = overlay.querySelector('#photoFilter');

  G.photomode = photo;
  return photo;
}

function currentFilter(G) {
  return FILTERS[G.photomode.filterIndex % FILTERS.length];
}

function applyFilter(G) {
  const f = currentFilter(G);
  const canvas = document.getElementById('scene');
  if (canvas) canvas.style.filter = f.css === 'none' ? '' : f.css;
  if (G.photomode.filterLabel) {
    G.photomode.filterLabel.textContent = `Filter: ${f.name} (${G.photomode.filterIndex + 1}/${FILTERS.length})`;
  }
}

function photoTarget(G) {
  // Orbit the car when Mara is driving, her on foot otherwise, and the boat
  // or jet ski when she is out on the water.
  if (G.driving) return G.driving.pos;
  if (G.boating) return G.boating.pos;
  if (G.jetski) return G.jetski.pos;
  if (G.flying) return G.flying.pos;
  return G.player.pos;
}

export function photoModeCamera(G, dt) {
  const p = G.photomode;
  const target = photoTarget(G);
  // Mouse drag orbits; arrow keys nudge too, for keyboards without a mouse.
  p.yaw -= G.input.mouseDX * 0.005;
  p.pitch = Math.max(0.06, Math.min(1.35, p.pitch + G.input.mouseDY * 0.003));
  if (G.input.down('left')) p.yaw += dt * 1.4;
  if (G.input.down('right')) p.yaw -= dt * 1.4;
  if (G.input.down('forward')) p.dist = Math.max(3, p.dist - dt * 14);
  if (G.input.down('back')) p.dist = Math.min(42, p.dist + dt * 14);
  const cx = target.x + Math.sin(p.yaw) * p.dist * Math.cos(p.pitch);
  const cz = target.z + Math.cos(p.yaw) * p.dist * Math.cos(p.pitch);
  const cy = (target.y || 0) + 1.6 + Math.sin(p.pitch) * p.dist;
  G.camera.position.set(cx, cy, cz);
  G.camera.lookAt(target.x, (target.y || 0) + 1.4, target.z);
}

export function takeSnapshot(G) {
  const p = G.photomode;
  if (G.elapsed - p.lastSnapAt < G.config.photoSnapCooldown) {
    G.hud.toast('The camera is still winding — give it a second.');
    return null;
  }
  p.lastSnapAt = G.elapsed;
  let dataUrl = null;
  try {
    // Force a fresh render so the snapshot holds the current frame, filter
    // and all: the main loop renders after this call, so draw once now.
    G.renderer.render(G.scene, G.camera);
    dataUrl = G.renderer.domElement.toDataURL('image/png');
    p.lastSnapBytes = dataUrl.length;
  } catch (err) {
    G.hud.toast('The snapshot did not come out — the camera jammed.');
    return null;
  }
  p.snaps++;
  G.audio.cameraShutter();
  // A real download for a real player; headless runs just count the bytes.
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `solmar-city-${String(p.snaps).padStart(2, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) { /* headless: the count is the proof */ }
  G.hud.toast(`Snapshot ${p.snaps} saved — ${currentFilter(G).name}, ${Math.round(p.lastSnapBytes / 1024)} KiB.`);
  return dataUrl;
}

export function togglePhotoMode(G) {
  const p = G.photomode;
  if (!p) return;
  if (!p.active) {
    if (G.mode !== 'playing') return;
    if (G.casino && G.casino.open) return; // the casino floor has its own stage
    p.active = true;
    p.frozen = true;
    // Start the orbit behind Mara, matching her current camera.
    p.yaw = G.player.camYaw || 0;
    p.pitch = 0.42;
    p.dist = 9;
    p.hudHidden = false;
    p.overlay.classList.remove('hidden');
    applyFilter(G);
    G.hud.toast('Photo mode — B to leave, Space to snap, Q for filters.');
  } else {
    p.active = false;
    p.frozen = false;
    p.overlay.classList.add('hidden');
    const canvas = document.getElementById('scene');
    if (canvas) canvas.style.filter = '';
    if (p.hudHidden) {
      G.hud.show();
      p.hudHidden = false;
    }
    G.hud.toast('Back on the streets — the city is moving again.');
  }
}

export function updatePhotoMode(G, dt) {
  const p = G.photomode;
  if (!p) return;
  if (G.mode === 'playing' && G.input.pressed('photo')) {
    togglePhotoMode(G);
    return;
  }
  if (!p.active) return;
  // Esc / P also leaves photo mode, so nobody gets stuck behind the lens.
  if (G.input.pressed('pause')) {
    togglePhotoMode(G);
    return;
  }
  if (G.input.pressed('weapon')) {
    p.filterIndex = (p.filterIndex + 1) % FILTERS.length;
    applyFilter(G);
    G.audio.pickup();
    G.hud.toast(`Filter: ${currentFilter(G).name}.`);
  }
  if (G.input.pressed('reload')) {
    p.hudHidden = !p.hudHidden;
    if (p.hudHidden) G.hud.hide();
    else G.hud.show();
    G.hud.toast(p.hudHidden ? 'HUD hidden — just the city.' : 'HUD back on.');
  }
  if (G.input.pressed('jump')) takeSnapshot(G);
  photoModeCamera(G, dt);
}

export function photoModeStatusText(G) {
  const p = G.photomode;
  if (!p) return 'Photo mode — press B';
  return p.active
    ? `Photo mode — ${currentFilter(G).name} · ${p.snaps} snapshot${p.snaps === 1 ? '' : 's'}`
    : `Photo mode — ${p.snaps} snapshot${p.snaps === 1 ? '' : 's'} taken (B to open)`;
}
