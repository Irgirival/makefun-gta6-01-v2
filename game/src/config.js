// config.js — every tunable number for Solmar City lives here, in one place.
// Nothing in this file imports anything: the rest of the game reads it through
// the game context G. Change a value here and the whole city follows.

export const CONFIG = {
  // World layout: a grid of square blocks separated by roads.
  cityHalf: 340,          // playable half-extent in world units (city is ~680 wide)
  blockSize: 80,          // road centre-to-centre spacing
  roadWidth: 14,          // asphalt width
  sidewalkWidth: 5,
  beachZ: 340,            // south edge: sand then water
  waterZ: 420,            // water plane starts here
  harborX: 300,           // east edge: docks and water
  maxBuildingHeight: 64,
  downtownRadius: 130,    // tall towers cluster near the centre

  // Player on foot.
  walkSpeed: 7,
  sprintSpeed: 12,
  jumpSpeed: 9,
  gravity: 24,
  playerRadius: 0.6,
  playerHeight: 1.8,

  // Driving (arcade physics, per vehicle type in vehicles.js).
  driveAccel: 26,
  driveBrake: 42,
  driveReverse: 14,
  driveMaxSpeed: 46,      // sports car top speed, units/s (~165 km/h feel)
  driveGrip: 6.5,
  driveTurn: 1.9,

  // Wanted / police.
  heatPerCrime: { steal: 18, punch: 10, shoot: 22, killCop: 40, hitPed: 14, boat: 18 },
  heatDecayPerSec: 1.1,   // decays only while no police can see the player
  heatPerStar: 20,
  maxStars: 5,
  copChaseSpeed: 34,
  arrestDistance: 3.2,    // cop this close on foot starts the arrest timer
  arrestTime: 2.2,        // seconds inside arrestDistance before BUSTED
  bustedFine: 250,

  // Combat.
  playerHealth: 100,
  playerArmor: 100,
  pistolDamage: 34,
  pistolMag: 12,
  pistolReserve: 120,
  punchDamage: 12,
  punchRange: 2.2,
  punchCooldown: 0.45,

  // Economy.
  startCash: 120,
  taxiFareBase: 45,
  taxiFarePerUnit: 0.35,
  packageReward: 250,
  missionRewards: [400, 650, 900, 1200, 2500, 4000],

  // Police air unit: a helicopter lifts off at 4 stars and leaves below 2.
  heliMinStars: 4,
  heliStandDownStars: 2,
  heliHoverHeight: 58,

  // Weather: rain cuts grip (1 = dry asphalt, 0.68 = heavy rain).
  rainGripMin: 0.68,

  // v2 additions: parked motorcycles, extra varied pedestrians, buses.
  motorcycles: 4,   // v3: a fourth Comet waits on the Isla Verde boardwalk
  crowdExtra: 14,
  cityBuses: 2,

  // Time of day: the clock starts at 09:00 and one game minute is one real second.
  clockStartMinutes: 9 * 60,
  clockRate: 1,

  // Traffic and crowds.
  trafficCars: 14,
  pedestrians: 26,
  policeCruisersMax: 6,
  policeFootMax: 4,

  // Collectibles.
  packageCount: 12,

  // Minimap.
  minimapRange: 190,      // world units shown across the minimap diameter

  // v3: street racing, garage, boats, vigilante work and the Verde heist.
  raceLaps: 2,
  racePrizeFirst: 1500,
  garagePaintPrice: 150,
  garageEnginePrice: 500,
  garageArmorPrice: 400,
  boatTopSpeed: 26,
  vigilanteBounty: 600,
  finaleReward: 6000,
  missionRewardsV3: [400, 650, 900, 1200, 2500, 4000, 6000],

  // v5: radio bulletins, Mission 10, night racing and photo mode.
  bulletinInterval: 95,     // seconds between Solmar News bulletins while a station plays
  mission10Reward: 9000,    // "The Last Sunset" pays for the whole story
  nightRacePrizeMult: 1.5,  // night circuits pay half again as much
  photoSnapCooldown: 2,     // seconds between photo-mode snapshots
  outfitShopMarkup: 1,      // outfits sell at list price
  vendorStalls: 3,          // street-vendor stalls around the plaza and boardwalk
  performerSpots: 2,        // street performers drawing a crowd

  // v6: the Old Town quarter, the mountain, the VIP job, poker, the Guard
  // and the car collection — every new system reads its numbers here.
  oldTownPlaza: { x: 260, z: -260 },
  vipFareBase: 120,         // VIP pickup base fare
  vipFarePerUnit: 0.55,
  parcelFareBase: 90,
  pokerBuyIn: 100,          // dollars for 1,000 chips at the high-roller table
  pokerChipRate: 10,        // chips per dollar when cashing out
  militaryStars: 5,         // the National Guard rolls in at this many stars
  militaryStandDown: 3,     // ...and stands down below this many
  collectionMax: 5,         // cars Mara can own at once
  snowGrip: 0.85,           // grip on snowy roads
  landmarkBonus: 50,        // dollars per new landmark visited
  mountainBonus: 200,       // dollars for the first summit viewpoint visit
  busFarePerRider: 5,
  hydrantBonus: 25,
};

