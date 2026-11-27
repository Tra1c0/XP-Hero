#!/usr/bin/env node
// Schreibt docs/MODELL_BRIEF.md: Liste aller Figuren, Waffen und Helden als Auftragsgrundlage für eigene Modelle.
// Enthält nur Spielangaben (Name, Rolle, Größe, Gebiet, Waffenart) – keine Bilder und keine Beschreibung fremder Entwürfe.
import fs from 'node:fs';
import { buildBaseContent } from '../src/core/content/base.js';
const T = buildBaseContent().tables, out = [];
const RAR = ['Normal', 'Fine', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mythic', 'Exotic'], CLS = Object.fromEntries(T.weaponClasses.map((c) => [c.id, c.name]));
const areaOf = (v) => [...new Set(T.spawnGroups.filter((g) => g.v === v.id).map((g) => T.areas.find((a) => a.id === g.area)?.name || g.area))].join(', ');
const RANK = { normal: 'Normal', elite: 'Elite', rare: 'Selten', boss: 'Boss', special: 'Spezial', raid: 'Raid-Boss' }, SCALE = { boss: 2.1, rare: 1.6, elite: 1.3 };
out.push('# Modell-Auftrag: Figuren, Waffen, Helden', '', 'Erzeugt von `tools/model_brief.js`. Grundlage für eigene Modelle; die Gestaltung ist frei.', '',
  '## Technische Vorgaben', '',
  '- Blick: schräg von oben (45°), Figur schaut nach Süden zur Kamera. Lesbarkeit von oben zählt mehr als Details von vorn.',
  '- Maßstab: 1 Einheit = 1 Meter. Spielfigur ca. 1,1 m hoch. Die Spalte „Höhe“ ist die Zielhöhe im Spiel.',
  '- Budget (damit es leicht bleibt): Gegner 150–400 Dreiecke, Bosse bis 1.000, Waffen 40–120, Helden 300–600.',
  '- Farbe als Vertex-Farbe oder eine gemeinsame kleine Palettentextur (max. 256×256 für alle Figuren zusammen). Keine Einzeltexturen je Figur.',
  '- Format: glTF 2.0 binär (.glb), Ursprung zwischen den Füßen am Boden, +Y oben, Blick nach +Z.',
  '- Animation: nicht nötig. Hüpfen, Angriffsruck, Treffer-Blinken und Waffenschwung rechnet das Spiel selbst. Waffen als eigenes Modell, Griff im Ursprung, Klinge nach +Y.',
  '- Achtung: Das Spiel zeichnet derzeit nur Grundformen. Für .glb-Modelle muss ein Lader ergänzt werden (offen).', '');
// Gegner: je Monsterart eine Zeile (Varianten teilen sich das Modell)
const seen = new Map();
for (const v of T.variants) { if (v.rank === 'node') continue; const k = v.monster || v.id; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(v); }
out.push(`## Gegner (${seen.size} Modelle für ${[...seen.values()].flat().length} Varianten)`, '', '| Datei | Name | Rang | Gebiet | Level | Höhe | Angriff | Varianten |', '|---|---|---|---|---|---|---|---|');
for (const [k, vs] of seen) {
  const v = vs[0], size = v.ai ? v.ai.size : 0, h = (0.8 + size * 0.35) * (SCALE[v.rank] || 1);
  out.push(`| \`enemy_${k}.glb\` | ${v.name} | ${RANK[v.rank] || v.rank} | ${areaOf(v) || '–'} | ${Math.min(...vs.map((x) => x.level))}${vs.length > 1 ? '–' + Math.max(...vs.map((x) => x.level)) : ''} | ${h.toFixed(1)} m | ${v.beh === 'ranged' ? 'Fernkampf' : v.beh === 'flee' ? 'flieht' : 'Nahkampf'} | ${vs.length > 1 ? vs.map((x) => x.name).filter((n, i, a) => a.indexOf(n) === i).join(', ') : ''} |`);
}
out.push('', '## Rohstoffe und Figuren der Siedlung', '', '| Datei | Name | Hinweis |', '|---|---|---|', '| `node_tree.glb` | Baum (fällbar) | drei Fassungen: Wiese, Wüste, Schnee |', '| `node_rock.glb` | Stein / Erz | zwei Fassungen: Wiese, Schnee |');
for (const [char, name] of new Map(T.npcs.map((n) => [n.char, n.name]))) out.push(`| \`npc_${char}.glb\` | ${name} | steht still, ca. 1,1 m |`);
out.push('', `## Helden (${T.heroes.length})`, '', 'Die vier Farben sind die heutigen Farben der Figur im Spiel (Körper, Kopf, Kopfschmuck-Art, Akzent) und nur ein Vorschlag.', '', '| Datei | Name | Seltenheit | Waffenart | Körper | Kopf | Kopfschmuck | Akzent |', '|---|---|---|---|---|---|---|---|');
for (const hh of T.heroes) out.push(`| \`hero_${hh.id}.glb\` | ${hh.name} | ${hh.rarity} | ${CLS[hh.mastery] || hh.mastery} | ${hh.look[0]} | ${hh.look[1]} | ${hh.look[2]} | ${hh.look[3]} |`);
out.push('', `## Waffen (${T.weapons.length})`, '', 'Reihe n = Hauptreihe, s = S-Reihe. Länge = Zielgröße des Modells; sie wächst leicht mit der Seltenheit.', '', '| Datei | Name | Art | Reihe | Seltenheit | Länge | Fernwaffe | Fertigkeit |', '|---|---|---|---|---|---|---|---|');
const LEN = { dagger: 0.5, sword: 0.9, blunt: 0.9, crossbow: 0.7, gun: 0.6, staff: 1.1 };
for (const w of T.weapons) out.push(`| \`${w.id}.glb\` | ${w.name} | ${CLS[w.cls]} | ${w.series} | ${RAR[w.rarity]} | ${(LEN[w.cls] * (1 + w.rarity * 0.05)).toFixed(2)} m | ${w.ranged ? 'ja' : 'nein'} | ${w.wskill ? w.wskill.name : '–'} |`);
fs.writeFileSync(new URL('../docs/MODELL_BRIEF.md', import.meta.url), out.join('\n') + '\n');
console.log(`${seen.size} Gegner-Modelle, ${T.heroes.length} Helden, ${T.weapons.length} Waffen -> docs/MODELL_BRIEF.md`);
