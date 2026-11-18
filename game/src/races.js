// races.js — Solmar street racing: four checkpoint circuits (Downtown,
// Harbor, Airfield, Isla Verde), three AI rivals with rubber-banding, a
// 3-2-1-GO countdown, live positions, cash prizes, fastest times per
// circuit, and a season ladder that persists in the save. Press G at the
// next circuit in the ladder. Rivals are real traffic-driven cars whose
// throttle and steering targets this module sets each frame, so they obey
// the same arcade physics, wall collisions and car-vs-car bumps as Mara.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';
import { placeMarker, hideMarker } from './missions.js';

// Each circuit is a loop of checkpoints on road intersections. Two laps.
// Road centrelines run at -340 + 80k (…, -180, -100, -20, 60, 140, 220,
// 300) — checkpoints MUST sit on them, or cars spear into buildings.
export const RACE_CIRCUITS = [
  {
    id: 'downtown',
    name: 'Downtown Loop',
    laps: 2,
    prize: [1500, 800, 400, 200],
    points: [
      { x: 60, z: 60 }, { x: 140, z: 60 }, { x: 140, z: -20 }, { x: 140, z: -100 },
      { x: 60, z: -100 }, { x: -20, z: -100 }, { x: -100, z: -100 }, { x: -100, z: -20 },
      { x: -100, z: 60 }, { x: -20, z: 60 },
    ],
  },
  {
    id: 'harbor',
    name: 'Harbor Sprint',
    laps: 2,
    prize: [1800, 900, 450, 250],
    points: [
      { x: 220, z: 60 }, { x: 300, z: 60 }, { x: 300, z: -20 }, { x: 220, z: -20 },
      { x: 220, z: -100 }, { x: 300, z: -100 }, { x: 300, z: -180 }, { x: 220, z: -180 },
    ],
  },
  {
    id: 'airfield',
    name: 'Airfield GP',
    laps: 2,
    prize: [2200, 1100, 550, 300],
    points: [
      { x: -260, z: -180 }, { x: -340, z: -180 }, { x: -340, z: -260 },
      { x: -260, z: -260 }, { x: -180, z: -260 }, { x: -180, z: -180 },
    ],
  },
  {
    id: 'verde',
    name: 'Isla Verde GP',
    laps: 2,
    prize: [2500, 1200, 600, 300],
    // Out-and-back with a loop on the island: west along 60th, north up
    // 100th, down the causeway (x -160), a lap of the island streets and
    // sand, then back up the causeway and home. Every leg follows a road,
    // the causeway or open sand — no buildings, no boardwalk shops, no
    // hotel. The lighthouse watches the whole thing.
    points: [
      { x: -100, z: 60 }, { x: -100, z: 300 }, { x: -160, z: 300 }, { x: -160, z: 450 },
      { x: -160, z: 540 }, { x: -230, z: 540 }, { x: -230, z: 600 }, { x: -110, z: 600 },
      { x: -110, z: 540 }, { x: -160, z: 540 }, { x: -160, z: 300 }, { x: -100, z: 300 },
    ],
  },
  // v5: two more circuits. Uptown is a fast northern rectangle past the
  // museum and the airfield fence; Midnight Beach runs the beachfront road
  // under the streetlights, headlights on, with a 1.5x purse.
  {
    id: 'uptown',
    name: 'Uptown Loop',
    laps: 2,
    prize: [2000, 1000, 500, 250],
    points: [
      { x: -20, z: -180 }, { x: 60, z: -180 }, { x: 140, z: -180 }, { x: 140, z: -260 },
      { x: 60, z: -260 }, { x: -20, z: -260 }, { x: -100, z: -260 }, { x: -100, z: -180 },
    ],
  },
  {
    id: 'midnight-beach',
    name: 'Midnight Beach Run',
    laps: 2,
    night: true,
    prize: [3600, 1800, 900, 450],
    points: [
      { x: 60, z: 300 }, { x: 140, z: 300 }, { x: 220, z: 300 }, { x: 220, z: 220 },
      { x: 140, z: 220 }, { x: 60, z: 220 },
    ],
  },
  // v6: two more circuits. Old Town GP threads the historic quarter's
  // narrow streets past the cathedral and the market; the Summit Run
  // crosses the causeway and climbs the island to the ski lodge.
  {
    id: 'oldtown',
    name: 'Old Town GP',
    laps: 2,
    prize: [2600, 1300, 650, 300],
    points: [
      { x: 220, z: -180 }, { x: 300, z: -180 }, { x: 300, z: -260 }, { x: 220, z: -260 },
      { x: 220, z: -100 }, { x: 300, z: -100 }, { x: 300, z: -180 }, { x: 220, z: -180 },
    ],
  },
  {
    id: 'summit',
    name: 'Summit Run',
    laps: 2,
    prize: [3200, 1600, 800, 400],
    points: [
      { x: -160, z: 420 }, { x: -160, z: 505 }, { x: -230, z: 505 }, { x: -230, z: 555 },
      { x: -110, z: 555 }, { x: -110, z: 505 }, { x: -160, z: 505 }, { x: -160, z: 420 },
    ],
  },
];

