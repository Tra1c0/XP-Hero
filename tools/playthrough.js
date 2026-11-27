// Balancing-Durchlauf: ein automatischer Spieler spielt ab Level 1 wie ein Mensch mit Auto-Jagd im Quest-Modus.
// Er schließt Quests ab, erledigt Bau-/Upgrade-/Schmiede-/Gesprächsziele, gibt Gold für Fähigkeiten aus, rüstet die beste Waffe aus und verbindet Waffen.
// Aufruf: node tools/playthrough.js [Spielstunden=4]. Ausgabe: Zeitpunkt je Gebietsboss, Level, Tode, Engpässe.
import { mk } from '../tests/helpers.js';
import { currentQuests, questTarget } from '../src/core/meta.js';
import * as prog from '../src/core/progress.js';
const HOURS = Number(process.argv[2] || 4), { game, clock, s } = mk({ seed: 7 }), g = game.g, c = game.c;
const killers = {};
let chestWait = 0, chestPause = 0;
let sec0 = 0, deaths = 0, lastDone = 0, lastDoneT = 0, stuckNote = '';
const log = [], cleared = {}, t0 = clock.t, hhmm = (sec) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;
const spend = () => {
  // Gold: abwechselnd das günstigste aus Kraft/HP/Regeneration; Orbs und anderes: alles, was sich kaufen lässt
  // Gold: Kraft und HP im Gleichschritt (das niedrigere zuerst), dazwischen Regeneration und Fracht, wenn sie höchstens ein Fünftel davon kosten.
  // Für ein teures Quest-Ziel wird nur gespart, wenn es in Reichweite ist (höchstens das Dreifache des aktuellen Golds).
  for (let k = 0; k < 60; k++) {
    const gold = s().inv.gold || 0, hold = reserve <= gold * 3 ? reserve : 0, pv = (id) => prog.upgradePreview(g, id, 1);
    const main = ['ab_power', 'ab_hp'].map((id) => [id, pv(id)]).filter(([, q]) => q.next).sort((x, y) => x[1].from - y[1].from)[0];
    if (!main) break;
    const side = ['ab_regen', 'ab_cargo'].map((id) => [id, pv(id)]).filter(([, q]) => q.next && (q.next.gold || 0) * 5 <= (main[1].next.gold || 1) && q.to > q.from)[0];
    const pick = side || main;
    if (gold - (pick[1].next.gold || 0) < hold || !game.try('buyUpgrade', pick[0], 1).ok) break;
  }
  for (const u of c.t.upgradeTracks) if (u.family !== 'ability' && u.family !== 'synergy') game.try('buyUpgrade', u.id, 'max'); game.try('starUp');
  while (game.try('craft', 1).ok);
  game.try('mergeAll');
  const ws = s().weapons, best = [...ws.list].sort((a, b) => prog.weaponDmg(g, b) - prog.weaponDmg(g, a));
  best.slice(0, ws.unlocked).forEach((w, i) => { if (ws.slots[i] !== w.uid) game.try('equipWeapon', w.uid, i); });
  for (const uid of ws.slots) if (uid) game.try('weaponLevelUp', uid, 'max');
  // Truhen nur mit Schlüsseln öffnen; Gems bleiben für Quest-Ziele (z. B. Helden beschwören). Gratis-Angebote des Shops mitnehmen.
  for (const b of c.t.gachaBoxes) { const co = b.costs.find((x) => /^key/.test(Object.keys(x)[0])); if (co && (s().inv[Object.keys(co)[0]] || 0) >= 1) game.try('openBox', b.id, 1); }
  if (sec0 % 600 === 0) for (const sku of c.t.shop) if (!Object.keys(sku.price).length) game.try('buy', sku.id, 1);
  // Schlüsselhaus: erste Plätze freischalten, sobald es steht (nur in der Basis möglich)
  if (s().unlocks.keyhouse && !(s().keyhouse.slots || []).some((sl) => sl.open)) { if (s().world.area !== 'base') game.try('returnHome'); for (let i = 0; i < 3; i++) game.try('unlockKeySlot', i); }
  if (s().buildings.chesthouse) { game.try('upgradeBuilding', 'chesthouse'); for (let i = 0; i < 5; i++) game.try('unlockKeySlot', i); }
  // fällige Truhen im Schlüsselhaus abholen (nur in der Basis möglich)
  (s().keyhouse.slots || []).forEach((sl, i) => { if (sl && sl.chest && g.now() >= sl.chest.readyAt) { if (s().world.area !== 'base') game.try('returnHome'); game.try('claimChest', i); } });
};
let reserve = 0; // Gold, das für ein offenes Bauziel zurückgehalten wird
const quests = () => {
  reserve = 0;
  for (const { q, state } of currentQuests(g)) if (state === 'satisfied') game.try('claimQuest', q.id);
  for (const { q, state } of currentQuests(g)) { const o = q.obj[0]; if (state === 'active' && o.cond && o.cond.building) reserve = Math.max(reserve, c.get('buildings', o.cond.building).cost.gold || 0); }
  for (const { q, state } of currentQuests(g)) { const o = q.obj[0]; const uid = state !== 'active' ? null : o.cond && o.cond.upgrade ? o.cond.upgrade : o.counter && o.counter.startsWith('upgrade:ab_') ? o.counter.slice(8) : null; if (uid) { const pv = prog.upgradePreview(g, uid, 1); if (pv.next && pv.next.gold) reserve = Math.max(reserve, pv.next.gold); } }
  for (const { q, state } of currentQuests(g)) {
    if (state !== 'active') continue;
    const o = q.obj[0], t = questTarget(g, q);
    if (o.cond && o.cond.building) { const cost = c.get('buildings', o.cond.building).cost; if (Object.entries(cost).every(([i, n]) => (s().inv[i] || 0) >= n)) { if (!game.try('build', o.cond.building).ok && s().world.area !== 'base') game.try('returnHome'); } }
    else if (o.cond && o.cond.mainEquipped) spend();
    else if (o.cond && o.cond.upgrade) game.try('buyUpgrade', o.cond.upgrade, 1);
    else if (o.counter === 'heroLevel') game.try('heroLevelUp', s().heroes.active);
    else if (o.counter === 'heroStar') game.try('heroStarUp', s().heroes.active);
    else if (o.counter && o.counter.startsWith('upgrade:')) { const id = o.counter.slice(8); if (c.has('upgradeTracks', id)) game.try('buyUpgrade', id, 1); else for (const u of c.t.upgradeTracks) if (u.family === id && game.try('buyUpgrade', u.id, 1).ok) break; }
    else if (o.counter && o.counter.startsWith('gacha:')) game.try('openBox', o.counter.slice(6), 1);
    else if (o.counter === 'returnBase') game.try('returnHome');
    else if (t && (t.npc || t.char)) { const goal = game.questGoal(q); if (goal) { const p = game.world.p; if (Math.hypot(goal.x - p.x, goal.y - p.y) < 70) { const n = game.world.map.objects.find((x) => x.type === 'npc' && Math.hypot(x.x - goal.x, x.y - goal.y) < 5); if (n) game.try('talkNpc', n.id); } else { p.auto = false; game.world.goTo(goal.x, goal.y); return true; } } }
    else if (t && t.chest && sec0 >= chestPause) { const goal = game.questGoal(q); if (goal) { const p = game.world.p; if (Math.hypot(goal.x - p.x, goal.y - p.y) < 60 && ++chestWait > 15) { chestWait = 0; chestPause = sec0 + 900; continue; } p.auto = false; game.world.goTo(goal.x, goal.y); return true; } } // steht die Figur an der Truhe und bekommt sie nicht (Plätze voll), jagt sie erst 15 min weiter
  }
  return false;
};
for (let sec = 0; sec < HOURS * 3600; sec++) {
  for (let k = 0; k < 30; k++) { game.tick(1 / 30); clock.t += 1000 / 30; }
  game.drainEvents();
  const w = game.world, p = w.p;
  if (!p.alive) { deaths++; const k = (p.cur && p.cur.alive ? p.cur.v.name : p.tgt ? p.tgt.v.name : '?') + ' in ' + s().world.area; killers[k] = (killers[k] || 0) + 1; game.cmd('revive', 'base'); continue; }
  const walking = sec % 2 === 0 ? quests() : !!p.goal;
  if (!walking && !p.goal) p.auto = true;
  sec0 = sec;
  if (sec % 10 === 0) spend();
  for (const a of c.t.areas) if (a.chapter === 1 && s().world.cleared[a.id] && !cleared[a.id]) { cleared[a.id] = sec; console.log(log[log.length] = `${hhmm(sec)}  ${c.get('variants', a.boss).name} besiegt (${a.name}) · Level ${s().player.level} · Tode bisher ${deaths} · Kraft ${s().upgrades.ab_power || 0} · HP ${s().upgrades.ab_hp || 0} · Angriff ${g.stats.atk} · Leben ${g.stats.hp}`); }
  const done = Object.keys(s().quests.done).length;
  if (done !== lastDone) { lastDone = done; lastDoneT = sec; } else if (sec - lastDoneT === 1500) stuckNote = `${hhmm(sec)} seit 25 min keine Quest abgeschlossen; offen: ${currentQuests(g).map(({ q, obj }) => `${q.name} ${obj.map((o) => o.cur + '/' + o.need).join()}`).join(' | ')}`, console.log('  ! ' + stuckNote);
  if (cleared.a1_6) break;
}
const st = s();
console.log(`Ende nach ${hhmm((clock.t - t0) / 1000)} Spielzeit: Level ${st.player.level}, Tode ${deaths}, Quests ${Object.keys(st.quests.done).length}, Kills ${st.counters['kill:any'] || 0}, Gold verdient ${Object.values(st.totals.gold || {}).filter((v) => v > 0).reduce((a, b) => a + b, 0)}, Waffen ${st.weapons.list.length}, beste Seltenheit ${Math.max(0, ...st.weapons.list.map((x) => c.get('weapons', x.def).rarity))}`);
console.log('Tode nach Gegner: ' + Object.entries(killers).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('Offen: ' + currentQuests(g).map(({ q, obj }) => `${q.name} ${obj.map((o) => o.cur + '/' + o.need).join()}`).join(' | '));
