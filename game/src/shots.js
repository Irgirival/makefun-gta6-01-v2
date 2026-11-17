// shots.js — deterministic screenshot poses for ?shot=start|drive|chase|mission
// (each with &seed=1). A shot hides the title screen, places Mara, cars,
// police and the mission marker at fixed spots, holds the throttle where the
// scene needs motion, and parks the camera at a fixed angle. The main loop
// steps the world with a fixed 1/60 s timestep while a shot runs, so the
// same seed always renders the same frame.

import * as THREE from 'three';
import { createVehicle, enterCar } from './vehicles.js';
import { createMotorcycle } from './motorcycle.js';
import { startMission, MISSIONS, placeMarker } from './missions.js';

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
    // On foot in the plaza: fountain ahead, pedestrians, downtown towers.
    p.pos.set(20, 0, 40);
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
    // v3: the avenue is road x=60 (roads run at -340+80k) — the car, the
    // traffic and the Comet all sit on asphalt now, not on the grass.
    const car = createVehicle(G, 'sports', 60, 120, Math.PI, { parked: false });
    p.pos.set(60, 0, 120);
    enterCar(G, car);
    car.speed = 22;
    G.input.keys.add('forward');
    startMission(G, 0);
    // Jump the mission to the driving step so the objective matches the shot.
    const def = MISSIONS[0];
    G.missions.step = 2;
    G.hud.setMission(def.title, def.steps[2].text, def.steps[2].hint);
    placeMarker(G, def.steps[2].target);
    // Traffic ahead in both lanes so the avenue feels alive.
    const t1 = createVehicle(G, 'sedan', 63.4, 60, Math.PI, { driver: 'traffic', occupied: true });
    t1.speed = 12; t1.route = { axis: 'z', dir: -1, nextTurn: 200 }; t1.cruiseSpeed = 12;
    const t2 = createVehicle(G, 'taxi', 56.6, 30, 0, { driver: 'traffic', occupied: true });
    t2.speed = 11; t2.route = { axis: 'z', dir: 1, nextTurn: 200 }; t2.cruiseSpeed = 11;
    const t3 = createVehicle(G, 'van', 63.4, 20, Math.PI, { driver: 'traffic', occupied: true });
    t3.speed = 10; t3.route = { axis: 'z', dir: -1, nextTurn: 200 }; t3.cruiseSpeed = 10;
    // v5: the Verde Limousine gliding in the right lane ahead — the new
    // ride reads clearly against the asphalt, long and low.
    const t4 = createVehicle(G, 'limo', 56.6, 85, Math.PI, { driver: 'traffic', occupied: true });
    t4.speed = 13; t4.route = { axis: 'z', dir: -1, nextTurn: 200 }; t4.cruiseSpeed = 13;
    // A yellow Comet 900 in the left lane ahead of the car, so the bike
    // reads clearly against the asphalt without blocking the drive.
    createMotorcycle(G, 56, 55, 0, { parked: true, color: 0xffd23e });
  } else if (name === 'chase') {
    // Four stars on the westbound avenue: two cruisers on Mara's tail and
    // the PD air unit holding ahead-left in the searchlight.
    const car = createVehicle(G, 'sports', 180, -20, -Math.PI / 2, { parked: false });
    p.pos.set(180, 0, -20);
    enterCar(G, car);
    car.speed = 26;
    G.input.keys.add('forward');
    G.wanted.addHeat(82, 'shot setup');
    startMission(G, 2);
    const c1 = createVehicle(G, 'police', 205, -20, -Math.PI / 2, { driver: 'police', occupied: true });
    c1.speed = 30;
    G.policeCars.push(c1);
    const c2 = createVehicle(G, 'police', 212, -26, -Math.PI / 2, { driver: 'police', occupied: true });
    c2.speed = 28;
    G.policeCars.push(c2);
    const ct = createVehicle(G, 'sedan', 60, -16.6, -Math.PI / 2, { driver: 'traffic', occupied: true });
    ct.speed = 12; ct.route = { axis: 'x', dir: -1, nextTurn: 200 }; ct.cruiseSpeed = 12;
  } else if (name === 'mission') {
    // v3: Mission 7, the Verde Heist, at the airfield — Mara on foot by the
    // terminal, the getaway plane behind her, the gold marker down the runway.
    p.pos.set(-235, 0, -262);
    p.heading = Math.PI;
    p.camYaw = 0;
    p.camPitch = 0.3;
    startMission(G, 6);
    // Jump to the runway step so the objective matches the shot. The timer
    // must be armed by hand: startMission only arms the FIRST step's timer.
    const def = MISSIONS[6];
    G.missions.step = 2;
    G.missions.timer = def.steps[2].seconds;
    G.missions.timerTotal = def.steps[2].seconds;
    G.hud.setMission(def.title, def.steps[2].text, def.steps[2].hint);
    placeMarker(G, def.steps[2].target);
    // A taxi and a van parked at the terminal, a couple of ground crew.
    createVehicle(G, 'taxi', -218, -272, Math.PI, { parked: true });
    createVehicle(G, 'van', -252, -272, 0, { parked: true });
    G.pedestrians.spawnPed(G, -228, -272, false);
    G.pedestrians.spawnPed(G, -242, -272, false);
  }
  G.shotFrames = 0;
}

