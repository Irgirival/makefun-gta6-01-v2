// poker.js — Texas Hold'em lite at the Verde Casino (v6). Press Z to sit
// at the high-roller table: a $100 buy-in gets 1,000 chips, Mara plays
// against three AI regulars — cool-headed Lena, reckless Vic and careful
// Rosa — through a full flop, turn and river. Cash out any time and the
// chips come back as dollars. The table pauses the street while Mara plays.

import { casinoNearDoor } from './casino.js';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];
const RED_SUIT = { '♥': true, '♦': true };
const HAND_NAMES = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight',
  'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

const AI_NAMES = ['Lena', 'Vic', 'Rosa'];
const AI_STYLE = [
  { name: 'Lena', bold: 0.35, bluff: 0.1 },
  { name: 'Vic', bold: 0.75, bluff: 0.35 },
  { name: 'Rosa', bold: 0.2, bluff: 0.05 },
];

function newDeck(rng) {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s, v: RANKS.indexOf(r) + 2 });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardLabel(c) {
  return c.r + c.s;
}

// Best 5-card hand out of 7: returns [category, ...tiebreakers].
function evalHand(cards) {
  let best = null;
  const n = cards.length;
  const idx = [0, 1, 2, 3, 4];
  const consider = (five) => {
    const score = scoreFive(five);
    if (!best || compareScore(score, best) > 0) best = score;
  };
  const walk = (start, depth) => {
    if (depth === 5) { consider(idx.map((i) => cards[i])); return; }
    for (let i = start; i <= n - (5 - depth); i++) {
      idx[depth] = i;
      walk(i + 1, depth + 1);
    }
  };
  walk(0, 0);
  return best;
}

function compareScore(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

function scoreFive(five) {
  const vals = five.map((c) => c.v).sort((a, b) => b - a);
  const flush = five.every((c) => c.s === five[0].s);
  const uniq = [...new Set(vals)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5) straightHigh = 5; // wheel A-2-3-4-5
  }
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts).map(([v, c]) => [c, Number(v)])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kickers = groups.map((g) => g[1]);
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0][0] === 4) return [7, groups[0][1], kickers[1]];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
  if (flush) return [5, ...vals];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][0] === 3) return [3, groups[0][1], ...kickers.slice(1)];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, Math.max(groups[0][1], groups[1][1]), Math.min(groups[0][1], groups[1][1]), kickers[2]];
  if (groups[0][0] === 2) return [1, groups[0][1], ...kickers.slice(1)];
  return [0, ...vals];
}

