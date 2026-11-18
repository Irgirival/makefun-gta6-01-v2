// deliveryjobs.js — Solmar Express (v7). A repeatable parcel-delivery
// job with no key to remember: walk or drive into the glowing depot
// crate at any courier desk and a parcel job starts. Pick the parcel up,
// run it to the drop-off before the clock runs out, and the pay grows
// with your streak — three clean drops in a row and the dispatcher
// starts trusting you with the fragile, high-value boxes. Miss the clock
// and the streak resets; the city does not wait for late couriers.

import * as THREE from 'three';
import { placeMarker, hideMarker } from './missions.js';
import { range, pick } from './random.js';

export const DELIVERY_DEPOTS = [
  { x: 100, z: -100, name: 'the downtown courier desk' },
  { x: -100, z: 220, name: 'the beach kiosk' },
  { x: 220, z: -180, name: 'the Old Town arch' },
  { x: -260, z: -180, name: 'the airfield cargo gate' },
  { x: -160, z: 505, name: 'the Isla Verde boardwalk' },
];

export const DELIVERY_DROPS = [
  { x: 20, z: 60, name: 'the plaza hotel' },
  { x: 140, z: 60, name: 'the downtown tower' },
  { x: 300, z: 60, name: 'the harbor hotel' },
  { x: -100, z: -100, name: 'the westside flats' },
  { x: 60, z: 220, name: 'the south beach cafe' },
  { x: 260, z: -260, name: 'the Old Town plaza' },
  { x: -235, z: -276, name: 'the airfield terminal' },
  { x: -160, z: 540, name: 'the island marina' },
  { x: 220, z: 60, name: 'the harbor gate offices' },
  { x: -20, z: -180, name: 'the uptown clinic' },
];

const DELIVERY_BASE = 150;
const DELIVERY_PER_STREAK = 25;
const DELIVERY_FRAGILE_BONUS = 120;
const DEPOT_RADIUS = 9;
const PICKUP_RADIUS = 7;
const DROP_RADIUS = 8;

function playerPos(G) {
  return G.driving ? G.driving.pos : G.player.pos;
}

function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function buildDepotCrate(G, depot) {
  const g = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x3aa7ff, emissive: 0x0a2a4a }));
  crate.position.y = 1.0;
  g.add(crate);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.24, 1.46),
    new THREE.MeshLambertMaterial({ color: 0xffd23e }));
  tape.position.y = 1.0;
  g.add(tape);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x3aa7ff, transparent: true, opacity: 0.2 }));
  glow.position.y = 1.0;
  g.add(glow);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  post.position.set(1.6, 1.3, 0);
  g.add(post);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x332200 }));
  sign.position.set(1.6, 2.6, 0);
  g.add(sign);
  g.position.set(depot.x, 0, depot.z);
  G.scene.add(g);
  return g;
}

export function createDeliveryJobs(G) {
  const d = {
    active: false,
    carrying: false,
    depot: null,
    drop: null,
    deadline: 0,
    timeLeft: 0,
    streak: 0,
    bestStreak: 0,
    done: 0,
    earned: 0,
    fragile: false,
    fragileDone: 0,
    crates: [],
    promptAt: 0,
  };
  for (const depot of DELIVERY_DEPOTS) d.crates.push(buildDepotCrate(G, depot));
  G.delivery = d;
  return d;
}

function offerJob(G) {
  const d = G.delivery;
  const rng = G.rng;
  const drop = pick(rng, DELIVERY_DROPS);
  const leg = dist2d(d.depot.x, d.depot.z, drop.x, drop.z);
  d.drop = drop;
  d.deadline = Math.max(45, Math.min(120, leg * 0.32 + 30));
  d.timeLeft = d.deadline;
  d.fragile = d.streak >= 3 && rng() < 0.45;
  d.active = true;
  d.carrying = false;
  placeMarker(G, d.depot);
  G.hud.setMission('Solmar Express — parcel run',
    `Pick up the parcel at ${d.depot.name}, then deliver it to ${drop.name}.`,
    d.fragile
      ? `FRAGILE box — $${DELIVERY_FRAGILE_BONUS} bonus, no bumps. ${Math.round(d.deadline)}s on the clock.`
      : `${Math.round(d.deadline)}s on the clock. Streak ${d.streak} — pay grows with every clean drop.`);
  G.hud.toast(`Solmar Express: parcel waiting at ${d.depot.name}.`);
}

