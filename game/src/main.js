// main.js — Solmar City entry point. Builds the game context G, wires every
// system together (city, player, vehicles, traffic, pedestrians, police,
// missions, combat, HUD, minimap, audio, saves, screenshot poses), runs the
// frame loop, and owns the game state machine: title -> playing -> paused /
// busted / wasted / mission failed / story complete. v7 adds Missions
// 13-14, Solmar Express parcel runs, race season 2, the K9 unit, PIT
// maneuvers, the Bay Regatta, fire callouts, the unicorn hunt, fog banks
// and hail, the night market's second row, and the photo walk.
// v8 adds Missions 15-16 (the Meridian Trust con and the sunrise
// finale), race season 3 and the Grand Prix, the regatta league, the
// paint shop and dyno, the highway and its chaining jams, weather fronts
// with lightning, the radio news desk, pedestrian routines, the
// achievement shelf, the safehouse vault and the third scorecard page.

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
import { createStats, updateStats, renderV7Stats } from './stats.js';
import { registerMissions13And14, updateMissions4 } from './missions4.js';
import { createDeliveryJobs, updateDeliveryJobs, deliverySummary, deliveryRank } from './deliveryjobs.js';
import { buildV7District, updateV7District } from './city.js';
import { updatePlayerV7 } from './player.js';
import { spawnV7Vehicles, updateVehicleWear } from './vehicles.js';
import { createTrafficV7, updateTrafficV7 } from './traffic.js';
import { createK9Unit, updatePoliceV7 } from './police.js';
import { createCombatV7, updateCombatV7 } from './combat.js';
import { createCourierRush, createStuntSeason } from './missions2.js';
import { createMissionRecords } from './missions3.js';
import { buildAirportV7, updateAirportV7 } from './airport.js';
import { playCrashV7, playHonkV7, playBellV7, playBarkV7, playCashV7, playStingV7, playCheerV7 } from './audio.js';
import { createRegatta, updateRegatta } from './boats.js';
import { createFireCallouts, updateFireCallouts } from './busfire.js';
import { createUnicornHunt, updateUnicornHunt, checkUnicornFind } from './carcollection.js';
import { spawnPerformersV7, updatePerformersV7 } from './crowds.js';
import { createDayNightV7, updateDayNightV7 } from './daynight.js';
import { createGarageV7 } from './garage.js';
import { createHeliV7, updateHeliV7 } from './helicopter.js';
import { buildIslaV7, updateIslaV7 } from './islaverde.js';
import { createMilitaryV7, updateMilitaryV7 } from './military.js';
import { drawMinimapV7 } from './minimap.js';
import { spawnStuntBike, createBikeStunts, updateBikeStuntsV7 } from './motorcycle.js';
import { buildMountainV7, updateMountainV7 } from './mountain.js';
import { createNitroV7 } from './nitro.js';
import { buildOldTownV7, updateOldTownV7 } from './oldtown.js';
import { spawnPedGroup, updatePedGroupsV7, updatePedReactionsV7 } from './pedestrians.js';
import { createPhotoChallenges } from './photomode.js';
import { createPhotoWalk } from './photomode2.js';
import { createPokerTournament } from './poker.js';
import { createRaceSeason2 } from './races.js';
import { createSafehouseV7 } from './safehouse.js';
import { applyShotSeason } from './shots.js';
import { createWeatherV7, updateWeatherV7 } from './weather.js';
import { createVipJobV7 } from './vipjob.js';
import { createVigilanteV7 } from './vigilante.js';
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
// v8 systems: the finale arc, weather fronts, the paint shop and dyno,
// the highway, pedestrian routines, the story-reactive radio and the
// achievement shelf — each created last, like every version before.
import { registerMissions15And16, updateMissions5 } from './missions5.js';
import { createWeatherV8, updateWeatherV8, weatherForecastV8 } from './weather2.js';
import { createGarageV8, updateGarageV8, startDynoPull } from './garage2.js';
import { createTrafficV8, updateTrafficV8, startJamV8 } from './traffic2.js';
import { createPedRoutines, updatePedRoutines, greetRoutinePed } from './pedestrians2.js';
import { createRadioV8, updateRadioV8, newsBulletinV8, radioRequestV8 } from './radio2.js';
import { createAchievements, updateAchievements, renderV8Stats } from './achievements.js';
// v8 revisions: every older system grew a v8 block of its own.
import { createCharterV8, updateCharterV8 } from './airport.js';
import { playThunderV8, playFanfareV8, playCrowdV8, playDynoV8 } from './audio.js';
import { createRegattaLeague, recordRegattaWinV8 } from './boats.js';
import { createFireCareer, recordFireV8 } from './busfire.js';
import { createShowroomV8, parkUnicornV8 } from './carcollection.js';
import { createLoungeV8 } from './casino.js';
import { buildV8District, updateV8District } from './city.js';
import { createCombatV8, updateCombatV8 } from './combat.js';
import { spawnBuskersV8, updateBuskersV8 } from './crowds.js';
import { createSkyV8, updateSkyV8 } from './daynight.js';
import { expressTierProgressV8 } from './deliveryjobs.js';
import { registerFinaleV8, updateFinaleV8 } from './finale.js';
import { createHeliToursV8, updateHeliToursV8 } from './flyheli.js';
import { createGarageLoyalty } from './garage.js';
import { registerHeistV8, updateHeistV8 } from './heist.js';
import { createTrafficHeliV8, updateTrafficHeliV8 } from './helicopter.js';
import { updateHudV8 } from './hud.js';
import { createFerryV8, updateFerryV8 } from './islaverde.js';
import { createJetSkiFreestyle, updateJetSkiFreestyle } from './jetski.js';
import { createMilitaryV8, updateMilitaryV8 } from './military.js';
import { drawMinimapV8 } from './minimap.js';
import { createCourierWeek, createStuntHallOfFame } from './missions2.js';
import { createTimeTrials, updateTimeTrials } from './missions3.js';
import { createAftermathV8, updateAftermathV8 } from './missions4.js';
import { createWheelieSchool, updateWheelieSchool } from './motorcycle.js';
import { createMountainRescue, updateMountainRescue } from './mountain.js';
import { createNitroEconomy } from './nitro.js';
import { createGhostWalk, updateGhostWalk } from './oldtown.js';
import { createFlashMob, updateFlashMob } from './pedestrians.js';
import { createPhotoModeV8 } from './photomode.js';
import { createPhotoWalk2 } from './photomode2.js';
import { createParkourV8, updateParkourV8 } from './player.js';
import { createPokerLeaderboard } from './poker.js';
import { createHeatMap, updateHeatMapV8 } from './police.js';
import { createGrandPrix } from './raceleague.js';
import { createRaceSeason3 } from './races.js';
import { createSafehouseV8, depositVaultV8 } from './safehouse.js';
import { applyShotFinale, applyShotSunrise } from './shots.js';
import { createStormChaser, updateStormChaser } from './storm.js';
import { createStreetFestival, updateStreetFestival } from './streetevents.js';
import { createTowTruckV8, updateTowTruckV8 } from './traffic.js';
import { createValetV8, updateArmoredCarV8 } from './vehicles.js';
import { createMostWanted, updateMostWanted } from './vigilante.js';
import { createVipBlacklist } from './vipjob.js';
import { createWeatherDiary, updateWeatherDiary } from './weather.js';

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

