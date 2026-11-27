// Begehbarkeitsraster einer Welt: Zonen, Tore, Hindernisse -> Zellen (Standard 2 m). Kollision, Pfadsuche (A*), Sichtlinie.
// Rein datengetrieben aus dem worlds-Content; identisch nutzbar in Simulation, Tests und Renderer. Kein DOM.
export const FLOOR = 1, WALL = 0, WATER = 2, LAVA = 3;

function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const inShape = (x, z, s) => (s.poly ? inPoly(x, z, s.poly) : (x - s.c[0]) ** 2 + (z - s.c[1]) ** 2 <= s.r * s.r);
function segDist2(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
  return (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2;
}

// world: { cell, ppm, bounds, zones[{id,biome,poly}], gates[{id,from,to,a,b,w,needs}], blockers[{kind,c,r|poly}] }
export function buildGrid(world) {
  const { cell, ppm, bounds: B } = world;
  const cols = Math.ceil((B.maxX - B.minX) / cell), rows = Math.ceil((B.maxZ - B.minZ) / cell), n = cols * rows;
  const kind = new Uint8Array(n), zone = new Int16Array(n).fill(-1), gate = new Int16Array(n).fill(-1), flat = new Uint8Array(n); // flat: blockiert, aber ebenerdig (Gebäude, Landmarken)
  const zoneIds = world.zones.map((z) => z.id), cpx = cell * ppm;
  const cx = (c) => B.minX + (c + 0.5) * cell, cz = (r) => B.maxZ - (r + 0.5) * cell; // Zeile 0 = Norden (oben)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cx(c), z = cz(r), i = r * cols + c;
    for (let k = 0; k < world.zones.length; k++) if (inPoly(x, z, world.zones[k].poly)) { zone[i] = k; kind[i] = FLOOR; break; }
  }
  // Grenzwälle zwischen direkt aneinanderstoßenden Zonen (Tore öffnen sie gezielt wieder)
  const z0 = zone.slice();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    if (z0[i] < 0) continue;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) { const o = z0[rr * cols + cc]; if (o >= 0 && o !== z0[i]) kind[i] = WALL; }
    }
  }
  for (const b of world.blockers || []) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    if (kind[i] === FLOOR && inShape(cx(c), cz(r), b)) { kind[i] = b.kind === 'water' ? WATER : b.kind === 'lava' ? LAVA : WALL; if (b.kind === 'solid') flat[i] = 1; }
  }
  // Tor-Korridore
  (world.gates || []).forEach((gt, k) => {
    const ha = world.zones.findIndex((z) => z.id === gt.from), hb = world.zones.findIndex((z) => z.id === gt.to), w2 = (gt.w / 2) ** 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = cx(c), z = cz(r), i = r * cols + c;
      if (segDist2(x, z, gt.a, gt.b) > w2) continue;
      if (kind[i] === WATER || kind[i] === LAVA) continue;
      kind[i] = FLOOR; gate[i] = k;
      if (zone[i] < 0 || (zone[i] !== ha && zone[i] !== hb)) zone[i] = segDist2(x, z, gt.a, gt.a) < segDist2(x, z, gt.b, gt.b) ? ha : hb;
    }
  });
  // Nicht begehbare Zellen bekommen die nächste Zone (für Biom-Optik/Minimap), per Mehrquellen-BFS.
  const near = zone.slice(), q = [];
  for (let i = 0; i < n; i++) if (near[i] >= 0) q.push(i);
  for (let h = 0; h < q.length; h++) {
    const i = q[h], r = (i / cols) | 0, c = i % cols;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const j = rr * cols + cc;
      if (near[j] < 0) { near[j] = near[i]; q.push(j); }
    }
  }
  const gateOpen = new Uint8Array((world.gates || []).length);
  return {
    world, cell, ppm, cpx, cols, rows, kind, zone, near, gate, gateOpen, flat, zoneIds, w: cols * cpx, h: rows * cpx,
    // Umrechnung Meter <-> Simulationseinheiten (px). Simulation: x nach Osten, y nach Süden.
    toPx: (X, Z) => ({ x: (X - B.minX) * ppm, y: (B.maxZ - Z) * ppm }),
    toM: (x, y) => ({ X: B.minX + x / ppm, Z: B.maxZ - y / ppm }),
  };
}

export const cellAt = (G, x, y) => { const c = Math.floor(x / G.cpx), r = Math.floor(y / G.cpx); return c < 0 || r < 0 || c >= G.cols || r >= G.rows ? -1 : r * G.cols + c; };
export const walkIdx = (G, i) => i >= 0 && G.kind[i] === FLOOR && (G.gate[i] < 0 || G.gateOpen[G.gate[i]] === 1);
export const walkable = (G, x, y) => walkIdx(G, cellAt(G, x, y));
export const zoneAt = (G, x, y) => { const i = cellAt(G, x, y); return i < 0 ? null : G.zoneIds[G.zone[i] >= 0 ? G.zone[i] : G.near[i]] ?? null; };

