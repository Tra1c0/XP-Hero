// Basis-Content-Paket. Jede Tabelle/jeder Konfigwert trägt einen Herkunftsstatus:
//  D = aus der Referenz (27.2.0, xphero.fans laut Systemanalyse) belegt
//  B = beobachtete Mechanik, Details eigen   R = Rekonstruktion/Interpretation
//  E = EIGENER Wert (Original unbekannt, bewusst konfigurierbar)   ? = offen/zu verifizieren
// Zeilen können mit Feld `s` einen abweichenden Zeilenstatus tragen. Nichts hiervon ist Gameplay-Code.
import { WORLD, BUILDINGS as W1_BUILDINGS, BASE as W1_BASE, REF as W1, zoneOf as zoneOfMap, nearestFloor, onFloor } from './world1.js';
import { inPoly } from '../worldgrid.js';
import { BESTIARY } from './bestiary_ref.js';
import { ABILITY_REF, BLESS_REF } from './progression_ref.js';
import { CHOP, STONE, SPAWN_PTS, SPAWN_OFF } from './scene1_ref.js';
import { BUILD, SMITHY, SMITHY_RATES, SMITHY_ROLL, CHEST, CHESTSPAWN, KEYHOUSE, KEYSLOT, SUBSLOT, WGOLD, LVREW, MAINQ } from './econ_ref.js';
import { WEAPON_REF } from './weapon_ref.js';
import { WEAPON_WIKI, TYPE_BONUS, UPGRADE_WIKI } from './wiki_ref.js';
import { ENEMY as G_ENEMY, LEVEL_XP, KILL_XP_LIMIT, PLAYER_LV, WEAPON as G_WEAPON, CONFIG as G_CONFIG, SPAWN as G_SPAWN } from './game_ref.js';
import { NPC_REF } from './npc_ref.js';

