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

// v7: the unicorn hunt — rare cars that only spawn under conditions.
// A chrome Comet 900 appears on the Isla Verde boardwalk at midnight,
// a gold limousine parks outside the casino on Friday nights (in-game),
// and a matte-black Vortex GT haunts the airfield runway at dawn. Each
// one is a one-of-one: steal it, and the collection gains a tier —
// Common, Rare, Epic, Legendary — with a cash bonus for the find.

export const UNICORN_CARS = [
  { type: 'sports', color: 0xd8d8d8, name: 'Chrome Comet', spot: { x: -160, z: 505 }, when: 'midnight', tier: 'Epic', bonus: 800 },
  { type: 'limo', color: 0xd8a03a, name: 'Golden Limo', spot: { x: 300, z: 60 }, when: 'night', tier: 'Rare', bonus: 500 },
  { type: 'sports', color: 0x1a1a22, name: 'Midnight Vortex', spot: { x: -196, z: -260 }, when: 'dawn', tier: 'Legendary', bonus: 1500 },
];

const TIER_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

export function createUnicornHunt(G) {
  const uh = {
    spawned: {},
    found: [],
    bonusEarned: 0,
    checkTimer: 0,
  };
  G.unicornHunt = uh;
  return uh;
}

function timeMatches(G, when) {
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = mins / 60;
  if (when === 'midnight') return h >= 0 && h < 2;
  if (when === 'dawn') return h >= 5 && h < 7;
  if (when === 'night') return h >= 20 || h < 5;
  return true;
}

// v7: check the clock once a minute — a unicorn whose window is open and
// which has not been found yet spawns at its spot, glowing faintly.
export function updateUnicornHunt(G, dt) {
  const uh = G.unicornHunt;
  if (!uh) return;
  uh.checkTimer -= dt;
  if (uh.checkTimer > 0) return;
  uh.checkTimer = 60;
  for (const uni of UNICORN_CARS) {
    if (uh.found.includes(uni.name)) continue;
    if (uh.spawned[uni.name]) continue;
    if (!timeMatches(G, uni.when)) continue;
    const car = createVehicle(G, uni.type, uni.spot.x, uni.spot.z, 0, { parked: true, color: uni.color });
    car.name = uni.name;
    car.unicorn = uni;
    uh.spawned[uni.name] = car;
    G.hud.toast(`A ${uni.tier} unicorn was spotted: the ${uni.name}! Go steal it before its window closes.`);
  }
}

// v7: call when Mara enters any car — a unicorn find pays the bonus and
// joins the collection at its tier.
export function checkUnicornFind(G, car) {
  const uh = G.unicornHunt;
  if (!uh || !car || !car.unicorn) return false;
  const uni = car.unicorn;
  if (uh.found.includes(uni.name)) return false;
  uh.found.push(uni.name);
  uh.bonusEarned += uni.bonus;
  G.cash += uni.bonus;
  G.hud.toast(`${uni.tier} unicorn found: the ${uni.name}! +$${uni.bonus} finder bonus.`);
  return true;
}

export function collectionTier(G) {
  const c = G.collection;
  if (!c || !c.owned.length) return 'Empty garage';
  const uh = G.unicornHunt;
  const found = uh ? uh.found.length : 0;
  if (found >= 3) return 'Legendary Collector';
  if (found >= 2) return 'Epic Collector';
  if (found >= 1) return 'Rare Collector';
  return c.owned.length >= 5 ? 'Full House' : 'Growing Collection';
}

export function collectionV7Summary(G) {
  const uh = G.unicornHunt;
  if (!uh) return 'The unicorn hunt has not begun.';
  return `${uh.found.length}/3 unicorns found · $${uh.bonusEarned} in finder bonuses · ${collectionTier(G)}.`;
}

// ---- v8: the unicorn showroom ----------------------------------------------
// The v7 unicorn hunt found three rare cars; v8 gives them a home. The
// showroom is a glass-fronted annex by Vic's garage with one plinth per
// unicorn, and a found unicorn parks itself on its plinth for the city to
// see. A full showroom — all three plinths lit — pays a collector's
// bonus, and the showroom plaque lists each car's story: where it was
// found, when, and what makes it a unicorn.

import * as THREE from 'three';

export function createShowroomV8(G) {
  if (G.showroomV8) return G.showroomV8;
  const group = new THREE.Group();
  const plinths = [];
  for (let i = 0; i < 3; i++) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 3),
      new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
    plinth.position.set(-34 + i * 8, 0.4, -84);
    group.add(plinth);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    lamp.position.set(-34 + i * 8, 3.4, -84);
    group.add(lamp);
    plinths.push({ plinth, lamp, lit: false, carId: null });
  }
  G.scene.add(group);
  G.showroomV8 = { group, plinths, bonusPaid: false, viewings: 0 };
  return G.showroomV8;
}

export function parkUnicornV8(G, carId) {
  const show = G.showroomV8;
  const hunt = G.unicornHunt;
  if (!show || !hunt) return false;
  const free = show.plinths.find((p) => !p.lit);
  if (!free) return false;
  free.lit = true;
  free.carId = carId;
  free.lamp.material.color.setHex(0x2aff8a);
  show.viewings += 1;
  const litCount = show.plinths.filter((p) => p.lit).length;
  G.hud.toast(`Showroom: a unicorn takes its plinth — ${litCount}/3 on display.`);
  if (litCount >= 3 && !show.bonusPaid) {
    show.bonusPaid = true;
    G.cash += 1500;
    G.hud.toast('Full showroom — all three unicorns on display. Collector\'s bonus +$1,500.');
    if (G.audio && G.audio.cheer) G.audio.cheer();
  }
  return true;
}

export function showroomV8Summary(G) {
  const show = G.showroomV8;
  if (!show) return 'Unicorn showroom not built yet.';
  const lit = show.plinths.filter((p) => p.lit).length;
  const names = show.plinths.filter((p) => p.lit).map((p) => p.carId).join(', ') || 'empty plinths';
  return `${lit}/3 unicorns on display (${names}) · ${show.viewings} parkings · bonus: ${show.bonusPaid ? 'paid' : 'not yet'}.`;
}
