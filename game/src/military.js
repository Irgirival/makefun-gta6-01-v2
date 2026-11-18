// military.js — the military response (v6). At five stars the Solmar PD
// stops being the problem: the National Guard rolls in. An armored
// personnel carrier and a squad of soldiers take over the chase, with
// heavier fire and no interest in arresting anyone. Drop below three stars
// and they stand down and roll home.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';
import { range } from './random.js';

const SOLDIER_COUNT = 3;
const SOLDIER_SHOT_RANGE = 26;
const SOLDIER_SHOT_DAMAGE = 6;
const SOLDIER_SHOT_COOLDOWN = 2.0;
const SOLDIER_SPEED = 8.5;

function buildSoldierMesh(G) {
  const group = new THREE.Group();
  const camo = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), camo);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), dark);
  head.position.y = 2.0;
  group.add(head);
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.25, 10), camo);
  helmet.position.y = 2.32;
  group.add(helmet);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), dark);
  legs.position.y = 0.4;
  group.add(legs);
  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  rifle.position.set(0.4, 1.35, 0.4);
  group.add(rifle);
  return group;
}

export function createMilitary(G) {
  const m = {
    active: false,
    truck: null,
    soldiers: [],
    apcSpawns: 0,
    soldiersDowned: 0,
    escapes: 0,
    announceTimer: 0,
  };
  G.military = m;
  return m;
}

function spawnMilitary(G) {
  const m = G.military;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const rng = G.rng;
  // The APC: an armored van that the military drives itself — it is NOT
  // in G.policeCars, so the PD's cruiser-count logic never touches it.
  const a = rng() * Math.PI * 2;
  const tx = pos.x + Math.sin(a) * 70;
  const tz = pos.z + Math.cos(a) * 70;
  const roadX = G.city.nearestRoadLine(tx, tz, 'x');
  const roadZ = G.city.nearestRoadLine(tx, tz, 'z');
  const truck = createVehicle(G, 'armored',
    Math.abs(tx - roadX) < Math.abs(tz - roadZ) ? roadX : tx,
    Math.abs(tx - roadX) < Math.abs(tz - roadZ) ? tz : roadZ,
    0, { driver: null, occupied: true, color: 0x4a5a3a });
  truck.speed = 0;
  truck.name = 'National Guard APC';
  m.truck = truck;
  m.soldiers = [];
  for (let i = 0; i < SOLDIER_COUNT; i++) {
    const sx = pos.x + range(rng, -25, 25);
    const sz = pos.z + range(rng, -25, 25);
    const mesh = buildSoldierMesh(G);
    mesh.position.set(sx, 0, sz);
    G.scene.add(mesh);
    m.soldiers.push({ mesh, x: sx, z: sz, cooldown: 1 + rng(), alive: true });
  }
  m.active = true;
  m.apcSpawns++;
  m.announceTimer = 0;
  G.hud.toast('FIVE STARS — the National Guard is on the street. The APC does not negotiate.');
  G.audio.sirenBurst();
  G.audio.missionSting();
}

function standDown(G) {
  const m = G.military;
  if (m.truck) {
    // If Mara stole the APC herself, it stays hers — the Guard just
    // stops chasing and the truck becomes an ordinary armored van.
    if (G.driving !== m.truck) {
      const vi = G.vehicles.indexOf(m.truck);
      if (vi >= 0) G.vehicles.splice(vi, 1);
      G.scene.remove(m.truck.mesh);
    }
    m.truck = null;
  }
  for (const s of m.soldiers) G.scene.remove(s.mesh);
  m.soldiers = [];
  m.active = false;
  m.escapes++;
  G.hud.toast('The Guard stands down — Mara slipped the net again.');
}