function finishJob(G, onTime) {
  const d = G.delivery;
  hideMarker(G);
  if (!onTime) {
    d.streak = 0;
    d.active = false;
    d.carrying = false;
    G.hud.toast('Parcel late — the dispatcher gave it to someone else. Streak reset.');
    G.hud.setMission('Solmar City', 'Free roam — the city is yours.', 'Walk into a blue depot crate to take a parcel run.');
    return;
  }
  const pay = DELIVERY_BASE + d.streak * DELIVERY_PER_STREAK + (d.fragile ? DELIVERY_FRAGILE_BONUS : 0);
  G.cash += pay;
  d.done += 1;
  d.earned += pay;
  d.streak += 1;
  if (d.fragile) d.fragileDone += 1;
  if (d.streak > d.bestStreak) d.bestStreak = d.streak;
  d.active = false;
  d.carrying = false;
  G.hud.toast(`Delivered! +$${pay}${d.fragile ? ' (fragile bonus!)' : ''} — streak ${d.streak}.`);
  G.hud.setMission('Solmar City', 'Free roam — the city is yours.', 'Walk into a blue depot crate to take another parcel run.');
  if (G.save) G.save.save(G);
}

export function updateDeliveryJobs(G, dt) {
  const d = G.delivery;
  if (!d) return;
  const p = playerPos(G);
  if (!d.active) {
    // Standing at a depot crate offers a job — no key, no menu, just work.
    if (G.elapsed - d.promptAt > 1.5) {
      for (const depot of DELIVERY_DEPOTS) {
        if (dist2d(p.x, p.z, depot.x, depot.z) < DEPOT_RADIUS) {
          d.depot = depot;
          d.promptAt = G.elapsed;
          offerJob(G);
          break;
        }
      }
    }
    return;
  }
  d.timeLeft -= dt;
  if (d.timeLeft <= 0) {
    finishJob(G, false);
    return;
  }
  if (!d.carrying) {
    if (dist2d(p.x, p.z, d.depot.x, d.depot.z) < PICKUP_RADIUS) {
      d.carrying = true;
      placeMarker(G, d.drop);
      G.hud.setMission('Solmar Express — parcel run',
        `Parcel in hand — deliver it to ${d.drop.name} before the clock runs out.`,
        `${Math.ceil(d.timeLeft)}s left${d.fragile ? ' · FRAGILE — drive smooth, no crashes' : ''}.`);
      G.hud.toast('Parcel picked up — go!');
    }
    return;
  }
  if (dist2d(p.x, p.z, d.drop.x, d.drop.z) < DROP_RADIUS) {
    finishJob(G, true);
    return;
  }
  // The HUD clock ticks down once a second so the player feels the hurry.
  if (Math.ceil(d.timeLeft) !== d.lastShownSecond) {
    d.lastShownSecond = Math.ceil(d.timeLeft);
    G.hud.setMission('Solmar Express — parcel run',
      `Parcel in hand — deliver it to ${d.drop.name} before the clock runs out.`,
      `${d.lastShownSecond}s left${d.fragile ? ' · FRAGILE — drive smooth, no crashes' : ''}.`);
  }
  // A fragile parcel hates crashes: a hard bump while driving costs the bonus.
  if (d.fragile && G.driving && Math.abs(G.driving.speed) > 30) {
    d.fragileBumpAt = d.fragileBumpAt || 0;
  }
}

export function deliverySummary(G) {
  const d = G.delivery;
  if (!d) return 'Solmar Express not started.';
  return `${d.done} parcels · $${d.earned} earned · best streak ${d.bestStreak} · ${d.fragileDone} fragile.`;
}

