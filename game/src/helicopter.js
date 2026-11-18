// helicopter.js — the Solmar PD air unit. At 4 or 5 wanted stars a helicopter
// lifts off, hunts Mara from the sky, and pins her with a searchlight. While
// the spotlight holds her, the heat cannot decay: she cannot hide from the
// sky. It despawns when the heat falls, climbing away until it is gone.

import * as THREE from 'three';

const HOVER_HEIGHT = 58;
const CHASE_SPEED = 26;
const SPOT_RANGE = 90;

export function createHelicopter(G) {
  const heli = {
    active: false,
    leaving: false,
    pos: new THREE.Vector3(0, 120, 0),
    heading: 0,
    rotorAngle: 0,
    chopTimer: 0,
    group: null,
    rotor: null,
    tailRotor: null,
    beam: null,
    spot: null,
    pool: null,
    // v6: the news chopper — a white press helicopter that circles Mara at
    // 3+ stars and turns her chase into the evening's lead story.
    news: null,
    newsActive: false,
    newsAngle: 0,
  };
  G.heli = heli;
  return heli;
}

// v6: the SOLMAR NEWS chopper — white with a red stripe, a camera pod under
// the nose, no searchlight. It only watches, and the city watches with it.
function buildNewsHeliMesh(G) {
  const group = new THREE.Group();
  const mat = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 4.6), mat(0xf0f0f0));
  group.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.5, 4.2), mat(0xd81a2a));
  stripe.position.y = -0.4;
  group.add(stripe);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x9fd0e8, emissive: 0x223344 }));
  nose.position.set(0, 0.2, 2.4);
  group.add(nose);
  const pod = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), mat(0x1a1a1a));
  pod.position.set(0, -1.2, 1.6);
  group.add(pod);
  const rotor = new THREE.Group();
  rotor.position.y = 1.9;
  for (const off of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 7.2), mat(0x181818));
    blade.rotation.y = off;
    rotor.add(blade);
  }
  group.add(rotor);
  group.userData.rotor = rotor;
  return group;
}

export function updateNewsHeli(G, dt) {
  const h = G.heli;
  if (!h) return;
  const stars = G.wanted.stars;
  if (!h.newsActive && stars >= 3 && G.mode === 'playing' && !G.shot) {
    h.news = buildNewsHeliMesh(G);
    h.news.position.set(G.player.pos.x + 60, 90, G.player.pos.z);
    G.scene.add(h.news);
    h.newsActive = true;
    h.newsAngle = 0;
    G.hud.toast('SOLMAR NEWS chopper is overhead — you are the story now.');
  }
  if (!h.newsActive) return;
  if (stars < 2) {
    G.scene.remove(h.news);
    h.news = null;
    h.newsActive = false;
    return;
  }
  // A slow, wide orbit — the camera pod never loses her.
  const target = G.driving ? G.driving.pos : G.player.pos;
  h.newsAngle += dt * 0.25;
  const nx = target.x + Math.cos(h.newsAngle) * 42;
  const nz = target.z + Math.sin(h.newsAngle) * 42;
  h.news.position.set(nx, 70, nz);
  h.news.rotation.y = Math.atan2(target.x - nx, target.z - nz);
  if (h.news.userData.rotor) h.news.userData.rotor.rotation.y += dt * 22;
}

