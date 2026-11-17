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

export function createNitro(G) {
  const nitro = {
    meter: 100,
    burning: false,
    flame: null,
    emptyToastAt: 0,
  };
  G.nitro = nitro;
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
  const bars = Math.round(n.meter / 10);
  return `Nitro ${'▮'.repeat(bars)}${'▯'.repeat(10 - bars)} ${Math.round(n.meter)}%` +
    (n.burning ? ' — BURNING!' : ' — hold Shift to burn');
}

export function refillNitro(G) {
  if (G.nitro) G.nitro.meter = 100;
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
    n.meter = Math.min(100, n.meter + rate * dt);
    if (car) car.nitroBoost = 1;
  }
  // The flame belongs to one car: if Mara swapped cars, hide the old flame.
  if (n.flame && n.flame.visible && (!car || n.flame.parent !== car.mesh)) {
    n.flame.visible = false;
  }
}

function stopBurn(G, car) {
  const n = G.nitro;
  n.burning = false;
  if (car) car.nitroBoost = 1;
  if (n.flame) n.flame.visible = false;
}
