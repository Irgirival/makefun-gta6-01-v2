// finale.js — Mission 7, "The Verde Heist": the story finale and the
// epilogue. Mara lifts the Verde casino's weekend take from the harbor,
// outruns a city-wide alarm to the airfield, and brings the money home to
// the plaza — then the epilogue screen closes her arc for good. It plugs
// into the story list exactly like Mission 6 did, reusing the goto /
// timed / collect / wanted step machinery, and adds its own twist: the
// moment the getaway step starts, the alarm goes up and the PD comes in
// force, so the wanted step has real heat to lose.

import { MISSIONS } from './missions.js';

const AIRPORT = { terminal: { x: -235, z: -276 }, runwayEast: { x: -201, z: -260 } };
const DOCK = { x: 300, z: -80 };
const PLAZA = { x: 20, z: 20 };
const MARINA = { x: -115, z: 555 };

const MISSION_7 = {
  id: 'verde-heist',
  title: 'Mission 7 — The Verde Heist',
  reward: 6000,
  intro: [
    'LENA: "The Verde casino moves its weekend take by boat tonight. One bag, one harbor, one getaway."',
    'VIC (phone): "Harbor first. Then the airfield — the plane is our way out if it goes loud."',
    'MARA: "It always goes loud. That\'s why they call me."',
  ],
  steps: [
    { type: 'goto', target: MARINA, radius: 10, text: 'Reach the Isla Verde marina — the take arrives by boat', hint: 'South across the causeway bridge, or sail there. The gold marker shows the way.' },
    { type: 'collect', target: MARINA, radius: 6, text: 'Grab the money bag from the marina pier', hint: 'Walk into the glowing bag on the pier.' },
    { type: 'timed', target: AIRPORT.runwayEast, radius: 12, seconds: 90, text: 'Run the bag to the airfield before the plane leaves', hint: '90 seconds. The whole city is about to wake up.' },
    { type: 'wanted', target: PLAZA, radius: 12, text: 'Lose the police, then bring the money home to the plaza', hint: 'Break line of sight, stay hidden until the stars clear — then walk into the plaza like you own it.' },
    { type: 'drive', target: PLAZA, radius: 10, text: 'Stand in the plaza — Solmar is yours', hint: 'The city lights are all yours now.' },
  ],
  outro: [
    'LENA: "Six thousand, clean. The Verde will never know what hit it."',
    'VIC: "The runway, the harbor, the island — Mara, you own every corner of this city now."',
    'MARA: "Solmar City, population: us. And the story? The story is just getting started."',
  ],
};

export const EPILOGUE_TITLE = 'SOLMAR IS YOURS';
export const EPILOGUE_TEXT = 'Nine missions, three race wins waiting, a garage full of tuned steel, ' +
  'an island across the bridge, a boat in the marina, a helicopter on the pad and a ' +
  'championship to defend. Mara Solano came back to Solmar with ' +
  'nothing — and now the city is hers. Keep playing: the streets never sleep.';

export function registerFinale(G) {
  if (!MISSIONS.some((m) => m.id === 'verde-heist')) MISSIONS.push(MISSION_7);
  const finale = {
    heatAddedForStep: -1,
    epilogueShown: false,
    lastStep: -1,
  };
  G.finale = finale;
  return finale;
}

