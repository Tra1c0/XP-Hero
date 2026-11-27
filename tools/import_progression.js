// Erzeugt src/core/content/progression_ref.js aus xphero.fans/progression (inoffiziell). Aufruf: node tools/import_progression.js <pfad/progression/index.html>
// Je Fähigkeit die im Spiel hinterlegten Stützstufen: [Stufe, Wert auf dieser Stufe, Kosten für den nächsten Schritt]. Nur Zahlen, keine Texte oder Bilder.
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8'), sec = /<section id="abilities".*?<\/section>/s.exec(html)[0];
const ITEM = { Gold: 'gold', 'Red Orb': 'orb_red', 'Pink Orb': 'orb_pink', 'Ice Orb': 'orb_ice', 'Jungle Orb': 'orb_jungle', 'Hell Orb': 'orb_hell' }, out = {};
for (const d of sec.match(/<details class="ability".*?<\/details>/gs)) {
  const name = /<span>(.*?) <span class="d">/.exec(d)[1], max = Number(/up to Lv (\d+)/.exec(d)[1]);
  const rows = [...d.matchAll(/<tr><td class="num">([\d,]+)<\/td><td class="num">\+?([\d.,e+]+)<\/td><td>(.*?)<\/td><\/tr>/gs)].map((m) => {
    const cost = {};
    for (const c of m[3].matchAll(/>([\d,]+) ([A-Za-z ]+)<\/span>/g)) cost[ITEM[c[2].trim()]] = Number(c[1].replace(/,/g, ''));
    return [Number(m[1].replace(/,/g, '')), Math.round(Number(m[2].replace(/,/g, ''))), cost];
  });
  out[name] = { max, rows };
}
fs.writeFileSync(new URL('../src/core/content/progression_ref.js', import.meta.url), `// GENERIERT von tools/import_progression.js – nicht von Hand ändern.
// Quelle: xphero.fans/progression (inoffiziell, aus den Spieldaten der Referenzversion), abgerufen 2026-11-27.
// rows: [Stufe, Wert auf dieser Stufe, Kosten für den Schritt von dieser Stufe zur nächsten]. Werte ab ca. 1 Mio. sind in der Quelle auf 6 Stellen gerundet.
export const ABILITY_REF = ${JSON.stringify(out)};
`);
console.log(Object.entries(out).map(([k, v]) => `${k}: max ${v.max}, ${v.rows.length} Stützstufen`).join('\n'));
