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
