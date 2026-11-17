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
  const sprint = input.down('sprint') && fwd > 0;
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
