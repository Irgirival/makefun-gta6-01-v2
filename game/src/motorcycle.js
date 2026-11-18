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

// v5: the Boulevard Cruiser — slower than the Comet, steadier in the rain,
// with saddlebags and a windshield for the long ride down the beach road.
export const CRUISER_SPEC = {
  name: 'Boulevard Cruiser',
  topSpeed: 44,
  accel: 26,
  turn: 2.2,
  colors: [0x2a2a2a, 0x6a1a2a, 0x1a3a5a],
};

// v6: the Trail Blazer 250 — a dirt bike for the mountain road. Slower than
// the Comet on asphalt, quicker in the turns, and the only bike that feels
// at home on the trail up to the ski lodge.
export const DIRT_SPEC = {
  name: 'Trail Blazer 250',
  topSpeed: 34,
  accel: 28,
  turn: 2.8,
  colors: [0x4a5a3a, 0x8a6a3a, 0x2a4a5a],
};

const BIKE_SPOTS = [
  { x: 30, z: 44, heading: Math.PI / 2 },      // by the plaza fountain
  { x: -16, z: -88, heading: 0 },              // outside Vic's garage
  { x: -222, z: -272, heading: Math.PI },      // at the airfield apron
  { x: -150, z: 512, heading: Math.PI / 2 },   // v3: on the Isla Verde boardwalk
];

function buildBikeMesh(color, cruiser = false) {
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
  // v5: the cruiser's kit — a tall windshield for the beach-road wind and
  // leather saddlebags over the rear wheel.
  if (cruiser) {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.6 }));
    shield.position.set(0, 1.35, 1.1);
    shield.rotation.x = -0.25;
    group.add(shield);
    for (const sx of [-0.32, 0.32]) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.6), mat(0x5a3a1a));
      bag.position.set(sx, 0.62, -0.85);
      group.add(bag);
    }
  }
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
  // v5: opts.cruiser picks the Boulevard Cruiser's steadier spec.
  // v6: opts.dirt picks the Trail Blazer's off-road spec.
  const spec = opts.dirt ? DIRT_SPEC : opts.cruiser ? CRUISER_SPEC : MOTORCYCLE_SPEC;
  const color = opts.color ?? pick(G.rng, spec.colors);
  const mesh = buildBikeMesh(color, !!opts.cruiser);
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
  // v5: a Boulevard Cruiser parked outside the beach bar, for the long
  // ride down the beach road.
  createMotorcycle(G, -112, 344, Math.PI / 2, { parked: true, cruiser: true });
  // v6: a Trail Blazer dirt bike at the mountain trailhead, for the ride
  // up to the ski lodge — the only bike that likes the mountain road.
  createMotorcycle(G, -200, 470, Math.PI / 2, { parked: true, dirt: true });
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

// v7: the Stunt Hawk 450 — a lightweight stunt bike with a short
// wheelbase and a long travel fork, built for the skate park and the
// beach ramp. It wheelies on demand (hold sprint + back while moving),
// stoppies on the front brake, and its lean is twice as dramatic as
// the Comet's, because a stunt bike that does not lean is just a slow
// motorcycle with opinions.

export const STUNT_SPEC = {
  name: 'Stunt Hawk 450',
  topSpeed: 38,
  accel: 30,
  turn: 3.0,
  colors: [0xff5a2a, 0x2a2a2a, 0xffd23e],
};

const STUNT_SPOT = { x: -48, z: 296 };

export function spawnStuntBike(G) {
  const bike = createMotorcycle(G, STUNT_SPOT.x, STUNT_SPOT.z, Math.PI / 2, {
    parked: true,
    color: 0xff5a2a,
  });
  // The stunt spec is fitted after the build — the frame is a Comet's,
  // the gearing is the Hawk's.
  bike.spec = STUNT_SPEC;
  bike.name = 'Stunt Hawk 450';
  G.stuntBike = bike;
  return bike;
}

// v7: wheelies and stoppies — the stunt layer. While Mara rides any
// bike, holding sprint + back lifts the front wheel (a wheelie, +style),
// and braking hard from speed lifts the rear (a stoppie). Both are
// tracked: the longest wheelie is a season record at the skate park.
export function createBikeStunts(G) {
  const st = {
    wheelieTimer: 0,
    longestWheelie: 0,
    stoppieTimer: 0,
    longestStoppie: 0,
    stunts: 0,
  };
  G.bikeStunts = st;
  return st;
}

export function updateBikeStuntsV7(G, dt) {
  const st = G.bikeStunts;
  if (!st) return;
  const bike = G.driving;
  const ridingBike = bike && (bike.spec === MOTORCYCLE_SPEC || bike.spec === CRUISER_SPEC
    || bike.spec === DIRT_SPEC || bike.spec === STUNT_SPEC);
  if (!ridingBike) {
    st.wheelieTimer = 0;
    st.stoppieTimer = 0;
    return;
  }
  const speed = Math.abs(bike.speed || 0);
  // Wheelie: sprint + back while rolling — the front wheel comes up and
  // the bike balances on the rear for as long as she holds it.
  if (G.input.down('sprint') && G.input.down('back') && speed > 8) {
    st.wheelieTimer += dt;
    if (bike.mesh) bike.mesh.rotation.x = -0.35;
    if (st.wheelieTimer > st.longestWheelie) st.longestWheelie = st.wheelieTimer;
  } else {
    if (st.wheelieTimer > 2) {
      st.stunts += 1;
      G.hud.toast(`Wheelie held ${st.wheelieTimer.toFixed(1)}s — the skate park crowd approves.`);
    }
    st.wheelieTimer = 0;
    if (bike.mesh) bike.mesh.rotation.x = 0;
  }
  // Stoppie: hard brake from speed — the rear wheel comes up.
  if (G.input.down('back') && speed > 20 && !G.input.down('sprint')) {
    st.stoppieTimer += dt;
    if (bike.mesh) bike.mesh.rotation.x = 0.3;
    if (st.stoppieTimer > st.longestStoppie) st.longestStoppie = st.stoppieTimer;
  } else if (st.stoppieTimer > 0) {
    if (st.stoppieTimer > 1.5) {
      st.stunts += 1;
      G.hud.toast(`Stoppie ${st.stoppieTimer.toFixed(1)}s — stop showing off. Actually, keep going.`);
    }
    st.stoppieTimer = 0;
    if (bike.mesh) bike.mesh.rotation.x = 0;
  }
}

export function bikeStuntsSummary(G) {
  const st = G.bikeStunts;
  if (!st) return 'No stunt bike on the road.';
  return `${st.stunts} stunts · longest wheelie ${st.longestWheelie.toFixed(1)}s · longest stoppie ${st.longestStoppie.toFixed(1)}s.`;
}
