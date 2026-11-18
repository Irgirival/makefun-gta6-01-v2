// busfire.js — the big rigs (v6). A drivable Solmar City Bus that earns
// fares along its route, and a Solmar Fire Engine with a working light bar
// and two-tone siren that clears traffic when Mara drives it. Both are
// stealable from their depots and drive on the same arcade model as every
// other car.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';

export const BUS_ROUTE = [
  { x: 20, z: 60, name: 'Plaza' },
  { x: 140, z: 60, name: 'Downtown' },
  { x: 220, z: -20, name: 'Harbor Gate' },
  { x: 220, z: -180, name: 'Old Town' },
  { x: 60, z: -180, name: 'Uptown' },
  { x: -100, z: -100, name: 'Westside' },
  { x: -100, z: 60, name: 'Beach Road' },
  { x: 20, z: 220, name: 'South Beach' },
];

const FIRE_STATION = { x: 140, z: -20 };
const BUS_DEPOT = { x: 100, z: 60 };

export function createBusFire(G) {
  const bus = createVehicle(G, 'bus', BUS_DEPOT.x, BUS_DEPOT.z, Math.PI / 2, { parked: true, color: 0x2a7a3a });
  bus.name = 'Solmar City Bus';
  const truck = createVehicle(G, 'firetruck', FIRE_STATION.x, FIRE_STATION.z, 0, { parked: true, color: 0xd81a1a });
  truck.name = 'Solmar Fire Engine';
  const state = {
    bus, truck,
    routeIndex: 0,
    fares: 0,
    fareEarned: 0,
    passengers: 0,
    sirenPhase: 0,
    lightTimer: 0,
    hydrantHits: 0,
  };
  G.busfire = state;

  // Fire hydrants near the station: clipping one while driving the engine
  // pops it and sprays water — worth $25 of "city gratitude" each.
  state.hydrants = [];
  for (const [hx, hz] of [[132, -14], [148, -14], [132, -26], [148, -26]]) {
    const hyd = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.0, 10),
      new THREE.MeshLambertMaterial({ color: 0xd81a1a }));
    body.position.y = 0.5;
    hyd.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xffd23e }));
    cap.position.y = 1.1;
    hyd.add(cap);
    hyd.position.set(hx, 0, hz);
    G.scene.add(hyd);
    state.hydrants.push({ group: hyd, x: hx, z: hz, hit: false });
  }
  return state;
}

function nearestStop(G) {
  const s = G.busfire;
  return BUS_ROUTE[s.routeIndex % BUS_ROUTE.length];
}

export function updateBusFire(G, dt) {
  const s = G.busfire;
  if (!s) return;
  const drivingBus = G.driving === s.bus;
  const drivingTruck = G.driving === s.truck;

  // Bus route: reach each stop in order; riders pay $5 a head, three to
  // seven at a time, and the fare total rides with the route.
  if (drivingBus) {
    const stop = nearestStop(G);
    const d = Math.hypot(stop.x - s.bus.pos.x, stop.z - s.bus.pos.z);
    G.hud.setObjectiveHint(`Bus route — next stop: ${stop.name} (${Math.round(d)}m) · fares $${s.fareEarned}`);
    if (d < 12) {
      const riders = 3 + Math.floor(G.rng() * 5);
      const fare = riders * 5;
      s.fares += riders;
      s.fareEarned += fare;
      s.passengers += riders;
      G.cash += fare;
      G.hud.toast(`Bus stop ${stop.name}: ${riders} riders boarded — +$${fare}`);
      G.audio.pickup();
      s.routeIndex++;
      if (s.routeIndex % BUS_ROUTE.length === 0) {
        G.cash += 100;
        G.hud.toast('Full route complete — $100 route bonus!');
        G.audio.missionComplete();
      }
      G.save.save(G);
    }
  }

  // Fire engine: the light bar flashes red/blue and the siren wails while
  // Mara drives it; traffic ahead gives way (handled by the siren flag on
  // the vehicle, which traffic.js reads).
  if (drivingTruck) {
    s.lightTimer += dt;
    s.sirenPhase += dt;
    const mesh = s.truck.mesh;
    const red = mesh && mesh.userData ? mesh.userData.lightRed : null;
    const blue = mesh && mesh.userData ? mesh.userData.lightBlue : null;
    const on = Math.floor(s.lightTimer * 6) % 2 === 0;
    if (red && red.material) red.material.emissive.setHex(on ? 0xaa0000 : 0x220000);
    if (blue && blue.material) blue.material.emissive.setHex(on ? 0x0000aa : 0x000022);
    if (s.sirenPhase > 1.4) {
      s.sirenPhase = 0;
      if (G.audio.fireSiren) G.audio.fireSiren();
    }
    G.hud.setObjectiveHint('Fire engine — lights and siren live. Traffic yields. Hydrants beware.');
  }

  // Hydrants: clip one with the engine and it pops.
  if (drivingTruck) {
    for (const h of s.hydrants) {
      if (h.hit) continue;
      if (Math.hypot(h.x - s.truck.pos.x, h.z - s.truck.pos.z) < 2.2) {
        h.hit = true;
        h.group.visible = false;
        s.hydrantHits++;
        G.cash += 25;
        G.hud.toast(`Hydrant popped! The city thanks you — +$25 (${s.hydrantHits} total)`);
        G.audio.crash();
        G.save.save(G);
      }
    }
  }
}

