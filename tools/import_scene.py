#!/usr/bin/env python3
# Erzeugt src/core/content/scene1_ref.js aus der Szenenhierarchie von Kapitel 1 (Knotenliste als JSON: Name, Pfad, Weltposition, Drehung, Skalierung;
# aus der vom Nutzer bereitgestellten Spieldatei gelesen – weder die Datei noch die Liste liegen im Repo).
# Aufruf: python3 -I tools/import_scene.py <world1.json> [<spawnpunkte.json>]. Übernommen werden nur Koordinaten, Drehung, Größe und die ART eines Objekts
# (Baum, Fels, Zaun ...). Modelle, Texturen und Namen der Vorlage werden nicht übernommen; gezeichnet wird mit eigenen Grundformen.
import sys, json, re, collections
W = json.load(open(sys.argv[1]))
def stage(o):
    m = re.search(r'CH1_Level(\d)|Ground_Stage_?0?(\d)', o['path'] + '/' + o['n'])
    return int(next(g for g in m.groups() if g)) if m else 0
# Art -> eigene Requisite je Gebiet (Index 1-6); eine Zeichenkette gilt für alle Gebiete
KINDS = [
    (r'^Tree(?!_Chop)|^ST3_Tree(?!Stump)|^ST5_TreeLeaf', ['tree_round', 'palm', 'deadtree', 'pine_snow', 'tree_round2', 'deadtree']),
    (r'^(ST\d_)?Grass', ['grass', 'grass', 'grass_dark', 'grass_frost', 'grass', 'grass_dark']),
    (r'Bluestone|BST4_Ore', 'ore'),
    (r'Rock|^ST\d_Stone|LavaMt', ['rock_grey', 'rock_sand', 'rock_dark', 'rock_snow', 'rock_grey', 'rock_red']),
    (r'Fence', 'fence_s'), (r'Flower|Rafflesia', 'flowers_s'), (r'Mushroom_Red', 'shroom'), (r'Mushroom', 'shroom_purple'),
    (r'Bone|Skull|Scull', 'bones_s'), (r'^Cactus', 'cactus'), (r'^CH4_Snow|^Snow', 'snow_lump'), (r'Candle', 'candle'), (r'Egg', 'egg'), (r'Cobweb', 'cobweb'),
    (r'WoodPlane|WoodBridge|WoodenPlank', 'plank'), (r'Vine', 'bush'), (r'Pillar(?!_Mark)', 'pillar_broken_s'), (r'GraveStone|Coffin', 'grave'), (r'_Lamp', 'lantern'),
    (r'Goblin_Box|Cage|WoodRack', 'crates'), (r'Stump', 'stump'), (r'Icicle', 'ice_shard_s'), (r'Gargoyle_Statue|Obelisk', 'statue'),
]
KINDS = [(re.compile(a), b) for a, b in KINDS]
SKIP = re.compile(r'^(Harvestable|Stone_[ABC]|CH4_Ore|Shadow|FX|Glow|Lines|Cube|NavObstacle|Interaction|FXPivot|Sparks|Fire|Dust|DUST|Embers|Cloud|Ring|Cylinder|Particle|Harvest|Sunshaft|Light|Smoke|Ground|Road|Sand|Mesh_|Pond|Sea|Water)', re.I)
out = collections.defaultdict(list); n = 0; miss = collections.Counter()
kind = lambda name: next((prop for k, prop in KINDS if k.search(name)), None)
kids = collections.defaultdict(list)
for o in W: kids[o['path']].append(o['n'])
emitted = []
for o in W:  # Reihenfolge = Tiefensuche: Eltern kommen vor ihren Kindern
    if not (o['path'].startswith('/World_Chapter1/Area_1') or o['path'].startswith('/World_Chapter1/Ground')): continue
    st = stage(o); full = o['path'] + '/' + o['n']
    if not st or SKIP.search(o['n']): continue
    if any(full.startswith(e + '/') for e in emitted[-40:]): continue  # Einzelteil eines schon erfassten Objekts
    prop = kind(o['n'])
    if prop is None:
        if o['kids'] == 0: miss[re.sub(r'[ _.]*\(?\d*\)?$', '', o['n'])] += 1
        continue
    if any(kind(c) is not None for c in kids.get(full, [])): continue  # Sammelknoten ("Grass", "Rocks"): seine Kinder sind die Objekte
    p = prop if isinstance(prop, str) else prop[st - 1]
    s = sum(abs(v) for v in o['s']) / 3
    out[p].append([round(o['p'][0] * 10), round(o['p'][2] * 10), round(o['yaw'] / 10) % 36, max(4, min(30, round(s * 10)))]); n += 1
    emitted.append(full)
