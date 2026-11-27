// Weltsimulation mit festem Tick (unabhängig von Render-FPS): Bewegung, Gegner-Zustandsmaschine, Kampf, Projektile,
// Statuseffekte, Drops, Auto-Hunt, Interaktionen, Moduswellen. Kein DOM. Zufall nur über den persistierten Stream 'world'.
import { rnd, clamp } from './util.js';
import { weaponDmg } from './progress.js';
import { mobStats } from './content/base.js';
import { buildGrid, slide, snap, walkable, blocked, zoneAt, los, findPath, cellAt } from './worldgrid.js';

const CELL = 180;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

export const worldOf = (g, areaId) => (g.c.t.worlds || []).find((w) => w.areas.includes(areaId)) || null;
// Rechteck-Welt für Einzelkarten (Kapitel 2/3) und Modus-Arena: gleiche Raster-/Kollisionslogik wie die große Welt.
export function rectWorld(id, wpx, hpx, biome, ppm = 40) {
  const W = wpx / ppm, H = hpx / ppm;
  return { id, cell: 2, ppm, bounds: { minX: 0, minZ: -H, maxX: W, maxZ: 0 }, zones: [{ id, biome, poly: [[1.5, -1.5], [W - 1.5, -1.5], [W - 1.5, -H + 1.5], [1.5, -H + 1.5]] }], gates: [], blockers: [], landmarks: [] };
}
const M = 40; // Fallback px pro Meter

// Zusammenhängende Welt (Kapitel 1): ein Raster, alle Gebiete + Basis, Tore als begehbare Korridore.
function buildWorldMap(g, W) {
  const c = g.c, inW = (a) => W.areas.includes(a);
  const solid = c.t.buildings.filter((b) => b.pos).map((b) => ({ kind: 'solid', c: b.pos, r: b.id === 'bonfire' ? 0.6 : 1.6, building: b.id }));
  const G = buildGrid({ ...W, blockers: [...(W.blockers || []), ...solid] }), ppm = W.ppm;
  const at = (pos, zone, roam) => { const q = G.toPx(pos[0], pos[1]); return snap(G, q.x, q.y, 40, roam || !zone ? -1 : G.zoneIds.indexOf(zone)) || q; };
  const objects = [];
  const add = (type, row, r, extra = {}) => { const q = at(row.pos, null); objects.push({ ...row, type, x: q.x, y: q.y, r: r * ppm, ...extra }); };
  // Gebäude: Das Trittfeld liegt vor dem Gebäude (zur Kamera hin). Wer es betritt, öffnet das Gebäude – kein Knopf nötig.
  // x/y = Trittfeld (Interaktion, Wegziel), bx/by = Standort des Gebäudes (Darstellung).
  for (const b of c.t.buildings) if (b.pos) {
    const q = G.toPx(b.pos[0], b.pos[1]); let pad = null;
    for (const [dx, dz] of [[0, -2.7], [0, -3.3], [1.8, -2.4], [-1.8, -2.4], [2.8, -0.6], [-2.8, -0.6], [0, 3]]) {
      const f = G.toPx(b.pos[0] + dx, b.pos[1] + dz);
      if (walkable(G, f.x, f.y) && !blocked(G, f.x, f.y, 0.5 * ppm) && !c.t.buildings.some((o) => o !== b && o.pos && Math.hypot(o.pos[0] - b.pos[0] - dx, o.pos[1] - b.pos[1] - dz) < 2.6)) { pad = f; break; }
    }
    pad = pad || snap(G, q.x, q.y + 2.7 * ppm, 6) || q;
    objects.push({ type: 'building', id: b.id, name: b.name, x: pad.x, y: pad.y, bx: q.x, by: q.y, r: 1.15 * ppm, pos: b.pos });
  }
  for (const n of c.t.npcs) if (n.pos && inW(n.area)) add('npc', n, 2.2);
  for (const s of c.t.chestSpawners) if (s.pos && inW(s.area)) add('chest', s, 1.6);
  for (const s of c.t.giftSpawners) if (s.pos && inW(s.area)) add('gift', s, 1.6);
  for (const s of c.t.areaChests) if (s.pos && inW(s.area)) add('areachest', s, 1.6);
  for (const o of c.t.worldObjects || []) if (o.pos && inW(o.area)) add('decor', { ...o, kind: o.type }, 0);
  (W.gates || []).forEach((gt, k) => {
    const mx = (gt.a[0] + gt.b[0]) / 2, mz = (gt.a[1] + gt.b[1]) / 2, q = G.toPx(mx, mz);
    objects.push({ type: 'gatebar', id: gt.id, gate: k, needs: gt.needs, to: gt.to, x: q.x, y: q.y, r: (gt.w / 2 + 2) * ppm, open: () => G.gateOpen[k] === 1, def: gt });
  });
  for (const ex of W.exits || []) { const q = at(ex.p); objects.push({ type: 'gate', to: ex.to, x: q.x, y: q.y, r: 1.8 * ppm, open: () => !ex.needs || !!g.state.world.cleared[ex.needs] }); }
  const groups = [];
  for (const gr of [...c.t.spawnGroups, ...c.t.resourceGroups]) if (gr.pos && inW(gr.area)) { const q = at(gr.pos, gr.area, gr.roam); groups.push({ ...gr, x: q.x, y: q.y, r: (gr.r || 2) * ppm }); }
  return { id: W.id, kind: 'world', world: W, grid: G, w: G.w, h: G.h, groups, objects,
    entryOf: (a) => { const e = W.entries[a] || W.entries.base; const q = G.toPx(e[0], e[1]); return { x: q.x, y: q.y }; } };
}

