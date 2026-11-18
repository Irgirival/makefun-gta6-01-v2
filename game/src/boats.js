// boats.js — Solmar's water: stealable, drivable boats at the harbor and
// the Isla Verde marina. Press E near a moored boat to climb aboard; WASD
// steers with a slow, heavy boat feel, the hull bobs on the swell and a
// foam wake trails behind at speed. Press E again to hop off at the shore.
// Boats live outside the car list: they have their own physics, camera and
// collision (they bounce off the harbor walls and the island shore).

import * as THREE from 'three';

const BOAT_SPOTS = [
  { x: 352, z: -60, heading: Math.PI / 2, name: 'Harbor Runner' },
  { x: 352, z: 40, heading: Math.PI / 2, name: 'Bay Cruiser' },
  { x: 352, z: 140, heading: -Math.PI / 2, name: 'Dock Skipper' },
  { x: -129, z: 571, heading: 0, name: 'Marina Star' },
  { x: -101, z: 571, heading: 0, name: 'Verde Voyager' },
  // v5: the Verde Comet — a low, fast speedboat with a bigger motor, the
  // quickest way across the bay when the causeway is crawling.
  { x: -88, z: 571, heading: 0, name: 'Verde Comet', fast: true },
];

// Two tour rings: the harbor ring (orange buoys, $500) and the marina ring
// in the bay south of Isla Verde (gold buoys, $750). Sail each ring's five
// buoys in order while aboard a boat and the harbor master pays. Repeatable.
const TOUR_BUOYS = [
  { x: 352, z: -120 },
  { x: 390, z: -40 },
  { x: 390, z: 80 },
  { x: 352, z: 180 },
  { x: 330, z: 40 },
];
const MARINA_BUOYS = [
  { x: -240, z: 620 },
  { x: -80, z: 620 },
  { x: -80, z: 690 },
  { x: -240, z: 690 },
  { x: -160, z: 660 },
];
const TOUR_PRIZE = 500;
const MARINA_PRIZE = 750;

const BOAT_TOP_SPEED = 26;
const BOAT_ACCEL = 12;
const BOAT_TURN = 0.9;

function buildBoatMesh(color) {
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 6.4), mat(color));
  hull.position.y = 0.6;
  group.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), mat(color));
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.6, 4.2);
  bow.scale.set(1, 1, 0.6);
  group.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 4.6), mat(0xe8e0c8));
  deck.position.y = 1.15;
  group.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.2), mat(0x1a2a3a));
  cabin.position.set(0, 1.8, -0.6);
  group.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.15),
    new THREE.MeshLambertMaterial({ color: 0x9fd8e8, emissive: 0x224455 }));
  windshield.position.set(0, 1.9, 0.55);
  windshield.rotation.x = -0.3;
  group.add(windshield);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 6.2), mat(0x8a8a8a));
  rail.position.y = 1.35;
  group.add(rail);
  for (const sx of [-0.9, 0.9]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 }));
    light.position.set(sx, 1.3, 3.1);
    group.add(light);
  }
  group.userData.wake = [];
  return group;
}

