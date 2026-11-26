// Kapitel 1 als EINE zusammenhängende Welt (Basis + 6 Gebiete). Alle Angaben in Metern, X = Ost, Z = Nord.
// Herkunft: Spawn-, Truhen-, Gift-, NPC-, Raid- und Portalpositionen = Szenenkoordinaten der Referenz (ch1_ref.js, Status D).
// Zonenumrisse, Tore, Hindernisse, Wasser/Lava und Landmarken = eigenes Level-Design (Status E), um diese Punkte herum gebaut.
// Die Basis liegt in der freien Mitte zwischen den Gebieten (Referenz: Stadtportal TF_Portal bei 16.5/-3.6; Status R).
import * as REF from './ch1_ref.js';

// Biome: nur IDs. Farben/Modelle liefert der Client (austauschbare Art-Assets).
export const ZONES = [
  { id: 'base', biome: 'town', poly: [[-3, -10], [14, -10], [28, -9], [40, -8], [42, -3], [32, 0], [18, 4], [4, 8], [-2, 11], [-10, 11], [-10, 7], [-4, 2]] },
  { id: 'a1_1', biome: 'green', poly: [[-14, -22], [-4, -15], [12, -14], [32, -12], [36, -18], [36, -30], [36, -46], [28, -53], [10, -57], [-4, -55], [-14, -47], [-18, -33]] },
  { id: 'a1_2', biome: 'desert', poly: [[-7, -16], [-7, 0], [-13, 4], [-13, 13], [-5, 16], [-7, 22], [-5, 30], [-14, 37], [-34, 35], [-52, 31], [-62, 45], [-71, 41], [-67, 32], [-57, 26], [-57, 6], [-59, -14], [-48, -25], [-27, -25], [-19, -23]] },
  { id: 'a1_3', biome: 'ebon', poly: [[6, 11], [18, 8], [30, 4], [44, 1], [54, 4], [57, 22], [56, 40], [40, 50], [28, 55], [14, 53], [-6, 47], [-7, 35], [-1, 27], [3, 18]] },
  { id: 'a1_4', biome: 'frost', poly: [[47, -5], [58, 0], [61, 8], [64, 16], [66, 26], [80, 30], [92, 24], [100, 6], [106, -8], [116, -12], [116, -24], [100, -28], [88, -32], [66, -32], [52, -44], [44, -46], [39, -38], [39, -22], [45, -13]] },
  { id: 'a1_5', biome: 'verdant', poly: [[60, 36], [72, 33], [86, 36], [98, 44], [100, 62], [94, 78], [88, 98], [72, 98], [60, 86], [38, 88], [32, 74], [36, 60], [50, 51], [57, 43]] },
  { id: 'a1_6', biome: 'hell', poly: [[-12, 51], [4, 55], [18, 58], [18, 74], [10, 86], [-10, 94], [-30, 102], [-50, 102], [-64, 86], [-64, 68], [-52, 56], [-30, 51]] },
];

// Tore = Korridore zwischen zwei Zonen. needs = Gebiet, dessen Boss-Erstsieg das Tor öffnet (null = immer offen).
// Reihenfolge laut Kampagne: Rootling -> Sandevil, Scarlet -> Ebonhollow, Gargoyle -> Frostbound, Frostfang -> Verdant, Elf Queen -> Hellfire.
// Lage: an den Wegwächter-NPCs der Referenz (NPC_Taid_Stage2..5), Hellfire-Tor eigen.
export const GATES = [
  { id: 'g_base_1', from: 'base', to: 'a1_1', a: [16, -7], b: [16, -18], w: 10, needs: null },
  { id: 'g_base_2', from: 'base', to: 'a1_2', a: [-1, -5], b: [-10, -5], w: 6, needs: 'a1_1' },
  { id: 'g_2_3', from: 'a1_2', to: 'a1_3', a: [-8, 28], b: [2, 30], w: 6, needs: 'a1_2' },
  { id: 'g_base_4', from: 'base', to: 'a1_4', a: [38, -5], b: [48, -10], w: 6, needs: 'a1_3' },
  { id: 'g_4_5', from: 'a1_4', to: 'a1_5', a: [74, 25], b: [74, 38], w: 6, needs: 'a1_4' },
  { id: 'g_3_6', from: 'a1_3', to: 'a1_6', a: [6, 47], b: [6, 59], w: 6, needs: 'a1_5' },
];

// Nicht begehbare Flächen innerhalb der Zonen. kind: rock (erhöht), water, lava. Kreise: c + r, sonst poly.
export const BLOCKERS = [
  { kind: 'water', c: [22, -45], r: 4 }, { kind: 'rock', c: [26, -51], r: 2.5 }, { kind: 'rock', c: [-9, -40], r: 3 },
  { kind: 'rock', c: [-30, 6], r: 3 }, { kind: 'rock', c: [-52, 14], r: 2.5 },
  { kind: 'water', c: [44, 40], r: 3.5 }, { kind: 'rock', c: [20, 28], r: 2 },
  { kind: 'water', c: [79, -4], r: 5 }, { kind: 'rock', c: [61, 8.5], r: 1.8 }, { kind: 'rock', c: [99, 13], r: 2 },
  { kind: 'rock', c: [60, 62], r: 2.5 },
  { kind: 'lava', c: [-31, 87], r: 4 }, { kind: 'lava', poly: [[-60, 94], [-54, 92], [-52, 99], [-58, 100]] }, { kind: 'rock', c: [-35, 70], r: 2 },
];

