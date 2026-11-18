// stats.js — Mara's career record: everything she has done in Solmar City,
// rendered into the pause menu as a living scorecard. It reads only state
// the other systems already keep (missions, packages, the racing ladder,
// vigilante bounties, harbor tours, the garage), so it can never drift out
// of sync with the game — and it gives the player a reason to chase the
// next number: one more win, one more bounty, one more tour.

export function createStats(G) {
  const panel = document.getElementById('statsPanel');
  const stats = {
    panel,
    render() {
      if (!panel) return;
      const m = G.missions;
      const l = G.races ? G.races.ladder : { wins: 0, podiums: 0, races: 0, best: null, bestTimes: {} };
      const v = G.vigilante || { bounties: 0, earned: 0 };
      const t = (G.boats && G.boats.tour) || { done: 0, earned: 0 };
      const mt = (G.boats && G.boats.marina) || { done: 0, earned: 0 };
      const g = G.garage || { engineLevel: 0, armorLevel: 0, neon: false };
      const bests = Object.entries(l.bestTimes || {})
        .map(([id, time]) => {
          const name = { downtown: 'Downtown', harbor: 'Harbor', airfield: 'Airfield', verde: 'Verde', uptown: 'Uptown', 'midnight-beach': 'Midnight Beach' }[id] || id;
          return `${name} ${time.toFixed(1)}s`;
        })
        .join(' · ') || 'no timed races yet';
      const hours = Math.floor(G.elapsed / 3600);
      const mins = Math.floor((G.elapsed % 3600) / 60);
      const rows = [
        ['Story', `${Math.min(m.index, 10)} / 10 missions — ${m.index >= 10 ? 'Solmar is yours' : 'the city is still out there'}`],
        ['Cash', `$${Math.floor(G.cash).toLocaleString('en-US')}`],
        ['Racing', `${l.wins} wins · ${l.podiums} podiums · ${l.races} races`],
        ['Fastest times', bests],
        // v5: the new scorecard rows — night wins, the table floor, the
        // wardrobe, the camera and the street-life tips.
        ['Night races', `${(l.nightWins || 0)} wins after dark`],
        ['Casino tables', G.casinogames ? `${G.casinogames.bjHands} blackjack hands · roulette ${G.casinogames.rouletteWins > 0 ? '+$' + G.casinogames.rouletteWins : 'no wins yet'}` : 'not visited yet'],
        ['Wardrobe', G.safehouse ? `${(G.safehouse.ownedOutfits || []).length} outfits owned${G.safehouse.equippedOutfit ? ` · wearing ${G.safehouse.equippedOutfit}` : ''}` : '—'],
        ['Photo mode', G.photomode ? `${G.photomode.snaps} snapshots taken` : '—'],
        ['Street life', G.streetLife ? `${G.streetLife.performers} performers · ${G.streetLife.stalls} stalls · ${G.streetLife.tips} tips dropped` : '—'],
        ['Vigilante', `${v.bounties} bounties · $${v.earned} earned`],
        ['Harbor tours', `${t.done + mt.done} tours · $${t.earned + mt.earned} earned`],
        ['Hidden packages', `${m.collectedCount || 0} / 12 found`],
        ['Garage', `Engine Lv${g.engineLevel} · Armor Lv${g.armorLevel}${g.neon ? ' · Neon' : ''}${g.suspensionLevel ? ` · Suspension Lv${g.suspensionLevel}` : ''}`],
        ['Radio', G.radio ? G.radio.station().name : 'Off'],
        // v6: the new scorecard rows — VIP work, poker, the collection, the
        // Guard, the landmarks and the mountain.
        ['VIP jobs', G.vip ? `${G.vip.jobs} jobs · $${G.vip.earned} earned · rating ${G.vip.rating.toFixed(1)}★` : '—'],
        ['Poker', G.poker ? `${G.poker.handsPlayed} hands · ${G.poker.handsWon} won · biggest pot $${G.poker.biggestPot}` : '—'],
        ['Car collection', G.collection ? `${G.collection.owned.length}/5 — ${G.collection.owned.map((o) => o.name).join(', ') || 'nothing yet'}` : '—'],
        ['Military', G.military ? `${G.military.apcSpawns} Guard deployments · ${G.military.escapes} escapes` : '—'],
        ['Landmarks', G.oldtown ? `${Object.keys(G.oldtown.visited).length}/${G.oldtown.landmarks.length} visited` : '—'],
        ['Bus & fire', G.busfire ? `${G.busfire.fares} riders · $${G.busfire.fareEarned} fares · ${G.busfire.hydrantHits} hydrants` : '—'],
        ['Time in Solmar', `${hours}h ${String(mins).padStart(2, '0')}m`],
        ['Wanted now', G.wanted.stars > 0 ? `${G.wanted.stars} star${G.wanted.stars > 1 ? 's' : ''} — the PD is looking` : 'clean — for now'],
      ];
      panel.innerHTML = rows.map(([k, v]) =>
        `<div class="statRow"><span class="statKey">${k}</span><span class="statVal">${v}</span></div>`).join('');
    },
  };
  G.stats = stats;
  return stats;
}

export function updateStats(G) {
  // Called when the pause menu opens (and only then — the panel is hidden
  // the rest of the time, so there is nothing to keep fresh).
  if (G.stats) G.stats.render();
}

