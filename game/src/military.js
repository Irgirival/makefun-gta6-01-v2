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
