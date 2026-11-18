// missions4.js — the v7 story arc (Missions 13–14). After the mountain
// run, the Harbor Syndicate tries one last play: a ledger of bribes
// stashed at the harbor hotel, and a getaway boat waiting at the marina.
// Mara takes the ledger back in Mission 13, "The Harbor Ledger", and in
// Mission 14, "Queen of the Bay", she runs the bay itself — a boat chase
// from Isla Verde to the harbor — to end the Syndicate's grip on Solmar
// for good. Both missions plug into the same MISSIONS list and step types
// the story already uses, and both pay in cash and in reputation: finish
// them and the city stops whispering and starts cheering.

import * as THREE from 'three';
import { MISSIONS, startMission, placeMarker, hideMarker } from './missions.js';
import { OLD_TOWN } from './oldtown.js';
import { MOUNTAIN } from './missions3.js';

export const HARBOR_LEDGER = {
  hotel: { x: 300, z: 60 },
  dock: { x: 300, z: -20 },
  arch: { x: 260, z: -220 },
  garage: { x: -20, z: -100 },
};

export const BAY_RUN = {
  boardwalk: { x: -160, z: 505 },
  marina: { x: -115, z: 555 },
  harborBuoy: { x: 352, z: 40 },
  plaza: { x: 20, z: 20 },
};

const MISSION_13 = {
  id: 'harbor-ledger',
  title: 'Mission 13 — The Harbor Ledger',
  reward: 7000,
  intro: ['LENA: "The Syndicate kept a second ledger — every bribe, every bagman, every cop on their payroll. It\'s at the harbor hotel."',
    'VIC (phone): "Room with a view of the docks, Mara. Walk in like you own the place, walk out with the book."',
    'MARA: "Then the whole city gets to read it. Starting with the cops in it."'],
  steps: [
    { type: 'goto', target: HARBOR_LEDGER.hotel, radius: 12, text: 'Reach the harbor hotel', hint: 'East side — the tall hotel by the piers. A fast car helps.' },
    { type: 'collect', target: HARBOR_LEDGER.dock, radius: 6, text: 'Grab the ledger at the docks', hint: 'Walk into the glowing case by the pier office.' },
    { type: 'timed', target: HARBOR_LEDGER.arch, radius: 10, seconds: 75, text: 'Race the ledger to the Founders Arch', hint: '75 seconds. The Syndicate\'s bagmen are already moving.' },
    { type: 'dwell', target: OLD_TOWN.plaza, radius: 10, seconds: 8, text: 'Hold the plaza while Lena copies the ledger', hint: 'Stand on the marker and hold it — the quarter is watching.' },
    { type: 'drive', target: HARBOR_LEDGER.garage, radius: 12, text: 'Bring the copy home to Vic\'s garage', hint: 'Any car will do — but a fast one helps if the PD notices.' },
  ],
  outro: ['LENA: "Every name is copied. The harbor hotel just got very quiet."',
    'MARA: "Good. Now the Syndicate knows what it feels like to be read."'],
};

const MISSION_14 = {
  id: 'queen-of-the-bay',
  title: 'Mission 14 — Queen of the Bay',
  reward: 9000,
  intro: ['LENA: "The Syndicate\'s last boat leaves the marina at dusk — their whole crew, their money, their way out."',
    'VIC (phone): "Boardwalk first, Mara. Then take a boat and run them down. The bay is yours."',
    'MARA: "The bay was always mine. They just didn\'t know it yet."'],
  steps: [
    { type: 'goto', target: BAY_RUN.boardwalk, radius: 12, text: 'Reach the Isla Verde boardwalk', hint: 'South across the causeway — or steal a boat and cut the corner.' },
    { type: 'enter', target: BAY_RUN.marina, radius: 10, text: 'Take a boat from the marina', hint: 'Press E next to a moored boat at the marina.' },
    { type: 'timed', target: BAY_RUN.harborBuoy, radius: 14, seconds: 90, text: 'Run the bay to the harbor buoy', hint: '90 seconds across open water. Full throttle, straight line.' },
    { type: 'collect', target: BAY_RUN.harborBuoy, radius: 8, text: 'Grab the Syndicate strongbox at the buoy', hint: 'Sail into the glowing case floating by the buoy.' },
    { type: 'drive', target: BAY_RUN.plaza, radius: 12, text: 'Bring the strongbox home to the plaza', hint: 'Back to where it all started. The city is watching.' },
  ],
  outro: ['LENA: "That\'s the last of them. The bay is quiet, the money is ours, and the Syndicate is done."',
    'MARA: "Solmar City, population: us. Queen of the bay — I like the sound of that."'],
};

