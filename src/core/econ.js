// Wirtschaftskern: Wallet + Ledger, Rewards, Bedingungen, Zähler, Tages-/Wochenreset, Claim-Tracks.
// g = Spielkontext { state, c (Content-Index), now() }.
import { MAXI, fail, rnd, rndInt, pickWeighted, utcDay, utcWeek, DAY_MS } from './util.js';

export const bal = (g, item) => g.state.inv[item] || 0;

function knownItem(g, item) {
  return g.c.has('items', item) || (item.startsWith('piece:') && g.c.has('heroes', item.slice(6)));
}

// Einziger Schreibweg für Währungen/Stapelitems. Jede Buchung landet im Ledger und in den Quell-Summen.
export function add(g, item, delta, source, ref = '') {
  if (!Number.isInteger(delta)) fail('bad_amount', `Menge ${delta} nicht ganzzahlig`);
  if (!knownItem(g, item)) fail('bad_item', `Unbekanntes Item ${item}`);
  if (delta === 0) return;
  const s = g.state, cur = s.inv[item] || 0;
  let nv = cur + delta;
  if (nv < 0) fail('insufficient', `Zu wenig ${item}`);
  if (nv > MAXI) nv = MAXI;
  s.inv[item] = nv;
  s.ledger.push({ id: ++s.txSeq, t: g.now(), item, d: nv - cur, src: source, ref, ev: g.c.version });
  const keep = g.c.cfg.ledgerKeep || 400;
  if (s.ledger.length > keep * 1.5) s.ledger.splice(0, s.ledger.length - keep);
  const tot = (s.totals[item] ||= {});
  tot[source] = (tot[source] || 0) + (nv - cur);
}

export function canAfford(g, cost, times = 1) {
  for (const [i, n] of Object.entries(cost || {})) if (bal(g, i) < n * times) return false;
  return true;
}
export function missing(g, cost, times = 1) {
  const m = {};
  for (const [i, n] of Object.entries(cost || {})) if (bal(g, i) < n * times) m[i] = n * times - bal(g, i);
  return m;
}
// Atomar: erst alles prüfen, dann buchen.
export function pay(g, cost, source, ref = '', times = 1) {
  if (!canAfford(g, cost, times)) fail('insufficient', 'Nicht genug Ressourcen');
  for (const [i, n] of Object.entries(cost || {})) add(g, i, -n * times, source, ref);
}

// ---- Rewards -------------------------------------------------------------
// Löst eine Reward-Spezifikation in konkrete Einträge auf (RNG nur hier), ohne zu buchen.
// Gold eines normalen Gegners im weitesten offenen Gebiet: Maß für Goldmengen, die mit dem Fortschritt mitwachsen (Tauschangebote, Pakete).
export function stageGold(g) {
  let best = 1;
  for (const a of g.c.t.areas) {
    if (!(a.prev === 'base' || g.state.world.cleared[a.prev])) continue;
    for (const sg of g.c.t.spawnGroups) if (sg.area === a.id) { const v = g.c.by.variants.get(sg.v); if (v && v.rank === 'normal' && v.gold > best) best = v.gold; }
  }
  return best;
}
export function resolve(g, spec, stream = 'loot', mult = 1) {
  const out = [];
  for (const e of spec || []) {
    if (e.item !== undefined) {
      const n = e.n !== undefined ? e.n : rndInt(g.state.rng, stream, e.min, e.max);
      out.push({ item: e.item, n: n * mult });
    } else if (e.goldKills !== undefined) {
      out.push({ item: 'gold', n: Math.round(e.goldKills * stageGold(g)) * mult });
    } else if (e.alias !== undefined) {
      const it = g.c.cfg.orbAlias[e.alias];
      if (it) out.push({ item: it, n: rndInt(g.state.rng, stream, e.min, e.max) * mult });
    } else if (e.weaponPool) {
      const cands = g.c.t.weapons.filter((w) => w.series === e.weaponPool.series && w.rarity === e.weaponPool.rarity && (!e.weaponPool.cls || w.cls === e.weaponPool.cls));
      if (cands.length) out.push({ weapon: cands[Math.floor(rnd(g.state.rng, stream) * cands.length)].id });
    } else if (e.heroPieces) {
      const pool = g.c.t.heroes.filter((h) => e.heroPieces.rarity === 'any' || h.rarity === e.heroPieces.rarity);
      if (pool.length) out.push({ item: `piece:${pool[Math.floor(rnd(g.state.rng, stream) * pool.length)].id}`, n: e.heroPieces.n * mult });
    } else if (e.rune) {
      const pool = g.c.t.runes.filter((r) => r.rarity === e.rune.rarity && (!e.rune.type || r.type === e.rune.type));
      if (pool.length) out.push({ rune: pool[Math.floor(rnd(g.state.rng, stream) * pool.length)].id });
    } else out.push({ ...e }); // weapon, hero, flag, points, xp: unverändert
  }
  return out;
}

