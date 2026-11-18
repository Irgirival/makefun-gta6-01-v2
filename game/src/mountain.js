// mountain.js — the Isla Verde mountain (v6). A snow-capped peak rises at
// the island's west end, and at its foot sits the ski lodge with a glowing
// hearth and a summit viewpoint that looks back over the bay to Solmar
// City. A winding hiking trail spirals up the slope for the postcard shot,
// and the snow line is real — inside the snow zone the weather turns to
// snowfall on its own.

import * as THREE from 'three';
import { MOUNTAIN } from './missions3.js';

const PEAK = { x: -250, z: 520, height: 42, radius: 62 };
// Cone surface height at a radius r from the peak centre.
function surfaceY(r) {
  return 40 - (42 / 62) * r;
}

function mat(color, emissive = 0) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}

function addCollider(G, cx, cz, hw, hd) {
  G.city.colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
}

export function buildMountain(G) {
  const group = new THREE.Group();

  // The peak: a broad cone with a white cap and a rocky skirt.
  const peak = new THREE.Mesh(new THREE.ConeGeometry(PEAK.radius, PEAK.height, 24), mat(0x5a6a5a));
  peak.position.set(PEAK.x, PEAK.height / 2 - 2, PEAK.z);
  group.add(peak);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(26, 16, 24), mat(0xf0f4f8));
  cap.position.set(PEAK.x, PEAK.height - 8, PEAK.z);
  group.add(cap);
  const band = new THREE.Mesh(new THREE.ConeGeometry(40, 10, 24), mat(0xd8e4ee));
  band.position.set(PEAK.x, PEAK.height - 16, PEAK.z);
  group.add(band);

  // The hiking trail: a flat spiral ribbon that follows the cone's surface
  // up the slope, with amber marker posts every few turns.
  const roadMat = mat(0x4a3a2a);
  const turns = 5;
  for (let i = 0; i < 46; i++) {
    const t = i / 45;
    const ang = t * Math.PI * 2 * turns + 0.6;
    const r = 56 - t * 34;
    const x = PEAK.x + Math.cos(ang) * r;
    const z = PEAK.z + Math.sin(ang) * r;
    const y = surfaceY(r) + 0.4;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.5, 10), roadMat);
    disc.position.set(x, y, z);
    group.add(disc);
    if (i % 6 === 0) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), mat(0xd8a03a));
      post.position.set(x + 4.5, y + 0.8, z);
      group.add(post);
    }
  }

  // The ski lodge: timber walls, a steep snow roof, a glowing hearth
  // window and a rack of skis by the door. It sits at the mountain's
  // foot, on flat ground, so Mara can drive right up to it.
  const lodge = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 9), mat(0x6a4a2a));
  walls.position.y = 2.5;
  lodge.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4), mat(0xf0f4f8));
  roof.position.y = 7.2;
  roof.rotation.y = Math.PI / 4;
  lodge.add(roof);
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xff8a3a, emissive: 0xaa4400 }));
  hearth.position.set(-2, 2.2, 4.6);
  lodge.add(hearth);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.3), mat(0x2a1a0a));
  door.position.set(2.5, 1.5, 4.6);
  lodge.add(door);
  for (let i = 0; i < 3; i++) {
    const ski = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.08),
      mat([0xd81a2a, 0x1a6ad8, 0xffd23e][i]));
    ski.position.set(-5.4 + i * 0.7, 1.6, 4.7);
    ski.rotation.z = 0.15;
    lodge.add(ski);
  }
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), mat(0x8a7a6a));
  chimney.position.set(4, 8, -2);
  lodge.add(chimney);
  lodge.position.set(MOUNTAIN.lodge.x, 0, MOUNTAIN.lodge.z);
  group.add(lodge);
  addCollider(G, MOUNTAIN.lodge.x, MOUNTAIN.lodge.z, 7, 5.5);

  // The summit viewpoint: a stone circle with a telescope, at the foot of
  // the trail where the whole bay opens up below.
  const view = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1, 16), mat(0x8a7a6a));
  deck.position.y = 0.5;
  view.add(deck);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.2, 8), mat(0x2a2a2a));
  scope.position.set(2, 2.2, 0);
  scope.rotation.z = 0.9;
  view.add(scope);
  const scopePost = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), mat(0x3a3a3a));
  scopePost.position.set(2.9, 1.2, 0);
  view.add(scopePost);
  view.position.set(MOUNTAIN.viewpoint.x, 0, MOUNTAIN.viewpoint.z);
  group.add(view);

  // Snow pines dotted down the slope, each planted on the cone's surface.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.35;
    const r = 34 + (i % 5) * 5;
    const x = PEAK.x + Math.cos(a) * r;
    const z = PEAK.z + Math.sin(a) * r;
    const pine = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6), mat(0x4a2a1a));
    trunk.position.y = 0.8;
    pine.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 8), mat(0x2a5a3a));
    crown.position.y = 3.6;
    pine.add(crown);
    const snowTip = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 8), mat(0xf0f4f8));
    snowTip.position.y = 5.2;
    pine.add(snowTip);
    pine.position.set(x, surfaceY(r), z);
    group.add(pine);
  }

  // A frozen pond at the mountain's foot, for the postcard shot.
  const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 20),
    new THREE.MeshLambertMaterial({ color: 0xbfe0f0, emissive: 0x224455 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(PEAK.x + 52, 0.1, PEAK.z + 30);
  group.add(pond);

  G.scene.add(group);
  G.mountain = {
    group, peak: PEAK, snowLine: 18,
    summitVisits: 0,
  };
  return G.mountain;
}

export function updateMountain(G, dt) {
  const m = G.mountain;
  if (!m) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const d = Math.hypot(pos.x - PEAK.x, pos.z - PEAK.z);
  // Inside the snow zone the weather turns to snow on its own.
  if (d < 70 && G.weather && G.weather.mode !== 'snow' && !G.shot) {
    if (G.weather.setMode) G.weather.setMode('snow');
  }
  // First visit to the viewpoint pays a postcard bonus.
  const vd = Math.hypot(pos.x - MOUNTAIN.viewpoint.x, pos.z - MOUNTAIN.viewpoint.z);
  if (vd < 12 && m.summitVisits === 0) {
    m.summitVisits = 1;
    G.cash += 200;
    G.hud.toast('Summit viewpoint — the whole bay below you. +$200 postcard bonus.');
    G.audio.missionComplete();
    G.save.save(G);
  }
}

export function mountainSummary(G) {
  const m = G.mountain;
  if (!m) return 'Mountain — not built.';
  return `Mountain viewpoint visits ${m.summitVisits} · snow line ${m.snowLine}m`;
}

// v7: the ski run, the rescue post and the avalanche bell. A marked ski
// run drops from the summit viewpoint to the lodge — follow the amber
// flags and the run pays $200 the first time you ski it on foot (the
// game counts a fast, clean descent). The rescue post at the trailhead
// is the mountain's conscience: a lost-hiker callout spawns a hiker on
// the trail, walk up to them and the lodge pays a rescue fee. And the
// avalanche bell rings when the snow gets heavy — the mountain telling
// everyone to come down now.

const SKI_FLAGS = [
  { x: -214, z: 542 }, { x: -210, z: 530 }, { x: -204, z: 518 },
  { x: -200, z: 508 }, { x: -196, z: 500 },
];

export function buildMountainV7(G) {
  const group = new THREE.Group();
  group.name = 'solmar-mountain-v7';
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  // Amber ski flags down the run, from the viewpoint to the lodge.
  const flags = [];
  for (const f of SKI_FLAGS) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mat(0x333333));
    pole.position.set(f.x, 1.1, f.z);
    group.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xffa21a, side: THREE.DoubleSide }));
    flag.position.set(f.x + 0.5, 1.9, f.z);
    group.add(flag);
    flags.push(flag);
  }
  // The rescue post: a red hut at the trailhead with a white cross.
  const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 3), mat(0xd81a1a));
  hut.position.set(-246, 1.3, 472);
  group.add(hut);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  crossV.position.set(-246, 1.6, 473.6);
  group.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  crossH.position.set(-246, 1.8, 473.6);
  group.add(crossH);
  G.city.colliders.push({ minX: -247.5, maxX: -244.5, minZ: 470.5, maxZ: 473.5 });
  // The avalanche bell on a post by the lodge — it swings when it rings.
  const bellPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), mat(0x333333));
  bellPost.position.set(-192, 1.5, 496);
  group.add(bellPost);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 10),
    mat(0xd8a03a));
  bell.position.set(-192, 3.1, 496);
  group.add(bell);
  G.scene.add(group);
  G.mountainV7 = {
    flags,
    bell,
    bellTimer: 0,
    skiBest: null,
    skiRuns: 0,
    rescues: 0,
    rescueEarned: 0,
    rescueActive: false,
    rescueSpot: null,
    rescueTimer: 200,
  };
  return G.mountainV7;
}

