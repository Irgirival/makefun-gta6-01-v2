// radio.js — Solmar radio: three switchable synthesized stations, all
// WebAudio, no audio files. Press N to cycle: Solmar FM (synthwave drive
// music), Radio Verde (latin groove), and Talk Solmar (a late-night host
// with callers). Each station runs its own scheduler on the shared audio
// context; switching stops the old loop and starts the new one. The
// ambient synthwave loop the game starts with is the radio's off-air
// state — turning the radio on replaces it, turning it off brings it back.

const STATIONS = [
  { id: 'off', name: 'Radio Off', blurb: 'Just the city and the engine.' },
  { id: 'solmar-fm', name: 'Solmar FM 88.4 — Synthwave', blurb: 'Neon nights, driving bass.' },
  { id: 'verde', name: 'Radio Verde 101.1 — Latin', blurb: 'Salsa heat for the boardwalk.' },
  { id: 'talk', name: 'Talk Solmar 720 AM', blurb: 'Callers, complaints and conspiracies.' },
  // v5: two more dial positions — Harbor Rock for the fast lanes, and
  // Solmar After Dark for the slow cruise home.
  { id: 'harbor-rock', name: 'Harbor Rock 104.7', blurb: 'Guitars loud enough for the docks.' },
  { id: 'after-dark', name: 'Solmar After Dark 95.6 — Funk', blurb: 'Slow bass for the midnight avenues.' },
];

// Chord roots per station, in Hz: synthwave Am–F–C–G, latin Dm–Bb–F–C,
// talk: a single sleepy pad that never resolves.
const STATION_CHORDS = {
  'solmar-fm': [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]],
  verde: [[73.4, 87.3, 110], [58.3, 73.4, 87.3], [87.3, 110, 130.8], [65.4, 82.4, 98]],
  talk: [[110, 164.8], [110, 164.8], [98, 146.8], [110, 164.8]],
  // v5: rock runs on power-chord roots (E–G–A–B), after-dark on slow
  // seventh chords that never hurry anywhere.
  'harbor-rock': [[82.4, 123.5, 164.8], [98, 146.8, 196], [110, 164.8, 220], [123.5, 185, 246.9]],
  'after-dark': [[55, 65.4, 82.4, 98], [49, 58.3, 73.4, 87.3], [65.4, 82.4, 98, 116.5], [58.3, 73.4, 87.3, 103.8]],
};
const STATION_BASS = {
  'solmar-fm': [55, 43.65, 65.4, 49],
  verde: [73.4, 58.3, 87.3, 65.4],
  talk: [55, 55, 49, 55],
  'harbor-rock': [82.4, 98, 110, 123.5],
  'after-dark': [55, 49, 65.4, 58.3],
};
const STATION_STEP = { 'solmar-fm': 0.42, verde: 0.3, talk: 0.6, 'harbor-rock': 0.32, 'after-dark': 0.55 };

// What the DJ says when you tune in — each station has a voice.
const DJ_IDENTS = {
  'solmar-fm': [
    'NEON NIGHTS (Solmar FM): "You\'re riding with Neon Nights — synthwave for the midnight avenues."',
    'NEON NIGHTS: "That bass is for everyone doing 90 down the harbor road right now."',
  ],
  verde: [
    'DJ MARISOL (Radio Verde): "¡Buenas noches, Solmar! Salsa for the boardwalk, straight from Isla Verde."',
    'DJ MARISOL: "If your hips aren\'t moving, turn it up — the lighthouse can hear you."',
  ],
  talk: [
    'HOST CAL (Talk Solmar): "Line 2, you\'re on the air — yes, the mayor\'s boat is real, and no, I won\'t say whose."',
    'HOST CAL: "Caller says the pigeons downtown are government drones. Caller, I believe you."',
  ],
  'harbor-rock': [
    'DJ AXEL (Harbor Rock): "That was the Dockside Kings — turn it up, the cranes are listening."',
    'DJ AXEL: "Harbor Rock, 104.7 — if your rear-view mirror isn\'t shaking, you\'re doing it wrong."',
  ],
  'after-dark': [
    'VELVET (After Dark): "Slow it down, Solmar. The night is long and the bass is longer."',
    'VELVET: "You\'re listening to After Dark — funk for the drive home, whenever home is."',
  ],
};

export function createRadio(G) {
  const radio = {
    index: 0,
    timer: null,
    step: 0,
    identCount: 0, // which DJ greeting plays next, per station visit
    // v5: the Solmar News bulletin clock — a traffic and crime flash that
    // cuts into whatever station is playing, on a slow timer.
    bulletinTimer: 60,
    bulletinCount: 0,
    station() { return STATIONS[this.index]; },
  };
  G.radio = radio;
  return radio;
}

