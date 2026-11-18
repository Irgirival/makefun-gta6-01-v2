// missions.js — the story of Mara Solano: five missions with waypoints,
// dialogue, objectives and cash rewards, plus a repeatable taxi job and
// twelve hidden cash packages scattered across Solmar City. Mission progress
// is saved; a failed mission can be retried from the end screen.

import * as THREE from 'three';
import { range } from './random.js';
import { setGoldenHour } from './daynight.js';

// Waypoint positions are fixed city landmarks so the player can learn them.
// PLAZA is the central plaza (block centre 20,20); the others sit on road
// intersections or open ground so no building can ever cover the marker.
const PLAZA = { x: 20, z: 20 };
const DOCK = { x: 300, z: -80 };
const BEACH_BAR = { x: -120, z: 360 };
const GARAGE = { x: -20, z: -100 };
const ROOFTOP = { x: 60, z: -180 };
const MUSEUM = { x: 140, z: 140 };

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Mission 1 — First Wheels',
    reward: 400,
    intro: ['MARA: "Back in Solmar. No car, no cash, no patience."',
      'VIC (phone): "Plaza, Mara. A red Vortex GT is parked by the fountain. Take it. It\'s yours now."'],
    steps: [
      { type: 'goto', target: { x: 36, z: 34 }, radius: 6, text: 'Get to the red Vortex GT by the plaza fountain', hint: 'Follow the yellow marker. Press E near the car to get in.' },
      { type: 'enter', target: { x: 36, z: 34 }, radius: 8, text: 'Get in the Vortex GT', hint: 'Press E next to the car.' },
      { type: 'drive', target: GARAGE, radius: 10, text: 'Drive the Vortex to Vic\'s garage', hint: 'WASD to drive. The yellow marker shows the way.' },
    ],
    outro: ['VIC: "She purrs. You\'re back, Mara. The city missed you."'],
  },
  {
    id: 'the-pickup',
    title: 'Mission 2 — The Pickup',
    reward: 650,
    intro: ['VIC: "A friend left a package at the harbor docks. Fetch it. Don\'t ask what\'s inside."',
      'MARA: "I never ask. That\'s why we get along."'],
    steps: [
      { type: 'goto', target: DOCK, radius: 10, text: 'Reach the harbor docks', hint: 'East side of the city, past the piers. A car helps.' },
      { type: 'collect', target: DOCK, radius: 6, text: 'Pick up the package', hint: 'Walk into the glowing package.' },
      { type: 'drive', target: GARAGE, radius: 10, text: 'Bring the package back to Vic\'s garage', hint: 'Drive carefully — the PD loves a nervous driver.' },
    ],
    outro: ['VIC: "Clean. You\'re good at this, Mara. Too good."'],
  },
  {
    id: 'harbor-run',
    title: 'Mission 3 — Harbor Run',
    reward: 900,
    intro: ['LENA: "The harbor crew is moving crates tonight. We need wheels and a lookout."',
      'MARA: "I\'m the wheels. You\'re the lookout. Let\'s go."'],
    steps: [
      { type: 'goto', target: DOCK, radius: 10, text: 'Meet Lena at the harbor', hint: 'The docks, east side.' },
      { type: 'timed', target: BEACH_BAR, radius: 12, seconds: 75, text: 'Race to the beach bar before the crew leaves', hint: '75 seconds. Drive fast, stay on the roads.' },
      { type: 'goto', target: BEACH_BAR, radius: 8, text: 'Find Lena at the beach bar', hint: 'Walk up to the bar.' },
    ],
    outro: ['LENA: "You drive like the city owes you money. It does, by the way."'],
  },
  {
    id: 'heat-rising',
    title: 'Mission 4 — Heat Rising',
    reward: 1200,
    intro: ['VIC: "The PD put a price on you. Lose the heat, then bring the van to the museum."',
      'MARA: "A price on me? Flattering. Expensive, but flattering."'],
    steps: [
      { type: 'wanted', target: MUSEUM, radius: 14, text: 'Lose the police, then reach the museum', hint: 'Break line of sight and stay hidden until the stars clear.' },
      { type: 'drive', target: MUSEUM, radius: 12, text: 'Deliver the van to the museum', hint: 'Any car will do — the van is the story.' },
    ],
    outro: ['VIC: "Heat\'s off. You\'re a ghost again, Mara."'],
  },
  {
    id: 'solmar-nights',
    title: 'Mission 5 — Solmar Nights',
    reward: 2500,
    intro: ['LENA: "One last job. The rooftop on the north side. Everything we talked about."',
      'MARA: "Then Solmar is mine. Let\'s finish this."'],
    steps: [
      { type: 'goto', target: ROOFTOP, radius: 10, text: 'Reach the north rooftop meeting point', hint: 'North side, past downtown.' },
      { type: 'timed', target: PLAZA, radius: 10, seconds: 60, text: 'Get back to the plaza before dawn breaks', hint: '60 seconds. Full speed.' },
      { type: 'goto', target: PLAZA, radius: 8, text: 'Stand in the plaza — Solmar is yours', hint: 'The city lights are all yours now.' },
    ],
    outro: ['LENA: "Solmar City, population: us."', 'MARA: "And it only gets bigger from here."'],
  },
];

