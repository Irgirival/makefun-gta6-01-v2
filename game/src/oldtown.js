// oldtown.js — the Old Town historic quarter (v6). A walled-off-feeling old
// district in the north-east corner: a cobbled plaza with a fountain, the
// Cathedral of Saint Mara, a market street with stalls, a tram line that
// runs the old avenue, and narrow lanes full of tourists and shoppers.
// The two blocks it sits on are kept clear of modern towers by city.js, so
// everything here is built fresh in this file.

import * as THREE from 'three';
import { range } from './random.js';

export const OLD_TOWN = {
  plaza: { x: 260, z: -260 },
  cathedral: { x: 284, z: -284 },
  market: { x: 244, z: -216 },
  marketRow: { x: 260, z: -212 },
  tramX: 220,
  tramZ0: -320,
  tramZ1: -120,
  tramStation: { x: 220, z: -200 },
  arch: { x: 260, z: -220 },
  bellTower: { x: 240, z: -284 },
  viewpoint: { x: 300, z: -300 },
};

const LANDMARKS = [
  { id: 'cathedral', name: 'Cathedral of Saint Mara', x: 284, z: -284 },
  { id: 'plaza', name: 'Old Town Plaza', x: 260, z: -260 },
  { id: 'market', name: 'Old Town Market', x: 260, z: -212 },
  { id: 'tram', name: 'Old Tram Station', x: 220, z: -200 },
  { id: 'arch', name: 'Founders Arch', x: 260, z: -220 },
  { id: 'belltower', name: 'Bell Tower', x: 240, z: -284 },
  { id: 'viewpoint', name: 'Old Town Viewpoint', x: 300, z: -300 },
  { id: 'lodge', name: 'Summit Ski Lodge', x: -196, z: 500 },
];

function mat(color, emissive = 0) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}

function box(G, group, w, h, d, color, x, y, z, emissive = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive));
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function addCollider(G, cx, cz, hw, hd) {
  G.city.colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
}