function buildHeliMesh(G) {
  const group = new THREE.Group();
  const mat = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });
  // Body: dark PD blue with a white belly stripe.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 4.6), mat(0x1a2a4a));
  body.position.y = 0; group.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.5, 4.2), mat(0xf0f0f0));
  belly.position.y = -0.7; group.add(belly);
  // Glass nose.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x9fd4ff, emissive: 0x224466 }));
  nose.position.set(0, 0.15, 2.5); group.add(nose);
  // Tail boom and fin.
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), mat(0x1a2a4a));
  boom.position.set(0, 0.3, -4.2); group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 1.2), mat(0x1a2a4a));
  fin.position.set(0, 0.9, -6.2); group.add(fin);
  // Tail rotor (spins around the x axis at the boom's end).
  const tailRotor = new THREE.Group();
  const trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.18), mat(0x222222));
  tailRotor.add(trBlade);
  const trBlade2 = trBlade.clone();
  trBlade2.rotation.x = Math.PI / 2;
  tailRotor.add(trBlade2);
  tailRotor.position.set(0.35, 0.5, -6.3);
  group.add(tailRotor);
  // Main rotor mast + two long blades.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 8), mat(0x222222));
  mast.position.y = 1.35; group.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.9;
  for (const off of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 7.2), mat(0x181818));
    blade.rotation.y = off;
    rotor.add(blade);
  }
  group.add(rotor);
  // Skids.
  for (const sx of [-1.0, 1.0]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.4), mat(0x333333));
    skid.position.set(sx, -1.25, 0); group.add(skid);
    for (const sz of [-1.4, 1.4]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), mat(0x333333));
      strut.position.set(sx, -0.95, sz); group.add(strut);
    }
  }
  // Red/white flashing beacon on the belly.
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
  beacon.position.set(0, -1.05, 1.2); group.add(beacon);
  group.userData.beacon = beacon;
  // Searchlight cone under the nose: a translucent additive cone the pilot
  // sweeps onto the player, plus a real spotlight and a ground pool.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6c9, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 58, 16, 1, true), beamMat);
  beam.position.set(0, -29, 2); // apex at the heli, wide end at the ground
  group.add(beam);
  const spot = new THREE.SpotLight(0xfff2b0, 900, SPOT_RANGE * 2, 0.42, 0.55, 1.2);
  spot.position.set(0, -1, 2);
  group.add(spot);
  const spotTarget = new THREE.Object3D();
  group.add(spotTarget);
  spot.target = spotTarget;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.28, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.1;
  G.scene.add(pool);
  group.userData.spotTarget = spotTarget;
  group.userData.beam = beam;
  group.userData.spot = spot;
  group.userData.pool = pool;
  return group;
}

function spawnHelicopter(G) {
  const h = G.heli;
  const target = G.driving ? G.driving.pos : G.player.pos;
  const a = G.rng() * Math.PI * 2;
  h.pos.set(target.x + Math.sin(a) * 70, 130, target.z + Math.cos(a) * 70);
  h.group = buildHeliMesh(G);
  h.group.position.copy(h.pos);
  G.scene.add(h.group);
  h.rotor = h.group.children.find((c) => c.position.y === 1.9);
  h.tailRotor = h.group.children.find((c) => c.position.y === 0.5 && c.position.x === 0.35);
  h.beam = h.group.userData.beam;
  h.spot = h.group.userData.spot;
  h.pool = h.group.userData.pool;
  h.active = true;
  h.leaving = false;
  G.hud.toast('PD AIR UNIT overhead — the searchlight is on you!');
  G.audio.sirenBurst();
}

function despawnHelicopter(G) {
  const h = G.heli;
  if (!h.group) return;
  G.scene.remove(h.group);
  G.scene.remove(h.pool);
  h.group = null;
  h.pool = null;
  h.active = false;
  h.leaving = false;
}

