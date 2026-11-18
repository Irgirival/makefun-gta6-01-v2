// city.js — builds Solmar City: a procedural sun-soaked grid city with a beach
// and waterfront to the south, a harbor to the east, two parks, a central plaza,
// downtown towers, streetlights and trees. Also owns collision: every building
// registers an axis-aligned box that players, cars, traffic and police collide
// with. All placement is seeded, so the same seed builds the same city.

import * as THREE from 'three';
import { makeRng, pick, range, rangeInt, chance, hash2 } from './random.js';
import { AIRFIELD_BLOCKS } from './airport.js';

const ROAD_COLORS = { asphalt: 0x2e3138, line: 0xd8d3c0, sidewalk: 0x9aa0a3, curb: 0x6e7276 };
const BUILDING_PALETTE = [
  0xd8c9a8, 0xc9b8a0, 0xb8c4c9, 0xd9a06b, 0xa8b8c9, 0xc9a8a8, 0x9fb8a8, 0xd0c4b0,
  0x8fa8c9, 0xe0d0b8, 0xb0a890, 0xc9c9c9,
];
const WINDOW_COLOR = 0x2a3f55;

export function buildCity(G) {
  const cfg = G.config;
  const rng = makeRng(G.seed * 7919 + 13);
  const group = new THREE.Group();
  group.name = 'solmar-city';
  const colliders = [];   // {minX, maxX, minZ, maxZ}
  const roads = { xs: [], zs: [] };

  // Road centre lines every blockSize, from -cityHalf to +cityHalf.
  for (let c = -cfg.cityHalf; c <= cfg.cityHalf; c += cfg.blockSize) {
    roads.xs.push(c);
    roads.zs.push(c);
  }
  const roadSet = new Set(roads.xs);

  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const box = (w, h, d, color, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ---- Ground: grass base, then sand beach south, water beyond, harbor east.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(cfg.cityHalf * 2 + 500, cfg.cityHalf * 2 + 500),
    mat(0x5d8a4a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  group.add(ground);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(cfg.cityHalf * 2 + 500, 90), mat(0xe6d3a3));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, cfg.beachZ + 30);
  group.add(sand);

  const waterMat = new THREE.MeshLambertMaterial({ color: 0x2a7ab8, transparent: true, opacity: 0.88 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(cfg.cityHalf * 2 + 500, 220), waterMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.15, cfg.waterZ + 90);
  group.add(sea);
  const harborWater = new THREE.Mesh(new THREE.PlaneGeometry(120, cfg.cityHalf * 2 + 200), waterMat);
  harborWater.rotation.x = -Math.PI / 2;
  harborWater.position.set(cfg.harborX + 70, 0.15, 0);
  group.add(harborWater);

  // ---- Roads: asphalt strips + sidewalks + dashed centre lines.
  const roadMat = mat(ROAD_COLORS.asphalt);
  const sideMat = mat(ROAD_COLORS.sidewalk);
  for (const c of roads.xs) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(cfg.roadWidth, cfg.cityHalf * 2 + 40), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0.02, 0); group.add(v);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(cfg.sidewalkWidth, cfg.cityHalf * 2 + 40), sideMat);
    s1.rotation.x = -Math.PI / 2; s1.position.set(c - cfg.roadWidth / 2 - 2.5, 0.03, 0); group.add(s1);
    const s2 = s1.clone(); s2.position.x = c + cfg.roadWidth / 2 + 2.5; group.add(s2);
  }
  for (const c of roads.zs) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(cfg.cityHalf * 2 + 40, cfg.roadWidth), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.02, c); group.add(h);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(cfg.cityHalf * 2 + 40, cfg.sidewalkWidth), sideMat);
    s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.03, c - cfg.roadWidth / 2 - 2.5); group.add(s1);
    const s2 = s1.clone(); s2.position.z = c + cfg.roadWidth / 2 + 2.5; group.add(s2);
  }
  // Dashed centre lines along every road.
  const dashGeo = new THREE.BoxGeometry(0.5, 0.06, 4);
  const dashMat = mat(ROAD_COLORS.line);
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 1200);
  let di = 0;
  for (const c of roads.xs) {
    for (let z = -cfg.cityHalf; z <= cfg.cityHalf && di < 1200; z += 12) {
      const m4 = new THREE.Matrix4().setPosition(c, 0.06, z);
      dashes.setMatrixAt(di++, m4);
    }
  }
  for (const c of roads.zs) {
    for (let x = -cfg.cityHalf; x <= cfg.cityHalf && di < 1200; x += 12) {
      const m4 = new THREE.Matrix4().setPosition(x, 0.06, c);
      m4.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
      dashes.setMatrixAt(di++, m4);
    }
  }
  dashes.count = di;
  group.add(dashes);

  // ---- Blocks: buildings, parks, plaza, harbor docks.
  const blockHalf = cfg.blockSize / 2 - cfg.roadWidth / 2 - cfg.sidewalkWidth - 2;
  const parkBlocks = new Set(['-140,-140', '180,100']);
  const plazaBlock = '20,20';
  const windowGeo = new THREE.BoxGeometry(1.6, 1.2, 0.15);
  const windowMat = new THREE.MeshLambertMaterial({ color: WINDOW_COLOR, emissive: 0x1a2a3a });
  const treeTrunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6);
  const treeTopGeo = new THREE.ConeGeometry(1.9, 4.5, 8);
  const trunkMat = mat(0x6b4a2f);
  const leafMat = mat(0x3f7a34);

  function addTree(x, z, scale = 1) {
    const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
    trunk.position.set(x, 1.2 * scale, z); trunk.scale.setScalar(scale); group.add(trunk);
    const top = new THREE.Mesh(treeTopGeo, leafMat);
    top.position.set(x, (2.4 + 2.0) * scale, z); top.scale.setScalar(scale); group.add(top);
  }

  function addBuilding(cx, cz, w, d, h, color) {
    const b = box(w, h, d, color, cx, h / 2, cz);
    // Roof lip.
    box(w + 0.8, 0.5, d + 0.8, 0x555a60, cx, h + 0.25, cz);
    // Window grid on the two street-facing sides.
    const cols = Math.max(2, Math.floor(w / 4));
    const rows = Math.max(2, Math.floor(h / 4.2));
    const winCount = cols * rows * 2;
    const wins = new THREE.InstancedMesh(windowGeo, windowMat, winCount);
    let wi = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = cx - w / 2 + 2 + (c * (w - 4)) / Math.max(1, cols - 1);
        const wy = 2.6 + r * 4.2;
        const m1 = new THREE.Matrix4().setPosition(wx, wy, cz + d / 2 + 0.08);
        wins.setMatrixAt(wi++, m1);
        const m2 = new THREE.Matrix4().setPosition(wx, wy, cz - d / 2 - 0.08);
        m2.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
        wins.setMatrixAt(wi++, m2);
      }
    }
    wins.count = wi;
    group.add(wins);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    return b;
  }

  // v6: the Old Town quarter owns two north-east blocks — no modern towers
  // here; oldtown.js fills them with the plaza, the cathedral and the market.
  const OLD_TOWN_BLOCKS = new Set(['260,-260', '260,-180']);
  for (let bx = -cfg.cityHalf + cfg.blockSize / 2; bx <= cfg.cityHalf - cfg.blockSize / 2; bx += cfg.blockSize) {
    for (let bz = -cfg.cityHalf + cfg.blockSize / 2; bz <= cfg.cityHalf - cfg.blockSize / 2; bz += cfg.blockSize) {
      const key = `${bx},${bz}`;
      const distCenter = Math.hypot(bx, bz);
      // The airfield owns these four north-west blocks: no buildings here.
      if (AIRFIELD_BLOCKS.has(key)) continue;
      // The Old Town quarter owns its two north-east blocks: the plaza and
      // the market street are built by oldtown.js, not by the tower placer.
      if (OLD_TOWN_BLOCKS.has(key)) continue;
      // Harbor strip: east edge blocks become docks, not buildings.
      if (bx >= cfg.harborX - cfg.blockSize) {
        // Working docks: piers, sheds, stacked containers and a crane.
        const hrng = makeRng(Math.floor(hash2(bx, bz) * 1e9) + G.seed + 5);
        if (bz % 160 === 0) {
          box(50, 1.2, 16, 0x8a7a5a, bx + 30, 0.6, bz); // pier
          box(10, 6, 8, 0x4a6a8a, bx + 46, 3, bz - 4);  // dock shed
        }
        const contColors = [0xc9a03a, 0x3a7ad8, 0xd83a3a, 0x3a8a5a];
        for (let i = 0; i < 3; i++) {
          const cx = bx + range(hrng, -10, 30);
          const cz = bz + range(hrng, -24, 24);
          box(12, 3, 5, pick(hrng, contColors), cx, 1.5, cz);
          if (chance(hrng, 0.5)) box(12, 3, 5, pick(hrng, contColors), cx, 4.5, cz);
        }
        // Dock crane on every other harbor block.
        if (Math.abs(bz / 80) % 2 === 0) {
          box(2, 22, 2, 0xd8a03a, bx + 24, 11, bz + 20);
          box(2, 22, 2, 0xd8a03a, bx + 34, 11, bz + 20);
          box(16, 2, 2, 0xd8a03a, bx + 29, 21, bz + 20);
        }
        continue;
      }
      // Beach strip: south edge blocks stay open sand.
      if (bz >= cfg.beachZ - cfg.blockSize) continue;
      if (key === plazaBlock) {
        // Central plaza: fountain + benches + open stone.
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(26, 24), mat(0xb8b0a0));
        plaza.rotation.x = -Math.PI / 2; plaza.position.set(bx, 0.05, bz); group.add(plaza);
        const fountain = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 1.4, 16), mat(0x9fb8c9));
        fountain.position.set(bx, 0.7, bz); group.add(fountain);
        const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.2, 3.2, 8),
          new THREE.MeshLambertMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.7 }));
        spray.position.set(bx, 3, bz); group.add(spray);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          addTree(bx + Math.cos(a) * 20, bz + Math.sin(a) * 20, 1.1);
        }
        continue;
      }
      if (parkBlocks.has(key)) {
        const lawn = new THREE.Mesh(new THREE.PlaneGeometry(cfg.blockSize - 20, cfg.blockSize - 20), mat(0x4a8a3a));
        lawn.rotation.x = -Math.PI / 2; lawn.position.set(bx, 0.04, bz); group.add(lawn);
        const prng = makeRng(bx * 31 + bz * 17 + G.seed);
        for (let i = 0; i < 9; i++) {
          addTree(bx + range(prng, -28, 28), bz + range(prng, -28, 28), range(prng, 0.9, 1.5));
        }
        box(8, 1, 3, 0x8a6a4a, bx, 0.5, bz + 10); // bench row
        continue;
      }
      // Normal block: 1-4 buildings.
      const brng = makeRng(Math.floor(hash2(bx, bz) * 1e9) + G.seed);
      const downtown = distCenter < cfg.downtownRadius;
      const count = downtown ? rangeInt(brng, 1, 2) : rangeInt(brng, 2, 4);
      for (let i = 0; i < count; i++) {
        const w = range(brng, 14, 26);
        const d = range(brng, 14, 26);
        const h = downtown
          ? range(brng, 30, cfg.maxBuildingHeight)
          : range(brng, 8, 26);
        const ox = range(brng, -blockHalf + w / 2 + 2, blockHalf - w / 2 - 2);
        const oz = range(brng, -blockHalf + d / 2 + 2, blockHalf - d / 2 - 2);
        const cx = bx + ox, cz = bz + oz;
        // Keep buildings from overlapping each other in the same block.
        let ok = true;
        for (const c of colliders) {
          if (cx + w / 2 > c.minX - 3 && cx - w / 2 < c.maxX + 3 &&
              cz + d / 2 > c.minZ - 3 && cz - d / 2 < c.maxZ + 3) { ok = false; break; }
        }
        if (!ok) continue;
        addBuilding(cx, cz, w, d, h, pick(brng, BUILDING_PALETTE));
      }
      // A tree or two on quiet blocks.
      if (!downtown && chance(brng, 0.6)) addTree(bx + range(brng, -20, 20), bz + range(brng, -20, 20));
    }
  }

  // ---- Streetlights at every intersection corner.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const poleMat = mat(0x3a3f45);
  const lampGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc94d });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, 400);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 400);
  let li = 0;
  for (const x of roads.xs) {
    for (const z of roads.zs) {
      if (li >= 400) break;
      const px = x + cfg.roadWidth / 2 + cfg.sidewalkWidth + 0.6;
      const pz = z + cfg.roadWidth / 2 + cfg.sidewalkWidth + 0.6;
      poles.setMatrixAt(li, new THREE.Matrix4().setPosition(px, 3.5, pz));
      lamps.setMatrixAt(li, new THREE.Matrix4().setPosition(px, 7.1, pz));
      li++;
    }
  }
  poles.count = li; lamps.count = li;
  group.add(poles); group.add(lamps);

  // ---- Beach props: umbrellas, palms, lifeguard tower.
  for (let i = 0; i < 8; i++) {
    const ux = -260 + i * 72 + range(rng, -12, 12);
    const uz = cfg.beachZ + 18 + range(rng, 0, 22);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), mat(0xd8d3c0));
    pole.position.set(ux, 1.5, uz); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 8),
      mat(i % 2 ? 0xff7a5a : 0xffd23e));
    top.position.set(ux, 3.4, uz); group.add(top);
  }
  box(6, 8, 6, 0xf0ead8, -40, 4, cfg.beachZ + 26); // lifeguard tower
  box(7, 0.6, 7, 0xd8c9a8, -40, 8.2, cfg.beachZ + 26);

  // ---- Sky: sun, clouds, distant skyline silhouettes.
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  sun.position.set(-420, 260, -420); group.add(sun);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 10; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 8, 16), 8, 6), cloudMat);
      puff.position.set(j * 12 - 12, range(rng, -2, 2), range(rng, -4, 4));
      puff.scale.y = 0.45;
      cl.add(puff);
    }
    cl.position.set(range(rng, -500, 500), range(rng, 130, 200), range(rng, -500, 500));
    group.add(cl);
  }

  // ---- v5: the Sunset Viewpoint — a railed deck on the sand where photo
  // mode shines, with a big SOLMAR sign for the postcard shot — and three
  // glowing billboards down the beachfront road for the night race.
  {
    const deck = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 8), mat(0x8a6a4a));
    floor.position.y = 0.25; deck.add(floor);
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 0.25), mat(0xd8d3c0));
      post.position.set(-6.5 + i * 2.6, 1.0, -3.8); deck.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 0.12), mat(0xd8d3c0));
    rail.position.set(0, 1.55, -3.8); deck.add(rail);
    // The sign: gold letters on a deep blue board, facing the sea.
    const board = new THREE.Mesh(new THREE.BoxGeometry(11, 2.6, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x1a3a6a, emissive: 0x0a1a44 }));
    board.position.set(0, 3.6, -3.9); deck.add(board);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16),
      new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
    sunDisc.position.set(-3.6, 3.6, -3.72); deck.add(sunDisc);
    deck.position.set(-60, 0, cfg.beachZ + 26);
    deck.rotation.y = Math.PI; // face the city, sea at Mara's back
    group.add(deck);
    // Only the sign wall blocks movement — the deck itself is open sand.
    colliders.push({ minX: -66, maxX: -54, minZ: cfg.beachZ + 29, maxZ: cfg.beachZ + 31 });
  }
  for (const [bx, label] of [[-20, 0xffd23e], [100, 0x2aff8a], [220, 0xd81a8a]]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), mat(0x2a2a2a));
    pole.position.set(bx, 4.5, 288); group.add(pole);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 0.3),
      new THREE.MeshLambertMaterial({ color: label, emissive: label, emissiveIntensity: 0.35 }));
    panel.position.set(bx, 9.5, 288); group.add(panel);
  }

  G.scene.add(group);

  // Collision + road queries used by every moving system.
  const city = {
    group, colliders, roads,
    // Materials the day/night and weather systems tune at runtime.
    roadMat, lampMat, windowMat,
    // v6: let new districts register their own solid props, so the Old
    // Town cathedral, the market stalls and the ski lodge all block
    // movement exactly like a tower does.
    addCollider(cx, cz, hw, hd) {
      colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
    },
    isRoad(x, z) {
      const half = cfg.roadWidth / 2 + 1;
      for (const c of roads.xs) if (Math.abs(x - c) < half) return true;
      for (const c of roads.zs) if (Math.abs(z - c) < half) return true;
      return false;
    },
    // Push a circle (x, z, radius) out of buildings and world bounds.
    // Returns true when a collision happened.
    collideCircle(pos, radius) {
      let hit = false;
      for (const c of colliders) {
        const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - nx, dz = pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          hit = true;
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            pos.x = nx + (dx / d) * radius;
            pos.z = nz + (dz / d) * radius;
          } else {
            pos.x = c.maxX + radius;
          }
        }
      }
      const lim = cfg.cityHalf + 6;
      if (pos.x < -lim) { pos.x = -lim; hit = true; }
      if (pos.x > cfg.harborX + 90) { pos.x = cfg.harborX + 90; hit = true; }
      if (pos.z < -lim) { pos.z = -lim; hit = true; }
      // v3: the south limit reaches past Isla Verde (z ~635) so the island
      // is drivable and walkable; the sea beyond it is out of bounds.
      if (pos.z > cfg.waterZ + 240) { pos.z = cfg.waterZ + 240; hit = true; }
      return hit;
    },
    nearestRoadLine(x, z, axis) {
      // Nearest road centre on the given axis ('x' or 'z').
      const list = axis === 'x' ? roads.xs : roads.zs;
      let best = list[0], bd = Infinity;
      for (const c of list) {
        const d = Math.abs((axis === 'x' ? x : z) - c);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
  };
  // v3: a causeway sign where the beach road meets the Isla Verde bridge,
  // so drivers can find the island without the minimap.
  {
    const signGroup = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
    post.position.y = 2.25;
    signGroup.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x1a6ad8, emissive: 0x113366 }));
    board.position.y = 5.2;
    signGroup.add(board);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 0.32),
      new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0x664400 }));
    stripe.position.y = 4.2;
    signGroup.add(stripe);
    signGroup.position.set(-172, 0, 330);
    G.scene.add(signGroup);
  }
  G.city = city;
  return city;
}