export function buildOldTown(G) {
  const group = new THREE.Group();
  const rng = G.rng;

  // Cobbled plaza: a wide stone disc with a ring pattern and a fountain.
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(24, 28), mat(0x9a8f7a));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(OLD_TOWN.plaza.x, 0.06, OLD_TOWN.plaza.z);
  group.add(plaza);
  const plazaRing = new THREE.Mesh(new THREE.RingGeometry(20, 24, 28), mat(0x7a6f5c));
  plazaRing.rotation.x = -Math.PI / 2;
  plazaRing.position.set(OLD_TOWN.plaza.x, 0.07, OLD_TOWN.plaza.z);
  group.add(plazaRing);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 1.1, 18), mat(0x6a7a8a));
  basin.position.set(OLD_TOWN.plaza.x, 0.55, OLD_TOWN.plaza.z);
  group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 0.3, 18),
    new THREE.MeshLambertMaterial({ color: 0x3a9ad8, emissive: 0x113355 }));
  water.position.set(OLD_TOWN.plaza.x, 1.05, OLD_TOWN.plaza.z);
  group.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.6, 10), mat(0xb8b0a0));
  spout.position.set(OLD_TOWN.plaza.x, 2.2, OLD_TOWN.plaza.z);
  group.add(spout);
  addCollider(G, OLD_TOWN.plaza.x, OLD_TOWN.plaza.z, 5, 5);

  // The Cathedral of Saint Mara: tall stone nave, twin spires, rose window.
  const cath = new THREE.Group();
  box(G, cath, 16, 14, 26, 0xc9bfa5, 0, 7, 0);
  box(G, cath, 18, 3, 28, 0x8a7a5c, 0, 15.5, 0);
  box(G, cath, 10, 18, 2, 0xb8ad92, 0, 9, 13.2);
  for (const sx of [-6.5, 6.5]) {
    box(G, cath, 4, 26, 4, 0xc9bfa5, sx, 13, 12.5);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 4), mat(0x3a6a8a));
    tip.position.set(sx, 29.5, 12.5);
    tip.rotation.y = Math.PI / 4;
    cath.add(tip);
  }
  const rose = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20),
    new THREE.MeshLambertMaterial({ color: 0xd84a6a, emissive: 0x551122 }));
  rose.position.set(0, 12, 14.25);
  cath.add(rose);
  const door = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.4), mat(0x4a2a1a));
  door.position.set(0, 3, 13.3);
  cath.add(door);
  cath.position.set(OLD_TOWN.cathedral.x, 0, OLD_TOWN.cathedral.z);
  group.add(cath);
  addCollider(G, OLD_TOWN.cathedral.x, OLD_TOWN.cathedral.z, 10, 15);

  // The Bell Tower: a freestanding stone tower with a golden bell that
  // swings gently and rings on the hour.
  const tower = new THREE.Group();
  box(G, tower, 6, 22, 6, 0xb8ad92, 0, 11, 0);
  box(G, tower, 7, 2, 7, 0x8a7a5c, 0, 23, 0);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.4, 12),
    new THREE.MeshLambertMaterial({ color: 0xd8a03a, emissive: 0x554400 }));
  bell.position.set(0, 21.5, 0);
  tower.add(bell);
  tower.position.set(OLD_TOWN.bellTower.x, 0, OLD_TOWN.bellTower.z);
  group.add(tower);
  addCollider(G, OLD_TOWN.bellTower.x, OLD_TOWN.bellTower.z, 4, 4);

  // Founders Arch over the south entrance to the quarter.
  const arch = new THREE.Group();
  box(G, arch, 2.5, 10, 2.5, 0xa89a78, -6, 5, 0);
  box(G, arch, 2.5, 10, 2.5, 0xa89a78, 6, 5, 0);
  box(G, arch, 15, 2.5, 2.5, 0xa89a78, 0, 10.5, 0);
  const archSign = new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a, emissive: 0x112244 }));
  archSign.position.set(0, 8.2, 0);
  arch.add(archSign);
  arch.position.set(OLD_TOWN.arch.x, 0, OLD_TOWN.arch.z);
  group.add(arch);
  addCollider(G, OLD_TOWN.arch.x - 6, OLD_TOWN.arch.z, 1.5, 1.5);
  addCollider(G, OLD_TOWN.arch.x + 6, OLD_TOWN.arch.z, 1.5, 1.5);

  // Market street: six stalls with striped awnings, crates and goods.
  const awningColors = [0xd83a3a, 0x3a7ad8, 0x3a8a5a, 0xd8a03a, 0x8a4ad8, 0x2a9a8a];
  for (let i = 0; i < 6; i++) {
    const sx = OLD_TOWN.marketRow.x - 25 + i * 10;
    const sz = OLD_TOWN.marketRow.z + (i % 2 ? 3 : -3);
    const stall = new THREE.Group();
    box(G, stall, 4.4, 1.0, 3, 0x6a4a2a, 0, 0.9, 0);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 3.6), mat(awningColors[i]));
    awn.position.set(0, 3.1, 0);
    awn.rotation.z = 0.08;
    stall.add(awn);
    for (const px of [-2, 2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.1, 6), mat(0x3a2a1a));
      pole.position.set(px, 1.55, 1.6);
      stall.add(pole);
    }
    const goods = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.2),
      mat([0xff8a3a, 0x7dff9a, 0xffd23e, 0xff5a8a, 0x8fd0ff, 0xc98aff][i]));
    goods.position.set(0, 1.65, 0);
    stall.add(goods);
    stall.position.set(sx, 0, sz);
    group.add(stall);
    addCollider(G, sx, sz, 2.4, 1.8);
  }

  // Old townhouses along the plaza's north and east edges: narrow, tall,
  // shuttered, each a different faded colour.
  const houseColors = [0xc98a6a, 0x8aa8c9, 0xd8c98a, 0x9ac98a, 0xc98aa8, 0xa8c9c9];
  for (let i = 0; i < 6; i++) {
    const hx = OLD_TOWN.plaza.x - 30 + i * 12;
    const hz = OLD_TOWN.plaza.z - 34;
    const h = 9 + (i % 3) * 4;
    const house = new THREE.Group();
    box(G, house, 9, h, 8, houseColors[i], 0, h / 2, 0);
    box(G, house, 9.6, 1.2, 8.6, 0x6a4a3a, 0, h + 0.6, 0);
    for (let wy = 3; wy < h - 1; wy += 3.4) {
      for (const wx of [-2.4, 2.4]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.15),
          new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x554400 }));
        win.position.set(wx, wy, 4.1);
        house.add(win);
      }
    }
    house.position.set(hx, 0, hz);
    group.add(house);
    addCollider(G, hx, hz, 5, 4.5);
  }

  // Tram line: twin rails down the old avenue (road x=220) with a
  // cobbled verge, plus a shelter at the tram station.
  const railMat = mat(0x4a4a4a);
  for (const rx of [OLD_TOWN.tramX - 1.1, OLD_TOWN.tramX + 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, OLD_TOWN.tramZ1 - OLD_TOWN.tramZ0), railMat);
    rail.position.set(rx, 0.08, (OLD_TOWN.tramZ0 + OLD_TOWN.tramZ1) / 2);
    group.add(rail);
  }
  const shelter = new THREE.Group();
  box(G, shelter, 8, 0.3, 3, 0x2a6a4a, 0, 3.4, 0);
  for (const px of [-3.6, 3.6]) {
    box(G, shelter, 0.3, 3.4, 0.3, 0x2a2a2a, px, 1.7, 0);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1), mat(0x6a4a2a));
  bench.position.set(0, 0.8, 0);
  shelter.add(bench);
  shelter.position.set(OLD_TOWN.tramStation.x + 5, 0, OLD_TOWN.tramStation.z);
  group.add(shelter);

  // The tram itself: a cream-and-green two-car tram that glides the line.
  const tram = new THREE.Group();
  const carMat = mat(0xe8dcc0);
  const greenMat = mat(0x2a6a4a);
  for (const cz of [-4.2, 4.2]) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 7.6), carMat);
    car.position.set(0, 2.1, cz);
    tram.add(car);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.9, 7.6), greenMat);
    skirt.position.set(0, 0.85, cz);
    tram.add(skirt);
    for (let wz = -2.6; wz <= 2.6; wz += 2.6) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.6),
        new THREE.MeshLambertMaterial({ color: 0x9fd0e8, emissive: 0x223344 }));
      win.position.set(1.55, 2.5, cz + wz);
      tram.add(win);
      const win2 = win.clone();
      win2.position.x = -1.55;
      tram.add(win2);
    }
  }
  const pantograph = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 2.4), mat(0x222222));
  pantograph.position.set(0, 4.3, 0);
  tram.add(pantograph);
  tram.position.set(OLD_TOWN.tramX, 0, OLD_TOWN.tramZ0 + 40);
  group.add(tram);

  // Old street lamps with warm globes along the market and plaza.
  const lampPositions = [];
  for (let i = 0; i < 8; i++) lampPositions.push({ x: 236 + i * 8, z: -204 });
  for (let i = 0; i < 6; i++) lampPositions.push({ x: 236 + i * 10, z: -284 });
  for (const lp of lampPositions) {
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 4.4, 8), mat(0x1a1a1a));
    post.position.y = 2.2;
    lamp.add(post);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xaa7711 }));
    globe.position.y = 4.6;
    lamp.add(globe);
    lamp.position.set(lp.x, 0, lp.z);
    group.add(lamp);
  }

  // A viewpoint plaque at the quarter's north-east corner.
  const plaque = new THREE.Group();
  box(G, plaque, 1.6, 1.2, 0.3, 0x8a7a5c, 0, 0.9, 0);
  box(G, plaque, 0.3, 0.9, 0.3, 0x3a3a3a, -0.6, 0.45, 0);
  box(G, plaque, 0.3, 0.9, 0.3, 0x3a3a3a, 0.6, 0.45, 0);
  plaque.position.set(OLD_TOWN.viewpoint.x, 0, OLD_TOWN.viewpoint.z);
  group.add(plaque);

  G.scene.add(group);
  G.oldtown = {
    group, tram, bell, landmarks: LANDMARKS,
    tramDir: 1,
    tramSpeed: 9,
    bellTimer: 0,
    visited: {},
  };
  return G.oldtown;
}

