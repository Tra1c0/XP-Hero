// Nebenmodi: gemeinsame ModeSession-Zustandsmaschine (Tower/Raid/Tomb) und asynchrone Duelle (PvP/Invasion).
import { fail, rnd, clamp, pickWeighted, utcDay } from './util.js';
import { pay, give, add, emit, capLeft, useCap, resolve, grant } from './econ.js';
import { need, computeStats, weaponDmg } from './progress.js';
import { mobStats } from './content/base.js';
import { modeVariant } from './sim.js';

// ============================================================ Sessions (Tower / Raid / Tomb)
export const raidBossOfDay = (g) => g.c.t.raidBosses[utcDay(g.now()) % g.c.t.raidBosses.length];

// Raid-Boss, den eine laufende Quest verlangt, ist unabhängig vom Tagesboss wählbar.
export const raidQuestTarget = (g, id) => g.c.t.quests.some((q) => g.state.quests.active[q.id] && q.obj[0].counter === `raid:clear:${id}`);
export function modeSpec(g, se) {
  const cfg = g.c.cfg;
  if (se.mode === 'tower') { const f = g.c.get('towerFloors', se.param); return { kind: 'tower', level: f.level, waves: f.waves, timer: f.timer || cfg.tower.timerSec }; }
  if (se.mode === 'tomb') { const t = g.c.get('tombTiers', se.param); return { kind: 'tomb', level: t.level, waves: t.waves, timer: cfg.tomb.timerSec }; }
  if (se.mode === 'raid') {
    const b = g.c.get('raidBosses', se.param), v = modeVariant(g, b.level, 'boss', b.hpMult);
    v.name = b.name;
    return { kind: 'raid', mech: b.mech ? g.c.get('raidMechs', b.mech) : null, level: b.level, waves: [[{ v, count: 1 }]], timer: cfg.raid.timerSec, timeoutWin: true, bossHp: v.hp, team: [...g.state.heroes.raidTeam] };
  }
  fail('bad_mode');
}
// Start: Ticket wird genau hier verbraucht. Läuft dieselbe Runde noch (z. B. nach Neustart), wird sie ohne erneute Kosten fortgesetzt.
export function startMode(g, mode, param) {
  need(g, mode);
  const ms = g.state.modes;
  if (ms.session) {
    if (ms.session.mode === mode && ms.session.param === param) return { session: ms.session, resumed: true };
    fail('session_active', 'Es läuft bereits eine Runde');
  }
  if (mode === 'tower') { g.c.get('towerFloors', param); if (param > ms.tower.best + 1) fail('locked', 'Vorherige Etage zuerst abschließen'); } else if (mode === 'tomb') { g.c.get('tombTiers', param); if (param > ms.tomb.best + 1) fail('locked', 'Vorherige Stufe zuerst abschließen'); } else if (mode === 'raid') { g.c.get('raidBosses', param); if (param !== raidBossOfDay(g).id && !raidQuestTarget(g, param)) fail('locked', 'Heute ist ein anderer Raid-Boss aktiv'); } else fail('bad_mode');
  pay(g, g.c.cfg[mode].entryCost, `mode:${mode}:entry`, String(param));
  ms.session = { id: `s${g.state.txSeq}_${g.now()}`, mode, param, startedAt: g.now() };
  emit(g, `mode:${mode}:start`); emit(g, 'mode:any:start'); emit(g, `ticket:${mode}`);
  return { session: ms.session, resumed: false };
}
export function abortMode(g) {
  if (!g.state.modes.session) fail('no_session');
  g.state.modes.session = null; // kein Reward, Ticket bleibt verbraucht
  emit(g, 'mode:abort');
}
// Abschluss: Session wird zuerst geschlossen -> Belohnung genau einmal, auch bei doppeltem Aufruf.
export function completeMode(g, result) {
  const ms = g.state.modes, se = ms.session || fail('no_session', 'Keine laufende Runde');
  ms.session = null;
  const out = { mode: se.mode, param: se.param, win: !!result.win, first: false, rewards: [], score: 0 };
  if (se.mode === 'tower') {
    if (result.win) {
      const f = g.c.get('towerFloors', se.param);
      out.first = se.param > ms.tower.best;
      if (out.first) ms.tower.best = se.param;
      out.rewards = give(g, out.first ? f.first : f.repeat, `tower:${out.first ? 'first' : 'repeat'}`, String(se.param));
      emit(g, 'mode:tower:clear');
    }
  } else if (se.mode === 'tomb') {
    if (result.win) {
      const t = g.c.get('tombTiers', se.param), spec = [{ item: 'rune_dust', n: t.drops.dust }];
      out.first = se.param > ms.tomb.best;
      ms.tomb.best = Math.max(ms.tomb.best, se.param);
      for (let k = 0; k < t.drops.count; k++) spec.push({ rune: { type: pickWeighted(g.state.rng, 'mode', t.drops.typeW).type, rarity: pickWeighted(g.state.rng, 'mode', t.drops.rarityW).rarity } });
      out.rewards = grant(g, resolve(g, spec, 'mode'), 'tomb', String(se.param));
      emit(g, 'mode:tomb:clear');
    }
  } else if (se.mode === 'raid') {
    const b = g.c.get('raidBosses', se.param), hp = modeVariant(g, b.level, 'boss', b.hpMult).hp;
    out.score = Math.max(0, Math.floor(result.dmg || 0));
    const pct = (100 * out.score) / hp;
    out.win = pct >= b.tiers[0].pct;
    for (const t of b.tiers) if (pct >= t.pct) out.rewards.push(...give(g, t.reward, 'raid', `${se.param}:${t.pct}`));
    out.first = out.score > (ms.raid.best[se.param] || 0);
    if (out.first) ms.raid.best[se.param] = out.score;
    emit(g, 'mode:raid:clear');
    if (out.win) emit(g, `raid:clear:${se.param}`);
  }
  return out;
}

