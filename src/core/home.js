// Basis: Gebäude, Produktion, Cargo-Abgabe, Feldtruhen + Key House, Gift Chests, Gebietstruhen.
import { fail, pickWeighted } from './util.js';
import { add, pay, give, emit, check, claimOnce, bal } from './econ.js';
import { unlock, need } from './progress.js';

// ---- Gebäude
export function build(g, id) {
  const d = g.c.get('buildings', id), b = g.state.buildings[id];
  if (b && b.level >= 1) fail('already', 'Bereits gebaut');
  pay(g, d.cost, 'build', id);
  g.state.buildings[id] = { level: 1, prodAt: g.now() };
  for (const f of d.unlock || []) unlock(g, f);
  emit(g, `build:${id}`); emit(g, 'build');
}
export function buildingUpgradeCost(g, id) {
  const d = g.c.get('buildings', id), b = g.state.buildings[id];
  if (!b || !d.tiers || b.level >= d.max) return null;
  return g.c.get(d.tiers, b.level).upgradeCost;
}
export function upgradeBuilding(g, id) {
  const cost = buildingUpgradeCost(g, id) || fail('max_level', 'Kein Upgrade verfügbar');
  pay(g, cost, 'build:upgrade', id);
  g.state.buildings[id].level++;
  emit(g, `buildUp:${id}`);
}
export function production(g, id) {
  const d = g.c.get('buildings', id), b = g.state.buildings[id];
  if (!b || !d.produce) return 0;
  return Math.min(d.produce.cap, Math.floor(((g.now() - b.prodAt) / 3600000) * d.produce.perHour));
}
export function collectProduction(g, id) {
  const n = production(g, id), d = g.c.get('buildings', id);
  if (n <= 0) fail('nothing', 'Noch nichts produziert');
  // Rest-Zeit behalten statt verwerfen (kein schleichender Verlust)
  g.state.buildings[id].prodAt += Math.round((n / d.produce.perHour) * 3600000);
  if (production(g, id) >= d.produce.cap) g.state.buildings[id].prodAt = g.now();
  add(g, d.produce.item, n, 'production', id);
  return n;
}

// ---- Cargo (physische Beute, getrennt vom Inventar)
export function cargoUsed(g) {
  let n = 0;
  for (const [i, v] of Object.entries(g.state.cargo)) n += v * (g.c.get('items', i).cargo || 1);
  return n;
}
export const cargoFree = (g) => Math.max(0, g.stats.cargo - cargoUsed(g));
// Nimmt so viel auf, wie Platz ist; gibt die tatsächlich aufgenommene Stückzahl zurück.
export function cargoAdd(g, item, n) {
  const w = g.c.get('items', item).cargo || 1, take = Math.min(n, Math.floor(cargoFree(g) / w));
  if (take > 0) g.state.cargo[item] = (g.state.cargo[item] || 0) + take;
  return take;
}
export function deliver(g) {
  if (g.state.world.area !== 'base') fail('not_at_base', 'Abgabe nur in der Basis');
  const out = [];
  for (const [i, n] of Object.entries(g.state.cargo)) {
    if (n <= 0) continue;
    const d = g.c.get('items', i);
    if (d.sell > 0) { const gold = Math.floor(n * d.sell * (1 + g.stats.goldPct / 100) * g.c.cfg.rewardFactor.gold); add(g, 'gold', gold, 'cargo:sell', i); out.push({ item: 'gold', n: gold }); } else { add(g, i, n, 'cargo:deliver'); out.push({ item: i, n }); }
  }
  g.state.cargo = {};
  if (out.length) emit(g, 'deliver');
  return out;
}

