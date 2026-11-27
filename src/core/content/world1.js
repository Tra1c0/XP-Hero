// Kapitel 1 als EINE zusammenhängende Welt (Basis + 6 Gebiete). Alle Angaben in Metern, X = Ost, Z = Nord.
// Gelände, Gebietsgrenzen, Felsränder, Wasser und Farbtöne = Raster aus der Originalkarte (world1_map.js, Status B: aus dem Kartenbild abgeleitet).
// Spawn-, Truhen-, Gift-, NPC-, Raid- und Portalpositionen = Szenenkoordinaten der Referenz (ch1_ref.js, Status D).
// Die Basis ist der Sandfleck am Stadtportal im grünen Gebiet samt Umkreis; Gebäudeplätze darin sind eigen verteilt (E).
import * as REF from './ch1_ref.js';
import { MAP1 } from './world1_map.js';

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

// Basisgebäude: Lagerfeuer in der Mitte des Sandflecks, Portal an der Referenzposition, übrige auf freien Plätzen im Basiskreis (weitester Abstand zum Portal zuerst).
const slots = MAP1.slots.filter(([x, z]) => Math.hypot(x - REF.townPortal[0], z - REF.townPortal[1]) > 4).sort((a, b) => Math.atan2(a[1] - MAP1.base.c[1], a[0] - MAP1.base.c[0]) - Math.atan2(b[1] - MAP1.base.c[1], b[0] - MAP1.base.c[0]));
const pick = (k) => slots[Math.floor((k * slots.length) / 6) % slots.length];
export const BUILDINGS = { bonfire: MAP1.base.c, portal: REF.townPortal, smithy: pick(0), chesthouse: pick(1), lumbermill: pick(2), quarry: pick(3), costumeshop: pick(4), raidcamp: pick(5) };

export const ENTRIES = MAP1.entries;

export const WORLD = {
  id: 'ch1', name: 'Lost Sanctuary', cell: MAP1.cell, ppm: 40, bounds: { minX: MAP1.minX, minZ: MAP1.minZ, maxX: MAP1.maxX, maxZ: MAP1.maxZ }, map: MAP1,
  areas: ['base', 'a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6'], zones: ZONES, gates: GATES, blockers: BLOCKERS, landmarks: LANDMARKS,
  entries: ENTRIES, exits: [{ to: 'a2_1', p: MAP1.exit, needs: 'a1_6' }],
};

export { REF };
