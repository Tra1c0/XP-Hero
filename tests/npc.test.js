// NPC-Schicht: Figuren/Standorte, Dialogszenen mit Freischaltung, Questgeber (Annahme/Abgabe vor Ort), Marker, Zielführung, Raid-Kette.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mk, code } from './helpers.js';
import * as meta from '../src/core/meta.js';
import * as econ from '../src/core/econ.js';
import * as modes from '../src/core/modes.js';
import { serialize, deserialize } from '../src/core/state.js';

const at = (game, id) => { const o = game.world.map.objects.find((x) => x.id === id); Object.assign(game.world.p, { x: o.x, y: o.y + 30, px: o.x, py: o.y + 30 }); return o; };

test('Referenzstruktur: 8 Figuren, 27 Standorte, 268 Kettenquests; keine fremden Dialogtexte importiert', async () => {
  const { game } = mk(), T = game.c.t;
  const ref = T.npcs.filter((n) => !['elder', 'smith'].includes(n.char));
  assert.equal(new Set(ref.map((n) => n.char)).size, 8);
  assert.equal(ref.length, 27);
  assert.equal(T.quests.filter((q) => q.giver).length, 268);
  assert.deepEqual(T.raidBosses.map((b) => b.name), ['Crystal Crab', 'Anubis', 'Blood Lord', 'Frozen Bloom', 'Rosalia', 'Cerberus']);
  const { NPC_REF } = await import('../src/core/content/npc_ref.js');
  assert.ok(Object.values(NPC_REF).every((n) => n.scenes.every((sc) => typeof sc.lines === 'number')), 'Referenz enthält nur Zeilenzahlen');
  assert.equal(NPC_REF.kain.scenes.length, T.npcs.find((n) => n.id === 'npc_kain').scenes.length, 'Kain: gleiche Szenenzahl wie Referenz');
});

test('Dialog: Szenen der Reihe nach, Freischaltung per Quest/Boss, gesehen-Status überlebt Neustart, Reichweite nötig', () => {
  const { game, g, s } = mk();
  assert.equal(code(() => game.cmd('talkNpc', 'npc_taid_2')), 'too_far');
  game.enter('a1_1', false);
  assert.equal(code(() => game.cmd('talkNpc', 'npc_kain')), 'too_far');
  const kain = at(game, 'npc_kain');
  assert.equal(meta.npcStatus(g, kain), 'offer');
  const l1 = game.cmd('talkNpc', 'npc_kain').lines, l2 = game.cmd('talkNpc', 'npc_kain').lines;
  assert.notDeepEqual(l1, l2);
  assert.deepEqual(game.cmd('talkNpc', 'npc_kain').lines, l2, 'ohne neue Szene wiederholt sich die letzte');
  assert.equal(meta.npcStatus(g, kain), null);
  assert.equal(s().counters['talk:npc_kain'], 3);
  s().quests.done.q_001 = 1;
  assert.equal(meta.npcStatus(g, kain), 'offer', 'neue Szene nach Quest 1');
  const l3 = game.cmd('talkNpc', 'npc_kain').lines;
  assert.match(l3[0], /Lagerfeuer/);
  s().world.cleared.a1_1 = 1;
  assert.match(game.cmd('talkNpc', 'npc_kain').lines[0], /Rootling/);
  const re = mk({ state: deserialize(serialize(s())) });
  assert.equal(Object.keys(re.s().npc.seen).length, 4);
});

