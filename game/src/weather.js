// weather.js — Solmar City weather: clear skies, light rain and heavy rain.
// Rain is a particle storm that follows the player, the roads darken and
// shine when wet, and grip falls — cars slide wider and bikes get twitchy.
// Press T to cycle the weather; the sky also rolls its own dice every couple
// of minutes. Shot mode always stays clear so screenshots are deterministic.

import * as THREE from 'three';

const MODES = ['clear', 'light', 'heavy', 'haze', 'snow'];
const MODE_LABEL = { clear: 'Clear skies', light: 'Light rain', heavy: 'Heavy rain', haze: 'Golden haze', snow: 'Snowfall' };
const DRY_ROAD = new THREE.Color(0x2e3138);
const WET_ROAD = new THREE.Color(0x1c2126);
const RAIN_COUNT = 900;
const SNOW_COUNT = 700;     // v6: fat slow flakes for the mountain and photo mode
const RAIN_BOX = 70;      // the storm box around the player, in world units
const RAIN_HEIGHT = 34;

export function createWeather(G) {
  const weather = {
    mode: 'clear',
    modeIndex: 0,
    intensity: 0,        // 0 dry .. 1 heaviest, eased toward the mode target
    grip: 1,             // 1 dry .. 0.68 heavy rain (read by vehicles.js)
    chop: 0.1,           // v3: sea swell 0.1 calm .. 0.5 heavy rain (read by boats.js)
    // v5: golden haze — a warm low fog that closes the horizon. daynight.js
    // reads hazeFactor to pull the fog in; 0 means no haze at all.
    hazeFactor: 0,
    nextAutoChange: 110, // seconds until the sky rolls its own dice
    rainTimer: 0,
    points: null,
    drops: null,
    speeds: null,
    // v6: snowfall — a second cloud of fat slow flakes, plus the factor
    // the day/night cycle reads to whiten the world.
    snowFactor: 0,
    snowPoints: null,
    snowDrops: null,
    snowSpeeds: null,
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
  // v6: the snowfall cloud — same recycling box as the rain, slower falls
  // and a sideways drift so the flakes wander instead of streaking.
  const snowPositions = new Float32Array(SNOW_COUNT * 3);
  const snowSpeeds = new Float32Array(SNOW_COUNT);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPositions[i * 3] = (rng() - 0.5) * RAIN_BOX;
    snowPositions[i * 3 + 1] = rng() * RAIN_HEIGHT;
    snowPositions[i * 3 + 2] = (rng() - 0.5) * RAIN_BOX;
    snowSpeeds[i] = 3 + rng() * 4;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowPoints = new THREE.Points(snowGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.5, transparent: true, opacity: 0,
    depthWrite: false,
  }));
  snowPoints.visible = false;
  snowPoints.frustumCulled = false;
  G.scene.add(snowPoints);
  weather.snowPoints = snowPoints;
  weather.snowDrops = snowPositions;
  weather.snowSpeeds = snowSpeeds;
  // v6: jump straight to a named mode — photo mode and the mountain use it
  // instead of cycling through every mode in between.
  weather.setMode = (mode) => applyMode(G, mode);
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
  // Haze sits at a low intensity of its own: enough to close the horizon,
  // never enough to count as rain.
  const target = w.mode === 'clear' ? 0 : w.mode === 'light' ? 0.5 : w.mode === 'haze' ? 0.35 : w.mode === 'snow' ? 0.45 : 1;
  w.intensity += (target - w.intensity) * Math.min(1, dt * 0.7);
  if (w.intensity < 0.02 && target === 0) w.intensity = 0;
  w.hazeFactor = w.mode === 'haze' ? Math.min(1, w.intensity / 0.35) : 0;
  // v6: snow sits at its own intensity — enough to see the flakes and feel
  // the grip go, never enough to count as rain.
  w.snowFactor = w.mode === 'snow' ? Math.min(1, w.intensity / 0.45) : 0;
  w.grip = 1 - w.intensity * 0.32;
  // v3: the same storm chops up the sea — boats bob harder in heavy rain.
  w.chop = 0.1 + w.intensity * 0.4;

  // Wet roads: darker asphalt while it rains (the city exposes its road
  // material for exactly this).
  if (G.city.roadMat) {
    const wet = w.intensity;
    G.city.roadMat.color.copy(DRY_ROAD).lerp(WET_ROAD, wet * 0.8);
  }

  // Rain sound: a soft hiss that swells with the downpour. Haze is silent.
  if (w.intensity > 0.15 && (w.mode === 'light' || w.mode === 'heavy')) {
    w.rainTimer -= dt;
    if (w.rainTimer <= 0) {
      w.rainTimer = 0.45;
      G.audio.noise(0.4, 0.02 + w.intensity * 0.05, 3200, 'highpass');
    }
  }

  // Snow: fat slow flakes that drift sideways and settle — the mountain
  // weather, and photo mode's favourite. It runs instead of the rain.
  if (w.mode === 'snow') {
    w.points.visible = false;
    const snowing = w.intensity > 0.03;
    w.snowPoints.visible = snowing;
    if (!snowing) {
      w.snowPoints.material.opacity = 0;
      return;
    }
    w.snowPoints.material.opacity = 0.35 + w.intensity * 0.55;
    const px = G.driving ? G.driving.pos.x : G.player.pos.x;
    const pz = G.driving ? G.driving.pos.z : G.player.pos.z;
    const arr = w.snowDrops;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const y = i * 3 + 1;
      arr[y] -= w.snowSpeeds[i] * dt * (0.7 + w.intensity * 0.5);
      // A lazy sideways wander, so the flakes never fall straight.
      arr[i * 3] += Math.sin(G.elapsed * 0.8 + i) * dt * 2;
      if (arr[y] < 0) {
        arr[y] = RAIN_HEIGHT;
        arr[i * 3] = px + (G.rng() - 0.5) * RAIN_BOX;
        arr[i * 3 + 2] = pz + (G.rng() - 0.5) * RAIN_BOX;
      }
      if (arr[i * 3] > px + RAIN_BOX / 2) arr[i * 3] -= RAIN_BOX;
      if (arr[i * 3 + 2] > pz + RAIN_BOX / 2) arr[i * 3 + 2] -= RAIN_BOX;
      if (arr[i * 3 + 2] < pz - RAIN_BOX / 2) arr[i * 3 + 2] += RAIN_BOX;
    }
    w.snowPoints.geometry.attributes.position.needsUpdate = true;
    return;
  }

  // Move the drops. The box is centred on the player, so the storm never
  // runs out of road; drops that hit the ground jump back to the top.
  // Haze has no drops — it is fog, not rain.
  const raining = w.intensity > 0.03 && (w.mode === 'light' || w.mode === 'heavy');
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

