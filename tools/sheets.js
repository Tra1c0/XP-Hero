#!/usr/bin/env node
// Zeichnet Modellbögen der EIGENEN Figuren des Spiels (Gegner, Helden, Waffen, Siedlungsfiguren) als SVG nach docs/sheets/.
// Je Figur zwei Ansichten: von vorn und schräg von oben (Spielansicht). Quelle sind dieselben Grundform-Teile, die das Spiel zeichnet.
import fs from 'node:fs';
import { buildBaseContent } from '../src/core/content/base.js';
import { SHAPES } from '../src/client/assets3d.js';
import { enemyParts, npcParts, heroBody, WEAPON_PARTS } from '../src/client/enemy3d.js';
const T = buildBaseContent().tables, dir = new URL('../docs/sheets/', import.meta.url);
const rgb = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) : c);
// Teile [Form, x, y, z, Drehung, sx, sy, sz, Farbe] -> Dreiecke in Weltlage
function tris(parts) {
  const out = [];
  for (const t of parts) { const S = SHAPES[t[0]]; if (!S) continue; const c = Math.cos(t[4]), s = Math.sin(t[4]), col = rgb(t[8]);
    for (let i = 0; i < S.length; i += 18) { const v = []; for (let k = 0; k < 3; k++) { const x = S[i + k * 6] * t[5], y = S[i + k * 6 + 1] * t[6], z = S[i + k * 6 + 2] * t[7]; v.push([t[1] + x * c + z * s, t[2] + y, t[3] - x * s + z * c]); } out.push([v, col, t[9] || 0]); } }
  return out;
}
function view(T3, yaw, pitch, ox, oy, sc, cy) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), L = [0.33, 0.78, 0.53], list = [];
  for (const [v, col, em] of T3) {
    const P = v.map(([x, y, z]) => { const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw, y1 = (y - cy) * cp + z1 * sp, z2 = -(y - cy) * sp + z1 * cp; return [ox + x1 * sc, oy - y1 * sc, z2]; });
    const [a, b, c] = v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], nl = Math.hypot(...n) || 1;
    const sh = em ? 1 : 0.5 + 0.5 * Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl), hex = '#' + col.map((q) => Math.round(Math.max(0, Math.min(1, q * sh)) * 255).toString(16).padStart(2, '0')).join('');
    list.push([P[0][2] + P[1][2] + P[2][2], `<path d="M${P.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z" fill="${hex}" stroke="${hex}" stroke-width=".6"/>`]);
  }
  return list.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
}
function sheet(file, title, items, cols = 4) {
  const S = 230, W = S * 2, H = S + 34, rows = Math.ceil(items.length / cols); let body = '';
  items.forEach(([label, sub, parts], k) => {
    const x0 = (k % cols) * W, y0 = 46 + Math.floor(k / cols) * H, T3 = tris(parts);
    const ys = T3.flatMap((t) => t[0].map((p) => p[1])), xs = T3.flatMap((t) => t[0].map((p) => p[0])), zs = T3.flatMap((t) => t[0].map((p) => p[2]));
    const ext = Math.max(Math.max(...ys) - Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) || 1, sc = (S - 44) / ext, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    body += `<rect x="${x0 + 3}" y="${y0 + 3}" width="${W - 6}" height="${H - 6}" rx="10" fill="#eef1f5"/>` + view(T3, 0, 0, x0 + S / 2, y0 + S / 2, sc, cy) + view(T3, -0.6, 0.62, x0 + S * 1.5, y0 + S / 2, sc, cy) +
      `<text x="${x0 + 12}" y="${y0 + S + 8}" font-size="15" font-weight="700">${label}</text><text x="${x0 + 12}" y="${y0 + S + 24}" font-size="11" fill="#555">${sub} · Höhe ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} m</text>`;
  });
  fs.writeFileSync(new URL(file, dir), `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * W}" height="${46 + rows * H}" font-family="system-ui,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="12" y="30" font-size="22" font-weight="800">${title}</text>${body}</svg>`);
  return file;
}
const SCALE = { boss: 2.1, rare: 1.6, elite: 1.3 }, RANK = { normal: 'Normal', elite: 'Elite', rare: 'Selten', boss: 'Boss' }, files = [];
const seen = new Map(); for (const v of T.variants) { if (v.rank === 'node') continue; const k = v.monster || v.id; if (!seen.has(k)) seen.set(k, v); }
const en = [...seen].map(([k, v]) => [v.name, `enemy_${k} · ${RANK[v.rank] || v.rank} · L${v.level}`, enemyParts(v, 0, 0, 0, SCALE[v.rank] || 1)]);
for (let i = 0; i < en.length; i += 24) files.push(sheet(`gegner_${String(i / 24 + 1).padStart(2, '0')}.svg`, `Gegner ${i + 1}–${Math.min(en.length, i + 24)} von ${en.length} (eigene Entwürfe)`, en.slice(i, i + 24)));
const wpn = (cls) => (WEAPON_PARTS[cls] || WEAPON_PARTS.fist).map(([sh, f, r, y, sx, sy, sz, c, em = 0]) => [sh, r, y, f, 0, sx, sy, sz, c, em]);
const hero = (look, cls) => [...heroBody(look[0], look[1], look[3]).map(([sh, dx, y, dz, sx, sy, sz, c]) => [sh, dx, y, dz, 0, sx, sy, sz, c, 0]), ...wpn(cls).map((t) => { const u = [...t]; u[1] += 0.62; u[2] += 0.62; u[3] += 0.3; return u; })];
const CLS = Object.fromEntries(T.weaponClasses.map((c) => [c.id, c.name]));
const hs = T.heroes.map((h) => [h.name, `hero_${h.id} · ${h.rarity} · ${CLS[h.mastery]}`, hero(h.look, h.mastery)]);
for (let i = 0; i < hs.length; i += 16) files.push(sheet(`helden_${i / 16 + 1}.svg`, `Helden ${i + 1}–${Math.min(hs.length, i + 16)} von ${hs.length} (eigene Entwürfe)`, hs.slice(i, i + 16)));
files.push(sheet('waffen.svg', 'Waffen: ein Modell je Waffenart (eigene Entwürfe; alle 84 Waffen nutzen derzeit diese 6 Formen)', T.weaponClasses.map((c) => [c.name, `Waffenart ${c.id}`, wpn(c.id)]), 3));
const chars = [...new Map(T.npcs.map((n) => [n.char, n.name]))];
files.push(sheet('siedlung.svg', 'Figuren der Siedlung (eigene Entwürfe)', chars.map(([c, n]) => [n, `npc_${c}`, npcParts(c, 0, 0, 0, 0)])));
console.log(files.join(' '));
