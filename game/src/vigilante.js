// vigilante.js — Solmar's other side of the law: press V to take a
// vigilante contract. A fugitive in a stolen Comet GT tears off through
// the city; ram it three times (or pin it for two seconds) before it
// escapes and the PD pays a $600 bounty — no questions asked. At 3+ stars
// the PD fights back harder: spike strips appear ahead of Mara on the road
// (drive over one and the tires go, speed cut by two thirds) and cruisers
// set roadblocks across the avenue ahead.

import * as THREE from 'three';
import { createVehicle } from './vehicles.js';

const BOUNTY = 600;
const RAMS_TO_STOP = 3;
const FUGITIVE_TIMEOUT = 90;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function pickEscapeRoute(G) {
  // A long loop of road intersections the fugitive flees along. Roads run
  // at -340 + 80k, so every point here sits on asphalt, never in a block.
  const pts = [
    { x: 60, z: 60 }, { x: 140, z: 60 }, { x: 220, z: 60 }, { x: 220, z: -20 },
    { x: 220, z: -100 }, { x: 140, z: -100 }, { x: 60, z: -100 }, { x: -20, z: -100 },
    { x: -100, z: -100 }, { x: -100, z: -20 }, { x: -100, z: 60 }, { x: -20, z: 60 },
    { x: 60, z: 140 }, { x: 140, z: 140 }, { x: 140, z: 220 }, { x: 60, z: 220 },
  ];
  return pts;
}

export function createVigilante(G) {
  const vig = {
    active: false,
    fugitive: null,
    route: [],
    routeIndex: 0,
    rams: 0,
    pinTimer: 0,
    timer: 0,
    bounties: 0,
    earned: 0,
    spikeTimer: 14,
    spikes: [],
    roadblockTimer: 20,
    roadblocks: [],
    // v5: contracts alternate — chase, then stakeout. A stakeout tails a
    // suspect sedan at a distance instead of ramming it.
    kind: 'chase',
    contracts: 0,
    tailTime: 0,
    exposedTimer: 0,
  };
  G.vigilante = vig;
  return vig;
}

export function startVigilante(G) {
  const v = G.vigilante;
  if (v.active) { G.hud.toast('Contract already running — catch the fugitive first.'); return false; }
  if (!G.driving) { G.hud.toast('Vigilante work needs wheels — get in a car, then press V.'); return false; }
  if (G.races && G.races.active) { G.hud.toast('Finish the race first — one job at a time.'); return false; }
  const car = G.driving;
  const heading = car.heading;
  const fx = car.pos.x + Math.sin(heading) * 30;
  const fz = car.pos.z + Math.cos(heading) * 30;
  // v5: every second contract is a stakeout — tail a suspect sedan, do not
  // ram it. The target drives slow and steady; get too close and it spots
  // you, drift too far and you lose it.
  // v6: every third contract is an armored takedown — the target is a
  // Syndicate armored van carrying the crew's cash, and it does not scare.
  const armored = v.contracts % 3 === 2;
  const stakeout = !armored && v.contracts % 2 === 1;
  v.kind = armored ? 'armored' : stakeout ? 'stakeout' : 'chase';
  v.contracts++;
  const fugitive = createVehicle(G, armored ? 'armored' : stakeout ? 'sedan' : 'sports', fx, fz, heading, {
    driver: 'race', occupied: true, color: armored ? 0x3a4a3a : stakeout ? 0x3a4a5a : 0x111111,
  });
  fugitive.throttleTarget = 0;
  fugitive.steerTarget = 0;
  v.fugitive = fugitive;
  v.route = pickEscapeRoute(G);
  // The fugitive heads for the nearest route point, then follows the loop.
  let best = 0, bd = Infinity;
  v.route.forEach((p, i) => {
    const d = Math.hypot(p.x - fx, p.z - fz);
    if (d < bd) { bd = d; best = i; }
  });
  v.routeIndex = best;
  v.active = true;
  v.rams = 0;
  v.pinTimer = 0;
  v.timer = FUGITIVE_TIMEOUT;
  v.tailTime = 0;
  v.exposedTimer = 0;
  if (armored) {
    G.hud.showDialogue([
      'VIGILANTE — ARMORED TAKEDOWN: a Syndicate armored van is moving the crew\'s cash across town.',
      `Ram it ${RAMS_TO_STOP} times to crack it open — it is heavy, slow, and it will not swerve for you.`,
      `$${BOUNTY} from the PD, plus whatever is in the back. Go take it.`,
    ]);
  } else if (stakeout) {
    G.hud.showDialogue([
      'VIGILANTE — STAKEOUT: a suspect in a grey sedan is running errands for the crew.',
      'Tail it for 20 seconds — stay 12–55m back. Get closer than 12m and it spots you; drift past 55m and it is gone.',
      `$${BOUNTY} from the PD if you follow it to the drop. Quiet now.`,
    ]);
  } else {
    G.hud.showDialogue([
      'VIGILANTE CONTRACT — a fugitive in a stolen black Comet GT is running.',
      `Ram it ${RAMS_TO_STOP} times, or pin it for 2 seconds. $${BOUNTY} from the PD if you stop it.`,
      `${FUGITIVE_TIMEOUT} seconds before it vanishes into the night. Go!`,
    ]);
  }
  G.audio.missionSting();
  G.wanted.addHeat(6, 'vigilante contract');
  return true;
}

