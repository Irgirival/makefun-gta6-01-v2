// missions3.js — the v6 story arc (Missions 11–12). After "The Last
// Sunset" the story moves into the Old Town quarter and then up the
// mountain: Mara helps the Old Town shopkeepers take their streets back
// from the Harbor Syndicate, then runs a dawn delivery to the summit ski
// lodge while the whole city watches. Both missions plug into the same
// MISSIONS list and step types the story already uses.

import * as THREE from 'three';
import { MISSIONS, placeMarker, hideMarker } from './missions.js';
import { OLD_TOWN } from './oldtown.js';

export const MOUNTAIN = {
  base: { x: -250, z: 470 },
  lodge: { x: -196, z: 500 },
  viewpoint: { x: -214, z: 542 },
  bridge: { x: -160, z: 420 },
  boardwalk: { x: -160, z: 505 },
};

const MISSION_11 = {
  id: 'old-town-rising',
  title: 'Mission 11 — Old Town Rising',
  reward: 5500,
  intro: ['LENA: "The Harbor Syndicate moved into Old Town while we were busy. The shopkeepers are scared."',
    'VIC (phone): "The plaza, the cathedral, the market — walk them all, Mara. Let them see you."',
    'MARA: "Then we take the quarter back. One street at a time."'],
  steps: [
    { type: 'goto', target: OLD_TOWN.plaza, radius: 12, text: 'Reach the Old Town plaza', hint: 'North-east corner — follow the tram line up the old avenue.' },
    { type: 'dwell', target: { x: 284, z: -266 }, radius: 10, seconds: 8, text: 'Hold the cathedral steps', hint: 'Stand on the marker and hold it — the Syndicate is watching.' },
    { type: 'timed', target: OLD_TOWN.marketRow, radius: 10, seconds: 50, text: 'Race to the market before the shakedown', hint: '50 seconds. The market stalls are two blocks south of the cathedral.' },
    { type: 'collect', target: OLD_TOWN.tramStation, radius: 6, text: 'Grab the Syndicate ledger at the tram station', hint: 'Walk into the glowing crate by the tram shelter.' },
    { type: 'drive', target: OLD_TOWN.plaza, radius: 12, text: 'Bring the ledger home to the plaza', hint: 'Any car will do — but a fast one helps if the PD notices.' },
  ],
  outro: ['LENA: "The ledger names every Syndicate bagman in Old Town. The shopkeepers are already celebrating."',
    'MARA: "Tell them the quarter belongs to them again. And tell the Syndicate I said hello."'],
};

const MISSION_12 = {
  id: 'mountain-run',
  title: 'Mission 12 — The Mountain Run',
  reward: 7000,
  intro: ['VIC (phone): "Dawn run, Mara. One sealed case to the ski lodge at the summit — before the snow closes the road."',
    'LENA: "The mountain road is a ribbon and the lodge is the prize. Don\'t look down."',
    'MARA: "I never look down. I look ahead."'],
  steps: [
    { type: 'goto', target: MOUNTAIN.bridge, radius: 12, text: 'Cross the bridge to Isla Verde', hint: 'South across the beach road — the island bridge is the only way over.' },
    { type: 'timed', target: MOUNTAIN.lodge, radius: 12, seconds: 75, text: 'Climb the mountain road to the ski lodge', hint: '75 seconds up the winding road. Snow makes the turns slick.' },
    { type: 'dwell', target: MOUNTAIN.viewpoint, radius: 10, seconds: 10, text: 'Hold the summit viewpoint', hint: 'Ten seconds on the marker — the whole city is below you.' },
    { type: 'collect', target: MOUNTAIN.lodge, radius: 10, text: 'Deliver the sealed case at the lodge', hint: 'Walk into the glowing crate by the lodge door.' },
    { type: 'drive', target: MOUNTAIN.boardwalk, radius: 12, text: 'Coast back down to the boardwalk', hint: 'Easy does it — the run is done, the money is yours.' },
  ],
  outro: ['VIC (phone): "Case delivered, snow falling, sun coming up over the bay. You did it, Mara."',
    'MARA: "Solmar City, from the plaza to the summit. All of it is mine now."'],
};

