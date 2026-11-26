// Abnahmetests des Kerns. IDs (Txx) verweisen auf den Abnahmeplan der Systemanalyse (Abschnitt 20).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBaseContent } from '../src/core/content/base.js';
import { validateContent, fingerprint } from '../src/core/content/validate.js';
import { serialize, deserialize, saveTo } from '../src/core/state.js';
import * as econ from '../src/core/econ.js';
import * as prog from '../src/core/progress.js';
import * as gear from '../src/core/gear.js';
import * as modes from '../src/core/modes.js';
import { mk, memStore, code, T0 } from './helpers.js';

const DAY = 86400000;
const pack = buildBaseContent();
const sumGems = (rw) => rw.filter((e) => e.item === 'gems').reduce((a, e) => a + e.n, 0);

test('Content: gültig, stabiler Fingerprint, Referenzsummen (T02/T05/T13)', () => {
  assert.deepEqual(validateContent(pack), []);
  assert.equal(fingerprint(pack), fingerprint(buildBaseContent()));
  const T = pack.tables;
  assert.equal(T.areas.length, 20);
  assert.equal(T.areas.filter((a) => a.next).length, 19, '19 Gates');
  assert.equal(T.areas[19].next, null, 'kein Kapitel-4-Phantom');
  // Kapitel 1: 124 platzierte Spawnknoten (S1 11 · S2 36 · S3 32 · S4 16 · S5 12 · S6 17); Kapitel 2/3: 71/58 Spawngruppen
  assert.deepEqual([1, 2, 3].map((ch) => T.spawnGroups.filter((g) => T.areas.find((a) => a.id === g.area).chapter === ch).length), [124, 71, 58]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((s) => T.spawnGroups.filter((g) => g.area === `a1_${s}`).length), [11, 36, 32, 16, 12, 17]);
  assert.equal(T.giftSpawners.filter((g) => g.pos).length, 17);
  assert.equal(T.weapons.length, 84);
  assert.equal(new Set(T.weapons.map((w) => w.cls + w.series)).size, 12);
  assert.equal(T.runes.length, 115);
  assert.equal(T.towerFloors.length, 250);
  assert.equal(sumGems(T.towerFloors[150].first), 35, 'Etage 151 = 35 Gems');
  const tr = (id) => T.tracks.find((t) => t.id === id);
  assert.equal(tr('minimap').nodes.reduce((a, n) => a + sumGems(n.reward), 0), 4400);
  assert.equal(tr('minimap').nodes.filter((n) => sumGems(n.reward) > 0).length, 14);
  assert.equal([1, 2, 3].reduce((a, ch) => a + tr(`chapterpass_${ch}`).nodes.reduce((b, n) => b + sumGems(n.reward), 0), 0), 4000);
  const sd = tr('sevenDay').nodes.filter((n) => !n.milestone);
  assert.equal(sd.length, 71);
  assert.equal(sd.reduce((a, n) => a + sumGems(n.reward), 0), 4900);
  assert.equal(sd.filter((n) => sumGems(n.reward) === 100).length, 34);
  assert.equal(T.keyHouseSlots.reduce((a, r) => a + (r.cost.gems || 0), 0), 5570);
  assert.equal(tr('levelup').nodes.reduce((a, n) => a + n.reward.length, 0), 200, '200 Reward-Zeilen über 80 Meilensteine');
  assert.equal(T.giftChestLevels[0].gold, 12); assert.equal(T.giftChestLevels[399].gold, 1983356);
  assert.ok(T.keyHouseSlots.length === 15 && T.smithy.length === 8);
});

test('Content-Validator erkennt ungültige IDs, Kosten und Questzyklen (T18)', () => {
  const p = buildBaseContent();
  p.tables.spawnGroups[0].v = 'gibts_nicht';
  p.tables.shop[3].price = { gems: -5 };
  p.tables.quests[0].prereq = [p.tables.quests[2].id];
  p.tables.upgradeTracks[1].stat = 'unbekannt';
  const e = validateContent(p).join('\n');
  assert.match(e, /Variante gibts_nicht fehlt/); assert.match(e, /ungültig/); assert.match(e, /Zyklus/); assert.match(e, /Stat unbekannt/);
});

