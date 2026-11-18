// garage2.js — garage v2: the paint shop and the dyno. The v7 garage
// sold turbo, bulletproof tires and hydraulics; v8 opens the shop next
// door. The paint shop mixes custom colors from three pigments — Mara
// picks a base, a flake and a finish, and the car wears the result — and
// the dyno rollers measure what all that tuning actually did: a timed
// pull that reports horsepower, top speed and 0–100 time for the car
// Mara is driving, with a leaderboard of her own best pulls. The paint
// shop also sells a two-tone roof and a matte finish, and the dyno's
// numbers feed the race-season standings, so a tuned car is a faster car
// on paper as well as on the road.

import * as THREE from 'three';

export const PAINT_BASES = [
  { id: 'midnight', name: 'Midnight Blue', color: 0x1a2a6a, price: 200 },
  { id: 'blood', name: 'Blood Red', color: 0x8a1a1a, price: 200 },
  { id: 'forest', name: 'Forest Green', color: 0x1a5a2a, price: 200 },
  { id: 'sunset', name: 'Sunset Orange', color: 0xd86a1a, price: 250 },
  { id: 'violet', name: 'Violet Storm', color: 0x5a2a8a, price: 250 },
  { id: 'gold', name: 'Solmar Gold', color: 0xc9a03a, price: 400 },
];

export const PAINT_FLAKES = [
  { id: 'none', name: 'No flake', color: 0x000000, price: 0 },
  { id: 'silver', name: 'Silver flake', color: 0xd8d8d8, price: 150 },
  { id: 'pearl', name: 'Pearl flake', color: 0xfff0d8, price: 300 },
  { id: 'holo', name: 'Holo flake', color: 0x7ad8ff, price: 500 },
];

export const PAINT_FINISHES = [
  { id: 'gloss', name: 'Gloss', price: 0, rough: 0.25 },
  { id: 'matte', name: 'Matte', price: 350, rough: 0.9 },
  { id: 'satin', name: 'Satin', price: 250, rough: 0.55 },
];

export const DYNO_PULL_TIME = 6; // seconds of rollers before the numbers print

function nearGarage(G) {
  const p = G.player.pos;
  const dx = p.x - (-20);
  const dz = p.z - (-100);
  return dx * dx + dz * dz < 18 * 18;
}

export function createGarageV8(G) {
  if (G.garageV8) return G.garageV8;
  // The paint booth: a striped arch over the garage forecourt, plus the
  // dyno rollers — two dark drums set into the floor by the back wall.
  const booth = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5, 0.4),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xffd23e : 0x2a2a2a }));
    stripe.position.set(-4 + i * 2, 2.5, 0);
    booth.add(stripe);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  beam.position.y = 5.2;
  booth.add(beam);
  booth.position.set(-20, 0, -92);
  G.scene.add(booth);
  const rollers = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 12),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.5, -1.4 + i * 2.8);
    rollers.add(drum);
  }
  rollers.position.set(-20, 0, -108);
  G.scene.add(rollers);
  G.garageV8 = {
    booth, rollers,
    baseId: 'midnight',
    flakeId: 'none',
    finishId: 'gloss',
    twoTone: false,
    paintsBought: 0,
    paintSpent: 0,
    dyno: { active: false, timer: 0, pulls: 0, bestHp: 0, bestTop: 0, bestAccel: null, lastHp: 0, lastTop: 0, lastAccel: null },
  };
  return G.garageV8;
}

function tunedTopSpeed(G) {
  const car = G.driving;
  if (!car) return 0;
  let top = car.spec.topSpeed || 40;
  const g = G.garage || {};
  if (g.engineLevel) top *= 1 + 0.08 * g.engineLevel;
  const g7 = G.garageV7 || {};
  if (g7.turboLevel) top *= 1 + 0.12 * g7.turboLevel;
  return top;
}

function tunedHorsepower(G) {
  const car = G.driving;
  if (!car) return 0;
  let hp = 220 + (car.spec.topSpeed || 40) * 6;
  const g = G.garage || {};
  hp += (g.engineLevel || 0) * 45;
  const g7 = G.garageV7 || {};
  hp += (g7.turboLevel || 0) * 80;
  if (G.nitro && G.nitro.tankLevel) hp += G.nitro.tankLevel * 15;
  return Math.round(hp);
}

