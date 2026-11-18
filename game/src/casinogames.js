// casinogames.js — the Verde Casino's table floor: a roulette wheel and a
// blackjack table, both real-money against Mara's cash. Roulette takes a
// chip on red, black, green or one exact number; a colour pays 2x, an exact
// number pays 36x. Blackjack deals two cards each, Mara hits or stands, the
// dealer plays to 17, and a natural 21 pays 3:2. The floor is DOM over the
// game (the city keeps running behind it), and every chip, win and loss
// flows through the casino's nightly tally so the house always remembers.

const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const ROULETTE_CHIPS = [10, 25, 50, 100];
const BLACKJACK_BET = 50;
const BLACKJACK_PAYS = 1.5; // natural 21 pays 3:2

function wheelColor(n) {
  if (n === 0) return 'green';
  return ROULETTE_RED.has(n) ? 'red' : 'black';
}

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === 1) { aces++; total += 11; }
    else if (c >= 11) total += 10;
    else total += c;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function cardLabel(c) {
  if (c === 1) return 'A';
  if (c === 11) return 'J';
  if (c === 12) return 'Q';
  if (c === 13) return 'K';
  return String(c);
}

function drawBJCard() {
  return 1 + Math.floor(Math.random() * 13);
}

function spinWheelNumber() {
  return Math.floor(Math.random() * 37);
}

