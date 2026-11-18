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
            // v5: night-race wins ride with the ladder.
            nightWins: G.races.ladder.nightWins || 0,
          } : null,
          garage: G.garage ? {
            paintIndex: G.garage.paintIndex, engineLevel: G.garage.engineLevel,
            armorLevel: G.garage.armorLevel, ownedId: G.garage.ownedId,
            ownedType: G.garage.ownedType,
            neon: G.garage.neon, neonColor: G.garage.neonColor,
            // v5: suspension level rides with the tune.
            suspensionLevel: G.garage.suspensionLevel || 0,
          } : null,
          radioIndex: G.radio ? G.radio.index : 0,
          vigilante: G.vigilante ? {
            bounties: G.vigilante.bounties, earned: G.vigilante.earned,
          } : null,
          safehouseVisits: G.safehouse ? G.safehouse.visits : 0,
          // v5: the wardrobe, the camera roll, the table floor and the
          // nitro bottle all persist with the rest of Mara's career.
          safehouseShop: G.safehouse ? {
            ownedOutfits: G.safehouse.ownedOutfits || [],
            equippedOutfit: G.safehouse.equippedOutfit || null,
          } : null,
          photoSnaps: G.photomode ? G.photomode.snaps : 0,
          casinoTables: G.casinogames ? {
            bjHands: G.casinogames.bjHands,
            bjWon: G.casinogames.bjWon,
            rouletteWins: G.casinogames.rouletteWins,
            rouletteLosses: G.casinogames.rouletteLosses,
          } : null,
          nitroTankLevel: G.nitro ? (G.nitro.tankLevel || 0) : 0,
          vigilanteContracts: G.vigilante ? (G.vigilante.contracts || 0) : 0,
          // v4: street-league season and the jet-ski trial best time.
          league: G.league ? {
            points: G.league.points, rounds: G.league.rounds,
            gpUnlocked: G.league.gpUnlocked, gpWon: G.league.gpWon,
            champion: G.league.champion,
            rivals: G.league.rivals.map((r) => ({ short: r.short, points: r.points })),
          } : null,
          jetskiBest: G.jetskis ? G.jetskis.trial.best : null,
          // v6: VIP career, poker, the collection, the Guard, the mountain
          // and the bus fares all persist with the rest of Mara's career.
          vip: G.vip ? {
            jobs: G.vip.jobs, earned: G.vip.earned, rating: G.vip.rating,
            ratingCount: G.vip.ratingCount, bestTip: G.vip.bestTip,
          } : null,
          poker: G.poker ? {
            handsPlayed: G.poker.handsPlayed, handsWon: G.poker.handsWon,
            biggestPot: G.poker.biggestPot,
          } : null,
          collection: G.collection ? {
            owned: G.collection.owned, calls: G.collection.calls,
            collected: G.collection.collected,
          } : null,
          military: G.military ? {
            apcSpawns: G.military.apcSpawns, escapes: G.military.escapes,
          } : null,
          mountain: G.mountain ? { summitVisits: G.mountain.summitVisits } : null,
          busfire: G.busfire ? {
            fares: G.busfire.fares, fareEarned: G.busfire.fareEarned,
            hydrantHits: G.busfire.hydrantHits,
          } : null,
        };
        // v7: the delivery career, season 2, the K9 record and the
        // mission replays all persist with the rest of Mara's career.
        data.v7 = {
          deliveries: G.delivery ? {
            done: G.delivery.done, earned: G.delivery.earned,
            bestStreak: G.delivery.bestStreak,
          } : null,
          season2: G.season2 ? {
            points: G.season2.points, rounds: G.season2.rounds,
            wins: G.season2.wins, champion: G.season2.champion,
          } : null,
          k9: G.k9 ? {
            captures: G.k9.captures, pitHits: G.k9.pitHits,
          } : null,
          missions4: G.missions4 ? { replays: G.missions4.replays || 0 } : null,
        };
        // v8: the finale arc, the paint shop and dyno, the highway
        // record, the weather fronts, the achievements, season 3, the
        // regatta league and the safehouse vault — the save's third drawer.
        data.v8 = v8SaveData(G);
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

// ---- v8: the save's third drawer ------------------------------------------------
// The v7 save kept deliveries, season 2, the K9 record and the mission
// replays in data.v7; v8 adds data.v8 — the finale arc, the paint shop
// and dyno, the highway record, the weather fronts, the radio news,
// the routines, the achievements and the safehouse vault. The drawer is
// read back in main.js, next to v7's, so a career keeps its medals.

export function v8SaveData(G) {
  return {
    missions5: G.missions5 ? {
      finaleDone: G.missions5.finaleDone,
      conSwaps: G.missions5.conSwaps,
      dawnRuns: G.missions5.dawnRuns,
      bestDawnSeconds: G.missions5.bestDawnSeconds,
      ceremonyPaid: G.missions5.ceremonyPaid,
    } : null,
    garageV8: G.garageV8 ? {
      baseId: G.garageV8.baseId,
      flakeId: G.garageV8.flakeId,
      finishId: G.garageV8.finishId,
      twoTone: G.garageV8.twoTone,
      paintsBought: G.garageV8.paintsBought,
      paintSpent: G.garageV8.paintSpent,
      dynoBestHp: G.garageV8.dyno.bestHp,
      dynoBestTop: G.garageV8.dyno.bestTop,
      dynoBestAccel: G.garageV8.dyno.bestAccel,
      dynoPulls: G.garageV8.dyno.pulls,
    } : null,
    trafficV8: G.trafficV8 ? {
      jamsTotal: G.trafficV8.jamsTotal,
      chainsTotal: G.trafficV8.chainsTotal,
      towsTotal: G.trafficV8.towsTotal,
      highwayTrips: Math.floor(G.trafficV8.highwayTrips),
    } : null,
    weatherV8: G.weatherV8 ? {
      frontPassed: G.weatherV8.frontPassed,
      strikes: G.weatherV8.strikes,
      gusts: G.weatherV8.gusts,
    } : null,
    achievements: G.achievements ? [...G.achievements.unlocked] : [],
    achievementEarned: G.achievements ? G.achievements.earned : 0,
    season3: G.season3 ? {
      points: G.season3.points, rounds: G.season3.rounds,
      wins: G.season3.wins, champion: G.season3.champion,
      midnightWins: G.season3.midnightWins,
    } : null,
    regattaLeague: G.regattaLeague ? {
      points: G.regattaLeague.points, wins: G.regattaLeague.wins,
      champion: G.regattaLeague.champion,
    } : null,
    safehouseV8: G.safehouseV8 ? {
      vault: G.safehouseV8.vault,
      vaultDeposits: G.safehouseV8.vaultDeposits,
      trophies: [...G.safehouseV8.trophies],
    } : null,
  };
}

export function v8SaveSummary(G) {
  const d = v8SaveData(G);
  const parts = [];
  if (d.missions5) parts.push(`finale ${d.missions5.finaleDone ? 'done' : 'not yet'}`);
  if (d.achievements) parts.push(`${d.achievements.length} achievements`);
  if (d.season3) parts.push(`season 3 ${d.season3.wins} wins`);
  return parts.join(' · ') || 'nothing to save yet';
}