export function updateFinale(G, dt) {
  const f = G.finale;
  if (!f) return;
  const m = G.missions;
  // The getaway step (index 3, the wanted step) starts hot: the casino
  // alarm trips the moment Mara is supposed to be running. Checked by
  // mission id, not by list position: v4 appends Missions 8-9 after this.
  if (m.active && MISSIONS[m.index]?.id === 'verde-heist' && m.step === 3 && f.heatAddedForStep !== 3) {
    f.heatAddedForStep = 3;
    G.wanted.addHeat(48, 'casino alarm');
    G.hud.toast('THE ALARM IS UP — 3 stars and climbing! Lose them, then get to the plaza.');
  }
  if (m.step !== f.lastStep) {
    f.lastStep = m.step;
    if (!(m.active && MISSIONS[m.index]?.id === 'verde-heist' && m.step === 3)) {
      // Keep the flag honest across retries of the same step.
      if (m.step !== 3) f.heatAddedForStep = -1;
    }
  }
  // Epilogue: the story screen is set in gameOver (main.js) now, because
  // stepWorld stops running once the mode flips to 'over'. This hook stays
  // as a backstop for any later path that reaches the story screen.
  if (m.index >= MISSIONS.length && G.mode === 'over' && G.endKind === 'story' && !f.epilogueShown) {
    f.epilogueShown = true;
    const title = document.getElementById('endTitle');
    const text = document.getElementById('endText');
    if (title) { title.textContent = EPILOGUE_TITLE; title.className = 'done'; }
    if (text) text.textContent = EPILOGUE_TEXT;
  }
}

// ---- v8: the epilogue jobs board ---------------------------------------------
// After the Verde Heist, the finale registered the story as done; v8
// gives the done story a second life. The jobs board at the plaza posts
// three rotating gigs — a courier sprint, a lookout shift and a getaway
// drill — each paying a little and each keeping the city alive after the
// credits. The board refreshes every game hour, and a completed board
// (all three gigs in one day) pays the day's bonus.

export const EPILOGUE_GIGS_V8 = [
  { id: 'sprint', name: 'Courier Sprint', pay: 250, desc: 'One parcel, one timer, no excuses.' },
  { id: 'lookout', name: 'Lookout Shift', pay: 200, desc: 'Watch the harbor hotel for an hour. Boring pays.' },
  { id: 'getaway', name: 'Getaway Drill', pay: 350, desc: 'Lose a two-star tail and meet Lena at the plaza.' },
];

export function registerFinaleV8(G) {
  if (G.finaleV8) return G.finaleV8;
  G.finaleV8 = {
    gigsDoneToday: [],
    daysCompleted: 0,
    boardHour: -1,
    gigIndex: 0,
    totalGigs: 0,
    boardBonusPaid: 0,
  };
  return G.finaleV8;
}

export function currentGigV8(G) {
  const f8 = G.finaleV8;
  if (!f8) return null;
  return EPILOGUE_GIGS_V8[f8.gigIndex % EPILOGUE_GIGS_V8.length];
}

export function completeGigV8(G, gigId) {
  const f8 = G.finaleV8;
  if (!f8) return false;
  const gig = EPILOGUE_GIGS_V8.find((g) => g.id === gigId);
  if (!gig) return false;
  if (f8.gigsDoneToday.includes(gigId)) return false;
  f8.gigsDoneToday.push(gigId);
  f8.totalGigs += 1;
  G.cash += gig.pay;
  G.hud.toast(`Epilogue gig done: ${gig.name} — +$${gig.pay}.`);
  if (f8.gigsDoneToday.length >= EPILOGUE_GIGS_V8.length) {
    f8.daysCompleted += 1;
    f8.boardBonusPaid += 500;
    G.cash += 500;
    f8.gigsDoneToday = [];
    G.hud.toast('Full board — all three gigs in one day. Day bonus +$500.');
  }
  return true;
}

export function updateFinaleV8(G, dt) {
  const f8 = G.finaleV8;
  if (!f8) return;
  // The board rotates every game hour: a new gig leads the list.
  const hour = Math.floor((G.clockMinutes % (24 * 60)) / 60);
  if (hour !== f8.boardHour) {
    f8.boardHour = hour;
    f8.gigIndex = (f8.gigIndex + 1) % EPILOGUE_GIGS_V8.length;
  }
}

export function finaleV8Summary(G) {
  const f8 = G.finaleV8;
  if (!f8) return 'Epilogue board not posted yet.';
  const gig = currentGigV8(G);
  return `${f8.totalGigs} gigs done · ${f8.daysCompleted} full boards · next gig: ${gig ? gig.name + ' ($' + gig.pay + ')' : '—'}.`;
}
