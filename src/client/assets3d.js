// Low-Poly-Asset-Bibliothek (eigene Platzhalter-Assets, austauschbar): Grundformen, Biom-Paletten, Requisiten als Teil-Listen.
// Alle Maße in Metern. Ein Teil = [Form, [x, y, z], [sx, sy, sz], drehungY (rad), Farbe, Leuchten 0..1].
// Requisiten werden beim Szenenaufbau in Instanzen der wenigen Grundformen zerlegt (Instancing, ein Material).

// ---------------------------------------------------------------- Grundformen (flach schattiert, Fuß bei y = 0)
function pushTri(out, a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  for (const p of [a, b, c]) out.push(p[0], p[1], p[2], nx, ny, nz);
}
function prism(sides, rTop, h = 1, rot = 0) {
  const o = [], R = 0.5;
  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2, a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    const b0 = [Math.cos(a0) * R, 0, Math.sin(a0) * R], b1 = [Math.cos(a1) * R, 0, Math.sin(a1) * R];
    const t0 = [Math.cos(a0) * R * rTop, h, Math.sin(a0) * R * rTop], t1 = [Math.cos(a1) * R * rTop, h, Math.sin(a1) * R * rTop];
    pushTri(o, b0, t1, b1); if (rTop > 0) pushTri(o, b0, t0, t1);
    if (rTop > 0) pushTri(o, [0, h, 0], t1, t0);
    pushTri(o, [0, 0, 0], b0, b1);
  }
  return o;
}
function box() {
  const o = [], v = (x, y, z) => [x - 0.5, y, z - 0.5];
  const F = [[[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]];
  for (const f of F) { const q = f.map((p) => v(...p)); pushTri(o, q[0], q[1], q[2]); pushTri(o, q[0], q[2], q[3]); }
  return o;
}
function ico(jitter = 0, seed = 1) {
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  V = V.map((p) => { const l = Math.hypot(...p), k = (0.5 * (1 + (rnd() - 0.5) * jitter)) / l; return [p[0] * k, p[1] * k + 0.5, p[2] * k]; });
  const o = [];
  for (const [a, b, c] of Fc) pushTri(o, V[a], V[c], V[b]);
  return o;
}
function disc(n = 12) { const o = []; for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; pushTri(o, [0, 0, 0], [Math.cos(a1) * 0.5, 0, Math.sin(a1) * 0.5], [Math.cos(a0) * 0.5, 0, Math.sin(a0) * 0.5]); } return o; }

export const SHAPES = {
  box: box(), cyl6: prism(6, 1), cyl8: prism(8, 1, 1, Math.PI / 8), cone6: prism(6, 0), cone8: prism(8, 0, 1, Math.PI / 8), pyr4: prism(4, 0, 1, Math.PI / 4),
  sphere: ico(0), rock: ico(0.45, 7), rock2: ico(0.5, 31), disc: disc(12), frustum6: prism(6, 0.6),
};

// ---------------------------------------------------------------- Farben
export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const BIOMES = {
  town: { path: '#f0c98a', patch: '#f3d39b', floor: ['#f1cc8f', '#ecc586'], top: '#8fd066', side: '#8a7356', sky: '#1d2a20' },
  green: { path: '#f0c98a', patch: '#9bdc74', floor: ['#8fd66a', '#88cf63'], top: '#79bf58', side: '#7a6449', sky: '#1b2a1a' },
  desert: { path: '#d8ae6e', patch: '#f4d899', floor: ['#efcf8a', '#e7c47c'], top: '#ddae64', side: '#c68b4e', sky: '#2b2316' },
  ebon: { path: '#57506e', patch: '#5d6a7c', floor: ['#6c6589', '#645d80'], top: '#4b4568', side: '#3b3551', sky: '#17151f' },
  frost: { path: '#c9d6e2', patch: '#d5e6f2', floor: ['#eef5fa', '#e2ecf4'], top: '#fbfdff', side: '#a8c2d8', sky: '#1a222b' },
  verdant: { path: '#e6dcae', patch: '#b3e58a', floor: ['#a3df7a', '#9ad672'], top: '#6fb85a', side: '#8b8e76', sky: '#192718' },
  hell: { path: '#3e2a27', patch: '#6b3a30', floor: ['#5c3a35', '#543530'], top: '#302425', side: '#6b3025', sky: '#1d1010' },
  ch2: { floor: ['#8fae7a', '#86a472'], top: '#5d7f4f', side: '#6f6151', sky: '#18201a' },
  ch3: { floor: ['#9a9ca3', '#90929a'], top: '#6d6f77', side: '#55565c', sky: '#15161a' },
  arena: { floor: ['#7b6f62', '#73685c'], top: '#4f463d', side: '#3e3730', sky: '#120f0d' },
};
export const WATER = { water: '#4ba6d9', lava: '#ff7a1f' };

