// flyheli.js — flyable helicopters. A Solmar PD Hawk waits on the
// airfield helipad and a yellow news chopper sits at the Isla Verde
// marina: press E near one to climb in and fly it yourself. W/S pitches
// the nose forward and back, A/D yaws, Space climbs, Shift sinks, and
// the rotor wash kicks dust up off the ground when you hover low. Land
// on a rooftop, a runway or the beach — press E again while landed to
// hop out. Stealing the PD Hawk is a crime, so it comes with two stars.

import * as THREE from 'three';

const HELI_SPOTS = [
  {
    id: 'pd-hawk', name: 'PD Hawk', body: 0x1a2a4a, stripe: 0xf0f0f0,
    x: -280, z: -240, heading: Math.PI / 2, police: true,
    blurb: 'Solmar PD air unit — stealing it is a very bad idea. Do it anyway.',
  },
  {
    id: 'news-chopper', name: 'News Chopper', body: 0xd8a03a, stripe: 0x222222,
    x: -150, z: 590, heading: 0, police: false,
    blurb: 'Channel 6\'s eye in the sky. The keys are in it. Journalism!',
  },
];

const CLIMB_RATE = 9;
const SINK_RATE = 11;
const FLY_SPEED = 34;
const CEILING = 170;
const GROUND_CLEARANCE = 2.2;

function buildFlyHeliMesh(G, spot) {
  const group = new THREE.Group();
  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  // Body: a rounded slab with a glass nose and a white belly stripe.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 4.6), mat(spot.body));
  group.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.45, 4.2), mat(spot.stripe));
  stripe.position.y = -0.72;
  group.add(stripe);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x9fd4ff, emissive: 0x224466 }));
  nose.position.set(0, 0.15, 2.5);
  group.add(nose);
  // Skids, so it sits on the ground like a real helicopter.
  for (const sx of [-1.1, 1.1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.4), mat(0x222222));
    skid.position.set(sx, -1.25, 0);
    group.add(skid);
    for (const sz of [-1.6, 1.6]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), mat(0x333333));
      strut.position.set(sx, -0.95, sz);
      group.add(strut);
    }
  }
  // Tail boom, fin and tail rotor.
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), mat(spot.body));
  boom.position.set(0, 0.3, -4.2);
  group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 1.2), mat(spot.body));
  fin.position.set(0, 0.9, -6.2);
  group.add(fin);
  const tailRotor = new THREE.Group();
  const trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.18), mat(0x222222));
  tailRotor.add(trBlade);
  const trBlade2 = trBlade.clone();
  trBlade2.rotation.x = Math.PI / 2;
  tailRotor.add(trBlade2);
  tailRotor.position.set(0.35, 0.5, -6.3);
  group.add(tailRotor);
  // Main rotor mast + two long blades, and a little searchlight.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 8), mat(0x222222));
  mast.position.y = 1.35;
  group.add(mast);
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 7.6), mat(0x1a1a1a));
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.9;
  group.add(rotor);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lamp.position.set(0, -0.4, 2.9);
  group.add(lamp);

  group.position.set(spot.x, 0, spot.z);
  group.rotation.y = spot.heading;
  G.scene.add(group);
  return { group, rotor, tailRotor };
}

export function createFlyHelis(G) {
  const fly = {
    list: [],
    flying: null,
    wash: [],
    washTimer: 0,
  };
  for (const spot of HELI_SPOTS) {
    const built = buildFlyHeliMesh(G, spot);
    fly.list.push({
      ...spot,
      ...built,
      pos: new THREE.Vector3(spot.x, 0, spot.z),
      altitude: 0,
      vertSpeed: 0,
      fwdSpeed: 0,
      pitch: 0,
      rotorAngle: 0,
      stolen: false,
      landed: true,
    });
  }
  // Rotor-wash dust: a ring of small puffs that recycle under the heli
  // whenever it hovers low, so the ground answers the rotors.
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xcbb98a, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 14; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), puffMat);
    puff.visible = false;
    G.scene.add(puff);
    fly.wash.push({ mesh: puff, life: 0, vx: 0, vz: 0 });
  }
  G.flyheli = fly;
  return fly;
}

export function nearestFlyHeli(G) {
  if (G.driving || G.boating || G.flying || G.jetski) return null;
  const p = G.player.pos;
  for (const h of G.flyheli.list) {
    if (h.stolen && h !== G.flyheli.flying) {
      // A stolen heli that Mara abandoned stays where it landed.
    }
    if (Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < 6 && h.altitude < 3) return h;
  }
  return null;
}

export function enterFlyHeli(G, h) {
  G.flying = h;
  G.flyheli.flying = h;
  h.landed = false;
  G.player.group.visible = false;
  G.audio.engineStart();
  G.audio.engineStartLoop();
  if (h.police && !h.stolen) {
    h.stolen = true;
    G.wanted.addHeat(40, 'stole a police helicopter');
    G.hud.toast(`${h.name} stolen — 2 stars! The PD wants its bird back.`);
  } else {
    G.hud.toast(`Flying the ${h.name} — W/S pitch, A/D turn, Space climb, Shift sink.`);
  }
  G.hud.showDialogue([
    `${h.name}: ${h.blurb}`,
    'Land anywhere flat — rooftops, runways, the beach — and press E to hop out.',
  ]);
}

export function exitFlyHeli(G) {
  const h = G.flying;
  if (!h) return false;
  if (h.altitude > 3.5) {
    G.hud.toast('Too high to hop out — land first (Shift to sink).');
    return false;
  }
  G.player.pos.set(h.pos.x + 3, 0, h.pos.z + 3);
  G.player.group.position.copy(G.player.pos);
  G.player.group.visible = true;
  G.flying = null;
  G.flyheli.flying = null;
  h.landed = true;
  h.vertSpeed = 0;
  h.fwdSpeed = 0;
  h.pitch = 0;
  G.audio.engineStop();
  G.hud.toast(`Out of the ${h.name}. Mara is back on the ground.`);
  return true;
}