test('T04 XP: unter/auf/über Schwelle, Mehrfachlevel, Überschuss, Cap, Meilensteine einmalig, Blessing getrennt', () => {
  const { game, g, s } = mk();
  const need1 = prog.xpNeed(g, 1);
  prog.gainXp(g, need1 - 1, 'test'); assert.deepEqual([s().player.level, s().player.xp], [1, need1 - 1]);
  prog.gainXp(g, 1, 'test'); assert.deepEqual([s().player.level, s().player.xp], [2, 0]);
  const big = prog.xpNeed(g, 2) + prog.xpNeed(g, 3) + prog.xpNeed(g, 4) + 7;
  prog.gainXp(g, big, 'test'); assert.deepEqual([s().player.level, s().player.xp], [5, 7], 'mehrere Level, Überschuss bleibt');
  assert.equal(s().inv.exp || 0, 0, 'Account-XP berührt die Blessing-Währung nicht');
  assert.equal(s().totals['#xp'].test, need1 + big, 'XP-Quelle protokolliert');
  const got = game.cmd('claimNode', 'levelup', 'L5');
  assert.equal(sumGems(got), 10, 'Gems 2 x5');
  assert.equal(code(() => game.cmd('claimNode', 'levelup', 'L5')), 'already_claimed');
  assert.equal(code(() => game.cmd('claimNode', 'levelup', 'L10')), 'not_ready');
  prog.gainXp(g, 1e12, 'test');
  assert.equal(s().player.level, 400); assert.equal(s().player.xp, 0, 'Cap-Verhalten discard');
  const all = game.cmd('claimAll', 'levelup');
  assert.equal(sumGems(all), 79 * 10, 'kein Meilenstein übersprungen oder doppelt');
  assert.equal(all.find((e) => e.item === 'bluestone').n, 25);
  assert.equal(game.cmd('claimAll', 'levelup').length, 0);
  const re = mk({ state: deserialize(serialize(s())) });
  assert.equal(re.s().player.level, 400, 'Neustart behält Level');
  assert.equal(code(() => re.game.cmd('claimNode', 'levelup', 'L400')), 'already_claimed');
});

test('T05 Wallet/Ledger: jede Buchung registriert, keine negativen Stände, Rollback bei Fehler', () => {
  const { game, g, s, give } = mk();
  give('gems', 100);
  assert.equal(code(() => econ.add(g, 'gems', -101, 'x')), 'insufficient');
  assert.equal(code(() => econ.add(g, 'gems', 1.5, 'x')), 'bad_amount');
  assert.equal(code(() => econ.add(g, 'fantasie', 1, 'x')), 'bad_item');
  const sum = Object.values(s().totals.gems).reduce((a, b) => a + b, 0);
  assert.equal(sum, s().inv.gems, 'Summe aller Kanäle = Kontostand');
  // Minimap: 4.400 Gems, nie doppelt
  for (const a of pack.tables.areas) s().world.cleared[a.id] = 1;
  const before = s().inv.gems;
  game.cmd('claimAll', 'minimap');
  assert.equal(s().inv.gems - before, 4400);
  assert.equal(s().totals.gems['track:minimap'], 4400);
  game.cmd('claimAll', 'minimap');
  assert.equal(s().inv.gems - before, 4400);
  for (const ch of [1, 2, 3]) game.cmd('claimAll', `chapterpass_${ch}`);
  assert.equal(s().inv.gems - before, 8400);
  // Key House: Gem-Sink 5.570
  s().unlocks.keyhouse = 1; give('wood', 20); give('gems', 6000);
  const b2 = s().inv.gems;
  for (let i = 0; i < 15; i++) game.cmd('unlockKeySlot', i);
  assert.equal(b2 - s().inv.gems, 5570);
  assert.equal(-s().totals.gems['keyhouse:slot'], 5570);
});