export function registerMissions11And12(G) {
  if (!MISSIONS.some((m) => m.id === 'old-town-rising')) MISSIONS.push(MISSION_11);
  if (!MISSIONS.some((m) => m.id === 'mountain-run')) MISSIONS.push(MISSION_12);

  // A gold case waiting at the tram station for Mission 11's ledger step,
  // and a second one at the ski lodge for Mission 12's delivery.
  if (!G.missions3) {
    const mkCase = (x, z) => {
      const g = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
      crate.position.y = 0.9;
      g.add(crate);
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.2, 1.26),
        new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
      band.position.y = 0.9;
      g.add(band);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.25 }));
      glow.position.y = 0.9;
      g.add(glow);
      g.position.set(x, 0, z);
      G.scene.add(g);
      return g;
    };
    G.missions3 = {
      ledgerCase: mkCase(OLD_TOWN.tramStation.x + 5, OLD_TOWN.tramStation.z + 2),
      summitCase: mkCase(MOUNTAIN.lodge.x + 4, MOUNTAIN.lodge.z - 2),
      spin: 0,
    };
  }
  return [MISSION_11, MISSION_12];
}

export function updateMissions3(G, dt) {
  const m3 = G.missions3;
  if (!m3) return;
  m3.spin += dt;
  m3.ledgerCase.rotation.y = m3.spin;
  m3.summitCase.rotation.y = m3.spin;
  // The cases only show while their mission is the live one.
  const idx = G.missions.index;
  const activeId = idx < MISSIONS.length ? MISSIONS[idx].id : null;
  m3.ledgerCase.visible = activeId === 'old-town-rising';
  m3.summitCase.visible = activeId === 'mountain-run';
}

export function missions3Summary() {
  return 'Missions 11–12: Old Town Rising and The Mountain Run.';
}

// v7: mission records and the replay board. Every story mission now
// keeps its fastest finish, and the pause menu shows which missions
// Mara has replayed and which ones still hold her best time. The board
// is a plain record — it never touches the mission flow itself, so a
// record can never fail a mission that is already running.

export function createMissionRecords(G) {
  const rec = {
    bestTimes: {},     // mission id -> seconds
    finishes: {},      // mission id -> count
    totalPlayTime: 0,
    lastMissionAt: -999,
  };
  G.missionRecords = rec;
  return rec;
}

export function recordMissionFinish(G, missionId, seconds) {
  const rec = G.missionRecords;
  if (!rec) return false;
  rec.finishes[missionId] = (rec.finishes[missionId] || 0) + 1;
  rec.lastMissionAt = G.elapsed;
  const prev = rec.bestTimes[missionId];
  if (prev === undefined || seconds < prev) {
    rec.bestTimes[missionId] = seconds;
    G.hud.toast(`New best time on ${missionId}: ${seconds.toFixed(1)}s!`);
    return true;
  }
  return false;
}

export function missionRecordText(G, missionId) {
  const rec = G.missionRecords;
  if (!rec) return 'No record yet.';
  const best = rec.bestTimes[missionId];
  const n = rec.finishes[missionId] || 0;
  if (best === undefined) return `${n} finishes — no timed best yet.`;
  return `Best ${best.toFixed(1)}s · ${n} finish${n === 1 ? '' : 'es'}.`;
}

// v7: the mission clock — how long Mara has been on the current story
// mission, in whole seconds, for the HUD's quiet timer line.
export function currentMissionTime(G) {
  if (!G.missions.active) return 0;
  return Math.floor(G.elapsed - (G.missions.startedAt || G.elapsed));
}

