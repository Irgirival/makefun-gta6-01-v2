// motorcycle.js — the Solmar Comet 900: a fast, light, twitchy motorcycle.
// It is a first-class vehicle: it lives in G.vehicles, so the same arcade
// physics, entering with E, stealing, traffic and collisions all work. What
// is different is the handling (quicker, faster, less grip) and the lean:
// the bike banks into every turn, and at top speed it wobbles a little.
// Three are parked around the city to steal; one more rides the traffic.

import * as THREE from 'three';
import { pick, range } from './random.js';

export const MOTORCYCLE_SPEC = {
  name: 'Solmar Comet 900',
  topSpeed: 52,      // the fastest thing on two wheels in Solmar
  accel: 34,
  turn: 2.6,
  colors: [0xd81a2a, 0x1a6ad8, 0x222222, 0xffd23e],
};

const BIKE_SPOTS = [
  { x: 30, z: 44, heading: Math.PI / 2 },      // by the plaza fountain
  { x: -16, z: -88, heading: 0 },              // outside Vic's garage
  { x: -222, z: -272, heading: Math.PI },      // at the airfield apron
];

function buildBikeMesh(color) {
  const group = new THREE.Group();
  const mat = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });
  const bodyMat = mat(color);
  const dark = mat(0x1a1a1a);
  const chrome = mat(0xc9c9c9);
  // Frame: a low spine from the rear wheel to the forks.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 1.9), dark);
  frame.position.y = 0.62;
  group.add(frame);
  // Fuel tank: a rounded slab over the frame.
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.85), bodyMat);
  tank.position.set(0, 0.92, 0.25);
  group.add(tank);
  // Seat: a long black pad behind the tank.
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.9), dark);
  seat.position.set(0, 0.88, -0.55);
  group.add(seat);
  // Tail cowl with a red tail light.
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.4), bodyMat);
  cowl.position.set(0, 0.82, -1.05);
  group.add(cowl);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x660000 }));
  tail.position.set(0, 0.85, -1.27);
  group.add(tail);
  // Handlebar: a chrome bar with two grips.
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), chrome);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.08, 0.95);
  group.add(bar);
  for (const sx of [-0.42, 0.42]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), dark);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(sx, 1.08, 0.95);
    group.add(grip);
  }
  // Forks: two chrome tubes down to the front wheel.
  for (const sx of [-0.14, 0.14]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 8), chrome);
    fork.position.set(sx, 0.72, 1.02);
    fork.rotation.x = 0.35;
    group.add(fork);
  }
  // Headlight: a round lamp on the front.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 }));
  lamp.position.set(0, 0.95, 1.18);
  group.add(lamp);
  // Exhaust: a chrome pipe along the right side.
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 8), chrome);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0.22, 0.42, -0.4);
  group.add(pipe);
  // Wheels: thin, with a disc brake on the front.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 12);
  const wheels = [];
  for (const wz of [1.05, -1.05]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(0, 0.36, wz);
    group.add(w);
    wheels.push(w);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 10), chrome);
  disc.rotation.z = Math.PI / 2;
  disc.position.set(0.1, 0.36, 1.05);
  group.add(disc);
  // Soft contact shadow.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  group.add(shadow);
  group.userData.wheels = wheels;
  group.userData.bodyLen = 2.4;
  return group;
}

export function createMotorcycle(G, x, z, heading, opts = {}) {
  const spec = MOTORCYCLE_SPEC;
  const color = opts.color ?? pick(G.rng, spec.colors);
  const mesh = buildBikeMesh(color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  const v = {
    type: 'motorcycle',
    spec,
    mesh,
    color,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    driver: opts.driver ?? null,
    occupied: opts.occupied ?? false,
    parked: opts.parked ?? false,
    radius: 1.3,
    brakeLights: false,
    crashCooldown: 0,
    jumpY: 0,
    id: G.vehicles.length,
  };
  G.vehicles.push(v);
  return v;
}

export function spawnMotorcycles(G) {
  for (const spot of BIKE_SPOTS) {
    createMotorcycle(G, spot.x, spot.z, spot.heading, { parked: true });
  }
  // One Comet already out riding the traffic, for the player to chase down.
  const bike = createMotorcycle(G, -100, 60, Math.PI / 2, { driver: 'traffic', occupied: true });
  bike.speed = 16;
  bike.route = { axis: 'x', dir: 1, nextTurn: 120 };
  bike.cruiseSpeed = 16;
}

// Lean the bike into its turns and let it wobble a touch at top speed.
// Called after the vehicle physics each frame; the physics only ever writes
// rotation.y, so the lean we set here survives.
export function updateMotorcycles(G, dt) {
  for (const v of G.vehicles) {
    if (v.type !== 'motorcycle') continue;
    if (!v.driver) {
      v.mesh.rotation.z = 0;
      continue;
    }
    const speedN = Math.min(1, Math.abs(v.speed) / v.spec.topSpeed);
    const lean = -v.steer * 0.38 * (0.3 + speedN);
    const wobble = speedN > 0.85 ? Math.sin(G.elapsed * 17) * 0.03 * speedN : 0;
    v.mesh.rotation.z = lean + wobble;
    // A bike tips its nose a little under hard braking.
    v.mesh.rotation.x = v.brakeLights ? 0.06 : 0;
  }
}