function clampToCity(h) {
  const lim = G_CONFIG_CITY_HALF;
  h.pos.x = Math.max(-lim, Math.min(lim, h.pos.x));
  h.pos.z = Math.max(-lim, Math.min(lim, h.pos.z));
}

// The city half-extent, kept local so this file never reaches into config.
const G_CONFIG_CITY_HALF = 340;

export function flyHeliStatusText(G) {
  const h = G.flying;
  if (!h) {
    const near = nearestFlyHeli(G);
    return near ? `Helicopter nearby — the ${near.name} (E to fly)` : 'Helicopters: PD Hawk at the airfield, News Chopper at the marina';
  }
  const kmh = Math.round(Math.abs(h.fwdSpeed) * 3.6);
  return `${h.name} — ${kmh} km/h · ${Math.round(h.altitude)}m up · Space climb / Shift sink`;
}

export function updateFlyHeli(G, dt) {
  const fly = G.flyheli;
  if (!fly) return;
  for (const h of fly.list) {
    // Parked helis sit still; the one Mara flies spins its rotors fast.
    const spinning = (fly.flying === h) ? 26 : 0;
    h.rotorAngle += spinning * dt;
    h.rotor.rotation.y = h.rotorAngle;
    h.tailRotor.rotation.x += spinning * dt * 2.4;
  }

  const h = fly.flying;
  if (!h) return;
  const input = G.input;

  // Pitch: W noses forward and builds speed, S brakes and backs up.
  const pitchTarget = input.down('forward') ? 0.32 : input.down('back') ? -0.22 : 0;
  h.pitch += (pitchTarget - h.pitch) * Math.min(1, dt * 4);
  const wantFwd = input.down('forward') ? FLY_SPEED : input.down('back') ? -8 : 0;
  h.fwdSpeed += (wantFwd - h.fwdSpeed) * Math.min(1, dt * 1.6);
  // Yaw: A/D turn the nose; the mouse drag helps too.
  if (input.down('left')) h.heading += dt * 1.5;
  if (input.down('right')) h.heading -= dt * 1.5;
  h.heading += -G.input.mouseDX * 0.0012;
  // Climb and sink, with a soft ceiling and a hard ground.
  const wantVert = input.down('jump') ? CLIMB_RATE : input.down('sprint') ? -SINK_RATE : 0;
  h.vertSpeed += (wantVert - h.vertSpeed) * Math.min(1, dt * 3);
  h.altitude += h.vertSpeed * dt;
  if (h.altitude < 0) { h.altitude = 0; h.vertSpeed = 0; }
  if (h.altitude > CEILING) { h.altitude = CEILING; h.vertSpeed = Math.min(0, h.vertSpeed); }

  // Move along the nose, with a little drift so it never feels on rails.
  const fx = Math.sin(h.heading);
  const fz = Math.cos(h.heading);
  h.pos.x += fx * h.fwdSpeed * dt;
  h.pos.z += fz * h.fwdSpeed * dt;
  clampToCity(h);
  h.group.position.set(h.pos.x, GROUND_CLEARANCE + h.altitude, h.pos.z);
  h.group.rotation.y = h.heading;
  h.group.rotation.x = h.pitch;

  // Rotor wash: dust puffs burst outward while hovering low over land.
  const overWater = h.pos.z > 420 || h.pos.x > 340;
  if (h.altitude < 12 && !overWater) {
    fly.washTimer -= dt;
    if (fly.washTimer <= 0) {
      fly.washTimer = 0.09;
      const puff = fly.wash.find((p) => p.life <= 0);
      if (puff) {
        const a = Math.random() * Math.PI * 2;
        puff.mesh.position.set(h.pos.x + Math.cos(a) * 2, 0.6, h.pos.z + Math.sin(a) * 2);
        puff.mesh.visible = true;
        puff.vx = Math.cos(a) * 7;
        puff.vz = Math.sin(a) * 7;
        puff.life = 0.7;
      }
      if (Math.random() < 0.3) G.audio.noise(0.15, 0.05, 500);
    }
  }
  for (const puff of fly.wash) {
    if (puff.life <= 0) continue;
    puff.life -= dt;
    if (puff.life <= 0) { puff.mesh.visible = false; continue; }
    puff.mesh.position.x += puff.vx * dt;
    puff.mesh.position.z += puff.vz * dt;
    puff.mesh.scale.setScalar(1 + (0.7 - puff.life) * 2.2);
  }

  // Chase camera: behind and above the heli, looking down the nose.
  const cam = G.camera;
  const back = 13 + Math.abs(h.fwdSpeed) * 0.12;
  cam.position.set(
    h.pos.x - fx * back,
    GROUND_CLEARANCE + h.altitude + 5.5,
    h.pos.z - fz * back);
  cam.lookAt(h.pos.x + fx * 10, GROUND_CLEARANCE + h.altitude, h.pos.z + fz * 10);

  // Engine note follows the climb, and the HUD keeps the flight readout.
  G.audio.engineSet(Math.min(1, Math.abs(h.fwdSpeed) / FLY_SPEED * 0.7 + Math.abs(h.vertSpeed) / CLIMB_RATE * 0.3));
  G.hud.setObjectiveHint(flyHeliStatusText(G));
  if (h.altitude > 120) G.hud.toast('You are above the whole city — the lighthouse looks tiny from here.');
}
