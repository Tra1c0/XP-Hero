// Gegnerfiguren (eigene Entwürfe im Low-Poly-Stil): je Monsterart ein Bauplan aus wenigen Grundkörpern,
// Farbe nach Namen/Biom, Rang als Zusatz (Hörner, Krone). Keine Animation; Blickrichtung und Ausholen kommen aus dem Spielzustand.
// Teil: [shape, dx(rechts), y, dz(vorn), sx, sy, sz, Farbschlüssel|'#hex', Leuchten, Drehung]
const EYE = '#ffffff', PUP = '#1d1420';
const eyes = (y, z, gap = 0.16, k = 0.13, c = EYE) => [['box', -gap, y, z, k, k, 0.06, c, 0.5], ['box', gap, y, z, k, k, 0.06, c, 0.5],
  ['box', -gap, y + k * 0.2, z + 0.03, k * 0.5, k * 0.55, 0.05, PUP, 0], ['box', gap, y + k * 0.2, z + 0.03, k * 0.5, k * 0.55, 0.05, PUP, 0]];
const legs4 = (w, l, h, c = 'D') => [[-w, l], [w, l], [-w, -l], [w, -l]].map(([x, z]) => ['box', x, 0, z, 0.16, h, 0.16, c, 0]);
const BUILD = {
  slime: () => [['sphere', 0, -0.12, 0, 1.05, 0.8, 1.05, 'M', 0], ['sphere', -0.18, 0.5, -0.1, 0.3, 0.2, 0.3, 'L', 0.2], ...eyes(0.3, 0.46, 0.18, 0.15)],
  shroom: () => [['cyl8', 0, 0, 0, 0.5, 0.55, 0.5, '#efe3cf', 0], ['cone8', 0, 0.45, 0, 1.25, 0.7, 1.25, 'M', 0], ['sphere', 0.3, 0.72, 0.2, 0.2, 0.12, 0.2, 'L', 0], ['sphere', -0.32, 0.62, -0.05, 0.22, 0.12, 0.22, 'L', 0], ...eyes(0.22, 0.25, 0.12, 0.1, PUP).slice(0, 2)],
  plant: () => [['cyl6', 0, 0, 0, 0.3, 0.55, 0.3, '#3d8a45', 0], ['sphere', 0, 0.4, 0, 0.8, 0.75, 0.8, 'M', 0], ['cone6', -0.4, 0.05, 0, 0.5, 0.45, 0.25, '#4fae55', 0, 0.5], ['cone6', 0.4, 0.05, 0, 0.5, 0.45, 0.25, '#4fae55', 0, -0.5],
    ['cone6', 0, 1.0, 0, 0.35, 0.45, 0.35, 'A', 0], ['box', 0, 0.55, 0.38, 0.4, 0.1, 0.06, PUP, 0], ...eyes(0.72, 0.36, 0.16, 0.11)],
  cactus: () => [['cyl8', 0, 0, 0, 0.6, 1.25, 0.6, 'M', 0], ['cyl8', -0.48, 0.45, 0, 0.26, 0.55, 0.26, 'M', 0], ['cyl8', 0.48, 0.6, 0, 0.26, 0.5, 0.26, 'M', 0], ['sphere', 0, 1.2, 0, 0.3, 0.22, 0.3, 'A', 0.2], ...eyes(0.8, 0.3, 0.14, 0.11)],
  spider: () => [['sphere', 0, 0.18, -0.3, 0.85, 0.6, 0.9, 'M', 0], ['sphere', 0, 0.2, 0.3, 0.55, 0.45, 0.55, 'D', 0],
    ...[-1, 1].flatMap((sd) => [0.35, 0.05, -0.25, -0.5].map((z, k) => ['box', sd * 0.55, 0.05, z, 0.6, 0.1, 0.09, 'D', 0, sd * (0.5 - k * 0.3)])), ...eyes(0.42, 0.56, 0.12, 0.09, '#ff5a4a').slice(0, 2)],
  bat: () => [['sphere', 0, 0.6, 0, 0.55, 0.55, 0.5, 'M', 0], ['box', -0.62, 0.78, 0, 0.8, 0.07, 0.5, 'D', 0, 0.25], ['box', 0.62, 0.78, 0, 0.8, 0.07, 0.5, 'D', 0, -0.25],
    ['cone6', -0.18, 1.08, 0, 0.16, 0.25, 0.16, 'D', 0], ['cone6', 0.18, 1.08, 0, 0.16, 0.25, 0.16, 'D', 0], ...eyes(0.85, 0.24, 0.12, 0.09, '#ffe14a').slice(0, 2)],
  beast: () => [...legs4(0.24, 0.36, 0.4), ['box', 0, 0.36, 0, 0.6, 0.5, 1.1, 'M', 0], ['box', 0, 0.52, 0.62, 0.5, 0.46, 0.5, 'M', 0], ['box', 0, 0.5, 0.92, 0.26, 0.2, 0.22, 'D', 0],
    ['cone6', -0.17, 0.95, 0.55, 0.16, 0.26, 0.16, 'D', 0], ['cone6', 0.17, 0.95, 0.55, 0.16, 0.26, 0.16, 'D', 0], ['box', 0, 0.6, -0.7, 0.14, 0.14, 0.4, 'D', 0], ...eyes(0.74, 0.87, 0.13, 0.08, '#ffe14a').slice(0, 2)],
  bird: () => [['box', -0.14, 0, 0, 0.08, 0.3, 0.08, '#e89a2a', 0], ['box', 0.14, 0, 0, 0.08, 0.3, 0.08, '#e89a2a', 0], ['sphere', 0, 0.22, 0, 0.75, 0.7, 0.85, 'M', 0], ['sphere', 0, 0.78, 0.22, 0.45, 0.42, 0.45, 'M', 0],
    ['cone6', 0, 0.9, 0.52, 0.16, 0.14, 0.26, '#f0a020', 0], ['box', 0, 1.18, 0.2, 0.08, 0.16, 0.26, '#e2443a', 0], ['box', 0, 0.5, -0.5, 0.3, 0.3, 0.12, 'L', 0], ...eyes(0.98, 0.42, 0.13, 0.08, PUP).slice(0, 2)],
  ghost: () => [['cone8', 0, 1.25, 0, 0.95, -1.0, 0.95, 'M', 0.25], ['sphere', 0, 0.75, 0, 0.9, 0.8, 0.9, 'M', 0.25], ['box', -0.5, 0.85, 0.1, 0.3, 0.12, 0.12, 'L', 0.25, 0.4], ['box', 0.5, 0.85, 0.1, 0.3, 0.12, 0.12, 'L', 0.25, -0.4],
    ...eyes(1.1, 0.4, 0.16, 0.13, PUP).slice(0, 2), ['box', 0, 0.92, 0.42, 0.14, 0.12, 0.05, PUP, 0]],
  human: () => [['box', -0.16, 0, 0, 0.2, 0.32, 0.24, 'D', 0], ['box', 0.16, 0, 0, 0.2, 0.32, 0.24, 'D', 0], ['box', 0, 0.3, 0, 0.66, 0.5, 0.42, 'M', 0], ['box', -0.43, 0.34, 0.04, 0.18, 0.42, 0.2, 'M', 0], ['box', 0.43, 0.34, 0.04, 0.18, 0.42, 0.2, 'M', 0],
    ['box', 0, 0.78, 0, 0.62, 0.54, 0.56, 'S', 0], ['cone6', -0.36, 0.92, 0, 0.2, 0.2, 0.12, 'S', 0, 0.3], ['cone6', 0.36, 0.92, 0, 0.2, 0.2, 0.12, 'S', 0, -0.3], ['box', 0.5, 0.42, 0.34, 0.1, 0.1, 0.62, '#cfd6de', 0.1], ...eyes(0.98, 0.29, 0.14, 0.1)],
  bones: () => [['box', -0.14, 0, 0, 0.12, 0.36, 0.14, 'S', 0], ['box', 0.14, 0, 0, 0.12, 0.36, 0.14, 'S', 0], ['box', 0, 0.34, 0, 0.5, 0.42, 0.3, 'S', 0], ['box', 0, 0.42, 0.01, 0.52, 0.06, 0.32, 'D', 0], ['box', 0, 0.56, 0.01, 0.52, 0.06, 0.32, 'D', 0],
    ['box', -0.36, 0.36, 0.03, 0.1, 0.4, 0.12, 'S', 0], ['box', 0.36, 0.36, 0.03, 0.1, 0.4, 0.12, 'S', 0], ['sphere', 0, 0.76, 0, 0.62, 0.58, 0.6, 'S', 0], ['box', -0.13, 1.0, 0.27, 0.14, 0.15, 0.06, PUP, 0], ['box', 0.13, 1.0, 0.27, 0.14, 0.15, 0.06, PUP, 0],
    ['box', -0.13, 1.03, 0.29, 0.06, 0.06, 0.05, 'A', 1], ['box', 0.13, 1.03, 0.29, 0.06, 0.06, 0.05, 'A', 1], ['box', 0.44, 0.4, 0.3, 0.09, 0.09, 0.6, 'M', 0.1]],
  caster: () => [['cone8', 0, 0, 0, 0.95, 0.95, 0.95, 'M', 0], ['box', 0, 0.72, 0, 0.5, 0.46, 0.48, 'S', 0], ['cyl8', 0, 1.14, 0, 0.95, 0.06, 0.95, 'D', 0], ['cone6', 0, 1.18, 0, 0.5, 0.6, 0.5, 'D', 0],
    ['box', 0.5, 0, 0.2, 0.08, 1.3, 0.08, '#7a5236', 0], ['sphere', 0.5, 1.25, 0.2, 0.26, 0.26, 0.26, 'A', 1], ...eyes(0.9, 0.25, 0.12, 0.09)],
  golem: () => [['box', -0.3, 0, 0, 0.36, 0.4, 0.4, 'D', 0], ['box', 0.3, 0, 0, 0.36, 0.4, 0.4, 'D', 0], ['rock', 0, 0.3, 0, 1.25, 0.95, 0.95, 'M', 0], ['rock', -0.72, 0.3, 0.1, 0.45, 0.75, 0.45, 'D', 0], ['rock', 0.72, 0.3, 0.1, 0.45, 0.75, 0.45, 'D', 0],
    ['box', 0, 1.1, 0.05, 0.56, 0.42, 0.5, 'M', 0], ['box', 0, 1.22, 0.31, 0.38, 0.1, 0.05, 'A', 1]],
  chest: () => [['box', 0, 0, 0, 1.0, 0.5, 0.75, '#9a6431', 0], ['box', 0, 0.62, -0.12, 1.0, 0.36, 0.75, '#b9742f', 0, 0], ['box', 0, 0.5, 0.2, 0.9, 0.12, 0.4, '#3a1420', 0], ...[-0.3, -0.1, 0.1, 0.3].map((x) => ['cone6', x, 0.5, 0.36, 0.12, 0.14, 0.1, EYE, 0.3]),
    ['box', 0, 0.3, 0.38, 0.2, 0.2, 0.05, '#ffd24a', 0.3], ...eyes(0.84, 0.27, 0.2, 0.11, '#ffe14a').slice(0, 2)],
  dragon: () => [...legs4(0.3, 0.35, 0.36), ['box', 0, 0.32, 0, 0.75, 0.6, 1.15, 'M', 0], ['box', 0, 0.38, -0.02, 0.5, 0.5, 1.0, 'L', 0], ['box', 0, 0.8, 0.6, 0.42, 0.5, 0.42, 'M', 0], ['box', 0, 1.0, 0.95, 0.4, 0.3, 0.55, 'M', 0],
    ['cone6', -0.15, 1.28, 0.8, 0.12, 0.3, 0.12, 'A', 0], ['cone6', 0.15, 1.28, 0.8, 0.12, 0.3, 0.12, 'A', 0], ['box', -0.75, 0.85, -0.1, 0.9, 0.06, 0.6, 'D', 0, 0.35], ['box', 0.75, 0.85, -0.1, 0.9, 0.06, 0.6, 'D', 0, -0.35],
    ['cone6', 0, 0.45, -0.95, 0.3, 0.25, 0.7, 'M', 0], ...eyes(1.14, 1.2, 0.14, 0.08, '#ffe14a').slice(0, 2)],
  fish: () => [['box', -0.16, 0, 0, 0.2, 0.3, 0.3, 'D', 0], ['box', 0.16, 0, 0, 0.2, 0.3, 0.3, 'D', 0], ['sphere', 0, 0.2, 0, 0.8, 1.0, 0.75, 'M', 0], ['box', 0, 0.3, 0.3, 0.5, 0.5, 0.12, 'L', 0], ['box', 0, 1.0, -0.05, 0.08, 0.3, 0.5, 'A', 0],
    ['box', -0.48, 0.5, 0, 0.2, 0.1, 0.3, 'A', 0, 0.4], ['box', 0.48, 0.5, 0, 0.2, 0.1, 0.3, 'A', 0, -0.4], ['box', 0.5, 0.2, 0.3, 0.07, 1.2, 0.07, '#7a5236', 0], ...eyes(0.82, 0.33, 0.17, 0.14)],
};
const KIND = [[/slime/, 'slime'], [/mushroom/, 'shroom'], [/cactus/, 'cactus'], [/mandragora|flower|rose|treant|bloom|root/, 'plant'], [/spider|kraken|crab|scorp/, 'spider'], [/bat\b|bat_/, 'bat'], [/dragon/, 'dragon'],
  [/wolf|hound|elephant|foot|cerber/, 'beast'], [/chicken/, 'bird'], [/witch|elf|chief|lord|anubis/, 'caster'], [/ghost|phantom/, 'ghost'], [/skeleton|skull|bone|scamp/, 'bones'], [/murloc/, 'fish'], [/golem|baal|king/, 'golem'], [/mimic/, 'chest'],
  [/goblin|knight|devil|imp/, 'human']];
