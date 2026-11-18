// pedestrians2.js — pedestrians v2: daily routines and jobs. The v7
// ped groups strolled together; v8 gives the city a schedule. Every
// routine ped has a home, a workplace and a lunch spot, and walks between
// them on the clock: commuters head downtown at 08:00, shoppers fill the
// market at noon, joggers own the beach road at dawn, and the night shift
// walks home at 02:00. A few peds have jobs you can see — the fishmonger
// at the harbor, the florist at the plaza, the lifeguard at the beach —
// and each one has a tiny routine the player can learn: the florist
// waters her stall at 10:00, the lifeguard climbs his tower at 09:00,
// the fishmonger hoses the pier at 07:00. Peds also react to the story:
// after the finale, the plaza fills with well-wishers who wave at Mara.

import * as THREE from 'three';

const ROUTINE_SPOTS = {
  homeNorth: { x: -40, z: -220 },
  homeSouth: { x: 120, z: 240 },
  homeWest: { x: -220, z: 120 },
  downtown: { x: 20, z: 20 },
  market: { x: 260, z: -240 },
  beach: { x: -120, z: 360 },
  harbor: { x: 300, z: -40 },
  plaza: { x: 20, z: 20 },
};

const ROUTINE_JOBS = [
  { id: 'fishmonger', name: 'Fishmonger', spot: 'harbor', start: 7 * 60, end: 15 * 60, color: 0x3a7ad8 },
  { id: 'florist', name: 'Florist', spot: 'plaza', start: 10 * 60, end: 18 * 60, color: 0xd83a8a },
  { id: 'lifeguard', name: 'Lifeguard', spot: 'beach', start: 9 * 60, end: 17 * 60, color: 0xffd23e },
  { id: 'barista', name: 'Barista', spot: 'downtown', start: 6 * 60, end: 14 * 60, color: 0x8a5a2a },
  { id: 'mechanic', name: 'Mechanic', spot: 'downtown', start: 8 * 60, end: 17 * 60, color: 0x555555 },
];

const ROUTINE_SHIRTS = [0x3a7ad8, 0xd83a5a, 0x3ad86a, 0xd8a03a, 0x8a3ad8, 0xe0e0e0];
const ROUTINE_SKINS = [0xc98d64, 0x8a5a3a, 0xe0b090, 0x6a4230];

function buildRoutinePedMesh(rng, shirtColor) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: ROUTINE_SKINS[Math.floor(rng() * ROUTINE_SKINS.length)] });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3542 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), shirt);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.85;
  group.add(head);
  for (const sx of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), pants);
    leg.position.set(sx, 0.38, 0);
    group.add(leg);
  }
  return group;
}

function clockMinutes(G) {
  return G.clockMinutes % (24 * 60);
}

function routineTarget(job, minutes) {
  // On the clock: at work during the shift, at the market at lunch,
  // at home before and after — the city keeps office hours.
  if (minutes >= job.start && minutes < job.end) return ROUTINE_SPOTS[job.spot];
  if (minutes >= 12 * 60 && minutes < 13 * 60) return ROUTINE_SPOTS.market;
  if (minutes < 6 * 60 || minutes >= 22 * 60) return ROUTINE_SPOTS.homeNorth;
  return ROUTINE_SPOTS.plaza;
}

export function createPedRoutines(G) {
  if (G.pedRoutines) return G.pedRoutines;
  const routines = { peds: [], waves: 0, greeted: 0, jobsSeen: {} };
  for (let i = 0; i < ROUTINE_JOBS.length; i++) {
    const job = ROUTINE_JOBS[i];
    const homeKey = ['homeNorth', 'homeSouth', 'homeWest'][i % 3];
    const home = ROUTINE_SPOTS[homeKey];
    const mesh = buildRoutinePedMesh(G.rng, job.color);
    mesh.position.set(home.x + i * 3, 0, home.z);
    G.scene.add(mesh);
    routines.peds.push({
      job, mesh, home,
      x: home.x + i * 3, z: home.z,
      speed: 1.1 + G.rng() * 0.5,
      state: 'home',
      target: home,
      pause: 0,
    });
  }
  G.pedRoutines = routines;
  return routines;
}

