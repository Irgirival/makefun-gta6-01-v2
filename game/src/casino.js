// casino.js — the Verde Casino on the Isla Verde boardwalk. Walk up
// to the gold doors and press E: a casino floor opens over the game
// with two working games. The slot machine takes $25 a spin and pays
// for three of a kind (three 7s is the $500 jackpot); the high/low card
// table takes a $50 bet and pays $100 when you call the next card
// right. Winnings land straight in Mara's cash, losses come straight
// out of it, and the house keeps a running tally of the night. The
// whole floor is DOM, so it needs no new art and no network: the game
// keeps running behind it, and E (or the cash-out button) closes it.

import * as THREE from 'three';
import { createCasinoGames, openCasinoGames } from './casinogames.js';

const CASINO_DOOR = { x: -160, z: 520 };
const SPIN_COST = 25;
const CARD_BET = 50;
const CARD_WIN = 100;

const SLOT_SYMBOLS = ['🍒', '7️⃣', 'BAR', '★', '♦', '🍋'];
const SLOT_PAYS = { '7️⃣7️⃣7️⃣': 500, 'BARBARBAR': 200 };

function slotPayout(reels) {
  const key = reels.join('');
  if (SLOT_PAYS[key]) return SLOT_PAYS[key];
  if (reels[0] === reels[1] && reels[1] === reels[2]) return 100;
  if (reels[0] === '7️⃣' && reels[1] === '7️⃣') return 50;
  if (reels[0] === '7️⃣') return 10;
  return 0;
}

function drawCard() {
  return 2 + Math.floor(Math.random() * 13); // 2..14, 11 J, 12 Q, 13 K, 14 A
}

function cardName(v) {
  return v <= 10 ? String(v) : ['J', 'Q', 'K', 'A'][v - 11];
}

export function createCasino(G) {
  // A gold casino front on the boardwalk so the door is easy to find.
  const front = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 7, 1),
    new THREE.MeshLambertMaterial({ color: 0x6a1a2a, emissive: 0x220000 }));
  wall.position.y = 3.5;
  front.add(wall);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.8, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 }));
  sign.position.y = 6.4;
  front.add(sign);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.3, 3),
    new THREE.MeshLambertMaterial({ color: 0xd81a2a }));
  awning.position.set(0, 3.1, 1.6);
  awning.rotation.x = 0.25;
  front.add(awning);
  for (const dx of [-7, 7]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 7, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xd8a03a, emissive: 0x221100 }));
    pillar.position.set(dx, 3.5, 0.6);
    front.add(pillar);
  }
  front.position.set(CASINO_DOOR.x, 0, CASINO_DOOR.z);
  front.rotation.y = Math.PI;
  G.scene.add(front);

  const casino = {
    open: false,
    spins: 0,
    won: 0,
    lost: 0,
    card: null,
    spinning: false,
    overlay: null,
    reelsEl: null,
    slotsMsg: null,
    cardEl: null,
    cardMsg: null,
    tallyEl: null,
  };

  // The casino floor: one overlay, built once, shown and hidden.
  const overlay = document.createElement('div');
  overlay.id = 'casino';
  overlay.className = 'hidden';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;',
    'background:rgba(10,4,12,0.82);font-family:inherit;color:#f5e9c8;',
  ].join('');
  overlay.innerHTML =
    '<div style="background:#241026;border:3px solid #d8a03a;border-radius:14px;padding:22px 26px;max-width:560px;width:92%;text-align:center;box-shadow:0 0 60px rgba(216,160,58,0.35)">' +
    '<h2 style="margin:0 0 4px;color:#ffd23e;letter-spacing:2px">★ THE VERDE CASINO ★</h2>' +
    '<p style="margin:0 0 14px;opacity:0.85">Mara Solano, high roller. The house always remembers.</p>' +
    '<div id="casinoSlots" style="background:#160a1c;border:2px solid #6a1a2a;border-radius:10px;padding:14px">' +
    '<div style="font-size:15px;margin-bottom:8px">🎰 SOLMAR SLOTS — $25 a spin</div>' +
    '<div id="casinoReels" style="font-size:44px;letter-spacing:10px;background:#0a0510;border-radius:8px;padding:8px">🍒 7️⃣ BAR</div>' +
    '<div id="casinoSlotsMsg" style="min-height:22px;margin:8px 0;font-size:14px">Three 7s pays $500. Three of a kind pays $100.</div>' +
    '<button id="casinoSpin" style="font:inherit;padding:10px 26px;border-radius:8px;border:none;background:#d81a2a;color:#fff;cursor:pointer">SPIN ($25)</button>' +
    '</div>' +
    '<div style="background:#160a1c;border:2px solid #6a1a2a;border-radius:10px;padding:14px;margin-top:12px">' +
    '<div style="font-size:15px;margin-bottom:8px">🃏 HIGH / LOW — $50 a hand</div>' +
    '<div id="casinoCard" style="font-size:44px;background:#0a0510;border-radius:8px;padding:8px">?</div>' +
    '<div id="casinoCardMsg" style="min-height:22px;margin:8px 0;font-size:14px">Call the next card: higher or lower than this one?</div>' +
    '<button id="casinoHigher" style="font:inherit;padding:10px 18px;border-radius:8px;border:none;background:#1a6ad8;color:#fff;cursor:pointer">HIGHER</button> ' +
    '<button id="casinoLower" style="font:inherit;padding:10px 18px;border-radius:8px;border:none;background:#2a7a3a;color:#fff;cursor:pointer">LOWER</button>' +
    '</div>' +
    '<div id="casinoTally" style="margin-top:12px;font-size:14px;opacity:0.9"></div>' +
    '<button id="casinoTables" style="font:inherit;margin-top:12px;padding:10px 26px;border-radius:8px;border:none;background:#6a1a8a;color:#fff;cursor:pointer">🎡 TABLE GAMES — ROULETTE &amp; BLACKJACK</button> ' +
    '<button id="casinoCashOut" style="font:inherit;margin-top:12px;padding:10px 26px;border-radius:8px;border:2px solid #d8a03a;background:transparent;color:#ffd23e;cursor:pointer">CASH OUT (E)</button>' +
    '</div>';
  document.body.appendChild(overlay);
  casino.overlay = overlay;
  casino.reelsEl = overlay.querySelector('#casinoReels');
  casino.slotsMsg = overlay.querySelector('#casinoSlotsMsg');
  casino.cardEl = overlay.querySelector('#casinoCard');
  casino.cardMsg = overlay.querySelector('#casinoCardMsg');
  casino.tallyEl = overlay.querySelector('#casinoTally');
  overlay.querySelector('#casinoSpin').addEventListener('click', () => spinSlots(G));
  overlay.querySelector('#casinoHigher').addEventListener('click', () => callCard(G, 'higher'));
  overlay.querySelector('#casinoLower').addEventListener('click', () => callCard(G, 'lower'));
  // v5: the table floor — roulette and blackjack live one layer up.
  overlay.querySelector('#casinoTables').addEventListener('click', () => {
    if (G.casinogames) openCasinoGames(G);
  });
  overlay.querySelector('#casinoCashOut').addEventListener('click', () => closeCasino(G));

  G.casino = casino;
  return casino;
}

