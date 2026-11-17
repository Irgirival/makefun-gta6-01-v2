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
    if (G.daynight && G.daynight.setTimeOfDay) G.daynight.setTimeOfDay(G, t.hour);
    else G.clockMinutes = t.hour * 60;
    G.hud.toast(`Photo time — ${t.name}.`);
  }
  // T cycles the weather while the camera is out.
  if (G.input.pressed('weather')) {
    pm2.weatherIndex = (pm2.weatherIndex + 1) % PHOTO_WEATHERS.length;
    const mode = PHOTO_WEATHERS[pm2.weatherIndex];
    if (G.weather && G.weather.setMode) G.weather.setMode(G, mode);
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
