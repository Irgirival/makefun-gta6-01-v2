// safehouse.js — Mara's safehouse: a small yellow house with a blue door
// where the heat cannot follow. Walk inside and the wanted level clears
// (the PD loses the trail), health refills, the game saves, and Mara swaps
// to a fresh outfit — the jacket colour cycles so the streets see a new
// woman. A 20-second cooldown stops players farming it mid-chase.

import * as THREE from 'three';
import { restockAmmo } from './combat.js';
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
