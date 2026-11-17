// raceleague.js — the Solmar Street League. Two new circuits join the
// rotation (the Beachfront Sprint down the south roads and the Solmar
// Grand Prix, a full-city loop), and every race now counts toward a
// season championship: Mara against Rico, Tasha and Benny, points for
// every finish, a live standings board, and the Grand Prix finale —
// win it after unlocking it and Mara is crowned Solmar Champion, with a
// $5,000 champion's purse on top of the race prize.

import { RACE_CIRCUITS } from './races.js';

const LEAGUE_RIVALS = [
  { name: 'Rico "Redline" Vega', short: 'Rico', points: 0 },
  { name: 'Tasha Cole', short: 'Tasha', points: 0 },
  { name: 'Benny "Bumper" Ortiz', short: 'Benny', points: 0 },
];

const POINTS_FOR_PLACE = [10, 6, 4, 2];
const GP_UNLOCK_POINTS = 30;
const GP_CHAMPION_PRIZE = 5000;

const LEAGUE_CIRCUITS = [
  {
    id: 'beachfront',
    name: 'Beachfront Sprint',
    laps: 2,
    prize: [2000, 1000, 500, 250],
    points: [
      { x: -100, z: 300 }, { x: 60, z: 300 }, { x: 220, z: 300 }, { x: 300, z: 300 },
      { x: 300, z: 220 }, { x: 220, z: 220 }, { x: 60, z: 220 }, { x: -100, z: 220 },
    ],
  },
  {
    id: 'grandprix',
    name: 'Solmar Grand Prix',
    laps: 3,
    prize: [5000, 2500, 1200, 600],
    points: [
      { x: 60, z: 60 }, { x: 220, z: 60 }, { x: 300, z: 60 }, { x: 300, z: -100 },
      { x: 300, z: -180 }, { x: 140, z: -180 }, { x: -100, z: -180 }, { x: -260, z: -180 },
      { x: -260, z: -20 }, { x: -260, z: 140 }, { x: -100, z: 140 }, { x: -100, z: 60 },
    ],
  },
];

export function createRaceLeague(G) {
  for (const c of LEAGUE_CIRCUITS) {
    if (!RACE_CIRCUITS.some((old) => old.id === c.id)) RACE_CIRCUITS.push(c);
  }
  const league = {
    points: 0,
    rounds: 0,
    rivals: LEAGUE_RIVALS.map((r) => ({ ...r })),
    gpUnlocked: false,
    gpWon: false,
    champion: false,
    lastSeen: { wins: 0, podiums: 0, races: 0 },
    lastCircuitId: null,
    gpAnnounced: false,
  };
  // Restore a season in progress from the save.
  if (G.saveData?.league) {
    league.points = G.saveData.league.points ?? 0;
    league.rounds = G.saveData.league.rounds ?? 0;
    league.gpUnlocked = G.saveData.league.gpUnlocked ?? false;
    league.gpWon = G.saveData.league.gpWon ?? false;
    league.champion = G.saveData.league.champion ?? false;
    if (Array.isArray(G.saveData.league.rivals)) {
      for (const saved of G.saveData.league.rivals) {
        const r = league.rivals.find((x) => x.short === saved.short);
        if (r) r.points = saved.points ?? 0;
      }
    }
  }
  G.league = league;
  return league;
}

// The standings table, best first, as one readable line.
export function leagueStandingsText(G) {
  const l = G.league;
  const rows = [
    { name: 'Mara Solano', short: 'Mara', points: l.points, me: true },
    ...l.rivals,
  ].sort((a, b) => b.points - a.points);
  return rows.map((r, i) => `${i + 1}. ${r.short} ${r.points}pts${r.me ? ' (you)' : ''}`).join('  ·  ');
}

export function leagueStatusText(G) {
  const l = G.league;
  const gp = l.champion ? 'Solmar Champion!' : l.gpUnlocked ? 'Grand Prix UNLOCKED — race it (G at the banner)' : `Grand Prix unlocks at ${GP_UNLOCK_POINTS}pts`;
  return `Street League — ${l.rounds} rounds · ${leagueStandingsText(G)} · ${gp}`;
}