export function createBoats(G) {
  const boats = {
    list: [], boarded: null, wakeTimer: 0,
    tour: { next: 0, done: 0, earned: 0, cooldown: 0 },
    marina: { next: 0, done: 0, earned: 0, cooldown: 0 },
  };
  const colors = [0xd81a2a, 0x1a6ad8, 0xf0f0f0, 0xd8a03a, 0x2a7a3a];
  BOAT_SPOTS.forEach((spot, i) => {
    const mesh = buildBoatMesh(colors[i % colors.length]);
    mesh.position.set(spot.x, 0.3, spot.z);
    mesh.rotation.y = spot.heading;
    G.scene.add(mesh);
    boats.list.push({
      name: spot.name,
      mesh,
      pos: new THREE.Vector3(spot.x, 0, spot.z),
      heading: spot.heading,
      speed: 0,
      steer: 0,
      bobPhase: i * 1.3,
      wake: [],
      // v5: the Comet's bigger motor — 34 knots where the others do 26.
      topSpeed: spot.fast ? 34 : BOAT_TOP_SPEED,
      fast: !!spot.fast,
    });
  });
  // v6: the Old Town ferry — a fat double-decker that runs the harbor loop
  // on its own clock, harbor docks to the Isla Verde marina and back. Board
  // it like any boat; it sails itself while Mara rides the deck.
  const ferryGroup = new THREE.Group();
  const ferryMat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 14), ferryMat(0x1a3a5a));
  hull.position.y = 1;
  ferryGroup.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.6, 14.6), ferryMat(0xf0f0f0));
  deck.position.y = 2.2;
  ferryGroup.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 8), ferryMat(0xe8dcc0));
  cabin.position.set(0, 3.6, -1);
  ferryGroup.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 8.4), ferryMat(0x2a6a4a));
  roof.position.set(0, 5, -1);
  ferryGroup.add(roof);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.6, 10), ferryMat(0xd8a03a));
  funnel.position.set(0, 5.6, 3.5);
  ferryGroup.add(funnel);
  for (const wx of [-2.6, 2.6]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 6.5),
      new THREE.MeshLambertMaterial({ color: 0x9fd0e8, emissive: 0x223344 }));
    win.position.set(wx, 3.6, -1);
    ferryGroup.add(win);
  }
  ferryGroup.position.set(320, 0.3, 470);
  G.scene.add(ferryGroup);
  boats.list.push({
    name: 'Old Town Ferry',
    mesh: ferryGroup,
    pos: new THREE.Vector3(320, 0, 470),
    heading: Math.PI,
    speed: 0,
    steer: 0,
    bobPhase: 2.1,
    wake: [],
    topSpeed: 8,
    fast: false,
    ferry: true,
    route: [{ x: 320, z: 470 }, { x: -115, z: 580 }],
    routeIndex: 1,
  });
  // Two tour rings, one builder: colored spheres on striped posts, bobbing.
  boats.tour.buoys = buildBuoyRing(G, TOUR_BUOYS, 0xff5a2a);
  boats.marina.buoys = buildBuoyRing(G, MARINA_BUOYS, 0xffd23e);
  G.boats = boats;
  return boats;
}

function buildBuoyRing(G, spots, color) {
  // One ring of tour buoys: a ball on a post with a floating ring, bobbing
  // on the swell. Returns the buoy records with their scene groups.
  return spots.map((spot, i) => {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    post.position.y = 1.3;
    group.add(post);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8),
      new THREE.MeshLambertMaterial({ color, emissive: 0x442200 }));
    ball.position.y = 2.9;
    group.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 6, 12),
      new THREE.MeshLambertMaterial({ color: 0xffd23e }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    group.add(ring);
    group.position.set(spot.x, 0, spot.z);
    G.scene.add(group);
    return { ...spot, group, ball, index: i };
  });
}