export function createMissions(G) {
  const missions = {
    index: G.saveData?.missionIndex ?? 0,
    step: 0,
    active: false,
    timer: 0,
    timerTotal: 0,
    marker: null,
    taxi: { active: false, pickup: null, dropoff: null, fare: 0, passenger: false },
    packages: [],
    collectedCount: G.saveData?.packagesCollected ?? 0,
  };
  G.missions = missions;

  // Waypoint marker: a tall glowing beacon + ring on the ground.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  beacon.position.y = 30;
  beacon.visible = false;
  G.scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  ring.visible = false;
  G.scene.add(ring);
  missions.marker = { beacon, ring };

  // Hidden cash packages: glowing gold crates at seeded spots.
  const rng = G.rng;
  const spots = [];
  let guard = 0;
  while (spots.length < G.config.packageCount && guard++ < 500) {
    const x = range(rng, -320, 320);
    const z = range(rng, -320, 320);
    if (G.city.isRoad(x, z)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 60)) continue;
    spots.push({ x, z });
  }
  for (let i = 0; i < spots.length; i++) {
    const collected = (G.saveData?.packages ?? []).includes(i);
    const mesh = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
    crate.position.y = 0.9; mesh.add(crate);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe98a }));
    glow.position.y = 2.0; mesh.add(glow);
    mesh.position.set(spots[i].x, 0, spots[i].z);
    mesh.visible = !collected;
    G.scene.add(mesh);
    missions.packages.push({ ...spots[i], index: i, mesh, collected, spin: rng() * 6 });
  }
  return missions;
}

export function currentMission(G) {
  return MISSIONS[G.missions.index] ?? null;
}

export function startMission(G, index) {
  const m = G.missions;
  const def = MISSIONS[index];
  if (!def) return;
  m.index = index;
  m.step = 0;
  m.active = true;
  m.timer = 0;
  m.dwell = 0;
  G.hud.setMission(def.title, def.steps[0].text, def.steps[0].hint);
  G.hud.showDialogue(def.intro);
  G.save.save(G);
  placeMarker(G, def.steps[0].target);
  // Mission 4 starts hot: the PD is already looking for Mara.
  if (def.id === 'heat-rising') G.wanted.addHeat(45, 'mission heat');
  // v3: the Verde Heist starts warm — the casino's lookouts are already out.
  if (def.id === 'verde-heist') G.wanted.addHeat(20, 'heist heat');
  // v5: The Last Sunset starts warm too — the PD heard about the crate.
  if (def.id === 'last-sunset') G.wanted.addHeat(40, 'sunset heat');
  // v5: and it starts in golden hour — the whole mission is shot in it.
  if (def.id === 'last-sunset') setGoldenHour(G);
  if (def.steps[0].type === 'timed') { m.timer = def.steps[0].seconds; m.timerTotal = def.steps[0].seconds; }
}