// Fixed camera per shot, applied every frame so mouse input cannot move it.
// The player (or her car) sits low in the frame, the city ahead fills the rest.
export function poseShotCamera(G) {
  const p = G.player;
  const cam = G.camera;
  if (G.shot === 'start') {
    cam.position.set(p.pos.x + 3, 3.8, p.pos.z + 7.5);
    cam.lookAt(p.pos.x - 1, 1.5, p.pos.z - 12);
  } else if (G.shot === 'drive') {
    const v = G.driving;
    cam.position.set(v.pos.x + 8, 4.6, v.pos.z + 12);
    cam.lookAt(v.pos.x, 1.4, v.pos.z - 28);
  } else if (G.shot === 'chase') {
    const v = G.driving;
    // Wider and tilted up: the air unit holds ahead-left, high in the frame.
    cam.position.set(v.pos.x + 14, 6.5, v.pos.z + 14);
    cam.lookAt(v.pos.x - 8, 12, v.pos.z - 30);
  } else if (G.shot === 'mission') {
    // From the apron, looking north at the terminal, the runway to the right.
    cam.position.set(p.pos.x - 12, 4.6, p.pos.z + 12);
    cam.lookAt(p.pos.x + 10, 2.5, p.pos.z - 16);
  } else if (G.shot === 'oldtown') {
    // v6: from the plaza's south edge, looking north at the cathedral and
    // the market — the tram line crosses the frame on the avenue.
    cam.position.set(p.pos.x + 4, 4.2, p.pos.z + 9);
    cam.lookAt(p.pos.x - 2, 2, p.pos.z - 14);
  }
}

// v6: a fifth pose for the new quarter — Mara on foot in the Old Town
// plaza, the cathedral behind her and the tram gliding past on the avenue.
// It is not one of the four dossier shots; it is a staging pose for the
// photo mode's landmark checklist and for headless verification of the
// quarter (use ?shot=oldtown).
export function applyShotOldTown(G) {
  const p = G.player;
  G.shot = 'oldtown';
  G.mode = 'playing';
  G.hud.show();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('end').classList.add('hidden');
  G.audio.setMuted(true);
  p.pos.set(260, 0, -240);
  p.heading = Math.PI;
  p.camYaw = 0;
  p.camPitch = 0.3;
  // Mission 11 starts here, so the objective reads "Old Town Rising".
  // (Missions are zero-based and the base story has five: M11 is index 10.)
  if (MISSIONS.length > 10) startMission(G, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.8;
    G.pedestrians.spawnPed(G, 260 + Math.cos(a) * 12, -260 + Math.sin(a) * 12, false);
  }
  G.shotFrames = 0;
}
