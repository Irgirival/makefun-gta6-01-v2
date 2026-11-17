// islaverde.js — Isla Verde, Solmar's second district across the water:
// a beach-resort island south of the beach, reached by the causeway bridge
// or by boat from the marina. Boardwalk shops, a lighthouse that sweeps the
// bay at night, a marina full of moored boats, palm rows and its own
// strolling pedestrians. Buildings register colliders so cars and Mara
// cannot drive through them; the island otherwise plays by the city's rules.

import * as THREE from 'three';
import { isNight } from './daynight.js';

export const ISLA = {
  center: { x: -160, z: 540 },
  bridge: { x: -160, z: 420 },
  lighthouse: { x: -205, z: 565 },
  marina: { x: -115, z: 555 },
  boardwalk: { x: -160, z: 505 },
  plaza: { x: -160, z: 540 },
};

function lambert(c) {
  return new THREE.MeshLambertMaterial({ color: c });
}

function addCollider(G, cx, cz, w, d) {
  G.city.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

function buildPalm(G, x, z, s = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 5.2 * s, 7), lambert(0x8a6a3a));
  trunk.position.y = 2.6 * s;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 8, 6), lambert(0x2a8a3a));
  crown.position.set(0.4 * s, 5.4 * s, 0);
  crown.scale.y = 0.55;
  group.add(crown);
  const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.2 * s, 8, 6), lambert(0x3aaa4a));
  crown2.position.set(-0.5 * s, 5.8 * s, 0.3 * s);
  crown2.scale.y = 0.5;
  group.add(crown2);
  group.position.set(x, 0, z);
  G.scene.add(group);
  return group;
}

function buildShop(G, x, z, w, d, h, color, signColor) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  body.position.y = h / 2;
  group.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), lambert(0x8a4a2a));
  roof.position.y = h + 0.25;
  group.add(roof);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.3, 2.2),
    new THREE.MeshLambertMaterial({ color: signColor, emissive: 0x222222 }));
  awning.position.set(0, 2.6, d / 2 + 0.8);
  awning.rotation.x = 0.25;
  group.add(awning);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.2), lambert(0x2a2a2a));
  door.position.set(0, 1.3, d / 2 + 0.05);
  group.add(door);
  for (const sx of [-w / 4, w / 4]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x9fd8e8, emissive: 0x224455 }));
    win.position.set(sx, 2.2, d / 2 + 0.05);
    group.add(win);
  }
  group.position.set(x, 0, z);
  G.scene.add(group);
  addCollider(G, x, z, w, d);
  return group;
}

function buildLighthouse(G, x, z) {
  const group = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 26, 12), lambert(0xf0f0e8));
  tower.position.y = 13;
  group.add(tower);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.55 - i * 0.2, 2.7 - i * 0.2, 2.4, 12),
      lambert(0xd81a2a));
    band.position.y = 6 + i * 8;
    group.add(band);
  }
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a, emissive: 0x113344 }));
  lampRoom.position.y = 27.2;
  group.add(lampRoom);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lamp.position.y = 27.2;
  group.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3, 2.4, 12), lambert(0x1a1a22));
  cap.position.y = 30;
  group.add(cap);
  // The sweeping beam: a long translucent cone, swung by the day/night code.
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
      depthWrite: false,
    }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(30, 27.2, 0);
  group.add(beam);
  group.position.set(x, 0, z);
  G.scene.add(group);
  addCollider(G, x, z, 7, 7);
  G.isla = G.isla || {};
  G.isla.lighthouseBeam = beam;
  G.isla.lighthouseLamp = lamp;
  return group;
}