export function updateMilitary(G, dt) {
  const m = G.military;
  if (!m) return;
  if (!m.active && G.wanted.stars >= 5) spawnMilitary(G);
  if (m.active && G.wanted.stars < 3) { standDown(G); return; }
  if (!m.active) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  // Soldiers advance on Mara and fire in disciplined bursts.
  for (const s of m.soldiers) {
    if (!s.alive) continue;
    const dx = pos.x - s.x;
    const dz = pos.z - s.z;
    const d = Math.hypot(dx, dz);
    if (d > 2.5) {
      const step = Math.min(SOLDIER_SPEED * dt, d - 2);
      s.x += (dx / d) * step;
      s.z += (dz / d) * step;
    }
    s.mesh.position.set(s.x, 0, s.z);
    s.mesh.rotation.y = Math.atan2(dx, dz);
    s.cooldown -= dt;
    if (d < SOLDIER_SHOT_RANGE && s.cooldown <= 0) {
      s.cooldown = SOLDIER_SHOT_COOLDOWN;
      G.combat.damagePlayer(SOLDIER_SHOT_DAMAGE, 'a soldier\'s burst');
      G.audio.gunshot();
      G.hud.setObjectiveHint('National Guard on the street — break line of sight and lose the stars!');
    }
  }
  // The APC keeps pressure even when Mara ducks behind cover: it steers
  // straight at her, ramming speed, and flashes its own light bar. If Mara
  // stole the APC herself, the Guard leaves it alone.
  if (m.truck && G.driving !== m.truck) {
    const t = m.truck;
    const dx = pos.x - t.pos.x;
    const dz = pos.z - t.pos.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz);
    let diff = desired - t.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    t.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff * 2 * dt));
    t.speed = dist > 10 ? 20 : 8;
    t.pos.x += Math.sin(t.heading) * t.speed * dt;
    t.pos.z += Math.cos(t.heading) * t.speed * dt;
    G.city.collideCircle(t.pos, 2.2);
    t.mesh.position.copy(t.pos);
    t.mesh.rotation.y = t.heading;
    const red = t.mesh.userData.lightRed;
    const blue = t.mesh.userData.lightBlue;
    if (red && blue) {
      const on = Math.floor(G.elapsed * 6) % 2 === 0;
      red.material.emissive.setHex(on ? 0xff0000 : 0x220000);
      blue.material.emissive.setHex(on ? 0x000022 : 0x0000ff);
    }
    if (!G.driving && dist < 2.6 && t.speed > 3) {
      G.combat.damagePlayer(12, 'run over by the APC');
      t.speed *= 0.3;
    }
  }
}

export function militarySummary(G) {
  const m = G.military;
  if (!m) return 'Military — not deployed.';
  return `Guard deployments ${m.apcSpawns} · escapes ${m.escapes}`;
}

// v7: the Guard checkpoint and the curfew. At five stars the Guard stops
// chasing and starts owning the streets: a checkpoint goes up on the
// plaza avenue — sandbags, a barrier and a searchlight — and every car
// through it gets stopped, searched, and waved on only if it is not
// Mara. A curfew toast goes out at 22:00 while the Guard is deployed:
// the streets empty of pedestrians, the traffic thins, and the city
// holds its breath until the stars fall.

export function createMilitaryV7(G) {
  const m7 = {
    checkpoint: null,
    checkpointAt: null,
    curfewAnnouncedDay: -1,
    stops: 0,
    escapesThrough: 0,
    lastStopAt: -999,
  };
  // The checkpoint: sandbags, a striped barrier and a searchlight pole.
  const group = new THREE.Group();
  const mat = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });
  const bagGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
  for (let i = 0; i < 6; i++) {
    const bag = new THREE.Mesh(bagGeo, mat(0x8a7a5a));
    bag.position.set(-3 + (i % 3) * 1.3, 0.3 + Math.floor(i / 3) * 0.6, i % 2 ? 1.5 : -1.5);
    group.add(bag);
  }
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.3), mat(0xd8d3c0));
  barrier.position.set(0, 1.1, 0);
  group.add(barrier);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 0.32),
    new THREE.MeshBasicMaterial({ color: 0xd81a1a }));
  stripe.position.set(0, 1.35, 0);
  group.add(stripe);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 8), mat(0x333333));
  pole.position.set(3.4, 2.5, 0);
  group.add(pole);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
  light.position.set(3.4, 5.1, 0);
  group.add(light);
  group.position.set(20, 0, 60);
  group.visible = false;
  G.scene.add(group);
  m7.checkpoint = group;
  m7.checkpointAt = { x: 20, z: 60 };
  G.militaryV7 = m7;
  return m7;
}