export function placeMarker(G, target) {
  const mk = G.missions.marker;
  mk.beacon.position.x = target.x; mk.beacon.position.z = target.z;
  mk.ring.position.x = target.x; mk.ring.position.z = target.z;
  mk.beacon.visible = true; mk.ring.visible = true;
}

export function hideMarker(G) {
  G.missions.marker.beacon.visible = false;
  G.missions.marker.ring.visible = false;
}

function advanceStep(G) {
  const m = G.missions;
  const def = MISSIONS[m.index];
  m.step++;
  if (m.step >= def.steps.length) {
    completeMission(G);
    return;
  }
  const step = def.steps[m.step];
  G.hud.setMission(def.title, step.text, step.hint);
  placeMarker(G, step.target);
  if (step.type === 'timed') { m.timer = step.seconds; m.timerTotal = step.seconds; }
  m.dwell = 0;
  G.audio.missionSting();
}

function completeMission(G) {
  const m = G.missions;
  const def = MISSIONS[m.index];
  const reward = G.config.missionRewards[m.index] ?? def.reward;
  G.cash += reward;
  G.hud.showDialogue(def.outro);
  G.hud.toast(`Mission complete — +$${reward}`);
  G.audio.missionComplete();
  hideMarker(G);
  m.active = false;
  m.index++;
  if (m.index >= MISSIONS.length) {
    G.gameOver('story', 'You finished every mission. Solmar City is yours.');
    G.save.save(G);
    return;
  }
  G.save.save(G);
  // Next mission starts after a breath.
  m.resumeAt = G.elapsed + 4;
}

export function failMission(G, reason) {
  const m = G.missions;
  if (!m.active) return;
  m.active = false;
  m.step = 0;
  hideMarker(G);
  G.hud.setMission('Mission failed', reason, 'Press TRY AGAIN to retry the mission.');
}

export function retryMission(G) {
  startMission(G, G.missions.index);
}