function buildBoardwalk(G) {
  // Wooden planks along the island's north shore, with benches and lamps.
  const group = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 10), lambert(0xb08a4a));
  deck.position.y = 0.25;
  group.add(deck);
  for (let i = 0; i < 24; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 9.6), lambert(i % 2 ? 0xa8823e : 0xc09a58));
    plank.position.set(-57.5 + i * 5, 0.55, 0);
    group.add(plank);
  }
  for (let i = 0; i < 6; i++) {
    const bx = -50 + i * 20;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), lambert(0x6a4a2a));
    bench.position.set(bx, 0.9, -3.4);
    group.add(bench);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 6), lambert(0x2a2a2a));
    pole.position.set(bx + 2.5, 2.8, -4);
    group.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x887711 }));
    globe.position.set(bx + 2.5, 5.1, -4);
    group.add(globe);
  }
  group.position.set(ISLA.boardwalk.x, 0, ISLA.boardwalk.z);
  G.scene.add(group);
  return group;
}

function buildBridge(G) {
  // The causeway: a wide deck from the beach (z=340) to the island (z=500),
  // with guard rails and lamp posts, so cars can drive straight across.
  const group = new THREE.Group();
  // A flat deck like the city's roads (cars drive at y=0), with guard rails
  // and lamp posts, so cars can drive straight across to the island.
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(18, 170), lambert(0x8a8a86));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.12;
  group.add(deck);
  for (const sx of [-8.6, 8.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 170), lambert(0xd8d8d8));
    rail.position.set(sx, 0.7, 0);
    group.add(rail);
  }
  for (let i = 0; i < 9; i++) {
    const z = -80 + i * 20;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 6), lambert(0xffe98a));
    line.position.set(0, 0.18, z);
    group.add(line);
    for (const sx of [-7.5, 7.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5, 6), lambert(0x2a2a2a));
      pole.position.set(sx, 2.5, z);
      group.add(pole);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x887711 }));
      globe.position.set(sx, 5.2, z);
      group.add(globe);
    }
  }
  // Piers under the deck so it reads as a bridge over the water.
  for (let i = 0; i < 5; i++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 3), lambert(0x5a5a5a));
    pier.position.set(0, -1.8, -70 + i * 35);
    group.add(pier);
  }
  group.position.set(ISLA.bridge.x, 0, ISLA.bridge.z);
  G.scene.add(group);
  return group;
}

function buildMarina(G) {
  // Wooden piers jutting into the bay, with mooring posts and a fuel shack.
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 34), lambert(0x9a7a42));
    pier.position.set(-14 + i * 14, 0.4, 16);
    group.add(pier);
    for (let j = 0; j < 4; j++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 6), lambert(0x6a4a2a));
      post.position.set(-14 + i * 14 + 1.6, 1, 4 + j * 9);
      group.add(post);
    }
  }
  const shack = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 5), lambert(0x2a7a8a));
  shack.position.set(14, 1.7, -2);
  group.add(shack);
  const shackRoof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 5.6), lambert(0x8a4a2a));
  shackRoof.position.set(14, 3.6, -2);
  group.add(shackRoof);
  group.position.set(ISLA.marina.x, 0, ISLA.marina.z);
  G.scene.add(group);
  addCollider(G, ISLA.marina.x + 14, ISLA.marina.z - 2, 6, 5);
  return group;
}

