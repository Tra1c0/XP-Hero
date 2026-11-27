import { modelTriangles } from './modelTriangles.js';
import { buildWeaponParts, weaponInstances } from './weapons3d.js';

const GRÖSSE = 48, RAND = 4;
const ANSICHT = {
  // Die Bogenarme brauchen mehr Draufsicht, das Drachenmaul mehr Seitenansicht.
  crossbow: [-.67, 1.03],
  gun: [-1.02, .58],
  blunt: [-.86, .73],
};
const STANDARD = [-.75, .84];

export function weaponIconSvg(teile, art) {
  const [gier, neigung] = ANSICHT[art] || STANDARD;
  const cg = Math.cos(gier), sg = Math.sin(gier), cn = Math.cos(neigung), sn = Math.sin(neigung);
  const flaechen = modelTriangles(weaponInstances(teile)).map(([ecken, rgb, leuchten]) => {
    const [a, b, c] = ecken;
    const [ux, uy, uz] = b.map((wert, i) => wert - a[i]);
    const [vx, vy, vz] = c.map((wert, i) => wert - a[i]);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const licht = Math.abs((.35 * nx + .84 * ny + .41 * nz) / (Math.hypot(nx, ny, nz) || 1));
    const schattierung = .56 + .44 * Math.min(1, licht);
    const helligkeit = schattierung + (1 - schattierung) * leuchten;
    const farbe = '#' + rgb.map((wert) => Math.round(wert * helligkeit * 255).toString(16).padStart(2, '0')).join('');
    const punkte = ecken.map(([x, y, z]) => {
      const tiefe = x * sg + z * cg;
      return [x * cg - z * sg, -y * cn - tiefe * sn, tiefe * cn - y * sn];
    });
    const tiefe = punkte.reduce((summe, punkt) => summe + punkt[2], 0);
    return { punkte, farbe, tiefe };
  });

  const punkte = flaechen.flatMap((flaeche) => flaeche.punkte);
  const xs = punkte.map(([x]) => x), ys = punkte.map(([, y]) => y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const skala = (GRÖSSE - 2 * RAND) / Math.max(x1 - x0, y1 - y0);
  const mitteX = (x0 + x1) / 2, mitteY = (y0 + y1) / 2;
  const koordinaten = (x, y) => `${(GRÖSSE / 2 + (x - mitteX) * skala).toFixed(1)} ${(GRÖSSE / 2 + (y - mitteY) * skala).toFixed(1)}`;

  const pfade = flaechen.sort((a, b) => b.tiefe - a.tiefe).map(({ punkte: [a, b, c], farbe }) => {
    const winding = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const [p, q, r] = (winding < 0 ? [a, c, b] : [a, b, c]).map(([x, y]) => koordinaten(x, y));
    return [`M${p} ${q} ${r}Z`, farbe];
  });
  // Die gleich ausgerichteten Dreiecke bilden gemeinsam die Kontur samt Öffnungen.
  const kontur = pfade.map(([pfad]) => pfad).join('');
  const farbflaechen = pfade.map(([pfad, farbe]) => `<path d="${pfad}" fill="${farbe}" stroke="${farbe}"/>`).join('');
  return `<svg viewBox="0 0 ${GRÖSSE} ${GRÖSSE}" stroke-linejoin="round"><path d="${kontur}" fill="#251d29" stroke="#251d29" stroke-width="2.6"/><g stroke-width=".34">${farbflaechen}</g></svg>`;
}

const cache = new WeakMap();
export function weaponIconSource(waffe, content) {
  let eintrag = cache.get(content);
  if (!eintrag) {
    eintrag = { modelle: buildWeaponParts(content.t.rarities), icons: new Map() };
    cache.set(content, eintrag);
  }
  const { modelle, icons } = eintrag;
  const teile = modelle[waffe.id];
  if (!teile) return null;
  if (!icons.has(waffe.id)) {
    // Der Browser ergänzt beim Serialisieren den SVG-Namensraum für die Bilddatei.
    const vorlage = document.createElement('template');
    vorlage.innerHTML = weaponIconSvg(teile, waffe.cls);
    const svg = new XMLSerializer().serializeToString(vorlage.content.firstElementChild);
    icons.set(waffe.id, 'data:image/svg+xml,' + encodeURIComponent(svg));
  }
  return icons.get(waffe.id);
}
