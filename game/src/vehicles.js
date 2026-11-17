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
  bus:     { name: 'Solmar City Bus', topSpeed: 24, accel: 12, turn: 1.2, colors: [0x2a7a3a, 0xd8a03a] },
  // v5: two heavyweight steals. The armored van is slow, shrugs off bumps
  // and carries the bank's money; the limousine is long, low and built for
  // the boardwalk — both parked in the open, both stealable.
  armored: { name: 'Solmar Armored Van', topSpeed: 30, accel: 18, turn: 1.5, colors: [0x3a4a3a, 0x5a5a5a] },
  limo:    { name: 'Verde Limousine', topSpeed: 38, accel: 24, turn: 1.5, colors: [0x1a1a22, 0xf0f0f0, 0x6a1a2a] },
  // v6: the fire engine — long, heavy, red, with a ladder on top and a
  // light bar that clears traffic when Mara drives it with the siren live.
  firetruck: { name: 'Solmar Fire Engine', topSpeed: 30, accel: 20, turn: 1.4, colors: [0xd81a1a, 0xc9a03a] },
};

function buildCarMesh(type, color, rng) {
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const isVan = type === 'van';
  const isPolice = type === 'police';
  // v6: the big rigs — the city bus and the fire engine are long, tall and
  // slow to turn, and their axles sit wide apart like the limousine's.
  const isFireTruck = type === 'firetruck';
  const isBus = type === 'bus';
  const bodyLen = isVan ? 5.2 : isBus ? 7.4 : isFireTruck ? 7.0 : 4.4;
  const bodyH = isVan ? 1.5 : isBus ? 1.7 : isFireTruck ? 1.6 : 0.85;
  const isArmored = type === 'armored';
  const isLimo = type === 'limo';
  const limoLen = isLimo ? 6.8 : bodyLen;
  const limoH = isLimo ? 1.0 : bodyH;

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, limoH, isArmored ? 5.4 : limoLen), mat(color));
  body.position.y = 0.75; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, isVan ? 2.6 : 2.0),
    mat(isVan ? color : 0x1a2a3a));
  cabin.position.set(0, limoH + 0.55, isVan ? 0.3 : -0.2); group.add(cabin);
  if (isArmored) {
    // Plated sides, a roof hatch and a bull bar: the bank's van does not
    // apologise to anything it meets.
    for (const sx of [-1.02, 1.02]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 4.6), mat(0x2a2a2a));
      plate.position.set(sx, 0.9, 0);
      group.add(plate);
    }
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.0), mat(0x1a1a1a));
    hatch.position.set(0, limoH + 0.1, 0.8);
    group.add(hatch);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.3), mat(0x3a3a3a));
    bar.position.set(0, 0.55, 2.85);
    group.add(bar);
    const vault = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x332200 }));
    vault.position.set(0, 1.0, -2.75);
    group.add(vault);
  }
  if (isLimo) {
    // Long body, privacy glass, a divider stripe and a chauffeur's cap
    // on the roof: the Verde Limousine is a party with four wheels.
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.55, 3.4),
      new THREE.MeshLambertMaterial({ color: 0x0a0a12, emissive: 0x111122 }));
    glass.position.set(0, limoH + 0.5, 0.4);
    group.add(glass);
    const divider = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 0.12), mat(0xd8a03a));
    divider.position.set(0, 1.15, 1.2);
    group.add(divider);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 10), mat(0x222222));
    cap.position.set(0, limoH + 0.95, -2.4);
    group.add(cap);
  }
  if (isBus) {
    // A long window band and a glowing destination sign: the city bus
    // reads as a bus from across the avenue, not as a stretched sedan.
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.7, 6.4),
      new THREE.MeshLambertMaterial({ color: 0x9fd0e8, emissive: 0x223344 }));
    band.position.y = 1.55;
    group.add(band);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x554400 }));
    sign.position.set(0, 1.55, 3.75);
    group.add(sign);
  }
  if (isFireTruck) {
    // Ladder on the roof, water tank at the back, a white cheatline and a
    // light bar up front — the engine is the loudest thing on the road.
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 6.4), mat(0xc9c9c9));
    ladder.position.set(0, limoH + 0.85, 0);
    group.add(ladder);
    for (let rz = -3; rz <= 3; rz += 1) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.18), mat(0x8a8a8a));
      rung.position.set(0, limoH + 0.98, rz);
      group.add(rung);
    }
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 2.2), mat(0x8a1a1a));
    tank.position.set(0, limoH + 0.35, -1.8);
    group.add(tank);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 6.9), mat(0xf0f0f0));
    stripe.position.y = 0.95;
    group.add(stripe);
  }
  if (isFireTruck || isArmored) {
    // A light bar the chase systems can flash: red and blue on the fire
    // engine, and on the Guard APC that rolls in at five stars.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), mat(0x222222));
    bar.position.set(0, bodyH + 1.05, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.52),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.32, bodyH + 1.18, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.52),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    blue.position.set(0.32, bodyH + 1.18, -0.2);
    group.add(blue);
    group.userData.lightRed = red;
    group.userData.lightBlue = blue;
  }
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
  // Headlights and tail lights — at the real nose and tail, so the long
  // limousine and the armored van light up where they actually end.
  const effLen = isArmored ? 5.4 : limoLen;
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 });
  for (const sx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), headMat);
    h.position.set(sx, 0.75, effLen / 2 + 0.02); group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x660000 }));
    t.position.set(sx, 0.75, -effLen / 2 - 0.02); group.add(t);
  }
  // Wheels — the limousine's axles sit wide apart, like the city bus and
  // the fire engine, whose long bodies need the same spread.
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
  const wheelMat = mat(0x181818);
  const wheels = [];
  const axle = (isLimo || isBus || isFireTruck) ? 2.4 : 1.45;
  for (const [wx, wz] of [[-0.95, axle], [0.95, axle], [-0.95, -axle], [0.95, -axle]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }
  // Soft contact shadow.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, effLen + 0.8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04;
  group.add(shadow);
  group.userData.wheels = wheels;
  group.userData.bodyLen = effLen;
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
  // v5: the armored van waits outside the museum bank block, and the
  // limousine outside the Verde Casino — both parked, both stealable.
  createVehicle(G, 'armored', 145.2, 128, 0, { parked: true });
  createVehicle(G, 'limo', -152, 512, Math.PI / 2, { parked: true });
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
  } else if (v.driver === 'race') {
    // v3: race rivals and the vigilante fugitive are steered by their own
    // modules through the same target fields traffic uses.
    throttle = v.throttleTarget ?? 0;
    steerTarget = v.steerTarget ?? 0;
  }

  // Steering eases toward the target; faster cars turn less. Rain cuts the
  // grip, so steering and acceleration both soften when the roads are wet.
  const grip = G.weather ? G.weather.grip : 1;
  const steerRate = 4.5;
  v.steer += (steerTarget - v.steer) * Math.min(1, dt * steerRate);
  // v5: sport suspension answers the wheel faster — Vic's tune, if fitted.
  const steerEffect = v.steer * spec.turn * (v.handlingBoost || 1) * (0.65 + 0.35 * grip) * Math.min(1, Math.abs(v.speed) / 8 + 0.15);
  // Turn rate scales with speed; reverse flips the steering.
  if (v.speed !== 0) v.heading += steerEffect * dt * (v.speed > 0 ? 1 : -1);

  // Longitudinal physics: accelerate, brake, drag.
  if (throttle > 0) v.speed += spec.accel * throttle * dt * grip;
  if (throttle < 0) v.speed += spec.accel * throttle * 0.7 * dt * grip;
  if (brake) v.speed -= Math.sign(v.speed) * 42 * dt;
  v.speed -= v.speed * 0.55 * dt; // rolling drag
  if (Math.abs(v.speed) < 0.15 && throttle === 0) v.speed = 0;
  // v3 garage tuning: an owned, upgraded car is genuinely faster. Nitro
  // stacks on top while it burns (nitro.js sets v.nitroBoost).
  const topSpeed = spec.topSpeed * (v.upgradeBoost || 1) * (v.nitroBoost || 1);
  v.speed = Math.max(-topSpeed * 0.45, Math.min(topSpeed, v.speed));

  const nx = v.pos.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.pos.z + Math.cos(v.heading) * v.speed * dt;
  const before = v.pos.clone();
  v.pos.x = nx; v.pos.z = nz;
  if (v.crashCooldown > 0) v.crashCooldown -= dt;
  const hitWall = G.city.collideCircle(v.pos, v.radius);
  if (hitWall) {
    // v5: the armored van shrugs off walls — plated sides, heavy frame.
    v.speed *= v.type === 'armored' ? 0.72 : 0.45; // scrape the wall, lose speed
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

  // Mesh follows the physics; wheels spin and steer. jumpY lifts the mesh
  // off the ground during a stunt jump (missions2.js sets it).
  v.mesh.position.set(v.pos.x, v.jumpY || 0, v.pos.z);
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
    // v5: stealing the bank's armored van is a bigger statement than
    // taking a sedan — the PD hears about it at once.
    if (v.type === 'armored') {
      G.wanted.addHeat(14, 'stole the armored van');
      G.hud.toast('The bank\'s armored van — the PD will notice this one.');
    }
    if (v.type === 'limo') {
      G.hud.toast('The Verde Limousine — arrive everywhere like you own it.');
    }
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