// Bucht bereits aufgelöste Einträge. hooks: weitere Systeme (Waffen/Runen/Helden/XP) registrieren sich in g.grantHooks.
export function grant(g, entries, source, ref = '') {
  for (const e of entries) {
    if (e.item !== undefined) add(g, e.item, e.n, source, ref);
    else if (e.flag) g.state.flags[e.flag] = true;
    else if (e.points) emit(g, e.points, e.n);
    else if (e.weapon) g.grantHooks.weapon(e.weapon, source);
    else if (e.rune) g.grantHooks.rune(e.rune, source);
    else if (e.hero) g.grantHooks.hero(e.hero, source);
    else if (e.xp) g.grantHooks.xp(e.xp, source);
  }
  return entries;
}
export const give = (g, spec, source, ref = '', stream = 'loot', mult = 1) => grant(g, resolve(g, spec, stream, mult), source, ref);

// Einmal-Claims: persistente Claim-ID verhindert Doppelgutschrift (auch nach Neustart/Retry).
export function claimOnce(g, claimId, fn) {
  if (g.state.claims[claimId]) fail('already_claimed', 'Bereits abgeholt');
  g.state.claims[claimId] = g.now();
  return fn();
}

// ---- Zähler & Perioden ---------------------------------------------------
export function emit(g, key, n = 1) {
  const s = g.state;
  s.counters[key] = (s.counters[key] || 0) + n;
  s.period.daily.c[key] = (s.period.daily.c[key] || 0) + n;
  s.period.weekly.c[key] = (s.period.weekly.c[key] || 0) + n;
  g.dirty = true;
}

// Tages-/Wochenwechsel nach UTC. Monoton: eine zurückgestellte Systemuhr löst keinen erneuten Reset/Claim aus.
export function tickPeriods(g) {
  const s = g.state, now = g.now(), day = utcDay(now), week = utcWeek(now);
  let changed = false;
  if (day > s.period.day) {
    s.period.day = day;
    s.period.daily = { c: {}, claims: {}, caps: {} };
    changed = true;
    emit(g, 'login', 1);
    const dt = g.c.cfg.dailyTickets, perk = g.state.flags.perk_tickets ? g.c.get('perks', 'perk_tickets') : null;
    for (const [item, n] of Object.entries(dt)) {
      const target = n + (perk && perk.items.includes(item) ? perk.v : 0);
      if (bal(g, item) < target) add(g, item, target - bal(g, item), 'daily_tickets');
    }
    // Login-Zyklus: nach vollständigem Abholen neu beginnen
    const lt = s.tracks.login, ldef = g.c.by.tracks.get('login');
    if (lt && ldef && ldef.nodes.every((n) => lt.claimed[n.id])) delete s.tracks.login;
    if (g.onNewDay) g.onNewDay(day);
  }
  if (week > s.period.week) { s.period.week = week; s.period.weekly = { c: {}, claims: {}, caps: {} }; changed = true; if (g.onNewWeek) g.onNewWeek(week); }
  return changed;
}

export function capLeft(g, key) {
  const max = g.c.cfg.caps[key];
  return max == null ? Infinity : max - (g.state.period.daily.caps[key] || 0);
}
export function useCap(g, key) {
  if (capLeft(g, key) <= 0) fail('cap_reached', 'Tageslimit erreicht');
  g.state.period.daily.caps[key] = (g.state.period.daily.caps[key] || 0) + 1;
}

// ---- Bedingungen ---------------------------------------------------------
// Liefert [aktuell, benötigt]. ctx = { track: trackState } für scope 'track'.
export function progress(g, cond, ctx = {}) {
  const s = g.state;
  if (!cond) return [1, 1];
  if (cond.all) { let a = 0; for (const c of cond.all) { const [x, y] = progress(g, c, ctx); if (x >= y) a++; } return [a, cond.all.length]; }
  if (cond.any) { for (const c of cond.any) { const [x, y] = progress(g, c, ctx); if (x >= y) return [1, 1]; } return [0, 1]; }
  if (cond.level !== undefined) return [s.player.level, cond.level];
  if (cond.counter !== undefined) {
    let v;
    if (cond.scope === 'daily') v = s.period.daily.c[cond.counter] || 0;
    else if (cond.scope === 'weekly') v = s.period.weekly.c[cond.counter] || 0;
    else v = (s.counters[cond.counter] || 0) - (cond.scope === 'track' && ctx.track && ctx.track.base ? ctx.track.base[cond.counter] || 0 : 0);
    return [v, cond.gte];
  }
  if (cond.flag !== undefined) return [s.flags[cond.flag] ? 1 : 0, 1];
  if (cond.unlock !== undefined) return [s.unlocks[cond.unlock] ? 1 : 0, 1];
  if (cond.cleared !== undefined) return [s.world.cleared[cond.cleared] ? 1 : 0, 1];
  if (cond.questDone !== undefined) return [s.quests.done[cond.questDone] ? 1 : 0, 1];
  if (cond.areaOpen !== undefined) { const a = g.c.by.areas.get(cond.areaOpen); return [a && (a.prev === 'base' || s.world.cleared[a.prev]) ? 1 : 0, 1]; }
  if (cond.building !== undefined) return [(s.buildings[cond.building] || {}).level || 0, cond.lv || 1];
  if (cond.upgrade !== undefined) return [s.upgrades[cond.upgrade] || 0, cond.gte];
  if (cond.towerBest !== undefined) return [s.modes.tower.best, cond.towerBest];
  if (cond.stage !== undefined) return [Object.keys(s.world.cleared).length, cond.stage];
  if (cond.weaponSlots !== undefined) return [s.weapons.unlocked, cond.weaponSlots];
  if (cond.playerLevel !== undefined) return [s.player.level, cond.playerLevel];
  if (cond.keySlots !== undefined) return [s.keyhouse.slots.filter((x) => x.open).length, cond.keySlots];
  if (cond.mainEquipped !== undefined) return [s.weapons.slots[0] ? 1 : 0, 1];
  if (cond.equippedSubs !== undefined) return [s.weapons.slots.slice(1).filter(Boolean).length, cond.equippedSubs];
  if (cond.hasWeaponRarity !== undefined) return [s.weapons.list.some((w) => g.c.get('weapons', w.def).rarity >= cond.hasWeaponRarity) ? 1 : 0, 1];
  if (cond.day !== undefined) { const st = ctx.track && ctx.track.start; return [st ? Math.floor((g.now() - st) / DAY_MS) + 1 : 0, cond.day]; }
  fail('bad_cond', 'Unbekannte Bedingung ' + JSON.stringify(cond));
}
export const check = (g, cond, ctx) => { const [a, b] = progress(g, cond, ctx); return a >= b; };

