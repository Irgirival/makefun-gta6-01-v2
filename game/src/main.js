// main.js — Solmar City entry point. Builds the game context G, wires every
// system together (city, player, vehicles, traffic, pedestrians, police,
// missions, combat, HUD, minimap, audio, saves, screenshot poses), runs the
// frame loop, and owns the game state machine: title -> playing -> paused /
// busted / wasted / mission failed / story complete.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { buildCity } from './city.js';
import { createPlayer, updatePlayer } from './player.js';
import {
  createVehicle, spawnParkedCars, updateVehicle,
  nearestEnterableCar, enterCar, exitCar, updateDriveCamera,
} from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import {
  spawnPedestrians, updatePedestrians,
  spawnPed, spawnFleeingPed, scarePeds, nearestPed, removePed,
} from './pedestrians.js';
import { createWanted, updatePolice, nearestPoliceDistance } from './police.js';
import {
  createMissions, startMission, updateMissions, retryMission, currentMission, MISSIONS,
} from './missions.js';
import { createHelicopter, updateHelicopter } from './helicopter.js';
import { createDayNight, updateDayNight } from './daynight.js';
import { buildAirport } from './airport.js';
import { spawnMotorcycles, updateMotorcycles } from './motorcycle.js';
import { createWeather, updateWeather } from './weather.js';
import { registerExtraMissions, updateSideMissions } from './missions2.js';
import { spawnCrowds, spawnBuses, updateCrowds } from './crowds.js';
import { createCombat, updateCombat, damagePlayer } from './combat.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { applyShot, poseShotCamera, SHOT_NAMES } from './shots.js';
// v3 systems: street racing, Vic's garage, Isla Verde, boats, safehouse,
// radio stations, vigilante contracts and the Verde Heist finale.
import { createRaces, updateRaces } from './races.js';
import { createGarage, updateGarage, applyGarageToCar, refreshShowroom } from './garage.js';
import { buildIslaVerde, updateIslaVerde } from './islaverde.js';
import { createBoats, updateBoats, nearestBoat, enterBoat, exitBoat } from './boats.js';
import { createSafehouse, updateSafehouse, applyOutfitPerk, SHOP_OUTFITS, closeSafehouseShop } from './safehouse.js';
import { createRadio, updateRadio } from './radio.js';
import { createVigilante, updateVigilante } from './vigilante.js';
import { registerFinale, updateFinale, EPILOGUE_TEXT } from './finale.js';
// v3: nitro boost for Mara's tuned car, and the harbor boat tour.
import { createNitro, updateNitro, refillNitro } from './nitro.js';
import { createStats, updateStats } from './stats.js';
// v4 systems: the heist arc (Missions 8-9), flyable helicopters, the
// street-race league, jet skis, the Verde Casino, street events and
// fog + thunderstorms.
import { registerHeist, updateHeist } from './heist.js';
import { createFlyHelis, updateFlyHeli, nearestFlyHeli, enterFlyHeli, exitFlyHeli } from './flyheli.js';
import { createRaceLeague, updateRaceLeague } from './raceleague.js';
import { createJetSkis, updateJetSkis, nearestJetSki, enterJetSki, exitJetSki } from './jetski.js';
import { createCasino, casinoNearDoor, openCasino, closeCasino } from './casino.js';
import { createStreetEvents, updateStreetEvents } from './streetevents.js';
import { createStorm, updateStorm } from './storm.js';
import { createPhotoMode, updatePhotoMode, togglePhotoMode } from './photomode.js';
import { createCasinoGames, closeCasinoGames } from './casinogames.js';
import { registerMission10 } from './missions2.js';
import { buildOldTown, updateOldTown } from './oldtown.js';
import { registerMissions11And12, updateMissions3 } from './missions3.js';
import { createVipJob, updateVipJob } from './vipjob.js';
import { createBusFire, updateBusFire } from './busfire.js';
import { createPoker, updatePoker } from './poker.js';
import { createMilitary, updateMilitary } from './military.js';
import { createCollection, registerCollectedCar, callCollectedCar } from './carcollection.js';
import { createPhotoMode2, updatePhotoMode2 } from './photomode2.js';
import { buildMountain, updateMountain } from './mountain.js';
import { createTalkRadio, updateTalkRadio } from './talkradio.js';
import { spawnMarketShoppers, spawnOldTownTourists } from './pedestrians.js';
import { createOldTownSafehouse, updateOldTownSafehouse } from './safehouse.js';
import { nearestCharter, boardCharter, updateCharter } from './airport.js';
import { updateNewsHeli } from './helicopter.js';
import { applyShotOldTown } from './shots.js';