// ============================================================ Duelle (PvP / Invasion)
export function snapshot(g, heroId) {
  const st = heroId ? computeStats(g, { heroId }) : g.stats;
  const uid = g.state.weapons.slots[0], w = uid && g.state.weapons.list.find((x) => x.uid === uid);
  const cls = w ? g.c.get('weaponClasses', g.c.get('weapons', w.def).cls) : { basicMult: 1, interval: 0.8 };
  return { name: 'Spieler', atk: Math.round((st.atk + (w ? weaponDmg(g, w) : 0)) * cls.basicMult * (1 + st.dmgPct / 100)), aps: (1 / cls.interval) * (1 + st.atkSpeedPct / 100),
    hp: st.hp, crit: st.critChance, critDmg: st.critDmg, ls: st.lifesteal, level: g.state.player.level };
}
export function botSnapshot(g, rating, name) {
  const lv = clamp(Math.round((rating - 760) / 6), 1, g.c.t.playerLevels.length), row = g.c.get('playerLevels', lv);
  return { name, bot: true, atk: Math.round(row.atk * (1 + lv / 15)), aps: 1.4, hp: Math.round(row.hp * (1 + lv / 25)), crit: 10, critDmg: 160, ls: 0, level: lv };
}
// Deterministische Kampfsimulation zweier Snapshots; identisch auf Client und Server ausführbar.
export function simulateDuel(a, b, seed) {
  const r = { x: seed | 0 }, A = { ...a, cur: a.hp, cd: 0 }, B = { ...b, cur: b.hp, cd: 0.05 };
  const swing = (s, o) => { let d = 0; s.cd -= 0.1; while (s.cd <= 0) { const x = s.atk * (rnd(r, 'x') * 100 < s.crit ? s.critDmg / 100 : 1); d += x; s.cur = Math.min(s.hp, s.cur + (x * s.ls) / 100); s.cd += 1 / Math.max(0.2, s.aps); } o.pend = d; };
  let t = 0;
  for (; t < 60 && A.cur > 0 && B.cur > 0; t += 0.1) { swing(A, B); swing(B, A); A.cur -= A.pend; B.cur -= B.pend; }
  const ap = Math.max(0, A.cur) / a.hp, bp = Math.max(0, B.cur) / b.hp;
  return { win: ap > bp, hpPct: Math.round(ap * 100), oppHpPct: Math.round(bp * 100), time: Math.round(t * 10) / 10 };
}
export function ladder(g, mode) {
  const n = g.c.cfg.invasion.botsPerTier, inv = g.state.modes.invasion, out = [];
  for (let i = 0; i < n; i++) {
    const rating = mode === 'invasion' ? 900 + inv.tier * 250 + ((i * 53) % 320) : 820 + i * 60;
    const name = `BOT ${mode === 'invasion' ? g.c.get('invasionTiers', inv.tier).name : 'Arena'}-${i + 1}`;
    out.push({ id: `bot:${mode}:${mode === 'invasion' ? inv.season + ':' + inv.tier : 0}:${i}`, name, rating, bot: true });
  }
  return out.sort((x, y) => y.rating - x.rating);
}
export function opponents(g, mode) {
  const me = g.state.modes[mode].rating;
  return ladder(g, mode).sort((x, y) => Math.abs(x.rating - me) - Math.abs(y.rating - me)).slice(0, 3);
}
const elo = (k, me, opp, win) => Math.round(k * ((win ? 1 : 0) - 1 / (1 + 10 ** ((opp - me) / 400))));

