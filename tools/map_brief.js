#!/usr/bin/env node
// Schreibt docs/KARTEN_BRIEF.md: Bestand der Karten-Requisiten (eigene Entwürfe) mit Maßen und Häufigkeit sowie die Regeln, nach denen detailliertere Modelle
// die heutigen ersetzen können, ohne dass sich die Karte ändert.
import fs from 'node:fs';
import { PROPS, BUILDINGS3D, SCATTER, expand } from '../src/client/assets3d.js';
import { DECO, CHOP, STONE } from '../src/core/content/scene1_ref.js';
import { MAP1 } from '../src/core/content/world1_map.js';
const dim = (name) => { const p = expand(name, 0, 0, 0, 0, 1, []); if (!p.length) return null; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, h = 0; for (const t of p) { x0 = Math.min(x0, t[1] - t[5] / 2); x1 = Math.max(x1, t[1] + t[5] / 2); z0 = Math.min(z0, t[3] - t[7] / 2); z1 = Math.max(z1, t[3] + t[7] / 2); h = Math.max(h, t[2] + t[6]); } return [x1 - x0, h, z1 - z0, p.length]; };
const rule = {}; for (const [biome, r] of Object.entries(SCATTER)) for (const k of ['edge', 'deep', 'floor']) for (const [n] of r[k]) (rule[n] ||= new Set()).add(biome);
const fixed = Object.fromEntries(Object.entries(DECO).map(([k, v]) => [k, v.length])), out = [];
out.push('# Karten-Auftrag: Requisiten, Boden, Regeln', '', 'Erzeugt von `tools/map_brief.js`. Bilder dazu: `docs/sheets/karte_*.png`.', '',
  '## Was die Karte festlegt (bleibt unverändert)', '',
  `- **Raster:** ${MAP1.cols} × ${MAP1.rows} Zellen zu ${MAP1.cell} m (\`src/core/content/world1_map.js\`). Je Zelle: außerhalb, Fels, Boden eines Gebiets oder Wasser, dazu ein Farbton aus ${MAP1.pal.length} Palettenfarben.`,
  `- **Feste Plätze:** ${Object.values(fixed).reduce((a, b) => a + b, 0)} Deko-Objekte, ${CHOP.length} fällbare Bäume, ${STONE.length} Steine/Erze, jeweils mit Position, Drehung und Größe (\`src/core/content/scene1_ref.js\`).`,
  '- **Kollision:** nur das Raster. Requisiten blockieren nicht; sie sind reine Darstellung.', '',
  '## Damit es nur detaillierter wird und sich nichts verschiebt', '',
  '1. **Gleicher Name, gleiche Rolle:** Ein neues Modell ersetzt genau eine Requisite der Tabelle unten und trägt ihren Namen (`<name>.glb`).',
  '2. **Gleiche Standfläche und Höhe:** Breite, Tiefe und Höhe der Tabelle auf ±15 % einhalten. Größere Modelle ragen in Wege oder verdecken Gegner.',
  '3. **Ursprung am Boden, mittig:** Y nach oben, Vorderseite nach +Z, 1 Einheit = 1 Meter. Die Karte dreht und skaliert selbst (Drehung in 10°-Schritten, Größe 0,7–1,6).',
  '4. **Varianten statt Einzelstücke:** Pro Requisite 2–4 Varianten liefern (`rock_grey_a.glb`, `rock_grey_b.glb` …). Das Spiel wählt je Platz fest eine aus – so wirkt es abwechslungsreich, ohne dass ein Platz wandert.',
  '5. **Farbe aus der Kartenpalette:** Felsen und Bodendeko nehmen den Farbton ihrer Zelle an (Bild `karte_palette.png`). Modelle dafür in neutralem Hellgrau anlegen; nur Akzente (Blüten, Pilzhüte, Kristalle) fest einfärben.',
  '6. **Budget:** Kleinteile (Gras, Blumen, Steine) höchstens 40 Dreiecke, mittlere (Zaun, Busch, Fels) 60–150, große (Baum, Säule, Statue) 150–350, Gebäude bis 800. Auf der ganzen Karte stehen rund 1.400 feste Objekte plus die Felsbrocken jeder Felszelle.',
  '7. **Material:** ein gemeinsames Material, Vertex-Farben oder die gemeinsame kleine Palettentextur, weiche Normalen. Keine Einzeltexturen, keine Transparenz (Blätter als Flächen modellieren, nicht als Alpha-Karten).', '',
  '## Was zusätzlich neu sein darf (ändert die Karte nicht)', '',
  '- **Streu-Deko:** Kleinteile ohne festen Platz (Kiesel, Grasbüschel, Blätter, Risse), die das Spiel regelbasiert auf Bodenzellen verteilt – je Gebiet eine Liste mit Dichte. Diese Streuung ist in Kapitel 1 derzeit aus und kann mit neuen Kleinteilen wieder eingeschaltet werden.',
  '- **Bodenkacheln:** ein dezentes Muster je Gebiet (Kachel, Sandwellen, Schneeflecken) als Vertex-Farbvariation; die Zellfarbe bleibt die Grundlage.',
  '- **Ränder:** Übergangsstücke zwischen Boden und Fels (Geröll, Grasnarbe) und zwischen Boden und Wasser (Ufer).', '',
  '## Requisiten im Bestand', '', '„Feste Plätze“ = Anzahl in Kapitel 1. „Streuung“ = Gebiete, in denen die Requisite regelbasiert gestreut wird (Kapitel 2/3 und Arenen).', '',
  '| Name | Breite m | Höhe m | Tiefe m | Teile heute | Feste Plätze | Streuung |', '|---|---|---|---|---|---|---|');
for (const k of Object.keys(PROPS)) { const d = dim(k); if (!d) continue; out.push(`| \`${k}\` | ${d[0].toFixed(1)} | ${d[1].toFixed(1)} | ${d[2].toFixed(1)} | ${d[3]} | ${fixed[k] || '–'} | ${rule[k] ? [...rule[k]].join(', ') : '–'} |`); }
out.push('', '## Gebäude', '', '| Name | Breite m | Höhe m | Tiefe m | Teile heute |', '|---|---|---|---|---|');
for (const k of Object.keys(BUILDINGS3D)) { const d = dim(k); if (d) out.push(`| \`${k}\` | ${d[0].toFixed(1)} | ${d[1].toFixed(1)} | ${d[2].toFixed(1)} | ${d[3]} |`); }
out.push('', '## Rohstoffe (im Spiel angreifbar)', '', `- Fällbarer Baum: ${CHOP.length} Plätze, drei Fassungen (Wiese \`tree_round\`, Wüste \`palm\`, Schnee \`pine_snow\`). Braucht zusätzlich einen Stumpf-Zustand nach dem Fällen.`, `- Stein/Erz: ${STONE.length} Plätze, zwei Fassungen (\`rock_grey\`, \`ore\`).`);
fs.writeFileSync(new URL('../docs/KARTEN_BRIEF.md', import.meta.url), out.join('\n') + '\n');
console.log(Object.keys(PROPS).length, 'Requisiten ->', 'docs/KARTEN_BRIEF.md');