// v7 systems, created last so the v1–v6 placements above keep their seeds.
buildV7District(G);
registerMissions13And14(G);
createDeliveryJobs(G);
buildAirportV7(G);
createRegatta(G);
createFireCallouts(G);
createUnicornHunt(G);
spawnPerformersV7(G);
createDayNightV7(G);
createGarageV7(G);
createHeliV7(G);
buildIslaV7(G);
createMilitaryV7(G);
spawnStuntBike(G);
createBikeStunts(G);
buildMountainV7(G);
createNitroV7(G);
buildOldTownV7(G);
createPhotoChallenges(G);
createPhotoWalk(G);
createPokerTournament(G);
createRaceSeason2(G);
createSafehouseV7(G);
createTrafficV7(G);
createK9Unit(G);
createCombatV7(G);
createCourierRush(G);
createStuntSeason(G);
createMissionRecords(G);
createWeatherV7(G);
createVipJobV7(G);
createVigilanteV7(G);
spawnV7Vehicles(G);
// v8 systems, created last so the v1–v7 placements above keep their seeds.
registerMissions15And16(G);
createWeatherV8(G);
createGarageV8(G);
createTrafficV8(G);
createPedRoutines(G);
createRadioV8(G);
createAchievements(G);
createCharterV8(G);
createRegattaLeague(G);
createFireCareer(G);
createShowroomV8(G);
createLoungeV8(G);
buildV8District(G);
createCombatV8(G);
spawnBuskersV8(G);
createSkyV8(G);
registerFinaleV8(G);
createHeliToursV8(G);
createGarageLoyalty(G);
registerHeistV8(G);
createTrafficHeliV8(G);
createFerryV8(G);
createJetSkiFreestyle(G);
createMilitaryV8(G);
createCourierWeek(G);
createStuntHallOfFame(G);
createTimeTrials(G);
createAftermathV8(G);
createWheelieSchool(G);
createMountainRescue(G);
createNitroEconomy(G);
createGhostWalk(G);
createFlashMob(G);
createPhotoModeV8(G);
createPhotoWalk2(G);
createParkourV8(G);
createPokerLeaderboard(G);
createHeatMap(G);
createGrandPrix(G);
createRaceSeason3(G);
createSafehouseV8(G);
createStormChaser(G);
createStreetFestival(G);
createTowTruckV8(G);
createValetV8(G);
createMostWanted(G);
createVipBlacklist(G);
createWeatherDiary(G);
// v8: the new synthesized sounds the new systems call by name.
G.audio.thunder = () => playThunderV8(G);
G.audio.fanfare = () => playFanfareV8(G);
G.audio.crowd = () => playCrowdV8(G);
G.audio.dyno = () => playDynoV8(G);
// v8: the systems the tests drive directly, on the game context.
G.v8 = {
  forecast: () => weatherForecastV8(G),
  bulletin: (force) => newsBulletinV8(G, force),
  request: () => radioRequestV8(G),
  dyno: () => startDynoPull(G),
  jam: (x, z, cause) => startJamV8(G, x, z, cause),
  greet: () => greetRoutinePed(G),
};
// v7: walking groups — three groups of friends strolling the plaza and
// the beach road, so the streets feel lived-in from the first frame.
spawnPedGroup(G, 20, 40, 3);
spawnPedGroup(G, -100, 220, 2);
spawnPedGroup(G, 140, 60, 3);
// v7: the synthesized sound effects the new systems call by name.
G.audio.crash = () => playCrashV7(G);
G.audio.honk = () => playHonkV7(G);
G.audio.bell = () => playBellV7(G);
G.audio.bark = () => playBarkV7(G);
G.audio.cash = () => playCashV7(G);
G.audio.sting = () => playStingV7(G);
G.audio.cheer = () => playCheerV7(G);

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
  // v7: restore the delivery career, season 2, the K9 record and the
  // mission replays with the rest of the save.
  if (G.saveData.v7) {
    if (G.saveData.v7.deliveries && G.delivery) Object.assign(G.delivery, {
      done: G.saveData.v7.deliveries.done ?? 0,
      earned: G.saveData.v7.deliveries.earned ?? 0,
      bestStreak: G.saveData.v7.deliveries.bestStreak ?? 0,
    });
    if (G.saveData.v7.season2 && G.season2) Object.assign(G.season2, {
      points: G.saveData.v7.season2.points ?? 0,
      rounds: G.saveData.v7.season2.rounds ?? 0,
      wins: G.saveData.v7.season2.wins ?? 0,
      champion: G.saveData.v7.season2.champion ?? false,
    });
    if (G.saveData.v7.k9 && G.k9) Object.assign(G.k9, {
      captures: G.saveData.v7.k9.captures ?? 0,
      pitHits: G.saveData.v7.k9.pitHits ?? 0,
    });
    if (G.saveData.v7.missions4 && G.missions4) {
      G.missions4.replays = G.saveData.v7.missions4.replays ?? 0;
    }
  }
  // v8: restore the finale arc, the paint shop and dyno, the highway
  // record, the weather fronts, the achievements, season 3, the regatta
  // league and the safehouse vault with the rest of the save.
  if (G.saveData.v8) {
    const v8 = G.saveData.v8;
    if (v8.missions5 && G.missions5) {
      Object.assign(G.missions5, {
        finaleDone: v8.missions5.finaleDone ?? false,
        conSwaps: v8.missions5.conSwaps ?? 0,
        dawnRuns: v8.missions5.dawnRuns ?? 0,
        bestDawnSeconds: v8.missions5.bestDawnSeconds ?? null,
        ceremonyPaid: v8.missions5.ceremonyPaid ?? false,
      });
    }
    if (v8.garageV8 && G.garageV8) {
      Object.assign(G.garageV8, {
        baseId: v8.garageV8.baseId ?? 'midnight',
        flakeId: v8.garageV8.flakeId ?? 'none',
        finishId: v8.garageV8.finishId ?? 'gloss',
        twoTone: v8.garageV8.twoTone ?? false,
        paintsBought: v8.garageV8.paintsBought ?? 0,
        paintSpent: v8.garageV8.paintSpent ?? 0,
      });
      Object.assign(G.garageV8.dyno, {
        bestHp: v8.garageV8.dynoBestHp ?? 0,
        bestTop: v8.garageV8.dynoBestTop ?? 0,
        bestAccel: v8.garageV8.dynoBestAccel ?? null,
        pulls: v8.garageV8.dynoPulls ?? 0,
      });
    }
    if (v8.trafficV8 && G.trafficV8) {
      Object.assign(G.trafficV8, {
        jamsTotal: v8.trafficV8.jamsTotal ?? 0,
        chainsTotal: v8.trafficV8.chainsTotal ?? 0,
        towsTotal: v8.trafficV8.towsTotal ?? 0,
        highwayTrips: v8.trafficV8.highwayTrips ?? 0,
      });
    }
    if (v8.weatherV8 && G.weatherV8) {
      Object.assign(G.weatherV8, {
        frontPassed: v8.weatherV8.frontPassed ?? 0,
        strikes: v8.weatherV8.strikes ?? 0,
        gusts: v8.weatherV8.gusts ?? 0,
      });
    }
    if (v8.achievements && G.achievements) {
      G.achievements.unlocked = [...v8.achievements];
      G.achievements.earned = v8.achievementEarned ?? 0;
    }
    if (v8.season3 && G.season3) {
      Object.assign(G.season3, {
        points: v8.season3.points ?? 0,
        rounds: v8.season3.rounds ?? 0,
        wins: v8.season3.wins ?? 0,
        champion: v8.season3.champion ?? false,
        midnightWins: v8.season3.midnightWins ?? 0,
      });
    }
    if (v8.regattaLeague && G.regattaLeague) {
      Object.assign(G.regattaLeague, {
        points: v8.regattaLeague.points ?? 0,
        wins: v8.regattaLeague.wins ?? 0,
        champion: v8.regattaLeague.champion ?? false,
      });
    }
    if (v8.safehouseV8 && G.safehouseV8) {
      G.safehouseV8.vault = v8.safehouseV8.vault ?? 0;
      G.safehouseV8.vaultDeposits = v8.safehouseV8.vaultDeposits ?? 0;
      G.safehouseV8.trophies = [...(v8.safehouseV8.trophies || [])];
    }
  }
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
    // v7: a fresh start clears the new career too — deliveries, season 2,
    // the K9 record and the mission replays.
    if (G.delivery) { G.delivery.done = 0; G.delivery.earned = 0; G.delivery.streak = 0; G.delivery.bestStreak = 0; }
    if (G.season2) { G.season2.points = 0; G.season2.rounds = 0; G.season2.wins = 0; G.season2.champion = false; }
    if (G.k9) { G.k9.captures = 0; G.k9.pitHits = 0; G.k9.pitAttempts = 0; }
    if (G.missions4) G.missions4.replays = 0;
    // v8: a fresh start clears the new career too — the finale, the
    // paint shop, the highway record, the fronts, the shelf, season 3,
    // the regatta league and the safehouse vault.
    if (G.missions5) { G.missions5.finaleDone = false; G.missions5.conSwaps = 0; G.missions5.dawnRuns = 0; G.missions5.bestDawnSeconds = null; G.missions5.ceremonyPaid = false; }
    if (G.garageV8) { G.garageV8.paintsBought = 0; G.garageV8.paintSpent = 0; G.garageV8.twoTone = false; G.garageV8.dyno.pulls = 0; G.garageV8.dyno.bestHp = 0; G.garageV8.dyno.bestTop = 0; G.garageV8.dyno.bestAccel = null; }
    if (G.trafficV8) { G.trafficV8.jamsTotal = 0; G.trafficV8.chainsTotal = 0; G.trafficV8.towsTotal = 0; G.trafficV8.highwayTrips = 0; }
    if (G.weatherV8) { G.weatherV8.frontPassed = 0; G.weatherV8.strikes = 0; G.weatherV8.gusts = 0; }
    if (G.achievements) { G.achievements.unlocked = []; G.achievements.earned = 0; }
    if (G.season3) { G.season3.points = 0; G.season3.rounds = 0; G.season3.wins = 0; G.season3.champion = false; G.season3.midnightWins = 0; }
    if (G.regattaLeague) { G.regattaLeague.points = 0; G.regattaLeague.wins = 0; G.regattaLeague.roundsSailed = 0; G.regattaLeague.champion = false; }
    if (G.safehouseV8) { G.safehouseV8.vault = 0; G.safehouseV8.vaultDeposits = 0; G.safehouseV8.trophies = []; }
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
  // v7 systems ride the same fixed step as the rest of the living city.
  updateMissions4(G, dt);
  updateDeliveryJobs(G, dt);
  updateV7District(G, dt);
  updateTrafficV7(G, dt);
  updatePoliceV7(G, dt);
  updateCombatV7(G, dt);
  updateAirportV7(G, dt);
  updateRegatta(G, dt);
  updateFireCallouts(G, dt);
  updateUnicornHunt(G, dt);
  updatePerformersV7(G, dt);
  updateDayNightV7(G, dt);
  updateHeliV7(G, dt);
  updateIslaV7(G, dt);
  updateMilitaryV7(G, dt);
  updateBikeStuntsV7(G, dt);
  updateMountainV7(G, dt);
  updateOldTownV7(G, dt);
  updatePedGroupsV7(G, dt);
  updatePedReactionsV7(G, dt);
  updateWeatherV7(G, dt);
  updateVehicleWear(G, dt);
  // v8 systems ride the same fixed step as the rest of the living city.
  updateMissions5(G, dt);
  updateWeatherV8(G, dt);
  updateGarageV8(G, dt);
  updateTrafficV8(G, dt);
  updatePedRoutines(G, dt);
  updateRadioV8(G, dt);
  updateAchievements(G, dt);
  updateCharterV8(G, dt);
  updateV8District(G, dt);
  updateCombatV8(G, dt);
  updateBuskersV8(G, dt);
  updateSkyV8(G, dt);
  updateFinaleV8(G, dt);
  updateHeliToursV8(G, dt);
  updateHeistV8(G, dt);
  updateTrafficHeliV8(G, dt);
  updateFerryV8(G, dt);
  updateJetSkiFreestyle(G, dt);
  updateMilitaryV8(G, dt);
  updateTimeTrials(G, dt);
  updateAftermathV8(G, dt);
  updateWheelieSchool(G, dt);
  updateMountainRescue(G, dt);
  updateGhostWalk(G, dt);
  updateFlashMob(G, dt);
  updateParkourV8(G, dt);
  updateHeatMapV8(G, dt);
  updateStormChaser(G, dt);
  updateStreetFestival(G, dt);
  updateTowTruckV8(G, dt);
  updateArmoredCarV8(G, dt);
  updateMostWanted(G, dt);
  updateWeatherDiary(G, dt);
  // v8: observers — systems that watch other systems' counters move, so
  // no older system needs a hook into a newer one. A finished mission
  // pays its 5% vault cut; a regatta win enters the league table; a fire
  // out moves the fire career; a unicorn found takes its showroom plinth.
  if (G._v8Prev === undefined) {
    G._v8Prev = { missionIndex: G.missions.index, regattaWins: 0, fireCallouts: 0, unicorns: 0 };
  }
  if (G.missions.index > G._v8Prev.missionIndex) {
    // Loop, so a jump of more than one index (a replay, a debug start)
    // still credits every mission it passed, not just the first.
    while (G._v8Prev.missionIndex < G.missions.index) {
      const done = MISSIONS[G._v8Prev.missionIndex];
      if (done) depositVaultV8(G, done.reward);
      G._v8Prev.missionIndex += 1;
    }
  }
  if (G.regatta && G.regatta.wins > G._v8Prev.regattaWins) {
    recordRegattaWinV8(G, G.regatta.bestTime || 0);
    G._v8Prev.regattaWins = G.regatta.wins;
  }
  if (G.fireCallouts && G.fireCallouts.callouts > G._v8Prev.fireCallouts) {
    recordFireV8(G);
    G._v8Prev.fireCallouts = G.fireCallouts.callouts;
  }
  if (G.unicornHunt && G.unicornHunt.found.length > G._v8Prev.unicorns) {
    const found = G.unicornHunt.found[G.unicornHunt.found.length - 1];
    parkUnicornV8(G, found && found.id ? found.id : 'unicorn');
    G._v8Prev.unicorns = G.unicornHunt.found.length;
  }
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
              if (car) { enterCar(G, car); applyGarageToCar(G, car); registerCollectedCar(G, car); checkUnicornFind(G, car); }
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
        renderV7Stats(G); // v7: the second page of the scorecard
        renderV8Stats(G); // v8: the third page — the achievement shelf
        document.exitPointerLock?.();
      }
    }
    if (G.input.pressed('mute')) {
      G.audio.setMuted(!G.audio.muted);
      G.hud.toast(G.audio.muted ? 'Sound muted.' : 'Sound on.');
    }
    // v7: the delivery job board — 7 shows the Solmar Express summary
    // and the dispatcher's trust rank.
    // v8: the board also shows the Express tier and the boss run.
    if (G.input.pressed('delivery') && G.delivery) {
      G.hud.toast(`${deliverySummary(G)} — Rank: ${deliveryRank(G)}. ${expressTierProgressV8(G)}`);
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
      updatePlayerV7(G, dt); // v7: dodge roll, slide and second wind
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
        // v6: the charter flight gets its own prompt — otherwise nobody
        // would guess E boards a parked plane on the apron.
        const charter = nearestCharter(G);
        if (heli) G.hud.setInteract(`<b>E</b> — fly the ${heli.name}`);
        else if (ski) G.hud.setInteract(`<b>E</b> — ride the ${ski.name}`);
        else if (charter) G.hud.setInteract('<b>E</b> — board the charter flight (free bay tour)');
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
    updateHudV8(G, dt); // v8: the ticker under the weather label
    G.minimap.draw(G);
    drawMinimapV7(G); // v7: job blips and the damage compass
    drawMinimapV8(G); // v8: the gold route line to the mission marker

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
} else if (shotName === 'season') {
  applyShotSeason(G);
} else if (shotName === 'finale') {
  applyShotFinale(G);
} else if (shotName === 'sunrise') {
  applyShotSunrise(G);
} else if (shotName && SHOT_NAMES.includes(shotName)) {
  applyShot(G, shotName);
} else {
  showTitle();
}

frame();