// Debug hooks the verification scripts use (and nothing else): the page
// records every error so a headless run can prove zero console errors.
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));
window.__shotReady = false;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shotName = params.get('shot');

// ---- Game context ---------------------------------------------------------
const G = {
  config: CONFIG,
  seed,
  rng: makeRng(seed),
  mode: 'title',           // title | playing | paused | over
  endKind: null,           // busted | wasted | failed | story
  elapsed: 0,
  clockMinutes: CONFIG.clockStartMinutes,
  cash: CONFIG.startCash,
  health: CONFIG.playerHealth,
  armor: 0,
  vehicles: [],
  peds: [],
  policeCars: [],
  policeFoot: [],
  driving: null,
  boating: null,         // v3: the boat Mara is sailing, if any
  flying: null,          // v4: the helicopter Mara is flying, if any
  jetski: null,          // v4: the jet ski Mara is riding, if any
  shot: null,
  shotFrames: 0,
  cameraKick: 0,
};

G.gameOver = (kind, cause) => gameOver(kind, cause);
// v3: the live game context, for headless verification only (tests teleport
// Mara, start races and read system state through it).
window.__solmar = G;

// ---- Renderer / scene ------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
scene.fog = new THREE.Fog(0x9fc8e8, 220, 900);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(40, 30, 80);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0c0, 1.6);
sun.position.set(-200, 320, -160);
scene.add(sun);
// The day/night cycle moves these lights; keep them on the game context.
G.sun = sun;
G.hemi = hemi;

G.scene = scene;
G.camera = camera;
G.renderer = renderer;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Systems ---------------------------------------------------------------
G.input = createInput(canvas);
createSave(G);                       // sets G.save and G.saveData
G.audio = createAudio(G);
G.hud = createHud(G);
G.minimap = createMinimap(G);
buildCity(G);
G.player = createPlayer(G);
G.pedestrians = { spawnPed, spawnFleeingPed, scarePeds, nearestPed, removePed };
createWanted(G);
createCombat(G);
createMissions(G);
spawnParkedCars(G);
spawnTraffic(G);
spawnPedestrians(G);
// v2 systems, created last so the v1 placements above keep their seeds.
buildAirport(G);
createDayNight(G);
createWeather(G);
createHelicopter(G);
registerExtraMissions(G);
spawnMotorcycles(G);
spawnCrowds(G);
spawnBuses(G);
// v3 systems, created last so the v1/v2 placements above keep their seeds.
createRaces(G);
createGarage(G);
buildIslaVerde(G);
createBoats(G);
createSafehouse(G);
createRadio(G);
createVigilante(G);
registerFinale(G);
createNitro(G);
createStats(G);
// v4 systems, created last so the v1–v3 placements above keep their seeds.
registerHeist(G);
createFlyHelis(G);
createRaceLeague(G);
createJetSkis(G);
createCasino(G);
createStreetEvents(G);
createStorm(G);
// v5 systems, created last so the v1–v4 placements above keep their seeds.
createPhotoMode(G);
createCasinoGames(G);
registerMission10(G);

// v6 systems, created last so the v1–v5 placements above keep their seeds.
buildOldTown(G);
registerMissions11And12(G);
createVipJob(G);
createBusFire(G);
createPoker(G);
createMilitary(G);
createCollection(G);
createPhotoMode2(G);
buildMountain(G);
createTalkRadio(G);
spawnMarketShoppers(G);
spawnOldTownTourists(G);
createOldTownSafehouse(G);