export function updateOldTown(G, dt) {
  const o = G.oldtown;
  if (!o) return;
  // The tram glides its line and turns around at each terminus.
  const t = o.tram.position;
  t.z += o.tramDir * o.tramSpeed * dt;
  if (t.z >= OLD_TOWN.tramZ1 - 6) o.tramDir = -1;
  if (t.z <= OLD_TOWN.tramZ0 + 6) o.tramDir = 1;
  o.tram.rotation.y = o.tramDir > 0 ? 0 : Math.PI;
  // The bell swings gently; it rings on the hour (checked by the clock).
  o.bell.rotation.z = Math.sin(G.elapsed * 1.2) * 0.08;
  o.bellTimer -= dt;
  if (o.bellTimer <= 0) {
    o.bellTimer = 60;
    const hour = Math.floor((G.clockMinutes / 60) % 12) + 1;
    if (hour === 12 && G.audio.tramBell) G.audio.tramBell();
  }
  // Landmark visits: walking close to a landmark ticks it off.
  const pos = G.driving ? G.driving.pos : G.player.pos;
  for (const lm of o.landmarks) {
    if (o.visited[lm.id]) continue;
    if (Math.hypot(lm.x - pos.x, lm.z - pos.z) < 16) {
      o.visited[lm.id] = true;
      G.hud.toast(`Landmark — ${lm.name} (${Object.keys(o.visited).length}/${o.landmarks.length})`);
      G.audio.pickup();
      G.cash += 50;
    }
  }
}

