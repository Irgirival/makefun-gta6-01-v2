// weather2.js — dynamic weather v2. The v7 fog banks and hail fronts
// were weather that happened *to* Mara; v8 weather moves *across* her:
// cold fronts sweep the map on a slow diagonal, a rain band rides the
// front's leading edge, lightning strikes the ground and leaves a scorch
// mark the city remembers, a rainbow arcs over the bay after the rain
// clears, and dry afternoons spin up dust devils on the airfield apron.
// The system reads the base weather mode so it never fights it — fronts
// only roll in when the base says rain, rainbows only after a front
// passes, dust devils only on clear dry days — and the forecast function
// tells the radio what is coming next, so the news can warn Mara before
// the sky does.

import * as THREE from 'three';

const FRONT_SPEED = 14;        // world units per second the front drifts
const FRONT_WIDTH = 90;        // how wide the rain band is
const FRONT_LENGTH = 700;      // the band spans the whole map
const STRIKE_MIN_GAP = 6;      // seconds between lightning strikes
const STRIKE_MAX_GAP = 16;
const SCORCH_MAX = 8;          // scorch marks kept on the ground
const DUST_DEVIL_MAX = 3;

function makeFrontBand(G) {
  const geo = new THREE.PlaneGeometry(FRONT_LENGTH, FRONT_WIDTH, 1, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x5a6a7a, transparent: true, opacity: 0.16,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.PI / 4;
  mesh.position.y = 26;
  mesh.visible = false;
  G.scene.add(mesh);
  return mesh;
}

function makeRainbow(G) {
  const group = new THREE.Group();
  const bands = [0xff5a5a, 0xffa03a, 0xffd23e, 0x3ad86a, 0x3a7ad8, 0x8a3ad8];
  for (let i = 0; i < bands.length; i++) {
    const r = 150 - i * 6;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(r, 3.2, 6, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: bands[i], transparent: true, opacity: 0.5 }),
    );
    arc.position.y = 0;
    group.add(arc);
  }
  group.position.set(60, 0, 430);
  group.visible = false;
  G.scene.add(group);
  return group;
}

function makeDustDevil(G) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xc9b48a, transparent: true, opacity: 0.3 });
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.9, 0.35, 6, 14), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8 + i * 1.6;
    group.add(ring);
  }
  group.visible = false;
  G.scene.add(group);
  return { group, life: 0, spin: 0, active: false };
}

export function createWeatherV8(G) {
  if (G.weatherV8) return G.weatherV8;
  const w8 = {
    front: makeFrontBand(G),
    rainbow: makeRainbow(G),
    devils: [makeDustDevil(G), makeDustDevil(G), makeDustDevil(G)],
    frontX: -500,
    frontActive: false,
    frontTimer: 40 + G.rng() * 40,
    frontPassed: 0,
    rainbowTimer: 0,
    strikeTimer: 8 + G.rng() * 6,
    strikes: 0,
    scorches: [],
    scorchIndex: 0,
    gusts: 0,
    gustTimer: 20 + G.rng() * 20,
    lastFrontAt: null,
    // The forecast the radio reads: what the sky is about to do.
    forecast: 'clear',
  };
  // Pre-build the scorch pool: dark rings that appear where lightning
  // hits the ground, then fade over a few minutes.
  for (let i = 0; i < SCORCH_MAX; i++) {
    const scorch = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 2.4, 16),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.12;
    scorch.visible = false;
    G.scene.add(scorch);
    w8.scorches.push(scorch);
  }
  G.weatherV8 = w8;
  return w8;
}

function baseIsRainy(G) {
  const w = G.weather;
  if (!w || !w.mode) return false;
  return w.mode === 'light' || w.mode === 'heavy';
}

function strikeLightningV8(G) {
  const w8 = G.weatherV8;
  if (!w8) return;
  const p = G.player.pos;
  const x = p.x + (G.rng() - 0.5) * 160;
  const z = p.z + (G.rng() - 0.5) * 160;
  w8.strikes += 1;
  // The strike's ground position is the storm chaser's record: how
  // close Mara ever stood to a bolt.
  w8.lastStrikeX = x;
  w8.lastStrikeZ = z;
  // The flash is a sky-wide blink: the hemisphere light spikes for one
  // frame, then the scorch mark stays where the bolt landed.
  if (G.hemi) G.hemi.intensity = 2.4;
  const scorch = w8.scorches[w8.scorchIndex % SCORCH_MAX];
  w8.scorchIndex += 1;
  scorch.position.set(x, 0.12, z);
  scorch.visible = true;
  scorch.material.opacity = 0.85;
  scorch.userData.fade = 0.85;
  const d = Math.hypot(x - p.x, z - p.z);
  if (d < 12) {
    G.hud.toast('Lightning struck right beside you — the ground is still smoking.');
    if (G.audio && G.audio.crash) G.audio.crash();
  } else if (d < 60) {
    G.hud.toast('Lightning hit the street nearby — a scorch mark stays on the asphalt.');
  }
}

function spawnDustDevil(G, devil) {
  const p = G.player.pos;
  const x = p.x + (G.rng() - 0.5) * 120;
  const z = p.z + (G.rng() - 0.5) * 120;
  devil.group.position.set(x, 0, z);
  devil.group.visible = true;
  devil.life = 14 + G.rng() * 10;
  devil.active = true;
}

