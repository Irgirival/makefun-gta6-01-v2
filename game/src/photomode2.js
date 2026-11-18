// photomode2.js — photo mode v2 (v6). While the camera is out (B), Mara
// can bend the scene itself: N cycles the time of day (dawn, noon, golden
// hour, blue hour, midnight) and T cycles the weather (clear, rain, haze,
// snow), so every shot can be staged. A landmark checklist in the photo
// overlay tracks which of Solmar's sights she has framed — a landmark
// counts as framed when she snaps a photo within sight of it.

export const PHOTO_TIMES = [
  { name: 'Dawn', hour: 6.5 },
  { name: 'Noon', hour: 12 },
  { name: 'Golden hour', hour: 17.5 },
  { name: 'Blue hour', hour: 19.5 },
  { name: 'Midnight', hour: 0.5 },
];

export const PHOTO_WEATHERS = ['clear', 'light', 'haze', 'snow'];

export function createPhotoMode2(G) {
  const pm2 = {
    timeIndex: 1,
    weatherIndex: 0,
    framed: {},
    snapsAtLandmarks: 0,
    panel: null,
  };
  // A small overlay that rides with the photo-mode HUD.
  const panel = document.createElement('div');
  panel.id = 'photoMode2Panel';
  panel.style.cssText = 'position:fixed;left:16px;top:120px;z-index:15;display:none;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:10px 12px;color:#fff;font-family:"Segoe UI",Arial,sans-serif;font-size:13px;line-height:1.6;pointer-events:none;';
  panel.innerHTML = '<b style="color:#ffd23e;">PHOTO MODE v2</b><div id="pm2Time"></div><div id="pm2Weather"></div><div id="pm2Landmarks"></div><div style="color:#9fc3dd;">N — time of day · T — weather · Space — snap</div>';
  document.body.appendChild(panel);
  pm2.panel = panel;
  G.photomode2 = pm2;
  return pm2;
}

function landmarkList(G) {
  const list = [];
  if (G.oldtown) for (const lm of G.oldtown.landmarks) list.push(lm);
  list.push({ id: 'lighthouse', name: 'Isla Verde Lighthouse', x: -205, z: 565 });
  list.push({ id: 'airport', name: 'Solmar Airfield', x: -235, z: -276 });
  return list;
}

export function updatePhotoMode2(G, dt) {
  const pm2 = G.photomode2;
  if (!pm2) return;
  const active = !!(G.photomode && G.photomode.active);
  pm2.panel.style.display = active ? 'block' : 'none';
  if (!active) return;
  // N cycles the time of day while the camera is out.
  if (G.input.pressed('radio')) {
    pm2.timeIndex = (pm2.timeIndex + 1) % PHOTO_TIMES.length;
    const t = PHOTO_TIMES[pm2.timeIndex];
    if (G.daynight && G.daynight.setTimeOfDay) G.daynight.setTimeOfDay(t.hour);
    else G.clockMinutes = t.hour * 60;
    G.hud.toast(`Photo time — ${t.name}.`);
  }
  // T cycles the weather while the camera is out.
  if (G.input.pressed('weather')) {
    pm2.weatherIndex = (pm2.weatherIndex + 1) % PHOTO_WEATHERS.length;
    const mode = PHOTO_WEATHERS[pm2.weatherIndex];
    if (G.weather && G.weather.setMode) G.weather.setMode(mode);
    else if (G.weather) G.weather.mode = mode;
    G.hud.toast(`Photo weather — ${mode}.`);
  }
  // Landmark checklist: framed when the camera is near one.
  const cam = G.camera.position;
  let framed = 0;
  const rows = [];
  for (const lm of landmarkList(G)) {
    const near = Math.hypot(lm.x - cam.x, lm.z - cam.z) < 60;
    if (near && !pm2.framed[lm.id]) {
      pm2.framed[lm.id] = true;
      pm2.snapsAtLandmarks++;
      G.hud.toast(`Framed — ${lm.name}`);
    }
    if (pm2.framed[lm.id]) framed++;
    rows.push(`${pm2.framed[lm.id] ? '✓' : '·'} ${lm.name}`);
  }
  const timeEl = pm2.panel.querySelector('#pm2Time');
  const weatherEl = pm2.panel.querySelector('#pm2Weather');
  const lmEl = pm2.panel.querySelector('#pm2Landmarks');
  if (timeEl) timeEl.textContent = `Time: ${PHOTO_TIMES[pm2.timeIndex].name}`;
  if (weatherEl) weatherEl.textContent = `Weather: ${PHOTO_WEATHERS[pm2.weatherIndex]}`;
  if (lmEl) lmEl.innerHTML = `Landmarks framed ${framed}/${landmarkList(G).length}<br>` + rows.join('<br>');
}

export function photomode2Summary(G) {
  const pm2 = G.photomode2;
  if (!pm2) return 'Photo v2 — not built.';
  const total = landmarkList(G).length;
  return `Photo v2: ${Object.keys(pm2.framed).length}/${total} landmarks framed · ${pm2.snapsAtLandmarks} snaps at landmarks`;
}

// v7: the golden-hour bonus and the photo walk. A snap taken during
// golden hour (17:00–18:00) pays double landmark credit, and the photo
// walk is a guided route — five stops in order, fountain to lighthouse
// to summit to market to runway, with a $500 bonus for walking the
// whole route in one session. The walk is the city's own tour, and Mara
// is its best customer.