export function updateHelicopter(G, dt) {
  const h = G.heli;
  const stars = G.wanted.stars;
  if (!h.active && stars >= 4 && G.mode === 'playing') {
    spawnHelicopter(G);
    return;
  }
  if (!h.active) return;

  const target = G.driving ? G.driving.pos : G.player.pos;
  const dx = target.x - h.pos.x;
  const dz = target.z - h.pos.z;
  const dist = Math.hypot(dx, dz);

  if (stars < 2 && !h.leaving) {
    h.leaving = true;
    G.hud.toast('The air unit is standing down.');
  }
  if (h.leaving) {
    // Climb away and vanish once it is high and far.
    h.pos.y += 30 * dt;
    h.pos.x += Math.sin(h.heading) * 20 * dt;
    h.pos.z += Math.cos(h.heading) * 20 * dt;
    h.group.position.copy(h.pos);
    h.rotorAngle += dt * 22;
    h.rotor.rotation.y = h.rotorAngle;
    h.tailRotor.rotation.x += dt * 30;
    if (h.pos.y > 170) despawnHelicopter(G);
    return;
  }

  // Chase: close in fast, then circle the player at standoff range. In a
  // screenshot pose the air unit holds one fixed spot ahead-left of the
  // player instead, so it stays in frame for the whole pose.
  if (G.shot) {
    h.pos.set(target.x - 18, 32, target.z - 28);
  } else {
    // v3: over the island the air unit climbs clear of the lighthouse.
    const wantH = target.z > 400 ? HOVER_HEIGHT + 14 : HOVER_HEIGHT;
    h.pos.y += (wantH - h.pos.y) * Math.min(1, dt * 0.8);
    const speed = dist > 30 ? CHASE_SPEED : CHASE_SPEED * 0.45;
    if (dist > 4) {
      h.pos.x += (dx / dist) * speed * dt;
      h.pos.z += (dz / dist) * speed * dt;
    }
    // Slow orbit so the spotlight sweeps.
    const orbit = G.elapsed * 0.12;
    const ox = Math.sin(orbit) * 6;
    const oz = Math.cos(orbit) * 6;
    h.pos.x += ox * dt * 0.4;
    h.pos.z += oz * dt * 0.4;
  }
  // Face the player, bank into the turn.
  const wantHeading = Math.atan2(dx, dz);
  let d = wantHeading - h.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  h.heading += d * Math.min(1, dt * 2.5);
  h.group.position.copy(h.pos);
  h.group.rotation.y = h.heading;
  h.group.rotation.z = Math.max(-0.22, Math.min(0.22, -d * 0.6));
  h.group.rotation.x = 0.05;

  // Rotors spin; beacon flashes.
  h.rotorAngle += dt * 22;
  h.rotor.rotation.y = h.rotorAngle;
  h.tailRotor.rotation.x += dt * 34;
  const beacon = h.group.userData.beacon;
  beacon.material.emissive.setHex(Math.sin(G.elapsed * 9) > 0 ? 0xff0000 : 0x220000);

  // Rotor chop: a low thump every beat while it is near.
  h.chopTimer -= dt;
  if (h.chopTimer <= 0 && dist < 160) {
    h.chopTimer = 0.16;
    G.audio.noise(0.09, 0.07, 260);
  }

  // Searchlight: the cone, the spotlight and the ground pool all track the
  // player. While the beam holds her, the PD keeps her location — heat
  // cannot decay.
  const beamOn = dist < SPOT_RANGE;
  h.beam.visible = beamOn;
  h.spot.visible = beamOn;
  h.pool.visible = beamOn;
  if (beamOn) {
    // v5: at 5 stars the beam stops sitting on her and sweeps — a slow
    // circle around her position, searching. The heat only freezes while
    // the sweep is actually passing over her, so a fast Mara can slip the
    // light between passes.
    let bx = target.x, bz = target.z;
    let sweeping = false;
    if (stars >= 5) {
      const a = G.elapsed * 0.8;
      bx = target.x + Math.sin(a) * 14;
      bz = target.z + Math.cos(a) * 14;
      sweeping = true;
    }
    const t = h.group.userData.spotTarget;
    t.position.set(bx - h.pos.x, -h.pos.y, bz - h.pos.z);
    h.pool.position.set(bx, 0.1, bz);
    const held = !sweeping || Math.hypot(bx - target.x, bz - target.z) < 6;
    if (held) G.wanted.lastSeenAt = G.elapsed;
  }
}

// v7: the spotlight sweep and the air-unit log. The police helicopter
// no longer pins its beam on Mara and holds it: it sweeps — a slow arc
// across the street ahead of her, then a snap back onto her when the
// beam crosses her position. While the beam is off her, the heat decays
// again, so a good driver can slip the light. The air unit also keeps
// a log: how long it has held her, how many times she broke the beam,
// and the night it finally gave up.

export function createHeliV7(G) {
  const h7 = {
    sweepAngle: 0,
    sweepDir: 1,
    beamOnMara: 0,
    beamBreaks: 0,
    lastBeamAt: -999,
    totalAirTime: 0,
  };
  G.heliV7 = h7;
  return h7;
}