export function nearestBoat(G) {
  const p = G.player.pos;
  let best = null, bd = 5;
  for (const b of G.boats.list) {
    const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export function enterBoat(G, boat) {
  G.boats.boarded = boat;
  G.boating = boat;
  G.player.group.visible = false;
  // Taking a boat that is not yours is still a crime in Solmar.
  G.wanted.addHeat(G.config.heatPerCrime.boat || 18, 'boat theft');
  G.hud.toast(`Aboard the ${boat.name} — WASD to sail, E to hop off at the shore.`);
  G.audio.doorSlam();
  G.audio.engineStart();
}

export function exitBoat(G) {
  const boat = G.boats.boarded;
  if (!boat) return;
  // Step off onto the nearest dry side: the shore is whichever way the
  // water is not. Boats sit in water; the player lands beside the hull.
  const side = Math.abs(boat.pos.x) > Math.abs(boat.pos.z) ? { x: -4, z: 0 } : { x: 0, z: -4 };
  G.player.pos.set(boat.pos.x + side.x, 0, boat.pos.z + side.z);
  G.player.group.position.copy(G.player.pos);
  G.player.group.visible = true;
  boat.speed = 0;
  G.boats.boarded = null;
  G.boating = null;
  G.hud.toast(`Off the ${boat.name}. Dry land, solid ground.`);
}

function dropWake(G, boat, dt) {
  // A fading foam quad behind the stern while the boat is moving.
  boat.wakeTimer = (boat.wakeTimer || 0) - dt;
  if (boat.wakeTimer > 0 || Math.abs(boat.speed) < 6) return;
  boat.wakeTimer = 0.12;
  const w = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  w.rotation.x = -Math.PI / 2;
  w.position.set(
    boat.pos.x - Math.sin(boat.heading) * 3.4,
    0.35,
    boat.pos.z - Math.cos(boat.heading) * 3.4);
  G.scene.add(w);
  boat.wake.push({ mesh: w, life: 1.6 });
}

function updateWake(G, boat, dt) {
  for (let i = boat.wake.length - 1; i >= 0; i--) {
    const w = boat.wake[i];
    w.life -= dt;
    w.mesh.material.opacity = Math.max(0, w.life / 1.6) * 0.5;
    w.mesh.scale.setScalar(1 + (1.6 - w.life) * 0.8);
    if (w.life <= 0) {
      G.scene.remove(w.mesh);
      w.mesh.material.dispose();
      boat.wake.splice(i, 1);
    }
  }
}

function clampToWater(G, boat) {
  // Keep boats in the water: east harbor channel, south sea, island bay.
  // If a boat noses onto land, push it back and scrub its speed.
  const p = boat.pos;
  const inHarbor = p.x > 322 && p.x < 430;
  const inSea = p.z > 400 && p.z < 700;
  const inBay = p.x > -260 && p.x < -60 && p.z > 440 && p.z < 660;
  const inChannel = p.x > 300 && p.z > 300 && p.z < 430;
  if (inHarbor || inSea || inBay || inChannel) return;
  // Nearest water wins: shove the boat back toward the channel it left.
  if (p.z >= 300) { p.z = 420; boat.speed *= -0.2; }
  else if (p.x >= 300) { p.x = 340; boat.speed *= -0.2; }
  else { p.z = Math.min(p.z, 400); p.x = Math.max(p.x, 330); boat.speed *= 0.2; }
  G.audio.crash();
}

function updateTourRing(G, boat, ring, label, prize, dt) {
  // Sail the ring's buoys in order: 1 → 5. Each ring keeps its own
  // progress, payout and reset timer.
  if (ring.cooldown > 0) {
    ring.cooldown -= dt;
    if (ring.cooldown <= 0) {
      ring.next = 0;
      G.hud.toast(`The ${label} buoys are set again — sail the ring for $${prize}.`);
    }
    return;
  }
  const buoy = ring.buoys[ring.next];
  if (!buoy) return;
  const d = Math.hypot(buoy.x - boat.pos.x, buoy.z - boat.pos.z);
  if (d < 7) {
    ring.next++;
    G.audio.pickup();
    if (ring.next >= ring.buoys.length) {
      ring.done++;
      ring.earned += prize;
      G.cash += prize;
      ring.cooldown = 30;
      G.hud.showDialogue([
        `${label.toUpperCase()} COMPLETE — all five buoys, one clean ring!`,
        `The harbor master pays $${prize}. ${label} tours completed: ${ring.done} ($${ring.earned} total).`,
        'The buoys reset in 30 seconds — the ring is there whenever you want it.',
      ]);
      G.audio.missionComplete();
      G.save.save(G);
    } else {
      G.hud.toast(`${label} buoy ${ring.next}/${ring.buoys.length} — next one is marked on the minimap.`);
    }
  }
}

function updateTour(G, boat, dt) {
  updateTourRing(G, boat, G.boats.tour, 'Harbor tour', TOUR_PRIZE, dt);
  updateTourRing(G, boat, G.boats.marina, 'Marina tour', MARINA_PRIZE, dt);
}

export function updateBoats(G, dt) {
  const boats = G.boats;
  if (!boats) return;
  // Both rings' buoys bob on the swell even when nobody is sailing.
  for (const ring of [boats.tour, boats.marina]) {
    for (const buoy of ring.buoys) {
      buoy.group.position.y = Math.sin(G.elapsed * 1.3 + buoy.index * 1.1) * 0.15;
      buoy.ball.rotation.y += dt * 0.8;
    }
  }
  // Boarding prompt when on foot near a moored boat.
  if (!G.boating && !G.driving && !G.shot) {
    const near = nearestBoat(G);
    if (near) G.hud.setInteract(`<b>E</b> — board the ${near.name}`);
  }
  for (const b of boats.list) {
    // v6: the ferry sails its own loop — harbor docks to the marina and
    // back, whether Mara is aboard or not. Riding it is free; hopping off
    // at the marina saves the whole causeway drive.
    if (b.ferry) {
      const target = b.route[b.routeIndex % b.route.length];
      const dx = target.x - b.pos.x, dz = target.z - b.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 12) {
        b.routeIndex++;
        if (b === boats.boarded) G.hud.toast(`Ferry stop — ${b.routeIndex % 2 === 0 ? 'harbor docks' : 'Isla Verde marina'}. E to hop off.`);
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - b.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.heading += Math.max(-0.5 * dt, Math.min(0.5 * dt, diff * dt));
        b.speed = 8;
        b.pos.x += Math.sin(b.heading) * b.speed * dt;
        b.pos.z += Math.cos(b.heading) * b.speed * dt;
      }
      const bob = Math.sin(G.elapsed * 1.4 + b.bobPhase) * 0.12;
      b.mesh.position.set(b.pos.x, 0.3 + bob, b.pos.z);
      b.mesh.rotation.y = b.heading;
      if (b === boats.boarded) {
        // Mara rides on deck: her position and the camera follow the ferry.
        G.player.pos.set(b.pos.x, 0, b.pos.z);
        G.player.group.position.copy(G.player.pos);
        const cam = G.camera;
        cam.position.set(b.pos.x - Math.sin(b.heading) * 13, 6, b.pos.z - Math.cos(b.heading) * 13);
        cam.lookAt(b.pos.x, 1.2, b.pos.z);
        G.hud.setObjectiveHint('Riding the Old Town ferry — E to hop off at the next stop');
      }
    }
    // Idle boats bob gently on the swell.
    const bob = Math.sin(G.elapsed * 1.4 + b.bobPhase) * 0.12;
    const roll = Math.sin(G.elapsed * 0.9 + b.bobPhase) * 0.03;
    if (b !== boats.boarded) {
      b.mesh.position.set(b.pos.x, 0.3 + bob, b.pos.z);
      b.mesh.rotation.set(roll, b.heading, 0);
    }
    updateWake(G, b, dt);
  }
  const boat = boats.boarded;
  if (!boat) return;
  // v6: the ferry sails itself — the loop above already rides it, so the
  // steering section below never touches it.
  if (boat.ferry) return;
  const input = G.input;
  const throttle = input.down('forward') ? 1 : input.down('back') ? -0.5 : 0;
  const steerTarget = (input.down('left') ? 1 : 0) - (input.down('right') ? 1 : 0);
  boat.steer += (steerTarget - boat.steer) * Math.min(1, dt * 3);
  if (Math.abs(boat.speed) > 1) {
    boat.heading += boat.steer * BOAT_TURN * dt * (boat.speed > 0 ? 1 : -1)
      * Math.min(1, Math.abs(boat.speed) / 8 + 0.2);
  }
  if (throttle > 0) boat.speed += BOAT_ACCEL * throttle * dt;
  if (throttle < 0) boat.speed += BOAT_ACCEL * throttle * 0.7 * dt;
  boat.speed -= boat.speed * 0.35 * dt;
  // v5: the Comet runs to its own, faster top speed.
  const topSpeed = boat.topSpeed || BOAT_TOP_SPEED;
  boat.speed = Math.max(-topSpeed * 0.4, Math.min(topSpeed, boat.speed));
  boat.pos.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.pos.z += Math.cos(boat.heading) * boat.speed * dt;
  clampToWater(G, boat);
  // v3: rain chops the swell — the bob grows with the weather's chop.
  const chop = G.weather ? G.weather.chop : 0.1;
  const bobAmp = 0.14 + chop * 0.5;
  const bob = Math.sin(G.elapsed * 1.6 + boat.bobPhase) * bobAmp
    + Math.abs(boat.speed) * 0.004 * Math.sin(G.elapsed * 6);
  const roll = Math.sin(G.elapsed * 0.9 + boat.bobPhase) * 0.04 - boat.steer * 0.05;
  boat.mesh.position.set(boat.pos.x, 0.3 + bob, boat.pos.z);
  boat.mesh.rotation.set(roll, boat.heading, boat.steer * 0.04);
  dropWake(G, boat, dt);
  // Mara rides on the deck: keep her hidden but her position on the boat.
  G.player.pos.set(boat.pos.x, 0, boat.pos.z);
  G.player.group.position.copy(G.player.pos);
  // Chase camera behind the boat, higher than the car camera.
  const cam = G.camera;
  const back = 13, up = 6;
  const cx = boat.pos.x - Math.sin(boat.heading) * back;
  const cz = boat.pos.z - Math.cos(boat.heading) * back;
  cam.position.set(cx, up, cz);
  cam.lookAt(boat.pos.x, 1.2, boat.pos.z);
  G.hud.setObjectiveHint(`Sailing the ${boat.name} — ${Math.round(Math.abs(boat.speed) * 3.6)} km/h · E to hop off`);
  G.audio.engineSet(Math.abs(boat.speed) / topSpeed);
  updateTour(G, boat, dt);
}

export function boatStatusText(G) {
  if (!G.boats) return 'No boats yet.';
  const t = G.boats.tour;
  const m = G.boats.marina;
  return `${G.boats.list.length} boats — harbor (3) and Isla Verde marina (3, incl. the fast Verde Comet) · ` +
    `harbor tour ${t.next}/${t.buoys.length} buoys · ${t.done} tours ($${t.earned}) · ` +
    `marina tour ${m.next}/${m.buoys.length} buoys · ${m.done} tours ($${m.earned})`;
}

// v7: the Bay Regatta — a boat race around six buoys in the open water
// south of the harbor. Sail into the glowing ring at the harbor, and
// the regatta starts: six buoys in order, a clock running, a $1,200
// prize for a clean circuit and a faster line for anyone who cuts the
// corners tight. The buoys are real scene objects with a glow ring, so
// the course reads from the water at a glance.

export const REGATTA_BUOYS = [
  { x: 380, z: -120 },
  { x: 425, z: -10 },
  { x: 400, z: 100 },
  { x: 350, z: 200 },
  { x: 380, z: 300 },
  { x: 425, z: 190 },
];
const REGATTA_START = { x: 352, z: 40 };
const REGATTA_PRIZE = 1200;

export function createRegatta(G) {
  const reg = {
    active: false,
    buoyIndex: 0,
    startTime: 0,
    bestTime: null,
    races: 0,
    wins: 0,
    buoys: [],
    ring: null,
  };
  for (const b of REGATTA_BUOYS) {
    const group = new THREE.Group();
    const buoy = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.8, 10),
      new THREE.MeshLambertMaterial({ color: 0xffd23e }));
    buoy.position.y = 0.4;
    group.add(buoy);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.5 }));
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.6;
    group.add(glow);
    group.position.set(b.x, 0, b.z);
    G.scene.add(group);
    reg.buoys.push({ ...b, group, glow });
  }
  G.regatta = reg;
  return reg;
}

