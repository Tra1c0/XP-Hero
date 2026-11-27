// Erzeugt src/core/content/npc_ref.js aus xphero.fans/npcs (inoffiziell). Aufruf: node tools/import_npcs.js <pfad/zu/npcs/index.html>
// Übernommen wird nur STRUKTUR: Figuren, Zonen, Questketten (Ziel, Menge, Belohnung) und die Freischaltbedingung jeder Dialogszene.
// Dialogzeilen und Biografien werden bewusst NICHT übernommen (fremde Texte); die Spieltexte sind eigene.
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8'), strip = (x) => x.replace(/<.*?>/g, '').replace(/\s+/g, ' ').trim();
const out = {};
for (const art of html.match(/<article class="npc".*?<\/article>/gs)) {
  const id = /id="npc-([\w-]+)"/.exec(art)[1], name = strip(/<h2>(.*?)<\/h2>/.exec(art)[1]);
  const zones = [...art.matchAll(/href="#zone-(\d+)"/g)].map((m) => Number(m[1]));
  const quests = [...art.matchAll(/<tr id="q-(\d+)"[^>]*><td class="num">\d+<\/td><td>(.*?)<\/td><td class="tg">(.*?)<\/td><td>(.*?)<\/td>/gs)]
    .map((m) => [Number(m[1]), strip(m[2]), Number(strip(m[3]).replace(/,/g, '')) || 0, strip(m[4])]);
  const scenes = [...art.matchAll(/class="sc-head">(.*?)<\/div>\s*<ul class="lines">(.*?)<\/ul>/gs)].map((m) => {
    const h = strip(m[1]), g = /after quest (\d+) · (.*)/.exec(h);
    return { after: g ? g[2] : null, lines: (m[2].match(/<li>/g) || []).length };
  });
  out[id] = { name, zones, quests, scenes };
}
fs.writeFileSync(new URL('../src/core/content/npc_ref.js', import.meta.url), `// GENERIERT von tools/import_npcs.js – nicht von Hand ändern.
// Quelle: xphero.fans/npcs (inoffiziell, aus NpcData/QuestData/DialogueGroupData der Referenzversion), abgerufen 2026-11-27.
// zones = Stage-Nummer (0 = Stadt). quests: [id, Ziel (Originalbezeichnung), Menge, Belohnung]. scenes: Freischaltquest + Zeilenzahl, ohne Text.
export const NPC_REF = ${JSON.stringify(out)};
`);
console.log(Object.entries(out).map(([k, v]) => `${k}: zonen ${v.zones} quests ${v.quests.length} szenen ${v.scenes.length}`).join('\n'));