export const SCHEMA = 1;
export const RARITIES = ['Normal', 'Fine', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mythic', 'Exotic', 'Eternal'];
export const STATS = ['atk', 'hp', 'cargo', 'atkSpeedPct', 'regen', 'critChance', 'critDmg', 'moveSpeedPct', 'multiHit', 'tripleHit', 'lifesteal',
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

// opt.multiplayer: PvP-Arena und Invasion (Ranglisten-Duelle) samt zugehöriger Quests, Tickets, Shop-Angebote und Weltobjekte. Standard: aus (Solo-Spiel).
export function buildBaseContent(opt = {}) {
  const MP = !!opt.multiplayer;
  const tables = {}, meta = {}, config = {}, configMeta = {};
  // Kapitel-1-Positionen außerhalb des Kartenbodens (Referenzpunkte vor Raid-Räumen, kreisende Fledermäuse) rücken auf den nächsten Boden ihres Gebiets; refPos behält das Original.
  const place = (row) => { if (row && Array.isArray(row.pos) && (row.area == null || row.area === 'base' || String(row.area).startsWith('a1_')) && !onFloor(row.pos[0], row.pos[1])) { row.refPos = row.pos; row.pos = nearestFloor(row.pos[0], row.pos[1], row.home || row.area); if (row.area == null && 'area' in row) row.area = zoneOfMap(row.pos[0], row.pos[1]); } return row; };
  const T = (name, status, note, rows) => { if (Array.isArray(rows)) rows.forEach(place); tables[name] = rows; meta[name] = { status, note }; return rows; };
  const C = (key, v, status, note = '') => { config[key] = v; configMeta[key] = { status, note }; };

  // ------------------------------------------------------------------ Konfiguration
  C('curves', {
    mobHp: [10, 2, 2.2], mobAtk: [0.5, 1.6], mobXp: [2, 1, 1.1], mobGold: [1, 0.6, 1.6],
    rank: {
      normal: { hp: 1, atk: 1, xp: 1, gold: 1 }, elite: { hp: 4, atk: 2, xp: 4, gold: 4 }, rare: { hp: 8, atk: 2.5, xp: 10, gold: 12 },
      boss: { hp: 12, atk: 3, xp: 20, gold: 25 }, special: { hp: 3, atk: 1, xp: 3, gold: 10 }, node: { hp: 0.6, atk: 0, xp: 0, gold: 0 },
    },
  }, 'E', 'Eigene Gegnerkurve; Originalwerte je Variante aus Bestiary importieren.');
  C('xp', { trigger: 'kill', factor: 1, capBehavior: 'discard', maxLevel: 400, healOnLevelUp: true }, '?',
    'XP-Auszahlungsort, Rundung (floor), Cap-Verhalten und HP-Behandlung sind eigen. factor = Progressionstempo.');
  C('rewardFactor', { gold: 1, drops: 1 }, 'E', 'Eigenes Progressionstempo, unabhängig von der Simulation.');
  C('bonusClaims', { mode: 'replace', levelUp: true, giftChest: true }, '?',
    'Früherer Rewarded-Ad-Bonus (x5) als direkter Gratis-Claim. replace|add ungeklärt.');
  C('caps', { towerBonus: 5, pvpReward: 5, pvpTicket: 10, revive: 3, dailyGemShop: 2, bossRankRefresh: 1, randomReward: 10, freeSpin: 1 }, 'D',
    'Erste 6 Keys = dokumentierte Tagescaps (Summe 26). randomReward/freeSpin = E.');
  C('applyDailyGemShopCapToFreeGems', false, '?', 'Semantik von Daily-Gem-Shop-RV-Cap 2 ungeklärt; standardmäßig nicht auf 9002-9004 angewendet.');
  C('dailyTickets', { ticket_tower: 5, ticket_invasion: 5, ticket_raid: 2, ticket_tomb: 3, ticket_pvp: 5 }, 'E', 'Tägliche Grundtickets (Auffüllen bis zu diesem Wert).');
  C('player', { baseCargo: 20, moveSpeed: 230, critChance: 5, critDmg: 150, pickupRadius: 90, regenPct: 1, radius: 16 }, 'E', 'Grundwerte Spieler.');
  C('statCaps', { critChance: 100, cooldownPct: 70, atkSpeedPct: 400, moveSpeedPct: 150, lifesteal: 50, multiHit: 100, tripleHit: 100 }, 'E', 'Obergrenzen; Kritchance <= 100.');
  C('combat', { weaponSkillRadius: 110, subRangeM: Number(G_CONFIG.SubWeapon_AttackRange), fistAps: Number(G_CONFIG.Player_Init_AtkSpd), enemyLeashM: 8, wanderCycleSec: Number(G_CONFIG.Enemy_WanderCycleTime) || 4, enemySpeedCap: 300, subIntervalMult: 2.2, subDmgMult: 0.6, dropDespawnSec: 90, respawnOfflineContinues: true, defaultRespawnSec: 30, bossRespawnSec: 3600, tick: 1 / 30 }, 'R',
    'Nebenwaffen feuern langsamer/schwächer als die Hauptwaffe (eigene Werte). Offline-Respawn ungeklärt.');
  C('weaponLevelCost', { gold: WGOLD }, 'D', 'Waffenstufe: Gold nach Stützstufen (dazwischen linear), Schriftrollen 2 x Stufe - 1; unabhängig von der Seltenheit (Spieldaten).');
  C('craftCost', [5, 5, 5, 5, 5, 5, 5, 5], 'B', 'Schmieden kostet auf jeder Schmiedestufe 5 Kristalle (Vorlage).');
  C('weaponSlots', [{ slot: 1 }, ...SUBSLOT.map(([level, cost, quest], k) => ({ slot: k + 2, level, cost, ...(quest ? { quest: true } : {}) }))], 'D', 'Waffenplätze 2-6: Level und Kosten aus den Spieldaten; Platz 2 schaltet die Questkette frei.');
  C('traits', { slots: 5, presets: 3, rerollCost: { attr_point: 10 }, lockSurcharge: 0.5 }, '?', 'Slotzahl, Rollkosten und Lockkosten eigen.');
  C('runes', { slots: 6, slotLevels: [1, 60, 90, 120, 160, 200], dismantleRefundPct: 80, milestoneEvery: 10, milestonePct: 10 }, '?', 'Slots und Refund eigen.');
  C('heroes', { starter: 'h_01', levelPct: 2, selectTicketPieces: 50, raidTeam: 3 }, 'E', 'Heldenlevel: +levelPct% ATK/HP je Level über 1.');
  C('keyhouse', { speedUpGemsPerMin: 1, chapterBound: true }, 'E', 'Beschleunigung nur gegen erspielte Gems; kein Ad-Skip.');
  C('quests', { npcTurnIn: false }, 'R', 'false: Aufträge der Figuren starten von selbst und werden über die Questkarte abgeschlossen (die Referenzdaten kennen keinen Abgabe-Schritt beim NPC). true: Annahme und Abgabe beim NPC.');
  C('homeReturn', { cost: {} }, 'E', 'Rückkehr zur Basis: unbegrenzt und kostenlos (Tageslimit auf Nutzerwunsch entfernt).');
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
  C('world', { normalPerNode: 1, rareRespawnMinSec: 900, spawnSpreadM: 2.5, activeRadiusM: 40, autoBossSafety: 0.7 }, 'E', 'Kapitel-1-Welt: Gegner je normalem Spawnknoten (Original unbekannt), Seltenheitsschwelle nach Respawnzeit, Simulationsradius.');
  C('ledgerKeep', 400, 'E'); C('saveSlots', 2, 'E');

  // ------------------------------------------------------------------ Items (Auszug der 116 Definitionen)
  const I = (id, name, kind = 'currency', x = {}) => ({ id, name, kind, cargo: 0, sell: 0, ...x });
  T('items', 'D', 'Währungen/Items laut Abschnitt 11; nicht alle 116 Originalitems bekannt.', [
    I('gold', 'Gold'), I('gems', 'Gems'), I('exp', 'EXP (Blessing)', 'currency', { s: '?' }),
    I('orb_red', 'Red Orb'), I('orb_pink', 'Pink Orb'), I('orb_ice', 'Crimson Orb'), I('orb_jungle', 'Azure Orb'), I('orb_hell', 'Soul Orb'),
    I('bluestone', 'BlueStone'), I('rune_dust', 'Rune Dust'), I('weapon_scroll', 'Weapon Scroll'),
    I('wood', 'Holz', 'material', { cargo: 1 }), I('stone', 'Stein', 'material', { cargo: 1, s: 'E' }),
    I('evo_coin', 'Evolution Coin'), I('attr_point', 'Attribute Point'), I('synergy_point', 'Synergy Point'),
    I('key_novice', 'Novizen-Schlüssel', 'key'), I('key_expert', 'Experten-Schlüssel', 'key'), I('key_warrior', 'Warrior Chest Key', 'key'), I('key_stier', 'S-Tier Chest Key', 'key'), I('key_special_hero', 'Special Hero Chest Key', 'key'),
    I('hero_select_ticket', 'Hero Select Ticket', 'ticket'),
    I('ticket_tower', 'Tower-Ticket', 'ticket'), I('ticket_invasion', 'Invasion-Ticket', 'ticket'), I('ticket_raid', 'Raid-Ticket', 'ticket'),
    I('ticket_tomb', 'Tomb-Ticket', 'ticket'), I('ticket_pvp', 'PvP-Ticket', 'ticket', { s: 'B' }),
    I('invasion_coin', 'Invasion Coin'), I('raid_coin', 'Boss-Rank-Münze', 'currency', { s: 'E' }), I('spin_ticket', 'Spin-Ticket', 'ticket', { s: 'E' }),
    I('loot_c1', 'Beute Kap. 1', 'cargo', { cargo: 1, sell: 4, s: 'E' }), I('loot_c2', 'Beute Kap. 2', 'cargo', { cargo: 1, sell: 60, s: 'E' }),
    I('loot_c3', 'Beute Kap. 3', 'cargo', { cargo: 1, sell: 600, s: 'E' }),
    I('crystal', 'Kristall', 'currency', { cargo: 1, s: 'B', note: 'Grüner Kristall der Kopfleiste: Schmiede-Währung (B). Wird als Fracht getragen und in der Basis gutgeschrieben; Drop-Mengen eigen.' }),
  ]);

  // ------------------------------------------------------------------ Welt
  const AREA = [[1, 'Greenhaven', 'Rootling'], [1, 'Sandevil Desert', 'Scarlet'], [1, 'Ebonhollow', 'Gargoyle'], [1, 'Frostbound', 'Frostfang'],
    [1, 'Verdant Ruins', 'Elf Queen'], [1, 'Hellfire Chasm', 'Baal'], [2, 'Fortress of Hope', 'Dark Lord'], [2, 'Blackbarrow', 'Banshee'],
    [2, 'Twilight Forest', 'Volcanus'], [2, 'Water Temple', 'SeaQueen'], [2, 'Redrock Valley', 'Warchief'], [2, 'Frosthold', 'Revenant'],
    [2, 'Frozen Throne', 'Frost King'], [3, 'Downtown', 'Hobchief'], [3, 'Ruined Downtown', 'Magma Golem'], [3, 'Hanok Village', 'Skullwyrm'],
    [3, 'Jeju Island', 'Ant King'], [3, 'Amusement Park', 'Vampire Lord'], [3, 'The Dome', 'Abyss Lord'], [3, 'Dimensional Rift', 'Voidlord']];
  const GROUPS = [14, 14, 14, 14, 13, 13, 11, 10, 10, 10, 10, 10, 10, 9, 9, 8, 8, 8, 8, 8]; // 82/71/58 (D-Summen, Verteilung E)
  // Bestiary der Referenz (D): Level, Gold, Respawn, Drops, Tempo je Monster. HP/ATK bleiben auf der eigenen Kurve (E), weil die Spielerwerte eigen skaliert sind; Originalwerte stehen in v.ref.
  const TYPE_RANK = { Normal: 'normal', Miniboss: 'elite', Elite: 'rare', Champion: 'boss', Event: 'special', Boss: 'elite' };
  const refBoss = (nm) => BESTIARY.find((o) => o.n === nm && o.v.some((x) => x[4] === 'Champion'));
  const bossLevel = (s) => refBoss(AREA[s - 1][2]).v[0][1];
  const refCh = (s) => (s === 13 ? 12 : s === 20 ? 19 : s); // Frozen Throne / Dimensional Rift haben keine eigenen Symbol-Stages: Gegner der Vorstage (R)
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
  // Kapitel 1: Spawnknoten, Monsternamen und Respawnzeiten aus den Szenendaten der Referenz (D); Werte je Variante eigen (E).
  const zoneOf = zoneOfMap;
  const slugTaken = new Set();
  const BEH = { 'Treasure Goblin': 'flee' }; // Fernkämpfer gibt es außer Bossen nicht (Vorgabe); Tempo je Monster kommt aus dem Bestiary
  const KEEP_ID = { 'Treasure Goblin': 'treasure_goblin', 'Goblin Warrior': 'goblin_warrior', 'Giant Chicken': 'giant_chicken', Cactus: 'cactus' };
  const S1_ID = { Mandragora: 'mandragora', Slime: 'slime', Mushroom: 'mushroom', Spider: 'spider', 'Slime King': 'slime_king' };
  function ch1Stage(s, id, lo, hi, loot, orb, bv) {
    const nodes = W1.spawns.filter((n) => n[0] === s), cw = config.world, byName = {};
    const names = [...new Set(nodes.map((n) => n[1]))];
    const resp = (nm) => Math.max(...nodes.filter((n) => n[1] === nm).map((n) => n[4] || 0));
    const normals = names.filter((nm) => nm !== bv.name && resp(nm) <= 15 && nm !== 'Treasure Goblin');
    for (const nm of names) {
      if (nm === bv.name) { byName[nm] = bv; continue; }
      if (s === 1) { byName[nm] = variants.find((v) => v.id === S1_ID[nm]); continue; }
      const r = resp(nm), special = nm === 'Treasure Goblin' || nm === 'Mimic';
      const rank = special ? 'special' : r <= 15 ? 'normal' : r >= cw.rareRespawnMinSec ? 'rare' : 'elite';
      const k = normals.indexOf(nm), lv = rank === 'normal' ? Math.round(lo + ((hi - 3 - lo) * k) / Math.max(1, normals.length - 1)) : rank === 'rare' ? hi - 1 : Math.round((lo + hi) / 2) + 2;
      const base = nm.toLowerCase().replace(/[^a-z0-9]+/g, '_'), vid = KEEP_ID[nm] || (slugTaken.has(base) || variants.some((v) => v.id === base) ? `${base}_s${s}` : base);
      slugTaken.add(base);
      const v = V(vid, nm, lv, rank, { monster: base, beh: BEH[nm] || 'melee', s: 'B' });
      if (rank === 'normal') v.drops.push({ item: loot, n: 1, count: 1, chance: 0.5 }, { item: orb, n: 1, count: 1, chance: 0.03 });
      else v.drops.push({ item: loot, n: 2, count: rank === 'rare' ? 4 : 2, chance: 1 }, { item: 'weapon_scroll', n: 1, count: 1, chance: rank === 'rare' ? 1 : 0.3 }, { item: orb, n: 2, count: rank === 'rare' ? 3 : 1, chance: rank === 'rare' ? 1 : 0.25 });
      if (rank === 'rare') v.drops.push({ item: 'evo_coin', n: 3 * s, count: 2, chance: 1 });
      if (nm === 'Mimic') v.drops.push({ item: 'gems', n: 5, count: 2, chance: 1, s: 'E' });
      if (nm === 'Treasure Goblin') v.gold *= 20;
      byName[nm] = v;
    }
    nodes.forEach((n, k) => {
      // In der Szene abgeschaltete Spawnpunkte (D): dort spawnt im Spiel nichts
      if (SPAWN_OFF.some((q) => q[0] === s && Math.hypot(q[1] - n[2], q[2] - n[3]) < 0.75)) return;
      const v = byName[n[1]], isBoss = v === bv;
      // Gruppengröße und Streukreis des Spawnpunkts aus den Szenendaten (D): der nächstgelegene Punkt desselben Gebiets im Umkreis von 0,75 m
      let pt = null, pd = 0.75; for (const q of SPAWN_PTS) if (q[0] === s) { const d = Math.hypot(q[2] - n[2], q[3] - n[3]); if (d < pd) { pd = d; pt = q; } }
      groups.push({ id: isBoss ? `sg_${id}_boss` : `sg_${id}_${k}`, area: id, v: v.id, count: pt ? pt[5] : v.rank === 'normal' ? cw.normalPerNode : 1, respawn: n[4], patrol: !!n[5],
        roam: n[1] === 'Bat', pos: [n[2], n[3]], r: pt ? Math.max(1, pt[4]) : cw.spawnSpreadM, s: 'D' });
    });
    const sc = W1.stageChests.find((c) => c[0] === s);
    chestSpawners.push({ id: `cs_${id}`, area: id, pos: [sc[1], sc[2]], respawn: sc[3], order: CHESTSPAWN[`Chest_Stage${s}`][0].map((n) => `c${n}`), s: 'D' });
  }
  AREA.forEach(([ch, name, boss], i) => {
    const s = i + 1;
    chIdx = ch === prevCh ? chIdx + 1 : 1; prevCh = ch;
    const id = `a${ch}_${chIdx}`, hi = bossLevel(s), lo = s === 1 ? 1 : bossLevel(s - 1) + 1;
    const loot = `loot_c${ch}`, orb = ch === 1 ? orbFor[chIdx] : ['orb_red', 'orb_pink', 'orb_ice', 'orb_jungle', 'orb_hell'][i % 5];
    const mk = [], roster = [];
    if (s === 1 || ch !== 1) {
    if (s === 1) {
      mk.push(V('mandragora', 'Mandragora', 1, 'normal', { hp: 12, atk: 1, s: 'D' }), V('slime', 'Slime', 2, 'normal', { hp: 16, atk: 1, s: 'D' }),
        V('mushroom', 'Mushroom', 4, 'normal', { hp: 17, atk: 2, s: 'D' }), V('spider', 'Spider', 5, 'normal', { hp: 57, atk: 4, s: 'D' }));
    } else {
      for (const o of BESTIARY.filter((x) => x.ch === refCh(s) && x.v.length && !(x.v[0][4] === 'Champion' && AREA.some((a2) => a2[2] === x.n)))) {
        if (roster.some((r) => r.o === o)) continue;
        const [, lv, , , type] = o.v[0], rank = type === 'Champion' ? 'rare' : TYPE_RANK[type] || 'normal';
        let vid = slug(o.n); if (variants.some((x) => x.id === vid)) vid += `_s${s}`; if (variants.some((x) => x.id === vid)) vid += '_2';
        const v = V(vid, o.n, lv, rank, { monster: slug(o.n), beh: BEH[o.n] || 'melee', respawn: o.r, s: 'D' });
        roster.push({ o, v });
        if (rank === 'normal') mk.push(v);
      }
    }
    }
    for (const v of mk) v.drops.push({ item: loot, n: 1, count: 1, chance: 0.5 }, { item: orb, n: 1, count: 1, chance: 0.03 });
    const elite = s === 1 ? V('slime_king', 'Slime King', 3, 'elite', { hp: 63, atk: 6, s: 'D' }) : null;
    if (elite) elite.drops.push({ item: loot, n: 2, count: 2, chance: 1 }, { item: 'weapon_scroll', n: 1, count: 1, chance: 0.3 }, { item: orb, n: 2, count: 1, chance: 0.25 });
    if (ch >= 2 && elite) elite.drops.push({ item: 'attr_point', n: 2, count: 1, chance: 0.2 });
    const bv = V(`boss_${id}`, boss, hi, 'boss', s === 1 ? { hp: 256, atk: 18, s: 'D' } : { s: [17, 19].includes(s) ? 'D' : 'E' });
    bv.drops.push({ item: loot, n: 5, count: 4, chance: 1 }, { item: 'evo_coin', n: 5 * s, count: 2, chance: 1 }, { item: orb, n: 3, count: 3, chance: 1 });
    if (s === 17) bv.drops.push({ item: 'gems', n: 20, count: 5, chance: 1, s: 'D' }, { item: 'attr_point', n: 40, count: 5, chance: 1, s: 'D' });
    if (s === 19) bv.drops.push({ item: 'gems', n: 20, count: 5, chance: 1, s: 'D' }, { item: 'attr_point', n: 48, count: 5, chance: 1, s: 'D' });
    areas.push({ id, stage: s, chapter: ch, name, boss: bv.id, w: W, h: H, entry: { x: W / 2, y: H - 140 }, gate: { x: W / 2, y: 70 },
      prev: s > 1 ? areas[s - 2].id : 'base', next: null, minimap: null, s: 'D' });
    if (s > 1) areas[s - 2].next = id;
    if (ch === 1) {
      ch1Stage(s, id, lo, hi, loot, orb, bv);
      return;
    }
    // Spawn-Gruppen: 1 Boss, Spezialgruppen, Rest Elite/Normal
    const specials = roster.filter((r) => r.v.rank !== 'normal').map((r) => r.v);
    for (const sp of specials) sp.drops.push({ item: loot, n: 2, count: 2, chance: 1 }, { item: 'weapon_scroll', n: 1, count: 1, chance: 0.3 });
    const n = GROUPS[i] - 1, list = [];
    specials.forEach((sp) => list.push({ v: sp.id, count: 1, respawn: sp.respawn }));
    while (list.length < n) { const k = (list.length) % mk.length; list.push({ v: mk[k].id, count: 5 + (list.length % 3) }); }
    list.sort((a, b) => variants.find((x) => x.id === a.v).level - variants.find((x) => x.id === b.v).level);
    const rowsN = Math.ceil(n / 3);
    list.forEach((g, k) => groups.push({ id: `sg_${id}_${k}`, area: id, v: g.v, count: g.count, respawn: g.respawn || null,
      x: 280 + (k % 3) * 520 + ((k * 37) % 60), y: Math.round(H - 520 - Math.floor(k / 3) * ((H - 1150) / Math.max(1, rowsN - 1 || 1))), r: 150 }));
    groups.push({ id: `sg_${id}_boss`, area: id, v: bv.id, count: 1, respawn: BOSS_RESPAWN[s] || null, x: W / 2, y: 360, r: 10,
      s: BOSS_RESPAWN[s] ? 'D' : 'E' });
    // Rohstoffstellen (E): Bäume in Kap. 1.1-1.3, Felsen ab 1.3
    if (s <= 3) resGroups.push({ id: `rg_${id}_tree`, area: id, v: 'node_tree', count: 4, respawn: 60, x: 180, y: H - 700, r: 110 });
    if (s >= 3 && s <= 6) resGroups.push({ id: `rg_${id}_rock`, area: id, v: 'node_rock', count: 4, respawn: 90, x: W - 180, y: H - 900, r: 110 });
    chestSpawners.push({ id: `cs_${id}`, area: id, x: W - 220, y: 1300, ...(() => { const r = CHESTSPAWN[`Chest_Stage${s}`] || CHESTSPAWN.Chest_Stage19; return { respawn: r[1], order: r[0].map((n) => `c${n}`) }; })(), s: CHESTSPAWN[`Chest_Stage${s}`] ? 'D' : 'R' });
    const ng = ch === 1 ? (giftLeftCh1 >= 3 && chIdx < 6 ? 3 : giftLeftCh1) : 2;
    if (ch === 1) giftLeftCh1 -= ng;
    for (let k = 0; k < ng; k++) giftSpawners.push({ id: `gs_${id}_${k}`, area: id, x: 220 + k * 560, y: 900 + k * 420, respawn: 900, s: 'E' });
  });
  // Kapitel-1-Rohstoffe (E) und die 17 Gift-Chest-Spawner der Referenz (Position + Respawn D)
  // Fällbare Bäume und abbaubare Steine stehen an den Plätzen der Szenendaten (D): je Platz ein Rohstoff; Nachwachszeit eigen (E)
  CHOP.forEach(([X, Z, st], k) => resGroups.push({ id: `rg_tree_${k}`, area: `a1_${st}`, v: 'node_tree', count: 1, respawn: 60, pos: [X, Z], r: 0, s: 'D' }));
  STONE.forEach(([X, Z, st], k) => resGroups.push({ id: `rg_rock_${k}`, area: `a1_${st}`, v: 'node_rock', count: 1, respawn: 90, pos: [X, Z], r: 0, s: 'D' }));
  W1.gifts.forEach(([nm, X, Z, resp], k) => giftSpawners.push({ id: `gs_ch1_${k}`, ref: nm, area: zoneOf(X, Z) || 'a1_1', pos: [X, Z], respawn: resp, s: 'D' }));
  V('node_tree', 'Baum', 1, 'node', { hp: 20, drops: [{ item: 'wood', n: 1, count: 2, chance: 1 }] });
  V('node_rock', 'Fels', 1, 'node', { hp: 60, drops: [{ item: 'stone', n: 1, count: 2, chance: 1 }] });
  // Minimap-Belohnungen (D): einmalig je Gebiet
  // Kapitel 1 aus den Spieldaten (D): 100 Gems, 10 rote Orbs, Epic-Schwert, 2 und 3 Krieger-Schlüssel, Legendary-Keule
  const MM1 = [[{ item: 'gems', n: 100 }], [{ item: 'orb_red', n: 10 }], [{ weapon: 'w_sword_n_3' }], [{ item: 'key_warrior', n: 2 }], [{ item: 'key_warrior', n: 3 }], [{ weapon: 'w_blunt_n_4' }]];
  let ci = 0, pc = 0;
  for (const a of areas) { ci = a.chapter === pc ? ci + 1 : 1; pc = a.chapter; a.minimap = a.chapter === 1 ? MM1[ci - 1] : [{ item: 'gems', n: ci === 7 ? 1000 : 200 }]; }
  T('areas', 'D', '20 Gebiete, 19 Gates; Kartenlayout/Koordinaten eigen (E).', areas);
  T('monsters', 'E', '206 Monster/246 Varianten im Original; hier dokumentierte Beispiele (D) + eigene Platzhalter.', monsters);
  const DROP_OWN = new Set(['loot_c1', 'loot_c2', 'loot_c3', 'weapon_scroll', 'wood', 'stone']);
  for (const v of variants) {
    if (v.rank === 'node') continue;
    const cand = BESTIARY.filter((o) => o.n.toLowerCase() === v.name.toLowerCase());
    if (!cand.length) continue;
    let best = null;
    for (const o of cand) for (const x of o.v.length ? o.v : [null]) { const d = x ? Math.abs(x[1] - v.level) : 1e6; if (!best || d < best.d) best = { o, x, d }; }
    const { o, x } = best;
    if (x) {
      const keep = v.s === 'D' && v.hp !== undefined && v.level === x[1] && v.hp === x[2];
      v.level = x[1];
      if (!keep) Object.assign(v, mobStats(config, v.level, v.rank)); // liefert XP (eigene Kurve); Leben und Angriff folgen aus dem Bestiary
      if (x[2] > 0) { v.hp = x[2]; v.atk = x[3]; } // Originalwerte (D); atk 0 z. B. bei Bat: greift nicht an
      v.ref = { id: x[0], hp: x[2], atk: x[3], type: x[4] };
    }
    if (o.g && (!x || o.v.length === 1 || x[1] === Math.max(...o.v.map((q) => q[1])))) v.gold = o.g; // ein Goldwert je Monster: bei mehreren Varianten gilt er nur für die höchste, darunter eigene Kurve
    if (o.r && v.respawn === undefined) v.respawn = o.r;
    v.drops = [...v.drops.filter((d) => DROP_OWN.has(d.item)), ...o.d.map(([item, n]) => ({ item, n, count: 1, chance: 1, s: 'D' }))];
    v.s = 'D';
  }
  // Goldelefant (D): riesig, greift nie an und wehrt sich nicht, lässt Gold in 15 Stücken und 5 rote Orbs fallen; steht nur in Ebonhollow.
  { const v = variants.find((x) => x.id === 'gold_elephant'), e = G_ENEMY['3021'];
    if (v && e) { v.ref = { id: 3021, hp: e[1], atk: e[2], type: 'Event' }; v.level = e[0]; v.hp = e[1]; v.atk = e[2]; v.beh = 'melee'; v.scale = 2.4; v.s = 'D';
      v.drops = [{ item: 'orb_red', n: 1, count: e[32] || 5, chance: 1, s: 'D' }]; v.noExtraDrop = true; } }
  // Spieldaten je Gegner (D): XP, Gold, Angriffstakt, Reichweiten, Lauftempo und Haltung. ai.s/a/d = Haltung bei Sicht / in Aktionsweite / bei Treffer:
  // 0 ignorieren, 1 weiterwandern, 2 bewachen, 3 kämpfen, 4 fliehen (Zuordnung der Zahlen zu den Namen aus den Daten erschlossen, R).
  const RETREAT = {}; for (const r of Object.values(G_SPAWN)) if (!RETREAT[r[0]]) RETREAT[r[0]] = r[2];
  for (const v of variants) {
    const e = v.ref && G_ENEMY[v.ref.id];
    if (!e) continue;
    v.xp = e[18]; v.gold = e[19]; if (e[28] > 0) v.hpDps = e[28]; if (e[29] > 1) v.goldPieces = e[29];
    if (RETREAT[v.ref.id]) v.leashM = RETREAT[v.ref.id]; // Rückzugsradius um den Spawnpunkt (D): 8 m, bei Elite und Bossen 5 m
    v.ai = { aps: e[3], range: e[4], move: e[5], retreat: e[6], sight: e[7], action: e[8], angry: e[10], fleeT: e[11], s: e[12], a: e[13], d: e[14], flock: e[15], size: e[23], knock: e[25] };
    if (v.beh === 'flee' && e[14] !== 4) v.beh = 'melee';
    if (e[14] === 4) v.beh = 'flee';
  }
  for (const v of variants) if (v.drops.length && !v.noExtraDrop) v.drops.push(v.rank === 'normal' ? { item: 'crystal', n: 1, count: 1, chance: 0.5 } : { item: 'crystal', n: v.rank === 'boss' ? 10 : 3, count: 1, chance: 1 });
  T('variants', 'E', 'Zeilen mit s=D tragen Referenzwerte (Level/HP/ATK bzw. Drops).', variants);
  T('spawnGroups', 'R', 'Kapitel 1: 124 platzierte Spawnknoten mit Monster, Position, Respawn und Patrol aus den Szenendaten (D). Kapitel 2/3: 71/58 Gruppen (D), Position eigen.', groups);
  T('resourceGroups', 'E', 'Rohstoffstellen als angreifbare Knoten.', resGroups);
  // assist: Radius, in dem Nachbarn mit alarmiert werden. ring: Nahkämpfer verteilen sich um das Ziel. keep: Fernkämpfer halten Abstand.
  // backoff: Sekunden Rückzug nach einem Treffer (Hit-and-Run).
  T('behaviors', 'E', 'Gegner-KI-Parameter je Typ; Original-KI unbekannt.', [
    { id: 'melee', aggro: 260, leash: 520, patrol: 90, speed: 105, range: 46, interval: 1.4, windup: 0.35, assist: 150, ring: true },
    { id: 'fast', aggro: 300, leash: 600, patrol: 120, speed: 165, range: 44, interval: 1.0, windup: 0.25, assist: 190, ring: true, backoff: 0.45 },
    { id: 'ranged', aggro: 340, leash: 560, patrol: 70, speed: 85, range: 260, interval: 1.9, windup: 0.4, proj: 320, assist: 170, keep: 150 },
    { id: 'flee', aggro: 240, leash: 700, patrol: 140, speed: 150, range: 0, interval: 9, windup: 0, flee: true },
    { id: 'boss', aggro: 230, leash: 560, patrol: 0, speed: 90, range: 70, interval: 1.6, windup: 0.5, pattern: 'slam', assist: 260 },
    { id: 'node', aggro: 0, leash: 0, patrol: 0, speed: 0, range: 0, interval: 9, windup: 0 },
  ]);
  T('bossPatterns', 'E', 'Generische, eigene Bossfähigkeiten (keine Originalmuster). nova: Geschosse im Kreis nach dem Einschlag, sobald der Boss wütend ist.', [
    { id: 'slam', period: 7, windup: 1.2, radius: 150, mult: 2.5, enrageHpPct: 30, enrageIntervalMult: 0.7, nova: 8, novaSpeed: 240, novaMult: 0.8 },
  ]);
  T('statuses', 'E', 'Statuseffekte: Stack-Limit, Erneuerung, Immunität.', [
    { id: 'slow', maxStacks: 1, refresh: 'renew', speedMult: 0.5, bossImmune: false },
    { id: 'burn', maxStacks: 5, refresh: 'renew', dotPctAtk: 20, bossImmune: false },
    { id: 'stun', maxStacks: 1, refresh: 'none', stun: true, bossImmune: true },
  ]);
  T('chestSpawners', 'R', 'Kapitel 1: Position + Respawn aus Szenendaten (D); Stage 7-12/14-19 Respawn dokumentiert; Rest eigen.', chestSpawners);
  T('giftSpawners', 'R', 'Kapitel 1: 17 Gift-Chest-Spawner mit Position und Respawn 300 s aus Szenendaten (D); Kap. 2/3 eigen.', giftSpawners);
  // Truhen aus den Spieldaten (D): Öffnungszeit und Bündel – je Bündel eine Ziehung. "w" = Waffe mit den Raten der genannten Schmiedestufe.
  const CHN = ['Holztruhe', 'Seltene Truhe', 'Legendäre Truhe'];
  T('chestTypes', 'D', 'Öffnungszeit 120/300/900 s und Inhalte je Bündel aus den Spieldaten; 1-3 Kapitel 1, 4-6 Kapitel 2, 7-9 Kapitel 3.',
    CHEST.map(([id, revealSec, bundles]) => ({ id: `c${id}`, name: CHN[(id - 1) % 3], grade: (id - 1) % 3, revealSec,
      bundles: bundles.map((b) => b.map(([w, item, tier, min, max]) => (item === 'w' ? { w, rateTier: tier } : { w, item, min, max }))) })));
  T('areaChests', 'R', 'Je Gebiet eine einmalige Gebietstruhe (Kap. 1: 6 Stage-Truhen der Referenz, Position D neben dem Truhenspawner); Inhalt eigen.',
    areas.map((a) => ({ id: `ac_${a.id}`, area: a.id, x: 240, y: 520, ...(a.chapter === 1 ? (() => { const c = W1.stageChests.find((r) => r[0] === a.stage); return { pos: [c[1] + 2.5, c[2] + 1.5] }; })() : {}), reward: [{ item: 'gold', n: 100 * a.stage * a.stage }, { item: 'exp', n: 2 + a.stage }, { item: 'weapon_scroll', n: 5 }] })));
  const giftGold = (L) => Math.round(12 * (1983356 / 12) ** ((L - 1) / 399));
  T('giftChestLevels', 'R', 'Gold L1=12 und L400=1.983.356 (D); Zwischenwerte geometrisch interpoliert (E). Bonus: Gold x5 + 10 Gems (D).',
    Array.from({ length: 400 }, (_, k) => ({ level: k + 1, gold: giftGold(k + 1), bonusGems: 10, bonusMult: 5 })));
  T('keyHouseSlots', 'D', '15 Plätze (5 je Kapitel): Kosten aus den Spieldaten; in Kapitel 1 braucht Platz n das Schlüsselhaus auf Stufe n.', KEYSLOT.map(([chapter, level, cost], k) => ({ id: k, chapter, level, cost })));
  T('keyhouseTiers', 'D', 'Ausbau des Schlüsselhauses (Kapitel 1): Kosten zur nächsten Stufe.', KEYHOUSE.map(([tier, slots, c]) => ({ tier, slots, upgradeCost: Object.keys(c).length ? c : null })));
  T('levelRewards', 'D', 'Belohnung beim Erreichen eines Levels (alle 5 Level) aus den Spieldaten.', Object.entries(LVREW).map(([level, r]) => ({ level: +level, reward: Object.entries(r).map(([item, n]) => ({ item, n })) })));

  // ------------------------------------------------------------------ Spielerlevel
  const lvRows = [];
  // Aus den Spieldaten (D): XP-Schwelle je Level, Grundangriff und Grundleben (Stützstufen, dazwischen linear), XP-Obergrenze je Kill.
  const lvAt = (L, k) => { let a = PLAYER_LV[0], b = null; for (const r of PLAYER_LV) { if (r[0] <= L) a = r; else { b = r; break; } } return !b || a[0] === L ? a[k] : Math.round(a[k] + ((b[k] - a[k]) * (L - a[0])) / (b[0] - a[0])); };
  const killCap = (L) => { let v = KILL_XP_LIMIT[0][1]; for (const [from, lim] of KILL_XP_LIMIT) if (L >= from) v = lim; return v; };
  for (let L = 1; L <= 400; L++) lvRows.push({ level: L, xp: LEVEL_XP[L + 1], atk: lvAt(L, 1), hp: lvAt(L, 2), killXpCap: killCap(L) });
  T('playerLevels', 'D', 'XP-Schwellen, Grundwerte und XP-Obergrenze je Kill aus den Spieldaten (Level 1-400 von 1.500).', lvRows);

  // ------------------------------------------------------------------ Upgrade-Pfade
  const up = [], sname = (st) => ({ atk: 'Kraft erhöhen', cargo: 'Fracht erhöhen', hp: 'Lebenspunkte erhöhen', regen: 'HP-Regeneration erhöhen', critChance: 'Kritische Trefferchance erhöhen', critDmg: 'Kritischen Schaden erhöhen', skillDmgPct: 'Fertigkeitsschaden erhöhen', lifesteal: 'Lebensraub erhöhen', cooldownPct: 'Abklingzeit verringern', dmgPct: 'Grundangriff verstärken', meleePct: 'Nahkampfschaden erhöhen', rangedPct: 'Fernkampfschaden erhöhen' }[st]);
  const U = (id, family, name, stat, max, rows, x = {}) => up.push({ id, family, name, stat, max, scale: 1, rows: rows.map(([lv, eff, cost]) => ({ lv, eff, cost })), s: 'E', ...x });
  const own = (max, effMax, c1, cMax, cur = 'gold') => [[1, Math.max(1, Math.round(effMax / max)), { [cur]: c1 }],
    [Math.max(2, Math.round(max / 2)), Math.round(effMax / 2), { [cur]: Math.round(Math.sqrt(c1 * cMax)) }], [max, effMax, { [cur]: cMax }]];
  // Fähigkeiten: Stützstufen 1:1 aus den Spieldaten der Referenz (D): Wert je Stufe und Kosten für den nächsten Schritt; dazwischen wird linear gerechnet,
  // Orb-Kosten gelten nur genau auf einer Stützstufe. Gegenprobe mit Bildern der Vorlage: Kraft 360 -> 216K, HP 356 -> 212K, Fracht 193 -> 24,7K / 112K.
  // base = Grundwert der Anzeige (z. B. Tempo 50), scale = Stat-Einheiten je Wertpunkt. "Critical Damage" hat in den Daten 0 Stufen und entfällt.
  const AB = (id, refName, name, stat, desc, x = {}) => { const r = ABILITY_REF[refName]; U(id, 'ability', name, stat, r.max, [[1, 0, {}], [r.max, 0, {}]], { ref: r.rows, desc, s: 'D', ...x }); };
  AB('ab_power', 'POWER', 'Kraft', 'atk', 'Erhöhe deine Macht');
  AB('ab_cargo', 'CARGO', 'Fracht', 'cargo', 'Frachtkapazität erhöhen', { refCostOnly: true, rows: own(1600, 1600, 15, 5000000).map(([lv, eff, cost]) => ({ lv, eff, cost })), s: 'R',
    note: 'Kosten D. Wirkung eigen: im Original zählt die Fracht den Goldwert (112K auf Stufe 193), hier Stückzahl.' });
  AB('ab_hp', 'HP', 'HP', 'hp', 'Erhöhe deine Gesundheit');
  AB('ab_regen', 'HP RECOVERY', 'Lebenspunkte regenerieren', 'regen', 'HP-Regeneration erhöhen');
  AB('ab_crit', 'CRITICAL CHANCE', 'Kritische Chance', 'critChance', 'Kritische Trefferchance erhöhen', { scale: 0.1, unit: '%' });
  AB('ab_move', 'MOVE SPEED', 'Bewegungsgeschwindigkeit', 'moveSpeedPct', 'Bewegungsgeschwindigkeit erhöhen', { base: 50, scale: 2, show: { base: 50, mul: 0.5 }, note: 'Wert 50 + Stufe (D); Umrechnung in Prozent Lauftempo eigen (1 Punkt = 2 %).' });
  AB('ab_atkspeed', 'ATTACK SPEED', 'Angriffsgeschwindigkeit', 'atkSpeedPct', 'Angriffsgeschwindigkeit erhöhen', { base: 1000, scale: 0.1, unit: '%', show: { base: 100, mul: 1 } });
  AB('ab_multi', 'DOUBLE ATTACK', 'Doppelangriff', 'multiHit', 'Chance auf Doppelangriff erhöhen', { scale: 0.1, unit: '%' });
  AB('ab_triple', 'TRIPLE ATTACK', 'Dreifacher Angriff', 'tripleHit', 'Chance für Dreifachangriff erhöhen', { scale: 0.1, unit: '%' });
  // Spezial / Extra / Soul: jede Stufe mit Wert und Kosten aus dem Fan-Wiki (D, dort als vorläufig markiert; Spezial deckt sich mit einem Bild der Vorlage).
  // ref-Zeilen [Stufe, Wert in Zehntelprozent, Kosten des nächsten Schritts]; Spezial zusätzlich bands = [[Stern, erste, letzte Stufe]]: je Stern 5/10/15/20 Stufen.
  const WK = (id, family, name, rows, stat, desc, x = {}) => {
    let L = -1; const ref = [], bands = [];
    for (const [star, lv, pct, cost] of rows) { L++; ref.push([L, Math.round(pct * 10), cost]); if (star) { const bd = bands.find((q) => q[0] === star); if (bd) bd[2] = L; else bands.push([star, Math.max(0, L - (lv ? 1 : 0)), L]); } }
    U(id, family, name, stat, L, [[1, 0, {}], [L, 0, {}]], { ref, scale: 0.1, unit: '%', desc, s: 'D', ...(bands.length ? { bands, minStar: bands[0][0] } : {}), ...(['atk', 'hp', 'cargo', 'regen'].includes(stat) ? { asPct: true } : {}), ...x });
  };
  const SPC = [['muscle', 'Massive Muskeln', 'atk', 'Erhöhe zusätzliche Kraft'], ['load', 'Lastmeister', 'cargo', 'Zusätzlichen Frachtplatz erhöhen'], ['hp', 'HP-Boost', 'hp', 'Zusätzliche Lebenspunkte erhöhen'],
    ['leech', 'Lebensraub', 'lifesteal', 'Wandle Schaden in HP um'], ['step', 'Schnellschritt', 'moveSpeedPct', 'Zusätzliche Bewegungsgeschwindigkeit erhöhen'], ['heal', 'Schnelle Heilung', 'regen', 'HP-Regeneration verbessern'],
    ['luck', 'Glücksschlag', 'critChance', 'Erhöhe die kritische Trefferchance'], ['double', 'Doppelter Abzug', 'multiHit', 'Chance auf Doppelangriff erhöhen'], ['skill', 'Schadensfähigkeit', 'skillDmgPct', 'Fähigkeitsschaden erhöhen'],
    ['triple', 'Dreifache Klinge', 'tripleHit', 'Chance für Dreifachangriff erhöhen'], ['cool', 'Abklingzeit', 'cooldownPct', 'Abklingzeit der Fertigkeiten verringern']];
  const A5 = { stat: 'atk', pct: 5 };
  C('special', { maxStar: 5, grades: [{ cost: { gold: 35280, orb_red: 10 }, bonus: [] }, { cost: { gold: 455400, orb_red: 20 }, bonus: [A5] }, { cost: { gold: 1205450, orb_pink: 30 }, bonus: [A5, { stat: 'skillDmgPct', v: 5 }] },
    { cost: { gold: 3530350, orb_pink: 40 }, bonus: [A5, { stat: 'cooldownPct', v: 5 }] }, { cost: null, bonus: [A5, { stat: 'critDmg', v: 10 }] }] }, 'D',
    'Sternstufen 1-5 aus den Spieldaten (D): Aufstiegskosten und Bonus je Stufe. Dass sich die Boni addieren, ist abgeleitet (R).');
  UPGRADE_WIKI.special.forEach(([, rows], k) => WK(`sp_${SPC[k][0]}`, 'special', SPC[k][1], rows, SPC[k][2], SPC[k][3]));
  const EXS = ['atk', 'cargo', 'hp', 'regen', 'critChance', 'skillDmgPct', 'lifesteal', 'cooldownPct'], SOS = ['atk', 'critDmg', 'hp', 'regen', 'cargo', 'dmgPct', 'skillDmgPct', 'meleePct', 'rangedPct'];
  UPGRADE_WIKI.extra.forEach(([nm, rows], k) => WK(`ex_${k}`, 'extra', nm, rows, EXS[k], sname(EXS[k])));
  UPGRADE_WIKI.soul.forEach(([nm, rows], k) => WK(`so_${k}`, 'soul', nm, rows, SOS[k], sname(SOS[k])));
  // Segen: Werte je Stufe und EXP-Kosten (2 je Stufe) aus den Referenzdaten (D): Start 50/200/100 auf Stufe 1, Ende 150/350/300 auf Stufe 50. Pfadnamen und Stat-Zuordnung eigen (E).
  [['bl_0', 'Segen I', 'dmgPct'], ['bl_1', 'Segen II', 'critDmg'], ['bl_2', 'Segen III', 'goldPct']].forEach(([id, nm, st], k) => {
    const r = BLESS_REF[k], end = [150, 350, 300][k];
    U(id, 'blessing', nm, st, 50, [[1, 0, {}], [50, 0, {}]], { ref: [[0, 0, { exp: r[0][2] }], ...r.map(([lv, v, exp]) => [lv, v, { exp }]), [50, end, {}]], s: 'R', note: 'Werte und Kosten D; Stat-Zuordnung E.', desc: sname(st) || 'Goldgewinn erhöhen' });
  });
  ['dmg', 'crit', 'gold'].forEach((gkey, k) => U(`syn_${gkey}`, 'synergy', `Synergie ${k + 1}`, 'synergyPct', 20, own(20, 100, 5, 200, 'synergy_point')));
  T('upgradeTracks', 'R', 'Ability 9 nutzbar (+ Critical Damage mit 0 Stufen) / Special 11 (Sternstufen) / Extra 8 / Soul 9 / Blessing 3x50 (D-Zählungen); Werte außer Power eigen.', up);

  // ------------------------------------------------------------------ Waffen
  T('rarities', 'E', 'Seltenheitsnamen D; Multiplikatoren/Maxlevel eigen.', RARITIES.map((name, idx) =>
    ({ idx, name, mult: [1, 1.5, 2.2, 3.3, 5, 7.5, 11, 16, 24][idx], maxLevel: [10, 20, 30, 50, 70, 90, 110, 130, 130][idx], color: ['#bbb', '#6c6', '#59f', '#b6f', '#fb3', '#f73', '#f46', '#3dd', '#fff'][idx] })));
  const CLS = [['dagger', 'Dolch', true, 60, 0.45, 1, 'flower_dance', 'critChance', 3], ['sword', 'Schwert', true, 75, 0.7, 3, 'crescent_blade', 'dmgPct', 5],
    ['blunt', 'Stumpfe Waffe', true, 70, 1.1, 5, 'soul_wave', 'bossDmgPct', 6], ['crossbow', 'Armbrust', false, 330, 0.9, 1, 'at_rocket', 'critDmg', 10],
    ['gun', 'Schusswaffe', false, 300, 0.5, 1, 'gravity_shot', 'atkSpeedPct', 4], ['staff', 'Zauberstab', false, 280, 1.3, 4, 'carpet_bombing', 'skillDmgPct', 8]];
  T('weaponClasses', 'R', '6 Klassen und S-Skill-Namen D; Reichweite/Takt/Passiva eigen.', CLS.map(([id, name, melee, range, interval, targets, sSkill, pStat, pV]) =>
    ({ id, name, melee, range, interval, targets, sSkill, passive: { stat: pStat, v: pV }, basicMult: 1,
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
    // Namen, Angriffe je Sekunde und Fertigkeit (Name + Gesamtfaktor, erst ab Epic) aus den Referenzdaten (D). Die S-Reihe behält ihre eigene Fertigkeit mit Abklingzeit.
    const refOf = (r) => ((WEAPON_REF[cls] || {})[series] || []).find((x) => x[1] === r);
    for (let r = from; r <= to; r++) weapons.push({ id: `w_${cls}_${series}_${r}`, cls, series, rarity: r, name: refOf(r) ? `${refOf(r)[0]}${series === 's' ? ` (${RARITIES[r]})` : ''}` : `${cname}${series === 's' ? ' S' : ''} (${RARITIES[r]})`,
      ...(() => { const k = WEAPON_WIKI[`${cls}_${series}_${r}`]; return k ? { dmg: k.d, bonus: k.bonus, skMult: k.sk ? k.sk[1] : null, skName: k.sk ? k.sk[0] : null } : {}; })(), // Schaden Stufe 1/Max, Stufen-Boni, S-Fertigkeit (D, Fan-Wiki)
      // Spieldaten (D): Angriffe je Sekunde, Reichweite in Metern, Fertigkeit mit Abklingzeit und Gesamtfaktor
      ...(() => { const gw = G_WEAPON[`${cls}_${series}_${r}`]; return gw ? { aps: gw[0], rangeM: gw[1], ranged: !!gw[3], skCd: gw[5] || null,
        wskill: series === 'n' && gw[4] ? { name: (refOf(r) && refOf(r)[3] ? refOf(r)[3] : gw[4].replace(/^SK_|_\d+$/g, '')).replace(/([a-z])([A-Z])/g, '$1 $2'), mult: gw[6], cd: gw[5], rangeM: gw[7], bullets: gw[8] } : null } : { aps: null, wskill: null }; })(),
      dpsAdd: Math.round(4 * (1 + r) ** 2 * (series === 's' ? 1.5 : 1)), perLevel: Math.round(2 * (1 + r) ** 1.6 * (series === 's' ? 1.5 : 1)),
      next: r < to ? `w_${cls}_${series}_${r + 1}` : null, mergeCount: 3, evoCost: r >= 3 ? { weapon_scroll: 10 * (r - 2), gold: 5000 * 4 ** (r - 3) } : {},
      skill: series === 's' ? CLS.find((c) => c[0] === cls)[6] : null });
  }
  T('typeBonus', 'D', 'Bonus der Waffenart: gilt nur, wenn die Hauptwaffe zur Meisterschaft des aktiven Helden passt (Fan-Wiki).', Object.entries(TYPE_BONUS).map(([id, v]) => ({ id, bonus: v.bonus, heroes: v.heroes })));
  T('weapons', 'R', '84 Varianten, 12 Reihen, Namen und Waffen-Fertigkeiten ab Epic mit Gesamtfaktor (D). Fertigkeit löst nach ihrer Abklingzeit aus (D). Schaden je Stufe linear zwischen Stufe-1- und Maximalwert, Maximalstufen und Stufen-Boni aus dem Fan-Wiki (D); Merge-Anzahl 3 (D), Evo-Kosten eigen. Transzendenz offen.', weapons);
  T('smithy', 'D', 'Schmiede je Stufe aus den Spieldaten: Raten der Waffen (zusammen 60 %), sonst Schriftrollen (2-10 oder 11-20), nötige Schmiedevorgänge und Kosten für die nächste Stufe.',
    SMITHY.map(([crafts, c], k) => ({ tier: k + 1, needCrafts: (SMITHY[k + 1] || [0])[0], upgradeCost: Object.keys(c).length ? c : null, rates: SMITHY_RATES[k + 1].map(([rarity, w]) => ({ rarity, w })),
      otherW: SMITHY_ROLL[k][1] + SMITHY_ROLL[k][2], other: [{ w: SMITHY_ROLL[k][1], item: 'weapon_scroll', min: 2, max: 10 }, { w: SMITHY_ROLL[k][2], item: 'weapon_scroll', min: 11, max: 20 }].filter((r) => r.w > 0) })));

  // ------------------------------------------------------------------ Helden
  // 26 Helden in 8 Seltenheitsstufen; Verteilung (4/4/3/3/2/2/4/4) und Waffenklasse je Platz nach der Heldenübersicht der Vorlage (B).
  // Namen (außer Barbar und den vier Exotic-Helden) und alle Figuren-Designs (look) sind eigene Entwürfe.
  const HRAR = ['normal', 'fine', 'rare', 'epic', 'legendary', 'ancient', 'mythic', 'exotic'], HTIER = [1, 1, 2, 2, 3, 3, 4, 5];
  const HL = [
    [0, 'Wanderer', 'sword', ['#f5b21a', '#ffd23f', 'scarf', '#e5503f']], [0, 'Schildknappe', 'sword', ['#9aa3b5', '#ffc94a', 'helm', '#e5503f']], [0, 'Dornenläufer', 'dagger', ['#4f9a3c', '#6fbf4a', 'cap', '#7a4a2c']], [0, 'Hornwächter', 'blunt', ['#5b7fe0', '#6f8fe8', 'horns', '#f3ead8']],
    [1, 'Hofmagierin', 'staff', ['#b06ad0', '#ffd9a0', 'crown', '#ffd24a']], [1, 'Nachtschütze', 'crossbow', ['#2f2a3a', '#ffc94a', 'none', '#e9a23a']], [1, 'Barbar', 'sword', ['#f5a524', '#ffc94a', 'knot', '#3f8ee0']], [1, 'Stierhüter', 'blunt', ['#f3f3f3', '#f3f3f3', 'horns', '#3b6fd0']],
    [2, 'Schlackenriese', 'blunt', ['#3a2f2f', '#2a2222', 'none', '#ff8a2a']], [2, 'Revolverheld', 'gun', ['#2a2a2a', '#ffc94a', 'cap', '#b3382b']], [2, 'Glutteufel', 'dagger', ['#c9372c', '#e5503f', 'horns', '#2a2222']],
    [3, 'Liebesbote', 'crossbow', ['#f6ead0', '#ffd23f', 'halo', '#ff7fb0']], [3, 'Schattenkatze', 'dagger', ['#3a4a6a', '#e8eef5', 'ears', '#e5503f']], [3, 'Korsarin', 'gun', ['#8a2f4a', '#ffd9a0', 'cap', '#e5503f']],
    [4, 'Söldner', 'gun', ['#3f5f8f', '#ffc94a', 'helm', '#2a2a2a']], [4, 'Flammenrufer', 'staff', ['#2f3f8f', '#ffc94a', 'flame', '#ff8a2a']],
    [5, 'Waldläuferin', 'crossbow', ['#3f9a4a', '#ffd9a0', 'hood', '#2f6b3f']], [5, 'Walküre', 'blunt', ['#5a4a3a', '#ffd9a0', 'horns', '#ffd24a']],
    [6, 'Sonnenpaladin', 'sword', ['#f6f6f6', '#ffd24a', 'halo', '#ffb02e']], [6, 'Klingenmönch', 'dagger', ['#f3ead8', '#ff8a2a', 'hood', '#b3382b']], [6, 'Eisenkoloss', 'gun', ['#d0392c', '#e5503f', 'helm', '#ffd24a']], [6, 'Sturmhexe', 'staff', ['#5a3f8f', '#ffd9a0', 'witch', '#ff8a2a']],
  ];
  const heroes = HL.map(([r, nm, cls, look], k) => { const tier = HTIER[r], n = k + 1; return { id: `h_${String(n).padStart(2, '0')}`, name: nm, rarity: HRAR[r], tier, atkPct: 4 + 6 * r + (k % 3), hpPct: 6 + 6 * r + ((k + 1) % 3),
    mastery: cls, masteryPct: 10 + 6 * r, skill: ['h_strike', 'h_frost', 'h_burn', 'h_heal'][n % 4], unlockPieces: 10 * tier, evolvable: true, look, s: nm === 'Barbar' ? 'B' : 'E' }; });
  [['Freyja', 'staff', ['#9fd9f5', '#e8f6ff', 'crown', '#5aa9e6']], ['The Skull', 'blunt', ['#2a2222', '#f3ead8', 'crown', '#e5503f']], ['Hana', 'sword', ['#2a2233', '#ffd9a0', 'hair', '#b04bd0']], ['Vlad', 'dagger', ['#3a2233', '#c9b8e0', 'hair', '#2a2222']]]
    .forEach(([nm, cls, look], k) => heroes.push({ id: `h_${slug(nm)}`, name: nm, rarity: 'exotic', tier: 5, atkPct: 50 + k * 2, hpPct: 50, mastery: cls, masteryPct: 60, skill: ['h_frost', 'h_strike', 'h_burn', 'h_heal'][k], unlockPieces: 80, evolvable: false, look, s: 'D' }));
  T('heroes', 'R', '26 Helden, 8 Seltenheitsstufen, Waffenklasse je Platz nach Heldenübersicht der Vorlage (B). Freyja/The Skull/Hana/Vlad: Exotic ohne Evolutionszeilen (D). Namen, Werte und Figuren-Designs eigen.', heroes);
  T('heroLevelCosts', 'R', 'Stützstufen 1 und 10..130 je Tiergruppe (D-Struktur); Evolution-Coin-Werte eigen.', [1, 2, 3, 4, 5].map((tier) =>
    ({ tier, rows: [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((lv) => ({ lv, cost: { evo_coin: Math.round(tier * (2 + lv * lv / 20)) } })) })));
  T('heroStars', 'E', 'Sterne 1-6 (D); Kosten/Optionen eigen.', [2, 3, 4, 5, 6].map((star) =>
    ({ star, pieces: [0, 0, 10, 20, 40, 80, 160][star], coins: [0, 0, 50, 150, 400, 1000, 2500][star], bonus: [{ stat: 'dmgPct', v: 5 * star }, { stat: 'hp', pct: 5 * star }] })));
  const coll = [];
  for (const rar of HRAR) [1, 3, 6, 9, 12, 15, 18].forEach((need, k) =>
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
    { id: 'rg_novice', rows: [wp('n', 0, 40), wp('n', 1, 20), { w: 30, item: 'weapon_scroll', min: 2, max: 10 }, { w: 10, item: 'weapon_scroll', min: 11, max: 20 }], s: 'D' },
    { id: 'rg_expert', rows: [wp('n', 0, 30), wp('n', 1, 15), wp('n', 2, 10), wp('n', 3, 5), { w: 30, item: 'weapon_scroll', min: 2, max: 10 }, { w: 10, item: 'weapon_scroll', min: 11, max: 20 }], s: 'D' },
    { id: 'rg_warrior', rows: [wp('n', 0, 40), wp('n', 1, 26), wp('n', 2, 20), wp('n', 3, 10), wp('n', 4, 4)], s: 'D' },
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
    { id: 'novice', name: 'Novizen-Truhe', costs: [{ key_novice: 1 }, { gems: 30 }], multi: [1, 10], per: 1, rate: 'rg_novice', unlock: { unlock: 'shop' }, s: 'R', note: 'Inhalt D; Gem-Preis eigen.' },
    { id: 'expert', name: 'Experten-Truhe', costs: [{ key_expert: 1 }, { gems: 60 }], multi: [1, 10], per: 1, rate: 'rg_expert', unlock: { questDone: 'mq_57' }, s: 'R', note: 'Inhalt D; Gem-Preis eigen.' },
    { id: 'warrior', name: 'Warrior Chest', costs: [{ key_warrior: 1 }, { gems: 100 }], multi: [1, 10], per: 1, rate: 'rg_warrior', unlock: { questDone: 'mq_67' }, s: 'R', note: 'Inhalt D. Freischaltung mit der Hauptquest, die den ersten Krieger-Schlüssel vergibt (Reihenfolge D, Kopplung eigen).' },
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
  T('buildings', 'D', 'Baukosten aus den Spieldaten (D).', [
    { id: 'bonfire', name: 'Lagerfeuer', x: 800, y: 760, cost: BUILD.bonfire, unlock: ['abilities'], max: 1 },
    { id: 'smithy', name: 'Schmiede', x: 500, y: 700, cost: BUILD.smithy, unlock: [], max: 8, tiers: 'smithy' },
    { id: 'chesthouse', name: 'Schlüsselhaus', x: 1100, y: 700, cost: BUILD.chesthouse, unlock: ['keyhouse'], max: 5, tiers: 'keyhouseTiers' },
    { id: 'lumbermill', name: 'Sägewerk', x: 380, y: 420, cost: BUILD.lumbermill, unlock: [], max: 1, produce: { item: 'wood', perHour: 30, cap: 60 } },
    { id: 'quarry', name: 'Steinbruch', x: 1220, y: 420, cost: BUILD.quarry, unlock: [], max: 1, produce: { item: 'stone', perHour: 20, cap: 40 } },
    { id: 'costumeshop', name: 'Kostümladen', x: 620, y: 300, cost: BUILD.costumeshop, unlock: [], max: 1 },
    { id: 'portal', name: 'Portal', x: 980, y: 300, cost: BUILD.portal, unlock: ['portal'], max: 1 },
    { id: 'raidcamp', name: 'Raid-Lager', x: 700, y: 500, cost: BUILD.raidcamp, unlock: [], max: 1, s: 'D', note: 'Gebäude aus Ryans Questkette, Kosten 2.590 Gold (D, BossRaidCamp).' },
  ].map((b) => ({ ...b, pos: W1_BUILDINGS[b.id] })));
  // Figuren und Standorte nach NpcData der Referenz (D). Dialogtexte sind EIGENE Texte; nur die Szenenstruktur (Anzahl, Freischaltquest) folgt der Referenz.
  const SC = (id, after, ...lines) => ({ id, after, lines });
  const stageArea = (n) => areas[n - 1];
  const KAIN = [SC('k1', null, 'Du kommst von jenseits des Meeres? Dann bist du unsere letzte Hoffnung.', 'Sieben Tage hat der Angriff gedauert. Übrig ist nur diese Siedlung.'),
    SC('k2', null, 'Die Mandragoras wühlen die Felder um. Fang mit ihnen an.'),
    SC('k3', { questDone: 'mq_2' }, 'Gut gemacht. Am Lagerfeuer in der Siedlung kannst du deine Kräfte ausbauen.'),
    SC('k4', { cleared: 'a1_1' }, 'Rootling ist gefallen! Der Weg nach Westen in die Wüste ist frei.', 'Halte dort Ausschau nach Taid. Er kennt die Gegend.'),
    SC('k5', { cleared: 'a1_2' }, 'Die Spinnenkönigin ist besiegt. Hinter der Wüste liegt Ebonhollow – dort scheint keine Sonne.'),
    SC('k6', { cleared: 'a1_3' }, 'Der Gargoyle wachte über das Tor zum Eis. Zieh dich warm an.'),
    SC('k7', { cleared: 'a1_4' }, 'Frostfang war nur ein Wächter. In den Ruinen herrscht die Elfenkönigin.'),
    SC('k8', { cleared: 'a1_5' }, 'Bleibt nur noch der Schlund. Baal hat das alles begonnen.'),
    SC('k9', { cleared: 'a1_6' }, 'Du hast die Zuflucht befreit. Hinter dem Schlund liegt eine neue Welt – man wird dich dort brauchen.')];
  const TAID = { 2: 'Die Wüste verzeiht nichts. Ich habe Arbeit für dich, wenn du Gold und Orbs brauchst.', 3: 'Hier unten hört man die Toten flüstern. Hilf mir, dann helfe ich dir.',
    4: 'Kalt genug? Die Frostgoblins plündern alles. Ich zahle gut.', 5: 'Schöne Ruinen, tödliche Rosen. Ich hätte da ein paar Aufträge.' };
  const RYAN = ['Ich bin Ryan, Jäger alter Geheimnisse. In jedem Gebiet schläft ein uraltes Wesen – ich habe ihre Lager gefunden.',
    'Hier haust die Kristallkrabbe. Sie kam übers Meer wie du.', 'Dieses Ödland war ein Schlachtfeld. Etwas Altes ruht darunter.', 'In diese Kathedrale fällt kein Licht. Nach dir.',
    'Die Kälte hier kommt nicht vom Wetter. Ich warte am Feuer.', 'Die Feenkönigin der Ruinen – ist das nicht aufregend?', 'Man sagt, hier liege das Tor zur Hölle. Sei vorsichtig.'];
  const npcRows = [
    { id: 'npc_elder', char: 'elder', name: 'Älteste', area: 'base', pos: W1_BASE.elder, s: 'E', scenes: [SC('e1', null, 'Willkommen. Rings um die Siedlung liegen sechs Gebiete – Greenhaven im Süden ist offen.')] },
    { id: 'npc_smith', char: 'smith', name: 'Schmied', area: 'base', pos: W1_BASE.smith, s: 'E', scenes: [SC('s1', null, 'Bring mir Gold, dann schmiede ich dir Waffen.')] },
    { id: 'npc_kain', char: 'kain', name: 'Kain', area: 'a1_1', pos: W1.cain, s: 'D', scenes: KAIN },
    ...W1.guides.map(([st, X, Z]) => ({ id: `npc_taid_${st}`, char: 'taid', name: 'Taid', area: zoneOf(X, Z), home: `a1_${st}`, pos: [X, Z], s: 'D', scenes: [SC(`t${st}`, null, TAID[st])] })),
    { id: 'npc_ryan_0', char: 'ryan', name: 'Ryan', area: 'base', pos: [25, 1], s: 'R', scenes: [SC('r0', null, RYAN[0], 'Bau mir ein Raid-Lager, dann zeige ich dir, wie man sie herausfordert.')] },
    ...W1.raids.map(([st, X, Z]) => ({ id: `npc_ryan_${st}`, char: 'ryan', name: 'Ryan', area: zoneOf(X, Z), pos: [X, Z], kind: 'raid', raid: `raid_${st}`, s: 'D', scenes: [SC(`r${st}`, null, RYAN[st], 'Wirst du das uralte Wesen herausfordern?')] })),
    { id: 'npc_dnew', char: 'dnew', name: 'Dnew', area: 'a1_6', pos: [2, 66], s: 'D', scenes: [SC('d1', null, 'Bis hierher hat es kaum jemand geschafft. Der Schlund nimmt sich jeden.')] },
    // Kapitel 2/3: Standort je Gebiet nach Referenz, Position auf der Einzelkarte eigen
    ...[['lina', 'Lina', [7], 'Die Festung hält – noch. Gut, dass du da bist.'], ['hana', 'Hana', [8, 14], 'Triff mich vor der Hütte. Es gibt ein Grab, das du sehen solltest.'],
      ['menivh', 'Menivh', [8, 9, 10, 11, 12], 'Die gefallenen Königreiche zahlen für jede helfende Hand.'], ['hero-chairman', 'Chairman', [15, 16, 17, 18, 19, 20], 'Du kämpfst. Ich finde heraus, wer dahintersteckt.']]
      .flatMap(([ch, nm, stages, line], ci) => stages.map((st) => ({ id: `npc_${ch.replace('hero-', '')}_${st}`, char: ch.replace('hero-', ''), name: nm, area: stageArea(st).id, home: stageArea(st).id,
        x: W / 2 + (ci % 2 ? 190 : -190), y: H - 300 - (ci > 1 ? 130 : 0), s: 'D', scenes: [SC(`${ch}_${st}`, null, line)] }))),
  ];
  T('npcs', 'R', '8 Figuren, 27 Standorte, Szenen-Freischaltung nach Referenz (D-Struktur); alle Dialogtexte und Älteste/Schmied sind eigen.', npcRows);
  T('worldObjects', 'D', 'Invasionsportale (Positionen der Referenz, dekorativ: Invasion läuft über das Menü) und Lagerfeuer.', [
    ...W1.invasion.map(([X, Z], k) => ({ id: `inv_${k}`, type: 'invportal', area: zoneOf(X, Z), pos: [X, Z] })),
    ...W1.campfires.map(([nm, X, Z], k) => ({ id: `fire_${k}`, type: 'campfire', ref: nm, area: zoneOf(X, Z), pos: [X, Z] })),
  ]);
  T('worlds', 'B', 'Zusammenhängende Kapitel-1-Welt: Gelände, Gebietsgrenzen, Fels, Wasser und Farbtöne als Raster aus der Originalkarte (B); Referenzpunkte D; Bauplätze der Basis E. Meter, X=Ost, Z=Nord.', [{ ...WORLD, entries: { ...WORLD.entries } }]);
  T('unlocks', 'D', 'Levelgebundene Freischaltungen (D); blessing/spin/special/extra/pvp eigen platziert.', [
    { feature: 'battlePass', level: 10 }, { feature: 'sevenDay', level: 14 }, { feature: 'carnival', level: 17 }, { feature: 'liveEvent', level: 24 },
    { feature: 'spin', level: 8, s: 'E' }, { feature: 'blessing', level: 20, s: 'E' }, { feature: 'randomReward', level: 8, s: 'R' },
  ]);

  // ------------------------------------------------------------------ Quests
  const quests = [];
  const Q = (id, name, obj, reward, x = {}) => { quests.push({ id, name, prereq: quests.length ? [quests[quests.length - 1].id] : [], obj: [obj], reward, ...x }); };
  const kill = (m, n) => ({ counter: `kill:${m}`, n, from: 'accept' });
  const G = (n) => [{ item: 'gold', n }];
  // Hauptquestkette Kapitel 1 aus den Spieldaten (D): Reihenfolge, Bedingung, Menge, Belohnung (meist Erfahrung) und Freischaltungen. Questnamen sind eigene Texte.
  const ABID = { 1: 'ab_power', 2: 'ab_cargo', 3: 'ab_move', 4: 'ab_hp', 5: 'ab_crit', 8: 'ab_atkspeed', 10: 'ab_regen', 11: 'ab_multi', 12: 'ab_triple' }, ABN = { 1: 'Kraft', 2: 'Fracht', 3: 'Bewegungstempo', 4: 'HP', 5: 'Kritische Chance', 8: 'Angriffstempo', 10: 'HP-Regeneration', 11: 'Doppelangriff', 12: 'Dreifachangriff' };
  const BID = { 1: ['bonfire', 'das Lagerfeuer'], 2: ['chesthouse', 'das Schlüsselhaus'], 3: ['smithy', 'die Schmiede'], 4: ['lumbermill', 'das Sägewerk'], 5: ['costumeshop', 'den Kostümladen'], 6: ['portal', 'das Portal'], 7: ['quarry', 'den Steinbruch'] };
  const byRef = new Map(variants.filter((v) => v.ref).map((v) => [String(v.ref.id), v]));
  const cnt = (counter, n, acc) => ({ counter, n, from: acc ? 'life' : 'accept' });
  const mainObj = (type, param, n, acc) => {
    const v = byRef.get(String(param));
    switch (type) {
      case 2001: case 14: return ['Rüste eine Waffe aus', { cond: { mainEquipped: true } }];
      case 8: return v ? [`Besiege ${n > 1 ? n + ' ' : ''}${v.name}`, cnt(`kill:${v.monster}`, n, acc)] : null;
      case 3: return [`Besiege ${n} Gegner`, cnt('kill:any', n, acc)];
      case 13: return [n > 1 ? `Besiege ${n} Bosse oder seltene Gegner` : 'Besiege einen Boss oder seltenen Gegner', cnt('kill:bossAny', n, acc)];
      case 7: return BID[param] ? [`Baue ${BID[param][1]}`, { cond: { building: BID[param][0] } }] : param === 8 ? ['Schalte die Spezial-Upgrades frei', { cond: { unlock: 'special' } }] : null;
      case 26: return ABID[param] ? [`Verbessere ${ABN[param]} auf Stufe ${n}`, { cond: { upgrade: ABID[param], gte: n } }] : null;
      case 18: return ['Kehre zur Basis zurück', cnt('returnBase', 1, 0)];
      case 21: return [n > 1 ? `Schmiede ${n} Waffen` : 'Schmiede eine Waffe', cnt('craft', n, acc)];
      case 1000: return [`Verbessere die Schmiede auf Stufe ${n}`, { cond: { building: 'smithy', lv: n } }];
      case 4200: return ['Öffne eine Waffentruhe im Shop', cnt('gacha:any', n, acc)];
      case 4201: return ['Öffne eine Novizen-Truhe', cnt('gacha:novice', n, acc)];
      case 4202: return ['Öffne eine Experten-Truhe', cnt('gacha:expert', n, acc)];
      case 4203: return ['Öffne eine Krieger-Truhe', cnt('gacha:warrior', n, acc)];
      case 4204: return ['Beschwöre einen Helden', cnt('gacha:hero', n, 1)];
      case 23: return ['Rüste eine Nebenwaffe aus', { cond: { equippedSubs: 1 } }];
      case 19: return [`Schalte Waffenplatz ${n} frei`, { cond: { weaponSlots: n } }];
      case 9: return param === 0 ? [`Sammle ${n} Gold von Gegnern`, cnt('coins', n, acc)] : [`Sammle ${n} ${param === 10 ? 'Holz' : 'Stein'}`, cnt(`collect:${param === 10 ? 'wood' : 'stone'}`, n, acc)];
      case 24: return [`Erreiche Level ${n}`, { cond: { playerLevel: n } }];
      case 10: return ['Finde eine Feldtruhe und bring sie ins Schlüsselhaus', cnt('chest:pickup', n, acc)];
      case 15: return ['Öffne eine Truhe im Schlüsselhaus', cnt('chest:claim', n, acc)];
      case 31: return ['Verschmelze Waffen', cnt('weapon:merge', n, acc)];
      case 3001: return ['Finde und öffne eine Geschenkkiste', cnt('gift:open', n, acc)];
      case 28: return ['Verbessere eine Waffe', cnt('weapon:level', n, acc)];
      case 4000: return ['Kaufe ein Spezial-Upgrade', cnt('upgrade:special', n, acc)];
      case 22: return [`Schalte ${n} Truhenplätze frei`, { cond: { keySlots: n } }];
      case 4002: return [n > 1 ? `Verbessere ${n}-mal eine Fähigkeit` : 'Verbessere eine Fähigkeit', cnt('upgrade:ability', n, acc)];
      case 6003: return ['Besiege den letzten Boss des Kapitels', { cond: { cleared: 'a1_6' } }];
      default: return null;
    }
  };
  const UNL = { 3: [['abilities'], 'clear'], 18: [['weaponVault'], 'receive'], 9: [['craft'], 'clear'], 17: [['shop'], 'receive'], 32: [['codex'], 'clear'], 36: [['missions'], 'clear'], 24: [['slot2'], 'receive'], 224: [['tower'], 'clear'],
    217: [['heroShop'], 'receive'], 218: [['heroes'], 'receive'], 146: [['sTierChest'], 'clear'], 168: [['heroEvolution', 'heroCollection'], 'clear'], 69: [['special'], 'receive'] };
  const pendUnl = [];
  for (const [qid, type, param, n, rk, rn, acc] of MAINQ) {
    const o = mainObj(type, param, n, acc), u = UNL[qid];
    if (!o) { if (u) pendUnl.push(u); continue; } // nicht abbildbare Schritte entfallen; ihre Freischaltung wandert zur nächsten Quest
    const us = [...(u ? [u] : []), ...pendUnl.splice(0)];
    Q(`mq_${qid}`, o[0], o[1], rn ? [rk === 'xp' ? { xp: rn } : { item: rk, n: rn }] : [], { s: 'D', ...(qid === 1 ? { grant: [{ weapon: 'w_sword_n_0' }] } : {}), ...(us.length ? { unlock: us.flatMap((x) => x[0]), unlockOn: us.every((x) => x[1] === 'clear') ? 'clear' : 'receive' } : {}) });
  }
  const feat = {
    2: [['Besiege 15 Kakteen', kill('cactus', 15), { unlock: ['codex'], unlockOn: 'clear', s: 'D' }],
      ['Baue das Schlüsselhaus', { cond: { building: 'chesthouse' } }, {}],
      ['Öffne eine Feldtruhe und hole die Belohnung ab', { counter: 'chest:claim', n: 1, from: 'life' }, { unlock: ['missions'], unlockOn: 'clear', s: 'D' }],
      ['Rüste eine Nebenwaffe aus', { cond: { equippedSubs: 1 } }, { unlock: ['slot2'], unlockOn: 'receive', s: 'D' }],
      ['Kehre zur Basis zurück', { counter: 'returnBase', n: 1, from: 'accept' }, { unlock: ['tower'], unlockOn: 'clear', s: '?' }]],
    3: [['Baue das Sägewerk', { cond: { building: 'lumbermill' } }, {}],
      ['Baue den Steinbruch', { cond: { building: 'quarry' } }, { reward: [{ item: 'gems', n: 150 }], s: 'E' }],
      ['Baue den Kostümladen', { cond: { building: 'costumeshop' } }, { unlock: ['special'], unlockOn: 'clear', s: 'E' }],
      ['Beschwöre einen Helden', { counter: 'gacha:hero', n: 1, from: 'life' }, { unlock: ['heroShop'], unlockOn: 'receive', s: 'D' }],
      ['Verbessere einen Helden', { counter: 'heroLevel', n: 1, from: 'life' }, { unlock: ['heroes'], unlockOn: 'receive', grant: [{ item: 'evo_coin', n: 30 }], s: 'D' }]],
    5: [['Besiege das Giant Chicken', kill('giant_chicken', 1), { unlock: ['sTierChest'], unlockOn: 'clear', s: 'D' }]],
    4: [['Baue das Portal', { cond: { building: 'portal' } }, { unlock: ['portal'], unlockOn: 'clear', s: 'D' }],
      ['Stelle deine Invasion-Verteidigung auf', { counter: 'invasion:defenseSet', n: 1, from: 'life' }, { unlock: ['invasion', 'pvp'], unlockOn: 'receive', s: 'D' }],
      ['Nutze ein Extra-Upgrade', { counter: 'upgrade:extra', n: 1, from: 'life' }, { unlock: ['extra'], unlockOn: 'receive', grant: [{ item: 'orb_ice', n: 6 }], s: 'E' }]],
    7: [['Nutze ein Extra-Upgrade', { counter: 'upgrade:extra', n: 1, from: 'life' }, { unlock: ['extra'], unlockOn: 'receive', grant: [{ item: 'orb_ice', n: 6 }], s: 'R' }], ['Wirke ein Soul-Upgrade', { counter: 'upgrade:soul', n: 1, from: 'life' }, { unlock: ['soul'], unlockOn: 'receive', grant: [{ item: 'orb_hell', n: 6 }], s: 'D' }],
      ['Rolle einen Trait', { counter: 'traitRoll', n: 1, from: 'life' }, { unlock: ['traits'], unlockOn: 'receive', grant: [{ item: 'attr_point', n: 30 }], s: 'D' }]],
  };
  for (const a of areas) {
    if (a.chapter === 1) continue; // Kapitel 1 kommt vollständig aus den Spieldaten
    const s = a.stage, ms = variants.filter((v) => v.rank === 'normal' && groups.some((g) => g.area === a.id && g.v === v.id));
    for (const [nm, obj, x] of feat[s] || []) { const { id, reward, ...rest } = x; Q(id || `q_${a.id}_f${quests.length}`, nm, obj, reward || G(50 * s * s), rest); }
    if (s > 1) { Q(`q_${a.id}_k1`, `Besiege 10 ${ms[0].name}`, kill(ms[0].id, 10), G(60 * s * s)); const m2 = ms[Math.min(2, ms.length - 1)]; Q(`q_${a.id}_k2`, `Besiege 10 ${m2.name}`, kill(m2.id, 10), G(80 * s * s)); }
    Q(`q_${a.id}_boss`, `Besiege ${a.name}-Boss ${AREA[s - 1][2]}`, { cond: { cleared: a.id } }, [{ item: 'gold', n: 150 * s * s }, { item: 'weapon_scroll', n: 3 }, ...(s === 5 ? [] : [])],
      s === 5 ? { unlock: ['heroEvolution', 'heroCollection'], unlockOn: 'clear', s: 'D' } : {});
  }
  // ---- NPC-Questketten aus QuestData der Referenz (Ziel, Menge, Belohnung = D). Annahme und Abgabe beim Questgeber.
  const ABIL = { 'Hp Recovery': 'ab_regen', 'Critical Chance': 'ab_crit', 'Move Speed': 'ab_move', 'Attack Speed': 'ab_atkspeed' };
  const ALIAS = { 'the elephant': 'gold_elephant', dragon: 'red_dragon', 'the dragon': 'red_dragon' };
  const RAIDN = ['Crystal Crab', 'Anubis', 'Blood Lord', 'Frozen Bloom', 'Rosalia', 'Cerberus'];
  const monstersIn = (areaId) => new Set(groups.filter((g) => g.area === areaId).map((g) => variants.find((v) => v.id === g.v).monster));
  function npcObj(text, n, areaId) {
    let m;
    if (/^Hunt Any Enemies/.test(text)) return [`Besiege ${n} Gegner`, { counter: 'kill:any', n, from: 'accept' }];
    if (/^Pick up Coins/.test(text)) return [`Sammle ${n} Gold von Gegnern`, { counter: 'coins', n, from: 'accept' }];
    if (/^Hunt Any Boss/.test(text)) return ['Besiege einen Boss oder seltenen Gegner', { counter: 'kill:bossAny', n: 1, from: 'accept' }];
    if (/^Upgrade any Ability/.test(text)) return ['Verbessere eine Ability', { counter: 'upgrade:ability', n: n || 1, from: 'accept' }];
    if ((m = /^Upgrade (.+) to Lv\.(\d+)/.exec(text))) return [`Verbessere ${{ 'Hp Recovery': 'HP-Regeneration', 'Critical Chance': 'Kritische Chance', 'Move Speed': 'Bewegungstempo', 'Attack Speed': 'Angriffstempo' }[m[1]]} auf Stufe ${m[2]}`, { cond: { upgrade: ABIL[m[1]], gte: Number(m[2]) } }];
    if (/^Find and Bring the Chest/.test(text)) return ['Finde eine Feldtruhe und bring sie ins Schlüsselhaus', { counter: 'chest:pickup', n: 1, from: 'accept' }];
    if ((m = /^Defeat the Raid Boss, (.+) \(Normal\)/.exec(text))) return [`Besiege den Raid-Boss ${m[1]}`, { counter: `raid:clear:raid_${RAIDN.indexOf(m[1]) + 1}`, n: 1, from: 'life' }];
    if (/Speak with Hunter Ryan/.test(text)) return ['Sprich mit Jäger Ryan', { counter: 'talk:char:ryan', n: 1, from: 'life' }];
    if (/^Build a Raid Camp/.test(text)) return ['Baue das Raid-Lager', { cond: { building: 'raidcamp' } }];
    if (/^Meet Hana/.test(text)) return ['Triff Hana vor der Hütte', { counter: 'talk:char:hana', n: 1, from: 'life' }];
    if (/^Clear Heroes' Tomb/.test(text)) return ['Schließe Tomb of Heroes Stufe 1 ab', { counter: 'mode:tomb:clear', n: 1, from: 'life' }];
    if ((m = /^(?:Hunt|Slay) (.+)/.exec(text))) {
      const raw = m[1].toLowerCase(), have = monstersIn(areaId), cands = [ALIAS[raw], raw, raw.replace(/^the /, ''), raw.replace(/es$/, ''), raw.replace(/s$/, '')].filter(Boolean).map((x) => x.replace(/[^a-z0-9]+/g, '_'));
      const hit = cands.find((c) => have.has(c));
      if (hit) return [`Besiege ${n || 1}x ${m[1]}`, { counter: `kill:${hit}`, n: n || 1, from: 'accept' }];
      const el = variants.find((v) => v.id === `e_${areaId}`); // Monster der Referenz existiert bei uns (noch) nicht -> Elite des Gebiets
      return [`Besiege ${n || 1}x ${m[1]} (hier: ${el ? el.name : 'Elite'})`, { counter: `kill:${el ? el.monster : 'any'}`, n: n || 1, from: 'accept' }, 'E'];
    }
    return [text, { counter: 'kill:any', n: 10, from: 'accept' }, '?'];
  }
  function npcReward(text) {
    const m = /^([\d,]+)×? (.+)$/.exec(text) || [], n = Number((m[1] || '1').replace(/,/g, '')), k = (m[2] || '').trim();
    const map = { Gold: 'gold', 'Red Orb': 'orb_red', 'Pink Orb': 'orb_pink', 'Warrior Chest Key': 'key_warrior', 'Special Hero Chest Key': 'key_special_hero', 'Expert Chest Key': 'key_stier' };
    if (map[k]) return [{ item: map[k], n }];
    if (/^(Crimson|Azure|Soul) Orb$/.test(k)) return [{ alias: k.split(' ')[0].toLowerCase(), min: n, max: n }];
    if (k === 'Hero Rune') return [{ rune: { rarity: 2, type: 'hero' } }];
    if (k === 'EXP') return [{ item: 'gold', n: 500 }]; // EXP-Menge der Referenz bezieht sich auf die unbekannte Original-XP-Kurve
    return [{ item: 'weapon_scroll', n: 5 }]; // Raid-Seelen (Water/Earth/... Orb) haben bei uns kein Gegenstück
  }
  const chainQ = (char, at, areaId, rows, start, extra = {}) => rows.forEach(([qid, text, n, rw], k) => {
    const [name, obj, st] = npcObj(text, n, areaId);
    quests.push({ id: `nq_${qid}`, name, giver: char, at, chain: `${char}:${at || 'all'}`, prereq: k ? [`nq_${rows[k - 1][0]}`] : [], start: k ? null : start, obj: [obj], reward: npcReward(rw), s: st || 'D', ...(extra[qid] || {}) });
  });
  for (const [char, key] of [['taid', 'taid'], ['menivh', 'menivh'], ['chairman', 'hero-chairman']]) {
    const ref = NPC_REF[key], by = {};
    for (const q of ref.quests) (by[Math.floor(q[0] / 1000)] ||= []).push(q);
    Object.keys(by).sort((a, b) => a - b).forEach((g, k) => { const a = stageArea(ref.zones[k]); if (a) chainQ(char, `npc_${char}_${ref.zones[k]}`, a.id, by[g], { areaOpen: a.id }); });
  }
  chainQ('ryan', null, 'base', NPC_REF.ryan.quests, { cleared: 'a1_1' }, { 901001: { unlock: ['raid'], unlockOn: 'clear' } });
  chainQ('hana', null, 'a2_2', NPC_REF.hana.quests, { areaOpen: 'a2_2' }, { 902001: { unlock: ['tomb'], unlockOn: 'clear' }, 902002: { unlock: ['runes'], unlockOn: 'clear' } });
  T('quests', 'R', 'Hauptquestkette (Original ca. 850 Einträge nicht erfasst): dokumentierte Unlock-Kopplungen (s=D) + eigene Gebietsquests. Dazu 268 NPC-Kettenquests (id nq_*, Ziel/Menge/Belohnung D, Abgabe beim Questgeber).', quests);

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
    reward: [[{ item: 'key_expert', n: 3 }], [{ item: 'evo_coin', n: 100 }], [{ item: 'key_stier', n: 3 }], [{ item: 'key_special_hero', n: 5 }], [{ item: 'hero_select_ticket', n: 1 }]][k] }));
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
      reward: d === 7 ? [{ item: 'key_expert', n: 2 }, { item: 'spin_ticket', n: 2 }] : [{ item: 'gold', n: 500 * d }, { item: 'weapon_scroll', n: d }] })) });
  tracks.push({ id: 'battlepass', name: 'Battle Pass (freie Reihe)', kind: 'pass', unlock: { unlock: 'battlePass' }, baseline: true, seasonDays: 28, s: 'E',
    note: 'Kauf-Track entfernt; Inhalte/Stufen eigen.',
    nodes: Array.from({ length: 30 }, (_, k) => ({ id: `bp${k + 1}`, name: `Stufe ${k + 1}`, cond: { counter: 'pts:bp', gte: (k + 1) * 100, scope: 'track' },
      reward: [[{ item: 'weapon_scroll', n: 5 }], [{ item: 'evo_coin', n: 20 }], [{ item: 'bluestone', n: 5 }], [{ item: k < 20 ? 'key_novice' : k < 40 ? 'key_expert' : 'key_warrior', n: 1 }], [{ item: 'exp', n: 2 }]][k % 5] })) });
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
  S('mat_keyw', 'materials', 'Warrior Chest Key', { gems: 90 }, [{ item: 'key_warrior', n: 1 }], { limit: 10, reset: 'daily', unlock: { cleared: 'a1_3' } });
  areas.forEach((a) => S(`stagepack_${a.id}`, 'stage_packs', `Stage Pack ${a.name}`, { gold: 500 * a.stage ** 3 },
    [{ item: 'weapon_scroll', n: 10 + 2 * a.stage }, { item: 'evo_coin', n: 10 * a.stage }, a.chapter === 1 && a.stage <= 2 ? { item: 'key_novice', n: 2 } : a.chapter === 1 && a.stage <= 4 ? { item: 'key_expert', n: 2 } : { item: 'key_warrior', n: 1 }], { limit: 1, unlock: { cleared: a.id }, s: 'R',
      note: '20 Stage Packs passend zur Gebietsfreischaltung (D); als erspielbares Gold-Angebot, Inhalt/Preis eigen. Kein Kaufpopup.' }));
  S('chapterpack_1', 'chapter_packs', 'Chapter Pack 1 (nach Baal)', { gems: 800 }, [{ item: 'key_stier', n: 10 }, { item: 'evo_coin', n: 300 }, { item: 'hero_select_ticket', n: 1 }], { limit: 1, unlock: { cleared: 'a1_6' }, s: 'R' });
  S('chapterpack_2', 'chapter_packs', 'Chapter Pack 2 (nach Frost King)', { gems: 1600 }, [{ item: 'key_stier', n: 20 }, { item: 'evo_coin', n: 1000 }, { item: 'hero_select_ticket', n: 2 }], { limit: 1, unlock: { cleared: 'a2_7' }, s: 'R' });
  S('inv_scroll', 'invasion', '20 Weapon Scrolls', { invasion_coin: 200 }, [{ item: 'weapon_scroll', n: 20 }], { limit: 5, reset: 'weekly', unlock: { unlock: 'invasion' } });
  S('inv_evo', 'invasion', '100 Evolution Coins', { invasion_coin: 400 }, [{ item: 'evo_coin', n: 100 }], { limit: 3, reset: 'weekly', unlock: { unlock: 'invasion' } });
  S('inv_keys', 'invasion', 'S-Tier Chest Key', { invasion_coin: 600 }, [{ item: 'key_stier', n: 1 }], { limit: 3, reset: 'weekly', unlock: { unlock: 'invasion' } });
  // Pakete (Reiter Spezial): Inhalte nach der Vorlage (B). Es gibt keine Echtgeldkäufe: Einmal-Pakete werden durch Fortschritt freigeschaltet und sind dann gratis,
  // wiederkehrende Pakete kosten Gems (Preise eigen) und enthalten dafür keine Gems. goldKills = Goldmenge in "Kills im weitesten Gebiet".
  const PK = { cat: 'packs', s: 'R' };
  S('pk_raid', 'packs', 'Ticket-Paket', { gems: 100 }, [{ item: 'ticket_raid', n: 3 }], { ...PK, group: 'Bossraid-Paket', hue: 'red', limit: 1, reset: 'daily', unlock: { unlock: 'raid' }, need: 'Bossraid freischalten' });
  S('pk_growth', 'packs', 'Wachstums-Unterstützungspaket', {}, [{ item: 'key_stier', n: 10 }, { item: 'weapon_scroll', n: 400 }], { ...PK, group: 'Wachstums-Unterstützungspaket', hue: 'green', limit: 1, unlock: { cleared: 'a1_2' }, need: 'Scarlet besiegen' });
  S('pk_weapon', 'packs', 'Waffen-Upgrade-Paket', {}, [{ item: 'weapon_scroll', n: 1400 }, { goldKills: 300 }, { item: 'gems', n: 210 }], { ...PK, group: 'Waffen-Upgrade-Paket', hue: 'orange', limit: 1, unlock: { cleared: 'a1_4' }, need: 'Frostfang besiegen' });
  S('pk_old', 'packs', 'Altes Paket', { gems: 1200 }, [{ weaponPool: { series: 'n', rarity: 4 } }, { item: 'key_stier', n: 2 }], { ...PK, group: 'Sonderpaket', hue: 'blue', limit: 3, unlock: { cleared: 'a1_6' }, need: 'Baal besiegen' });
  S('pk_hero_leg', 'packs', 'Legendäres Charakter-Paket', {}, [{ item: 'hero_select_ticket', n: 1 }, { item: 'exp', n: 1200 }, { item: 'gems', n: 1800 }], { ...PK, group: 'Charakter-Paket', hue: 'orange', limit: 1, unlock: { cleared: 'a2_3' }, need: 'Volcanus besiegen' });
  S('pk_hero_old', 'packs', 'Paket mit alten Charakteren', {}, [{ item: 'hero_select_ticket', n: 1 }, { item: 'exp', n: 1400 }, { item: 'gems', n: 2400 }], { ...PK, group: 'Charakter-Paket', hue: 'red', limit: 1, unlock: { cleared: 'a3_1' }, need: 'Hobchief besiegen' });
  const P30 = (k) => Array.from({ length: k }, () => ({ heroPieces: { rarity: 'any', n: 30 } }));
  S('pk_piece_d', 'packs', 'Tägliches Splitter-Paket', { gems: 300 }, P30(1), { ...PK, group: 'Splitter-Pakete', hue: 'blue', limit: 1, reset: 'daily', unlock: { unlock: 'heroes' }, need: 'Helden freischalten' });
  S('pk_piece_w', 'packs', 'Wöchentliches Splitter-Paket', { gems: 800 }, P30(3), { ...PK, group: 'Splitter-Pakete', hue: 'orange', limit: 1, reset: 'weekly', unlock: { unlock: 'heroes' }, need: 'Helden freischalten' });
  S('pk_piece_m', 'packs', 'Monatliches Splitter-Paket', { gems: 1200 }, P30(5), { ...PK, group: 'Splitter-Pakete', hue: 'purple', limit: 1, reset: 'monthly', unlock: { unlock: 'heroes' }, need: 'Helden freischalten' });
  // Tauschen: je Material eine Gratis-Abholung pro Tag (im Original per Werbevideo) und zwei Gem-Angebote; Mengen nach Vorlage (B), Gold wächst mit dem Fortschritt.
  [['gold', 'Upgrade-Material', [37, 77, 402]], ['orb_red', 'Upgrade-Material', [9, 20, 104]], ['orb_pink', 'Upgrade-Material', [4, 10, 50]], ['crystal', 'Verstärkungsmaterial', [8, 16, 84]], ['weapon_scroll', 'Verstärkungsmaterial', [21, 44, 233]]]
    .forEach(([item, group, ns]) => ns.forEach((n, k) => S(`ex_${item}_${k}`, 'exchange', { gold: 'Gold', orb_red: 'Rote Orbs', orb_pink: 'Pink-Orbs', crystal: 'Kristalle', weapon_scroll: 'Waffenrollen' }[item], [{}, { gems: 20 }, { gems: 100 }][k],
      [item === 'gold' ? { goldKills: n } : { item, n }], { group, limit: k ? 0 : 1, reset: k ? 'none' : 'daily', s: 'B' })));
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
      { w: 12, item: 'evo_coin', min: 5 + 5 * k, max: 15 + 10 * k }, { w: 10, item: 'bluestone', min: 2, max: 5 + k }, { w: 8, item: 'gems', min: 10, max: 20 }, { w: 4, item: k < 2 ? 'key_novice' : k < 4 ? 'key_expert' : 'key_warrior', min: 1, max: k < 4 ? 2 : 1 }, { w: 1, item: 'gems', min: 100, max: 100 }] })));

  // ------------------------------------------------------------------ Modi
  T('towerFloors', 'R', '250 Etagen (D); Etage 151 = 35 Gems (D). Gegner, Wellen, übrige Rewards eigen (Gems = 5 + floor(Etage/5)).',
    Array.from({ length: 250 }, (_, k) => { const f = k + 1, boss = f % 10 === 0; return { floor: f, level: Math.round(2 + f * 1.55), timer: null,
      waves: boss ? [[{ rank: 'normal', count: 6 }], [{ rank: 'boss', count: 1 }]] : [[{ rank: 'normal', count: 5 }], [{ rank: 'normal', count: 5 }, { rank: 'elite', count: 1 }]],
      first: [{ item: 'gems', n: 5 + Math.floor(f / 5) }, { item: 'gold', n: 100 * f * f }, ...(boss ? [{ item: 'synergy_point', n: 5 }, { item: 'exp', n: 2 }] : [])],
      repeat: [{ item: 'gold', n: 20 * f * f }], s: f === 151 ? 'D' : 'E' }; }));
  // Raid-Mechaniken der Stufe "Normal" nach den Guides des Fan-Wikis (D: Art der Mechanik und genannte Zahlen). Takt, Schwellen und Radien nennt die Quelle nicht (E).
  T('raidMechs', 'R', 'Je Raid-Boss eine Kernmechanik (Normal). D = im Guide genannte Zahlen; period/hpPct/radius/Prozent je Sekunde eigen.', [
    { id: 'shell', name: 'Panzerrückzug', hpPct: 50, hits: 50, desc: 'Unter halbem Leben zieht sich der Krebs in den Panzer zurück: 50 Treffer prallen ab, Fernangriffe werden zurückgeworfen.' },
    { id: 'summon', name: 'König der Wüste', period: 15, count: 5, atkPerMinionPct: 10, desc: 'Beschwört 5 Mumien; jede lebende Mumie stärkt seinen Angriff.' },
    { id: 'festival', name: 'Fest der Nacht', period: 18, charge: 5, mult: 7, healPct: 30, desc: 'Lädt 5 Sekunden auf und trifft dann Fernkämpfer mit 700 % Angriff; heilt sich um 30 % des Schadens.' },
    { id: 'wind', name: 'Arktischer Wind', period: 14, charge: 1.5, radius: 240, mult: 5, knock: 260, slowSec: 5, desc: 'Stößt nahe Gegner weg, 500 % Angriff, danach 5 Sekunden langsamer.' },
    { id: 'fairy', name: 'Feenwind', period: 16, charge: 1.5, mult: 1, poisonSec: 10, poisonPct: 20, shieldPct: 5, desc: '100 % Angriff, 10 Sekunden Gift, Rosalia erhält einen Schild.' },
    { id: 'hellfire', name: 'Höllenfeuer', period: 10, charge: 1.2, mult: 2, burnSec: 5, burnPct: 30, desc: '200 % Angriff und Brand.' },
  ]);
  T('raidBosses', 'R', '6 Raid-Bosse mit Namen aus Ryans Questkette (D); Werte und Wertung eigen.', [1, 2, 3, 4, 5, 6].map((k) => ({ id: `raid_${k}`, name: ['Crystal Crab', 'Anubis', 'Blood Lord', 'Frozen Bloom', 'Rosalia', 'Cerberus'][k - 1], level: 100 + k * 45, hpMult: 60, mech: ['shell', 'summon', 'festival', 'wind', 'fairy', 'hellfire'][k - 1],
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

  C('multiplayer', MP, 'E', 'Solo-Spiel: PvP-Arena und Invasion sind nicht Teil des Spiels. true im Content schaltet sie samt Zubehör wieder ein (Paket mit buildBaseContent({ multiplayer: true }) erzeugen).');
  if (!MP) {
    const gone = quests.filter((q) => q.obj[0].counter === 'invasion:defenseSet');
    for (const x of gone) for (const q of quests) if (q.prereq.includes(x.id)) q.prereq = q.prereq.flatMap((p) => (p === x.id ? x.prereq : [p]));
    tables.quests = quests.filter((q) => !gone.includes(q));
    tables.shop = tables.shop.filter((s) => s.cat !== 'invasion' && !['tk_inv', 'tk_pvp_free'].includes(s.id));
    tables.tracks = tables.tracks.filter((t) => t.id !== 'invasionpass');
    tables.worldObjects = tables.worldObjects.filter((o) => o.type !== 'invportal');
    delete config.dailyTickets.ticket_invasion; delete config.dailyTickets.ticket_pvp;
    for (const p of tables.perks) if (p.items) p.items = p.items.filter((i) => i !== 'ticket_invasion');
    for (const s of tables.shop) if (s.id === 'perk_tickets') s.name = 'Perk: +1 Tagesticket Tower/Raid/Tomb';
  }
  const pack = { schema: SCHEMA, version: 'base-27.2.0-1', ref: '27.2.0', tables, meta, config, configMeta };
  return pack;
}