// v7: fog banks and hail fronts. The weather gets two new moods. A fog
// bank is a slow, low, drifting wall of white that rolls in off the bay
// and swallows a whole district for a minute — visibility drops, the
// headlights matter, and the minimap becomes the only honest witness.
// A hail front is the sky losing its temper: hard white pellets, a grip
// penalty, and a reason to get under cover, because standing in hail
// hurts and the cars do not like it either.

export function createWeatherV7(G) {
  const w7 = {
    fogBank: null,       // { x, z, radius, life }
    fogTimer: 150,
    hail: false,
    hailTimer: 200,
    hailDamageAt: 0,
    fronts: 0,
  };
  // The fog bank is one big soft sphere, transparent white, that the
  // update moves across the map like weather with somewhere to be.
  const fog = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xd8e4ee, transparent: true, opacity: 0.32 }));
  fog.position.set(0, 12, 0);
  fog.visible = false;
  G.scene.add(fog);
  w7.fogBank = { mesh: fog, x: 0, z: 0, radius: 55, life: 0 };
  G.weatherV7 = w7;
  return w7;
}

export function updateWeatherV7(G, dt) {
  const w7 = G.weatherV7;
  const w = G.weather;
  if (!w7 || !w) return;
  // Fog bank: rolls in every couple of minutes, drifts for a minute,
  // then thins out over the bay.
  w7.fogTimer -= dt;
  const fog = w7.fogBank;
  if (w7.fogTimer <= 0 && fog.life <= 0) {
    w7.fogTimer = 150 + G.rng() * 90;
    fog.life = 60;
    fog.x = -200 + G.rng() * 400;
    fog.z = -200 + G.rng() * 400;
    w7.fronts += 1;
    G.hud.toast('Fog bank rolling in off the bay — visibility is about to get honest.');
  }
  if (fog.life > 0) {
    fog.life -= dt;
    fog.x += (G.config.fogBankSpeed || 6) * dt;
    fog.mesh.position.set(fog.x, 12, fog.z);
    fog.mesh.visible = true;
    const p = G.player.pos;
    const d = Math.hypot(p.x - fog.x, p.z - fog.z);
    if (d < fog.radius) {
      // Inside the bank: the world goes white and close.
      if (G.scene.fog) G.scene.fog.near = 30;
      if (G.scene.fog) G.scene.fog.far = 180;
    } else if (G.scene.fog) {
      G.scene.fog.near = 220;
      G.scene.fog.far = 900;
    }
    if (fog.life <= 0) fog.mesh.visible = false;
  }
  // Hail front: every few minutes the sky turns hard and white.
  w7.hailTimer -= dt;
  if (w7.hailTimer <= 0 && !w7.hail) {
    w7.hailTimer = 240 + G.rng() * 120;
    w7.hail = true;
    w7.hailLife = 35;
    G.hud.toast('HAIL! Hard white pellets — grip is down, get under cover or keep moving.');
  }
  if (w7.hail) {
    w7.hailLife -= dt;
    // Hail hurts to stand in: a little health every second, outdoors.
    if (!G.driving && !G.boating && !G.flying) {
      w7.hailDamageAt -= dt;
      if (w7.hailDamageAt <= 0) {
        w7.hailDamageAt = 1;
        G.health = Math.max(1, G.health - (G.config.hailDamage || 2));
        G.hud.toast('Hail stings! Get in a car or under cover.');
      }
    }
    if (w7.hailLife <= 0) {
      w7.hail = false;
      G.hud.toast('The hail has passed — the streets are white and the sky is sorry.');
    }
  }
}

