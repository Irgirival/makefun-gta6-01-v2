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
};
