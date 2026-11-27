// WebGL2-Renderer (ohne Bibliothek): erhöhte, geneigte, orthografische Kamera; flach schattierte Low-Poly-Formen mit Instancing;
// Gelände aus dem Begehbarkeitsraster der Simulation (was man sieht, ist was begehbar ist); Labels, Lebensbalken, Minimap als 2D-Overlay.
// Liest den Spielzustand nur. Koordinaten: GL x = Ost, y = oben, z = Süden (= Simulations-y).
import { SHAPES, BIOMES, WATER, SCATTER, expand, hex } from './assets3d.js';
import { FLOOR, WALL, WATER as K_WATER, LAVA, walkIdx, findPath } from '../core/worldgrid.js';
import { npcStatus, currentQuests } from '../core/meta.js';

const VIEW_W = 21, TILT = (52 * Math.PI) / 180; // sichtbare Breite in Metern (Hochformat), Neigung
const INST = 11; // pos3, rot, scl3, rgba(em)
const VS_I = `#version 300 es
layout(location=0) in vec3 p; layout(location=1) in vec3 n; layout(location=2) in vec3 ip; layout(location=3) in float ir; layout(location=4) in vec3 is; layout(location=5) in vec4 ic;
uniform mat4 vp; uniform float zb; out vec3 vN; out vec4 vC;
void main(){ float c=cos(ir), s=sin(ir); vec3 q=p*is; q=vec3(c*q.x+s*q.z, q.y, -s*q.x+c*q.z);
 vec3 m=n/max(is,vec3(1e-3)); m=vec3(c*m.x+s*m.z, m.y, -s*m.x+c*m.z); vN=normalize(m); vC=ic; gl_Position=vp*vec4(q+ip,1.); gl_Position.z-=zb; }`;
const VS_T = `#version 300 es
layout(location=0) in vec3 p; layout(location=1) in vec3 n; layout(location=2) in vec4 c;
uniform mat4 vp; out vec3 vN; out vec4 vC; void main(){ vN=n; vC=c; gl_Position=vp*vec4(p,1.); }`;
const FS = `#version 300 es
precision mediump float; in vec3 vN; in vec4 vC; uniform vec3 L; uniform float alpha; uniform vec4 flatC; out vec4 o;
void main(){ if(flatC.a>0.){ o=flatC; return; }
 float d=max(dot(normalize(vN),L),0.); float h=vN.y*.5+.5;
 vec3 col=vC.rgb*(0.50+0.42*d+0.16*h); col=mix(col, vC.rgb*1.25+0.08, vC.a);
 o=vec4(col, alpha); }`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// weiches Wertrauschen über Zellen (großflächige Bodenvariation)