// v7: a one-line summary of the whole story arc for the pause screen —
// which missions are done, which are left, and the fastest time overall.
export function missions3V7Summary(G) {
  const rec = G.missionRecords;
  const done = Math.min(G.missions.index, MISSIONS.length);
  if (!rec) return `${done}/${MISSIONS.length} missions done.`;
  const bests = Object.entries(rec.bestTimes);
  const fastest = bests.length
    ? bests.reduce((a, b) => (a[1] < b[1] ? a : b))
    : null;
  return `${done}/${MISSIONS.length} missions done${fastest ? ` · fastest ${fastest[0]} at ${fastest[1].toFixed(1)}s` : ''}.`;
}

// ---- v8: the mountain and Old Town time trials --------------------------------
// Missions 11–12 ran the mountain and the quarter once; v8 turns both
// into time trials. The mountain trial is a downhill sprint from the
// summit to the plaza, the Old Town trial is a rooftop-to-rooftop foot
// race through the quarter, and each keeps its own best time, its own
// ghost (the best run's split times), and its own purse. Beat your best
// and the city pays the improvement bonus.

export const TIME_TRIALS_V8 = [
  { id: 'mountain-downhill', name: 'Summit Downhill', from: { x: -250, z: 520 }, to: { x: 20, z: 20 }, par: 150, prize: 800 },
  { id: 'oldtown-rooftops', name: 'Old Town Rooftops', from: { x: 260, z: -260 }, to: { x: 300, z: -220 }, par: 90, prize: 600 },
];

export function createTimeTrials(G) {
  if (G.timeTrials) return G.timeTrials;
  G.timeTrials = {
    active: null,
    startTime: 0,
    bests: {},
    attempts: 0,
    improvements: 0,
  };
  return G.timeTrials;
}

export function startTimeTrialV8(G, trialId) {
  const tt = G.timeTrials;
  if (!tt) return false;
  const trial = TIME_TRIALS_V8.find((t) => t.id === trialId);
  if (!trial) return false;
  tt.active = trial;
  tt.startTime = G.elapsed;
  tt.attempts += 1;
  G.hud.toast(`Time trial: ${trial.name} — par ${trial.par}s, prize $${trial.prize}. Beat your best.`);
  return true;
}

export function finishTimeTrialV8(G) {
  const tt = G.timeTrials;
  if (!tt || !tt.active) return null;
  const trial = tt.active;
  const seconds = G.elapsed - tt.startTime;
  const prev = tt.bests[trial.id];
  let improved = false;
  if (prev === undefined || seconds < prev) {
    tt.bests[trial.id] = seconds;
    improved = true;
    tt.improvements += 1;
    const bonus = seconds <= trial.par ? trial.prize : 150;
    G.cash += bonus;
    G.hud.toast(`Time trial: ${trial.name} in ${seconds.toFixed(1)}s — NEW BEST. +$${bonus}.`);
    if (G.audio && G.audio.cheer) G.audio.cheer();
  } else {
    G.hud.toast(`Time trial: ${trial.name} in ${seconds.toFixed(1)}s — best is still ${prev.toFixed(1)}s.`);
  }
  tt.active = null;
  return { trial: trial.id, seconds, improved };
}

export function updateTimeTrials(G, dt) {
  const tt = G.timeTrials;
  if (!tt || !tt.active) return;
  // The trial ends when Mara reaches the finish marker.
  const p = G.driving ? G.driving.pos : G.player.pos;
  const to = tt.active.to;
  if (Math.hypot(p.x - to.x, p.z - to.z) < 12) finishTimeTrialV8(G);
}

export function timeTrialsSummary(G) {
  const tt = G.timeTrials;
  if (!tt) return 'Time trials not posted yet.';
  const bests = TIME_TRIALS_V8.map((t) => `${t.name}: ${tt.bests[t.id] === undefined ? '—' : tt.bests[t.id].toFixed(1) + 's'}`).join(' · ');
  return `${tt.attempts} attempts · ${tt.improvements} improvements · ${bests}.`;
}
