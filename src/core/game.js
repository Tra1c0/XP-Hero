// Spiel-Fassade: transaktionale Befehle, fester Simulations-Tick, Welt-/Moduswechsel, Persistenz.
// UI und Netzwerk rufen ausschließlich cmd()/tick() auf und verändern den Zustand nie direkt.
import { GameError, fail, clone, rnd } from './util.js';
import { indexContent, validateContent } from './content/validate.js';
import { newState, saveTo, loadFrom, migrate } from './state.js';
import * as econ from './econ.js';
import * as prog from './progress.js';
import * as gear from './gear.js';
import * as home from './home.js';
import * as meta from './meta.js';
import * as modes from './modes.js';
import { World, buildMap, arenaMap } from './sim.js';

export class Game {
  constructor({ pack, state = null, now = () => Date.now(), store = null, seed }) {
    const errs = validateContent(pack);
    if (errs.length) throw new Error('Content ungültig: ' + errs.slice(0, 5).join('; '));
    const c = indexContent(pack);
    this.store = store;
    const g = (this.g = { c, now, state: null, stats: null, statsRev: 0, events: [], dirty: true });
    g.grantHooks = { weapon: (id, src) => gear.addWeapon(g, id, src), rune: (id) => gear.addRune(g, id), hero: (id, src) => gear.grantHero(g, id, src), xp: (n, src) => prog.gainXp(g, n, src) };
    g.onLevelUp = () => { if (c.cfg.xp.healOnLevelUp && this.world) this.world.p.hp = g.stats.hp; };
    g.onNewDay = () => modes.invasionDaily(g);
    g.onNewWeek = () => modes.invasionSeasonEnd(g);
    this.recovered = false;
    if (!state && store) { const r = loadFrom(store, c); state = r.state; this.recovered = r.recovered; } else if (state) state = migrate(state, c);
    g.state = state || newState(c, now(), seed);
    const w = g.state.world;
    if (!c.cfg.combat.respawnOfflineContinues && w.leftAt) { const d = now() - w.leftAt; for (const arr of Object.values(w.respawn)) arr.forEach((t, i) => { if (t) arr[i] = t + d; }); }
    prog.refreshStats(g);
    prog.syncLevelUnlocks(g);
    econ.tickPeriods(g);
    meta.refreshQuests(g);
    this.acc = 0; this.secAcc = 0; this.alpha = 0; this.steps = 0;
    this.field = null; this.world = null; this.modeResult = null;
    this.enter(g.state.world.area, false);
    if (g.state.modes.session) g.events.push({ type: 'sessionResume', session: g.state.modes.session });
  }
  get state() { return this.g.state; }
  get c() { return this.g.c; }
  get stats() { return this.g.stats; }

  // ---- Befehle: alles-oder-nichts. Bei Fehler wird der komplette Zustand zurückgesetzt (kein Teilverlust, keine Gratisitems).
  cmd(name, ...args) {
    const fn = COMMANDS[name] || fail('bad_cmd', 'Unbekannter Befehl ' + name);
    const g = this.g, snap = clone(g.state);
    try {
      const r = fn(this, g, ...args);
      this.applyStats();
      meta.refreshQuests(g);
      g.dirty = true;
      return r;
    } catch (e) {
      g.state = snap;
      prog.refreshStats(g);
      throw e;
    }
  }
  // Im Mehrheldenmodus (Raid) gelten nur die Werte des gerade kämpfenden Helden.
  applyStats() {
    const g = this.g, w = this.world;
    if (w && w.mode && w.mode.team) { g.stats = prog.computeStats(g, { heroId: w.mode.team[w.p.teamIdx] || w.mode.team[0] }); g.statsRev++; } else prog.refreshStats(g);
  }
  // Wie cmd, aber liefert {ok, error} statt zu werfen (für UI).
  try(name, ...args) {
    try { return { ok: true, value: this.cmd(name, ...args) }; } catch (e) { if (e instanceof GameError) return { ok: false, error: e.message, code: e.code }; throw e; }
  }

