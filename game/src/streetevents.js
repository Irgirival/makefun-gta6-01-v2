// streetevents.js — the city never sits still. Every minute or two a
// street event fires somewhere in Solmar: a bank crew's getaway car
// tears across town dropping cash, a rival crew tries to take over a
// block and Mara has to hold it, or the PD posts a most-wanted bounty
// on a fugitive tearing away in a van. Each event pays cash, shows its
// own marker and dialogue, and expires on its own if Mara ignores it —
// the city moves on, with or without her.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';

const EVENT_GAP_MIN = 75;
const EVENT_GAP_MAX = 130;
const GETAWAY_REWARD = 400;
const TAKEOVER_REWARD = 500;
const BOUNTY_REWARD = 600;
const CASH_DROP_VALUE = 50;

const TAKEOVER_SPOTS = [
  { x: 60, z: 60 }, { x: -100, z: -20 }, { x: 220, z: -20 },
  { x: -20, z: 140 }, { x: 140, z: -100 }, { x: -180, z: 60 },
];

function roadSpot(G, cx, cz, spread) {
  for (let i = 0; i < 60; i++) {
    const x = cx + (G.rng() - 0.5) * 2 * spread;
    const z = cz + (G.rng() - 0.5) * 2 * spread;
    if (!G.city.isRoad(x, z)) continue;
    let blocked = false;
    for (const c of G.city.colliders) {
      if (x > c.minX - 3 && x < c.maxX + 3 && z > c.minZ - 3 && z < c.maxZ + 3) { blocked = true; break; }
    }
    if (!blocked) return { x, z };
  }
  return { x: G.city.nearestRoadLine(cx, cz, 'x'), z: cz };
}

export function createStreetEvents(G) {
  // The event beacon: a tall red-orange column and a ground ring, so a
  // street event is visible from three blocks away.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  beacon.position.y = 30;
  beacon.visible = false;
  G.scene.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4, 5.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  ring.visible = false;
  G.scene.add(ring);

  const events = {
    active: null,           // { kind, ... } or null
    nextIn: 45 + G.rng() * 30,
    done: 0,
    earned: 0,
    beacon,
    ring,
    drops: [],
  };
  G.events = events;
  return events;
}

function showMarker(G, x, z) {
  const e = G.events;
  e.beacon.position.x = x;
  e.beacon.position.z = z;
  e.ring.position.x = x;
  e.ring.position.z = z;
  e.beacon.visible = true;
  e.ring.visible = true;
}

function hideMarker(G) {
  G.events.beacon.visible = false;
  G.events.ring.visible = false;
}

function endEvent(G, reason) {
  const e = G.events;
  if (!e.active) return;
  if (e.active.car) {
    e.active.car.driver = null;
    e.active.car.parked = true;
    e.active.car.throttleTarget = 0;
  }
  if (e.active.rivals) {
    for (const c of e.active.rivals) {
      c.driver = null;
      c.parked = true;
      c.throttleTarget = 0;
    }
    e.active.rivals = [];
  }
  for (const d of e.drops) {
    d.mesh.visible = false;
    G.scene.remove(d.mesh);
  }
  e.drops = [];
  e.active = null;
  hideMarker(G);
  if (reason) G.hud.toast(reason);
  e.nextIn = EVENT_GAP_MIN + G.rng() * (EVENT_GAP_MAX - EVENT_GAP_MIN);
}

function payEvent(G, amount, what) {
  const e = G.events;
  G.cash += amount;
  e.done++;
  e.earned += amount;
  G.hud.toast(`${what} — +$${amount}! (Street events: ${e.done} done, $${e.earned} earned.)`);
  G.audio.missionComplete();
  G.save.save(G);
}

function startGetaway(G) {
  const p = G.driving ? G.driving.pos : G.player.pos;
  const start = roadSpot(G, p.x, p.z, 120);
  const car = createVehicle(G, 'sports', start.x, start.z, G.rng() * Math.PI * 2,
    { driver: 'race', color: 0x1a1a1a });
  car.throttleTarget = 1;
  const dest = roadSpot(G, -p.x, -p.z, 100);
  G.events.active = {
    kind: 'getaway',
    car,
    dest,
    timer: 60,
    dropTimer: 2,
    dropsLeft: 6,
    heading: Math.atan2(dest.x - start.x, dest.z - start.z),
  };
  showMarker(G, start.x, start.z);
  G.hud.showDialogue([
    'STREET EVENT — BANK GETAWAY!',
    'A black Vortex GT just hit the National Bank and is running with the cash. Ram it to stop it!',
    'It drops money as it runs — grab the drops, then stop the car for the $400 reward.',
  ]);
  G.audio.sirenBurst();
}