const TONE = [[/frost|ice|frozen|snow/, ['#8fd3f5', '#4f8fc0', '#e8f6ff', '#bfe9ff']], [/hell|devil|red|blood|fire|baal/, ['#d84a3a', '#7a1f1f', '#ffb06a', '#ffd24a']], [/desert|sand|anubis/, ['#d9a85a', '#8a5a2b', '#f1d9a0', '#3fb7a8']],
  [/gold|treasure|greedy/, ['#f2c230', '#a8741a', '#fff0a8', '#ff5a7a']], [/dark|cursed|ghost|phantom|witch|bat/, ['#7d5bd0', '#3d2a6e', '#cdb8ff', '#7dffb0']], [/swamp|murloc|kraken/, ['#3fae9a', '#1f6a62', '#a8f0d8', '#ff8a4a']],
  [/goblin|cactus|treant|mandragora/, ['#6fbf4a', '#3a7a2e', '#c8f08a', '#e2443a']], [/mushroom|rose|flower/, ['#e2557a', '#8a2a4a', '#ffd0dc', '#ffe14a']], [/skeleton|bone|skull/, ['#8a93a8', '#4a5166', '#eef0f4', '#ff5a4a']],
  [/wolf|hound|foot|golem/, ['#8d8f9c', '#4f5160', '#c9ccd6', '#ffd24a']], [/chicken/, ['#f4f1e6', '#c9c2ac', '#ffffff', '#e2443a']], [/slime/, ['#5fc8f0', '#2f86b8', '#c8f1ff', '#ffffff']], [/spider/, ['#5a4a5e', '#2c2230', '#8a7890', '#ff5a4a']]];