// ---- Claim-Tracks --------------------------------------------------------
export function allTracks(g) {
  const list = [...g.c.t.tracks];
  for (const ev of g.c.t.events || []) list.push({ ...ev.track, event: ev });
  return list;
}
export const trackDef = (g, id) => allTracks(g).find((t) => t.id === id) || fail('no_track', 'Track fehlt: ' + id);

// Aktiv = freigeschaltet + im Zeitfenster. Aktiviert Baseline (Zählerstand bei Start) beim ersten Zugriff.
export function trackActive(g, def) {
  const s = g.state, now = g.now();
  if (def.unlock && !check(g, def.unlock)) return null;
  if (def.event) {
    const ev = def.event, st = Date.parse(ev.start), en = Date.parse(ev.end) + (ev.graceDays || 0) * DAY_MS;
    if (now < st || now > en) return null;
    if (ev.segment && !check(g, ev.segment)) return null;
  }
  let ts = s.tracks[def.id];
  if (ts && def.seasonDays && now - ts.start >= def.seasonDays * DAY_MS) ts = null; // neue Saison
  if (!ts) {
    ts = s.tracks[def.id] = { claimed: {}, start: now, base: def.baseline || def.reset === 'cycle' ? { ...s.counters } : null };
    if (ts.base) ts.base.login = (s.counters.login || 0) - 1; // der Aktivierungstag zählt als Login-Tag 1
  }
  if (def.durationDays && now - ts.start > def.durationDays * DAY_MS) return { ...ts, expired: true };
  return ts;
}
function claimedMap(g, def, ts) {
  if (def.reset === 'daily') return g.state.period.daily.claims;
  if (def.reset === 'weekly') return g.state.period.weekly.claims;
  return ts.claimed;
}
const ckey = (def, node) => (def.reset === 'daily' || def.reset === 'weekly' ? `${def.id}:${node.id}` : node.id);

export function nodeState(g, def, node, ts) {
  if (!ts) return 'locked';
  if (claimedMap(g, def, ts)[ckey(def, node)]) return 'claimed';
  if (ts.expired) return 'expired';
  return check(g, node.cond, { track: ts }) ? 'ready' : 'open';
}

export function claimNode(g, trackId, nodeId) {
  const def = trackDef(g, trackId), ts = trackActive(g, def);
  if (!ts) fail('locked', 'Noch nicht verfügbar');
  const node = def.nodes.find((n) => n.id === nodeId) || fail('no_node');
  const st = nodeState(g, def, node, ts);
  if (st !== 'ready') fail(st === 'claimed' ? 'already_claimed' : 'not_ready', st === 'claimed' ? 'Bereits abgeholt' : 'Bedingung nicht erfüllt');
  claimedMap(g, def, ts)[ckey(def, node)] = g.now();
  // Bonus (früher Rewarded Ad x5): replace = Basis*mult, add = Basis + Basis*mult
  const bc = g.c.cfg.bonusClaims;
  let mult = 1;
  if (node.bonusMult && bc.levelUp) mult = bc.mode === 'add' ? node.bonusMult + 1 : node.bonusMult;
  return give(g, node.reward, `track:${trackId}`, node.id, 'loot', mult);
}
export function claimAll(g, trackId) {
  const def = trackDef(g, trackId), ts = trackActive(g, def), got = [];
  if (!ts) return got;
  for (const node of def.nodes) if (nodeState(g, def, node, ts) === 'ready') got.push(...claimNode(g, trackId, node.id));
  return got;
}
