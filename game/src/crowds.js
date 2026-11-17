// crowds.js — the extra life of Solmar City: joggers, tourists, elders with
// canes and friends who stroll in pairs, plus the city buses that lumber
// along the avenues. The varied pedestrians join G.peds, so the existing
// crowd system moves and animates them; this file only gives them their
// looks, their pace and their company. Buses are traffic vehicles with a
// custom long body, spawned onto the road grid like any other traffic car.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';
import { pick, range } from './random.js';

const JOGGER_SHIRTS = [0xff5a2a, 0x2aff5a, 0xffd23e, 0x2ad8ff];
const TOURIST_SHIRTS = [0xff8a5a, 0x5ad8ff, 0xd8ff5a, 0xff5ad8];
const SKINS = [0xc98d64, 0x8a5a3a, 0xe0b090, 0x6a4230];

function limb(group, mat, w, h, d, color, x, y) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.y = -h / 2;
  pivot.add(m);
  group.add(pivot);
  return pivot;
}

// One body plan, four kinds: the silhouette, the props and the pace change.
function buildVariedPedMesh(rng, kind, shirtColor) {
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const shirt = shirtColor ?? pick(rng, TOURIST_SHIRTS);
  const skin = pick(rng, SKINS);
  const hunched = kind === 'elder';
  const torsoH = kind === 'jogger' ? 0.6 : 0.65;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, torsoH, 0.3), mat(shirt));
  torso.position.y = 1.12;
  if (hunched) torso.rotation.x = 0.14;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), mat(skin));
  head.position.y = 1.68;
  group.add(head);
  if (kind === 'jogger') {
    // Sweatband across the forehead.
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.32), mat(0xffffff));
    band.position.y = 1.8;
    group.add(band);
  } else if (kind === 'tourist') {
    // Wide-brim hat for the sun.
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), mat(0xe6d3a3));
    brim.position.y = 1.88;
    group.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), mat(0xe6d3a3));
    top.position.y = 1.97;
    group.add(top);
    // A camera on the chest.
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.1), mat(0x222222));
    cam.position.set(0, 1.25, 0.18);
    group.add(cam);
  } else if (kind === 'elder') {
    // White hair and a walking cane in the right hand.
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.3), mat(0xe8e8e8));
    hair.position.y = 1.86;
    group.add(hair);
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), mat(0x6b4a2f));
    cane.position.set(0.42, 0.55, 0.1);
    group.add(cane);
  }
  const pants = kind === 'jogger' ? 0xd83a5a : 0x2a3542;
  const legL = limb(group, mat, 0.18, 0.72, 0.2, pants, -0.14, 0.78);
  const legR = limb(group, mat, 0.18, 0.72, 0.2, pants, 0.14, 0.78);
  const armL = limb(group, mat, 0.14, 0.55, 0.16, shirt, -0.36, 1.42);
  const armR = limb(group, mat, 0.14, 0.55, 0.16, shirt, 0.36, 1.42);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);
  return { group, legL, legR, armL, armR };
}

// A sidewalk strolling target: a random point on a road's sidewalk.
function pickCrowdTarget(G, ped) {
  const rng = G.rng;
  const alongX = rng() < 0.5;
  const road = pick(rng, G.city.roads.xs);
  const side = (rng() < 0.5 ? 1 : -1) * (G.config.roadWidth / 2 + 2.5);
  const along = range(rng, -320, 320);
  ped.target = alongX
    ? new THREE.Vector3(road + side, 0, along)
    : new THREE.Vector3(along, 0, road + side);
}

const KIND_SPEED = { jogger: [4.0, 5.0], tourist: [0.9, 1.3], elder: [0.6, 0.9], pair: [1.2, 1.8] };

function spawnVariedPed(G, kind, x, z, shirtColor) {
  const rng = G.rng;
  const mesh = buildVariedPedMesh(rng, kind, shirtColor);
  mesh.group.position.set(x, 0, z);
  G.scene.add(mesh.group);
  const speed = range(rng, KIND_SPEED[kind][0], KIND_SPEED[kind][1]);
  const ped = {
    mesh: mesh.group, parts: mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading: range(rng, 0, Math.PI * 2),
    speed,
    state: 'walk',
    walkPhase: range(rng, 0, 6),
    target: null,
    panic: 0,
    retarget: 0,
    kind,
    pair: null,
  };
  pickCrowdTarget(G, ped);
  G.peds.push(ped);
  return ped;
}

