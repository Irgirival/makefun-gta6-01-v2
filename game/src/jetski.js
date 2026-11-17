// jetski.js — jet skis at the Isla Verde marina. Three of them bob on
// the bay south of the island: press E near one to climb on, WASD to
// carve across the water, E again to hop off at the shore. The marina
// runs a time trial — ride the six gold buoys in order and the harbor
// master pays $600, with your best time kept on the board. Jet skis
// are quick, light and very easy to flip into a wave: hold a line and
// they reward you.

import * as THREE from 'three';

const JETSKI_SPOTS = [
  { x: -140, z: 606, heading: 0, color: 0xd81a2a, name: 'Scarlet Ski' },
  { x: -118, z: 612, heading: 0.4, color: 0x1a6ad8, name: 'Bluefin Ski' },
  { x: -96, z: 606, heading: -0.4, color: 0xd8a03a, name: 'Golden Ski' },
];

// The trial ring, out in the open bay where nothing blocks the line.
const TRIAL_BUOYS = [
  { x: -260, z: 630 }, { x: -160, z: 640 }, { x: -60, z: 630 },
  { x: -60, z: 700 }, { x: -160, z: 710 }, { x: -260, z: 700 },
];
const TRIAL_PRIZE = 600;
const SKI_TOP_SPEED = 32;
const SKI_ACCEL = 16;
const SKI_TURN = 1.5;

function buildJetSkiMesh(color) {
  const group = new THREE.Group();
  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  // Hull: a slim wedge that tapers to the nose.
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 2.8), mat(color));
  hull.position.y = 0.25;
  group.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.0), mat(color));
  nose.position.set(0, 0.3, 1.7);
  nose.rotation.x = -0.25;
  group.add(nose);
  // Seat, handlebars and a little windscreen.
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 1.1), mat(0x1a1a1a));
  seat.position.set(0, 0.6, -0.4);
  group.add(seat);
  const bars = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.12), mat(0x333333));
  bars.position.set(0, 0.85, 0.7);
  group.add(bars);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.6 }));
  screen.position.set(0, 0.85, 1.0);
  screen.rotation.x = -0.4;
  group.add(screen);
  // The rider's wake starts here: a white foam strip under the tail.
  const foam = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  foam.position.set(0, 0.05, -1.5);
  group.add(foam);
  return group;
}

export function createJetSkis(G) {
  const skis = {
    list: [],
    riding: null,
    trial: {
      next: 0, active: false, time: 0, best: G.saveData?.jetskiBest ?? null,
      done: 0, earned: 0, buoys: [],
    },
  };
  for (const spot of JETSKI_SPOTS) {
    const mesh = buildJetSkiMesh(spot.color);
    mesh.position.set(spot.x, 0.3, spot.z);
    mesh.rotation.y = spot.heading;
    G.scene.add(mesh);
    skis.list.push({
      ...spot,
      mesh,
      pos: new THREE.Vector3(spot.x, 0, spot.z),
      heading: spot.heading,
      speed: 0,
      steer: 0,
      bobPhase: Math.random() * 6,
    });
  }
  // Trial buoys: gold balls on striped posts, bobbing on the swell.
  for (let i = 0; i < TRIAL_BUOYS.length; i++) {
    const spot = TRIAL_BUOYS[i];
    const group = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    post.position.y = 1.3;
    group.add(post);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x442200 }));
    ball.position.y = 2.9;
    group.add(ball);
    const num = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.1),
      new THREE.MeshBasicMaterial({ color: i === 0 ? 0x2aff5a : 0xffffff }));
    num.position.set(0, 2.0, 0.2);
    group.add(num);
    group.position.set(spot.x, 0, spot.z);
    G.scene.add(group);
    skis.trial.buoys.push({ ...spot, group, ball, index: i });
  }
  G.jetskis = skis;
  return skis;
}

export function nearestJetSki(G) {
  if (G.driving || G.boating || G.flying || G.jetski) return null;
  const p = G.player.pos;
  for (const s of G.jetskis.list) {
    if (Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < 5) return s;
  }
  return null;
}

export function enterJetSki(G, ski) {
  G.jetski = ski;
  G.jetskis.riding = ski;
  G.player.group.visible = false;
  G.audio.engineStart();
  G.audio.engineStartLoop();
  G.hud.toast(`${ski.name} — WASD to ride, E to hop off. The trial buoys pay $600.`);
  const t = G.jetskis.trial;
  if (t.best) G.hud.showDialogue([
    `Marina time trial — ride the six gold buoys in order.`,
    `Your best: ${t.best.toFixed(1)}s. Beat it and the harbor master pays $${TRIAL_PRIZE}.`,
    'Start at the green-marked buoy, west end of the bay.',
  ]);
}

export function exitJetSki(G) {
  const ski = G.jetski;
  if (!ski) return false;
  // Hop off onto the nearest shore: the marina sand is just north.
  const shoreZ = Math.min(ski.pos.z, 560);
  G.player.pos.set(ski.pos.x, 0, shoreZ);
  G.player.group.position.copy(G.player.pos);
  G.player.group.visible = true;
  G.jetski = null;
  G.jetskis.riding = null;
  ski.speed = 0;
  G.audio.engineStop();
  G.hud.toast('Off the jet ski. Mara is back on dry land.');
  return true;
}

