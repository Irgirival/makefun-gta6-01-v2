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
  };
  G.heli = heli;
  return heli;
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
    const wantH = HOVER_HEIGHT;
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
    const t = h.group.userData.spotTarget;
    t.position.set(target.x - h.pos.x, -h.pos.y, target.z - h.pos.z);
    h.pool.position.set(target.x, 0.1, target.z);
    G.wanted.lastSeenAt = G.elapsed;
  }
}
