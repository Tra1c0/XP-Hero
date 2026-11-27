// Kapitel-1-Welt: zusammenhängend, Tore in Kampagnenreihenfolge, jede Zone/Truhe/Gift-Chest zu Fuß erreichbar (Kollision + Pfadsuche der Simulation).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mk } from './helpers.js';
import { buildBaseContent } from '../src/core/content/base.js';
import { validateContent } from '../src/core/content/validate.js';
import { snap } from '../src/core/worldgrid.js';

// Läuft wie ein Spieler (Zielführung pro Tick); Gegner werden ausgeblendet, damit nur Geometrie geprüft wird.
function walk(game, clock, x, y, maxSec = 120) {
  const w = game.world;
  for (const e of w.enemies) { e.alive = false; e.st = 'locked'; }
  w.goTo(x, y);
  for (let t = 0; t < maxSec * 30; t++) {
    for (const e of w.enemies) e.alive = false;
    game.tick(1 / 30); clock.t += 1000 / 30;
    if (!w.p.goal) return t / 30;
  }
  return -1;
}

test('Kapitel 1 ist eine Welt: Basis + 6 Gebiete, Zonenwechsel beim Laufen, Tore sperren bis zum Bosssieg', () => {
  const { game, clock, s } = mk({ seed: 3 });
  const w = game.world;
  assert.equal(w.map.kind, 'world');
  assert.deepEqual(w.map.world.areas, ['base', 'a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6']);
  const visited = new Set();
  // gesperrt: Sandevil nicht erreichbar
  const sand = w.map.entryOf('a1_2');
  assert.equal(walk(game, clock, sand.x, sand.y, 40), -1, 'Sandevil vor Rootling-Sieg nicht begehbar');
  assert.notEqual(s().world.area, 'a1_2');
  for (const [k, a] of ['a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6'].entries()) {
    if (k > 0) s().world.cleared[`a1_${k}`] = clock.t; // Boss des Vorgängers besiegt
    game.tick(0.3); clock.t += 300;
    const q = w.map.entryOf(a), sec = walk(game, clock, q.x, q.y);
    assert.ok(sec >= 0, `${a} zu Fuß erreichbar`);
    assert.equal(s().world.area, a, `Zonenwechsel nach ${a} beim Laufen`);
    visited.add(a);
  }
  assert.equal(visited.size, 6);
  assert.equal(game.world, w, 'kein Kartenwechsel innerhalb von Kapitel 1');
  const back = w.map.entryOf('base');
  const n0 = s().counters.returnBase || 0;
  assert.ok(walk(game, clock, back.x, back.y, 200) >= 0, 'zurück zur Basis gelaufen');
  assert.equal(s().world.area, 'base'); assert.equal(s().counters.returnBase, n0 + 1, 'Basis betreten zählt als Heimkehr');
});

test('Jede Truhe, jeder Gift-Spawner, jedes Gebäude und jeder NPC ist zu Fuß erreichbar und löst die Interaktion aus', () => {
  const { game, clock, s, give } = mk({ seed: 4 });
  const w = game.world;
  for (let k = 1; k <= 6; k++) s().world.cleared[`a1_${k}`] = 1;
  game.tick(0.3);
  give('gold', 100000); game.cmd('build', 'chesthouse'); give('wood', 80); give('stone', 10); give('orb_red', 6); game.cmd('upgradeBuilding', 'chesthouse'); game.cmd('upgradeBuilding', 'chesthouse'); for (let i = 0; i < 3; i++) game.cmd('unlockKeySlot', i);
  const targets = w.map.objects.filter((o) => ['chest', 'gift', 'areachest', 'building', 'npc'].includes(o.type));
  assert.ok(targets.length >= 17 + 6 + 6 + 7 + 3);
  const fail = [];
  for (const o of targets) {
    // Ziel: nächster begehbarer Punkt am Objekt (wie ein Spieler, der davor stehen bleibt)
    const t = snap(w.G, o.x, o.y, 6), sec = walk(game, clock, t.x, t.y, 200);
    const d = Math.hypot(w.p.x - o.x, w.p.y - o.y);
    if (sec < 0 && d > o.r) fail.push(`${o.type} ${o.id}`);
  }
  assert.deepEqual(fail, []);
  assert.ok(s().counters['gift:open'] >= 10, 'Gift Chests beim Vorbeilaufen geöffnet');
  assert.ok(s().counters['chest:pickup'] >= 1, 'Feldtruhe ins Key House gelegt');
  assert.equal(s().counters['talk:npc_kain'], undefined, 'Vorbeilaufen allein spricht nicht');
});

