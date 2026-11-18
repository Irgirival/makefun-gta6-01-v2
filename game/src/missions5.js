// missions5.js — the v8 finale arc (Missions 15–16). After the Harbor
// Syndicate falls, a bigger fish surfaces: the Meridian Trust, a private
// bank that laundered every Syndicate dollar and now owns half the harbor
// board. Mission 15, "The Long Con", has Mara run a three-act con on the
// Trust itself — a fake VIP pickup, a vault audit, and a switch of the
// real ledger for a forgery. Mission 16, "Solmar Sunrise", is the dawn
// finale: Mara drives the evidence to the courthouse at sunrise while the
// Trust's last fixers chase her, then walks into the plaza as the city
// wakes up to a Solmar that is finally hers. Both missions plug into the
// same MISSIONS list and step types the story already uses, and finishing
// Mission 16 retires the whole sixteen-mission arc with a sunrise ceremony
// at the plaza fountain.

import * as THREE from 'three';
import { MISSIONS, startMission } from './missions.js';
import { OLD_TOWN } from './oldtown.js';

export const MERIDIAN_TRUST = {
  bank: { x: 120, z: 60 },
  vault: { x: 140, z: 100 },
  courthouse: { x: 60, z: -180 },
  plaza: { x: 20, z: 20 },
  hotel: { x: 300, z: 60 },
  airport: { x: -235, z: -276 },
};

export const SUNRISE_FINALE = {
  courthouseSteps: { x: 60, z: -180 },
  fountain: { x: 20, z: 20 },
  beachDawn: { x: -120, z: 360 },
};

const MISSION_15 = {
  id: 'the-long-con',
  title: 'Mission 15 — The Long Con',
  reward: 12000,
  intro: ['LENA: "The Syndicate was the wallet. The Meridian Trust is the bank — every dirty dollar in Solmar passed through their vault."',
    'VIC (phone): "So we con the bank. You walk in as a VIP client, Lena walks out with the real ledger, and the Trust gets a very pretty forgery."',
    'MARA: "A bank that launders for gangsters, conned by the gangster it laundered for. Poetry."'],
  steps: [
    { type: 'goto', target: MERIDIAN_TRUST.bank, radius: 12, text: 'Reach the Meridian Trust bank', hint: 'Downtown, the marble tower by the museum. Dress sharp — walk, don\'t run.' },
    { type: 'dwell', target: MERIDIAN_TRUST.bank, radius: 10, seconds: 10, text: 'Play the VIP client while Lena works the vault', hint: 'Hold the marker for 10 seconds. Do not leave the lobby — the clerk is watching.' },
    { type: 'collect', target: MERIDIAN_TRUST.vault, radius: 6, text: 'Grab the real ledger from the vault room', hint: 'Walk into the glowing case behind the bank.' },
    { type: 'timed', target: MERIDIAN_TRUST.hotel, radius: 12, seconds: 80, text: 'Race the forgery to the harbor hotel', hint: '80 seconds. The Trust\'s auditors are already on the road.' },
    { type: 'drive', target: MERIDIAN_TRUST.bank, radius: 12, text: 'Bring the ledger home to the bank steps — the con is the delivery', hint: 'Back to the Trust. Smile for the cameras on the way out.' },
  ],
  outro: ['LENA: "The forgery is in their vault and the real ledger is in my bag. The Trust just audited itself."',
    'MARA: "One more dawn, Lena. Then this city is ours for real."'],
};

const MISSION_16 = {
  id: 'solmar-sunrise',
  title: 'Mission 16 — Solmar Sunrise',
  reward: 15000,
  intro: ['LENA: "The ledger goes to the courthouse at sunrise. Every name, every bribe, every account — on the record, in daylight."',
    'VIC (phone): "The Trust\'s fixers will come for you on that drive. Every cruiser they own. Hold the wheel, Mara."',
    'MARA: "Sunrise at the courthouse. Then coffee at the plaza. I\'ve waited sixteen missions for this morning."'],
  steps: [
    { type: 'goto', target: SUNRISE_FINALE.beachDawn, radius: 12, text: 'Meet Lena at the beach bar at dawn', hint: 'South beach, the bar by the sand. The sun is coming up — so are you.' },
    { type: 'collect', target: SUNRISE_FINALE.beachDawn, radius: 6, text: 'Take the evidence case from Lena', hint: 'Walk into the glowing case. This is the whole story, in one box.' },
    { type: 'wanted', target: SUNRISE_FINALE.courthouseSteps, radius: 14, text: 'Lose the Trust fixers, then reach the courthouse', hint: 'Break line of sight and stay hidden until the heat clears — then drive north.' },
    { type: 'timed', target: SUNRISE_FINALE.courthouseSteps, radius: 12, seconds: 90, text: 'Deliver the evidence before the court opens', hint: '90 seconds from the last fixer to the courthouse steps.' },
    { type: 'drive', target: SUNRISE_FINALE.fountain, radius: 12, text: 'Walk into the sunrise at the plaza fountain', hint: 'The plaza. The fountain. The whole city, watching you win.' },
  ],
  outro: ['LENA: "It\'s on the record. The Trust, the Syndicate, all of it — sunrise, and it\'s over."',
    'MARA: "Solmar City, population: us. And this time it\'s forever."'],
};