export function updateMountainV7(G, dt) {
  const m7 = G.mountainV7;
  if (!m7) return;
  // The flags wave in the mountain wind.
  for (let i = 0; i < m7.flags.length; i++) {
    m7.flags[i].rotation.y = Math.sin(G.elapsed * 2 + i) * 0.4;
  }
  // The avalanche bell: when the snow is heavy, it rings and the lodge
  // warns everyone down — a toast, once per storm.
  const snowing = G.weather && G.weather.mode === 'snow';
  m7.bellTimer -= dt;
  if (snowing && m7.bellTimer <= 0) {
    m7.bellTimer = 120;
    m7.bell.rotation.z = 0.4;
    G.hud.toast('The avalanche bell is ringing — heavy snow on the summit. Come down off the peak.');
  } else {
    m7.bell.rotation.z *= 0.95;
  }
  // Lost-hiker callout: every few minutes a hiker waits on the trail.
  m7.rescueTimer -= dt;
  if (!m7.rescueActive && m7.rescueTimer <= 0) {
    m7.rescueTimer = 240 + G.rng() * 120;
    m7.rescueActive = true;
    m7.rescueSpot = { x: -214, z: 542 };
    G.hud.toast('Lost hiker on the summit trail! Walk up to them — the lodge pays $250 for a rescue.');
  }
  if (m7.rescueActive && m7.rescueSpot) {
    const p = G.player.pos;
    if (Math.hypot(p.x - m7.rescueSpot.x, p.z - m7.rescueSpot.z) < 8) {
      m7.rescueActive = false;
      m7.rescues += 1;
      m7.rescueEarned += 250;
      G.cash += 250;
      G.hud.toast('Hiker rescued and walked down to the lodge! +$250 — the mountain remembers.');
      if (G.save) G.save.save(G);
    }
  }
}

export function mountainV7Summary(G) {
  const m7 = G.mountainV7;
  if (!m7) return 'The mountain is quiet.';
  return `${m7.skiRuns} ski runs · ${m7.rescues} rescues · $${m7.rescueEarned} rescue pay.`;
}
