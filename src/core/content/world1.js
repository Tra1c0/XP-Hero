// Kapitel 1 als EINE zusammenhängende Welt (Basis + 6 Gebiete). Alle Angaben in Metern, X = Ost, Z = Nord.
// Gelände, Gebietsgrenzen, Felsränder, Wasser und Farbtöne = Raster aus der Originalkarte (world1_map.js, Status B: aus dem Kartenbild abgeleitet).
// Spawn-, Truhen-, Gift-, NPC-, Raid- und Portalpositionen = Szenenkoordinaten der Referenz (ch1_ref.js, Status D).
// Die Basis ist der Sandfleck am Stadtportal im grünen Gebiet samt Umkreis; Gebäudeplätze darin sind eigen verteilt (E).
import * as REF from './ch1_ref.js';
import { MAP1 } from './world1_map.js';
import { DECO, BUILD_POS, POINTS, SPAWN_PTS } from './scene1_ref.js';

// Biome: nur IDs. Farben/Modelle liefert der Client (austauschbare Art-Assets).
export const ZONES = [{ id: 'base', biome: 'town' }, { id: 'a1_1', biome: 'green' }, { id: 'a1_2', biome: 'desert' }, { id: 'a1_3', biome: 'ebon' },
  { id: 'a1_4', biome: 'frost' }, { id: 'a1_5', biome: 'verdant' }, { id: 'a1_6', biome: 'hell' }];

// Es gibt keine Tor-Korridore mehr: Gebiete grenzen wie im Original direkt aneinander. Ein Gebiet ist betretbar, sobald der Boss des Vorgängers besiegt ist
// (Rootling -> Sandevil -> Ebonhollow -> Frostbound -> Verdant -> Hellfire); bis dahin sperrt eine Barriere seine Grenze.
export const GATES = [];
export const BLOCKERS = [];
export const LANDMARKS = [];

// Gebietszuordnung eines Punkts laut Karte (null außerhalb). Felszellen zählen zum nächstgelegenen Bodenfeld im Umkreis von 2 Zellen.
export function zoneOf(X, Z) {
  const c0 = Math.floor((X - MAP1.minX) / MAP1.cell), r0 = Math.floor((MAP1.maxZ - Z) / MAP1.cell);
  for (let d = 0; d <= 2; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
    const row = MAP1.z[r0 + dr], ch = row && row[c0 + dc];
    if (ch >= '0' && ch <= '6') return ZONES[Number(ch)].id;
  }
  return null;
}

// Nächstgelegener Bodenpunkt (Zellmitte) – bevorzugt im genannten Gebiet. Für Referenzpunkte, die außerhalb des Kartenbodens liegen
// (kreisende Fledermäuse, Raid-Schilder vor den Raid-Räumen): sie werden an den Kartenrand ihres Gebiets gesetzt.
export function nearestFloor(X, Z, zoneId) {
  const want = zoneId ? String(ZONES.findIndex((z) => z.id === zoneId)) : null;
  let best = null, bd = Infinity;
  for (let pass = 0; pass < 2 && !best; pass++) for (let r = 0; r < MAP1.rows; r++) for (let c = 0; c < MAP1.cols; c++) {
    const ch = MAP1.z[r][c];
    if (!(ch >= '0' && ch <= '6') || (pass === 0 && want !== null && ch !== want && !(want === '1' && ch === '0'))) continue;
    const x = MAP1.minX + (c + 0.5) * MAP1.cell, z = MAP1.maxZ - (r + 0.5) * MAP1.cell, d = (x - X) ** 2 + (z - Z) ** 2;
    if (d < bd) { bd = d; best = [x, z]; }
  }
  return best;
}
export const onFloor = (X, Z) => { const row = MAP1.z[Math.floor((MAP1.maxZ - Z) / MAP1.cell)], ch = row && row[Math.floor((X - MAP1.minX) / MAP1.cell)]; return ch >= '0' && ch <= '6'; };

