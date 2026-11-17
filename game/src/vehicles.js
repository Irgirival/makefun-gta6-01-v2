// vehicles.js — every car in Solmar City: five types with distinct speed,
// handling and colours, built from boxes with wheels, headlights and brake
// lights. Owns the arcade driving model, entering/exiting with E, car
// stealing (pull the driver out of a traffic car), and car-vs-car / car-vs-
// building collisions.

import * as THREE from 'three';
import { pick, range } from './random.js';

export const VEHICLE_TYPES = {
  sedan:   { name: 'Solmar Sedan',   topSpeed: 34, accel: 22, turn: 1.7, colors: [0xb8c4c9, 0x8a2f2f, 0x3a4a5a, 0xd8d3c0] },
  taxi:    { name: 'Sun Taxi',       topSpeed: 32, accel: 20, turn: 1.8, colors: [0xffc21a] },
  sports:  { name: 'Vortex GT',     topSpeed: 48, accel: 30, turn: 2.1, colors: [0xd81a2a, 0x1a6ad8, 0xf0f0f0] },
  van:     { name: 'Harbor Van',     topSpeed: 26, accel: 16, turn: 1.4, colors: [0x5a6a5a, 0xc9c9c9, 0x8a6a4a] },
  police:  { name: 'Solmar PD Cruiser', topSpeed: 40, accel: 28, turn: 2.0, colors: [0x1a1a22] },
};

function buildCarMesh(type, color, rng) {
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const isVan = type === 'van';
  const isPolice = type === 'police';
  const bodyLen = isVan ? 5.2 : 4.4;
  const bodyH = isVan ? 1.5 : 0.85;

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, bodyH, bodyLen), mat(color));
  body.position.y = 0.75; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, isVan ? 2.6 : 2.0),
    mat(isVan ? color : 0x1a2a3a));
  cabin.position.set(0, bodyH + 0.55, isVan ? 0.3 : -0.2); group.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.28, bodyLen * 0.9), mat(0xf0f0f0));
    stripe.position.y = 0.85; group.add(stripe);
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), mat(0x222222));
    lightBar.position.set(0, bodyH + 1.05, -0.2); group.add(lightBar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.52),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.32, bodyH + 1.18, -0.2); group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.52),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    blue.position.set(0.32, bodyH + 1.18, -0.2); group.add(blue);
    group.userData.lightRed = red; group.userData.lightBlue = blue;
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xaa8800 }));
    sign.position.set(0, bodyH + 1.05, -0.2); group.add(sign);
  }
  // Headlights and tail lights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 });
  for (const sx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), headMat);
    h.position.set(sx, 0.75, bodyLen / 2 + 0.02); group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x660000 }));
    t.position.set(sx, 0.75, -bodyLen / 2 - 0.02); group.add(t);
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
  const wheelMat = mat(0x181818);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }
  // Soft contact shadow.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, bodyLen + 0.8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04;
  group.add(shadow);
  group.userData.wheels = wheels;
  group.userData.bodyLen = bodyLen;
  return group;
}

export function createVehicle(G, type, x, z, heading, opts = {}) {
  const spec = VEHICLE_TYPES[type];
  const rng = G.rng;
  const color = opts.color ?? pick(rng, spec.colors);
  const mesh = buildCarMesh(type, color, rng);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  const v = {
    type, spec, mesh, color,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    driver: opts.driver ?? null,   // 'player' | 'traffic' | 'police' | null (parked)
    occupied: opts.occupied ?? false,
    parked: opts.parked ?? false,
    radius: 2.2,
    brakeLights: false,
    crashCooldown: 0,    // gates crash sound + heat so one smash counts once
    id: G.vehicles.length,
  };
  G.vehicles.push(v);
  return v;
}

