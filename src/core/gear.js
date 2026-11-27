// Waffen, Schmiede, Gacha, Helden, Traits, Runen. Alle Funktionen prüfen zuerst vollständig und buchen dann.
import { fail, pickWeighted, interpRows } from './util.js';
import { bal, add, pay, canAfford, give, grant, resolve, emit, check } from './econ.js';
import { need } from './progress.js';

// ============================================================ Waffen
export const wInst = (g, uid) => g.state.weapons.list.find((w) => w.uid === uid) || fail('no_weapon', 'Waffe nicht gefunden');
export const wDef = (g, w) => g.c.get('weapons', w.def);
export const isEquipped = (g, uid) => g.state.weapons.slots.includes(uid);

export function addWeapon(g, defId, source = 'grant') {
  g.c.get('weapons', defId);
  const ws = g.state.weapons, w = { uid: 'w' + ++ws.seq, def: defId, level: 1, lock: false };
  ws.list.push(w);
  emit(g, 'weapon:get');
  return w;
}
export function equipWeapon(g, uid, slot) {
  const ws = g.state.weapons;
  wInst(g, uid);
  if (!(slot >= 0 && slot < ws.unlocked)) fail('slot_locked', 'Slot nicht freigeschaltet');
  const cur = ws.slots.indexOf(uid);
  if (cur === slot) return;
  const other = ws.slots[slot];
  if (cur >= 0) ws.slots[cur] = other; // tauschen statt duplizieren
  ws.slots[slot] = uid;
  emit(g, 'equip:weapon');
  if (slot > 0) emit(g, 'equip:sub');
}
export function unequipWeapon(g, slot) { g.state.weapons.slots[slot] = null; }
export function toggleWeaponLock(g, uid) { const w = wInst(g, uid); w.lock = !w.lock; return w.lock; }

export function weaponLevelCost(g, w, toLevel) {
  const rows = g.c.cfg.weaponLevelCost.gold, L = Math.max(1, toLevel - 1);
  let a = rows[0], b = null;
  for (const r of rows) { if (r[0] <= L) a = r; else { b = r; break; } }
  return { weapon_scroll: 2 * L - 1, gold: !b || a[0] === L ? a[1] : Math.round(a[1] + ((b[1] - a[1]) * (L - a[0])) / (b[0] - a[0])) };
}
export function weaponLevelUp(g, uid, n = 1) {
  need(g, 'weaponVault');
  const w = wInst(g, uid), max = g.c.get('rarities', wDef(g, w).rarity).maxLevel;
  if (w.level >= max) fail('max_level', 'Maximalstufe erreicht');
  const total = {}, left = { ...g.state.inv };
  let to = w.level;
  for (let k = 0; k < (n === 'max' ? max : n) && to < max; k++) {
    const c = weaponLevelCost(g, w, to + 1);
    if (Object.entries(c).some(([i, v]) => (left[i] || 0) < v)) break;
    for (const [i, v] of Object.entries(c)) { left[i] -= v; total[i] = (total[i] || 0) + v; }
    to++;
  }
  if (to === w.level) fail('insufficient', 'Nicht genug Ressourcen');
  pay(g, total, 'weapon:level', uid);
  w.level = to;
  emit(g, 'weapon:level', 1);
  return w;
}
// Verschmelzen: Basiswaffe + (mergeCount-1) Duplikate -> nächste Seltenheit. Ausgerüstete/gesperrte Duplikate werden nie verbraucht.
export function mergePreview(g, uid) {
  const w = wInst(g, uid), d = wDef(g, w);
  if (!d.next) return { ok: false, reason: 'Endstufe der Reihe', d };
  const fodder = g.state.weapons.list.filter((x) => x.def === w.def && x.uid !== uid && !x.lock && !isEquipped(g, x.uid)).slice(0, d.mergeCount - 1);
  const enough = fodder.length >= d.mergeCount - 1, afford = canAfford(g, d.evoCost);
  return { ok: enough && afford, reason: !enough ? `Benötigt ${d.mergeCount}x gleiche Waffe (frei, ungesperrt)` : !afford ? 'Materialien fehlen' : '', d, next: g.c.get('weapons', d.next), fodder, cost: d.evoCost };
}
export function mergeWeapon(g, uid) {
  need(g, 'weaponVault');
  const pv = mergePreview(g, uid);
  if (!pv.ok) fail('cannot_merge', pv.reason);
  pay(g, pv.cost, 'weapon:merge', uid);
  const w = wInst(g, uid), ids = new Set(pv.fodder.map((x) => x.uid));
  w.level = Math.max(w.level, ...pv.fodder.map((x) => x.level)); // nie ein Downgrade
  w.def = pv.d.next;
  g.state.weapons.list = g.state.weapons.list.filter((x) => !ids.has(x.uid));
  emit(g, 'weapon:merge');
  return w;
}
export function mergeAll(g) {
  need(g, 'weaponVault');
  let n = 0, again = true;
  while (again && n < 500) {
    again = false;
    const by = {};
    for (const w of g.state.weapons.list) if (!w.lock && !isEquipped(g, w.uid)) (by[w.def] ||= []).push(w);
    for (const list of Object.values(by)) {
      const d = g.c.get('weapons', list[0].def);
      if (!d.next || list.length < d.mergeCount || !canAfford(g, d.evoCost)) continue;
      list.sort((a, b) => b.level - a.level);
      mergeWeapon(g, list[0].uid); n++; again = true;
      break;
    }
  }
  return n;
}
export function nextWeaponSlot(g) { return g.c.cfg.weaponSlots.find((r) => r.slot === g.state.weapons.unlocked + 1) || null; }
export function unlockWeaponSlot(g) {
  const r = nextWeaponSlot(g) || fail('max_level', 'Alle Slots frei');
  if (r.quest) fail('locked', 'Wird per Quest freigeschaltet');
  if (g.state.player.level < r.level) fail('locked', `Benötigt Level ${r.level}`);
  pay(g, r.cost, 'weapon:slot', String(r.slot));
  g.state.weapons.unlocked = r.slot;
}