export function updateMissions(G, dt) {
  const m = G.missions;
  // Resume the next mission after a completed one.
  if (!m.active && m.resumeAt && G.elapsed >= m.resumeAt) {
    m.resumeAt = 0;
    startMission(G, m.index);
  }
  // Marker spin + bob.
  if (m.marker.beacon.visible) {
    m.marker.beacon.rotation.y += dt;
    m.marker.ring.scale.setScalar(1 + Math.sin(G.elapsed * 3) * 0.12);
  }
  // Packages spin and collect.
  const ppos = G.driving ? G.driving.pos : G.player.pos;
  for (const pkg of m.packages) {
    if (pkg.collected) continue;
    pkg.spin += dt;
    pkg.mesh.rotation.y = pkg.spin;
    pkg.mesh.children[1].position.y = 2.0 + Math.sin(G.elapsed * 2 + pkg.spin) * 0.25;
    if (Math.hypot(pkg.mesh.position.x - ppos.x, pkg.mesh.position.z - ppos.z) < 3.2) {
      pkg.collected = true;
      pkg.mesh.visible = false;
      m.collectedCount++;
      G.cash += G.config.packageReward;
      G.hud.toast(`Hidden package found! +$${G.config.packageReward} (${m.collectedCount}/${G.config.packageCount})`);
      G.audio.pickup();
      G.save.save(G);
    }
  }

  // Taxi job: J toggles it; pick up the fare, then drive them to the marker.
  if (G.mode === 'playing' && G.input.pressed('taxi') && !m.taxi.active && G.missions.index >= 1) {
    startTaxi(G);
  }
  if (m.taxi.active) updateTaxi(G, dt);

  if (!m.active) return;
  const def = MISSIONS[m.index];
  const step = def.steps[m.step];
  if (!step) return;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const d = Math.hypot(step.target.x - pos.x, step.target.z - pos.z);

  if (step.type === 'timed') {
    m.timer -= dt;
    G.hud.setObjectiveHint(`Time left: ${Math.max(0, m.timer).toFixed(0)}s — ${Math.round(d)}m to go`);
    if (m.timer <= 0) {
      if (d <= step.radius) { advanceStep(G); }
      else { failMission(G, 'Out of time. The moment passed.'); G.gameOver('failed', 'Out of time — the moment passed.'); }
      return;
    }
  } else if (step.type === 'wanted') {
    if (G.wanted.stars === 0 && d <= step.radius) { advanceStep(G); return; }
    G.hud.setObjectiveHint(G.wanted.stars > 0
      ? `Lose the police first! (${G.wanted.stars}★) Then get to the marker.`
      : `${Math.round(d)}m to the marker.`);
    return;
  } else if (step.type === 'dwell') {
    // v4: hold the spot — progress builds inside the radius and stalls
    // (slowly decays) outside it. The step advances when the hold fills.
    if (d <= step.radius) {
      m.dwell = (m.dwell || 0) + dt;
      if (m.dwell >= step.seconds) { m.dwell = 0; advanceStep(G); }
      else G.hud.setObjectiveHint(`Holding… ${Math.round((m.dwell / step.seconds) * 100)}% — stay on the marker!`);
    } else {
      m.dwell = Math.max(0, (m.dwell || 0) - dt * 0.5);
      G.hud.setObjectiveHint(`${Math.round(d)}m to the marker — get there and hold it.`);
    }
    return;
  } else {
    G.hud.setObjectiveHint(`${Math.round(d)}m to the marker`);
  }

  if (d > step.radius) return;
  if (step.type === 'enter') {
    if (G.driving) advanceStep(G);
    return;
  }
  if (step.type === 'collect') {
    // The package IS the step target: a gold crate sits there.
    advanceStep(G);
    return;
  }
  advanceStep(G);
}

// A reachable fare spot: on asphalt, clear of buildings, so the marker can
// never land inside a block where no car can reach it.
function openFareSpot(G, cx, cz, spread) {
  const rng = G.rng;
  for (let i = 0; i < 60; i++) {
    const x = cx + range(rng, -spread, spread);
    const z = cz + range(rng, -spread, spread);
    if (!G.city.isRoad(x, z)) continue;
    let blocked = false;
    for (const c of G.city.colliders) {
      if (x > c.minX - 3 && x < c.maxX + 3 && z > c.minZ - 3 && z < c.maxZ + 3) { blocked = true; break; }
    }
    if (!blocked) return { x, z };
  }
  // Fallback: the nearest road centre, which is always drivable.
  return { x: G.city.nearestRoadLine(cx, cz, 'x'), z: cz };
}

function startTaxi(G) {
  const m = G.missions;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  // Pickup a few blocks away, dropoff across town — both on open road.
  const pickup = openFareSpot(G, pos.x, pos.z, 80);
  const dropoff = openFareSpot(G, range(G.rng, -300, 300), range(G.rng, -300, 300), 60);
  m.taxi = { active: true, pickup, dropoff, fare: 0, passenger: false };
  G.hud.setMission('Taxi Job', 'Pick up the fare at the marker', 'Drive there and stop — they will get in.');
  placeMarker(G, pickup);
  G.audio.missionSting();
}