export function fight(g, mode, oppId, opt = {}) {
  if (mode !== 'pvp' && mode !== 'invasion') fail('bad_mode');
  need(g, mode);
  const cfg = g.c.cfg[mode], st = g.state.modes[mode];
  let opp, revenge = null;
  if (opt.revenge !== undefined) { revenge = g.state.modes.invasion.revenge[opt.revenge] || fail('gone', 'Vergeltung nicht mehr möglich'); opp = revenge; } else {
    opp = ladder(g, mode).find((b) => b.id === oppId) || fail('gone', 'Gegner nicht gefunden');
    pay(g, cfg.entryCost, `mode:${mode}:entry`, oppId);
    emit(g, `ticket:${mode}`);
  }
  const res = simulateDuel(snapshot(g), botSnapshot(g, opp.rating, opp.name), Math.floor(rnd(g.state.rng, 'mode') * 2 ** 31));
  const delta = elo(cfg.k, st.rating, opp.rating, res.win);
  st.rating = Math.max(0, st.rating + delta);
  const out = { ...res, opp: opp.name, bot: true, delta, rewards: [] };
  emit(g, `mode:${mode}:start`); emit(g, 'mode:any:start');
  if (mode === 'pvp') {
    if (res.win) { st.wins++; if (capLeft(g, 'pvpReward') > 0) { useCap(g, 'pvpReward'); out.rewards = give(g, cfg.winReward, 'pvp:win'); } }
  } else {
    const inv = st, tier = g.c.get('invasionTiers', inv.tier);
    if (res.win) {
      inv.streak++;
      const coins = Math.round(tier.coinPerWin * (1 + (Math.min(inv.streak, cfg.streakMax) * cfg.streakBonusPct) / 100)) + (revenge ? revenge.stolen : 0);
      add(g, 'invasion_coin', coins, revenge ? 'invasion:revenge' : 'invasion:win');
      out.rewards = [{ item: 'invasion_coin', n: coins }];
      emit(g, 'invasion:win');
      if (inv.streak === 3) emit(g, 'invasion:streak3');
      if (res.hpPct > 50) emit(g, 'invasion:hp50');
    } else inv.streak = 0;
    if (opt.auto) emit(g, 'invasion:auto');
    if (revenge) inv.revenge.splice(opt.revenge, 1);
    inv.history.unshift({ t: g.now(), type: revenge ? 'revenge' : 'attack', opp: opp.name, win: res.win, delta });
    inv.history.length = Math.min(inv.history.length, 20);
  }
  return out;
}

// ---- Invasion: Coin Bank, Verteidigungs-Snapshot, tägliche Bot-Angriffe, Saison
export function bankAmount(g) {
  const inv = g.state.modes.invasion, cfg = g.c.cfg.invasion;
  return Math.min(cfg.bankCap, inv.bank + Math.floor(((g.now() - inv.bankAt) / 3600000) * cfg.bankPerHour));
}
export function collectBank(g) {
  need(g, 'invasion');
  const n = bankAmount(g), inv = g.state.modes.invasion;
  if (n <= 0) fail('nothing', 'Bank ist leer');
  inv.bank = 0; inv.bankAt = g.now();
  add(g, 'invasion_coin', n, 'invasion:bank');
  return n;
}
export function setDefense(g) {
  need(g, 'invasion');
  g.state.modes.invasion.defense = { ...snapshot(g), hero: g.state.heroes.active, t: g.now() };
  emit(g, 'invasion:defenseSet');
}
export function invasionDaily(g) {
  const inv = g.state.modes.invasion, cfg = g.c.cfg.invasion;
  if (!g.state.unlocks.invasion || !inv.defense) return;
  inv.bank = bankAmount(g); inv.bankAt = g.now();
  inv.revenge = [];
  const bots = ladder(g, 'invasion');
  for (let k = 0; k < cfg.defenseAttacksPerDay; k++) {
    const bot = bots[Math.floor(rnd(g.state.rng, 'mode') * bots.length)];
    const res = simulateDuel(botSnapshot(g, bot.rating, bot.name), inv.defense, Math.floor(rnd(g.state.rng, 'mode') * 2 ** 31));
    let stolen = 0;
    if (res.win) { stolen = Math.floor((inv.bank * cfg.stealPct) / 100); inv.bank -= stolen; inv.revenge.push({ ...bot, stolen }); }
    inv.history.unshift({ t: g.now(), type: 'defense', opp: bot.name, win: !res.win, stolen });
  }
  inv.history.length = Math.min(inv.history.length, 20);
}
export function invasionSeasonEnd(g) {
  const inv = g.state.modes.invasion, cfg = g.c.cfg.invasion;
  if (!g.state.unlocks.invasion) return null;
  const bots = ladder(g, 'invasion'), rank = bots.filter((b) => b.rating > inv.rating).length + 1, pct = (100 * rank) / (bots.length + 1);
  const tier = g.c.get('invasionTiers', inv.tier), old = inv.tier;
  const rewards = give(g, tier.seasonReward, 'invasion:season', `${inv.season}`);
  if (tier.promoteTopPct && pct <= tier.promoteTopPct) inv.tier++; else if (tier.demoteBottomPct && pct >= 100 - tier.demoteBottomPct) inv.tier--;
  inv.season++; inv.rating = cfg.startRating + inv.tier * 250; inv.streak = 0; inv.revenge = [];
  inv.last = { season: inv.season - 1, rank, from: old, to: inv.tier, rewards };
  return inv.last;
}
export { mobStats };