// Basis nach dem Layout der Vorlage (B): Lagerfeuer mitten im Sandfleck, Schmiede rechts oberhalb, Schlüsselhaus und Portal links oben,
// Raid-Turm rechts, Zelt links, Sandweg nach Süden. Angaben als Versatz zum Lagerfeuer [Ost, Nord] in Metern; die Abstände sind gegenüber
// der Vorlage auf ca. 3/4 gestaucht, damit alles in der Schutzzone liegt. Sägewerk und Steinbruch kommen in der Vorlage nicht vor (Lage eigen).
// Lagerfeuer, Schmiede, Schlüsselhaus, Portal und Raid-Lager stehen auf den Bauplätzen der Szenendaten (D); Kostümladen, Sägewerk und Steinbruch
// haben dort keinen Bauplatz (Lage eigen). Der Turm (Bauplatz D) steht als Wahrzeichen östlich der Siedlung.
const F = BUILD_POS.bonfire, fl = (p) => (onFloor(p[0], p[1]) ? p : nearestFloor(p[0], p[1])), at = (dx, dz) => fl([Math.round((F[0] + dx) * 10) / 10, Math.round((F[1] + dz) * 10) / 10]);
export const BASE = { fire: F, elder: fl(POINTS.npc), smith: fl([BUILD_POS.smithy[0] - 2.2, BUILD_POS.smithy[1] - 1.6]) };
export const BUILDINGS = { bonfire: F, smithy: fl(BUILD_POS.smithy), chesthouse: fl(BUILD_POS.chesthouse), portal: fl(BUILD_POS.portal), raidcamp: fl(BUILD_POS.raidcamp) };
// Kostümladen, Sägewerk und Steinbruch (ohne Bauplatz in den Szenendaten): der jeweils nächste freie Fleck beim Lagerfeuer, der samt Trittfeld auf Boden liegt,
// mindestens 5,5 m von anderen Gebäuden und außerhalb aller Spawnkreise (Radius + 3 m) – damit kein Bauplatz in einer Gegnergruppe steht.
for (const id of ['costumeshop', 'lumbermill', 'quarry']) {
  let best = null, bd = 1e9;
  for (let dx = -16; dx <= 16; dx += 1) for (let dz = -16; dz <= 16; dz += 1) {
    const x = F[0] + dx, z = F[1] + dz, d = Math.hypot(dx, dz);
    if (d < 5 || d >= bd || !onFloor(x, z) || !onFloor(x, z - 2.7) || !onFloor(x + 1.4, z) || !onFloor(x - 1.4, z)) continue;
    if (Object.values(BUILDINGS).some((b) => Math.hypot(b[0] - x, b[1] - z) < 5.5) || Object.values(BUILD_POS).some((b) => Math.hypot(b[0] - x, b[1] - z) < 5.5)) continue;
    if (SPAWN_PTS.some((q) => Math.hypot(q[2] - x, q[3] - z) < q[4] + 3 || Math.hypot(q[2] - x, q[3] - (z - 2.7)) < q[4] + 2)) continue;
    best = [x, z]; bd = d;
  }
  BUILDINGS[id] = best || at(id === 'costumeshop' ? -3.4 : id === 'lumbermill' ? 5 : 11, id === 'quarry' ? -4.8 : -10);
}
// Siedlung = Schutzzone (Gebiet 0): nicht mehr ein großer Kreis, sondern der Boden rund um Lagerfeuer und Gebäude samt Trittfeldern.
// Spawnkreise bleiben ausgenommen. Gegner betreten die Siedlung nicht; was außerhalb liegt, ist normales Greenhaven.
{
  const rows = MAP1.z.map((r) => r.replace(/0/g, '1').split('')), spots = [[F[0], F[1], 5.2], ...Object.values(BUILDINGS).flatMap((b) => [[b[0], b[1], 3.8], [b[0], b[1] - 2.7, 2.6]])];
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    if (rows[r][c] !== '1') continue;
    const x = MAP1.minX + (c + 0.5) * MAP1.cell, z = MAP1.maxZ - (r + 0.5) * MAP1.cell;
    if (spots.some(([sx, sz, sr]) => Math.hypot(sx - x, sz - z) <= sr) && !SPAWN_PTS.some((q) => Math.hypot(q[2] - x, q[3] - z) < q[4] + 1.5)) rows[r][c] = '0';
  }
  MAP1.z = rows.map((r) => r.join('')); MAP1.base = { c: F, r: 5.2 }; MAP1.entries = { ...MAP1.entries, base: [F[0], F[1] - 3.4] };
  // Der Einstiegspunkt von Greenhaven darf nicht in der Siedlung liegen: zur nächsten Greenhaven-Zelle verschieben
  { const [ex, ez] = MAP1.entries.a1_1, cell = (x, z) => (MAP1.z[Math.floor((MAP1.maxZ - z) / MAP1.cell)] || '')[Math.floor((x - MAP1.minX) / MAP1.cell)];
    if (cell(ex, ez) !== '1') { let best = null, bd = 1e9; for (let dx = -12; dx <= 12; dx += 2) for (let dz = -12; dz <= 12; dz += 2) { const d = Math.hypot(dx, dz); if (d < bd && cell(ex + dx, ez + dz) === '1') { bd = d; best = [ex + dx, ez + dz]; } } if (best) MAP1.entries = { ...MAP1.entries, a1_1: best }; } }
}
const lm = (t, dx, dz, x = {}) => ({ t, p: [F[0] + dx, F[1] + dz], ...x });
LANDMARKS.push(lm('sandpatch', 0.4, 0.2), lm('sandpath', 0, -7.4), lm('storechest', -2.3, 0.7, { r: 12 }), lm('boulder_grey', 5.2, 8.2, { s: 1.1 }), lm('boulder_grey', 6.6, 7.2, { r: 80 }),
  lm('wanted', -6.4, -2.6, { r: 25 }), lm('flower_o', -4.8, -1.6), lm('flower_o', 5.2, -3.6), lm('flower_o', 3.4, -0.9, { s: 0.8 }),
  lm('grass', 2.2, 2.9), lm('grass', 1.6, 6.4), lm('grass', -6.6, -4.6), lm('grass', -6.2, -5.6), lm('grass', 2.4, -6.6), lm('grass', 6.4, -2.2), lm('grass', -1.2, -7.6),
  lm('trunk_purple', 5.0, 11.2), lm('shroom_purple', 3.2, 12.4), lm('crystal_grass', 1.4, 11.6), lm('crystal_grass', -5.6, 12.2));

LANDMARKS.push({ t: 'knight_statue', p: BUILD_POS.special }, { t: 'tower', p: BUILD_POS.tower });
export const ENTRIES = MAP1.entries;

export const WORLD = {
  id: 'ch1', name: 'Lost Sanctuary', cell: MAP1.cell, ppm: 40, bounds: { minX: MAP1.minX, minZ: MAP1.minZ, maxX: MAP1.maxX, maxZ: MAP1.maxZ }, map: MAP1,
  areas: ['base', 'a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6'], zones: ZONES, gates: GATES, blockers: BLOCKERS, landmarks: LANDMARKS, deco: DECO,
  entries: ENTRIES, exits: [{ to: 'a2_1', p: MAP1.exit, needs: 'a1_6' }],
};

export { REF };