export function busfireSummary(G) {
  const s = G.busfire;
  if (!s) return 'Bus & fire — depots not built.';
  return `Bus fares ${s.fares} riders · $${s.fareEarned} · hydrants popped ${s.hydrantHits}`;
}

// v7: fire callouts — the city catches fire, and the fire engine is the
// answer. Every couple of minutes a building throws a smoke column
// somewhere in Solmar; drive the engine within range and the crew
// knocks the fire down, the smoke clears, and the city pays a callout
// fee. Three callouts in one shift and the station captain starts
// trusting Mara with the big ones — a warehouse blaze that pays triple.

export const FIRE_SPOTS = [
  { x: 60, z: -20, name: 'the downtown tower' },
  { x: 140, z: 60, name: 'the plaza hotel' },
  { x: -100, z: 60, name: 'the westside flats' },
  { x: 220, z: 60, name: 'the harbor gate offices' },
  { x: -20, z: -180, name: 'the uptown clinic' },
  { x: 260, z: -212, name: 'the Old Town market' },
];

const CALLOUT_PAY = 300;
const BIG_FIRE_PAY = 900;

export function createFireCallouts(G) {
  const fc = {
    active: false,
    spot: null,
    smoke: null,
    timer: 90 + G.rng() * 60,
    callouts: 0,
    earned: 0,
    bigFires: 0,
    shiftStreak: 0,
  };
  G.fireCallouts = fc;
  return fc;
}

function buildSmoke(G, x, z) {
  const group = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + i * 0.5, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }));
    puff.position.set((G.rng() - 0.5) * 2, 4 + i * 2.2, (G.rng() - 0.5) * 2);
    group.add(puff);
    puffs.push(puff);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  flame.position.y = 1.3;
  group.add(flame);
  group.position.set(x, 0, z);
  G.scene.add(group);
  return { group, puffs, flame };
}

export function updateFireCallouts(G, dt) {
  const fc = G.fireCallouts;
  if (!fc) return;
  if (!fc.active) {
    fc.timer -= dt;
    if (fc.timer <= 0) {
      fc.timer = 120 + G.rng() * 90;
      const spot = FIRE_SPOTS[Math.floor(G.rng() * FIRE_SPOTS.length)];
      const big = fc.shiftStreak >= 3 && G.rng() < 0.4;
      fc.active = true;
      fc.spot = spot;
      fc.big = big;
      fc.smoke = buildSmoke(G, spot.x, spot.z);
      G.hud.toast(big
        ? `BIG FIRE at ${spot.name}! Warehouse blaze — the engine is needed, $900 if you knock it down.`
        : `Fire callout at ${spot.name}! Bring the fire engine — $300 to knock it down.`);
    }
    return;
  }
  // The smoke billows while the fire burns.
  const t = G.elapsed;
  for (let i = 0; i < fc.smoke.puffs.length; i++) {
    const puff = fc.smoke.puffs[i];
    puff.position.y = 4 + i * 2.2 + Math.sin(t * 1.5 + i) * 0.4;
    puff.material.opacity = 0.4 + Math.sin(t * 2 + i * 2) * 0.15;
  }
  fc.smoke.flame.scale.y = 1 + Math.sin(t * 6) * 0.25;
  // Extinguish: the fire engine within 14 units, engine running (driving).
  const truck = G.busfire && G.busfire.truck;
  if (G.driving === truck && Math.hypot(G.driving.pos.x - fc.spot.x, G.driving.pos.z - fc.spot.z) < 14) {
    fc.active = false;
    G.scene.remove(fc.smoke.group);
    fc.smoke = null;
    const pay = fc.big ? BIG_FIRE_PAY : CALLOUT_PAY;
    G.cash += pay;
    fc.callouts += 1;
    fc.earned += pay;
    fc.shiftStreak += 1;
    if (fc.big) fc.bigFires += 1;
    G.hud.toast(`Fire out at ${fc.spot.name}! +$${pay} — the station captain salutes you.`);
    if (G.save) G.save.save(G);
  }
}

export function fireCalloutSummary(G) {
  const fc = G.fireCallouts;
  if (!fc) return 'No fire station on the radio.';
  return `${fc.callouts} fires out · $${fc.earned} earned · ${fc.bigFires} warehouse blazes · streak ${fc.shiftStreak}.`;
}