// ---- Schmiede
export function smithyTier(g) { return (g.state.buildings.smithy || {}).level || 0; }
export function craft(g, n = 1) {
  need(g, 'craft');
  const tier = smithyTier(g) || fail('locked', 'Smithy fehlt');
  const row = g.c.get('smithy', tier), crystal = g.c.cfg.craftCost[tier - 1];
  if (!(n >= 1 && n <= 100)) fail('bad_amount');
  pay(g, { crystal }, 'craft', '', n);
  const rows = [...row.rates.map((r) => ({ w: r.w, rarity: r.rarity })), { w: row.otherW, other: true }], out = [];
  for (let k = 0; k < n; k++) {
    const r = pickWeighted(g.state.rng, 'craft', rows);
    if (r.other) out.push(...give(g, [pickWeighted(g.state.rng, 'craft', row.other)], 'craft:other', '', 'craft'));
    else out.push(...grant(g, resolve(g, [{ weaponPool: { series: 'n', rarity: r.rarity } }], 'craft'), 'craft'));
  }
  g.state.player.crafts = (g.state.player.crafts || 0) + n;
  emit(g, 'craft', n);
  return out;
}

// ============================================================ Gacha
export const boxDef = (g, id) => g.c.get('gachaBoxes', id);
export function boxState(g, id) { return (g.state.gacha[id] ||= { opens: 0, pity: 0, ms: 0 }); }
// k-ter Meilenstein (0-basiert) als absolute Öffnungszahl; null wenn ausgeschöpft.
export function milestoneAt(box, k) {
  const m = box.milestones;
  if (!m) return null;
  if (k < m.first.length) return m.first[k];
  const j = k - m.first.length, rep = Math.floor(j / m.cycle.length);
  if (rep >= m.repeats) return null;
  return m.first[m.first.length - 1] + rep * m.cycle[m.cycle.length - 1] + m.cycle[j % m.cycle.length];
}
// Wählt die erste Kostenoption (konfigurierte Priorität), die n Öffnungen vollständig deckt.
export function boxCost(g, id, n) {
  const box = boxDef(g, id);
  return box.costs.find((c) => canAfford(g, c, n)) || null;
}
export function openBox(g, id, n = 1) {
  const box = boxDef(g, id);
  if (box.unlock && !check(g, box.unlock)) fail('locked', 'Noch nicht freigeschaltet');
  if (!box.multi.includes(n)) fail('bad_amount', 'Ungültige Anzahl');
  const cost = boxCost(g, id, n) || fail('insufficient', 'Nicht genug Schlüssel/Gems');
  pay(g, cost, `gacha:${id}`, '', n);
  const st = boxState(g, id), rate = g.c.get('rateGroups', box.rate), results = [];
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < box.per; j++) {
      let row;
      st.pity++;
      if (box.pity && st.pity >= box.pity.n) { row = pickWeighted(g.state.rng, 'gacha', g.c.get('rateGroups', box.pity.rate).rows); st.pity = 0; } else {
        row = pickWeighted(g.state.rng, 'gacha', rate.rows);
        if (box.pity && row === rate.rows[rate.rows.length - 1]) st.pity = 0;
      }
      let entry = row;
      if (row.rune && box.typePool) entry = { rune: { ...row.rune, type: pickWeighted(g.state.rng, 'gacha', box.typePool).type } };
      results.push(...grant(g, resolve(g, [entry], 'gacha'), `gacha:${id}`));
    }
    st.opens++;
    for (let t = milestoneAt(box, st.ms); t != null && st.opens >= t; t = milestoneAt(box, st.ms)) {
      results.push(...give(g, box.milestones.reward, `gacha:${id}:milestone`, String(t)).map((e) => ({ ...e, milestone: t })));
      st.ms++;
    }
  }
  emit(g, `gacha:${id}`, n); emit(g, 'gacha:any', n);
  return results;
}

