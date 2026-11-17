// missions2.js — the v2 story and side work. Mission 6, "The Long Runway",
// finishes Mara's arc at the new airfield: a cargo run down the runway
// before the plane leaves. Beside it, two repeatable side jobs that pay
// whenever the story is quiet: courier runs (press C) and stunt jumps off
// the three ramps hidden around the city. All of it plugs into missions.js
// through its own marker and HUD, so the story flow never changes shape.

import * as THREE from 'three';
import { MISSIONS, placeMarker, hideMarker } from './missions.js';
import { range } from './random.js';

const AIRPORT = { terminal: { x: -235, z: -276 }, hangar: { x: -312, z: -276 }, runwayEast: { x: -201, z: -260 } };
const PLAZA = { x: 20, z: 20 };

const MISSION_6 = {
  id: 'long-runway',
  title: 'Mission 6 — The Long Runway',
  reward: 4000,
  intro: ['LENA: "The cargo plane leaves at dawn. One crate, one runway, one chance."',
    'VIC (phone): "The airfield, Mara. Terminal first — then run the runway like you own it."',
    'MARA: "I already own it. I just haven\'t told the city yet."'],
  steps: [
    { type: 'goto', target: AIRPORT.terminal, radius: 10, text: 'Reach the airfield terminal', hint: 'North-west corner of the city. A fast car helps.' },
    { type: 'timed', target: AIRPORT.runwayEast, radius: 12, seconds: 60, text: 'Race down the runway before the plane leaves', hint: '60 seconds. Flat out, straight down the runway.' },
    { type: 'collect', target: AIRPORT.hangar, radius: 6, text: 'Grab the cargo from hangar A', hint: 'Walk into the glowing crate by the hangar door.' },
    { type: 'drive', target: PLAZA, radius: 10, text: 'Bring the cargo home to the plaza', hint: 'The whole city is watching now. Drive like it.' },
  ],
  outro: ['LENA: "That\'s the last crate. The plane\'s gone, the money\'s ours."',
    'MARA: "Solmar City, population: us. And the runway\'s ours too."'],
};

// Stunt ramps: a wedge the player launches off. Heading is the launch
// direction (radians, same convention as vehicles: forward = sin/cos).
const RAMPS = [
  { x: -40, z: 330, heading: Math.PI, name: 'Beach ramp' },        // launch north off the sand
  { x: 100, z: 60, heading: -Math.PI / 2, name: 'Downtown ramp' }, // launch west down the avenue
  { x: -196, z: -260, heading: -Math.PI / 2, name: 'Runway ramp' },// launch west down the runway
];
const JUMP_MIN = 18;      // metres of airtime that pays
const JUMP_BASE_PAY = 100;

export function registerExtraMissions(G) {
  // The finale joins the story list, so the game auto-starts it after
  // mission 5 and calls the story complete only after it.
  if (!MISSIONS.some((m) => m.id === 'long-runway')) MISSIONS.push(MISSION_6);

  const side = {
    courier: { active: false, stage: null, leg: 0, pickup: null, dropoff: null, timer: 0, timerTotal: 0, streak: 0, parcel: null },
    stunts: { best: 0, total: 0, ramps: [] },
  };
  G.side = side;

  // The courier parcel: a gold crate that waits at each pickup point.
  const parcel = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
  crate.position.y = 0.9;
  parcel.add(crate);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe98a }));
  glow.position.y = 2.0;
  parcel.add(glow);
  parcel.visible = false;
  G.scene.add(parcel);
  side.courier.parcel = parcel;

  // The three ramps, built as sloped wedges with side rails.
  for (const r of RAMPS) {
    const group = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const slope = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 7), mat(0xd8a03a));
    slope.rotation.x = -0.42;
    slope.position.y = 1.1;
    group.add(slope);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 2), mat(0x5a6068));
    base.position.set(0, 0.25, 3.2);
    group.add(base);
    for (const sx of [-2.1, 2.1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 7), mat(0xff5a2a));
      rail.position.set(sx, 1.3, 0);
      rail.rotation.x = -0.42;
      group.add(rail);
    }
    // Chevrons on the ramp face so drivers can spot it at speed.
    const chev = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 }));
    chev.position.set(0, 1.6, 0.8);
    chev.rotation.x = -0.42;
    group.add(chev);
    group.position.set(r.x, 0, r.z);
    group.rotation.y = r.heading;
    G.scene.add(group);
    side.stunts.ramps.push({ ...r, group });
  }
  return side;
}

// A drivable spot near (cx, cz): on a road, clear of buildings.
function openSpot(G, cx, cz, spread) {
  const rng = G.rng;
  for (let i = 0; i < 60; i++) {
    const x = cx + range(rng, -spread, spread);
    const z = cz + range(rng, -spread, spread);
    if (!G.city.isRoad(x, z)) continue;
    let blocked = false;
    for (const c of G.city.colliders) {
      if (x > c.minX - 3 && x < c.maxX + 3 && z > c.minZ - 3 && z < c.maxZ + 3) { blocked = true; break; }
    }
    if (!blocked) return { x, z };
  }
  return { x: G.city.nearestRoadLine(cx, cz, 'x'), z: cz };
}

function startCourier(G) {
  const c = G.side.courier;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  c.active = true;
  c.stage = 'pickup';
  c.leg = 1;
  c.pickup = openSpot(G, pos.x, pos.z, 90);
  c.dropoff = null;
  c.timer = 0;
  c.parcel.position.set(c.pickup.x, 0, c.pickup.z);
  c.parcel.visible = true;
  G.hud.setMission('Courier Run', `Pick up the parcel (${c.leg}/3)`, 'Grab the gold crate, then deliver it on the clock.');
  placeMarker(G, c.pickup);
  G.audio.missionSting();
  G.hud.toast('Courier run started — 3 deliveries, the clock runs on each drop.');
}

