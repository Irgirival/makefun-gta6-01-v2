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
          const name = { downtown: 'Downtown', harbor: 'Harbor', airfield: 'Airfield', verde: 'Verde' }[id] || id;
          return `${name} ${time.toFixed(1)}s`;
        })
        .join(' · ') || 'no timed races yet';
      const hours = Math.floor(G.elapsed / 3600);
      const mins = Math.floor((G.elapsed % 3600) / 60);
      const rows = [
        ['Story', `${Math.min(m.index, 7)} / 7 missions — ${m.index >= 7 ? 'Solmar is yours' : 'the city is still out there'}`],
        ['Cash', `$${Math.floor(G.cash).toLocaleString('en-US')}`],
        ['Racing', `${l.wins} wins · ${l.podiums} podiums · ${l.races} races`],
        ['Fastest times', bests],
        ['Vigilante', `${v.bounties} bounties · $${v.earned} earned`],
        ['Harbor tours', `${t.done + mt.done} tours · $${t.earned + mt.earned} earned`],
        ['Hidden packages', `${m.collectedCount || 0} / 12 found`],
        ['Garage', `Engine Lv${g.engineLevel} · Armor Lv${g.armorLevel}${g.neon ? ' · Neon' : ''}`],
        ['Radio', G.radio ? G.radio.station().name : 'Off'],
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
  return `${l.wins} race wins, ${v.bounties} bounties, ${G.missions.index} missions done, $${Math.floor(G.cash)} in pocket.`;
}