export const RACE_START = { x: 20, z: 60 };

const RIVAL_NAMES = ['Rico "Redline" Vega', 'Tasha Cole', 'Benny "Bumper" Ortiz'];
const RIVAL_TYPES = ['sports', 'sedan', 'sports'];
const RIVAL_COLORS = [0x1a6ad8, 0xd8a03a, 0x3a8a4a];
const RIVAL_SKILL = [0.97, 0.93, 0.88]; // base pace as a share of the player's car

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function raceProgress(r) {
  // One number for ranking: laps completed, then checkpoints, then closeness.
  return r.lap * 1000 + r.cp * 100 - r.distToNext;
}

export function createRaces(G) {
  const races = {
    active: false,
    countdown: 0,
    circuit: null,
    circuitIndex: 0,
    lap: 1,
    cp: 0,
    rivals: [],
    player: { lap: 1, cp: 0, distToNext: 0, finished: false, finishTime: 0 },
    raceTime: 0,
    finishedCount: 0,
    results: [],
    ladder: { wins: 0, podiums: 0, races: 0, best: null, bestTimes: {}, nightWins: 0 },
    startBanner: null,
    savedClock: null, // v5: a night race borrows the midnight sky, then gives it back
  };
  // A chequered start banner over the plaza start line, built from boxes.
  const banner = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  for (const sx of [-7, 7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6), mat(0x2a2a2a));
    post.position.set(sx, 2.6, 0);
    banner.add(post);
  }
  for (let i = 0; i < 8; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.9, 0.1),
      mat(i % 2 === 0 ? 0x111111 : 0xffffff));
    tile.position.set(-6.1 + i * 1.75, 4.6, 0);
    banner.add(tile);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 0.15),
    new THREE.MeshLambertMaterial({ color: 0xd81a2a, emissive: 0x440000 }));
  board.position.set(0, 3.4, 0);
  banner.add(board);
  banner.position.set(RACE_START.x, 0, RACE_START.z);
  banner.rotation.y = Math.PI / 2;
  G.scene.add(banner);
  races.startBanner = banner;
  G.races = races;
  return races;
}

export function raceLadderText(G) {
  const l = G.races.ladder;
  const bests = Object.entries(l.bestTimes || {})
    .map(([id, t]) => `${RACE_CIRCUITS.find((c) => c.id === id)?.name || id}: ${t.toFixed(1)}s`)
    .join(' · ');
  return `Street racing — ${l.wins} wins · ${l.podiums} podiums · ${l.races} races` +
    (l.nightWins ? ` · ${l.nightWins} night wins` : '') +
    (l.best ? ` · best ${l.best}` : '') +
    (bests ? ` · fastest laps — ${bests}` : '');
}

