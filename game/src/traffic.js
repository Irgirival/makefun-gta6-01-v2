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