export function buildIslaVerde(G) {
  G.isla = G.isla || {};
  // Island ground: a sand disc big enough for streets, plus a grass park.
  const sand = new THREE.Mesh(new THREE.CircleGeometry(95, 28),
    new THREE.MeshLambertMaterial({ color: 0xd8c088 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(ISLA.center.x, 0.12, ISLA.center.z);
  G.scene.add(sand);
  const park = new THREE.Mesh(new THREE.CircleGeometry(26, 20),
    new THREE.MeshLambertMaterial({ color: 0x3a7a3a }));
  park.rotation.x = -Math.PI / 2;
  park.position.set(ISLA.center.x + 30, 0.16, ISLA.center.z + 18);
  G.scene.add(park);
  // Island streets: two crossing roads of dark asphalt.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(12, 180), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.set(ISLA.center.x, 0.18, ISLA.center.z);
  G.scene.add(roadNS);
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(180, 12), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.set(ISLA.center.x, 0.18, ISLA.center.z);
  G.scene.add(roadEW);
  // The island's own water: the bay wraps the sand so the shoreline reads.
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(260, 260),
    new THREE.MeshLambertMaterial({ color: 0x2a7ab8, transparent: true, opacity: 0.85 }));
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(ISLA.center.x, 0.08, ISLA.center.z);
  G.scene.add(bay);
  // Sand sits above the bay plane; re-add the disc on top so it stays dry.
  sand.position.y = 0.22;
  roadNS.position.y = 0.26;
  roadEW.position.y = 0.26;
  park.position.y = 0.24;

  buildBridge(G);
  buildBoardwalk(G);
  buildLighthouse(G, ISLA.lighthouse.x, ISLA.lighthouse.z);
  buildMarina(G);

  // Boardwalk shops: a surf shack, a cafe, a bait shop and a hotel block.
  buildShop(G, -195, 512, 16, 12, 6, 0xf0e8d8, 0x1a6ad8);
  buildShop(G, -165, 512, 18, 12, 7, 0xe8d8c8, 0xd81a2a);
  buildShop(G, -135, 512, 14, 12, 5, 0xd8e8f0, 0x2a7a3a);
  buildShop(G, -105, 520, 22, 14, 16, 0xf0f0f0, 0xd8a03a);
  // A resort hotel tower on the east side, visible from the mainland beach.
  const hotel = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.BoxGeometry(18, 34, 16), lambert(0xf0e8d8));
  tower.position.y = 17;
  hotel.add(tower);
  for (let f = 0; f < 6; f++) {
    for (let w = 0; w < 4; w++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x9fd8e8, emissive: 0x224455 }));
      win.position.set(-6 + w * 4, 5 + f * 5, 8.1);
      hotel.add(win);
    }
  }
  const pool = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a9ad8, emissive: 0x114455 }));
  pool.position.set(0, 0.3, 14);
  hotel.add(pool);
  hotel.position.set(-95, 0, 575);
  G.scene.add(hotel);
  addCollider(G, -95, 575, 18, 16);

  // Palm rows along the boardwalk and the causeway landing.
  for (let i = 0; i < 8; i++) {
    buildPalm(G, -210 + i * 14, 498, 1);
    buildPalm(G, -205 + i * 14, 585, 0.9);
  }
  for (const [px, pz] of [[-185, 545], [-135, 545], [-185, 575], [-130, 580], [-160, 470]]) {
    buildPalm(G, px, pz, 1.1);
  }
  // Beach umbrellas on the island's south sand.
  for (let i = 0; i < 4; i++) {
    const ux = -195 + i * 22;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), lambert(0x8a8a8a));
    pole.position.set(ux, 1.5, 610);
    G.scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xd81a2a : 0x1a6ad8 }));
    top.position.set(ux, 3.4, 610);
    G.scene.add(top);
  }

  // Isla Verde's own pedestrians: tourists strolling the boardwalk.
  // They keep local targets on the island so they stroll the boardwalk
  // instead of marching back to the mainland sidewalks.
  for (let i = 0; i < 6; i++) {
    const ped = G.pedestrians.spawnPed(G, ISLA.boardwalk.x - 50 + i * 18, ISLA.boardwalk.z + (i % 2 ? 2 : -2), false);
    if (ped) {
      ped.local = { x: ISLA.boardwalk.x, z: ISLA.boardwalk.z, r: 55 };
      ped.target = new THREE.Vector3(
        ISLA.boardwalk.x - 50 + ((i + 3) % 6) * 18, 0, ISLA.boardwalk.z + (i % 2 ? -2 : 2));
    }
  }
  return G.isla;
}

export function updateIslaVerde(G, dt) {
  // The lighthouse beam sweeps the bay; at night the lamp brightens.
  const beam = G.isla && G.isla.lighthouseBeam;
  if (!beam) return;
  beam.rotation.y = G.elapsed * 0.25;
  const night = isNight(G);
  beam.material.opacity = night ? 0.22 : 0.08;
  if (G.isla.lighthouseLamp) {
    G.isla.lighthouseLamp.material.color.set(night ? 0xffffff : 0xfff2b0);
  }
}
