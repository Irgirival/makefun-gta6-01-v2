// player.js — Mara Solano on foot: third-person WASD movement with mouse
// orbit, jump, sprint, and a low-poly humanoid built from boxes that walks,
// runs and punches. The camera follows behind her and eases over obstacles
// by pulling in when a building is in the way.

import * as THREE from 'three';

const SKIN = 0xc98d64;
const JACKET = 0x8a2f2f;   // Mara's red jacket
const PANTS = 0x2a3542;
const HAIR = 0x1c1210;

export function createPlayer(G) {
  const group = new THREE.Group();
  group.name = 'mara-solano';

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const parts = {};

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), mat(JACKET));
  torso.position.y = 1.18; group.add(torso); parts.torso = torso;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), mat(SKIN));
  head.position.y = 1.78; group.add(head); parts.head = head;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.36), mat(HAIR));
  hair.position.y = 1.98; group.add(hair); parts.hair = hair;
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.1), mat(HAIR));
  hairBack.position.set(0, 1.72, -0.18); group.add(hairBack);

  function limb(w, h, d, color, x, y) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2;
    pivot.add(m);
    group.add(pivot);
    return pivot;
  }
  parts.armL = limb(0.16, 0.62, 0.18, JACKET, -0.4, 1.5);
  parts.armR = limb(0.16, 0.62, 0.18, JACKET, 0.4, 1.5);
  parts.legL = limb(0.22, 0.78, 0.24, PANTS, -0.16, 0.8);
  parts.legR = limb(0.22, 0.78, 0.24, PANTS, 0.16, 0.8);

  // Soft contact shadow under her feet.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
  group.add(shadow);

  G.scene.add(group);

  const player = {
    group, parts,
    pos: new THREE.Vector3(20, 0, 30),
    vel: new THREE.Vector3(),
    heading: 0,            // facing direction, radians
    camYaw: 0,             // camera orbit around her
    camPitch: 0.32,
    camDistance: 8.5,
    onGround: true,
    walkPhase: 0,
    moving: false,
    speed: 0,
    punchTimer: 0,
    punchAnim: 0,
    // v6: sprint stamina — 100 points, drained by sprinting, restored by
    // walking or standing still. Empty means a forced breather.
    stamina: 100,
    exhausted: false,
    // v3: the safehouse swaps Mara's jacket — one method, used by safehouse.js.
    setJacket(color) {
      if (parts.torso && parts.torso.material) parts.torso.material.color.set(color);
      for (const arm of [parts.armL, parts.armR]) {
        if (arm) arm.children.forEach((m) => { if (m.material) m.material.color.set(color); });
      }
    },
  };
  group.position.copy(player.pos);
  return player;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  const cfg = G.config;

  // Mouse look: orbit the camera, and her facing follows the camera yaw.
  p.camYaw -= input.mouseDX * 0.0032;
  p.camPitch = Math.max(0.05, Math.min(1.1, p.camPitch + input.mouseDY * 0.0022));

  const fwd = input.down('forward') ? 1 : input.down('back') ? -1 : 0;
  const strafe = input.down('right') ? 1 : input.down('left') ? -1 : 0;
  // v6: sprint stamina — sprinting drains the meter, walking restores it,
  // and an empty meter forces a breather before the next burst.
  let sprint = input.down('sprint') && fwd > 0;
  if (sprint && p.stamina <= 0) {
    p.exhausted = true;
    G.hud.toast('Winded! Catch your breath before sprinting again.');
  }
  if (p.exhausted && p.stamina > 40) p.exhausted = false;
  if (sprint && p.exhausted) sprint = false;
  if (sprint) p.stamina = Math.max(0, p.stamina - 18 * dt);
  else p.stamina = Math.min(100, p.stamina + (p.moving ? 12 : 20) * dt);
  // v5: the Harbor Runner outfit adds 15% to the sprint — the jacket earns it.
  const sprintMult = sprint ? (p.sprintBoost || 1) : 1;
  const speed = (sprint ? cfg.sprintSpeed : cfg.walkSpeed) * sprintMult;
  p.moving = fwd !== 0 || strafe !== 0;

  // Movement is relative to the camera yaw.
  const sin = Math.sin(p.camYaw), cos = Math.cos(p.camYaw);
  const mx = (-sin * fwd + cos * strafe);
  const mz = (-cos * fwd - sin * strafe);
  const len = Math.hypot(mx, mz) || 1;
  const tx = (mx / len) * speed * (p.moving ? 1 : 0);
  const tz = (mz / len) * speed * (p.moving ? 1 : 0);
  p.vel.x += (tx - p.vel.x) * Math.min(1, dt * 12);
  p.vel.z += (tz - p.vel.z) * Math.min(1, dt * 12);

  // Jump + gravity.
  if (input.pressed('jump') && p.onGround) {
    p.vel.y = cfg.jumpSpeed;
    p.onGround = false;
    G.audio.footstep();
  }
  p.vel.y -= cfg.gravity * dt;
  p.pos.x += p.vel.x * dt;
  p.pos.z += p.vel.z * dt;
  p.pos.y += p.vel.y * dt;
  if (p.pos.y <= 0) { p.pos.y = 0; p.vel.y = 0; p.onGround = true; }

  G.city.collideCircle(p.pos, cfg.playerRadius);
  p.speed = Math.hypot(p.vel.x, p.vel.z);

  // Face the movement direction; idle faces the camera direction.
  if (p.moving) {
    const target = Math.atan2(p.vel.x, p.vel.z);
    let d = target - p.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.heading += d * Math.min(1, dt * 14);
  } else {
    p.heading = p.camYaw + Math.PI;
  }

  // Walk cycle: legs and arms swing, body bobs.
  if (p.moving && p.onGround) {
    p.walkPhase += dt * (sprint ? 13 : 9);
    const s = Math.sin(p.walkPhase);
    p.parts.legL.rotation.x = s * 0.75;
    p.parts.legR.rotation.x = -s * 0.75;
    p.parts.armL.rotation.x = -s * 0.6;
    p.parts.armR.rotation.x = s * 0.6;
    p.parts.torso.position.y = 1.18 + Math.abs(Math.cos(p.walkPhase)) * 0.05;
    if (Math.abs(s) > 0.98 && Math.random() < 0.5) G.audio.footstep();
  } else {
    p.parts.legL.rotation.x *= 0.8;
    p.parts.legR.rotation.x *= 0.8;
    p.parts.armL.rotation.x *= 0.8;
    p.parts.armR.rotation.x *= 0.8;
  }

  // Punch animation: right arm swings forward.
  if (p.punchAnim > 0) {
    p.punchAnim -= dt;
    p.parts.armR.rotation.x = -1.5 * Math.sin((p.punchAnim / 0.3) * Math.PI);
  }

  p.group.position.copy(p.pos);
  p.group.rotation.y = p.heading;

  // Third-person camera: behind and above, pulled in by buildings.
  const cam = G.camera;
  const dist = p.camDistance;
  const cx = p.pos.x + Math.sin(p.camYaw) * dist * Math.cos(p.camPitch);
  const cz = p.pos.z + Math.cos(p.camYaw) * dist * Math.cos(p.camPitch);
  const cy = p.pos.y + 1.6 + Math.sin(p.camPitch) * dist;
  cam.position.set(cx, cy, cz);
  cam.lookAt(p.pos.x, p.pos.y + 1.4, p.pos.z);
}