  // ---- Welt
  hooks() {
    const g = this.g;
    return {
      onKill: (e, world) => this.onKill(e, world),
      onPickup: (d) => {
        if (d.item === '#xp') { prog.gainXp(g, d.n, 'pickup'); return true; }
        const it = g.c.get('items', d.item);
        if (it.cargo > 0) { const take = home.cargoAdd(g, d.item, d.n); d.n -= take; return d.n <= 0; }
        econ.add(g, d.item, d.n, 'drop');
        return true;
      },
      cargoFull: () => home.cargoFree(g) <= 0,
      interact: (o, world) => {
        try {
          if (o.type === 'gate') { if (o.open()) world.pending = { travel: o.to, back: !!o.back }; else g.events.push({ type: 'toast', msg: 'Tor verschlossen – besiege zuerst den Boss.' }); } else if (o.type === 'chest') { if (home.chestSpawnerReady(g, o.id)) { home.pickupChest(g, o.id); g.events.push({ type: 'toast', msg: 'Feldtruhe ins Key House gelegt.' }); } } else if (o.type === 'gift') { if (home.giftReady(g, o.id)) g.events.push({ type: 'reward', title: 'Gift Chest', got: home.openGift(g, o.id) }); } else if (o.type === 'areachest') { if (!g.state.claims[`areachest:${o.id}`]) g.events.push({ type: 'reward', title: 'Gebietstruhe', got: home.openAreaChest(g, o.id) }); } else if (o.type === 'npc') { econ.emit(g, `talk:${o.id}`); g.events.push({ type: 'dialog', name: o.name, text: o.text }); }
        } catch (e) { if (e instanceof GameError) g.events.push({ type: 'toast', msg: e.message }); else throw e; }
      },
      onDeath: (world) => {
        if (world.mode && world.mode.kind === 'raid') {
          const next = world.mode.team[++world.p.teamIdx];
          if (next) { g.stats = prog.computeStats(g, { heroId: next }); g.statsRev++; Object.assign(world.p, { alive: true, hp: g.stats.hp, hero: next }); g.events.push({ type: 'toast', msg: 'Nächster Held betritt den Kampf.' }); return; }
          world.end(true);
        } else if (world.mode) world.end(false);
      },
    };
  }
  onKill(e, world) {
    const g = this.g, v = e.v, s = g.state, cfg = g.c.cfg;
    if (world.mode) return; // Modi zahlen ausschließlich über completeMode aus
    const rs = (s.world.respawn[e.gid] ||= []);
    const sec = e.group.respawn ?? (v.rank === 'boss' ? cfg.combat.bossRespawnSec : cfg.combat.defaultRespawnSec);
    rs[e.slot] = g.now() + sec * 1000;
    if (v.rank !== 'node') {
      const gold = Math.floor(v.gold * (1 + g.stats.goldPct / 100) * cfg.rewardFactor.gold);
      if (gold > 0) econ.add(g, 'gold', gold, 'kill', v.id);
      if (cfg.xp.trigger === 'pickup') world.spawnDrop('#xp', v.xp, e.x, e.y); else prog.gainXp(g, v.xp, 'kill');
      econ.emit(g, `kill:${v.monster}`); econ.emit(g, 'kill:any');
      if (v.rank === 'boss') {
        const area = world.map.id;
        econ.emit(g, 'bossKill'); econ.emit(g, `bossKill:${area}`);
        s.world.bossKills[area] = (s.world.bossKills[area] || 0) + 1;
        if (!s.world.cleared[area]) { s.world.cleared[area] = g.now(); g.events.push({ type: 'areaCleared', area }); } // Erstsieg genau einmal
      }
    }
    const dropMult = Math.min(2, 1 + g.stats.dropPct / 100), orbMult = s.flags.perk_orbs ? g.c.get('perks', 'perk_orbs').v : 1;
    for (const d of v.drops) {
      if (rnd(s.rng, 'loot') >= d.chance * (d.chance < 1 ? dropMult : 1) * cfg.rewardFactor.drops) continue;
      const n = d.n * (d.item.startsWith('orb_') ? orbMult : 1);
      for (let k = 0; k < d.count; k++) world.spawnDrop(d.item, n, e.x + (k - d.count / 2) * 22, e.y + ((k * 13) % 30) - 15);
    }
  }
  enter(areaId, viaBackGate) {
    const g = this.g, map = buildMap(g, areaId);
    g.state.world.area = areaId;
    const auto = this.field ? this.field.p.auto : false;
    this.field = this.world = new World(g, map, this.hooks());
    this.world.p.auto = auto && areaId !== 'base';
    if (viaBackGate && map.area && map.area.next) { this.world.p.x = map.area.gate.x; this.world.p.y = map.area.gate.y + 110; }
    if (areaId === 'base') { econ.emit(g, 'returnBase'); if (Object.keys(g.state.cargo).length) g.events.push({ type: 'reward', title: 'Beute abgegeben', got: home.deliver(g) }); }
    for (const o of this.world.map.objects) o.in = (o.x - this.world.p.x) ** 2 + (o.y - this.world.p.y) ** 2 < o.r * o.r; // nicht sofort zurückspringen
    g.dirty = true;
  }
  canEnter(areaId) {
    if (areaId === 'base') return true;
    const a = this.c.get('areas', areaId);
    return a.prev === 'base' || !!this.state.world.cleared[a.prev];
  }