export const PHOTO_WALK_STOPS = [
  { id: 'fountain', name: 'Plaza Fountain', x: 20, z: 20 },
  { id: 'lighthouse', name: 'Isla Verde Lighthouse', x: -205, z: 565 },
  { id: 'summit', name: 'Summit Viewpoint', x: -214, z: 542 },
  { id: 'market', name: 'Old Town Market', x: 260, z: -212 },
  { id: 'runway', name: 'Airfield Runway', x: -260, z: -260 },
];

export function createPhotoWalk(G) {
  const walk = {
    stopIndex: 0,
    done: false,
    snapsOnWalk: 0,
    bonusPaid: false,
  };
  G.photoWalk = walk;
  return walk;
}

// v7: call when Mara snaps a photo — advances the walk when the snap
// lands at the current stop, and pays the $500 route bonus at the end.
export function recordPhotoWalkSnap(G) {
  const walk = G.photoWalk;
  if (!walk || walk.done) return null;
  const p = G.player.pos;
  const stop = PHOTO_WALK_STOPS[walk.stopIndex];
  if (!stop) return null;
  if (Math.hypot(p.x - stop.x, p.z - stop.z) < 35) {
    walk.snapsOnWalk += 1;
    walk.stopIndex += 1;
    if (walk.stopIndex >= PHOTO_WALK_STOPS.length) {
      walk.done = true;
      if (!walk.bonusPaid) {
        walk.bonusPaid = true;
        G.cash += 500;
        G.hud.toast('Photo walk complete! All five stops — the city pays $500 for the tour.');
      }
      return { stop, complete: true };
    }
    G.hud.toast(`Photo walk: ${stop.name} framed. Next stop: ${PHOTO_WALK_STOPS[walk.stopIndex].name}.`);
    return { stop, complete: false };
  }
  return null;
}

// v7: golden-hour snaps are worth double — the landmark checklist counts
// them twice, so the golden hour is the fastest way to fill the board.
export function goldenHourBonusActive(G) {
  const mins = ((G.clockMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return mins >= 17 * 60 && mins < 18 * 60;
}

export function photoWalkSummary(G) {
  const walk = G.photoWalk;
  if (!walk) return 'The photo walk has not begun.';
  if (walk.done) return 'Photo walk complete — all five stops framed.';
  const next = PHOTO_WALK_STOPS[walk.stopIndex];
  return `Photo walk ${walk.stopIndex}/5 — next: ${next ? next.name : 'done'}.`;
}

// ---- v8: the photo walk's second route and the blue-hour bonus ----------------
// The v7 photo walk had five stops; v8 adds a second route — the harbor
// at blue hour, four stops from the lighthouse to the marina — and the
// blue-hour bonus: any snapshot taken in the hour after sunset pays
// double, because the light is the best in the city and the shortest.
// The two routes share one camera roll, so the walk is a collection now.

export const PHOTO_WALK_2_STOPS = [
  { id: 'lighthouse', name: 'The Lighthouse', x: -205, z: 565 },
  { id: 'boardwalk', name: 'Boardwalk Lights', x: -160, z: 505 },
  { id: 'marina', name: 'Marina at Dusk', x: -115, z: 555 },
  { id: 'harbor-buoy', name: 'Harbor Buoy', x: 352, z: 40 },
];

export function createPhotoWalk2(G) {
  if (G.photoWalk2) return G.photoWalk2;
  G.photoWalk2 = {
    stopIndex: 0,
    done: false,
    snaps: 0,
    blueHourBonus: 0,
  };
  return G.photoWalk2;
}

export function isBlueHourV8(G) {
  const hour = Math.floor((G.clockMinutes % (24 * 60)) / 60);
  return hour === 19; // the hour after sunset
}

export function recordPhotoWalk2Snap(G) {
  const w2 = G.photoWalk2;
  if (!w2 || w2.done) return false;
  const stop = PHOTO_WALK_2_STOPS[w2.stopIndex];
  if (!stop) return false;
  const p = G.player.pos;
  if (Math.hypot(p.x - stop.x, p.z - stop.z) > 14) {
    G.hud.toast(`Photo walk 2: get closer to ${stop.name} to frame it.`);
    return false;
  }
  w2.stopIndex += 1;
  w2.snaps += 1;
  let pay = 150;
  if (isBlueHourV8(G)) {
    pay = 300;
    w2.blueHourBonus += 150;
    G.hud.toast(`BLUE HOUR — ${stop.name} in the best light in the city. +$${pay}.`);
  } else {
    G.hud.toast(`Photo walk 2: ${stop.name} framed. +$${pay}. (${w2.stopIndex}/${PHOTO_WALK_2_STOPS.length})`);
  }
  G.cash += pay;
  if (w2.stopIndex >= PHOTO_WALK_2_STOPS.length) {
    w2.done = true;
    G.cash += 600;
    G.hud.toast('PHOTO WALK 2 COMPLETE — the harbor at blue hour, all four stops. +$600.');
    if (G.audio && G.audio.cheer) G.audio.cheer();
  }
  return true;
}

export function photoWalk2Summary(G) {
  const w2 = G.photoWalk2;
  if (!w2) return 'Photo walk 2 not started yet.';
  return w2.done
    ? `Complete — all four harbor stops · blue-hour bonus $${w2.blueHourBonus}`
    : `${w2.stopIndex}/${PHOTO_WALK_2_STOPS.length} stops · next: ${PHOTO_WALK_2_STOPS[w2.stopIndex].name} · blue hour ${isBlueHourV8(G) ? 'NOW' : 'at 19:00'}.`;
}
