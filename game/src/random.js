// random.js — a tiny seeded RNG (mulberry32) plus helpers, so the city,
// traffic, pedestrians and every screenshot pose are identical on every run
// for the same seed. The game reads ?seed= from the URL; the default is 1.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

export function chance(rng, p) {
  return rng() < p;
}

// Weighted pick: entries are [value, weight]; heavier entries come up more.
// v3: traffic uses it so sports cars stay rare and sedans stay common.
export function pickWeighted(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// A stable hash of a string, used to seed per-block detail from block coords.
export function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// v5: draw a fresh ordering of a list without mutating the original, and
// take a small random handful from it — used by the radio bulletin picker,
// the vendor stalls and the night-race rival shuffle.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function sampleN(rng, arr, n) {
  if (n >= arr.length) return shuffle(rng, arr);
  return shuffle(rng, arr).slice(0, n);
}

// v6: clamp a value into a range, and a cheap bell-curve draw (the sum of
// four uniforms, centred on 0) for natural-feeling variation — the VIP
// tips, the poker bluffs and the market crowds all roll on it.
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function gauss(rng) {
  return (rng() + rng() + rng() + rng() - 2) / 2;
}

export function pickExcept(rng, arr, exclude) {
  const pool = arr.filter((x) => x !== exclude);
  return pool.length ? pick(rng, pool) : arr[0];
}

// v7: more small draws for the new systems — a lerp for eased motion, a
// smoothstep for fades, a coin flip, a dice roll, a bell-curve-free
// triangular draw for tips and fares, and a string seed so a name can
// seed its own little pocket of randomness (a shopkeeper's mood, a
// performer's set list). Nothing here allocates per call except the tiny
// arrays the callers already build.

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function coinFlip(rng) {
  return rng() < 0.5;
}

export function rollDie(rng, sides = 6) {
  return 1 + Math.floor(rng() * sides);
}

export function rollDice(rng, count, sides = 6) {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(rng, sides);
  return total;
}

// Triangular draw: peaks in the middle, tails at the edges — fares,
// tips and small random payouts feel fair instead of spiky.
export function triangular(rng, min, max) {
  return min + (rng() + rng()) * 0.5 * (max - min);
}

// A stable 32-bit hash of a short string, for seeding per-name randomness.
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A seeded RNG from a name — the same name always draws the same sequence,
// so a shopkeeper's mood is stable across sessions for the same seed.
export function rngFromName(seed, name) {
  return makeRng((seed ^ hashString(name)) >>> 0);
}

// Draw n distinct items from an array without mutating it, in random
// order — the shop rotation, the race rival shuffle, the radio request
// line all roll on this.
export function drawDistinct(rng, arr, n) {
  const pool = arr.slice();
  const out = [];
  while (pool.length && out.length < n) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

// Exponential draw: mostly small, occasionally large — the size of a
// traffic jam, the length of a fog bank, the wait for a charter seat.
export function exponential(rng, mean = 1) {
  const u = Math.max(1e-9, rng());
  return -Math.log(u) * mean;
}

// Round to a friendly number: fares and tips land on 5s, not on $137.
export function roundTo(v, step = 5) {
  return Math.round(v / step) * step;
}

// v7: pick with a fallback — when the pool is empty the fallback keeps
// the caller from ever seeing undefined.
export function pickOr(rng, arr, fallback) {
  return arr.length ? pick(rng, arr) : fallback;
}

// ---- v8: seeded names, plates and call signs ----------------------------------
// The v7 random kit had picks, ranges, shuffles and hashes; v8 adds the
// city's paperwork. Seeded name plates for traffic cars (so the same car
// keeps the same plate every load), call signs for the police air unit,
// and a weighted pick that favours the common over the rare — all from
// the same deterministic rng, so a seed-1 city is the same city every
// time, down to the license plates.

export function plateFor(rng, prefix = 'SOL') {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const digits = '0123456789';
  let plate = prefix + '-';
  for (let i = 0; i < 2; i++) plate += letters[Math.floor(rng() * letters.length)];
  for (let i = 0; i < 3; i++) plate += digits[Math.floor(rng() * digits.length)];
  return plate;
}

export function callSignFor(rng) {
  const units = ['Air One', 'Air Two', 'Harbor One', 'Delta Three', 'Night Owl'];
  return units[Math.floor(rng() * units.length)];
}

export function pickSeededName(rng, names) {
  if (!names || names.length === 0) return 'Unknown';
  return names[Math.floor(rng() * names.length)];
}

export function weightedPickV8(rng, entries) {
  // entries: [[value, weight], ...] — the common wins often, the rare
  // wins sometimes, and the seed decides which.
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng() * total;
  for (const [v, w] of entries) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

export function randomV8Summary() {
  return 'v8 random: seeded plates, air-unit call signs, weighted picks — same seed, same city.';
}