  // ---- Zeit: fester Tick mit Catch-up-Grenze; echte Zeit für Timer
  tick(dtReal) {
    const g = this.g, step = g.c.cfg.combat.tick;
    this.acc += Math.min(dtReal, 0.25);
    let n = 0;
    while (this.acc >= step - 1e-9 && n < 8) { this.world.step(step); this.acc -= step; n++; this.steps++; }
    if (n === 8) this.acc = 0;
    this.alpha = this.acc / step;
    const w = this.world;
    if (w.pending) { const p = w.pending; w.pending = null; this.autoBack = p.autoBack || null; this.travelInternal(p.travel, p.back); }
    if (w.ended && w.mode) this.finishMode();
    if (!w.mode && w.map.kind === 'field') { const fog = (g.state.world.fog[w.map.id] ||= {}); fog[w.cellOf()] = 1; }
    this.secAcc += dtReal;
    if (this.secAcc >= 1) {
      this.secAcc = 0;
      econ.tickPeriods(g);
      if (this.autoBack && g.state.world.area === 'base') { const back = this.autoBack; this.autoBack = null; if (this.canEnter(back)) { this.enter(back, false); this.world.p.auto = true; } }
    }
    if (g.dirty) { meta.refreshQuests(g); g.dirty = false; this.changed = true; }
  }
  travelInternal(to, back) {
    if (!this.canEnter(to)) return;
    this.enter(to, back);
  }
  finishMode() {
    const g = this.g, w = this.world;
    this.world = this.field;
    prog.refreshStats(g);
    this.world.p.hp = g.stats.hp; this.world.p.alive = true;
    try { this.modeResult = this.cmd('completeMode', w.ended); g.events.push({ type: 'modeResult', result: this.modeResult }); } catch (e) { if (!(e instanceof GameError)) throw e; }
  }
  save() {
    if (!this.store) return;
    this.g.state.world.leftAt = this.g.now();
    saveTo(this.store, this.g.state);
  }
  drainEvents() { const e = this.g.events; this.g.events = []; return e; }
}

