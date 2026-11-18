// vipjob.js — the VIP and parcel job (v6). Press X to take a job: either a
// VIP pickup (a well-dressed client who pays a fat fare plus a tip for a
// fast, smooth ride) or a parcel run (a sealed box, a tight clock, a
// delivery bonus). Jobs pay more as Mara's driver rating climbs, and a
// five-star rating unlocks the high-roller clients.

import * as THREE from 'three';
import { MISSIONS, placeMarker, hideMarker } from './missions.js';
import { range } from './random.js';

const VIP_NAMES = [
  'Senator Vela', 'Chef Duarte', 'Madame Okafor', 'Director Hale',
  'Countess Riva', 'Producer Sol', 'Ambassador Kane', 'Diva Marisol',
];
const VIP_SPOTS = [
  { x: 20, z: 60, name: 'the plaza hotel' },
  { x: -160, z: 505, name: 'the Isla Verde boardwalk' },
  { x: 260, z: -260, name: 'the Old Town plaza' },
  { x: -235, z: -276, name: 'the airfield terminal' },
  { x: 300, z: 60, name: 'the harbor hotel' },
  { x: -160, z: 540, name: 'the island marina' },
];
const PARCEL_SPOTS = [
  { x: 100, z: -100, name: 'the downtown courier desk' },
  { x: -100, z: 220, name: 'the beach kiosk' },
  { x: 220, z: -180, name: 'the Old Town arch' },
  { x: -260, z: -180, name: 'the airfield cargo gate' },
  { x: 140, z: 300, name: 'the south beach cafe' },
];

function openRoadSpot(G, cx, cz, spread) {
  const rng = G.rng;
  for (let i = 0; i < 60; i++) {
    const x = cx + range(rng, -spread, spread);
    const z = cz + range(rng, -spread, spread);
    if (!G.city.isRoad(x, z)) continue;
    let blocked = false;
    for (const c of G.city.colliders) {
      if (x > c.minX - 3 && x < c.maxX + 3 && z > c.minZ - 3 && z < c.maxZ + 3) { blocked = true; break; }
    }
    if (!blocked) return { x, z };
  }
  return { x: G.city.nearestRoadLine(cx, cz, 'x'), z: cz };
}

function starBar(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export function createVipJob(G) {
  const vip = {
    active: false,
    kind: null,           // 'vip' | 'parcel'
    stage: null,          // 'pickup' | 'dropoff'
    client: null,
    pickup: null,
    dropoff: null,
    pickupName: '',
    fare: 0,
    tip: 0,
    timer: 0,
    timerTotal: 0,
    jobs: 0,
    earned: 0,
    rating: 4.2,
    ratingCount: 12,
    bestTip: 0,
    parcelMesh: null,
  };
  const parcel = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x8a4ad8, emissive: 0x331155 }));
  crate.position.y = 0.9;
  parcel.add(crate);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 1.05),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x554400 }));
  ribbon.position.y = 0.9;
  parcel.add(ribbon);
  parcel.visible = false;
  G.scene.add(parcel);
  vip.parcelMesh = parcel;
  G.vip = vip;
  return vip;
}

function startVip(G) {
  const v = G.vip;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const isVip = G.rng() < 0.55;
  v.kind = isVip ? 'vip' : 'parcel';
  v.stage = 'pickup';
  if (isVip) {
    v.client = VIP_NAMES[Math.floor(G.rng() * VIP_NAMES.length)];
    const spot = VIP_SPOTS[Math.floor(G.rng() * VIP_SPOTS.length)];
    v.pickup = { x: spot.x, z: spot.z };
    v.pickupName = spot.name;
  } else {
    v.client = 'Parcel Desk';
    const spot = PARCEL_SPOTS[Math.floor(G.rng() * PARCEL_SPOTS.length)];
    v.pickup = { x: spot.x, z: spot.z };
    v.pickupName = spot.name;
  }
  v.dropoff = openRoadSpot(G, range(G.rng, -300, 300), range(G.rng, -300, 300), 60);
  v.active = true;
  v.parcelMesh.visible = v.kind === 'parcel';
  v.parcelMesh.position.set(v.pickup.x, 0, v.pickup.z);
  const title = v.kind === 'vip' ? `VIP Job — ${v.client}` : 'Parcel Run';
  G.hud.setMission(title, `Pick up ${v.kind === 'vip' ? v.client : 'the parcel'} at ${v.pickupName}`,
    'X — cancel the job. A car makes the pickup much faster.');
  placeMarker(G, v.pickup);
  G.audio.missionSting();
}