export function spawnCrowds(G) {
  const rng = G.rng;
  // Joggers loop the plaza and the beachfront.
  for (let i = 0; i < 3; i++) {
    const x = 20 + range(rng, -40, 40);
    const z = 20 + range(rng, -40, 40);
    spawnVariedPed(G, 'jogger', x, z, pick(rng, JOGGER_SHIRTS));
  }
  // Tourists drift slowly around downtown and the plaza.
  for (let i = 0; i < 3; i++) {
    spawnVariedPed(G, 'tourist', range(rng, -100, 140), range(rng, -100, 140));
  }
  // v3: beachgoers soak up the sun on the south sand, slow as the tide.
  for (let i = 0; i < 4; i++) {
    spawnVariedPed(G, 'tourist', range(rng, -160, 40), range(rng, 345, 395));
  }
  // Elders take the morning air near the parks.
  spawnVariedPed(G, 'elder', -140 + range(rng, -20, 20), -140 + range(rng, -20, 20));
  spawnVariedPed(G, 'elder', 180 + range(rng, -20, 20), 100 + range(rng, -20, 20));
  // Pairs: two friends in matching shirts, walking the same route together.
  for (let i = 0; i < 3; i++) {
    const x = range(rng, -160, 160);
    const z = range(rng, -160, 160);
    const shirt = pick(rng, TOURIST_SHIRTS);
    const a = spawnVariedPed(G, 'pair', x, z, shirt);
    const b = spawnVariedPed(G, 'pair', x + 1.2, z + 0.6, shirt);
    a.pair = b;
    b.pair = a;
    // Both start toward the same first target.
    b.target = a.target;
  }
}

// Pairs stay together: the follower re-aims at the leader's target whenever
// it changes. The crowd system does the walking.
export function updateCrowds(G, dt) {
  for (const ped of G.peds) {
    if (!ped.pair || !ped.pair.target) continue;
    // Only one of the pair leads; the other follows its target object.
    if (ped.pair.target !== ped.target) ped.target = ped.pair.target;
  }
}

// --- Buses -----------------------------------------------------------------

function buildBusMesh(color) {
  const group = new THREE.Group();
  const mat = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });
  // Long body with a window band and a white roof stripe.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 7.6), mat(color));
  body.position.y = 1.5;
  group.add(body);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.8, 6.8),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a, emissive: 0x111c28 }));
  windows.position.y = 1.9;
  group.add(windows);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.3, 7.6), mat(0xf0f0f0));
  stripe.position.y = 1.05;
  group.add(stripe);
  // Destination board above the windshield.
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
  board.position.set(0, 2.2, 3.82);
  group.add(board);
  // Headlights and tail lights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 });
  for (const sx of [-0.8, 0.8]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat);
    h.position.set(sx, 0.7, 3.82);
    group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x660000 }));
    t.position.set(sx, 0.7, -3.82);
    group.add(t);
  }
  // Six wheels: the bus is long, so the axles sit wide apart.
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
  const wheelMat = mat(0x181818);
  const wheels = [];
  for (const [wx, wz] of [[-1.05, 2.6], [1.05, 2.6], [-1.05, -2.6], [1.05, -2.6]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    group.add(w);
    wheels.push(w);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 8.4),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  group.add(shadow);
  group.userData.wheels = wheels;
  group.userData.bodyLen = 7.6;
  return group;
}

export function spawnBuses(G) {
  // Two buses on the avenues, running the same traffic routes as the cars.
  const spots = [
    { x: 60, z: 180, heading: Math.PI, axis: 'z', dir: -1 },
    { x: -140, z: -60, heading: 0, axis: 'z', dir: 1 },
  ];
  for (const s of spots) {
    const bus = createVehicle(G, 'bus', s.x, s.z, s.heading, { driver: 'traffic', occupied: true });
    // Swap the sedan-shaped body for the long bus body.
    G.scene.remove(bus.mesh);
    const mesh = buildBusMesh(bus.color);
    mesh.position.set(s.x, 0, s.z);
    mesh.rotation.y = s.heading;
    G.scene.add(mesh);
    bus.mesh = mesh;
    bus.radius = 3.8;
    bus.speed = 9;
    bus.route = { axis: s.axis, dir: s.dir, nextTurn: 160 };
    bus.cruiseSpeed = 9;
  }
}