export function createCasinoGames(G) {
  const games = {
    open: false,
    chipIndex: 1,          // $25 chip selected by default
    rouletteSpinning: false,
    rouletteLast: null,
    rouletteWins: 0,
    rouletteLosses: 0,
    bj: null,              // the current blackjack hand, or null between hands
    bjHands: 0,
    bjWon: 0,
    overlay: null,
    wheelEl: null,
    wheelMsg: null,
    bjEl: null,
    bjMsg: null,
    tallyEl: null,
  };

  const overlay = document.createElement('div');
  overlay.id = 'casinogames';
  overlay.className = 'hidden';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;',
    'background:rgba(8,4,14,0.88);font-family:inherit;color:#f5e9c8;',
  ].join('');
  overlay.innerHTML =
    '<div style="background:#1c0f22;border:3px solid #d8a03a;border-radius:14px;padding:22px 26px;max-width:620px;width:94%;text-align:center;box-shadow:0 0 60px rgba(216,160,58,0.35)">' +
    '<h2 style="margin:0 0 4px;color:#ffd23e;letter-spacing:2px">♠ THE TABLE FLOOR ♠</h2>' +
    '<p style="margin:0 0 14px;opacity:0.85">Roulette and blackjack, Verde style. Chips are real cash.</p>' +
    '<div style="background:#160a1c;border:2px solid #6a1a2a;border-radius:10px;padding:14px">' +
    '<div style="font-size:15px;margin-bottom:8px">🎡 SOLMAR ROULETTE — pick a chip, pick a colour</div>' +
    '<div id="cgWheel" style="font-size:52px;line-height:1;background:#0a0510;border-radius:8px;padding:10px">—</div>' +
    '<div id="cgWheelMsg" style="min-height:22px;margin:8px 0;font-size:14px">Red and black pay 2x. Green 0 pays 36x. An exact number pays 36x.</div>' +
    '<div id="cgChips" style="margin-bottom:10px"></div>' +
    '<button data-bet="red" style="font:inherit;padding:10px 20px;border-radius:8px;border:none;background:#d81a2a;color:#fff;cursor:pointer">RED</button> ' +
    '<button data-bet="black" style="font:inherit;padding:10px 20px;border-radius:8px;border:none;background:#222;color:#fff;cursor:pointer">BLACK</button> ' +
    '<button data-bet="green" style="font:inherit;padding:10px 20px;border-radius:8px;border:none;background:#2a7a3a;color:#fff;cursor:pointer">GREEN 0</button> ' +
    '<button id="cgNumber" style="font:inherit;padding:10px 20px;border-radius:8px;border:none;background:#6a1a8a;color:#fff;cursor:pointer">LUCKY NUMBER</button>' +
    '</div>' +
    '<div style="background:#160a1c;border:2px solid #6a1a2a;border-radius:10px;padding:14px;margin-top:12px">' +
    '<div style="font-size:15px;margin-bottom:8px">🃏 BLACKJACK — $50 a hand, dealer stands on 17</div>' +
    '<div id="cgBj" style="font-size:20px;background:#0a0510;border-radius:8px;padding:10px;min-height:52px;line-height:1.5">No hand yet — deal in.</div>' +
    '<div id="cgBjMsg" style="min-height:22px;margin:8px 0;font-size:14px">A natural 21 pays 3:2. Beat the dealer without busting.</div>' +
    '<button id="cgDeal" style="font:inherit;padding:10px 18px;border-radius:8px;border:none;background:#d81a2a;color:#fff;cursor:pointer">DEAL ($50)</button> ' +
    '<button id="cgHit" style="font:inherit;padding:10px 18px;border-radius:8px;border:none;background:#1a6ad8;color:#fff;cursor:pointer">HIT</button> ' +
    '<button id="cgStand" style="font:inherit;padding:10px 18px;border-radius:8px;border:none;background:#2a7a3a;color:#fff;cursor:pointer">STAND</button>' +
    '</div>' +
    '<div id="cgTally" style="margin-top:12px;font-size:14px;opacity:0.9"></div>' +
    '<button id="cgClose" style="font:inherit;margin-top:12px;padding:10px 26px;border-radius:8px;border:2px solid #d8a03a;background:transparent;color:#ffd23e;cursor:pointer">BACK TO THE SLOTS</button>' +
    '</div>';
  document.body.appendChild(overlay);
  games.overlay = overlay;
  games.wheelEl = overlay.querySelector('#cgWheel');
  games.wheelMsg = overlay.querySelector('#cgWheelMsg');
  games.bjEl = overlay.querySelector('#cgBj');
  games.bjMsg = overlay.querySelector('#cgBjMsg');
  games.tallyEl = overlay.querySelector('#cgTally');

  // Chip picker: four buttons, the selected one glows gold.
  const chipsEl = overlay.querySelector('#cgChips');
  ROULETTE_CHIPS.forEach((chip, i) => {
    const b = document.createElement('button');
    b.textContent = `$${chip}`;
    b.style.cssText = 'font:inherit;padding:8px 16px;margin:0 4px;border-radius:20px;border:2px solid #d8a03a;background:transparent;color:#ffd23e;cursor:pointer';
    b.addEventListener('click', () => {
      games.chipIndex = i;
      G.audio.chipStack();
      refreshChips(games);
    });
    chipsEl.appendChild(b);
  });
  games.chipButtons = Array.from(chipsEl.querySelectorAll('button'));
  refreshChips(games);

  overlay.querySelectorAll('[data-bet]').forEach((b) => {
    b.addEventListener('click', () => spinRoulette(G, b.getAttribute('data-bet')));
  });
  overlay.querySelector('#cgNumber').addEventListener('click', () => spinRouletteNumber(G));
  overlay.querySelector('#cgDeal').addEventListener('click', () => dealBlackjack(G));
  overlay.querySelector('#cgHit').addEventListener('click', () => blackjackHit(G));
  overlay.querySelector('#cgStand').addEventListener('click', () => blackjackStand(G));
  overlay.querySelector('#cgClose').addEventListener('click', () => closeCasinoGames(G));

  G.casinogames = games;
  return games;
}

function refreshChips(games) {
  games.chipButtons.forEach((b, i) => {
    b.style.background = i === games.chipIndex ? '#d8a03a' : 'transparent';
    b.style.color = i === games.chipIndex ? '#1c0f22' : '#ffd23e';
  });
}

function updateGamesTally(G) {
  const g = G.casinogames;
  const c = G.casino;
  const nightNet = c ? c.won - c.lost : 0;
  g.tallyEl.textContent =
    `Tables: roulette +$${g.rouletteWins} won · blackjack ${g.bjHands} hands · cash $${Math.floor(G.cash)} · night net ${nightNet >= 0 ? '+' : ''}$${nightNet}`;
}

export function openCasinoGames(G) {
  const g = G.casinogames;
  if (!g) return;
  g.open = true;
  g.overlay.classList.remove('hidden');
  updateGamesTally(G);
  G.audio.chipStack();
  G.hud.toast('The table floor — roulette and blackjack, real stakes.');
}

