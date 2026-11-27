// Erzeugt src/core/content/weapon_ref.js aus xphero.fans/weapons (inoffiziell). Aufruf: node tools/import_weapons.js <pfad/weapons/index.html>
// Je Waffenart und Reihe (n = Hauptreihe, s = S-Reihe) die Stufen: [Name, Seltenheit, Angriffe je Sekunde, Fertigkeit oder null, Schadensfaktor]. Nur Namen und Zahlen.
import fs from 'node:fs';
const t = fs.readFileSync(process.argv[2], 'utf8').replace(/<script.*?<\/script>|<style.*?<\/style>/gs, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const CLS = { Daggers: 'dagger', Swords: 'sword', Morningstars: 'blunt', Maces: 'blunt', Crossbows: 'crossbow', Guns: 'gun', Wands: 'staff' }, RAR = ['Normal', 'Fine', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mythic', 'Exotic', 'Eternal'], out = {};
const heads = [...t.matchAll(/(\w+) — (Main|S1) line · (\d+) tiers/g)];
heads.forEach((h, k) => {
  const cls = CLS[h[1]]; if (!cls) return;
  const seg = t.slice(h.index, k + 1 < heads.length ? heads[k + 1].index : t.length), rows = [];
  for (const m of seg.matchAll(/([A-Z][\w' -]*?) (Normal|Fine|Rare|Epic|Legendary|Ancient|Mythic|Exotic|Eternal) · (melee|ranged) · spd ([\d.]+) Basic ×1(?: ([A-Za-z]+)(?: \d)? ×([\d.]+))?/g))
    rows.push([m[1].replace(/^.*→ /, '').replace(/^(Exotic|Eternal) /, '').trim(), RAR.indexOf(m[2]), Number(m[4]), m[5] || null, m[6] ? Number(m[6]) : 0]);
  (out[cls] ||= {})[h[2] === 'Main' ? 'n' : 's'] = rows.slice(0, Number(h[3]));
});
fs.writeFileSync(new URL('../src/core/content/weapon_ref.js', import.meta.url), `// GENERIERT von tools/import_weapons.js – nicht von Hand ändern.
// Quelle: xphero.fans/weapons (inoffiziell, aus den Spieldaten der Referenzversion), abgerufen 2026-11-27. Gegengeprüft mit dem Fan-Wiki (Fertigkeit erst ab Epic, Schaden als Gesamtfaktor).
// [Name, Seltenheit 0-8, Angriffe je Sekunde, Fertigkeit oder null, Schadensfaktor]
export const WEAPON_REF = ${JSON.stringify(out)};
`);
console.log(Object.entries(out).map(([c, v]) => `${c}: n ${v.n ? v.n.length : 0} / s ${v.s ? v.s.length : 0} · ${(v.n || []).map((r) => r[0] + (r[3] ? ` [${r[3]} x${r[4]}]` : '')).join(', ')}`).join('\n'));
