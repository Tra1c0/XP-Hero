// Shop, rollierende Händler, Zufallsbelohnung, Lucky Spin, Codes, externe Grants, Quests.
import { fail, pickWeighted, hash53, utcDay } from './util.js';
import { pay, give, grant, resolve, emit, check, progress, claimOnce, canAfford, useCap, capLeft } from './econ.js';
import { unlock, need } from './progress.js';

// ============================================================ Shop
function boughtMap(g, sku) {
  if (sku.reset === 'daily') return g.state.period.daily.claims;
  if (sku.reset === 'weekly') return g.state.period.weekly.claims;
  return g.state.shop.bought;
}
export function skuInfo(g, id) {
  const sku = g.c.get('shop', id), n = boughtMap(g, sku)[`shop:${id}`] || 0;
  let left = sku.limit ? sku.limit - n : Infinity;
  if (sku.cap) left = Math.min(left, capLeft(g, sku.cap));
  if (sku.gemClaim && g.c.cfg.applyDailyGemShopCapToFreeGems) left = Math.min(left, capLeft(g, 'dailyGemShop'));
  return { sku, bought: n, left, unlocked: !sku.unlock || check(g, sku.unlock), affordable: canAfford(g, sku.price) };
}
export function buy(g, id, n = 1) {
  need(g, 'shop');
  const info = skuInfo(g, id), sku = info.sku;
  if (!info.unlocked) fail('locked', 'Angebot noch gesperrt');
  if (!(Number.isInteger(n) && n >= 1)) fail('bad_amount');
  if (info.left < n) fail('sold_out', 'Limit erreicht');
  pay(g, sku.price, `shop:${sku.cat}`, id, n);
  const m = boughtMap(g, sku);
  m[`shop:${id}`] = (m[`shop:${id}`] || 0) + n;
  for (let k = 0; k < n; k++) {
    if (sku.cap) useCap(g, sku.cap);
    if (sku.gemClaim && g.c.cfg.applyDailyGemShopCapToFreeGems) useCap(g, 'dailyGemShop');
  }
  emit(g, 'shop:buy', n);
  return give(g, sku.reward, `shop:${sku.cat}`, id, 'shop', n);
}

// ---- Rollierende Händler: lokale, deterministische Tagesrotation (Seed = Profil + UTC-Tag + Refresh-Zähler), kein Serverzwang.
export function merchant(g, id) {
  const def = g.c.get('merchant', id), day = utcDay(g.now());
  let st = g.state.shop.merchant[id];
  if (!st || st.day !== day) st = g.state.shop.merchant[id] = { day, refreshes: 0, offers: null };
  if (!st.offers) {
    const seed = { x: parseInt(hash53(`${g.state.profileId}:${id}:${day}:${st.refreshes}`), 36) | 0 };
    const pool = def.pool.map((o) => ({ ...o })), offers = [];
    while (offers.length < def.pick && pool.length) {
      const o = pickWeighted(seed, 'x', pool);
      pool.splice(pool.indexOf(o), 1);
      offers.push({ id: o.id, left: o.stock });
    }
    st.offers = offers;
  }
  return { def, st, unlocked: !def.unlock || check(g, def.unlock) };
}
export function buyMerchant(g, id, offerId) {
  const { def, st, unlocked } = merchant(g, id);
  if (!unlocked) fail('locked');
  const o = st.offers.find((x) => x.id === offerId) || fail('gone', 'Angebot nicht mehr verfügbar');
  if (o.left <= 0) fail('sold_out', 'Ausverkauft');
  const d = def.pool.find((x) => x.id === offerId) || fail('gone');
  pay(g, d.price, `merchant:${id}`, offerId);
  o.left--;
  return give(g, d.reward, `merchant:${id}`, offerId, 'shop');
}
export function refreshMerchant(g, id) {
  const { def, st, unlocked } = merchant(g, id);
  if (!unlocked) fail('locked');
  if (def.freeRefreshCap && capLeft(g, def.freeRefreshCap) > 0) useCap(g, def.freeRefreshCap); else pay(g, def.refreshCost, `merchant:${id}:refresh`);
  st.refreshes++; st.offers = null;
  return merchant(g, id);
}