function playNote(G, freq, dur, type, vol, when = 0) {
  const a = G.audio;
  if (!a.ctx || !a.master) return;
  try {
    const t = a.ctx.currentTime + when;
    const o = a.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.master);
    o.start(t); o.stop(t + dur);
  } catch (err) { /* best-effort */ }
}

function playHat(G, vol = 0.02) {
  const a = G.audio;
  if (!a.ctx || !a.master) return;
  try {
    const t = a.ctx.currentTime;
    const len = Math.floor(a.ctx.sampleRate * 0.03);
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const f = a.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    const g = a.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.master);
    src.start(t);
  } catch (err) { /* best-effort */ }
}

function stopRadio(G) {
  const r = G.radio;
  if (r.timer) { clearInterval(r.timer); r.timer = null; }
  r.step = 0;
}

function startStation(G, station) {
  const a = G.audio;
  const chords = STATION_CHORDS[station.id];
  const bass = STATION_BASS[station.id];
  const stepDur = STATION_STEP[station.id];
  const r = G.radio;
  r.timer = setInterval(() => {
    if (a.muted || !a.ctx || document.hidden) return;
    const bar = Math.floor(r.step / 8) % 4;
    const step = r.step % 8;
    try {
      // Bass on every step.
      playNote(G, bass[bar] * (step % 4 === 3 ? 1.5 : 1), stepDur, 'triangle', 0.06);
      // Pad at the bar start.
      if (step === 0) {
        for (const f of chords[bar]) playNote(G, f * 2, stepDur * 7, 'sine', 0.022);
      }
      if (station.id === 'solmar-fm') {
        // Arpeggio sparkle on the off-beats.
        if (step % 2 === 1) playNote(G, chords[bar][step % 3] * 4, 0.18, 'square', 0.014);
        if (step % 2 === 1) playHat(G, 0.02);
      } else if (station.id === 'verde') {
        // Syncopated montuno: two quick chord stabs per bar.
        if (step === 2 || step === 5) {
          for (const f of chords[bar]) playNote(G, f * 2, 0.22, 'triangle', 0.03);
        }
        if (step % 2 === 0) playHat(G, 0.03);
        // Clave knock on 0, 3 and 6.
        if (step === 0 || step === 3 || step === 6) playNote(G, 1800, 0.04, 'square', 0.02);
      } else if (station.id === 'talk') {
        // The host "talks": a wandering voice-like blip line, quiet.
        if (step % 2 === 0) {
          const wobble = 220 + Math.sin(r.step * 0.9) * 40 + (r.step % 5) * 8;
          playNote(G, wobble, 0.28, 'sawtooth', 0.012);
        }
        // Occasional caller beep.
        if (r.step % 32 === 24) playNote(G, 1200, 0.15, 'sine', 0.03);
      } else if (station.id === 'harbor-rock') {
        // Power-chord crunch: root + fifth on the beat, a lead lick on the
        // off-beat, and a snare crack on 2 and 4.
        if (step % 2 === 0) {
          playNote(G, bass[bar] * 2, 0.3, 'sawtooth', 0.045);
          playNote(G, bass[bar] * 3, 0.3, 'sawtooth', 0.03);
        }
        if (step % 4 === 3) playNote(G, chords[bar][2] * 2, 0.2, 'square', 0.02);
        if (step === 2 || step === 6) playHat(G, 0.05);
        if (step % 8 === 6) playNote(G, chords[bar][1] * 4, 0.14, 'square', 0.018);
      } else if (station.id === 'after-dark') {
        // Slow funk: a laid-back bass riff, a wah-like chord stab on the
        // off-beat, and a soft rim click keeping time.
        if (step === 0 || step === 3 || step === 5) {
          playNote(G, bass[bar] * 2, 0.5, 'triangle', 0.06);
        }
        if (step === 2 || step === 6) {
          for (const f of chords[bar]) playNote(G, f * 2, 0.3, 'sine', 0.02);
        }
        if (step % 2 === 1) playNote(G, 900, 0.03, 'square', 0.012);
        if (step === 7) playNote(G, chords[bar][3] * 4, 0.25, 'sine', 0.018);
      }
    } catch (err) { /* best-effort */ }
    r.step++;
  }, stepDur * 1000);
}

