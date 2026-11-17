// pedestrians.js — the people of Solmar City: they stroll the sidewalks,
// cross streets at intersections, chat in pairs, and flee when a gun goes
// off, a car speeds at them, or the wanted level spikes. A fleeing ped runs
// away from the danger and despawns far from the player.

import * as THREE from 'three';
import { pick, range, rangeInt } from './random.js';

const SHIRTS = [0x3a7ad8, 0xd83a5a, 0x3ad86a, 0xd8a03a, 0x8a3ad8, 0x3ad8c9, 0xe0e0e0, 0x333333];
const SKINS = [0xc98d64, 0x8a5a3a, 0xe0b090, 0x6a4230];

// v5: the landmarks tourists photograph — the plaza fountain, the Isla
// Verde lighthouse and the beach bar where Mara's story keeps returning.
const LANDMARKS = [
  { x: 20, z: 20 },
  { x: -205, z: 565 },
  { x: -120, z: 360 },
];

// v5: the brief white pop of a tourist's camera flash.
const photoFlashes = [];

function spawnPhotoFlash(G, ped) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
  flash.position.set(ped.pos.x, 1.9, ped.pos.z);
  G.scene.add(flash);
  photoFlashes.push({ mesh: flash, life: 0.18 });
}

function buildPedMesh(G, rng) {
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const shirt = pick(rng, SHIRTS);
  const skin = pick(rng, SKINS);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.3), mat(shirt));
  torso.position.y = 1.12; group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), mat(skin));
  head.position.y = 1.68; group.add(head);
  const mkLimb = (w, h, d, color, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2;
    pivot.add(m);
    group.add(pivot);
    return pivot;
  };
  const legL = mkLimb(0.18, 0.72, 0.2, 0x2a3542, -0.14, 0.78);
  const legR = mkLimb(0.18, 0.72, 0.2, 0x2a3542, 0.14, 0.78);
  const armL = mkLimb(0.14, 0.55, 0.16, shirt, -0.36, 1.42);
  const armR = mkLimb(0.14, 0.55, 0.16, shirt, 0.36, 1.42);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05;
  group.add(shadow);
  return { group, legL, legR, armL, armR };
}

export function spawnPedestrians(G) {
  G.peds = [];
  for (let i = 0; i < G.config.pedestrians; i++) {
    spawnPed(G, range(G.rng, -300, 300), range(G.rng, -300, 300), false);
  }
}

// v6: Old Town's own street life — market shoppers who browse the stalls
// and tourists who photograph the cathedral, all keeping local targets in
// the quarter instead of marching back to the mainland sidewalks.
export function spawnMarketShoppers(G) {
  for (let i = 0; i < 6; i++) {
    const x = 236 + i * 8;
    const z = -212 + (i % 2 ? 4 : -4);
    const ped = spawnPed(G, x, z, false);
    if (ped) {
      ped.local = { x: 260, z: -212, r: 30 };
      ped.target = new THREE.Vector3(x, 0, z);
    }
  }
}

export function spawnOldTownTourists(G) {
  for (let i = 0; i < 4; i++) {
    const x = 260 + (i % 2 ? 14 : -14);
    const z = -260 + (i < 2 ? 12 : -12);
    const ped = spawnPed(G, x, z, false);
    if (ped) {
      ped.local = { x: 260, z: -260, r: 26 };
      ped.target = new THREE.Vector3(x, 0, z);
      ped.stationary = i === 3; // one tourist stands still, camera raised
    }
  }
}

export function spawnPed(G, x, z, fleeing) {
  const rng = G.rng;
  const mesh = buildPedMesh(G, rng);
  mesh.group.position.set(x, 0, z);
  G.scene.add(mesh.group);
  const ped = {
    mesh: mesh.group, parts: mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading: range(rng, 0, Math.PI * 2),
    speed: fleeing ? 6.5 : range(rng, 1.2, 2.2),
    state: fleeing ? 'flee' : 'walk',
    walkPhase: range(rng, 0, 6),
    target: null,
    panic: fleeing ? 1 : 0,
    retarget: 0,
  };
  pickSidewalkTarget(G, ped);
  G.peds.push(ped);
  return ped;
}

