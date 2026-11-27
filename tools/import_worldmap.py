#!/usr/bin/env python3
# Erzeugt src/core/content/world1_map.js aus der Originalkarte von Kapitel 1 (Bild vom Nutzer, wird NICHT eingecheckt) und den Szenenkoordinaten
# von xphero.fans/map. Aufruf: python3 -I tools/import_worldmap.py <karte.webp|png> <pfad/zu/map/index.html>   (braucht Pillow)
# Schritte: 1) Bild gegen die Weltkoordinaten einmessen (Maßstab, Drehung, Versatz so, dass möglichst viele Spawnpunkte auf der Farbe ihres Gebiets liegen),
# 2) je 2-m-Zelle Boden/Wasser/Fels und Gebiet aus der Farbe bestimmen, 3) Inseln und fehlende Übergänge (Brücken im Bild sind felsfarben) schließen,
# 4) Basis = Umkreis des Sandflecks am Stadtportal. Ins Repo geht nur das abgeleitete Raster (Layoutdaten), keine Grafik.
import sys, json, re, math, collections
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; px = im.load()
P = json.loads(re.search(r'const POIS = (\[.*?\]);', open(sys.argv[2]).read(), flags=re.S).group(1))
F, WAT, ROCK, VOID = 'f', 'w', 'r', 'v'
PAL = [((149,204,73),F,1),((251,218,135),F,1),((245,226,160),F,1),((239,185,68),F,2),((249,176,82),F,2),((105,211,176),WAT,2),((174,68,175),F,3),((188,120,251),F,3),
  ((138,196,228),F,4),((53,153,215),F,4),((13,63,82),F,4),((127,191,85),F,5),((30,132,86),F,5),((0,231,245),WAT,5),((71,33,42),F,6),((70,36,50),F,6),((120,49,23),F,6),((134,60,33),F,6),
  ((119,106,88),ROCK,0),((145,89,70),ROCK,0),((139,78,47),ROCK,0),((117,75,53),ROCK,0),((104,107,115),ROCK,0),((73,78,86),ROCK,0),((54,70,81),ROCK,0),((225,120,38),ROCK,0),((212,105,25),ROCK,0),
  ((197,134,54),ROCK,0),((212,236,240),ROCK,0),((181,162,148),ROCK,0),((212,202,200),ROCK,0),((40,126,65),ROCK,0),((7,138,144),ROCK,0),((10,7,7),ROCK,0),((126,97,88),ROCK,0),((124,111,95),ROCK,0),((94,70,56),ROCK,0),
  ((248,248,248),VOID,0)]
memo = {}
def cls(c):
    k = (c[0] >> 2, c[1] >> 2, c[2] >> 2)
    if k not in memo: memo[k] = min(range(len(PAL)), key=lambda i: sum((PAL[i][0][j] - c[j]) ** 2 for j in range(3)))
    return memo[k]
# 1) Einmessen
S = 3; gw, gh = W // S, H // S
Gi = [[PAL[cls(px[x * S + 1, y * S + 1])] for x in range(gw)] for y in range(gh)]
pts = [(p['x'], p['z'], p['chapter']) for p in P if p['type'] == 'spawn' and p['chapter']]
def score(sc, th, tx, ty):
    c, sn = math.cos(th), math.sin(th); n = 0
    for X, Z, k in pts:
        ix = int((sc * (c * X - sn * Z) + tx) / S); iy = int((-sc * (sn * X + c * Z) + ty) / S)
        if 0 <= ix < gw and 0 <= iy < gh:
            g = Gi[iy][ix]
            if g[1] == F: n += 1 if g[2] == k else -0.5
    return n
best = (-1e9,)
for th10 in range(-300, 301, 25):
    for sc10 in range(55, 96, 3):
        for tx in range(250, 750, 16):
            for ty in range(450, 1000, 16):
                v = score(sc10 / 10, math.radians(th10 / 10), tx, ty)
                if v > best[0]: best = (v, sc10 / 10, math.radians(th10 / 10), tx, ty)