test('T06 Shop: gesperrt, zu wenig Mittel, Limit/Doppelkauf, Tagesreset, Händlerrotation', () => {
  const { game, s, give, unlock, clock } = mk();
  assert.equal(code(() => game.cmd('buy', 'gem_9002')), 'locked');
  unlock('shop');
  assert.equal(sumGems(game.cmd('buy', 'gem_9002')), 15);
  assert.equal(code(() => game.cmd('buy', 'gem_9002')), 'sold_out', 'Doppeltap zahlt nicht doppelt');
  game.cmd('buy', 'gem_9003'); game.cmd('buy', 'gem_9004');
  assert.equal(s().inv.gems, 65);
  assert.equal(code(() => game.cmd('buy', 'stagepack_a1_1')), 'locked');
  assert.equal(code(() => game.cmd('buy', 'mat_keyw', 5)), 'insufficient');
  assert.equal(s().inv.gems, 65, 'kein Teilabzug');
  give('gems', 1000);
  game.cmd('buy', 'mat_keyw', 10);
  assert.equal(s().inv.key_warrior, 10);
  assert.equal(code(() => game.cmd('buy', 'mat_keyw', 1)), 'sold_out');
  const m1 = game.cmd('refreshMerchant', 'rot').st.offers.map((o) => o.id).join();
  clock.t += DAY; game.tick(1.1);
  game.cmd('buy', 'gem_9002');
  assert.equal(game.cmd('buy', 'mat_keyw', 1)[0].n, 1, 'Tagesreset');
  give('gold', 1e6);
  const off = game.g && (await0(game));
  assert.ok(off.st.offers.length === 4 && off.st.day > 0 && typeof m1 === 'string');
  const o = off.st.offers[0];
  for (let k = o.left; k > 0; k--) game.cmd('buyMerchant', 'rot', o.id);
  assert.equal(code(() => game.cmd('buyMerchant', 'rot', o.id)), 'sold_out');
});
function await0(game) { return game.cmd('refreshMerchant', 'rot'); }

test('T07 Truhen: volle Slots, Spawner-Respawn vs. Reveal, Neustart, Claim genau einmal', async () => {
  const { game, g, s, give, clock } = mk();
  const home = await import('../src/core/home.js');
  assert.equal(code(() => home.pickupChest(g, 'cs_a1_1')), 'locked');
  give('gold', 1000); game.cmd('build', 'chesthouse');
  assert.equal(code(() => home.pickupChest(g, 'cs_a1_1')), 'slots_full');
  game.cmd('unlockKeySlot', 0);
  const idx = home.pickupChest(g, 'cs_a1_1');
  assert.equal(code(() => home.pickupChest(g, 'cs_a1_1')), 'not_ready', 'Spawner noch nicht respawnt');
  assert.equal(code(() => game.cmd('claimChest', idx)), 'not_ready');
  clock.t += 601000; // Spawner-Respawn (600 s) abgelaufen, Slot aber belegt
  assert.equal(code(() => home.pickupChest(g, 'cs_a1_1')), 'slots_full');
  const re = mk({ state: deserialize(serialize(s())), t: clock.t + 1800000 });
  assert.ok(re.s().keyhouse.slots[idx].chest, 'Truhe überlebt Neustart');
  assert.ok(re.game.cmd('claimChest', idx).length >= 1);
  assert.equal(code(() => re.game.cmd('claimChest', idx)), 'empty');
  assert.equal(re.s().counters['chest:claim'], 1);
});

