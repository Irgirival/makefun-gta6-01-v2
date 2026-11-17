// heist.js — Missions 8 and 9, "The Solmar Job" and "King of Solmar".
// The story continues after the Verde Heist: Mara cracks the Solmar
// National Bank's vault, then runs one last cross-city job for the fixer
// who bankrolled her return. It plugs into the story list exactly like
// Mission 6 and the finale did, reusing the goto / timed / collect /
// wanted / drive step machinery, and adds its own beats on top: a vault
// drill that sparks and rattles while the timed step runs, a getaway car
// waiting at the airfield for Mission 9, and a fresh wave of heat the
// moment the last job goes loud.

import * as THREE from 'three';
import { MISSIONS } from './missions.js';
import { createVehicle } from './vehicles.js';

const BANK = { x: 120, z: 60 };
const VAULT = { x: 140, z: 100 };
const GARAGE = { x: -20, z: -100 };
const PLAZA = { x: 20, z: 20 };
const AIRFIELD = { x: -235, z: -276 };
const DOCK = { x: 300, z: -80 };
const SAFEHOUSE = { x: -120, z: 360 };

const MISSION_8 = {
  id: 'solmar-job',
  title: 'Mission 8 — The Solmar Job',
  reward: 8000,
  intro: [
    'VIC (phone): "The National Bank moves its Friday vault on the third floor. One drill, one bag, one quiet exit."',
    'LENA: "Quiet? Mara, you have never once been quiet."',
    'MARA: "Then tonight I learn. Get the car ready, Vic."',
  ],
  steps: [
    { type: 'goto', target: BANK, radius: 10, text: 'Case the Solmar National Bank downtown', hint: 'Downtown, east of the plaza. Walk the block first — the guards watch the door.' },
    { type: 'timed', target: VAULT, radius: 6, seconds: 75, text: 'Reach the vault before the silent alarm resets', hint: '75 seconds. Get to the vault fast — the drill is waiting.' },
    { type: 'dwell', target: VAULT, radius: 6, seconds: 6, text: 'Hold the drill on the vault — crack it open', hint: 'Stay on the vault while the drill works. Step away and the crack stalls.' },
    { type: 'drive', target: GARAGE, radius: 10, text: 'Get the take to Vic\'s garage', hint: 'Any car will do. The bag is worth more than the car.' },
    { type: 'wanted', target: PLAZA, radius: 12, text: 'Lose the police, then reach the plaza', hint: 'Break line of sight and stay hidden until the stars clear.' },
    { type: 'drive', target: PLAZA, radius: 10, text: 'Stand in the plaza — the job is done', hint: 'The city lights are all yours now.' },
  ],
  outro: [
    'VIC: "Eight thousand, clean. The bank will blame the alarm company."',
    'LENA: "One more job, Mara. The fixer wants the whole city, and he wants you to take it."',
    'MARA: "Then let\'s take it. All of it."',
  ],
};

const MISSION_9 = {
  id: 'king-of-solmar',
  title: 'Mission 9 — King of Solmar',
  reward: 12000,
  intro: [
    'FIXER (phone): "The last shipment lands at the harbor tonight. Take it, and Solmar stops asking who runs it."',
    'MARA: "And if the PD shows up?"',
    'FIXER: "Then you outrun them. That is what you do."',
  ],
  steps: [
    { type: 'goto', target: AIRFIELD, radius: 10, text: 'Meet the fixer\'s contact at the airfield', hint: 'West side, past the runway. The gold getaway car is waiting there.' },
    { type: 'timed', target: DOCK, radius: 12, seconds: 90, text: 'Run the getaway car to the harbor before the shipment sails', hint: '90 seconds. The whole city is about to wake up.' },
    { type: 'collect', target: DOCK, radius: 6, text: 'Grab the last shipment from the docks', hint: 'Walk into the glowing crate on the pier.' },
    { type: 'wanted', target: GARAGE, radius: 12, text: 'Lose the police, then bring the shipment to Vic\'s garage', hint: 'Break line of sight, stay hidden until the stars clear.' },
    { type: 'drive', target: PLAZA, radius: 10, text: 'Stand in the plaza — Solmar is yours, for good', hint: 'Nine missions. One city. Yours.' },
  ],
  outro: [
    'LENA: "Twelve thousand. The harbor, the bank, the island — all of it, ours."',
    'VIC: "They will write songs about tonight, Mara. Bad ones, but songs."',
    'MARA: "Solmar City, population: us. And the story? The story never ends."',
  ],
};