export function cycleRadio(G) {
  const r = G.radio;
  if (!r) return;
  stopRadio(G);
  r.index = (r.index + 1) % STATIONS.length;
  const station = STATIONS[r.index];
  if (station.id === 'off') {
    // Back to the ambient loop the game started with.
    if (G.audio.ctx && !G.audio.musicTimer) G.audio.startMusic();
    G.hud.toast('Radio off — just the city and the engine.');
  } else {
    // The ambient loop steps aside while a station plays.
    G.audio.stopMusic();
    if (G.audio.ensure()) startStation(G, station);
    G.hud.toast(`${station.name} — ${station.blurb} (N to change station)`);
    // The DJ greets you on tune-in, alternating lines per visit.
    const lines = DJ_IDENTS[station.id] || [];
    if (lines.length) {
      const pick = lines[G.radio.identCount++ % lines.length];
      G.hud.showDialogue([pick, `${station.name} — ${station.blurb}`]);
    }
  }
  G.save.save(G);
}

export function radioStatusText(G) {
  if (!G.radio) return 'Radio Off';
  return G.radio.station().name;
}

// v5: the Solmar News bulletin — a short flash that reacts to the city as
// it is right now: the wanted level, the story's progress, the weather and
// the time of day. It cuts into any station, plays its sting, and hands
// the air back to the DJ. The lines rotate so the same flash never repeats
// twice in a row.
const BULLETIN_POOLS = {
  calm: [
    'SOLMAR NEWS: "Traffic is moving well on the harbor road tonight. The beachfront is clear, the boardwalk is busy, and the PD reports a quiet shift."',
    'SOLMAR NEWS: "The lighthouse on Isla Verde sweeps the bay on schedule. Ferry crossings are running on time."',
    'SOLMAR NEWS: "City Hall reminds drivers: the plaza fountain is not a parking space, no matter how good it looks."',
  ],
  heat: [
    'SOLMAR NEWS: "The PD is pursuing a suspect through downtown — drivers are asked to pull over and let the cruisers through."',
    'SOLMAR NEWS: "A red Vortex GT was last seen near the harbor. Officers describe the driver as \'extremely fast and extremely unbothered\'."',
    'SOLMAR NEWS: "The air unit is up over the city. If you can hear the rotors, you are already in the story."',
  ],
  story: [
    'SOLMAR NEWS: "Sources say the Verde Casino\'s vault is under review after a string of incidents. The house declines to comment."',
    'SOLMAR NEWS: "The airfield reports a cargo plane departed ahead of schedule. Officials call it \'routine\'. Nobody believes them."',
    'SOLMAR NEWS: "Street racing on the plaza circuit drew a crowd last night. The PD says it will be there next time. So will the crowd."',
  ],
  rain: [
    'SOLMAR NEWS: "Rain over the bay is making the roads slick — the PD asks drivers to slow down. The racers, as usual, did not get the message."',
    'SOLMAR NEWS: "A storm front is rolling in off the water. The lighthouse keeper says the bay will be rough until morning."',
  ],
};

export function radioBulletin(G, force = false) {
  const r = G.radio;
  if (!r || r.station().id === 'off') return null;
  const stars = G.wanted ? G.wanted.stars : 0;
  const missionsDone = G.missions ? G.missions.index : 0;
  const raining = G.weather && G.weather.mode !== 'clear';
  let pool = BULLETIN_POOLS.calm;
  let tag = 'calm';
  if (stars >= 3) { pool = BULLETIN_POOLS.heat; tag = 'heat'; }
  else if (raining) { pool = BULLETIN_POOLS.rain; tag = 'rain'; }
  else if (missionsDone >= 6) { pool = BULLETIN_POOLS.story; tag = 'story'; }
  const line = pool[r.bulletinCount++ % pool.length];
  G.audio.bulletinSting();
  G.hud.showDialogue([line, `${r.station().name} — bulletin · ${tag === 'heat' ? 'the PD is busy' : tag === 'rain' ? 'weather watch' : tag === 'story' ? 'the city is talking' : 'all quiet in Solmar'}`]);
  return line;
}

export function updateRadio(G, dt) {
  if (!G.radio) return;
  if (G.mode === 'playing' && G.input.pressed('radio')) cycleRadio(G);
  // v5: the bulletin clock only runs while a station is actually playing.
  const r = G.radio;
  if (G.mode === 'playing' && r.station().id !== 'off') {
    r.bulletinTimer -= dt;
    if (r.bulletinTimer <= 0) {
      r.bulletinTimer = G.config.bulletinInterval;
      radioBulletin(G);
    }
  }
}