// v7: the grip the driving model reads — hail is worse than rain, fog
// is just weather, and the mountain snow is its own thing already.
export function weatherGripV7(G) {
  const w7 = G.weatherV7;
  if (!w7) return 1;
  if (w7.hail) return G.config.hailGrip || 0.8;
  return 1;
}

export function weatherV7Summary(G) {
  const w7 = G.weatherV7;
  if (!w7) return 'The sky is quiet.';
  return `${w7.fronts} fog banks · hail ${w7.hail ? 'FALLING NOW' : 'not falling'}.`;
}

// ---- v8: the weather diary and the grip report ---------------------------------
// The v7 weather had fog banks and hail; v8 keeps a diary. Every day's
// weather — the mode, the front, the strikes — is written down, and the
// diary's best page is the driest week and the wettest day, so Mara can
// plan a race around the sky. The grip report is the diary's practical
// side: the current grip number, what is cutting it, and the next hour's
// forecast, in one line for the dashboard.

export function createWeatherDiary(G) {
  if (G.weatherDiary) return G.weatherDiary;
  G.weatherDiary = {
    days: {},
    wettestDay: null,
    wettestRain: 0,
    driestStreak: 0,
    _dryRun: 0,
  };
  return G.weatherDiary;
}

export function updateWeatherDiary(G, dt) {
  const diary = G.weatherDiary;
  const w = G.weather;
  if (!diary || !w) return;
  const day = Math.floor(G.elapsed / 86400) + 1;
  const rainy = w.mode === 'light' || w.mode === 'heavy';
  const entry = diary.days[day] || { mode: w.mode, rain: 0, fronts: 0 };
  entry.mode = w.mode;
  if (rainy) entry.rain += dt;
  const w8 = G.weatherV8;
  if (w8) entry.fronts = w8.frontPassed;
  diary.days[day] = entry;
  if (entry.rain > diary.wettestRain) {
    diary.wettestRain = entry.rain;
    diary.wettestDay = day;
  }
  if (!rainy) {
    diary._dryRun += dt;
    diary.driestStreak = Math.max(diary.driestStreak, diary._dryRun / 86400);
  } else {
    diary._dryRun = 0;
  }
}

export function gripReportV8(G) {
  const w = G.weather;
  if (!w) return 'No weather to report.';
  const grip = w.grip || 1;
  const cause = w.mode === 'heavy' ? 'heavy rain' : w.mode === 'light' ? 'light rain' : w.mode === 'snow' ? 'snow' : w.mode === 'haze' ? 'haze' : 'dry asphalt';
  const w8 = G.weatherV8;
  const next = w8 ? `Next: ${w8.forecast}` : '';
  return `Grip ${(grip * 100).toFixed(0)}% — ${cause}. ${next}`;
}

export function weatherDiarySummary(G) {
  const diary = G.weatherDiary;
  if (!diary) return 'Weather diary not kept yet.';
  const days = Object.keys(diary.days).length;
  return `${days} days logged · wettest day ${diary.wettestDay === null ? '—' : 'day ' + diary.wettestDay + ' (' + Math.round(diary.wettestRain / 60) + ' min of rain)'} · driest streak ${diary.driestStreak.toFixed(1)} days.`;
}
