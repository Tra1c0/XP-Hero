#!/usr/bin/env python3
# Erzeugt src/core/content/game_ref.js aus den Datentabellen des Spiels (Version 27.2.0), die als JSON-Textdateien in einem Ordner liegen
# (aus der vom Nutzer bereitgestellten Spieldatei exportiert; weder die Datei noch die Tabellen selbst liegen im Repo).
# Aufruf: python3 -I tools/import_gamedata.py <ordner-mit-tabellen>. Übernommen werden nur Zahlen, Schlüssel und Regeln – keine Texte, Bilder, Modelle oder Programmteile.
import sys, os, json, glob
D = sys.argv[1]
def load(prefix):
    t = json.load(open(sorted(glob.glob(os.path.join(D, prefix + '*.txt')))[0], encoding='utf-8', errors='replace')); return t[1:]
f = lambda v, d=0: (float(v) if v not in (None, '') else d)
i = lambda v, d=0: (int(float(v)) if v not in (None, '') else d)
# Gegner: [Level, Leben, Angriff, Angriffe/s, Angriffsreichweite m, Lauftempo, Rückzugstempo, Sichtweite m, Aktionsweite m, Kampfabstand m, Wutzeit s, Fluchtzeit s,
#          Haltung bei Sicht, in Aktionsweite, bei Treffer (0 ignorieren, 1 weiterwandern, 2 bewachen, 3 kämpfen, 4 fliehen), Rudelgröße, Typ, Seltenheit, XP, Gold, Drop-Typ, Drop-Menge, Drop-Stücke, Größe 0-2, Skalierung, Rückstoß, Fertigkeiten]
E = {}
for r in load('EnemyData_1'):
    E[r['id']] = [i(r['Level']), i(r['MaxHp']), i(r['AttackPower']), f(r['AttackSpeed']), f(r['AttackRange']), f(r['MoveSpeed']), f(r['RetreatSpeed']), f(r['SightRange']), f(r['ActionRange']), f(r['BattleDistance']),
                  f(r['AngryTime']), f(r['FleeTime']), i(r['SightAttitude']), i(r['ActionAttitude']), i(r['DamagedAttitude']), i(r['FlockCount'], 1), i(r['EnemyType']), i(r['Rarity']), i(r['DropAccountExpAmount']), i(r['DropGoldAmount']),
                  i(r['DropItemType'], -1), i(r['DropItemAmount']), i(r['DropItemPieceCount']), i(r['UnitSize']), f(r.get('OverrideScale'), 1), f(r.get('knockBackApply')), r.get('SkillList') or '', r.get('key') or '']
SP = {r['key']: [i(r['EnemyDataId']), f(r['RespawnCoolTime']), f(r['RetreatRange']), 1 if r['IsPatrol'] == 'TRUE' else 0] for r in load('EnemySpawnGroupData_1')}
XP = [0] + [i(r['RequireExp']) for r in sorted(load('LevelUpData_Exp'), key=lambda r: int(r['id']))]
lim = []; 
for r in sorted(load('LevelUpData_Exp'), key=lambda r: int(r['id'])):
    v = i(r['SingleKillExp_Limit'])
    if not lim or lim[-1][1] != v: lim.append([int(r['id']), v])
PL = [[int(r['id']), i(r['Attack']), i(r['Hp'])] for r in load('PlayerLevelData')]
S = {r['id']: r for r in load('SkillData_')}
CAT = {1: 'dagger', 2: 'sword', 3: 'blunt', 4: 'crossbow', 5: 'gun', 6: 'staff'}
W = {}
for r in load('WeaponData_'):
    n = int(r['id']) % 1000; series = 's' if n > 100 else 'n'; rar = (n - 100 if n > 100 else n) - 1
    ps = S.get(r['SkillID_PSV'], {})
    W[f"{CAT[int(r['Category'])]}_{series}_{rar}"] = [f(r['AtkSpeed']), f(r['AtkRange']), f(r['SplashAtkCount']), 1 if r['IsRanged'] == 'TRUE' else 0,
        (ps.get('key') or '') if ps.get('SkillCategory') == 'Weapon' else '', f(ps.get('CoolTime')), f(ps.get('TotalDPSMult')), f(ps.get('SkillRange')), i(ps.get('BulletCount'), 1)]