const vnoise = (x, y, s) => { const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const pick = (list, r) => { let s = 0; for (const [, w] of list) s += w; let x = r * s; for (const it of list) if ((x -= it[1]) < 0) return it[0]; return list[list.length - 1][0]; };
const COLS = new Map();
const col = (h) => { let c = COLS.get(h); if (!c) { c = hex(h); COLS.set(h, c); } return c; };
const RANK_COL = { normal: '#c0564b', elite: '#d98a2b', rare: '#9b3fd1', boss: '#7b2bb0', special: '#e2c13a' };

export class Renderer3D {
  constructor(glCanvas, overlay) {
    this.cv = glCanvas; this.ov = overlay; this.ctx = overlay.getContext('2d');
    const gl = (this.gl = glCanvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' }));
    if (!gl) throw new Error('WebGL2 nicht verfügbar');
    this.pI = compile(gl, VS_I, FS); this.pT = compile(gl, VS_T, FS);
    this.U = {}; this.zb = gl.getUniformLocation(this.pI, 'zb');
    for (const [k, p] of [['i', this.pI], ['t', this.pT]]) this.U[k] = { vp: gl.getUniformLocation(p, 'vp'), L: gl.getUniformLocation(p, 'L'), alpha: gl.getUniformLocation(p, 'alpha'), flat: gl.getUniformLocation(p, 'flatC') };
    this.mesh = {};
    for (const [name, data] of Object.entries(SHAPES)) {
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      this.mesh[name] = { vb, n: data.length / 6 };
    }
    this.dyn = {}; // pro Form: dynamischer Instanzpuffer
    this.scenes = new WeakMap();
    this.cam = null;
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = this.ov.getBoundingClientRect();
    for (const c of [this.cv, this.ov]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    this.w = r.width; this.h = r.height; this.dpr = dpr;
  }
  // VAO für Form + Instanzpuffer
  vao(shape, ib) {
    const gl = this.gl, v = gl.createVertexArray(), m = this.mesh[shape];
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    const S = INST * 4;
    [[2, 3, 0], [3, 1, 12], [4, 3, 16], [5, 4, 28]].forEach(([loc, size, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off); gl.vertexAttribDivisor(loc, 1); });
    gl.bindVertexArray(null);
    return v;
  }
  // Teil-Liste [shape, x, y, z, rot, sx, sy, sz, hexColor, em] -> pro Form Float32Array
  pack(parts, buckets = {}) {
    for (const t of parts) {
      const b = (buckets[t[0]] ||= []);
      const c = typeof t[8] === 'string' ? col(t[8]) : t[8];
      b.push(t[1], t[2], t[3], t[4], t[5], t[6], t[7], c[0], c[1], c[2], t[9] || 0);
    }
    return buckets;
  }
  upload(buckets, usage) {
    const gl = this.gl, out = {};
    for (const [shape, arr] of Object.entries(buckets)) {
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), usage);
      out[shape] = { ib, vao: this.vao(shape, ib), n: arr.length / INST };
    }
    return out;
  }

  // ---------------------------------------------------------------- Statische Szene je Karte
  scene(map) {
    let sc = this.scenes.get(map);
    if (sc) return sc;
    const G = map.grid, W = G.world, B = W.bounds, cs = G.cell, n = G.kind.length, gl = this.gl;
    const zoneBiome = (i) => (W.zones[G.zone[i] >= 0 ? G.zone[i] : G.near[i]] || W.zones[0]).biome;
    const pal = (i) => BIOMES[zoneBiome(i)] || BIOMES.arena;
    // Abstand jeder Wandzelle zur nächsten offenen Zelle -> Terrassenhöhe
    const dist = new Int16Array(n).fill(-1), q = [];
    for (let i = 0; i < n; i++) if (G.kind[i] !== WALL) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], r = (i / G.cols) | 0, c = i % G.cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * G.cols + cc;
        if (rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols || dist[j] >= 0) continue;
        dist[j] = dist[i] + 1; q.push(j);
      }
    }
    const H = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = G.kind[i], r = (i / G.cols) | 0, c = i % G.cols;
      H[i] = k === WALL || k === FLOOR ? 0 : -0.35; // flaches Gelände wie in der Vorlage; Grenzen entstehen durch Felsränder, nicht durch Blöcke
    }
    // Laufwege: echte Pfade (Pfadsuche, alle Tore offen) von der Basis zu jedem Gebietseinstieg und zu den Stage-Truhen
    const path = new Uint8Array(n);
    if (W.entries) {
      const saved = G.gateOpen.slice(); G.gateOpen.fill(1);
      const P = (p) => G.toPx(p[0], p[1]), start = P(W.entries.base || Object.values(W.entries)[0]);
      const goals = [...Object.values(W.entries).map(P), ...map.objects.filter((o) => o.type === 'chest' || o.type === 'building' || o.type === 'gatebar').map((o) => ({ x: o.x, y: o.y }))];
      for (const gl2 of goals) {
        const pts = findPath(G, start.x, start.y, gl2.x, gl2.y, 20000);
        if (!pts) continue;
        let px = start.x, py = start.y;
        for (const q2 of pts) { const d = Math.hypot(q2.x - px, q2.y - py), m = Math.ceil(d / (G.cpx * 0.5)); for (let k = 0; k <= m; k++) { const x = px + ((q2.x - px) * k) / m, y = py + ((q2.y - py) * k) / m, i = Math.floor(y / G.cpx) * G.cols + Math.floor(x / G.cpx); if (G.kind[i] === FLOOR) path[i] = 1; } px = q2.x; py = q2.y; }
      }
      G.gateOpen.set(saved);
    }
    // Bodenfarben je Zelle, dann je ECKPUNKT gemittelt: weiche Übergänge zwischen Wiese, Sandweg, Biomen und Umland statt Schachbrett-Kanten.
    const CC = new Float32Array(n * 3);
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const i = r * G.cols + c, k = G.kind[i], P2 = pal(i);
      let base;
      if (k === FLOOR || G.flat[i]) {
        base = col(P2.floor[0]).slice();
        const nz = vnoise(c, r, 7), pc = col(P2.patch || P2.floor[1]), pm = Math.max(0, Math.min(1, (nz - 0.5) * 3)) * 0.75;
        base = [base[0] + (pc[0] - base[0]) * pm, base[1] + (pc[1] - base[1]) * pm, base[2] + (pc[2] - base[2]) * pm];
        if (path[i]) { const pa = col(P2.path || P2.floor[1]); base = [base[0] * 0.15 + pa[0] * 0.85, base[1] * 0.15 + pa[1] * 0.85, base[2] * 0.15 + pa[2] * 0.85]; }
      } else if (k === WALL) { const t = col(P2.top), d = Math.min(1, dist[i] / 6) * 0.22; base = [t[0] * (1 - d), t[1] * (1 - d), t[2] * (1 - d)]; } else { const f = col(P2.side); base = [f[0] * 0.7, f[1] * 0.7, f[2] * 0.7]; }
      CC.set(base, i * 3);
    }
    const corner = (c, r) => { // Mittel der bis zu vier angrenzenden Zellen
      let a0 = 0, a1 = 0, a2 = 0, m = 0;
      for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols) continue; const j = (rr * G.cols + cc) * 3; a0 += CC[j]; a1 += CC[j + 1]; a2 += CC[j + 2]; m++; }
      return [a0 / m, a1 / m, a2 / m];
    };
    const V = [];
    const quad = (a, b, c2, d, nrm, cl) => { const cs4 = Array.isArray(cl[0]) ? cl : [cl, cl, cl, cl], P4 = [a, b, c2, d]; for (const k of [0, 1, 2, 0, 2, 3]) { const p = P4[k], q = cs4[k]; V.push(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], q[0], q[1], q[2], q[3] || 0); } };
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const i = r * G.cols + c, k = G.kind[i], x0 = B.minX + c * cs, x1 = x0 + cs, z0 = r * cs - B.maxZ, z1 = z0 + cs, y = H[i];
      if (k === FLOOR || k === WALL) {
        // große, kaum sichtbare Bodenkacheln (4 m) wie in der Vorlage
        const tile = 1 + ((((c >> 1) + (r >> 1)) & 1) ? 0.022 : -0.022), t = (q) => [q[0] * tile, q[1] * tile, q[2] * tile, 0];
        quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], [t(corner(c, r)), t(corner(c, r + 1)), t(corner(c + 1, r + 1)), t(corner(c + 1, r))]);
      } else quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], [CC[i * 3], CC[i * 3 + 1], CC[i * 3 + 2], 0]);
      if (k === FLOOR || k === WALL) continue;
      const side = col('#3a4a5a');
      for (const [dr, dc, nrm] of [[-1, 0, [0, 0, -1]], [1, 0, [0, 0, 1]], [0, -1, [-1, 0, 0]], [0, 1, [1, 0, 0]]]) {
        const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols) continue;
        const yn = H[rr * G.cols + cc]; if (yn <= y) continue;
        const sc2 = [side[0], side[1], side[2], 0];
        if (dr === -1) quad([x0, y, z0], [x0, yn, z0], [x1, yn, z0], [x1, y, z0], nrm, sc2);
        else if (dr === 1) quad([x1, y, z1], [x1, yn, z1], [x0, yn, z1], [x0, y, z1], nrm, sc2);
        else if (dc === -1) quad([x0, y, z1], [x0, yn, z1], [x0, yn, z0], [x0, y, z0], nrm, sc2);
        else quad([x1, y, z0], [x1, yn, z0], [x1, yn, z1], [x1, y, z1], nrm, sc2);
      }
    }
    const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW);
    const tv = gl.createVertexArray(); gl.bindVertexArray(tv);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
    gl.bindVertexArray(null);
    // Statische Requisiten: Landmarken (Level-Design) + Biom-Streuung auf Felsen und Boden (deterministisch)
    const parts = [], shadows = [];
    const objNear = new Set();
    for (const o of map.objects) { const c0 = Math.floor(o.x / G.cpx), r0 = Math.floor(o.y / G.cpx); for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) objNear.add((r0 + dr) * G.cols + c0 + dc); }
    // Wasser-/Lava-Flächen als weiche Formen über dem Becken (Kollision bleibt das Raster)
    for (const b of W.blockers || []) {
      if (b.kind !== 'water' && b.kind !== 'lava') continue;
      const cl = b.kind === 'lava' ? WATER.lava : WATER.water, em = b.kind === 'lava' ? 1 : 0.15;
      if (b.c) { parts.push(['cyl8', b.c[0], 0.03, -b.c[1], 0.2, b.r * 2.5, 0.02, b.r * 2.5, cl, em], ['cyl8', b.c[0] - b.r * 0.3, 0.05, -b.c[1] - b.r * 0.25, 0.6, b.r * 0.7, 0.01, b.r * 0.3, '#8fd0f3', 0.2]); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283 + 0.3; expand(k % 2 ? 'pebble' : 'grass', b.c[0] + Math.cos(a) * (b.r + 1.2), 0, -b.c[1] + Math.sin(a) * (b.r + 1.2), a, 1.2, parts); } }
      else { const xs = b.poly.map((p) => p[0]), zs = b.poly.map((p) => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2; parts.push(['cyl8', cx, 0.03, -cz, 0, Math.max(...xs) - Math.min(...xs) + 2, 0.02, Math.max(...zs) - Math.min(...zs) + 2, cl, em]); }
    }
    for (const lm of W.landmarks || []) {
      const zg = -lm.p[1], s = lm.s || 1;
      const li = Math.floor((B.maxZ - lm.p[1]) / cs) * G.cols + Math.floor((lm.p[0] - B.minX) / cs), ly = H[li] > 0 ? H[li] : 0;
      expand(lm.t, lm.p[0], ly, zg, ((lm.r || 0) * Math.PI) / 180, s, parts);
      shadows.push(['disc', lm.p[0], 0.02, zg, 0, 2.6 * s, 1, 2.6 * s, '#000000', 0]);
      const c0 = Math.floor((lm.p[0] - B.minX) / cs), r0 = Math.floor((B.maxZ - lm.p[1]) / cs);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) objNear.add((r0 + dr) * G.cols + c0 + dc);
    }
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const i = r * G.cols + c, k = G.kind[i], rule = SCATTER[zoneBiome(i)] || SCATTER.arena, h1 = hash(c + 11, r + 5);
      if (k === WALL && !G.flat[i] && dist[i] === 1) {
        // Felsrand: klobige, runde Brocken entlang jeder Grenze (verdeckt die Rasterkante, bildet die natürliche Begrenzung)
        const rc = col(pal(i).side), x = B.minX + (c + 0.5) * cs, z = r * cs - B.maxZ + cs * 0.5;
        for (let q2 = 0; q2 < 2; q2++) {
          const j = hash(c * 3 + q2, r * 5 + q2), s2 = 1.9 + hash(c + q2 * 7, r * 3) * 1.3, sh = 0.82 + hash(c * 11 + q2, r) * 0.3;
          parts.push([q2 ? 'rock2' : 'rock', x + (j - 0.5) * cs * 0.9, -0.35, z + (hash(c, r * 7 + q2) - 0.5) * cs * 0.9, j * 6.28, s2, s2 * 0.62, s2 * 0.9, [rc[0] * sh, rc[1] * sh, rc[2] * sh], 0]);
        }
        if (h1 < rule.edgeD * 0.35) expand(pick(rule.edge, hash(c * 5, r * 3)), x + (hash(c * 7, r) - 0.5) * cs, 0.5, z + (hash(c, r * 13) - 0.5) * cs, hash(c * 2, r * 2) * 6.28, 0.9, parts);
      } else if (k === WALL && !G.flat[i]) {
        const edge = dist[i] <= 3, list = edge ? rule.edge : rule.deep, d = edge ? rule.edgeD : rule.deepD;
        if (!list.length || h1 > d || (dist[i] > 6 && h1 > d * 0.5)) continue;
        const name = pick(list, hash(c * 5, r * 3)), s = 0.8 + hash(c, r * 9) * 0.55, x = B.minX + (c + 0.5) * cs + (hash(c * 7, r) - 0.5) * cs * 0.6, z = r * cs - B.maxZ + cs * 0.5 + (hash(c, r * 13) - 0.5) * cs * 0.6;
        expand(name, x, H[i], z, hash(c * 2, r * 2) * 6.28, s, parts);
        if (/tree|pine/.test(name)) shadows.push(['disc', x, H[i] + 0.03, z, 0, 2.2 * s, 1, 2.2 * s, '#000000', 0]);
      } else if (k === FLOOR && G.gate[i] < 0 && !path[i] && !objNear.has(i) && rule.floor.length && h1 < rule.floorD) {
        const name = pick(rule.floor, hash(c * 5, r * 3)), x = B.minX + (c + 0.5) * cs + (hash(c * 7, r) - 0.5) * cs * 0.7, z = r * cs - B.maxZ + cs * 0.5 + (hash(c, r * 13) - 0.5) * cs * 0.7;
        expand(name, x, 0, z, hash(c * 2, r * 2) * 6.28, 0.8 + hash(c, r) * 0.4, parts);
      }
    }
    sc = { tv, tn: V.length / 10, inst: this.upload(this.pack(parts), gl.STATIC_DRAW), shadow: this.upload(this.pack(shadows), gl.STATIC_DRAW), sky: col((BIOMES[W.zones[0].biome] || BIOMES.arena).sky),
      minimap: null, mmT: 0, parts: parts.length, verts: V.length / 10 };
    this.scenes.set(map, sc);
    return sc;
  }

  // ---------------------------------------------------------------- Dynamische Teile je Bild
  dynamic(game, view) {
    const w = game.world, G = w.G, B = G.world.bounds, ppm = G.ppm, a = game.alpha, g = game.g, st = game.state, out = [], shadows = [], fx = [], xray = [];
    const X = (x) => B.minX + x / ppm, Z = (y) => y / ppm - B.maxZ;
    const lerp = (o) => [X(o.px + (o.x - o.px) * a), Z(o.py + (o.y - o.py) * a)];
    const vis = (x, z, m = 4) => x > view.x0 - m && x < view.x1 + m && z > view.z0 - m && z < view.z1 + m;
    const now = g.now();
    // Weltobjekte
    for (const o of w.map.objects) {
      const x = X(o.x), z = Z(o.y);
      if (!vis(x, z, 6)) continue;
      if (o.type === 'building') expand(st.buildings[o.id] ? o.id : 'plot', x, 0, z, 0, 1, out);
      else if (o.type === 'chest') { if (now >= (st.world.chests[o.id] || 0)) { out.push(['box', x, 0, z, 0.3, 1.1, 0.7, 0.8, '#8a5a32', 0], ['box', x, 0.7, z, 0.3, 1.12, 0.18, 0.82, '#e9b43a', 0.2]); shadows.push(['disc', x, 0.02, z, 0, 1.6, 1, 1.6, '#000000', 0]); } } else if (o.type === 'gift') { if (now >= (st.world.gifts[o.id] || 0)) { out.push(['box', x, 0, z, 0.6, 0.8, 0.8, 0.8, '#ff7fae', 0.15], ['box', x, 0, z, 0.6, 0.84, 0.84, 0.18, '#fff3b0', 0.3], ['box', x, 0, z, 0.6, 0.18, 0.84, 0.84, '#fff3b0', 0.3]); } } else if (o.type === 'areachest') { if (!st.claims[`areachest:${o.id}`]) { out.push(['box', x, 0, z, -0.2, 1.3, 0.9, 0.9, '#e9b43a', 0.25], ['box', x, 0.9, z, -0.2, 1.32, 0.2, 0.92, '#b5482f', 0]); } } else if (o.type === 'npc') {
        if (o.kind === 'raid') out.push(['box', x + 1.4, 0, z - 0.6, 0.4, 1.0, 2.6, 1.0, '#3d3a4a', 0], ['sphere', x + 1.4, 2.5, z - 0.6, 0, 0.6, 0.6, 0.6, '#c24bff', 0.9]);
        { out.push(['cyl8', x, 0, z, 0, 0.7, 1.0, 0.7, '#3f8f5a', 0], ['sphere', x, 1.0, z, 0, 0.5, 0.5, 0.5, '#f1c9a5', 0], ['cone6', x, 1.42, z, 0, 0.6, 0.5, 0.6, '#2f6b45', 0]); shadows.push(['disc', x, 0.02, z, 0, 1.1, 1, 1.1, '#000000', 0]); }
      } else if (o.type === 'decor') expand(o.kind, x, 0, z, 0, 1, out);
      else if (o.type === 'gatebar') {
        const gt = o.def, dx = gt.b[0] - gt.a[0], dz = -(gt.b[1] - gt.a[1]), ang = Math.atan2(dx, dz), half = gt.w / 2, px = Math.cos(ang) * half, pz = -Math.sin(ang) * half;
        out.push(['cyl8', x + px, 0, z + pz, 0, 0.7, 2.6, 0.7, '#6e7178', 0], ['cyl8', x - px, 0, z - pz, 0, 0.7, 2.6, 0.7, '#6e7178', 0], ['sphere', x + px, 2.5, z + pz, 0, 0.5, 0.5, 0.5, o.open() ? '#7dff9a' : '#ff4a6a', 1], ['sphere', x - px, 2.5, z - pz, 0, 0.5, 0.5, 0.5, o.open() ? '#7dff9a' : '#ff4a6a', 1]);
        if (!o.open()) out.push(['box', x, 0, z, ang + Math.PI / 2, gt.w, 2.0, 0.35, '#8a3cff', 0.75]);
      } else if (o.type === 'gate') expand('portal', x, 0, z, 0, 1.1, out);
    }
    // Spieler (Platzhalter-Figur)
    const p = w.p, [px, pz] = lerp(p), face = Math.atan2(p.x - p.px || 0.0001, p.y - p.py || 1) || 0;
    this.face = Math.abs(p.x - p.px) + Math.abs(p.y - p.py) > 0.1 ? face : this.face || 0;
    // Spielfigur (eigener Entwurf, klobig wie die Vorlage): Farben vom ausgerüsteten Helden; Beine, Rumpf, Arme, großer Kopf, Rucksack
    const look = (game.c.by.heroes.get(game.stats.heroId) || {}).look || [], okc = (c0, d0) => (/^#[0-9a-fA-F]{6}$/.test(c0 || '') ? c0 : d0);
    const bc2 = p.alive ? okc(look[0], '#f5a524') : '#555c66', hc2 = p.alive ? okc(look[1], '#ffc94a') : '#777f8a', ac2 = okc(look[3], '#3f8ee0'), f = this.face, cf = Math.cos(f), sf = Math.sin(f);
    const at = (dx, dz) => [px + dx * cf + dz * sf, pz - dx * sf + dz * cf]; // dx = rechts, dz = vorn
    const part = (shape, dx, y, dz, sx, sy, sz, c2, em = 0) => { const [x, z] = at(dx, dz); return [shape, x, y, z, f, sx, sy, sz, c2, em]; };
    const ch = [part('box', -0.2, 0, 0, 0.26, 0.4, 0.3, '#7a4a2c'), part('box', 0.2, 0, 0, 0.26, 0.4, 0.3, '#7a4a2c'),
      part('box', 0, 0.36, 0, 0.82, 0.62, 0.52, bc2), part('box', 0, 0.36, 0.02, 0.84, 0.14, 0.54, '#7a4a2c'),
      part('box', -0.52, 0.42, 0.05, 0.22, 0.5, 0.26, '#8a5a3c'), part('box', 0.52, 0.42, 0.05, 0.22, 0.5, 0.26, '#8a5a3c'),
      part('box', 0, 0.5, -0.36, 0.5, 0.42, 0.24, '#6a4a30'),
      part('box', 0, 0.96, 0, 0.78, 0.68, 0.7, hc2), part('box', 0, 0.97, 0.01, 0.16, 0.69, 0.72, ac2), part('box', 0, 1.62, 0, 0.26, 0.16, 0.26, '#7a5236'),
      part('box', 0.62, 0.55, 0.45, 0.12, 0.12, 0.8, '#d9dde3', 0.1)];
    fx.push(['disc', px, 0.04, pz, 0, 3.2, 1, 3.2, '#8dff7a', 1]);
    out.push(...ch); xray.push(...ch); shadows.push(['disc', px, 0.02, pz, 0, 1.2, 1, 1.2, '#000000', 0]);
    // Gegner
    for (const e of w.enemies) {
      if (!e.alive) continue;
      const [ex, ez] = lerp(e);
      if (!vis(ex, ez)) continue;
      const v = e.v, rk = v.rank;
      if (rk === 'node') { expand(v.id === 'node_tree' ? 'tree_round2' : 'rock_grey', ex, 0, ez, 0, 0.75, out); continue; }
      const s = rk === 'boss' ? 2.1 : rk === 'rare' ? 1.6 : rk === 'elite' ? 1.3 : 1, hue = hash(v.monster.length * 31, v.monster.charCodeAt(0));
      const base = e.stunT > 0 ? '#ffffff' : e.slowT > 0 ? '#7fb6ff' : RANK_COL[rk] || RANK_COL.normal;
      const bc = col(base), tint = [bc[0] * (0.8 + hue * 0.35), bc[1] * (0.8 + (1 - hue) * 0.3), bc[2] * (0.85 + hue * 0.2)];
      const parts = [['cyl6', ex, 0, ez, 0, 0.8 * s, 0.75 * s, 0.8 * s, tint, 0], ['sphere', ex, 0.62 * s, ez, 0, 0.62 * s, 0.55 * s, 0.62 * s, tint, 0],
        ['box', ex - 0.14 * s, 0.85 * s, ez + 0.26 * s, 0, 0.1 * s, 0.1 * s, 0.1 * s, '#ffffff', 0.6], ['box', ex + 0.14 * s, 0.85 * s, ez + 0.26 * s, 0, 0.1 * s, 0.1 * s, 0.1 * s, '#ffffff', 0.6]];
      if (rk === 'boss' || rk === 'rare') parts.push(['cone6', ex, 1.12 * s, ez, 0, 0.5 * s, 0.45 * s, 0.5 * s, rk === 'boss' ? '#ffd24a' : '#d6a1ff', 0.6]);
      out.push(...parts); xray.push(parts[0], parts[1]);
      shadows.push(['disc', ex, 0.02, ez, 0, 1.0 * s, 1, 1.0 * s, '#000000', 0]);
      if (e.st === 'cast') fx.push(['disc', X(e.cx), 0.05, Z(e.cy), 0, 7.5, 1, 7.5, '#ff2030', 1]);
    }
    for (const d of w.drops) { const x = X(d.x), z = Z(d.y); if (vis(x, z)) out.push(['box', x, 0.05, z, 0.7, 0.35, 0.35, 0.35, d.item === 'gold' ? '#ffd54a' : d.item === 'gems' ? '#5ee0ff' : d.item.startsWith('orb') ? '#ff6ad5' : d.item === '#xp' ? '#9dff7a' : '#cfd8dc', 0.5]); }
    for (const b of w.proj) { const x = X(b.x), z = Z(b.y); out.push(['sphere', x, 0.6, z, 0, 0.3, 0.3, 0.3, b.hostile ? '#ff5a5a' : '#fff59d', 1]); }
    if (!st.settings.reducedFx) for (const f of w.fx) fx.push(['disc', X(f.x), 0.06, Z(f.y), 0, (f.r * 2) / ppm, 1, (f.r * 2) / ppm, ['#ffffff', '#ffc850', '#ff3c3c'][f.k], 1]);
    return { out, shadows, fx, xray, px, pz };
  }

  drawBuckets(set, alpha = 1) {
    const gl = this.gl;
    gl.uniform1f(this.U.i.alpha, alpha);
    for (const [shape, b] of Object.entries(set)) { if (!b.n) continue; gl.bindVertexArray(b.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, this.mesh[shape].n, b.n); }
  }
  dynUpload(key, parts) {
    const gl = this.gl, buckets = this.pack(parts), res = {};
    const slot = (this.dyn[key] ||= {});
    for (const shape of Object.keys(SHAPES)) {
      const arr = buckets[shape];
      let s = slot[shape];
      if (!arr) { if (s) s.n = 0; continue; }
      if (!s) { const ib = gl.createBuffer(); s = slot[shape] = { ib, vao: this.vao(shape, ib), cap: 0, n: 0 }; }
      gl.bindBuffer(gl.ARRAY_BUFFER, s.ib);
      const data = new Float32Array(arr);
      if (data.length > s.cap) { gl.bufferData(gl.ARRAY_BUFFER, data.byteLength * 2, gl.DYNAMIC_DRAW); s.cap = data.length * 2; }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      s.n = arr.length / INST; res[shape] = s;
    }
    return slot;
  }

  draw(game) {
    const gl = this.gl, w = game.world, map = w.map, G = w.G, B = G.world.bounds, sc = this.scene(map), ppm = G.ppm;
    // Kamera folgt dem Spieler (gedämpft), sichtbarer Ausschnitt in Metern
    const tx = B.minX + w.p.x / ppm, tz = w.p.y / ppm - B.maxZ;
    if (!this.cam || this.cam.map !== map) this.cam = { x: tx, z: tz, map };
    this.cam.x += (tx - this.cam.x) * 0.2; this.cam.z += (tz - this.cam.z) * 0.2;
    const aspect = this.h / this.w, hw = VIEW_W / 2, hh = hw * aspect, D = 60;
    const eye = [this.cam.x, Math.sin(TILT) * D, this.cam.z + Math.cos(TILT) * D], tgt = [this.cam.x, 0, this.cam.z];
    const vp = mul(ortho(-hw, hw, -hh, hh, 1, 140), lookAt(eye, tgt));
    this.vp = vp;
    const depthZ = hh / Math.sin(TILT);
    const view = { x0: this.cam.x - hw - 2, x1: this.cam.x + hw + 2, z0: this.cam.z - depthZ - 4, z1: this.cam.z + depthZ + 2 };
    const dy = this.dynamic(game, view);
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.clearColor(sc.sky[0], sc.sky[1], sc.sky[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
    const L = norm([-0.45, 0.85, 0.35]);
    gl.useProgram(this.pI); gl.uniform1f(this.zb, 0);
    for (const [prog, U] of [[this.pT, this.U.t], [this.pI, this.U.i]]) { gl.useProgram(prog); gl.uniformMatrix4fv(U.vp, false, vp); gl.uniform3fv(U.L, L); gl.uniform1f(U.alpha, 1); gl.uniform4f(U.flat, 0, 0, 0, 0); }
    gl.useProgram(this.pT); gl.disable(gl.CULL_FACE); gl.bindVertexArray(sc.tv); gl.drawArrays(gl.TRIANGLES, 0, sc.tn); gl.enable(gl.CULL_FACE);
    gl.useProgram(this.pI);
    gl.disable(gl.CULL_FACE); // Formen sind nicht alle geschlossen orientiert -> beidseitig
    this.drawBuckets(sc.inst);
    this.drawBuckets(this.dynUpload('o', dy.out));
    // Transparenz: Schatten, Effekte
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.uniform4f(this.U.i.flat, 0, 0, 0, 0.22); this.drawBuckets(sc.shadow); this.drawBuckets(this.dynUpload('s', dy.shadows));
    gl.uniform4f(this.U.i.flat, 0, 0, 0, 0);
    this.drawBuckets(this.dynUpload('f', dy.fx), 0.35);
    // Verdeckte Figuren als Silhouette sichtbar halten (Kamera-Sichtbarkeit hinter Felsen/Bäumen)
    // Bias: nur Verdeckungen mit > ~1,5 m Abstand (nicht die eigene Rückseite der Figur)
    gl.depthFunc(gl.GREATER); gl.uniform1f(this.zb, 0.022); gl.uniform4f(this.U.i.flat, 0.55, 0.75, 1.0, 0.45); this.drawBuckets(this.dynUpload('x', dy.xray));
    gl.uniform1f(this.zb, 0); gl.uniform4f(this.U.i.flat, 0, 0, 0, 0); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    this.overlay(game, sc);
  }
  // Welt -> Bildschirm (CSS-Pixel)
  project(x, y, z) {
    const m = this.vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    return [(cx * 0.5 + 0.5) * this.w, (0.5 - cy * 0.5) * this.h];
  }
  overlay(game, sc) {
    const ctx = this.ctx, w = game.world, G = w.G, B = G.world.bounds, ppm = G.ppm, st = game.state, set = st.settings, a = game.alpha;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const X = (x) => B.minX + x / ppm, Z = (y) => y / ppm - B.maxZ, px = X(w.p.x), pz = Z(w.p.y);
    ctx.textAlign = 'center'; ctx.font = '600 12px system-ui';
    // Questmarker und Ziel höchstens 2x pro Sekunde neu bestimmen (nicht pro Bild)
    const tnow = performance.now();
    if (!this.npcSt || tnow - this.stT > 500) {
      this.stT = tnow; this.npcSt = {};
      if (!w.mode) { for (const o of w.map.objects) if (o.type === 'npc') this.npcSt[o.id] = npcStatus(game.g, o); const q = currentQuests(game.g)[0]; this.goal = q ? game.questGoal(q.q) : null; } else this.goal = null;
    }
    const label = (txt, x, y, z, color = '#fff') => { const [sx, sy] = this.project(x, y, z); if (sx < -50 || sx > this.w + 50 || sy < 0 || sy > this.h) return; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.strokeText(txt, sx, sy); ctx.fillStyle = color; ctx.fillText(txt, sx, sy); };
    for (const o of w.map.objects) {
      const x = X(o.x), z = Z(o.y), d = Math.hypot(x - px, z - pz);
      if (d > 13) continue;
      if (o.type === 'building') label(st.buildings[o.id] ? o.name : `${o.name} (bauen)`, x, 4.2, z, st.buildings[o.id] ? '#fff' : '#ffe08a');
      else if (o.type === 'npc') { label(o.name, x, 2.5, z, '#bfffcf'); const m = this.npcSt[o.id]; if (m && m !== 'busy') { ctx.font = '800 22px system-ui'; label(m === 'turnin' ? '?' : '!', x, 3.5, z, m === 'turnin' ? '#7dff9a' : '#ffd24a'); ctx.font = '600 12px system-ui'; } }
      else if (o.type === 'gatebar' && !o.open()) { const ar = game.c.by.areas.get(o.needs); label(`🔒 ${ar ? game.c.get('variants', ar.boss).name + ' besiegen' : ''}`, x, 3.4, z, '#ffb3c6'); } else if (o.type === 'gate') label(o.open() ? '▲ Weiter' : '🔒', x, 4.6, z, '#9fe3ff');
      else if (o.type === 'areachest' && !st.claims[`areachest:${o.id}`]) label('Gebietstruhe', x, 1.8, z, '#ffe08a');
    }
    for (const e of w.enemies) {
      if (!e.alive) continue;
      const ex = X(e.px + (e.x - e.px) * a), ez = Z(e.py + (e.y - e.py) * a);
      if (Math.abs(ex - px) > 14 || Math.abs(ez - pz) > 24) continue;
      const s = e.v.rank === 'boss' ? 2.1 : e.v.rank === 'rare' ? 1.6 : e.v.rank === 'elite' ? 1.3 : 1, [sx, sy] = this.project(ex, 1.45 * s, ez);
      if (e.hp < e.maxHp || e.v.rank !== 'normal') { const bw = 26 * s; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(sx - bw / 2, sy - 6, bw, 4); ctx.fillStyle = '#6fdc6f'; ctx.fillRect(sx - bw / 2, sy - 6, (bw * e.hp) / e.maxHp, 4); }
      if (e.v.rank !== 'normal' && e.v.rank !== 'node') label(`${e.v.name} L${e.v.level}`, ex, 1.45 * s + 0.5, ez, e.v.rank === 'boss' ? '#ffd24a' : '#ffd0a0');
    }
    { // Lebensleiste über der Figur (HUD oben zeigt wie in der Vorlage nur Level, XP und Währungen)
      const [hx, hy] = this.project(X(w.p.px + (w.p.x - w.p.px) * a), 2.0, Z(w.p.py + (w.p.y - w.p.py) * a)), bw = 46, f = Math.max(0, w.p.hp / game.stats.hp);
      ctx.fillStyle = '#33221a'; ctx.fillRect(hx - bw / 2 - 2, hy - 9, bw + 4, 9); ctx.fillStyle = f > 0.35 ? '#5fd04a' : '#e5503f'; ctx.fillRect(hx - bw / 2, hy - 7, bw * f, 5);
    }
    if (set.dmgNumbers) for (const t of w.texts) {
      const [sx, sy] = this.project(X(t.x), 1.6, Z(t.y));
      ctx.globalAlpha = Math.min(1, t.t * 2); ctx.font = `${t.kind === 2 ? '800 16' : '700 13'}px system-ui`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
      const s = t.n < 10000 ? String(Math.round(t.n)) : t.n < 1e6 ? (t.n / 1e3).toFixed(1) + 'K' : (t.n / 1e6).toFixed(1) + 'M';
      ctx.strokeText(s, sx, sy); ctx.fillStyle = t.kind === 3 ? '#ff6b6b' : t.kind === 2 ? '#ffd54a' : '#fff'; ctx.fillText(s, sx, sy);
    }
    ctx.globalAlpha = 1;
    // Zielanzeige: Markierung am Ziel oder Pfeil am Bildrand in dessen Richtung
    if (this.goal) {
      const gx = X(this.goal.x), gz = Z(this.goal.y), [sx, sy] = this.project(gx, 2.8, gz), m = 34, top = 150, bot = this.h - 90;
      ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
      if (sx > m && sx < this.w - m && sy > top && sy < bot) { ctx.font = '800 20px system-ui'; ctx.strokeText('▼', sx, sy); ctx.fillText('▼', sx, sy); } else {
        const [cx, cy] = this.project(px, 1, pz), a = Math.atan2(sy - cy, sx - cx), ex = Math.max(m, Math.min(this.w - m, cx + Math.cos(a) * 1000)), ey = Math.max(top, Math.min(bot, cy + Math.sin(a) * 1000));
        const k = Math.min((ex - cx) / (Math.cos(a) * 1000 || 1e-9), (ey - cy) / (Math.sin(a) * 1000 || 1e-9)), ax = cx + Math.cos(a) * 1000 * Math.min(1, Math.abs(k)), ay = cy + Math.sin(a) * 1000 * Math.min(1, Math.abs(k));
        ctx.save(); ctx.translate(Math.max(m, Math.min(this.w - m, ax)), Math.max(top, Math.min(bot, ay))); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
      }
    }
    // Keine Minimap im HUD (die Vorlage hat keine); die Übersicht gibt es im Karten-Fenster.
  }
  minimap(game, sc) {
    const w = game.world, G = w.G, st = game.state, now = performance.now();
    if (!sc.minimap || now - sc.mmT > 1000) {
      sc.mmT = now;
      const cv = sc.minimap || (sc.minimap = Object.assign(document.createElement('canvas'), { width: G.cols, height: G.rows })), cx = cv.getContext('2d'), img = cx.createImageData(G.cols, G.rows);
      const fog = w.map.kind === 'world' ? st.world.fog[w.map.id] || {} : null, W = G.world;
      for (let i = 0; i < G.kind.length; i++) {
        const k = G.kind[i], b = BIOMES[(W.zones[G.zone[i] >= 0 ? G.zone[i] : G.near[i]] || W.zones[0]).biome] || BIOMES.arena;
        let c = k === FLOOR ? col(b.floor[0]) : k === WALL ? col(b.side).map((v) => v * 0.45) : col(k === LAVA ? WATER.lava : WATER.water);
        if (k === FLOOR && G.gate[i] >= 0 && !walkIdx(G, i)) c = [0.75, 0.25, 1];
        let seen = !fog;
        if (fog) { const r = (i / G.cols) | 0, cc = i % G.cols; for (let dr = -3; dr <= 3 && !seen; dr++) for (let dc = -3; dc <= 3 && !seen; dc++) if (fog[(r + dr) * G.cols + cc + dc]) seen = true; }
        const f = seen ? 1 : 0.18;
        img.data.set([c[0] * 255 * f, c[1] * 255 * f, c[2] * 255 * f, 235], i * 4);
      }
      cx.putImageData(img, 0, 0);
    }
    // unter den Quest-Karten platzieren (deren Höhe wechselt), nie darunter verdeckt
    const qb = document.getElementById('quests'), cvr = this.ov.getBoundingClientRect(), qbot = qb && qb.childElementCount ? qb.getBoundingClientRect().bottom - cvr.top : 0;
    const ctx = this.ctx, mw = Math.min(104, this.w * 0.26), mh = (mw * G.rows) / G.cols, x0 = this.w - mw - 8, y0 = Math.max(100, qbot + 8);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sc.minimap, x0, y0, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(x0 + 0.5, y0 + 0.5, mw - 1, mh - 1);
    const sx = mw / G.w, sy = mh / G.h;
    for (const e of w.enemies) if (e.alive && e.v.rank === 'boss') { ctx.fillStyle = '#ffd24a'; ctx.fillRect(x0 + e.x * sx - 2, y0 + e.y * sy - 2, 4, 4); }
    if (this.goal) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x0 + this.goal.x * sx, y0 + this.goal.y * sy, 3.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x0 + w.p.x * sx - 2.5, y0 + w.p.y * sy - 2.5, 5, 5);
  }
}

// ---------------------------------------------------------------- Mathe (spaltenweise 4x4)
function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function lookAt(e, t) {
  const f = norm([t[0] - e[0], t[1] - e[1], t[2] - e[2]]), s = norm(cross(f, [0, 1, 0])), u = cross(s, f);
  return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -(s[0] * e[0] + s[1] * e[1] + s[2] * e[2]), -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]), f[0] * e[0] + f[1] * e[1] + f[2] * e[2], 1];
}
function ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; }
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return new Float32Array(o); }
