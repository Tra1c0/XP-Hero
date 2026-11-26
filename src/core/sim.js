// Weltsimulation mit festem Tick (unabhängig von Render-FPS): Bewegung, Gegner-Zustandsmaschine, Kampf, Projektile,
// Statuseffekte, Drops, Auto-Hunt, Interaktionen, Moduswellen. Kein DOM. Zufall nur über den persistierten Stream 'world'.
import { rnd, clamp } from './util.js';
import { weaponDmg } from './progress.js';
import { mobStats } from './content/base.js';

const CELL = 180;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

export function buildMap(g, areaId) {
  const c = g.c;
  if (areaId === 'base') {
    const b = c.t.base[0];
    return { id: 'base', kind: 'base', w: b.w, h: b.h, entry: b.entry, groups: [], objects: [
      { type: 'gate', to: b.next, x: b.gate.x, y: b.gate.y, r: 70, open: () => true },
      ...c.t.buildings.map((d) => ({ type: 'building', id: d.id, name: d.name, x: d.x, y: d.y, r: 85 })),
      ...c.t.npcs.filter((n) => n.area === 'base').map((n) => ({ type: 'npc', ...n, r: 70 }))] };
  }
  const a = c.get('areas', areaId);
  const objects = [{ type: 'gate', to: a.prev, x: a.entry.x, y: a.h - 40, r: 60, open: () => true, back: true }];
  if (a.next) objects.push({ type: 'gate', to: a.next, x: a.gate.x, y: a.gate.y, r: 70, open: () => !!g.state.world.cleared[a.id] });
  for (const s of c.t.chestSpawners) if (s.area === areaId) objects.push({ type: 'chest', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const s of c.t.giftSpawners) if (s.area === areaId) objects.push({ type: 'gift', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const s of c.t.areaChests) if (s.area === areaId) objects.push({ type: 'areachest', id: s.id, x: s.x, y: s.y, r: 55 });
  for (const n of c.t.npcs) if (n.area === areaId) objects.push({ type: 'npc', ...n, r: 70 });
  return { id: areaId, kind: 'field', w: a.w, h: a.h, entry: a.entry, area: a,
    groups: [...c.t.spawnGroups, ...c.t.resourceGroups].filter((s) => s.area === areaId), objects };
}
export function arenaMap() { return { id: 'arena', kind: 'arena', w: 900, h: 1200, entry: { x: 450, y: 900 }, groups: [], objects: [] }; }

// Synthetische Gegnervariante für Modi (Tower/Tomb/Raid) aus der gemeinsamen Kurve.
export function modeVariant(g, level, rank, hpMult = 1) {
  const st = mobStats(g.c.cfg, level, rank);
  return { id: `mode_${rank}_${level}`, monster: 'mode', name: rank === 'boss' ? 'Boss' : rank === 'elite' ? 'Elite' : 'Gegner', level, rank, ...st, hp: Math.round(st.hp * hpMult),
    beh: rank === 'boss' ? 'boss' : level % 3 === 0 ? 'ranged' : 'melee', drops: [], xp: 0, gold: 0 };
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
    this.statsRev = -1; this.load = [];
    for (const gr of map.groups) this.spawnGroup(gr);
    if (mode) this.timer = mode.timer;
  }

  // ---- Spawns
  spawnGroup(gr) {
    const g = this.g, v = g.c.get('variants', gr.v), now = g.now();
    const rs = (g.state.world.respawn[gr.id] ||= []);
    for (let i = 0; i < gr.count; i++) {
      const ang = (i / gr.count) * 6.283 + gr.x, rad = gr.count > 1 ? gr.r * (0.35 + 0.6 * ((i * 7) % 5) / 5) : 0;
      const e = this.makeEnemy(v, clamp(gr.x + Math.cos(ang) * rad, 30, this.map.w - 30), clamp(gr.y + Math.sin(ang) * rad, 30, this.map.h - 30));
      e.gid = gr.id; e.slot = i; e.group = gr;
      if (now < (rs[i] || 0)) { e.alive = false; e.st = 'dead'; }
      this.enemies.push(e);
    }
  }
  makeEnemy(v, x, y) {
    const beh = this.g.c.get('behaviors', v.beh);
    return { v, beh, x, y, px: x, py: y, hx: x, hy: y, hp: v.hp, maxHp: v.hp, st: 'spawn', t: 0.4, cd: 0, alive: true, slowT: 0, stunT: 0, burnT: 0, burnN: 0, burnAcc: 0,
      pcd: beh.pattern ? this.g.c.get('bossPatterns', beh.pattern).period : 0, tx: x, ty: y, cx: 0, cy: 0, r: v.rank === 'boss' ? 34 : v.rank === 'elite' ? 24 : 16 };
  }
  nextWave() {
    const m = this.mode;
    this.wave++;
    if (this.wave >= m.waves.length) return this.end(true);
    let k = 0;
    for (const grp of m.waves[this.wave]) for (let i = 0; i < grp.count; i++, k++) {
      const v = grp.v || modeVariant(this.g, m.level, grp.rank, grp.hpMult || 1);
      this.enemies.push(this.makeEnemy(v, 150 + ((k * 137) % 600), 180 + ((k * 71) % 320)));
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
      out.push({ slot, cls, sub, dmg: (st.atk + weaponDmg(g, w)) * cls.basicMult * (sub ? cb.subDmgMult : 1),
        interval: (cls.interval * (sub ? cb.subIntervalMult : 1)) / (1 + st.atkSpeedPct / 100), range: cls.range, skill: d.skill ? g.c.get('skills', d.skill) : null });
    });
    if (!out.length) out.push({ slot: 0, cls: { id: 'fist', melee: true, range: 50, targets: 1, aoe: 0, proj: 0 }, sub: false, dmg: st.atk, interval: 0.8 / (1 + st.atkSpeedPct / 100), range: 50, skill: null });
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
    const g = this.g, st = g.stats;
    let dmg = base * (1 + st.dmgPct / 100) * (1 + (kind === 'melee' ? st.meleePct : st.rangedPct) / 100);
    if (skill) dmg *= 1 + st.skillDmgPct / 100;
    if (e.v.rank === 'boss') dmg *= 1 + st.bossDmgPct / 100;
    const crit = rnd(g.state.rng, 'world') * 100 < st.critChance;
    if (crit) dmg *= st.critDmg / 100;
    dmg = Math.max(1, Math.round(dmg));
    const dealt = Math.min(dmg, e.hp); // Overkill zählt nicht als Schaden
    e.hp -= dealt; this.dmgDealt += dealt;
    if (st.lifesteal > 0 && this.p.alive) this.p.hp = Math.min(st.hp, this.p.hp + (dealt * st.lifesteal) / 100);
    this.text(e.x, e.y - e.r, dmg, crit ? 2 : 1);
    if (e.st === 'idle' || e.st === 'patrol' || e.st === 'return') { e.st = 'chase'; }
    if (e.hp <= 0) this.kill(e);
  }
  status(e, id, dur) {
    const s = this.g.c.get('statuses', id);
    if (s.bossImmune && e.v.rank === 'boss') return;
    if (id === 'slow') e.slowT = s.refresh === 'renew' ? dur : Math.max(e.slowT, dur);
    else if (id === 'stun') { if (e.stunT <= 0) e.stunT = dur; } else if (id === 'burn') { e.burnN = Math.min(s.maxStacks, e.burnN + 1); e.burnT = dur; }
  }
  kill(e) {
    if (!e.alive) return; // genau einmal pro Tod
    e.alive = false; e.st = 'dead';
    if (this.hooks.onKill) this.hooks.onKill(e, this);
  }
  hurt(n) {
    const p = this.p;
    if (!p.alive || this.ended) return;
    p.hp -= n; this.text(p.x, p.y - 20, n, 3);
    if (p.hp <= 0) { p.hp = 0; p.alive = false; this.events.push({ type: 'dead' }); if (this.hooks.onDeath) this.hooks.onDeath(this); }
  }
  text(x, y, n, kind) { if (this.texts.length < 60) this.texts.push({ x, y, n, kind, t: 0.7 }); }
  spawnDrop(item, n, x, y) {
    if (this.drops.length >= 300) this.drops.shift();
    this.drops.push({ item, n, x: clamp(x, 20, this.map.w - 20), y: clamp(y, 20, this.map.h - 20), t: this.g.c.cfg.combat.dropDespawnSec });
  }

  // ---- Angriffe
  fire(l, tgt, bonus = false) {
    const p = this.p, st = this.g.stats, kind = l.cls.melee ? 'melee' : 'ranged';
    if (l.cls.melee) {
      let n = 0;
      this.query(p.x, p.y, l.range, (e) => { if (n < l.cls.targets) { n++; this.hit(e, l.dmg, kind); } });
      this.fx.push({ x: p.x, y: p.y, r: l.range, t: 0.12, k: 0 });
    } else {
      const d = Math.hypot(tgt.x - p.x, tgt.y - p.y) || 1;
      if (this.proj.length < 200) this.proj.push({ x: p.x, y: p.y, vx: ((tgt.x - p.x) / d) * l.cls.proj, vy: ((tgt.y - p.y) / d) * l.cls.proj, life: (l.range * 1.3) / l.cls.proj, dmg: l.dmg, aoe: l.cls.aoe, hostile: false });
    }
    if (!bonus && st.multiHit > 0 && rnd(this.g.state.rng, 'world') * 100 < st.multiHit) this.fire(l, tgt, true);
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

  // ---- Auto-Hunt: Zielwahl, Annäherung, Stuck-Erkennung, volles Cargo, Wiederaufnahme
  autoHunt(dt, load) {
    const p = this.p, g = this.g, bossOk = this.mode || g.state.settings.autoBoss;
    if (!this.mode && this.hooks.cargoFull && this.hooks.cargoFull() && g.state.settings.autoReturn) { this.pending = { travel: 'base', autoBack: this.map.id }; return; }
    if (!p.tgt || !p.tgt.alive || p.skip[p.tgt.gid + ':' + p.tgt.slot] > this.t) {
      let best = null, bd = Infinity;
      for (const e of this.enemies) {
        if (!e.alive || (e.v.rank === 'boss' && !bossOk) || p.skip[e.gid + ':' + e.slot] > this.t) continue;
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      p.tgt = best; p.stuckT = 0; p.stuckD = bd;
    }
    const t = p.tgt;
    if (!t) { p.mx = p.my = 0; return; }
    const d = Math.hypot(t.x - p.x, t.y - p.y), want = load[0].range * 0.85;
    if (d > want) { p.mx = (t.x - p.x) / d; p.my = (t.y - p.y) / d; } else { p.mx = p.my = 0; }
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
      if (p.auto) this.autoHunt(dt, load);
      const sp = cfg.player.moveSpeed * (1 + st.moveSpeedPct / 100), ml = Math.hypot(p.mx, p.my);
      if (ml > 0.05) { const k = Math.min(1, ml) / ml; p.x = clamp(p.x + p.mx * k * sp * dt, p.r, this.map.w - p.r); p.y = clamp(p.y + p.my * k * sp * dt, p.r, this.map.h - p.r); }
      p.hp = Math.min(st.hp, p.hp + (st.regen + (st.hp * cfg.player.regenPct) / 100) * dt);
      // Hauptwaffe hält ihr Ziel, bis es stirbt oder die Reichweite verlässt; Nebenwaffen/Skills mit eigenen Takten
      for (const l of load) {
        p.wcd[l.slot] -= dt;
        if (p.wcd[l.slot] <= 0) {
          let tgt = l.slot === 0 && p.cur && p.cur.alive && dist2(p.x, p.y, p.cur.x, p.cur.y) <= (l.range + p.cur.r) ** 2 ? p.cur : this.nearest(p.x, p.y, l.range);
          if (tgt) { if (l.slot === 0) p.cur = tgt; this.fire(l, tgt); p.wcd[l.slot] = l.interval; } else p.wcd[l.slot] = 0;
        }
        if (l.skill) this.trySkill(l.skill, 'w' + l.slot, l.dmg, dt);
      }
      if (this.heroSkill) this.trySkill(this.heroSkill, 'hero', st.atk, dt);
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
        for (const e of this.enemies) if (!e.alive && e.gid && now >= ((rs[e.gid] || [])[e.slot] || 0)) {
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
    const move = (e, tx, ty, sp) => { const d = Math.hypot(tx - e.x, ty - e.y); if (d < 2) return true; const k = Math.min(1, (sp * dt) / d); e.x += (tx - e.x) * k; e.y += (ty - e.y) * k; return d < 6; };
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const b = e.beh;
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnAcc += ((g.stats.atk * burn.dotPctAtk) / 100) * e.burnN * dt;
        if (e.burnAcc >= 1) { const n = Math.floor(e.burnAcc); e.burnAcc -= n; const dealt = Math.min(n, e.hp); e.hp -= dealt; this.dmgDealt += dealt; if (e.hp <= 0) { this.kill(e); continue; } }
        if (e.burnT <= 0) e.burnN = 0;
      }
      if (e.slowT > 0) e.slowT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      if (e.st === 'spawn') { if ((e.t -= dt) <= 0) e.st = 'idle'; continue; }
      if (b.id === 'node') continue;
      const sp = b.speed * (e.slowT > 0 ? slowM : 1), d = Math.hypot(p.x - e.x, p.y - e.y), aggro = this.mode ? 9999 : b.aggro, leash = this.mode ? 99999 : b.leash;
      switch (e.st) {
        case 'spawn': if ((e.t -= dt) <= 0) e.st = 'idle'; break;
        case 'idle':
          if (p.alive && d < aggro) { e.st = 'aggro'; e.t = 0.3; break; }
          if ((e.t -= dt) <= 0 && b.patrol > 0) { const a = rnd(g.state.rng, 'world') * 6.283; e.tx = clamp(e.hx + Math.cos(a) * b.patrol, 20, this.map.w - 20); e.ty = clamp(e.hy + Math.sin(a) * b.patrol, 20, this.map.h - 20); e.st = 'patrol'; }
          break;
        case 'patrol':
          if (p.alive && d < aggro) { e.st = 'aggro'; e.t = 0.3; break; }
          if (move(e, e.tx, e.ty, sp * 0.4)) { e.st = 'idle'; e.t = 1.5 + rnd(g.state.rng, 'world') * 3; }
          break;
        case 'aggro': if ((e.t -= dt) <= 0) e.st = 'chase'; break;
        case 'chase':
          if (!p.alive || dist2(e.x, e.y, e.hx, e.hy) > leash * leash) { e.st = 'return'; break; }
          if (b.flee) { if (d > aggro * 1.6) { e.st = 'return'; break; } const k = (sp * dt) / (d || 1); e.x = clamp(e.x - (p.x - e.x) * k, 20, this.map.w - 20); e.y = clamp(e.y - (p.y - e.y) * k, 20, this.map.h - 20); break; }
          if (b.pattern && (e.pcd -= dt) <= 0) { const pt = g.c.get('bossPatterns', b.pattern); e.st = 'cast'; e.t = pt.windup; e.cx = p.x; e.cy = p.y; e.pcd = pt.period * (e.hp < (e.maxHp * pt.enrageHpPct) / 100 ? pt.enrageIntervalMult : 1); break; }
          if (d <= b.range + p.r) { e.st = 'attack'; e.t = b.windup; } else move(e, p.x, p.y, sp);
          break;
        case 'attack':
          if ((e.t -= dt) <= 0) {
            if (p.alive && d <= (b.range + p.r) * 1.25) {
              if (b.proj) { if (this.proj.length < 200) this.proj.push({ x: e.x, y: e.y, vx: ((p.x - e.x) / (d || 1)) * b.proj, vy: ((p.y - e.y) / (d || 1)) * b.proj, life: 1.4, dmg: e.v.atk, aoe: 0, hostile: true }); } else this.hurt(e.v.atk);
            }
            e.st = 'cool'; e.cd = b.interval;
          }
          break;
        case 'cool': if ((e.cd -= dt) <= 0) e.st = 'chase'; break;
        case 'cast':
          if ((e.t -= dt) <= 0) { const pt = g.c.get('bossPatterns', b.pattern); if (p.alive && dist2(p.x, p.y, e.cx, e.cy) < pt.radius * pt.radius) this.hurt(Math.round(e.v.atk * pt.mult)); this.fx.push({ x: e.cx, y: e.cy, r: pt.radius, t: 0.3, k: 2 }); e.st = 'chase'; }
          break;
        case 'return': if (move(e, e.hx, e.hy, sp * 1.5)) { e.hp = e.maxHp; e.st = 'idle'; e.t = 1; } break;
      }
    }
  }

  // Weltobjekte: Tore, Truhen, NPCs, Gebäude (Nähe genügt, keine Extra-Taps)
  interact() {
    const p = this.p;
    if (!p.alive) return;
    let near = null;
    for (const o of this.map.objects) {
      const inR = dist2(p.x, p.y, o.x, o.y) < o.r * o.r;
      if (inR && !o.in) { o.in = true; if (this.hooks.interact) this.hooks.interact(o, this); } else if (!inR && o.in) o.in = false;
      if (inR && (o.type === 'building' || o.type === 'npc')) near = o;
    }
    this.near = near;
  }
  // Minimap-/Fog-Zelle des Spielers
  cellOf() { return Math.floor(this.p.x / 200) + Math.floor(this.p.y / 200) * 100; }
}