export function buildMap(g, areaId) {
  const W = worldOf(g, areaId);
  if (W) { const m = buildWorldMap(g, W); m.entry = m.entryOf(areaId); return m; }
  const c = g.c, a = c.get('areas', areaId);
  const G = buildGrid(rectWorld(areaId, a.w, a.h, 'ch' + a.chapter));
  const objects = [{ type: 'gate', to: a.prev, x: a.entry.x, y: a.h - 80, r: 60, open: () => true, back: true }];
  if (a.next) objects.push({ type: 'gate', to: a.next, x: a.gate.x, y: a.gate.y + 40, r: 70, open: () => !!g.state.world.cleared[a.id] });
  for (const s of c.t.chestSpawners) if (s.area === areaId) objects.push({ type: 'chest', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const s of c.t.giftSpawners) if (s.area === areaId) objects.push({ type: 'gift', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const s of c.t.areaChests) if (s.area === areaId) objects.push({ type: 'areachest', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const n of c.t.npcs) if (n.area === areaId) objects.push({ type: 'npc', ...n, r: 70 });
  return { id: areaId, kind: 'field', w: a.w, h: a.h, entry: a.entry, area: a, grid: G, entryOf: () => a.entry,
    groups: [...c.t.spawnGroups, ...c.t.resourceGroups].filter((s) => s.area === areaId), objects };
}
export function arenaMap() { return { id: 'arena', kind: 'arena', w: 900, h: 1200, entry: { x: 450, y: 900 }, groups: [], objects: [], grid: buildGrid(rectWorld('arena', 900, 1200, 'arena')) }; }

// Synthetische Gegnervariante für Modi (Tower/Tomb/Raid) aus der gemeinsamen Kurve.
export function modeVariant(g, level, rank, hpMult = 1) {
  const st = mobStats(g.c.cfg, level, rank);
  return { id: `mode_${rank}_${level}`, monster: 'mode', name: rank === 'boss' ? 'Boss' : rank === 'elite' ? 'Elite' : 'Gegner', level, rank, ...st, hp: Math.round(st.hp * hpMult),
    beh: rank === 'boss' ? 'boss' : 'melee', drops: [], xp: 0, gold: 0 };
}

export class World {
  // hooks: { onKill(e, world), onPickup(drop) -> bool, interact(obj, world) }
  constructor(g, map, hooks = {}, mode = null) {
    this.g = g; this.map = map; this.hooks = hooks; this.mode = mode;
    this.t = 0; this.enemies = []; this.proj = []; this.drops = []; this.texts = []; this.fx = []; this.events = [];
    this.cells = new Map(); this.cellPool = [];
    this.dmgDealt = 0; this.ended = null; this.pending = null; this.ix = 0; this.respT = 0; this.wave = -1; this.near = null;
    const pl = g.c.cfg.player;
    this.p = { x: map.entry.x, y: map.entry.y, px: map.entry.x, py: map.entry.y, hp: g.stats.hp, alive: true, mx: 0, my: 0, auto: false, tgt: null,
      wcd: [0, 0, 0, 0, 0, 0], scd: {}, r: pl.radius, stuckT: 0, stuckD: 0, skip: {}, hero: g.stats.heroId, teamIdx: 0 };
    this.statsRev = -1; this.load = []; this.G = map.grid; this.updateGates();
    for (const gr of map.groups) this.spawnGroup(gr);
    if (mode) this.timer = mode.timer;
  }

  // ---- Spawns
  spawnGroup(gr) {
    const g = this.g, v = g.c.get('variants', gr.v), now = g.now();
    const rs = (g.state.world.respawn[gr.id] ||= []);
    for (let i = 0; i < gr.count; i++) {
      const ang = (i / gr.count) * 6.283 + gr.x, rad = gr.count > 1 ? gr.r * (0.35 + 0.6 * ((i * 7) % 5) / 5) : 0;
      let x = clamp(gr.x + Math.cos(ang) * rad, 30, this.map.w - 30), y = clamp(gr.y + Math.sin(ang) * rad, 30, this.map.h - 30);
      if (!walkable(this.G, x, y)) { x = gr.x; y = gr.y; }
      const e = this.makeEnemy(v, x, y);
      e.gid = gr.id; e.slot = i; e.group = gr;
      if (!this.areaOpen(gr.area)) { e.alive = false; e.st = 'locked'; } else if (now < (rs[i] || 0)) { e.alive = false; e.st = 'dead'; }
      this.enemies.push(e);
    }
  }
  makeEnemy(v, x, y) {
    let beh = this.g.c.get('behaviors', v.beh);
    // Verhalten aus den Spieldaten (falls vorhanden): Sicht- und Aktionsweite, Takt, Reichweite, Tempo, Rudel, Rückzugsradius
    const ai = v.ai, cb = this.g.c.cfg.combat;
    if (ai && beh.id !== 'node') beh = { ...beh, aggro: (ai.s === 3 ? ai.sight : ai.a === 3 ? ai.action : 0) * M, leash: cb.enemyLeashM * M, speed: Math.min(cb.enemySpeedCap, (ai.move / 10) * M), range: Math.max(30, ai.range * M - 20),
      interval: Math.max(0.2, 1 / (ai.aps || 0.8) - beh.windup), assist: ai.flock > 1 ? 4 * M : 0, flock: ai.flock, passive: !(ai.s === 3 || ai.a === 3), onHit: ai.d };
    return { v, beh, x, y, px: x, py: y, hx: x, hy: y, hp: v.hp, maxHp: v.hp, st: 'spawn', t: 0.4, cd: 0, alive: true, slowT: 0, stunT: 0, burnT: 0, burnN: 0, burnAcc: 0,
      pcd: beh.pattern ? this.g.c.get('bossPatterns', beh.pattern).period : 0, tx: x, ty: y, cx: 0, cy: 0, ang: (this.eSeq = (this.eSeq || 0) + 1) * 2.399, r: v.rank === 'boss' ? 34 : v.rank === 'elite' ? 24 : 16 };
  }
  // Gebiet freigeschaltet? (Basis und Greenhaven immer; sonst Boss-Erstsieg des Vorgängers). Gesperrte Gebiete spawnen nichts.
  areaOpen(areaId) {
    if (!areaId || areaId === 'base' || areaId === 'arena') return true;
    const a = this.g.c.by.areas.get(areaId);
    return !a || a.prev === 'base' || !!this.g.state.world.cleared[a.prev];
  }
  updateGates() {
    const W = this.map.world;
    if (W) (W.gates || []).forEach((gt, k) => { this.G.gateOpen[k] = !gt.needs || this.g.state.world.cleared[gt.needs] ? 1 : 0; });
    if (W && W.map) W.zones.forEach((z, k) => { this.G.zoneOpen[k] = this.areaOpen(z.id) ? 1 : 0; });
  }
  // Wegpunkte bis (x, y) berechnen und folgen (Auto-Hunt, Bots, Zielführung). Liefert verbleibende Distanz.
  follow(x, y, dt, stopAt = 0) {
    const p = this.p, d = Math.hypot(x - p.x, y - p.y);
    if (d <= stopAt) { p.mx = p.my = 0; p.path = null; return d; }
    p.pathT = (p.pathT || 0) - dt;
    if (!p.path || p.pathT <= 0 || !p.path.length || Math.hypot(p.pathTo.x - x, p.pathTo.y - y) > 80) {
      p.path = los(this.G, p.x, p.y, x, y, 20) ? [{ x, y }] : findPath(this.G, p.x, p.y, x, y, 20000);
      p.pathTo = { x, y }; p.pathT = 0.75;
      if (!p.path) { p.mx = p.my = 0; return Infinity; }
    }
    while (p.path.length > 1 && Math.hypot(p.path[0].x - p.x, p.path[0].y - p.y) < 24) p.path.shift();
    const w = p.path[0], wd = Math.hypot(w.x - p.x, w.y - p.y) || 1;
    p.mx = (w.x - p.x) / wd; p.my = (w.y - p.y) / wd;
    return d;
  }
  goTo(x, y) { this.p.goal = x == null ? null : { x, y }; this.p.path = null; }
  nextWave() {
    const m = this.mode;
    this.wave++;
    if (this.wave >= m.waves.length) return this.end(true);
    let k = 0;
    for (const grp of m.waves[this.wave]) for (let i = 0; i < grp.count; i++, k++) {
      const v = grp.v || modeVariant(this.g, m.level, grp.rank, grp.hpMult || 1);
      const en = this.makeEnemy(v, 150 + ((k * 137) % 600), 180 + ((k * 71) % 320));
      if (m.kind === 'raid' && m.mech && v.rank === 'boss') { en.v = { ...v }; en.mech = m.mech; en.mcd = m.mech.period || 0; en.baseAtk = v.atk; }
      this.enemies.push(en);
    }
  }
  end(win) {
    if (this.ended) return;
    this.ended = { win, dmg: this.dmgDealt, hpPct: this.p.alive ? Math.round((100 * this.p.hp) / this.g.stats.hp) : 0, time: this.t, auto: this.p.auto };
  }

  // ---- Ausrüstung -> Kampfwerte (nur bei Stat-Änderung neu aufgebaut)
  loadout() {
    const g = this.g;
    if (this.statsRev === g.statsRev) return this.load;
    this.statsRev = g.statsRev;
    const cb = g.c.cfg.combat, st = g.stats, out = [];
    g.state.weapons.slots.forEach((uid, slot) => {
      const w = uid && g.state.weapons.list.find((x) => x.uid === uid);
      if (!w) return;
      const d = g.c.get('weapons', w.def), cls = g.c.get('weaponClasses', d.cls), sub = slot > 0;
      // Takt und Reichweite je Waffe aus den Spieldaten; Nebenwaffen haben eine eigene feste Reichweite
      out.push({ slot, cls, sub, dmg: (st.atk + weaponDmg(g, w)) * cls.basicMult * (sub ? cb.subDmgMult : 1),
        interval: ((d.aps ? 1 / d.aps : cls.interval) * (sub ? cb.subIntervalMult : 1)) / (1 + st.atkSpeedPct / 100), range: sub ? cb.subRangeM * M : d.rangeM ? d.rangeM * M : cls.range, skill: d.skill ? (() => { const k = g.c.get('skills', d.skill); return d.skMult ? { ...k, name: d.skName || k.name, mult: d.skMult / (k.hits || 1), cd: d.skCd || k.cd } : k; })() : null, wskill: d.wskill || null }); // S-Fertigkeit: Gesamtfaktor der Referenz auf die Treffer verteilt
    });
    if (!out.length) out.push({ slot: 0, cls: { id: 'fist', melee: true, range: 50, targets: 1, aoe: 0, proj: 0 }, sub: false, dmg: st.atk, interval: 1 / cb.fistAps / (1 + st.atkSpeedPct / 100), range: 2 * M, skill: null });
    const h = g.c.get('heroes', st.heroId);
    this.heroSkill = h.skill ? g.c.get('skills', h.skill) : null;
    this.p.hp = Math.min(this.p.hp, st.hp);
    return (this.load = out);
  }

  // ---- räumlicher Index
  rebuildGrid() {
    for (const arr of this.cells.values()) { arr.length = 0; this.cellPool.push(arr); }
    this.cells.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const k = Math.floor(e.x / CELL) * 1000 + Math.floor(e.y / CELL);
      let arr = this.cells.get(k);
      if (!arr) { arr = this.cellPool.pop() || []; this.cells.set(k, arr); }
      arr.push(e);
    }
  }
  query(x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const arr = this.cells.get(cx * 1000 + cy);
      if (arr) for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (e.alive && dist2(x, y, e.x, e.y) <= (r + e.r) * (r + e.r)) fn(e); }
    }
  }
  nearest(x, y, r, pred) {
    let best = null, bd = Infinity;
    this.query(x, y, r, (e) => { if (pred && !pred(e)) return; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } });
    return best;
  }

  // ---- Schaden
  hit(e, base, kind, skill = false) {
    if (!e.alive || e.st === 'spawn') return;
    // Raid: Panzer blockt Treffer (Fernangriffe prallen auf die Figur zurück), Schild fängt Schaden ab
    if (e.shell > 0) { e.shell--; this.text(e.x, e.y - e.r, 0, 1); if (kind === 'ranged') this.hurt(Math.round(e.baseAtk * 0.5)); return; }
    const g = this.g, st = g.stats;
    let dmg = base * (1 + st.dmgPct / 100) * (1 + (kind === 'melee' ? st.meleePct : st.rangedPct) / 100);
    if (skill) dmg *= 1 + st.skillDmgPct / 100;
    if (e.v.rank === 'boss') dmg *= 1 + st.bossDmgPct / 100;
    const crit = rnd(g.state.rng, 'world') * 100 < st.critChance;
    if (crit) dmg *= st.critDmg / 100;
    dmg = Math.max(1, Math.round(dmg));
    if (e.shield > 0) { const ab = Math.min(e.shield, dmg); e.shield -= ab; dmg -= ab; if (dmg <= 0) { this.text(e.x, e.y - e.r, 0, 1); return; } }
    const dealt = Math.min(dmg, e.hp); // Overkill zählt nicht als Schaden
    e.hp -= dealt; e.hitT = this.t; this.dmgDealt += dealt;
    if (st.lifesteal > 0 && this.p.alive) this.p.hp = Math.min(st.hp, this.p.hp + (dealt * st.lifesteal) / 100);
    this.text(e.x, e.y - e.r, dmg, crit ? 2 : 1);
    // Reaktion auf Treffer laut Daten: 3 kämpfen (und Rudel alarmieren), 4 fliehen, 0/1 ignorieren. Ohne Daten: kämpfen.
    if (e.beh.id !== 'node' && (e.st === 'idle' || e.st === 'patrol' || e.st === 'return')) { const oh = e.beh.onHit; if (oh === undefined || oh === 3 || oh === 4 || oh === 2) { e.st = 'chase'; e.provoked = true; if (e.beh.assist) this.rally(e); } }
    if (e.hp <= 0) this.kill(e);
  }
  status(e, id, dur) {
    const s = this.g.c.get('statuses', id);
    if (s.bossImmune && e.v.rank === 'boss') return;
    if (id === 'slow') e.slowT = s.refresh === 'renew' ? dur : Math.max(e.slowT, dur);
    else if (id === 'stun') { if (e.stunT <= 0) e.stunT = dur; } else if (id === 'burn') { e.burnN = Math.min(s.maxStacks, e.burnN + 1); e.burnT = dur; }
  }
  // Raid-Mechanik des Bosses (eine je Boss, Stufe Normal)
  raidMech(e, dt, load) {
    const m = e.mech, p = this.p, atk = e.baseAtk;
    if (m.id === 'shell') { if (!e.shellUsed && e.hp < (e.maxHp * m.hpPct) / 100) { e.shellUsed = true; e.shell = m.hits; this.fx.push({ x: e.x, y: e.y, r: e.r * 3, t: 0.5, k: 0 }); } return; }
    if (m.id === 'summon') e.v.atk = Math.round(atk * (1 + (this.enemies.filter((x) => x.alive && x.minion).length * m.atkPerMinionPct) / 100));
    if (e.mch > 0) { // Aufladen läuft
      e.mch -= dt;
      if (e.mch > 0) return;
      if (m.id === 'festival') { if (p.alive && load[0] && !load[0].cls.melee) { const before = p.hp; this.hurt(Math.round(atk * m.mult)); e.hp = Math.min(e.maxHp, e.hp + ((before - p.hp) * m.healPct) / 100); } }
      else if (m.id === 'wind') { const d = Math.hypot(p.x - e.x, p.y - e.y) || 1; if (p.alive && d < m.radius) { this.hurt(Math.round(atk * m.mult)); [p.x, p.y] = slide(this.G, p.x, p.y, p.x + ((p.x - e.x) / d) * m.knock, p.y + ((p.y - e.y) / d) * m.knock, p.r); p.slowT = m.slowSec; } }
      else if (m.id === 'fairy') { if (p.alive) { this.hurt(Math.round(atk * m.mult)); p.dot = { t: m.poisonSec, dps: (atk * m.poisonPct) / 100, acc: 0 }; } e.shield = (e.shield || 0) + (e.maxHp * m.shieldPct) / 100; }
      else if (m.id === 'hellfire') { if (p.alive) { this.hurt(Math.round(atk * m.mult)); p.dot = { t: m.burnSec, dps: (atk * m.burnPct) / 100, acc: 0 }; } }
      this.fx.push({ x: m.id === 'wind' ? e.x : p.x, y: m.id === 'wind' ? e.y : p.y, r: m.radius || 120, t: 0.35, k: 2 });
      return;
    }
    if ((e.mcd -= dt) > 0) return;
    e.mcd = m.period;
    if (m.id === 'summon') { for (let k = 0; k < m.count && this.enemies.length < 40; k++) { const a = (k / m.count) * 6.283, mn = this.makeEnemy({ ...modeVariant(this.g, this.mode.level, 'normal', 0.6), name: 'Mumie', monster: 'mummy' }, clamp(e.x + Math.cos(a) * 160, 40, this.map.w - 40), clamp(e.y + Math.sin(a) * 160, 40, this.map.h - 40)); mn.minion = true; this.enemies.push(mn); } return; }
    e.mch = m.charge || 1; e.tele = { t: e.mch, r: m.radius || 120 }; // Ankündigung für die Darstellung
  }
  // Rudel: nahe Artgenossen derselben Gruppe greifen mit an (höchstens Rudelgröße - 1)
  rally(e) {
    let n = (e.beh.flock || 3) - 1; const r2 = e.beh.assist ** 2;
    for (const o of this.enemies) { if (n <= 0) break; if (o !== e && o.alive && o.gid === e.gid && (o.st === 'idle' || o.st === 'patrol') && dist2(o.x, o.y, e.x, e.y) < r2 * 4) { o.st = 'chase'; o.provoked = true; n--; } }
  }
  kill(e) {
    if (!e.alive) return; // genau einmal pro Tod
    e.alive = false; e.st = 'dead';
    if (e.v.rank !== 'node') this.fx.push({ x: e.x, y: e.y, r: e.r * 2.2, t: 0.4, k: 3 }); // Auflösung beim Tod
    if (this.hooks.onKill) this.hooks.onKill(e, this);
  }
  hurt(n) {
    const p = this.p;
    if (!p.alive || this.ended) return;
    p.hp -= n; p.hurtT = this.t; this.text(p.x, p.y - 20, n, 3);
    if (p.hp <= 0) { p.hp = 0; p.alive = false; this.events.push({ type: 'dead' }); if (this.hooks.onDeath) this.hooks.onDeath(this); }
  }
  text(x, y, n, kind) { if (this.texts.length < 60) this.texts.push({ x, y, n, kind, t: 0.7 }); }
  spawnDrop(item, n, x, y) {
    if (this.drops.length >= 300) this.drops.shift();
    let dx = clamp(x, 20, this.map.w - 20), dy = clamp(y, 20, this.map.h - 20);
    if (!walkable(this.G, dx, dy)) { const q = snap(this.G, dx, dy, 4); if (q) { dx = q.x; dy = q.y; } }
    this.drops.push({ item, n, x: dx, y: dy, t: this.g.c.cfg.combat.dropDespawnSec });
  }

  // ---- Angriffe
  fire(l, tgt, bonus = false) {
    const p = this.p, st = this.g.stats, kind = l.cls.melee ? 'melee' : 'ranged';
    if (!bonus) (p.wfire ||= {})[l.slot] = { t: this.t, a: Math.atan2(tgt.x - p.x, tgt.y - p.y) }; // für die Schlag-Animation
    if (l.cls.melee) {
      let n = 0;
      this.query(p.x, p.y, l.range, (e) => { if (n < l.cls.targets) { n++; this.hit(e, l.dmg, kind); } });
      this.fx.push({ x: p.x, y: p.y, r: l.range, t: 0.12, k: 0 });
    } else {
      const d = Math.hypot(tgt.x - p.x, tgt.y - p.y) || 1;
      if (this.proj.length < 200) this.proj.push({ x: p.x, y: p.y, vx: ((tgt.x - p.x) / d) * l.cls.proj, vy: ((tgt.y - p.y) / d) * l.cls.proj, life: (l.range * 1.3) / l.cls.proj, dmg: l.dmg, aoe: l.cls.aoe, hostile: false });
    }
    if (!bonus && st.tripleHit > 0 && rnd(this.g.state.rng, 'world') * 100 < st.tripleHit) { this.fire(l, tgt, true); this.fire(l, tgt, true); }
    else if (!bonus && st.multiHit > 0 && rnd(this.g.state.rng, 'world') * 100 < st.multiHit) this.fire(l, tgt, true);
  }
  cast(sk, tgt, base) {
    const p = this.p, st = this.g.stats;
    if (sk.shape === 'heal') { p.hp = Math.min(st.hp, p.hp + (st.hp * sk.healPct) / 100); return; }
    const cx = sk.shape === 'aoeSelf' ? p.x : tgt.x, cy = sk.shape === 'aoeSelf' ? p.y : tgt.y;
    for (let h = 0; h < sk.hits; h++) {
      const ox = sk.hits > 2 && sk.shape === 'aoeTarget' ? (rnd(this.g.state.rng, 'world') - 0.5) * sk.radius : 0, oy = sk.hits > 2 && sk.shape === 'aoeTarget' ? (rnd(this.g.state.rng, 'world') - 0.5) * sk.radius : 0;
      if (sk.shape === 'line') {
        const d = Math.hypot(tgt.x - p.x, tgt.y - p.y) || 1;
        for (let s = 1; s <= 4; s++) this.query(p.x + ((tgt.x - p.x) / d) * s * 70, p.y + ((tgt.y - p.y) / d) * s * 70, sk.radius, (e) => { if (e.lastSk !== this.t) { e.lastSk = this.t; this.hit(e, base * sk.mult, 'melee', true); } });
      } else this.query(cx + ox, cy + oy, sk.radius, (e) => { this.hit(e, base * sk.mult, 'ranged', true); if (sk.status && e.alive) this.status(e, sk.status, sk.dur); });
      this.fx.push({ x: cx + ox, y: cy + oy, r: sk.radius, t: 0.25, k: 1 });
    }
  }

  // Lohnt der Bosskampf? Grobe Rechnung: Zeit, bis der Boss fällt (Leben / eigener Schaden je Sekunde), gegen Zeit, bis die Figur fällt
  // (eigenes Leben / Boss-Schaden je Sekunde inkl. Regeneration). Die Auto-Jagd greift erst an, wenn der Boss mit Sicherheitsabstand zuerst fällt.
  bossReady(e) {
    const st = this.g.stats, cfg = this.g.c.cfg, load = this.loadout();
    let dps = 0;
    for (const l of load) dps += (l.dmg * (1 + st.dmgPct / 100) * (1 + ((st.critChance / 100) * (st.critDmg - 100)) / 100)) / l.interval;
    const taken = e.v.atk / (e.beh.interval + e.beh.windup) - (st.regen + (st.hp * cfg.player.regenPct) / 100);
    return taken <= 0 || e.v.hp / Math.max(1, dps) < (st.hp / taken) * cfg.world.autoBossSafety;
  }
  // ---- Auto-Hunt: Zielwahl, Annäherung, Stuck-Erkennung, volles Cargo, Wiederaufnahme
  autoHunt(dt, load) {
    const p = this.p, g = this.g, bossOk = this.mode || g.state.settings.autoBoss;
    if (!this.mode && this.hooks.cargoFull && this.hooks.cargoFull() && g.state.settings.autoReturn) { this.pending = { travel: 'base', autoBack: g.state.world.area }; return; }
    // Jagdgebiet = Gebiet, in dem die Auto-Jagd eingeschaltet wurde (aus der Basis heraus: das erste betretene). Sie wandert nicht in stärkere Nachbargebiete.
    if (!this.mode && this.map.world && !p.huntArea) { const z = this.zone(); if (z && z !== 'base') p.huntArea = z; }
    // Beute einsammeln: liegt nach einem Kampf etwas in der Nähe (z. B. nach Fernkampf oder Flächenschaden), läuft die Figur erst dorthin
    if (!this.mode && (!p.tgt || !p.tgt.alive) && this.drops.length) {
      let bd = (9 * M) ** 2, drop = null;
      for (const d of this.drops) { const dd = dist2(p.x, p.y, d.x, d.y); if (dd < bd && d.t > 1) { bd = dd; drop = d; } }
      if (drop && bd > (g.c.cfg.player.pickupRadius * 0.6) ** 2 && (p.lootT = (p.lootT || 0) + dt) < 6) { this.follow(drop.x, drop.y, dt, 10); return; }
      if (!drop) p.lootT = 0;
    } else p.lootT = 0;
    // Quest-Modus (Einstellung autoMode: 'quest' = Standard, 'near' = nächster Gegner): Ziel ist die Monsterart bzw. der Boss der offenen Quest,
    // auch in einem anderen offenen Gebiet. Ist gerade keins am Leben, wartet die Figur an dessen Spawnplatz.
    let focus = null;
    if (!this.mode && this.map.world && g.state.settings.autoMode !== 'near' && this.hooks.questFocus) {
      if (!(p.focusT > this.t)) { p.focusT = this.t + 1; p.focus = this.hooks.questFocus(); }
      focus = p.focus;
    }
    if (focus) {
      const want = (e) => e.gid && e.group && this.areaOpen(e.group.area) && (focus.monsters.includes(e.v.monster) || (e.v.rank === 'boss' && focus.bosses.includes(e.group.area) && (bossOk || this.bossReady(e))));
      if (!p.tgt || !p.tgt.alive || !want(p.tgt)) {
        let best = null, bd = Infinity, home = null, hd = Infinity;
        for (const e of this.enemies) { if (!want(e)) continue; const d = dist2(p.x, p.y, e.alive ? e.x : e.hx, e.alive ? e.y : e.hy); if (e.alive && p.skip[e.gid + ':' + e.slot] > this.t) continue; if (e.alive) { if (d < bd) { bd = d; best = e; } } else if (d < hd) { hd = d; home = e; } }
        if (best) { p.tgt = best; p.huntArea = best.group.area; p.stuckT = 0; p.stuckD = bd; p.path = null; }
        else if (home) { p.tgt = null; p.huntArea = home.group.area; if (hd > (1.5 * M) ** 2) this.follow(home.hx, home.hy, dt, M); else p.mx = p.my = 0; return; }
      }
    }
    if (!p.tgt || !p.tgt.alive || p.skip[p.tgt.gid + ':' + p.tgt.slot] > this.t) {
      const R2 = (g.c.cfg.world.activeRadiusM * (this.map.world ? this.map.world.ppm : M)) ** 2, cand = [];
      for (const e of this.enemies) {
        if (!e.alive || (e.v.rank === 'boss' && !bossOk) || p.skip[e.gid + ':' + e.slot] > this.t || (p.huntArea && e.group && e.group.area !== p.huntArea)) continue;
        // Ohne Quest-Vorgabe meidet die Auto-Jagd Gegner über dem eigenen Level (normale ab +3, Elite/Selten/Spezial ab +2)
        if (!this.mode && e.v.rank !== 'node' && e.v.rank !== 'boss' && e.v.level > g.state.player.level + (e.v.rank === 'normal' ? 2 : 1)) continue;
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < R2) cand.push([e.v.rank === 'node' ? d + R2 : d, e]); // Rohstoffe erst, wenn kein Gegner in Reichweite ist
      }
      cand.sort((a, b) => a[0] - b[0]);
      p.tgt = null;
      for (const [d, e] of cand.slice(0, 6)) { if (los(this.G, p.x, p.y, e.x, e.y) || findPath(this.G, p.x, p.y, e.x, e.y, 3000)) { p.tgt = e; p.stuckD = d; break; } p.skip[e.gid + ':' + e.slot] = this.t + 10; }
      p.stuckT = 0; p.path = null;
    }
    const t = p.tgt;
    if (!t) { p.mx = p.my = 0; return; }
    const want = load[0].range * 0.85, d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d <= want && los(this.G, p.x, p.y, t.x, t.y)) { p.mx = p.my = 0; } else this.follow(t.x, t.y, dt, 0);
    // kein Fortschritt (Entfernung oder Schaden) über 6 s -> Ziel vorübergehend überspringen, keine Endlosschleife
    p.stuckT += dt;
    if (p.stuckT > 6) {
      const prog = d * d < p.stuckD * 0.8 || t.hp < (p.stuckHp || Infinity);
      if (!prog) p.skip[t.gid + ':' + t.slot] = this.t + 15, p.tgt = null;
      p.stuckT = 0; p.stuckD = d * d; p.stuckHp = t.hp;
    }
  }

  // ---- ein fester Simulationsschritt
  step(dt) {
    if (this.ended) return;
    const g = this.g, st = g.stats, p = this.p, cfg = g.c.cfg, load = this.loadout();
    this.t += dt;
    p.px = p.x; p.py = p.y;
    for (const e of this.enemies) { e.px = e.x; e.py = e.y; }
    if (this.mode) {
      if (this.wave < 0 || !this.enemies.some((e) => e.alive)) { this.enemies.length = 0; this.nextWave(); if (this.ended) return; }
      this.timer -= dt;
      if (this.timer <= 0) return this.end(this.mode.timeoutWin === true);
    }
    this.rebuildGrid();
    if (p.alive) {
      if (!p.auto) p.huntArea = null;
      if (p.auto) this.autoHunt(dt, load);
      else if (p.goal) { if (this.follow(p.goal.x, p.goal.y, dt, 20) <= 20) p.goal = null; }
      // Raid-Effekte auf der Figur: Verlangsamung (Lauf- und Angriffstempo), Gift/Brand als Schaden über Zeit
      const slowP = p.slowT > 0 ? ((p.slowT -= dt), 0.6) : 1;
      if (p.dot && p.dot.t > 0) { p.dot.t -= dt; p.dot.acc += p.dot.dps * dt; if (p.dot.acc >= 1) { const n = Math.floor(p.dot.acc); p.dot.acc -= n; this.hurt(n); } }
      const sp = cfg.player.moveSpeed * (1 + st.moveSpeedPct / 100) * slowP, ml = Math.hypot(p.mx, p.my);
      if (ml > 0.05) { const k = Math.min(1, ml) / ml; [p.x, p.y] = slide(this.G, p.x, p.y, p.x + p.mx * k * sp * dt, p.y + p.my * k * sp * dt, p.r); }
      p.hp = Math.min(st.hp, p.hp + (st.regen + (st.hp * cfg.player.regenPct) / 100) * dt);
      // Hauptwaffe hält ihr Ziel, bis es stirbt oder die Reichweite verlässt; Nebenwaffen/Skills mit eigenen Takten
      // Schutzzone gilt in beide Richtungen: in der Basis wird nicht angegriffen (sonst gefahrloses Farmen mit Fernwaffen vom Rand aus)
      const inSafe = !this.mode && !!this.map.world && this.zone() === 'base';
      if (!inSafe) for (const l of load) {
        p.wcd[l.slot] -= dt * slowP;
        if (l.wskill && p.wsc && p.wsc[l.slot] > 0) p.wsc[l.slot] -= dt;
        if (p.wcd[l.slot] <= 0) {
          let tgt = l.slot === 0 && p.cur && p.cur.alive && dist2(p.x, p.y, p.cur.x, p.cur.y) <= (l.range + p.cur.r) ** 2 ? p.cur : this.nearest(p.x, p.y, l.range);
          if (tgt) {
            if (l.slot === 0) p.cur = tgt;
            this.fire(l, tgt); p.wcd[l.slot] = l.interval;
            // Waffen-Fertigkeit: löst nach ihrer Abklingzeit beim nächsten Angriff aus – Zusatzschlag mit dem Gesamtfaktor der Waffe, flächig am Ziel
            if (l.wskill && ((p.wsc ||= {})[l.slot] ?? 0) <= 0) {
              p.wsc[l.slot] = (l.wskill.cd || 8) * (1 - st.cooldownPct / 100);
              const tx = tgt.x, ty = tgt.y, R = cfg.combat.weaponSkillRadius;
              this.query(tx, ty, R, (e) => this.hit(e, l.dmg * l.wskill.mult, l.cls.melee ? 'melee' : 'ranged', true));
              this.fx.push({ x: tx, y: ty, r: R, t: 0.3, k: 1 });
              (p.wsk ||= {})[l.slot] = { t: this.t, a: Math.atan2(tx - p.x, ty - p.y), x: tx, y: ty };
            }
          } else p.wcd[l.slot] = 0;
        }
        if (l.skill) this.trySkill(l.skill, 'w' + l.slot, l.dmg, dt);
      }
      if (this.heroSkill && !inSafe) this.trySkill(this.heroSkill, 'hero', st.atk, dt);
    }
    this.stepEnemies(dt);
    // Projektile
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const b = this.proj[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let done = b.life <= 0;
      if (!done && b.hostile) { if (p.alive && dist2(b.x, b.y, p.x, p.y) < (p.r + 8) ** 2) { this.hurt(b.dmg); done = true; } } else if (!done) {
        const e = this.nearest(b.x, b.y, 8);
        if (e) { if (b.aoe) { this.query(b.x, b.y, b.aoe, (x) => this.hit(x, b.dmg, 'ranged')); this.fx.push({ x: b.x, y: b.y, r: b.aoe, t: 0.15, k: 1 }); } else this.hit(e, b.dmg, 'ranged'); done = true; }
      }
      if (done) { this.proj[i] = this.proj[this.proj.length - 1]; this.proj.pop(); }
    }
    // Drops aufnehmen (Cargo-pflichtige Beute bleibt liegen, wenn kein Platz ist)
    const pr2 = cfg.player.pickupRadius ** 2;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t -= dt;
      let gone = d.t <= 0;
      // Beute fliegt der Figur entgegen, sobald sie in der Nähe ist (Fracht-Beute nur, wenn noch Platz ist)
      if (!gone && p.alive) { const dd = dist2(d.x, d.y, p.x, p.y); if (dd < pr2 * 6 && dd > 1 && !(this.hooks.cargoFull && this.hooks.cargoFull() && g.c.by.items.get(d.item) && g.c.by.items.get(d.item).cargo > 0)) { const dl = Math.sqrt(dd), k = Math.min(1, (520 * dt) / dl); d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k; } }
      if (!gone && p.alive && dist2(d.x, d.y, p.x, p.y) < pr2 && this.hooks.onPickup) gone = this.hooks.onPickup(d, this);
      if (gone) { this.drops[i] = this.drops[this.drops.length - 1]; this.drops.pop(); }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const x = this.texts[i]; x.t -= dt; x.y -= 30 * dt; if (x.t <= 0) this.texts.splice(i, 1); }
    for (let i = this.fx.length - 1; i >= 0; i--) { this.fx[i].t -= dt; if (this.fx[i].t <= 0) this.fx.splice(i, 1); }
    // Respawn (Feld, echte Zeit) und Interaktionen in gröberem Takt
    this.respT -= dt;
    if (this.respT <= 0) {
      this.respT = 0.25;
      if (!this.mode) {
        const now = g.now(), rs = g.state.world.respawn;
        this.updateGates();
        for (const e of this.enemies) if (!e.alive && e.gid && now >= ((rs[e.gid] || [])[e.slot] || 0) && this.areaOpen(e.group.area)) {
          Object.assign(e, { x: e.hx, y: e.hy, px: e.hx, py: e.hy, hp: e.maxHp, alive: true, st: 'spawn', t: 0.5, cd: 0, slowT: 0, stunT: 0, burnT: 0, burnN: 0 });
        }
        this.interact();
      }
    }
  }
  trySkill(sk, key, base, dt) {
    const p = this.p, cd = (p.scd[key] = (p.scd[key] ?? 1) - dt);
    if (cd > 0) return;
    if (sk.shape === 'heal') { if (p.hp < this.g.stats.hp * 0.6) { this.cast(sk, null, base); p.scd[key] = sk.cd * (1 - this.g.stats.cooldownPct / 100); } else p.scd[key] = 0; return; }
    const tgt = this.nearest(p.x, p.y, sk.range);
    if (!tgt) { p.scd[key] = 0; return; }
    this.cast(sk, tgt, base);
    p.scd[key] = sk.cd * (1 - this.g.stats.cooldownPct / 100);
  }

  stepEnemies(dt) {
    const g = this.g, p = this.p, sts = g.c.by.statuses, slowM = sts.get('slow').speedMult, burn = sts.get('burn');
    const G = this.G, far2 = (g.c.cfg.world.activeRadiusM * (this.map.world ? this.map.world.ppm : M)) ** 2;
    // Die Basis ist Schutzzone: Gegner betreten sie nie und lassen vom Spieler ab, sobald er dort steht.
    const safe = (x, y) => !this.mode && !!this.map.world && zoneAt(G, x, y) === 'base', pSafe = safe(p.x, p.y);
    const move = (e, tx, ty, sp) => {
      const d = Math.hypot(tx - e.x, ty - e.y); if (d < 2) return true;
      const k = Math.min(1, (sp * dt) / d), ox = e.x, oy = e.y;
      [e.x, e.y] = slide(G, e.x, e.y, e.x + (tx - e.x) * k, e.y + (ty - e.y) * k, Math.min(e.r, 18));
      if (safe(e.x, e.y)) { e.x = ox; e.y = oy; }
      if (e.x === ox && e.y === oy) e.stuck = (e.stuck || 0) + dt; else e.stuck = 0;
      return d < 6;
    };
    const away = (e, sp) => { const d = Math.hypot(p.x - e.x, p.y - e.y) || 1, k = (sp * dt) / d, ox = e.x, oy = e.y; [e.x, e.y] = slide(G, e.x, e.y, e.x - (p.x - e.x) * k, e.y - (p.y - e.y) * k, 14); if (safe(e.x, e.y)) { e.x = ox; e.y = oy; } };
    // Alarm: wer den Spieler bemerkt, weckt ruhende Nachbarn im Umkreis (keine Kettenreaktion)
    const alert = (e) => {
      e.st = 'aggro'; e.t = 0.3;
      const r2 = (e.beh.assist || 0) ** 2;
      if (r2) for (const o of this.enemies) if (o !== e && o.alive && (o.st === 'idle' || o.st === 'patrol') && o.beh.aggro > 0 && !o.beh.flee && dist2(o.x, o.y, e.x, e.y) < r2 && los(G, o.x, o.y, e.x, e.y)) { o.st = 'aggro'; o.t = 0.45; }
    };
    const near = [];
    const sees = (e) => this.mode || (!pSafe && los(G, e.x, e.y, p.x, p.y));
    for (const e of this.enemies) {
      if (!e.alive) continue;
      // Ruhende Gegner außerhalb des aktiven Radius werden nicht simuliert (Zustand bleibt erhalten)
      if ((e.st === 'idle' || e.st === 'patrol') && dist2(e.x, e.y, p.x, p.y) > far2) continue;
      const b = e.beh;
      if (e.mech) this.raidMech(e, dt, this.load);
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnAcc += ((g.stats.atk * burn.dotPctAtk) / 100) * e.burnN * dt;
        if (e.burnAcc >= 1) { const n = Math.floor(e.burnAcc); e.burnAcc -= n; const dealt = Math.min(n, e.hp); e.hp -= dealt; this.dmgDealt += dealt; if (e.hp <= 0) { this.kill(e); continue; } }
        if (e.burnT <= 0) e.burnN = 0;
      }
      if (e.slowT > 0) e.slowT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      if (e.st === 'spawn') { if ((e.t -= dt) <= 0) e.st = 'idle'; continue; }
      if (b.id === 'node') continue;
      const sp = (e.v.speed || b.speed) * (e.slowT > 0 ? slowM : 1), d = Math.hypot(p.x - e.x, p.y - e.y), aggro = this.mode ? 9999 : b.aggro, leash = this.mode ? 99999 : b.leash;
      switch (e.st) {
        case 'spawn': if ((e.t -= dt) <= 0) e.st = 'idle'; break;
        case 'idle':
          if (p.alive && d < aggro && sees(e)) { alert(e); break; }
          if ((e.t -= dt) <= 0 && b.patrol > 0) {
            const a = rnd(g.state.rng, 'world') * 6.283, tx = clamp(e.hx + Math.cos(a) * b.patrol, 20, this.map.w - 20), ty = clamp(e.hy + Math.sin(a) * b.patrol, 20, this.map.h - 20);
            if (walkable(G, tx, ty) && los(G, e.hx, e.hy, tx, ty)) { e.tx = tx; e.ty = ty; e.st = 'patrol'; } else e.t = 2;
          }
          break;
        case 'patrol':
          if (p.alive && d < aggro && sees(e)) { alert(e); break; }
          if (move(e, e.tx, e.ty, sp * 0.4) || e.stuck > 1) { e.st = 'idle'; e.t = 1.5 + rnd(g.state.rng, 'world') * 3; }
          break;
        case 'aggro': if ((e.t -= dt) <= 0) e.st = 'chase'; break;
        case 'chase':
          // Verfolgung endet bei Leine, Tod des Spielers oder wenn der Spieler hinter Wänden festhängt (keine Endlosschleife)
          if (!p.alive || pSafe || dist2(e.x, e.y, e.hx, e.hy) > leash * leash || e.stuck > 2.5) { e.st = 'return'; e.stuck = 0; break; }
          if (b.flee) { if (d > aggro * 1.6) { e.st = 'return'; break; } away(e, sp); break; }
          if (b.pattern && !e.mech && (e.pcd -= dt) <= 0) { const pt = g.c.get('bossPatterns', b.pattern); e.st = 'cast'; e.t = pt.windup; e.cx = p.x; e.cy = p.y; e.pcd = pt.period * (e.hp < (e.maxHp * pt.enrageHpPct) / 100 ? pt.enrageIntervalMult : 1); break; }
          near.push(e);
          if (d <= b.range + p.r && (!b.proj || sees(e))) { e.st = 'attack'; e.t = b.windup; }
          else if (b.ring && d < b.range * 3 && !(e.stuck > 0.4)) move(e, p.x + Math.cos(e.ang) * b.range * 0.75, p.y + Math.sin(e.ang) * b.range * 0.75, sp); // eigener Platz im Ring um das Ziel
          else move(e, p.x, p.y, sp);
          break;
        case 'attack':
          if ((e.t -= dt) <= 0) {
            if (p.alive && d <= (b.range + p.r) * 1.25) {
              if (b.proj) { if (this.proj.length < 200) this.proj.push({ x: e.x, y: e.y, vx: ((p.x - e.x) / (d || 1)) * b.proj, vy: ((p.y - e.y) / (d || 1)) * b.proj, life: 1.4, dmg: e.v.atk, aoe: 0, hostile: true }); } else this.hurt(e.v.atk);
            }
            e.st = 'cool'; e.cd = b.interval;
          }
          break;
        case 'cool':
          near.push(e);
          if ((e.cd -= dt) <= 0) { e.st = 'chase'; break; }
          if (p.alive && ((b.keep && d < b.keep) || (b.backoff && e.cd > b.interval - b.backoff))) away(e, sp * 0.75);
          break;
        case 'cast':
          if ((e.t -= dt) <= 0) { const pt = g.c.get('bossPatterns', b.pattern); if (p.alive && dist2(p.x, p.y, e.cx, e.cy) < pt.radius * pt.radius) this.hurt(Math.round(e.v.atk * pt.mult)); this.fx.push({ x: e.cx, y: e.cy, r: pt.radius, t: 0.3, k: 2 });
            if (pt.nova && e.hp < (e.maxHp * pt.enrageHpPct) / 100) for (let k = 0; k < pt.nova && this.proj.length < 200; k++) { const a = (k / pt.nova) * 6.283; this.proj.push({ x: e.x, y: e.y, vx: Math.cos(a) * pt.novaSpeed, vy: Math.sin(a) * pt.novaSpeed, life: 1.6, dmg: Math.round(e.v.atk * pt.novaMult), aoe: 0, hostile: true }); }
            e.st = 'chase'; }
          break;
        case 'return':
          if (move(e, e.hx, e.hy, sp * 1.5) || e.stuck > 3) { e.x = e.hx; e.y = e.hy; e.px = e.x; e.py = e.y; e.hp = e.maxHp; e.st = 'idle'; e.t = 1; e.stuck = 0; }
          break;
      }
    }
    // Verfolger schieben sich sanft auseinander, statt auf einem Punkt zu stapeln
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], c = near[j], dx = c.x - a.x, dy = c.y - a.y, min = (a.r + c.r) * 0.9, d2 = dx * dx + dy * dy;
      if (d2 >= min * min || a.st === 'attack' || c.st === 'attack') continue;
      const d = Math.sqrt(d2) || 1, k = Math.min(60 * dt, (min - d) / 2) / d, ux = d2 ? dx * k : k, uy = dy * k;
      const ax = a.x, ay = a.y, bx = c.x, by = c.y;
      [a.x, a.y] = slide(G, a.x, a.y, a.x - ux, a.y - uy, 14); [c.x, c.y] = slide(G, c.x, c.y, c.x + ux, c.y + uy, 14);
      if (safe(a.x, a.y)) { a.x = ax; a.y = ay; } if (safe(c.x, c.y)) { c.x = bx; c.y = by; }
    }
  }

  // Weltobjekte: Tore, Truhen, NPCs, Gebäude (Nähe genügt, keine Extra-Taps)
  interact() {
    const p = this.p;
    if (!p.alive) return;
    let near = null;
    for (const o of this.map.objects) {
      const inR = dist2(p.x, p.y, o.x, o.y) < o.r * o.r;
      // Tor-Balken melden sich nur, wenn sie wirklich verschlossen sind (unten); alles andere reagiert beim Betreten des Radius
      if (inR && !o.in) { o.in = true; o.retryT = this.t + 4; if (o.type !== 'gatebar' && this.hooks.interact) this.hooks.interact(o, this); } else if (!inR && o.in) o.in = false;
      // Truhen und Geschenke: wer im Kreis stehen bleibt, bekommt sie auch dann, wenn sie erst später erscheinen oder das Aufheben zuerst scheiterte (alle 4 s erneut)
      else if (inR && (o.type === 'chest' || o.type === 'gift' || o.type === 'areachest') && this.t >= (o.retryT || 0)) { o.retryT = this.t + 4; if (this.hooks.interact) this.hooks.interact(o, this); }
      if (inR && (o.type === 'building' || o.type === 'npc')) near = o;
      if (inR && o.type === 'gatebar' && !o.open() && !o.warned) { o.warned = true; if (this.hooks.interact) this.hooks.interact(o, this); } else if (!inR) o.warned = false;
    }
    this.near = near;
  }
  // Minimap-/Fog-Zelle des Spielers
  cellOf() { return cellAt(this.G, this.p.x, this.p.y); }
  zone() { return zoneAt(this.G, this.p.x, this.p.y); }
}
