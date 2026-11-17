// safehouse.js — Mara's safehouse: a small yellow house with a blue door
// where the heat cannot follow. Walk inside and the wanted level clears
// (the PD loses the trail), health refills, the game saves, and Mara swaps
// to a fresh outfit — the jacket colour cycles so the streets see a new
// woman. A 20-second cooldown stops players farming it mid-chase.

import * as THREE from 'three';
import { restockAmmo, buyAmmoPack, buyArmorVest, buyMedkit } from './combat.js';
import { refillNitro } from './nitro.js';

const OUTFITS = [
  { name: 'Red Jacket', color: 0x8a2f2f },
  { name: 'Navy Jacket', color: 0x2a3a5a },
  { name: 'Forest Jacket', color: 0x2a5a3a },
  { name: 'Black Jacket', color: 0x222222 },
  { name: 'Sunset Jacket', color: 0xc85a1a },
];

function findHouseSpot(G) {
  // Scan a small grid around the plaza's north-east block for a patch that
  // is neither road nor inside a building collider.
  for (let gx = 50; gx <= 70; gx += 4) {
    for (let gz = 50; gz <= 70; gz += 4) {
      if (G.city.isRoad(gx, gz)) continue;
      let blocked = false;
      for (const c of G.city.colliders) {
        if (gx > c.minX - 6 && gx < c.maxX + 6 && gz > c.minZ - 6 && gz < c.maxZ + 6) {
          blocked = true; break;
        }
      }
      if (!blocked) return { x: gx, z: gz };
    }
  }
  return { x: 20, z: 60 }; // plaza fallback: always open ground
}

export function createSafehouse(G) {
  const spot = findHouseSpot(G);
  const safehouse = {
    pos: spot,
    radius: 7,
    cooldown: 0,
    outfitIndex: 0,
    visits: 0,
  };
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 8), mat(0xe8d878));
  walls.position.y = 2.2;
  group.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.2, 4), mat(0x8a2f2f));
  roof.position.y = 6;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x1a6ad8, emissive: 0x113366 }));
  door.position.set(-1.5, 1.5, 4.1);
  group.add(door);
  for (const wx of [1.8, 3.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x664400 }));
    win.position.set(wx, 2.4, 4.05);
    group.add(win);
  }
  const porch = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 2.5), mat(0x8a6a4a));
  porch.position.set(-1.5, 0.15, 5.2);
  group.add(porch);
  // A warm porch lamp so the house reads at night.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xaa8800 }));
  lamp.position.set(0.6, 3.4, 4.2);
  group.add(lamp);
  // A low hedge ring marks the safe zone.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 5), mat(0x2a7a3a));
    bush.position.set(Math.cos(a) * 7.5, 0.7, Math.sin(a) * 7.5);
    bush.scale.y = 0.75;
    group.add(bush);
  }
  group.position.set(spot.x, 0, spot.z);
  G.scene.add(group);
  G.city.colliders.push({
    minX: spot.x - 4.5, maxX: spot.x + 4.5, minZ: spot.z - 4, maxZ: spot.z + 4,
  });
  safehouse.group = group;
  G.safehouse = safehouse;
  return safehouse;
}

// v6: a second safehouse in Old Town — a stone cottage above the market
// where Mara can duck the heat. Same rules as the first house: step inside
// the hedge ring, the stars clear, her health and armor come back, and the
// game saves. The quarter looks after its own.
export function createOldTownSafehouse(G) {
  const spot = { x: 292, z: -152 };
  const safehouse2 = {
    pos: spot,
    radius: 7,
    cooldown: 0,
    visits: 0,
  };
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 7), mat(0x9a8f7a));
  walls.position.y = 2.1;
  group.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3, 4), mat(0x6a4a3a));
  roof.position.y = 5.7;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a, emissive: 0x112244 }));
  door.position.set(-1.2, 1.4, 3.6);
  group.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.15),
    new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x664400 }));
  win.position.set(1.8, 2.3, 3.55);
  group.add(win);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xaa8800 }));
  lamp.position.set(0.6, 3.2, 3.7);
  group.add(lamp);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.8, 7, 5), mat(0x3a6a3a));
    bush.position.set(Math.cos(a) * 6.5, 0.6, Math.sin(a) * 6.5);
    bush.scale.y = 0.7;
    group.add(bush);
  }
  group.position.set(spot.x, 0, spot.z);
  G.scene.add(group);
  G.city.colliders.push({
    minX: spot.x - 4, maxX: spot.x + 4, minZ: spot.z - 3.5, maxZ: spot.z + 3.5,
  });
  safehouse2.group = group;
  G.safehouse2 = safehouse2;
  return safehouse2;
}

