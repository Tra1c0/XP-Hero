// Skelett-Animation: Knochenhierarchie, Clips mit Schlüsselbildern je Knochen, Überblenden, Ereigniszeitpunkte (Marker).
// Allgemeine Technik; Skelette und Clips stammen aus den eigenen Modelldateien (src/client/models).
const mul = (a, b, o) => { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
function trs(T, R, S, i, o) {
  const x = R[i * 4], y = R[i * 4 + 1], z = R[i * 4 + 2], w = R[i * 4 + 3], sx = S[i * 3], sy = S[i * 3 + 1], sz = S[i * 3 + 2];
  o[0] = (1 - 2 * (y * y + z * z)) * sx; o[1] = 2 * (x * y + z * w) * sx; o[2] = 2 * (x * z - y * w) * sx; o[3] = 0;
  o[4] = 2 * (x * y - z * w) * sy; o[5] = (1 - 2 * (x * x + z * z)) * sy; o[6] = 2 * (y * z + x * w) * sy; o[7] = 0;
  o[8] = 2 * (x * z + y * w) * sz; o[9] = 2 * (y * z - x * w) * sz; o[10] = (1 - 2 * (x * x + y * y)) * sz; o[11] = 0;
  o[12] = T[i * 3]; o[13] = T[i * 3 + 1]; o[14] = T[i * 3 + 2]; o[15] = 1; return o;
}
export class Pose { constructor(n) { this.T = new Float32Array(n * 3); this.R = new Float32Array(n * 4); this.S = new Float32Array(n * 3); } }
export class Rig {
  constructor(g) {
    this.nodes = g.nodes; this.n = g.nodes.length; this.skin = g.skin; this.clips = g.clips;
    this.rest = new Pose(this.n);
    g.nodes.forEach((nd, i) => { this.rest.T.set(nd.t, i * 3); this.rest.R.set(nd.r, i * 4); this.rest.S.set(nd.s, i * 3); });
    // Reihenfolge: Eltern vor Kindern
    this.order = []; const visit = (i) => { this.order.push(i); for (const c of g.nodes[i].children) visit(c); };
    g.nodes.forEach((nd, i) => { if (nd.parent < 0) visit(i); });
    this.byName = {}; g.nodes.forEach((nd, i) => { this.byName[nd.name] = i; });
    this.world = new Float32Array(this.n * 16); this.local = new Float32Array(16);
    this.joints = new Float32Array((g.skin ? g.skin.joints.length : 0) * 16);
  }
  // Clip zum Zeitpunkt t in eine Pose schreiben (Knochen ohne Spur behalten die Ruhelage)
  sample(name, t, P) {
    const c = this.clips[name]; P.T.set(this.rest.T); P.R.set(this.rest.R); P.S.set(this.rest.S);
    if (!c) return P;
    const tt = c.loop && c.dur > 0 ? ((t % c.dur) + c.dur) % c.dur : Math.max(0, Math.min(c.dur, t));
    for (const ch of c.channels) {
      const { times, values, comps } = ch, n = times.length, k3 = ch.cubic ? 3 : 1, at = (k, q) => values[(k * k3 + (ch.cubic ? 1 : 0)) * comps + q];
      let k = 0; if (tt >= times[n - 1]) k = n - 1; else { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= tt) lo = m; else hi = m; } k = lo; }
      const k1 = Math.min(n - 1, k + 1), span = times[k1] - times[k], u = ch.step || span <= 0 ? 0 : Math.max(0, Math.min(1, (tt - times[k]) / span));
      const dst = ch.path === 'translation' ? P.T : ch.path === 'rotation' ? P.R : P.S, o = ch.node * comps;
      if (comps === 4) {
        let d = 0; for (let q = 0; q < 4; q++) d += at(k, q) * at(k1, q); const sg = d < 0 ? -1 : 1; let l = 0;
        for (let q = 0; q < 4; q++) { const v = at(k, q) * (1 - u) + at(k1, q) * u * sg; dst[o + q] = v; l += v * v; }
        l = Math.sqrt(l) || 1; for (let q = 0; q < 4; q++) dst[o + q] /= l;
      } else for (let q = 0; q < 3; q++) dst[o + q] = at(k, q) * (1 - u) + at(k1, q) * u;
    }
    return P;
  }
  // A <- Mischung aus A und B; w je Knochen über wf(i) oder fest
  blend(A, B, w, wf) {
    for (let i = 0; i < this.n; i++) {
      const u = wf ? wf(i) * w : w; if (u <= 0) continue;
      for (let q = 0; q < 3; q++) { A.T[i * 3 + q] += (B.T[i * 3 + q] - A.T[i * 3 + q]) * u; A.S[i * 3 + q] += (B.S[i * 3 + q] - A.S[i * 3 + q]) * u; }
      let d = 0; for (let q = 0; q < 4; q++) d += A.R[i * 4 + q] * B.R[i * 4 + q]; const sg = d < 0 ? -1 : 1; let l = 0;
      for (let q = 0; q < 4; q++) { const v = A.R[i * 4 + q] * (1 - u) + B.R[i * 4 + q] * u * sg; A.R[i * 4 + q] = v; l += v * v; }
      l = Math.sqrt(l) || 1; for (let q = 0; q < 4; q++) A.R[i * 4 + q] /= l;
    }
    return A;
  }
  // Pose -> Weltmatrizen aller Knochen und Gelenkmatrizen für die Haut
  solve(P) {
    const W = this.world, L = this.local, tmp = this.tmp || (this.tmp = new Float32Array(16));
    for (const i of this.order) { trs(P.T, P.R, P.S, i, L); const p = this.nodes[i].parent; if (p < 0) W.set(L, i * 16); else { mul(W.subarray(p * 16, p * 16 + 16), L, tmp); W.set(tmp, i * 16); } }
    if (this.skin) this.skin.joints.forEach((nd, j) => { mul(W.subarray(nd * 16, nd * 16 + 16), this.skin.ibm.subarray(j * 16, j * 16 + 16), tmp); this.joints.set(tmp, j * 16); });
    return this.joints;
  }
  // Position eines benannten Knochens im Modellraum (z. B. Handpunkt für die Waffe)
  point(name) { const i = this.byName[name]; return i === undefined ? null : [this.world[i * 16 + 12], this.world[i * 16 + 13], this.world[i * 16 + 14]]; }
}