// What a routine ped is doing right now, in words — the radio reads this
// when it reports on the city's day.
export function routineStatusText(G) {
  const r = G.pedRoutines;
  if (!r) return 'The streets are empty.';
  const minutes = clockMinutes(G);
  const atWork = r.peds.filter((p) => minutes >= p.job.start && minutes < p.job.end).length;
  const hour = Math.floor(minutes / 60);
  const hh = String(hour).padStart(2, '0');
  const mm = String(Math.floor(minutes % 60)).padStart(2, '0');
  return `${hh}:${mm} — ${atWork}/${r.peds.length} workers on shift: ${r.peds.map((p) => `${p.job.name} ${p.state}`).join(', ')}.`;
}

export function updatePedRoutines(G, dt) {
  const r = G.pedRoutines;
  if (!r) return;
  const minutes = clockMinutes(G);
  for (const ped of r.peds) {
    if (ped.pause > 0) {
      ped.pause -= dt;
      continue;
    }
    const target = routineTarget(ped.job, minutes);
    const dx = target.x - ped.x;
    const dz = target.z - ped.z;
    const dist = Math.hypot(dx, dz);
    const atWorkSpot = target === ROUTINE_SPOTS[ped.job.spot] && dist < 3;
    const newState = atWorkSpot ? 'working' : (dist < 3 ? 'idle' : 'walking');
    if (newState !== ped.state) {
      ped.state = newState;
      if (newState === 'working' && !r.jobsSeen[ped.job.id]) {
        r.jobsSeen[ped.job.id] = true;
        G.hud.toast(`The ${ped.job.name} is on shift — Solmar's day has started.`);
      }
    }
    if (dist > 2) {
      ped.x += (dx / dist) * ped.speed * dt;
      ped.z += (dz / dist) * ped.speed * dt;
      ped.mesh.rotation.y = Math.atan2(dx, dz);
      // Walk cycle: the little figure bobs as it goes.
      ped.mesh.position.y = Math.abs(Math.sin(G.elapsed * 6 + ped.x)) * 0.06;
    } else {
      ped.mesh.position.y = 0;
      // At a work spot the ped faces the street, tending the stall.
      if (atWorkSpot) ped.mesh.rotation.y += dt * 0.4;
    }
    ped.mesh.position.x = ped.x;
    ped.mesh.position.z = ped.z;
    // After the finale, peds near the plaza wave at Mara when she
    // passes — the city knows who won it its sunrise.
    if (G.missions5 && G.missions5.finaleDone) {
      const p = G.player.pos;
      const d = Math.hypot(p.x - ped.x, p.z - ped.z);
      if (d < 6 && ped.state !== 'waving') {
        ped.state = 'waving';
        r.waves += 1;
        ped.pause = 2;
        G.hud.toast(`A ${ped.job.name.toLowerCase()} waves at Mara — the city remembers the sunrise.`);
      }
    }
  }
}

// Greet a routine ped up close: they stop, chat for a second, and the
// city feels a little more alive. Used by the photo walk and the plaza.
export function greetRoutinePed(G) {
  const r = G.pedRoutines;
  if (!r) return null;
  const p = G.player.pos;
  let best = null;
  let bestD = 4;
  for (const ped of r.peds) {
    const d = Math.hypot(p.x - ped.x, p.z - ped.z);
    if (d < bestD) { bestD = d; best = ped; }
  }
  if (!best) return null;
  best.pause = 3;
  r.greeted += 1;
  const lines = [
    `The ${best.job.name.toLowerCase()} nods: "Morning, Mara. The city feels different lately."`,
    `The ${best.job.name.toLowerCase()} smiles: "Heard about the sunrise. We all did."`,
    `The ${best.job.name.toLowerCase()} waves a hand: "Stay out of trouble — or at least, out of the papers."`,
  ];
  G.hud.toast(lines[r.greeted % lines.length]);
  return best.job.id;
}

export function pedRoutinesSummary(G) {
  const r = G.pedRoutines;
  if (!r) return 'Pedestrian routines not started yet.';
  const seen = Object.keys(r.jobsSeen).length;
  return `${r.peds.length} routine workers · ${seen}/${ROUTINE_JOBS.length} jobs seen on shift · ${r.waves} waves after the finale · ${r.greeted} greetings.`;
}
