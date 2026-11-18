// traffic2.js — traffic v2: the highway and the accident chain. The v7
// accidents were single fender-benders that cleared themselves; v8 gives
// the city a highway — a fast east-west artery along the north edge where
// traffic runs at twice the street pace — and accidents that chain: a
// crash that blocks a lane makes the cars behind it brake, queue, and
// sometimes rear-end each other, so one bad morning can snarl three
// blocks. Mara can watch the jam build from the overpass, thread through
// it, or cause it herself — and the traffic report on the radio reads the
// jam back to her. Rubberneckers slow down to look, tow trucks clear the
// worst of it, and the highway's own rush hour is the fastest way across
// town when it is flowing — and the slowest when it is not.

import * as THREE from 'three';

const HIGHWAY_Z = -300;        // the north artery, along the airfield edge
const HIGHWAY_SPEED = 58;      // highway cruise, units per second
const HIGHWAY_CARS = 6;
const JAM_CLEAR_TIME = 40;     // seconds before a tow truck clears a jam
const CHAIN_RADIUS = 14;       // a crash chains cars this close behind it

function buildHighwayMesh(G) {
  const group = new THREE.Group();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(680, 16),
    new THREE.MeshLambertMaterial({ color: 0x24262b }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.06, HIGHWAY_Z);
  group.add(road);
  // The dashed centre line and the overpass where Mara can watch the jam.
  for (let x = -320; x < 320; x += 24) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xd8d3c0 }));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.08, HIGHWAY_Z);
    group.add(dash);
  }
  const overpass = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 10),
    new THREE.MeshLambertMaterial({ color: 0x6e7276 }));
  overpass.position.set(40, 6, HIGHWAY_Z);
  group.add(overpass);
  for (const sx of [-8, 8]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x555555 }));
    pillar.position.set(40 + sx, 3, HIGHWAY_Z);
    group.add(pillar);
  }
  G.scene.add(group);
  return group;
}

function spawnHighwayCar(G, x, lane) {
  const colors = [0x3a7ad8, 0xd83a5a, 0xe0e0e0, 0x333333, 0x3a8a4a, 0xd8a03a];
  const color = colors[Math.floor(G.rng() * colors.length)];
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 2),
    new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.7;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  cabin.position.set(-0.3, 1.5, 0);
  group.add(cabin);
  const z = HIGHWAY_Z + lane * 4;
  group.position.set(x, 0, z);
  G.scene.add(group);
  return { group, x, z, lane, speed: HIGHWAY_SPEED * (0.85 + G.rng() * 0.3), jammed: false, wait: 0 };
}

export function createTrafficV8(G) {
  if (G.trafficV8) return G.trafficV8;
  const t8 = {
    highway: buildHighwayMesh(G),
    cars: [],
    jams: [],
    jamsTotal: 0,
    chainsTotal: 0,
    towsTotal: 0,
    highwayTrips: 0,
    rushActive: false,
    rushTimer: 90 + G.rng() * 60,
  };
  for (let i = 0; i < HIGHWAY_CARS; i++) {
    const lane = i % 2 === 0 ? -1 : 1;
    t8.cars.push(spawnHighwayCar(G, -300 + i * 110, lane));
  }
  G.trafficV8 = t8;
  return t8;
}

// Start a jam at a spot on the highway: the cars behind it queue, and
// any car that reaches the queue too fast joins the chain.
export function startJamV8(G, x, z, cause = 'crash') {
  const t8 = G.trafficV8;
  if (!t8) return null;
  const jam = { x, z, cause, age: 0, cars: 0, chained: 0 };
  t8.jams.push(jam);
  t8.jamsTotal += 1;
  G.hud.toast(`Traffic: a ${cause} on the highway — the north artery is backing up.`);
  return jam;
}

function chainAccident(G, jam, car) {
  const t8 = G.trafficV8;
  jam.chained += 1;
  t8.chainsTotal += 1;
  car.jammed = true;
  car.wait = 0;
  if (jam.chained === 1) {
    G.hud.toast('The jam chained — a second car rear-ended the queue. Three blocks are snarled now.');
  }
}

