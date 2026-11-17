// carcollection.js — Mara's car collection, garage v2 (v6). Every distinct
// car Mara drives joins her collection (up to five slots). From the pause
// menu she can call any collected car to her location, and the collection
// checklist shows what she owns and what is still out there to steal.
// Collected cars keep their paint and arrive with a full tank of attitude.

import { VEHICLE_TYPES, createVehicle } from './vehicles.js';
import { refreshShowroom } from './garage.js';

export const COLLECTION_MAX = 5;
const COLLECTION_SPOTS = [
  { x: 36, z: 44 }, { x: 44, z: 44 }, { x: 52, z: 44 },
  { x: 36, z: 52 }, { x: 44, z: 52 },
];

export function createCollection(G) {
  const c = {
    owned: [],          // { type, name, color, id, calls }
    callIndex: 0,
    calls: 0,
    collected: 0,
  };
  G.collection = c;
  return c;
}

export function registerCollectedCar(G, car) {
  const c = G.collection;
  if (!c || !car || !car.spec) return false;
  if (car.type === 'police') return false; // the PD keeps its own fleet
  if (c.owned.some((o) => o.type === car.type)) return false;
  if (c.owned.length >= COLLECTION_MAX) {
    G.hud.toast(`Collection full (${COLLECTION_MAX}/5) — call a car from the pause menu to swap.`);
    return false;
  }
  const entry = {
    type: car.type,
    name: car.spec.name,
    color: car.color,
    id: car.id,
    calls: 0,
  };
  c.owned.push(entry);
  c.collected++;
  G.hud.toast(`Collection: ${entry.name} added! (${c.owned.length}/${COLLECTION_MAX})`);
  G.audio.pickup();
  refreshShowroom(G);
  G.save.save(G);
  return true;
}

export function callCollectedCar(G) {
  const c = G.collection;
  if (!c) return;
  if (c.owned.length === 0) {
    G.hud.toast('No cars collected yet — drive a new car to add it to the collection.');
    return;
  }
  const entry = c.owned[c.callIndex % c.owned.length];
  c.callIndex++;
  entry.calls++;
  c.calls++;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const spot = COLLECTION_SPOTS[c.callIndex % COLLECTION_SPOTS.length];
  // Reuse the original car if it still exists, otherwise respawn it.
  let car = G.vehicles.find((v) => v.id === entry.id);
  if (!car) {
    car = createVehicle(G, entry.type, pos.x + spot.x - 44, pos.z + spot.z - 44, 0,
      { parked: true, color: entry.color });
    entry.id = car.id;
  } else {
    car.pos.set(pos.x + 4, 0, pos.z + 4);
    car.mesh.position.copy(car.pos);
    car.speed = 0;
    car.parked = true;
    car.driver = null;
  }
  G.hud.toast(`${entry.name} delivered to your location. (${entry.calls} calls)`);
  G.audio.horn();
  G.save.save(G);
}

export function collectionChecklist(G) {
  const c = G.collection;
  if (!c) return [];
  const all = Object.keys(VEHICLE_TYPES).filter((t) => t !== 'police');
  return all.map((t) => ({
    type: t,
    name: VEHICLE_TYPES[t].name,
    owned: c.owned.some((o) => o.type === t),
  }));
}

export function collectionSummary(G) {
  const c = G.collection;
  if (!c) return 'Collection — not started.';
  const names = c.owned.map((o) => o.name).join(', ') || 'nothing yet';
  return `Collection ${c.owned.length}/${COLLECTION_MAX}: ${names} · calls ${c.calls}`;
}
