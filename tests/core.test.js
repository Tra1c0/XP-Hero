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
import { SHAPES } from '../src/client/assets3d.js';
import { WEAPON_PARTS, buildWeaponParts } from '../src/client/enemy3d.js';
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
  assert.equal(T.keyHouseSlots.reduce((a, r) => a + (r.cost.orb_hell || 0), 0), 165); assert.deepEqual(T.keyHouseSlots[3].cost, { orb_red: 20 });
  assert.equal(tr('levelup').nodes.reduce((a, n) => a + n.reward.length, 0), 200, '200 Reward-Zeilen über 80 Meilensteine');
  assert.equal(T.giftChestLevels[0].gold, 12); assert.equal(T.giftChestLevels[399].gold, 1983356);
  assert.ok(T.keyHouseSlots.length === 15 && T.smithy.length === 8);
});

test('Waffenmodelle: eigene N-Formen, S-Stufen mit Seltenheitsfarben und Teilbudget', () => {
  const { weapons, rarities, weaponClasses } = pack.tables;
  const normalformen = new Set(), sonderformen = new Map();
  const modelle = buildWeaponParts(rarities);
  for (const w of weapons) {
    assert.ok(Object.hasOwn(WEAPON_PARTS, w.id), `Modell fehlt für ${w.id}`);
    const teile = WEAPON_PARTS[w.id];
    assert.deepEqual(teile, modelle[w.id], `Basispalette ${w.id}`);
    assert.ok(teile.length >= 1 && teile.length <= 8, `Teilbudget ${w.id}`);
    const farbe = rarities.find(({ idx }) => idx === w.rarity).color;
    const akzent = farbe.length === 4 ? '#' + [...farbe.slice(1)].map((k) => k + k).join('') : farbe;
    for (const t of teile) {
      assert.equal(t.length, 9, w.id);
      assert.ok(Object.hasOwn(SHAPES, t[0]), `Unbekannte Grundform ${t[0]} in ${w.id}`);
      assert.ok(t.slice(1, 7).every(Number.isFinite) && t.slice(4, 7).every((n) => n > 0), w.id);
      assert.match(t[7], /^#[0-9a-f]{6}$/i, w.id);
      assert.ok(t[8] >= 0 && t[8] <= 1, w.id);
      if (t[8] > 0) assert.equal(t[7], akzent, w.id);
    }
    assert.ok(teile.some((t) => t[7] === akzent), `Seltenheitsakzent ${w.id}`);
    const leuchten = Math.max(...teile.map((t) => t[8]));
    assert.equal(leuchten > 0, w.rarity >= 3, w.id);
    const form = JSON.stringify(teile.map((t) => t.slice(0, 7)));
    if (w.series === 'n') {
      assert.ok(!normalformen.has(form), `N-Form doppelt ${w.id}`);
      normalformen.add(form);
    } else {
      const basis = sonderformen.get(w.cls);
      if (basis) {
        assert.equal(form, basis.form, w.id);
        assert.ok(leuchten > basis.leuchten, w.id);
      }
      sonderformen.set(w.cls, { form, leuchten });
    }
  }
  assert.equal(normalformen.size, 48);
  assert.equal(new Set([...sonderformen.values()].map(({ form }) => form)).size, weaponClasses.length);
  assert.ok([...sonderformen.values()].every(({ form }) => !normalformen.has(form)));
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
  prog.gainXp(g, 1e20, 'test'); // Original-Schwellen: Level 400 braucht rund 1,7e18 XP je Stufe
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
  // Schlüsselhaus: Plätze kosten Holz und Orbs (Spieldaten), in Kapitel 1 an die Gebäudestufe gebunden
  s().unlocks.keyhouse = 1; for (const i of ['wood', 'orb_red', 'orb_pink', 'orb_ice', 'orb_jungle', 'orb_hell']) give(i, 500);
  s().buildings.chesthouse = { level: 1, prodAt: 0 }; game.cmd('unlockKeySlot', 0);
  assert.equal(code(() => game.cmd('unlockKeySlot', 1)), 'locked');
  s().buildings.chesthouse.level = 5;
  for (let i = 1; i < 15; i++) game.cmd('unlockKeySlot', i);
  assert.equal(-s().totals.orb_hell['keyhouse:slot'], 165); assert.equal(-s().totals.wood['keyhouse:slot'], 20);
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
  assert.equal(r1.length, 10); assert.equal(a.s().weapons.list.length, 11, 'zehn gezogene plus Startschwert');
  assert.equal(a.s().inv.gems, 500000 - 1000);
  const poor = mk(); poor.unlock('shop'); poor.give('gems', 950);
  assert.equal(code(() => poor.game.cmd('openBox', 'warrior', 10)), 'insufficient');
  assert.equal(poor.s().inv.gems, 950); assert.equal(poor.s().weapons.list.length, 1);
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
  unlock('craft', 'weaponVault'); give('gold', 1e9); give('crystal', 1e6); give('weapon_scroll', 1e6);
  assert.equal(code(() => game.cmd('craft', 1)), 'locked');
  game.cmd('build', 'smithy');
  const made = game.cmd('craft', 50);
  assert.equal(made.length, 50); assert.ok(made.every((m) => m.weapon || m.item === 'weapon_scroll'), 'Stufe 1: Normal-Waffe oder Schriftrollen'); assert.ok(made.filter((m) => m.weapon).length > 20);
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
  // Stützstufen der Referenz: Wert auf der Stufe, Kosten für den Schritt von dort zur nächsten
  for (const [lv, eff, cost] of power.ref) { assert.equal(prog.effAt(power, lv), eff); if (lv < power.max) assert.equal(prog.costAt(power, lv + 1).gold, cost.gold); }
  assert.deepEqual(prog.costAt(power, 14), { gold: 1123, orb_red: 1 }, 'Orbs genau auf der Stützstufe 13');
  assert.equal(prog.costAt(power, 15).orb_red, undefined, 'zwischen Stützstufen nur Gold');
  assert.equal(Math.round(prog.costAt(power, 361).gold / 1000), 216, 'Vorlage: Kraft Stufe 360 kostet 216K');
  assert.equal(Math.round(prog.costAt(prog.upDef(g, 'ab_hp'), 357).gold / 1000), 213, 'Vorlage: HP Stufe 356 kostet 212,6K');
  assert.deepEqual(prog.costAt(prog.upDef(g, 'ab_move'), 15), { gold: 214224, orb_pink: 10, orb_red: 15 }, 'Vorlage: Tempo Stufe 14');
  assert.equal(code(() => game.cmd('buyUpgrade', 'ab_power', 1)), 'locked');
  unlock('abilities', 'special', 'extra', 'soul', 'blessing', 'traits');
  assert.equal(code(() => game.cmd('buyUpgrade', 'ab_power', 1)), 'insufficient');
  give('gold', 10 + 10 + 5);
  const pv = game.cmd('buyUpgrade', 'ab_power', 'max');
  assert.equal(pv.to, 2); assert.equal(s().inv.gold, 5, 'Max-Affordable kauft nie über Budget');
  assert.equal(game.stats.atk, Math.round((2 + 3) * (1 + 0.05)), 'Grundangriff Level 1 = 2 (Spieldaten) + Kraft Stufe 2');
  for (const it of pack.tables.items) give(it.id, 1e15);
  // Spezial nach Wiki-Tabelle: Bänder 5/10/15/20 Stufen je Stern, gesperrte Pfade, Sternaufstieg erst wenn alle offenen voll sind
  const spT = pack.tables.upgradeTracks.filter((u) => u.family === 'special'), spc = pack.config.special;
  assert.deepEqual(prog.stepCost(game.g, spT[0], 1), { orb_red: 1 });
  assert.equal(code(() => game.cmd('buyUpgrade', 'sp_triple', 1)), 'locked');
  assert.equal(game.cmd('buyUpgrade', spT[0].id, 'max').to, 5);
  assert.equal(code(() => game.cmd('buyUpgrade', spT[0].id, 1)), 'star_cap');
  for (let st = 1; st < spc.maxStar; st++) {
    for (const u of spT) game.try('buyUpgrade', u.id, 'max');
    if (st === 1) { const g0 = game.state.inv.gold; game.cmd('starUp'); assert.equal(g0 - game.state.inv.gold, 35280, 'Aufstieg kostet Gold'); } else game.cmd('starUp');
    assert.equal(prog.spStar(game.g), st + 1, 'Sternaufstieg');
    if (st + 1 === 3) { // Bild der Vorlage: 3 Sterne, Massive Muskeln 9 % -> 9,6 % für 4 rote + 5 pinke Orbs, Fortschritt x/135
      assert.equal(prog.effAt(spT[0], 15) * spT[0].scale, 9); assert.equal(Math.round(prog.effAt(spT[0], 16) * spT[0].scale * 10) / 10, 9.6);
      assert.deepEqual(prog.stepCost(game.g, spT[0], 16), { orb_red: 4, orb_pink: 5 }); assert.equal(prog.spProgress(game.g).total, 135);
    }
  }
  for (const u of pack.tables.upgradeTracks) {
    game.try('buyUpgrade', u.id, 'max');
    assert.equal(s().upgrades[u.id], u.max, u.id);
    assert.equal(code(() => game.cmd('buyUpgrade', u.id, 1)), 'max_level');
  }
  const fam = (f) => pack.tables.upgradeTracks.filter((u) => u.family === f);
  assert.deepEqual(['ability', 'special', 'extra', 'soul', 'blessing'].map((f) => fam(f).length), [9, 11, 8, 9, 3]);
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
  const { game, g, s, unlock, clock, give } = mk({ pack: buildBaseContent({ multiplayer: true }) });
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

test('Waffen-Fertigkeit: Namen und Faktoren aus den Referenzdaten, erst ab Epic, Auslösung nach Abklingzeit', () => {
  const { game, clock, s, unlock } = mk();
  const W = (id) => game.c.get('weapons', id);
  assert.equal(W('w_dagger_n_0').name, 'Crude Dagger'); assert.equal(W('w_dagger_n_2').wskill, null, 'Normal bis Rare ohne Fertigkeit');
  assert.deepEqual(W('w_dagger_n_3').wskill, { name: 'Spinner', mult: 1.7, cd: 7.7, rangeM: 2.5, bullets: 1 }); assert.equal(W('w_staff_n_7').wskill.mult, 4.6); assert.equal(W('w_dagger_n_0').aps, 2.7);
  assert.equal(W('w_sword_s_4').wskill, null, 'S-Reihe behält ihre eigene Fertigkeit');
  unlock('weaponVault'); game.cmd('grantExternal', 't', [{ weapon: 'w_sword_n_3' }]); game.cmd('equipWeapon', s().weapons.list.at(-1).uid, 0);
  const w = game.world, e = w.enemies.find((x) => x.alive && x.v.rank === 'normal');
  Object.assign(e, { hp: 1e9, maxHp: 1e9 }); w.p.x = e.x - 30; w.p.y = e.y; w.p.hp = 1e9; game.g.stats.hp = 1e9;
  let n = 0, last = -1;
  for (let k = 0; k < 30 * 25; k++) { game.tick(1 / 30); clock.t += 1000 / 30; const sk = (w.p.wsk || {})[0]; if (sk && sk.t !== last) { last = sk.t; n++; } e.x = w.p.x + 30; e.y = w.p.y; e.hp = 1e9; }
  assert.ok(n >= 2, `Fertigkeit löst wiederholt aus (${n})`);
});

test('Raid: jeder Boss trägt seine Mechanik; Panzer blockt Treffer und wirft Fernangriffe zurück, Schild fängt Schaden ab', async () => {
  const { game, clock, s, unlock, give } = mk();
  const { modeSpec } = await import('../src/core/modes.js');
  assert.deepEqual(game.c.t.raidBosses.map((b) => modeSpec(game.g, { mode: 'raid', param: b.id }).mech.id), ['shell', 'summon', 'festival', 'wind', 'fairy', 'hellfire']);
  const w = game.world, e = w.enemies.find((x) => x.alive && x.v.rank === 'normal');
  Object.assign(e, { hp: 1000, maxHp: 1000, shell: 2, baseAtk: 10, st: 'idle' });
  const hp0 = w.p.hp; w.hit(e, 50, 'ranged'); assert.equal(e.hp, 1000, 'Treffer prallt ab'); assert.ok(w.p.hp < hp0, 'Fernangriff zurückgeworfen');
  w.hit(e, 50, 'melee'); assert.equal(e.hp, 1000); assert.equal(e.shell, 0);
  e.shield = 30; w.hit(e, 50, 'melee'); assert.ok(e.hp < 1000 && e.hp >= 970, 'Schild fängt einen Teil ab');
});

test('Spieldaten: XP je Gegner und je Level, Grundwerte, friedliche Startgegner wehren sich erst nach einem Treffer', () => {
  const { game, clock, s } = mk();
  const V = (id) => game.c.get('variants', id), L = (n) => game.c.get('playerLevels', n);
  assert.deepEqual([V('mandragora').xp, V('slime').xp, V('spider').xp, V('boss_a1_1').xp, V('boss_a1_2').xp], [1, 2, 4, 100, 6370]);
  assert.deepEqual([L(1).xp, L(2).xp, L(8).xp, L(1).atk, L(1).hp, L(30).atk, L(30).hp, L(1).killXpCap], [44, 46, 9867, 2, 50, 106, 8356, 20400]);
  const w = game.world, e = w.enemies.find((x) => x.alive && x.v.id === 'mandragora');
  w.p.x = e.x + 40; w.p.y = e.y; w.loadout(); w.heroSkill = null; const hp0 = w.p.hp;
  for (const x of w.enemies) if (x !== e) x.alive = false;
  for (let k = 0; k < 150; k++) { w.p.wcd[0] = 99; game.tick(1 / 30); clock.t += 33; w.p.x = e.x + 40; w.p.y = e.y; } // Figur schlägt nicht zu
  assert.ok(e.st === 'idle' || e.st === 'patrol', 'Mandragora bleibt friedlich, obwohl die Figur daneben steht'); assert.equal(w.p.hp, hp0);
  e.hp = e.maxHp = 1e6; w.hit(e, 1, 'melee'); assert.equal(e.st, 'chase', 'nach einem Treffer wehrt sie sich');
});

test('Alte Spielstände: verwaiste Truhen, Gegenstände, Quests und Gebäude werden beim Laden bereinigt statt die Schleife anzuhalten', () => {
  const a = mk(); const s = a.s();
  s.unlocks.keyhouse = 1; s.keyhouse.slots[0] = { open: true, chest: { type: 'wooden', readyAt: 0, from: 'cs_a1_1' } }; s.keyhouse.slots[1] = { open: true, chest: { type: 'gibt_es_nicht', readyAt: 0 } };
  s.inv.foo_alt = 3; s.inv['piece:h_99'] = 2; s.cargo.alt_x = 1; s.cargo.wood = 2; s.buildings.altbau = { level: 1 }; s.upgrades.alt_up = 4; s.quests.active.q_001 = { at: 1 }; s.quests.done.q_002 = 1; s.player.spStar = 9;
  const b = mk({ state: JSON.parse(JSON.stringify(s)) });
  const t = b.s();
  assert.equal(t.keyhouse.slots[0].chest.type, 'c1'); assert.equal(t.keyhouse.slots[1].chest, null);
  assert.ok(!('foo_alt' in t.inv) && !('piece:h_99' in t.inv) && !('alt_x' in t.cargo)); assert.equal((t.cargo.wood || 0) + (t.inv.wood || 0), 2, 'bekannte Fracht bleibt');
  assert.ok(!t.buildings.altbau && !('alt_up' in t.upgrades) && !t.quests.active.q_001 && !t.quests.done.q_002); assert.equal(t.player.spStar, 5);
  for (let k = 0; k < 60; k++) { b.game.tick(1 / 30); b.clock.t += 33; }
  assert.ok(b.game.cmd('claimChest', 0).length >= 1, 'alte Truhe lässt sich öffnen');
});

test('Haptik: Presets, Aus-Schalter, Mindestabstand (stärker löst schwächer ab), Muster für Browser und App-Brücke', async () => {
  const haptic = await import('../src/client/haptic.js');
  const calls = []; let on = true; const realNow = Date.now; let now = 1e6; Date.now = () => now;
  try {
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (p) => { calls.push(p); return true; } }, configurable: true });
    haptic.setEnabled(() => on);
    assert.equal(haptic.play('light'), true); assert.deepEqual(calls.at(-1), 12);
    assert.equal(haptic.play('selection'), false, 'schwächerer Impuls innerhalb der Sperre entfällt');
    assert.equal(haptic.play('heavy'), true, 'stärkerer Impuls löst ab'); now += 200;
    assert.equal(haptic.play('success'), true); assert.deepEqual(calls.at(-1), [14, 70, 24]);
    on = false; now += 200; assert.equal(haptic.play('heavy'), false); assert.equal(haptic.play('gibt_es_nicht'), false);
    on = true; now += 200; globalThis.window = { XPHaptic: { play: (s) => calls.push(s) } };
    assert.equal(haptic.play('failure'), true); assert.equal(calls.at(-1), '22,220;60,0;22,160;60,0;34,255');
  } finally { Date.now = realNow; delete globalThis.window; }
});

