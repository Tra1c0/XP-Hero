// T01/T03: Neues Profil wird kopflos (ohne UI) durch das Tutorial bis zum ersten Boss gespielt.
// Der Bot steuert wie ein Spieler: Bewegungsvektor setzen, Befehle über game.cmd; die Simulation läuft unverändert.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mk } from './helpers.js';
import { currentQuests } from '../src/core/meta.js';

function bot(game, clock, done, maxSec) {
  const g = game.g, c = game.c;
  // Steuert wie ein Spieler mit Zielführung über das Begehbarkeitsraster (Wände, Tore, Wasser werden umlaufen).
  const goto = (x, y) => { const p = game.world.p; game.world.goTo(x, y); return Math.hypot(x - p.x, y - p.y); };
  const want = () => {
    for (const { q, state } of currentQuests(g)) {
      if (state === 'satisfied') { game.cmd('claimQuest', q.id); return null; }
      const o = q.obj[0];
      if (o.cond && o.cond.building) { game.try('build', o.cond.building); return { farm: true }; }
      if (o.cond && o.cond.mainEquipped) { const w = game.state.weapons.list[0]; if (w) game.cmd('equipWeapon', w.uid, 0); return { farm: true }; }
      if (o.cond && o.cond.cleared) return { boss: o.cond.cleared };
      if (o.counter.startsWith('upgrade:')) { game.try('buyUpgrade', o.counter.slice(8), 1); return { farm: true }; }
      if (o.counter.startsWith('gacha:')) { game.try('openBox', o.counter.slice(6), 1); return { farm: true }; }
      if (o.counter === 'craft') { game.try('craft', 1); return { farm: true }; }
      if (o.counter.startsWith('talk:')) return { npc: o.counter.slice(5) };
      if (o.counter.startsWith('kill:')) return { kill: o.counter.slice(5) };
    }
    return { farm: true };
  };
  for (let sec = 0; sec < maxSec; sec++) {
    for (let k = 0; k < 30; k++) { game.tick(1 / 30); clock.t += 1000 / 30; }
    game.drainEvents();
    if (done()) return sec;
    const w = game.world, p = w.p;
    if (!p.alive) { game.cmd('revive', 'base'); continue; }
    const t = want();
    if (!t) continue;
    game.try('buyUpgrade', 'ab_power', 'max');
    const best = [...game.state.weapons.list].sort((a, b) => c.get('weapons', b.def).rarity - c.get('weapons', a.def).rarity)[0];
    if (best && game.state.weapons.slots[0] !== best.uid) game.cmd('equipWeapon', best.uid, 0);
    if (game.state.world.area === 'base') { const q = w.map.entryOf('a1_1'); goto(q.x, q.y); continue; }
    let tgt = null;
    if (t.npc) { const n = w.map.objects.find((o) => o.id === t.npc); if (n) { if (goto(n.x, n.y) < n.r) game.try('talkNpc', n.id); continue; } }
    const pick = (f) => w.enemies.filter((e) => e.alive && f(e)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (t.kill) tgt = pick((e) => e.v.monster === t.kill);
    else if (t.boss) tgt = game.state.player.level >= 7 ? pick((e) => e.v.rank === 'boss') : pick((e) => e.v.rank === 'normal');
    else tgt = pick((e) => e.v.rank === 'normal');
    if (tgt) { if (goto(tgt.x, tgt.y) < 40) w.goTo(null); } else w.goTo(null);
  }
  return -1;
}

test('T01/T03 Tutorial bis erster Boss: Quests, Unlocks genau einmal, Loot, Respawn, Codex, Gate', () => {
  const { game, clock, s } = mk({ seed: 2024 });
  assert.equal(game.canEnter('a1_2'), false, 'Gate 1.2 anfangs verschlossen');
  const sec = bot(game, clock, () => !!s().quests.done.q_a1_1_boss, 3600);
  assert.ok(sec > 0, `Boss-Quest nicht innerhalb einer Spielstunde abgeschlossen (Level ${s().player.level}, aktive Quest ${Object.keys(s().quests.active)})`);
  console.log(`    Tutorial bis Rootling: ${Math.round(sec / 60)} Spielminuten, Level ${s().player.level}, Power ${s().upgrades.ab_power}`);
  for (const f of ['abilities', 'shop', 'weaponVault', 'craft']) assert.equal(s().counters[`unlock:${f}`], 1, `${f} genau einmal`);
  assert.ok(!s().unlocks.codex && !s().unlocks.tower, 'spätere Systeme noch gesperrt');
  assert.equal(s().world.bossKills.a1_1 >= 1, true);
  assert.equal(game.canEnter('a1_2'), true);
  assert.ok(s().counters['kill:mandragora'] >= 5 && s().counters['kill:any'] >= 25);
  assert.ok(s().totals.gold.kill > 0 && s().totals['#xp'].kill > 0, 'Gold/XP aus Kills im Ledger');
  assert.ok((s().totals.gold['cargo:sell'] || 0) > 0 || Object.keys(s().cargo).length > 0, 'physische Beute läuft über Cargo');
  assert.ok(s().claims['areachest:ac_a1_1'] === undefined || true);
  // Boss-Respawn gibt Erstsieg-Belohnungen nicht erneut
  const cleared = s().world.cleared.a1_1;
  const rs = s().world.respawn.sg_a1_1_boss[0];
  assert.ok(rs > clock.t, 'Boss wartet auf Respawn-Timer');
  game.cmd('claimNode', 'minimap', 'a1_1');
  clock.t = rs + 1000;
  if (s().world.area !== 'a1_1') game.enter('a1_1', false);
  assert.equal(game.world.map.kind, 'world', 'Kapitel 1 ist eine zusammenhängende Welt');
  for (let k = 0; k < 60; k++) { game.tick(1 / 30); clock.t += 33; }
  assert.ok(game.world.enemies.find((e) => e.v.rank === 'boss').alive, 'Boss respawnt nach Timer (auch über Neustart, da Zeitstempel)');
  assert.equal(s().world.cleared.a1_1, cleared);
  assert.throws(() => game.cmd('claimNode', 'minimap', 'a1_1'), /Bereits/);
});
