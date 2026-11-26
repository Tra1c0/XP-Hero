// Erzeugt docs/PARITAETSREGISTER.md direkt aus dem Content-Paket (eine Zeile je Tabelle/Konfigwert, plus abweichende Zeilenstatus).
import fs from 'node:fs';
import { buildBaseContent } from '../src/core/content/base.js';
import { fingerprint } from '../src/core/content/validate.js';

const p = buildBaseContent(), L = { D: 'belegt (Referenz 27.2.0)', B: 'beobachtet, Details eigen', R: 'rekonstruiert', E: 'EIGENER Wert', '?': 'offen / zu verifizieren' };
const esc = (s) => String(s || '').replace(/\|/g, '/');
let md = `# Paritätsregister\n\nAutomatisch erzeugt mit \`npm run parity\` aus \`src/core/content/base.js\` (Version ${p.version}, Fingerprint ${fingerprint(p)}).\nQuelle aller Referenzangaben: Systemanalyse (Stand 26.11.2026, Referenz 27.2.0, inoffizielle Fan-Daten). Es fand keine eigene Datenextraktion statt.\n\n`;
md += `Status: ${Object.entries(L).map(([k, v]) => `**${k}** = ${v}`).join(' · ')}\n\nJeder Wert ist im Admin-Panel unter „Content & Balancing“ änderbar; kein Wert steht im Gameplay-Code.\n\n## Tabellen\n\n| Tabelle | Zeilen | Status | Zeilen nach Status | Hinweis |\n|---|---|---|---|---|\n`;
for (const [t, rows] of Object.entries(p.tables)) {
  const m = p.meta[t], by = {};
  for (const r of rows) { const s = r.s || m.status; by[s] = (by[s] || 0) + 1; }
  md += `| ${t} | ${rows.length} | ${m.status} | ${Object.entries(by).map(([k, n]) => `${k}:${n}`).join(' ')} | ${esc(m.note)} |\n`;
}
md += `\n## Konfigurationswerte\n\n| Schlüssel | Status | Wert | Hinweis |\n|---|---|---|---|\n`;
for (const [k, v] of Object.entries(p.config)) { const j = JSON.stringify(v); md += `| ${k} | ${p.configMeta[k].status} | \`${esc(j.length > 110 ? j.slice(0, 107) + '…' : j)}\` | ${esc(p.configMeta[k].note)} |\n`; }
md += `\n## Offene Originaldaten (nicht erfunden, nicht behauptet)\n\n`;
md += ['Vollständige XP-Schwellen je Level und Kill-XP je Gegnervariante; XP-Auszahlungsort und Rundung.', 'Formelreihenfolge bei Schaden und Stats; Transzendenzboni der Waffen; StatReduction der Helden.',
  '206 Monster / 246 Varianten: nur die dokumentierten Beispiele tragen Referenzwerte.', 'Vollständige Heldenliste (24/26), Skill-Prozentwerte, Evolutionsoptionen.',
  'Fehlende 40 % der Schmiede-Gewichte ab Stufe 2 und mögliche Mehrfachpools.', '14 der 26 Gacha-Boxen, exakte Gewichte, Pity-Gruppen, Gem-Preise je Box.',
  'Trait-Slotzahl, Rollgewichte, Lock- und Synergiekosten.', 'Rune-Effekte und Einheiten, Levelkosten, Dismantle-Refunds, Typgewichte.', '19 der 26 Gebäude und alle Materialmengen.',
  'Alle Shop-SKUs und Ingame-Preise; Paid-Track des Chapter Pass (77.000 Gems) wird bewusst nicht ausgezahlt.', 'Ca. 850 Quest- und alle NPC-/Dialogzeilen; Kartenkoordinaten.',
  '250 Tower-Etagen (nur Etage 151 = 35 Gems belegt), Raid-, Tomb-, PvP- und Invasion-Algorithmen und -Rewards.', 'Zuordnung der internen Orb-Namen Crimson/Azure/Soul; Einheit der Perk-Werte Cargo 2000 / EXP 1000.',
  'Lucky-Spin-Tabellen (192 Zeilen), Unlock-Config „1,3“, Daily-Gem-Shop-RV-Cap-Semantik.', 'Offline-Respawn und Original-KI.'].map((x) => `- ${x}`).join('\n') + '\n';
fs.writeFileSync(new URL('../docs/PARITAETSREGISTER.md', import.meta.url), md);
console.log('docs/PARITAETSREGISTER.md geschrieben');