// v5: a night circuit runs under the real night sky — the clock jumps to
// 22:30 for the race and comes back when the chequered flag falls, so the
// day/night cycle, the headlights and the streetlights all play along.
export function applyNightRace(G, on) {
  const r = G.races;
  if (on) {
    if (r.savedClock === null) r.savedClock = G.clockMinutes;
    G.clockMinutes = 22.5 * 60;
  } else if (r.savedClock !== null) {
    G.clockMinutes = r.savedClock;
    r.savedClock = null;
  }
}

export function recordBestTime(G) {
  // The player's finish time becomes the circuit's best when it beats the
  // stored one; the ladder (and the save) keep it forever.
  const r = G.races;
  if (!r.player.finished) return null;
  const id = r.circuit.id;
  const prev = r.ladder.bestTimes[id];
  if (prev === undefined || r.player.finishTime < prev) {
    r.ladder.bestTimes[id] = r.player.finishTime;
    return { id, time: r.player.finishTime, beaten: prev !== undefined, prev };
  }
  return { id, time: r.player.finishTime, beaten: false, prev };
}

function nextCheckpoint(G) {
  const r = G.races;
  const pts = r.circuit.points;
  const idx = r.player.cp % pts.length;
  placeMarker(G, pts[idx]);
}

function spawnRivals(G) {
  const r = G.races;
  const car = G.driving;
  // Line up behind the player, staggered, facing the first checkpoint.
  const first = r.circuit.points[0];
  const heading = Math.atan2(first.x - car.pos.x, first.z - car.pos.z);
  for (let i = 0; i < 3; i++) {
    const back = 8 + i * 7;
    const side = (i % 2 === 0 ? -3.4 : 3.4);
    const x = car.pos.x - Math.sin(heading) * back + Math.cos(heading) * side;
    const z = car.pos.z - Math.cos(heading) * back - Math.sin(heading) * side;
    const v = createVehicle(G, RIVAL_TYPES[i], x, z, heading, {
      driver: 'race', occupied: true, color: RIVAL_COLORS[i],
    });
    v.throttleTarget = 0;
    v.steerTarget = 0;
    v.cruiseSpeed = 20;
    r.rivals.push({
      name: RIVAL_NAMES[i], car: v, lap: 1, cp: 0, distToNext: 0,
      skill: RIVAL_SKILL[i], finished: false, finishTime: 0, wobble: i * 1.7,
    });
  }
}

export function startRace(G) {
  const r = G.races;
  if (r.active) return false;
  if (!G.driving) { G.hud.toast('Get in a car first — races are won on four wheels.'); return false; }
  const d = Math.hypot(G.driving.pos.x - RACE_START.x, G.driving.pos.z - RACE_START.z);
  if (d > 16) { G.hud.toast('Drive to the chequered start banner at the plaza (G to race).'); return false; }
  r.circuit = RACE_CIRCUITS[r.circuitIndex % RACE_CIRCUITS.length];
  r.circuitIndex++;
  r.active = true;
  r.countdown = 3.4;
  r.lap = 1;
  r.cp = 0;
  r.raceTime = 0;
  r.finishedCount = 0;
  r.results = [];
  r.rivals = [];
  r.player = { lap: 1, cp: 0, distToNext: 0, finished: false, finishTime: 0 };
  spawnRivals(G);
  nextCheckpoint(G);
  // v5: a night circuit borrows the midnight sky for the whole race.
  if (r.circuit.night) {
    applyNightRace(G, true);
    G.hud.toast('Night race — headlights on, the beachfront is yours.');
  }
  G.hud.showDialogue([
    `RACE — ${r.circuit.name} (${r.circuit.laps} laps)`,
    'Beat Rico, Tasha and Benny to the line. First place pays $' + r.circuit.prize[0] + '.',
    'Follow the gold marker. 3… 2… 1… GO!',
  ]);
  G.audio.missionSting();
  return true;
}

