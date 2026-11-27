// Erzeugt src/core/content/bestiary_ref.js aus xphero.fans/bestiary und /stats (inoffiziell).
// Aufruf: node tools/import_bestiary.js <pfad/bestiary/index.html> <pfad/stats/index.html>
// Übernommen werden nur ZAHLEN und Namen: Stage (aus dem Symbolnamen CH<n>), Gold, Respawn, Drops und je Variante id/Level/HP/ATK/Typ/Tempo.
// Beschreibungstexte und Bilder werden bewusst NICHT übernommen.
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8'), stats = fs.readFileSync(process.argv[3], 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const spd = {};
for (const m of stats.matchAll(/id (\d+) HP [\d,]+ · ATK [\d,]+ · SPD ([\d.]+)/g)) spd[m[1]] = Number(m[2]);
const num = (x) => Number(x.replace(/,/g, '')), ITEM = { Bluestone: 'bluestone', Gem: 'gems', 'Hell Orb': 'orb_hell', 'Ice Orb': 'orb_ice', 'Jungle Orb': 'orb_jungle', 'Pink Orb': 'orb_pink', 'Red Orb': 'orb_red', 'Trait Point': 'attr_point' };
const out = [];
for (const b of html.match(/<details class="mob".*?<\/details>/gs)) {
  const icon = (/icons\/monsters\/([^"]+)\.png/.exec(b) || [])[1] || '', ch = Number((/CH(\d+)/.exec(icon) || [0, 0])[1]);
  const name = /<div class="mnm">(.*?)(?: <span|<\/div>)/.exec(b)[1].trim().replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  if (/^Herotomb|^Corrupted (Assassin|Frost|Paladin|Skull)$/.test(name)) continue;
  const sub = /<div class="msub">(.*?)<\/div>/.exec(b)[1], g = /([\d,]+) gold/.exec(sub), r = /respawn ([\d.]+) (sec|min|h)/.exec(sub);
  const drops = [...b.matchAll(/<span class="chip">(?:<img[^>]*>)?(.*?)<b>×([\d,]+)<\/b>/g)].map((m) => [ITEM[m[1].replace(/<[^>]+>/g, '').trim()], num(m[2])]).filter((d) => d[0]);
  const v = [...b.matchAll(/<tr><td class="num">(\d+)<\/td><td class="num">(\d+)<\/td><td class="num">([\d,]+)<\/td><td class="num">([\d,]+)<\/td><td>(\w+)<\/td>/g)]
    .map((m) => [Number(m[1]), Number(m[2]), num(m[3]), num(m[4]), m[5], spd[m[1]] ?? null]);
  out.push({ n: name, ch, g: g ? num(g[1]) : 0, r: r ? Number(r[1]) * { sec: 1, min: 60, h: 3600 }[r[2]] : 0, d: drops, v });
}
fs.writeFileSync(new URL('../src/core/content/bestiary_ref.js', import.meta.url), `// GENERIERT von tools/import_bestiary.js – nicht von Hand ändern.
// Quelle: xphero.fans/bestiary und /stats (inoffiziell, aus den Spieldaten der Referenzversion), abgerufen 2026-11-27.
// n Name, ch Stage laut Symbolname (0 = ohne Zuordnung), g Gold, r Respawn in Sekunden, d Drops [Item, Menge], v Varianten [id, Level, HP, ATK, Typ, Tempo].
export const BESTIARY = ${JSON.stringify(out)};
`);
console.log(out.length, 'Monster,', out.reduce((a, o) => a + o.v.length, 0), 'Varianten');