const FALL = [['#e2764a', '#8a3f22', '#ffc9a0', '#ffe14a'], ['#5aa9e6', '#2c5f96', '#bfe0ff', '#ffd24a'], ['#b06ad8', '#5e2f86', '#e6c8ff', '#7dffb0'], ['#58b86a', '#2c7040', '#c0f0c0', '#ff7a5a'], ['#d8b040', '#8a6a1a', '#fff0b0', '#e2443a']];
const SKIN = { human: '#9fd070', caster: '#f0cfa8', bones: '#eee9dc' };
const hashS = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const cache = new Map();
function design(v) {
  let d = cache.get(v.id);
  if (d) return d;
  const key = `${v.monster || ''} ${v.id} ${v.name}`.toLowerCase(), hs = hashS(v.monster || v.id);
  let kind = (KIND.find(([re]) => re.test(key)) || [])[1];
  if (!kind) kind = v.rank === 'boss' ? ['golem', 'dragon', 'caster', 'beast'][hs % 4] : v.beh === 'fast' ? ['beast', 'spider', 'bat'][hs % 3] : v.beh === 'ranged' ? ['caster', 'ghost', 'plant'][hs % 3] : ['slime', 'human', 'bones', 'shroom', 'golem'][hs % 5];
  const tone = (TONE.find(([re]) => re.test(key)) || [])[1] || FALL[hs % FALL.length];
  const pal = { M: tone[0], D: tone[1], L: tone[2], A: tone[3], S: kind === 'bones' ? '#eee9dc' : SKIN[kind] && !/goblin|murloc/.test(key) ? SKIN[kind] : tone[2] };
  const parts = BUILD[kind]().map((q) => { const c = q[7]; return [q[0], q[1], q[2], q[3], q[4], q[5], q[6], pal[c] || c, q[8] || 0, q[9] || 0, c === 'M' || c === 'D' || c === 'S' || c === 'L']; });
  // Rang: Elite/Selten mit Hörnern, Boss mit Krone, Spezial mit Münzglanz
  const top = Math.max(...parts.map((q) => q[2] + Math.abs(q[5]) * (q[0] === 'cone8' && q[5] < 0 ? 0 : 1)));
  if (v.rank === 'elite' || v.rank === 'rare') parts.push(['cone6', -0.24, top - 0.08, 0, 0.16, 0.34, 0.16, v.rank === 'rare' ? '#d6a1ff' : '#ffd9a0', 0.4, 0.3, false], ['cone6', 0.24, top - 0.08, 0, 0.16, 0.34, 0.16, v.rank === 'rare' ? '#d6a1ff' : '#ffd9a0', 0.4, -0.3, false]);
  if (v.rank === 'boss') parts.push(['cyl8', 0, top - 0.02, 0, 0.5, 0.14, 0.5, '#ffd24a', 0.5, 0, false], ...[0, 1, 2, 3].map((k) => ['cone6', Math.cos(k * 1.571) * 0.2, top + 0.1, Math.sin(k * 1.571) * 0.2, 0.13, 0.22, 0.13, '#ffd24a', 0.5, 0, false]));
  if (v.rank === 'special') parts.push(['sphere', 0, top + 0.1, 0, 0.26, 0.26, 0.26, '#ffd24a', 1, 0, false]);
  d = { parts, top, kind };
  cache.set(v.id, d);
  return d;
}
export const enemyTop = (v) => design(v).top;
// Liefert die Teile in Weltkoordinaten. tint: Statusfarbe (ersetzt Körperfarben), sc: Größe, yaw: Blickrichtung.
export function enemyParts(v, x, z, yaw, sc, tint) {
  const d = design(v), cf = Math.cos(yaw), sf = Math.sin(yaw), out = [];
  for (const q of d.parts) out.push([q[0], x + (q[1] * cf + q[3] * sf) * sc, q[2] * sc, z + (-q[1] * sf + q[3] * cf) * sc, yaw + q[9], q[4] * sc, q[5] * sc, q[6] * sc, tint && q[10] ? tint : q[7], q[8]]);
  return out;
}
