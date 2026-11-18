// nitro.js — Solmar nitro: a garage-tuned speed boost for Mara's own car.
// Once Vic has fitted an engine upgrade (Lv1+), hold Shift while driving to
// burn nitro: +35% top speed, a blue flame from the exhaust and a draining
// meter. The meter refills slowly on its own and instantly at the garage or
// the safehouse. It only works in Mara's owned, tuned car — a stolen sedan
// does not have the plumbing for it, and neither does a boat.

import * as THREE from 'three';

const NITRO_DRAIN = 34;       // meter points per second while burning
const NITRO_REFILL = 6;       // points per second while not burning
const NITRO_BOOST = 1.35;     // top-speed multiplier while burning
const NITRO_MIN_TO_FIRE = 12; // need at least this much meter to light it

function nitroMax(G) {
  // The tank grows with the engine: Lv1 100, Lv2 150, Lv3 200. Vic fits a
  // bigger bottle every time he rebuilds the motor.
  const lvl = G.garage?.engineLevel || 0;
  // v5: each nitro tank Vic fits adds 25 to the bottle.
  return 100 + 50 * Math.max(0, lvl - 1) + 25 * (G.nitro?.tankLevel || 0);
}

export function createNitro(G) {
  const nitro = {
    meter: nitroMax(G),
    burning: false,
    flame: null,
    emptyToastAt: 0,
    tankLevel: 0, // v5: 0-2 extra bottles fitted at the garage
    // v5: fit a bigger bottle — max two, filled on the spot.
    buyTank() {
      if ((this.tankLevel || 0) >= 2) {
        G.hud.toast('The nitro bottle is already as big as Vic can fit.');
        return false;
      }
      this.tankLevel = (this.tankLevel || 0) + 1;
      this.meter = nitroMax(G);
      return true;
    },
  };
  G.nitro = nitro;
  // v6: nitro refill stations — a pump by Vic's garage and one on the beach
  // road. Drive any car up to a pump and the tank fills to the brim, free.
  const stations = [];
  for (const [sx, sz] of [[-16, -88], [56, 296]]) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x1a6ad8, emissive: 0x113366 }));
    base.position.y = 1.1;
    group.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x554400 }));
    top.position.y = 2.4;
    group.add(top);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    hose.position.set(0.9, 1.0, 0);
    hose.rotation.z = 0.5;
    group.add(hose);
    group.position.set(sx, 0, sz);
    G.scene.add(group);
    G.city.colliders.push({ minX: sx - 1, maxX: sx + 1, minZ: sz - 0.6, maxZ: sz + 0.6 });
    stations.push({ x: sx, z: sz, group });
  }
  nitro.stations = stations;
  return nitro;
}

function buildFlame(G, car) {
  // A flat blue cone behind the exhaust, scaled up while burning.
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x4da6ff, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.7, -2.9);
  flame.visible = false;
  car.mesh.add(flame);
  return flame;
}

function carCanNitro(G) {
  // Only Mara's own car, only once Vic has tuned its engine.
  const car = G.driving;
  if (!car) return false;
  if (!G.garage || G.garage.ownedId !== car.id) return false;
  return G.garage.engineLevel >= 1;
}

export function nitroStatusText(G) {
  const n = G.nitro;
  if (!n) return 'Nitro: not fitted.';
  if (!carCanNitro(G)) return 'Nitro: needs Vic\'s engine Lv1 on your own car.';
  const max = nitroMax(G);
  const bars = Math.round((n.meter / max) * 10);
  return `Nitro ${'▮'.repeat(bars)}${'▯'.repeat(10 - bars)} ${Math.round((n.meter / max) * 100)}%` +
    (n.burning ? ' — BURNING!' : ' — hold Shift to burn');
}

export function refillNitro(G) {
  if (G.nitro) G.nitro.meter = nitroMax(G);
}