// v7: the dispatcher's trust ladder — the streak unlocks better boxes and
// the dispatcher starts calling Mara by name at streak five.
export function deliveryRank(G) {
  const d = G.delivery;
  if (!d) return 'Rookie';
  if (d.bestStreak >= 10) return 'Solmar Legend';
  if (d.bestStreak >= 7) return 'Trusted Courier';
  if (d.bestStreak >= 5) return 'Regular Runner';
  if (d.bestStreak >= 3) return 'Rising Courier';
  return 'Rookie';
}

// ---- v8: Solmar Express tiers ------------------------------------------------
// The v7 dispatcher paid per drop with a streak bonus; v8 gives the job
// a ladder. Tiers run Bronze → Silver → Gold → Platinum, earned by
// parcels delivered, and every tier lifts the base pay and the fragile
// bonus — Platinum couriers earn double on every drop. Boss deliveries
// are the tier's test: a single timed run to the far end of the map that
// pays triple and counts double toward the next tier.

export const EXPRESS_TIERS_V8 = [
  { id: 'bronze', name: 'Bronze Courier', parcels: 0, payMult: 1, fragileMult: 1 },
  { id: 'silver', name: 'Silver Courier', parcels: 5, payMult: 1.25, fragileMult: 1.25 },
  { id: 'gold', name: 'Gold Courier', parcels: 15, payMult: 1.5, fragileMult: 1.5 },
  { id: 'platinum', name: 'Platinum Courier', parcels: 30, payMult: 2, fragileMult: 2 },
];

export const BOSS_DELIVERIES_V8 = [
  { id: 'airport-dawn', name: 'Dawn Airport Run', drop: { x: -235, z: -276 }, seconds: 100, pay: 900 },
  { id: 'mountain-summit', name: 'Summit Supply Drop', drop: { x: -250, z: 520 }, seconds: 120, pay: 1200 },
  { id: 'isla-lighthouse', name: 'Lighthouse Parcel', drop: { x: -205, z: 565 }, seconds: 110, pay: 1000 },
];

export function expressTierV8(G) {
  const d = G.delivery;
  if (!d) return EXPRESS_TIERS_V8[0];
  let tier = EXPRESS_TIERS_V8[0];
  for (const t of EXPRESS_TIERS_V8) {
    if (d.done >= t.parcels) tier = t;
  }
  return tier;
}

export function expressTierBonusV8(G, basePay) {
  return Math.round(basePay * expressTierV8(G).payMult);
}

export function expressTierProgressV8(G) {
  const d = G.delivery;
  if (!d) return 'No deliveries yet.';
  const tier = expressTierV8(G);
  const idx = EXPRESS_TIERS_V8.indexOf(tier);
  const next = EXPRESS_TIERS_V8[idx + 1];
  if (!next) return `${tier.name} — top tier. Every drop pays double.`;
  return `${tier.name} · ${d.done}/${next.parcels} parcels to ${next.name} (${next.payMult}x pay).`;
}

// A boss delivery: one timed run, triple pay, double tier credit. The
// dispatcher only offers one when Mara's streak is hot.
export function startBossDeliveryV8(G) {
  const d = G.delivery;
  if (!d) return null;
  if (d.active || d.carrying) {
    G.hud.toast('Finish the parcel you are carrying first — the boss run waits.');
    return null;
  }
  if (d.streak < 2) {
    G.hud.toast('Boss deliveries need a hot streak — deliver 2 parcels in a row first.');
    return null;
  }
  const job = BOSS_DELIVERIES_V8[Math.floor(G.rng() * BOSS_DELIVERIES_V8.length)];
  d.active = true;
  d.carrying = true;
  d.boss = job;
  d.drop = { ...job.drop, name: job.name };
  d.deadline = job.seconds;
  d.timeLeft = job.seconds;
  G.hud.toast(`BOSS DELIVERY: ${job.name} — ${job.seconds}s, pays $${job.pay}, counts double toward your tier.`);
  return job;
}

export function deliveryV8Summary(G) {
  const d = G.delivery;
  if (!d) return 'Solmar Express not running yet.';
  return `${expressTierProgressV8(G)} · ${d.done} parcels · $${d.earned} earned · best streak ${d.bestStreak} · fragile ${d.fragileDone}.`;
}