test('Weltpositionen sind über Content/Backend änderbar und werden validiert', () => {
  const p = buildBaseContent();
  p.tables.buildings.find((b) => b.id === 'smithy').pos = [12, 1];
  p.tables.worlds[0].landmarks.push({ t: 'well', p: [30, -30] });
  assert.deepEqual(validateContent(p), []);
  const { game } = mk({ pack: p });
  const sm = game.world.map.objects.find((o) => o.id === 'smithy'), q = game.world.G.toPx(12, 1);
  assert.deepEqual([Math.round(sm.bx), Math.round(sm.by)], [Math.round(q.x), Math.round(q.y)]);
  p.tables.worlds[0].entries.a1_3 = [200, 200];
  assert.match(validateContent(p).join(), /Einstieg a1_3 nicht begehbar/);
});

test('Kartenwelt: Gelände aus der Originalkarte, Gebiete öffnen sich in Kampagnenreihenfolge, gesperrte Gebiete sind dicht', async () => {
  const { WORLD } = await import('../src/core/content/world1.js');
  const { buildGrid, reach } = await import('../src/core/worldgrid.js');
  const G = buildGrid(WORLD), start = G.toPx(...WORLD.entries.base);
  assert.ok(WORLD.map && G.tint && WORLD.gates.length === 0, 'Raster statt Polygone, keine Tor-Korridore');
  for (let step = 0; step <= 6; step++) {
    WORLD.zones.forEach((z, k) => { const n = Number(z.id.slice(3)); G.zoneOpen[k] = z.id === 'base' || n <= step + 1 ? 1 : 0; });
    const R = reach(G, start.x, start.y), zs = new Set();
    for (let i = 0; i < R.length; i++) if (R[i]) zs.add(G.zoneIds[G.zone[i]]);
    assert.deepEqual([...zs].sort(), ['base', ...[1, 2, 3, 4, 5, 6].filter((n) => n <= step + 1).map((n) => `a1_${n}`)].sort(), `nach ${step} Bossen`);
  }
  for (const [a, p] of Object.entries(WORLD.entries)) { const q = G.toPx(p[0], p[1]); assert.equal(G.zoneIds[G.zone[Math.floor(q.y / G.cpx) * G.cols + Math.floor(q.x / G.cpx)]], a, `Einstieg ${a} liegt im eigenen Gebiet`); }
});

test('Trittfeld: jedes Gebäude hat ein begehbares Feld vor sich; Betreten meldet das Gebäude, Verlassen hebt es auf', () => {
  const { game, clock } = mk(); const w = game.world, G = w.G, ppm = G.ppm;
  const bs = w.map.objects.filter((o) => o.type === 'building');
  assert.equal(bs.length, game.c.t.buildings.length);
  for (const o of bs) {
    assert.ok(o.bx !== undefined && Math.hypot(o.x - o.bx, o.y - o.by) > 1.5 * ppm, `${o.id}: Feld liegt vor dem Gebäude, nicht darin`);
    for (const p of bs) if (p !== o) assert.ok(Math.hypot(o.x - p.x, o.y - p.y) > o.r + p.r, `${o.id}/${p.id}: Felder überlappen nicht`);
    w.p.x = w.p.px = o.x; w.p.y = w.p.py = o.y; for (let k = 0; k < 12; k++) { game.tick(1 / 30); clock.t += 33; }
    assert.equal(w.near && w.near.id, o.id, `${o.id}: auf dem Feld`);
    const far = w.map.entryOf('a1_1'); w.p.x = w.p.px = far.x; w.p.y = w.p.py = far.y; for (let k = 0; k < 12; k++) { game.tick(1 / 30); clock.t += 33; }
    assert.ok(!w.near || w.near.id !== o.id, `${o.id}: Feld verlassen`);
  }
});