export function createPoker(G) {
  const el = document.createElement('div');
  el.id = 'pokerTable';
  el.style.cssText = 'position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:rgba(4,20,12,.88);font-family:"Segoe UI",Arial,sans-serif;color:#fff;';
  el.innerHTML = `
    <div style="width:720px;max-width:94vw;background:#0d4a2a;border:4px solid #d8a03a;border-radius:18px;padding:18px 22px;box-shadow:0 0 60px #000;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;font-size:24px;letter-spacing:2px;color:#ffd23e;">VERDE POKER — HIGH-ROLLER TABLE</h2>
        <span id="pokerChips" style="font-size:18px;font-weight:800;color:#7dff9a;"></span>
      </div>
      <div id="pokerFelt" style="margin-top:12px;min-height:120px;background:#14663a;border-radius:12px;padding:12px;font-size:15px;line-height:1.7;"></div>
      <div id="pokerLog" style="margin-top:10px;min-height:64px;font-size:13px;color:#cfe8d8;line-height:1.5;"></div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button id="pokerCheck" style="flex:1;padding:10px;font-size:16px;font-weight:700;border-radius:6px;border:1px solid #ffd23e;background:#ffe98a;color:#1a1206;cursor:pointer;">CHECK</button>
        <button id="pokerBet" style="flex:1;padding:10px;font-size:16px;font-weight:700;border-radius:6px;border:1px solid #ffd23e;background:#ffb52e;color:#1a1206;cursor:pointer;">BET $50</button>
        <button id="pokerFold" style="flex:1;padding:10px;font-size:16px;font-weight:700;border-radius:6px;border:1px solid #fff;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;">FOLD</button>
        <button id="pokerCash" style="flex:1;padding:10px;font-size:16px;font-weight:700;border-radius:6px;border:1px solid #7dff9a;background:#1a6a3a;color:#fff;cursor:pointer;">CASH OUT</button>
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:#9fc3a8;">Z — leave the table · $100 buy-in = 1,000 chips · chips cash out at 10:1 · Lena plays cool, Vic bluffs, Rosa never bluffs.</p>
    </div>`;
  document.body.appendChild(el);

  const poker = {
    open: false,
    el,
    chips: 1000,
    pot: 0,
    stage: 0,           // 0 preflop, 1 flop, 2 turn, 3 river, 4 showdown
    deck: [],
    community: [],
    hands: [[], [], [], []],
    folded: [false, false, false, false],
    bets: [0, 0, 0, 0],
    handsPlayed: 0,
    handsWon: 0,
    biggestPot: 0,
    boughtIn: false,
  };
  G.poker = poker;

  const $ = (id) => el.querySelector('#' + id);
  poker.render = () => {
    $('pokerChips').textContent = `Chips: ${poker.chips} · Pot: ${poker.pot}`;
    const cardHtml = (c) => `<span style="display:inline-block;background:#fff;color:${RED_SUIT[c.s] ? '#c00' : '#111'};border-radius:5px;padding:4px 8px;margin:2px;font-weight:800;font-size:17px;">${cardLabel(c)}</span>`;
    const backHtml = `<span style="display:inline-block;background:#274b8a;color:#fff;border-radius:5px;padding:4px 8px;margin:2px;font-weight:800;font-size:17px;">??</span>`;
    let felt = '<div>Community: ' + (poker.community.length ? poker.community.map(cardHtml).join('') : '<i>— no cards yet —</i>') + '</div>';
    felt += '<div style="margin-top:8px;">Your hand: ' + (poker.hands[0].length ? poker.hands[0].map(cardHtml).join('') : '<i>—</i>') + '</div>';
    for (let i = 1; i <= 3; i++) {
      const show = poker.stage >= 4 || poker.folded[i];
      felt += `<div>${AI_NAMES[i - 1]}: ${poker.hands[i].length ? (show ? poker.hands[i].map(cardHtml).join('') : backHtml + backHtml) : '<i>—</i>'} ${poker.folded[i] ? '<b style="color:#ff8a8a;">FOLDED</b>' : ''}</div>`;
    }
    if (poker.stage >= 4 && poker.hands[0].length) {
      const s = evalHand([...poker.hands[0], ...poker.community]);
      felt += `<div style="margin-top:6px;color:#ffe98a;">Your best hand: <b>${HAND_NAMES[s[0]]}</b></div>`;
    }
    $('pokerFelt').innerHTML = felt;
  };
  poker.log = (msg) => {
    const log = $('pokerLog');
    log.innerHTML = msg + '<br>' + log.innerHTML;
    const lines = log.innerHTML.split('<br>');
    if (lines.length > 5) log.innerHTML = lines.slice(0, 5).join('<br>');
  };

  const dealNewHand = () => {
    poker.deck = newDeck(G.rng);
    poker.community = [];
    poker.hands = [[], [], [], []];
    poker.folded = [false, false, false, false];
    poker.bets = [0, 0, 0, 0];
    poker.pot = 0;
    poker.stage = 0;
    for (let r = 0; r < 2; r++) for (let p = 0; p < 4; p++) poker.hands[p].push(poker.deck.pop());
    poker.handsPlayed++;
    poker.log('New hand dealt. The blinds are in — the table is watching you, Mara.');
    poker.render();
  };

  const aiAct = (i) => {
    if (poker.folded[i]) return;
    const style = AI_STYLE[i - 1];
    const hand = poker.hands[i].length && poker.community.length
      ? evalHand([...poker.hands[i], ...poker.community])
      : null;
    const strength = hand ? hand[0] : (poker.hands[i][0].v + poker.hands[i][1].v) / 28;
    const roll = G.rng();
    if (strength >= 2 || roll < style.bluff) {
      const bet = 50;
      poker.pot += bet;
      poker.bets[i] += bet;
      poker.log(`${AI_NAMES[i - 1]} bets $50.`);
    } else if (roll < style.bold + 0.3) {
      poker.log(`${AI_NAMES[i - 1]} checks.`);
    } else {
      poker.folded[i] = true;
      poker.log(`${AI_NAMES[i - 1]} folds.`);
    }
  };

  const advanceStage = () => {
    poker.stage++;
    if (poker.stage === 1) poker.community.push(poker.deck.pop(), poker.deck.pop(), poker.deck.pop());
    else if (poker.stage === 2 || poker.stage === 3) poker.community.push(poker.deck.pop());
    if (poker.stage >= 4) { showdown(); return; }
    poker.log(poker.stage === 1 ? 'The flop is out.' : poker.stage === 2 ? 'The turn is out.' : 'The river is out.');
    for (let i = 1; i <= 3; i++) aiAct(i);
    poker.render();
  };

  const showdown = () => {
    const alive = [0, 1, 2, 3].filter((i) => !poker.folded[i]);
    let winner = alive[0];
    let bestScore = evalHand([...poker.hands[winner], ...poker.community]);
    for (const i of alive.slice(1)) {
      const s = evalHand([...poker.hands[i], ...poker.community]);
      if (compareScore(s, bestScore) > 0) { winner = i; bestScore = s; }
    }
    poker.biggestPot = Math.max(poker.biggestPot, poker.pot);
    if (winner === 0) {
      poker.chips += poker.pot;
      poker.handsWon++;
      poker.log(`Showdown — you win $${poker.pot} with ${HAND_NAMES[bestScore[0]]}!`);
      G.audio.missionComplete();
    } else {
      poker.log(`Showdown — ${AI_NAMES[winner - 1]} takes $${poker.pot} with ${HAND_NAMES[bestScore[0]]}.`);
      G.audio.emptyClick();
    }
    poker.pot = 0;
    poker.render();
    setTimeout(() => { if (poker.open) dealNewHand(); }, 2500);
  };

  $('pokerCheck').addEventListener('click', () => {
    if (!poker.open || poker.stage >= 4 || !poker.hands[0].length) return;
    poker.log('You check.');
    for (let i = 1; i <= 3; i++) aiAct(i);
    advanceStage();
  });
  $('pokerBet').addEventListener('click', () => {
    if (!poker.open || poker.stage >= 4 || !poker.hands[0].length) return;
    if (poker.chips < 50) { poker.log('Not enough chips to bet — cash out or leave.'); return; }
    poker.chips -= 50;
    poker.pot += 50;
    poker.bets[0] += 50;
    poker.log('You bet $50.');
    G.audio.chipStack();
    for (let i = 1; i <= 3; i++) aiAct(i);
    advanceStage();
  });
  $('pokerFold').addEventListener('click', () => {
    if (!poker.open || poker.stage >= 4 || !poker.hands[0].length) return;
    poker.folded[0] = true;
    poker.log('You fold. The table takes the pot.');
    const alive = [1, 2, 3].filter((i) => !poker.folded[i]);
    if (alive.length) poker.log(`${AI_NAMES[alive[0] - 1]} scoops the pot.`);
    poker.pot = 0;
    poker.render();
    setTimeout(() => { if (poker.open) dealNewHand(); }, 1500);
  });
  $('pokerCash').addEventListener('click', () => closePoker(G, true));

  poker.dealNewHand = dealNewHand;
  return poker;
}

