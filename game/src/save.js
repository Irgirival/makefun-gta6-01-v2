// save.js — progress lives in localStorage under one key: cash, mission
// index, collected packages, health/armor, the player's position and the
// clock. Saving is explicit (mission complete, package found, quit) and
// loading is tolerant: a corrupt or missing save starts a fresh game.

const SAVE_KEY = 'solmar-city-save-v1';

export function createSave(G) {
  const save = {
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return null;
        return data;
      } catch (err) {
        return null;
      }
    },
    save(G) {
      try {
        const data = {
          cash: Math.floor(G.cash),
          health: Math.round(G.health),
          armor: Math.round(G.armor),
          missionIndex: G.missions.index,
          packages: G.missions.packages.filter((p) => p.collected).map((p) => p.index),
          packagesCollected: G.missions.collectedCount,
          pos: G.driving
            ? { x: G.driving.pos.x, z: G.driving.pos.z }
            : { x: G.player.pos.x, z: G.player.pos.z },
          clockMinutes: Math.floor(G.clockMinutes),
          savedAt: Date.now(),
          // v3: racing ladder, garage tuning, radio station, bounties.
          races: G.races ? {
            wins: G.races.ladder.wins, podiums: G.races.ladder.podiums,
            races: G.races.ladder.races, best: G.races.ladder.best,
            circuitIndex: G.races.circuitIndex,
            bestTimes: G.races.ladder.bestTimes || {},
          } : null,
          garage: G.garage ? {
            paintIndex: G.garage.paintIndex, engineLevel: G.garage.engineLevel,
            armorLevel: G.garage.armorLevel, ownedId: G.garage.ownedId,
            ownedType: G.garage.ownedType,
            neon: G.garage.neon, neonColor: G.garage.neonColor,
          } : null,
          radioIndex: G.radio ? G.radio.index : 0,
          vigilante: G.vigilante ? {
            bounties: G.vigilante.bounties, earned: G.vigilante.earned,
          } : null,
          safehouseVisits: G.safehouse ? G.safehouse.visits : 0,
          // v4: street-league season and the jet-ski trial best time.
          league: G.league ? {
            points: G.league.points, rounds: G.league.rounds,
            gpUnlocked: G.league.gpUnlocked, gpWon: G.league.gpWon,
            champion: G.league.champion,
            rivals: G.league.rivals.map((r) => ({ short: r.short, points: r.points })),
          } : null,
          jetskiBest: G.jetskis ? G.jetskis.trial.best : null,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (err) {
        // Storage may be unavailable (private mode, headless): the game
        // still plays; it just does not persist.
      }
    },
    clear() {
      try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
    },
    exists() {
      try { return localStorage.getItem(SAVE_KEY) !== null; } catch (err) { return false; }
    },
  };
  G.save = save;
  G.saveData = save.load();
  return save;
}
