// garage.js — Vic's garage: spend cash on Mara's own car. Press U near
// the garage to repaint it ($150, cycles the paint rack), I for an engine
// upgrade ($500, +8% top speed, 3 levels), O for armor plating ($400, +50
// armor, 2 levels). The car you tune becomes your owned car: its paint and
// upgrades persist in the save and are re-applied whenever you get back in.
// Upgrades bite through the driving model via the boost the vehicle carries.

import * as THREE from 'three';
import { refillNitro, nitroStatusText } from './nitro.js';

export const GARAGE_POS = { x: -20, z: -100 };

const PAINTS = [
  { name: 'Crimson Rush', color: 0xd81a2a },
  { name: 'Ocean Blue', color: 0x1a6ad8 },
  { name: 'Pearl White', color: 0xf0f0f0 },
  { name: 'Midnight Black', color: 0x1a1a22 },
  { name: 'Sunset Gold', color: 0xd8a03a },
  { name: 'Jungle Green', color: 0x2a7a3a },
  { name: 'Hot Pink', color: 0xd81a8a },
  { name: 'Solmar Teal', color: 0x1a8a8a },
];

const PAINT_PRICE = 150;
const ENGINE_PRICE = 500;
const ARMOR_PRICE = 400;
const NEON_PRICE = 300;
const ENGINE_MAX = 3;
const ARMOR_MAX = 2;
// v5: sport suspension (sharper steering, 2 levels) and the nitro tank
// (a bigger bottle, filled on the spot) — both sold at Vic's garage.
const SUSPENSION_PRICE = 350;
const SUSPENSION_MAX = 2;
const NITRO_TANK_PRICE = 250;

// Neon underglow colours, cycled with the paint rack's spirit: one colour
// per buy, glowing from beneath the car at night and in the shade.
const NEON_COLORS = [0x1a6ad8, 0xd81a8a, 0x2aff8a, 0xffd23e, 0xff5a2a];

export function createGarage(G) {
  const garage = {
    pos: { ...GARAGE_POS },
    paintIndex: 0,
    engineLevel: 0,
    armorLevel: 0,
    neon: false,
    neonColor: 0,
    ownedId: null,
    ownedType: null,
    hintCooldown: 0,
    // v5: sport suspension level (0-2) — sharper steering on Mara's car.
    suspensionLevel: 0,
  };
  // A roller door, a neon sign post and a pair of tool crates mark the shop.
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const door = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.4), mat(0x8a8a8a));
  door.position.set(0, 2.5, 0);
  group.add(door);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 0.1), mat(0x5a5a5a));
    slat.position.set(0, 1 + i, 0.25);
    group.add(slat);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xd81a2a, emissive: 0x660000 }));
  sign.position.set(0, 6.2, 0);
  group.add(sign);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), mat(0x2a2a2a));
  post.position.set(-5.4, 3, 0);
  group.add(post);
  for (const [cx, cz] of [[-7, 3], [7, 3]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), mat(0xd8a03a));
    crate.position.set(cx, 0.6, cz);
    group.add(crate);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), mat(0x8a5a1a));
    lid.position.set(cx, 1.3, cz);
    group.add(lid);
  }
  group.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
  G.scene.add(group);
  // v6: the showroom — five plinths on the apron in front of the shop, one
  // per collection slot. A collected car appears on its plinth in its own
  // paint; empty plinths wait, grey and patient.
  const showroom = [];
  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 8),
      new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
    pad.position.set(-16 + i * 8, 0.15, 7);
    group.add(pad);
    const car = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.4),
      new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
    car.position.set(-16 + i * 8, 0.7, 7);
    car.visible = false;
    group.add(car);
    showroom.push({ pad, car });
  }
  garage.showroom = showroom;
  // The shop front is solid: Mara parks beside it, not through it.
  G.city.colliders.push({
    minX: GARAGE_POS.x - 5, maxX: GARAGE_POS.x + 5,
    minZ: GARAGE_POS.z - 0.5, maxZ: GARAGE_POS.z + 0.5,
  });
  garage.group = group;
  G.garage = garage;
  return garage;
}

