// Canvas-Renderer mit reinen Platzhalterformen. Liest die Welt nur, verändert nichts. Alle Farben/Formen hier austauschbar.
const RANK = { normal: '#c0564b', elite: '#d98a2b', boss: '#a03bd1', special: '#e2c13a', node: '#5d8f4e' };
const CH_BG = { base: '#2c3b2e', 1: '#28402c', 2: '#2b3447', 3: '#40303f' };
const OBJ = { gate: '#8fd3ff', building: '#b08a5a', npc: '#ffe08a', chest: '#d9a441', gift: '#ff8fb3', areachest: '#f5d76e' };
const DROP = { gold: '#ffd54a', gems: '#5ee0ff', wood: '#9c6b3c', stone: '#9aa3ad' };

export class Renderer {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.resize(); }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = this.cv.getBoundingClientRect();
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
  }
  draw(game) {
    const { ctx } = this, w = game.world, p = w.p, a = game.alpha, set = game.state.settings;
    const scale = this.w / 720, vw = 720, vh = this.h / scale;
    const lerp = (o) => [o.px + (o.x - o.px) * a, o.py + (o.y - o.py) * a];
    const [px, py] = lerp(p);
    const cx = Math.max(0, Math.min(w.map.w - vw, px - vw / 2)), cy = Math.max(-80, Math.min(w.map.h - vh + 120, py - vh * 0.55));
    this.cam = { cx, cy, scale };
    ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, 0, 0);
    ctx.fillStyle = '#10151a'; ctx.fillRect(0, 0, vw, vh);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = CH_BG[w.map.area ? w.map.area.chapter : 'base'] || '#333'; ctx.fillRect(0, 0, w.map.w, w.map.h);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = Math.floor(cx / 200) * 200; x < cx + vw; x += 200) { ctx.moveTo(x, cy); ctx.lineTo(x, cy + vh); }
    for (let y = Math.floor(cy / 200) * 200; y < cy + vh; y += 200) { ctx.moveTo(cx, y); ctx.lineTo(cx + vw, y); }
    ctx.stroke();
    const vis = (o, m = 80) => o.x > cx - m && o.x < cx + vw + m && o.y > cy - m && o.y < cy + vh + m; // Culling
    ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    for (const o of w.map.objects) {
      if (!vis(o, 120)) continue;
      let col = OBJ[o.type], label = o.name || '';
      if (o.type === 'gate') { const open = o.open(); col = open ? OBJ.gate : '#666'; label = open ? '▲ Tor' : '🔒 Tor'; if (o.back) label = '▼ zurück'; }
      if (o.type === 'building') { const b = game.state.buildings[o.id]; if (!b) col = 'rgba(176,138,90,.35)'; label += b ? (b.level > 1 ? ` ${b.level}` : '') : ' (bauen)'; }
      if (o.type === 'chest') { const rdy = game.g.now() >= (game.state.world.chests[o.id] || 0); if (!rdy) continue; label = 'Feldtruhe'; }
      if (o.type === 'gift') { const rdy = game.g.now() >= (game.state.world.gifts[o.id] || 0); if (!rdy) continue; label = 'Gift Chest'; }
      if (o.type === 'areachest') { if (game.state.claims[`areachest:${o.id}`]) continue; label = 'Gebietstruhe'; }
      ctx.fillStyle = col;
      if (o.type === 'npc') { ctx.beginPath(); ctx.arc(o.x, o.y, 16, 0, 7); ctx.fill(); } else { const s = o.type === 'building' ? 56 : o.type === 'gate' ? 60 : 26; ctx.fillRect(o.x - s / 2, o.y - s / 2, s, s); }
      ctx.fillStyle = '#fff'; ctx.fillText(label, o.x, o.y - 38);
    }
    for (const d of w.drops) { if (!vis(d)) continue; ctx.fillStyle = DROP[d.item] || (d.item.startsWith('orb') ? '#ff6ad5' : '#cfd8dc'); ctx.fillRect(d.x - 5, d.y - 5, 10, 10); }
    for (const e of w.enemies) {
      if (e.st === 'cast') { ctx.fillStyle = 'rgba(255,60,60,.25)'; ctx.beginPath(); ctx.arc(e.cx, e.cy, 150, 0, 7); ctx.fill(); }
      if (!e.alive || !vis(e)) continue;
      const [ex, ey] = lerp(e);
      ctx.globalAlpha = e.st === 'spawn' ? 0.5 : 1;
      ctx.fillStyle = e.stunT > 0 ? '#fff' : e.slowT > 0 ? '#7fb6ff' : RANK[e.v.rank];
      ctx.beginPath(); if (e.v.rank === 'node') ctx.rect(ex - e.r, ey - e.r, e.r * 2, e.r * 2); else ctx.arc(ex, ey, e.r, 0, 7); ctx.fill();
      if (e.v.rank !== 'normal' && e.v.rank !== 'node') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (e.hp < e.maxHp || e.v.rank !== 'normal') { ctx.fillStyle = '#000'; ctx.fillRect(ex - e.r, ey - e.r - 9, e.r * 2, 4); ctx.fillStyle = '#6fdc6f'; ctx.fillRect(ex - e.r, ey - e.r - 9, (e.r * 2 * e.hp) / e.maxHp, 4); }
      if (e.v.rank !== 'normal') { ctx.fillStyle = '#fff'; ctx.fillText(`${e.v.name} L${e.v.level}`, ex, ey - e.r - 14); }
    }
    for (const b of w.proj) { ctx.fillStyle = b.hostile ? '#ff5a5a' : '#fff59d'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill(); }
    if (!set.reducedFx) for (const f of w.fx) { ctx.strokeStyle = ['rgba(255,255,255,.5)', 'rgba(255,200,80,.7)', 'rgba(255,60,60,.8)'][f.k]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); }
    ctx.fillStyle = p.alive ? '#4fc3f7' : '#555'; ctx.beginPath(); ctx.arc(px, py, p.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    if (set.dmgNumbers) for (const t of w.texts) { ctx.fillStyle = t.kind === 3 ? '#ff6b6b' : t.kind === 2 ? '#ffd54a' : '#fff'; ctx.font = `${t.kind === 2 ? 'bold 17' : '14'}px system-ui`; ctx.globalAlpha = Math.min(1, t.t * 2); ctx.fillText(abbr(t.n), t.x, t.y); }
    ctx.globalAlpha = 1;
    this.minimap(game, w, px, py);
  }
  minimap(game, w, px, py) {
    const { ctx } = this, mw = 96, mh = Math.round((96 * w.map.h) / w.map.w), x0 = this.w - mw - 8, y0 = 96, sx = mw / w.map.w, sy = mh / w.map.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x0, y0, mw, mh);
    const fog = game.state.world.fog[w.map.id];
    if (w.map.kind !== 'arena' && fog && w.G) { const G = w.G; ctx.fillStyle = 'rgba(255,255,255,.18)'; for (const k of Object.keys(fog)) { const cxl = k % G.cols, cyl = Math.floor(k / G.cols); ctx.fillRect(x0 + cxl * G.cpx * sx, y0 + cyl * G.cpx * sy, G.cpx * sx + 0.5, G.cpx * sy + 0.5); } }
    for (const o of w.map.objects) if (o.type === 'gate') { ctx.fillStyle = o.open() ? '#8fd3ff' : '#777'; ctx.fillRect(x0 + o.x * sx - 3, y0 + o.y * sy - 2, 6, 4); }
    for (const e of w.enemies) if (e.alive && e.v.rank === 'boss') { ctx.fillStyle = RANK.boss; ctx.fillRect(x0 + e.x * sx - 3, y0 + e.y * sy - 3, 6, 6); }
    ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x0 + px * sx - 2, y0 + py * sy - 2, 4, 4);
  }
}
export function abbr(n) { return n < 10000 ? String(Math.round(n)) : n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : n < 1e9 ? (n / 1e6).toFixed(1) + 'M' : (n / 1e9).toFixed(1) + 'B'; }