export function casinoNearDoor(G) {
  if (G.driving || G.boating || G.flying || G.jetski || G.casino.open) return false;
  const p = G.player.pos;
  return Math.hypot(CASINO_DOOR.x - p.x, CASINO_DOOR.z - p.z) < 8;
}

function updateTally(G) {
  const c = G.casino;
  const net = c.won - c.lost;
  c.tallyEl.textContent =
    `Tonight: ${c.spins} spins · won $${c.won} · lost $${c.lost} · net ${net >= 0 ? '+' : ''}$${net} · cash $${Math.floor(G.cash)}`;
}

export function openCasino(G) {
  const c = G.casino;
  c.open = true;
  c.overlay.classList.remove('hidden');
  if (c.card === null) {
    c.card = drawCard();
    c.cardEl.textContent = cardName(c.card);
    c.cardMsg.textContent = 'Call the next card: higher or lower than this one?';
  }
  updateTally(G);
  G.audio.missionSting();
  G.hud.toast('Welcome to the Verde Casino — slots and high/low, real money, real regrets.');
}

export function closeCasino(G) {
  const c = G.casino;
  if (!c.open) return;
  c.open = false;
  c.overlay.classList.add('hidden');
  G.hud.toast(`Cashed out of the Verde Casino. The night is yours, Mara.`);
  G.save.save(G);
}