export function oldTownLandmarkCount(G) {
  return G.oldtown ? Object.keys(G.oldtown.visited).length : 0;
}

// v7: the night market's second row and the bell tower's hours. Six
// more stalls open along the market street after dark — candles,
// pastries, postcards, hats, second-hand books and a fortune teller
// with a purple tent — and the bell tower keeps the quarter's hours:
// it chimes on the hour, and at noon the chime is long enough to hear
// from the plaza. The fortune teller is the only stall that talks back:
// stand at her tent and she tells Mara's fortune, which is always the
// same — "the city is yours, if you keep driving like you mean it."

export const V7_MARKET_STALLS_2 = [
  { x: 248, z: -208, color: 0xffd23e, name: 'Candle stall' },
  { x: 252, z: -208, color: 0xd85a1a, name: 'Pastry stall' },
  { x: 256, z: -208, color: 0x2a7ad8, name: 'Postcard stall' },
  { x: 260, z: -208, color: 0x2a7a3a, name: 'Hat stall' },
  { x: 264, z: -208, color: 0x8a3ad8, name: 'Book stall' },
  { x: 268, z: -208, color: 0x6a1a6a, name: 'Fortune teller' },
];

export function buildOldTownV7(G) {
  const group = new THREE.Group();
  group.name = 'old-town-v7';
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const box = (w, h, d, color, x, y, z, opts) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const addCollider = (cx, cz, w, d) => {
    G.city.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  };

  const stalls = [];
  for (const stall of V7_MARKET_STALLS_2) {
    box(3.0, 1.1, 2.0, 0x6a4a2a, stall.x, 0.55, stall.z);
    const awning = box(3.4, 0.16, 2.3, stall.color, stall.x, 2.4, stall.z);
    awning.rotation.z = 0.06;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    lamp.position.set(stall.x, 2.8, stall.z);
    group.add(lamp);
    addCollider(stall.x, stall.z, 3.2, 2.2);
    stalls.push({ ...stall, lamp });
  }
  // The fortune teller's tent: a purple pyramid over the last stall.
  const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 4),
    mat(0x6a1a6a));
  tent.position.set(268, 3.4, -208);
  tent.rotation.y = Math.PI / 4;
  group.add(tent);

  G.scene.add(group);
  G.oldtownV7 = {
    stalls,
    lastChimeHour: -1,
    fortunes: 0,
    lastFortuneAt: -999,
  };
  return G.oldtownV7;
}