// v7: the Night Market row, the skate park and the food-truck court — a
// second wave of city dressing built after the base city, so the v6 seed
// placements never move. The night market fills the plaza's east lane
// after dark (awnings, lanterns, stalls), the skate park sits on the
// beach road's open patch, and the food trucks park along the harbor
// gate. All of it registers colliders, so Mara and the cars bounce off
// the stalls the same way they bounce off the towers.

const V7_MARKET_STALLS = [
  { x: 44, z: 20, color: 0xd81a8a, name: 'Flower stall' },
  { x: 44, z: 28, color: 0x2a7ad8, name: 'Fish stall' },
  { x: 44, z: 36, color: 0xd8a03a, name: 'Spice stall' },
  { x: 44, z: 44, color: 0x2a7a3a, name: 'Fruit stall' },
  { x: 44, z: 52, color: 0x8a3ad8, name: 'Silk stall' },
  { x: 44, z: 60, color: 0xd85a1a, name: 'Bread stall' },
];

const V7_FOOD_TRUCKS = [
  { x: 300, z: 44, color: 0xffd23e, name: 'Taco truck' },
  { x: 300, z: 52, color: 0x2aff8a, name: 'Noodle truck' },
  { x: 300, z: 60, color: 0xff5a2a, name: 'Burger truck' },
];

