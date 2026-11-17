// audio.js — all sound is synthesized with WebAudio: no audio files, no
// network. Engine hum follows the car's speed, sirens wail while wanted,
// footsteps and gunshots are shaped noise, and a quiet synthwave loop (bass
// + pads + hats) plays under the city. Everything is guarded: if the audio
// context cannot start (headless, no gesture yet), every call is a no-op.

export function createAudio(G) {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: null,
    musicStep: 0,
    started: false,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.startMusic();
        this.started = true;
        return true;
      } catch (err) {
        return false;
      }
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
    },

    // v3: stop the ambient loop (the radio takes over the airwaves).
    stopMusic() {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    },

    // --- one-shot helpers -------------------------------------------------
    tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (err) { /* audio is best-effort */ }
    },

    noise(dur, vol = 0.3, filterFreq = 1200, type = 'lowpass') {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = type; f.frequency.value = filterFreq;
        const g = this.ctx.createGain();
        g.gain.value = vol;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start(t);
      } catch (err) { /* best-effort */ }
    },

    // --- named game sounds -----------------------------------------------
    footstep() { this.noise(0.07, 0.08, 500); },
    punch() { this.noise(0.12, 0.25, 300); this.tone(120, 0.1, 'sine', 0.15, 60); },
    gunshot() { this.noise(0.16, 0.5, 2400, 'highpass'); this.tone(180, 0.12, 'square', 0.2, 50); },
    emptyClick() { this.tone(900, 0.05, 'square', 0.12); },
    reload() { this.tone(500, 0.06, 'square', 0.12); setTimeout(() => this.tone(700, 0.06, 'square', 0.12), 120); },
    weaponSwitch() { this.tone(350, 0.05, 'triangle', 0.12, 500); },
    crash() { this.noise(0.35, 0.5, 400); this.tone(90, 0.3, 'sawtooth', 0.2, 40); },
    horn() { this.tone(370, 0.25, 'square', 0.15); this.tone(440, 0.25, 'square', 0.12); },
    doorSlam() { this.noise(0.1, 0.3, 250); this.tone(110, 0.12, 'sine', 0.2, 55); },
    hurt() { this.tone(220, 0.18, 'sawtooth', 0.18, 110); },
    pickup() { this.tone(660, 0.12, 'sine', 0.2); setTimeout(() => this.tone(990, 0.18, 'sine', 0.2), 110); },
    missionSting() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.18), i * 110));
    },
    missionComplete() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2), i * 130));
    },
    sirenBurst() { this.tone(700, 0.5, 'sine', 0.12, 1100); },
    engineStart() { this.tone(60, 0.4, 'sawtooth', 0.18, 140); this.noise(0.25, 0.2, 600); },

    // --- continuous loops --------------------------------------------------
    engineStartLoop() {
      if (!this.ensure()) return;
      try {
        if (this.engineOsc) return;
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 420;
        this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
        this.engineOsc.start();
      } catch (err) { /* best-effort */ }
    },
    engineSet(speedNorm) {
      if (!this.engineOsc || !this.engineGain) return;
      try {
        this.engineOsc.frequency.value = 55 + speedNorm * 130;
        this.engineGain.gain.value = 0.05 + speedNorm * 0.06;
      } catch (err) { /* best-effort */ }
    },
    engineStop() {
      if (!this.engineOsc) return;
      try { this.engineOsc.stop(); } catch (err) {}
      this.engineOsc = null; this.engineGain = null;
    },
    sirenStart() {
      if (!this.ensure() || this.sirenOsc) return;
      try {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenOsc.frequency.value = 750;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0.05;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.7;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain); lfoGain.connect(this.sirenOsc.frequency);
        this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
        this.sirenOsc.start(); lfo.start();
        this.sirenLfo = lfo;
      } catch (err) { /* best-effort */ }
    },
    sirenStop() {
      if (!this.sirenOsc) return;
      try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch (err) {}
      this.sirenOsc = null; this.sirenGain = null; this.sirenLfo = null;
    },

    // --- ambient music: a slow synthwave loop, scheduled step by step -----
    startMusic() {
      if (this.musicTimer) return;
      // Am – F – C – G, one bar per chord, 8th-note bass + soft pad.
      const chords = [
        [110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8],
      ];
      const bassNotes = [55, 43.65, 65.4, 49];
      const stepDur = 0.42;
      this.musicTimer = setInterval(() => {
        if (this.muted || !this.ctx || document.hidden) return;
        const bar = Math.floor(this.musicStep / 8) % 4;
        const step = this.musicStep % 8;
        try {
          const t = this.ctx.currentTime;
          // Bass on every step, quiet.
          const b = this.ctx.createOscillator();
          b.type = 'triangle';
          b.frequency.value = bassNotes[bar] * (step % 2 ? 1 : 1);
          const bg = this.ctx.createGain();
          bg.gain.setValueAtTime(0.05, t);
          bg.gain.exponentialRampToValueAtTime(0.001, t + stepDur);
          b.connect(bg); bg.connect(this.master);
          b.start(t); b.stop(t + stepDur);
          // Pad at the bar start.
          if (step === 0) {
            for (const f of chords[bar]) {
              const p = this.ctx.createOscillator();
              p.type = 'sine'; p.frequency.value = f * 2;
              const pg = this.ctx.createGain();
              pg.gain.setValueAtTime(0.028, t);
              pg.gain.linearRampToValueAtTime(0.028, t + stepDur * 7);
              pg.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 8);
              p.connect(pg); pg.connect(this.master);
              p.start(t); p.stop(t + stepDur * 8);
            }
          }
          // Hat tick on off-beats.
          if (step % 2 === 1) this.noise(0.03, 0.02, 6000, 'highpass');
        } catch (err) { /* best-effort */ }
        this.musicStep++;
      }, stepDur * 1000);
    },
  };
  G.audio = audio;
  return audio;
}
