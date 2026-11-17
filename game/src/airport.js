// airport.js — Solmar Airfield, the new north-west district: a runway with
// edge lights, a terminal, a control tower, two hangars, parked planes, a
// fuel farm and cargo rows. It replaces the four north-west blocks (the city
// builder skips them), registers its own colliders, and hands mission 6 its
// locations. Everything is seeded, so the airfield is identical every run.

import * as THREE from 'three';

// The four blocks the airfield owns (city.js skips buildings here).
export const AIRFIELD_BLOCKS = new Set(['-300,-300', '-220,-300', '-300,-220', '-220,-220']);

const TERMINAL = { x: -235, z: -286 };
const TOWER = { x: -200, z: -288 };
const HANGAR_A = { x: -312, z: -286 };
const HANGAR_B = { x: -308, z: -234 };
const FUEL = { x: -210, z: -232 };
const RUNWAY = { z: -260, x0: -325, x1: -195 };
const PLANE_SPOTS = [
  { x: -272, z: -278, heading: Math.PI / 2, color: 0x2a7ad8 },
  { x: -208, z: -278, heading: Math.PI / 2, color: 0xd83a3a },
  // v3: the Verde Heist getaway plane, waiting by hangar B with its door open.
  { x: -292, z: -240, heading: -Math.PI / 2, color: 0x2a7a3a },
];

export function buildAirport(G) {
  const group = new THREE.Group();
  group.name = 'solmar-airfield';
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const box = (w, h, d, color, x, y, z, opts) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const addCollider = (cx, cz, w, d) => {
    G.city.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  };

  // Apron: pale concrete under the terminal and planes.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(150, 60), mat(0x8a8f94));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(-260, 0.03, -278);
  group.add(apron);

  // Runway: dark asphalt with a dashed white centre line and threshold bars.
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(RUNWAY.x1 - RUNWAY.x0, 16), mat(0x23262c));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set((RUNWAY.x0 + RUNWAY.x1) / 2, 0.04, RUNWAY.z);
  group.add(runway);
  const dashGeo = new THREE.BoxGeometry(6, 0.06, 0.8);
  const dashMat = mat(0xf0f0f0);
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 20);
  let di = 0;
  for (let x = RUNWAY.x0 + 8; x < RUNWAY.x1 - 4 && di < 20; x += 10) {
    dashes.setMatrixAt(di++, new THREE.Matrix4().setPosition(x, 0.08, RUNWAY.z));
  }
  dashes.count = di;
  group.add(dashes);
  // Runway edge lights: small amber lamps down both sides.
  const lampGeo = new THREE.SphereGeometry(0.35, 6, 5);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xffc94d, emissive: 0xaa7711 });
  for (let x = RUNWAY.x0 + 4; x <= RUNWAY.x1; x += 12) {
    for (const z of [RUNWAY.z - 7.4, RUNWAY.z + 7.4]) {
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, 0.4, z);
      group.add(lamp);
    }
  }
  // Taxiway: a lighter strip south of the runway, joining the apron.
  const taxi = new THREE.Mesh(new THREE.PlaneGeometry(140, 8), mat(0x3a3f45));
  taxi.rotation.x = -Math.PI / 2;
  taxi.position.set(-260, 0.035, -244);
  group.add(taxi);

  // Terminal: glass-fronted hall with a roof lip and a striped awning.
  box(30, 9, 12, 0xc9d4dc, TERMINAL.x, 4.5, TERMINAL.z);
  box(32, 0.6, 14, 0x5a6068, TERMINAL.x, 9.3, TERMINAL.z);
  box(26, 4.5, 0.4, 0x9fd4ff, TERMINAL.x, 4.5, TERMINAL.z + 6.1, { emissive: 0x2a4a66 });
  box(30, 0.8, 3, 0xffd23e, TERMINAL.x, 6.8, TERMINAL.z + 7);
  // Terminal doors: two dark slabs.
  box(3, 5, 0.5, 0x2a3542, TERMINAL.x - 4, 2.5, TERMINAL.z + 6.2);
  box(3, 5, 0.5, 0x2a3542, TERMINAL.x + 4, 2.5, TERMINAL.z + 6.2);
  addCollider(TERMINAL.x, TERMINAL.z, 30, 12);

  // Control tower: concrete shaft, glass cab, antenna mast.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 24, 10), mat(0xb8b0a0));
  shaft.position.set(TOWER.x, 12, TOWER.z);
  group.add(shaft);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.2, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0x9fd4ff, emissive: 0x2a4a66 }));
  cab.position.set(TOWER.x, 26, TOWER.z);
  group.add(cab);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), mat(0x333333));
  mast.position.set(TOWER.x, 31, TOWER.z);
  group.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xcc0000 }));
  beacon.position.set(TOWER.x, 34, TOWER.z);
  group.add(beacon);
  addCollider(TOWER.x, TOWER.z, 9, 9);

  // Hangars: big arched-front sheds with a dark open mouth.
  for (const h of [HANGAR_A, HANGAR_B]) {
    box(24, 10, 12, 0x7a8a94, h.x, 5, h.z);
    box(24, 1, 12.6, 0x5a6068, h.x, 10.2, h.z);
    box(20, 7, 0.5, 0x1a2028, h.x, 3.5, h.z + 6.1);
    addCollider(h.x, h.z, 24, 12);
  }

  // Fuel farm: three white tanks with red bands, fenced in.
  for (let i = 0; i < 3; i++) {
    const tx = FUEL.x + (i - 1) * 10;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6, 12), mat(0xe8e8e8));
    tank.position.set(tx, 3, FUEL.z);
    group.add(tank);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.25, 0.8, 12), mat(0xd83a3a));
    band.position.set(tx, 4.6, FUEL.z);
    group.add(band);
    addCollider(tx, FUEL.z, 7, 7);
  }

  // Cargo rows: stacked containers near the terminal.
  const contColors = [0xc9a03a, 0x3a7ad8, 0xd83a3a, 0x3a8a5a];
  const crng = G.rng;
  for (let i = 0; i < 5; i++) {
    const cx = -268 + (i % 3) * 13;
    const cz = -238 + Math.floor(i / 3) * 8;
    const c = contColors[Math.floor(crng() * contColors.length)];
    box(12, 3, 5, c, cx, 1.5, cz);
    if (crng() < 0.5) box(12, 3, 5, contColors[Math.floor(crng() * contColors.length)], cx, 4.5, cz);
    addCollider(cx, cz, 12, 5);
  }

  // Parked planes on the apron.
  for (const spot of PLANE_SPOTS) {
    buildPlane(group, mat, spot.x, spot.z, spot.heading, spot.color);
    addCollider(spot.x, spot.z, 14, 16);
  }

  // Windsock: striped cone on a pole, pointing down the runway.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), mat(0xd8d3c0));
  pole.position.set(-196, 4, -276);
  group.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 8), mat(0xff7a2a));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(-194.2, 7.6, -276);
  group.add(sock);

  // v5: the fuel truck by the fuel farm — a cab, a silver tank and hazard
  // stripes, parked where the planes drink. It marks the fuel farm for
  // Mission 10's runway run.
  const truck = new THREE.Group();
  const truckCab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.8), mat(0xd8a03a));
  truckCab.position.set(0, 1.0, 2.6);
  truck.add(truckCab);
  const truckTank = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 4.4, 12), mat(0xc9c9c9));
  truckTank.rotation.x = Math.PI / 2;
  truckTank.position.set(0, 1.4, -0.8);
  truck.add(truckTank);
  const hazardStripe = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 0.2),
    new THREE.MeshLambertMaterial({ color: 0xd81a2a, emissive: 0x440000 }));
  hazardStripe.position.set(0, 1.4, -3.05);
  truck.add(hazardStripe);
  for (const [wx, wz] of [[-1.0, 2.6], [1.0, 2.6], [-1.0, -1.6], [1.0, -1.6]]) {
    const truckWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10), mat(0x181818));
    truckWheel.rotation.z = Math.PI / 2;
    truckWheel.position.set(wx, 0.45, wz);
    truck.add(truckWheel);
  }
  truck.position.set(FUEL.x + 6, 0, FUEL.z + 4);
  truck.rotation.y = Math.PI / 2;
  group.add(truck);
  addCollider(FUEL.x + 6, FUEL.z + 4, 3, 6);

  G.scene.add(group);

  G.airport = {
    group,
    terminal: TERMINAL,
    tower: TOWER,
    hangarA: HANGAR_A,
    hangarB: HANGAR_B,
    fuel: FUEL,
    runwayEast: { x: RUNWAY.x1 - 6, z: RUNWAY.z },
    runwayWest: { x: RUNWAY.x0 + 6, z: RUNWAY.z },
    runway: RUNWAY,
  };
  return G.airport;
}