export function registerMissions13And14(G) {
  if (!MISSIONS.some((m) => m.id === 'harbor-ledger')) MISSIONS.push(MISSION_13);
  if (!MISSIONS.some((m) => m.id === 'queen-of-the-bay')) MISSIONS.push(MISSION_14);

  // A gold case waiting at the docks for Mission 13's ledger step, and a
  // second one floating by the harbor buoy for Mission 14's strongbox.
  if (!G.missions4) {
    const mkCase = (x, z, floating = false) => {
      const g = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
      crate.position.y = floating ? 1.4 : 0.9;
      g.add(crate);
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.2, 1.26),
        new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
      band.position.y = floating ? 1.4 : 0.9;
      g.add(band);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22 }));
      glow.position.y = floating ? 1.4 : 0.9;
      g.add(glow);
      if (floating) {
        const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 10),
          new THREE.MeshLambertMaterial({ color: 0xd85a1a }));
        buoy.position.y = 0.25;
        g.add(buoy);
      }
      g.position.set(x, 0, z);
      G.scene.add(g);
      return g;
    };
    G.missions4 = {
      ledgerCase: mkCase(HARBOR_LEDGER.dock.x + 4, HARBOR_LEDGER.dock.z + 2),
      strongbox: mkCase(BAY_RUN.harborBuoy.x, BAY_RUN.harborBuoy.z, true),
      spin: 0,
      replays: 0,
      bestTimes: {},
      // v7: the replay ledger — every completed mission can be run again
      // for half its reward, and the fastest replay is remembered.
      replayBest: {},
    };
  }
  return [MISSION_13, MISSION_14];
}

export function updateMissions4(G, dt) {
  const m4 = G.missions4;
  if (!m4) return;
  m4.spin += dt;
  m4.ledgerCase.rotation.y = m4.spin;
  m4.strongbox.rotation.y = m4.spin * 0.7;
  // The cases only show while their mission is the live one.
  const idx = G.missions.index;
  const activeId = idx < MISSIONS.length ? MISSIONS[idx].id : null;
  m4.ledgerCase.visible = activeId === 'harbor-ledger';
  m4.strongbox.visible = activeId === 'queen-of-the-bay';
  // The floating strongbox bobs on the swell while it waits.
  if (m4.strongbox.visible) {
    m4.strongbox.position.y = 0.25 + Math.sin(m4.spin * 1.4) * 0.18;
  }
}

// v7: replay any finished mission for half its reward. The replay clock
// starts when the mission starts and the fastest replay is kept.
export function replayMission(G, index) {
  if (!G.missions4) return false;
  if (index < 0 || index >= MISSIONS.length) return false;
  if (index >= G.missions.index) return false; // only finished missions replay
  const mission = MISSIONS[index];
  G.missions4.replays += 1;
  G.missions4.replayStart = G.elapsed;
  G.missions4.replayId = mission.id;
  startMission(G, index);
  G.hud.toast(`Replay: ${mission.title} — half reward, full glory.`);
  return true;
}

export function recordReplayTime(G, missionId, seconds) {
  const m4 = G.missions4;
  if (!m4) return;
  const prev = m4.replayBest[missionId];
  if (prev === undefined || seconds < prev) {
    m4.replayBest[missionId] = seconds;
    G.hud.toast(`New replay best for ${missionId}: ${seconds.toFixed(1)}s!`);
  }
}

export function missions4Summary() {
  return 'Missions 13–14: The Harbor Ledger and Queen of the Bay.';
}

// v7: the story so far, in one breath — used by the pause screen and the
// end screen when Mara finishes the whole arc.
export function storySoFar(G) {
  const done = Math.min(G.missions.index, MISSIONS.length);
  const names = MISSIONS.slice(0, done).map((m) => m.title.replace(/^Mission \d+ — /, ''));
  return `${done}/${MISSIONS.length} missions — ${names.join(' · ') || 'the story has not begun'}.`;
}

// v7: how long the current story mission has been running, for the replay
// clock and for the HUD's quiet "you have been at this a while" nudge.
export function missionElapsed(G) {
  if (!G.missions.active) return 0;
  return G.elapsed - (G.missions.startedAt || G.elapsed);
}
