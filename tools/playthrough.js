// Balancing-Durchlauf: ein automatischer Spieler spielt ab Level 1 wie ein Mensch mit Auto-Jagd im Quest-Modus.
// Er schließt Quests ab, erledigt Bau-/Upgrade-/Schmiede-/Gesprächsziele, gibt Gold für Fähigkeiten aus, rüstet die beste Waffe aus und verbindet Waffen.
// Aufruf: node tools/playthrough.js [Spielstunden=4]. Ausgabe: Zeitpunkt je Gebietsboss, Level, Tode, Engpässe.
import { mk } from '../tests/helpers.js';
import { currentQuests, questTarget } from '../src/core/meta.js';
import * as prog from '../src/core/progress.js';
const HOURS = Number(process.argv[2] || 4), { game, clock, s } = mk({ seed: 7 }), g = game.g, c = game.c;
let deaths = 0, lastDone = 0, lastDoneT = 0, stuckNote = '';
const log = [], cleared = {}, t0 = clock.t, hhmm = (sec) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;
const spend = () => {
  // Gold: abwechselnd das günstigste aus Kraft/HP/Regeneration; Orbs und anderes: alles, was sich kaufen lässt
  for (let k = 0; k < 40; k++) {
    const cand = ['ab_power', 'ab_hp', 'ab_regen', 'ab_cargo'].map((id) => [id, prog.upgradePreview(g, id, 1)]).filter(([, pv]) => pv.to > pv.from).sort((a, b) => (a[1].next.gold || 0) - (b[1].next.gold || 0));
    if (!cand.length || (s().inv.gold || 0) - (cand[0][1].next.gold || 0) < reserve || !game.try('buyUpgrade', cand[0][0], 1).ok) break;
  }
  for (const u of c.t.upgradeTracks) if (u.family !== 'ability' && u.family !== 'synergy') game.try('buyUpgrade', u.id, 'max');
  while (game.try('craft', 1).ok);
  game.try('mergeAll');
  const ws = s().weapons, best = [...ws.list].sort((a, b) => prog.weaponDmg(g, b) - prog.weaponDmg(g, a));
  best.slice(0, ws.unlocked).forEach((w, i) => { if (ws.slots[i] !== w.uid) game.try('equipWeapon', w.uid, i); });
  for (const uid of ws.slots) if (uid) game.try('weaponLevelUp', uid, 'max');
  for (const b of c.t.gachaBoxes) game.try('openBox', b.id, 1);
  // Schlüsselhaus: erste Plätze freischalten, sobald es steht (nur in der Basis möglich)
  if (s().unlocks.keyhouse && !(s().keyhouse.slots || []).some((sl) => sl.open)) { if (s().world.area !== 'base') game.try('returnHome'); for (let i = 0; i < 3; i++) game.try('unlockKeySlot', i); }
  // fällige Truhen im Schlüsselhaus abholen (nur in der Basis möglich)
  (s().keyhouse.slots || []).forEach((sl, i) => { if (sl && sl.chest && g.now() >= sl.chest.readyAt) { if (s().world.area !== 'base') game.try('returnHome'); game.try('claimChest', i); } });
};
let reserve = 0; // Gold, das für ein offenes Bauziel zurückgehalten wird
const quests = () => {
  reserve = 0;
  for (const { q, state } of currentQuests(g)) if (state === 'satisfied') game.try('claimQuest', q.id);
  for (const { q, state } of currentQuests(g)) { const o = q.obj[0]; if (state === 'active' && o.cond && o.cond.building) reserve = Math.max(reserve, c.get('buildings', o.cond.building).cost.gold || 0); }
  for (const { q, state } of currentQuests(g)) {
    if (state !== 'active') continue;
    const o = q.obj[0], t = questTarget(g, q);
    if (o.cond && o.cond.building) { const cost = c.get('buildings', o.cond.building).cost; if (Object.entries(cost).every(([i, n]) => (s().inv[i] || 0) >= n)) { if (!game.try('build', o.cond.building).ok && s().world.area !== 'base') game.try('returnHome'); } }
    else if (o.cond && o.cond.mainEquipped) spend();
    else if (o.counter && o.counter.startsWith('upgrade:')) game.try('buyUpgrade', o.counter.slice(8), 1);
    else if (o.counter && o.counter.startsWith('gacha:')) game.try('openBox', o.counter.slice(6), 1);
    else if (o.counter === 'returnBase') game.try('returnHome');
    else if (t && (t.npc || t.char)) { const goal = game.questGoal(q); if (goal) { const p = game.world.p; if (Math.hypot(goal.x - p.x, goal.y - p.y) < 70) { const n = game.world.map.objects.find((x) => x.type === 'npc' && Math.hypot(x.x - goal.x, x.y - goal.y) < 5); if (n) game.try('talkNpc', n.id); } else { p.auto = false; game.world.goTo(goal.x, goal.y); return true; } } }
    else if (t && t.chest) { const goal = game.questGoal(q); if (goal) { game.world.p.auto = false; game.world.goTo(goal.x, goal.y); return true; } }
  }
  return false;
};
for (let sec = 0; sec < HOURS * 3600; sec++) {
  for (let k = 0; k < 30; k++) { game.tick(1 / 30); clock.t += 1000 / 30; }
  game.drainEvents();
  const w = game.world, p = w.p;
  if (!p.alive) { deaths++; game.cmd('revive', 'base'); continue; }
  const walking = sec % 2 === 0 ? quests() : !!p.goal;
  if (!walking && !p.goal) p.auto = true;
  if (sec % 10 === 0) spend();
  for (const a of c.t.areas) if (a.chapter === 1 && s().world.cleared[a.id] && !cleared[a.id]) { cleared[a.id] = sec; log.push(`${hhmm(sec)}  ${c.get('variants', a.boss).name} besiegt (${a.name}) · Level ${s().player.level} · Tode bisher ${deaths} · Kraft ${s().upgrades.ab_power || 0} · HP ${s().upgrades.ab_hp || 0} · Angriff ${g.stats.atk} · Leben ${g.stats.hp}`); }
  const done = Object.keys(s().quests.done).length;
  if (done !== lastDone) { lastDone = done; lastDoneT = sec; } else if (sec - lastDoneT === 1500) stuckNote = `${hhmm(sec)} seit 25 min keine Quest abgeschlossen; offen: ${currentQuests(g).map(({ q, obj }) => `${q.name} ${obj.map((o) => o.cur + '/' + o.need).join()}`).join(' | ')}`, log.push('  ! ' + stuckNote);
  if (cleared.a1_6) break;
}
const st = s();
console.log(log.join('\n'));
console.log(`Ende nach ${hhmm((clock.t - t0) / 1000)} Spielzeit: Level ${st.player.level}, Tode ${deaths}, Quests ${Object.keys(st.quests.done).length}, Kills ${st.counters['kill:any'] || 0}, Gold verdient ${Object.values(st.totals.gold || {}).filter((v) => v > 0).reduce((a, b) => a + b, 0)}, Waffen ${st.weapons.list.length}, beste Seltenheit ${Math.max(0, ...st.weapons.list.map((x) => c.get('weapons', x.def).rarity))}`);
console.log('Offen: ' + currentQuests(g).map(({ q, obj }) => `${q.name} ${obj.map((o) => o.cur + '/' + o.need).join()}`).join(' | '));