// Restore a save, or start fresh at the plaza.
if (G.saveData) {
  G.cash = G.saveData.cash ?? CONFIG.startCash;
  G.health = G.saveData.health ?? CONFIG.playerHealth;
  G.armor = G.saveData.armor ?? 0;
  G.clockMinutes = G.saveData.clockMinutes ?? CONFIG.clockStartMinutes;
  // v3 progress: racing ladder, garage tuning, radio, bounties, safehouse.
  if (G.saveData.races) {
    Object.assign(G.races.ladder, {
      wins: G.saveData.races.wins ?? 0,
      podiums: G.saveData.races.podiums ?? 0,
      races: G.saveData.races.races ?? 0,
      best: G.saveData.races.best ?? null,
      bestTimes: G.saveData.races.bestTimes ?? {},
    });
    G.races.circuitIndex = G.saveData.races.circuitIndex ?? 0;
  }
  if (G.saveData.garage) {
    Object.assign(G.garage, {
      paintIndex: G.saveData.garage.paintIndex ?? 0,
      engineLevel: G.saveData.garage.engineLevel ?? 0,
      armorLevel: G.saveData.garage.armorLevel ?? 0,
      ownedId: G.saveData.garage.ownedId ?? null,
      ownedType: G.saveData.garage.ownedType ?? null,
      neon: G.saveData.garage.neon ?? false,
      neonColor: G.saveData.garage.neonColor ?? 0,
    });
  }
  if (G.saveData.radioIndex) G.radio.index = G.saveData.radioIndex;
  if (G.saveData.vigilante) {
    G.vigilante.bounties = G.saveData.vigilante.bounties ?? 0;
    G.vigilante.earned = G.saveData.vigilante.earned ?? 0;
  }
  if (G.saveData.safehouseVisits) G.safehouse.visits = G.saveData.safehouseVisits;
  // v5: restore the wardrobe, the camera roll, the table floor, the nitro
  // bottle and the vigilante contract count with the rest of the career.
  if (G.saveData.races) {
    G.races.ladder.nightWins = G.saveData.races.nightWins ?? 0;
  }
  if (G.saveData.garage) {
    G.garage.suspensionLevel = G.saveData.garage.suspensionLevel ?? 0;
  }
  if (G.saveData.safehouseShop) {
    G.safehouse.ownedOutfits = G.saveData.safehouseShop.ownedOutfits || [];
    const worn = SHOP_OUTFITS.find((o) => o.id === G.saveData.safehouseShop.equippedOutfit);
    if (worn) applyOutfitPerk(G, worn);
  }
  if (G.saveData.photoSnaps) G.photomode.snaps = G.saveData.photoSnaps;
  if (G.saveData.casinoTables) {
    Object.assign(G.casinogames, {
      bjHands: G.saveData.casinoTables.bjHands ?? 0,
      bjWon: G.saveData.casinoTables.bjWon ?? 0,
      rouletteWins: G.saveData.casinoTables.rouletteWins ?? 0,
      rouletteLosses: G.saveData.casinoTables.rouletteLosses ?? 0,
    });
  }
  if (G.saveData.nitroTankLevel) G.nitro.tankLevel = G.saveData.nitroTankLevel;
  if (G.saveData.vigilanteContracts) G.vigilante.contracts = G.saveData.vigilanteContracts;
  // v6: restore the VIP career, the poker table, the collection, the Guard
  // record, the mountain visits and the bus fares with the rest of the save.
  if (G.saveData.vip) Object.assign(G.vip, {
    jobs: G.saveData.vip.jobs ?? 0,
    earned: G.saveData.vip.earned ?? 0,
    rating: G.saveData.vip.rating ?? 4.2,
    ratingCount: G.saveData.vip.ratingCount ?? 12,
    bestTip: G.saveData.vip.bestTip ?? 0,
  });
  if (G.saveData.poker) Object.assign(G.poker, {
    handsPlayed: G.saveData.poker.handsPlayed ?? 0,
    handsWon: G.saveData.poker.handsWon ?? 0,
    biggestPot: G.saveData.poker.biggestPot ?? 0,
  });
  if (G.saveData.collection) {
    G.collection.owned = G.saveData.collection.owned || [];
    G.collection.calls = G.saveData.collection.calls ?? 0;
    G.collection.collected = G.saveData.collection.collected ?? 0;
    refreshShowroom(G);
  }
  if (G.saveData.military) Object.assign(G.military, {
    apcSpawns: G.saveData.military.apcSpawns ?? 0,
    escapes: G.saveData.military.escapes ?? 0,
  });
  if (G.saveData.mountain) G.mountain.summitVisits = G.saveData.mountain.summitVisits ?? 0;
  if (G.saveData.busfire) Object.assign(G.busfire, {
    fares: G.saveData.busfire.fares ?? 0,
    fareEarned: G.saveData.busfire.fareEarned ?? 0,
    hydrantHits: G.saveData.busfire.hydrantHits ?? 0,
  });
  if (G.saveData.pos) {
    G.player.pos.set(G.saveData.pos.x, 0, G.saveData.pos.z);
    G.player.group.position.copy(G.player.pos);
  }
}

