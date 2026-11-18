// achievements.js — achievements v2 and the third scorecard page. The
// v7 scorecard listed what Mara did; v8 rewards it. Thirty achievements
// across six families — story, racing, money, chaos, craft and city life
// — each with a check that reads live game state, so nothing can be
// faked by editing a save: the achievement only unlocks when the game
// actually saw it happen. Unlocking one pays a small cash bonus and
// toasts the city, and the pause menu's third page shows the whole shelf:
// unlocked in gold, locked in grey, with the next one to chase at the
// top. The shelf persists in the save, so a career keeps its medals.

export const ACHIEVEMENTS_V8 = [
  { id: 'first-mission', name: 'Back in Solmar', desc: 'Finish Mission 1.', family: 'story', pay: 100 },
  { id: 'half-story', name: 'Half the City', desc: 'Finish 8 missions.', family: 'story', pay: 500 },
  { id: 'harbor-ledger', name: 'The Ledger Keeper', desc: 'Finish Mission 13.', family: 'story', pay: 700 },
  { id: 'finale', name: 'Solmar Sunrise', desc: 'Finish Mission 16 and watch the ceremony.', family: 'story', pay: 2000 },
  { id: 'first-win', name: 'Checkered Flag', desc: 'Win a street race.', family: 'racing', pay: 200 },
  { id: 'season2-champ', name: 'Season 2 Champion', desc: 'Win the race season 2 championship.', family: 'racing', pay: 1500 },
  { id: 'regatta-win', name: 'Queen of the Bay', desc: 'Win a Bay Regatta circuit.', family: 'racing', pay: 800 },
  { id: 'dyno-500', name: 'Five Hundred Horses', desc: 'Pull 500 hp or more on the dyno.', family: 'racing', pay: 600 },
  { id: 'rich-10k', name: 'Ten Grand', desc: 'Hold $10,000 at once.', family: 'money', pay: 300 },
  { id: 'rich-50k', name: 'Solmar Rich', desc: 'Hold $50,000 at once.', family: 'money', pay: 1000 },
  { id: 'courier-10', name: 'Express Star', desc: 'Deliver 10 Solmar Express parcels.', family: 'money', pay: 400 },
  { id: 'high-roller', name: 'High Roller', desc: 'Win a poker pot of $1,000 or more.', family: 'money', pay: 500 },
  { id: 'five-stars', name: 'Most Wanted', desc: 'Reach 5 wanted stars.', family: 'chaos', pay: 400 },
  { id: 'pit-survivor', name: 'Unspinnable', desc: 'Survive 5 PIT hits.', family: 'chaos', pay: 500 },
  { id: 'k9-escape', name: 'Faster Than the Dog', desc: 'Escape the K9 unit 3 times.', family: 'chaos', pay: 600 },
  { id: 'firefighter', name: 'Engine 7', desc: 'Extinguish 5 fire callouts.', family: 'chaos', pay: 500 },
  { id: 'paint-master', name: 'Color Theory', desc: 'Buy 3 paint jobs at the paint shop.', family: 'craft', pay: 300 },
  { id: 'two-tone', name: 'Two-Tone', desc: 'Fit a two-tone roof.', family: 'craft', pay: 250 },
  { id: 'turbo-max', name: 'Full Boost', desc: 'Reach turbo level 3.', family: 'craft', pay: 400 },
  { id: 'unicorn-trio', name: 'Unicorn Hunter', desc: 'Find all 3 unicorn cars.', family: 'craft', pay: 900 },
  { id: 'photo-walk', name: 'The Photo Walk', desc: 'Complete the five-stop photo walk.', family: 'city', pay: 500 },
  { id: 'landmarks-all', name: 'Tour Guide', desc: 'Visit every Old Town landmark.', family: 'city', pay: 600 },
  { id: 'summit', name: 'Top of Solmar', desc: 'Reach the mountain summit.', family: 'city', pay: 400 },
  { id: 'performer-fan', name: 'Street Regular', desc: 'Tip performers 10 times.', family: 'city', pay: 300 },
  { id: 'night-owl', name: 'Night Owl', desc: 'Win a night race.', family: 'city', pay: 350 },
  { id: 'charter-flyer', name: 'Frequent Flyer', desc: 'Take the charter flight.', family: 'city', pay: 250 },
  { id: 'dawn-run', name: 'Dawn Runner', desc: 'Record a dawn run under 90 seconds.', family: 'story', pay: 800 },
  { id: 'jam-survivor', name: 'Gridlock Ghost', desc: 'Drive through a highway jam.', family: 'chaos', pay: 350 },
  { id: 'front-watcher', name: 'Storm Watcher', desc: 'Watch a cold front cross the city.', family: 'city', pay: 300 },
  { id: 'collector-5', name: 'Full Garage', desc: 'Own all 5 collection cars.', family: 'craft', pay: 1200 },
];

