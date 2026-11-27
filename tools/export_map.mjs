#!/usr/bin/env node
// Schreibt docs/kartendaten/kapitel1.json: die Kartendaten von Kapitel 1 als reine Zahlen – Bodenhöhe und Begehbarkeit im 1-m-Raster,
// Gebiet je Zelle, feste Objektplätze (Art, Lage, Drehung, Größe, Höhe), Bauplätze, Spawnpunkte, Gebietssperren.
// Eingaben (nicht im Repo): Laufflächen-Polygone mit Eckhöhen und die Sperren als JSON. Aufruf: node tools/export_map.mjs <polygone.json> <sperren.json>
// Enthalten sind nur Koordinaten und Kennzahlen; keine Modelle, Texturen oder Namen aus der Vorlage.
import fs from 'node:fs';
import { MAP1 as M } from '../src/core/content/world1_map.js';
import { DECO, CHOP, STONE, BUILD_POS, POINTS, SPAWN_PTS } from '../src/core/content/scene1_ref.js';
import { ZONES, BUILDINGS } from '../src/core/content/world1.js';
const P = JSON.parse(fs.readFileSync(process.argv[2])), OB = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])) : [];
const inside = (q, x, z) => { let c = false; const n = q.length - 2; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, zi] = q[i], [xj, zj] = q[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const hAt = (q, x, z) => { let sw = 0, sh = 0; for (let i = 0; i < q.length - 2; i++) { const d = Math.hypot(q[i][0] - x, q[i][1] - z), w = 1 / (d * d + 0.05); sw += w; sh += w * q[i][2]; } return sh / sw; };
const cs = 1, cols = Math.round((M.maxX - M.minX) / cs), rows = Math.round((M.maxZ - M.minZ) / cs), bucket = new Map();
for (const q of P) { const xs = q.slice(0, -2).map((p) => p[0]), zs = q.slice(0, -2).map((p) => p[1]);
  for (let r = Math.max(0, Math.floor(M.maxZ - Math.max(...zs))); r <= Math.min(rows - 1, Math.floor(M.maxZ - Math.min(...zs))); r++)
    for (let c = Math.max(0, Math.floor(Math.min(...xs) - M.minX)); c <= Math.min(cols - 1, Math.floor(Math.max(...xs) - M.minX)); c++) { const k = r * cols + c; if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(q); } }
const height = [], walk = [], zone = []; let n = 0, hmin = 1e9, hmax = -1e9;
for (let r = 0; r < rows; r++) { const hr = [], wr = [], zr = [];
  for (let c = 0; c < cols; c++) { const x = M.minX + c + 0.5, z = M.maxZ - r - 0.5, q = (bucket.get(r * cols + c) || []).find((p) => inside(p, x, z));
    const ch = (M.z[Math.floor(r / M.cell)] || '')[Math.floor(c / M.cell)] || '.';
    if (q) { const h = Math.round(hAt(q, x, z) * 10) / 10; hr.push(h); wr.push(1); n++; hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); } else { hr.push(null); wr.push(0); }
    zr.push(ch >= '0' && ch <= '6' ? Number(ch) : ch >= 'a' && ch <= 'g' ? ch.charCodeAt(0) - 97 : -1); }
  height.push(hr); walk.push(wr.join('')); zone.push(zr.map((v) => (v < 0 ? '.' : v)).join('')); }
const objects = []; for (const [kind, list] of Object.entries(DECO)) for (const [x, z, r, s, y] of list) objects.push({ kind, x: x / 10, z: z / 10, y: (y || 0) / 10, yawDeg: r * 10, scale: s / 10 });
const out = { info: 'Kapitel 1. Achsen: x = Ost, z = Nord, y = Höhe, Einheit Meter. Zeile 0 = Norden. height = Bodenhöhe der begehbaren Zellen (null = nicht begehbar), walk = 1 begehbar, zone = Gebiet (0 Basis, 1-6) oder . außerhalb.',
  grid: { cell: cs, minX: M.minX, maxX: M.maxX, minZ: M.minZ, maxZ: M.maxZ, cols, rows }, zones: ZONES.map((z, k) => ({ index: k, id: z.id, biome: z.biome })), height, walk, zone,
  objects, choppableTrees: CHOP.map(([x, z, st]) => ({ x, z, zone: st })), minableStones: STONE.map(([x, z, st]) => ({ x, z, zone: st })),
  buildSites: BUILD_POS, buildingsInGame: BUILDINGS, points: POINTS, spawnPoints: SPAWN_PTS.map(([zone, enemy, x, z, radius, count]) => ({ zone, enemy, x, z, radius, count })),
  zoneBlockers: OB.filter((o) => /StageBlocker/.test(o.path)).map((o) => ({ x: o.x, z: o.z, halfLength: o.ex, halfWidth: o.ez, yawRad: o.yaw })),
  smallObstacles: OB.filter((o) => !/StageBlocker/.test(o.path)).map((o) => ({ x: o.x, z: o.z, halfX: o.ex, halfZ: o.ez })) };
fs.mkdirSync(new URL('../docs/kartendaten/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../docs/kartendaten/kapitel1.json', import.meta.url), JSON.stringify(out));
console.log(`${cols} x ${rows} Zellen, begehbar ${n}, Höhe ${hmin} bis ${hmax} m, Objekte ${objects.length}, Sperren ${out.zoneBlockers.length}`);