export function buyPaintV8(G, baseId, flakeId, finishId) {
  const g8 = G.garageV8;
  if (!g8) return false;
  const base = PAINT_BASES.find((b) => b.id === baseId);
  const flake = PAINT_FLAKES.find((f) => f.id === flakeId) || PAINT_FLAKES[0];
  const finish = PAINT_FINISHES.find((f) => f.id === finishId) || PAINT_FINISHES[0];
  if (!base) return false;
  const price = base.price + flake.price + finish.price;
  if (G.cash < price) {
    G.hud.toast(`That paint job is $${price} — you have $${Math.floor(G.cash)}.`);
    return false;
  }
  G.cash -= price;
  g8.baseId = base.id;
  g8.flakeId = flake.id;
  g8.finishId = finish.id;
  g8.paintsBought += 1;
  g8.paintSpent += price;
  // The car Mara is driving wears the new paint right away.
  const car = G.driving;
  if (car && car.group) {
    car.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && o.userData.body) {
        o.material.color.setHex(base.color);
        o.material.roughness = finish.rough;
      }
    });
  }
  G.hud.toast(`Paint shop: ${base.name} + ${flake.name} + ${finish.name} — $${price}. Looking sharp.`);
  if (G.audio && G.audio.cash) G.audio.cash();
  return true;
}

export function buyTwoToneV8(G) {
  const g8 = G.garageV8;
  if (!g8) return false;
  const price = 450;
  if (g8.twoTone) { G.hud.toast('The roof is already two-tone.'); return false; }
  if (G.cash < price) { G.hud.toast(`A two-tone roof is $${price}.`); return false; }
  G.cash -= price;
  g8.twoTone = true;
  g8.paintSpent += price;
  G.hud.toast('Paint shop: two-tone roof fitted — black over the new base coat.');
  return true;
}

export function paintSummaryV8(G) {
  const g8 = G.garageV8;
  if (!g8) return 'Paint shop not open yet.';
  const base = PAINT_BASES.find((b) => b.id === g8.baseId);
  const flake = PAINT_FLAKES.find((f) => f.id === g8.flakeId);
  const finish = PAINT_FINISHES.find((f) => f.id === g8.finishId);
  return `${base.name} + ${flake.name} + ${finish.name}${g8.twoTone ? ' · two-tone roof' : ''} — ${g8.paintsBought} paint jobs, $${g8.paintSpent} spent.`;
}

// The dyno: drive onto the rollers (or just stand at the garage) and run
// a pull. Six seconds of rollers, then the numbers print — horsepower,
// top speed and 0–100 time — and the best pull is kept on the board.
export function startDynoPull(G) {
  const g8 = G.garageV8;
  if (!g8) return false;
  if (!G.driving) {
    G.hud.toast('The dyno needs a car — drive one onto the rollers first.');
    return false;
  }
  if (g8.dyno.active) return false;
  g8.dyno.active = true;
  g8.dyno.timer = DYNO_PULL_TIME;
  G.hud.toast('Dyno pull running — hold on, the rollers are spinning up…');
  return true;
}

function finishDynoPull(G) {
  const g8 = G.garageV8;
  const d = g8.dyno;
  d.active = false;
  d.pulls += 1;
  d.lastHp = tunedHorsepower(G);
  d.lastTop = tunedTopSpeed(G);
  // 0–100 time: faster cars and nitro get there quicker.
  const accelBase = 9.5 - (d.lastTop - 40) * 0.09;
  d.lastAccel = Math.max(2.8, accelBase - (G.nitro && G.nitro.tankLevel ? 0.4 : 0));
  if (d.lastHp > d.bestHp) d.bestHp = d.lastHp;
  if (d.lastTop > d.bestTop) d.bestTop = d.lastTop;
  if (d.bestAccel === null || d.lastAccel < d.bestAccel) d.bestAccel = d.lastAccel;
  G.hud.toast(`Dyno: ${d.lastHp} hp · top ${d.lastTop.toFixed(0)} u/s · 0–100 in ${d.lastAccel.toFixed(1)}s. Best: ${d.bestHp} hp.`);
  if (G.audio && G.audio.cheer) G.audio.cheer();
}

export function updateGarageV8(G, dt) {
  const g8 = G.garageV8;
  if (!g8) return;
  if (g8.dyno.active) {
    g8.dyno.timer -= dt;
    // The rollers spin while the pull runs.
    g8.rollers.children.forEach((drum, i) => {
      drum.rotation.x += dt * (6 + i * 2);
    });
    if (g8.dyno.timer <= 0) finishDynoPull(G);
  }
  // The paint booth glows when Mara is close enough to use it.
  const near = nearGarage(G);
  g8.booth.children.forEach((stripe) => {
    if (stripe.material && stripe.material.emissive) {
      stripe.material.emissive.setHex(near ? 0x332200 : 0x000000);
    }
  });
}

export function garageV8Summary(G) {
  const g8 = G.garageV8;
  if (!g8) return 'Garage v2 not open yet.';
  const d = g8.dyno;
  const dyno = d.pulls === 0
    ? 'no dyno pulls yet'
    : `${d.pulls} pulls · best ${d.bestHp} hp · top ${d.bestTop.toFixed(0)} · 0–100 ${d.bestAccel.toFixed(1)}s`;
  return `${paintSummaryV8(G)} | Dyno: ${dyno}.`;
}
