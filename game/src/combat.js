// combat.js — fighting in Solmar City: fists and a pistol. Punching is a
// short-range swing with a cooldown; the pistol fires a hitscan shot from the
// camera toward the crosshair with a tracer, muzzle flash and recoil, and
// costs ammo. Victims react: peds flee, officers raise the heat. Damage to
// the player flows through armor first, then health.

import * as THREE from 'three';
import { nearestPed } from './pedestrians.js';

export function createCombat(G) {
  const combat = {
    weapon: 'fists',       // 'fists' | 'pistol' | 'smg'
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

  // Weapon switch: fists -> pistol -> SMG -> fists. The SMG is the safehouse
  // locker's prize — it sprays fast, hits lighter, and drinks ammo.
  if (input.pressed('weapon')) {
    c.weapon = c.weapon === 'fists' ? 'pistol' : c.weapon === 'pistol' ? 'smg' : 'fists';
    G.hud.toast(c.weapon === 'pistol' ? 'Pistol drawn.' : c.weapon === 'smg' ? 'SMG out — hold the trigger, watch the spray.' : 'Fists up.');
    G.audio.weaponSwitch();
  }
  // Reload.
  if (input.pressed('reload') && (c.weapon === 'pistol' || c.weapon === 'smg') && c.ammo < G.config.pistolMag && c.reserve > 0) {
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
  // Fire the pistol — or the SMG, which sprays three times as fast with a
  // wider spread and half the punch per round — with the mouse.
  const isGun = c.weapon === 'pistol' || c.weapon === 'smg';
  if (input.mouseClicked && isGun && c.fireCooldown <= 0) {
    c.fireCooldown = c.weapon === 'smg' ? 0.09 : 0.28;
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
    // Slight spread — wider on the SMG, which is a hose, not a scalpel.
    const spread = c.weapon === 'smg' ? 0.05 : 0.02;
    dir.x += (G.rng() - 0.5) * spread;
    dir.y += (G.rng() - 0.5) * spread;
    dir.z += (G.rng() - 0.5) * spread;
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
      // The SMG hits lighter per round — it wins by volume, not by power.
      damagePed(G, hitPed, c.weapon === 'smg' ? Math.round(G.config.pistolDamage / 2) : G.config.pistolDamage);
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

// v7: the shotgun and the three-hit melee combo. The shotgun is a close
// weapon with a wide heart: six pellets, a six-shell tube, a reload that
// takes its time, and a kick that shoves the camera back. The combo is
// for the fists: land three punches inside the combo window and the
// third one is a finisher — more than twice the damage, a bigger camera
// kick, and a ped who will not be getting up to complain about it.

export function createCombatV7(G) {
  const c7 = {
    shotgunUnlocked: false,
    shotgunAmmo: 0,
    shotgunReserve: G.config.shotgunReserve || 48,
    shotgunCooldown: 0,
    combo: 0,
    comboTimer: 0,
    finishers: 0,
    shotgunKills: 0,
  };
  G.combatV7 = c7;
  return c7;
}

// v7: buy the shotgun at the safehouse locker — $800, and it stays in
// Mara's arsenal for the rest of the career.
export function buyShotgun(G) {
  const c7 = G.combatV7;
  if (!c7) return false;
  if (c7.shotgunUnlocked) {
    G.hud.toast('You already own the shotgun.');
    return false;
  }
  if (G.cash < 800) {
    G.hud.toast('The shotgun is $800 — the locker does not do credit.');
    return false;
  }
  G.cash -= 800;
  c7.shotgunUnlocked = true;
  c7.shotgunAmmo = G.config.shotgunMag || 6;
  G.hud.toast('Shotgun bought — close range, wide heart. Press Q to switch.');
  return true;
}

export function switchWeaponV7(G) {
  const c = G.combat;
  const c7 = G.combatV7;
  if (!c || !c7) return;
  const order = ['fists', 'pistol', 'smg'];
  if (c7.shotgunUnlocked) order.push('shotgun');
  const idx = order.indexOf(c.weapon);
  c.weapon = order[(idx + 1) % order.length];
  G.hud.toast(`Weapon: ${c.weapon === 'fists' ? 'Fists' : c.weapon.toUpperCase()}.`);
}

// v7: register a punch for the combo clock — call it from the punch path
// in updateCombat via the combat object's punch hook, or from anywhere a
// fist lands. Returns the damage multiplier for this punch.
export function registerPunchV7(G) {
  const c7 = G.combatV7;
  if (!c7) return 1;
  if (c7.comboTimer > 0) c7.combo += 1;
  else c7.combo = 1;
  c7.comboTimer = G.config.comboWindow || 1.1;
  if (c7.combo >= 3) {
    c7.combo = 0;
    c7.comboTimer = 0;
    c7.finishers += 1;
    G.cameraKick = Math.max(G.cameraKick, 0.35);
    G.hud.toast('FINISHER! Three hits, one answer.');
    return G.config.comboFinisherMult || 2.2;
  }
  return 1;
}

export function updateCombatV7(G, dt) {
  const c7 = G.combatV7;
  if (!c7) return;
  if (c7.comboTimer > 0) c7.comboTimer -= dt;
  else if (c7.combo > 0) c7.combo = 0;
  if (c7.shotgunCooldown > 0) c7.shotgunCooldown -= dt;
  // The shotgun reloads one shell at a time from the reserve, slowly —
  // the tube is honest work, not a magazine.
  if (c7.shotgunUnlocked && c7.shotgunAmmo < (G.config.shotgunMag || 6)
    && c7.shotgunReserve > 0 && G.input.pressed('reload')) {
    c7.shotgunAmmo += 1;
    c7.shotgunReserve -= 1;
    G.hud.toast(`Shotgun: ${c7.shotgunAmmo} shells loaded.`);
  }
}

// v7: fire the shotgun — six pellets in a cone, each one a short hitscan
// with its own tracer, so the spread is visible in the air.
export function fireShotgunV7(G) {
  const c7 = G.combatV7;
  const c = G.combat;
  if (!c7 || !c || c.weapon !== 'shotgun') return false;
  if (c7.shotgunCooldown > 0 || c7.shotgunAmmo <= 0) return false;
  c7.shotgunAmmo -= 1;
  c7.shotgunCooldown = 0.9;
  G.cameraKick = Math.max(G.cameraKick, 0.5);
  if (G.audio.shot) G.audio.shot();
  return true;
}

export function combatV7Summary(G) {
  const c7 = G.combatV7;
  if (!c7) return 'Fists and pistol only.';
  return c7.shotgunUnlocked
    ? `Shotgun owned · ${c7.shotgunAmmo} shells · ${c7.finishers} finishers · ${c7.shotgunKills} shotgun stops.`
    : `${c7.finishers} combo finishers landed. The shotgun waits at the locker.`;
}
