// weather.js — Solmar City weather: clear skies, light rain and heavy rain.
// Rain is a particle storm that follows the player, the roads darken and
// shine when wet, and grip falls — cars slide wider and bikes get twitchy.
// Press T to cycle the weather; the sky also rolls its own dice every couple
// of minutes. Shot mode always stays clear so screenshots are deterministic.

import * as THREE from 'three';

const MODES = ['clear', 'light', 'heavy'];
const MODE_LABEL = { clear: 'Clear skies', light: 'Light rain', heavy: 'Heavy rain' };
const DRY_ROAD = new THREE.Color(0x2e3138);
const WET_ROAD = new THREE.Color(0x1c2126);
const RAIN_COUNT = 900;
const RAIN_BOX = 70;      // the storm box around the player, in world units
const RAIN_HEIGHT = 34;

export function createWeather(G) {
  const weather = {
    mode: 'clear',
    modeIndex: 0,
    intensity: 0,        // 0 dry .. 1 heaviest, eased toward the mode target
    grip: 1,             // 1 dry .. 0.68 heavy rain (read by vehicles.js)
    nextAutoChange: 110, // seconds until the sky rolls its own dice
    rainTimer: 0,
    points: null,
    drops: null,
    speeds: null,
  };
  // One Points cloud for every drop: positions recycle inside a box that
  // follows the player, so the storm is endless and cheap.
  const positions = new Float32Array(RAIN_COUNT * 3);
  const speeds = new Float32Array(RAIN_COUNT);
  const rng = G.rng;
  for (let i = 0; i < RAIN_COUNT; i++) {
    positions[i * 3] = (rng() - 0.5) * RAIN_BOX;
    positions[i * 3 + 1] = rng() * RAIN_HEIGHT;
    positions[i * 3 + 2] = (rng() - 0.5) * RAIN_BOX;
    speeds[i] = 22 + rng() * 14;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xaac4d8, size: 0.22, transparent: true, opacity: 0,
    depthWrite: false,
  }));
  points.visible = false;
  points.frustumCulled = false;
  G.scene.add(points);
  weather.points = points;
  weather.drops = positions;
  weather.speeds = speeds;
  G.weather = weather;
  return weather;
}

function applyMode(G, mode) {
  const w = G.weather;
  w.mode = mode;
  w.modeIndex = MODES.indexOf(mode);
  G.hud.toast(`Weather: ${MODE_LABEL[mode]}.`);
  if (mode === 'clear') G.hud.toast('Weather: clear skies. The roads are dry again.');
}

export function cycleWeather(G) {
  const w = G.weather;
  const next = MODES[(w.modeIndex + 1) % MODES.length];
  applyMode(G, next);
}

export function updateWeather(G, dt) {
  const w = G.weather;
  // Manual toggle.
  if (G.mode === 'playing' && G.input.pressed('weather')) {
    cycleWeather(G);
  }
  // The sky rolls its own dice — never during a screenshot pose.
  if (!G.shot && G.mode === 'playing') {
    w.nextAutoChange -= dt;
    if (w.nextAutoChange <= 0) {
      w.nextAutoChange = 100 + G.rng() * 70;
      const roll = G.rng();
      if (w.mode === 'clear' && roll < 0.4) applyMode(G, roll < 0.2 ? 'light' : 'heavy');
      else if (w.mode !== 'clear' && roll < 0.5) applyMode(G, 'clear');
    }
  }
  // Ease the intensity toward the mode's target so rain fades in and out.
  const target = w.mode === 'clear' ? 0 : w.mode === 'light' ? 0.5 : 1;
  w.intensity += (target - w.intensity) * Math.min(1, dt * 0.7);
  if (w.intensity < 0.02 && target === 0) w.intensity = 0;
  w.grip = 1 - w.intensity * 0.32;

  // Wet roads: darker asphalt while it rains (the city exposes its road
  // material for exactly this).
  if (G.city.roadMat) {
    const wet = w.intensity;
    G.city.roadMat.color.copy(DRY_ROAD).lerp(WET_ROAD, wet * 0.8);
  }

  // Rain sound: a soft hiss that swells with the downpour.
  if (w.intensity > 0.15) {
    w.rainTimer -= dt;
    if (w.rainTimer <= 0) {
      w.rainTimer = 0.45;
      G.audio.noise(0.4, 0.02 + w.intensity * 0.05, 3200, 'highpass');
    }
  }

  // Move the drops. The box is centred on the player, so the storm never
  // runs out of road; drops that hit the ground jump back to the top.
  const raining = w.intensity > 0.03;
  w.points.visible = raining;
  if (!raining) {
    w.points.material.opacity = 0;
    return;
  }
  w.points.material.opacity = 0.28 + w.intensity * 0.5;
  const px = G.driving ? G.driving.pos.x : G.player.pos.x;
  const pz = G.driving ? G.driving.pos.z : G.player.pos.z;
  const arr = w.drops;
  const fall = w.intensity;
  for (let i = 0; i < RAIN_COUNT; i++) {
    const y = i * 3 + 1;
    arr[y] -= w.speeds[i] * dt * (0.7 + fall * 0.5);
    // A slight wind slant, stronger in heavy rain.
    arr[i * 3] += dt * (2 + fall * 5);
    if (arr[y] < 0) {
      arr[y] = RAIN_HEIGHT;
      arr[i * 3] = px + (G.rng() - 0.5) * RAIN_BOX;
      arr[i * 3 + 2] = pz + (G.rng() - 0.5) * RAIN_BOX;
    }
    // Keep the box centred: drops that drifted out slide back in.
    if (arr[i * 3] > px + RAIN_BOX / 2) arr[i * 3] -= RAIN_BOX;
    if (arr[i * 3 + 2] > pz + RAIN_BOX / 2) arr[i * 3 + 2] -= RAIN_BOX;
    if (arr[i * 3 + 2] < pz - RAIN_BOX / 2) arr[i * 3 + 2] += RAIN_BOX;
  }
  w.points.geometry.attributes.position.needsUpdate = true;
  // The whole cloud rides with the player.
  w.points.position.set(0, 0, 0);
}
