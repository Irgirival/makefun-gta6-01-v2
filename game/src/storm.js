// storm.js — fog and thunderstorms over Solmar City. The weather
// system only knew clear skies and rain; this adds the weather that
// makes the city feel alive and a little dangerous. Every minute or
// two a storm front rolls in: the fog closes to a few dozen metres,
// lightning forks down near the player, thunder rolls a beat later,
// and the rain hammers down until the front passes. Fog can also roll
// in on its own on a clear morning — a low, slow blanket that burns
// off by midday. While a storm is up, driving is slower and the sea
// is rough; the HUD says so.

import * as THREE from 'three';

const FRONT_GAP_MIN = 70;
const FRONT_GAP_MAX = 150;
const STORM_LEN_MIN = 40;
const STORM_LEN_MAX = 75;
const FOG_LEN_MIN = 50;
const FOG_LEN_MAX = 90;
const BOLT_MIN = 3.5;
const BOLT_MAX = 9;

function makeBolt(G) {
  // A jagged white line from the sky to the rooftops, drawn fresh for
  // every strike so no two bolts ever look alike.
  const pts = [];
  const bx = (G.rng() - 0.5) * 120;
  const bz = (G.rng() - 0.5) * 120;
  const px = G.driving ? G.driving.pos.x : G.player.pos.x;
  const pz = G.driving ? G.driving.pos.z : G.player.pos.z;
  let x = px + bx;
  let z = pz + bz;
  for (let y = 110; y >= 0; y -= 14) {
    pts.push(new THREE.Vector3(x, y, z));
    x += (G.rng() - 0.5) * 22;
    z += (G.rng() - 0.5) * 22;
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.95 }));
  line.visible = false;
  line.frustumCulled = false;
  G.scene.add(line);
  return line;
}

export function createStorm(G) {
  const storm = {
    active: false,          // a thunderstorm is overhead right now
    foggy: false,           // a fog bank is sitting on the city
    timer: 0,               // time left in the current front
    nextFront: 80 + G.rng() * 40,
    boltTimer: 4,
    flash: 0,               // lightning brightness, 1 just after a strike
    bolt: makeBolt(G),
    boltLife: 0,
    fronts: 0,
    strikes: 0,
    savedMode: null,
  };
  G.storm = storm;
  return storm;
}

function strikeLightning(G) {
  const s = G.storm;
  // Rebuild the bolt's shape so every strike is a new fork.
  G.scene.remove(s.bolt);
  s.bolt.geometry.dispose();
  s.bolt = makeBolt(G);
  s.bolt.visible = true;
  s.boltLife = 0.18;
  s.flash = 1;
  s.strikes++;
  // Thunder rolls in a beat after the flash, quieter the further the
  // bolt fell from Mara.
  const delay = 300 + Math.random() * 900;
  setTimeout(() => {
    G.audio.noise(1.4, 0.28, 130);
    G.audio.tone(55, 1.1, 'sine', 0.16, 32);
  }, delay);
}

export function stormStatusText(G) {
  const s = G.storm;
  if (s.active) return `THUNDERSTORM — ${s.strikes} strikes · visibility down · rain hammering`;
  if (s.foggy) return 'Fog bank over the city — drive slow, the roads hide';
  return `Next storm front in ~${Math.max(0, Math.round(s.nextFront))}s · ${s.fronts} fronts weathered`;
}

export function updateStorm(G, dt) {
  const s = G.storm;
  if (!s) return;
  const w = G.weather;

  // A front is due: half the time it is a thunderstorm, half the time
  // a slow fog bank. Never during a screenshot pose.
  if (!s.active && !s.foggy && G.mode === 'playing' && !G.shot) {
    s.nextFront -= dt;
    if (s.nextFront <= 0) {
      s.fronts++;
      if (G.rng() < 0.55) {
        s.active = true;
        s.timer = STORM_LEN_MIN + G.rng() * (STORM_LEN_MAX - STORM_LEN_MIN);
        s.boltTimer = 2 + G.rng() * 2;
        s.savedMode = w.mode;
        w.mode = 'heavy';
        G.hud.showDialogue([
          '⛈ THUNDERSTORM — a front is rolling in off the bay!',
          'Lightning, hammering rain, fog closing in. The sea is rough and the roads are slick.',
          'Ride it out — the front passes in about a minute.',
        ]);
        G.audio.sirenBurst();
      } else {
        s.foggy = true;
        s.timer = FOG_LEN_MIN + G.rng() * (FOG_LEN_MAX - FOG_LEN_MIN);
        G.hud.toast('A fog bank is rolling in off the water — visibility dropping.');
      }
    }
  }

  // Lightning: a strike every few seconds while the storm is up.
  if (s.active) {
    s.timer -= dt;
    s.boltTimer -= dt;
    if (s.boltTimer <= 0) {
      s.boltTimer = BOLT_MIN + G.rng() * (BOLT_MAX - BOLT_MIN);
      strikeLightning(G);
    }
    // The flash lights the whole sky for a blink, then fades.
    if (s.boltLife > 0) {
      s.boltLife -= dt;
      if (s.boltLife <= 0) s.bolt.visible = false;
    }
    if (s.flash > 0) {
      s.flash = Math.max(0, s.flash - dt * 4);
      if (G.sun) G.sun.intensity += s.flash * 2.2;
      if (G.hemi) G.hemi.intensity += s.flash * 0.5;
      G.scene.background.setRGB(0.55 + s.flash * 0.45, 0.62 + s.flash * 0.38, 0.75 + s.flash * 0.25);
    }
    // Fog closes in hard and the rain hammers: grip and chop follow.
    G.scene.fog.near = Math.min(G.scene.fog.near, 55);
    G.scene.fog.far = Math.min(G.scene.fog.far, 330);
    if (w) {
      w.intensity = Math.max(w.intensity, 0.9);
      w.chop = Math.max(w.chop, 0.5);
    }
    if (s.timer <= 0) {
      s.active = false;
      s.bolt.visible = false;
      if (w && s.savedMode) w.mode = s.savedMode;
      s.savedMode = null;
      s.nextFront = FRONT_GAP_MIN + G.rng() * (FRONT_GAP_MAX - FRONT_GAP_MIN);
      G.hud.toast('The storm front has passed — the sky is clearing over Solmar.');
      G.audio.missionComplete();
    }
  }

  // Fog bank: visibility halves, no lightning, burns off on its own.
  if (s.foggy) {
    s.timer -= dt;
    G.scene.fog.near = Math.min(G.scene.fog.near, 90);
    G.scene.fog.far = Math.min(G.scene.fog.far, 420);
    if (s.timer <= 0) {
      s.foggy = false;
      s.nextFront = FRONT_GAP_MIN + G.rng() * (FRONT_GAP_MAX - FRONT_GAP_MIN);
      G.hud.toast('The fog is burning off — the city comes back into view.');
    }
  }
}
