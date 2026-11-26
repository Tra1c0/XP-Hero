// Erzeugt src/core/content/ch1_ref.js aus den Kartendaten von xphero.fans/map (Szenenkoordinaten, Unity-Meter, X=Ost, Z=Nord).
// Aufruf: node tools/import_ch1_map.js <pfad/zu/map/index.html>
// Übernommen werden nur Positionen, Typen, Monsternamen, Respawn- und Patrol-Werte. Shop-/Werbe-Objekte (IAP-/RV-Footboards) werden verworfen.
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const P = JSON.parse(/const POIS = (\[.*?\]);/s.exec(html)[1]);
const r = (v) => Math.round(v * 10) / 10;
const out = { spawns: [], stageChests: [], gifts: [], guides: [], raids: [], invasion: [], campfires: [], cain: null, townPortal: null };
const seen = new Set();
for (const p of P) {
  const k = `${p.type}:${p.chapter}:${p.x}:${p.z}:${p.name}`;
  if (seen.has(k)) continue; seen.add(k);
  if (p.type === 'spawn' && p.chapter) out.spawns.push([p.chapter, p.enemy_name, r(p.x), r(p.z), p.respawn, p.patrol ? 1 : 0]);
  else if (p.type === 'chest_type') out.stageChests.push([p.chapter, r(p.x), r(p.z), p.respawn]);
  else if (p.type === 'chest') out.gifts.push([p.name, r(p.x), r(p.z), p.respawn]);
  else if (/^NPC_Taid_Stage(\d)/.test(p.name)) out.guides.push([Number(/Stage(\d)/.exec(p.name)[1]), r(p.x), r(p.z)]);
  else if (/^NPC_BossRaid_Stage_(\d)/.test(p.name)) out.raids.push([Number(/_(\d)$/.exec(p.name)[1]), r(p.x), r(p.z)]);
  else if (p.type === 'invasion' && /^InvasionPortal( \(\d\))?$/.test(p.name)) out.invasion.push([r(p.x), r(p.z)]);
  else if (p.type === 'campfire') out.campfires.push([p.name, r(p.x), r(p.z)]);
  else if (p.name === 'NPC_Cain') out.cain = [r(p.x), r(p.z)];
  else if (p.name === 'TF_Portal') out.townPortal = [r(p.x), r(p.z)];
}
out.raids.sort((a, b) => a[0] - b[0]); out.guides.sort((a, b) => a[0] - b[0]);
const body = Object.entries(out).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n');
fs.writeFileSync(new URL('../src/core/content/ch1_ref.js', import.meta.url), `// GENERIERT von tools/import_ch1_map.js – nicht von Hand ändern.
// Quelle: xphero.fans/map (inoffiziell, aus Szenendateien der Referenzversion extrahiert), abgerufen 2026-11-26.
// Koordinaten in Metern: X = Ost, Z = Nord. spawns: [stage, monster, x, z, respawnSek, patrol]; gifts/stageChests: Respawn in Sekunden.
${body}
`);
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