export function closeCasinoGames(G) {
  const g = G.casinogames;
  if (!g || !g.open) return;
  g.open = false;
  g.overlay.classList.add('hidden');
  G.hud.toast('Back to the slots — the tables will keep.');
  G.save.save(G);
}

function spinRoulette(G, bet) {
  const g = G.casinogames;
  if (g.rouletteSpinning) return;
  const stake = ROULETTE_CHIPS[g.chipIndex];
  if (G.cash < stake) {
    g.wheelMsg.textContent = `Not enough cash — the wheel needs $${stake}. Come back richer.`;
    G.audio.emptyClick();
    return;
  }
  G.cash -= stake;
  g.rouletteLosses += stake;
  if (G.casino) { G.casino.lost += stake; G.casino.spins++; }
  g.rouletteSpinning = true;
  const final = spinWheelNumber();
  let ticks = 0;
  const timer = setInterval(() => {
    ticks++;
    const show = ticks >= 16 ? final : spinWheelNumber();
    const color = wheelColor(show);
    g.wheelEl.textContent = show;
    g.wheelEl.style.color = color === 'red' ? '#ff5a5a' : color === 'green' ? '#7dff9a' : '#e8e8e8';
    if (ticks % 2 === 0) G.audio.rouletteTick();
    if (ticks >= 16) {
      clearInterval(timer);
      g.rouletteSpinning = false;
      g.rouletteLast = final;
      const won = (bet === 'green' && final === 0) || (bet === 'red' && color === 'red') || (bet === 'black' && color === 'black');
      const mult = bet === 'green' ? 36 : 2;
      if (won) {
        const pay = stake * mult;
        G.cash += pay;
        g.rouletteWins += pay;
        if (G.casino) G.casino.won += pay;
        g.wheelMsg.textContent = `${final} ${color} — ${bet.toUpperCase()} hits! +$${pay}.`;
        G.audio.missionComplete();
      } else {
        g.wheelMsg.textContent = `${final} ${color} — ${bet} misses. The wheel is honest, Mara.`;
        G.audio.tone(220, 0.25, 'sawtooth', 0.1, 110);
      }
      updateGamesTally(G);
      G.save.save(G);
    }
  }, 90);
}

function spinRouletteNumber(G) {
  // The lucky-number side bet: pick the wheel's own number for the night
  // and back it with the selected chip. 36x if it lands.
  const g = G.casinogames;
  if (g.rouletteSpinning) return;
  const stake = ROULETTE_CHIPS[g.chipIndex];
  if (G.cash < stake) {
    g.wheelMsg.textContent = `Not enough cash — the wheel needs $${stake}.`;
    G.audio.emptyClick();
    return;
  }
  const lucky = Math.floor(Math.random() * 37);
  G.cash -= stake;
  g.rouletteLosses += stake;
  if (G.casino) { G.casino.lost += stake; G.casino.spins++; }
  g.rouletteSpinning = true;
  let ticks = 0;
  const timer = setInterval(() => {
    ticks++;
    const show = ticks >= 16 ? spinWheelNumber() : spinWheelNumber();
    g.wheelEl.textContent = show;
    const color = wheelColor(show);
    g.wheelEl.style.color = color === 'red' ? '#ff5a5a' : color === 'green' ? '#7dff9a' : '#e8e8e8';
    if (ticks % 2 === 0) G.audio.rouletteTick();
    if (ticks >= 16) {
      clearInterval(timer);
      g.rouletteSpinning = false;
      g.rouletteLast = show;
      if (show === lucky) {
        const pay = stake * 36;
        G.cash += pay;
        g.rouletteWins += pay;
        if (G.casino) G.casino.won += pay;
        g.wheelMsg.textContent = `${show} — your lucky ${lucky} LANDED! 36x — +$${pay}!`;
        G.audio.missionComplete();
      } else {
        g.wheelMsg.textContent = `Your number was ${lucky} — the ball stopped on ${show}. So close.`;
        G.audio.tone(220, 0.25, 'sawtooth', 0.1, 110);
      }
      updateGamesTally(G);
      G.save.save(G);
    }
  }, 90);
}

