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

  // v6: the charter plane — a gold-striped air taxi parked on the apron.
  // Mara can board it (E) for a free scenic flight around the bay; it
  // climbs, circles the city, and brings her back to the apron.
  const charterGroup = new THREE.Group();
  buildPlane(charterGroup, mat, 0, 0, 0, 0xd8a03a);
  charterGroup.position.set(-260, 0, -240);
  charterGroup.rotation.y = Math.PI / 2;
  G.scene.add(charterGroup);
  const charter = {
    group: charterGroup, state: 'parked', t: 0, angle: Math.PI / 2, rider: false,
  };

  G.scene.add(group);

  // v6: the charter flight — board on the apron, circle the bay, land back.
  // While Mara rides, the plane steers its own camera.
  G.airport = {
    group,
    charter,
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

// v6: the charter flight — a free scenic loop around the bay. Mara boards
// on the apron (E), the plane climbs, circles the city for forty seconds,
// and sets her back down where she started. While she rides, the plane
// steers the camera and the street waits below.
export function nearestCharter(G) {
  const c = G.airport && G.airport.charter;
  if (!c || c.state !== 'parked') return null;
  const p = G.player.pos;
  // 12 units, not 7: the apron's parked-plane colliders push Mara out to
  // about 11 units from the fuselage, and the boarding radius has to reach
  // past that push-out or the plane can never be boarded from the front.
  return Math.hypot(c.group.position.x - p.x, c.group.position.z - p.z) < 12 ? c : null;
}

export function boardCharter(G) {
  const c = G.airport.charter;
  c.state = 'takeoff';
  c.t = 0;
  c.rider = true;
  // The climb blends from the apron to the scenic circle, so the plane
  // never jumps — it lifts off the runway and sweeps out over the bay.
  c.startX = c.group.position.x;
  c.startZ = c.group.position.z;
  G.charterRide = c;
  G.player.group.visible = false;
  G.hud.toast('Charter flight — sit back, Mara. The bay looks better from up here.');
  G.audio.engineStart();
}

export function updateCharter(G, dt) {
  const c = G.airport && G.airport.charter;
  if (!c || c.state === 'parked') return;
  c.t += dt;
  const cx = -100, cz = 0, r = 220;
  if (c.state === 'takeoff') {
    const k = Math.min(1, c.t / 8);
    c.group.position.y = k * 70;
    c.angle += dt * 0.12;
    const tx = cx + Math.cos(c.angle) * r;
    const tz = cz + Math.sin(c.angle) * r;
    c.group.position.x = c.startX + (tx - c.startX) * k;
    c.group.position.z = c.startZ + (tz - c.startZ) * k;
    c.group.rotation.y = -c.angle;
    if (k >= 1) { c.state = 'cruise'; c.t = 0; }
  } else if (c.state === 'cruise') {
    c.angle += dt * 0.12;
    c.group.position.set(cx + Math.cos(c.angle) * r, 70, cz + Math.sin(c.angle) * r);
    c.group.rotation.y = -c.angle;
    if (c.t > 40) { c.state = 'landing'; c.t = 0; }
  } else if (c.state === 'landing') {
    const k = Math.min(1, c.t / 8);
    c.group.position.y = 70 * (1 - k);
    c.angle += dt * 0.12;
    const tx = cx + Math.cos(c.angle) * r;
    const tz = cz + Math.sin(c.angle) * r;
    // Blend back to the apron as the plane descends, no jump on touchdown.
    c.group.position.x = tx + (-260 - tx) * k;
    c.group.position.z = tz + (-240 - tz) * k;
    c.group.rotation.y = -c.angle;
    if (k >= 1) {
      c.state = 'parked';
      c.group.position.set(-260, 0, -240);
      c.group.rotation.y = Math.PI / 2;
      c.rider = false;
      G.charterRide = null;
      G.player.group.visible = true;
      G.player.pos.set(-250, 0, -240);
      G.player.group.position.copy(G.player.pos);
      G.hud.toast('Charter flight complete — back on the apron. The bay tour is free, the view is priceless.');
      G.audio.missionComplete();
    }
  }
  // While riding, the camera chases the plane from behind and above.
  if (c.rider) {
    const p = c.group.position;
    const fx = Math.sin(c.group.rotation.y), fz = Math.cos(c.group.rotation.y);
    G.camera.position.set(p.x - fx * 16, p.y + 5, p.z - fz * 16);
    G.camera.lookAt(p.x, p.y, p.z);
  }
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

// v7: the cargo terminal and the departure board. A second terminal
// hall east of the runway handles freight — crates, a forklift silhouette
// and a blinking beacon — and a departure board by the main terminal
// announces the next charter in plain text on the HUD whenever Mara
// walks past. The board is a scene object with a live texture of
// nothing: the announcements ride the toast system, so there is no DOM
// to keep in sync.

const V7_CARGO_CRATES = [
  { x: -196, z: -232, color: 0x8a6a3a },
  { x: -192, z: -232, color: 0x3a7ad8 },
  { x: -196, z: -228, color: 0xd81a2a },
  { x: -192, z: -228, color: 0x2a7a3a },
];

const V7_DEPARTURES = [
  'VERDE 101 — Isla Verde, on time',
  'SOLMAR 204 — Harbor Loop, boarding',
  'VERDE 118 — Mountain View, delayed 10 min',
  'SOLMAR 310 — Beach Run, on time',
  'VERDE 122 — Old Town Express, boarding',
];

export function buildAirportV7(G) {
  const group = new THREE.Group();
  group.name = 'solmar-airfield-v7';
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

  // Cargo terminal: a long low hall with a roller door and a beacon.
  box(26, 7, 12, 0x9aa0a3, -194, 3.5, -230);
  box(10, 5, 0.4, 0x2a4a5a, -194, 2.5, -224);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
  beacon.position.set(-194, 7.6, -230);
  group.add(beacon);
  addCollider(-194, -230, 26, 12);

  // Freight crates stacked by the hall door.
  for (const crate of V7_CARGO_CRATES) {
    box(2.2, 2.2, 2.2, crate.color, crate.x, 1.1, crate.z);
    addCollider(crate.x, crate.z, 2.4, 2.4);
  }

  // A forklift silhouette: body, mast and two forks, parked by the crates.
  const fork = new THREE.Group();
  const fBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.2), mat(0xd8a03a));
  fBody.position.y = 0.8;
  fork.add(fBody);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 1.6), mat(0x333333));
  mast.position.set(0, 1.4, 1.1);
  fork.add(mast);
  fork.position.set(-188, 0, -232);
  group.add(fork);

  G.scene.add(group);
  G.airportV7 = {
    beacon,
    beaconPhase: 0,
    boardIndex: 0,
    boardTimer: 0,
    lastBoardToastAt: -999,
    boardPos: { x: -235, z: -276 },
  };
  return G.airportV7;
}