// ---- Key House
export function chapterReached(g, ch) { return ch === 1 || !!g.state.world.cleared[ch === 2 ? 'a1_6' : 'a2_7']; }
export function unlockKeySlot(g, idx) {
  need(g, 'keyhouse');
  const rows = g.c.t.keyHouseSlots, row = rows[idx] || fail('bad_slot'), slots = g.state.keyhouse.slots;
  if (slots[idx].open) fail('already', 'Bereits freigeschaltet');
  if (!chapterReached(g, row.chapter)) fail('locked', `Kapitel ${row.chapter} noch nicht erreicht`);
  if (idx > 0 && rows[idx - 1].chapter === row.chapter && !slots[idx - 1].open) fail('locked', 'Vorherigen Slot zuerst freischalten');
  pay(g, row.cost, 'keyhouse:slot', String(idx));
  slots[idx].open = true;
}
function freeSlot(g, chapter) {
  const rows = g.c.t.keyHouseSlots, bound = g.c.cfg.keyhouse.chapterBound;
  return g.state.keyhouse.slots.findIndex((s, k) => s.open && !s.chest && (!bound || rows[k].chapter === chapter));
}
export const chestSpawnerReady = (g, id) => g.now() >= (g.state.world.chests[id] || 0);
// Feldtruhe aufnehmen -> Slot belegen -> Reveal-Timer starten. Spawner-Respawn ist davon unabhängig.
export function pickupChest(g, spawnerId) {
  const sp = g.c.get('chestSpawners', spawnerId);
  if (!g.state.unlocks.keyhouse) fail('locked', 'ChestHouse wird benötigt');
  if (!chestSpawnerReady(g, spawnerId)) fail('not_ready', 'Truhe noch nicht wieder erschienen');
  const ch = g.c.get('areas', sp.area).chapter, idx = freeSlot(g, ch);
  if (idx < 0) fail('slots_full', 'Kein freier Key-House-Slot');
  const type = g.c.get('chestTypes', pickWeighted(g.state.rng, 'loot', sp.pool).type);
  g.state.keyhouse.slots[idx].chest = { type: type.id, readyAt: g.now() + type.revealSec * 1000, from: spawnerId };
  g.state.world.chests[spawnerId] = g.now() + sp.respawn * 1000;
  emit(g, 'chest:pickup');
  return idx;
}
export function claimChest(g, idx) {
  const sl = g.state.keyhouse.slots[idx];
  if (!sl || !sl.chest) fail('empty', 'Slot leer');
  if (g.now() < sl.chest.readyAt) fail('not_ready', 'Truhe noch nicht fällig');
  const type = g.c.get('chestTypes', sl.chest.type);
  sl.chest = null; // Slot zuerst freigeben: derselbe Claim kann nie zweimal auszahlen
  const rows = type.mode === 'one' ? [pickWeighted(g.state.rng, 'loot', type.rows)] : type.rows.filter((r) => r.w > 0);
  const got = give(g, rows.filter(Boolean), `chest:${type.id}`);
  emit(g, 'chest:claim');
  return got;
}
export function chestSpeedUpCost(g, idx) {
  const sl = g.state.keyhouse.slots[idx];
  if (!sl || !sl.chest) return null;
  const min = Math.ceil(Math.max(0, sl.chest.readyAt - g.now()) / 60000);
  return min > 0 ? { gems: min * g.c.cfg.keyhouse.speedUpGemsPerMin } : null;
}
export function speedUpChest(g, idx) {
  const cost = chestSpeedUpCost(g, idx) || fail('not_needed', 'Nicht nötig');
  pay(g, cost, 'keyhouse:speedup', String(idx));
  g.state.keyhouse.slots[idx].chest.readyAt = g.now();
}

// ---- Gift Chests & Gebietstruhen
export const giftReady = (g, id) => g.now() >= (g.state.world.gifts[id] || 0);
export function openGift(g, spawnerId) {
  const sp = g.c.get('giftSpawners', spawnerId);
  if (!giftReady(g, spawnerId)) fail('not_ready', 'Noch nicht wieder erschienen');
  const row = g.c.get('giftChestLevels', g.state.player.level), bc = g.c.cfg.bonusClaims;
  g.state.world.gifts[spawnerId] = g.now() + sp.respawn * 1000;
  const spec = [];
  if (bc.giftChest) {
    spec.push({ item: 'gold', n: row.gold * (bc.mode === 'add' ? row.bonusMult + 1 : row.bonusMult) }, { item: 'gems', n: row.bonusGems });
  } else spec.push({ item: 'gold', n: row.gold });
  emit(g, 'gift:open');
  return give(g, spec, 'gift_chest', spawnerId);
}
export function openAreaChest(g, id) {
  const d = g.c.get('areaChests', id);
  return claimOnce(g, `areachest:${id}`, () => give(g, d.reward, 'area_chest', id));
}
export { bal, check };
