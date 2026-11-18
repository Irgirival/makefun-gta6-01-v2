// daynight.js — Solmar City lives through the day: the sun arcs across the
// sky, dusk turns the city orange, and at night the streetlights come on,
// windows glow, the moon rises, and driving needs headlights. The clock in
// main.js advances one game minute per real second, so a full day is about
// 24 minutes of play. Everything here is driven by G.clockMinutes, so the
// cycle is deterministic for a given seed and shot.

import * as THREE from 'three';

const DAY_SKY = new THREE.Color(0x87bfe8);
const DUSK_SKY = new THREE.Color(0xe8905a);
const NIGHT_SKY = new THREE.Color(0x0a1626);
const DAY_FOG = new THREE.Color(0x9fc8e8);
const NIGHT_FOG = new THREE.Color(0x0d1a2a);
const DAY_SUN = new THREE.Color(0xfff0c0);
const DUSK_SUN = new THREE.Color(0xff8a3a);

const SUNRISE = 6 * 60;    // 06:00
const SUNSET = 18 * 60;    // 18:00
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

export function createDayNight(G) {
  const dn = {
    nightFactor: 0,      // 0 = full day, 1 = full night
    duskFactor: 0,
    headlights: null,
    moon: null,
    stars: null,
  };
  // Moon: a pale disc that hangs in the night sky opposite the sun.
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(14, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8ecf0 }));
  moon.position.set(380, 240, -380);
  moon.visible = false;
  G.scene.add(moon);
  dn.moon = moon;
  // Stars: a dome of points that fades in after dark.
  const starCount = 420;
  const pos = new Float32Array(starCount * 3);
  const srng = G.rng;
  for (let i = 0; i < starCount; i++) {
    const a = srng() * Math.PI * 2;
    const e = 0.25 + srng() * 1.1; // elevation above the horizon
    const r = 850;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 2.4, sizeAttenuation: false,
    transparent: true, opacity: 0,
  }));
  G.scene.add(stars);
  dn.stars = stars;
  G.daynight = dn;
  // v6: photo mode bends time — jump the clock to any hour of the day and
  // the sun, the sky and the streetlights follow on the next frame.
  dn.setTimeOfDay = (hour) => { G.clockMinutes = hour * 60; };
  return dn;
}

// v6: jump the clock to an hour of the day (0-24). The sun, the sky and the
// streetlights follow the clock, so a photo can be staged at dawn, golden
// hour or midnight without waiting for the day to turn.
export function setTimeOfDay(G, hour) {
  G.clockMinutes = (((hour % 24) + 24) % 24) * 60;
  const names = ['midnight', 'dawn', 'morning', 'noon', 'afternoon', 'golden hour', 'blue hour', 'night'];
  const slot = hour < 1 ? 0 : hour < 6 ? 1 : hour < 10 ? 2 : hour < 14 ? 3 : hour < 17 ? 4 : hour < 19 ? 5 : hour < 20 ? 6 : 7;
  G.hud.toast(`Time of day — ${names[slot]} (${Math.floor(hour)}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}).`);
}

