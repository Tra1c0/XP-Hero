#!/usr/bin/env python3
# Erzeugt src/core/content/wiki_ref.js aus den Seitentexten des Fan-Wikis xp-hero.fandom.com (über dessen Daten-Schnittstelle abgerufen, pages.json: {Titel: Wikitext}).
# Aufruf: python3 -I tools/import_wiki.py <pages.json>. Übernommen werden nur Zahlen und Namen (Schaden, Maximalstufe, Stufen-Boni, Fertigkeitsfaktoren, Typ-Boni), keine Texte oder Bilder.
import sys, json, re
P = json.load(open(sys.argv[1]))
def clean(v):
    v = re.sub(r'style="[^"]*"', '', v); v = re.sub(r'<[^>]+>', ' ', v); v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', v)
    v = re.sub(r'[|!]+\s*', ' | ', v); v = re.sub(r'\s+', ' ', v); return re.sub(r'(\| )+', '| ', v)
RAR = ['Normal', 'Fine', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mythic', 'Exotic', 'Eternal']
CLS = {'Dagger': 'dagger', 'Sword': 'sword', 'Mace': 'blunt', 'Crossbow': 'crossbow', 'Gun': 'gun', 'Wand': 'staff'}
STAT = {'Attack': 'atk', 'HP': 'hp', 'LifeSteal': 'lifesteal', 'Melee Damage': 'meleePct', 'Ranged Damage': 'rangedPct', 'Skill Damage': 'skillDmgPct', 'Critical Damage': 'critDmg', 'Skill Cooldown': 'cooldownPct', 'Skill CoolDown': 'cooldownPct',
        'Attack Speed Up': 'atkSpeedPct', 'Move Speed Up': 'moveSpeedPct', 'Attack Power Up': 'atk', 'HP Up': 'hp', 'Critical Rate Up': 'critChance', 'Skill Damage Up': 'skillDmgPct', 'Skill Cooldown Reduce': 'cooldownPct'}
def num(x):
    m = re.match(r'([\d.]+)([KMB]?)', x); return round(float(m.group(1)) * {'': 1, 'K': 1e3, 'M': 1e6, 'B': 1e9}[m.group(2)])
W = {}
for t, v in P.items():
    ty = re.search(r'Category:(Dagger|Sword|Mace|Crossbow|Gun|Wand) Weapons', v)
    if not ty or '[[Category:Weapons]]' not in v: continue
    c = clean(v); cls = CLS[ty.group(1)]
    rows = [(RAR.index(m.group(1)), int(m.group(2)) if m.group(2) else None, [num(m.group(k)) for k in (3, 4, 5, 6)])
            for m in re.finditer(r'\| (Normal|Fine|Rare|Epic|Legendary|Ancient|Mythic|Exotic|Eternal) \|(?: Lv\.(\d+) \|)? ([\d.KMB]+)~([\d.KMB]+) \| ([\d.KMB]+)~([\d.KMB]+)', c)]
    if not rows: continue
    mx = re.search(r'\| (?:Normal|Fine|Rare|Epic|Legendary|Ancient|Mythic|Exotic) \| \w+ \| Lv\.(\d+)', c)
    bonus = [[int(a), 1 if ms else 0, STAT[b.strip()], float(p)] for a, ms, b, p in re.findall(r'\| Lv\.(\d+) \| (\[Main Slot Only\] )?([A-Za-z ]+?) \+([\d.]+)%', c) if b.strip() in STAT]
    sk = {RAR.index(a): [b.strip(), int(d) / 100] for a, b, d in re.findall(r'\| (Epic|Legendary|Ancient|Mythic|Exotic|Eternal) \| Lv\.\d+ \| ([A-Za-z ]+?) \| (\d+)% total', c)}
    series = 's' if len(rows) > 1 else 'n'
    for r, lv, d in rows:
        mxl = lv or (int(mx.group(1)) if mx else None)
        W[f'{cls}_{series}_{r}'] = {'name': t, 'max': mxl, 'd': d, 'bonus': [b for b in bonus if b[0] <= (mxl or 999)], **({'sk': sk[r]} if r in sk else {})}
c = clean(P['Weapon Types']); TB = {}
for m in re.finditer(r'\| (Dagger|Sword|Mace|Crossbow|Gun|Wand) \| ([^|]*%[^|]*) \| ([^|]+) \|', c):
    TB[CLS[m.group(1)]] = {'bonus': [[STAT[a.strip()], float(p)] for a, p in re.findall(r'([A-Za-z ]+?) \+([\d.]+)%', m.group(2))], 'heroes': [h.strip() for h in m.group(3).split(',')]}
# Upgrade-Tabellen: jede Stufe mit Wert (Prozent) und Kosten für den nächsten Schritt. Spezial zusätzlich mit Sternstufe.
ORB = {'Red Orb': 'orb_red', 'Pink Orb': 'orb_pink', 'Crimson Orb': 'orb_ice', 'Azure Orb': 'orb_jungle', 'Soul Orb': 'orb_hell', 'Gold': 'gold'}
def upg(title):
    out = []
    for name, body in re.findall(r'\{\{XP Collapsible\s*\|title=([^\n|]+)\n.*?\|content=(.*?)\n\}\}', P[title], flags=re.S):
        rows = []
        for a, b, c, d in re.findall(r'\|-\n\| (?:(\d)★ · )?Lv\. (\d+)\n\| ([\d.]+)%?\n\| ([^\n]+)', body):
            cost = {ORB[k]: int(n.replace(',', '')) for n, k in re.findall(r'([\d,]+) ([A-Z][a-z]+ Orb|Gold)', d)}
            rows.append([int(a) if a else 0, int(b), float(c), cost])
        out.append([name.strip(), rows])
    return out
UP = {'special': upg('Upgrades/Special Data'), 'extra': upg('Upgrades/Extra Data'), 'soul': upg('Upgrades/Soul Data')}
open(__file__.replace('tools/import_wiki.py', 'src/core/content/wiki_ref.js'), 'w').write(
    '// GENERIERT von tools/import_wiki.py – nicht von Hand ändern.\n// Quelle: Fan-Wiki xp-hero.fandom.com (inoffiziell), abgerufen 2026-11-27. Nur Zahlen und Namen.\n'
    '// WEAPON_WIKI[<klasse>_<reihe>_<seltenheit>]: max = Maximalstufe, d = Schaden [Stufe 1 von, bis, Maximalstufe von, bis], bonus = [ab Stufe, nur Hauptslot, Stat, Prozent], sk = [Fertigkeit, Gesamtfaktor].\n'
    '// TYPE_BONUS[<klasse>]: Bonus der Waffenart (gilt nur mit passender Helden-Meisterschaft im Hauptslot) und die passenden Helden.\n'
    'export const WEAPON_WIKI = ' + json.dumps(W, separators=(',', ':')) + ';\nexport const TYPE_BONUS = ' + json.dumps(TB, separators=(',', ':')) + ';\n'
    '// UPGRADE_WIKI[familie] = [[Name, [[Stern (0 = ohne), Stufe im Stern bzw. Stufe, Wert in Prozent, Kosten zum nächsten Schritt], ...]], ...]. Stand laut Wiki: Client v25.1.0, vorläufig.\n'
    'export const UPGRADE_WIKI = ' + json.dumps(UP, separators=(',', ':')) + ';\n')
print(len(W), 'Waffenstufen;', {k: len(v['heroes']) for k, v in TB.items()}); print(sorted(k for k in W if '_n_' in k and W[k]['max'] is None))