function finishRacer(G, who, name) {
  const r = G.races;
  who.finished = true;
  who.finishTime = r.raceTime;
  r.finishedCount++;
  r.results.push(name);
}

function endRace(G) {
  const r = G.races;
  r.active = false;
  hideMarker(G);
  // Rank everyone by finish order, then by progress.
  const standings = [];
  const entries = [{ name: 'Mara Solano', prog: raceProgress(r.player), fin: r.player.finishTime, me: true }];
  for (const rv of r.rivals) {
    entries.push({ name: rv.name, prog: raceProgress(rv), fin: rv.finishTime, me: false });
  }
  entries.sort((a, b) => {
    if (a.fin && b.fin) return a.fin - b.fin;
    if (a.fin) return -1;
    if (b.fin) return 1;
    return b.prog - a.prog;
  });
  const myPlace = entries.findIndex((e) => e.me) + 1;
  // v5: a night race pays half again as much — the purse matches the risk.
  const nightMult = r.circuit.night ? (G.config.nightRacePrizeMult || 1.5) : 1;
  const prize = Math.round((r.circuit.prize[myPlace - 1] || 0) * nightMult);
  G.cash += prize;
  r.ladder.races++;
  if (myPlace === 1) { r.ladder.wins++; r.ladder.best = r.circuit.name; }
  if (myPlace === 1 && r.circuit.night) r.ladder.nightWins++;
  if (myPlace <= 3) r.ladder.podiums++;
  // v5: the borrowed midnight goes back, whatever the result.
  applyNightRace(G, false);
  const best = recordBestTime(G);
  const bestLine = best
    ? (best.prev === undefined
      ? `First recorded time on ${r.circuit.name}: ${best.time.toFixed(1)}s — the time to beat.`
      : best.beaten
        ? `New best time on ${r.circuit.name}: ${best.time.toFixed(1)}s (was ${best.prev.toFixed(1)}s)!`
        : `Your time: ${best.time.toFixed(1)}s — the circuit best stands.`)
    : '';
  const board = entries.map((e, i) => `${i + 1}. ${e.name}${e.me ? ' (you)' : ''}`).join('  ');
  G.hud.showDialogue([
    `RACE OVER — ${r.circuit.name}: you finished ${myPlace}${myPlace === 1 ? 'st' : myPlace === 2 ? 'nd' : myPlace === 3 ? 'rd' : 'th'}!`,
    board,
    prize > 0 ? `Prize: $${prize}. ${raceLadderText(G)}` : 'No prize this time. The ladder remembers — come back faster.',
    ...(bestLine ? [bestLine] : []),
  ]);
  G.audio.missionComplete();
  // Rivals cruise on and fade out of the race: park them where they are.
  for (const rv of r.rivals) {
    rv.car.driver = null;
    rv.car.throttleTarget = 0;
    rv.car.parked = true;
  }
  r.rivals = [];
  G.save.save(G);
}

function driveRival(G, rv, dt) {
  // Steer the rival toward its next checkpoint, with a little human wobble
  // and rubber-banding: rivals behind the player push harder, rivals ahead
  // ease off, so every race stays close to the wire.
  const r = G.races;
  const pts = r.circuit.points;
  const target = pts[rv.cp % pts.length];
  const v = rv.car;
  const dx = target.x - v.pos.x;
  const dz = target.z - v.pos.z;
  const dist = Math.hypot(dx, dz);
  rv.distToNext = dist;
  if (dist < 13) {
    rv.cp++;
    if (rv.cp >= pts.length) { rv.cp = 0; rv.lap++; }
    if (rv.lap > r.circuit.laps && !rv.finished) finishRacer(G, rv, rv.name);
    return;
  }
  const want = Math.atan2(dx, dz) + Math.sin(G.elapsed * 0.7 + rv.wobble) * 0.06;
  const err = wrapAngle(want - v.heading);
  v.steerTarget = Math.max(-1, Math.min(1, err * 1.6));
  // Rubber-band: up to +/-18% pace around the rival's skill.
  const myProg = raceProgress(r.player);
  const gap = myProg - raceProgress(rv);
  const band = Math.max(-0.18, Math.min(0.18, gap * 0.0009));
  const pace = rv.skill + band;
  const top = v.spec.topSpeed * pace;
  const wantSpeed = Math.min(top, dist < 26 ? top * 0.55 : top);
  v.throttleTarget = v.speed < wantSpeed ? 1 : 0;
  // Slow for sharp turns so rivals do not spear into buildings.
  if (Math.abs(err) > 0.9 && v.speed > 14) v.throttleTarget = 0;
}