export function buildV7District(G) {
  const group = new THREE.Group();
  group.name = 'solmar-v7-district';
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

  // Night-market stalls: a counter, a striped awning and a warm lantern.
  const v7 = { stalls: [], trucks: [], lanterns: [], marketOn: false };
  for (const stall of V7_MARKET_STALLS) {
    const counter = box(3.2, 1.1, 2.0, 0x6a4a2a, stall.x, 0.55, stall.z);
    const awning = box(3.6, 0.18, 2.4, stall.color, stall.x, 2.5, stall.z);
    awning.rotation.z = 0.08;
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    lantern.position.set(stall.x, 2.9, stall.z);
    group.add(lantern);
    v7.lanterns.push(lantern);
    // Crates of goods under the counter, in the stall's own colour.
    box(0.8, 0.6, 0.8, stall.color, stall.x - 0.9, 0.3, stall.z + 0.6);
    box(0.8, 0.6, 0.8, stall.color, stall.x + 0.9, 0.3, stall.z - 0.6);
    addCollider(stall.x, stall.z, 3.4, 2.2);
    v7.stalls.push({ ...stall, group: counter });
  }

  // Food trucks: a long box body, a serving hatch and a roof sign.
  for (const truck of V7_FOOD_TRUCKS) {
    const body = box(2.6, 2.4, 5.2, truck.color, truck.x, 1.2, truck.z);
    box(2.7, 0.5, 1.2, 0xf0f0f0, truck.x, 2.8, truck.z);
    const hatch = box(0.1, 0.9, 2.2, 0x1a1a1a, truck.x - 1.32, 1.4, truck.z);
    addCollider(truck.x, truck.z, 2.8, 5.4);
    v7.trucks.push({ ...truck, body });
  }

  // Skate park: a concrete bowl, two quarter-pipes and a rail, on the
  // open patch by the beach road where nothing else was built.
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 1.6, 20),
    mat(0x8a8f94));
  bowl.position.set(-60, 0.8, 300);
  group.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(8, 0.35, 8, 24),
    mat(0xd8d3c0));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-60, 1.7, 300);
  group.add(rim);
  box(6, 2.2, 1.2, 0x3a7ad8, -48, 1.1, 300);
  box(6, 2.2, 1.2, 0xd81a2a, -72, 1.1, 300);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8, 8),
    mat(0xd8d3c0));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(-60, 1.0, 312);
  group.add(rail);
  addCollider(-60, 300, 20, 4);
  v7.skatePark = { x: -60, z: 300 };

  G.scene.add(group);
  G.cityV7 = v7;
  return v7;
}