// ============================================================ Helden
export const hDef = (g, id) => g.c.get('heroes', id);
export function grantHero(g, id, source) {
  const d = hDef(g, id), o = g.state.heroes.owned;
  if (o[id]) add(g, `piece:${id}`, Math.ceil(d.unlockPieces / 2), source, 'dup'); else o[id] = { level: 1, star: 1 };
}
export function unlockHero(g, id) {
  const d = hDef(g, id);
  if (g.state.heroes.owned[id]) fail('already', 'Bereits freigeschaltet');
  pay(g, { [`piece:${id}`]: d.unlockPieces }, 'hero:unlock', id);
  g.state.heroes.owned[id] = { level: 1, star: 1 };
  emit(g, 'hero:unlock');
}
export function setActiveHero(g, id) {
  if (!g.state.heroes.owned[id]) fail('locked', 'Held nicht freigeschaltet');
  g.state.heroes.active = id;
}
export function heroLevelCost(g, id, toLevel) {
  return interpRows(g.c.get('heroLevelCosts', hDef(g, id).tier).rows, toLevel, (r) => r.cost.evo_coin);
}
export function heroLevelUp(g, id, n = 1) {
  need(g, 'heroes');
  const o = g.state.heroes.owned[id] || fail('locked', 'Held nicht freigeschaltet');
  let to = o.level, total = 0;
  for (let k = 0; k < n && to < 130; k++) { const c = heroLevelCost(g, id, to + 1); if (total + c > bal(g, 'evo_coin')) break; total += c; to++; }
  if (to === o.level) fail(o.level >= 130 ? 'max_level' : 'insufficient', o.level >= 130 ? 'Maximalstufe' : 'Nicht genug Evolution Coins');
  pay(g, { evo_coin: total }, 'hero:level', id);
  emit(g, 'heroLevel', to - o.level);
  o.level = to;
}
export function heroStarInfo(g, id) {
  const d = hDef(g, id), o = g.state.heroes.owned[id];
  if (!d.evolvable) return { available: false, reason: 'Keine Evolution in diesem Datenstand verfügbar' };
  if (!o) return { available: false, reason: 'Nicht freigeschaltet' };
  const row = g.c.by.heroStars.get(o.star + 1);
  if (!row) return { available: false, reason: 'Maximale Sterne' };
  return { available: true, row, cost: { [`piece:${id}`]: row.pieces * d.tier, evo_coin: row.coins * d.tier } };
}
export function heroStarUp(g, id) {
  need(g, 'heroEvolution');
  const info = heroStarInfo(g, id);
  if (!info.available) fail('unavailable', info.reason);
  pay(g, info.cost, 'hero:star', id);
  g.state.heroes.owned[id].star++;
  emit(g, 'heroStar');
}
export function useSelectTicket(g, heroId) {
  hDef(g, heroId);
  pay(g, { hero_select_ticket: 1 }, 'hero:select', heroId);
  add(g, `piece:${heroId}`, g.c.cfg.heroes.selectTicketPieces, 'hero:select', heroId);
}
export function setRaidTeam(g, ids) {
  const max = g.c.cfg.heroes.raidTeam, uniq = [...new Set(ids)];
  if (!uniq.length || uniq.length > max || uniq.some((id) => !g.state.heroes.owned[id])) fail('bad_team', 'Ungültiges Team');
  g.state.heroes.raidTeam = uniq;
}