// ---------------------------------------------------------------- Requisiten
const C = {
  bark: '#7a5236', barkD: '#4a3a3f', leaf: '#4f9a3c', leafL: '#6cbf4a', leafD: '#2f6b4f', snow: '#f7fbff', stone: '#a3a7ad', stoneD: '#6e7178', sand: '#d59a55',
  sandD: '#b97b40', cactus: '#5f9a3a', bone: '#efe8d6', purple: '#8a5cc7', ice: '#9fd9f5', obsid: '#2c2433', red: '#c9465e', gold: '#e9b43a', wood: '#9a6a3f',
  cloth: '#c9553a', clothB: '#4b78b5', roofR: '#b5483a', roofB: '#3f5f8f', plaster: '#efe3c8', ember: '#ff8a2a', rune: '#c24bff',
};
const P = (shape, pos, scl, rot, col, em = 0) => [shape, pos, scl, rot || 0, col, em];
export const PROPS = {
  // Bewuchs/Felsen (Rand- und Bodendeko)
  tree_round: [P('cyl6', [0, 0, 0], [0.4, 1.3, 0.4], 0, C.bark), P('sphere', [0, 0.9, 0], [2, 1.7, 2], 0, C.leaf), P('sphere', [0.35, 1.8, 0.2], [1.2, 1.1, 1.2], 0, C.leafL)],
  tree_round2: [P('cyl6', [0, 0, 0], [0.35, 1.0, 0.35], 0, C.bark), P('sphere', [0, 0.7, 0], [1.6, 1.4, 1.6], 0, C.leafL), P('sphere', [-0.3, 1.4, -0.2], [1.0, 0.9, 1.0], 0, C.leaf)],
  bush: [P('sphere', [0, 0, 0], [1.3, 0.9, 1.3], 0, C.leaf)],
  bush_rose: [P('sphere', [0, 0, 0], [1.3, 0.9, 1.3], 0, C.leafD), P('sphere', [0.35, 0.6, 0.2], [0.3, 0.3, 0.3], 0, C.red), P('sphere', [-0.3, 0.55, -0.25], [0.28, 0.28, 0.28], 0, C.red)],
  rock_grey: [P('rock', [0, -0.15, 0], [1.6, 1.1, 1.4], 0, C.stone)],
  rock_sand: [P('rock2', [0, -0.15, 0], [1.8, 1.2, 1.5], 0, C.sand)],
  rock_dark: [P('rock', [0, -0.15, 0], [1.5, 1.0, 1.4], 0, '#57506b')],
  rock_snow: [P('rock2', [0, -0.15, 0], [1.6, 1.1, 1.5], 0, '#c9d9e6'), P('rock', [0, 0.55, 0], [1.1, 0.45, 1.0], 0, C.snow)],
  rock_red: [P('rock2', [0, -0.15, 0], [1.6, 1.2, 1.5], 0, '#5a2a27')],
  cactus: [P('cyl8', [0, 0, 0], [0.5, 2.0, 0.5], 0, C.cactus), P('cyl8', [0.42, 0.8, 0], [0.28, 0.8, 0.28], 0, C.cactus), P('box', [0.25, 0.8, 0], [0.35, 0.2, 0.2], 0, C.cactus),
    P('cyl8', [-0.4, 1.1, 0], [0.26, 0.6, 0.26], 0, C.cactus), P('box', [-0.22, 1.1, 0], [0.3, 0.18, 0.18], 0, C.cactus)],
  mesa_s: [P('box', [0, 0, 0], [2.6, 1.8, 2.2], 0.2, C.sand), P('box', [0.1, 1.8, 0], [2.0, 0.6, 1.7], 0.2, C.sandD)],
  deadbush: [P('cone6', [0, 0, 0], [0.9, 0.6, 0.9], 0, '#9c7a4a'), P('box', [0.2, 0.3, 0], [0.6, 0.06, 0.06], 0.7, '#8a6a3f')],
  deadtree: [P('cyl6', [0, 0, 0], [0.35, 2.3, 0.35], 0, C.barkD), P('box', [0.45, 1.7, 0], [0.9, 0.15, 0.15], 0, C.barkD), P('box', [-0.3, 2.0, 0.2], [0.7, 0.12, 0.12], 1.2, C.barkD)],
  grave: [P('box', [0, 0, 0], [0.9, 0.12, 1.1], 0, '#57536a'), P('box', [0, 0.1, -0.35], [0.6, 0.85, 0.18], 0, '#9a97ab')],
  shroom: [P('cyl8', [0, 0, 0], [0.3, 0.7, 0.3], 0, '#e6dccf'), P('cone8', [0, 0.6, 0], [1.1, 0.55, 1.1], 0, C.purple, 0.35)],
  pine_snow: [P('cyl6', [0, 0, 0], [0.3, 0.7, 0.3], 0, C.bark), P('cone6', [0, 0.5, 0], [2.0, 1.6, 2.0], 0, C.leafD), P('cone6', [0, 1.5, 0], [1.5, 1.3, 1.5], 0.3, C.leafD),
    P('cone6', [0, 2.4, 0], [0.9, 1.0, 0.9], 0.6, C.snow)],
  ice_crystal: [P('cone6', [0, 0, 0], [0.8, 2.3, 0.8], 0, C.ice, 0.25), P('cone6', [0.5, 0, 0.3], [0.5, 1.4, 0.5], 0.4, C.ice, 0.25)],
  pillar_broken_s: [P('box', [0, 0, 0], [1.2, 0.3, 1.2], 0, '#b8b09a'), P('cyl8', [0, 0.3, 0], [0.8, 1.3, 0.8], 0, '#d3caae')],
  obsidian: [P('cone6', [0, 0, 0], [1.0, 2.6, 1.0], 0, C.obsid), P('cone6', [0.55, 0, 0.3], [0.6, 1.6, 0.6], 0.5, '#3d2f45')],
  crystal_red_s: [P('cone6', [0, 0, 0], [0.5, 1.4, 0.5], 0, '#e2324a', 0.6)],
  fence_s: [P('box', [-0.9, 0, 0], [0.15, 0.9, 0.15], 0, C.wood), P('box', [0.9, 0, 0], [0.15, 0.9, 0.15], 0, C.wood), P('box', [0, 0.55, 0], [2, 0.12, 0.08], 0, C.wood)],
  // Grasbüschel wie in der Vorlage: kräftige, spitze, blaugrüne Blätter in Gruppen
  grass: [P('cone6', [0, 0, 0], [0.34, 1.0, 0.34], 0, '#2fbf8a'), P('cone6', [0.3, 0, 0.12], [0.3, 0.75, 0.3], 0.4, '#3fd09a'), P('cone6', [-0.26, 0, 0.16], [0.3, 0.82, 0.3], 0.8, '#27a878'), P('cone6', [0.08, 0, -0.28], [0.28, 0.62, 0.28], 0, '#3fd09a'), P('cone6', [-0.1, 0, 0.36], [0.24, 0.5, 0.24], 0, '#2fbf8a')],
  grass_dark: [P('cone6', [0, 0, 0], [0.22, 0.5, 0.22], 0, '#4c6b58'), P('cone6', [0.18, 0, 0.1], [0.18, 0.38, 0.18], 0, '#3f5a4b')],
  flowers_s: [P('sphere', [0, 0.05, 0], [0.22, 0.22, 0.22], 0, '#ff8fb3'), P('sphere', [0.3, 0.05, 0.15], [0.2, 0.2, 0.2], 0, '#ffe066'), P('sphere', [-0.2, 0.05, 0.25], [0.2, 0.2, 0.2], 0, '#ffffff')],
  pebble: [P('rock', [0, -0.05, 0], [0.45, 0.25, 0.4], 0, C.stone)],
  pebble_sand: [P('rock2', [0, -0.05, 0], [0.5, 0.3, 0.45], 0, C.sandD)],
  bones_s: [P('box', [0, 0, 0], [0.8, 0.1, 0.12], 0.4, C.bone), P('box', [0, 0.02, 0], [0.7, 0.1, 0.12], 1.6, C.bone)],
  snow_lump: [P('sphere', [0, -0.15, 0], [0.9, 0.4, 0.8], 0, C.snow)],
  ice_shard_s: [P('cone6', [0, 0, 0], [0.3, 0.7, 0.3], 0, C.ice, 0.2)],
  rubble: [P('box', [0, 0, 0], [0.5, 0.25, 0.4], 0.3, '#c9c0a5'), P('box', [0.4, 0, 0.2], [0.35, 0.2, 0.3], 1.1, '#b8af95')],
  ember: [P('sphere', [0, -0.05, 0], [0.3, 0.2, 0.3], 0, C.ember, 1)],
  crack: [P('box', [0, 0, 0], [1.6, 0.03, 0.14], 0.3, '#ff5a1a', 0.9), P('box', [0.6, 0, 0.35], [0.9, 0.03, 0.12], 1.2, '#ff5a1a', 0.9)],
  shroom_s: [P('cyl8', [0, 0, 0], [0.12, 0.3, 0.12], 0, '#e6dccf'), P('cone8', [0, 0.25, 0], [0.45, 0.25, 0.45], 0, C.purple, 0.5)],
  // Landmarken
  plaza: [P('cyl8', [0, 0, 0], [9, 0.06, 9], 0, '#c9b991'), P('cyl8', [0, 0, 0], [6.5, 0.08, 6.5], 0, '#bfae86')],
  well: [P('cyl8', [0, 0, 0], [1.6, 0.8, 1.6], 0, C.stone), P('cyl8', [0, 0.8, 0], [1.3, 0.02, 1.3], 0, '#3b6fa0', 0.2), P('box', [-0.7, 0.8, 0], [0.12, 1.2, 0.12], 0, C.wood),
    P('box', [0.7, 0.8, 0], [0.12, 1.2, 0.12], 0, C.wood), P('pyr4', [0, 2.0, 0], [2.0, 0.8, 2.0], 0, C.roofR)],
  banner: [P('box', [0, 0, 0], [0.12, 3.0, 0.12], 0, C.wood), P('box', [0.35, 1.9, 0], [0.6, 1.0, 0.05], 0, C.clothB)],
  lamp: [P('box', [0, 0, 0], [0.14, 2.2, 0.14], 0, '#4a4a52'), P('sphere', [0, 2.15, 0], [0.4, 0.4, 0.4], 0, '#ffe7a3', 1)],
  fence: [P('box', [-1.8, 0, 0], [0.15, 0.9, 0.15], 0, C.wood), P('box', [0, 0, 0], [0.15, 0.9, 0.15], 0, C.wood), P('box', [1.8, 0, 0], [0.15, 0.9, 0.15], 0, C.wood),
    P('box', [0, 0.55, 0], [3.8, 0.12, 0.08], 0, C.wood), P('box', [0, 0.25, 0], [3.8, 0.12, 0.08], 0, C.wood)],
  crates: [P('box', [0, 0, 0], [0.8, 0.8, 0.8], 0.2, C.wood), P('box', [0.75, 0, 0.2], [0.7, 0.7, 0.7], 0.6, '#8a5c35'), P('box', [0.3, 0.8, 0.1], [0.6, 0.6, 0.6], 0.9, '#a77445')],
  signpost: [P('box', [0, 0, 0], [0.14, 1.6, 0.14], 0, C.wood), P('box', [0.3, 1.25, 0], [0.8, 0.25, 0.06], 0, '#b98a55'), P('box', [-0.25, 0.95, 0], [0.7, 0.22, 0.06], 0.4, '#b98a55')],
  bigtree: [P('cyl6', [0, 0, 0], [1.2, 2.6, 1.2], 0, C.bark), P('box', [0.9, 0, 0], [1.4, 0.4, 0.4], 0.5, C.bark), P('box', [-0.8, 0, 0.3], [1.2, 0.35, 0.4], 2.2, C.bark),
    P('sphere', [0, 2.0, 0], [4.4, 3.0, 4.4], 0, C.leaf), P('sphere', [0.9, 3.6, 0.4], [2.6, 2.0, 2.6], 0, C.leafL), P('sphere', [-1.0, 3.2, -0.6], [2.2, 1.8, 2.2], 0, C.leafL)],
  tent: [P('pyr4', [0, 0, 0], [2.4, 1.8, 2.4], 0, C.clothB), P('box', [0, 0, 1.15], [0.6, 0.9, 0.05], 0, '#2a3a52')],
  flowers: [P('flowers_s', [0, 0, 0]), P('flowers_s', [0.9, 0, 0.4]), P('flowers_s', [-0.7, 0, 0.6]), P('flowers_s', [0.2, 0, -0.8])],
  stump: [P('cyl8', [0, 0, 0], [0.9, 0.5, 0.9], 0, C.bark), P('cyl8', [0, 0.5, 0], [0.75, 0.02, 0.75], 0, '#d6b07a')],
  // Lagerfeuer mit Steinkreis
  campfire: [...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => P(k % 2 ? 'rock' : 'rock2', [Math.cos(k * 0.785) * 1.25, -0.12, Math.sin(k * 0.785) * 1.25], [0.85, 0.6, 0.75], k, '#a9adb6')),
    P('box', [0, 0.05, 0], [1.3, 0.22, 0.26], 0.5, '#b5532e'), P('box', [0, 0.05, 0], [1.3, 0.22, 0.26], 2.1, '#b5532e'), P('box', [0, 0.05, 0], [1.3, 0.22, 0.26], 1.3, '#9a4526'),
    P('cone6', [0, 0.2, 0], [0.8, 1.1, 0.8], 0, C.ember, 1), P('cone6', [0.1, 0.3, 0.05], [0.45, 0.8, 0.45], 0.5, '#ffd24a', 1)],
  tent_goblin: [P('cone6', [0, 0, 0], [2.6, 2.2, 2.6], 0, '#8f5a36'), P('box', [0, 0, 1.0], [0.6, 0.9, 0.3], 0, '#3a2a1e'), P('box', [0, 2.0, 0], [0.1, 0.8, 0.1], 0, C.bone)],
  mesa: [P('box', [0, 0, 0], [5, 2.8, 4.2], 0.25, C.sand), P('box', [0.3, 2.8, -0.2], [3.8, 1.2, 3.2], 0.25, C.sandD), P('box', [-0.6, 0, 1.8], [2.2, 1.2, 1.6], 0.6, C.sandD)],
  skull_big: [P('sphere', [0, 0, 0], [2.4, 1.8, 2.8], 0, C.bone), P('box', [0, 0.1, 1.2], [1.6, 0.5, 1.0], 0, C.bone), P('sphere', [0.5, 0.9, 1.0], [0.5, 0.5, 0.3], 0, '#3a3028'),
    P('sphere', [-0.5, 0.9, 1.0], [0.5, 0.5, 0.3], 0, '#3a3028')],
  arch: [P('box', [-1.8, 0, 0], [1.0, 3.4, 1.2], 0, C.sand), P('box', [1.8, 0, 0], [1.0, 3.4, 1.2], 0, C.sand), P('box', [0, 3.2, 0], [4.8, 0.9, 1.3], 0, C.sandD)],
  bones: [P('bones_s', [0, 0, 0]), P('bones_s', [0.8, 0, 0.5]), P('sphere', [-0.6, 0, 0.3], [0.45, 0.4, 0.5], 0, C.bone)],
  graves: [P('grave', [0, 0, 0]), P('grave', [1.4, 0, 0.2]), P('grave', [-1.3, 0, -0.1]), P('grave', [0.2, 0, 1.6]), P('grave', [1.6, 0, 1.7])],
  statue: [P('box', [0, 0, 0], [1.6, 0.6, 1.6], 0, C.stoneD), P('box', [0, 0.6, 0], [0.9, 1.6, 0.8], 0, '#7c7a8d'), P('sphere', [0, 2.2, 0], [0.8, 0.8, 0.8], 0, '#7c7a8d'),
    P('box', [0.75, 1.5, 0], [0.8, 0.9, 0.12], 0.3, '#686679'), P('box', [-0.75, 1.5, 0], [0.8, 0.9, 0.12], -0.3, '#686679')],
  deadtree_big: [P('cyl6', [0, 0, 0], [0.8, 3.6, 0.8], 0, C.barkD), P('box', [0.9, 2.6, 0], [1.8, 0.25, 0.25], 0, C.barkD), P('box', [-0.7, 3.1, 0.3], [1.5, 0.22, 0.22], 1.3, C.barkD),
    P('box', [0.2, 3.4, -0.6], [1.2, 0.2, 0.2], 2.4, C.barkD)],
  lantern: [P('box', [0, 0, 0], [0.12, 1.8, 0.12], 0, '#3a3540'), P('box', [0, 1.6, 0], [0.35, 0.4, 0.35], 0, '#a6ffd8', 0.9)],
  shroom_big: [P('cyl8', [0, 0, 0], [0.7, 1.6, 0.7], 0, '#e6dccf'), P('cone8', [0, 1.4, 0], [2.8, 1.1, 2.8], 0, C.purple, 0.45), P('shroom', [1.3, 0, 0.6])],
  tent_snow: [P('pyr4', [0, 0, 0], [2.4, 1.8, 2.4], 0.3, '#8a5a3f'), P('pyr4', [0, 1.3, 0], [1.1, 0.5, 1.1], 0.3, C.snow)],
  icespire: [P('cone6', [0, 0, 0], [1.6, 4.4, 1.6], 0, C.ice, 0.3), P('cone6', [0.9, 0, 0.4], [0.9, 2.6, 0.9], 0.4, C.ice, 0.3), P('cone6', [-0.8, 0, -0.3], [0.8, 2.0, 0.8], 0.8, C.ice, 0.3)],
  snowman: [P('sphere', [0, 0, 0], [1.1, 1.0, 1.1], 0, C.snow), P('sphere', [0, 0.85, 0], [0.75, 0.7, 0.75], 0, C.snow), P('cone6', [0, 1.15, 0.35], [0.12, 0.35, 0.12], 0, '#ff8c3a')],
  cave: [P('rock2', [0, -0.3, 0], [5, 3.4, 4], 0, '#9fb3c4'), P('box', [0, 0, 1.9], [1.8, 1.6, 0.3], 0, '#1d2630')],
  iceblocks: [P('box', [0, 0, 0], [1.1, 1.1, 1.1], 0.3, C.ice, 0.15), P('box', [1.0, 0, 0.4], [0.9, 0.8, 0.9], 0.9, C.ice, 0.15), P('box', [0.4, 1.0, 0.1], [0.7, 0.6, 0.7], 0.5, C.ice, 0.15)],
  pillar: [P('box', [0, 0, 0], [1.3, 0.35, 1.3], 0, '#b8b09a'), P('cyl8', [0, 0.35, 0], [0.9, 3.4, 0.9], 0, '#ddd4b8'), P('box', [0, 3.75, 0], [1.3, 0.35, 1.3], 0, '#b8b09a')],
  pillar_broken: [P('pillar_broken_s', [0, 0, 0]), P('box', [1.2, 0, 0.4], [0.8, 0.6, 0.8], 0.6, '#d3caae')],
  ruin_arch: [P('box', [-2, 0, 0], [1.1, 3.6, 1.1], 0, '#cfc6a8'), P('box', [2, 0, 0], [1.1, 2.4, 1.1], 0, '#cfc6a8'), P('box', [-0.6, 3.5, 0], [3.4, 0.8, 1.2], 0, '#bdb497'),
    P('sphere', [-2.2, 3.4, 0.4], [1.4, 1.0, 1.2], 0, C.leaf)],
  roses: [P('bush_rose', [0, 0, 0]), P('bush_rose', [1.2, 0, 0.5]), P('bush_rose', [-1.0, 0, 0.6])],
  statue_elf: [P('box', [0, 0, 0], [1.6, 0.6, 1.6], 0, '#b8b09a'), P('cone6', [0, 0.6, 0], [1.0, 2.2, 1.0], 0, '#ded6bd'), P('sphere', [0, 2.6, 0], [0.6, 0.65, 0.6], 0, '#ded6bd')],
  altar: [P('box', [0, 0, 0], [4.2, 0.5, 3.4], 0, '#2e2226'), P('box', [0, 0.5, 0], [3, 0.5, 2.4], 0, '#3a2a2e'), P('box', [0, 1.0, 0], [1.6, 0.8, 1.2], 0, '#4a2a2a'),
    P('sphere', [0, 1.8, 0], [0.7, 0.7, 0.7], 0, '#ff3b2b', 1)],
  spike: [P('obsidian', [0, 0, 0]), P('cone6', [-0.6, 0, -0.4], [0.7, 1.9, 0.7], 0.2, C.obsid)],
  brazier: [P('cyl6', [0, 0, 0], [0.5, 1.1, 0.5], 0, '#3a3034'), P('cyl8', [0, 1.1, 0], [0.9, 0.3, 0.9], 0, '#4a3a3e'), P('cone6', [0, 1.3, 0], [0.6, 0.8, 0.6], 0, C.ember, 1)],
  skull_totem: [P('box', [0, 0, 0], [0.2, 2.2, 0.2], 0, '#5a4a40'), P('sphere', [0, 2.0, 0], [0.6, 0.55, 0.65], 0, C.bone), P('box', [0, 1.6, 0], [0.9, 0.08, 0.08], 0, '#5a4a40')],
  crystal_red: [P('cone6', [0, 0, 0], [1.0, 2.6, 1.0], 0, '#e2324a', 0.6), P('cone6', [0.6, 0, 0.3], [0.6, 1.6, 0.6], 0.5, '#e2324a', 0.6)],
  invportal: [P('cyl8', [0, 0, 0], [2.6, 0.04, 2.6], 0, '#5a2d7a', 0.5), P('rock', [1.2, -0.1, 0], [0.5, 0.6, 0.5], 0, C.stoneD), P('rock', [-1.2, -0.1, 0], [0.5, 0.6, 0.5], 0, C.stoneD),
    P('rock', [0, -0.1, 1.2], [0.5, 0.6, 0.5], 0, C.stoneD), P('rock', [0, -0.1, -1.2], [0.5, 0.6, 0.5], 0, C.stoneD)],
};