// v7: Solmar Express, race season 2, the K9 unit and the harbor ledger —
// every new system reads its numbers here, next to the old ones.
Object.assign(CONFIG, {
  // Solmar Express parcel runs.
  deliveryBase: 150,        // dollars per clean drop, before the streak bonus
  deliveryPerStreak: 25,    // extra dollars per drop in the current streak
  deliveryFragileBonus: 120,// fragile-box bonus at streak 3+
  deliveryDepotRadius: 9,   // how close to a depot crate to take a job
  // Race season 2: a second championship with its own points table.
  season2Rounds: 4,         // four rounds, then the season champion is crowned
  season2Points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  season2ChampionPrize: 8000,
  // Police v7: PIT maneuvers and the K9 unit.
  pitMinStars: 2,           // cruisers try a PIT at this many stars
  pitCooldown: 14,          // seconds between PIT attempts on the same chase
  k9MinStars: 4,            // the dog unit joins the foot chase at 4 stars
  k9Speed: 13,              // the dog is faster than any officer on foot
  k9CaptureTime: 1.4,       // seconds the dog must hold Mara before BUSTED
  // Traffic v7: accidents and rush-hour waves.
  accidentChance: 0.06,     // per minute, a random traffic pair fender-benders
  accidentClearTime: 25,    // seconds before the wreck is towed away
  rushWaveCars: 4,          // extra cars that join the road at rush hour
  // Combat v7: the shotgun and the three-hit melee combo.
  shotgunDamage: 55,        // per pellet group at close range
  shotgunPellets: 6,
  shotgunMag: 6,
  shotgunReserve: 48,
  comboWindow: 1.1,         // seconds between punches to keep the combo alive
  comboFinisherMult: 2.2,   // third punch hits this much harder
  // Missions 13–14 rewards and the replay rule.
  mission13Reward: 7000,
  mission14Reward: 9000,
  replayRewardMult: 0.5,    // replays pay half the original reward
  // Photo mode v7: the challenge board pays for framed landmarks.
  photoChallengePay: 150,   // dollars per completed photo challenge
  // Weather v7: fog banks and hail fronts.
  fogBankSpeed: 6,          // world units per second a fog bank drifts
  hailGrip: 0.8,            // grip while hail is falling
  hailDamage: 2,            // health lost per second standing in hail unprotected
  // Garage v7: turbo, bulletproof tires and hydraulics.
  turboPrice: 900,
  tirePrice: 600,
  hydraulicsPrice: 450,
  // Casino v7: the slots floor.
  slotsBet: 25,             // dollars per pull
  slotsJackpot: 2500,       // three gold sevens
  // Boat racing v7: the bay regatta.
  regattaPrize: 1200,
  regattaBuoys: 6,
  // Night market v7: the Old Town stalls after dark.
  marketStallCount: 6,
  marketTip: 10,            // dollars a happy shopper tips a performer
  // Player v7: dodge roll and parkour.
  dodgeRollCooldown: 1.6,   // seconds between dodge rolls
  dodgeRollSpeed: 16,       // burst speed during a roll
  staminaDodgeCost: 18,     // stamina a dodge roll burns
});