// ============================================================ Traits
export function traitRollCost(g) {
  const cfg = g.c.cfg.traits, pr = g.state.traits.presets[g.state.traits.active];
  const locks = pr.slots.filter((s) => s && s.lock).length, out = {};
  for (const [i, v] of Object.entries(cfg.rerollCost)) out[i] = Math.ceil(v * (1 + locks * cfg.lockSurcharge));
  return { cost: out, locks, free: pr.slots.length - locks };
}
export function rollTraits(g) {
  need(g, 'traits');
  const { cost, free } = traitRollCost(g), pr = g.state.traits.presets[g.state.traits.active];
  if (free <= 0) fail('all_locked', 'Alle Slots gesperrt');
  pay(g, cost, 'trait:roll');
  pr.slots = pr.slots.map((sl) => (sl && sl.lock ? sl
    : { opt: pickWeighted(g.state.rng, 'trait', g.c.t.traitOptions).id, q: pickWeighted(g.state.rng, 'trait', g.c.t.traitQualities).id, lock: false }));
  emit(g, 'traitRoll');
  return pr.slots;
}
export function toggleTraitLock(g, idx) {
  const sl = g.state.traits.presets[g.state.traits.active].slots[idx] || fail('empty', 'Slot leer');
  sl.lock = !sl.lock;
}
export function setTraitPreset(g, idx) {
  if (!(idx >= 0 && idx < g.state.traits.presets.length)) fail('bad_preset');
  g.state.traits.active = idx; // Stats werden aus dem Zustand abgeleitet -> kein Mehrfacheffekt durch Umschalten
}

// ============================================================ Runen
export const rInst = (g, uid) => g.state.runes.list.find((r) => r.uid === uid) || fail('no_rune', 'Rune nicht gefunden');
export function addRune(g, defId) {
  g.c.get('runes', defId);
  const rs = g.state.runes, r = { uid: 'r' + ++rs.seq, def: defId, level: 1, lock: false, dust: 0 };
  rs.list.push(r);
  return r;
}
export function runeSlots(g) { return g.c.cfg.runes.slotLevels.filter((lv) => g.state.player.level >= lv).length; }
export function runeEquippedBy(g, uid) { return Object.entries(g.state.runes.loadouts).filter(([, l]) => l.includes(uid)).map(([h]) => h); }
export function equipRune(g, uid, slot, heroId = g.state.heroes.active) {
  need(g, 'runes'); rInst(g, uid);
  if (!(slot >= 0 && slot < runeSlots(g))) fail('slot_locked', 'Runenslot nicht freigeschaltet');
  const lo = (g.state.runes.loadouts[heroId] ||= Array(g.c.cfg.runes.slots).fill(null));
  const cur = lo.indexOf(uid);
  if (cur >= 0) lo[cur] = lo[slot];
  lo[slot] = uid;
}
export function unequipRune(g, slot, heroId = g.state.heroes.active) { const lo = g.state.runes.loadouts[heroId]; if (lo) lo[slot] = null; }
export function runeLevelCost(g, r, toLevel) {
  const gr = g.c.get('runeGrades', g.c.get('runes', r.def).rarity), c = { rune_dust: gr.dustPerLevel * toLevel };
  if (toLevel % 10 === 0) c.bluestone = gr.bluestoneEvery10;
  return c;
}
export function runeLevelUp(g, uid, n = 1) {
  need(g, 'runes');
  const r = rInst(g, uid), max = g.c.get('runeGrades', g.c.get('runes', r.def).rarity).maxLevel;
  let done = 0;
  for (; done < n && r.level < max; done++) {
    const c = runeLevelCost(g, r, r.level + 1);
    if (!canAfford(g, c)) break;
    pay(g, c, 'rune:level', uid);
    r.dust += c.rune_dust; r.level++;
  }
  if (!done) fail(r.level >= max ? 'max_level' : 'insufficient', r.level >= max ? 'Maximalstufe' : 'Nicht genug Rune Dust/BlueStone');
  return r;
}
export function toggleRuneLock(g, uid) { const r = rInst(g, uid); r.lock = !r.lock; }
export function dismantleRefund(g, r) {
  const gr = g.c.get('runeGrades', g.c.get('runes', r.def).rarity);
  return gr.dismantleDust + Math.floor((r.dust * g.c.cfg.runes.dismantleRefundPct) / 100);
}
// Ausgerüstete/gesperrte Runen nur mit ausdrücklicher Bestätigung (confirm=true).
export function dismantleRunes(g, uids, confirm = false) {
  need(g, 'runes');
  const list = uids.map((u) => rInst(g, u));
  const risky = list.filter((r) => r.lock || runeEquippedBy(g, r.uid).length);
  if (risky.length && !confirm) fail('needs_confirm', `${risky.length} ausgerüstete/gesperrte Rune(n) – Bestätigung nötig`);
  let dust = 0;
  for (const r of list) dust += dismantleRefund(g, r);
  const ids = new Set(uids);
  for (const lo of Object.values(g.state.runes.loadouts)) lo.forEach((u, k) => { if (ids.has(u)) lo[k] = null; });
  g.state.runes.list = g.state.runes.list.filter((r) => !ids.has(r.uid));
  add(g, 'rune_dust', dust, 'rune:dismantle');
  return dust;
}