function startTakeover(G) {
  const spot = TAKEOVER_SPOTS[Math.floor(G.rng() * TAKEOVER_SPOTS.length)];
  // Two rival crew cars circle the block while Mara holds it.
  const rivals = [];
  for (let i = 0; i < 2; i++) {
    const c = createVehicle(G, 'sedan', spot.x + (i === 0 ? 18 : -18), spot.z + 14, G.rng() * Math.PI * 2,
      { driver: 'race', color: 0x6a1a2a });
    c.throttleTarget = 0.6;
    rivals.push(c);
  }
  G.events.active = {
    kind: 'takeover',
    spot,
    rivals,
    hold: 0,
    holdNeeded: 20,
    timer: 75,
    angle: 0,
  };
  showMarker(G, spot.x, spot.z);
  G.hud.showDialogue([
    'STREET EVENT — TAKEOVER!',
    'A rival crew is moving on this block. Stand in the orange ring for 20 seconds — hold the block!',
    'Their cars are circling. Do not let them push you out.',
  ]);
  G.audio.missionSting();
}

function startBounty(G) {
  const p = G.driving ? G.driving.pos : G.player.pos;
  const start = roadSpot(G, p.x, p.z, 110);
  const van = createVehicle(G, 'van', start.x, start.z, G.rng() * Math.PI * 2,
    { driver: 'race', color: 0x8a6a2a });
  van.throttleTarget = 1;
  G.events.active = {
    kind: 'bounty',
    car: van,
    timer: 70,
    fleeHeading: Math.atan2(p.x - start.x, p.z - start.z) + Math.PI,
  };
  showMarker(G, start.x, start.z);
  G.hud.showDialogue([
    'STREET EVENT — MOST WANTED!',
    'The PD just posted a $600 bounty on a fugitive in a tan Harbor Van. Catch him — on foot, within 5 metres!',
    'He is running. You are faster. Go.',
  ]);
  G.audio.sirenBurst();
}

function startRandomEvent(G) {
  const roll = G.rng();
  if (roll < 0.34) startGetaway(G);
  else if (roll < 0.67) startTakeover(G);
  else startBounty(G);
}

function dropCash(G, x, z) {
  const e = G.events;
  const group = new THREE.Group();
  const stack = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.35, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x2a7a3a, emissive: 0x0a330a }));
  stack.position.y = 0.4;
  group.add(stack);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.12, 0.62),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  band.position.y = 0.4;
  group.add(band);
  group.position.set(x, 0, z);
  G.scene.add(group);
  e.drops.push({ mesh: group, x, z, spin: G.rng() * 6 });
}

function updateGetaway(G, ev, dt) {
  const car = ev.car;
  // The getaway car flees toward its destination, swerving a little.
  const dx = ev.dest.x - car.pos.x;
  const dz = ev.dest.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz) + Math.sin(G.elapsed * 0.9) * 0.15;
  let err = want - car.heading;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  car.steerTarget = Math.max(-1, Math.min(1, err * 1.6));
  car.throttleTarget = dist < 20 ? 0.4 : 1;
  // Cash drops fall off the back as it runs.
  ev.dropTimer -= dt;
  if (ev.dropTimer <= 0 && ev.dropsLeft > 0) {
    ev.dropTimer = 4;
    ev.dropsLeft--;
    dropCash(G, car.pos.x, car.pos.z);
  }
  // Mara stops it by ramming it in a car — or by getting close on foot.
  const me = G.driving ? G.driving.pos : G.player.pos;
  const d = Math.hypot(car.pos.x - me.x, car.pos.z - me.z);
  if (d < 4.5) {
    car.speed = 0;
    car.throttleTarget = 0;
    endEvent(G, null);
    payEvent(G, GETAWAY_REWARD, 'Getaway stopped — the bank crew is done');
    return;
  }
  if (dist < 12 || ev.timer <= 0) {
    endEvent(G, 'The getaway car vanished into traffic. The city moves on.');
  }
  showMarker(G, car.pos.x, car.pos.z);
  G.hud.setObjectiveHint(`BANK GETAWAY — ram the black Vortex GT! ${Math.max(0, ev.timer).toFixed(0)}s left`);
}