function updateTaxi(G, dt) {
  const m = G.missions;
  const t = m.taxi;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const target = t.passenger ? t.dropoff : t.pickup;
  const d = Math.hypot(target.x - pos.x, target.z - pos.z);
  G.hud.setObjectiveHint(`${Math.round(d)}m to ${t.passenger ? 'the destination' : 'the fare'}`);
  if (d > 8) return;
  if (!t.passenger) {
    if (!G.driving) return;
    t.passenger = true;
    const dist = Math.hypot(t.dropoff.x - t.pickup.x, t.dropoff.z - t.pickup.z);
    t.fare = Math.round(G.config.taxiFareBase + dist * G.config.taxiFarePerUnit);
    G.hud.setMission('Taxi Job', `Drive your passenger to the marker — fare $${t.fare}`, 'Smooth driving, no PD attention.');
    placeMarker(G, t.dropoff);
    G.audio.pickup();
  } else {
    G.cash += t.fare;
    G.hud.toast(`Fare complete — +$${t.fare}`);
    G.audio.missionComplete();
    m.taxi = { active: false, pickup: null, dropoff: null, fare: 0, passenger: false };
    hideMarker(G);
    if (G.missions.active) {
      const def = MISSIONS[G.missions.index];
      const step = def.steps[G.missions.step];
      G.hud.setMission(def.title, step.text, step.hint);
      placeMarker(G, step.target);
    } else {
      G.hud.setMission('Solmar City', 'Free roam — start the next mission from the pause menu.', 'Press J for a taxi fare, or find the hidden packages.');
    }
    G.save.save(G);
  }
}

// ---- v8: mission grades and the taxi surge -----------------------------------
// The v7 replay ledger kept the fastest replay; v8 grades every story
// run. A mission finished with no damage, no wanted stars at the end and
// time to spare earns an S — the grade is written into the mission
// record, and three S grades in a row pay the "clean operator" bonus.
// The taxi job gets surge pricing too: rain, rush hour and the small
// hours all lift the fare, because Solmar's cabs charge for the weather.

export const MISSION_GRADES_V8 = ['S', 'A', 'B', 'C'];

export function gradeMissionV8(G, missionId, seconds, damageTaken, starsAtEnd) {
  if (!G.missionGrades) G.missionGrades = {};
  let grade = 'C';
  if (damageTaken === 0 && starsAtEnd === 0 && seconds < 240) grade = 'S';
  else if (damageTaken < 20 && starsAtEnd <= 1) grade = 'A';
  else if (damageTaken < 50 && starsAtEnd <= 2) grade = 'B';
  const prev = G.missionGrades[missionId];
  if (!prev || MISSION_GRADES_V8.indexOf(grade) < MISSION_GRADES_V8.indexOf(prev.grade)) {
    G.missionGrades[missionId] = { grade, seconds, at: Math.floor(G.elapsed) };
  }
  const sCount = Object.values(G.missionGrades).filter((g) => g.grade === 'S').length;
  if (sCount >= 3 && !G.missionGrades._cleanBonusPaid) {
    G.missionGrades._cleanBonusPaid = true;
    G.cash += 1000;
    G.hud.toast('CLEAN OPERATOR — three S grades. The city pays $1,000 for the quiet professional.');
  }
  return grade;
}

export function missionGradeTextV8(G, missionId) {
  const g = G.missionGrades && G.missionGrades[missionId];
  return g ? `${g.grade} (${g.seconds.toFixed(0)}s)` : 'not graded yet';
}

// Surge pricing for the taxi: rain adds 25%, rush hour 20%, the small
// hours 30% — the meter knows what time it is.
export function taxiSurgeV8(G, baseFare) {
  let mult = 1;
  const hour = Math.floor((G.clockMinutes % (24 * 60)) / 60);
  if (G.weather && (G.weather.mode === 'light' || G.weather.mode === 'heavy')) mult += 0.25;
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) mult += 0.2;
  if (hour >= 0 && hour < 5) mult += 0.3;
  return { fare: Math.round(baseFare * mult), mult };
}

export function missionsV8Summary(G) {
  const grades = G.missionGrades || {};
  const keys = Object.keys(grades).filter((k) => !k.startsWith('_'));
  const sCount = keys.filter((k) => grades[k].grade === 'S').length;
  return `${keys.length} missions graded · ${sCount} S grades · clean-operator bonus: ${grades._cleanBonusPaid ? 'paid' : 'not yet'}.`;
}