// Parked cars along the curbs, plus a few free ones to steal.
export function spawnParkedCars(G) {
  const rng = G.rng;
  const types = ['sedan', 'sedan', 'taxi', 'sports', 'van', 'sedan'];
  let placed = 0;
  let guard = 0;
  while (placed < 16 && guard++ < 300) {
    const alongX = rng() < 0.5;
    const road = pick(rng, G.city.roads.xs);
    const other = range(rng, -300, 300);
    const x = alongX ? road + (rng() < 0.5 ? 5.2 : -5.2) : other;
    const z = alongX ? other : road + (rng() < 0.5 ? 5.2 : -5.2);
    if (Math.hypot(x - 20, z - 30) < 18) continue; // keep Mara's spawn clear
    const heading = alongX ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const type = types[placed % types.length];
    createVehicle(G, type, x, z, heading, { parked: true, occupied: false });
    placed++;
  }
  // A sports car waiting near the plaza, for the first mission.
  createVehicle(G, 'sports', 36, 34, Math.PI / 2, { parked: true });
}

export function updateVehicle(G, v, dt, input) {
  const spec = v.spec;
  const isPlayer = v.driver === 'player';
  let throttle = 0, brake = 0, steerTarget = 0;

  if (isPlayer && input) {
    throttle = input.down('forward') ? 1 : input.down('back') ? -0.6 : 0;
    brake = input.down('back') && v.speed > 1 ? 1 : 0;
    if (input.down('back') && v.speed > 1) throttle = 0;
    steerTarget = (input.down('left') ? 1 : 0) - (input.down('right') ? 1 : 0);
    // Handbrake-ish: space locks the rear.
    if (input.down('jump')) { v.speed *= Math.max(0, 1 - dt * 3); }
  } else if (v.driver === 'police') {
    // Police steering is set by police.js through v.steerTarget / v.throttleTarget.
    throttle = v.throttleTarget ?? 0;
    steerTarget = v.steerTarget ?? 0;
  } else if (v.driver === 'traffic') {
    throttle = v.throttleTarget ?? 0;
    steerTarget = v.steerTarget ?? 0;
  }

  // Steering eases toward the target; faster cars turn less.
  const steerRate = 4.5;
  v.steer += (steerTarget - v.steer) * Math.min(1, dt * steerRate);
  const steerEffect = v.steer * spec.turn * Math.min(1, Math.abs(v.speed) / 8 + 0.15);
  // Turn rate scales with speed; reverse flips the steering.
  if (v.speed !== 0) v.heading += steerEffect * dt * (v.speed > 0 ? 1 : -1);

  // Longitudinal physics: accelerate, brake, drag.
  if (throttle > 0) v.speed += spec.accel * throttle * dt;
  if (throttle < 0) v.speed += spec.accel * throttle * 0.7 * dt;
  if (brake) v.speed -= Math.sign(v.speed) * 42 * dt;
  v.speed -= v.speed * 0.55 * dt; // rolling drag
  if (Math.abs(v.speed) < 0.15 && throttle === 0) v.speed = 0;
  v.speed = Math.max(-spec.topSpeed * 0.45, Math.min(spec.topSpeed, v.speed));

  const nx = v.pos.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.pos.z + Math.cos(v.heading) * v.speed * dt;
  const before = v.pos.clone();
  v.pos.x = nx; v.pos.z = nz;
  if (v.crashCooldown > 0) v.crashCooldown -= dt;
  const hitWall = G.city.collideCircle(v.pos, v.radius);
  if (hitWall) {
    v.speed *= 0.45; // scrape the wall, lose speed
    if (isPlayer && Math.abs(v.speed) > 6 && v.crashCooldown <= 0) {
      G.audio.crash();
      v.crashCooldown = 1.5;
    }
  }
  // Car-vs-car: push apart and trade a little speed.
  for (const other of G.vehicles) {
    if (other === v) continue;
    {
      const dx = v.pos.x - other.pos.x, dz = v.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      const min = v.radius + other.radius - 0.6;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d, uz = dz / d;
        v.pos.x += ux * push; v.pos.z += uz * push;
        if (!other.parked) { other.pos.x -= ux * push; other.pos.z -= uz * push; }
        const impact = Math.abs(v.speed - other.speed);
        v.speed *= 0.7;
        if (isPlayer && impact > 8 && v.crashCooldown <= 0) {
          G.audio.crash();
          v.crashCooldown = 1.5;
          // Only the aggressor raises the heat: Mara is at fault only when
          // she is moving toward the car she hits. Being rear-ended by a
          // cruiser — even a slower one — is the PD's fault, not hers.
          const dxN = (other.pos.x - v.pos.x) / d;
          const dzN = (other.pos.z - v.pos.z) / d;
          const closing = Math.sin(v.heading) * v.speed * dxN + Math.cos(v.heading) * v.speed * dzN;
          if (closing > 2) {
            G.wanted.addHeat(G.config.heatPerCrime.hitPed * 0.5, 'crash');
          }
        }
      }
    }
  }

  // Mesh follows the physics; wheels spin and steer.
  v.mesh.position.set(v.pos.x, 0, v.pos.z);
  v.mesh.rotation.y = v.heading;
  const wheels = v.mesh.userData.wheels;
  for (let i = 0; i < wheels.length; i++) {
    wheels[i].rotation.x += v.speed * dt * 2.2;
    if (i < 2) wheels[i].rotation.y = v.steer * 0.35;
  }
  // Brake lights glow when slowing.
  v.brakeLights = brake > 0 || throttle < 0;
}

