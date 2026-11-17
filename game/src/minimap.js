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