export function updateRaces(G, dt) {
  const r = G.races;
  if (!r) return;
  // Press G near the start banner to race (only while a story mission is
  // not hogging the HUD — races are free-roam fun, not story).
  if (G.mode === 'playing' && G.input.pressed('race') && !r.active) {
    startRace(G);
    return;
  }
  if (!r.active) return;
  if (r.countdown > 0) {
    r.countdown -= dt;
    // Hold everyone on the line until GO.
    if (G.driving) G.driving.speed = 0;
    for (const rv of r.rivals) { rv.car.throttleTarget = 0; rv.car.speed = 0; }
    if (r.countdown <= 0) {
      G.hud.toast('GO! Follow the gold marker — 2 laps!');
      G.audio.missionSting();
    }
    return;
  }
  r.raceTime += dt;
  const car = G.driving;
  if (!car) {
    // Mara bailed out mid-race: the race is over, rivals keep the purse.
    G.hud.toast('You left the car — race abandoned.');
    r.active = false;
    applyNightRace(G, false);
    hideMarker(G);
    for (const rv of r.rivals) { rv.car.driver = null; rv.car.parked = true; }
    r.rivals = [];
    return;
  }
  // Player checkpoint progress.
  const pts = r.circuit.points;
  const target = pts[r.player.cp % pts.length];
  const d = Math.hypot(target.x - car.pos.x, target.z - car.pos.z);
  r.player.distToNext = d;
  if (d < 13) {
    r.player.cp++;
    if (r.player.cp >= pts.length) { r.player.cp = 0; r.player.lap++; }
    if (r.player.lap > r.circuit.laps && !r.player.finished) {
      finishRacer(G, r.player, 'Mara Solano');
      G.hud.toast(`Finished! Waiting on the rivals… (${r.finishedCount}/4 across the line)`);
    } else {
      nextCheckpoint(G);
      G.audio.pickup();
    }
  }
  r.player.lap = Math.min(r.player.lap, r.circuit.laps + 1);
  for (const rv of r.rivals) {
    if (!rv.finished) driveRival(G, rv, dt);
    else { rv.car.throttleTarget = 0; }
  }
  // Live positions in the objective hint.
  const standings = [
    { name: 'Mara', prog: raceProgress(r.player) },
    ...r.rivals.map((rv) => ({ name: rv.name.split(' ')[0], prog: raceProgress(rv) })),
  ].sort((a, b) => b.prog - a.prog);
  const myPos = standings.findIndex((s) => s.name === 'Mara') + 1;
  const lapShow = Math.min(r.player.lap, r.circuit.laps);
  G.hud.setObjectiveHint(
    `${r.circuit.name} — Lap ${lapShow}/${r.circuit.laps} · ${myPos}${myPos === 1 ? 'st' : myPos === 2 ? 'nd' : myPos === 3 ? 'rd' : 'th'} · ` +
    `${standings.map((s) => s.name).join(' > ')} · ${r.raceTime.toFixed(1)}s`);
  // The race ends when everyone has finished, or 20 s after Mara finishes.
  if (r.finishedCount >= 4) endRace(G);
  else if (r.player.finished && r.raceTime - r.player.finishTime > 20) endRace(G);
  // Safety valve: a race that drags past 6 minutes is called off.
  if (r.raceTime > 360) {
    G.hud.toast('Race called off — time limit. The ladder still counts it.');
    endRace(G);
  }
}