// ---- Menus -----------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const titleEl = $('title'), pauseEl = $('pause'), endEl = $('end');

function showTitle() {
  G.mode = 'title';
  titleEl.classList.remove('hidden');
  pauseEl.classList.add('hidden');
  endEl.classList.add('hidden');
  G.hud.hide();
  if (G.driving) exitCar(G);
  if (G.boating) exitBoat(G);
  // v4: a parked heli or ski is left where it is; a flying one is
  // brought down first so Mara is never stranded in the sky.
  if (G.flying) { G.flying.altitude = 0; exitFlyHeli(G); }
  if (G.jetski) exitJetSki(G);
  if (G.casino && G.casino.open) closeCasino(G);
  // v5: the title screen closes the new overlays too — the table floor,
  // the wardrobe and the camera all go home.
  if (G.casinogames && G.casinogames.open) closeCasinoGames(G);
  if (G.safehouse && G.safehouse.shop && G.safehouse.shop.open) closeSafehouseShop(G);
  if (G.photomode && G.photomode.active) togglePhotoMode(G);
  $('btnContinue').classList.toggle('hidden', !G.save.exists());
  document.exitPointerLock?.();
}

function startGame(fresh) {
  if (fresh) {
    G.save.clear();
    G.cash = CONFIG.startCash;
    G.health = CONFIG.playerHealth;
    G.armor = 0;
    G.clockMinutes = CONFIG.clockStartMinutes;
    G.player.pos.set(20, 0, 30);
    G.player.group.position.copy(G.player.pos);
    G.wanted.clear();
    G.missions.index = 0;
    G.missions.step = 0;
    G.missions.active = false;
    // v5: a fresh start clears the new career too — wardrobe, camera
    // roll, table floor, nitro bottle and the contract count.
    G.races.ladder.nightWins = 0;
    G.garage.suspensionLevel = 0;
    G.safehouse.ownedOutfits = [];
    G.safehouse.equippedOutfit = null;
    G.photomode.snaps = 0;
    if (G.casinogames) {
      G.casinogames.bjHands = 0;
      G.casinogames.bjWon = 0;
      G.casinogames.rouletteWins = 0;
      G.casinogames.rouletteLosses = 0;
    }
    G.nitro.tankLevel = 0;
    G.vigilante.contracts = 0;
    // v6: a fresh start clears the new career too — VIP rating, poker
    // hands, the collection, the Guard record, the mountain and the fares.
    if (G.vip) {
      G.vip.jobs = 0; G.vip.earned = 0; G.vip.rating = 4.2;
      G.vip.ratingCount = 12; G.vip.bestTip = 0;
    }
    if (G.poker) { G.poker.handsPlayed = 0; G.poker.handsWon = 0; G.poker.biggestPot = 0; G.poker.chips = 1000; G.poker.boughtIn = false; }
    if (G.collection) { G.collection.owned = []; G.collection.calls = 0; G.collection.collected = 0; }
    if (G.military) { G.military.apcSpawns = 0; G.military.escapes = 0; }
    if (G.mountain) G.mountain.summitVisits = 0;
    if (G.busfire) { G.busfire.fares = 0; G.busfire.fareEarned = 0; G.busfire.hydrantHits = 0; }
  }
  titleEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  endEl.classList.add('hidden');
  G.hud.show();
  G.mode = 'playing';
  G.audio.ensure();
  G.audio.sirenStop();
  if (!G.missions.active && G.missions.index < MISSIONS.length) startMission(G, G.missions.index);
  else if (!G.missions.active) G.hud.setMission('Solmar City', 'Free roam — every mission complete.', 'Press J for a taxi fare, or find the hidden packages.');
}