v, sc, th, tx, ty = best
for st in [(0.1, 0.5, 4), (0.04, 0.2, 2), (0.02, 0.1, 1)]:
    imp = True
    while imp:
        imp = False
        for a in (-st[0], 0, st[0]):
            for b in (-st[1], 0, st[1]):
                for dx in (-st[2], 0, st[2]):
                    for dy in (-st[2], 0, st[2]):
                        v2 = score(sc + a, th + math.radians(b), tx + dx, ty + dy)
                        if v2 > v: v, sc, th, tx, ty = v2, sc + a, th + math.radians(b), tx + dx, ty + dy; imp = True
c0, s0 = math.cos(th), math.sin(th)
toImg = lambda X, Z: (sc * (c0 * X - s0 * Z) + tx, -sc * (s0 * X + c0 * Z) + ty)
def toWorld(ix, iy):
    u, w = (ix - tx) / sc, -(iy - ty) / sc
    return (c0 * u + s0 * w, -s0 * u + c0 * w)
# 2) Raster
CELL = 2
cs = [toWorld(x, y) for x, y in ((0, 0), (W, 0), (0, H), (W, H))]
minX = math.floor(min(p[0] for p in cs) / CELL) * CELL; maxX = math.ceil(max(p[0] for p in cs) / CELL) * CELL
minZ = math.floor(min(p[1] for p in cs) / CELL) * CELL; maxZ = math.ceil(max(p[1] for p in cs) / CELL) * CELL
cols, rows = (maxX - minX) // CELL, (maxZ - minZ) // CELL
kind = [[VOID] * cols for _ in range(rows)]; zone = [[-1] * cols for _ in range(rows)]; tint = [[len(PAL) - 1] * cols for _ in range(rows)]
for r in range(rows):
    for c in range(cols):
        cnt = collections.Counter()
        for a in range(5):
            for b in range(5):
                ix, iy = toImg(minX + (c + (a + 0.5) / 5) * CELL, maxZ - (r + (b + 0.5) / 5) * CELL)
                cnt[cls(px[int(ix), int(iy)]) if 0 <= ix < W and 0 <= iy < H else len(PAL) - 1] += 1
        ty_ = collections.Counter()
        for i, n in cnt.items(): ty_[PAL[i][1]] += n
        t = F if ty_[F] >= 13 else WAT if ty_[WAT] >= 10 else VOID if ty_[VOID] >= 15 else ROCK
        i = max((i for i in cnt if PAL[i][1] == t), key=lambda i: cnt[i], default=None)
        if i is None: t = ROCK; i = max(cnt, key=lambda i: cnt[i])
        kind[r][c] = t; tint[r][c] = i
        if t in (F, WAT): zone[r][c] = PAL[i][2]
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
inb = lambda r, c: 0 <= r < rows and 0 <= c < cols
def comps(pred):
    seen = [[False] * cols for _ in range(rows)]; out = []
    for r in range(rows):
        for c in range(cols):
            if seen[r][c] or not pred(r, c): continue
            q = [(r, c)]; seen[r][c] = True
            for (a, b) in q:
                for dr, dc in N4:
                    rr, cc = a + dr, b + dc
                    if inb(rr, cc) and not seen[rr][cc] and pred(rr, cc): seen[rr][cc] = True; q.append((rr, cc))
            out.append(q)
    return out