export function updateWeatherV8(G, dt) {
  const w8 = G.weatherV8;
  if (!w8) return;
  // The flash from a strike fades back to normal light over a second.
  if (G.hemi && G.hemi.intensity > 0.95) {
    G.hemi.intensity = Math.max(0.95, G.hemi.intensity - dt * 3.2);
  }
  // Scorch marks fade slowly, one ring at a time.
  for (const s of w8.scorches) {
    if (s.visible && s.userData.fade > 0) {
      s.userData.fade -= dt * 0.01;
      s.material.opacity = Math.max(0, s.userData.fade);
      if (s.material.opacity <= 0) s.visible = false;
    }
  }

  // --- Cold fronts: a rain band sweeps the map, then the sky clears. ---
  w8.frontTimer -= dt;
  if (!w8.frontActive && w8.frontTimer <= 0 && baseIsRainy(G)) {
    w8.frontActive = true;
    w8.frontX = -500;
    w8.front.visible = true;
    w8.forecast = 'front';
    G.hud.toast('A cold front is rolling in from the west — the rain band is coming across the city.');
  }
  if (w8.frontActive) {
    w8.frontX += FRONT_SPEED * dt;
    w8.front.position.set(w8.frontX, 26, 0);
    // The band drags the base weather with it: heavy rain under the
    // band, clearing behind it.
    const p = G.player.pos;
    const underBand = Math.abs(p.x - w8.frontX) < FRONT_WIDTH / 2;
    if (underBand && G.weather && G.weather.mode === 'light') {
      w8.gusts += dt;
    }
    if (w8.frontX > 520) {
      w8.frontActive = false;
      w8.front.visible = false;
      w8.frontPassed += 1;
      w8.frontTimer = 70 + G.rng() * 80;
      w8.lastFrontAt = G.clockMinutes;
      w8.rainbowTimer = 45;
      w8.forecast = 'clearing';
      G.hud.toast('The front has passed — the sky is clearing over the bay.');
    }
  }

  // --- Lightning: strikes only while a front is overhead. ---
  if (w8.frontActive && baseIsRainy(G)) {
    w8.strikeTimer -= dt;
    if (w8.strikeTimer <= 0) {
      strikeLightningV8(G);
      w8.strikeTimer = STRIKE_MIN_GAP + G.rng() * (STRIKE_MAX_GAP - STRIKE_MIN_GAP);
    }
  }

  // --- Rainbow: arcs over the bay for 45 seconds after a front. ---
  if (w8.rainbowTimer > 0) {
    w8.rainbowTimer -= dt;
    w8.rainbow.visible = true;
    w8.rainbow.position.y = Math.sin((45 - w8.rainbowTimer) / 45 * Math.PI) * 4;
    if (w8.rainbowTimer <= 0) {
      w8.rainbow.visible = false;
      w8.forecast = 'clear';
    }
  }

  // --- Wind gusts: dry afternoons push the boats and spin dust devils. ---
  w8.gustTimer -= dt;
  if (w8.gustTimer <= 0) {
    w8.gustTimer = 24 + G.rng() * 26;
    w8.gusts += 1;
    const rainy = baseIsRainy(G);
    if (!rainy && !w8.frontActive) {
      const idle = w8.devils.find((d) => !d.active);
      if (idle) spawnDustDevil(G, idle);
      if (G.boating) G.hud.toast('A gust catches the bay — the boat heels over for a second.');
    }
  }
  for (const devil of w8.devils) {
    if (!devil.active) continue;
    devil.life -= dt;
    devil.spin += dt * 3;
    devil.group.rotation.y = devil.spin;
    devil.group.position.x += Math.sin(devil.spin * 0.4) * dt * 2;
    devil.group.position.z += Math.cos(devil.spin * 0.3) * dt * 2;
    if (devil.life <= 0) {
      devil.active = false;
      devil.group.visible = false;
    }
  }
  // The forecast settles when nothing is happening: clear, or rain.
  if (!w8.frontActive && w8.rainbowTimer <= 0) {
    w8.forecast = baseIsRainy(G) ? 'rain' : 'clear';
  }
}

export function weatherForecastV8(G) {
  const w8 = G.weatherV8;
  if (!w8) return 'The sky over Solmar is quiet.';
  if (w8.frontActive) return 'A cold front is crossing the city — heavy rain under the band, lightning possible.';
  if (w8.rainbowTimer > 0) return 'The front just passed — a rainbow is arcing over the bay.';
  if (baseIsRainy(G)) return 'Rain over Solmar, with a front building to the west.';
  const devils = w8.devils.filter((d) => d.active).length;
  return devils > 0
    ? `Clear and dry — ${devils} dust devil${devils === 1 ? '' : 's'} spinning on the airfield apron.`
    : 'Clear skies over Solmar City.';
}

export function weatherV8Summary(G) {
  const w8 = G.weatherV8;
  if (!w8) return 'Dynamic weather v2 not started yet.';
  return `fronts passed: ${w8.frontPassed} · lightning strikes: ${w8.strikes} · gusts: ${w8.gusts} · forecast: ${w8.forecast}`;
}