function endVigilante(G, won, reason) {
  const v = G.vigilante;
  if (!v.active) return;
  v.active = false;
  if (v.fugitive) {
    v.fugitive.driver = null;
    v.fugitive.parked = true;
    v.fugitive = null;
  }
  if (won) {
    G.cash += BOUNTY;
    v.bounties++;
    v.earned += BOUNTY;
    G.hud.showDialogue([
      `VIGILANTE — fugitive stopped! The PD wires you $${BOUNTY}, no questions asked.`,
      `${reason}`,
      `Bounties collected: ${v.bounties} ($${v.earned} total). The streets are a little safer.`,
    ]);
    G.audio.missionComplete();
    G.save.save(G);
  } else {
    G.hud.toast(`Contract failed — ${reason}`);
  }
}

function driveFugitive(G, dt) {
  const v = G.vigilante;
  const f = v.fugitive;
  if (!f) return;
  const target = v.route[v.routeIndex % v.route.length];
  const dx = target.x - f.pos.x;
  const dz = target.z - f.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 12) { v.routeIndex++; return; }
  const want = Math.atan2(dx, dz);
  const err = wrapAngle(want - f.heading);
  f.steerTarget = Math.max(-1, Math.min(1, err * 1.8));
  // The fugitive is fast but sloppy: full throttle, slower in hard turns.
  // A stakeout target is the opposite: slow, steady, law-abiding — it must
  // be followed, not caught.
  const top = f.spec.topSpeed * (v.kind === 'stakeout' ? 0.35 : 0.92);
  f.throttleTarget = (Math.abs(err) > 1.0 && f.speed > 16) ? 0 : (f.speed < top ? 1 : 0);
}

function dropSpikeStrip(G) {
  const v = G.vigilante;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const heading = G.driving ? G.driving.heading : G.player.heading;
  // 26 units ahead of Mara, across the road she is travelling on.
  const x = pos.x + Math.sin(heading) * 26;
  const z = pos.z + Math.cos(heading) * 26;
  const group = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 1.2), mat(0x2a2a2a));
  base.position.y = 0.15;
  group.add(base);
  for (let i = 0; i < 9; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 4), mat(0xcccccc));
    spike.position.set(-3 + i * 0.75, 0.5, 0);
    group.add(spike);
  }
  group.position.set(x, 0, z);
  group.rotation.y = heading + Math.PI / 2;
  G.scene.add(group);
  v.spikes.push({ group, x, z, life: 45 });
  G.hud.toast('SPIKE STRIP ahead! Swerve or your tires are gone.');
  G.audio.sirenBurst();
}

function dropRoadblock(G) {
  const v = G.vigilante;
  const pos = G.driving ? G.driving.pos : G.player.pos;
  const heading = G.driving ? G.driving.heading : G.player.heading;
  const bx = pos.x + Math.sin(heading) * 40;
  const bz = pos.z + Math.cos(heading) * 40;
  const cars = [];
  for (const off of [-4, 4]) {
    const px = bx + Math.cos(heading) * off;
    const pz = bz - Math.sin(heading) * off;
    // Parked, not in G.policeCars: updatePolice chases only its own cruisers,
    // so these stay put as a real wall across the avenue (like its own
    // built-in roadblocks).
    const c = createVehicle(G, 'police', px, pz, heading + Math.PI / 2, { parked: true });
    cars.push(c);
  }
  v.roadblocks.push({ cars, life: 40 });
  G.hud.toast('ROADBLOCK ahead! The PD has the avenue sealed.');
  G.audio.sirenBurst();
}