function failCourier(G, reason) {
  const c = G.side.courier;
  c.active = false;
  c.stage = null;
  c.parcel.visible = false;
  hideMarker(G);
  G.hud.toast(reason);
  G.hud.setMission('Solmar City', 'Free roam — every mission complete.', 'Press J for a taxi fare, C for a courier run, or find the hidden packages.');
}

function updateCourier(G, dt) {
  const c = G.side.courier;
  if (!c.active) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  // The parcel spins while it waits.
  if (c.stage === 'pickup') {
    c.parcel.rotation.y += dt * 2;
    const d = Math.hypot(c.pickup.x - pos.x, c.pickup.z - pos.z);
    G.hud.setObjectiveHint(`Parcel ${Math.round(d)}m away — leg ${c.leg}/3`);
    if (d > 3.5) return;
    c.parcel.visible = false;
    c.stage = 'dropoff';
    c.dropoff = openSpot(G, range(G.rng, -300, 300), range(G.rng, -300, 300), 60);
    c.timer = 50;
    c.timerTotal = 50;
    G.hud.setMission('Courier Run', `Deliver the parcel — leg ${c.leg}/3`, '50 seconds. Drive fast, stay clean.');
    placeMarker(G, c.dropoff);
    G.audio.pickup();
    return;
  }
  // Dropoff leg: the clock runs.
  c.timer -= dt;
  const d = Math.hypot(c.dropoff.x - pos.x, c.dropoff.z - pos.z);
  G.hud.setObjectiveHint(`Time left: ${Math.max(0, c.timer).toFixed(0)}s — ${Math.round(d)}m to the drop`);
  if (c.timer <= 0) {
    if (d <= 8) {
      // Beat the clock on the last frame: it still counts.
    } else {
      failCourier(G, 'Courier run failed — out of time.');
      return;
    }
  }
  if (d > 8) return;
  const pay = 150 + (c.leg - 1) * 100;
  G.cash += pay;
  G.hud.toast(`Delivery ${c.leg}/3 done — +$${pay}`);
  G.audio.missionComplete();
  c.leg++;
  if (c.leg > 3) {
    const bonus = 200;
    G.cash += bonus;
    c.streak++;
    G.hud.toast(`Courier run complete! Streak ${c.streak} — bonus +$${bonus}`);
    c.active = false;
    c.stage = null;
    hideMarker(G);
    G.hud.setMission('Solmar City', 'Free roam — every mission complete.', 'Press J for a taxi fare, C for another courier run, or find the hidden packages.');
    G.save.save(G);
    return;
  }
  c.stage = 'pickup';
  const ppos = G.driving ? G.driving.pos : G.player.pos;
  c.pickup = openSpot(G, ppos.x, ppos.z, 90);
  c.parcel.position.set(c.pickup.x, 0, c.pickup.z);
  c.parcel.visible = true;
  G.hud.setMission('Courier Run', `Pick up the parcel (${c.leg}/3)`, 'Grab the gold crate, then deliver it on the clock.');
  placeMarker(G, c.pickup);
}

// Stunt jumps: launching off a ramp at speed lifts the car into a short
// arc. Distance is measured from the ramp to the landing point.
function updateStunts(G, dt) {
  const st = G.side.stunts;
  const v = G.driving;
  if (!v) return;
  // Already airborne: fly the arc, land, and score it.
  if (v.jumpT !== undefined && v.jumpT !== null) {
    v.jumpT += dt;
    const k = Math.min(1, v.jumpT / v.jumpDur);
    v.jumpY = Math.sin(k * Math.PI) * v.jumpHeight;
    if (k >= 1) {
      const dist = Math.hypot(v.pos.x - v.jumpStartX, v.pos.z - v.jumpStartZ);
      v.jumpT = null;
      v.jumpY = 0;
      st.total++;
      if (dist >= JUMP_MIN) {
        const pay = JUMP_BASE_PAY + Math.round((dist - JUMP_MIN) * 5);
        G.cash += pay;
        if (dist > st.best) st.best = Math.round(dist);
        G.hud.toast(`STUNT JUMP — ${Math.round(dist)}m of air! +$${pay}`);
        G.audio.missionComplete();
      } else {
        G.hud.toast(`Jumped ${Math.round(dist)}m — ${JUMP_MIN}m pays. Hit the ramp faster.`);
      }
    }
    return;
  }
  // On the ground: crossing a ramp fast enough, in the right direction,
  // launches the jump.
  if (Math.abs(v.speed) < 22) return;
  for (const r of st.ramps) {
    const d = Math.hypot(r.x - v.pos.x, r.z - v.pos.z);
    if (d > 4.5) continue;
    let diff = r.heading - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 0.7) continue;
    v.jumpT = 0;
    v.jumpDur = 0.8 + Math.abs(v.speed) * 0.012;
    v.jumpHeight = 2.5 + Math.abs(v.speed) * 0.08;
    v.jumpStartX = v.pos.x;
    v.jumpStartZ = v.pos.z;
    G.audio.horn();
    break;
  }
}

export function updateSideMissions(G, dt) {
  // C starts a courier run when the story is quiet.
  if (G.mode === 'playing' && G.input.pressed('courier') && !G.side.courier.active && !G.missions.active) {
    startCourier(G);
  }
  // A story mission starting mid-run wins the marker: stand the courier down.
  if (G.side.courier.active && G.missions.active) {
    failCourier(G, 'Courier run cancelled — a story mission came in.');
    return;
  }
  if (G.side.courier.active) updateCourier(G, dt);
  updateStunts(G, dt);
}