// v7: the market wakes at dusk and sleeps at dawn — lanterns glow, the
// stalls hum, and the food trucks flip their signs. Called every frame;
// cheap, because it only flips visibility when the state changes.
export function updateV7District(G, dt) {
  const v7 = G.cityV7;
  if (!v7) return;
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const night = mins >= 18 * 60 || mins < 6 * 60;
  if (night !== v7.marketOn) {
    v7.marketOn = night;
    for (const l of v7.lanterns) l.visible = night;
    if (night) G.hud.toast('The Night Market is open — the plaza smells like spice and fried fish.');
  }
}

// v7: how many market stalls Mara has browsed — standing at a stall for a
// few seconds counts as a browse, and the shopkeepers remember regulars.
export function marketBrowseCount(G) {
  return (G.cityV7 && G.cityV7.browsed) || 0;
}

// ---- v8: the rooftop gardens and the skybridge ------------------------------
// The v7 district gave the city a night market; v8 builds up. Three
// rooftop gardens crown the downtown towers — palm, herb and flower —
// joined by a glass skybridge Mara can walk, and at night the bridge
// lights up gold. The gardens are photo spots in their own right, and
// the skybridge is the highest walkable point in the city that is not a
// helicopter: stand on it at dusk and the whole bay is below you.


export const V8_GARDENS = [
  { id: 'palm', name: 'Palm Garden', x: 60, z: -40, h: 34, color: 0x2a8a4a },
  { id: 'herb', name: 'Herb Garden', x: -60, z: -60, h: 28, color: 0x6a8a2a },
  { id: 'flower', name: 'Flower Garden', x: 100, z: 60, h: 42, color: 0xd83a8a },
];

