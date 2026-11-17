// combat.js — fighting in Solmar City: fists and a pistol. Punching is a
// short-range swing with a cooldown; the pistol fires a hitscan shot from the
// camera toward the crosshair with a tracer, muzzle flash and recoil, and
// costs ammo. Victims react: peds flee, officers raise the heat. Damage to
// the player flows through armor first, then health.

import * as THREE from 'three';
import { nearestPed } from './pedestrians.js';

export function createCombat(G) {
  const combat = {
    weapon: 'fists',       // 'fists' | 'pistol'
    ammo: G.config.pistolMag,
    reserve: G.config.pistolReserve,
    punchCooldown: 0,
    fireCooldown: 0,
    muzzle: 0,
    tracers: [],
  };
  // Damage the player through armor first, then health (used by police.js).
  combat.damagePlayer = (amount, cause) => damagePlayer(G, amount, cause);
  G.combat = combat;
  return combat;
}

function spawnTracer(G, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe98a }));
  G.scene.add(line);
  G.combat.tracers.push({ line, life: 0.08 });
}

function hitSpark(G, pos) {
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  spark.position.copy(pos);
  G.scene.add(spark);
  G.combat.tracers.push({ line: spark, life: 0.15, isMesh: true });
}

export function updateCombat(G, dt) {
  const c = G.combat;
  const input = G.input;
  if (c.punchCooldown > 0) c.punchCooldown -= dt;
  if (c.fireCooldown > 0) c.fireCooldown -= dt;
  if (c.muzzle > 0) c.muzzle -= dt;

  // Fade tracers and sparks.
  for (let i = c.tracers.length - 1; i >= 0; i--) {
    const t = c.tracers[i];
    t.life -= dt;
    if (t.life <= 0) {
      G.scene.remove(t.line);
      if (t.line.geometry) t.line.geometry.dispose();
      c.tracers.splice(i, 1);
    }
  }

  if (G.mode !== 'playing' || G.driving) return;

  // Weapon switch.
  if (input.pressed('weapon')) {
    c.weapon = c.weapon === 'fists' ? 'pistol' : 'fists';
    G.hud.toast(c.weapon === 'pistol' ? 'Pistol drawn.' : 'Fists up.');
    G.audio.weaponSwitch();
  }
  // Reload.
  if (input.pressed('reload') && c.weapon === 'pistol' && c.ammo < G.config.pistolMag && c.reserve > 0) {
    const need = G.config.pistolMag - c.ammo;
    const take = Math.min(need, c.reserve);
    c.ammo += take; c.reserve -= take;
    G.audio.reload();
    G.hud.toast('Reloaded.');
  }
  // Punch.
  if (input.pressed('punch') && c.punchCooldown <= 0) {
    c.punchCooldown = G.config.punchCooldown;
    G.player.punchAnim = 0.3;
    G.audio.punch();
    const p = G.player;
    const fx = p.pos.x + Math.sin(p.heading) * 1.4;
    const fz = p.pos.z + Math.cos(p.heading) * 1.4;
    const ped = nearestPed(G, fx, fz, G.config.punchRange);
    if (ped) {
      damagePed(G, ped, G.config.punchDamage);
      G.wanted.addHeat(G.config.heatPerCrime.punch, 'assault');
      G.pedestrians.scarePeds(G, p.pos.x, p.pos.z, 25);
    }
    const officer = nearestOfficer(G, fx, fz, G.config.punchRange);
    if (officer) {
      G.wanted.addHeat(G.config.heatPerCrime.killCop, 'attacked an officer');
      G.hud.toast('You hit a cop! That was a mistake.');
      removeOfficer(G, officer);
    }
  }
  // Fire the pistol with the mouse.
  if (input.mouseClicked && c.weapon === 'pistol' && c.fireCooldown <= 0) {
    c.fireCooldown = 0.28;
    if (c.ammo <= 0) {
      G.audio.emptyClick();
      G.hud.toast('Out of ammo — press R to reload.');
      return;
    }
    c.ammo--;
    c.muzzle = 0.07;
    G.audio.gunshot();
    G.wanted.addHeat(G.config.heatPerCrime.shoot, 'gunfire');
    G.pedestrians.scarePeds(G, G.player.pos.x, G.player.pos.z, 40);
    const cam = G.camera;
    const from = cam.position.clone();
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    // Slight spread.
    dir.x += (G.rng() - 0.5) * 0.02;
    dir.y += (G.rng() - 0.5) * 0.02;
    dir.z += (G.rng() - 0.5) * 0.02;
    dir.normalize();
    const ray = new THREE.Raycaster(from, dir, 0.1, 120);
    // Hit peds first (sphere test), then officers, then the world.
    let hitPoint = from.clone().addScaledVector(dir, 120);
    let hitPed = null, bestD = 120;
    for (const ped of G.peds) {
      const toPed = new THREE.Vector3(ped.pos.x, 1.2, ped.pos.z).sub(from);
      const along = toPed.dot(dir);
      if (along < 0 || along > bestD) continue;
      const perp = toPed.clone().addScaledVector(dir, -along).length();
      if (perp < 0.9) { bestD = along; hitPed = ped; }
    }
    if (hitPed) {
      hitPoint = new THREE.Vector3(hitPed.pos.x, 1.2, hitPed.pos.z);
      damagePed(G, hitPed, G.config.pistolDamage);
    } else {
      const officer = nearestOfficerAlong(G, from, dir);
      if (officer) {
        hitPoint = new THREE.Vector3(officer.pos.x, 1.2, officer.pos.z);
        G.wanted.addHeat(G.config.heatPerCrime.killCop, 'shot an officer');
        removeOfficer(G, officer);
        G.hud.toast('Officer down. The PD will not forget this.');
      } else {
        const hits = ray.intersectObjects(G.city.group.children, true);
        if (hits.length > 0) hitPoint = hits[0].point;
      }
    }
    spawnTracer(G, from.clone().addScaledVector(dir, 1.2), hitPoint);
    hitSpark(G, hitPoint);
    // Camera kick.
    G.cameraKick = 0.02;
  }
}

