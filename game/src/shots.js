// shots.js — deterministic screenshot poses for ?shot=start|drive|chase|mission
// (each with &seed=1). A shot hides the title screen, places Mara, cars,
// police and the mission marker at fixed spots, holds the throttle where the
// scene needs motion, and parks the camera at a fixed angle. The main loop
// steps the world with a fixed 1/60 s timestep while a shot runs, so the
// same seed always renders the same frame.

import * as THREE from 'three';
import { createVehicle, enterCar } from './vehicles.js';
import { startMission } from './missions.js';

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

export function applyShot(G, name) {
  const p = G.player;
  G.shot = name;
  G.mode = 'playing';
  G.hud.show();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('end').classList.add('hidden');
  G.audio.setMuted(true);

  if (name === 'start') {
    // On foot in the plaza: fountain, pedestrians, downtown towers behind.
    p.pos.set(8, 0, 34);
    p.heading = Math.PI;           // face the fountain / downtown
    p.camYaw = 0;
    p.camPitch = 0.3;
    startMission(G, 0);
    // A few pedestrians strolling the plaza for life.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      G.pedestrians.spawnPed(G, 20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14, false);
    }
  } else if (name === 'drive') {
    // Behind the wheel of the Vortex GT on the main avenue, traffic ahead.
    const car = createVehicle(G, 'sports', 0, 120, Math.PI, { parked: false });
    p.pos.set(0, 0, 120);
    enterCar(G, car);
    car.speed = 22;
    G.input.keys.add('forward');
    startMission(G, 0);
    // Traffic ahead in both lanes so the avenue feels alive.
    const t1 = createVehicle(G, 'sedan', 3.4, 60, Math.PI, { driver: 'traffic', occupied: true });
    t1.speed = 12; t1.route = { axis: 'z', dir: -1, nextTurn: 200 }; t1.cruiseSpeed = 12;
    const t2 = createVehicle(G, 'taxi', -3.4, 30, 0, { driver: 'traffic', occupied: true });
    t2.speed = 11; t2.route = { axis: 'z', dir: 1, nextTurn: 200 }; t2.cruiseSpeed = 11;
    const t3 = createVehicle(G, 'van', 3.4, 90, Math.PI, { driver: 'traffic', occupied: true });
    t3.speed = 10; t3.route = { axis: 'z', dir: -1, nextTurn: 200 }; t3.cruiseSpeed = 10;
  } else if (name === 'chase') {
    // Three stars, two cruisers on Mara's tail, downtown in the background.
    const car = createVehicle(G, 'sports', 80, -40, -Math.PI / 2, { parked: false });
    p.pos.set(80, 0, -40);
    enterCar(G, car);
    car.speed = 26;
    G.input.keys.add('forward');
    G.wanted.addHeat(62, 'shot setup');
    startMission(G, 2);
    const c1 = createVehicle(G, 'police', 104, -38, -Math.PI / 2, { driver: 'police', occupied: true });
    c1.speed = 30;
    G.policeCars.push(c1);
    const c2 = createVehicle(G, 'police', 112, -46, -Math.PI / 2, { driver: 'police', occupied: true });
    c2.speed = 28;
    G.policeCars.push(c2);
    const ct = createVehicle(G, 'sedan', 76, 10, -Math.PI / 2, { driver: 'traffic', occupied: true });
    ct.speed = 12; ct.route = { axis: 'x', dir: -1, nextTurn: 200 }; ct.cruiseSpeed = 12;
  } else if (name === 'mission') {
    // Mission 3 at the harbor: Mara on foot, the gold marker, docks and water.
    p.pos.set(278, 0, -62);
    p.heading = Math.PI / 2;
    p.camYaw = -Math.PI / 2;
    p.camPitch = 0.3;
    startMission(G, 2);
    // A taxi and a van parked at the docks, a couple of dock workers.
    createVehicle(G, 'taxi', 292, -40, Math.PI, { parked: true });
    createVehicle(G, 'van', 268, -96, 0, { parked: true });
    G.pedestrians.spawnPed(G, 292, -70, false);
    G.pedestrians.spawnPed(G, 284, -88, false);
  }
  G.shotFrames = 0;
}

// Fixed camera per shot, applied every frame so mouse input cannot move it.
export function poseShotCamera(G) {
  const p = G.player;
  const cam = G.camera;
  if (G.shot === 'start') {
    cam.position.set(p.pos.x + 7, 4.6, p.pos.z + 10);
    cam.lookAt(p.pos.x - 2, 1.6, p.pos.z - 18);
  } else if (G.shot === 'drive') {
    const v = G.driving;
    cam.position.set(v.pos.x + 9, 5.2, v.pos.z + 13);
    cam.lookAt(v.pos.x, 1.4, v.pos.z - 30);
  } else if (G.shot === 'chase') {
    const v = G.driving;
    cam.position.set(v.pos.x + 10, 6, v.pos.z + 15);
    cam.lookAt(v.pos.x - 4, 1.4, v.pos.z - 26);
  } else if (G.shot === 'mission') {
    cam.position.set(p.pos.x - 11, 5.4, p.pos.z + 11);
    cam.lookAt(p.pos.x + 8, 1.6, p.pos.z - 12);
  }
}