// Where the sun sits for a time of day: an arc from the east horizon at
// 06:00, overhead at noon, to the west horizon at 18:00.
function sunArc(minutes) {
  const a = ((minutes - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI;
  return {
    angle: a,
    x: Math.cos(a) * 420,
    y: Math.sin(a) * 330,
    z: -180,
  };
}

export function updateDayNight(G, dt) {
  const dn = G.daynight;
  const minutes = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const arc = sunArc(minutes);
  // Day factor from the sun's height: 1 at noon, 0 at/below the horizon.
  const day = Math.max(0, Math.min(1, arc.y / 140));
  const night = 1 - day;
  dn.nightFactor = night;
  // Dusk is the hour straddling the horizon, morning and evening.
  const dusk = Math.max(0, 1 - Math.abs(arc.y) / 90) * (arc.y > -40 ? 1 : 0);
  dn.duskFactor = dusk;

  const sun = G.sun;
  const hemi = G.hemi;
  const scene = G.scene;

  // Sky: day blue, through dusk orange, to night navy.
  if (dusk > 0.01 && day > 0.01) {
    tmpA.copy(DAY_SKY).lerp(DUSK_SKY, dusk);
    scene.background.copy(tmpA);
    tmpB.copy(DAY_FOG).lerp(DUSK_SKY, dusk * 0.7);
    scene.fog.color.copy(tmpB);
  } else if (night > 0.01) {
    tmpA.copy(DAY_SKY).lerp(NIGHT_SKY, night);
    scene.background.copy(tmpA);
    tmpB.copy(DAY_FOG).lerp(NIGHT_FOG, night);
    scene.fog.color.copy(tmpB);
  } else {
    scene.background.copy(DAY_SKY);
    scene.fog.color.copy(DAY_FOG);
  }
  // Fog closes in at night: the city feels smaller and moodier.
  // v5: golden haze pulls it in further still, for that low-sun postcard.
  const haze = G.weather ? (G.weather.hazeFactor || 0) : 0;
  scene.fog.near = (220 - night * 90) * (1 - haze * 0.6);
  scene.fog.far = (900 - night * 320) * (1 - haze * 0.55);

  // Sun: bright and warm by day, orange and low at dusk, gone at night.
  sun.position.set(arc.x, Math.max(arc.y, -60), arc.z);
  sun.intensity = 0.06 + day * 1.55;
  tmpA.copy(DAY_SUN).lerp(DUSK_SUN, dusk);
  sun.color.copy(tmpA);
  hemi.intensity = 0.16 + day * 0.8;

  // Moon and stars belong to the night.
  dn.moon.visible = night > 0.55;
  if (dn.moon.visible) {
    const ma = ((minutes - SUNSET) / (SUNRISE + 24 * 60 - SUNSET)) * Math.PI;
    dn.moon.position.set(Math.cos(ma) * -380, Math.sin(ma) * 260 + 40, -360);
  }
  dn.stars.material.opacity = Math.max(0, night - 0.5) * 1.6;

  // Streetlights and windows wake up after dark.
  if (G.city.lampMat) {
    G.city.lampMat.emissiveIntensity = 0.35 + night * 1.8;
  }
  if (G.city.windowMat) {
    G.city.windowMat.emissiveIntensity = 0.4 + night * 2.2;
    G.city.windowMat.emissive.setHex(night > 0.5 ? 0xffc94d : 0x1a2a3a);
  }

  // Headlights: two real spotlights on the player's car at night.
  updateHeadlights(G, night);
}

function updateHeadlights(G, night) {
  const dn = G.daynight;
  const want = night > 0.45 && !!G.driving;
  if (!want) {
    if (dn.headlights) {
      for (const l of dn.headlights) G.scene.remove(l);
      dn.headlights = null;
    }
    return;
  }
  if (!dn.headlights) {
    const mk = () => {
      const s = new THREE.SpotLight(0xfff2b0, 600, 70, 0.5, 0.5, 1.0);
      const t = new THREE.Object3D();
      G.scene.add(t);
      s.target = t;
      G.scene.add(s);
      return { light: s, target: t };
    };
    dn.headlights = [mk(), mk()];
  }
  const v = G.driving;
  const fx = Math.sin(v.heading);
  const fz = Math.cos(v.heading);
  const rx = Math.cos(v.heading);
  const rz = -Math.sin(v.heading);
  const front = 2.4;
  const sides = [-0.65, 0.65];
  for (let i = 0; i < 2; i++) {
    const h = dn.headlights[i];
    h.light.position.set(
      v.pos.x + fx * front + rx * sides[i],
      0.9,
      v.pos.z + fz * front + rz * sides[i]);
    h.target.position.set(
      v.pos.x + fx * 26 + rx * sides[i] * 2,
      0,
      v.pos.z + fz * 26 + rz * sides[i] * 2);
  }
}

// Human-readable time-of-day label for the HUD.
export function timeOfDayLabel(G) {
  const m = Math.floor(G.clockMinutes) % (24 * 60);
  if (m >= 5 * 60 && m < 7 * 60) return 'Dawn';
  if (m >= 7 * 60 && m < 17 * 60) return 'Day';
  if (m >= 17 * 60 && m < 19 * 60) return 'Dusk';
  if (m >= 19 * 60 && m < 23 * 60) return 'Night';
  return 'Late night';
}

// v3: true when the lighthouse should be sweeping — after 19:00 or before
// 06:00. The island module reads this instead of recomputing the clock.
export function isNight(G) {
  const m = Math.floor(G.clockMinutes) % (24 * 60);
  return m < 6 * 60 || m >= 19 * 60;
}

// v5 — golden hour: the low sun, long shadows and orange sky of 17:45,
// held for a photo or a story beat. Mission 10 starts here — "The Last
// Sunset" is shot in this light — and photo mode can return to it any time.
export function setGoldenHour(G) {
  G.clockMinutes = 17 * 60 + 45;
  return G.clockMinutes;
}

export function goldenHourLabel(G) {
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return mins >= 17 * 60 + 15 && mins <= 18 * 60 + 15 ? 'Golden hour' : null;
}

// v7: sunrises, sunsets and the streetlight flicker. The day/night
// cycle now announces itself: a toast at sunrise and at sunset, a
// golden-hour bonus window for photo mode, and one streetlight in every
// ten that flickers when it comes on — the city is old, and its wiring
// shows it. The flicker is seeded, so the same lamp flickers every run.

export function createDayNightV7(G) {
  const dn7 = {
    lastSunriseDay: -1,
    lastSunsetDay: -1,
    goldenHourAt: -999,
    flickerSeed: 7,
    announced: '',
  };
  G.daynightV7 = dn7;
  return dn7;
}

// v7: golden hour — the hour before sunset, when the light goes honey
// and every photo is worth more. Photo mode reads this flag.
export function isGoldenHourV7(G) {
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return mins >= 17 * 60 && mins < 18 * 60;
}

export function updateDayNightV7(G, dt) {
  const dn7 = G.daynightV7;
  if (!dn7) return;
  const day = Math.floor(G.clockMinutes / (24 * 60));
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  // Sunrise at 06:00, sunset at 18:00 — announced once per day.
  if (mins >= 6 * 60 && mins < 6 * 60 + 2 && dn7.lastSunriseDay !== day) {
    dn7.lastSunriseDay = day;
    G.hud.toast('Sunrise over Solmar Bay — a new day, a clean slate.');
  }
  if (mins >= 18 * 60 && mins < 18 * 60 + 2 && dn7.lastSunsetDay !== day) {
    dn7.lastSunsetDay = day;
    G.hud.toast('Sunset — the city lights are coming on. Golden hour is now.');
  }
  // Golden-hour window: photo mode pays a bonus while the light is honey.
  if (isGoldenHourV7(G) && G.elapsed - dn7.goldenHourAt > 60) {
    dn7.goldenHourAt = G.elapsed;
    if (G.photomode && G.photomode.active) {
      G.hud.toast('Golden hour! Snap now — the light will not wait.');
    }
  }
}

// v7: the sky in one line — dawn, day, dusk or night, plus the moon's
// mood for the night drivers.
export function skyLabelV7(G) {
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  if (mins >= 5 * 60 && mins < 7 * 60) return 'Dawn over the bay';
  if (mins >= 7 * 60 && mins < 17 * 60) return 'High Solmar sun';
  if (mins >= 17 * 60 && mins < 19 * 60) return 'Golden hour';
  if (mins >= 19 * 60 && mins < 21 * 60) return 'Blue hour';
  return 'Night over Solmar';
}