export function registerHeist(G) {
  if (!MISSIONS.some((m) => m.id === 'solmar-job')) MISSIONS.push(MISSION_8);
  if (!MISSIONS.some((m) => m.id === 'king-of-solmar')) MISSIONS.push(MISSION_9);

  // The vault drill: a spinning bit and a shower of sparks that lives on
  // the vault step while Mara holds the crack.
  const drill = new THREE.Group();
  const bit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.3, 1.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a8a8a, emissive: 0x222222 }));
  bit.rotation.z = Math.PI / 2;
  bit.position.y = 1.1;
  drill.add(bit);
  const drillBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xd81a2a, emissive: 0x330000 }));
  drillBody.position.y = 1.1;
  drill.add(drillBody);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
  const sparks = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), sparkMat);
    s.visible = false;
    drill.add(s);
    sparks.push({ mesh: s, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  drill.position.set(VAULT.x, 0, VAULT.z);
  drill.visible = false;
  G.scene.add(drill);

  // The getaway car marker: a gold ring where the fixer leaves the car.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(AIRFIELD.x, 0.15, AIRFIELD.z);
  ring.visible = false;
  G.scene.add(ring);

  const heist = {
    drill,
    drillBit: bit,
    sparks,
    sparkTimer: 0,
    getawayRing: ring,
    getawayCar: null,
    heatAddedForStep: -1,
    lastIndex: -1,
    lastStep: -1,
    crackShown: 0,
  };
  G.heist = heist;
  return heist;
}

// How far through the vault crack Mara is, 0..1, while the dwell step runs.
function crackProgress(G) {
  const m = G.missions;
  if (m.index !== 7 || m.step !== 2 || !m.active) return -1;
  const total = MISSIONS[7].steps[2].seconds || 6;
  return Math.max(0, Math.min(1, (m.dwell || 0) / total));
}

export function heistStatusText(G) {
  const m = G.missions;
  const done = Math.min(m.index, 9);
  const p = crackProgress(G);
  if (p >= 0) return `Mission 8 — vault crack ${Math.round(p * 100)}%`;
  if (m.index >= 7) return `Heist arc — ${done}/9 missions done`;
  return 'Heist arc — unlocks after the Verde Heist';
}

export function updateHeist(G, dt) {
  const h = G.heist;
  if (!h) return;
  const m = G.missions;

  // The fixer leaves the gold getaway car at the airfield the moment
  // Mission 9 starts, and takes it away again if the mission is failed
  // or the story moves on.
  const m9Starting = m.active && m.index === 8 && m.step === 0;
  if (m9Starting && !h.getawayCar) {
    h.getawayCar = createVehicle(G, 'sports', AIRFIELD.x + 6, AIRFIELD.z + 4, Math.PI / 2,
      { parked: true, color: 0xd8a03a });
    h.getawayRing.visible = true;
    G.hud.toast('The fixer left a gold Vortex GT at the airfield. Take it.');
    G.audio.missionSting();
  }
  if ((!m.active || m.index !== 8) && h.getawayCar) {
    // The job is over or failed: the car stays where it is (it is Mara's
    // now if she took it), but the ring goes away.
    h.getawayRing.visible = false;
  }

  // The last job goes loud the moment the wanted step starts: the harbor
  // crew tips off the PD and the heat lands all at once.
  if (m.active && m.index === 8 && m.step === 3 && h.heatAddedForStep !== 3) {
    h.heatAddedForStep = 3;
    G.wanted.addHeat(48, 'harbor tip-off');
    G.hud.toast('THE HARBOR CREW TALKED — 3 stars and climbing! Lose them, then get to Vic\'s.');
  }
  if (m.step !== h.lastStep || m.index !== h.lastIndex) {
    h.lastIndex = m.index;
    h.lastStep = m.step;
    if (m.step !== 3) h.heatAddedForStep = -1;
    if (!(m.index === 7 && m.step === 2)) h.crackShown = 0;
  }

  // The vault drill only lives on Mission 8's dwell (vault-crack) step.
  const cracking = m.active && m.index === 7 && m.step === 2;
  h.drill.visible = cracking;
  if (!cracking) {
    for (const s of h.sparks) s.mesh.visible = false;
    return;
  }
  const p = crackProgress(G);
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const near = Math.hypot(VAULT.x - pos.x, VAULT.z - pos.z) < 9;
  h.drillBit.rotation.x += dt * (near ? 28 : 4);
  h.drill.rotation.y = Math.atan2(pos.x - VAULT.x, pos.z - VAULT.z);

  // Sparks fly while Mara is at the vault; the drill rattles and the
  // objective hint counts the crack up.
  if (near) {
    h.sparkTimer -= dt;
    if (h.sparkTimer <= 0) {
      h.sparkTimer = 0.12;
      G.audio.noise(0.08, 0.12, 5200, 'highpass');
      if (Math.random() < 0.5) G.audio.tone(1900 + Math.random() * 600, 0.05, 'square', 0.05);
      const s = h.sparks.find((sp) => sp.life <= 0);
      if (s) {
        s.mesh.visible = true;
        s.mesh.position.set(0.8, 1.1, 0);
        s.vx = 2 + Math.random() * 5;
        s.vy = 3 + Math.random() * 4;
        s.vz = (Math.random() - 0.5) * 6;
        s.life = 0.4 + Math.random() * 0.3;
      }
    }
    // Cheer Mara on at the quarter marks, once each.
    const mark = Math.floor(p * 4);
    if (mark > h.crackShown) {
      h.crackShown = mark;
      G.hud.toast(`Vault crack ${mark * 25}% — hold it!`);
    }
  }
  for (const s of h.sparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) { s.mesh.visible = false; continue; }
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    s.vy -= 18 * dt;
  }
  G.hud.setObjectiveHint(
    `Vault crack ${Math.round(p * 100)}% — hold the drill on the vault${near ? '' : ' (get closer!)'}`);
}