// v6: refresh the showroom plinths from the collection — a collected car
// appears on its plinth in its own paint, so the garage shows off what
// Mara owns without a word.
export function refreshShowroom(G) {
  const g = G.garage;
  const c = G.collection;
  if (!g || !g.showroom || !c) return;
  g.showroom.forEach((slot, i) => {
    const owned = c.owned[i];
    slot.car.visible = !!owned;
    if (owned && slot.car.material) slot.car.material.color.set(owned.color);
  });
}

function repaint(G, car, paint) {
  // The body is the first mesh the car builder adds; recolor it in place.
  const body = car.mesh.children[0];
  if (body && body.material && body.material.color) {
    body.material.color.set(paint.color);
  }
  car.color = paint.color;
}

function ownedCar(G) {
  const car = G.driving;
  if (!car) return null;
  if (G.garage.ownedId === null) {
    G.garage.ownedId = car.id;
    G.garage.ownedType = car.type;
    G.hud.toast(`This ${car.spec.name} is yours now — Vic keeps the keys on the hook.`);
  }
  return car;
}

function applyBoost(car, level) {
  // The driving model reads upgradeBoost as a top-speed multiplier.
  car.upgradeBoost = 1 + 0.08 * level;
}

export function applyGarageToCar(G, car) {
  // Re-apply saved tuning when Mara gets back into her owned car.
  if (G.garage.ownedId === car.id) {
    repaint(G, car, PAINTS[G.garage.paintIndex % PAINTS.length]);
    applyBoost(car, G.garage.engineLevel);
    applyNeon(G, car);
    // v5: the suspension tune rides with the car too.
    car.handlingBoost = 1 + 0.12 * (G.garage.suspensionLevel || 0);
  }
}

function applyNeon(G, car) {
  // A glowing plane under the chassis. One per car: remove the old glow
  // before adding a new one so re-entering never stacks them.
  if (car.mesh.userData.neonGlow) {
    car.mesh.remove(car.mesh.userData.neonGlow);
    car.mesh.userData.neonGlow = null;
  }
  if (!G.garage.neon) return;
  const color = NEON_COLORS[G.garage.neonColor % NEON_COLORS.length];
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 5.6),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
    }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.12;
  car.mesh.add(glow);
  car.mesh.userData.neonGlow = glow;
  car.mesh.userData.neonColor = color;
}

export function buyNeon(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.cash < NEON_PRICE) { G.hud.toast(`Neon underglow is $${NEON_PRICE} — you're short.`); return; }
  G.cash -= NEON_PRICE;
  G.garage.neon = true;
  G.garage.neonColor = (G.garage.neonColor + 1) % NEON_COLORS.length;
  applyNeon(G, car);
  G.audio.pickup();
  G.hud.toast(`Neon underglow fitted — the car glows at night now. ${garageStatusText(G)}`);
  G.save.save(G);
}

export function garageStatusText(G) {
  const g = G.garage;
  const paint = PAINTS[g.paintIndex % PAINTS.length];
  return `Garage — ${paint.name} · Engine Lv${g.engineLevel}/${ENGINE_MAX} · Armor Lv${g.armorLevel}/${ARMOR_MAX}` +
    (g.suspensionLevel ? ` · Suspension Lv${g.suspensionLevel}` : '') +
    (g.neon ? ' · Neon on' : '') +
    (g.ownedType ? ` · your ${g.ownedType}` : ' · no car tuned yet');
}

// v5: sport suspension — Vic stiffens the chassis so the car answers the
// wheel faster. Two levels, each +12% steering response on Mara's car.
function trySuspension(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.garage.suspensionLevel >= SUSPENSION_MAX) { G.hud.toast('Suspension is already maxed — it corners like it is on rails.'); return; }
  if (G.cash < SUSPENSION_PRICE) { G.hud.toast(`Sport suspension is $${SUSPENSION_PRICE} — you're short.`); return; }
  G.cash -= SUSPENSION_PRICE;
  G.garage.suspensionLevel++;
  car.handlingBoost = 1 + 0.12 * G.garage.suspensionLevel;
  G.audio.missionSting();
  G.hud.toast(`Sport suspension Lv${G.garage.suspensionLevel} — sharper steering, flatter corners. ${garageStatusText(G)}`);
  G.save.save(G);
}