CF = {r['key']: r['value'] for r in load('ConfigData') if r['key'] in ('Player_Init_AtkSpd', 'Enemy_WanderCycleTime', 'Enemy_DeadDisappear_WaitTime', 'SubWeapon_AttackRange', 'WeaponGachaCost', 'HomePortalCoolTimeSec', 'FirstChest_OpenTimeSec')}
RAR = [[i(r['Rarity']), i(r['Grade']), i(r['MaxLevel']), i(r['WeaponDPSAdd']), f(r['WeaponDPSMult']), f(r['WeaponDPS_LevelUpAdd'])] for r in load('BalancingData_Rarity')]
open(__file__.replace('tools/import_gamedata.py', 'src/core/content/game_ref.js'), 'w').write(
    '// GENERIERT von tools/import_gamedata.py – nicht von Hand ändern.\n// Quelle: Datentabellen des Spiels, Version 27.2.0 (vom Nutzer bereitgestellte Spieldatei). Nur Zahlen, Schlüssel und Regeln.\n'
    '// ENEMY[id] = [Level, Leben, Angriff, Angriffe/s, Reichweite m, Lauftempo, Rückzugstempo, Sicht m, Aktion m, Kampfabstand m, Wutzeit s, Fluchtzeit s, Haltung Sicht, Haltung Aktion, Haltung Treffer,\n'
    '//             Rudel, Typ, Seltenheit, XP, Gold, Drop-Typ, Drop-Menge, Drop-Stücke, Größe, Skalierung, Rückstoß, Fertigkeiten, Schlüssel]\n'
    'export const ENEMY = ' + json.dumps(E, separators=(',', ':')) + ';\n'
    '// SPAWN[Schlüssel] = [Gegner-id, Respawn s, Rückzugsradius m, Patrouille]\nexport const SPAWN = ' + json.dumps(SP, separators=(',', ':')) + ';\n'
    '// LEVEL_XP[L] = XP von Level L-1 auf L (Index 1 = 0). KILL_XP_LIMIT = [[ab Level, höchstens XP je Kill], ...]\nexport const LEVEL_XP = ' + json.dumps(XP, separators=(',', ':')) + ';\nexport const KILL_XP_LIMIT = ' + json.dumps(lim) + ';\n'
    '// PLAYER_LV = [[Level, Angriff, Leben], ...] (Stützstufen)\nexport const PLAYER_LV = ' + json.dumps(PL, separators=(',', ':')) + ';\n'
    '// WEAPON[klasse_reihe_seltenheit] = [Angriffe/s, Reichweite m, Flächenfaktor, Fernwaffe, Fertigkeit, Abklingzeit s, Gesamtfaktor, Fertigkeits-Reichweite m, Geschosse]\nexport const WEAPON = ' + json.dumps(W, separators=(',', ':')) + ';\n'
    '// RARITY = [[Seltenheit 1-9, Reihe (1 Haupt, 2 S), Maximalstufe, DPS-Zuschlag, DPS-Faktor, DPS je Stufe], ...]\nexport const RARITY = ' + json.dumps(RAR, separators=(',', ':')) + ';\n'
    'export const CONFIG = ' + json.dumps(CF) + ';\n')
import collections
print(len(E), 'Gegner,', len(SP), 'Spawn-Gruppen,', len(XP) - 1, 'Level,', len(W), 'Waffen;', CF)
print('Rückzugsradius', collections.Counter(v[2] for v in SP.values()).most_common(6), 'Limit', lim[:6])
