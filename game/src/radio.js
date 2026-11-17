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
];

// Chord roots per station, in Hz: synthwave Am–F–C–G, latin Dm–Bb–F–C,
// talk: a single sleepy pad that never resolves.
const STATION_CHORDS = {
  'solmar-fm': [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]],
  verde: [[73.4, 87.3, 110], [58.3, 73.4, 87.3], [87.3, 110, 130.8], [65.4, 82.4, 98]],
  talk: [[110, 164.8], [110, 164.8], [98, 146.8], [110, 164.8]],
};
const STATION_BASS = {
  'solmar-fm': [55, 43.65, 65.4, 49],
  verde: [73.4, 58.3, 87.3, 65.4],
  talk: [55, 55, 49, 55],
};
const STATION_STEP = { 'solmar-fm': 0.42, verde: 0.3, talk: 0.6 };

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
};

export function createRadio(G) {
  const radio = {
    index: 0,
    timer: null,
    step: 0,
    identCount: 0, // which DJ greeting plays next, per station visit
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

export function updateRadio(G, dt) {
  if (!G.radio) return;
  if (G.mode === 'playing' && G.input.pressed('radio')) cycleRadio(G);
}