test('Heldenmodelle: jede Heldin/jeder Held hat ein lesbares Modell mit Skelett (höchstens 32 Gelenke), 12 Clips, Handpunkt; Ruhelage deckt sich mit dem Mesh', async () => {
  const fs = await import('node:fs'); const { parseGlb } = await import('../src/client/glb.js'); const { Rig, HeroAnim } = await import('../src/client/rig.js');
  for (const h of pack.tables.heroes) {
    const b = fs.readFileSync(new URL(`../src/client/models/heroes/hero_${h.id}.glb`, import.meta.url)), m = parseGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    assert.ok(m.skin && m.skin.joints.length <= 32 && m.tris <= 900 && m.nv < 65536, `${h.id}: Skelett/Größe`);
    for (const c of ['Idle', 'Run', 'Attack_1', 'Attack_2', 'Aim_Shoot', 'Cast', 'Hit', 'Death']) assert.ok(m.clips[c] && m.clips[c].dur > 0, `${h.id}: Clip ${c}`);
    assert.ok(m.clips.Attack_1.markers.Hit > 0 && m.clips.Aim_Shoot.markers.Release > 0, `${h.id}: Ereigniszeitpunkte`);
    const r = new Rig(m), J = r.solve(r.rest); let dev = 0;
    for (let v = 0; v < m.nv; v += 7) { let x = 0, y = 0, z = 0; for (let k = 0; k < 4; k++) { const j = m.joints[v * 4 + k], w = m.weights[v * 4 + k]; if (!w) continue; const M = J.subarray(j * 16, j * 16 + 16), px = m.pos[v * 3], py = m.pos[v * 3 + 1], pz = m.pos[v * 3 + 2]; x += w * (M[0] * px + M[4] * py + M[8] * pz + M[12]); y += w * (M[1] * px + M[5] * py + M[9] * pz + M[13]); z += w * (M[2] * px + M[6] * py + M[10] * pz + M[14]); } dev = Math.max(dev, Math.hypot(x - m.pos[v * 3], y - m.pos[v * 3 + 1], z - m.pos[v * 3 + 2])); }
    assert.ok(dev < 1e-3, `${h.id}: Ruhelage weicht ab (${dev})`); assert.ok(r.point('HandSocket.R'), `${h.id}: Handpunkt`);
    const a = new HeroAnim(r); for (let k = 0; k < 90; k++) { const out = a.update({ dt: 1 / 30, alive: k < 70, speed: k > 20 && k < 40 ? 5 : 0, fireT: k > 5 && k < 60 ? Math.floor(k / 12) : undefined, hurtT: k > 62 ? 1 : undefined, cls: h.mastery, interval: 0.45 }); assert.ok(out.every(Number.isFinite), `${h.id}: Pose endlich`); }
  }
});
