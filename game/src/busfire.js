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