export function jetSkiStatusText(G) {
  const ski = G.jetski;
  if (!ski) return 'Jet skis: three at the Isla Verde marina (E to ride)';
  const kmh = Math.round(Math.abs(ski.speed) * 3.6);
  const t = G.jetskis.trial;
  const trial = t.active ? ` · trial buoy ${t.next + 1}/6 · ${t.time.toFixed(1)}s` : '';
  return `${ski.name} — ${kmh} km/h · jet ski${trial}`;
}

function waterClamp(G, ski) {
  // The bay: south of the beach and east of the harbor mouth. Bounce
  // softly off the invisible edges so a ski never beaches on a road.
  if (ski.pos.z < 430) { ski.pos.z = 430; ski.heading = Math.PI - ski.heading; ski.speed *= 0.5; }
  if (ski.pos.z > 760) { ski.pos.z = 760; ski.heading = Math.PI - ski.heading; ski.speed *= 0.5; }
  if (ski.pos.x < -380) { ski.pos.x = -380; ski.heading = -ski.heading; ski.speed *= 0.5; }
  if (ski.pos.x > 430) { ski.pos.x = 430; ski.heading = -ski.heading; ski.speed *= 0.5; }
}

export function updateJetSkis(G, dt) {
  const skis = G.jetskis;
  if (!skis) return;
  const chop = G.weather ? G.weather.chop : 0.1;
  for (const s of skis.list) {
    // Parked skis bob on the swell; the ridden one answers the throttle.
    const bob = Math.sin(G.elapsed * 1.6 + s.bobPhase) * (0.08 + chop * 0.25);
    s.mesh.position.y = 0.3 + bob;
    s.mesh.rotation.z = Math.sin(G.elapsed * 1.2 + s.bobPhase) * 0.05;
  }

  const ski = skis.riding;
  if (!ski) return;
  const input = G.input;
  const throttle = input.down('forward') ? 1 : input.down('back') ? -0.5 : 0;
  const steer = (input.down('left') ? 1 : 0) - (input.down('right') ? 1 : 0);
  ski.speed += throttle * SKI_ACCEL * dt;
  ski.speed -= ski.speed * 0.9 * dt;
  ski.speed = Math.max(-8, Math.min(SKI_TOP_SPEED, ski.speed));
  ski.heading += steer * SKI_TURN * dt * Math.min(1, Math.abs(ski.speed) / 8) * (ski.speed < 0 ? -1 : 1);
  ski.pos.x += Math.sin(ski.heading) * ski.speed * dt;
  ski.pos.z += Math.cos(ski.heading) * ski.speed * dt;
  waterClamp(G, ski);
  ski.mesh.position.set(ski.pos.x, 0.3 + Math.sin(G.elapsed * 2.2) * 0.12, ski.pos.z);
  ski.mesh.rotation.y = ski.heading;
  ski.mesh.rotation.z = -steer * 0.18 * Math.min(1, Math.abs(ski.speed) / 12);

  // Chase camera low over the water, looking down the bow.
  const cam = G.camera;
  const fx = Math.sin(ski.heading);
  const fz = Math.cos(ski.heading);
  const back = 10 + Math.abs(ski.speed) * 0.15;
  cam.position.set(ski.pos.x - fx * back, 4.5, ski.pos.z - fz * back);
  cam.lookAt(ski.pos.x + fx * 12, 1, ski.pos.z + fz * 12);
  G.audio.engineSet(Math.abs(ski.speed) / SKI_TOP_SPEED);
  if (Math.abs(ski.speed) > 20 && Math.random() < 0.4) {
    G.audio.noise(0.12, 0.04, 2400, 'highpass');
  }

  // The time trial: buoys in order, green first, the clock running.
  const t = skis.trial;
  if (!t.active) {
    const first = t.buoys[0];
    if (Math.hypot(ski.pos.x - first.x, ski.pos.z - first.z) < 8) {
      t.active = true;
      t.next = 1;
      t.time = 0;
      G.hud.toast('TIME TRIAL STARTED — six buoys, in order, as fast as you can!');
      G.audio.missionSting();
    }
  } else {
    t.time += dt;
    const next = t.buoys[t.next];
    if (next && Math.hypot(ski.pos.x - next.x, ski.pos.z - next.z) < 8) {
      t.next++;
      G.audio.pickup();
      if (t.next >= t.buoys.length) {
        t.active = false;
        t.done++;
        t.earned += TRIAL_PRIZE;
        G.cash += TRIAL_PRIZE;
        const beaten = t.best === null || t.time < t.best;
        if (beaten) t.best = t.time;
        G.hud.showDialogue([
          `TIME TRIAL DONE — ${t.time.toFixed(1)}s!`,
          beaten ? `New best time on the marina trial! The harbor master pays $${TRIAL_PRIZE}.`
            : `Best stays ${t.best.toFixed(1)}s. The harbor master pays $${TRIAL_PRIZE} anyway.`,
          `Trials finished: ${t.done} · earned: $${t.earned}.`,
        ]);
        G.audio.missionComplete();
        G.save.save(G);
      } else {
        G.hud.toast(`Buoy ${t.next}/6 — ${t.time.toFixed(1)}s. Next one, straight ahead!`);
      }
    }
    if (t.time > 180) {
      t.active = false;
      t.next = 0;
      G.hud.toast('Time trial called off — 3 minutes is enough for anyone.');
    }
  }
  G.hud.setObjectiveHint(jetSkiStatusText(G));
}
