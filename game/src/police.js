// police.js — the wanted system and the Solmar PD. Heat rises with crimes
// and falls when the player stays out of sight; stars are heat / 20. Cruisers
// chase the player (on foot or in a car), roadblocks form at 3+ stars, and
// officers on foot close in to arrest. Getting caught on foot means BUSTED.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';
import { range, pick } from './random.js';

export function createWanted(G) {
  const wanted = {
    heat: 0,
    stars: 0,
    lastCrimeAt: -999,
    lastSeenAt: -999,
    arrestTimer: 0,
    roadblockAt: 0,        // first roadblock only after 45 s of play
    addHeat(amount, reason) {
      const was = this.stars;
      this.heat = Math.min(100, this.heat + amount);
      this.lastCrimeAt = G.elapsed;
      this.lastSeenAt = G.elapsed;
      this.stars = Math.min(G.config.maxStars, Math.floor(this.heat / G.config.heatPerStar));
      if (this.stars > was) {
        G.hud.toast(this.stars >= 3 ? `WANTED — ${this.stars} stars! The whole PD is coming.` : `Wanted level ${this.stars} star${this.stars > 1 ? 's' : ''}.`);
        G.audio.sirenBurst();
      }
    },
    clear() {
      this.heat = 0; this.stars = 0; this.arrestTimer = 0;
    },
  };
  G.wanted = wanted;
  G.policeCars = [];
  G.policeFoot = [];
  return wanted;
}

function playerPos(G) {
  return G.driving ? G.driving.pos : G.player.pos;
}

function spawnCruiser(G, near) {
  const rng = G.rng;
  const a = rng() * Math.PI * 2;
  const dist = range(rng, 60, 90);
  let x = near.x + Math.sin(a) * dist;
  let z = near.z + Math.cos(a) * dist;
  // Spawn on the nearest road so cruisers start on asphalt.
  const roadX = G.city.nearestRoadLine(x, z, 'x');
  const roadZ = G.city.nearestRoadLine(x, z, 'z');
  if (Math.abs(x - roadX) < Math.abs(z - roadZ)) x = roadX; else z = roadZ;
  const v = createVehicle(G, 'police', x, z, 0, { driver: 'police', occupied: true });
  v.speed = 10;
  G.policeCars.push(v);
  return v;
}

function spawnFootOfficer(G, near) {
  const rng = G.rng;
  const a = rng() * Math.PI * 2;
  const x = near.x + Math.sin(a) * 25;
  const z = near.z + Math.cos(a) * 25;
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.32), mat(0x1a2a4a));
  torso.position.y = 1.15; group.add(torso);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
  badge.position.set(0.14, 1.3, 0.18); group.add(badge);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.3), mat(0xc98d64));
  head.position.y = 1.72; group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.34), mat(0x101a2a));
  cap.position.y = 1.92; group.add(cap);
  const mkLimb = (w, h, d, color, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2; pivot.add(m); group.add(pivot);
    return pivot;
  };
  const legL = mkLimb(0.2, 0.75, 0.22, 0x101a2a, -0.15, 0.78);
  const legR = mkLimb(0.2, 0.75, 0.22, 0x101a2a, 0.15, 0.78);
  const armL = mkLimb(0.15, 0.58, 0.17, 0x1a2a4a, -0.38, 1.45);
  const armR = mkLimb(0.15, 0.58, 0.17, 0x1a2a4a, 0.38, 1.45);
  group.position.set(x, 0, z);
  G.scene.add(group);
  const officer = {
    group, legL, legR, armL, armR,
    pos: new THREE.Vector3(x, 0, z),
    heading: 0, speed: 0, walkPhase: 0, arresting: false,
  };
  G.policeFoot.push(officer);
  return officer;
}