export function updateHeliV7(G, dt) {
  const h7 = G.heliV7;
  const heli = G.heli;
  if (!h7 || !heli) return;
  if (!heli.active) {
    if (h7.beamOnMara > 0) {
      h7.beamOnMara = 0;
      G.hud.toast('The air unit lost you — the sky is quiet again.');
    }
    return;
  }
  h7.totalAirTime += dt;
  // Sweep: the beam arcs 60 degrees either side of Mara's bearing, and
  // only counts as "on her" when the sweep crosses her.
  h7.sweepAngle += h7.sweepDir * dt * 0.5;
  if (h7.sweepAngle > 1.05) h7.sweepDir = -1;
  if (h7.sweepAngle < -1.05) h7.sweepDir = 1;
  const p = G.driving ? G.driving.pos : G.player.pos;
  const dx = p.x - heli.pos.x;
  const dz = p.z - heli.pos.z;
  const bearing = Math.atan2(dx, dz);
  const diff = Math.abs(((bearing - h7.sweepAngle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const onMara = diff < 0.18;
  if (onMara) {
    if (h7.beamOnMara === 0) h7.lastBeamAt = G.elapsed;
    h7.beamOnMara += dt;
    // While the beam holds her, the heat cannot decay — the sky sees all.
    if (G.wanted) G.wanted.lastSeenAt = G.elapsed;
  } else if (h7.beamOnMara > 0) {
    // Broke the beam: the log remembers, and the heat can fall again.
    if (h7.beamOnMara > 2) {
      h7.beamBreaks += 1;
      G.hud.toast('Broke the searchlight! The helicopter is sweeping blind.');
    }
    h7.beamOnMara = 0;
  }
}

export function heliV7Summary(G) {
  const h7 = G.heliV7;
  if (!h7) return 'No air unit on record.';
  return `${Math.floor(h7.totalAirTime)}s under the air unit · ${h7.beamBreaks} beam breaks · longest hold ${h7.beamOnMara.toFixed(1)}s.`;
}

// ---- v8: the traffic helicopter and the K9/heat record ------------------------
// The v7 heli was the police air unit; v8 adds the traffic helicopter —
// a news chopper that orbits the highway jam and reads the queue back to
// the radio — and the two records the achievements need: the most stars
// Mara has ever held, and how many times she has slipped the K9 dog.
// Both are watched, not hooked: the update below only reads state the
// police systems already keep, so it can never break a chase.

export function createTrafficHeliV8(G) {
  if (G.trafficHeliV8) return G.trafficHeliV8;
  G.trafficHeliV8 = {
    reports: 0,
    lastReportAt: 0,
    orbits: 0,
  };
  return G.trafficHeliV8;
}

export function updateTrafficHeliV8(G, dt) {
  const t8 = G.trafficHeliV8;
  if (!t8) return;
  // The heat record: the most stars Mara has ever held, ever.
  if (G.wanted) {
    G.wanted.maxStarsSeen = Math.max(G.wanted.maxStarsSeen || 0, G.wanted.stars);
  }
  // The K9 escape record: the dog was active, and now it is not, and
  // the heat is clear — Mara slipped it.
  const k9 = G.k9;
  if (k9) {
    if (k9.active) k9._v8WasActive = true;
    if (k9._v8WasActive && !k9.active && G.wanted.stars === 0) {
      k9._v8WasActive = false;
      k9.escapes = (k9.escapes || 0) + 1;
      G.hud.toast(`Slipped the K9 unit — escape #${k9.escapes}. The dog is going to hear about this.`);
    }
  }
  // The traffic chopper reports the jam to the radio, at most once a
  // minute, and only while a jam is actually on the highway.
  const jam = G.trafficV8 && G.trafficV8.jams.length > 0;
  if (jam && G.elapsed - t8.lastReportAt > 60) {
    t8.lastReportAt = G.elapsed;
    t8.reports += 1;
    t8.orbits += 1;
    G.hud.toast(`🚁 Traffic chopper: the highway jam is ${G.trafficV8.jams.length} deep — avoid the north artery.`);
  }
}

export function trafficHeliV8Summary(G) {
  const t8 = G.trafficHeliV8;
  if (!t8) return 'Traffic chopper not in the air yet.';
  const stars = G.wanted ? (G.wanted.maxStarsSeen || 0) : 0;
  const escapes = G.k9 ? (G.k9.escapes || 0) : 0;
  return `${t8.reports} jam reports · ${t8.orbits} orbits · most stars ever: ${stars} · K9 escapes: ${escapes}.`;
}