function rivalPointsForRound(G, round) {
  // Seeded-ish but lively: each rival scores 2–10 a round, so the table
  // moves even when Mara has a bad night.
  const roll = () => 2 + Math.floor(G.rng() * 9);
  return [roll(), roll(), roll()];
}

function awardRound(G, place) {
  const l = G.league;
  l.rounds++;
  const mine = POINTS_FOR_PLACE[Math.max(0, Math.min(3, place - 1))];
  l.points += mine;
  const rivalScores = rivalPointsForRound(G, l.rounds);
  l.rivals.forEach((r, i) => { r.points += rivalScores[i]; });
  const board = leagueStandingsText(G);
  G.hud.showDialogue([
    `LEAGUE — round ${l.rounds} done: you finished ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'} (+${mine}pts).`,
    board,
    l.gpUnlocked ? 'The Solmar Grand Prix is open — 3 laps, $5,000 to the winner.' : `${GP_UNLOCK_POINTS - l.points > 0 ? `${GP_UNLOCK_POINTS - l.points}pts to unlock the Solmar Grand Prix.` : 'The Solmar Grand Prix is open!'}`,
  ]);
  if (!l.gpUnlocked && l.points >= GP_UNLOCK_POINTS) {
    l.gpUnlocked = true;
    G.hud.toast('GRAND PRIX UNLOCKED! Race the full-city loop (G at the plaza banner).');
    G.audio.missionComplete();
  }
  G.save.save(G);
}

export function updateRaceLeague(G, dt) {
  const l = G.league;
  if (!l || !G.races) return;
  const ladder = G.races.ladder;
  const seen = l.lastSeen;

  // A race just ended when the ladder's race count moves: wins up means
  // Mara took 1st, podiums up without a win means 2nd or 3rd, anything
  // else is a finish outside the podium.
  if (ladder.races > seen.races) {
    const wasWin = ladder.wins > seen.wins;
    const wasPodium = ladder.podiums > seen.podiums;
    const place = wasWin ? 1 : wasPodium ? 2 : 4;
    l.lastCircuitId = G.races.circuit ? G.races.circuit.id : l.lastCircuitId;
    seen.wins = ladder.wins;
    seen.podiums = ladder.podiums;
    seen.races = ladder.races;

    // The Grand Prix is the championship decider: winning it while it is
    // unlocked crowns Mara champion of Solmar, with a purse to match.
    if (l.lastCircuitId === 'grandprix' && wasWin && l.gpUnlocked && !l.champion) {
      l.champion = true;
      l.gpWon = true;
      G.cash += GP_CHAMPION_PRIZE;
      G.hud.showDialogue([
        'SOLMAR CHAMPION — Mara Solano wins the Solmar Grand Prix!',
        `Champion's purse: $${GP_CHAMPION_PRIZE}. ${leagueStandingsText(G)}`,
        'Rico, Tasha and Benny will be telling this story for years. You just lived it.',
      ]);
      G.audio.missionComplete();
      G.save.save(G);
      return;
    }
    if (l.lastCircuitId === 'grandprix' && wasWin && !l.gpUnlocked) {
      G.hud.toast('Grand Prix won — but the championship was not unlocked yet. Bank the points and come back.');
    }
    awardRound(G, place);
    return;
  }
  seen.wins = ladder.wins;
  seen.podiums = ladder.podiums;
  seen.races = ladder.races;

  // Nudge the player toward the league while a race is running.
  if (G.races.active && G.races.circuit) {
    const c = G.races.circuit;
    if (c.id === 'grandprix' && l.gpUnlocked && !l.champion && !l.gpAnnounced) {
      l.gpAnnounced = true;
      G.hud.showDialogue([
        'THE SOLMAR GRAND PRIX — 3 laps around the whole city.',
        'Win this one and you are crowned Solmar Champion. No pressure, Mara.',
      ]);
    }
  }
}