function renderBj(G) {
  const g = G.casinogames;
  const bj = g.bj;
  if (!bj) {
    g.bjEl.textContent = 'No hand yet — deal in.';
    return;
  }
  const mine = bj.player.map(cardLabel).join(' ');
  const dealer = bj.dealer.map(cardLabel).join(' ');
  const dv = bj.stand ? handValue(bj.dealer) : '?';
  g.bjEl.innerHTML =
    `You: <b>${mine}</b> (${handValue(bj.player)}) &nbsp;·&nbsp; Dealer: <b>${dealer}</b> (${dv})` +
    (bj.stand ? '' : ' &nbsp;·&nbsp; <span style="opacity:0.7">dealer hole card hidden</span>');
}

function dealBlackjack(G) {
  const g = G.casinogames;
  if (g.bj && !g.bj.done) {
    g.bjMsg.textContent = 'Finish this hand first — hit or stand.';
    return;
  }
  if (G.cash < BLACKJACK_BET) {
    g.bjMsg.textContent = 'Not enough cash — blackjack needs $50. Come back richer.';
    G.audio.emptyClick();
    return;
  }
  G.cash -= BLACKJACK_BET;
  if (G.casino) G.casino.lost += BLACKJACK_BET;
  g.bjHands++;
  const bj = {
    player: [drawBJCard(), drawBJCard()],
    dealer: [drawBJCard(), drawBJCard()],
    done: false,
    stand: false,
  };
  g.bj = bj;
  renderBj(G);
  const pv = handValue(bj.player);
  if (pv === 21) {
    // Natural 21 on the deal: the table pays 3:2 at once.
    const pay = Math.floor(BLACKJACK_BET * (1 + BLACKJACK_PAYS));
    G.cash += pay;
    g.bjWon += pay;
    if (G.casino) G.casino.won += pay;
    bj.done = true;
    g.bjMsg.textContent = `BLACKJACK! Natural 21 pays 3:2 — +$${pay}.`;
    G.audio.missionComplete();
  } else {
    g.bjMsg.textContent = `You have ${pv}. Hit for another card, or stand and let the dealer play.`;
    G.audio.chipStack();
  }
  updateGamesTally(G);
  G.save.save(G);
}

function settleBlackjack(G, reason) {
  const g = G.casinogames;
  const bj = g.bj;
  bj.done = true;
  bj.stand = true;
  renderBj(G);
  const pv = handValue(bj.player);
  const dv = handValue(bj.dealer);
  let pay = 0;
  let msg = reason;
  if (pv > 21) {
    msg = `Bust — ${pv} over 21. The house takes $50.`;
  } else if (dv > 21) {
    pay = BLACKJACK_BET * 2;
    msg = `Dealer busts on ${dv}! You win +$${BLACKJACK_BET}.`;
  } else if (pv > dv) {
    pay = BLACKJACK_BET * 2;
    msg = `${pv} beats the dealer's ${dv} — you win +$${BLACKJACK_BET}.`;
  } else if (pv === dv) {
    pay = BLACKJACK_BET;
    msg = `Push at ${pv} — your $50 comes back.`;
  } else {
    msg = `Dealer's ${dv} beats your ${pv}. The house takes $50.`;
  }
  if (pay > 0) {
    G.cash += pay;
    g.bjWon += pay;
    if (G.casino) G.casino.won += pay;
    G.audio.missionComplete();
  } else {
    G.audio.tone(220, 0.25, 'sawtooth', 0.1, 110);
  }
  g.bjMsg.textContent = msg;
  updateGamesTally(G);
  G.save.save(G);
}

function blackjackHit(G) {
  const g = G.casinogames;
  const bj = g.bj;
  if (!bj || bj.done) {
    g.bjMsg.textContent = 'Deal a hand first — $50, dealer stands on 17.';
    return;
  }
  bj.player.push(drawBJCard());
  renderBj(G);
  const pv = handValue(bj.player);
  if (pv > 21) {
    settleBlackjack(G, 'Bust.');
  } else if (pv === 21) {
    g.bjMsg.textContent = '21! Standing automatically — the dealer plays now.';
    blackjackStand(G);
  } else {
    g.bjMsg.textContent = `You have ${pv}. Hit again, or stand.`;
    G.audio.pickup();
  }
}