export function updateOldTownSafehouse(G, dt) {
  const s = G.safehouse2;
  if (!s) return;
  if (s.cooldown > 0) s.cooldown -= dt;
  if (G.driving || G.boating) return;
  const p = G.player.pos;
  const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
  if (d > s.radius) return;
  if (s.cooldown > 0) {
    G.hud.setInteract('Old Town safehouse — come back soon, the heat is still watching.');
    return;
  }
  s.cooldown = 20;
  s.visits++;
  const hadHeat = G.wanted.stars > 0;
  G.wanted.clear();
  G.health = G.config.playerHealth;
  G.armor = Math.max(G.armor, 50);
  G.audio.missionComplete();
  G.hud.showDialogue([
    'OLD TOWN SAFEHOUSE — Mara slips into the stone cottage above the market, and the quarter keeps her secret.',
    hadHeat ? 'The PD loses the trail in the narrow streets. The stars are gone.' : 'No heat on her — just the cathedral bells and a quiet room.',
    'Saved. Old Town looks after its own.',
  ]);
  G.save.save(G);
}

export function changeOutfit(G) {
  const s = G.safehouse;
  s.outfitIndex = (s.outfitIndex + 1) % OUTFITS.length;
  const outfit = OUTFITS[s.outfitIndex];
  if (G.player.setJacket) G.player.setJacket(outfit.color);
  return outfit;
}

export function updateSafehouse(G, dt) {
  const s = G.safehouse;
  if (!s) return;
  if (s.cooldown > 0) s.cooldown -= dt;
  if (G.driving || G.boating) return;
  const p = G.player.pos;
  const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
  // v5: the outfit shop and weapon locker — L near the house opens the
  // wardrobe, without triggering the rest-and-reset.
  if (d <= s.radius + 4 && G.mode === 'playing' && G.input.pressed('locker')) {
    openSafehouseShop(G);
    return;
  }
  if (d > s.radius) return;
  if (s.cooldown > 0) {
    G.hud.setInteract('Safehouse — come back soon, the heat is still watching.');
    return;
  }
  s.cooldown = 20;
  s.visits++;
  const hadHeat = G.wanted.stars > 0;
  const wasHurt = G.health < 100;
  G.wanted.clear();
  G.health = G.config.playerHealth;
  G.armor = Math.max(G.armor, 50);
  if (G.combat && G.combat.ammo !== undefined) {
    // Fresh magazines with the fresh outfit — the safehouse restocks her.
    restockAmmo(G);
  }
  const outfit = changeOutfit(G);
  refillNitro(G); // the safehouse tops up the nitro tank too
  G.audio.missionComplete();
  G.hud.showDialogue([
    `SAFEHOUSE — Mara slips inside, changes into her ${outfit.name.toLowerCase()}, and breathes.`,
    hadHeat ? 'The PD loses the trail completely. The stars are gone.' : 'No heat on her — just a quiet house and a fresh start.',
    wasHurt ? 'Patched up, rested, saved. The city can wait a minute.' : 'Saved. The city can wait a minute.',
  ]);
  G.save.save(G);
}

// ---------------------------------------------------------------------------
// v5 — Safehouse v2: the outfit shop and the weapon locker. Mara's wardrobe
// is a real shop now: four outfits with list prices and small perks that
// change how she plays (faster sprint, cooler heat, a vest's armor, a
// medic's kit). Buying equips at once; owned outfits can be swapped free.
// The locker beside it sells pistol ammo, armor vests and medkits for cash.
// ---------------------------------------------------------------------------