// Basis nach der Vorlage (eigene Low-Poly-Nachbauten aus Grundkörpern, Vorderseite zeigt nach Süden zur Kamera)
Object.assign(PROPS, {
  sandpatch: [P('cyl8', [0, 0, 0], [12.4, 0.03, 9.4], 0.25, '#6fae45'), P('cyl8', [0, 0, 0], [11.9, 0.05, 8.9], 0.25, '#f6d590'), P('cyl8', [1.6, 0, -0.4], [7.5, 0.06, 5.2], 0.9, '#f8dc9c')],
  sandpath: [P('box', [0, 0, 0], [2.0, 0.04, 6.4], 0, '#f1c98a'), P('cyl8', [0, 0, -3.2], [2.2, 0.04, 2.2], 0, '#f1c98a')],
  storechest: [P('box', [0, 0, 0], [1.3, 0.75, 1.0], 0, '#b0683a'), P('box', [0, 0.75, 0], [1.4, 0.14, 1.1], 0, '#5a5e6c'), P('box', [-0.42, 0, 0], [0.14, 0.9, 1.06], 0, '#5a5e6c'), P('box', [0.42, 0, 0], [0.14, 0.9, 1.06], 0, '#5a5e6c'),
    P('box', [0, 0.89, 0], [1.2, 0.06, 0.9], 0, '#c98250')],
  boulder_grey: [P('rock', [0, -0.25, 0], [2.3, 2.2, 2.1], 0, '#b6b3c2'), P('rock2', [1.3, -0.2, 0.7], [1.4, 1.2, 1.3], 0.6, '#a5a2b3'), P('cyl8', [0.3, 0, 0.3], [3.6, 0.04, 3.0], 0.3, '#f1c98a')],
  knight_statue: [P('box', [0, 0, 0], [1.0, 0.45, 1.0], 0, '#b9bcc6'), P('box', [0, 0.45, 0], [0.8, 0.85, 0.6], 0, '#50535f'), P('box', [0, 0.75, 0.31], [0.82, 0.14, 0.04], 0, '#f0a030'), P('sphere', [0, 1.25, 0], [0.7, 0.65, 0.65], 0, '#50535f'),
    P('box', [0, 1.5, 0.3], [0.12, 0.3, 0.06], 0, '#f0a030'), P('box', [-0.5, 0.5, 0.05], [0.22, 0.6, 0.3], 0, '#5d606c'), P('box', [0.5, 0.5, 0.05], [0.22, 0.6, 0.3], 0, '#5d606c'), P('cone6', [0.75, 0, 0.6], [0.35, 0.35, 0.35], 0, '#b9bcc6'), P('sphere', [0.75, 0.3, 0.6], [0.3, 0.3, 0.3], 0, '#ffb347', 1)],
  wanted: [P('box', [-0.9, 0, 0], [0.16, 1.4, 0.16], 0, '#a8693e'), P('box', [0.9, 0, 0], [0.16, 1.4, 0.16], 0, '#a8693e'), P('box', [0, 0.45, 0], [1.9, 0.85, 0.1], 0, '#bf8250'), P('box', [-0.5, 0.6, 0.06], [0.45, 0.55, 0.03], 0, '#efe4c8'),
    P('box', [0.1, 0.55, 0.06], [0.5, 0.65, 0.03], 0, '#efe4c8'), P('box', [0.62, 0.7, 0.06], [0.3, 0.4, 0.03], 0, '#efe4c8'), P('box', [0.1, 0.75, 0.08], [0.3, 0.3, 0.02], 0, '#5a4a3a')],
  flower_o: [P('sphere', [0, -0.08, 0], [1.1, 0.18, 1.1], 0, '#79b84f'), ...[0, 1, 2, 3].map((k) => P('sphere', [Math.cos(k * 1.571 + 0.4) * 0.26, 0, Math.sin(k * 1.571 + 0.4) * 0.26], [0.42, 0.16, 0.42], 0, '#f49a6c')), P('sphere', [0, 0.06, 0], [0.2, 0.12, 0.2], 0, '#e9703f')],
  trunk_purple: [P('frustum6', [0, 0, 0], [4.2, 5.5, 4.2], 0.3, '#7d4258'), P('box', [1.8, 0, 1.2], [2.2, 0.7, 1.0], 0.7, '#7d4258'), P('box', [-1.9, 0, 0.8], [2.0, 0.6, 0.9], -0.5, '#6f3a4f'), P('rock', [0.9, 1.6, 1.5], [0.9, 0.7, 0.4], 0, '#8f7fd0'),
    P('cyl6', [-1.0, 0, 2.2], [0.3, 0.5, 0.3], 0, '#b9b3c6'), P('cone8', [-1.0, 0.4, 2.2], [0.9, 0.45, 0.9], 0, '#a8574a'), P('cyl6', [-0.3, 0, 2.6], [0.25, 0.35, 0.25], 0, '#b9b3c6'), P('cone8', [-0.3, 0.3, 2.6], [0.7, 0.35, 0.7], 0, '#a8574a')],
  shroom_purple: [P('cyl6', [0, 0, 0], [0.35, 2.4, 0.35], 0, '#b9b3c6'), P('cyl8', [0, 2.3, 0], [2.4, 0.3, 2.4], 0, '#a56be0'), P('cone8', [0, 2.6, 0], [2.0, 0.4, 2.0], 0, '#b98af0'), P('cyl6', [0.9, 0, 0.5], [0.25, 1.4, 0.25], 0, '#b9b3c6'), P('cyl8', [0.9, 1.35, 0.5], [1.3, 0.22, 1.3], 0, '#a56be0')],
  crystal_grass: [...[0, 1, 2, 3, 4, 5].map((k) => P('cone6', [(k % 3) * 0.45 - 0.45, 0, Math.floor(k / 3) * 0.4 - 0.2], [0.34, 1.0 + (k % 2) * 0.5, 0.34], k, k % 2 ? '#7a63d8' : '#6a52c8'))],
});
// Requisiten für die Deko an den Originalplätzen (eigene Grundformen, wenige Teile je Stück)
Object.assign(PROPS, {
  palm: [P('cyl6', [0, 0, 0], [0.34, 2.6, 0.34], 0, '#b98a52'), ...[0, 1, 2, 3, 4].map((k) => P('cone6', [Math.cos(k * 1.257) * 0.75, 2.45, Math.sin(k * 1.257) * 0.75], [1.5, 0.5, 0.6], -k * 1.257, k % 2 ? '#5fae3a' : '#4f9a32'))],
  grass_frost: [P('cone6', [0, 0, 0], [0.3, 0.8, 0.3], 0, '#bfe3ea'), P('cone6', [0.26, 0, 0.1], [0.26, 0.6, 0.26], 0.4, '#a5d3dd'), P('cone6', [-0.22, 0, 0.14], [0.26, 0.66, 0.26], 0.8, '#d5eef2')],
  ore: [P('rock', [0, -0.15, 0], [1.3, 0.9, 1.2], 0, '#6f7488'), P('cone6', [0.2, 0.4, 0.1], [0.42, 0.9, 0.42], 0.3, '#59b7f0', 0.5), P('cone6', [-0.3, 0.35, -0.1], [0.34, 0.7, 0.34], 1.1, '#7fd0ff', 0.5)],
  candle: [P('cyl6', [0, 0, 0], [0.22, 0.6, 0.22], 0, '#e9dfc9'), P('sphere', [0, 0.62, 0], [0.16, 0.26, 0.16], 0, '#ffb23a', 1), P('cyl6', [0.3, 0, 0.12], [0.18, 0.36, 0.18], 0, '#e9dfc9'), P('sphere', [0.3, 0.38, 0.12], [0.13, 0.2, 0.13], 0, '#ffb23a', 1)],
  egg: [P('sphere', [0, -0.1, 0], [0.9, 1.2, 0.9], 0, '#e8e2d2'), P('sphere', [0.2, 0.25, 0.3], [0.3, 0.3, 0.2], 0, '#c9b9e6')],
  cobweb: [P('cyl8', [0, 0.02, 0], [2.2, 0.02, 2.2], 0, '#e9ecf2'), P('cyl8', [0, 0.03, 0], [1.3, 0.02, 1.3], 0, '#cfd4de'), P('cyl8', [0, 0.04, 0], [0.5, 0.02, 0.5], 0, '#e9ecf2')],
  plank: [P('box', [0, 0.02, 0], [1.0, 0.08, 2.4], 0, '#b9824e'), P('box', [0, 0.1, -0.7], [1.04, 0.04, 0.1], 0, '#8f6238'), P('box', [0, 0.1, 0.7], [1.04, 0.04, 0.1], 0, '#8f6238')],
});
// Gebäude: gebaut / Bauplatz (Bauplatz = heller Fleck mit weißem Ring wie die Markierungen der Vorlage)
const roofed = (w, h, d, wall, roof) => [P('box', [0, 0, 0], [w, h, d], 0, wall), P('pyr4', [0, h, 0], [w * 1.45, h * 0.75, d * 1.45], 0, roof)];
const torch = (x, z) => [P('box', [x, 0, z], [0.3, 1.5, 0.3], 0, '#2b2931'), P('frustum6', [x, 1.5, z], [0.5, 0.3, 0.5], 0, '#3b3944'), P('sphere', [x, 1.7, z], [0.5, 0.7, 0.5], 0, '#ff7a3a', 1), P('sphere', [x, 2.1, z], [0.25, 0.4, 0.25], 0, '#ffc24a', 1)];
export const BUILDINGS3D = {
  plot: [P('box', [0, 0, 0], [2.6, 0.04, 2.6], 0, '#f6e3b0'), P('cyl8', [0, 0, 0], [1.7, 0.06, 1.7], 0, '#ffffff', 0.4), P('cyl8', [0, 0, 0], [1.25, 0.07, 1.25], 0, '#f6e3b0')],
  bonfire: PROPS.campfire,
  // Schmiedeofen: gestufter grauer Ofen mit Glutöffnung, Schornstein mit Rauch, Blasebalg-Platten links, Amboss rechts vorn
  smithy: [P('box', [0, 0, 0], [2.3, 1.3, 2.0], 0, '#8a8e9c'), P('box', [0, 0.25, 1.01], [1.1, 0.7, 0.06], 0, '#2a2a32'), P('box', [0, 0.3, 1.04], [0.8, 0.4, 0.04], 0, '#ff8a2a', 1), P('box', [0, 1.3, 0], [1.7, 0.8, 1.5], 0, '#a4a8b6'),
    P('box', [0, 1.5, 0.76], [0.9, 0.4, 0.04], 0, '#565a68'), P('box', [0, 2.1, 0], [1.2, 0.9, 1.1], 0, '#7b7f8d'), P('box', [0, 3.0, 0], [1.5, 0.22, 1.4], 0, '#c5c8d2'), P('box', [0, 3.2, 0], [0.9, 0.12, 0.8], 0, '#2a2a32'),
    P('sphere', [0, 3.4, 0], [0.6, 0.6, 0.6], 0, '#4a4640'), P('sphere', [0.15, 3.95, -0.1], [0.45, 0.45, 0.45], 0, '#5a564f'), P('sphere', [0, 4.4, 0], [0.3, 0.3, 0.3], 0, '#6a665e'),
    P('box', [-1.5, 0.3, 0.1], [0.9, 0.16, 1.1], 0.2, '#9a9eac'), P('box', [-1.55, 0.55, 0.1], [0.9, 0.16, 1.1], 0.1, '#8a8e9c'), P('box', [-1.6, 0.8, 0.1], [0.9, 0.16, 1.1], 0.3, '#9a9eac'),
    P('box', [1.7, 0, 1.5], [0.5, 0.4, 0.45], 0.4, '#6b6f7d'), P('box', [1.7, 0.4, 1.5], [1.1, 0.28, 0.5], 0.4, '#7d8190'), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => P('box', [sx * 1.15, 0, sz * 1.0], [0.3, 0.35, 0.3], 0, '#6b6f7d')))],
  // Schlüsselhaus: Holzbude mit großem goldenem Schlüssel als Schild, drei Schlüsseln im Eingang, heller Fliesenboden, vier Kisten davor
  chesthouse: [P('box', [0, 0, 0.9], [3.2, 0.06, 3.8], 0, '#f6ecc8'), P('box', [0, 0, -0.6], [2.8, 1.5, 1.4], 0, '#a9623a'), P('box', [0, 0, 0.12], [1.7, 1.1, 0.06], 0, '#4a2a1c'), P('box', [0, 1.5, -0.6], [3.1, 0.45, 1.7], 0, '#c27a48'),
    P('box', [0, 1.95, -0.6], [2.5, 0.8, 0.5], 0, '#b46c3e'), P('cyl8', [0, 2.6, -0.6], [2.3, 0.5, 0.5], 0, '#b46c3e'), P('cyl8', [-0.45, 2.25, -0.3], [0.8, 0.55, 0.14], 0, '#ffcf3a', 0.3), P('box', [0.4, 2.42, -0.3], [1.1, 0.2, 0.14], 0, '#ffcf3a', 0.3),
    P('box', [0.8, 2.2, -0.3], [0.16, 0.3, 0.14], 0, '#ffcf3a', 0.3), P('box', [0.55, 2.24, -0.3], [0.14, 0.24, 0.14], 0, '#ffcf3a', 0.3), P('box', [-0.5, 0.75, 0.16], [0.14, 0.4, 0.05], 0, '#e9a53a'), P('box', [0, 0.75, 0.16], [0.14, 0.4, 0.05], 0, '#d9dde3'), P('box', [0.5, 0.75, 0.16], [0.14, 0.4, 0.05], 0, '#e9a53a'),
    ...[[-0.62, 1.5], [0.62, 1.5], [-0.62, 2.4], [0.62, 2.4]].map(([x, z]) => P('box', [x, 0, z], [1.1, 0.34, 0.8], 0, '#b5683c')), P('box', [-1.75, 0, 0.3], [0.6, 0.5, 0.5], 0.3, '#8a6a3a'), P('box', [1.6, 0, 0.9], [0.8, 0.5, 0.6], -0.3, '#6a3fb0'), P('box', [1.6, 0.5, 0.9], [0.85, 0.12, 0.65], -0.3, '#ffcf3a', 0.3)],
  // Portal: Steinpodest, zwei Pfeiler mit Bannern, leuchtend violette Fläche, Steinbogen mit gekreuzten Klingen
  portal: [P('cyl8', [0, 0, 0], [4.0, 0.22, 3.4], 0, '#b9bcc6'), P('cyl8', [0, 0.22, 0], [3.3, 0.14, 2.8], 0, '#a7aab6'), P('box', [-1.25, 0.3, -0.2], [0.6, 2.3, 0.7], 0, '#8d909c'), P('box', [1.25, 0.3, -0.2], [0.6, 2.3, 0.7], 0, '#8d909c'),
    P('box', [0, 0.36, -0.25], [1.95, 2.1, 0.2], 0, '#8a2be2', 0.9), P('box', [0, 0.36, -0.2], [1.5, 1.7, 0.22], 0, '#b04cff', 1), P('sphere', [0, 2.2, -0.2], [3.6, 1.7, 1.3], 0, '#a9acb8'), P('box', [0, 2.5, 0.42], [1.7, 0.18, 0.1], 0.0, '#e6e9f0'),
    P('box', [-0.5, 2.75, 0.44], [0.2, 0.7, 0.08], 0, '#e6e9f0'), P('box', [0.5, 2.75, 0.44], [0.2, 0.7, 0.08], 0, '#e6e9f0'), P('box', [-0.85, 2.42, 0.46], [0.3, 0.2, 0.1], 0, '#f0a030'), P('box', [0.85, 2.42, 0.46], [0.3, 0.2, 0.1], 0, '#f0a030'),
    P('box', [-1.25, 1.2, 0.17], [0.42, 1.0, 0.05], 0, '#5b3fb0'), P('box', [1.25, 1.2, 0.17], [0.42, 1.0, 0.05], 0, '#5b3fb0'), P('box', [-1.25, 1.55, 0.2], [0.14, 0.2, 0.04], 0, '#ffcf3a'), P('box', [1.25, 1.55, 0.2], [0.14, 0.2, 0.04], 0, '#ffcf3a'),
    P('box', [-1.9, 0, -0.9], [0.1, 3.2, 0.1], 0, '#a8693e'), P('box', [-2.3, 2.6, -0.9], [0.8, 0.5, 0.05], 0, '#5b3fb0'), P('box', [1.9, 0, -0.9], [0.1, 3.2, 0.1], 0, '#a8693e'), P('box', [2.3, 2.6, -0.9], [0.8, 0.5, 0.05], 0, '#5b3fb0')],
  // Raid-Turm: dunkler Steinturm auf Geröll, Bogenfenster, Dornen, Fackeln und großer Schädel über dem Eingang
  // Raid-Lager: kleines Jägerlager – Zelt, Banner, Kisten und Feuerstelle (eigener Entwurf)
  raidcamp: [P('cyl8', [0, 0, 0], [4.4, 0.05, 4.0], 0.2, '#e9cf96'), P('pyr4', [-0.5, 0, -0.5], [2.6, 2.0, 2.6], 0.4, '#8b3f36'), P('box', [-0.2, 0, 0.55], [0.7, 1.0, 0.1], 0.4, '#3a2420'),
    P('box', [1.5, 0, -0.9], [0.12, 2.6, 0.12], 0, '#5a4030'), P('box', [1.86, 1.9, -0.9], [0.7, 0.6, 0.05], 0, '#e5503f'), P('box', [1.86, 2.05, -0.86], [0.3, 0.3, 0.03], 0, '#ffd24a'),
    P('box', [1.3, 0, 0.9], [0.7, 0.55, 0.7], 0.3, '#a8693e'), P('box', [1.9, 0, 0.5], [0.5, 0.4, 0.5], -0.2, '#bf8250'), P('cyl8', [-1.5, 0, 1.2], [0.9, 0.12, 0.9], 0, '#6d6a74'), P('sphere', [-1.5, 0.15, 1.2], [0.4, 0.6, 0.4], 0, '#ff8a2a', 1)],
  // Turm der Prüfungen am Bauplatz östlich der Siedlung (dunkler Schrein der Vorlage)
  tower: [P('cyl8', [0, 0, 0.3], [6.2, 0.16, 5.4], 0.2, '#6d6a74'), P('rock', [-2.4, -0.2, 1.9], [1.0, 0.5, 0.8], 0, '#7b7882'), P('rock2', [2.3, -0.2, 2.1], [0.9, 0.45, 0.8], 1, '#7b7882'), P('box', [0, 0, -0.4], [3.8, 2.4, 3.0], 0, '#57545f'),
    P('box', [0, 2.4, -0.5], [3.2, 2.6, 2.6], 0, '#4a4752'), P('box', [0, 5.0, -0.5], [3.6, 0.4, 3.0], 0, '#5f5c68'), P('box', [0, 3.0, 0.82], [1.1, 1.3, 0.06], 0, '#2a2830'), P('cyl8', [0, 4.1, 0.8], [1.1, 0.5, 0.1], 0, '#2a2830'),
    P('box', [0, 0, 1.15], [1.5, 1.5, 0.3], 0, '#25232b'), P('box', [0, 0, 1.4], [1.2, 0.3, 0.5], 0, '#3b3944'), P('sphere', [0, 1.25, 1.5], [1.35, 1.25, 1.15], 0, '#f1ede4'), P('box', [-0.3, 1.9, 2.02], [0.34, 0.36, 0.1], 0, '#2a2830'), P('box', [0.3, 1.9, 2.02], [0.34, 0.36, 0.1], 0, '#2a2830'),
    P('box', [0, 1.45, 2.0], [0.7, 0.3, 0.2], 0, '#e2ddd2'), P('box', [0.9, 2.2, 1.6], [1.4, 0.08, 0.08], 0.6, '#8a5a3c'), P('cone6', [-1.5, 0, 1.5], [0.5, 1.0, 0.5], 0, '#3b3944'), P('cone6', [1.5, 0, 1.5], [0.5, 1.0, 0.5], 0, '#3b3944'),
    P('cone6', [-1.9, 2.4, 0.9], [0.5, 1.1, 0.5], 0, '#3b3944'), P('cone6', [1.9, 2.4, 0.9], [0.5, 1.1, 0.5], 0, '#3b3944'), ...torch(-1.25, 1.75), ...torch(1.25, 1.75),
    P('box', [1.9, 0.05, 2.5], [0.6, 0.14, 0.2], 0.5, '#efe9d8'), P('sphere', [1.65, 0.05, 2.4], [0.24, 0.2, 0.24], 0, '#efe9d8'), P('sphere', [2.15, 0.05, 2.65], [0.24, 0.2, 0.24], 0, '#efe9d8')],
  // Zelt: rundes orangefarbenes Zelt mit Mast und Spannseilen
  costumeshop: [P('cyl8', [0, 0, 0], [4.6, 0.05, 4.6], 0, '#f1c98a'), P('cyl8', [0, 0, 0], [3.4, 1.1, 3.4], 0, '#c9602a'), P('cone8', [0, 1.1, 0], [4.2, 1.9, 4.2], 0, '#e98a3a'), P('cone8', [0, 2.2, 0], [2.0, 1.1, 2.0], 0, '#f2a04e'), P('box', [0, 3.2, 0], [0.12, 0.6, 0.12], 0, '#a8693e'),
    P('box', [0, 0, 1.72], [1.0, 0.95, 0.06], 0, '#4a2a1c'), P('box', [2.3, 0, 1.6], [0.22, 0.4, 0.22], 0, '#8a6a4a'), P('box', [-2.3, 0, 1.6], [0.22, 0.4, 0.22], 0, '#8a6a4a'), P('box', [1.9, 0.7, 1.3], [1.2, 0.05, 0.05], -0.6, '#a8693e'), P('box', [-1.9, 0.7, 1.3], [1.2, 0.05, 0.05], 0.6, '#a8693e')],
  lumbermill: [...roofed(3.4, 1.8, 2.6, '#a97a4f', '#6a4a30'), P('box', [0, 0, 2.0], [2.4, 0.4, 0.5], 0, C.bark), P('box', [0, 0.4, 2.0], [2.0, 0.4, 0.5], 0, C.bark)],
  quarry: [P('box', [0, 0, 0], [3.0, 1.2, 2.6], 0, C.stone), P('box', [0.4, 1.2, 0.2], [1.6, 0.9, 1.4], 0.3, C.stoneD), P('box', [-1.2, 0, 1.6], [0.8, 0.6, 0.8], 0.5, C.stone),
    P('box', [1.4, 0, -0.2], [0.2, 2.6, 0.2], 0, C.wood), P('box', [0.9, 2.5, -0.2], [1.2, 0.15, 0.15], 0, C.wood)],
};