function blackjackStand(G) {
  const g = G.casinogames;
  const bj = g.bj;
  if (!bj || bj.done) {
    g.bjMsg.textContent = 'Deal a hand first — $50, dealer stands on 17.';
    return;
  }
  bj.stand = true;
  // The dealer draws to 17, one card at a time, on a short beat.
  const timer = setInterval(() => {
    if (handValue(bj.dealer) < 17) {
      bj.dealer.push(drawBJCard());
      renderBj(G);
      G.audio.rouletteTick();
    } else {
      clearInterval(timer);
      settleBlackjack(G, 'Dealer stands.');
    }
  }, 350);
}

export function casinoGamesStatusText(G) {
  const g = G.casinogames;
  if (!g) return 'Table floor — roulette & blackjack';
  const net = g.rouletteWins - g.rouletteLosses + g.bjWon - g.bjHands * BLACKJACK_BET;
  return g.open
    ? 'Table floor open — roulette & blackjack'
    : `Table floor — ${g.bjHands} blackjack hands · net ${net >= 0 ? '+' : ''}$${net}`;
}

// v7: the slots floor and a baccarat table. The slots are pure luck with
// a Solmar skin: three reels, seven symbols, $25 a pull, three gold
// sevens pay the $2,500 jackpot and three cherries pay $250. Baccarat is
// the quiet table in the corner — bet Player, Banker or Tie, two cards
// each, closest to nine wins, Banker pays 19:20 and Tie pays 8:1. Both
// games settle straight into Mara's cash and the casino's nightly tally,
// so the house always remembers who beat it.

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣', '🍀'];
const SLOT_PAYS = { '🍒🍒🍒': 250, '🔔🔔🔔': 400, '⭐⭐⭐': 600, '💎💎💎': 1000, '🍀🍀🍀': 150, '7️⃣7️⃣7️⃣': 2500 };
const SLOTS_BET = 25;

function spinReel(rng) {
  const roll = rng();
  if (roll < 0.05) return '7️⃣';
  if (roll < 0.14) return '💎';
  if (roll < 0.26) return '⭐';
  if (roll < 0.40) return '🔔';
  if (roll < 0.58) return '🍒';
  if (roll < 0.76) return '🍋';
  return '🍀';
}

// v7: one pull of the slots. Returns the result line for the HUD — the
// reels, the win, and whether the jackpot just fell.
export function playSlots(G, bet = SLOTS_BET) {
  const cg = G.casinogames;
  if (!cg) return null;
  if (G.cash < bet) {
    G.hud.toast('Not enough cash for a spin — the slots take $25 a pull.');
    return null;
  }
  G.cash -= bet;
  const reels = [spinReel(G.rng), spinReel(G.rng), spinReel(G.rng)];
  const key = reels.join('');
  let win = SLOT_PAYS[key] || 0;
  // Two matching symbols on the left still pay a little — the house is
  // not completely heartless.
  if (win === 0 && reels[0] === reels[1]) win = 10;
  if (win > 0) G.cash += win;
  cg.slotsSpins = (cg.slotsSpins || 0) + 1;
  cg.slotsWon = (cg.slotsWon || 0) + win;
  if (win >= 2500) {
    cg.slotsJackpots = (cg.slotsJackpots || 0) + 1;
    G.hud.toast(`🎰 JACKPOT! ${reels.join(' ')} — $${win}! The whole casino floor heard that.`);
  } else if (win > 0) {
    G.hud.toast(`🎰 ${reels.join(' ')} — won $${win}!`);
  } else {
    G.hud.toast(`🎰 ${reels.join(' ')} — no luck this time.`);
  }
  return { reels, win };
}

