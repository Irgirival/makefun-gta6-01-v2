// minimap.js — the circular canvas minimap: roads as a street grid, the
// beach and harbor in blue, the player as a white arrow, traffic as grey
// dots, police as flashing blue/red dots, the mission marker as a gold
// diamond, and a north indicator. North is up; the map rotates nothing.

export function createMinimap(G) {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  const minimap = {
    canvas, ctx,
    draw(G) {
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const range = G.config.minimapRange;
      const scale = W / (range * 2);
      const px = G.driving ? G.driving.pos.x : G.player.pos.x;
      const pz = G.driving ? G.driving.pos.z : G.player.pos.z;
      const toMap = (x, z) => [cx + (x - px) * scale, cy + (z - pz) * scale];

      ctx.clearRect(0, 0, W, H);
      // Clip to the circle.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Water: sea to the south, harbor to the east.
      ctx.fillStyle = '#1a4a6a';
      const [, sy] = toMap(0, G.config.waterZ);
      ctx.fillRect(0, sy, W, H);
      const [hx] = toMap(G.config.harborX, 0);
      ctx.fillRect(hx, 0, W, H);

      // City ground.
      ctx.fillStyle = '#274b2e';
      ctx.fillRect(0, 0, W, H);
      // Beach strip.
      ctx.fillStyle = '#c9b078';
      const [, by] = toMap(0, G.config.beachZ);
      ctx.fillRect(0, by, W, H - by);

      // Roads.
      ctx.strokeStyle = '#3a3f45';
      ctx.lineWidth = Math.max(2, G.config.roadWidth * scale);
      for (const c of G.city.roads.xs) {
        const [x1] = toMap(c, 0);
        ctx.beginPath(); ctx.moveTo(x1, -10); ctx.lineTo(x1, H + 10); ctx.stroke();
      }
      for (const c of G.city.roads.zs) {
        const [, y1] = toMap(0, c);
        ctx.beginPath(); ctx.moveTo(-10, y1); ctx.lineTo(W + 10, y1); ctx.stroke();
      }

      // Airfield runway: a grey strip in the north-west corner.
      if (G.airport) {
        const [rx1, ry1] = toMap(G.airport.runway.x0, G.airport.runway.z);
        const [rx2] = toMap(G.airport.runway.x1, G.airport.runway.z);
        ctx.strokeStyle = '#8a8f94';
        ctx.lineWidth = Math.max(3, 16 * scale);
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry1); ctx.stroke();
      }

      // v3: Isla Verde — a sand disc south across the water, the causeway
      // bridge to it, and the boats as cyan dots in the harbor and marina.
      if (G.isla) {
        const [ix, iy] = toMap(-160, 540);
        const ir = 95 * scale;
        ctx.fillStyle = '#c9b078';
        ctx.beginPath(); ctx.arc(ix, iy, Math.max(2, ir), 0, Math.PI * 2); ctx.fill();
        const [bx1, by1] = toMap(-160, 340);
        const [bx2, by2] = toMap(-160, 500);
        ctx.strokeStyle = '#8a8a86';
        ctx.lineWidth = Math.max(2, 14 * scale);
        ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
      }
      if (G.boats) {
        ctx.fillStyle = '#4dd2ff';
        for (const b of G.boats.list) {
          const [x, y] = toMap(b.pos.x, b.pos.z);
          if (x < 0 || y < 0 || x > W || y > H) continue;
          ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        // v3: the next harbor-tour buoy, as an orange diamond.
        const tour = G.boats.tour;
        if (tour && tour.cooldown <= 0) {
          const buoy = tour.buoys[tour.next];
          if (buoy) {
            const [x, y] = toMap(buoy.x, buoy.z);
            ctx.fillStyle = '#ff5a2a';
            ctx.beginPath();
            ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y);
            ctx.closePath(); ctx.fill();
          }
        }
        // v3: the next marina-tour buoy, as a gold diamond.
        const marina = G.boats.marina;
        if (marina && marina.cooldown <= 0) {
          const buoy = marina.buoys[marina.next];
          if (buoy) {
            const [x, y] = toMap(buoy.x, buoy.z);
            ctx.fillStyle = '#ffd23e';
            ctx.beginPath();
            ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y);
            ctx.closePath(); ctx.fill();
          }
        }
      }

      // v5: the safehouse (green house square), the Verde Casino (gold
      // star on the boardwalk) and the street performers (purple dots) —
      // the places that pay, heal or entertain, at a glance.
      if (G.safehouse) {
        const [x, y] = toMap(G.safehouse.pos.x, G.safehouse.pos.z);
        if (x >= 0 && y >= 0 && x <= W && y <= H) {
          ctx.fillStyle = '#7dff9a';
          ctx.fillRect(x - 4, y - 4, 8, 8);
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 4, 8, 8);
        }
      }
      {
        const [x, y] = toMap(-160, 520);
        if (x >= 0 && y >= 0 && x <= W && y <= H) {
          ctx.fillStyle = '#ffd23e';
          ctx.beginPath();
          ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      ctx.fillStyle = '#c98aff';
      for (const ped of G.peds) {
        if (ped.kind !== 'performer' && ped.kind !== 'vendor') continue;
        const [x, y] = toMap(ped.pos.x, ped.pos.z);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Buildings as faint blocks (only those in view).
      ctx.fillStyle = 'rgba(200,200,190,0.35)';
      for (const b of G.city.colliders) {
        const [x1, y1] = toMap(b.minX, b.minZ);
        const [x2, y2] = toMap(b.maxX, b.maxZ);
        if (x2 < 0 || y2 < 0 || x1 > W || y1 > H) continue;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      }

      // Packages: small gold dots.
      ctx.fillStyle = '#ffd23e';
      for (const pkg of G.missions.packages) {
        if (pkg.collected) continue;
        const [x, y] = toMap(pkg.mesh.position.x, pkg.mesh.position.z);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }

      // Mission marker: pulsing gold diamond.
      if (G.missions.marker.beacon.visible) {
        const [x, y] = toMap(G.missions.marker.beacon.position.x, G.missions.marker.beacon.position.z);
        const r = 7 + Math.sin(G.elapsed * 4) * 2;
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }

      // v6: the new world on the map — Old Town landmarks in purple, the
      // ski lodge in white, the military APC in red and the live VIP job
      // in pink, so Mara can read the whole v6 map at a glance.
      if (G.oldtown) {
        ctx.fillStyle = '#c98aff';
        for (const lm of G.oldtown.landmarks) {
          if (lm.id === 'lodge') continue;
          const [x, y] = toMap(lm.x, lm.z);
          if (x < 0 || y < 0 || x > W || y > H) continue;
          ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (G.mountain) {
        const [x, y] = toMap(-196, 500);
        if (x >= 0 && y >= 0 && x <= W && y <= H) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (G.military && G.military.truck) {
        const [x, y] = toMap(G.military.truck.pos.x, G.military.truck.pos.z);
        ctx.fillStyle = '#ff2222';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (G.vip && G.vip.active) {
        const t = G.vip.stage === 'pickup' ? G.vip.pickup : G.vip.dropoff;
        const [x, y] = toMap(t.x, t.z);
        ctx.fillStyle = '#ff8ac9';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Traffic: grey dots.
      ctx.fillStyle = '#c9c9c9';
      for (const v of G.vehicles) {
        if (v.driver === 'player' || v.driver === 'police') continue;
        const [x, y] = toMap(v.pos.x, v.pos.z);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }

      // Police: flashing blue/red dots.
      const flash = Math.sin(G.elapsed * 8) > 0;
      ctx.fillStyle = flash ? '#ff3333' : '#3388ff';
      for (const v of G.policeCars) {
        const [x, y] = toMap(v.pos.x, v.pos.z);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const o of G.policeFoot) {
        const [x, y] = toMap(o.pos.x, o.pos.z);
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Police helicopter: a big flashing orange dot.
      if (G.heli && G.heli.active) {
        const [x, y] = toMap(G.heli.pos.x, G.heli.pos.z);
        ctx.fillStyle = Math.sin(G.elapsed * 8) > 0 ? '#ff9d2e' : '#ff5a2a';
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }

      // Player: white arrow pointing along the heading.
      const heading = G.driving ? G.driving.heading : G.player.heading;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(heading);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.restore();

      // North indicator.
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx, 16);
    },
  };
  G.minimap = minimap;
  return minimap;
}

// v7: the job blips and the damage compass. After the base minimap
// draws, this overlay paints on the same canvas: blue diamonds for
// delivery depots, a green square for the active drop-off, a purple dot
// for the regatta start, and a red arc on the rim pointing at whoever
// just hurt Mara — the damage direction, so she can turn and face it.
// The overlay recomputes the map transform itself (the base draw keeps
// its own), so the two layers can never drift apart.

export function drawMinimapV7(G) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const range = G.config.minimapRange;
  const scale = W / (range * 2);
  const px = G.driving ? G.driving.pos.x : G.player.pos.x;
  const pz = G.driving ? G.driving.pos.z : G.player.pos.z;
  const toMap = (x, z) => [cx + (x - px) * scale, cy + (z - pz) * scale];
  const inCircle = (mx, my) => Math.hypot(mx - cx, my - cy) < W / 2 - 4;

  const diamond = (x, z, color, size) => {
    const [mx, my] = toMap(x, z);
    if (!inCircle(mx, my)) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(mx, my - size);
    ctx.lineTo(mx + size, my);
    ctx.lineTo(mx, my + size);
    ctx.lineTo(mx - size, my);
    ctx.closePath();
    ctx.fill();
  };

  // Delivery depots: blue diamonds. The active drop-off: a green square.
  if (G.delivery) {
    for (const depot of [{ x: 100, z: -100 }, { x: -100, z: 220 }, { x: 220, z: -180 }, { x: -260, z: -180 }, { x: -160, z: 505 }]) {
      diamond(depot.x, depot.z, '#3aa7ff', 5);
    }
    if (G.delivery.active && G.delivery.drop) {
      const [mx, my] = toMap(G.delivery.drop.x, G.delivery.drop.z);
      if (inCircle(mx, my)) {
        ctx.fillStyle = '#2ee66b';
        ctx.fillRect(mx - 5, my - 5, 10, 10);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(mx - 5, my - 5, 10, 10);
      }
    }
  }

  // The regatta start: a purple dot on the harbor water.
  diamond(352, 40, '#b45ad8', 5);

  // The fire callout: an orange flame-dot while a building burns.
  if (G.fireCallouts && G.fireCallouts.active && G.fireCallouts.spot) {
    diamond(G.fireCallouts.spot.x, G.fireCallouts.spot.z, '#ff7a1a', 6);
  }

  // The K9 unit: a red paw-dot while the dog is on the hunt.
  if (G.k9 && G.k9.active && G.k9.dog) {
    diamond(G.k9.dog.pos.x, G.k9.dog.pos.z, '#ff2a2a', 4);
  }

  // Damage direction: a red arc on the rim pointing at the last hit.
  const dmg = G.minimapV7;
  if (dmg && dmg.lastDamageAt && G.elapsed - dmg.lastDamageAt < 2) {
    const ang = Math.atan2(dmg.dirX, -dmg.dirZ);
    ctx.strokeStyle = 'rgba(255,42,42,0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, W / 2 - 6, ang - 0.5, ang + 0.5);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// v7: record a hit's direction — the minimap overlay reads this for the
// red arc. Call it from wherever damage lands on Mara.
export function recordDamageDirection(G, fromX, fromZ) {
  const px = G.player.pos.x;
  const pz = G.player.pos.z;
  G.minimapV7 = G.minimapV7 || {};
  G.minimapV7.dirX = fromX - px;
  G.minimapV7.dirZ = fromZ - pz;
  G.minimapV7.lastDamageAt = G.elapsed;
}

export function minimapV7Summary(G) {
  const dmg = G.minimapV7;
  return dmg && dmg.lastDamageAt ? 'Damage compass live — the last hit came from the red arc.' : 'Minimap overlay live — depots, drops and callouts marked.';
}

// ---- v8: minimap v2 — the zoom, the route line and the legend -----------------
// The v7 minimap added job blips and a damage compass; v8 adds the zoom
// (the map follows Mara closer when she is on foot, wider when she is
// driving), a gold route line from Mara to the live mission marker, and
// a tiny legend so a new player can read the blips. The route line is
// drawn fresh every frame from the mission target, so it never goes stale.

export function drawMinimapV8(G) {
  const mm = G.minimap;
  if (!mm || !mm.canvas) return;
  const ctx = mm.canvas.getContext('2d');
  if (!ctx) return;
  // Zoom: on foot the map shows 120 units across, in a car 220 — the
  // world breathes with Mara's speed.
  const speed = G.driving ? Math.abs(G.driving.speed || 0) : 0;
  const range = G.driving ? 220 : 120;
  mm.rangeV8 = range;
  // Route line: from Mara's dot to the mission marker, in gold, dashed
  // so it reads as a suggestion and not a road.
  const target = currentMissionTargetV8(G);
  if (!target) return;
  const p = G.driving ? G.driving.pos : G.player.pos;
  const size = mm.canvas.width;
  const scale = size / (range * 2);
  const cx = size / 2;
  const cy = size / 2;
  const tx = cx + (target.x - p.x) * scale;
  const ty = cy + (target.z - p.z) * scale;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 210, 62, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(tx, ty, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function currentMissionTargetV8(G) {
  if (!G.missions || !G.missions.active) return null;
  const step = G.missions.step;
  const list = G.missions.list || null;
  if (list && list[step] && list[step].target) return list[step].target;
  // Fall back to the marker the mission system already placed.
  const marker = G.missions.marker;
  if (marker && marker.ring && marker.ring.visible) {
    return { x: marker.ring.position.x, z: marker.ring.position.z };
  }
  return null;
}

export function minimapLegendV8() {
  return 'Gold dot: mission target · dashed gold: your route · red: wanted · green: job · blue: water.';
}

export function minimapV8Summary(G) {
  const mm = G.minimap;
  if (!mm) return 'Minimap v2 not drawn yet.';
  return `range ${mm.rangeV8 || 190} units · route line ${currentMissionTargetV8(G) ? 'live' : 'no active mission'} · legend: gold mission, red wanted, green job.`;
}