// Streuregeln je Biom (Kunstregeln, deterministisch): edge = Wall-Kanten (dicht), deep = tiefer im Fels, floor = kleine Bodendeko.
export const SCATTER = {
  town: { edge: [['tree_round', 3], ['bush', 3], ['fence_s', 1], ['rock_grey', 1]], edgeD: 0.45, deep: [['tree_round', 2], ['tree_round2', 1]], deepD: 0.12, floor: [['grass', 2], ['flowers_s', 1]], floorD: 0.03 },
  green: { edge: [['tree_round', 5], ['tree_round2', 3], ['bush', 3], ['rock_grey', 2]], edgeD: 0.7, deep: [['tree_round', 3], ['tree_round2', 2]], deepD: 0.3, floor: [['grass', 6], ['flowers_s', 2], ['pebble', 1]], floorD: 0.07 },
  desert: { edge: [['rock_sand', 4], ['cactus', 3], ['mesa_s', 2], ['deadbush', 1]], edgeD: 0.6, deep: [['mesa_s', 2], ['rock_sand', 2]], deepD: 0.18, floor: [['pebble_sand', 3], ['deadbush', 1], ['bones_s', 1]], floorD: 0.07 },
  ebon: { edge: [['deadtree', 4], ['rock_dark', 3], ['shroom', 2], ['grave', 1]], edgeD: 0.65, deep: [['deadtree', 2], ['rock_dark', 2]], deepD: 0.2, floor: [['grass_dark', 4], ['shroom_s', 2], ['bones_s', 1]], floorD: 0.07 },
  frost: { edge: [['pine_snow', 5], ['rock_snow', 3], ['ice_crystal', 2]], edgeD: 0.7, deep: [['pine_snow', 3], ['rock_snow', 1]], deepD: 0.3, floor: [['snow_lump', 3], ['ice_shard_s', 1]], floorD: 0.05 },
  verdant: { edge: [['tree_round', 3], ['bush_rose', 2], ['pillar_broken_s', 2], ['rock_grey', 2], ['tree_round2', 2]], edgeD: 0.7, deep: [['tree_round', 3], ['bush', 1]], deepD: 0.3,
    floor: [['grass', 5], ['flowers_s', 2], ['rubble', 2]], floorD: 0.08 },
  hell: { edge: [['obsidian', 4], ['rock_red', 3], ['crystal_red_s', 1]], edgeD: 0.6, deep: [['obsidian', 2], ['rock_red', 1]], deepD: 0.18, floor: [['bones_s', 2], ['ember', 1], ['crack', 3]], floorD: 0.11 },
  ch2: { edge: [['tree_round2', 3], ['rock_grey', 2]], edgeD: 0.5, deep: [], deepD: 0, floor: [['grass', 2]], floorD: 0.03 },
  ch3: { edge: [['rock_grey', 3], ['rubble', 2]], edgeD: 0.5, deep: [], deepD: 0, floor: [['rubble', 1]], floorD: 0.02 },
  arena: { edge: [['rock_grey', 2]], edgeD: 0.4, deep: [], deepD: 0, floor: [], floorD: 0 },
};

// Zerlegt Requisite (mit verschachtelten Requisiten) in Grundform-Teile, transformiert nach Weltposition.
export function expand(name, X, Y, Z, rot = 0, s = 1, out = [], depth = 0) {
  const parts = PROPS[name] || BUILDINGS3D[name];
  if (!parts || depth > 3) return out;
  const c = Math.cos(rot), sn = Math.sin(rot);
  for (const [shape, p, scl, r, col, em] of parts) {
    const x = (p[0] * c + p[2] * sn) * s, z = (-p[0] * sn + p[2] * c) * s;
    if (!SHAPES[shape]) { expand(shape, X + x, Y + p[1] * s, Z + z, rot + (r || 0), s, out, depth + 1); continue; }
    out.push([shape, X + x, Y + p[1] * s, Z + z, rot + (r || 0), scl[0] * s, scl[1] * s, scl[2] * s, col, em || 0]);
  }
  return out;
}