// Kreis gegen blockierte Zellen
export function blocked(G, x, y, r) {
  const c0 = Math.floor((x - r) / G.cpx), c1 = Math.floor((x + r) / G.cpx), r0 = Math.floor((y - r) / G.cpx), r1 = Math.floor((y + r) / G.cpx);
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
    if (rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols) return true;
    const i = rr * G.cols + cc;
    if (walkIdx(G, i)) continue;
    const nx = Math.max(cc * G.cpx, Math.min(x, (cc + 1) * G.cpx)), ny = Math.max(rr * G.cpx, Math.min(y, (rr + 1) * G.cpx));
    if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
  }
  return false;
}
// Bewegung mit Gleiten an Wänden. Liefert [x, y].
export function slide(G, x, y, nx, ny, r) {
  if (!blocked(G, nx, ny, r)) return [nx, ny];
  if (!blocked(G, nx, y, r)) return [nx, y];
  if (!blocked(G, x, ny, r)) return [x, ny];
  return [x, y];
}
// Nächste begehbare Zelle (Spiral-BFS), Ergebnis = Zellmitte in px.
// zone: optional Zonenindex, in dem der Punkt liegen muss.
export function snap(G, x, y, maxCells = 40, zone = -1) {
  const s = cellAt(G, x, y), ok = (i) => walkIdx(G, i) && (zone < 0 || G.zone[i] === zone);
  if (ok(s) && !blocked(G, x, y, 12)) return { x, y };
  const c0 = Math.floor(x / G.cpx), r0 = Math.floor(y / G.cpx);
  for (let d = 1; d <= maxCells; d++) {
    let best = null, bd = Infinity;
    for (let rr = r0 - d; rr <= r0 + d; rr++) for (let cc = c0 - d; cc <= c0 + d; cc++) {
      if (Math.max(Math.abs(rr - r0), Math.abs(cc - c0)) !== d || rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols) continue;
      const i = rr * G.cols + cc;
      if (!ok(i)) continue;
      const px = (cc + 0.5) * G.cpx, py = (rr + 0.5) * G.cpx, dd = (px - x) ** 2 + (py - y) ** 2;
      if (dd < bd) { bd = dd; best = { x: px, y: py }; }
    }
    if (best) return best;
  }
  return null;
}
// Sichtlinie über begehbare Zellen (Supercover in halben Zellschritten)
// rad > 0: Korridor in Körperbreite (zwei Parallelstrahlen), damit geglättete Wege nicht an Ecken hängen bleiben.
export function los(G, ax, ay, bx, by, rad = 0) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / (G.cpx * 0.5)), ox = d ? (-(by - ay) / d) * rad : 0, oy = d ? ((bx - ax) / d) * rad : 0;
  for (let k = 1; k <= n; k++) {
    const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (!walkIdx(G, cellAt(G, x, y))) return false;
    if (rad && (!walkIdx(G, cellAt(G, x + ox, y + oy)) || !walkIdx(G, cellAt(G, x - ox, y - oy)))) return false;
  }
  return true;
}
// A* (8 Richtungen, keine Eckabkürzung). Liefert Wegpunkte in px (ohne Start) oder null.
export function findPath(G, ax, ay, bx, by, maxExp = 6000) {
  const s = cellAt(G, ax, ay), t = cellAt(G, bx, by);
  if (s < 0 || t < 0 || !walkIdx(G, t)) return null;
  if (s === t) return [{ x: bx, y: by }];
  const C = G.cols, gS = new Map([[s, 0]]), from = new Map(), open = [[0, s]], closed = new Set();
  const tc = t % C, tr = (t / C) | 0, h = (i) => { const dc = Math.abs((i % C) - tc), dr = Math.abs(((i / C) | 0) - tr); return Math.max(dc, dr) + 0.414 * Math.min(dc, dr); };
  let exp = 0;
  while (open.length && exp++ < maxExp) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === t) break;
    if (closed.has(cur)) continue;
    closed.add(cur);
    const r = (cur / C) | 0, c = cur % C;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= G.rows || cc >= C) continue;
      const j = rr * C + cc;
      if (!walkIdx(G, j) || closed.has(j)) continue;
      if (dr && dc && (!walkIdx(G, r * C + cc) || !walkIdx(G, rr * C + c))) continue;
      const ng = gS.get(cur) + (dr && dc ? 1.414 : 1);
      if (ng < (gS.get(j) ?? Infinity)) { gS.set(j, ng); from.set(j, cur); open.push([ng + h(j), j]); }
    }
  }
  if (!from.has(t)) return null;
  const path = [];
  for (let i = t; i !== s; i = from.get(i)) path.push({ x: ((i % C) + 0.5) * G.cpx, y: (((i / C) | 0) + 0.5) * G.cpx });
  path.reverse();
  path[path.length - 1] = { x: bx, y: by };
  // Glätten: überspringe Wegpunkte mit freier Sichtlinie
  const out = [];
  let px = ax, py = ay;
  for (let k = 0; k < path.length; k++) {
    if (k + 1 < path.length && los(G, px, py, path[k + 1].x, path[k + 1].y, 20)) continue;
    out.push(path[k]); px = path[k].x; py = path[k].y;
  }
  return out;
}
// Erreichbare Zellen ab Startzelle (für Tests/Validierung)
export function reach(G, x, y) {
  const s = cellAt(G, x, y), seen = new Uint8Array(G.kind.length), q = [s];
  if (!walkIdx(G, s)) return seen;
  seen[s] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], r = (i / G.cols) | 0, c = i % G.cols;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc, j = rr * G.cols + cc;
      if (rr < 0 || cc < 0 || rr >= G.rows || cc >= G.cols || seen[j] || !walkIdx(G, j)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}
export { inPoly };
