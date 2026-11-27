// Spielstand: Erzeugung, Migration, prüfsummengesicherte Serialisierung mit Backup-Slot und Recovery.
import { hash53, utcDay, utcWeek } from './util.js';

export const SAVE_VERSION = 2;

export function newState(c, now, seed = (now ^ 0x9e3779b9) | 0, profileId = null) {
  const cfg = c.cfg;
  return {
    v: SAVE_VERSION, profileId: profileId || 'p_' + hash53(String(now) + ':' + seed), created: now, contentVersion: c.version, sandbox: false,
    rng: { loot: seed, gacha: seed ^ 0x1111, craft: seed ^ 0x2222, trait: seed ^ 0x3333, world: seed ^ 0x4444, shop: seed ^ 0x5555, mode: seed ^ 0x6666 },
    player: { level: 1, xp: 0, lifetimeXp: 0 },
    inv: {}, cargo: {}, ledger: [], totals: {}, txSeq: 0,
    claims: {}, counters: {}, flags: {}, unlocks: {},
    period: { day: utcDay(now) - 1, week: utcWeek(now), daily: { c: {}, claims: {}, caps: {} }, weekly: { c: {}, claims: {}, caps: {} } },
    tracks: {}, upgrades: {},
    weapons: { seq: 0, list: [], slots: [null, null, null, null, null, null], unlocked: 1 },
    heroes: { active: cfg.heroes.starter, owned: { [cfg.heroes.starter]: { level: 1, star: 1 } }, raidTeam: [cfg.heroes.starter] },
    traits: { active: 0, presets: Array.from({ length: cfg.traits.presets }, () => ({ slots: Array(cfg.traits.slots).fill(null) })) },
    runes: { seq: 0, list: [], loadouts: {} },
    buildings: {}, keyhouse: { slots: c.t.keyHouseSlots.map(() => ({ open: false, chest: null })) },
    world: { area: 'base', respawn: {}, cleared: {}, bossKills: {}, fog: {}, chests: {}, gifts: {}, lastArea: null, rrAt: 0 },
    quests: { active: {}, done: {} }, npc: { seen: {} },
    gacha: {}, shop: { bought: {}, merchant: {} },
    modes: { session: null, tower: { best: 0 }, raid: { best: {} }, tomb: { best: 0 }, pvp: { rating: cfg.pvp.startRating, wins: 0 },
      invasion: { rating: cfg.invasion.startRating, tier: 0, streak: 0, bank: 0, bankAt: now, history: [], season: 0, defense: null, revenge: [] } },
    settings: { autoBoss: false, dmgNumbers: true, reducedFx: false, haptics: true, sfx: 0.6, music: 0.4, textScale: 1, colorblind: false, autoReturn: true },
    sync: { rev: 0, server: null }, codes: {},
  };
}

// Migrationen: jede Stufe hebt genau eine Version an. Unbekannte (neuere) Versionen werden abgelehnt.
const MIGRATIONS = {
  1: (s) => { s.codes ||= {}; s.sync ||= { rev: 0, server: null }; s.v = 2; return s; },
};
export function migrate(s, c) {
  if (!s || typeof s !== 'object' || !Number.isInteger(s.v)) throw new Error('Spielstand ungültig');
  if (s.v > SAVE_VERSION) throw new Error('Spielstand stammt aus neuerer Version');
  while (s.v < SAVE_VERSION) { const m = MIGRATIONS[s.v]; if (!m) throw new Error('Migration fehlt: ' + s.v); s = m(s); }
  // Strukturabgleich mit aktuellem Content (neue Slots/Features), ohne Bestehendes zu überschreiben.
  const fresh = newState(c, s.created || 0, 1, s.profileId);
  for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
  for (const k of Object.keys(fresh.modes)) if (s.modes[k] === undefined) s.modes[k] = fresh.modes[k];
  for (const k of Object.keys(fresh.settings)) if (s.settings[k] === undefined) s.settings[k] = fresh.settings[k];
  while (s.keyhouse.slots.length < fresh.keyhouse.slots.length) s.keyhouse.slots.push({ open: false, chest: null });
  while (s.traits.presets.length < fresh.traits.presets.length) s.traits.presets.push(fresh.traits.presets[0]);
  // Verwaiste Referenzen entfernen (Content kann sich ändern) statt abzustürzen.
  s.weapons.list = s.weapons.list.filter((w) => c.has('weapons', w.def));
  s.weapons.slots = s.weapons.slots.map((u) => (u && s.weapons.list.some((w) => w.uid === u) ? u : null));
  s.runes.list = s.runes.list.filter((r) => c.has('runes', r.def));
  if (!c.has('heroes', s.heroes.active)) s.heroes.active = c.cfg.heroes.starter;
  if (s.world.area !== 'base' && !c.has('areas', s.world.area)) s.world.area = 'base';
  return s;
}

export function serialize(state) {
  const body = JSON.stringify(state);
  return JSON.stringify({ sum: hash53(body), body });
}
export function deserialize(text) {
  const w = JSON.parse(text);
  if (!w || typeof w.body !== 'string' || hash53(w.body) !== w.sum) throw new Error('Prüfsumme falsch');
  return JSON.parse(w.body);
}

// Speicher-Adapter: store = { get(key), set(key, value) }. Schreibt abwechselnd zwei Slots; lädt den neuesten gültigen.
export function saveTo(store, state, key = 'xphero.save') {
  const metaRaw = store.get(key + '.meta');
  const meta = metaRaw ? JSON.parse(metaRaw) : { slot: 0, n: 0 };
  const slot = (meta.slot + 1) % 2;
  store.set(`${key}.${slot}`, serialize(state)); // erst Daten, dann Zeiger: ein Abbruch hinterlässt den alten Slot intakt
  store.set(key + '.meta', JSON.stringify({ slot, n: meta.n + 1 }));
}
export function loadFrom(store, c, key = 'xphero.save') {
  const metaRaw = store.get(key + '.meta');
  let order = [0, 1];
  try { if (metaRaw) { const m = JSON.parse(metaRaw); order = [m.slot, 1 - m.slot]; } } catch { /* Zeiger defekt: beide Slots probieren */ }
  let recovered = false;
  for (const slot of order) {
    const raw = store.get(`${key}.${slot}`);
    if (!raw) continue;
    try { return { state: migrate(deserialize(raw), c), recovered }; } catch { recovered = true; }
  }
  return { state: null, recovered };
}