test('T08 Gacha: Kosten atomar, Pity, Meilensteine, deterministische Seeds, Raten 4001', () => {
  const a = mk({ seed: 7 }), b = mk({ seed: 7 });
  for (const x of [a, b]) { x.unlock('shop', 'heroShop', 'runes'); x.give('key_special_hero', 500); x.give('gems', 500000); }
  assert.equal(code(() => a.game.cmd('openBox', 'warrior', 3)), 'bad_amount');
  const r1 = a.game.cmd('openBox', 'warrior', 10), r2 = b.game.cmd('openBox', 'warrior', 10);
  assert.deepEqual(r1, r2, 'gleicher Seed -> gleiche Ergebnisse');
  assert.equal(r1.length, 10); assert.equal(a.s().weapons.list.length, 10);
  assert.equal(a.s().inv.gems, 500000 - 1000);
  const poor = mk(); poor.unlock('shop'); poor.give('gems', 950);
  assert.equal(code(() => poor.game.cmd('openBox', 'warrior', 10)), 'insufficient');
  assert.equal(poor.s().inv.gems, 950); assert.equal(poor.s().weapons.list.length, 0);
  // Special Hero Chest: Meilensteine 70/150/300, danach 340/380/420 ...
  const box = pack.tables.gachaBoxes.find((x) => x.id === 'special_hero');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((k) => gear.milestoneAt(box, k)), [70, 150, 300, 340, 380, 420, 460]);
  assert.equal(gear.milestoneAt(box, 3 + 60), null, 'max. 20 Wiederholungen');
  for (let k = 0; k < 34; k++) a.game.cmd('openBox', 'special_hero', 10);
  assert.equal(a.s().gacha.special_hero.opens, 340);
  assert.equal(a.s().inv.hero_select_ticket, 4);
  assert.equal(a.s().inv.key_special_hero, 160);
  // Featured Hero: Pity nach 50 Öffnungen ohne Top-Treffer
  for (let k = 0; k < 10; k++) a.game.cmd('openBox', 'hero', 10);
  assert.ok(a.s().gacha.hero.pity < 50);
  // Runentruhe: 10 Runen je Pull, Verteilung nahe 65/30/4/1
  const cnt = [0, 0, 0, 0, 0];
  for (let k = 0; k < 300; k++) a.game.cmd('openBox', 'rune_melee_basic', 1);
  for (const r of a.s().runes.list) cnt[pack.tables.runes.find((d) => d.id === r.def).rarity]++;
  assert.equal(a.s().runes.list.length, 3000);
  assert.ok(Math.abs(cnt[1] / 3000 - 0.65) < 0.04 && Math.abs(cnt[2] / 3000 - 0.30) < 0.04 && cnt[4] / 3000 < 0.03, cnt.join());
  const types = new Set(a.s().runes.list.map((r) => pack.tables.runes.find((d) => d.id === r.def).type));
  assert.deepEqual([...types].sort(), ['melee', 'universal']);
});

test('T09 Waffen: Schmiede, Slots, Merge schützt ausgerüstete/gesperrte Waffen, kein Downgrade', () => {
  const { game, g, s, give, unlock } = mk({ seed: 3 });
  unlock('craft', 'weaponVault'); give('gold', 1e9); give('weapon_scroll', 1e6);
  assert.equal(code(() => game.cmd('craft', 1)), 'locked');
  game.cmd('build', 'smithy');
  const made = game.cmd('craft', 50);
  assert.equal(made.length, 50); assert.ok(made.every((m) => m.weapon), 'Stufe 1: 100 % Normal-Waffe');
  assert.equal(s().counters.craft, 50);
  const def = 'w_sword_n_0';
  const ws = () => s().weapons.list.filter((w) => w.def === def);
  while (ws().length < 4) gear.addWeapon(g, def);
  const [w1, w2, w3, w4] = ws();
  game.cmd('equipWeapon', w1.uid, 0);
  assert.equal(code(() => game.cmd('equipWeapon', w2.uid, 1)), 'slot_locked');
  game.cmd('weaponLevelUp', w2.uid, 4);
  game.cmd('toggleWeaponLock', w3.uid); game.cmd('toggleWeaponLock', w4.uid);
  for (const w of s().weapons.list) if (w.def === def && ![w1.uid, w2.uid, w3.uid, w4.uid].includes(w.uid)) game.cmd('toggleWeaponLock', w.uid);
  assert.equal(code(() => game.cmd('mergeWeapon', w1.uid)), 'cannot_merge', 'gesperrtes Duplikat wird nicht verbraucht');
  game.cmd('toggleWeaponLock', w3.uid);
  game.cmd('mergeWeapon', w1.uid);
  const m = s().weapons.list.find((w) => w.uid === w1.uid);
  assert.equal(m.def, 'w_sword_n_1'); assert.equal(m.level, 5, 'höchstes Level bleibt');
  assert.equal(s().weapons.slots[0], w1.uid, 'bleibt ausgerüstet');
  assert.ok(!s().weapons.list.some((w) => [w2.uid, w3.uid].includes(w.uid)));
  // Smithy-Upgrade auf Stufe 2 kostet 20 Gold (dokumentiert) und ändert die Raten
  const g0 = s().inv.gold; game.cmd('upgradeBuilding', 'smithy'); assert.equal(g0 - s().inv.gold, 20);
  const res = game.cmd('craft', 100);
  assert.ok(res.some((r) => r.item === 'weapon_scroll'), 'Sonstiges-Ausgang (40 %, eigener Wert)');
  // mergeAll fasst nur freie Duplikate zusammen
  const eq = s().weapons.slots[0]; game.cmd('mergeAll');
  assert.ok(s().weapons.list.some((w) => w.uid === eq));
});