// A ped pulled out of a stolen car flees on foot.
export function spawnFleeingPed(G, x, z) {
  const ped = spawnPed(G, x, z, true);
  ped.heading = range(G.rng, 0, Math.PI * 2);
  return ped;
}

function pickSidewalkTarget(G, ped) {
  // Walk along the nearest road's sidewalk, toward a random point on it.
  const rng = G.rng;
  // v3: island tourists stay local — they stroll their own boardwalk
  // instead of marching back to the mainland sidewalks.
  if (ped.local) {
    ped.target = new THREE.Vector3(
      ped.local.x + range(rng, -ped.local.r, ped.local.r),
      0,
      ped.local.z + range(rng, -ped.local.r, ped.local.r));
    return;
  }
  const alongX = rng() < 0.5;
  const road = pick(rng, G.city.roads.xs);
  const side = (rng() < 0.5 ? 1 : -1) * (G.config.roadWidth / 2 + 2.5);
  const along = range(rng, -320, 320);
  ped.target = alongX
    ? new THREE.Vector3(road + side, 0, along)
    : new THREE.Vector3(along, 0, road + side);
}

export function scarePeds(G, x, z, radius) {
  for (const ped of G.peds) {
    const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
    if (d < radius) {
      ped.state = 'flee';
      ped.panic = 1;
      ped.heading = Math.atan2(ped.pos.x - x, ped.pos.z - z);
      ped.speed = 6.5;
    }
  }
}