function gameOver(kind, cause) {
  if (G.mode === 'over') return;
  // A boat trip ends with the story: climb off before the screen changes.
  if (G.boating) exitBoat(G);
  G.endKind = kind;
  G.mode = 'over';
  const title = $('endTitle');
  const text = $('endText');
  if (kind === 'busted') {
    const fine = Math.min(G.cash, G.config.bustedFine);
    G.cash -= fine;
    G.wanted.clear();
    G.health = G.config.playerHealth;
    G.player.pos.set(20, 0, 30);
    title.textContent = 'BUSTED';
    title.className = 'busted';
    text.textContent = `The Solmar PD caught you. Bail cost $${fine} — the heat is off, for now.`;
    $('btnRetry').textContent = 'BACK ON THE STREET';
  } else if (kind === 'wasted') {
    const bill = Math.min(G.cash, 200);
    G.cash -= bill;
    G.health = G.config.playerHealth;
    G.player.pos.set(20, 0, 30);
    title.textContent = 'WASTED';
    title.className = 'wasted';
    text.textContent = `You went down${cause ? ' — ' + cause : ''}. The hospital bill was $${bill}. Mara is tougher than that.`;
    $('btnRetry').textContent = 'GET BACK UP';
  } else if (kind === 'failed') {
    title.textContent = 'MISSION FAILED';
    title.className = 'wasted';
    text.textContent = cause || 'The job fell apart. Mara does not stay down for long.';
    $('btnRetry').textContent = 'RETRY MISSION';
  } else if (kind === 'story') {
    title.textContent = 'SOLMAR IS YOURS';
    title.className = 'done';
    // v3: after the Verde Heist the generic line gives way to the epilogue.
    text.textContent = (G.missions.index >= MISSIONS.length)
      ? EPILOGUE_TEXT
      : (cause || 'Every mission complete. Mara Solano owns this city now.');
    $('btnRetry').textContent = 'KEEP PLAYING';
  }
  G.audio.sirenStop();
  G.audio.engineStop();
  G.save.save(G);
  endEl.classList.remove('hidden');
  G.hud.hide();
  document.exitPointerLock?.();
}

function resumeFromEnd() {
  endEl.classList.add('hidden');
  if (G.endKind === 'failed') retryMission(G);
  G.player.group.position.copy(G.player.pos);
  G.mode = 'playing';
  G.hud.show();
  if (!G.missions.active && G.missions.index < MISSIONS.length) startMission(G, G.missions.index);
}