// v7: one hand of baccarat. Bet on Player, Banker or Tie; the hand
// closest to nine wins. Banker wins pay 19:20 (the house takes its 5%),
// Tie pays 8:1, and a natural 8 or 9 ends the hand on the spot.
export function playBaccarat(G, bet, side = 'player') {
  const cg = G.casinogames;
  if (!cg) return null;
  if (G.cash < bet) {
    G.hud.toast('Not enough cash for that baccarat bet.');
    return null;
  }
  const draw = () => Math.min(9, 1 + Math.floor(G.rng() * 13));
  const handTotal = (cards) => cards.reduce((a, b) => a + b, 0) % 10;
  const player = [draw(), draw()];
  const banker = [draw(), draw()];
  const pt = handTotal(player);
  const bt = handTotal(banker);
  G.cash -= bet;
  let win = 0;
  let result = 'push';
  if (pt === bt) {
    result = 'tie';
    if (side === 'tie') win = bet * 8;
    else win = bet; // a tie refunds a Player/Banker bet
  } else if (pt > bt) {
    result = 'player';
    if (side === 'player') win = bet * 2;
  } else {
    result = 'banker';
    if (side === 'banker') win = Math.floor(bet * 1.95);
  }
  G.cash += win;
  cg.baccaratHands = (cg.baccaratHands || 0) + 1;
  cg.baccaratWon = (cg.baccaratWon || 0) + Math.max(0, win - bet);
  G.hud.toast(`Baccarat: Player ${pt} — Banker ${bt}. ${result === 'tie' ? 'Tie!' : result + ' wins.'} ${win > bet ? `+$${win - bet}` : win === bet ? 'Bet returned.' : `-$${bet}`}`);
  return { player: pt, banker: bt, result, win };
}

export function casinoV7Summary(G) {
  const cg = G.casinogames;
  if (!cg) return 'The casino floor is dark.';
  return `${cg.slotsSpins || 0} slot pulls · $${cg.slotsWon || 0} slot wins · ${cg.slotsJackpots || 0} jackpots · ${cg.baccaratHands || 0} baccarat hands.`;
}

// ---- v8: craps at the Verde -------------------------------------------------
// The v7 floor had roulette, blackjack, slots and baccarat; v8 rolls the
// dice. Craps is the pass-line game: roll 7 or 11 on the come-out and the
// line wins, 2, 3 or 12 craps out, anything else sets the point and the
// shooter keeps rolling until the point repeats (win) or a 7 lands
// (lose). The table remembers the streak — three straight passes and the
// whole floor cheers — and the gold card from the lounge lifts the win.

export function playCrapsV8(G, bet = 50) {
  const games = G.casinogames;
  if (!games) return null;
  if (G.cash < bet) {
    G.hud.toast(`Craps needs $${bet} to play — you have $${Math.floor(G.cash)}.`);
    return null;
  }
  const roll = () => Math.floor(G.rng() * 6) + 1 + Math.floor(G.rng() * 6) + 1;
  const comeOut = roll();
  let result;
  let payout = 0;
  if (comeOut === 7 || comeOut === 11) {
    result = 'win';
    payout = bet * 2;
  } else if (comeOut === 2 || comeOut === 3 || comeOut === 12) {
    result = 'lose';
  } else {
    // The point is set: keep rolling until it repeats or a 7 ends it.
    const point = comeOut;
    let guard = 0;
    let r = 0;
    while (guard++ < 40) {
      r = roll();
      if (r === point) { result = 'win'; payout = bet * 2; break; }
      if (r === 7) { result = 'lose'; break; }
    }
    if (!result) { result = 'lose'; }
  }
  G.cash -= bet;
  if (result === 'win') {
    // The lounge gold card lifts the win 10% — computed here, not
    // imported, so the table floor never depends on the lounge module.
    const final = (G.loungeV8 && G.loungeV8.goldCard) ? Math.round(payout * 1.1) : payout;
    G.cash += final;
    games.crapsWins = (games.crapsWins || 0) + 1;
    games.crapsStreak = (games.crapsStreak || 0) + 1;
    G.hud.toast(`Craps: ${comeOut} on the come-out — the line wins $${final - bet}. Streak: ${games.crapsStreak}.`);
    if (games.crapsStreak >= 3) {
      G.hud.toast('Three straight passes — the whole craps table is cheering for Mara.');
      if (G.audio && G.audio.cheer) G.audio.cheer();
    }
  } else {
    games.crapsLosses = (games.crapsLosses || 0) + 1;
    games.crapsStreak = 0;
    G.hud.toast(`Craps: ${comeOut} — the line craps out. -$${bet}.`);
  }
  return { comeOut, result, payout };
}

export function crapsV8Summary(G) {
  const games = G.casinogames;
  if (!games) return 'Craps table not open yet.';
  return `${games.crapsWins || 0} craps wins · ${games.crapsLosses || 0} losses · current streak ${games.crapsStreak || 0}.`;
}
