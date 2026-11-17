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