test('T10 Helden: Level, Sterne, Wechsel, Collection nicht doppelt, nicht verfügbare Evolution', () => {
  const { game, g, s, give, unlock } = mk();
  unlock('heroes', 'heroEvolution', 'heroCollection'); give('evo_coin', 1e6);
  const base = game.stats.atk;
  game.cmd('heroLevelUp', 'h_01', 9);
  assert.equal(s().heroes.owned.h_01.level, 10); assert.ok(game.stats.atk >= base);
  give('piece:h_02', 10 + 10); game.cmd('unlockHero', 'h_02');
  assert.equal(code(() => game.cmd('unlockHero', 'h_02')), 'already');
  const withColl = game.stats.atk;
  game.cmd('setActiveHero', 'h_02'); game.cmd('setActiveHero', 'h_01'); game.cmd('setActiveHero', 'h_02'); game.cmd('setActiveHero', 'h_01');
  assert.equal(game.stats.atk, withColl, 'Umschalten vervielfacht keine globalen Boni');
  give('piece:h_01', 10);
  game.cmd('heroStarUp', 'h_01'); assert.equal(s().heroes.owned.h_01.star, 2);
  give('piece:h_freyja', 80); game.cmd('unlockHero', 'h_freyja');
  assert.equal(code(() => game.cmd('heroStarUp', 'h_freyja')), 'unavailable');
  assert.equal(code(() => game.cmd('setActiveHero', 'h_03')), 'locked');
  // Mehrheldenmodus: Stats eines anderen Helden enthalten dessen Werte, nicht die Summe
  const a = prog.computeStats(g, { heroId: 'h_01' }), b = prog.computeStats(g, { heroId: 'h_02' });
  assert.notEqual(a.atk, b.atk);
});

test('T11 Traits (Sperren, Preset) und Runen (Ausrüsten, Leveln, Zerlegen, Tomb)', () => {
  const { game, g, s, give, unlock } = mk({ seed: 9 });
  unlock('traits', 'runes', 'tomb'); give('attr_point', 10000); give('rune_dust', 1e6); give('bluestone', 1000);
  game.cmd('rollTraits');
  const slots = () => s().traits.presets[s().traits.active].slots;
  const keep = { ...slots()[0] };
  game.cmd('toggleTraitLock', 0);
  assert.equal(gear.traitRollCost(g).cost.attr_point, 15, 'Lock-Aufschlag vor Bestätigung sichtbar');
  for (let k = 0; k < 20; k++) game.cmd('rollTraits');
  assert.deepEqual({ ...slots()[0], lock: false }, { ...keep, lock: false }, 'gesperrter Slot unverändert');
  const st1 = JSON.stringify(game.stats);
  game.cmd('setTraitPreset', 1); assert.equal(slots()[0], null);
  game.cmd('setTraitPreset', 0); assert.equal(JSON.stringify(game.stats), st1, 'Presetwechsel ohne Mehrfacheffekt');
  for (let k = 0; k < 5; k++) game.cmd('toggleTraitLock', k === 0 ? 1 : k), k === 0 && 0;
  // Runen
  const r = gear.addRune(g, 'r_universal_1_0'), r2 = gear.addRune(g, 'r_universal_1_0');
  const dmg0 = game.stats.dmgPct;
  game.cmd('equipRune', r.uid, 0);
  assert.ok(game.stats.dmgPct > dmg0, 'Rune wirkt im Kampfwert, nicht nur im Tooltip');
  assert.equal(code(() => game.cmd('equipRune', r2.uid, 1)), 'slot_locked');
  game.cmd('runeLevelUp', r.uid, 9); assert.equal(s().runes.list[0].level, 10);
  assert.equal(code(() => game.cmd('runeLevelUp', r.uid, 1)), 'max_level');
  assert.equal(code(() => game.cmd('dismantleRunes', [r.uid])), 'needs_confirm');
  const d0 = s().inv.rune_dust;
  game.cmd('dismantleRunes', [r.uid], true);
  assert.ok(s().inv.rune_dust > d0); assert.equal(s().runes.loadouts.h_01[0], null);
  // Tomb: Session -> Abschluss liefert Runen und Dust genau einmal
  const n0 = s().runes.list.length;
  game.cmd('startMode', 'tomb', 1);
  assert.equal(s().inv.ticket_tomb, 2);
  const out = game.cmd('completeMode', { win: true });
  assert.ok(out.rewards.some((e) => e.rune) && s().runes.list.length > n0);
  assert.equal(code(() => game.cmd('completeMode', { win: true })), 'no_session');
  assert.equal(code(() => game.cmd('startMode', 'tomb', 3)), 'locked');
});