export function buildV8District(G) {
  if (G.cityV8) return G.cityV8;
  const group = new THREE.Group();
  const gardens = [];
  for (const def of V8_GARDENS) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 12),
      new THREE.MeshLambertMaterial({ color: def.color }));
    bed.position.set(def.x, def.h, def.z);
    group.add(bed);
    for (let i = 0; i < 5; i++) {
      const plant = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x3ad86a }));
      plant.position.set(def.x - 6 + i * 3, def.h + 2, def.z + (i % 2 ? 3 : -3));
      group.add(plant);
    }
    gardens.push({ ...def, visited: false });
  }
  // The glass skybridge between the palm and herb gardens.
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 3),
    new THREE.MeshLambertMaterial({ color: 0x9fc8e8, transparent: true, opacity: 0.55 }));
  bridge.position.set(0, 31, -50);
  group.add(bridge);
  const bridgeGlow = new THREE.Mesh(new THREE.BoxGeometry(120, 0.2, 3.4),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0 }));
  bridgeGlow.position.set(0, 30.6, -50);
  group.add(bridgeGlow);
  G.scene.add(group);
  G.cityV8 = { group, gardens, bridgeGlow, visits: 0 };
  return G.cityV8;
}

export function updateV8District(G, dt) {
  const c8 = G.cityV8;
  if (!c8) return;
  // The skybridge glows gold after dark, and a garden visit is counted
  // when Mara stands on a rooftop bed — the city keeps a garden book.
  const night = G.clockMinutes % (24 * 60) >= 18 * 60 || G.clockMinutes % (24 * 60) < 6 * 60;
  c8.bridgeGlow.material.opacity = night ? 0.5 + Math.sin(G.elapsed * 2) * 0.15 : 0;
  const p = G.player.pos;
  for (const garden of c8.gardens) {
    if (!garden.visited && Math.hypot(p.x - garden.x, p.z - garden.z) < 9) {
      garden.visited = true;
      c8.visits += 1;
      G.hud.toast(`${garden.name} — a rooftop garden above the city. ${c8.visits}/3 gardens found.`);
      G.cash += 50;
    }
  }
}

export function v8DistrictSummary(G) {
  const c8 = G.cityV8;
  if (!c8) return 'Rooftop gardens not built yet.';
  const found = c8.gardens.filter((g) => g.visited).length;
  return `${found}/3 rooftop gardens visited · skybridge ${G.clockMinutes % (24 * 60) >= 18 * 60 ? 'lit gold' : 'daylight'}.`;
}