function spinSlots(G) {
  const c = G.casino;
  if (c.spinning) return;
  if (G.cash < SPIN_COST) {
    c.slotsMsg.textContent = 'Not enough cash — the slots need $25. Come back richer.';
    G.audio.emptyClick();
    return;
  }
  G.cash -= SPIN_COST;
  c.lost += SPIN_COST;
  c.spins++;
  c.spinning = true;
  G.audio.tone(600, 0.08, 'square', 0.12, 900);
  let ticks = 0;
  const timer = setInterval(() => {
    ticks++;
    const show = [0, 1, 2].map((i) =>
      (ticks > (i + 1) * 4) ? c._final[i] : SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
    c.reelsEl.textContent = show.join(' ');
    if (ticks === 1) {
      c._final = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
    }
    if (ticks >= 14) {
      clearInterval(timer);
      c.reelsEl.textContent = c._final.join(' ');
      const pay = slotPayout(c._final);
      if (pay > 0) {
        G.cash += pay;
        c.won += pay;
        c.slotsMsg.textContent = `WINNER! ${c._final.join(' ')} pays $${pay}!`;
        G.audio.missionComplete();
      } else {
        c.slotsMsg.textContent = `${c._final.join(' ')} — nothing this time. The house smiles.`;
        G.audio.tone(220, 0.25, 'sawtooth', 0.1, 110);
      }
      c.spinning = false;
      updateTally(G);
      G.save.save(G);
    }
  }, 90);
}

function callCard(G, call) {
  const c = G.casino;
  if (G.cash < CARD_BET) {
    c.cardMsg.textContent = 'Not enough cash — high/low needs $50. Come back richer.';
    G.audio.emptyClick();
    return;
  }
  G.cash -= CARD_BET;
  c.lost += CARD_BET;
  const next = drawCard();
  const prev = c.card;
  const win = (call === 'higher' && next > prev) || (call === 'lower' && next < prev);
  const push = next === prev;
  c.card = next;
  c.cardEl.textContent = cardName(next);
  if (push) {
    G.cash += CARD_BET;
    c.lost -= CARD_BET;
    c.cardMsg.textContent = `Push — ${cardName(next)} again. Your $50 comes back. Call the next one!`;
    G.audio.pickup();
  } else if (win) {
    G.cash += CARD_WIN;
    c.won += CARD_WIN;
    c.cardMsg.textContent = `${cardName(prev)} → ${cardName(next)} — you called ${call} right! +$${CARD_WIN}.`;
    G.audio.missionComplete();
  } else {
    c.cardMsg.textContent = `${cardName(prev)} → ${cardName(next)} — wrong call. The house takes $50.`;
    G.audio.tone(220, 0.25, 'sawtooth', 0.1, 110);
  }
  updateTally(G);
  G.save.save(G);
}

export function casinoStatusText(G) {
  const c = G.casino;
  if (c.open) return 'Verde Casino — slots $25, high/low $50 (E to cash out)';
  const net = c.won - c.lost;
  return `Verde Casino — ${c.spins} spins · net ${net >= 0 ? '+' : ''}$${net} tonight`;
}

// ---- v8: the high-roller lounge --------------------------------------------
// The Verde Casino's main floor is for everyone; v8 opens the lounge
// behind the velvet rope. Entry needs $5,000 in pocket and a clean-enough
// nose — no wanted stars — and inside, the stakes are tripled, the
// drinks are free, and the lounge host remembers Mara's name. Every
// lounge visit is stamped on a membership card, and five stamps earn the
// gold card: a permanent 10% bonus on every casino win.

export const LOUNGE_ENTRY_CASH = 5000;
export const LOUNGE_STAMP_GOAL = 5;

export function createLoungeV8(G) {
  if (G.loungeV8) return G.loungeV8;
  G.loungeV8 = {
    visits: 0,
    stamps: 0,
    goldCard: false,
    won: 0,
    lost: 0,
  };
  return G.loungeV8;
}

export function loungeEntryV8(G) {
  const lounge = G.loungeV8;
  if (!lounge) return false;
  if (G.cash < LOUNGE_ENTRY_CASH) {
    G.hud.toast(`The high-roller lounge needs $${LOUNGE_ENTRY_CASH} in pocket — you have $${Math.floor(G.cash)}.`);
    return false;
  }
  if (G.wanted.stars > 0) {
    G.hud.toast('The lounge host shakes his head — no wanted guests past the velvet rope.');
    return false;
  }
  lounge.visits += 1;
  lounge.stamps += 1;
  if (lounge.stamps >= LOUNGE_STAMP_GOAL && !lounge.goldCard) {
    lounge.goldCard = true;
    G.hud.toast('GOLD CARD — five lounge visits. Every casino win now pays 10% extra.');
    if (G.audio && G.audio.cheer) G.audio.cheer();
  } else {
    G.hud.toast(`High-roller lounge — welcome back, Ms. Solano. Stamp ${lounge.stamps}/${LOUNGE_STAMP_GOAL}.`);
  }
  return true;
}

export function loungeBonusV8(G, amount) {
  const lounge = G.loungeV8;
  if (!lounge || !lounge.goldCard) return amount;
  return Math.round(amount * 1.1);
}

export function loungeV8Summary(G) {
  const lounge = G.loungeV8;
  if (!lounge) return 'High-roller lounge not open yet.';
  return `${lounge.visits} visits · ${lounge.stamps}/${LOUNGE_STAMP_GOAL} stamps · ${lounge.goldCard ? 'GOLD CARD (+10% wins)' : 'no gold card yet'} · won $${lounge.won} / lost $${lounge.lost}.`;
}
