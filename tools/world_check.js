// Prüft die Kapitel-1-Welt: Lage aller Referenzpunkte, Begehbarkeit, Tor-Abschottung, Abstand Hindernisse<->Spawns.
// Optional: node tools/world_check.js out.png -> Draufsicht als PNG (ohne Abhängigkeiten).
import fs from 'node:fs';
import zlib from 'node:zlib';
import { WORLD, REF } from '../src/core/content/world1.js';
import { buildGrid, zoneAt, snap, reach, walkIdx, cellAt } from '../src/core/worldgrid.js';

const G = buildGrid(WORLD), P = (X, Z) => G.toPx(X, Z), M = (x, y) => G.toM(x, y);
const stageZone = (s) => `a1_${s}`, issues = [];
const pts = [
  ...REF.spawns.map((s) => ({ k: `spawn S${s[0]} ${s[1]}`, X: s[2], Z: s[3], want: s[1] === 'Bat' ? null : stageZone(s[0]) })),
  ...REF.stageChests.map((s) => ({ k: `stageChest S${s[0]}`, X: s[1], Z: s[2], want: s[0] === 1 ? null : stageZone(s[0]) })),
  ...REF.gifts.map((s) => ({ k: `gift ${s[0]}`, X: s[1], Z: s[2] })),
  ...REF.raids.map((s) => ({ k: `raid ${s[0]}`, X: s[1], Z: s[2] })),
  ...REF.guides.map((s) => ({ k: `guide S${s[0]}`, X: s[1], Z: s[2] })),
  ...REF.invasion.map((s, i) => ({ k: `invasion ${i}`, X: s[0], Z: s[1] })),
  ...Object.entries(WORLD.entries).map(([a, p]) => ({ k: `entry ${a}`, X: p[0], Z: p[1], want: a, exact: true })),
];
G.gateOpen.fill(1);
const all = reach(G, ...Object.values(P(...WORLD.entries.base)));
let moved = 0; const notes = [];
for (const p of pts) {
  const { x, y } = P(p.X, p.Z), s = snap(G, x, y, 40, p.want ? G.zoneIds.indexOf(p.want) : -1);
  if (!s) { issues.push(`${p.k}: kein begehbarer Punkt in der Nähe`); continue; }
  const d = Math.hypot(s.x - x, s.y - y) / G.ppm, z = zoneAt(G, s.x, s.y);
  if (d > 0.01) moved++;
  if (d > 4) notes.push(`${p.k} (${p.X},${p.Z}): ${d.toFixed(1)} m an den Kartenrand verschoben`);
  if (p.exact && d > 0.01) issues.push(`${p.k}: nicht begehbar`);
  if (p.want && z !== p.want) issues.push(`${p.k} (${p.X},${p.Z}) liegt in ${z}, erwartet ${p.want}`);
  if (!all[cellAt(G, s.x, s.y)]) issues.push(`${p.k}: nicht erreichbar`);
}
// Abschottung: mit geschlossenen Toren (nur Basis->Greenhaven offen) darf nur base + a1_1 erreichbar sein; Kette Tor für Tor
const cleared = [];
for (let step = 0; step <= 6; step++) {
  WORLD.gates.forEach((gt, k) => { G.gateOpen[k] = !gt.needs || cleared.includes(gt.needs) ? 1 : 0; });
  // Kartenwelt: ein Gebiet ist offen, wenn der Boss des Vorgängers besiegt ist
  if (WORLD.map) WORLD.zones.forEach((z, k) => { const n = Number(z.id.slice(3)); G.zoneOpen[k] = z.id === 'base' || n === 1 || cleared.includes(`a1_${n - 1}`) ? 1 : 0; });
  const R = reach(G, ...Object.values(P(...WORLD.entries.base))), zs = new Set();
  for (let i = 0; i < R.length; i++) if (R[i]) zs.add(G.zoneIds[G.zone[i]]);
  const want = new Set(['base', 'a1_1', ...cleared.map((a) => `a1_${Number(a.slice(3)) + 1}`)].filter((a) => WORLD.areas.includes(a)));
  if ([...zs].sort().join() !== [...want].sort().join()) issues.push(`Nach Siegen [${cleared}] erreichbar: ${[...zs]} – erwartet ${[...want]}`);
  if (step < 6) cleared.push(`a1_${step + 1}`);
}
let floor = 0;
for (let i = 0; i < G.kind.length; i++) if (G.kind[i] === 1) floor++;
console.log(`Raster ${G.cols}x${G.rows} (${G.cell} m), begehbar ${floor * G.cell * G.cell} m², verschobene Punkte ${moved}/${pts.length}`);
if (notes.length) console.log('Hinweise (Referenzpunkte außerhalb des Kartenbodens):\n- ' + notes.join('\n- '));
console.log(issues.length ? 'PROBLEME:\n- ' + issues.join('\n- ') : 'OK: alle Punkte begehbar, in richtiger Zone, erreichbar; Tor-Kette korrekt.');
if (process.argv[2]) {
  const S = 4, W = G.cols * S, H = G.rows * S, raw = Buffer.alloc((W * 3 + 1) * H);
  const BC = { town: [200, 180, 140], green: [110, 190, 80], desert: [232, 194, 122], ebon: [95, 90, 125], frost: [225, 238, 247], verdant: [140, 207, 106], hell: [110, 50, 44] };
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) {
    const i = ((y / S) | 0) * G.cols + ((x / S) | 0), z = WORLD.zones[G.zone[i] >= 0 ? G.zone[i] : G.near[i]];
    let col = G.kind[i] === 1 ? BC[z.biome] : G.kind[i] === 2 ? [60, 120, 200] : G.kind[i] === 3 ? [255, 100, 30] : BC[z.biome].map((v) => v * 0.35);
    if (G.gate[i] >= 0) col = [255, 0, 255];
    raw.set(col, y * (W * 3 + 1) + 1 + x * 3);
  } }
  const dot = (X, Z, c) => { const { x, y } = P(X, Z), px = Math.round(x / G.cpx * S), py = Math.round(y / G.cpx * S); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = px + dx, yy = py + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) raw.set(c, yy * (W * 3 + 1) + 1 + xx * 3); } };
  REF.spawns.forEach((s) => dot(s[2], s[3], s[4] > 1000 ? [255, 0, 0] : [0, 0, 0]));
  REF.gifts.forEach((s) => dot(s[1], s[2], [255, 120, 200])); REF.stageChests.forEach((s) => dot(s[1], s[2], [255, 200, 0]));
  Object.values(WORLD.entries).forEach((p) => dot(p[0], p[1], [0, 255, 255]));
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('Draufsicht:', process.argv[2]);
}
process.exitCode = issues.length ? 1 : 0;