export const FINALE_REWARDS = { mission15: 12000, mission16: 15000, ceremony: 5000 };

export function registerMissions15And16(G) {
  if (!MISSIONS.some((m) => m.id === 'the-long-con')) MISSIONS.push(MISSION_15);
  if (!MISSIONS.some((m) => m.id === 'solmar-sunrise')) MISSIONS.push(MISSION_16);

  if (!G.missions5) {
    const mkCase = (x, z, color) => {
      const g = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3),
        new THREE.MeshLambertMaterial({ color, emissive: 0x552200 }));
      crate.position.y = 1.0;
      g.add(crate);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.18, 1.36),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
      lid.position.y = 1.5;
      g.add(lid);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }));
      halo.position.y = 1.0;
      g.add(halo);
      g.position.set(x, 0, z);
      G.scene.add(g);
      return g;
    };
    // The evidence case waits at the beach bar for Mission 16, and the
    // forgery case waits behind the bank for Mission 15's vault step.
    const evidence = mkCase(SUNRISE_FINALE.beachDawn.x + 3, SUNRISE_FINALE.beachDawn.z + 2, 0xffd23e);
    const forgery = mkCase(MERIDIAN_TRUST.vault.x + 2, MERIDIAN_TRUST.vault.z + 2, 0x2aff8a);
    // The sunrise ceremony: twelve gold sparks that orbit the plaza
    // fountain once the finale is done, so the plaza remembers the dawn.
    const sparks = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd23e }));
      s.position.set(SUNRISE_FINALE.fountain.x, 3, SUNRISE_FINALE.fountain.z);
      s.visible = false;
      G.scene.add(s);
      sparks.push(s);
    }
    G.missions5 = {
      evidenceCase: evidence,
      forgeryCase: forgery,
      ceremonySparks: sparks,
      spin: 0,
      finaleDone: false,
      ceremonyPaid: false,
      conSwaps: 0,
      dawnRuns: 0,
      bestDawnSeconds: null,
    };
  }
  return [MISSION_15, MISSION_16];
}

// The con's middle act: swapping the real ledger for the forgery is a
// two-handed job, so the vault step also flips a "swapped" flag the radio
// news and the safehouse ledger both read later.
export function recordConSwap(G) {
  const m5 = G.missions5;
  if (!m5) return 0;
  m5.conSwaps += 1;
  return m5.conSwaps;
}

export function conSwapCount(G) {
  return G.missions5 ? G.missions5.conSwaps : 0;
}

// The dawn run's clock: Mission 16's courthouse sprint is timed by the
// same mission timer, but the best dawn time is kept here, separately,
// so replays of the finale chase their own record.
export function recordDawnRun(G, seconds) {
  const m5 = G.missions5;
  if (!m5) return false;
  m5.dawnRuns += 1;
  if (m5.bestDawnSeconds === null || seconds < m5.bestDawnSeconds) {
    m5.bestDawnSeconds = seconds;
    return true;
  }
  return false;
}

export function dawnRunText(G) {
  const m5 = G.missions5;
  if (!m5 || m5.bestDawnSeconds === null) return 'no dawn run yet';
  return `best dawn run ${m5.bestDawnSeconds.toFixed(1)}s over ${m5.dawnRuns} run${m5.dawnRuns === 1 ? '' : 's'}`;
}

