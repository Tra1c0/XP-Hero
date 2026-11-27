import { SHAPES } from './assets3d.js';

const rgb = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) : c);
// Dieselbe Drehfolge wie im WebGL-Shader: Rolle, Neigung, Gier.
export function modelTriangles(parts) {
  const out = [];
  for (const [form, dx, dy, dz, gier, sx, sy, sz, farbe, leuchten = 0, neigung = 0, rolle = 0] of parts) {
    const formdaten = SHAPES[form];
    if (!formdaten) continue;
    const c = Math.cos(gier), s = Math.sin(gier), cp = Math.cos(neigung), sp = Math.sin(neigung);
    const cr = Math.cos(rolle), sr = Math.sin(rolle), col = rgb(farbe);
    for (let i = 0; i < formdaten.length; i += 18) {
      const ecken = [];
      for (let k = i; k < i + 18; k += 6) {
        const x = formdaten[k] * sx, y = formdaten[k + 1] * sy, z = formdaten[k + 2] * sz;
        const x1 = cr * x - sr * y, y1 = sr * x + cr * y, z2 = sp * y1 + cp * z;
        ecken.push([dx + x1 * c + z2 * s, dy + cp * y1 - sp * z, dz - x1 * s + z2 * c]);
      }
      out.push([ecken, col, leuchten]);
    }
  }
  return out;
}