function buildPlane(group, mat, x, z, heading, stripeColor) {
  const plane = new THREE.Group();
  const white = mat(0xf0f0f0);
  const stripe = mat(stripeColor);
  // Fuselage: a long cylinder along z, nose cone, tail cone.
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 13, 12), white);
  fus.rotation.x = Math.PI / 2;
  plane.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 12), white);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 7.8;
  plane.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 12), white);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -7.4;
  plane.add(tail);
  // Cheatline stripe along the fuselage.
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 12.5), stripe);
  line.position.set(1.28, 0.1, 0);
  plane.add(line);
  const line2 = line.clone();
  line2.position.x = -1.28;
  plane.add(line2);
  // Wings and tailplanes.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(17, 0.28, 3.2), white);
  wing.position.set(0, -0.2, 0.5);
  plane.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 3.2), stripe);
  wingTipL.position.set(-8.5, 0.2, 0.5);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 8.5;
  plane.add(wingTipR);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.24, 2.2), white);
  tailplane.position.set(0, 0.6, -6.2);
  plane.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 2.6), stripe);
  fin.position.set(0, 1.8, -6.2);
  plane.add(fin);
  // Engines under the wings.
  for (const sx of [-3.4, 3.4]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 10), mat(0x8a8f94));
    eng.rotation.x = Math.PI / 2;
    eng.position.set(sx, -0.9, 1.2);
    plane.add(eng);
  }
  plane.position.set(x, 1.5, z);
  plane.rotation.y = heading;
  group.add(plane);
  return plane;
}