export function updatePolice(G, dt) {
  const w = G.wanted;
  const cfg = G.config;
  const target = playerPos(G);

  // Heat decay: only while no police unit is close and no crime just happened.
  // v5: the air unit's searchlight counts too — while the beam has seen her
  // in the last two seconds, the heat cannot cool off at all.
  const nearestCop = nearestPoliceDistance(G);
  const seenRecently = G.elapsed - w.lastSeenAt < 2;
  if (w.stars > 0 && G.elapsed - w.lastCrimeAt > 8 && nearestCop > 55 && !seenRecently) {
    // v5: the Night Stalker outfit cools the heat 50% faster — the PD
    // loses a quiet woman in dark clothes much sooner.
    const decayMult = w.heatDecayMult || 1;
    w.heat = Math.max(0, w.heat - cfg.heatDecayPerSec * decayMult * dt);
    w.stars = Math.floor(w.heat / cfg.heatPerStar);
    if (w.stars === 0) {
      G.hud.toast('You lost them. The heat is off — for now.');
      G.audio.sirenStop();
    }
  }

  // Keep the right number of cruisers on the street for the current stars.
  const wantCruisers = Math.min(cfg.policeCruisersMax, w.stars);
  while (G.policeCars.length < wantCruisers) spawnCruiser(G, target);
  while (G.policeCars.length > wantCruisers) {
    const v = G.policeCars.pop();
    v.driver = null; v.parked = true; v.speed = 0;
  }
  // Foot officers at 2+ stars, only a threat on foot.
  const wantFoot = (!G.driving && w.stars >= 2) ? Math.min(cfg.policeFootMax, w.stars - 1) : 0;
  while (G.policeFoot.length < wantFoot) spawnFootOfficer(G, target);
  while (G.policeFoot.length > wantFoot) {
    const o = G.policeFoot.pop();
    G.scene.remove(o.group);
  }

  // Cruiser chase: steer toward the player, ram speed, brake near them.
  // v3: cruisers cannot chase onto the water — while Mara is sailing they
  // hold at the shore and wait for her to come back to land.
  for (const v of G.policeCars) {
    const dx = target.x - v.pos.x, dz = target.z - v.pos.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz);
    let diff = desired - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (G.boating) {
      v.steerTarget = 0;
      v.throttleTarget = 0;
    } else {
      v.steerTarget = Math.max(-1, Math.min(1, diff * 2.2));
      v.throttleTarget = dist > 8 ? 1 : 0.2;
      if (dist < 5 && Math.abs(v.speed) > 4) v.throttleTarget = -0.5;
    }
    // Flash the light bar.
    const t = G.elapsed * 8;
    const red = v.mesh.userData.lightRed, blue = v.mesh.userData.lightBlue;
    if (red && blue) {
      red.material.emissive.setHex(Math.sin(t) > 0 ? 0xff0000 : 0x220000);
      blue.material.emissive.setHex(Math.sin(t) > 0 ? 0x000022 : 0x0000ff);
    }
    // Ramming the player on foot hurts.
    if (!G.driving && dist < 2.6 && Math.abs(v.speed) > 3) {
      G.combat.damagePlayer(12, 'run over by a cruiser');
      v.speed *= 0.3;
    }
  }

  // Foot officers: run at the player; close in and the arrest timer runs.
  let arresting = false;
  for (const o of G.policeFoot) {
    const dx = target.x - o.pos.x, dz = target.z - o.pos.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let d = want - o.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    o.heading += d * Math.min(1, dt * 6);
    const speed = dist > 2 ? 8.5 : 0;
    o.pos.x += Math.sin(o.heading) * speed * dt;
    o.pos.z += Math.cos(o.heading) * speed * dt;
    G.city.collideCircle(o.pos, 0.5);
    o.walkPhase += dt * speed * 4.5;
    const s = Math.sin(o.walkPhase) * 0.8;
    o.legL.rotation.x = s; o.legR.rotation.x = -s;
    o.armL.rotation.x = -s * 0.7; o.armR.rotation.x = s * 0.7;
    o.group.position.copy(o.pos);
    o.group.rotation.y = o.heading;
    if (dist < cfg.arrestDistance) arresting = true;
  }
  if (arresting && !G.driving) {
    w.arrestTimer += dt;
    G.hud.setObjectiveHint(`The police are grabbing you — break away! (${Math.max(0, cfg.arrestTime - w.arrestTimer).toFixed(1)}s)`);
    if (w.arrestTimer >= cfg.arrestTime) {
      G.gameOver('busted');
      return;
    }
  } else {
    w.arrestTimer = Math.max(0, w.arrestTimer - dt * 2);
  }

  // Roadblock: at 3+ stars a parked cruiser line appears ahead every so often.
  if (w.stars >= 3 && G.elapsed - w.roadblockAt > 45 && G.driving) {
    w.roadblockAt = G.elapsed;
    const ahead = 55;
    const bx = target.x + Math.sin(G.driving.heading) * ahead;
    const bz = target.z + Math.cos(G.driving.heading) * ahead;
    for (let i = -1; i <= 1; i++) {
      const px = bx + Math.cos(G.driving.heading) * i * 5;
      const pz = bz - Math.sin(G.driving.heading) * i * 5;
      createVehicle(G, 'police', px, pz, G.driving.heading + Math.PI / 2, { parked: true });
    }
    G.hud.toast('Roadblock ahead! Smash through or go around.');
  }
}

export function nearestPoliceDistance(G) {
  const target = playerPos(G);
  let best = Infinity;
  for (const v of G.policeCars) best = Math.min(best, Math.hypot(v.pos.x - target.x, v.pos.z - target.z));
  for (const o of G.policeFoot) best = Math.min(best, Math.hypot(o.pos.x - target.x, o.pos.z - target.z));
  return best;
}

// Police attention after a crime: peds flee, sirens, HUD label.
export function onCrime(G) {
  G.pedestrians.scarePeds(G, playerPos(G).x, playerPos(G).z, 30);
}

// v5 — the Mission 10 surge: when Mara lifts the sunset crate, the whole
// PD answers at once. Two extra cruisers roll in from the nearest roads
// and the heat jumps a star, so the "lose the police" step of The Last
// Sunset is a real chase and not a stroll. Called once per mission start.
export function policeSurge(G) {
  const w = G.wanted;
  const target = G.driving ? G.driving.pos : G.player.pos;
  w.addHeat(G.config.heatPerStar, 'the sunset crate');
  let spawned = 0;
  for (let i = 0; i < 2 && spawned < 2; i++) {
    const a = (i / 2) * Math.PI * 2 + 0.6;
    const dist = 70 + i * 15;
    let x = target.x + Math.sin(a) * dist;
    let z = target.z + Math.cos(a) * dist;
    const roadX = G.city.nearestRoadLine(x, z, 'x');
    const roadZ = G.city.nearestRoadLine(x, z, 'z');
    if (Math.abs(x - roadX) < Math.abs(z - roadZ)) x = roadX; else z = roadZ;
    const v = createVehicle(G, 'police', x, z, 0, { driver: 'police', occupied: true });
    v.speed = 14;
    G.policeCars.push(v);
    spawned++;
  }
  G.hud.toast('The whole PD is coming — lose them before the plaza!');
  G.audio.sirenBurst();
  return spawned;
}