chop = [[round(o['p'][0], 1), round(o['p'][2], 1), stage(o)] for o in W if o['n'].startswith('Tree_Chop') and '/Tree_Chop' not in o['path'] and not any(c.startswith('Tree_Chop') for c in kids.get(o['path'] + '/' + o['n'], []))]
stone = [[round(o['p'][0], 1), round(o['p'][2], 1), stage(o)] for o in W if re.match(r'^(Stone_[ABC]|CH4_Ore)', o['n']) and not re.search(r'/(Stone_|CH4_Ore)', o['path'])]
pos = lambda name: next([round(o['p'][0], 2), round(o['p'][2], 2)] for o in W if o['n'] == name)
BP = {'bonfire': 'BuildingPoint (4)', 'chesthouse': 'BuildingPoint (1)', 'smithy': 'BuildingPoint', 'portal': 'BuildingPoint (3)', 'special': 'BuildingPoint (2)', 'tower': 'BuildingPoint (5)', 'raidcamp': 'BuildingPoint_BossRaidCamp'}
TF = {k: pos(v) for k, v in {'start': 'TF_Start', 'home': 'TF_Home', 'center': 'TF_HomeCenter', 'npc': 'TF_MainNPC', 'returnPortal': 'TF_ReturnPortal'}.items()}
# Gruppengröße und Streukreis je Spawnpunkt (zweite Eingabedatei, aus den Spawn-Bausteinen der Szene gelesen): [Gebiet, Gegner-id, x, z, Radius m, Anzahl]
SPAWN_PTS = [[int(r[0]), r[2], r[3], r[4], r[5], r[6]] for r in json.load(open(sys.argv[2])) if str(r[0]).isdigit()] if len(sys.argv) > 2 else []
J = lambda v: json.dumps(v, separators=(',', ':'))
open(__file__.replace('tools/import_scene.py', 'src/core/content/scene1_ref.js'), 'w').write(
    '// GENERIERT von tools/import_scene.py – nicht von Hand ändern.\n// Quelle: Szenenaufbau von Kapitel 1 der Spielversion 27.2.0. Nur Koordinaten, Drehung, Größe und Objektart; gezeichnet wird mit eigenen Grundformen.\n'
    '// DECO[requisite] = [[x*10, z*10, Drehung/10 Grad, Größe*10], ...]\nexport const DECO = ' + J(out) + ';\n'
    '// Fällbare Bäume und abbaubare Steine: [x, z, Gebiet]\nexport const CHOP = ' + J(chop) + ';\nexport const STONE = ' + J(stone) + ';\n'
    '// Bauplätze und feste Punkte [x, z]\nexport const BUILD_POS = ' + J({k: pos(v) for k, v in BP.items()}) + ';\nexport const POINTS = ' + J(TF) + ';\n'
    '// Spawnpunkte: [Gebiet, Gegner-id, x, z, Streuradius m, Anzahl der Gegner]\nexport const SPAWN_PTS = ' + J(SPAWN_PTS) + ';\n')
print(n, 'Objekte in', len(out), 'Arten:', {k: len(v) for k, v in out.items()})
print('fällbar', len(chop), collections.Counter(c[2] for c in chop), 'Steine', len(stone), collections.Counter(c[2] for c in stone))
print('nicht zugeordnet:', miss.most_common(40))