export function updateVigilante(G, dt) {
  const v = G.vigilante;
  if (!v) return;
  if (G.mode === 'playing' && G.input.pressed('vigilante')) startVigilante(G);

  // --- the fugitive contract ---------------------------------------------
  if (v.active && v.fugitive) {
    v.timer -= dt;
    const car = G.driving;
    const f = v.fugitive;
    driveFugitive(G, dt);
    const d = car ? Math.hypot(f.pos.x - car.pos.x, f.pos.z - car.pos.z) : 999;
    // v5: the stakeout plays by different rules — distance is the weapon.
    if (v.kind === 'stakeout') {
      if (!car) { endVigilante(G, false, 'you left your car — the suspect drove off.'); return; }
      if (d < 12) {
        v.exposedTimer += dt;
        G.hud.setObjectiveHint(`TOO CLOSE — back off! Spotted in ${Math.max(0, 3 - v.exposedTimer).toFixed(1)}s`);
        if (v.exposedTimer > 3) { endVigilante(G, false, 'the suspect spotted you and burned off.'); return; }
      } else if (d > 55) {
        G.hud.setObjectiveHint(`Losing it — ${Math.round(d)}m away. Close the gap, quietly.`);
      } else {
        v.exposedTimer = 0;
        v.tailTime += dt;
        G.hud.setObjectiveHint(`STAKEOUT — tailing ${Math.round(d)}m back · ${Math.max(0, 20 - v.tailTime).toFixed(0)}s to the drop`);
        if (v.tailTime >= 20) { endVigilante(G, true, 'Tailed the suspect all the way to the drop — the PD has the whole crew now.'); return; }
      }
      if (v.timer <= 0) { endVigilante(G, false, 'the suspect finished its errands and vanished.'); return; }
      return;
    }
    if (car && d < 4.5) {
      // Contact: count a ram when the closing speed is real, or pin it.
      const closing = Math.abs(car.speed - f.speed);
      if (closing > 5 && f.crashCooldown <= 0) {
        f.crashCooldown = 2;
        v.rams++;
        G.audio.crash();
        G.hud.toast(`Ram ${v.rams}/${RAMS_TO_STOP} — the fugitive is rattled!`);
        if (v.rams >= RAMS_TO_STOP) {
          // v6: the armored van pays double — the PD bounty plus the cash
          // that was in the back, seized on the spot.
          if (v.kind === 'armored') {
            endVigilante(G, true, 'Three solid rams — the armored van cracked open. The crew\'s cash is yours.');
            G.cash += BOUNTY;
            G.hud.toast(`Armored takedown bonus — +$${BOUNTY} in seized cash!`);
            return;
          }
          endVigilante(G, true, 'Three solid rams — the Comet GT gave up the ghost.'); return;
        }
      }
      v.pinTimer += dt;
      if (v.pinTimer > 2) { endVigilante(G, true, 'Pinned against the curb for two seconds — the fugitive surrendered.'); return; }
    } else {
      v.pinTimer = 0;
    }
    G.hud.setObjectiveHint(
      `Vigilante — fugitive ${Math.round(d)}m away · rams ${v.rams}/${RAMS_TO_STOP} · ${Math.max(0, v.timer).toFixed(0)}s left`);
    if (v.timer <= 0) { endVigilante(G, false, 'the fugitive vanished into the night.'); return; }
    if (!car) { endVigilante(G, false, 'you left your car — the fugitive got away.'); return; }
  }

  // --- PD escalation at 3+ stars: spikes and roadblocks -------------------
  const stars = G.wanted.stars;
  if (stars >= 3 && G.driving) {
    v.spikeTimer -= dt;
    if (v.spikeTimer <= 0) {
      v.spikeTimer = 22 + Math.random() * 8;
      dropSpikeStrip(G);
    }
    v.roadblockTimer -= dt;
    if (v.roadblockTimer <= 0 && stars >= 4) {
      v.roadblockTimer = 45;
      dropRoadblock(G);
    }
  } else {
    v.spikeTimer = Math.max(v.spikeTimer, 8);
  }
  // Spike strips: driving over one shreds the tires.
  if (G.driving) {
    for (let i = v.spikes.length - 1; i >= 0; i--) {
      const s = v.spikes[i];
      s.life -= dt;
      const d = Math.hypot(s.x - G.driving.pos.x, s.z - G.driving.pos.z);
      if (d < 4) {
        G.driving.speed *= 0.3;
        G.audio.crash();
        G.hud.toast('SPIKED! Tires shredded — crawl to safety and let the heat cool.');
        G.wanted.addHeat(8, 'spike strip');
        G.scene.remove(s.group);
        v.spikes.splice(i, 1);
        continue;
      }
      if (s.life <= 0) {
        G.scene.remove(s.group);
        v.spikes.splice(i, 1);
      }
    }
  }
  // Roadblocks dissolve after their life so the city never clogs up.
  for (let i = v.roadblocks.length - 1; i >= 0; i--) {
    const rb = v.roadblocks[i];
    rb.life -= dt;
    if (rb.life <= 0) {
      for (const c of rb.cars) {
        // Leave the parked cruisers as scenery; they are just cars now.
      }
      v.roadblocks.splice(i, 1);
    }
  }
}

