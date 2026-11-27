// Stats-Pipeline, Account-XP/Level, Feature-Unlocks und tabellengetriebene Upgrade-Pfade.
import { fail, interpRows, clamp } from './util.js';
import { canAfford, pay, emit, missing, add } from './econ.js';

export const FAMILY_FEATURE = { ability: 'abilities', special: 'special', extra: 'extra', soul: 'soul', blessing: 'blessing', synergy: 'traits' };

// ---- Unlocks -------------------------------------------------------------
export function unlock(g, feature) {
  const s = g.state;
  if (s.unlocks[feature]) return false;
  s.unlocks[feature] = g.now();
  emit(g, 'unlock:' + feature);
  if (g.events) g.events.push({ type: 'unlock', feature });
  return true;
}
export function syncLevelUnlocks(g) {
  for (const u of g.c.t.unlocks) if (g.state.player.level >= u.level) unlock(g, u.feature);
}
export function need(g, feature) {
  if (!g.state.unlocks[feature]) fail('locked', `Noch nicht freigeschaltet: ${feature}`);
}

// ---- Stats ---------------------------------------------------------------
// Basiswerte, flache Boni, Prozentboni getrennt; abgeleitete Werte am Ende. atk/hp: (Basis+flat)*(1+pct/100). Übrige Stats: additive Punkte.
export function computeStats(g, opt = {}) {
  const s = g.state, c = g.c, cfg = c.cfg, heroId = opt.heroId || s.heroes.active;
  const lv = c.get('playerLevels', s.player.level);
  const flat = {}, pct = {};
  const A = (st, v) => { flat[st] = (flat[st] || 0) + v; };
  const P = (st, v) => { pct[st] = (pct[st] || 0) + v; };
  const B = (b, mult = 1) => { if (b.pct !== undefined && b.pct !== true && b.pct !== false) P(b.stat, b.pct * mult); else A(b.stat, b.v * mult); };
  const synLv = {};
  for (const u of c.t.upgradeTracks) {
    const L = Math.min(u.max, s.upgrades[u.id] || 0); // alte Spielstände können über der neuen Maximalstufe liegen
    if (!L) continue;
    const v = effAt(u, L) * u.scale;
    if (u.family === 'synergy') synLv[u.id] = v; else if (u.asPct) P(u.stat, v); else A(u.stat, v);
  }
  for (let k = 1; k < spStar(g); k++) for (const b of cfg.special.grades[k].bonus) B(b);
  const main = s.weapons.slots[0] && s.weapons.list.find((w) => w.uid === s.weapons.slots[0]);
  const mainCls = main ? c.get('weaponClasses', c.get('weapons', main.def).cls) : null;
  // Aktiver Held (nur dieser; Mehrheldenmodi übergeben heroId explizit)
  const h = c.get('heroes', heroId), hi = s.heroes.owned[heroId] || { level: 1, star: 1 };
  P('atk', h.atkPct + (hi.level - 1) * cfg.heroes.levelPct);
  P('hp', h.hpPct + (hi.level - 1) * cfg.heroes.levelPct);
  for (const row of c.t.heroStars) if (row.star <= hi.star) row.bonus.forEach((b) => B(b));
  if (mainCls && mainCls.id === h.mastery) A('dmgPct', h.masteryPct);
  // Hero Collection: accountweit, unabhängig vom aktiven Helden, genau einmal
  const starSum = {};
  for (const [id, o] of Object.entries(s.heroes.owned)) { const d = c.by.heroes.get(id); if (d) starSum[d.rarity] = (starSum[d.rarity] || 0) + o.star; }
  if (s.unlocks.heroCollection) for (const row of c.t.heroCollection) if ((starSum[row.group] || 0) >= row.need) B(row.bonus);
  // Traits (aktives Preset) + Synergien
  const slots = s.traits.presets[s.traits.active].slots, groupN = {};
  for (const sl of slots) {
    if (!sl) continue;
    const o = c.by.traitOptions.get(sl.opt), q = c.by.traitQualities.get(sl.q);
    if (!o || !q) continue;
    A(o.stat, o.base * q.mult);
    groupN[o.group] = (groupN[o.group] || 0) + 1;
  }
  for (const sy of c.t.synergies) {
    const n = groupN[sy.group] || 0;
    let best = null;
    for (const t of sy.tiers) if (n >= t.n) best = t;
    if (best) A(best.stat, best.v * (1 + (synLv[sy.track] || 0) / 100));
  }
  // Runen (Loadout des Helden)
  for (const uid of s.runes.loadouts[heroId] || []) {
    const r = uid && s.runes.list.find((x) => x.uid === uid);
    if (!r) continue;
    const d = c.get('runes', r.def);
    if (d.type === 'melee' && !(mainCls && mainCls.melee)) continue;
    if (d.type === 'ranged' && !(mainCls && !mainCls.melee)) continue;
    const ms = 1 + (Math.floor(r.level / cfg.runes.milestoneEvery) * cfg.runes.milestonePct) / 100;
    const v = (d.base + d.perLevel * (r.level - 1)) * ms;
    if (d.pct) P(d.stat, v); else A(d.stat, v);
    if (d.unique) A(d.unique.stat, d.unique.v);
  }
  // Bonus der Waffenart: nur Hauptwaffe und nur bei passender Helden-Meisterschaft. Stufen-Boni jeder ausgerüsteten Waffe ("nur Hauptslot" entsprechend).
  const pctStat = (st, v) => (st === 'atk' || st === 'hp' ? P(st, v) : A(st, v));
  if (mainCls && mainCls.id === h.mastery) for (const [st, v] of (c.by.typeBonus.get(mainCls.id) || { bonus: [] }).bonus) pctStat(st, v);
  s.weapons.slots.forEach((uid, slot) => {
    const w = uid && s.weapons.list.find((x) => x.uid === uid);
    if (!w) return;
    for (const [lv, mainOnly, st, v] of c.get('weapons', w.def).bonus || []) if (w.level >= lv && (!mainOnly || slot === 0)) pctStat(st, v);
  });
  for (const p of c.t.perks) if (p.effect === 'stat' && s.flags[p.id]) A(p.stat, p.v);
  const pl = cfg.player, caps = cfg.statCaps;
  const out = {
    atk: Math.max(1, Math.round((lv.atk + (flat.atk || 0)) * (1 + (pct.atk || 0) / 100))),
    hp: Math.max(1, Math.round((lv.hp + (flat.hp || 0)) * (1 + (pct.hp || 0) / 100))),
    cargo: Math.floor((pl.baseCargo + (flat.cargo || 0)) * (1 + (pct.cargo || 0) / 100)),
    critChance: pl.critChance + (flat.critChance || 0), critDmg: pl.critDmg + (flat.critDmg || 0),
    heroId, mainCls: mainCls ? mainCls.id : null,
  };
  for (const st of ['atkSpeedPct', 'regen', 'moveSpeedPct', 'multiHit', 'tripleHit', 'lifesteal', 'skillDmgPct', 'cooldownPct', 'goldPct', 'xpPct', 'dmgPct', 'bossDmgPct', 'dropPct', 'meleePct', 'rangedPct'])
    out[st] = flat[st] || 0;
  out.regen *= 1 + (pct.regen || 0) / 100;
  for (const [k, mx] of Object.entries(caps)) if (out[k] !== undefined) out[k] = clamp(out[k], 0, mx);
  return out;
}
export function weaponDmg(g, w) {
  const d = g.c.get('weapons', w.def);
  if (d.dmg) { const mx = g.c.get('rarities', d.rarity).maxLevel, a = (d.dmg[0] + d.dmg[1]) / 2, b = (d.dmg[2] + d.dmg[3]) / 2; return Math.round(a + ((b - a) * (Math.min(w.level, mx) - 1)) / Math.max(1, mx - 1)); }
  return Math.round((d.dpsAdd + d.perLevel * w.level) * g.c.get('rarities', d.rarity).mult);
}
export function refreshStats(g) { g.stats = computeStats(g); g.statsRev = (g.statsRev || 0) + 1; return g.stats; }

