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
export const EPILOGUE_TEXT = 'Seven missions, three race wins waiting, a garage full of tuned steel, ' +
  'an island across the bridge and a boat in the marina. Mara Solano came back to Solmar with ' +
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
  // alarm trips the moment Mara is supposed to be running.
  if (m.active && m.index === MISSIONS.length - 1 && m.step === 3 && f.heatAddedForStep !== 3) {
    f.heatAddedForStep = 3;
    G.wanted.addHeat(48, 'casino alarm');
    G.hud.toast('THE ALARM IS UP — 3 stars and climbing! Lose them, then get to the plaza.');
  }
  if (m.step !== f.lastStep) {
    f.lastStep = m.step;
    if (!(m.active && m.index === MISSIONS.length - 1 && m.step === 3)) {
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