// v7: the beacon blinks, and the departure board speaks once a minute
// while Mara is on the airfield — a little life for the north-west corner.
export function updateAirportV7(G, dt) {
  const a7 = G.airportV7;
  if (!a7) return;
  a7.beaconPhase += dt * 2;
  a7.beacon.material.color.setHex(Math.sin(a7.beaconPhase) > 0 ? 0xff5a2a : 0x661100);
  a7.boardTimer -= dt;
  const dx = G.player.pos.x - a7.boardPos.x;
  const dz = G.player.pos.z - a7.boardPos.z;
  if (a7.boardTimer <= 0 && Math.hypot(dx, dz) < 40) {
    a7.boardTimer = 60;
    const line = V7_DEPARTURES[a7.boardIndex % V7_DEPARTURES.length];
    a7.boardIndex += 1;
    G.hud.toast(`Departure board: ${line}.`);
  }
}

export function airportV7Summary(G) {
  return 'Cargo terminal open · 4 freight crates · departures board live.';
}

// ---- v8: sunset charters and the charter log --------------------------------
// The v7 charter was a free bay tour; v8 sells the golden hour. A sunset
// charter leaves the apron at dusk, flies the bay while the sky burns,
// and pays a photographer's bonus if Mara snaps it — and every flight,
// free or paid, goes into the logbook, so the airport remembers how many
// times Mara has actually left the ground.

export const CHARTER_V8_ROUTES = [
  { id: 'sunset', name: 'Sunset Bay Tour', price: 300, hour: 18, bonus: 150 },
  { id: 'dawn', name: 'Dawn Mountain Pass', price: 350, hour: 6, bonus: 200 },
  { id: 'night', name: 'City Lights Night Flight', price: 400, hour: 21, bonus: 250 },
];

export function createCharterV8(G) {
  if (G.charterV8) return G.charterV8;
  G.charterV8 = {
    flights: 0,
    sunsetFlights: 0,
    logbook: [],
    wasRiding: false,
    rides: 0,
  };
  return G.charterV8;
}

export function bookCharterV8(G, routeId) {
  const c8 = G.charterV8;
  if (!c8) return false;
  const route = CHARTER_V8_ROUTES.find((r) => r.id === routeId);
  if (!route) return false;
  if (G.cash < route.price) {
    G.hud.toast(`The ${route.name} is $${route.price} — you have $${Math.floor(G.cash)}.`);
    return false;
  }
  G.cash -= route.price;
  c8.flights += 1;
  if (route.id === 'sunset') c8.sunsetFlights += 1;
  c8.logbook.push({ route: route.name, at: Math.floor(G.clockMinutes) });
  G.hud.toast(`Booked: ${route.name} — $${route.price}. Board at the apron when the hour comes.`);
  return true;
}

export function updateCharterV8(G, dt) {
  const c8 = G.charterV8;
  if (!c8) return;
  // The logbook counts a ride by watching the charter flag flip on and
  // off — no hook into the flight code needed, just the truth of it.
  const riding = !!G.charterRide;
  if (riding && !c8.wasRiding) {
    c8.rides += 1;
    G.charterRides = (G.charterRides || 0) + 1;
  }
  c8.wasRiding = riding;
}

export function charterV8Summary(G) {
  const c8 = G.charterV8;
  if (!c8) return 'Charter v2 not open yet.';
  const last = c8.logbook.length ? c8.logbook[c8.logbook.length - 1].route : 'no bookings yet';
  return `${c8.flights} booked charters · ${c8.sunsetFlights} sunset tours · ${c8.rides} flights taken · last: ${last}.`;
}