// ---- Account-XP ----------------------------------------------------------
export const xpNeed = (g, level) => g.c.get('playerLevels', level).xp;
// Vergibt XP aus einer protokollierten Quelle. Mehrere Level in einem Vorgang, Überschuss bleibt erhalten.
export function gainXp(g, amount, source) {
  const cfg = g.c.cfg.xp, p = g.state.player;
  const n = Math.floor(amount * cfg.factor * (1 + ((g.stats && g.stats.xpPct) || 0) / 100));
  if (!(n > 0)) return 0;
  p.lifetimeXp += n;
  const tot = (g.state.totals['#xp'] ||= {});
  tot[source] = (tot[source] || 0) + n;
  const max = Math.min(cfg.maxLevel, g.c.t.playerLevels.length);
  let ups = 0;
  if (p.level < max) {
    p.xp += n;
    while (p.level < max && p.xp >= xpNeed(g, p.level)) { p.xp -= xpNeed(g, p.level); p.level++; ups++; const lr = g.c.t.levelRewards.find((r) => r.level === p.level); if (lr) { for (const r of lr.reward) add(g, r.item, r.n, 'levelup', String(p.level)); if (g.events) g.events.push({ type: 'levelReward', level: p.level, reward: lr.reward }); } }
  } else if (cfg.capBehavior !== 'discard') p.xp += n;
  if (p.level >= max && cfg.capBehavior === 'discard') p.xp = 0;
  if (ups) {
    syncLevelUnlocks(g);
    refreshStats(g);
    emit(g, 'levelup', ups);
    if (g.events) g.events.push({ type: 'levelup', level: p.level });
    if (g.onLevelUp) g.onLevelUp(ups);
  }
  return n;
}