// v7: the bell chimes on the hour, and the fortune teller talks when
// Mara stands at her tent — once a minute at most, the future is busy.
export function updateOldTownV7(G, dt) {
  const o7 = G.oldtownV7;
  if (!o7) return;
  const hour = Math.floor(G.clockMinutes / 60) % 24;
  if (hour !== o7.lastChimeHour) {
    o7.lastChimeHour = hour;
    const p = G.player.pos;
    if (Math.hypot(p.x - 240, p.z + 284) < 120) {
      G.hud.toast(hour === 12
        ? 'The bell tower chimes noon — long and low over Old Town.'
        : `The bell tower chimes ${hour === 0 ? 'midnight' : hour + ':00'} over Old Town.`);
    }
  }
  const p = G.player.pos;
  if (Math.hypot(p.x - 268, p.z + 208) < 5 && G.elapsed - o7.lastFortuneAt > 60) {
    o7.lastFortuneAt = G.elapsed;
    o7.fortunes += 1;
    G.hud.toast('FORTUNE TELLER: "The city is yours, if you keep driving like you mean it."');
  }
  // The market lamps glow after dark and sleep by day.
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const night = mins >= 18 * 60 || mins < 6 * 60;
  for (const stall of o7.stalls) stall.lamp.visible = night;
}

export function oldTownV7Summary(G) {
  const o7 = G.oldtownV7;
  if (!o7) return 'The second market row is not built yet.';
  return `${o7.stalls.length} new stalls · ${o7.fortunes} fortunes told.`;
}

// ---- v8: the Old Town ghost walk ---------------------------------------------
// The v7 quarter had landmarks and a market; v8 gives it a ghost walk.
// At night, the lantern guide leads a tour past the quarter's haunted
// corners — the old customs house, the sealed chapel, the well that
// never runs dry — and each stop pays a storyteller's fee if Mara is
// there to hear it. Three stops in one night is a full walk, and a full
// walk earns the lantern badge. The quarter is old; it remembers.

export const GHOST_STOPS_V8 = [
  { id: 'customs', name: 'The Old Customs House', x: 270, z: -250 },
  { id: 'chapel', name: 'The Sealed Chapel', x: 250, z: -270 },
  { id: 'well', name: 'The Well That Never Runs Dry', x: 280, z: -240 },
];

export function createGhostWalk(G) {
  if (G.ghostWalk) return G.ghostWalk;
  G.ghostWalk = {
    stopsHeard: [],
    walks: 0,
    badge: false,
    active: false,
    night: -1,
  };
  return G.ghostWalk;
}

export function updateGhostWalk(G, dt) {
  const gw = G.ghostWalk;
  if (!gw) return;
  const hour = Math.floor((G.clockMinutes % (24 * 60)) / 60);
  const night = hour >= 21 || hour < 2;
  const day = Math.floor(G.elapsed / 86400) + 1;
  if (night && !gw.active) {
    gw.active = true;
    gw.night = day;
    gw.stopsHeard = [];
    G.hud.toast('GHOST WALK — the lantern guide is leading a tour through Old Town. Follow the lantern.');
  }
  if (!night && gw.active) {
    gw.active = false;
    if (gw.stopsHeard.length >= GHOST_STOPS_V8.length) {
      gw.walks += 1;
      if (!gw.badge) {
        gw.badge = true;
        G.cash += 400;
        G.hud.toast('LANTERN BADGE — a full ghost walk, all three stops. The quarter trusts you now. +$400.');
      }
    }
  }
  if (!gw.active) return;
  const p = G.player.pos;
  for (const stop of GHOST_STOPS_V8) {
    if (gw.stopsHeard.includes(stop.id)) continue;
    if (Math.hypot(p.x - stop.x, p.z - stop.z) < 9) {
      gw.stopsHeard.push(stop.id);
      G.cash += 60;
      G.hud.toast(`Ghost walk: ${stop.name} — the guide tells its story. +$60 (${gw.stopsHeard.length}/3 stops).`);
    }
  }
}

export function ghostWalkSummary(G) {
  const gw = G.ghostWalk;
  if (!gw) return 'Ghost walk not haunting yet.';
  return `${gw.walks} full walks · ${gw.stopsHeard.length}/3 stops tonight · badge: ${gw.badge ? 'YES' : 'not yet'} · walk ${gw.active ? 'ACTIVE' : 'only after 21:00'}.`;
}