// Zustandsmaschine der Spielfigur: Stehen/Laufen als Schleifen, darüber Aktionen (Angriff nach Waffenart, Treffer, Tod).
// Die Simulation bestimmt, WANN etwas passiert; der Clip wird so gestartet, dass sein Treffer-Marker auf den Schlagmoment fällt.
const LEGS = /^(Root|Hips|Thigh|Shin|Foot|Toe)/;
const ATTACK = { sword: ['Attack_1', 'Attack_2'], dagger: ['Attack_1', 'Attack_2'], blunt: ['Attack_2', 'Attack_1'], fist: ['Attack_1', 'Attack_2'], crossbow: ['Aim_Shoot'], gun: ['Aim_Shoot'], staff: ['Cast'] };
export class HeroAnim {
  constructor(rig) {
    this.rig = rig; this.A = new Pose(rig.n); this.B = new Pose(rig.n); this.C = new Pose(rig.n);
    this.locoT = 0; this.moveW = 0; this.act = null; this.actW = 0; this.lastFire = undefined; this.lastHurt = undefined; this.swing = 0; this.dead = false;
    this.legs = rig.nodes.map((n) => (LEGS.test(n.name) ? 1 : 0));
  }
  start(clip, at, len) { const c = this.rig.clips[clip]; if (!c) return; const rest = Math.max(0.05, c.dur - at); this.act = { clip, t: at, speed: Math.max(1, rest / Math.max(0.12, len)), hold: false }; }
  // inp: { dt, alive, speed (m/s), fireT, hurtT, cls, interval }
  update(inp) {
    const r = this.rig, dt = Math.min(0.1, inp.dt), moving = inp.alive && inp.speed > 0.4;
    this.moveW += ((moving ? 1 : 0) - this.moveW) * Math.min(1, dt * 12);
    this.locoT += dt * (moving ? Math.max(0.7, Math.min(1.5, inp.speed / 5.2)) : 1);
    if (!inp.alive) { if (!this.dead) { this.dead = true; const c = r.clips.Death; this.act = c ? { clip: 'Death', t: 0, speed: 1.2, hold: true } : null; } }
    else {
      if (this.dead) { this.dead = false; this.act = null; }
      if (inp.fireT !== undefined && inp.fireT !== this.lastFire) {
        const list = ATTACK[inp.cls] || ATTACK.fist, clip = list[this.swing++ % list.length], c = r.clips[clip];
        if (c) { const m = c.markers.Hit ?? c.markers.Release ?? c.dur * 0.4; this.start(clip, Math.max(0, m - 0.07), Math.max(0.16, (inp.interval || 0.5) * 0.85)); }
      } else if (inp.hurtT !== undefined && inp.hurtT !== this.lastHurt && !this.act && r.clips.Hit) this.start('Hit', Math.max(0, (r.clips.Hit.markers.Impact ?? 0.1) - 0.05), 0.28);
    }
    this.lastFire = inp.fireT; this.lastHurt = inp.hurtT;
    let live = false;
    if (this.act) { const c = r.clips[this.act.clip]; this.act.t += dt * this.act.speed; if (this.act.t >= c.dur) { if (this.act.hold) this.act.t = c.dur; else this.act = null; } live = !!this.act; }
    this.actW += ((live ? 1 : 0) - this.actW) * Math.min(1, dt * (live ? 26 : 11));
    // Grundlage: Stehen, mit Laufen überblendet
    r.sample('Idle', this.locoT, this.A);
    if (this.moveW > 0.01) r.blend(this.A, r.sample(r.clips.Run ? 'Run' : 'Walk', this.locoT, this.B), this.moveW);
    // Aktion: im Stand der ganze Körper, im Lauf nur der Oberkörper (die Beine laufen weiter)
    if (this.actW > 0.01 && (this.act || this.lastClip)) {
      if (this.act) { this.lastClip = this.act.clip; this.lastT = this.act.t; }
      r.sample(this.lastClip, this.lastT, this.C);
      const mw = this.dead ? 0 : this.moveW, legs = this.legs;
      r.blend(this.A, this.C, this.actW, (i) => (legs[i] ? 1 - mw : 1));
    }
    return r.solve(this.A);
  }
}