export function vigilanteStatusText(G) {
  const v = G.vigilante;
  if (!v) return 'Vigilante: not ready.';
  return `Vigilante — ${v.bounties} bounties ($${v.earned}) · press V while driving for a contract`;
}

// v7: the high-value target and the bounty tiers. The PD's contract
// board gets a second page: a high-value target in an armored van —
// slower than the Comet GT, harder to stop, worth $1,500 — and a tier
// ladder that pays more the cleaner Mara works. A bounty with no
// collateral damage (no peds hit, no traffic wrecked) pays a 25%
// clean bonus; a bounty taken down in under a minute pays a 15% speed
// bonus. The board remembers who works clean.

export const VIGILANTE_TIERS = [
  { name: 'Rookie', bounties: 0, mult: 1 },
  { name: 'Hunter', bounties: 5, mult: 1.1 },
  { name: 'Professional', bounties: 12, mult: 1.25 },
  { name: 'Legend', bounties: 25, mult: 1.5 },
];

export function createVigilanteV7(G) {
  const v7 = {
    highValueActive: false,
    highValueDone: 0,
    cleanBonuses: 0,
    speedBonuses: 0,
    tierBonusEarned: 0,
    startTime: 0,
    collateral: 0,
  };
  G.vigilanteV7 = v7;
  return v7;
}

export function vigilanteTier(G) {
  const vig = G.vigilante;
  const v7 = G.vigilanteV7;
  if (!vig) return VIGILANTE_TIERS[0];
  const n = vig.bounties || 0;
  let tier = VIGILANTE_TIERS[0];
  for (const t of VIGILANTE_TIERS) if (n >= t.bounties) tier = t;
  return tier;
}

// v7: start a high-value target — the armored van, $1,500, and a fugitive
// who does not scare easy. Only one target at a time.
export function startHighValueTarget(G) {
  const v7 = G.vigilanteV7;
  const vig = G.vigilante;
  if (!v7 || !vig) return false;
  if (vig.active || v7.highValueActive) {
    G.hud.toast('Already on a contract — finish this one first.');
    return false;
  }
  v7.highValueActive = true;
  v7.startTime = G.elapsed;
  v7.collateral = 0;
  G.hud.toast('HIGH-VALUE TARGET: an armored van is running the harbor loop. $1,500 — and the PD pays a clean bonus if nobody else gets hurt.');
  return true;
}

// v7: settle a bounty with the tier ladder — the clean bonus and the
// speed bonus stack on top of the tier multiplier.
export function settleBountyV7(G, basePay) {
  const v7 = G.vigilanteV7;
  const vig = G.vigilante;
  if (!v7 || !vig) return basePay;
  const tier = vigilanteTier(G);
  let pay = Math.round(basePay * tier.mult);
  if (v7.collateral === 0) {
    const clean = Math.round(pay * 0.25);
    pay += clean;
    v7.cleanBonuses += 1;
    G.hud.toast(`Clean bounty! No collateral — +$${clean} clean bonus.`);
  }
  const elapsed = G.elapsed - v7.startTime;
  if (v7.startTime > 0 && elapsed < 60) {
    const speed = Math.round(pay * 0.15);
    pay += speed;
    v7.speedBonuses += 1;
    G.hud.toast(`Fast takedown (${elapsed.toFixed(0)}s)! +$${speed} speed bonus.`);
  }
  v7.tierBonusEarned += pay - basePay;
  v7.highValueActive = false;
  v7.startTime = 0;
  return pay;
}

// v7: collateral — call it when a bounty chase hurts a bystander or a
// traffic car. One mark and the clean bonus is gone for this contract.
export function recordCollateralV7(G) {
  const v7 = G.vigilanteV7;
  if (!v7) return;
  v7.collateral += 1;
}

export function vigilanteV7Summary(G) {
  const v7 = G.vigilanteV7;
  if (!v7) return 'The contract board is empty.';
  const tier = vigilanteTier(G);
  return `Tier: ${tier.name} (x${tier.mult}) · ${v7.highValueDone} high-value targets · ${v7.cleanBonuses} clean bonuses · $${v7.tierBonusEarned} tier pay.`;
}