export const SHOP_OUTFITS = [
  { id: 'harbor-runner', name: 'Harbor Runner', price: 300, color: 0x2a7a8a, perk: 'sprint', blurb: 'Light shoes, light jacket — sprint 15% faster.' },
  { id: 'night-stalker', name: 'Night Stalker', price: 500, color: 0x1a1a22, perk: 'stealth', blurb: 'Dark, quiet, forgettable — heat cools 50% faster.' },
  { id: 'iron-vest', name: 'Iron Vest', price: 600, color: 0x4a4a4a, perk: 'armor', blurb: 'A vest under the jacket — +50 armor the moment you put it on.' },
  { id: 'boardwalk-star', name: 'Boardwalk Star', price: 400, color: 0xd8a03a, perk: 'vigor', blurb: 'Gold jacket, gold energy — heal 25 on the spot.' },
];

const LOCKER_STOCK = [
  { id: 'ammo', name: 'Pistol ammo box', price: 80, blurb: '+60 reserve rounds' },
  { id: 'vest', name: 'Armor vest', price: 200, blurb: '+50 armor' },
  { id: 'medkit', name: 'Medkit', price: 150, blurb: 'Heal 50 health' },
];

export function applyOutfitPerk(G, outfit) {
  const s = G.safehouse;
  s.equippedOutfit = outfit.id;
  // Clear the last outfit's live perk before the new one lands.
  G.player.sprintBoost = 1;
  G.wanted.heatDecayMult = 1;
  if (outfit.perk === 'sprint') G.player.sprintBoost = 1.15;
  if (outfit.perk === 'stealth') G.wanted.heatDecayMult = 1.5;
  if (outfit.perk === 'armor') G.armor = Math.min(100, G.armor + 50);
  if (outfit.perk === 'vigor') G.health = Math.min(G.config.playerHealth, G.health + 25);
  if (G.player.setJacket) G.player.setJacket(outfit.color);
}

export function buyOutfit(G, id) {
  const s = G.safehouse;
  const outfit = SHOP_OUTFITS.find((o) => o.id === id);
  if (!outfit) return false;
  if (s.ownedOutfits.includes(id)) {
    applyOutfitPerk(G, outfit);
    G.hud.toast(`Wearing the ${outfit.name} — ${outfit.blurb}`);
    G.audio.pickup();
    renderSafehouseShop(G);
    G.save.save(G);
    return true;
  }
  if (G.cash < outfit.price) {
    G.hud.toast(`The ${outfit.name} costs $${outfit.price} — you have $${Math.floor(G.cash)}.`);
    G.audio.emptyClick();
    return false;
  }
  G.cash -= outfit.price;
  s.ownedOutfits.push(id);
  applyOutfitPerk(G, outfit);
  G.audio.missionComplete();
  G.hud.toast(`Bought the ${outfit.name} for $${outfit.price} — ${outfit.blurb}`);
  renderSafehouseShop(G);
  G.save.save(G);
  return true;
}

export function lockerBuy(G, id) {
  const item = LOCKER_STOCK.find((i) => i.id === id);
  if (!item) return false;
  let ok = false;
  if (id === 'ammo') ok = buyAmmoPack(G);
  else if (id === 'vest') ok = buyArmorVest(G);
  else if (id === 'medkit') ok = buyMedkit(G);
  if (ok) {
    G.audio.pickup();
    renderSafehouseShop(G);
    G.save.save(G);
  }
  return ok;
}