function updateTakeover(G, ev, dt) {
  const p = G.player.pos;
  const d = Math.hypot(ev.spot.x - p.x, ev.spot.z - p.z);
  if (d < 5.5 && !G.driving) {
    ev.hold += dt;
    if (Math.floor(ev.hold * 2) !== Math.floor((ev.hold - dt) * 2)) G.audio.pickup();
  } else {
    ev.hold = Math.max(0, ev.hold - dt * 0.5);
  }
  // Rival cars circle the block, menacing but never quite ramming Mara.
  ev.angle += dt * 0.5;
  ev.rivals.forEach((c, i) => {
    const a = ev.angle + i * Math.PI;
    const tx = ev.spot.x + Math.cos(a) * 16;
    const tz = ev.spot.z + Math.sin(a) * 16;
    const want = Math.atan2(tx - c.pos.x, tz - c.pos.z);
    let err = want - c.heading;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    c.steerTarget = Math.max(-1, Math.min(1, err * 1.6));
    c.throttleTarget = 0.7;
  });
  if (ev.hold >= ev.holdNeeded) {
    for (const c of ev.rivals) { c.driver = null; c.parked = true; c.throttleTarget = 0; }
    ev.rivals = [];
    endEvent(G, null);
    payEvent(G, TAKEOVER_REWARD, 'Block held — the crew backs off');
    return;
  }
  if (ev.timer <= 0) endEvent(G, 'The takeover fizzled out — the crew moved on.');
  G.hud.setObjectiveHint(`TAKEOVER — hold the ring on foot: ${ev.hold.toFixed(0)}/${ev.holdNeeded}s · ${Math.max(0, ev.timer).toFixed(0)}s left`);
}

function updateBounty(G, ev, dt) {
  const car = ev.car;
  const me = G.driving ? G.driving.pos : G.player.pos;
  // The fugitive flees away from Mara, fast, with panicked swerves.
  const away = Math.atan2(car.pos.x - me.x, car.pos.z - me.z) + Math.sin(G.elapsed * 1.3) * 0.4;
  let err = away - car.heading;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  car.steerTarget = Math.max(-1, Math.min(1, err * 1.8));
  car.throttleTarget = 1;
  const d = Math.hypot(car.pos.x - me.x, car.pos.z - me.z);
  if (d < 5 && !G.driving) {
    car.speed = 0;
    car.throttleTarget = 0;
    endEvent(G, null);
    payEvent(G, BOUNTY_REWARD, 'Fugitive caught — the PD pays the bounty');
    return;
  }
  if (ev.timer <= 0) endEvent(G, 'The fugitive got away. The bounty stays open — for someone else.');
  showMarker(G, car.pos.x, car.pos.z);
  G.hud.setObjectiveHint(`MOST WANTED — catch the tan van on foot! ${Math.round(d)}m · ${Math.max(0, ev.timer).toFixed(0)}s left`);
}

export function updateStreetEvents(G, dt) {
  const e = G.events;
  if (!e) return;
  // Cash drops spin and pay on pickup, whoever dropped them.
  const ppos = G.driving ? G.driving.pos : G.player.pos;
  for (const d of e.drops) {
    d.spin += dt;
    d.mesh.rotation.y = d.spin;
    if (Math.hypot(d.mesh.position.x - ppos.x, d.mesh.position.z - ppos.z) < 3) {
      d.mesh.visible = false;
      G.scene.remove(d.mesh);
      e.drops = e.drops.filter((x) => x !== d);
      G.cash += CASH_DROP_VALUE;
      G.hud.toast(`Dropped cash grabbed — +$${CASH_DROP_VALUE}`);
      G.audio.pickup();
    }
  }
  if (e.beacon.visible) {
    e.beacon.rotation.y += dt;
    e.ring.scale.setScalar(1 + Math.sin(G.elapsed * 3) * 0.1);
  }
  if (!e.active) {
    if (G.mode === 'playing' && !G.shot) {
      e.nextIn -= dt;
      if (e.nextIn <= 0) startRandomEvent(G);
    }
    return;
  }
  const ev = e.active;
  ev.timer -= dt;
  if (ev.kind === 'getaway') updateGetaway(G, ev, dt);
  else if (ev.kind === 'takeover') updateTakeover(G, ev, dt);
  else if (ev.kind === 'bounty') updateBounty(G, ev, dt);
}

export function streetEventsStatusText(G) {
  const e = G.events;
  if (!e) return '';
  if (e.active) {
    const names = { getaway: 'Bank getaway', takeover: 'Street takeover', bounty: 'Most wanted' };
    return `${names[e.active.kind]} in progress · ${e.done} events done · $${e.earned} earned`;
  }
  return `Next street event in ${Math.max(0, Math.round(e.nextIn))}s · ${e.done} done · $${e.earned} earned`;
}