export function updateTrafficV8(G, dt) {
  const t8 = G.trafficV8;
  if (!t8) return;
  // Rush hour on the highway: every couple of minutes the artery floods
  // with extra cars for a while, then drains again.
  t8.rushTimer -= dt;
  if (t8.rushTimer <= 0) {
    t8.rushActive = !t8.rushActive;
    t8.rushTimer = t8.rushActive ? 60 + G.rng() * 30 : 90 + G.rng() * 60;
    G.hud.toast(t8.rushActive
      ? 'Highway rush hour — the north artery is packed, but it is still the fastest way across town.'
      : 'The highway rush has cleared — the artery is flowing again.');
  }
  const speedMult = t8.rushActive ? 0.75 : 1;
  for (const car of t8.cars) {
    // A car in a jam waits; a car approaching a jam brakes and queues.
    let blocked = false;
    for (const jam of t8.jams) {
      const ahead = jam.x - car.x;
      if (car.lane === 1 && ahead > 0 && ahead < 26 && Math.abs(car.z - jam.z) < 8) blocked = true;
      if (car.lane === -1 && ahead < 0 && ahead > -26 && Math.abs(car.z - jam.z) < 8) blocked = true;
    }
    if (blocked) {
      car.speed = Math.max(0, car.speed - dt * 30);
      if (car.speed < 1 && !car.jammed) {
        car.jammed = true;
        car.wait = 0;
        // A fast arrival into the queue can chain a second crash.
        for (const jam of t8.jams) {
          if (Math.abs(car.x - jam.x) < CHAIN_RADIUS && Math.abs(car.z - jam.z) < 8) {
            chainAccident(G, jam, car);
          }
        }
      }
    } else {
      car.jammed = false;
      const target = HIGHWAY_SPEED * speedMult * (0.85 + (car.lane === 1 ? 0.15 : 0));
      car.speed += (target - car.speed) * dt * 0.5;
    }
    car.x += car.speed * dt * car.lane;
    if (car.x > 340) { car.x = -340; t8.highwayTrips += 1; }
    if (car.x < -340) { car.x = 340; t8.highwayTrips += 1; }
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.lane === 1 ? 0 : Math.PI;
  }
  // Jams age, and a tow truck clears the oldest one after a while.
  for (let i = t8.jams.length - 1; i >= 0; i--) {
    const jam = t8.jams[i];
    jam.age += dt;
    if (jam.age > JAM_CLEAR_TIME) {
      t8.jams.splice(i, 1);
      t8.towsTotal += 1;
      G.hud.toast('A tow truck cleared the highway jam — the artery is moving again.');
    }
  }
  // Mara driving on the highway at speed counts as a highway trip: the
  // fastest way across town, when it is flowing.
  if (G.driving && Math.abs(G.driving.pos.z - HIGHWAY_Z) < 10 && Math.abs(G.driving.speed) > 30) {
    t8.highwayTrips += dt / 10;
  }
}

export function highwayStatusV8(G) {
  const t8 = G.trafficV8;
  if (!t8) return 'The highway is quiet.';
  if (t8.jams.length > 0) {
    const worst = t8.jams[0];
    return `Highway JAMMED — ${t8.jams.length} jam${t8.jams.length === 1 ? '' : 's'}, worst ${worst.cause} (${worst.chained} chained). Tow in ${Math.max(0, Math.ceil(JAM_CLEAR_TIME - worst.age))}s.`;
  }
  return t8.rushActive
    ? 'Highway: rush hour, heavy but flowing.'
    : 'Highway: flowing, fastest way across town.';
}

export function trafficV8Summary(G) {
  const t8 = G.trafficV8;
  if (!t8) return 'Traffic v2 not started yet.';
  return `highway trips: ${Math.floor(t8.highwayTrips)} · jams: ${t8.jamsTotal} (${t8.chainsTotal} chained) · tows: ${t8.towsTotal} · ${highwayStatusV8(G)}`;
}
