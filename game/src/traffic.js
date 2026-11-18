// traffic.js — ambient traffic: cars that follow the road grid, keep to their
// lane, slow for the car ahead, and turn at intersections. They use the same
// vehicle physics as the player (vehicles.js) but steer toward waypoints on
// the road network instead of keyboard input.

import { createVehicle } from './vehicles.js';
import { pick, range, rangeInt, pickWeighted } from './random.js';

// v3: weighted traffic mix — sedans everywhere, sports cars rare.
// v5: the new rides join the flow — armored vans on the bank run, the
// occasional limousine gliding to the casino.
const TRAFFIC_WEIGHTS = [['sedan', 5], ['taxi', 2], ['van', 2], ['sports', 1], ['armored', 1], ['limo', 1]];

export function spawnTraffic(G) {
  const rng = G.rng;
  for (let i = 0; i < G.config.trafficCars; i++) {
    // Heading convention: forward = (sin h, cos h), so h=0 is +z, h=PI/2 is +x.
    const alongZ = rng() < 0.5;   // travel along z on a road x = const
    const road = pick(rng, G.city.roads.xs);
    const lane = (rng() < 0.5 ? 1 : -1) * 3.4; // right-hand lane offset
    const along = range(rng, -320, 320);
    const x = alongZ ? road + lane : along;
    const z = alongZ ? along : road + lane;
    const heading = alongZ
      ? (lane > 0 ? 0 : Math.PI)               // +z or -z
      : (lane > 0 ? Math.PI / 2 : -Math.PI / 2); // +x or -x
    const v = createVehicle(G, pickWeighted(rng, TRAFFIC_WEIGHTS), x, z, heading,
      { driver: 'traffic', occupied: true });
    v.speed = range(rng, 8, 14);
    v.route = { axis: alongZ ? 'z' : 'x', dir: lane > 0 ? 1 : -1, nextTurn: range(rng, 40, 200) };
    v.cruiseSpeed = v.speed;
  }
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function updateTraffic(G, dt) {
  // During a street race the traffic gives the racers room: everyone
  // cruises 30% slower so the circuit stays readable.
  const raceSlow = (G.races && G.races.active) ? 0.7 : 1;
  // v5: rush hour — between 17:00 and 19:00 the avenues fill up: every
  // traffic car pushes 15% harder to keep its gap, so the city feels busy
  // exactly when Mara is driving home through it.
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const rushHour = mins >= 17 * 60 && mins < 19 * 60 ? 1.15 : 1;
  for (const v of G.vehicles) {
    if (v.driver !== 'traffic') continue;
    const route = v.route;
    // Drive along the current road axis; count down to the next intersection turn.
    route.nextTurn -= Math.abs(v.speed) * dt;
    if (route.nextTurn <= 0) {
      // At an intersection: pick a new direction (straight, left, right).
      const turn = pick(G.rng, [-1, 0, 0, 1]);
      const oldAxis = route.axis;
      const oldDir = route.dir;
      if (turn === 0) {
        route.nextTurn = G.config.blockSize;
      } else {
        // Snap onto the nearest crossing road and turn onto it.
        const cross = G.city.nearestRoadLine(v.pos.x, v.pos.z, oldAxis === 'x' ? 'z' : 'x');
        if (oldAxis === 'x') { v.pos.z = cross; } else { v.pos.x = cross; }
        // New heading: 90 degrees left or right from the old one.
        const targetHeading = v.heading + turn * Math.PI / 2;
        v.heading = targetHeading;
        // Derive the new route from the heading.
        const h = ((targetHeading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const near = (a, b) => Math.abs(h - a) < 0.01 || Math.abs(h - b) < 0.01;
        if (near(0, Math.PI * 2) || near(Math.PI, Math.PI)) {
          route.axis = 'z';
          route.dir = Math.abs(h) < 0.01 || Math.abs(h - Math.PI * 2) < 0.01 ? 1 : -1;
        } else {
          route.axis = 'x';
          route.dir = Math.abs(h - Math.PI / 2) < 0.01 ? 1 : -1;
        }
        route.nextTurn = G.config.blockSize;
      }
    }
    // Desired heading from the route axis.
    const desired = route.axis === 'x'
      ? (route.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (route.dir > 0 ? 0 : Math.PI);
    const diff = angleDiff(desired, v.heading);
    v.steerTarget = Math.max(-1, Math.min(1, diff * 1.6));

    // Slow down for the vehicle ahead on the same road.
    let ahead = Infinity;
    for (const other of G.vehicles) {
      if (other === v) continue;
      const dx = other.pos.x - v.pos.x, dz = other.pos.z - v.pos.z;
      const forward = Math.sin(v.heading) * dx + Math.cos(v.heading) * dz;
      const lateral = Math.abs(Math.cos(v.heading) * dx - Math.sin(v.heading) * dz);
      if (forward > 0 && forward < 16 && lateral < 3.2) ahead = Math.min(ahead, forward);
    }
    // Also stop at a red-ish rhythm: cars pause briefly at some intersections.
    const target = ahead < 16 ? Math.max(0, (ahead - 7) / 9) * v.cruiseSpeed : v.cruiseSpeed * raceSlow * rushHour;
    v.throttleTarget = v.speed < target ? 0.55 : 0;
    if (v.speed > target + 2) v.throttleTarget = -0.4;
    // v6: the fire engine's siren clears the road — traffic ahead of the
    // truck brakes hard and pulls over while Mara rolls through with the
    // lights flashing.
    if (G.busfire && G.driving === G.busfire.truck) {
      const dd = Math.hypot(v.pos.x - G.driving.pos.x, v.pos.z - G.driving.pos.z);
      if (dd < 45) v.throttleTarget = -0.8;
    }
  }
}

// v7: accidents and rush-hour waves. Once a minute the city rolls its
// dice: two traffic cars that happen to share an intersection clip each
// other, stop dead, flash their hazards and draw a little crowd of
// gawkers while the tow truck is "on its way". At rush hour the avenues
// fill up — four extra cars join the flow, the horns come out, and the
// whole grid slows to a crawl exactly when Mara is in a hurry.

const V7_ACCIDENT_SPOTS = [
  { x: 60, z: 60 }, { x: 140, z: -20 }, { x: -20, z: 60 },
  { x: 220, z: -100 }, { x: -100, z: -100 }, { x: 140, z: 140 },
];

export function createTrafficV7(G) {
  const t7 = {
    accidentTimer: 45 + G.rng() * 30,
    accidents: 0,
    wrecks: [],
    rushWaveAt: -999,
    rushCarsSpawned: 0,
    honkTimer: 0,
  };
  G.trafficV7 = t7;
  return t7;
}

function nearestTrafficPair(G) {
  const cars = G.vehicles.filter((v) => v.driver === 'traffic');
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const d = Math.hypot(cars[i].pos.x - cars[j].pos.x, cars[i].pos.z - cars[j].pos.z);
      if (d < bestD) { bestD = d; best = [cars[i], cars[j]]; }
    }
  }
  return bestD < 40 ? best : null;
}

function stageAccident(G, pair) {
  const t7 = G.trafficV7;
  const [a, b] = pair;
  a.speed = 0; b.speed = 0;
  a.cruiseSpeed = 0; b.cruiseSpeed = 0;
  a.wrecked = true; b.wrecked = true;
  a.wreckTimer = G.config.accidentClearTime || 25;
  b.wreckTimer = G.config.accidentClearTime || 25;
  t7.wrecks.push(a, b);
  t7.accidents += 1;
  G.hud.toast('Crash on the avenue! Two cars clipped each other — the road is blocked.');
  if (G.audio.crash) G.audio.crash();
  // The gawkers: two nearby pedestrians stop and stare at the wreck.
  const near = G.peds.filter((p) => Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z) < 30).slice(0, 2);
  for (const p of near) p.gawking = true;
}

export function updateTrafficV7(G, dt) {
  const t7 = G.trafficV7;
  if (!t7) return;
  // One accident roll per minute, only while Mara is driving the streets.
  t7.accidentTimer -= dt;
  if (t7.accidentTimer <= 0) {
    t7.accidentTimer = 60;
    if (G.rng() < (G.config.accidentChance || 0.06) * 10) {
      const pair = nearestTrafficPair(G);
      if (pair) stageAccident(G, pair);
    }
  }
  // Wrecks clear after the tow: the cars remember their cruise speed and
  // rejoin the flow as if nothing happened.
  for (const w of t7.wrecks) {
    if (!w.wrecked) continue;
    w.wreckTimer -= dt;
    w.speed = 0;
    if (w.wreckTimer <= 0) {
      w.wrecked = false;
      w.cruiseSpeed = 8 + G.rng() * 6;
      w.speed = 2;
      w.route.nextTurn = 40;
      G.hud.toast('Tow truck cleared the wreck — traffic is moving again.');
    }
  }
  t7.wrecks = t7.wrecks.filter((w) => w.wrecked);

  // Rush-hour waves: between 17:00 and 19:00, four extra cars join once
  // per hour and the whole grid honks when it bunches up.
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const rush = mins >= 17 * 60 && mins < 19 * 60;
  if (rush && G.elapsed - t7.rushWaveAt > 3600) {
    t7.rushWaveAt = G.elapsed;
    t7.rushCarsSpawned += 1;
    for (let i = 0; i < (G.config.rushWaveCars || 4); i++) {
      const spot = V7_ACCIDENT_SPOTS[i % V7_ACCIDENT_SPOTS.length];
      const v = createVehicle(G, 'sedan', spot.x + i * 4, spot.z, 0, { driver: 'traffic', occupied: true });
      v.speed = 8;
      v.route = { axis: 'z', dir: 1, nextTurn: 80 };
      v.cruiseSpeed = 10;
    }
    G.hud.toast('Rush hour — the avenues just filled up. Good luck getting anywhere fast.');
  }
  // A honk when traffic bunches: three or more cars within ten units.
  t7.honkTimer -= dt;
  if (t7.honkTimer <= 0) {
    t7.honkTimer = 7;
    const cars = G.vehicles.filter((v) => v.driver === 'traffic');
    for (const c of cars) {
      const bunch = cars.filter((o) => o !== c && Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z) < 10).length;
      if (bunch >= 2) {
        if (G.audio.honk) G.audio.honk();
        break;
      }
    }
  }
}

export function trafficV7Summary(G) {
  const t7 = G.trafficV7;
  if (!t7) return 'Traffic is flowing.';
  return `${t7.accidents} accidents staged · ${t7.wrecks.length} wrecks on the road · ${t7.rushCarsSpawned} rush-hour waves.`;
}