function rateJob(G, onTime, smooth) {
  const v = G.vip;
  const stars = onTime && smooth ? 5 : onTime ? 4 : smooth ? 4 : 3;
  v.rating = (v.rating * v.ratingCount + stars) / (v.ratingCount + 1);
  v.ratingCount++;
  return stars;
}

function finishJob(G) {
  const v = G.vip;
  const onTime = v.timer > 0;
  const smooth = G.wanted.stars === 0;
  const stars = rateJob(G, onTime, smooth);
  const base = v.fare;
  const tip = onTime ? Math.round(base * (0.1 + v.rating * 0.04)) : 0;
  const total = base + tip;
  v.tip = tip;
  if (tip > v.bestTip) v.bestTip = tip;
  v.jobs++;
  v.earned += total;
  G.cash += total;
  G.hud.toast(v.kind === 'vip'
    ? `VIP delivered — $${base} + $${tip} tip · ${stars}★ (${starBar(v.rating)})`
    : `Parcel delivered — $${base} + $${tip} bonus · ${stars}★ (${starBar(v.rating)})`);
  G.audio.missionComplete();
  v.active = false;
  v.parcelMesh.visible = false;
  hideMarker(G);
  // Restore the story marker if a mission is live.
  if (G.missions.active && G.missions.index < MISSIONS.length) {
    const def = MISSIONS[G.missions.index];
    const step = def.steps[G.missions.step];
    if (step) {
      G.hud.setMission(def.title, step.text, step.hint);
      placeMarker(G, step.target);
    }
  }
  G.save.save(G);
}

function cancelJob(G) {
  const v = G.vip;
  v.active = false;
  v.parcelMesh.visible = false;
  hideMarker(G);
  G.hud.toast('Job cancelled — the client will remember that.');
  G.audio.emptyClick && G.audio.emptyClick();
}

export function updateVipJob(G, dt) {
  const v = G.vip;
  if (!v) return;
  if (G.mode === 'playing' && G.input.pressed('vip') && G.missions.index >= 1) {
    if (v.active) cancelJob(G);
    else startVip(G);
    return;
  }
  if (!v.active) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const target = v.stage === 'pickup' ? v.pickup : v.dropoff;
  const d = Math.hypot(target.x - pos.x, target.z - pos.z);
  if (v.stage === 'dropoff') {
    v.timer -= dt;
    G.hud.setObjectiveHint(v.timer > 0
      ? `${Math.round(d)}m to the drop-off — ${Math.ceil(v.timer)}s left`
      : `${Math.round(d)}m to the drop-off — LATE!`);
    if (v.timer <= -30) {
      G.hud.toast('The client gave up waiting — job failed.');
      cancelJob(G);
      return;
    }
  } else {
    G.hud.setObjectiveHint(`${Math.round(d)}m to the pickup at ${v.pickupName}`);
  }
  if (d > 8) return;
  if (v.stage === 'pickup') {
    if (!G.driving && v.kind === 'vip') {
      G.hud.setObjectiveHint('Your VIP expects a car — get in one first.');
      return;
    }
    v.stage = 'dropoff';
    const dist = Math.hypot(v.dropoff.x - v.pickup.x, v.dropoff.z - v.pickup.z);
    const mult = 1 + (v.rating - 4) * 0.15;
    v.fare = Math.round((v.kind === 'vip' ? 120 : 90) + dist * (v.kind === 'vip' ? 0.55 : 0.4) * mult);
    v.timerTotal = Math.max(45, dist * 0.55);
    v.timer = v.timerTotal;
    v.parcelMesh.visible = false;
    G.hud.setMission(v.kind === 'vip' ? `VIP Job — ${v.client}` : 'Parcel Run',
      v.kind === 'vip'
        ? `Drive ${v.client} to the marker — $${v.fare} plus tip`
        : `Deliver the parcel to the marker — $${v.fare} plus speed bonus`,
      'Smooth driving, no PD attention — tips shrink when the stars come out.');
    placeMarker(G, v.dropoff);
    G.audio.pickup();
  } else {
    finishJob(G);
  }
}