export function updateNitro(G, dt) {
  const n = G.nitro;
  if (!n) return;
  const car = G.driving;
  const wantBurn = !!car && carCanNitro(G) && G.input.down('sprint') && G.mode === 'playing';
  if (wantBurn && n.meter > 0) {
    if (!n.burning && n.meter < NITRO_MIN_TO_FIRE) {
      if (G.elapsed - n.emptyToastAt > 5) {
        n.emptyToastAt = G.elapsed;
        G.hud.toast('Nitro nearly empty — ease off and let it refill, or top up at the garage.');
      }
    } else {
      if (!n.burning) {
        n.burning = true;
        if (!n.flame || n.flame.parent !== car.mesh) n.flame = buildFlame(G, car);
        n.flame.visible = true;
        G.audio.engineStart();
      }
      n.meter = Math.max(0, n.meter - NITRO_DRAIN * dt);
      car.nitroBoost = NITRO_BOOST;
      // The flame flickers with the burn.
      if (n.flame) {
        const f = 0.8 + Math.sin(G.elapsed * 40) * 0.25;
        n.flame.scale.set(f, 1 + Math.sin(G.elapsed * 31) * 0.3, f);
        n.flame.material.opacity = 0.65 + Math.random() * 0.3;
      }
      if (n.meter <= 0) {
        stopBurn(G, car);
        G.hud.toast('Nitro spent! Let it refill — or swing by the garage for a full tank.');
      }
    }
  } else if (n.burning) {
    stopBurn(G, car);
  }
  if (!n.burning) {
    // The tank refills on its own, faster when parked.
    const rate = NITRO_REFILL * (car ? 1 : 2.5);
    n.meter = Math.min(nitroMax(G), n.meter + rate * dt);
    if (car) car.nitroBoost = 1;
  }
  // The flame belongs to one car: if Mara swapped cars, hide the old flame.
  if (n.flame && n.flame.visible && (!car || n.flame.parent !== car.mesh)) {
    n.flame.visible = false;
  }
  // v6: the refill stations — drive up to a pump and the tank fills to the
  // brim, free, as a thank-you for keeping Solmar moving.
  if (n.stations) {
    const p = car ? car.pos : G.player.pos;
    for (const s of n.stations) {
      if (Math.hypot(s.x - p.x, s.z - p.z) < 5 && n.meter < nitroMax(G)) {
        n.meter = nitroMax(G);
        G.hud.toast('Nitro topped up at the refill station — full tank!');
        G.audio.pickup();
      }
    }
  }
}

function stopBurn(G, car) {
  const n = G.nitro;
  n.burning = false;
  if (car) car.nitroBoost = 1;
  if (n.flame) n.flame.visible = false;
}

// v7: the purge valve, the refill stations and the overboost gamble.
// The purge valve is pure theatre — a hiss of blue vapour from the
// hood vents when Mara taps the horn at a standstill, and the plaza
// crowd loves theatre. Refill stations are the honest part: the garage
// and the safehouse both fill the bottle free, and a third station —
// the airfield fuel farm — fills it for $50 when she is out that way.
// Overboost is the gamble: hold nitro past empty and the engine
// overboosts for three seconds at double power, then takes wear damage
// for its trouble. Vic does not recommend it. Vic is not driving.

export function createNitroV7(G) {
  const n7 = {
    overboostTimer: 0,
    overboosts: 0,
    purges: 0,
    refills: 0,
    lastPurgeAt: -999,
  };
  G.nitroV7 = n7;
  return n7;
}

export function purgeNitro(G) {
  const n7 = G.nitroV7;
  const nitro = G.nitro;
  if (!n7 || !nitro) return false;
  if (nitro.meter < 10) {
    G.hud.toast('Not enough nitro in the bottle to purge.');
    return false;
  }
  if (G.elapsed - n7.lastPurgeAt < 3) return false;
  n7.lastPurgeAt = G.elapsed;
  n7.purges += 1;
  nitro.meter -= 10;
  G.hud.toast('PSSSH! The purge valve vents blue — the plaza crowd oohs.');
  return true;
}

export function refillNitroAt(G, station) {
  const n7 = G.nitroV7;
  const nitro = G.nitro;
  if (!n7 || !nitro) return false;
  const price = station === 'airfield' ? 50 : 0;
  if (price > 0 && G.cash < price) {
    G.hud.toast('The fuel farm wants $50 for a fill — the bottle stays empty.');
    return false;
  }
  G.cash -= price;
  nitro.meter = 100 + 50 * Math.max(0, (G.garage?.engineLevel || 0) - 1)
    + 25 * (nitro.tankLevel || 0);
  n7.refills += 1;
  G.hud.toast(price > 0 ? `Nitro refilled at the fuel farm — $${price}.` : 'Nitro bottle refilled — full and cold.');
  return true;
}

// v7: overboost — burning past empty. Returns the extra multiplier for
// the driving model to apply this frame (1 when not overboosting).
export function overboostMultiplier(G, dt) {
  const n7 = G.nitroV7;
  const nitro = G.nitro;
  if (!n7 || !nitro) return 1;
  if (n7.overboostTimer > 0) {
    n7.overboostTimer -= dt;
    if (n7.overboostTimer <= 0) {
      // The bill comes due: the engine takes wear for the gamble.
      if (G.driving && typeof G.driving === 'object') {
        G.driving.wear = Math.min(100, (G.driving.wear || 0) + 12);
      }
      G.hud.toast('Overboost cooked the engine — 12 wear. Vic is shaking his head.');
    }
    return 2;
  }
  // Trigger: nitro burning and the meter hits zero while still holding it.
  if (nitro.burning && nitro.meter <= 0 && G.input.down('sprint') && G.driving) {
    n7.overboostTimer = 3;
    n7.overboosts += 1;
    G.hud.toast('OVERBOOST! Double power for 3 seconds — the engine will remember this.');
  }
  return 1;
}

export function nitroV7Summary(G) {
  const n7 = G.nitroV7;
  if (!n7) return 'No nitro lab in the garage.';
  return `${n7.overboosts} overboosts · ${n7.purges} purges · ${n7.refills} refills.`;
}