function renderSafehouseShop(G) {
  const s = G.safehouse;
  const shop = s.shop;
  if (!shop || !shop.overlay) return;
  const rows = SHOP_OUTFITS.map((o) => {
    const owned = s.ownedOutfits.includes(o.id);
    const worn = s.equippedOutfit === o.id;
    const label = worn ? 'WORN' : owned ? 'WEAR' : `BUY $${o.price}`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;background:#160a1c;border:1px solid #6a1a2a;border-radius:8px;padding:8px 12px;margin:6px 0">` +
      `<span style="text-align:left"><b>${o.name}</b> — ${o.blurb}</span>` +
      `<button data-outfit="${o.id}" style="font:inherit;padding:6px 14px;border-radius:6px;border:none;background:${worn ? '#2a7a3a' : '#d8a03a'};color:${worn ? '#fff' : '#1c0f22'};cursor:pointer;white-space:nowrap">${label}</button></div>`;
  }).join('');
  const locker = LOCKER_STOCK.map((i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;background:#160a1c;border:1px solid #6a1a2a;border-radius:8px;padding:8px 12px;margin:6px 0">` +
    `<span style="text-align:left"><b>${i.name}</b> — ${i.blurb}</span>` +
    `<button data-locker="${i.id}" style="font:inherit;padding:6px 14px;border-radius:6px;border:none;background:#1a6ad8;color:#fff;cursor:pointer;white-space:nowrap">BUY $${i.price}</button></div>`
  ).join('');
  shop.body.innerHTML =
    `<div style="font-size:15px;margin-bottom:6px">👗 OUTFITS — perks that change how Mara plays</div>${rows}` +
    `<div style="font-size:15px;margin:12px 0 6px">🔫 WEAPON LOCKER — cash for kit</div>${locker}` +
    `<div style="margin-top:10px;font-size:14px;opacity:0.9">Cash: $${Math.floor(G.cash)} · Armor ${Math.round(G.armor)} · Health ${Math.round(G.health)}</div>`;
  shop.body.querySelectorAll('[data-outfit]').forEach((b) =>
    b.addEventListener('click', () => buyOutfit(G, b.getAttribute('data-outfit'))));
  shop.body.querySelectorAll('[data-locker]').forEach((b) =>
    b.addEventListener('click', () => lockerBuy(G, b.getAttribute('data-locker'))));
}

export function createSafehouseShop(G) {
  const s = G.safehouse;
  s.ownedOutfits = s.ownedOutfits || [];
  s.equippedOutfit = s.equippedOutfit || null;
  const overlay = document.createElement('div');
  overlay.id = 'safehouseshop';
  overlay.className = 'hidden';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;',
    'background:rgba(8,10,16,0.8);font-family:inherit;color:#f5e9c8;',
  ].join('');
  overlay.innerHTML =
    '<div style="background:#241026;border:3px solid #d8a03a;border-radius:14px;padding:22px 26px;max-width:560px;width:92%;text-align:center;box-shadow:0 0 60px rgba(216,160,58,0.35)">' +
    '<h2 style="margin:0 0 4px;color:#ffd23e;letter-spacing:2px">🏠 MARA\'S WARDROBE</h2>' +
    '<p style="margin:0 0 10px;opacity:0.85">Outfits with perks, and a locker full of kit. The safehouse keeps the heat out — the shop keeps Mara ready.</p>' +
    '<div id="shopBody"></div>' +
    '<button id="shopClose" style="font:inherit;margin-top:12px;padding:10px 26px;border-radius:8px;border:2px solid #d8a03a;background:transparent;color:#ffd23e;cursor:pointer">CLOSE (L)</button>' +
    '</div>';
  document.body.appendChild(overlay);
  s.shop = { overlay, body: overlay.querySelector('#shopBody'), open: false };
  overlay.querySelector('#shopClose').addEventListener('click', () => closeSafehouseShop(G));
  renderSafehouseShop(G);
  return s.shop;
}

export function openSafehouseShop(G) {
  const s = G.safehouse;
  if (!s.shop) createSafehouseShop(G);
  s.shop.open = true;
  s.shop.overlay.classList.remove('hidden');
  renderSafehouseShop(G);
  G.audio.pickup();
  G.hud.toast('The wardrobe — outfits with perks, and the weapon locker.');
}

export function closeSafehouseShop(G) {
  const s = G.safehouse;
  if (!s.shop || !s.shop.open) return;
  s.shop.open = false;
  s.shop.overlay.classList.add('hidden');
  G.hud.toast('Wardrobe closed — looking sharp, Mara.');
}

export function safehouseShopStatusText(G) {
  const s = G.safehouse;
  if (!s) return 'Safehouse — walk in to rest';
  return s.shop && s.shop.open
    ? 'Wardrobe open — outfits & locker'
    : `Safehouse — ${s.ownedOutfits.length} outfit${s.ownedOutfits.length === 1 ? '' : 's'} owned · L near the house to shop`;
}