test('T12 Upgrade-Pfade: Power-Stützzeilen, Mehrwährung, Max-Affordable, Cap, alle Familien', () => {
  const { game, g, s, give, unlock } = mk();
  const power = prog.upDef(g, 'ab_power');
  for (const [lv, eff, gold] of [[1, 2, 10], [2, 3, 34], [4, 5, 120], [7, 8, 271], [106, 758, 3745], [334, 4149, 32272], [999, 48409, 1331790], [1282, 84228, 7234109]]) {
    assert.equal(prog.effAt(power, lv), eff); assert.equal(prog.costAt(power, lv).gold, gold);
  }
  assert.deepEqual(prog.costAt(power, 572), { gold: 503809, orb_jungle: 1 });
  assert.equal(prog.costAt(power, 1282).orb_hell, 30);
  assert.equal(code(() => game.cmd('buyUpgrade', 'ab_power', 1)), 'locked');
  unlock('abilities', 'special', 'extra', 'soul', 'blessing', 'traits');
  assert.equal(code(() => game.cmd('buyUpgrade', 'ab_power', 1)), 'insufficient');
  give('gold', 10 + 34 + 5);
  const pv = game.cmd('buyUpgrade', 'ab_power', 'max');
  assert.equal(pv.to, 2); assert.equal(s().inv.gold, 5, 'Max-Affordable kauft nie über Budget');
  assert.equal(game.stats.atk, Math.round((3 + 3) * (1 + 0.05)));
  for (const it of pack.tables.items) give(it.id, 1e15);
  for (const u of pack.tables.upgradeTracks) {
    game.cmd('buyUpgrade', u.id, 'max');
    assert.equal(s().upgrades[u.id], u.max, u.id);
    assert.equal(code(() => game.cmd('buyUpgrade', u.id, 1)), 'max_level');
  }
  const fam = (f) => pack.tables.upgradeTracks.filter((u) => u.family === f);
  assert.deepEqual(['ability', 'special', 'extra', 'soul', 'blessing'].map((f) => fam(f).length), [10, 11, 8, 9, 3]);
  assert.deepEqual(fam('blessing').map((u) => prog.effAt(u, 50)), [150, 350, 300]);
  assert.ok(game.stats.critChance <= 100);
  assert.ok(s().totals.exp['upgrade:blessing'] < 0, 'Blessings kosten EXP, nicht Gold');
});

test('T13/T14 Tower: Erstabschluss vs. Wiederholung, Tickets, Wiederaufnahme ohne Doppelkosten', () => {
  const { game, s, unlock } = mk();
  assert.equal(code(() => game.cmd('startMode', 'tower', 1)), 'locked');
  unlock('tower');
  assert.equal(code(() => game.cmd('startMode', 'tower', 2)), 'locked');
  game.cmd('startMode', 'tower', 1);
  assert.equal(s().inv.ticket_tower, 4);
  const re = mk({ state: deserialize(serialize(s())) });
  assert.equal(re.game.cmd('startMode', 'tower', 1).resumed, true);
  assert.equal(re.s().inv.ticket_tower, 4, 'Neustart-Recovery ohne erneutes Ticket');
  assert.equal(code(() => re.game.cmd('startMode', 'tower', 2)), 'session_active');
  const first = re.game.cmd('completeMode', { win: true });
  assert.ok(first.first && sumGems(first.rewards) === 5);
  re.game.cmd('startMode', 'tower', 1);
  const rep = re.game.cmd('completeMode', { win: true });
  assert.ok(!rep.first && sumGems(rep.rewards) === 0, 'kein erneuter First-Clear-Reward');
  re.game.cmd('startMode', 'tower', 2); re.game.cmd('abortMode');
  assert.equal(re.s().modes.tower.best, 1); assert.equal(re.s().inv.ticket_tower, 2);
  re.game.cmd('startMode', 'tower', 2);
  assert.equal(re.game.cmd('completeMode', { win: false }).rewards.length, 0);
});