// v5: the nitro tank — a bigger bottle for the burn, fitted and filled on
// the spot. Sold here so the garage is the one place that tops everything up.
function tryNitroTank(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.cash < NITRO_TANK_PRICE) { G.hud.toast(`A nitro tank is $${NITRO_TANK_PRICE} — you're short.`); return; }
  if (!G.nitro || !G.nitro.buyTank) { G.hud.toast('No nitro rig on this car yet — Vic needs an engine to bolt it to.'); return; }
  if (!G.nitro.buyTank(G)) return;
  G.cash -= NITRO_TANK_PRICE;
  G.audio.missionSting();
  G.hud.toast(`Nitro tank fitted and filled — bigger bottle, longer burn. ${nitroStatusText(G)}`);
  G.save.save(G);
}

function tryPaint(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.cash < PAINT_PRICE) { G.hud.toast(`A respray is $${PAINT_PRICE} — you're short. Win a race or run a fare.`); return; }
  G.cash -= PAINT_PRICE;
  G.garage.paintIndex = (G.garage.paintIndex + 1) % PAINTS.length;
  const paint = PAINTS[G.garage.paintIndex];
  repaint(G, car, paint);
  G.audio.pickup();
  G.hud.toast(`Resprayed ${paint.name} — $${PAINT_PRICE}. ${garageStatusText(G)}`);
  G.save.save(G);
}

function tryEngine(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.garage.engineLevel >= ENGINE_MAX) { G.hud.toast('Engine is already maxed out — Vic has nothing left to bolt on.'); return; }
  if (G.cash < ENGINE_PRICE) { G.hud.toast(`An engine upgrade is $${ENGINE_PRICE} — you're short.`); return; }
  G.cash -= ENGINE_PRICE;
  G.garage.engineLevel++;
  applyBoost(car, G.garage.engineLevel);
  refillNitro(G); // engine work includes a full nitro tank, on the house
  G.audio.missionSting();
  G.hud.toast(`Engine Lv${G.garage.engineLevel} fitted — +8% top speed, nitro tank full. ${garageStatusText(G)}`);
  G.save.save(G);
}

function tryArmor(G) {
  const car = ownedCar(G);
  if (!car) { G.hud.toast('Get in a car and bring it to Vic\'s garage first.'); return; }
  if (G.garage.armorLevel >= ARMOR_MAX) { G.hud.toast('Armor is already maxed — this thing is a tank.'); return; }
  if (G.cash < ARMOR_PRICE) { G.hud.toast(`Armor plating is $${ARMOR_PRICE} — you're short.`); return; }
  G.cash -= ARMOR_PRICE;
  G.garage.armorLevel++;
  G.armor = Math.min(100, G.armor + 50);
  G.audio.missionSting();
  G.hud.toast(`Armor plating Lv${G.garage.armorLevel} — Mara is harder to hurt now. ${garageStatusText(G)}`);
  G.save.save(G);
}

export function updateGarage(G, dt) {
  const g = G.garage;
  if (!g) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const d = Math.hypot(pos.x - g.pos.x, pos.z - g.pos.z);
  if (d > 12) return;
  if (G.input.pressed('paint')) tryPaint(G);
  else if (G.input.pressed('engine')) tryEngine(G);
  else if (G.input.pressed('armor')) tryArmor(G);
  else if (G.input.pressed('neon')) buyNeon(G);
  else if (G.input.pressed('suspension')) trySuspension(G);
  else if (G.input.pressed('nitrotank')) tryNitroTank(G);
  else if (g.hintCooldown <= 0) {
    g.hintCooldown = 6;
    G.hud.setInteract(
      `<b>U</b> paint $${PAINT_PRICE} · <b>I</b> engine $${ENGINE_PRICE} · <b>O</b> armor $${ARMOR_PRICE} · <b>Y</b> neon $${NEON_PRICE} · <b>H</b> suspension $${SUSPENSION_PRICE} · <b>K</b> nitro tank $${NITRO_TANK_PRICE} — ${garageStatusText(G)}`);
  }
  if (g.hintCooldown > 0) g.hintCooldown -= dt;
}