export function careerSummary(G) {
  // One line for toasts and the end screen: the career in a sentence.
  const l = G.races ? G.races.ladder : { wins: 0, races: 0 };
  const v = G.vigilante || { bounties: 0 };
  // v5: the camera and the tables join the career line.
  const snaps = G.photomode ? G.photomode.snaps : 0;
  const tables = G.casinogames ? G.casinogames.bjHands : 0;
  // v6: the VIP job, the poker table and the collection join it too.
  const vipJobs = G.vip ? G.vip.jobs : 0;
  const pokerHands = G.poker ? G.poker.handsPlayed : 0;
  const cars = G.collection ? G.collection.owned.length : 0;
  return `${l.wins} race wins, ${v.bounties} bounties, ${G.missions.index} missions done, ${snaps} snapshots, ${tables} blackjack hands, ${vipJobs} VIP jobs, ${pokerHands} poker hands, ${cars}/5 cars collected, $${Math.floor(G.cash)} in pocket.`;
}

// v7: the second page of the scorecard. The base render() owns the
// first page; this one appends the v7 rows — deliveries, season 2,
// the K9 record, the regatta, the unicorns, the photo walk and the
// story so far — so the pause menu tells the whole career, not just
// the first six versions of it. It runs only when the pause menu opens,
// right after the base render, so it never costs a frame in play.

export function renderV7Stats(G) {
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  const rows = [];
  const d = G.delivery;
  if (d) rows.push(['Solmar Express', `${d.done} parcels · $${d.earned} earned · best streak ${d.bestStreak}`]);
  const s2 = G.season2;
  if (s2) rows.push(['Race season 2', `${s2.wins} wins · ${s2.points} points · champion: ${s2.champion ? 'YES' : 'not yet'}`]);
  const k9 = G.k9;
  if (k9) rows.push(['K9 & PIT', `${k9.pitHits} PIT hits taken · ${k9.captures} K9 captures`]);
  const reg = G.regatta;
  if (reg) rows.push(['Bay Regatta', `${reg.wins} circuits · best ${reg.bestTime === null ? '—' : reg.bestTime.toFixed(1) + 's'}`]);
  const uh = G.unicornHunt;
  if (uh) rows.push(['Unicorn hunt', `${uh.found.length}/3 found · $${uh.bonusEarned} finder bonuses`]);
  const walk = G.photoWalk;
  if (walk) rows.push(['Photo walk', walk.done ? 'Complete — all five stops' : `${walk.stopIndex}/5 stops framed`]);
  const fc = G.fireCallouts;
  if (fc) rows.push(['Fire callouts', `${fc.callouts} fires out · $${fc.earned} earned`]);
  const m4 = G.missions4;
  if (m4) rows.push(['Story arc', `${Math.min(G.missions.index, 14)}/14 missions · ${m4.replays} replays`]);
  const c7 = G.combatV7;
  if (c7) rows.push(['Combat v7', c7.shotgunUnlocked ? `Shotgun owned · ${c7.finishers} finishers` : `${c7.finishers} combo finishers`]);
  const g7 = G.garageV7;
  if (g7) rows.push(['Garage v7', `Turbo Lv${g7.turboLevel}${g7.tires ? ' · bulletproof tires' : ''}${g7.hydraulics ? ' · hydraulics' : ''}`]);
  if (rows.length) {
    panel.innerHTML += rows.map(([k, v]) =>
      `<div class="statRow"><span class="statKey">${k}</span><span class="statVal">${v}</span></div>`).join('');
  }
}

// v7: the career in one sentence, second edition — the line the end
// screen shows when Mara finishes the whole fourteen-mission arc.
export function careerSummaryV7(G) {
  const base = careerSummary(G);
  const d = G.delivery;
  const s2 = G.season2;
  const extra = [
    d ? `${d.done} parcels delivered` : null,
    s2 ? (s2.champion ? 'season 2 champion' : `${s2.wins} season-2 wins`) : null,
    G.missions.index >= 14 ? 'all 14 missions done' : null,
  ].filter(Boolean).join(', ');
  return extra ? `${base} Plus: ${extra}.` : base;
}

// ---- v8: the career's third page, already written — see achievements.js --------
// The v8 scorecard's third page lives in achievements.js (renderV8Stats),
// because the shelf and the page are one system. This block is the
// stats module's own v8 row: the career totals the other pages do not
// own — the lifetime cash earned, the lifetime cash spent, and the
// cleanest day Mara ever had — so the pause menu's first page can quote
// the whole career in one breath.

export function careerTotalsV8(G) {
  const d = G.delivery ? G.delivery.earned : 0;
  const v = G.vigilante ? G.vigilante.earned : 0;
  const vip = G.vip ? G.vip.earned : 0;
  const fc = G.fireCallouts ? G.fireCallouts.earned : 0;
  const a = G.achievements ? G.achievements.earned : 0;
  const earned = d + v + vip + fc + a;
  const spent = (G.garageLoyalty ? G.garageLoyalty.lifetimeSpent : 0)
    + (G.garageV8 ? G.garageV8.paintSpent : 0);
  return { earned, spent };
}

export function careerSummaryV8(G) {
  const base = careerSummaryV7(G);
  const totals = careerTotalsV8(G);
  const finale = G.missions5 && G.missions5.finaleDone ? 'the sunrise ceremony is done' : `${Math.min(G.missions.index, 16)}/16 missions`;
  return `${base} Lifetime: $${totals.earned} earned on the job, $${totals.spent} spent at the garage. Finale: ${finale}.`;
}
