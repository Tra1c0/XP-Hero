#!/usr/bin/env node
// Zeichnet Modellbögen der EIGENEN Figuren des Spiels (Gegner, Helden, Waffen, Siedlungsfiguren) als SVG nach docs/sheets/.
// Je Figur zwei Ansichten: von vorn und schräg von oben (Spielansicht). Quelle sind dieselben Grundform-Teile, die das Spiel zeichnet.
import fs from 'node:fs';
import { buildBaseContent } from '../src/core/content/base.js';
import { SHAPES } from '../src/client/assets3d.js';
import { enemyParts, npcParts, heroBody } from '../src/client/enemy3d.js';
import { buildWeaponParts, weaponInstances } from '../src/client/weapons3d.js';
const T = buildBaseContent().tables, dir = new URL('../docs/sheets/', import.meta.url);
const WAFFEN = buildWeaponParts(T.rarities);
const esc = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const rgb = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) : c);
// Dieselbe Drehfolge wie im WebGL-Shader: Rolle, Neigung, Gier.
function tris(parts) {
  const out = [];
  for (const [form, dx, dy, dz, gier, sx, sy, sz, farbe, leuchten = 0, neigung = 0, rolle = 0] of parts) {
    const formdaten = SHAPES[form];
    if (!formdaten) continue;
    const c = Math.cos(gier), s = Math.sin(gier), cp = Math.cos(neigung), sp = Math.sin(neigung);
    const cr = Math.cos(rolle), sr = Math.sin(rolle), col = rgb(farbe);
    for (let i = 0; i < formdaten.length; i += 18) {
      const ecken = [];
      for (let k = i; k < i + 18; k += 6) {
        const x = formdaten[k] * sx, y = formdaten[k + 1] * sy, z = formdaten[k + 2] * sz;
        const x1 = cr * x - sr * y, y1 = sr * x + cr * y, z2 = sp * y1 + cp * z;
        ecken.push([dx + x1 * c + z2 * s, dy + cp * y1 - sp * z, dz - x1 * s + z2 * c]);
      }
      out.push([ecken, col, leuchten]);
    }
  }
  return out;
}
function view(T3, yaw, pitch, ox, oy, sc, cy, cx = 0, cz = 0) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), L = [0.33, 0.78, 0.53], list = [];
  for (const [v, col, em] of T3) {
    const P = v.map(([x, y, z]) => { const x1 = (x - cx) * cyw - (z - cz) * syw, z1 = (x - cx) * syw + (z - cz) * cyw, y1 = (y - cy) * cp + z1 * sp, z2 = -(y - cy) * sp + z1 * cp; return [ox + x1 * sc, oy - y1 * sc, z2]; });
    const [a, b, c] = v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], nl = Math.hypot(...n) || 1;
    const diffuse = 0.5 + 0.5 * Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl);
    const sh = diffuse + (1 - diffuse) * em, hex = '#' + col.map((q) => Math.round(Math.max(0, Math.min(1, q * sh)) * 255).toString(16).padStart(2, '0')).join('');
    list.push([P[0][2] + P[1][2] + P[2][2], `<path d="M${P.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z" fill="${hex}" stroke="${hex}" stroke-width=".6"/>`]);
  }
  return list.sort((a, b) => b[0] - a[0]).map((x) => x[1]).join('');
}
function masse(dreiecke) {
  const punkte = dreiecke.flatMap(([punkte]) => punkte);
  const achsen = [0, 1, 2].map((i) => punkte.map((p) => p[i]));
  const ausdehnung = achsen.map((werte) => Math.max(...werte) - Math.min(...werte));
  return { mitte: achsen.map((werte) => (Math.max(...werte) + Math.min(...werte)) / 2), ausdehnung };
}
function sheet(file, title, items, cols = 4, waffen = false) {
  const S = 230, W = S * 2, H = S + 34, rows = Math.ceil(items.length / cols);
  const karten = items.map(([label, sub, parts, id]) => {
    const dreiecke = tris(parts);
    return { label, sub, id, dreiecke, ...masse(dreiecke) };
  });
  // Waffen einer Art verwenden denselben Maßstab, damit die Größenevolution sichtbar bleibt.
  const massstab = waffen ? (S - 40) / Math.max(...karten.map((k) => Math.hypot(...k.ausdehnung))) : 0;
  const body = karten.map(({ label, sub, id, dreiecke, mitte: [cx, cy, cz], ausdehnung }, k) => {
    const x0 = (k % cols) * W, y0 = 46 + Math.floor(k / cols) * H;
    const sc = massstab || (S - 44) / (Math.max(...ausdehnung) || 1);
    const ansicht = waffen
      ? view(dreiecke, -Math.PI / 2, Math.PI / 2, x0 + S / 2, y0 + S / 2, sc, cy, cx, cz) +
        view(dreiecke, -0.68, Math.PI / 4, x0 + S * 1.5, y0 + S / 2, sc, cy, cx, cz)
      : view(dreiecke, 0, 0, x0 + S / 2, y0 + S / 2, sc, cy) + view(dreiecke, -0.6, 0.62, x0 + S * 1.5, y0 + S / 2, sc, cy);
    const mass = waffen ? `Länge ${ausdehnung[2].toFixed(2)} m` : `Höhe ${ausdehnung[1].toFixed(2)} m`;
    return `<g${id ? ` data-waffen-id="${id}"` : ''}><rect x="${x0 + 3}" y="${y0 + 3}" width="${W - 6}" height="${H - 6}" rx="10" fill="#eef1f5"/>` +
      ansicht + `<text x="${x0 + 12}" y="${y0 + S + 8}" font-size="15" font-weight="700">${esc(label)}</text><text x="${x0 + 12}" y="${y0 + S + 24}" font-size="11" fill="#555">${esc(sub)} · ${mass}</text></g>`;
  }).join('');
  fs.writeFileSync(new URL(file, dir), `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * W}" height="${46 + rows * H}" font-family="system-ui,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="12" y="30" font-size="22" font-weight="800">${esc(title)}</text>${body}</svg>`);
  return file;
}
const SCALE = { boss: 2.1, rare: 1.6, elite: 1.3 }, RANK = { normal: 'Normal', elite: 'Elite', rare: 'Selten', boss: 'Boss' }, files = [];
const seen = new Map(); for (const v of T.variants) { if (v.rank === 'node') continue; const k = v.monster || v.id; if (!seen.has(k)) seen.set(k, v); }
const en = [...seen].map(([k, v]) => [v.name, `enemy_${k} · ${RANK[v.rank] || v.rank} · L${v.level}`, enemyParts(v, 0, 0, 0, SCALE[v.rank] || 1)]);
for (let i = 0; i < en.length; i += 24) files.push(sheet(`gegner_${String(i / 24 + 1).padStart(2, '0')}.svg`, `Gegner ${i + 1}–${Math.min(en.length, i + 24)} von ${en.length} (eigene Entwürfe)`, en.slice(i, i + 24)));
const wpn = (cls, id) => weaponInstances(WAFFEN[id] || WAFFEN[cls] || WAFFEN.fist);
const hero = (look, cls) => [...heroBody(look[0], look[1], look[3]).map(([sh, dx, y, dz, sx, sy, sz, c]) => [sh, dx, y, dz, 0, sx, sy, sz, c, 0]), ...wpn(cls).map((t) => { const u = [...t]; u[1] += 0.62; u[2] += 0.62; u[3] += 0.3; return u; })];
const CLS = Object.fromEntries(T.weaponClasses.map((c) => [c.id, c.name]));
const hs = T.heroes.map((h) => [h.name, `hero_${h.id} · ${h.rarity} · ${CLS[h.mastery]}`, hero(h.look, h.mastery)]);
for (let i = 0; i < hs.length; i += 16) files.push(sheet(`helden_${i / 16 + 1}.svg`, `Helden ${i + 1}–${Math.min(hs.length, i + 16)} von ${hs.length} (eigene Entwürfe)`, hs.slice(i, i + 16)));
const waffenboegen = [];
for (const art of T.weaponClasses) {
  const varianten = T.weapons.filter((w) => w.cls === art.id);
  const karten = varianten.map((w) => [w.name, `Reihe ${w.series.toUpperCase()} · ${T.rarities[w.rarity].name} · ${w.id}`, wpn(w.cls, w.id), w.id]);
  for (let i = 0; i < karten.length; i += 24) {
    const datei = `waffen_${art.id}${i ? `_${i / 24 + 1}` : ''}.svg`;
    const gruppe = karten.slice(i, i + 24);
    files.push(sheet(datei, `${art.name} · ${gruppe.length} Waffen · Draufsicht und Spielansicht`, gruppe, 4, true));
    waffenboegen.push({ datei, name: art.name, anzahl: gruppe.length });
  }
}
const waffenIndex = waffenboegen.map(({ datei, name, anzahl }, i) =>
  `<a href="${datei}"><text x="20" y="${89 + i * 31}" font-size="17" fill="#254986">${esc(name)} · ${anzahl} Waffen</text></a>`).join('');
fs.writeFileSync(new URL('waffen.svg', dir), `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${110 + waffenboegen.length * 31}" font-family="system-ui,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="32" font-size="22" font-weight="800">Waffenbögen · ${T.weapons.length} Waffen</text><text x="20" y="56" font-size="14">Reihe N mit eigenen Formen · Reihe S mit Farbe und Leuchten je Stufe</text>${waffenIndex}</svg>`);
files.push('waffen.svg');
const chars = [...new Map(T.npcs.map((n) => [n.char, n.name]))];
files.push(sheet('siedlung.svg', 'Figuren der Siedlung (eigene Entwürfe)', chars.map(([c, n]) => [n, `npc_${c}`, npcParts(c, 0, 0, 0, 0)])));
console.log(files.join(' '));