// Befehlstabelle: (game, g, ...args). Jeder Eintrag läuft transaktional über Game.cmd.
const d = (fn) => (_, g, ...a) => fn(g, ...a);
export const COMMANDS = {
  buyUpgrade: d(prog.buyUpgrade),
  equipWeapon: d(gear.equipWeapon), unequipWeapon: d(gear.unequipWeapon), toggleWeaponLock: d(gear.toggleWeaponLock), weaponLevelUp: d(gear.weaponLevelUp),
  mergeWeapon: d(gear.mergeWeapon), mergeAll: d(gear.mergeAll), unlockWeaponSlot: d(gear.unlockWeaponSlot), craft: d(gear.craft), openBox: d(gear.openBox),
  unlockHero: d(gear.unlockHero), setActiveHero: d(gear.setActiveHero), heroLevelUp: d(gear.heroLevelUp), heroStarUp: d(gear.heroStarUp), useSelectTicket: d(gear.useSelectTicket), setRaidTeam: d(gear.setRaidTeam),
  rollTraits: d(gear.rollTraits), toggleTraitLock: d(gear.toggleTraitLock), setTraitPreset: d(gear.setTraitPreset),
  equipRune: d(gear.equipRune), unequipRune: d(gear.unequipRune), runeLevelUp: d(gear.runeLevelUp), toggleRuneLock: d(gear.toggleRuneLock), dismantleRunes: d(gear.dismantleRunes),
  build: d(home.build), upgradeBuilding: d(home.upgradeBuilding), collectProduction: d(home.collectProduction), deliver: d(home.deliver),
  unlockKeySlot: d(home.unlockKeySlot), claimChest: d(home.claimChest), speedUpChest: d(home.speedUpChest),
  buy: d(meta.buy), buyMerchant: d(meta.buyMerchant), refreshMerchant: d(meta.refreshMerchant), claimRandomReward: d(meta.claimRandomReward), spin: d(meta.spin),
  redeemLocal: d(meta.redeemLocal), grantExternal: d(meta.grantExternal), claimQuest: d(meta.claimQuest),
  claimNode: d(econ.claimNode), claimAll: d(econ.claimAll),
  fight: d(modes.fight), collectBank: d(modes.collectBank), setDefense: d(modes.setDefense), completeMode: d(modes.completeMode),
  setSetting: (_, g, k, v) => { if (!(k in g.state.settings)) fail('bad_setting'); g.state.settings[k] = v; },
  // Reisen: Portal (Basis -> freigeschaltetes Gebiet) und Heimkehr (Tagescap, mit Perk unbegrenzt)
  portal: (game, g, areaId) => {
    prog.need(g, 'portal');
    if (g.state.modes.session) fail('session_active');
    if (g.state.world.area !== 'base' && !g.c.cfg.remoteBaseAccess) fail('not_at_base', 'Nur in der Basis');
    if (!game.canEnter(areaId)) fail('locked', 'Gebiet noch nicht erreichbar');
    game.enter(areaId, false);
  },
  returnHome: (game, g) => {
    if (g.state.world.area === 'base') fail('already', 'Bereits in der Basis');
    if (game.world.mode) fail('session_active', 'Im Modus nicht möglich');
    if (!g.state.flags.perk_home) econ.useCap(g, 'homeReturn');
    econ.pay(g, g.c.cfg.homeReturn.cost, 'home_return');
    game.enter('base', false);
  },
  revive: (game, g, how) => {
    const w = game.world;
    if (w.p.alive) fail('alive', 'Nicht nötig');
    if (how === 'inplace') { econ.useCap(g, 'revive'); w.p.alive = true; w.p.hp = g.stats.hp; } else if (w.mode) { w.end(false); } else game.enter('base', false);
  },
  startMode: (game, g, mode, param) => {
    const r = modes.startMode(g, mode, param), spec = modes.modeSpec(g, r.session);
    if (spec.team) { g.stats = prog.computeStats(g, { heroId: spec.team[0] }); g.statsRev++; }
    game.world = new World(g, arenaMap(), game.hooks(), spec);
    game.world.p.auto = true;
    return r;
  },
  abortMode: (game, g) => { modes.abortMode(g); game.world = game.field; },
};