function checkAchievement(G, id) {
  switch (id) {
    case 'first-mission': return G.missions.index >= 1;
    case 'half-story': return G.missions.index >= 8;
    case 'harbor-ledger': return G.missions.index >= 13;
    case 'finale': return !!(G.missions5 && G.missions5.finaleDone);
    case 'first-win': return !!(G.races && G.races.ladder.wins >= 1);
    case 'season2-champ': return !!(G.season2 && G.season2.champion);
    case 'regatta-win': return !!(G.regatta && G.regatta.wins >= 1);
    case 'dyno-500': return !!(G.garageV8 && G.garageV8.dyno.bestHp >= 500);
    case 'rich-10k': return G.cash >= 10000;
    case 'rich-50k': return G.cash >= 50000;
    case 'courier-10': return !!(G.delivery && G.delivery.done >= 10);
    case 'high-roller': return !!(G.poker && G.poker.biggestPot >= 1000);
    case 'five-stars': return !!(G.wanted && G.wanted.maxStarsSeen >= 5);
    case 'pit-survivor': return !!(G.k9 && G.k9.pitHits >= 5);
    case 'k9-escape': return !!(G.k9 && G.k9.escapes >= 3);
    case 'firefighter': return !!(G.fireCallouts && G.fireCallouts.callouts >= 5);
    case 'paint-master': return !!(G.garageV8 && G.garageV8.paintsBought >= 3);
    case 'two-tone': return !!(G.garageV8 && G.garageV8.twoTone);
    case 'turbo-max': return !!(G.garageV7 && G.garageV7.turboLevel >= 3);
    case 'unicorn-trio': return !!(G.unicornHunt && G.unicornHunt.found.length >= 3);
    case 'photo-walk': return !!(G.photoWalk && G.photoWalk.done);
    case 'landmarks-all': return !!(G.oldtown && G.oldtown.landmarks && Object.keys(G.oldtown.visited).length >= G.oldtown.landmarks.length);
    case 'summit': return !!(G.mountain && G.mountain.summitVisits >= 1);
    case 'performer-fan': return !!(G.performersV7 && G.performersV7.tipsGiven >= 10);
    case 'night-owl': return !!(G.races && G.races.ladder.nightWins >= 1);
    case 'charter-flyer': return !!(G.charterRides && G.charterRides >= 1);
    case 'dawn-run': return !!(G.missions5 && G.missions5.bestDawnSeconds !== null && G.missions5.bestDawnSeconds < 90);
    case 'jam-survivor': return !!(G.trafficV8 && G.trafficV8.jamsTotal >= 1 && G.driving);
    case 'front-watcher': return !!(G.weatherV8 && G.weatherV8.frontPassed >= 1);
    case 'collector-5': return !!(G.collection && G.collection.owned.length >= 5);
    default: return false;
  }
}

export function createAchievements(G) {
  if (G.achievements) return G.achievements;
  const saved = (G.saveData && G.saveData.v8 && G.saveData.v8.achievements) || [];
  G.achievements = {
    unlocked: [...saved],
    earned: 0,
    checkedAt: 0,
  };
  return G.achievements;
}