// Landmarken: hand gesetzte Weltobjekte (Typen = Client-Assets). r = Drehung (Grad), s = Skalierung.
export const LANDMARKS = [
  // Basis
  { t: 'plaza', p: [19, -3] }, { t: 'well', p: [26, -7] }, { t: 'banner', p: [11, -9] }, { t: 'banner', p: [21, -9] }, { t: 'lamp', p: [13, 3] }, { t: 'lamp', p: [27, 0] },
  { t: 'crates', p: [34, -1] }, { t: 'crates', p: [-1, 1] }, { t: 'signpost', p: [-2, 8] },
  // Greenhaven
  { t: 'bigtree', p: [-9, -40], s: 1.4 }, { t: 'tent', p: [5, -40] }, { t: 'fence', p: [14, -36], r: 20 }, { t: 'fence', p: [18, -34], r: 20 }, { t: 'flowers', p: [16, -42] },
  { t: 'flowers', p: [2, -26] }, { t: 'flowers', p: [28, -26] }, { t: 'signpost', p: [21, -20] }, { t: 'stump', p: [-12, -28] }, { t: 'stump', p: [30, -36] },
  // Sandevil Desert
  { t: 'campfire', p: [-43.4, -5.6] }, { t: 'tent_goblin', p: [-50, -7], r: 30 }, { t: 'tent_goblin', p: [-48, 4], r: -20 }, { t: 'mesa', p: [-30, 6], s: 1.2 },
  { t: 'skull_big', p: [-53, 21], r: 60 }, { t: 'arch', p: [-30, 29] }, { t: 'bones', p: [-20, -18] }, { t: 'bones', p: [-12, 30] }, { t: 'mesa', p: [-52, 14], s: 0.9 },
  // Ebonhollow
  { t: 'graves', p: [42, 14] }, { t: 'graves', p: [34, 18], r: 40 }, { t: 'statue', p: [54, 13], r: -90 }, { t: 'deadtree_big', p: [20, 28] }, { t: 'lantern', p: [10, 20] },
  { t: 'lantern', p: [30, 47] }, { t: 'shroom_big', p: [6, 33] }, { t: 'shroom_big', p: [12, 15] },
  // Frostbound
  { t: 'campfire', p: [96.5, -7.3] }, { t: 'tent_snow', p: [100, -2] }, { t: 'icespire', p: [61, 8.5] }, { t: 'icespire', p: [99, 13], s: 1.2 }, { t: 'snowman', p: [66, -24] },
  { t: 'cave', p: [104, -16] }, { t: 'iceblocks', p: [86, 4] },
  // Verdant Ruins
  { t: 'pillar', p: [36, 84] }, { t: 'pillar', p: [48, 84] }, { t: 'pillar_broken', p: [36, 74] }, { t: 'pillar_broken', p: [48, 72] }, { t: 'ruin_arch', p: [60, 62], r: 30 },
  { t: 'fence', p: [86, 52], r: 90, s: 1.5 }, { t: 'fence', p: [80, 46], s: 1.5 }, { t: 'roses', p: [68, 64] }, { t: 'roses', p: [56, 76] }, { t: 'statue_elf', p: [42, 92] },
  // Hellfire Chasm
  { t: 'altar', p: [-42, 97] }, { t: 'spike', p: [-35, 70], s: 1.3 }, { t: 'brazier', p: [-38, 92] }, { t: 'brazier', p: [-46, 92] }, { t: 'bones', p: [-14, 70] },
  { t: 'skull_totem', p: [-4, 58] }, { t: 'skull_totem', p: [-22, 76] }, { t: 'crystal_red', p: [10, 80] },
];

// Basisgebäude (Gebäudedaten selbst bleiben in buildings). Portal an der Referenzposition des Stadtportals.
export const BUILDINGS = { bonfire: [21, -3], smithy: [9, -2], chesthouse: [30, -4], lumbermill: [2, -6], quarry: [37, -5], costumeshop: [-5, 7], portal: REF.townPortal };

export const ENTRIES = { base: [19, -7], a1_1: [16, -29], a1_2: [-17, -6], a1_3: [8, 30], a1_4: [52, -12], a1_5: [74, 42], a1_6: [4, 63] };

export const WORLD = {
  id: 'ch1', name: 'Lost Sanctuary', cell: 2, ppm: 40, bounds: { minX: -76, minZ: -62, maxX: 120, maxZ: 106 },
  areas: ['base', 'a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6'], zones: ZONES, gates: GATES, blockers: BLOCKERS, landmarks: LANDMARKS,
  entries: ENTRIES, exits: [{ to: 'a2_1', p: [-22, 96], needs: 'a1_6' }],
};

export { REF };