export function vipSummary(G) {
  const v = G.vip;
  if (!v) return 'VIP jobs — none yet.';
  return `VIP jobs ${v.jobs} · earned $${v.earned} · rating ${v.rating.toFixed(1)}★ ${starBar(v.rating)} · best tip $${v.bestTip}`;
}

// v7: the high-roller clients and the airport limo run. At a five-star
// rating the dispatcher stops sending Mara to the plaza hotel and
// starts sending her to the people who own the plaza hotel: senators,
// producers, a countess who tips in hundreds. The airport limo run is
// the crown job — meet the charter at the terminal, drive the client
// to the harbor hotel in the limousine, and the fare is the biggest in
// the book. High rollers rate hard: one bad ride costs a full star.

export const VIP_HIGH_ROLLERS = [
  'Senator Vela', 'Countess Riva', 'Producer Sol', 'Ambassador Kane',
  'Diva Marisol', 'Director Hale', 'Chef Duarte', 'Madame Okafor',
];

const LIMO_RUN = { pickup: { x: -235, z: -276 }, drop: { x: 300, z: 60 } };

export function createVipJobV7(G) {
  const v7 = {
    highRollerJobs: 0,
    highRollerEarned: 0,
    limoRuns: 0,
    limoEarned: 0,
    fiveStarStreak: 0,
  };
  G.vipV7 = v7;
  return v7;
}

// v7: is Mara trusted with the high rollers? Five stars and a dozen
// jobs — the dispatcher does not hand a senator to a rookie.
export function vipHighRollerUnlocked(G) {
  const vip = G.vip;
  if (!vip) return false;
  return vip.rating >= 5 && vip.jobs >= 12;
}

// v7: a high-roller job — the fare is triple, the tip is generous, and
// the rating stakes are real: a late arrival costs a full star.
export function startHighRollerJob(G) {
  const v7 = G.vipV7;
  const vip = G.vip;
  if (!v7 || !vip) return false;
  if (!vipHighRollerUnlocked(G)) {
    G.hud.toast('High rollers want a five-star driver with a dozen jobs. Not yet.');
    return false;
  }
  const name = VIP_HIGH_ROLLERS[Math.floor(G.rng() * VIP_HIGH_ROLLERS.length)];
  v7.highRollerJobs += 1;
  G.hud.toast(`${name} has requested a car — the high-roller fare is triple, and they rate hard.`);
  return true;
}

// v7: the airport limo run — charter to harbor hotel in the limousine.
// Pays $900 base, and the client tips $300 if the ride is smooth.
export function startLimoRun(G) {
  const v7 = G.vipV7;
  if (!v7) return false;
  const limo = G.vehicles.find((v) => v.type === 'limo' && !v.driver);
  v7.limoRuns += 1;
  G.hud.toast('Limo run: meet the charter at the airfield terminal, drive the client to the harbor hotel. $900, plus a $300 smooth-ride tip.');
  return true;
}

export function vipV7Summary(G) {
  const v7 = G.vipV7;
  if (!v7) return 'No high-roller work on the books.';
  return `${v7.highRollerJobs} high-roller jobs · ${v7.limoRuns} limo runs · unlocked: ${vipHighRollerUnlocked(G) ? 'YES' : 'not yet'}.`;
}