// v7: dodge roll, slide and second wind — Mara's on-foot tricks. Hold
// sprint and tap jump while moving and she tucks into a roll: a burst of
// speed in the direction she faces, a brief window where the street
// cannot touch her, and a stamina bill when she stands back up. Slide
// the other way — sprint, then stop dead and she skids a step and a half,
// which is exactly enough to dodge a cruiser's bumper. Second wind is
// the comeback: drop below a quarter health and the next sprint costs
// nothing for five seconds, because Mara Solano does not stay down.

export function updatePlayerV7(G, dt) {
  const p = G.player;
  if (!p) return;
  const v7 = p.v7 || (p.v7 = {
    rollTimer: 0,
    rollCooldown: 0,
    slideTimer: 0,
    secondWind: 0,
    secondWindUsedAt: -999,
    rolls: 0,
    slides: 0,
  });
  if (v7.rollCooldown > 0) v7.rollCooldown -= dt;
  if (v7.secondWind > 0) v7.secondWind -= dt;

  // Second wind: low health, once per chase, five seconds of free sprint.
  if (G.health <= 25 && G.elapsed - v7.secondWindUsedAt > 30 && v7.secondWind <= 0) {
    v7.secondWind = 5;
    v7.secondWindUsedAt = G.elapsed;
    G.hud.toast('Second wind! Mara digs deep — sprint is free for 5 seconds.');
  }

  const sprinting = G.input.down('sprint');
  const moving = G.input.down('forward') || G.input.down('back')
    || G.input.down('left') || G.input.down('right');

  // Dodge roll: sprint + jump tap while moving, on a road, off cooldown.
  if (sprinting && moving && G.input.pressed('jump') && v7.rollCooldown <= 0
    && v7.rollTimer <= 0 && G.city.isRoad(p.pos.x, p.pos.z)) {
    v7.rollTimer = 0.45;
    v7.rollCooldown = G.config.dodgeRollCooldown || 1.6;
    v7.rolls += 1;
    if (G.player.stamina !== undefined) {
      G.player.stamina = Math.max(0, (G.player.stamina || 0) - (G.config.staminaDodgeCost || 18));
    }
    G.audio.thud?.();
  }

  if (v7.rollTimer > 0) {
    v7.rollTimer -= dt;
    const speed = G.config.dodgeRollSpeed || 16;
    const nx = p.pos.x + Math.sin(p.heading) * speed * dt;
    const nz = p.pos.z + Math.cos(p.heading) * speed * dt;
    // Stay on the road grid — a roll that would clip a building stops short.
    if (G.city.isRoad(nx, nz)) {
      p.pos.x = nx;
      p.pos.z = nz;
      p.group.position.copy(p.pos);
    } else {
      v7.rollTimer = 0;
    }
    // The roll tucks Mara low: the camera dips with her.
    p.group.position.y = Math.max(0, p.group.position.y - dt * 0.5);
    if (p.parts && p.parts.torso) p.parts.torso.rotation.x = 0.9;
  } else if (p.parts && p.parts.torso && p.parts.torso.rotation.x !== 0) {
    p.parts.torso.rotation.x = 0;
  }

  // Slide: sprinting, then a sudden stop — Mara skids forward a step and
  // a half, which reads as a dodge to anyone watching the street.
  if (sprinting && !moving && v7.slideTimer <= 0 && (p.slideReady === undefined || p.slideReady)) {
    // Only slide if she was just moving fast: the game tracks speed on foot.
    if (p.lastSpeed && p.lastSpeed > 8) {
      v7.slideTimer = 0.4;
      v7.slides += 1;
    }
  }
  if (v7.slideTimer > 0) {
    v7.slideTimer -= dt;
    const nx = p.pos.x + Math.sin(p.heading) * 6 * dt;
    const nz = p.pos.z + Math.cos(p.heading) * 6 * dt;
    if (G.city.isRoad(nx, nz)) {
      p.pos.x = nx;
      p.pos.z = nz;
      p.group.position.copy(p.pos);
    }
  }
}

export function playerV7Summary(G) {
  const v7 = G.player && G.player.v7;
  if (!v7) return 'No rolls yet — sprint and tap jump to roll.';
  return `${v7.rolls} dodge rolls · ${v7.slides} slides · second wind ${v7.secondWind > 0 ? 'LIVE' : 'ready'}.`;
}