export function updateMilitaryV7(G, dt) {
  const m7 = G.militaryV7;
  const mil = G.military;
  if (!m7 || !mil) return;
  const stars = G.wanted.stars;
  // The checkpoint goes up at five stars and comes down below three.
  const want = stars >= 5;
  if (want !== m7.checkpoint.visible) {
    m7.checkpoint.visible = want;
    if (want) G.hud.toast('National Guard checkpoint on the plaza avenue — every car gets stopped.');
    else G.hud.toast('The Guard checkpoint is coming down. The avenue is yours again.');
  }
  if (!want) return;
  // Driving through the checkpoint in Mara's car: the Guard stops her —
  // speed is cut and the heat jumps, unless she threads the gap at speed.
  const p = G.driving ? G.driving.pos : null;
  if (p && Math.hypot(p.x - m7.checkpointAt.x, p.z - m7.checkpointAt.z) < 6
    && G.elapsed - m7.lastStopAt > 6) {
    m7.lastStopAt = G.elapsed;
    if (Math.abs(G.driving.speed) > 30) {
      m7.escapesThrough += 1;
      G.hud.toast('Blew straight through the checkpoint! The Guard is furious.');
      G.wanted.addHeat(10, 'checkpoint');
    } else if (G.driving.speed < 12) {
      m7.stops += 1;
      G.driving.speed = 0;
      G.hud.toast('Guard checkpoint: stopped and searched. They let you go — this time.');
      if (G.wanted) G.wanted.addHeat(5, 'checkpoint');
    }
  }
  // Curfew: at 22:00 with the Guard out, the streets empty.
  const day = Math.floor(G.clockMinutes / (24 * 60));
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  if (mins >= 22 * 60 && mins < 22 * 60 + 2 && m7.curfewAnnouncedDay !== day) {
    m7.curfewAnnouncedDay = day;
    G.hud.toast('CURFEW: the Guard orders everyone indoors. The streets are empty tonight.');
  }
}

export function militaryV7Summary(G) {
  const m7 = G.militaryV7;
  if (!m7) return 'The Guard has not set up a checkpoint.';
  return `Checkpoint ${m7.checkpoint.visible ? 'UP' : 'down'} · ${m7.stops} stops · ${m7.escapesThrough} blow-throughs.`;
}

// ---- v8: the Guard's second wave and the stand-down record -------------------
// The v6 Guard rolled in at 5 stars; v8 gives it a second wave. If Mara
// holds 5 stars for a full minute, a second APC and two more soldiers
// join the cordon — and every stand-down (the Guard leaving without a
// bust) is counted, because slipping the whole army is the story Mara
// tells at the bar. The record lives next to the deployment count.

export function createMilitaryV8(G) {
  if (G.militaryV8) return G.militaryV8;
  G.militaryV8 = {
    secondWaveAt: -999,
    secondWaves: 0,
    standDowns: 0,
    wasActive: false,
    fiveStarTimer: 0,
  };
  return G.militaryV8;
}

export function updateMilitaryV8(G, dt) {
  const m8 = G.militaryV8;
  const mil = G.military;
  if (!m8 || !mil) return;
  const active = (mil.apcSpawns || 0) > 0 && G.wanted.stars >= 5;
  if (active) {
    m8.fiveStarTimer += dt;
    if (m8.fiveStarTimer >= 60 && G.elapsed - m8.secondWaveAt > 120) {
      m8.secondWaveAt = G.elapsed;
      m8.secondWaves += 1;
      m8.fiveStarTimer = 0;
      G.hud.toast('GUARD SECOND WAVE — a second APC and two more soldiers just joined the cordon. Run.');
      if (G.audio && G.audio.sting) G.audio.sting();
    }
  } else {
    m8.fiveStarTimer = 0;
  }
  // A stand-down is the Guard leaving without a bust: it was active,
  // now it is not, and Mara is still free.
  if (m8.wasActive && !active && G.mode === 'playing') {
    m8.standDowns += 1;
    G.hud.toast(`The Guard stood down — escape #${m8.standDowns}. The army came, and Mara is still here.`);
  }
  m8.wasActive = active;
}

export function militaryV8Summary(G) {
  const m8 = G.militaryV8;
  if (!m8) return 'Guard second wave not mustered yet.';
  const deployments = G.military ? G.military.apcSpawns : 0;
  return `${deployments} Guard deployments · ${m8.secondWaves} second waves · ${m8.standDowns} stand-down escapes.`;
}