// The sunrise ceremony: once Mission 16 completes, the plaza fountain
// gets its gold sparks, the city pays a ceremony bonus, and the epilogue
// line changes for the rest of the save. Called from the finale update
// the first frame the mission index passes 16.
export function runSunriseCeremony(G) {
  const m5 = G.missions5;
  if (!m5 || m5.finaleDone) return false;
  m5.finaleDone = true;
  for (const s of m5.ceremonySparks) s.visible = true;
  if (!m5.ceremonyPaid) {
    m5.ceremonyPaid = true;
    G.cash += FINALE_REWARDS.ceremony;
    G.hud.toast(`Sunrise ceremony — the city pays Mara a $${FINALE_REWARDS.ceremony} honorarium. Solmar is yours.`);
  }
  if (G.audio && G.audio.cheer) G.audio.cheer();
  return true;
}

export function finaleDone(G) {
  return !!(G.missions5 && G.missions5.finaleDone);
}

export function updateMissions5(G, dt) {
  const m5 = G.missions5;
  if (!m5) return;
  m5.spin += dt;
  m5.evidenceCase.rotation.y = m5.spin;
  m5.forgeryCase.rotation.y = -m5.spin * 0.8;
  const idx = G.missions.index;
  const activeId = idx < MISSIONS.length ? MISSIONS[idx].id : null;
  m5.evidenceCase.visible = activeId === 'solmar-sunrise';
  m5.forgeryCase.visible = activeId === 'the-long-con';
  // The finale is done the moment the mission index passes Mission 16.
  if (idx >= 16 && !m5.finaleDone) runSunriseCeremony(G);
  // Ceremony sparks orbit the fountain, rising and falling like slow
  // fireworks, for as long as the save remembers the dawn.
  if (m5.finaleDone) {
    for (let i = 0; i < m5.ceremonySparks.length; i++) {
      const a = m5.spin * 0.5 + (i / m5.ceremonySparks.length) * Math.PI * 2;
      const s = m5.ceremonySparks[i];
      s.position.set(
        SUNRISE_FINALE.fountain.x + Math.cos(a) * 6,
        2.5 + Math.sin(m5.spin * 1.3 + i) * 1.6,
        SUNRISE_FINALE.fountain.z + Math.sin(a) * 6,
      );
    }
  }
  // The vault step of the con flips the swap flag when Mara reaches the
  // forgery case while Mission 15 is live and on its collect step.
  if (activeId === 'the-long-con' && G.missions.step === 2) {
    const p = G.player.pos;
    const dx = p.x - MERIDIAN_TRUST.vault.x;
    const dz = p.z - MERIDIAN_TRUST.vault.z;
    if (dx * dx + dz * dz < 36 && m5.conSwaps === 0) recordConSwap(G);
  }
}

// Replay the finale: Mission 16 can be run again for half its reward,
// and the dawn clock restarts so the best-dawn record can be chased.
export function replayFinale(G) {
  if (!G.missions5) return false;
  if (G.missions.index < 16) return false; // the finale must be finished first
  startMission(G, 15);
  G.hud.toast('Finale replay: The Long Con, then the sunrise — half reward, full glory.');
  return true;
}

export function missions5Summary(G) {
  const done = Math.min(G.missions.index, 16);
  const m5 = G.missions5;
  const dawn = m5 && m5.bestDawnSeconds !== null ? ` · ${dawnRunText(G)}` : '';
  return `Missions 15–16: The Long Con and Solmar Sunrise — ${done}/16 missions done${m5 && m5.finaleDone ? ' · finale complete' : ''}${dawn}.`;
}

// The whole sixteen-mission story in one breath, for the pause screen's
// third page and the end screen when Mara finishes the arc.
export function fullStorySoFar(G) {
  const done = Math.min(G.missions.index, MISSIONS.length);
  const names = MISSIONS.slice(0, done).map((m) => m.title.replace(/^Mission \d+ — /, ''));
  const tail = G.missions5 && G.missions5.finaleDone
    ? ' — and the sunrise ceremony at the plaza fountain.'
    : '';
  return `${done}/${MISSIONS.length} missions — ${names.join(' · ') || 'the story has not begun'}${tail}`;
}

export function missions5V8Summary(G) {
  const m5 = G.missions5;
  if (!m5) return 'Missions 15–16 not registered yet.';
  return `finaleDone=${m5.finaleDone} conSwaps=${m5.conSwaps} dawnRuns=${m5.dawnRuns} bestDawn=${m5.bestDawnSeconds === null ? '—' : m5.bestDawnSeconds.toFixed(1) + 's'}`;
}
