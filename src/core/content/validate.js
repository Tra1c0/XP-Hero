// Content-Index, Schema-/Referenzvalidierung und Fingerprint. Wird von Client, Server und Admin-Panel gemeinsam genutzt.
import { hash53, stable } from '../util.js';
import { SCHEMA, STATS } from './base.js';
import { buildGrid, snap, walkable } from '../worldgrid.js';

const KEYS = ['id', 'feature', 'floor', 'tier', 'star', 'idx', 'level', 'rarity'];
const rowKey = (r) => { for (const k of KEYS) if (r[k] !== undefined) return r[k]; return undefined; };

export function indexContent(pack) {
  const by = {};
  for (const [t, rows] of Object.entries(pack.tables)) {
    by[t] = new Map();
    for (const r of rows) by[t].set(rowKey(r), r);
  }
  return {
    pack, cfg: pack.config, t: pack.tables, by, version: pack.version,
    get(t, id) { const r = by[t] && by[t].get(id); if (!r) throw new Error(`content: ${t}/${id} fehlt`); return r; },
    has(t, id) { return !!(by[t] && by[t].has(id)); },
  };
}

export const fingerprint = (pack) => hash53(stable({ t: pack.tables, c: pack.config, s: pack.schema }));

const COST_KEYS = new Set(['cost', 'price', 'upgradeCost', 'evoCost', 'entryCost', 'refreshCost', 'rerollCost', 'spinCost']);
const REQUIRED = ['items', 'areas', 'variants', 'spawnGroups', 'behaviors', 'playerLevels', 'upgradeTracks', 'weapons', 'weaponClasses', 'rarities', 'skills', 'smithy',
  'heroes', 'gachaBoxes', 'rateGroups', 'buildings', 'quests', 'tracks', 'shop', 'towerFloors', 'chestTypes', 'keyHouseSlots'];

