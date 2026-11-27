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
  give('gold', 100000); game.cmd('build', 'chesthouse'); give('wood', 30); for (let i = 0; i < 3; i++) game.cmd('unlockKeySlot', i);
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
  assert.ok(s().counters['talk:npc_scout'] >= 1);
});

test('Weltpositionen sind über Content/Backend änderbar und werden validiert', () => {
  const p = buildBaseContent();
  p.tables.buildings.find((b) => b.id === 'smithy').pos = [12, 1];
  p.tables.worlds[0].landmarks.push({ t: 'well', p: [30, -30] });
  assert.deepEqual(validateContent(p), []);
  const { game } = mk({ pack: p });
  const sm = game.world.map.objects.find((o) => o.id === 'smithy'), q = game.world.G.toPx(12, 1);
  assert.deepEqual([Math.round(sm.x), Math.round(sm.y)], [Math.round(q.x), Math.round(q.y)]);
  p.tables.worlds[0].entries.a1_3 = [200, 200];
  assert.match(validateContent(p).join(), /Einstieg a1_3 nicht begehbar/);
});