export function openPoker(G) {
  const p = G.poker;
  if (!p || p.open) return;
  // The high-roller table is inside the Verde — Mara has to be at the gold
  // doors (or already inside) to sit down, not out on the street.
  if (!G.casino.open && !casinoNearDoor(G)) {
    G.hud.toast('The poker table is inside the Verde Casino — head to the gold doors on the boardwalk.');
    return;
  }
  if (!p.boughtIn) {
    if (G.cash < 100) {
      G.hud.toast('The high-roller table needs a $100 buy-in — come back richer.');
      return;
    }
    G.cash -= 100;
    p.boughtIn = true;
    p.chips = 1000;
    G.hud.toast('Bought in for $100 — 1,000 chips. Good luck, Mara.');
  }
  p.open = true;
  p.el.style.display = 'flex';
  document.exitPointerLock?.();
  p.dealNewHand();
  G.audio.chipStack();
}

export function closePoker(G, cashOut = false) {
  const p = G.poker;
  if (!p || !p.open) return;
  p.open = false;
  p.el.style.display = 'none';
  if (cashOut && p.chips > 0) {
    const dollars = Math.floor(p.chips / 10);
    G.cash += dollars;
    G.hud.toast(`Cashed out ${p.chips} chips for $${dollars}. The Verde thanks you.`);
    p.chips = 0;
    p.boughtIn = false;
    G.save.save(G);
  }
}