// ---- Upgrade-Pfade (Ability/Special/Extra/Soul/Blessing/Synergie) --------
export const upDef = (g, id) => g.c.get('upgradeTracks', id);
// Stützstufen der Referenz: [Stufe, Wert, Kosten des nächsten Schritts]. Zwischen zwei Stützstufen linear, außerhalb der Randwert.
function refAt(rows, L, f) {
  let a = rows[0], b = null;
  for (const r of rows) { if (r[0] <= L) a = r; else { b = r; break; } }
  if (!b || a[0] >= L) return f(a);
  return f(a) + ((f(b) - f(a)) * (L - a[0])) / (b[0] - a[0]);
}
export const effAt = (def, L) => (def.ref && !def.refCostOnly ? (L < def.ref[0][0] ? 0 : Math.round(refAt(def.ref, L, (r) => r[1])) - (def.base || 0)) : L <= 0 ? 0 : interpRows(def.rows, L, (r) => r.eff));
// Kosten für den Schritt (L-1) -> L. Währungen, die in beiden Stützzeilen stehen, linear; sonst Stufe der unteren Zeile.
export function costAt(def, L) {
  if (def.ref) { // Schritt (L-1) -> L kostet, was auf Stufe L-1 hinterlegt ist; Orbs nur genau auf einer Stützstufe
    const from = L - 1, hit = def.ref.find((r) => r[0] === from) || (from < def.ref[0][0] ? def.ref[0] : null), gold = Math.round(refAt(def.ref, from, (r) => r[2].gold || 0)), out = gold > 0 ? { gold } : {};
    if (hit) for (const [cur, v] of Object.entries(hit[2])) if (cur !== 'gold') out[cur] = v;
    return out;
  }
  let a = def.rows[0], b = null;
  for (const r of def.rows) { if (r.lv <= L) a = r; else { b = r; break; } }
  const out = {};
  for (const [cur, v] of Object.entries(a.cost)) {
    out[cur] = b && b.cost[cur] !== undefined && a.lv !== L ? Math.round(v + ((b.cost[cur] - v) * (L - a.lv)) / (b.lv - a.lv)) : v;
  }
  return out;
}
// Spezial-Pfade: Sternstufe (1..maxStar). Jeder Pfad hat je Stern ein Stufenband (bands); sind alle offenen Bänder voll, steigt der Stern.
export const spStar = (g) => Math.min(g.c.cfg.special.maxStar, g.state.player.spStar || 1);
export function spInfo(g, def) {
  const star = spStar(g), bd = (def.bands || []).find((q) => q[0] === star);
  return bd ? { star, open: true, base: bd[1], cap: bd[2], per: bd[2] - bd[1] } : { star, open: false, base: 0, cap: 0, per: 0 };
}
export function spProgress(g) {
  const cf = g.c.cfg.special, star = spStar(g);
  let cur = 0, total = 0;
  for (const u of g.c.t.upgradeTracks) if (u.family === 'special') { const i = spInfo(g, u); if (!i.open) continue; cur += Math.max(0, Math.min(i.per, (g.state.upgrades[u.id] || 0) - i.base)); total += i.per; }
  const top = star >= cf.maxStar;
  return { star, cur, total, maxStar: cf.maxStar, bonus: top ? [] : cf.grades[star].bonus, cost: top ? null : cf.grades[star - 1].cost, ready: !top && cur >= total };
}
// Sternaufstieg: alle offenen Spezial-Pfade der Stufe voll, dann gegen Gold und Orbs
export function starUp(g) {
  need(g, FAMILY_FEATURE.special);
  const p = spProgress(g);
  if (!p.cost) fail('max_level', 'Höchste Sternstufe');
  if (!p.ready) fail('star_cap', 'Erst alle Spezial-Upgrades dieser Sternstufe abschließen');
  if (!canAfford(g, p.cost)) fail('insufficient');
  pay(g, p.cost, 'upgrade:special', 'star');
  g.state.player.spStar = p.star + 1; emit(g, 'specialStar');
  if (g.events) g.events.push({ type: 'specialStar', star: p.star + 1 });
  return { star: p.star + 1 };
}
export const stepCost = (g, def, L) => costAt(def, L);
// Vorschau für n Stufen ('max' = so viele wie bezahlbar). Kauft nie teilweise mehr als bezahlbar.
export function upgradePreview(g, id, n = 1) {
  const def = upDef(g, id), from = g.state.upgrades[id] || 0, sp = def.family === 'special' ? spInfo(g, def) : null, lim = sp ? Math.min(def.max, sp.cap) : def.max;
  const want = Math.max(0, n === 'max' ? lim - from : Math.min(n, lim - from));
  const total = {}, left = { ...g.state.inv };
  let to = from;
  for (let k = 0; k < want; k++) {
    const c = stepCost(g, def, to + 1);
    let ok = true;
    for (const [cur, v] of Object.entries(c)) if ((left[cur] || 0) < v) ok = false;
    if (!ok) break;
    for (const [cur, v] of Object.entries(c)) { left[cur] = (left[cur] || 0) - v; total[cur] = (total[cur] || 0) + v; }
    to++;
  }
  const next = from < lim ? stepCost(g, def, from + 1) : null;
  return { def, from, to, max: def.max, lim, cost: total, next, missing: next ? missing(g, next) : {}, locked: !!sp && !sp.open, lvl: sp ? Math.max(0, from - sp.base) : from, lvlMax: sp ? sp.per : def.max,
    effFrom: effAt(def, from) * def.scale, effTo: effAt(def, Math.max(to, Math.min(from + 1, def.max))) * def.scale };
}
export function buyUpgrade(g, id, n = 1) {
  const def = upDef(g, id);
  need(g, FAMILY_FEATURE[def.family]);
  const pv = upgradePreview(g, id, n);
  if (pv.from >= def.max) fail('max_level', 'Maximalstufe erreicht');
  if (pv.locked) fail('locked', `Erst ab ${def.minStar} Sternen`);
  if (pv.from >= pv.lim) fail('star_cap', 'Erst alle Spezial-Upgrades dieser Sternstufe abschließen');
  if (pv.to === pv.from) fail('insufficient', 'Nicht genug Ressourcen');
  if (!canAfford(g, pv.cost)) fail('insufficient');
  pay(g, pv.cost, `upgrade:${def.family}`, id);
  g.state.upgrades[id] = pv.to;
  emit(g, `upgrade:${id}`, pv.to - pv.from);
  emit(g, `upgrade:${def.family}`, pv.to - pv.from);
  return pv;
}