BRIDGE = len(PAL)  # zusätzlicher Farbton für ergänzte Übergänge
def carve(src, dst_pred, z):
    # kürzester Weg von einer Zellmenge durch Fels/Wasser zu einer Zielzelle; die Wegzellen werden Boden des Gebiets z (2 Zellen breit)
    prev = {s: None for s in src}; q = list(src)
    for cur in q:
        for dr, dc in N4:
            nx = (cur[0] + dr, cur[1] + dc)
            if not inb(*nx) or nx in prev: continue
            if dst_pred(*nx):
                path = []; k = cur
                while k is not None and kind[k[0]][k[1]] != F: path.append(k); k = prev[k]
                for (a, b) in path:
                    for (rr, cc) in ((a, b), (a + 1, b), (a, b + 1)):
                        if inb(rr, cc) and kind[rr][cc] != F: kind[rr][cc] = F; zone[rr][cc] = z; tint[rr][cc] = BRIDGE
                return len(path)
            if kind[nx[0]][nx[1]] in (ROCK, WAT): prev[nx] = cur; q.append(nx)
    return -1
log = []
# 3) Inseln: kleine weg, größere an das Hauptstück ihres Gebiets anbinden
for z in range(1, 7):
    cc_ = sorted(comps(lambda r, c: kind[r][c] == F and zone[r][c] == z), key=len, reverse=True)
    main = set(cc_[0])
    for comp in cc_[1:]:
        if len(comp) < 8:
            for (r, c) in comp: kind[r][c] = ROCK; zone[r][c] = -1
        else:
            n = carve(comp, lambda r, c: (r, c) in main, z); log.append(f'Gebiet {z}: Insel mit {len(comp)} Zellen angebunden ({n} Zellen)')
            if n < 0:
                for (r, c) in comp: kind[r][c] = ROCK; zone[r][c] = -1
            else: main |= set(comp)
# Übergänge der Freischaltkette; fehlt die direkte Nachbarschaft, wird der kürzeste Übergang ergänzt (im Bild: Brücken)
def touch(a, b):
    return any(kind[r][c] == F and zone[r][c] == a and any(inb(r + dr, c + dc) and kind[r + dr][c + dc] == F and zone[r + dr][c + dc] == b for dr, dc in N4) for r in range(rows) for c in range(cols))
