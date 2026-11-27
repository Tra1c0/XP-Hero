#!/usr/bin/env node
// Gleicht das Kartenraster von Kapitel 1 (src/core/content/world1_map.js) an die begehbare Fläche der Spielversion 27.2.0 an.
// Eingabe: Liste der Laufflächen-Polygone als JSON ([[x, z], ..., Höhe, Art] je Polygon; aus der vom Nutzer bereitgestellten Spieldatei gelesen, nicht im Repo).
// Aufruf: node tools/apply_navmesh.mjs <polygone.json>. Übernommen wird nur, WO Boden ist; Gebietszuordnung und Farbtöne bleiben die der Karte
// (neue Bodenzellen erben beides vom nächstgelegenen Bodenfeld, entfallene Zellen den Farbton des nächsten Felsfelds).
import fs from 'node:fs';
import { MAP1 as M } from '../src/core/content/world1_map.js';
const P = JSON.parse(fs.readFileSync(process.argv[2]));
const file = new URL('../src/core/content/world1_map.js', import.meta.url);
const inside = (q, x, z) => { let c = false; const n = q.length - 2; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, zi] = q[i], [xj, zj] = q[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const { rows, cols, cell: cs } = M, I = (r, c) => r * cols + c, isF = (ch) => ch >= '0' && ch <= '6', isW = (ch) => ch >= 'a' && ch <= 'g';
// grobe Vorauswahl je Zelle: Polygone nach Zellen ablegen
const bucket = new Map();
for (const q of P) { const xs = q.slice(0, -2).map((p) => p[0]), zs = q.slice(0, -2).map((p) => p[1]);
  for (let r = Math.max(0, Math.floor((M.maxZ - Math.max(...zs)) / cs)); r <= Math.min(rows - 1, Math.floor((M.maxZ - Math.min(...zs)) / cs)); r++)
    for (let c = Math.max(0, Math.floor((Math.min(...xs) - M.minX) / cs)); c <= Math.min(cols - 1, Math.floor((Math.max(...xs) - M.minX) / cs)); c++) { const k = I(r, c); if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(q); } }
const nav = new Uint8Array(rows * cols), old = M.z.map((s) => s.split('')), z = old.map((r) => r.slice()), t = M.t.map((s) => s.split(''));
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x = M.minX + (c + 0.5) * cs, zz = M.maxZ - (r + 0.5) * cs, qs = bucket.get(I(r, c)) || []; let k = 0;
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) if (qs.some((q) => inside(q, x + dx, zz + dz))) k++;
  nav[I(r, c)] = k >= 3 ? 1 : 0;
}
const nearest = (r0, c0, ok) => { for (let d = 1; d < 30; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) { if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue; const r = r0 + dr, c = c0 + dc; if (r >= 0 && c >= 0 && r < rows && c < cols && ok(old[r][c])) return [r, c]; } return null; };
let add = 0, cut = 0;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const ch = old[r][c];
  if (nav[I(r, c)] && !isF(ch)) { const n = nearest(r, c, isF); if (n) { z[r][c] = old[n[0]][n[1]]; t[r][c] = M.t[n[0]][n[1]]; add++; } }
  else if (!nav[I(r, c)] && isF(ch)) { const n = nearest(r, c, (x) => x === '#'); z[r][c] = '#'; if (n) t[r][c] = M.t[n[0]][n[1]]; cut++; }
}
// Zusammenhang: Inseln, die im Original erst über gebaute Leitern/Treppen erreichbar sind, über den kürzesten Weg durch früheren Kartenboden anbinden
const comp = new Int32Array(rows * cols).fill(-1); const comps = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (!isF(z[r][c]) || comp[I(r, c)] >= 0) continue; const id = comps.length, list = [[r, c]]; comp[I(r, c)] = id;
  for (let h = 0; h < list.length; h++) { const [a, b] = list[h]; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = a + dr, cc = b + dc; if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && isF(z[rr][cc]) && comp[I(rr, cc)] < 0) { comp[I(rr, cc)] = id; list.push([rr, cc]); } } }
  comps.push(list); }
const br = Math.floor((M.maxZ - M.base.c[1]) / cs), bc = Math.floor((M.base.c[0] - M.minX) / cs), main = comp[I(br, bc)];
let bridges = 0, dropped = 0;
for (const [id, list] of comps.entries()) {
  if (id === main) continue;
  if (list.length < 8) { for (const [r, c] of list) { z[r][c] = '#'; dropped++; } continue; }
  // Breitensuche von der Insel bis zu irgendeiner Zelle des Hauptteils (bzw. schon angebundener Teile); früherer Boden kostet 1, Fels 4
  const dist = new Float32Array(rows * cols).fill(1e9), prev = new Int32Array(rows * cols).fill(-1); let q = list.map(([r, c]) => I(r, c)); for (const i of q) dist[i] = 0; let goal = -1;
  while (q.length && goal < 0) { q.sort((a, b) => dist[a] - dist[b]); const i = q.shift(), r = Math.floor(i / cols), c = i % cols;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue; const j = I(rr, cc);
      if (isF(z[rr][cc]) && comp[j] === main) { goal = i; break; }
      const w = isF(old[rr][cc]) ? 1 : isW(old[rr][cc]) || old[rr][cc] === '.' ? 9 : 4; if (dist[i] + w < dist[j] && dist[i] + w < 60) { dist[j] = dist[i] + w; prev[j] = i; q.push(j); } } }
  if (goal < 0) { console.log('  Insel ohne Anbindung:', list.length, 'Zellen'); continue; }
  for (let i = goal; i >= 0 && dist[i] > 0; i = prev[i]) { const r = Math.floor(i / cols), c = i % cols; for (const [dr, dc] of [[0, 0], [0, 1], [1, 0]]) { const rr = r + dr, cc = c + dc; if (rr < rows && cc < cols && !isF(z[rr][cc])) { const n = nearest(rr, cc, isF); z[rr][cc] = n ? old[n[0]][n[1]] : '1'; if (n) t[rr][cc] = M.t[n[0]][n[1]]; bridges++; } } }
  for (const [r, c] of list) comp[I(r, c)] = main;
}
const out = { ...M, z: z.map((r) => r.join('')), t: t.map((r) => r.join('')), nav: 1 };
const head = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.startsWith('//'));
if (!head.some((l) => l.includes('apply_navmesh'))) head.push('// Boden nachträglich an die begehbare Fläche der Spielversion 27.2.0 angeglichen (tools/apply_navmesh.mjs).');
fs.writeFileSync(file, head.join('\n') + '\nexport const MAP1 = ' + JSON.stringify(out) + ';\n');
console.log(`Boden: +${add} neu, -${cut} entfallen, ${bridges} Verbindungszellen, ${dropped} Splitterzellen entfernt; Teile: ${comps.length}`);