export function updatePoker(G, dt) {
  const p = G.poker;
  if (!p) return;
  if (G.mode === 'playing' && G.input.pressed('poker')) {
    if (p.open) closePoker(G, false);
    else openPoker(G);
  }
}

export function pokerSummary(G) {
  const p = G.poker;
  if (!p) return 'Poker — table not built.';
  return `Poker hands ${p.handsPlayed} · won ${p.handsWon} · biggest pot $${p.biggestPot}`;
}

// v7: the sit-and-go tournament. Four players, one table, rising
// blinds: every ten hands the blinds double, the short stacks start
// sweating, and the last player standing takes the $1,000 prize pool.
// Mara buys in for $100 like always, but the tournament is a different
// animal — it is not one hand, it is a war of attrition, and the AI
// regulars play tighter when the blinds climb.

export const TOURNAMENT_BLINDS = [10, 20, 40, 80, 160];
const TOURNAMENT_PRIZE = 1000;
const TOURNAMENT_BUYIN = 100;

export function createPokerTournament(G) {
  const t = {
    running: false,
    hands: 0,
    blindLevel: 0,
    playersLeft: 4,
    eliminated: [],
    prize: TOURNAMENT_PRIZE,
    bestFinish: null,
  };
  G.pokerTournament = t;
  return t;
}

export function startTournament(G) {
  const t = G.pokerTournament;
  const poker = G.poker;
  if (!t || !poker) return false;
  if (t.running) {
    G.hud.toast('The tournament is already running — finish it first.');
    return false;
  }
  if (G.cash < TOURNAMENT_BUYIN) {
    G.hud.toast(`The tournament buy-in is $${TOURNAMENT_BUYIN}.`);
    return false;
  }
  G.cash -= TOURNAMENT_BUYIN;
  t.running = true;
  t.hands = 0;
  t.blindLevel = 0;
  t.playersLeft = 4;
  t.eliminated = [];
  poker.chips = 1000;
  G.hud.toast('Tournament started! Four players, rising blinds, $1,000 to the last one standing.');
  return true;
}

// v7: call after every tournament hand — the blinds climb, the table
// thins, and the prize waits for the last chair.
export function recordTournamentHand(G, wonHand, eliminatedName) {
  const t = G.pokerTournament;
  if (!t || !t.running) return;
  t.hands += 1;
  if (eliminatedName) {
    t.eliminated.push(eliminatedName);
    t.playersLeft -= 1;
    G.hud.toast(`${eliminatedName} is out of the tournament! ${t.playersLeft} left.`);
  }
  // Blinds double every ten hands — the table gets hungry fast.
  const level = Math.min(TOURNAMENT_BLINDS.length - 1, Math.floor(t.hands / 10));
  if (level > t.blindLevel) {
    t.blindLevel = level;
    G.hud.toast(`Blinds up! Now ${TOURNAMENT_BLINDS[level]}/${TOURNAMENT_BLINDS[level] * 2} — the short stacks are sweating.`);
  }
  if (t.playersLeft <= 1) {
    t.running = false;
    const won = (G.poker && G.poker.chips > 0);
    if (won) {
      G.cash += TOURNAMENT_PRIZE;
      t.bestFinish = 1;
      G.hud.toast(`TOURNAMENT CHAMPION! Mara takes the $${TOURNAMENT_PRIZE} prize pool!`);
    } else {
      t.bestFinish = 4 - t.eliminated.length;
      G.hud.toast('Tournament over — Mara is out. The regulars will talk about this one.');
    }
  }
}

export function tournamentBlindText(G) {
  const t = G.pokerTournament;
  if (!t) return 'No tournament on the books.';
  const blind = TOURNAMENT_BLINDS[t.blindLevel];
  return `Blinds ${blind}/${blind * 2} · hand ${t.hands} · ${t.playersLeft} players left.`;
}

export function pokerTournamentSummary(G) {
  const t = G.pokerTournament;
  if (!t) return 'No tournament played yet.';
  return `${t.running ? 'Tournament running' : 'No tournament running'} · best finish ${t.bestFinish === null ? '—' : '#' + t.bestFinish} · ${t.eliminated.length} players eliminated.`;
}