test('T14 PvP/Invasion/Raid: deterministisches Duell, Rating, Bank, Verteidigung, Saison', () => {
  const a = { name: 'A', atk: 100, aps: 1.5, hp: 5000, crit: 10, critDmg: 150, ls: 0 }, b = { ...a, name: 'B', atk: 60 };
  assert.deepEqual(modes.simulateDuel(a, b, 42), modes.simulateDuel(a, b, 42));
  assert.equal(modes.simulateDuel(a, b, 42).win, true); assert.equal(modes.simulateDuel(b, a, 42).win, false);
  const { game, g, s, unlock, clock, give } = mk();
  unlock('pvp', 'invasion', 'raid');
  const opp = modes.opponents(g, 'pvp')[0];
  assert.ok(opp.bot && /^BOT/.test(opp.name), 'Bots sind als Bots gekennzeichnet');
  const r0 = s().modes.pvp.rating, res = game.cmd('fight', 'pvp', opp.id);
  assert.equal(s().inv.ticket_pvp, 4); assert.notEqual(s().modes.pvp.rating, r0); assert.equal(res.bot, true);
  for (let k = 0; k < 4; k++) game.cmd('fight', 'pvp', modes.opponents(g, 'pvp')[0].id);
  assert.equal(code(() => game.cmd('fight', 'pvp', opp.id)), 'insufficient');
  game.cmd('setDefense');
  clock.t += 5 * 3600000;
  assert.equal(modes.bankAmount(g), 100);
  assert.equal(game.cmd('collectBank'), 100); assert.equal(s().inv.invasion_coin, 100);
  clock.t += DAY; game.tick(1.1);
  assert.equal(s().modes.invasion.history.filter((h) => h.type === 'defense').length, 3, 'tägliche Bot-Angriffe auf den Snapshot');
  const io = modes.opponents(g, 'invasion')[0];
  game.cmd('fight', 'invasion', io.id, { auto: true });
  assert.equal(s().counters['invasion:auto'], 1);
  const season = s().modes.invasion.season;
  clock.t += 8 * DAY; game.tick(1.1);
  assert.equal(s().modes.invasion.season, season + 1); assert.ok(s().modes.invasion.last.rewards.length);
  // Raid: Boss des Tages, Schadenswertung, Tiers genau nach Schwelle
  const boss = modes.raidBossOfDay(g), other = pack.tables.raidBosses.find((x) => x.id !== boss.id);
  assert.equal(code(() => game.cmd('startMode', 'raid', other.id)), 'locked');
  give('ticket_raid', 2);
  game.cmd('startMode', 'raid', boss.id);
  const hp = modes.modeSpec(g, s().modes.session).bossHp;
  const out = game.cmd('completeMode', { win: true, dmg: hp * 0.25 });
  assert.equal(out.rewards.filter((e) => e.item === 'raid_coin').length, 2, 'Tiers 5 % und 20 % erreicht');
  assert.equal(s().modes.raid.best[boss.id], Math.floor(hp * 0.25));
});