// Liefert Liste von Fehlern (leer = gültig). Wird vor jeder Aktivierung/Veröffentlichung ausgeführt.
export function validateContent(pack) {
  const err = [];
  const E = (m) => { if (err.length < 200) err.push(m); };
  if (!pack || typeof pack !== 'object') return ['Paket fehlt'];
  if (pack.schema !== SCHEMA) E(`Schema ${pack.schema} != ${SCHEMA}`);
  if (!pack.tables || !pack.config) return [...err, 'tables/config fehlen'];
  for (const t of REQUIRED) if (!Array.isArray(pack.tables[t]) || !pack.tables[t].length) E(`Tabelle ${t} fehlt oder leer`);
  if (err.length) return err;
  const T = pack.tables;
  const ids = {};
  for (const [t, rows] of Object.entries(T)) {
    if (!Array.isArray(rows)) { E(`${t}: keine Liste`); continue; }
    ids[t] = new Set();
    for (const r of rows) {
      const k = rowKey(r);
      if (k === undefined) { E(`${t}: Zeile ohne Schlüssel`); continue; }
      if (ids[t].has(k)) E(`${t}: doppelte ID ${k}`);
      ids[t].add(k);
    }
  }
  const heroIds = ids.heroes;
  const isItem = (i) => ids.items.has(i) || (typeof i === 'string' && i.startsWith('piece:') && heroIds.has(i.slice(6)));
  const checkCost = (where, c) => {
    if (c == null) return;
    if (typeof c !== 'object' || Array.isArray(c)) return E(`${where}: Kosten kein Objekt`);
    for (const [i, n] of Object.entries(c)) {
      if (!isItem(i)) E(`${where}: unbekanntes Item ${i}`);
      if (!Number.isInteger(n) || n < 0) E(`${where}: Kosten ${i}=${n} ungültig (ganzzahlig, >= 0)`);
    }
  };
  const checkEntry = (where, e) => {
    if (e.item !== undefined) {
      if (!isItem(e.item)) E(`${where}: unbekanntes Item ${e.item}`);
      const lo = e.n ?? e.min, hi = e.n ?? e.max;
      if ((lo !== undefined || hi !== undefined) && (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi < lo)) E(`${where}: Menge ungültig`);
    }
    if (e.w !== undefined && !(e.w >= 0)) E(`${where}: Gewicht negativ`);
    if (e.chance !== undefined && !(e.chance >= 0 && e.chance <= 1)) E(`${where}: chance außerhalb 0..1`);
    if (e.weapon && !ids.weapons.has(e.weapon)) E(`${where}: Waffe ${e.weapon} fehlt`);
    if (e.hero && !heroIds.has(e.hero)) E(`${where}: Held ${e.hero} fehlt`);
    if (e.stat !== undefined && !STATS.includes(e.stat)) E(`${where}: unbekannter Stat/Option-Code ${e.stat}`);
  };
  // Generischer Walk: Kostenfelder, Reward-Einträge, Stat-Codes
  const walk = (where, o) => {
    if (Array.isArray(o)) { o.forEach((x, k) => walk(`${where}[${k}]`, x)); return; }
    if (!o || typeof o !== 'object') return;
    if (o.item !== undefined || o.w !== undefined || o.stat !== undefined || o.weapon || o.hero) checkEntry(where, o);
    for (const [k, v] of Object.entries(o)) {
      if (COST_KEYS.has(k)) { if (Array.isArray(v)) v.forEach((c) => checkCost(`${where}.${k}`, c)); else checkCost(`${where}.${k}`, v); } else if (k === 'costs') v.forEach((c) => checkCost(`${where}.costs`, c));
      else walk(`${where}.${k}`, v);
    }
  };
  for (const [t, rows] of Object.entries(T)) rows.forEach((r) => walk(`${t}/${rowKey(r)}`, r));
  walk('config', pack.config);
  // Referenzen
  for (const g of [...T.spawnGroups, ...(T.resourceGroups || [])]) {
    if (!ids.variants.has(g.v)) E(`spawnGroup ${g.id}: Variante ${g.v} fehlt`);
    if (!ids.areas.has(g.area)) E(`spawnGroup ${g.id}: Gebiet ${g.area} fehlt`);
    if (!(g.count > 0)) E(`spawnGroup ${g.id}: count`);
  }
  for (const v of T.variants) {
    if (!ids.behaviors.has(v.beh)) E(`variant ${v.id}: Verhalten ${v.beh} fehlt`);
    if (!(v.hp > 0) || v.atk < 0) E(`variant ${v.id}: hp/atk ungültig`);
  }
  for (const a of T.areas) {
    if (!ids.variants.has(a.boss)) E(`area ${a.id}: Boss fehlt`);
    if (a.next && !ids.areas.has(a.next)) E(`area ${a.id}: next ${a.next} fehlt`);
  }
  for (const w of T.weapons) {
    if (!ids.weaponClasses.has(w.cls)) E(`weapon ${w.id}: Klasse`);
    if (w.next && !ids.weapons.has(w.next)) E(`weapon ${w.id}: next fehlt`);
    if (w.skill && !ids.skills.has(w.skill)) E(`weapon ${w.id}: Skill fehlt`);
  }
  for (const b of T.gachaBoxes) if (!ids.rateGroups.has(b.rate)) E(`gacha ${b.id}: Rate-Gruppe ${b.rate} fehlt`);
  for (const u of T.upgradeTracks) {
    if (!STATS.includes(u.stat)) E(`upgrade ${u.id}: Stat ${u.stat}`);
    if (!u.rows.length || u.rows[0].lv !== 1 || u.rows[u.rows.length - 1].lv !== u.max) E(`upgrade ${u.id}: Stützzeilen müssen bei 1 beginnen und bei max enden`);
    for (let k = 1; k < u.rows.length; k++) if (u.rows[k].lv <= u.rows[k - 1].lv) E(`upgrade ${u.id}: Zeilen nicht aufsteigend`);
  }
  for (let k = 0; k < T.playerLevels.length; k++) {
    const r = T.playerLevels[k];
    if (r.level !== k + 1 || !(r.xp > 0) || !Number.isInteger(r.xp)) E(`playerLevels: Zeile ${k + 1} ungültig`);
  }
  // Questgraph: Referenzen, Zyklen, Erreichbarkeit
  const qById = new Map(T.quests.map((q) => [q.id, q]));
  for (const q of T.quests) for (const p of q.prereq || []) if (!qById.has(p)) E(`quest ${q.id}: prereq ${p} fehlt`);
  const state = new Map();
  const visit = (id) => {
    if (state.get(id) === 2) return true;
    if (state.get(id) === 1) { E(`quest ${id}: Zyklus`); return false; }
    state.set(id, 1);
    for (const p of qById.get(id).prereq || []) if (qById.has(p)) visit(p);
    state.set(id, 2);
    return true;
  };
  T.quests.forEach((q) => visit(q.id));
  const trackIds = new Set();
  for (const tr of T.tracks) {
    if (trackIds.has(tr.id)) E(`track ${tr.id} doppelt`);
    trackIds.add(tr.id);
    const n = new Set();
    for (const nd of tr.nodes) { if (n.has(nd.id)) E(`track ${tr.id}: Knoten ${nd.id} doppelt`); n.add(nd.id); if (!nd.cond) E(`track ${tr.id}/${nd.id}: cond fehlt`); }
  }
  for (const s of T.shop) if (s.limit < 0) E(`shop ${s.id}: limit`);
  for (const ev of T.events || []) if (!(Date.parse(ev.start) < Date.parse(ev.end))) E(`event ${ev.id}: Zeitfenster ungültig`);
  // Welten: Geometrie gültig, alle Weltpositionen begehbar (max. 6 m Abstand), Tore verweisen auf echte Zonen/Gebiete
  for (const w of T.worlds || []) {
    if (!w.bounds || !(w.cell > 0) || !(w.ppm > 0) || !Array.isArray(w.zones)) { E(`world ${w.id}: bounds/cell/ppm/zones fehlen`); continue; }
    const zids = new Set();
    for (const z of w.zones) { zids.add(z.id); if (!Array.isArray(z.poly) || z.poly.length < 3) E(`world ${w.id}: Zone ${z.id} braucht ein Polygon`); if (z.id !== 'base' && !ids.areas.has(z.id)) E(`world ${w.id}: Zone ${z.id} ist kein Gebiet`); }
    for (const gt of w.gates || []) { if (!zids.has(gt.from) || !zids.has(gt.to)) E(`world ${w.id}: Tor ${gt.id} verbindet unbekannte Zonen`); if (gt.needs && !ids.areas.has(gt.needs)) E(`world ${w.id}: Tor ${gt.id} needs ${gt.needs} unbekannt`); if (!(gt.w > 0)) E(`world ${w.id}: Tor ${gt.id} Breite`); }
    let G;
    try { G = buildGrid(w); } catch (e) { E(`world ${w.id}: Raster nicht baubar (${e.message})`); continue; }
    G.gateOpen.fill(1);
    for (const [a, p] of Object.entries(w.entries || {})) { const q = G.toPx(p[0], p[1]); if (!walkable(G, q.x, q.y)) E(`world ${w.id}: Einstieg ${a} nicht begehbar`); }
    for (const t of ['spawnGroups', 'resourceGroups', 'chestSpawners', 'giftSpawners', 'areaChests', 'npcs', 'buildings', 'worldObjects']) for (const r of T[t] || []) {
      if (!r.pos) continue;
      if (!Array.isArray(r.pos) || r.pos.length !== 2 || !r.pos.every(Number.isFinite)) { E(`${t}/${rowKey(r)}: pos ungültig`); continue; }
      const q = G.toPx(r.pos[0], r.pos[1]), s = snap(G, q.x, q.y, 3);
      if (!s) E(`${t}/${rowKey(r)}: Position ${r.pos} liegt nicht in begehbarem Gelände`);
    }
  }
  return err;
}