function boatPos(G) {
  return G.boating ? G.boating.pos : null;
}

export function updateRegatta(G, dt) {
  const reg = G.regatta;
  if (!reg) return;
  const p = boatPos(G);
  // Buoys pulse gently so the course reads from the water.
  for (let i = 0; i < reg.buoys.length; i++) {
    const b = reg.buoys[i];
    const on = reg.active && i === reg.buoyIndex;
    b.glow.material.opacity = on ? 0.85 : 0.35;
    b.group.position.y = Math.sin(G.elapsed * 1.2 + i) * 0.15;
  }
  if (!reg.active) {
    if (p && Math.hypot(p.x - REGATTA_START.x, p.z - REGATTA_START.z) < 12) {
      reg.active = true;
      reg.buoyIndex = 0;
      reg.startTime = G.elapsed;
      reg.races += 1;
      G.hud.toast('Bay Regatta started! Six buoys, fastest line wins — $1,200 for a clean circuit.');
      if (G.audio.bell) G.audio.bell();
    }
    return;
  }
  if (!p) {
    reg.active = false;
    G.hud.toast('Regatta abandoned — you left the boat.');
    return;
  }
  const target = reg.buoys[reg.buoyIndex];
  if (Math.hypot(p.x - target.x, p.z - target.z) < 7) {
    reg.buoyIndex += 1;
    if (reg.buoyIndex >= reg.buoys.length) {
      const time = G.elapsed - reg.startTime;
      reg.active = false;
      reg.wins += 1;
      G.cash += REGATTA_PRIZE;
      const isBest = reg.bestTime === null || time < reg.bestTime;
      if (isBest) reg.bestTime = time;
      G.hud.toast(`Regatta complete in ${time.toFixed(1)}s! +$${REGATTA_PRIZE}${isBest ? ' — new best time!' : ''}`);
      if (G.save) G.save.save(G);
    } else {
      G.hud.toast(`Buoy ${reg.buoyIndex}/${reg.buoys.length} — keep the line tight!`);
    }
  }
}

export function regattaSummary(G) {
  const reg = G.regatta;
  if (!reg) return 'The regatta buoys are not in the water yet.';
  return `${reg.races} regattas · ${reg.wins} circuits · best ${reg.bestTime === null ? '—' : reg.bestTime.toFixed(1) + 's'}.`;
}