function damagePed(G, ped, dmg) {
  // A ped that takes a heavy hit goes down and stays down (as a "fled" removal
  // with a cash drop); light hits just scare them.
  if (dmg >= G.config.pistolDamage) {
    G.pedestrians.removePed(G, ped);
    G.hud.toast('Down. Nobody saw that — move.');
  } else {
    ped.state = 'flee';
    ped.panic = 1;
    ped.speed = 7;
  }
}

export function nearestOfficer(G, x, z, rangeDist) {
  let best = null, bd = rangeDist;
  for (const o of G.policeFoot) {
    const d = Math.hypot(o.pos.x - x, o.pos.z - z);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function nearestOfficerAlong(G, from, dir) {
  let best = null, bd = 120;
  for (const o of G.policeFoot) {
    const to = new THREE.Vector3(o.pos.x, 1.2, o.pos.z).sub(from);
    const along = to.dot(dir);
    if (along < 0 || along > bd) continue;
    const perp = to.clone().addScaledVector(dir, -along).length();
    if (perp < 1.0) { bd = along; best = o; }
  }
  return best;
}

function removeOfficer(G, officer) {
  G.scene.remove(officer.group);
  const i = G.policeFoot.indexOf(officer);
  if (i >= 0) G.policeFoot.splice(i, 1);
}

export function damagePlayer(G, amount, cause) {
  if (G.mode !== 'playing') return;
  const c = G.combat;
  let rest = amount;
  if (G.armor > 0) {
    const absorbed = Math.min(G.armor, rest);
    G.armor -= absorbed;
    rest -= absorbed;
  }
  G.health -= rest;
  G.hud.flashDamage();
  G.audio.hurt();
  if (G.health <= 0) {
    G.health = 0;
    G.gameOver('wasted', cause);
  }
}

export function healPlayer(G, amount) {
  G.health = Math.min(G.config.playerHealth, G.health + amount);
}

// v3: the safehouse restocks Mara — a full magazine and a full reserve,
// so she never walks out of her own front door unarmed.
export function restockAmmo(G) {
  G.combat.ammo = G.config.pistolMag;
  G.combat.reserve = G.config.pistolReserve;
}

// v5 — the weapon locker: cash for kit. Each buy checks the wallet first,
// applies at once, and tells Mara what changed. The safehouse shop calls
// these; nothing else spends cash on ammo, armor or medkits.
const LOCKER_PRICES = { ammo: 80, vest: 200, medkit: 150 };

export function buyAmmoPack(G) {
  if (G.cash < LOCKER_PRICES.ammo) {
    G.hud.toast(`Ammo box is $${LOCKER_PRICES.ammo} — you have $${Math.floor(G.cash)}.`);
    G.audio.emptyClick();
    return false;
  }
  G.cash -= LOCKER_PRICES.ammo;
  G.combat.reserve += 60;
  G.hud.toast(`Ammo box — +60 reserve rounds (now ${G.combat.reserve}).`);
  return true;
}

export function buyArmorVest(G) {
  if (G.cash < LOCKER_PRICES.vest) {
    G.hud.toast(`Armor vest is $${LOCKER_PRICES.vest} — you have $${Math.floor(G.cash)}.`);
    G.audio.emptyClick();
    return false;
  }
  if (G.armor >= 100) {
    G.hud.toast('Armor is already full — save the $200 for later.');
    return false;
  }
  G.cash -= LOCKER_PRICES.vest;
  G.armor = Math.min(100, G.armor + 50);
  G.hud.toast(`Armor vest fitted — armor ${Math.round(G.armor)}.`);
  return true;
}

export function buyMedkit(G) {
  if (G.cash < LOCKER_PRICES.medkit) {
    G.hud.toast(`Medkit is $${LOCKER_PRICES.medkit} — you have $${Math.floor(G.cash)}.`);
    G.audio.emptyClick();
    return false;
  }
  if (G.health >= G.config.playerHealth) {
    G.hud.toast('Health is already full — no medkit needed.');
    return false;
  }
  G.cash -= LOCKER_PRICES.medkit;
  healPlayer(G, 50);
  G.hud.toast(`Medkit used — health ${Math.round(G.health)}.`);
  return true;
}
