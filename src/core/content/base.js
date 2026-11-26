// Basis-Content-Paket. Jede Tabelle/jeder Konfigwert trägt einen Herkunftsstatus:
//  D = aus der Referenz (27.2.0, xphero.fans laut Systemanalyse) belegt
//  B = beobachtete Mechanik, Details eigen   R = Rekonstruktion/Interpretation
//  E = EIGENER Wert (Original unbekannt, bewusst konfigurierbar)   ? = offen/zu verifizieren
// Zeilen können mit Feld `s` einen abweichenden Zeilenstatus tragen. Nichts hiervon ist Gameplay-Code.
export const SCHEMA = 1;
export const RARITIES = ['Normal', 'Fine', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mythic', 'Exotic', 'Eternal'];
export const STATS = ['atk', 'hp', 'cargo', 'atkSpeedPct', 'regen', 'critChance', 'critDmg', 'moveSpeedPct', 'multiHit', 'lifesteal',
  'skillDmgPct', 'cooldownPct', 'goldPct', 'xpPct', 'dmgPct', 'bossDmgPct', 'dropPct', 'meleePct', 'rangedPct', 'synergyPct'];

// Eigene Gegnerkurve (E); von Content-Build und Modi (Tower/Tomb/Raid) gemeinsam genutzt.
export function mobStats(cfg, level, rank = 'normal') {
  const c = cfg.curves, r = c.rank[rank] || c.rank.normal;
  return {
    hp: Math.max(1, Math.round((c.mobHp[0] + c.mobHp[1] * level ** c.mobHp[2]) * r.hp)),
    atk: Math.max(rank === 'node' ? 0 : 1, Math.round(c.mobAtk[0] * level ** c.mobAtk[1] * r.atk)),
    xp: Math.round((c.mobXp[0] + c.mobXp[1] * level ** c.mobXp[2]) * r.xp),
    gold: Math.round((c.mobGold[0] + c.mobGold[1] * level ** c.mobGold[2]) * r.gold),
  };
}

export function buildBaseContent() {
  const tables = {}, meta = {}, config = {}, configMeta = {};
  const T = (name, status, note, rows) => { tables[name] = rows; meta[name] = { status, note }; return rows; };
  const C = (key, v, status, note = '') => { config[key] = v; configMeta[key] = { status, note }; };

  // ------------------------------------------------------------------ Konfiguration
  C('curves', {
    mobHp: [10, 2, 2.2], mobAtk: [0.5, 1.6], mobXp: [2, 1, 1.1], mobGold: [1, 0.6, 1.6],
    rank: {
      normal: { hp: 1, atk: 1, xp: 1, gold: 1 }, elite: { hp: 4, atk: 2, xp: 4, gold: 4 },
      boss: { hp: 12, atk: 3, xp: 20, gold: 25 }, special: { hp: 3, atk: 1, xp: 3, gold: 10 }, node: { hp: 0.6, atk: 0, xp: 0, gold: 0 },
    },
  }, 'E', 'Eigene Gegnerkurve; Originalwerte je Variante aus Bestiary importieren.');
  C('xp', { trigger: 'kill', factor: 1, capBehavior: 'discard', maxLevel: 400, healOnLevelUp: true }, '?',
    'XP-Auszahlungsort, Rundung (floor), Cap-Verhalten und HP-Behandlung sind eigen. factor = Progressionstempo.');
  C('rewardFactor', { gold: 1, drops: 1 }, 'E', 'Eigenes Progressionstempo, unabhängig von der Simulation.');
  C('bonusClaims', { mode: 'replace', levelUp: true, giftChest: true }, '?',
    'Früherer Rewarded-Ad-Bonus (x5) als direkter Gratis-Claim. replace|add ungeklärt.');
  C('caps', { towerBonus: 5, pvpReward: 5, pvpTicket: 10, revive: 3, dailyGemShop: 2, bossRankRefresh: 1, homeReturn: 5, randomReward: 10, freeSpin: 1 }, 'D',
    'Erste 6 Keys = dokumentierte Tagescaps (Summe 26). homeReturn/randomReward/freeSpin = E.');
  C('applyDailyGemShopCapToFreeGems', false, '?', 'Semantik von Daily-Gem-Shop-RV-Cap 2 ungeklärt; standardmäßig nicht auf 9002-9004 angewendet.');
  C('dailyTickets', { ticket_tower: 5, ticket_invasion: 5, ticket_raid: 2, ticket_tomb: 3, ticket_pvp: 5 }, 'E', 'Tägliche Grundtickets (Auffüllen bis zu diesem Wert).');
  C('player', { baseCargo: 20, moveSpeed: 230, critChance: 5, critDmg: 150, pickupRadius: 90, regenPct: 1, radius: 16 }, 'E', 'Grundwerte Spieler.');
  C('statCaps', { critChance: 100, cooldownPct: 70, atkSpeedPct: 400, moveSpeedPct: 150, lifesteal: 50, multiHit: 100 }, 'E', 'Obergrenzen; Kritchance <= 100.');
  C('combat', { subIntervalMult: 2.2, subDmgMult: 0.6, dropDespawnSec: 90, respawnOfflineContinues: true, defaultRespawnSec: 30, bossRespawnSec: 3600, tick: 1 / 30 }, 'R',
    'Nebenwaffen feuern langsamer/schwächer als die Hauptwaffe (eigene Werte). Offline-Respawn ungeklärt.');
  C('weaponLevelCost', { scrollPer5: 1, goldBase: 50 }, 'E', 'Scrolls = ceil(L/5)*(1+r); Gold = goldBase*L*(1+r)^2.');
  C('craftCost', [20, 60, 200, 500, 1500, 4000, 10000, 25000], 'E', 'Gold je Schmiedevorgang pro Schmiedestufe.');
  C('weaponSlots', [{ slot: 1 }, { slot: 2, quest: true }, { slot: 3, level: 20, cost: { gold: 20000 } }, { slot: 4, level: 40, cost: { gold: 200000 } },
    { slot: 5, level: 70, cost: { gold: 1500000 } }, { slot: 6, level: 110, cost: { gold: 8000000 } }], '?', 'Slot 2 per Quest (D); Slots 3-6 eigene Kosten.');
  C('traits', { slots: 5, presets: 3, rerollCost: { attr_point: 10 }, lockSurcharge: 0.5 }, '?', 'Slotzahl, Rollkosten und Lockkosten eigen.');
  C('runes', { slots: 6, slotLevels: [1, 60, 90, 120, 160, 200], dismantleRefundPct: 80, milestoneEvery: 10, milestonePct: 10 }, '?', 'Slots und Refund eigen.');
  C('heroes', { starter: 'h_01', levelPct: 2, selectTicketPieces: 50, raidTeam: 3 }, 'E', 'Heldenlevel: +levelPct% ATK/HP je Level über 1.');
  C('keyhouse', { speedUpGemsPerMin: 1, chapterBound: true }, 'E', 'Beschleunigung nur gegen erspielte Gems; kein Ad-Skip.');
  C('homeReturn', { cost: {} }, 'E', 'Rückkehr zur Basis: Tagescap caps.homeReturn, mit Perk unbegrenzt.');
  C('remoteBaseAccess', true, 'E', 'Komfort: Basis-Menüs von überall (weniger Laufwege).');
  C('randomReward', { everySec: 300 }, 'E', 'Intervall der Bonusbelohnung im Feld (früher Rewarded Ad).');
  C('tower', { entryCost: { ticket_tower: 1 }, timerSec: 30 }, 'R', '30 s ist Modellannahme des DPS-Rechners.');
  C('raid', { entryCost: { ticket_raid: 1 }, timerSec: 60 }, 'E');
  C('tomb', { entryCost: { ticket_tomb: 1 }, timerSec: 90 }, 'E');
  C('pvp', { entryCost: { ticket_pvp: 1 }, k: 24, startRating: 1000, winReward: [{ item: 'gold', n: 500 }, { item: 'weapon_scroll', n: 2 }] }, 'E');
  C('invasion', { entryCost: { ticket_invasion: 1 }, k: 32, startRating: 1000, botsPerTier: 30, bankPerHour: 20, bankCap: 2000, stealPct: 20, defenseAttacksPerDay: 3, seasonDays: 7,
    streakBonusPct: 10, streakMax: 5 }, 'E', 'Async-PvP gegen gekennzeichnete Bots/Snapshots.');
  C('spin', { unlockConfigRaw: '1,3', spinCost: { spin_ticket: 1 } }, '?', 'Unlock-Config 1,3: Bedeutung ungeklärt, nicht angewendet.');
  C('orbAlias', { crimson: null, azure: null, soul: null }, '?', 'Interne Orb-Namen nicht zugeordnet; betroffene Reward-Zeilen sind deaktiviert.');
  C('ledgerKeep', 400, 'E'); C('saveSlots', 2, 'E');

  // ------------------------------------------------------------------ Items (Auszug der 116 Definitionen)
  const I = (id, name, kind = 'currency', x = {}) => ({ id, name, kind, cargo: 0, sell: 0, ...x });
  T('items', 'D', 'Währungen/Items laut Abschnitt 11; nicht alle 116 Originalitems bekannt.', [
    I('gold', 'Gold'), I('gems', 'Gems'), I('exp', 'EXP (Blessing)', 'currency', { s: '?' }),
    I('orb_red', 'Red Orb'), I('orb_pink', 'Pink Orb'), I('orb_ice', 'Ice Orb'), I('orb_jungle', 'Jungle Orb'), I('orb_hell', 'Hell Orb'),
    I('bluestone', 'BlueStone'), I('rune_dust', 'Rune Dust'), I('weapon_scroll', 'Weapon Scroll'),
    I('wood', 'Holz', 'material', { cargo: 1 }), I('stone', 'Stein', 'material', { cargo: 1, s: 'E' }),
    I('evo_coin', 'Evolution Coin'), I('attr_point', 'Attribute Point'), I('synergy_point', 'Synergy Point'),
    I('key_warrior', 'Warrior Chest Key', 'key'), I('key_stier', 'S-Tier Chest Key', 'key'), I('key_special_hero', 'Special Hero Chest Key', 'key'),
    I('hero_select_ticket', 'Hero Select Ticket', 'ticket'),
    I('ticket_tower', 'Tower-Ticket', 'ticket'), I('ticket_invasion', 'Invasion-Ticket', 'ticket'), I('ticket_raid', 'Raid-Ticket', 'ticket'),
    I('ticket_tomb', 'Tomb-Ticket', 'ticket'), I('ticket_pvp', 'PvP-Ticket', 'ticket', { s: 'B' }),
    I('invasion_coin', 'Invasion Coin'), I('raid_coin', 'Boss-Rank-Münze', 'currency', { s: 'E' }), I('spin_ticket', 'Spin-Ticket', 'ticket', { s: 'E' }),
    I('loot_c1', 'Beute Kap. 1', 'cargo', { cargo: 1, sell: 4, s: 'E' }), I('loot_c2', 'Beute Kap. 2', 'cargo', { cargo: 1, sell: 60, s: 'E' }),
    I('loot_c3', 'Beute Kap. 3', 'cargo', { cargo: 1, sell: 600, s: 'E' }),
  ]);

  // ------------------------------------------------------------------ Welt
  const AREA = [[1, 'Greenhaven', 'Rootling'], [1, 'Sandevil Desert', 'Scarlet'], [1, 'Ebonhollow', 'Gargoyle'], [1, 'Frostbound', 'Frostfang'],
    [1, 'Verdant Ruins', 'Elf Queen'], [1, 'Hellfire Chasm', 'Baal'], [2, 'Fortress of Hope', 'Dark Lord'], [2, 'Blackbarrow', 'Banshee'],
    [2, 'Twilight Forest', 'Volcanus'], [2, 'Water Temple', 'SeaQueen'], [2, 'Redrock Valley', 'Warchief'], [2, 'Frosthold', 'Revenant'],
    [2, 'Frozen Throne', 'Frost King'], [3, 'Downtown', 'Hobchief'], [3, 'Ruined Downtown', 'Magma Golem'], [3, 'Hanok Village', 'Skullwyrm'],
    [3, 'Jeju Island', 'Ant King'], [3, 'Amusement Park', 'Vampire Lord'], [3, 'The Dome', 'Abyss Lord'], [3, 'Dimensional Rift', 'Voidlord']];
  const GROUPS = [14, 14, 14, 14, 13, 13, 11, 10, 10, 10, 10, 10, 10, 9, 9, 8, 8, 8, 8, 8]; // 82/71/58 (D-Summen, Verteilung E)
  const bossLevel = (s) => (s === 19 ? 390 : s === 20 ? 400 : Math.round(8 + (s - 1) * 20.125)); // 8 (D), 330 (D), 390 (D); Rest E
  const BOSS_RESPAWN = { 10: 21600, 17: 21600, 13: 32400, 20: 32400 }; // SeaQueen/Ant King 6 h, Frost King/Voidlord 9 h (D)
  const CHEST_RESPAWN = { 7: 300, 8: 702, 9: 900, 10: 1302, 11: 1800, 12: 2100, 14: 300, 15: 702, 16: 900, 17: 1302, 18: 1800, 19: 2100 }; // D
  const W = 1600, H = 2600;
  const areas = [], monsters = [], variants = [], groups = [], resGroups = [], chestSpawners = [], giftSpawners = [];
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const V = (id, name, level, rank, x = {}) => {
    const st = mobStats(config, level, rank);
    const row = { id, monster: x.monster || id, name, level, rank, ...st, beh: rank === 'boss' ? 'boss' : rank === 'node' ? 'node' : x.beh || 'melee', drops: [], s: 'E', ...x };
    if (!monsters.find((m) => m.id === row.monster)) monsters.push({ id: row.monster, name, rank });
    variants.push(row);
    return row;
  };
  const orbFor = { 1: 'orb_red', 2: 'orb_red', 3: 'orb_pink', 4: 'orb_ice', 5: 'orb_jungle', 6: 'orb_hell' };
  let chIdx = 0, prevCh = 0, giftLeftCh1 = 17;
  AREA.forEach(([ch, name, boss], i) => {
    const s = i + 1;
    chIdx = ch === prevCh ? chIdx + 1 : 1; prevCh = ch;
    const id = `a${ch}_${chIdx}`, hi = bossLevel(s), lo = s === 1 ? 1 : bossLevel(s - 1) + 1;
    const loot = `loot_c${ch}`, orb = ch === 1 ? orbFor[chIdx] : ['orb_red', 'orb_pink', 'orb_ice', 'orb_jungle', 'orb_hell'][i % 5];
    const mk = [];
    if (s === 1) {
      mk.push(V('mandragora', 'Mandragora', 1, 'normal', { hp: 12, atk: 1, s: 'D' }), V('slime', 'Slime', 2, 'normal', { hp: 16, atk: 1, s: 'D' }),
        V('mushroom', 'Mushroom', 4, 'normal', { hp: 17, atk: 2, s: 'D' }), V('spider', 'Spider', 5, 'normal', { hp: 57, atk: 4, s: 'D', beh: 'fast' }));
    } else {
      for (let k = 0; k < 4; k++) {
        const lv = Math.round(lo + ((hi - 1 - lo) * k) / 3);
        const nm = s === 2 && k === 0 ? 'Cactus' : `${name} ${'ABCD'[k]}`;
        mk.push(V(s === 2 && k === 0 ? 'cactus' : `m_${id}_${k}`, nm, lv, 'normal', { beh: ['melee', 'ranged', 'fast', 'melee'][k] }));
      }
    }
    for (const v of mk) v.drops.push({ item: loot, n: 1, count: 1, chance: 0.5 }, { item: orb, n: 1, count: 1, chance: 0.03 });
    const elite = s === 1 ? V('slime_king', 'Slime King', 3, 'elite', { hp: 63, atk: 6, s: 'D' }) : V(`e_${id}`, `${name} Elite`, Math.round((lo + hi) / 2), 'elite');
    elite.drops.push({ item: loot, n: 2, count: 2, chance: 1 }, { item: 'weapon_scroll', n: 1, count: 1, chance: 0.3 }, { item: orb, n: 2, count: 1, chance: 0.25 });
    if (ch >= 2) elite.drops.push({ item: 'attr_point', n: 2, count: 1, chance: 0.2 });
    const bv = V(`boss_${id}`, boss, hi, 'boss', s === 1 ? { hp: 256, atk: 18, s: 'D' } : { s: [17, 19].includes(s) ? 'D' : 'E' });
    bv.drops.push({ item: loot, n: 5, count: 4, chance: 1 }, { item: 'evo_coin', n: 5 * s, count: 2, chance: 1 }, { item: orb, n: 3, count: 3, chance: 1 });
    if (s === 17) bv.drops.push({ item: 'gems', n: 20, count: 5, chance: 1, s: 'D' }, { item: 'attr_point', n: 40, count: 5, chance: 1, s: 'D' });
    if (s === 19) bv.drops.push({ item: 'gems', n: 20, count: 5, chance: 1, s: 'D' }, { item: 'attr_point', n: 48, count: 5, chance: 1, s: 'D' });
    areas.push({ id, stage: s, chapter: ch, name, boss: bv.id, w: W, h: H, entry: { x: W / 2, y: H - 140 }, gate: { x: W / 2, y: 70 },
      prev: s > 1 ? areas[s - 2].id : 'base', next: null, minimap: null, s: 'D' });
    if (s > 1) areas[s - 2].next = id;
    // Spawn-Gruppen: 1 Boss, Spezialgruppen, Rest Elite/Normal
    const specials = [];
    if (s === 2) specials.push(V('treasure_goblin', 'Treasure Goblin', lo + 4, 'special', { beh: 'flee', respawn: 600, s: 'D' }),
      V('goblin_warrior', 'Goblin Warrior', lo + 8, 'elite', { respawn: 900, s: 'D' }));
    if (s === 3) specials.push(V('giant_chicken', 'Giant Chicken', hi - 4, 'elite', { respawn: 1800, s: 'B' }));
    if (s === 10) specials.push(V('abyssal_kraken', 'Abyssal Kraken', 155, 'elite', { respawn: 3600, s: 'D',
      drops: [{ item: 'gems', n: 5, count: 5, chance: 1 }, { item: 'bluestone', n: 22, count: 6, chance: 1 }] }));
    if (s === 16) specials.push(V('treasure_mimic', 'Treasure Mimic', lo + 5, 'special', { respawn: 3000, s: 'D', drops: [{ item: 'gems', n: 5, count: 2, chance: 1, s: 'E' }] }));
    for (const sp of specials) if (sp.id === 'treasure_goblin') sp.gold *= 20;
    const n = GROUPS[i] - 1, list = [];
    specials.forEach((sp) => list.push({ v: sp.id, count: 1, respawn: sp.respawn }));
    list.push({ v: elite.id, count: 1, respawn: 180 });
    while (list.length < n) { const k = (list.length) % 4; list.push({ v: mk[k].id, count: 5 + (list.length % 3) }); }
    list.sort((a, b) => variants.find((x) => x.id === a.v).level - variants.find((x) => x.id === b.v).level);
    const rowsN = Math.ceil(n / 3);
    list.forEach((g, k) => groups.push({ id: `sg_${id}_${k}`, area: id, v: g.v, count: g.count, respawn: g.respawn || null,
      x: 280 + (k % 3) * 520 + ((k * 37) % 60), y: Math.round(H - 520 - Math.floor(k / 3) * ((H - 1150) / Math.max(1, rowsN - 1 || 1))), r: 150 }));
    groups.push({ id: `sg_${id}_boss`, area: id, v: bv.id, count: 1, respawn: BOSS_RESPAWN[s] || null, x: W / 2, y: 360, r: 10,
      s: BOSS_RESPAWN[s] ? 'D' : 'E' });
    // Rohstoffstellen (E): Bäume in Kap. 1.1-1.3, Felsen ab 1.3
    if (s <= 3) resGroups.push({ id: `rg_${id}_tree`, area: id, v: 'node_tree', count: 4, respawn: 60, x: 180, y: H - 700, r: 110 });
    if (s >= 3 && s <= 6) resGroups.push({ id: `rg_${id}_rock`, area: id, v: 'node_rock', count: 4, respawn: 90, x: W - 180, y: H - 900, r: 110 });
    chestSpawners.push({ id: `cs_${id}`, area: id, x: W - 220, y: 1300, respawn: CHEST_RESPAWN[s] || 600, pool: [{ type: 'wooden', w: 80 }, { type: 'rare', w: 20 }],
      s: CHEST_RESPAWN[s] ? 'D' : 'E' });
    const ng = ch === 1 ? (giftLeftCh1 >= 3 && chIdx < 6 ? 3 : giftLeftCh1) : 2;
    if (ch === 1) giftLeftCh1 -= ng;
    for (let k = 0; k < ng; k++) giftSpawners.push({ id: `gs_${id}_${k}`, area: id, x: 220 + k * 560, y: 900 + k * 420, respawn: 900, s: 'E' });
  });
  V('node_tree', 'Baum', 1, 'node', { hp: 20, drops: [{ item: 'wood', n: 1, count: 2, chance: 1 }] });
  V('node_rock', 'Fels', 1, 'node', { hp: 60, drops: [{ item: 'stone', n: 1, count: 2, chance: 1 }] });
  // Minimap-Belohnungen (D): einmalig je Gebiet
  const MM1 = [[{ item: 'bluestone', n: 20 }], [{ item: 'key_warrior', n: 5 }], [{ item: 'key_special_hero', n: 5 }], [{ item: 'key_special_hero', n: 5 }],
    [{ item: 'key_stier', n: 5 }], [{ item: 'key_stier', n: 5 }]];
  let ci = 0, pc = 0;
  for (const a of areas) { ci = a.chapter === pc ? ci + 1 : 1; pc = a.chapter; a.minimap = a.chapter === 1 ? MM1[ci - 1] : [{ item: 'gems', n: ci === 7 ? 1000 : 200 }]; }
  T('areas', 'D', '20 Gebiete, 19 Gates; Kartenlayout/Koordinaten eigen (E).', areas);
  T('monsters', 'E', '206 Monster/246 Varianten im Original; hier dokumentierte Beispiele (D) + eigene Platzhalter.', monsters);
  T('variants', 'E', 'Zeilen mit s=D tragen Referenzwerte (Level/HP/ATK bzw. Drops).', variants);
  T('spawnGroups', 'R', '82/71/58 Gruppen je Kapitel (D); Verteilung, Position, Standard-Respawn eigen.', groups);
  T('resourceGroups', 'E', 'Rohstoffstellen als angreifbare Knoten.', resGroups);
  T('behaviors', 'E', 'Gegner-KI-Parameter je Typ; Original-KI unbekannt.', [
    { id: 'melee', aggro: 260, leash: 520, patrol: 90, speed: 105, range: 46, interval: 1.4, windup: 0.35 },
    { id: 'fast', aggro: 300, leash: 600, patrol: 120, speed: 165, range: 44, interval: 1.0, windup: 0.25 },
    { id: 'ranged', aggro: 340, leash: 560, patrol: 70, speed: 85, range: 260, interval: 1.9, windup: 0.4, proj: 320 },
    { id: 'flee', aggro: 240, leash: 700, patrol: 140, speed: 150, range: 0, interval: 9, windup: 0, flee: true },
    { id: 'boss', aggro: 420, leash: 760, patrol: 0, speed: 90, range: 70, interval: 1.6, windup: 0.5, pattern: 'slam' },
    { id: 'node', aggro: 0, leash: 0, patrol: 0, speed: 0, range: 0, interval: 9, windup: 0 },
  ]);
  T('bossPatterns', 'E', 'Generische, eigene Bossfähigkeiten (keine Originalmuster).', [
    { id: 'slam', period: 7, windup: 1.2, radius: 150, mult: 2.5, enrageHpPct: 30, enrageIntervalMult: 0.7 },
  ]);
  T('statuses', 'E', 'Statuseffekte: Stack-Limit, Erneuerung, Immunität.', [
    { id: 'slow', maxStacks: 1, refresh: 'renew', speedMult: 0.5, bossImmune: false },
    { id: 'burn', maxStacks: 5, refresh: 'renew', dotPctAtk: 20, bossImmune: false },
    { id: 'stun', maxStacks: 1, refresh: 'none', stun: true, bossImmune: true },
  ]);
  T('chestSpawners', 'R', 'Spawner-Respawn Stage 7-12/14-19 dokumentiert; Rest eigen.', chestSpawners);
  T('giftSpawners', 'R', 'Kap. 1: 17 Gift-Chest-Spawner (D); Position/Respawn eigen.', giftSpawners);
  T('chestTypes', 'D', 'Reveal-Timer und Pool-Zeilen dokumentiert; Gewichte und Goldmenge eigen. Auswahlmodus one = R.', [
    { id: 'wooden', name: 'Wooden Chest', revealSec: 600, mode: 'one', rows: [
      { w: 1, item: 'gold', min: 200, max: 600, s: 'E' }, { w: 1, item: 'bluestone', min: 2, max: 4 },
      { w: 1, item: 'weapon_scroll', min: 2, max: 10 }, { w: 1, item: 'orb_red', min: 6, max: 12 }] },
    { id: 'rare', name: 'Rare Chest', revealSec: 1800, mode: 'one', rows: [
      { w: 1, item: 'exp', min: 1, max: 1 }, { w: 1, item: 'bluestone', min: 5, max: 10 },
      { w: 1, item: 'weapon_scroll', min: 2, max: 10 }, { w: 1, item: 'orb_red', min: 14, max: 28 }] },
  ]);
  T('areaChests', 'R', 'Je Gebiet eine einmalige Gebietstruhe (Kap. 1: 6 = D); Inhalt eigen.',
    areas.map((a) => ({ id: `ac_${a.id}`, area: a.id, x: 240, y: 520, reward: [{ item: 'gold', n: 100 * a.stage * a.stage }, { item: 'exp', n: 2 + a.stage }, { item: 'weapon_scroll', n: 5 }] })));
  const giftGold = (L) => Math.round(12 * (1983356 / 12) ** ((L - 1) / 399));
  T('giftChestLevels', 'R', 'Gold L1=12 und L400=1.983.356 (D); Zwischenwerte geometrisch interpoliert (E). Bonus: Gold x5 + 10 Gems (D).',
    Array.from({ length: 400 }, (_, k) => ({ level: k + 1, gold: giftGold(k + 1), bonusGems: 10, bonusMult: 5 })));
  const KH = [[1, { wood: 0 }], [1, { wood: 10 }], [1, { wood: 10 }], [1, { gems: 360 }], [1, { gems: 550 }], [2, { gems: 100 }], [2, { gems: 200 }], [2, { gems: 400 }],
    [2, { gems: 600 }], [2, { gems: 800 }], [3, { gems: 120 }], [3, { gems: 240 }], [3, { gems: 480 }], [3, { gems: 720 }], [3, { gems: 1000 }]];
  T('keyHouseSlots', 'D', '15 Freischaltzeilen; Gem-Summe 5.570.', KH.map(([chapter, cost], k) => ({ id: k, chapter, cost })));

  // ------------------------------------------------------------------ Spielerlevel
  const lvRows = [];
  for (let L = 1; L <= 400; L++) lvRows.push({ level: L, xp: Math.round(20 * L ** 1.8), atk: Math.round(3 * L ** 1.5694), hp: Math.round(100 * L ** 1.9032) });
  T('playerLevels', 'E', 'XP-Schwellen unbekannt: EIGENE, austauschbare Kurve. ATK/HP an Tracker-L99 (4.055 / 627.721, interpoliert) verankert.', lvRows);

  // ------------------------------------------------------------------ Upgrade-Pfade
  const up = [];
  const U = (id, family, name, stat, max, rows, x = {}) => up.push({ id, family, name, stat, max, scale: 1, rows: rows.map(([lv, eff, cost]) => ({ lv, eff, cost })), s: 'E', ...x });
  const own = (max, effMax, c1, cMax, cur = 'gold') => [[1, Math.max(1, Math.round(effMax / max)), { [cur]: c1 }],
    [Math.max(2, Math.round(max / 2)), Math.round(effMax / 2), { [cur]: Math.round(Math.sqrt(c1 * cMax)) }], [max, effMax, { [cur]: cMax }]];
  U('ab_power', 'ability', 'Power', 'atk', 2000, [[1, 2, { gold: 10 }], [2, 3, { gold: 34 }], [4, 5, { gold: 120 }], [7, 8, { gold: 271 }], [106, 758, { gold: 3745 }],
    [334, 4149, { gold: 32272 }], [572, 17945, { gold: 503809, orb_jungle: 1 }], [999, 48409, { gold: 1331790 }], [1282, 84228, { gold: 7234109, orb_hell: 30 }],
    [2000, 175100, { gold: 16896389, orb_hell: 30 }]], { s: 'D', note: 'Stützzeilen D; Interpolation R; Effekt/Orbs L2000 E.' });
  U('ab_cargo', 'ability', 'Cargo', 'cargo', 1600, own(1600, 1600, 15, 5000000), { note: 'Max 1600 D.' });
  U('ab_atkspeed', 'ability', 'Attack Speed', 'atkSpeedPct', 55, own(55, 55, 100, 2000000), { note: 'Max 55 D.' });
  U('ab_hp', 'ability', 'Health', 'hp', 2000, [[1, 5, { gold: 10 }], [100, 1500, { gold: 3000 }], [1000, 150000, { gold: 1200000 }], [2000, 600000, { gold: 16000000 }]]);
  U('ab_regen', 'ability', 'Regeneration', 'regen', 200, [[1, 1, { gold: 50 }], [100, 300, { gold: 40000 }], [200, 2000, { gold: 3000000 }]]);
  U('ab_crit', 'ability', 'Crit Chance', 'critChance', 40, own(40, 40, 200, 4000000));
  U('ab_critdmg', 'ability', 'Crit Damage', 'critDmg', 200, own(200, 200, 150, 6000000));
  U('ab_move', 'ability', 'Movement', 'moveSpeedPct', 40, own(40, 40, 120, 1500000));
  U('ab_multi', 'ability', 'Double Attack', 'multiHit', 40, own(40, 40, 400, 8000000));
  U('ab_lifesteal', 'ability', 'Lifesteal', 'lifesteal', 20, own(20, 10, 800, 9000000));
  const SP = ['skillDmgPct', 'cooldownPct', 'critDmg', 'dmgPct', 'bossDmgPct', 'goldPct', 'xpPct', 'dropPct', 'meleePct', 'rangedPct', 'atkSpeedPct'];
  SP.forEach((st, k) => U(`sp_${k}`, 'special', `Special ${k + 1}`, st, 40, own(40, st === 'cooldownPct' ? 20 : 80, 2, 60, k % 2 ? 'orb_pink' : 'orb_red'), { grades: 4 }));
  ['dmgPct', 'critDmg', 'skillDmgPct', 'bossDmgPct', 'goldPct', 'xpPct', 'meleePct', 'rangedPct'].forEach((st, k) =>
    U(`ex_${k}`, 'extra', `Extra ${k + 1}`, st, 50, own(50, 100, 2, 80, k % 2 ? 'orb_jungle' : 'orb_ice')));
  ['dmgPct', 'critDmg', 'skillDmgPct', 'bossDmgPct', 'lifesteal', 'cooldownPct', 'critChance', 'multiHit', 'dropPct'].forEach((st, k) =>
    U(`so_${k}`, 'soul', `Soul ${k + 1}`, st, 50, own(50, ['lifesteal', 'cooldownPct', 'critChance', 'multiHit'].includes(st) ? 15 : 150, 3, 120, 'orb_hell')));
  [['bl_0', 'Blessing I', 'dmgPct', 150], ['bl_1', 'Blessing II', 'critDmg', 350], ['bl_2', 'Blessing III', 'goldPct', 300]].forEach(([id, nm, st, v]) =>
    U(id, 'blessing', nm, st, 50, own(50, v, 1, 40, 'exp'), { s: 'R', note: 'Endwerte 150/350/300 D; Stat-Zuordnung und Kosten E.' }));
  ['dmg', 'crit', 'gold'].forEach((gkey, k) => U(`syn_${gkey}`, 'synergy', `Synergie ${k + 1}`, 'synergyPct', 20, own(20, 100, 5, 200, 'synergy_point')));
  T('upgradeTracks', 'R', 'Ability 10 / Special 11 (4 Grade) / Extra 8 / Soul 9 / Blessing 3x50 (D-Zählungen); Werte außer Power eigen.', up);

  // ------------------------------------------------------------------ Waffen
  T('rarities', 'E', 'Seltenheitsnamen D; Multiplikatoren/Maxlevel eigen.', RARITIES.map((name, idx) =>
    ({ idx, name, mult: [1, 1.5, 2.2, 3.3, 5, 7.5, 11, 16, 24][idx], maxLevel: 10 + idx * 10, color: ['#bbb', '#6c6', '#59f', '#b6f', '#fb3', '#f73', '#f46', '#3dd', '#fff'][idx] })));
  const CLS = [['dagger', 'Dolch', true, 60, 0.45, 1, 'flower_dance', 'critChance', 3], ['sword', 'Schwert', true, 75, 0.7, 3, 'crescent_blade', 'dmgPct', 5],
    ['blunt', 'Stumpfe Waffe', true, 70, 1.1, 5, 'soul_wave', 'bossDmgPct', 6], ['crossbow', 'Armbrust', false, 330, 0.9, 1, 'at_rocket', 'critDmg', 10],
    ['gun', 'Schusswaffe', false, 300, 0.5, 1, 'gravity_shot', 'atkSpeedPct', 4], ['staff', 'Zauberstab', false, 280, 1.3, 4, 'carpet_bombing', 'skillDmgPct', 8]];
  T('weaponClasses', 'R', '6 Klassen und S-Skill-Namen D; Reichweite/Takt/Passiva eigen.', CLS.map(([id, name, melee, range, interval, targets, sSkill, pStat, pV]) =>
    ({ id, name, melee, range, interval, targets, sSkill, passive: { stat: pStat, v: pV }, basicMult: { dagger: 0.7, sword: 1, blunt: 1.5, crossbow: 1.2, gun: 0.75, staff: 1.4 }[id],
      proj: melee ? 0 : 520, aoe: id === 'staff' ? 70 : id === 'blunt' ? 90 : 0 })));
  T('skills', 'E', 'Skillnamen der S-Reihen D; Parameter eigen.', [
    { id: 'flower_dance', name: 'Flower Dance', cd: 7, range: 110, shape: 'aoeSelf', radius: 130, mult: 1.2, hits: 5 },
    { id: 'crescent_blade', name: 'Crescent Blade', cd: 8, range: 260, shape: 'line', radius: 60, mult: 4, hits: 1 },
    { id: 'soul_wave', name: 'Soul Wave', cd: 10, range: 150, shape: 'aoeSelf', radius: 190, mult: 3.5, hits: 1, status: 'stun', dur: 1.5 },
    { id: 'at_rocket', name: 'AT Rocket', cd: 9, range: 340, shape: 'aoeTarget', radius: 120, mult: 6, hits: 1, status: 'burn', dur: 4 },
    { id: 'gravity_shot', name: 'Gravity Shot', cd: 9, range: 320, shape: 'aoeTarget', radius: 140, mult: 3, hits: 2, status: 'slow', dur: 3 },
    { id: 'carpet_bombing', name: 'Carpet Bombing', cd: 12, range: 320, shape: 'aoeTarget', radius: 100, mult: 2.2, hits: 6 },
    { id: 'h_strike', name: 'Heldenschlag', cd: 10, range: 160, shape: 'aoeSelf', radius: 160, mult: 5, hits: 1 },
    { id: 'h_frost', name: 'Frostnova', cd: 12, range: 200, shape: 'aoeSelf', radius: 200, mult: 2.5, hits: 1, status: 'slow', dur: 4 },
    { id: 'h_burn', name: 'Flammenstoß', cd: 11, range: 300, shape: 'aoeTarget', radius: 120, mult: 3, hits: 1, status: 'burn', dur: 5 },
    { id: 'h_heal', name: 'Erholung', cd: 15, range: 9999, shape: 'heal', healPct: 20 },
  ]);
  const weapons = [];
  for (const [cls, cname] of CLS) for (const series of ['n', 's']) {
    const from = series === 'n' ? 0 : 3, to = series === 'n' ? 7 : 8;
    for (let r = from; r <= to; r++) weapons.push({ id: `w_${cls}_${series}_${r}`, cls, series, rarity: r, name: `${cname}${series === 's' ? ' S' : ''} (${RARITIES[r]})`,
      dpsAdd: Math.round(4 * (1 + r) ** 2 * (series === 's' ? 1.5 : 1)), perLevel: Math.round(2 * (1 + r) ** 1.6 * (series === 's' ? 1.5 : 1)),
      next: r < to ? `w_${cls}_${series}_${r + 1}` : null, mergeCount: 3, evoCost: r >= 3 ? { weapon_scroll: 10 * (r - 2), gold: 5000 * 4 ** (r - 3) } : {},
      skill: series === 's' ? CLS.find((c) => c[0] === cls)[6] : null });
  }
  T('weapons', 'R', '84 Varianten, 12 Reihen (D). Stats nach DPS-Rechner-Struktur (DPS Add + PerLevel*Level)*RarityMult; Zahlen, Merge-Anzahl, Evo-Kosten eigen. Transzendenz offen.', weapons);
  const SM = [[20, [[0, 100]], 0], [1300, [[0, 49], [1, 10], [2, 1]]], [20100, [[0, 44.75], [1, 12], [2, 3], [3, 0.25]], { orb_red: 10 }],
    [34500, [[0, 41.5], [1, 14], [2, 4], [3, 0.5]], { orb_red: 20 }], [134300, [[0, 39.25], [1, 15], [2, 5], [3, 0.75]], { orb_pink: 10 }],
    [288900, [[0, 37], [1, 16], [2, 6], [3, 1]], { orb_pink: 20, orb_red: 40 }], [765000, [[0, 33.5], [1, 18], [2, 7], [3, 1.5]], { orb_pink: 30, orb_red: 60 }],
    [null, [[0, 30], [1, 20], [2, 8], [3, 2]]]];
  T('smithy', 'D', 'Kosten = Upgrade zur nächsten Stufe (R). Sichtbare Raten summieren sich ab Stufe 2 auf 60 %; der Rest (otherW) ist NICHT normiert, sondern ein eigener, gekennzeichneter Sonstiges-Ausgang (E).',
    SM.map(([gold, rates, extra], k) => ({ tier: k + 1, upgradeCost: gold == null ? null : { gold, ...(extra || {}) }, rates: rates.map(([rarity, w]) => ({ rarity, w })),
      otherW: k === 0 ? 0 : 40, other: [{ item: 'weapon_scroll', min: 1, max: 3 }] })));

  // ------------------------------------------------------------------ Helden
  const heroes = [], HR = [['rare', 6, 1], ['epic', 6, 2], ['legendary', 5, 3], ['mythic', 3, 4]];
  let hn = 0;
  for (const [rar, cnt, tier] of HR) for (let k = 0; k < cnt; k++) { hn++; heroes.push({ id: `h_${String(hn).padStart(2, '0')}`, name: `Held ${hn}`, rarity: rar, tier,
    atkPct: 5 * tier + k, hpPct: 5 * tier + (cnt - k), mastery: CLS[hn % 6][0], masteryPct: 10 * tier, skill: ['h_strike', 'h_frost', 'h_burn', 'h_heal'][hn % 4],
    unlockPieces: 10 * tier, evolvable: true, s: 'E' }); }
  ['Freyja', 'The Skull', 'Hana', 'Vlad'].forEach((nm, k) => heroes.push({ id: `h_${slug(nm)}`, name: nm, rarity: 'exotic', tier: 5, atkPct: 40 + k * 2, hpPct: 40, mastery: CLS[k][0],
    masteryPct: 60, skill: ['h_strike', 'h_burn', 'h_frost', 'h_heal'][k], unlockPieces: 80, evolvable: false, s: 'D' }));
  T('heroes', 'E', 'Heldenliste unbekannt (24/26): eigene Platzhalter. Freyja/The Skull/Hana/Vlad: Exotic ohne Evolutionszeilen (D).', heroes);
  T('heroLevelCosts', 'R', 'Stützstufen 1 und 10..130 je Tiergruppe (D-Struktur); Evolution-Coin-Werte eigen.', [1, 2, 3, 4, 5].map((tier) =>
    ({ tier, rows: [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((lv) => ({ lv, cost: { evo_coin: Math.round(tier * (2 + lv * lv / 20)) } })) })));
  T('heroStars', 'E', 'Sterne 1-6 (D); Kosten/Optionen eigen.', [2, 3, 4, 5, 6].map((star) =>
    ({ star, pieces: [0, 0, 10, 20, 40, 80, 160][star], coins: [0, 0, 50, 150, 400, 1000, 2500][star], bonus: [{ stat: 'dmgPct', v: 5 * star }, { stat: 'hp', pct: 5 * star }] })));
  const coll = [];
  for (const rar of ['rare', 'epic', 'legendary', 'mythic', 'exotic']) [1, 3, 6, 9, 12, 15, 18].forEach((need, k) =>
    coll.push({ id: `col_${rar}_${need}`, group: rar, need, bonus: { stat: k % 2 ? 'hp' : 'atk', pct: 2 + k } }));
  T('heroCollection', 'R', 'Sternsumme je Raritätsgruppe, Schwellen 1 bzw. Dreierschritte (D); Boni eigen. Accountweit.', coll);

  // ------------------------------------------------------------------ Traits
  T('traitQualities', 'E', 'Qualitätsstufen bis SSS (B); Gewichte/Multiplikatoren eigen.', [['D', 1, 40], ['C', 1.3, 25], ['B', 1.7, 15], ['A', 2.2, 10], ['S', 3, 6], ['SS', 4, 3], ['SSS', 5.5, 1]]
    .map(([id, mult, w]) => ({ id, mult, w })));
  T('traitOptions', 'E', 'Optionen/Rollgewichte eigen.', [['t_dmg', 'Schaden', 'dmgPct', 4, 'dmg'], ['t_boss', 'Boss-Schaden', 'bossDmgPct', 6, 'dmg'], ['t_skill', 'Skill-Schaden', 'skillDmgPct', 5, 'dmg'],
    ['t_crit', 'Krit-Chance', 'critChance', 1.5, 'crit'], ['t_critd', 'Krit-Schaden', 'critDmg', 8, 'crit'], ['t_multi', 'Doppelangriff', 'multiHit', 1.5, 'crit'],
    ['t_gold', 'Gold', 'goldPct', 5, 'gold'], ['t_xp', 'XP', 'xpPct', 4, 'gold'], ['t_drop', 'Drops', 'dropPct', 3, 'gold']]
    .map(([id, name, stat, base, group]) => ({ id, name, stat, base, group, w: 1 })));
  T('synergies', 'E', 'Synergiegruppen eigen.', [['dmg', 'Zerstörung', 'dmgPct'], ['crit', 'Präzision', 'critDmg'], ['gold', 'Wohlstand', 'goldPct']]
    .map(([group, name, stat]) => ({ id: group, group, name, track: `syn_${group}`, tiers: [{ n: 2, stat, v: 10 }, { n: 3, stat, v: 25 }, { n: 4, stat, v: 50 }] })));

  // ------------------------------------------------------------------ Runen
  const RT = ['hero', 'melee', 'ranged', 'universal'], RSTAT = { hero: ['hp', 'atk'], melee: ['meleePct', 'critDmg'], ranged: ['rangedPct', 'critChance'], universal: ['dmgPct', 'skillDmgPct', 'goldPct'] };
  const runes = [];
  for (let k = 0; runes.length < 115; k++) {
    const type = RT[k % 4], rar = 1 + (Math.floor(k / 4) % 8), stats = RSTAT[type], stat = stats[Math.floor(k / 32) % stats.length];
    const flat = stat === 'hp' || stat === 'atk';
    runes.push({ id: `r_${type}_${rar}_${Math.floor(k / 32)}`, name: `${type}-Rune ${RARITIES[rar - 1]} ${Math.floor(k / 32) + 1}`, type, rarity: rar, stat, pct: flat,
      base: stat === 'critChance' ? rar * 0.5 : rar * 2, perLevel: stat === 'critChance' ? 0.05 * rar : 0.2 * rar,
      unique: rar >= 5 ? { stat: 'bossDmgPct', v: (rar - 4) * 5 } : null });
  }
  T('runes', 'E', '115 Runen, 4 Typen, 8 Seltenheiten (D-Zählungen); Verteilung, Effekte, Einheiten eigen.', runes);
  T('runeGrades', 'R', 'Levelgrenzen ca. 10-80 je Grad (D); Kosten/Refund eigen.', [1, 2, 3, 4, 5, 6, 7, 8].map((rarity) =>
    ({ rarity, maxLevel: rarity * 10, dustPerLevel: 5 * rarity, bluestoneEvery10: 5 * rarity, dismantleDust: 10 * rarity * rarity })));

  // ------------------------------------------------------------------ Gacha
  const wp = (series, rarity, w) => ({ w, weaponPool: { series, rarity } });
  const rate = [
    { id: 'rg_warrior', rows: [wp('n', 0, 60), wp('n', 1, 28), wp('n', 2, 9), wp('n', 3, 2.5), wp('n', 4, 0.5)], s: 'E' },
    { id: 'rg_stier', rows: [wp('s', 3, 90), wp('s', 4, 9), wp('s', 5, 1)], s: 'E' },
    { id: 'rg_hero', rows: [{ w: 70, heroPieces: { rarity: 'rare', n: 2 } }, { w: 22, heroPieces: { rarity: 'epic', n: 2 } }, { w: 6.5, heroPieces: { rarity: 'legendary', n: 2 } },
      { w: 1.5, heroPieces: { rarity: 'mythic', n: 2 } }], s: 'E' },
    { id: 'rg_hero_pity', rows: [{ w: 1, heroPieces: { rarity: 'mythic', n: 10 } }], s: 'E' },
    { id: 'rg_special_hero', rows: [[40, 1], [25, 2], [15, 5], [10, 10], [6, 20], [3, 50], [1, 100]].map(([w, n]) => ({ w, heroPieces: { rarity: 'any', n } })), s: 'R',
      note: 'bis zu 100 Hero Shards (D); Stückelung/Gewichte eigen.' },
    { id: '4001', rows: [{ w: 65, rune: { rarity: 1 } }, { w: 30, rune: { rarity: 2 } }, { w: 4, rune: { rarity: 3 } }, { w: 1, rune: { rarity: 4 } }], s: 'D' },
    { id: '4002', rows: [{ w: 65, rune: { rarity: 3 } }, { w: 30, rune: { rarity: 4 } }, { w: 4, rune: { rarity: 5 } }, { w: 1, rune: { rarity: 6 } }], s: 'E' },
  ];
  T('rateGroups', 'R', 'Rate-Gruppe 4001 = 65/30/4/1 (D); übrige Gewichte eigen.', rate);
  const boxes = [
    { id: 'warrior', name: 'Warrior Chest', costs: [{ key_warrior: 1 }, { gems: 100 }], multi: [1, 10], per: 1, rate: 'rg_warrior', unlock: { unlock: 'shop' } },
    { id: 'stier', name: 'S-Tier Chest', costs: [{ key_stier: 1 }, { gems: 300 }], multi: [1, 10], per: 1, rate: 'rg_stier', unlock: { unlock: 'sTierChest' } },
    { id: 'hero', name: 'Hero Chest (Featured)', costs: [{ gems: 150 }], multi: [1, 10], per: 1, rate: 'rg_hero', pity: { n: 50, rate: 'rg_hero_pity' }, unlock: { unlock: 'heroShop' }, s: '?' },
    { id: 'special_hero', name: 'Special Hero Chest', costs: [{ key_special_hero: 1 }], multi: [1, 10], per: 1, rate: 'rg_special_hero', unlock: { unlock: 'heroShop' },
      milestones: { first: [70, 150, 300], cycle: [40, 80, 120], repeats: 20, reward: [{ item: 'hero_select_ticket', n: 1 }] }, s: 'D' },
  ];
  RT.forEach((type) => [['basic', '4001', 200], ['advanced', '4002', 600]].forEach(([tier, rg, gems]) => boxes.push({ id: `rune_${type}_${tier}`, name: `Runentruhe ${type} (${tier})`,
    costs: [{ gems }], multi: [1], per: 10, rate: rg, typePool: type === 'universal' ? [{ type: 'universal', w: 100 }] : [{ type, w: 75 }, { type: 'universal', w: 25 }],
    unlock: { unlock: 'runes' }, s: 'R' })));
  T('gachaBoxes', 'R', '26 Boxdefinitionen im Original; hier 12 belegbare (inkl. 8 Runentruhen, Special Hero Chest). Gem-Preise eigen, kein universeller 10er-Preis.', boxes);

  // ------------------------------------------------------------------ Basis
  T('buildings', 'D', '26 Gebäudedefinitionen im Original; hier die 7 dokumentierten Einstiegskosten (Gold D, Materialmengen E).', [
    { id: 'bonfire', name: 'Bonfire', x: 800, y: 760, cost: { gold: 3 }, unlock: ['abilities'], max: 1 },
    { id: 'smithy', name: 'Smithy', x: 500, y: 700, cost: { gold: 70 }, unlock: [], max: 8, tiers: 'smithy' },
    { id: 'chesthouse', name: 'ChestHouse', x: 1100, y: 700, cost: { gold: 330 }, unlock: ['keyhouse'], max: 1 },
    { id: 'lumbermill', name: 'Lumbermill', x: 380, y: 420, cost: { gold: 600, wood: 6 }, unlock: [], max: 1, produce: { item: 'wood', perHour: 30, cap: 60 } },
    { id: 'quarry', name: 'Quarry', x: 1220, y: 420, cost: { gold: 1613, wood: 15 }, unlock: [], max: 1, produce: { item: 'stone', perHour: 20, cap: 40 } },
    { id: 'costumeshop', name: 'CostumeShop', x: 620, y: 300, cost: { gold: 3954, wood: 20, stone: 10, orb_red: 5 }, unlock: [], max: 1 },
    { id: 'portal', name: 'Portal', x: 980, y: 300, cost: { gold: 5170 }, unlock: ['portal'], max: 1 },
  ]);
  T('npcs', 'E', 'NPC-Daten/Dialoge des Originals nicht erfasst; eigene Platzhalter.', [
    { id: 'npc_elder', name: 'Älteste', area: 'base', x: 800, y: 560, text: 'Willkommen. Die Wildnis im Norden wartet.' },
    { id: 'npc_scout', name: 'Späherin', area: 'a1_1', x: 620, y: H - 300, text: 'Rootling haust am Nordende dieses Gebiets.' },
    { id: 'npc_smith', name: 'Schmied', area: 'base', x: 440, y: 620, text: 'Bring mir Gold, dann schmiede ich dir Waffen.' },
  ]);
  T('unlocks', 'D', 'Levelgebundene Freischaltungen (D); blessing/spin/special/extra/pvp eigen platziert.', [
    { feature: 'battlePass', level: 10 }, { feature: 'sevenDay', level: 14 }, { feature: 'carnival', level: 17 }, { feature: 'liveEvent', level: 24 },
    { feature: 'spin', level: 8, s: 'E' }, { feature: 'blessing', level: 20, s: 'E' }, { feature: 'randomReward', level: 8, s: 'R' },
  ]);

  // ------------------------------------------------------------------ Quests
  const quests = [];
  const Q = (id, name, obj, reward, x = {}) => { quests.push({ id, name, prereq: quests.length ? [quests[quests.length - 1].id] : [], obj: [obj], reward, ...x }); };
  const kill = (m, n) => ({ counter: `kill:${m}`, n, from: 'accept' });
  const G = (n) => [{ item: 'gold', n }];
  Q('q_001', 'Besiege 5 Mandragora', kill('mandragora', 5), G(10));
  Q('q_002', 'Baue das Bonfire', { cond: { building: 'bonfire' } }, G(20), { unlock: ['abilities'], unlockOn: 'clear', s: 'D' });
  Q('q_003', 'Verbessere Power 2x', { counter: 'upgrade:ab_power', n: 2, from: 'life' }, [{ item: 'key_warrior', n: 1 }, { item: 'gold', n: 30 }]);
  Q('q_004', 'Öffne eine Waffentruhe', { counter: 'gacha:warrior', n: 1, from: 'life' }, G(30), { unlock: ['shop'], unlockOn: 'receive', s: 'D' });
  Q('q_005', 'Rüste eine Waffe aus', { cond: { mainEquipped: true } }, G(30), { unlock: ['weaponVault'], unlockOn: 'receive', s: 'D' });
  Q('q_006', 'Besiege 8 Slimes', kill('slime', 8), G(40));
  Q('q_007', 'Baue die Smithy', { cond: { building: 'smithy' } }, G(60), { unlock: ['craft'], unlockOn: 'clear', s: 'D' });
  Q('q_008', 'Schmiede 3 Waffen', { counter: 'craft', n: 3, from: 'life' }, G(60));
  Q('q_009', 'Besiege 6 Mushrooms', kill('mushroom', 6), G(60));
  Q('q_010', 'Sprich mit der Späherin', { counter: 'talk:npc_scout', n: 1, from: 'life' }, G(40));
  Q('q_011', 'Besiege 6 Spinnen', kill('spider', 6), G(80));
  const feat = {
    2: [['Besiege 15 Kakteen', kill('cactus', 15), { unlock: ['codex'], unlockOn: 'clear', s: 'D' }],
      ['Baue das ChestHouse', { cond: { building: 'chesthouse' } }, {}],
      ['Öffne eine Feldtruhe und hole die Belohnung ab', { counter: 'chest:claim', n: 1, from: 'life' }, { unlock: ['missions'], unlockOn: 'clear', s: 'D' }],
      ['Rüste eine Nebenwaffe aus', { cond: { equippedSubs: 1 } }, { unlock: ['slot2'], unlockOn: 'receive', s: 'D' }],
      ['Kehre zur Basis zurück', { counter: 'returnBase', n: 1, from: 'accept' }, { unlock: ['tower'], unlockOn: 'clear', s: '?' }]],
    3: [['Baue die Lumbermill', { cond: { building: 'lumbermill' } }, {}],
      ['Baue die Quarry', { cond: { building: 'quarry' } }, { reward: [{ item: 'gems', n: 150 }], s: 'E' }],
      ['Baue den CostumeShop', { cond: { building: 'costumeshop' } }, { unlock: ['special'], unlockOn: 'clear', s: 'E' }],
      ['Beschwöre einen Helden', { counter: 'gacha:hero', n: 1, from: 'life' }, { unlock: ['heroShop'], unlockOn: 'receive', s: 'D' }],
      ['Verbessere einen Helden', { counter: 'heroLevel', n: 1, from: 'life' }, { unlock: ['heroes'], unlockOn: 'receive', grant: [{ item: 'evo_coin', n: 30 }], s: 'D' }],
      ['Besiege das Giant Chicken', kill('giant_chicken', 1), { unlock: ['sTierChest'], unlockOn: 'clear', s: 'D' }]],
    4: [['Baue das Portal', { cond: { building: 'portal' } }, { unlock: ['portal'], unlockOn: 'clear', s: 'D' }],
      ['Stelle deine Invasion-Verteidigung auf', { counter: 'invasion:defenseSet', n: 1, from: 'life' }, { unlock: ['invasion', 'pvp'], unlockOn: 'receive', s: 'D' }],
      ['Nutze ein Extra-Upgrade', { counter: 'upgrade:extra', n: 1, from: 'life' }, { unlock: ['extra'], unlockOn: 'receive', grant: [{ item: 'orb_ice', n: 6 }], s: 'E' }]],
    7: [['Wirke ein Soul-Upgrade', { counter: 'upgrade:soul', n: 1, from: 'life' }, { unlock: ['soul'], unlockOn: 'receive', grant: [{ item: 'orb_hell', n: 6 }], s: 'D' }],
      ['Rolle einen Trait', { counter: 'traitRoll', n: 1, from: 'life' }, { unlock: ['traits'], unlockOn: 'receive', grant: [{ item: 'attr_point', n: 30 }], s: 'D' }]],
    8: [['Boss-Raid-Vorbereitung (#901003)', { cond: { level: 1 } }, { id: 'q_901003', unlock: ['raid'], unlockOn: 'clear', s: 'D' }]],
    9: [['Betritt das Tomb of Heroes (#902002)', { counter: 'mode:tomb:clear', n: 1, from: 'life' }, { id: 'q_902002', unlock: ['tomb'], unlockOn: 'receive', unlock2: ['runes'], s: 'D' }]],
  };
  for (const a of areas) {
    const s = a.stage, ms = variants.filter((v) => v.rank === 'normal' && groups.some((g) => g.area === a.id && g.v === v.id));
    for (const [nm, obj, x] of feat[s] || []) { const { id, reward, ...rest } = x; Q(id || `q_${a.id}_f${quests.length}`, nm, obj, reward || G(50 * s * s), rest); }
    if (s > 1) { Q(`q_${a.id}_k1`, `Besiege 10 ${ms[0].name}`, kill(ms[0].id, 10), G(60 * s * s)); Q(`q_${a.id}_k2`, `Besiege 10 ${ms[2].name}`, kill(ms[2].id, 10), G(80 * s * s)); }
    Q(`q_${a.id}_boss`, `Besiege ${a.name}-Boss ${AREA[s - 1][2]}`, { cond: { cleared: a.id } }, [{ item: 'gold', n: 150 * s * s }, { item: 'weapon_scroll', n: 3 }, ...(s === 5 ? [] : [])],
      s === 5 ? { unlock: ['heroEvolution', 'heroCollection'], unlockOn: 'clear', s: 'D' } : {});
  }
  T('quests', 'R', 'Hauptquestkette (Original ca. 850 Einträge nicht erfasst): dokumentierte Unlock-Kopplungen (s=D) + eigene Gebietsquests.', quests);

  // ------------------------------------------------------------------ Claim-Tracks
  const tracks = [];
  const lvGold = (L) => (L === 100 ? 29054 : L === 105 ? 29980 : Math.round(29054 * (L / 100) ** 0.65));
  tracks.push({ id: 'levelup', name: 'Level-Up-Belohnungen', kind: 'milestone', s: 'R', note: '80 Meilensteine L5..400 mit zusammen 200 Reward-Zeilen (80 Gold + 80 Gems + 40 BlueStone; Zuordnung R), Gems 2 (x5=10) D, L100/L105 Gold D, BlueStone 25 @x5 auf Zehnern (L100 D); übriges Gold E.',
    nodes: Array.from({ length: 80 }, (_, k) => { const L = (k + 1) * 5; return { id: `L${L}`, name: `Level ${L}`, cond: { level: L }, bonusMult: 5,
      reward: [{ item: 'gems', n: 2 }, { item: 'gold', n: lvGold(L) }, ...(L % 10 === 0 ? [{ item: 'bluestone', n: 5 }] : [])] }; }) });
  tracks.push({ id: 'codex', name: 'Monster-Codex', kind: 'milestone', unlock: { unlock: 'codex' }, s: 'R', note: '2 Gems je Meilensteinzeile (D); Schwellen eigen.',
    nodes: monsters.filter((m) => m.rank !== 'node').flatMap((m) => [10, 50, 200, 1000].map((n) => ({ id: `${m.id}_${n}`, name: `${m.name} x${n}`, cond: { counter: `kill:${m.id}`, gte: n }, reward: [{ item: 'gems', n: 2 }] }))) });
  tracks.push({ id: 'minimap', name: 'Minimap-Belohnungen', kind: 'milestone', s: 'D', note: 'Einmalig je Gebiet; 14 Gem-Stufen = 4.400. Auslöser Boss-Erstsieg = R.',
    nodes: areas.map((a) => ({ id: a.id, name: a.name, cond: { cleared: a.id }, reward: a.minimap })) });
  for (const ch of [1, 2, 3]) tracks.push({ id: `chapterpass_${ch}`, name: `Chapter Pass ${ch}`, kind: 'pass', tab: 'chapterpass', s: 'D',
    note: 'Freie Reihe 20 x 200 Gems = 4.000. Paid-Track (77.000 Gems) wird bewusst NICHT ausgezahlt.',
    nodes: areas.filter((a) => a.chapter === ch).map((a) => ({ id: a.id, name: a.name, cond: { cleared: a.id }, reward: [{ item: 'gems', n: 200 }] })) });
  // 7-Day-Event: 71 Missionen, 34 x 100 Gems + 30 x 50 = 4.900 (Summe D, Aufteilung der restlichen 1.500 E)
  const sd = [];
  for (let d = 1; d <= 7; d++) sd.push([`Login Tag ${d}`, { counter: 'login', gte: d, scope: 'track' }]);
  areas.slice(0, 6).forEach((a) => sd.push([`Besiege ${AREA[a.stage - 1][2]}`, { cleared: a.id }]));
  [50, 150, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000].forEach((n) => sd.push([`${n} Gegner besiegen`, { counter: 'kill:any', gte: n, scope: 'track' }]));
  [3, 10, 20, 40, 70, 100, 150, 200].forEach((n) => sd.push([`${n}x schmieden`, { counter: 'craft', gte: n, scope: 'track' }]));
  [1, 3, 6, 10, 15, 20, 30, 40].forEach((n) => sd.push([`${n} Feldtruhen abholen`, { counter: 'chest:claim', gte: n, scope: 'track' }]));
  [1, 2, 3, 4, 5].forEach((r) => sd.push([`Besitze eine ${RARITIES[r]}-Waffe`, { hasWeaponRarity: r }]));
  [1, 3, 5, 8, 10, 15, 20, 25, 30, 40].forEach((n) => sd.push([`Tower-Etage ${n}`, { towerBest: n }]));
  [16, 18, 20, 22, 25, 28, 31, 34, 37, 40].forEach((n) => sd.push([`Erreiche Level ${n}`, { level: n }]));
  [10, 25, 50, 80, 120, 170, 230].forEach((n) => sd.push([`${n} Ability-Upgrades`, { counter: 'upgrade:ability', gte: n, scope: 'track' }]));
  const sdNodes = sd.map(([name, cond], k) => ({ id: `m${k}`, name, day: (k % 7) + 1, cond: { all: [{ day: (k % 7) + 1 }, cond] },
    reward: [k < 34 ? { item: 'gems', n: 100 } : k < 64 ? { item: 'gems', n: 50 } : { item: 'gold', n: 5000 }, { points: 'pts:7day', n: 10 }] }));
  [100, 250, 400, 550, 710].forEach((p, k) => sdNodes.push({ id: `p${p}`, name: `${p} Punkte`, milestone: true, cond: { counter: 'pts:7day', gte: p },
    reward: [[{ item: 'key_warrior', n: 5 }], [{ item: 'evo_coin', n: 100 }], [{ item: 'key_stier', n: 3 }], [{ item: 'key_special_hero', n: 5 }], [{ item: 'hero_select_ticket', n: 1 }]][k] }));
  tracks.push({ id: 'sevenDay', name: 'New User 7-Day Event', kind: 'event', unlock: { unlock: 'sevenDay' }, baseline: true, durationDays: 14, s: 'R',
    note: '71 Missionen, 4.900 Gems gesamt, 34 x 100 (D). Einzelaufgaben, Tage, Punkte, Meilensteinrewards eigen.', nodes: sdNodes });
  const dm = [['kill:any', 100, 'Besiege 100 Gegner'], ['craft', 3, 'Schmiede 3x'], ['upgrade:ability', 5, '5 Ability-Upgrades'], ['chest:claim', 1, 'Hole 1 Truhe ab'],
    ['mode:any:start', 2, 'Spiele 2 Modus-Runden'], ['gacha:any', 1, 'Öffne 1 Truhe/Box']];
  tracks.push({ id: 'daily', name: 'Tägliche Missionen', kind: 'missions', unlock: { unlock: 'missions' }, reset: 'daily', s: 'E',
    nodes: [...dm.map(([c, n, name], k) => ({ id: `d${k}`, name, cond: { counter: c, gte: n, scope: 'daily' }, reward: [{ item: 'gold', n: 300 }, { points: 'pts:daily', n: 20 }, { points: 'pts:bp', n: 20 }] })),
      ...[40, 80, 120].map((p) => ({ id: `dp${p}`, name: `${p} Tagespunkte`, milestone: true, cond: { counter: 'pts:daily', gte: p, scope: 'daily' }, reward: [{ item: 'exp', n: 1 }, { item: 'weapon_scroll', n: 3 }] }))] });
  tracks.push({ id: 'weekly', name: 'Wöchentliche Missionen', kind: 'missions', unlock: { unlock: 'missions' }, reset: 'weekly', s: 'E',
    nodes: [['kill:any', 2000, 'Besiege 2000 Gegner'], ['mode:tower:clear', 5, '5 Tower-Etagen'], ['bossKill', 3, 'Besiege 3 Bosse'], ['craft', 30, 'Schmiede 30x']]
      .map(([c, n, name], k) => ({ id: `w${k}`, name, cond: { counter: c, gte: n, scope: 'weekly' }, reward: [{ item: 'evo_coin', n: 30 }, { item: 'spin_ticket', n: 1 }, { points: 'pts:bp', n: 100 }] })) });
  tracks.push({ id: 'login', name: 'Login-Belohnungen', kind: 'login', reset: 'cycle', s: 'E',
    nodes: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ id: `d${d}`, name: `Tag ${d}`, cond: { counter: 'login', gte: d, scope: 'track' },
      reward: d === 7 ? [{ item: 'key_warrior', n: 3 }, { item: 'spin_ticket', n: 2 }] : [{ item: 'gold', n: 500 * d }, { item: 'weapon_scroll', n: d }] })) });
  tracks.push({ id: 'battlepass', name: 'Battle Pass (freie Reihe)', kind: 'pass', unlock: { unlock: 'battlePass' }, baseline: true, seasonDays: 28, s: 'E',
    note: 'Kauf-Track entfernt; Inhalte/Stufen eigen.',
    nodes: Array.from({ length: 30 }, (_, k) => ({ id: `bp${k + 1}`, name: `Stufe ${k + 1}`, cond: { counter: 'pts:bp', gte: (k + 1) * 100, scope: 'track' },
      reward: [[{ item: 'weapon_scroll', n: 5 }], [{ item: 'evo_coin', n: 20 }], [{ item: 'bluestone', n: 5 }], [{ item: 'key_warrior', n: 1 }], [{ item: 'exp', n: 2 }]][k % 5] })) });
  tracks.push({ id: 'carnival', name: 'Carnival', kind: 'event', unlock: { unlock: 'carnival' }, baseline: true, durationDays: 7, s: 'E',
    nodes: [200, 500, 1000, 2000].map((n) => ({ id: `c${n}`, name: `${n} Gegner`, cond: { counter: 'kill:any', gte: n, scope: 'track' }, reward: [{ item: 'key_stier', n: 1 }, { item: 'gold', n: n * 20 }] })) });
  tracks.push({ id: 'invasionpass', name: 'Invasion-Pass-Missionen', kind: 'pass', unlock: { unlock: 'invasion' }, reset: 'weekly', s: 'R', note: 'Missionstypen D (Wins, Streak, Rest-HP, Auto-Battle); Werte eigen.',
    nodes: [['invasion:win', 5, '5 Siege'], ['invasion:streak3', 1, '3er-Siegesserie'], ['invasion:hp50', 3, '3 Siege mit >50% HP'], ['invasion:auto', 5, '5 Auto-Battles']]
      .map(([c, n, name], k) => ({ id: `ip${k}`, name, cond: { counter: c, gte: n, scope: 'weekly' }, reward: [{ item: 'invasion_coin', n: 100 }] })) });
  T('tracks', 'R', 'Generische Claim-Tracks (Meilensteine, Missionen, Pässe, Events). Status je Track im Feld s.', tracks);

  // ------------------------------------------------------------------ Shop
  const shop = [];
  const S = (id, cat, name, price, reward, x = {}) => shop.push({ id, cat, name, price, reward, limit: 0, reset: 'none', s: 'E', ...x });
  S('gem_9002', 'daily_gems', 'Gratis-Gems I', {}, [{ item: 'gems', n: 15 }], { limit: 1, reset: 'daily', s: 'D', gemClaim: true });
  S('gem_9003', 'daily_gems', 'Gratis-Gems II', {}, [{ item: 'gems', n: 20 }], { limit: 1, reset: 'daily', s: 'D', gemClaim: true });
  S('gem_9004', 'daily_gems', 'Gratis-Gems III', {}, [{ item: 'gems', n: 30 }], { limit: 1, reset: 'daily', s: 'D', gemClaim: true });
  S('tk_tower', 'tickets', 'Tower-Ticket', { gems: 20 }, [{ item: 'ticket_tower', n: 1 }], { limit: 5, reset: 'daily', unlock: { unlock: 'tower' } });
  S('tk_raid', 'tickets', 'Raid-Ticket', { gems: 40 }, [{ item: 'ticket_raid', n: 1 }], { limit: 2, reset: 'daily', unlock: { unlock: 'raid' } });
  S('tk_tomb', 'tickets', 'Tomb-Ticket', { gems: 30 }, [{ item: 'ticket_tomb', n: 1 }], { limit: 3, reset: 'daily', unlock: { unlock: 'tomb' } });
  S('tk_inv', 'tickets', 'Invasion-Ticket', { gems: 20 }, [{ item: 'ticket_invasion', n: 1 }], { limit: 5, reset: 'daily', unlock: { unlock: 'invasion' } });
  S('tk_pvp_free', 'tickets', 'PvP-Ticket (gratis)', {}, [{ item: 'ticket_pvp', n: 1 }], { cap: 'pvpTicket', unlock: { unlock: 'pvp' }, s: 'D' });
  S('tk_tower_free', 'tickets', 'Tower-Bonusticket (gratis)', {}, [{ item: 'ticket_tower', n: 1 }], { cap: 'towerBonus', unlock: { unlock: 'tower' }, s: 'D' });
  S('mat_scroll', 'materials', '10 Weapon Scrolls', { gold: 5000 }, [{ item: 'weapon_scroll', n: 10 }], { limit: 5, reset: 'daily' });
  S('mat_evo', 'materials', '50 Evolution Coins', { gems: 100 }, [{ item: 'evo_coin', n: 50 }], { limit: 3, reset: 'daily', unlock: { unlock: 'heroes' } });
  S('mat_attr', 'materials', '50 Attribute Points', { gems: 100 }, [{ item: 'attr_point', n: 50 }], { limit: 3, reset: 'daily', unlock: { unlock: 'traits' } });
  S('mat_keyw', 'materials', 'Warrior Chest Key', { gems: 90 }, [{ item: 'key_warrior', n: 1 }], { limit: 10, reset: 'daily' });
  areas.forEach((a) => S(`stagepack_${a.id}`, 'stage_packs', `Stage Pack ${a.name}`, { gold: 500 * a.stage ** 3 },
    [{ item: 'weapon_scroll', n: 10 + 2 * a.stage }, { item: 'evo_coin', n: 10 * a.stage }, { item: 'key_warrior', n: 2 }], { limit: 1, unlock: { cleared: a.id }, s: 'R',
      note: '20 Stage Packs passend zur Gebietsfreischaltung (D); als erspielbares Gold-Angebot, Inhalt/Preis eigen. Kein Kaufpopup.' }));
  S('chapterpack_1', 'chapter_packs', 'Chapter Pack 1 (nach Baal)', { gems: 800 }, [{ item: 'key_stier', n: 10 }, { item: 'evo_coin', n: 300 }, { item: 'hero_select_ticket', n: 1 }], { limit: 1, unlock: { cleared: 'a1_6' }, s: 'R' });
  S('chapterpack_2', 'chapter_packs', 'Chapter Pack 2 (nach Frost King)', { gems: 1600 }, [{ item: 'key_stier', n: 20 }, { item: 'evo_coin', n: 1000 }, { item: 'hero_select_ticket', n: 2 }], { limit: 1, unlock: { cleared: 'a2_7' }, s: 'R' });
  S('inv_scroll', 'invasion', '20 Weapon Scrolls', { invasion_coin: 200 }, [{ item: 'weapon_scroll', n: 20 }], { limit: 5, reset: 'weekly', unlock: { unlock: 'invasion' } });
  S('inv_evo', 'invasion', '100 Evolution Coins', { invasion_coin: 400 }, [{ item: 'evo_coin', n: 100 }], { limit: 3, reset: 'weekly', unlock: { unlock: 'invasion' } });
  S('inv_keys', 'invasion', 'S-Tier Chest Key', { invasion_coin: 600 }, [{ item: 'key_stier', n: 1 }], { limit: 3, reset: 'weekly', unlock: { unlock: 'invasion' } });
  S('perk_home', 'perks', 'Perk: Unbegrenzte Home Returns', { gems: 500 }, [{ flag: 'perk_home' }], { limit: 1, s: 'R' });
  S('perk_tickets', 'perks', 'Perk: +1 Tagesticket Tower/Invasion/Raid/Tomb', { gems: 1500 }, [{ flag: 'perk_tickets' }], { limit: 1, s: 'R' });
  S('perk_orbs', 'perks', 'Perk: Feld-Orb-Drops x2', { gems: 2000 }, [{ flag: 'perk_orbs' }], { limit: 1, unlock: { cleared: 'a1_3' }, s: 'R' });
  S('perk_cargo', 'perks', 'Perk: Cargo +2000', { gems: 1000 }, [{ flag: 'perk_cargo' }], { limit: 1, s: '?' });
  T('shop', 'R', 'Rein spielinterner Katalog. Royal-Perks (D) als erspielbare Einmal-Angebote; Preise eigen. EXP-Perk (Wert 1000, Einheit ungeklärt) nicht angewendet.', shop);
  T('perks', 'D', 'Royal-Lifetime-Perkwerte; Einheit von cargo/exp ungeklärt (cargo als flacher Wert angewendet = R, exp nicht angewendet).', [
    { id: 'perk_home', effect: 'unlimitedHomeReturn' }, { id: 'perk_tickets', effect: 'dailyTicketPlus', v: 1, items: ['ticket_tower', 'ticket_invasion', 'ticket_raid', 'ticket_tomb'] },
    { id: 'perk_orbs', effect: 'orbDropMult', v: 2 }, { id: 'perk_cargo', effect: 'stat', stat: 'cargo', v: 2000 }, { id: 'perk_exp', effect: 'none', v: 1000, s: '?' }]);
  T('merchant', 'E', 'Rollierender Händler: täglich (UTC) per Seed 4 Angebote; Refresh gegen Gems. Boss-Rank-Shop: 1 Gratis-Refresh/Tag (D-Cap).', [
    { id: 'rot', name: 'Wanderhändler', pick: 4, refreshCost: { gems: 20 }, freeRefreshCap: null, unlock: { unlock: 'shop' }, pool: [
      { id: 'r1', name: '5 BlueStone', price: { gold: 3000 }, reward: [{ item: 'bluestone', n: 5 }], stock: 2, w: 3 }, { id: 'r2', name: '3 Red Orbs', price: { gold: 1500 }, reward: [{ item: 'orb_red', n: 3 }], stock: 3, w: 3 },
      { id: 'r3', name: '3 Pink Orbs', price: { gold: 6000 }, reward: [{ item: 'orb_pink', n: 3 }], stock: 3, w: 2 }, { id: 'r4', name: 'S-Tier Key', price: { gems: 250 }, reward: [{ item: 'key_stier', n: 1 }], stock: 1, w: 1 },
      { id: 'r5', name: '20 Rune Dust', price: { gold: 20000 }, reward: [{ item: 'rune_dust', n: 20 }], stock: 2, w: 2 }, { id: 'r6', name: '2 EXP', price: { gems: 60 }, reward: [{ item: 'exp', n: 2 }], stock: 2, w: 2 },
      { id: 'r7', name: 'Spin-Ticket', price: { gems: 50 }, reward: [{ item: 'spin_ticket', n: 1 }], stock: 1, w: 2 }, { id: 'r8', name: '10 Holz', price: { gold: 400 }, reward: [{ item: 'wood', n: 10 }], stock: 3, w: 2 }] },
    { id: 'bossrank', name: 'Boss-Rank-Shop', pick: 3, refreshCost: { gems: 30 }, freeRefreshCap: 'bossRankRefresh', unlock: { unlock: 'raid' }, pool: [
      { id: 'b1', name: '30 Weapon Scrolls', price: { raid_coin: 100 }, reward: [{ item: 'weapon_scroll', n: 30 }], stock: 2, w: 3 }, { id: 'b2', name: '10 Hell Orbs', price: { raid_coin: 200 }, reward: [{ item: 'orb_hell', n: 10 }], stock: 2, w: 2 },
      { id: 'b3', name: 'S-Tier Key', price: { raid_coin: 300 }, reward: [{ item: 'key_stier', n: 1 }], stock: 1, w: 2 }, { id: 'b4', name: '10 Pink Orbs', price: { raid_coin: 150 }, reward: [{ item: 'orb_pink', n: 10 }], stock: 2, w: 2 },
      { id: 'b5', name: 'Hero Select Ticket', price: { raid_coin: 1500 }, reward: [{ item: 'hero_select_ticket', n: 1 }], stock: 1, w: 1 }] },
  ]);
  T('randomReward', 'R', 'IngameRV: 393 Levelzeilen (als Band L8-400, R); Gem-Gewicht 0,10 Menge 10 (D); Orb-Mengenbereiche D, Orb-Gewichte E. Crimson/Azure/Soul unzugeordnet = deaktiviert.', [
    { id: 'band1', minLevel: 8, maxLevel: 400, rows: [{ w: 0.10, item: 'gems', min: 10, max: 10, s: 'D' }, { w: 0.45, item: 'orb_red', min: 4, max: 22 }, { w: 0.45, item: 'orb_pink', min: 3, max: 14 },
      { w: 0, alias: 'crimson', min: 3, max: 33, s: '?' }, { w: 0, alias: 'azure', min: 4, max: 11, s: '?' }, { w: 0, alias: 'soul', min: 3, max: 11, s: '?' }] }]);
  T('spinSegments', 'E', '7 Segmentdefinitionen (D-Zählung, 192 Originalzeilen nicht erfasst); Bedingungen und Rewardzeilen eigen.', [0, 2, 5, 8, 11, 14, 17].map((minStage, k) =>
    ({ id: `seg${k + 1}`, minStage, rows: [{ w: 30, item: 'gold', min: 500 * 4 ** k, max: 1500 * 4 ** k }, { w: 20, item: 'weapon_scroll', min: 2, max: 6 + k }, { w: 15, item: 'orb_red', min: 3, max: 8 + k },
      { w: 12, item: 'evo_coin', min: 5 + 5 * k, max: 15 + 10 * k }, { w: 10, item: 'bluestone', min: 2, max: 5 + k }, { w: 8, item: 'gems', min: 10, max: 20 }, { w: 4, item: 'key_warrior', min: 1, max: 2 }, { w: 1, item: 'gems', min: 100, max: 100 }] })));

  // ------------------------------------------------------------------ Modi
  T('towerFloors', 'R', '250 Etagen (D); Etage 151 = 35 Gems (D). Gegner, Wellen, übrige Rewards eigen (Gems = 5 + floor(Etage/5)).',
    Array.from({ length: 250 }, (_, k) => { const f = k + 1, boss = f % 10 === 0; return { floor: f, level: Math.round(2 + f * 1.55), timer: null,
      waves: boss ? [[{ rank: 'normal', count: 6 }], [{ rank: 'boss', count: 1 }]] : [[{ rank: 'normal', count: 5 }], [{ rank: 'normal', count: 5 }, { rank: 'elite', count: 1 }]],
      first: [{ item: 'gems', n: 5 + Math.floor(f / 5) }, { item: 'gold', n: 100 * f * f }, ...(boss ? [{ item: 'synergy_point', n: 5 }, { item: 'exp', n: 2 }] : [])],
      repeat: [{ item: 'gold', n: 20 * f * f }], s: f === 151 ? 'D' : 'E' }; }));
  T('raidBosses', 'E', '6 Spezialbosse (B); Namen, Werte, Wertung eigen.', [1, 2, 3, 4, 5, 6].map((k) => ({ id: `raid_${k}`, name: `Raid-Boss ${k}`, level: 100 + k * 45, hpMult: 60,
    tiers: [5, 20, 50, 100].map((pct, t) => ({ pct, reward: [{ item: 'weapon_scroll', n: 10 * (t + 1) * k }, { item: 'raid_coin', n: 30 * (t + 1) }, { item: ['orb_red', 'orb_pink', 'orb_ice', 'orb_jungle', 'orb_hell', 'orb_hell'][k - 1], n: 3 * (t + 1) }] })) })));
  T('tombTiers', 'R', '20 Schwierigkeits-/Dropstufen (D); Gegner, Typ-/Raritätsgewichte eigen.', Array.from({ length: 20 }, (_, k) => ({ tier: k + 1, level: 150 + k * 13,
    waves: [[{ rank: 'normal', count: 8 }], [{ rank: 'elite', count: 2 }, { rank: 'normal', count: 4 }], [{ rank: 'boss', count: 1 }]],
    drops: { count: 3 + Math.floor(k / 5), dust: 10 + 5 * k, typeW: [{ type: 'hero', w: 1 }, { type: 'melee', w: 1 }, { type: 'ranged', w: 1 }, { type: 'universal', w: 1 }],
      rarityW: [1, 2, 3, 4, 5, 6, 7, 8].map((r) => ({ rarity: r, w: Math.max(0, Math.round(100 * Math.exp(-((r - 1 - k / 3.2) ** 2) / 1.5))) })) } })));
  T('invasionTiers', 'R', '6 Tiers (D); Auf-/Abstieg nach Top-Perzentil, Rewards eigen.', ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Meister'].map((name, k) =>
    ({ id: k, name, promoteTopPct: k < 5 ? 30 : 0, demoteBottomPct: k > 0 ? 20 : 0, coinPerWin: 20 + 10 * k, seasonReward: [{ item: 'invasion_coin', n: 100 * (k + 1) }, { item: 'gold', n: 5000 * 4 ** k }] })));
  T('events', 'E', 'Eigene Live-Events (EventDef). Zeitfenster UTC; per Admin-Panel pflegbar.', [
    { id: 'ev_hunt', name: 'Jagdsaison', start: '2026-11-01T00:00:00Z', end: '2027-03-01T00:00:00Z', graceDays: 2, segment: { level: 24 },
      track: { id: 'ev_hunt', name: 'Jagdsaison', kind: 'event', baseline: true, nodes: [500, 2000, 5000].map((n) => ({ id: `h${n}`, name: `${n} Gegner`, cond: { counter: 'kill:any', gte: n, scope: 'track' }, reward: [{ item: 'evo_coin', n: n / 10 }, { item: 'exp', n: 3 }] })) } }]);
  T('codes', 'E', 'Eigene Belohnungscodes (lokaler Kanal); keine Fremdcodes. Format {id, code, reward, expires, max}.', []);
  T('base', 'E', 'Basis-Karte.', [{ id: 'base', w: 1600, h: 1100, entry: { x: 800, y: 900 }, gate: { x: 800, y: 60 }, next: 'a1_1' }]);

  const pack = { schema: SCHEMA, version: 'base-27.2.0-1', ref: '27.2.0', tables, meta, config, configMeta };
  return pack;
}