$('btnNew').addEventListener('click', () => startGame(true));
$('btnContinue').addEventListener('click', () => startGame(false));
$('btnHow').addEventListener('click', () => {
  $('howKeys').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('btnResume').addEventListener('click', () => {
  pauseEl.classList.add('hidden');
  G.mode = 'playing';
});
$('btnSaveQuit').addEventListener('click', () => {
  G.save.save(G);
  showTitle();
});
// v6: the collection's call-car button — the car drives itself to Mara.
$('btnCallCar').addEventListener('click', () => {
  callCollectedCar(G);
});
$('btnRetry').addEventListener('click', resumeFromEnd);
$('btnEndTitle').addEventListener('click', showTitle);

// ---- Frame loop ------------------------------------------------------------
const clock = new THREE.Clock();
let titleAngle = 0;

function stepWorld(dt) {
  // v5: photo mode freezes the living city — the camera is the only thing
  // that moves, and the mode's own update still runs so B can leave it.
  updatePhotoMode(G, dt);
  // v6: time-of-day and weather staging run even while the camera is frozen.
  updatePhotoMode2(G, dt);
  if (G.photomode && G.photomode.active && G.photomode.frozen) return;
  // v6: the poker table pauses the street — the city waits for the cards.
  if (G.poker && G.poker.open) return;
  // One fixed step of the living city: traffic, peds, police, missions.
  updateTraffic(G, dt);
  for (const v of G.vehicles) {
    // v3: 'race' covers street-race rivals and the vigilante fugitive.
    if (v.driver === 'traffic' || v.driver === 'police' || v.driver === 'player' || v.driver === 'race') {
      updateVehicle(G, v, dt, v.driver === 'player' ? G.input : null);
    }
  }
  updateMotorcycles(G, dt);
  updatePedestrians(G, dt);
  updateCrowds(G, dt);
  updatePolice(G, dt);
  updateHelicopter(G, dt);
  updateDayNight(G, dt);
  updateWeather(G, dt);
  updateMissions(G, dt);
  updateSideMissions(G, dt);
  // v3 systems ride the same fixed step as the rest of the living city.
  updateRaces(G, dt);
  updateBoats(G, dt);
  updateGarage(G, dt);
  updateVigilante(G, dt);
  updateSafehouse(G, dt);
  updateRadio(G, dt);
  updateFinale(G, dt);
  updateIslaVerde(G, dt);
  updateNitro(G, dt);
  // v6 systems ride the same fixed step as the rest of the living city.
  updateOldTown(G, dt);
  updateVipJob(G, dt);
  updateBusFire(G, dt);
  updateMilitary(G, dt);
  updateMountain(G, dt);
  updateTalkRadio(G, dt);
  updateMissions3(G, dt);
  updateCharter(G, dt);
  updateNewsHeli(G, dt);
  updateOldTownSafehouse(G, dt);
  // v4 systems ride the same fixed step as the rest of the living city.
  updateHeist(G, dt);
  updateFlyHeli(G, dt);
  updateRaceLeague(G, dt);
  updateJetSkis(G, dt);
  updateStreetEvents(G, dt);
  updateStorm(G, dt);
}

function frame() {
  requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = G.shot ? 1 / 60 : rawDt;   // shots step deterministically

  if (G.mode === 'playing') {
    // v5: photo mode holds the clock still with the world.
    if (!(G.photomode && G.photomode.active)) {
      G.elapsed += dt;
      G.clockMinutes += dt * G.config.clockRate;
    }

    // Enter / exit cars — and v3 boats, v4 helicopters, jet skis and the
    // casino: E near a moored boat boards it, near a heli flies it, near
    // a jet ski rides it, at the casino door walks Mara in.
    // v5: not while the camera is out — E is the photographer's key then.
    // v6: not while the charter flight is in the air — Mara is a passenger
    // then, and the E chain would try to board a heli under the plane.
    if (G.input.pressed('enter') && !(G.photomode && G.photomode.active) && !G.charterRide) {
      if (G.casino.open) closeCasino(G);
      else if (G.flying) exitFlyHeli(G);
      else if (G.jetski) exitJetSki(G);
      else if (G.boating) exitBoat(G);
      else if (G.driving) exitCar(G);
      else {
        const heli = nearestFlyHeli(G);
        if (heli) enterFlyHeli(G, heli);
        else {
          const ski = nearestJetSki(G);
          if (ski) enterJetSki(G, ski);
          else if (nearestCharter(G)) boardCharter(G);
          else if (casinoNearDoor(G)) openCasino(G);
          else {
            const boat = nearestBoat(G);
            if (boat) enterBoat(G, boat);
            else {
              const car = nearestEnterableCar(G);
              if (car) { enterCar(G, car); applyGarageToCar(G, car); registerCollectedCar(G, car); }
              else G.hud.toast('No car close enough — get nearer and press E.');
            }
          }
        }
      }
    }
    if (G.input.pressed('pause')) {
      // v5: P / Esc leaves photo mode first — the pause menu waits its turn.
      if (G.photomode && G.photomode.active) {
        togglePhotoMode(G);
      } else {
        G.mode = 'paused';
        pauseEl.classList.remove('hidden');
        updateStats(G); // the career scorecard is fresh every time you pause
        document.exitPointerLock?.();
      }
    }
    if (G.input.pressed('mute')) {
      G.audio.setMuted(!G.audio.muted);
      G.hud.toast(G.audio.muted ? 'Sound muted.' : 'Sound on.');
    }

    if (G.boating) {
      // Boats steer their own camera and engine hum (see boats.js).
      G.audio.engineStartLoop();
    } else if (G.driving) {
      updateDriveCamera(G, dt);
      G.audio.engineStartLoop();
      G.audio.engineSet(Math.abs(G.driving.speed) / G.driving.spec.topSpeed);
    } else if (G.flying || G.jetski) {
      // v4: helicopters and jet skis steer their own cameras and engine
      // note inside their own updates (see flyheli.js / jetski.js).
      G.audio.engineStartLoop();
    } else if (G.charterRide) {
      // v6: the charter steers its own camera in updateCharter — Mara is a
      // passenger and her feet stay on the apron until touchdown.
    } else if (G.photomode && G.photomode.active) {
      // v5: the photo camera steers itself in stepWorld — nobody else
      // touches the camera while Mara is behind the lens.
    } else {
      updatePlayer(G, dt);
      G.audio.engineStop();
    }

    // Interact prompt when a car is in reach (hidden in shot mode: the
    // prompt would overlap the mission dialogue in the screenshots).
    // v5: hidden in photo mode too — the lens wants a clean frame.
    if (!G.shot && !(G.photomode && G.photomode.active)) {
      if (G.casino.open) {
        G.hud.setInteract('<b>E</b> — cash out of the Verde Casino');
      } else if (G.flying) {
        G.hud.setInteract('<b>E</b> — land and get out (Shift to sink)');
      } else if (G.jetski) {
        G.hud.setInteract('<b>E</b> — hop off the jet ski');
      } else if (!G.driving) {
        const heli = nearestFlyHeli(G);
        const ski = nearestJetSki(G);
        const car = nearestEnterableCar(G);
        if (heli) G.hud.setInteract(`<b>E</b> — fly the ${heli.name}`);
        else if (ski) G.hud.setInteract(`<b>E</b> — ride the ${ski.name}`);
        else if (casinoNearDoor(G)) G.hud.setInteract('<b>E</b> — enter the Verde Casino');
        else G.hud.setInteract(car ? `<b>E</b> — take the ${car.spec.name}` : null);
      } else {
        G.hud.setInteract(`<b>E</b> — get out of the ${G.driving.spec.name}`);
      }
    }

    // v6: the poker table reads its keys before the world steps, so the Z
    // press is never swallowed by the photo freeze or the poker freeze.
    updatePoker(G, dt);
    stepWorld(dt);
    updateCombat(G, dt);

    // Sirens follow the wanted level.
    if (G.wanted.stars > 0) G.audio.sirenStart();
    else G.audio.sirenStop();

    if (G.shot) poseShotCamera(G);
    G.hud.update(G, dt);
    G.minimap.draw(G);

    // Camera kick from firing.
    if (G.cameraKick > 0) {
      G.camera.position.y += G.cameraKick;
      G.cameraKick *= 0.8;
      if (G.cameraKick < 0.001) G.cameraKick = 0;
    }
    // Shot mode: after the scene settles, tell the screenshot runner.
    if (G.shot && ++G.shotFrames >= 100 && !window.__shotReady) {
      window.__shotReady = true;
    }
  } else if (G.mode === 'title') {
    // Living backdrop behind the title: traffic and peds keep moving.
    G.elapsed += dt;
    stepWorld(dt);
    titleAngle += dt * 0.05;
    const r = 90;
    camera.position.set(Math.sin(titleAngle) * r, 42, Math.cos(titleAngle) * r);
    camera.lookAt(0, 8, 0);
  } else if (G.mode === 'paused') {
    // Frozen frame; nothing moves.
  } else if (G.mode === 'over') {
    // Frozen frame behind the end screen.
  }

  G.input.endFrame();
  renderer.render(scene, camera);
}

window.__game = G;

// ---- Shot mode / normal start ----------------------------------------------
// v6: the Old Town staging pose is not one of the four dossier shots, but it
// is wired the same way so the quarter can be verified headlessly.
if (shotName === 'oldtown') {
  applyShotOldTown(G);
} else if (shotName && SHOT_NAMES.includes(shotName)) {
  applyShot(G, shotName);
} else {
  showTitle();
}

frame();