export function unlockAchievement(G, def) {
  const a = G.achievements;
  if (!a || a.unlocked.includes(def.id)) return false;
  a.unlocked.push(def.id);
  a.earned += def.pay;
  G.cash += def.pay;
  G.hud.toast(`🏆 Achievement: ${def.name} — ${def.desc} (+$${def.pay})`);
  if (G.audio && G.audio.cheer) G.audio.cheer();
  return true;
}

// Check the whole shelf: cheap enough to run once a second, and it only
// toasts when something actually unlocks.
export function updateAchievements(G, dt) {
  const a = G.achievements;
  if (!a) return;
  a.checkedAt += dt;
  if (a.checkedAt < 1) return;
  a.checkedAt = 0;
  for (const def of ACHIEVEMENTS_V8) {
    if (a.unlocked.includes(def.id)) continue;
    let ok = false;
    try { ok = checkAchievement(G, def.id); } catch (err) { ok = false; }
    if (ok) unlockAchievement(G, def);
  }
}

export function achievementCount(G) {
  const a = G.achievements;
  return a ? a.unlocked.length : 0;
}

export function nextAchievement(G) {
  const a = G.achievements;
  if (!a) return null;
  return ACHIEVEMENTS_V8.find((d) => !a.unlocked.includes(d.id)) || null;
}

// The third scorecard page: the shelf, unlocked in gold, locked in grey,
// with the next achievement to chase at the top.
export function renderV8Stats(G) {
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  const a = G.achievements;
  if (!a) return;
  const rows = [];
  rows.push(['Achievements', `${a.unlocked.length}/${ACHIEVEMENTS_V8.length} unlocked · $${a.earned} earned from medals`]);
  const next = nextAchievement(G);
  if (next) rows.push(['Next medal', `${next.name} — ${next.desc} (+$${next.pay})`]);
  const fams = ['story', 'racing', 'money', 'chaos', 'craft', 'city'];
  for (const fam of fams) {
    const defs = ACHIEVEMENTS_V8.filter((d) => d.family === fam);
    const got = defs.filter((d) => a.unlocked.includes(d.id)).length;
    rows.push([fam[0].toUpperCase() + fam.slice(1), `${got}/${defs.length} — ${defs.map((d) => (a.unlocked.includes(d.id) ? '★' : '☆') + ' ' + d.name).join(' · ')}`]);
  }
  const m5 = G.missions5;
  if (m5) rows.push(['Finale', m5.finaleDone ? 'Solmar Sunrise complete — the ceremony sparks orbit the fountain' : `${Math.min(G.missions.index, 16)}/16 missions`]);
  const w8 = G.weatherV8;
  if (w8) rows.push(['Weather v2', weatherV8Line(G)]);
  const t8 = G.trafficV8;
  if (t8) rows.push(['Highway', `trips ${Math.floor(t8.highwayTrips)} · jams ${t8.jamsTotal} · chained ${t8.chainsTotal}`]);
  const g8 = G.garageV8;
  if (g8) rows.push(['Paint & dyno', `${g8.paintsBought} paint jobs · best dyno ${g8.dyno.bestHp} hp`]);
  const r8 = G.radioV8;
  if (r8) rows.push(['Radio v2', `${r8.bulletins} bulletins · last: ${r8.lastTopic}`]);
  const pr = G.pedRoutines;
  if (pr) rows.push(['City routines', `${Object.keys(pr.jobsSeen).length}/5 jobs seen · ${pr.waves} waves`]);
  panel.innerHTML += rows.map(([k, v]) =>
    `<div class="statRow"><span class="statKey">${k}</span><span class="statVal">${v}</span></div>`).join('');
}

function weatherV8Line(G) {
  const w8 = G.weatherV8;
  if (!w8) return '—';
  return `fronts ${w8.frontPassed} · strikes ${w8.strikes} · forecast ${w8.forecast}`;
}

export function achievementsSummary(G) {
  const a = G.achievements;
  if (!a) return 'Achievements not started yet.';
  return `${a.unlocked.length}/${ACHIEVEMENTS_V8.length} achievements · $${a.earned} earned · next: ${nextAchievement(G)?.name || 'shelf complete'}.`;
}