export function updatePedestrians(G, dt) {
  const playerPos = G.driving ? G.driving.pos : G.player.pos;
  for (const ped of G.peds) {
    // v5: stationary street life — performers, vendors and their audiences
    // hold their spot and play their part instead of strolling away.
    if (ped.stationary) {
      ped.walkPhase += dt * (ped.state === 'perform' ? 5 : 2);
      const s = Math.sin(ped.walkPhase);
      if (ped.kind === 'performer') {
        // Strumming / drumming: one arm works, the other holds the beat.
        ped.parts.armR.rotation.x = -0.9 + s * 0.5;
        ped.parts.armL.rotation.x = -0.5 - s * 0.3;
        ped.parts.legL.rotation.x = 0;
        ped.parts.legR.rotation.x = 0;
        ped.mesh.position.y = Math.abs(Math.cos(ped.walkPhase)) * 0.04;
        // Every so often the little crowd cheers the player on.
        if (ped.cheerTimer !== undefined) {
          ped.cheerTimer -= dt;
          if (ped.cheerTimer <= 0) {
            ped.cheerTimer = 9 + G.rng() * 12;
            const pd = Math.hypot(playerPos.x - ped.pos.x, playerPos.z - ped.pos.z);
            if (pd < 60) G.audio.crowdCheer();
          }
        }
      } else if (ped.kind === 'vendor') {
        // Waving the goods at passers-by.
        ped.parts.armR.rotation.x = -0.4 + Math.sin(ped.walkPhase * 0.7) * 0.25;
        ped.parts.armL.rotation.x = -0.4 - Math.sin(ped.walkPhase * 0.7) * 0.25;
      } else {
        // The audience sways and claps along to the music.
        ped.parts.armL.rotation.x = -0.6 + s * 0.35;
        ped.parts.armR.rotation.x = -0.6 - s * 0.35;
        ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.03;
      }
      ped.mesh.rotation.y = ped.heading;
      continue;
    }
    if (ped.state === 'flee') {
      ped.panic -= dt * 0.25;
      if (ped.panic <= 0) { ped.state = 'walk'; ped.speed = 1.6; pickSidewalkTarget(G, ped); }
    } else {
      // Reached the target? Pick a new sidewalk stroll.
      if (!ped.target || Math.hypot(ped.target.x - ped.pos.x, ped.target.z - ped.pos.z) < 3) {
        pickSidewalkTarget(G, ped);
      }
      const dx = ped.target.x - ped.pos.x, dz = ped.target.z - ped.pos.z;
      const want = Math.atan2(dx, dz);
      let d = want - ped.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      ped.heading += d * Math.min(1, dt * 3);
      // A speeding player car nearby makes them jump aside.
      const pd = Math.hypot(playerPos.x - ped.pos.x, playerPos.z - ped.pos.z);
      if (G.driving && pd < 6 && Math.abs(G.driving.speed) > 12) {
        ped.state = 'flee'; ped.panic = 1; ped.speed = 7;
        ped.heading = Math.atan2(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
      }
    }
    ped.pos.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.pos.z += Math.cos(ped.heading) * ped.speed * dt;
    G.city.collideCircle(ped.pos, 0.5);
    // Walk cycle.
    ped.walkPhase += dt * ped.speed * 4.5;
    const s = Math.sin(ped.walkPhase) * (ped.state === 'flee' ? 0.9 : 0.55);
    ped.parts.legL.rotation.x = s;
    ped.parts.legR.rotation.x = -s;
    ped.parts.armL.rotation.x = -s * 0.7;
    ped.parts.armR.rotation.x = s * 0.7;
    ped.mesh.position.copy(ped.pos);
    ped.mesh.rotation.y = ped.heading;
    // v5: tourists take photos at the landmarks — the plaza fountain, the
    // lighthouse, the beach bar. A flash pops and the shutter clicks when
    // Mara is close enough to hear it.
    if (ped.kind === 'tourist') {
      if (ped.photoTimer === undefined) ped.photoTimer = 4 + G.rng() * 8;
      ped.photoTimer -= dt;
      if (ped.photoTimer <= 0) {
        ped.photoTimer = 5 + G.rng() * 8;
        const nearLandmark = LANDMARKS.some((lm) =>
          Math.hypot(lm.x - ped.pos.x, lm.z - ped.pos.z) < 45);
        const pd = Math.hypot(playerPos.x - ped.pos.x, playerPos.z - ped.pos.z);
        if (nearLandmark && pd < 70) {
          spawnPhotoFlash(G, ped);
          G.audio.cameraShutter();
        }
      }
    }
  }
  // Camera flashes fade out fast.
  for (let i = photoFlashes.length - 1; i >= 0; i--) {
    const f = photoFlashes[i];
    f.life -= dt;
    if (f.life <= 0) {
      G.scene.remove(f.mesh);
      photoFlashes.splice(i, 1);
    } else {
      f.mesh.material.opacity = f.life / 0.18;
      f.mesh.scale.setScalar(1 + (0.18 - f.life) * 6);
    }
  }
  // Keep the crowd near the action: respawn peds that wandered too far.
  // Stationary street life stays where it belongs.
  for (const ped of G.peds) {
    if (ped.stationary) continue;
    const d = Math.hypot(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
    if (d > 420) {
      const a = G.rng() * Math.PI * 2;
      ped.pos.set(playerPos.x + Math.sin(a) * 120, 0, playerPos.z + Math.cos(a) * 120);
      G.city.collideCircle(ped.pos, 0.5);
      ped.state = 'walk'; ped.speed = 1.6;
      pickSidewalkTarget(G, ped);
    }
  }
}

// Nearest ped within range, for punching.
export function nearestPed(G, x, z, rangeDist) {
  let best = null, bd = rangeDist;
  for (const ped of G.peds) {
    const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
    if (d < bd) { bd = d; best = ped; }
  }
  return best;
}

export function removePed(G, ped) {
  G.scene.remove(ped.mesh);
  const i = G.peds.indexOf(ped);
  if (i >= 0) G.peds.splice(i, 1);
}