test('T15 Zeitlogik: UTC-Tageswechsel, Uhr zurückstellen, Wochenreset, Login-Zyklus, 7-Day-Tage', () => {
  const { game, g, s, unlock, clock } = mk();
  unlock('shop', 'missions', 'sevenDay');
  game.cmd('buy', 'gem_9002'); game.cmd('claimNode', 'login', 'd1');
  clock.t -= 3 * DAY; game.tick(1.1);
  assert.equal(code(() => game.cmd('buy', 'gem_9002')), 'sold_out', 'Uhr zurückstellen erzeugt keinen neuen Claim');
  clock.t += 3 * DAY;
  clock.t = (Math.floor(clock.t / DAY) + 1) * DAY - 500; game.tick(1.1);
  assert.equal(code(() => game.cmd('buy', 'gem_9002')), 'sold_out', 'kurz vor Mitternacht UTC');
  clock.t += 1000; game.tick(1.1);
  game.cmd('buy', 'gem_9002');
  assert.equal(s().counters.login, 2);
  game.cmd('claimNode', 'login', 'd2');
  assert.equal(code(() => game.cmd('claimNode', 'login', 'd3')), 'not_ready');
  // 7-Day: Tag-2-Mission erst ab Tag 2, Login-Mission zählt Aktivierungstag
  const sd = econ.trackDef(g, 'sevenDay'), ts = econ.trackActive(g, sd);
  assert.equal(econ.nodeState(g, sd, sd.nodes[0], ts), 'ready');
  assert.equal(econ.nodeState(g, sd, sd.nodes[1], ts), 'open');
  clock.t += DAY; game.tick(1.1);
  assert.equal(econ.nodeState(g, sd, sd.nodes[1], econ.trackActive(g, sd)), 'ready');
  clock.t += 20 * DAY; game.tick(1.1);
  assert.equal(econ.nodeState(g, sd, sd.nodes[2], econ.trackActive(g, sd)), 'expired');
  assert.ok(s().period.week > 0 && Object.keys(s().period.weekly.c).length <= 2);
});

test('T17 Persistenz: Prüfsumme, korrupter Slot -> Backup, Migration, Befehls-Rollback', () => {
  const store = memStore(), a = mk({ store });
  a.give('gems', 123); a.game.save();
  a.give('gems', 1); a.game.save();
  const meta = JSON.parse(store.get('xphero.save.meta'));
  store.set(`xphero.save.${meta.slot}`, store.get(`xphero.save.${meta.slot}`).replace('"sum":"', '"sum":"x'));
  const b = mk({ store });
  assert.equal(b.game.recovered, true); assert.equal(b.s().inv.gems, 123, 'fällt auf den älteren gültigen Slot zurück');
  assert.throws(() => deserialize('{"sum":"1","body":"{}"}'));
  const old = JSON.parse(JSON.stringify(a.s())); old.v = 1; delete old.codes; delete old.sync;
  const c = mk({ state: old });
  assert.equal(c.s().v, 2); assert.deepEqual(c.s().codes, {});
  const fut = JSON.parse(JSON.stringify(a.s())); fut.v = 99;
  assert.throws(() => mk({ state: fut }), /neuerer Version/);
  // Fehler mitten im Befehl: Zustand vollständig zurückgesetzt
  const before = serialize(a.s());
  assert.equal(code(() => a.game.cmd('grantExternal', 'boom', [{ item: 'gems', n: 5 }, { item: 'gibtsnicht', n: 1 }])), 'bad_item');
  assert.equal(serialize(a.s()), before);
  a.game.cmd('grantExternal', 'once', [{ item: 'gems', n: 5 }]);
  assert.equal(code(() => a.game.cmd('grantExternal', 'once', [{ item: 'gems', n: 5 }])), 'already_claimed', 'doppelter Netzwerk-Grant idempotent');
  saveTo(store, a.s());
});

test('T19 Simulation unabhängig von der Render-FPS (30/60/120)', () => {
  const run = (fps) => {
    const { game, clock, unlock } = mk({ seed: 5 });
    unlock('tower'); game.cmd('startMode', 'tower', 1);
    while (game.steps < 240 && !game.world.ended) { game.tick(1 / fps); clock.t += 1000 / fps; }
    const w = game.world;
    return JSON.stringify([game.steps, w.p.x.toFixed(3), w.p.y.toFixed(3), Math.round(w.p.hp), w.dmgDealt, w.enemies.map((e) => [e.hp, e.x.toFixed(2)])]);
  };
  const a = run(30);
  assert.equal(run(60), a); assert.equal(run(120), a);
});