for a, b in ((1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (3, 6)):
    if not touch(a, b):
        n = carve([(r, c) for r in range(rows) for c in range(cols) if kind[r][c] == F and zone[r][c] == a], lambda r, c: kind[r][c] == F and zone[r][c] == b, b)
        log.append(f'Übergang {a}-{b} ergänzt ({n} Zellen)')
# 4) Basis: Umkreis des Sandflecks am Stadtportal
tp = next(p for p in P if p['name'] == 'TF_Portal')
cx = lambda c: minX + (c + 0.5) * CELL; cz = lambda r: maxZ - (r + 0.5) * CELL
sand = [(r, c) for r in range(rows) for c in range(cols) if kind[r][c] == F and tint[r][c] in (1, 2) and math.hypot(cx(c) - tp['x'], cz(r) - tp['z']) < 16]
bx = sum(cx(c) for r, c in sand) / len(sand); bz = sum(cz(r) for r, c in sand) / len(sand)
d1 = min(math.hypot(X - bx, Z - bz) for X, Z, k in pts if k == 1)
BR = max(10, min(15, d1 - 1))
for r in range(rows):
    for c in range(cols):
        if kind[r][c] == F and zone[r][c] == 1 and math.hypot(cx(c) - bx, cz(r) - bz) <= BR: zone[r][c] = 0
free = lambda r, c: inb(r, c) and kind[r][c] == F
clear = lambda r, c: all(free(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
slots = []
for ring, n in ((BR - 2.6, 8),):
    for k in range(n):
        a = math.pi / 2 + 2 * math.pi * k / n; X, Z = bx + math.cos(a) * ring, bz + math.sin(a) * ring
        c, r = int((X - minX) / CELL), int((maxZ - Z) / CELL)
        if free(r, c) and zone[r][c] == 0: slots.append([round(X, 1), round(Z, 1)])
# Eintrittspunkte: innen liegende Bodenzelle des Gebiets, die dem Vorgängergebiet am nächsten ist
entries = {'base': [round(bx, 1), round(bz - 2, 1)]}
prevOf = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
for z in range(1, 7):
    src = [(r, c) for r in range(rows) for c in range(cols) if kind[r][c] == F and zone[r][c] == prevOf[z]]
    cand = [(r, c) for r in range(rows) for c in range(cols) if kind[r][c] == F and zone[r][c] == z and clear(r, c) and all(zone[r + dr][c + dc] == z for dr in (-1, 0, 1) for dc in (-1, 0, 1))]
    r, c = min(cand, key=lambda q: min((q[0] - s[0]) ** 2 + (q[1] - s[1]) ** 2 for s in src[::3]))
    entries[f'a1_{z}'] = [cx(c), cz(r)]
e6 = entries['a1_6']
r, c = max(((r, c) for r in range(rows) for c in range(cols) if kind[r][c] == F and zone[r][c] == 6 and clear(r, c)), key=lambda q: (cx(q[1]) - e6[0]) ** 2 + (cz(q[0]) - e6[1]) ** 2)
exitP = [cx(c), cz(r)]
ok = 0; far = []
for X, Z, k in pts:
    c, r = int((X - minX) / CELL), int((maxZ - Z) / CELL)
    if inb(r, c) and kind[r][c] == F and zone[r][c] in (k, 0 if k == 1 else k): ok += 1
    else:
        d = min((math.hypot(cx(cc) - X, cz(rr) - Z) for rr in range(rows) for cc in range(cols) if kind[rr][cc] == F and zone[rr][cc] == k), default=99); far.append(round(d, 1))
B36 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
zrows = [''.join('.' if kind[r][c] == VOID else '#' if kind[r][c] == ROCK else str(zone[r][c]) if kind[r][c] == F else 'abcdefg'[zone[r][c]] for c in range(cols)) for r in range(rows)]
trows = [''.join(B36[tint[r][c]] for c in range(cols)) for r in range(rows)]
pal = ['#%02x%02x%02x' % p[0] for p in PAL] + ['#8a6447']
out = {'cell': CELL, 'minX': minX, 'maxX': maxX, 'minZ': minZ, 'maxZ': maxZ, 'cols': cols, 'rows': rows, 'z': zrows, 't': trows, 'pal': pal,
       'base': {'c': [round(bx, 1), round(bz, 1)], 'r': round(BR, 1)}, 'slots': slots, 'entries': entries, 'exit': exitP,
       'fit': {'pxPerM': round(sc, 2), 'rotDeg': round(math.degrees(th), 2), 'spawnsOnOwnColour': v, 'spawns': len(pts)}}
open(__file__.replace('tools/import_worldmap.py', 'src/core/content/world1_map.js'), 'w').write(
    '// GENERIERT von tools/import_worldmap.py – nicht von Hand ändern.\n'
    '// Quelle: Originalkarte von Kapitel 1 (Bild, nicht im Repo) + Szenenkoordinaten von xphero.fans/map. Abgeleitetes 2-m-Raster, X = Ost, Z = Nord, Zeile 0 = Norden.\n'
    '// z: . außerhalb, # Fels, 0-6 Boden (0 = Basis, 1-6 = Gebiet), a-g Wasser im Gebiet 0-6. t: Farbton je Zelle als Index in pal (Farbwerte der Karte).\n'
    'export const MAP1 = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(f'Einmessung: {v} von {len(pts)} Spawnpunkten auf eigener Gebietsfarbe, {sc:.2f} px/m, Drehung {math.degrees(th):.1f} Grad')
print(f'Raster {cols}x{rows}, X {minX}..{maxX}, Z {minZ}..{maxZ}; Basis {bx:.1f}/{bz:.1f} r={BR:.1f}, {len(slots)} Bauplätze; Spawns auf eigenem Gebietsboden {ok}/{len(pts)}, Rest Abstand {sorted(far)}')
print('\n'.join(log)); print('Einträge', entries, 'Ausgang', exitP)