// ---- Zufallsbelohnung im Feld (früher IngameRV) und Lucky Spin
export function randomRewardReady(g) {
  return !!g.state.unlocks.randomReward && g.now() >= g.state.world.rrAt && capLeft(g, 'randomReward') > 0;
}
export function claimRandomReward(g) {
  if (!randomRewardReady(g)) fail('not_ready', 'Noch nicht verfügbar');
  const lv = g.state.player.level, band = g.c.t.randomReward.find((b) => lv >= b.minLevel && lv <= b.maxLevel) || fail('no_band', 'Keine Belohnung für dieses Level');
  useCap(g, 'randomReward');
  g.state.world.rrAt = g.now() + g.c.cfg.randomReward.everySec * 1000;
  const row = pickWeighted(g.state.rng, 'loot', band.rows) || fail('no_band');
  return give(g, [row], 'random_reward');
}
export function spinSegment(g) {
  const cleared = Object.keys(g.state.world.cleared).length;
  let seg = g.c.t.spinSegments[0];
  for (const s of g.c.t.spinSegments) if (cleared >= s.minStage) seg = s;
  return seg;
}
export function spin(g) {
  need(g, 'spin');
  if (capLeft(g, 'freeSpin') > 0) useCap(g, 'freeSpin'); else pay(g, g.c.cfg.spin.spinCost, 'spin');
  const seg = spinSegment(g), row = pickWeighted(g.state.rng, 'loot', seg.rows);
  emit(g, 'spin');
  return { index: seg.rows.indexOf(row), got: give(g, [row], 'lucky_spin', seg.id) };
}

// ---- Codes (lokaler Content-Kanal) und externe, idempotente Grants (Backend-Codes, Admin-Grants)
export function redeemLocal(g, code) {
  const row = (g.c.t.codes || []).find((r) => r.code.toLowerCase() === String(code).trim().toLowerCase()) || fail('bad_code', 'Code unbekannt');
  if (row.expires && g.now() > Date.parse(row.expires)) fail('expired', 'Code abgelaufen');
  return claimOnce(g, `code:${row.id}`, () => give(g, row.reward, 'code', row.id));
}
export function grantExternal(g, claimId, reward, source = 'server') {
  return claimOnce(g, `ext:${claimId}`, () => grant(g, resolve(g, reward), source, claimId));
}

// ============================================================ Quests
export function questState(g, q) {
  const s = g.state.quests;
  if (s.done[q.id]) return 'completed';
  if (s.active[q.id]) return objectives(g, q).every((o) => o.cur >= o.need) ? 'satisfied' : 'active';
  return (q.prereq || []).every((p) => s.done[p]) ? 'available' : 'unavailable';
}
export function objectives(g, q) {
  const a = g.state.quests.active[q.id];
  return q.obj.map((o) => {
    if (o.cond) { const [cur, nd] = progress(g, o.cond); return { cur: Math.min(cur, nd), need: nd }; }
    const base = o.from === 'accept' && a ? a.base[o.counter] || 0 : 0;
    return { cur: Math.min(o.n, (g.state.counters[o.counter] || 0) - base), need: o.n };
  });
}
// Nimmt verfügbare Quests an (Trigger on_receive: Start-Grant + Unlock, jeweils genau einmal).
export function refreshQuests(g) {
  const s = g.state.quests;
  for (const q of g.c.t.quests) {
    if (s.done[q.id] || s.active[q.id] || !(q.prereq || []).every((p) => s.done[p])) continue;
    const base = {};
    for (const o of q.obj) if (o.counter && o.from === 'accept') base[o.counter] = g.state.counters[o.counter] || 0;
    s.active[q.id] = { base, t: g.now() };
    if (q.grant && !g.state.claims[`qgrant:${q.id}`]) claimOnce(g, `qgrant:${q.id}`, () => give(g, q.grant, 'quest:grant', q.id));
    if (q.unlockOn === 'receive') for (const f of q.unlock || []) unlock(g, f);
    if (g.events) g.events.push({ type: 'quest', id: q.id, name: q.name });
  }
}
export function claimQuest(g, id) {
  const q = g.c.get('quests', id), st = questState(g, q);
  if (st !== 'satisfied') fail(st === 'completed' ? 'already_claimed' : 'not_ready', 'Quest nicht abschließbar');
  g.state.quests.done[id] = g.now();
  delete g.state.quests.active[id];
  const got = give(g, q.reward, 'quest', id);
  if (q.unlockOn !== 'receive') for (const f of q.unlock || []) unlock(g, f);
  for (const f of q.unlock2 || []) unlock(g, f);
  emit(g, 'quest:done');
  refreshQuests(g);
  return got;
}
export function currentQuests(g) {
  return g.c.t.quests.filter((q) => g.state.quests.active[q.id]).map((q) => ({ q, state: questState(g, q), obj: objectives(g, q) }));
}
