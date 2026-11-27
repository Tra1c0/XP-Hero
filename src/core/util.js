// Gemeinsame Hilfsfunktionen (rein, ohne DOM/Node-Abhängigkeit).
export const MAXI = Number.MAX_SAFE_INTEGER;
export const DAY_MS = 86400000;

export class GameError extends Error {
  constructor(code, msg) { super(msg || code); this.code = code; }
}
export const fail = (code, msg) => { throw new GameError(code, msg); };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
export const utcDay = (ms) => Math.floor(ms / DAY_MS);
// Woche beginnt Montag 00:00 UTC (Epoch-Tag 0 war ein Donnerstag).
export const utcWeek = (ms) => Math.floor((utcDay(ms) + 3) / 7);

// Deterministischer 53-Bit-Hash (cyrb53) für Prüfsummen und Content-Fingerprint. Nicht kryptografisch.
export function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Stabile Serialisierung (sortierte Schlüssel) für Fingerprints.
export function stable(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
}

// Seeded RNG mit persistiertem Zustand pro Stream (mulberry32). st = state.rng
export function rnd(st, key) {
  const a = (st[key] = ((st[key] | 0) + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rndInt = (st, key, min, max) => min + Math.floor(rnd(st, key) * (max - min + 1));
// Gewichtete Auswahl; Einträge mit Gewicht <= 0 werden nie gezogen.
export function pickWeighted(st, key, rows, wf = (r) => r.w) {
  let sum = 0;
  for (const r of rows) { const w = wf(r); if (w > 0) sum += w; }
  if (sum <= 0) return null;
  let x = rnd(st, key) * sum;
  for (const r of rows) { const w = wf(r); if (w > 0 && (x -= w) < 0) return r; }
  for (let i = rows.length - 1; i >= 0; i--) if (wf(rows[i]) > 0) return rows[i];
  return null;
}

// Lineare Interpolation über Stützzeilen [{lv, ...}] für Feld f (Zeilen nach lv sortiert).
export function interpRows(rows, lv, f, mode = 'linear') {
  let a = rows[0], b = null;
  for (const r of rows) { if (r.lv <= lv) a = r; else { b = r; break; } }
  const va = f(a);
  if (!b || mode === 'step' || a.lv >= lv && a.lv === lv) return va;
  const vb = f(b);
  return Math.round(va + ((vb - va) * (lv - a.lv)) / (b.lv - a.lv));
}

// UI-Abkürzung großer Zahlen; beeinflusst nie den internen Wert.
export function fmt(n) {
  if (n == null) return '-';
  const a = Math.abs(n);
  if (a < 10000) return String(Math.round(n));
  const u = ['K', 'M', 'B', 'T', 'Q'];
  let i = -1, v = a;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  const cut = (d) => (Math.floor(v * 10 ** d + 1e-9) / 10 ** d).toFixed(d); // abschneiden wie in der Vorlage (24.797 -> 24.7K), nicht runden
  return (n < 0 ? '-' : '') + (v >= 100 ? cut(0) : v >= 10 ? cut(1) : cut(2)) + u[i];
}
export function fmtTime(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