// The nearest car the player can enter (within 4 units, on foot).
export function nearestEnterableCar(G) {
  const p = G.player.pos;
  let best = null, bd = 4.2;
  for (const v of G.vehicles) {
    if (v.driver === 'player') continue;
    const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

export function enterCar(G, v) {
  const p = G.player;
  if (v.driver === 'traffic') {
    // Car stealing: the driver is pulled out and flees on foot.
    G.wanted.addHeat(G.config.heatPerCrime.steal, 'stole a car');
    G.hud.toast('Car stolen! The Solmar PD is on to you.');
    G.audio.horn();
    G.pedestrians.spawnFleeingPed(G, v.pos.x + 2, v.pos.z + 2);
  } else if (v.parked) {
    G.hud.toast(`You took the ${v.spec.name}.`);
    G.audio.doorSlam();
  }
  v.driver = 'player';
  v.parked = false;
  v.occupied = true;
  G.driving = v;
  p.group.visible = false;
  G.audio.engineStart();
  return v;
}

export function exitCar(G) {
  const v = G.driving;
  if (!v) return;
  const p = G.player;
  const side = 2.6;
  p.pos.set(
    v.pos.x + Math.cos(v.heading) * side,
    0,
    v.pos.z - Math.sin(v.heading) * side,
  );
  G.city.collideCircle(p.pos, G.config.playerRadius);
  v.driver = null;
  v.parked = true;
  v.speed = 0;
  G.driving = null;
  p.group.visible = true;
  p.group.position.copy(p.pos);
  p.heading = v.heading;
  p.camYaw = v.heading + Math.PI;
  G.audio.engineStop();
}

// Chase camera while driving; called from main.js instead of player camera.
export function updateDriveCamera(G, dt) {
  const v = G.driving;
  if (!v) return;
  const cam = G.camera;
  const back = 11 + Math.abs(v.speed) * 0.08;
  const up = 4.2 + Math.abs(v.speed) * 0.02;
  const tx = v.pos.x - Math.sin(v.heading) * back;
  const tz = v.pos.z - Math.cos(v.heading) * back;
  cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 5);
  cam.position.y += (up - cam.position.y) * Math.min(1, dt * 5);
  cam.position.z += (tz - cam.position.z) * Math.min(1, dt * 5);
  cam.lookAt(v.pos.x + Math.sin(v.heading) * 6, 1.2, v.pos.z + Math.cos(v.heading) * 6);
}