test('Questgeber Taid: Annahme und Abgabe nur vor Ort, Kette in Referenzreihenfolge, Belohnung genau einmal', () => {
  const { game, g, s } = mk();
  s().world.cleared.a1_1 = 1; game.tick(0.3);
  const first = game.c.get('quests', 'nq_10001');
  assert.equal(meta.questState(g, first), 'available');
  assert.ok(!s().quests.active.nq_10001, 'keine automatische Annahme');
  const taid = at(game, 'npc_taid_2');
  assert.equal(meta.npcStatus(g, taid), 'offer');
  assert.deepEqual(game.cmd('talkNpc', 'npc_taid_2').accepted, ['Besiege 10 Gegner']);
  assert.equal(meta.npcStatus(g, taid), 'busy');
  econ.emit(g, 'kill:any', 10);
  assert.equal(meta.npcStatus(g, taid), 'turnin');
  assert.equal(code(() => game.cmd('claimQuest', 'nq_10001')), 'at_npc', 'kein Fern-Abgeben über das HUD');
  const gold = s().inv.gold || 0, r = game.cmd('talkNpc', 'npc_taid_2');
  assert.equal(r.claimed[0].got[0].n, 60); assert.equal((s().inv.gold || 0) - gold, 60);
  assert.deepEqual(r.accepted, ['Sammle 120 Gold von Gegnern']);
  assert.equal(game.cmd('talkNpc', 'npc_taid_2').claimed.length, 0);
  assert.equal(meta.questState(g, game.c.get('quests', 'nq_11001')), 'unavailable', 'Ebonhollow-Kette erst mit Gebiet');
  // Zielführung: Ziel der laufenden Quest liegt in der Welt
  const goal = game.questGoal(game.c.get('quests', 'q_001'));
  assert.ok(goal && goal.label === 'Mandragora');
});

test('Ryan-Kette: Gespräch schaltet Boss Raid frei, Raid Camp, Quest-Boss unabhängig vom Tagesboss, Abgabe bei Ryan', () => {
  const { game, g, s, give } = mk();
  assert.ok(!s().unlocks.raid);
  s().world.cleared.a1_1 = 1; game.tick(0.3);
  at(game, 'npc_ryan_0');
  const r = game.cmd('talkNpc', 'npc_ryan_0');
  assert.equal(r.claimed[0].name, 'Sprich mit Jäger Ryan'); assert.ok(s().unlocks.raid, 'Raid per Quest 901001 freigeschaltet');
  assert.deepEqual(r.accepted.slice(-1), ['Baue das Raid Camp']);
  give('gold', 10000); give('wood', 20); give('stone', 20); game.cmd('build', 'raidcamp');
  assert.deepEqual(game.cmd('talkNpc', 'npc_ryan_0').accepted, ['Besiege den Raid-Boss Crystal Crab']);
  const other = modes.raidBossOfDay(g).id === 'raid_1' ? 'raid_2' : 'raid_1';
  if (other === 'raid_2') assert.equal(code(() => game.cmd('startMode', 'raid', 'raid_2')), 'locked');
  game.cmd('startMode', 'raid', 'raid_1');
  const hp = modes.modeSpec(g, s().modes.session).bossHp;
  game.cmd('completeMode', { win: true, dmg: hp * 0.06 });
  assert.equal(s().counters['raid:clear:raid_1'], 1);
  game.world = game.field; // im Spiel stellt finishMode() die Feldkarte wieder her
  at(game, 'npc_ryan_1');
  const fin = game.cmd('talkNpc', 'npc_ryan_1');
  assert.equal(fin.claimed[0].name, 'Besiege den Raid-Boss Crystal Crab');
  assert.deepEqual(fin.accepted, ['Besiege den Raid-Boss Anubis']);
});

test('Solo-Spiel: keine PvP-/Invasion-Inhalte im Standardpaket, Questkette bleibt lückenlos', async () => {
  const { game, g } = mk(), T = game.c.t;
  assert.equal(game.c.cfg.multiplayer, false);
  assert.ok(!T.quests.some((q) => /Invasion/.test(q.name) || (q.unlock || []).some((f) => f === 'pvp' || f === 'invasion')));
  assert.ok(!T.shop.some((s) => s.cat === 'invasion' || /pvp|inv/.test(s.id.split('_')[1] || '')) && !T.tracks.some((t) => t.id === 'invasionpass'));
  assert.ok(!T.worldObjects.some((o) => o.type === 'invportal'));
  assert.ok(!('ticket_pvp' in g.state.inv) && !('ticket_invasion' in g.state.inv), 'keine PvP-Tickets im Inventar');
  const ids = new Set(T.quests.map((q) => q.id));
  assert.ok(T.quests.every((q) => q.prereq.every((p) => ids.has(p))), 'kein Verweis auf entfernte Quest');
  const { buildBaseContent } = await import('../src/core/content/base.js'), { validateContent } = await import('../src/core/content/validate.js');
  assert.deepEqual(validateContent(buildBaseContent({ multiplayer: true })), [], 'Mehrspieler-Paket bleibt gültig');
});