// v7: race season 2 — a second championship with its own circuits,
// its own points table and its own rivals. The Mountain Pass is a
// climb from the island bridge to the ski lodge; the Night Market Dash
// threads the Old Town lanes after dark. Season 2 runs four rounds:
// win the season and the Verde GP trophy case gets a second cup, and
// Mara gets $8,000 and a rival who finally admits she is faster.

export const RACE_SEASON2_CIRCUITS = [
  {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    laps: 2,
    prize: [2200, 1100, 550, 300],
    points: [
      { x: -160, z: 420 }, { x: -160, z: 505 }, { x: -160, z: 540 },
      { x: -196, z: 500 }, { x: -214, z: 542 }, { x: -160, z: 505 },
    ],
  },
  {
    id: 'night-market',
    name: 'Night Market Dash',
    laps: 2,
    prize: [2000, 1000, 500, 250],
    points: [
      { x: 220, z: -180 }, { x: 220, z: -100 }, { x: 220, z: -20 },
      { x: 140, z: -20 }, { x: 140, z: -100 }, { x: 220, z: -100 },
    ],
  },
];

const SEASON2_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function createRaceSeason2(G) {
  const s2 = {
    points: 0,
    rounds: 0,
    wins: 0,
    champion: false,
    rivals: [
      { name: 'Rosa', points: 0 },
      { name: 'Vic', points: 0 },
      { name: 'Lena', points: 0 },
    ],
    circuitIndex: 0,
  };
  G.season2 = s2;
  return s2;
}

// v7: score a season-2 round — Mara's points, the rivals' points, and
// the championship call after four rounds.
export function recordSeason2Round(G, position) {
  const s2 = G.season2;
  if (!s2) return;
  const table = G.config.season2Points || SEASON2_POINTS;
  s2.points += table[position - 1] || 0;
  s2.rounds += 1;
  if (position === 1) s2.wins += 1;
  // The rivals score behind her: the table is seeded, so the season is
  // the same every run for the same seed.
  const rng = G.rng;
  for (const rival of s2.rivals) {
    const rp = 1 + Math.floor(rng() * 4);
    rival.points += table[rp - 1] || 0;
  }
  s2.circuitIndex = (s2.circuitIndex + 1) % RACE_SEASON2_CIRCUITS.length;
  G.hud.toast(`Season 2 round ${s2.rounds} done — P${position}, ${s2.points} points. ${4 - s2.rounds} rounds to go.`);
  if (s2.rounds >= (G.config.season2Rounds || 4)) {
    const best = s2.rivals.reduce((a, b) => (a.points > b.points ? a : b));
    if (s2.points >= best.points) {
      s2.champion = true;
      G.cash += G.config.season2ChampionPrize || 8000;
      G.hud.toast(`SEASON 2 CHAMPION! Mara takes the cup and $${G.config.season2ChampionPrize || 8000}!`);
    } else {
      G.hud.toast(`Season 2 goes to ${best.name} with ${best.points} points — Mara had ${s2.points}. Next season, then.`);
    }
    s2.rounds = 0;
    s2.points = 0;
    for (const rival of s2.rivals) rival.points = 0;
  }
}

export function season2Standings(G) {
  const s2 = G.season2;
  if (!s2) return 'Season 2 has not started.';
  const rows = [{ name: 'Mara', points: s2.points }, ...s2.rivals]
    .sort((a, b) => b.points - a.points);
  return rows.map((r, i) => `${i + 1}. ${r.name} ${r.points}pts`).join(' · ');
}

export function raceSeason2Summary(G) {
  const s2 = G.season2;
  if (!s2) return 'Season 2 is not on the calendar.';
  return `${s2.wins} season-2 wins · ${s2.rounds}/4 rounds · champion: ${s2.champion ? 'YES' : 'not yet'}.`;
}
