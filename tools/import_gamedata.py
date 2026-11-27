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
                  i(r['DropItemType'], -1), i(r['DropItemAmount']), i(r['DropItemPieceCount']), i(r['UnitSize']), f(r.get('OverrideScale'), 1), f(r.get('knockBackApply')), r.get('SkillList') or '', r.get('key') or '',
                  f(r.get('MaxHp_DPSMult')), i(r.get('DropGoldPieceCount'), 1), i(r.get('DropItemType2'), -1), i(r.get('DropItemAmount2')), i(r.get('DropItemPieceCount2'))]
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
# Kosten als {item: menge}: Typnummern der Daten -> eigene Item-Schlüssel (1 = BlueStone, die Schmiede-Währung, heißt hier "crystal")
IT = {0: 'gold', 1: 'crystal', 3: 'gems', 10: 'wood', 20: 'stone', 201: 'orb_red', 202: 'orb_pink', 203: 'orb_ice', 204: 'orb_jungle', 205: 'orb_hell', 301: 'weapon_scroll'}
def cost(am, ty):
    o = {}
    for a, t in zip(str(am).split(','), str(ty).split(',')):
        if a.strip() and int(a) > 0 and int(t) in IT: o[IT[int(t)]] = int(a)
    return o
BK = {'Bonfire': 'bonfire', 'ChestHouse': 'chesthouse', 'Smithy': 'smithy', 'Lumbermill': 'lumbermill', 'CostumeShop': 'costumeshop', 'Portal': 'portal', 'Quarry': 'quarry', 'SpecialUpgrade': 'special', 'Exchange': 'exchange',
      'BossRaidCamp': 'raidcamp', 'ExtraUpgrade': 'extra', 'BuildingSoulUpgrade': 'soul', 'BuildingAstrology': 'astrology', 'Ladder_Stage3': 'ladder3', 'Ladder_Stage4': 'ladder4', 'Stair_Stage6': 'stair6', 'ChallengeTower': 'tower'}
BUILD = {BK[r['key']]: cost(r['BuildCostAmount'], r['BuildCostType']) for r in load('BuildingData') if r['key'] in BK}
SMITHY = [[i(r['RequireExp_Acc']), cost(r['UpgradeCostAmounts'], r['UpgradeCostTypes'])] for r in sorted(load('BuildingSmithyData'), key=lambda r: int(r['id']))]
GR = collections.defaultdict(list) if 'collections' in globals() else None
import collections
GR = collections.defaultdict(list)
for r in load('GachaRateData'):
    if r['Grade'] == '1' and int(r['Rate']) > 0 and int(r['Group']) <= 8: GR[int(r['Group'])].append([int(r['Rarity']) - 1, int(r['Rate']) / 100])
RG = collections.defaultdict(list)
for r in load('RewardGroupData'): RG[r['Group']].append(r)
# Schmiede je Stufe: Anteil Waffe / Schriftrollen 2-10 / Schriftrollen 11-20 (in Prozent)
SMROLL = [[int(x['Rate']) for x in RG[str(1000 + k)]] for k in range(1, 9)]
def bundles(gid):
    b = collections.defaultdict(list)
    for r in RG[gid]:
        if int(r['Rate']) <= 0: continue
        b[r['BundleGroup']].append([int(r['Rate']), 'w' if r['RewardType'] == '4' else IT[int(r['RewardParam'])], int(r['RewardParam']) if r['RewardType'] == '4' else 0, int(r['RewardCount_Min']), int(r['RewardCount_Max'])])
    return [b[k] for k in sorted(b, key=int)]
CHEST = [[r['id'], i(r['RevealTimeSec']), bundles(r['RewardGroupId'])] for r in load('ChestData_2')]
CHESTSPAWN = {r['key']: [[int(x) for x in r['ChestRespawnOrder'].split(',')], i(r['RespawnCoolTimeSec'])] for r in load('ChestSpawnerData_2')}
KEYHOUSE = [[i(r['Level']), i(r['UnlockCount']), cost(r['UpgradeCostAmounts'], r['UpgradeCostTypes'])] for r in load('BuildingChestStoreData') if r['BldgId'] == '2']
KEYSLOT = [[i(r['chapter']), i(r['level']), cost(r['CostAmount'], r['CostType'])] for r in load('ChestSlotUnlockCostData_1')]
SUBSLOT = [[i(r['RequireLevel']), cost(r['RequireCost'], r['RequireType']), i(r['RequireQuestId'])] for r in load('SubWeaponUnlockCostData')]
WGOLD = [[int(r['id']), i(r['RequireAmount'])] for r in load('WeaponLevelUpGoldCostData')]
WSCROLL = [i(r['RequireAmount']) for r in sorted(load('WeaponLevelUpScrollCostData'), key=lambda r: int(r['id']))]
LVREW = collections.defaultdict(dict)
for r in load('LevelUpRewardData_2'):
    if int(r['reward_type']) in IT: LVREW[int(r['level'])][IT[int(r['reward_type'])]] = int(r['amount'])
CFA = {r['key']: r['value'] for r in load('ConfigData')}
ECON = {'craftCost': int(CFA['WeaponGachaCost']), 'chestPrice': [int(CFA['ChestShop_ChestPrice_Wooden']), int(CFA['ChestShop_ChestPrice_Silver'])], 'homePortalCd': int(CFA['HomePortalCoolTimeSec']), 'blessSec': int(CFA['BLESSING_BUFF_DURATION']),
        'bless': [int(CFA['BLESSING_VAMPIRIC_RATE']), int(CFA['BLESSING_EXPANSION_RATE']), int(CFA['BLESSING_GROWTH_RATE'])]}
# Hauptquestkette Kapitel 1: der NextId-Kette ab Quest 1 folgen, bis zum Wechsel ins zweite Kapitel. Nur Bedingung, Menge und Belohnung – keine Texte.
QR = {r['id']: r for r in load('QuestData') if r.get('GroupId') == '1'}
RI = {0: 'gold', 1: 'crystal', 2001: 'key_novice', 2002: 'key_expert', 2003: 'key_warrior', 301: 'weapon_scroll'}
MAINQ = []; cur = '1'
while cur in QR:
    r = QR[cur]; rt = r.get('Reward_Type_1'); n = i(r.get('Reward_Value_1'))
    rk = 'xp' if rt == 'Exp' else RI.get(i(r.get('Reward_Id_1')), '') if rt == 'StackableItem' else ''
    MAINQ.append([int(cur), i(r['Condition_Type']), i(r.get('Condition_Param')), i(r['Condition_Value']), rk if n else '', n, 1 if r.get('Accumulate') == 'TRUE' else 0])
    if r['Condition_Type'] == '6003': break
    cur = r['NextId']
J = lambda v: json.dumps(v, separators=(',', ':'))
open(__file__.replace('tools/import_gamedata.py', 'src/core/content/econ_ref.js'), 'w').write(
    '// GENERIERT von tools/import_gamedata.py – nicht von Hand ändern.\n// Quelle: Datentabellen des Spiels, Version 27.2.0. Nur Zahlen, Schlüssel und Regeln.\n'
    '// BUILD[gebäude] = Baukosten\nexport const BUILD = ' + J(BUILD) + ';\n'
    '// SMITHY[stufe-1] = [nötige Schmiedevorgänge insgesamt, Kosten zur nächsten Stufe]; SMITHY_RATES[stufe] = [[Seltenheit, Prozent], ...]; SMITHY_ROLL[stufe-1] = Prozent [Waffe, Rollen 2-10, Rollen 11-20]\n'
    'export const SMITHY = ' + J(SMITHY) + ';\nexport const SMITHY_RATES = ' + J(GR) + ';\nexport const SMITHY_ROLL = ' + J(SMROLL) + ';\n'
    '// CHEST = [[id, Öffnungszeit s, Bündel: je Bündel eine Ziehung aus [Gewicht, Item oder "w" (Waffe), Schmiede-Ratenstufe, min, max]], ...]; ids 1-3 Kapitel 1, 4-6 Kapitel 2, 7-9 Kapitel 3 (Holz, Selten, Legendär)\n'
    'export const CHEST = ' + J(CHEST) + ';\n// CHESTSPAWN[Schlüssel] = [Reihenfolge der Truhen-ids, Respawn s]\nexport const CHESTSPAWN = ' + J(CHESTSPAWN) + ';\n'
    '// KEYHOUSE = [[Stufe, offene Plätze, Kosten zur nächsten Stufe], ...]; KEYSLOT = [[Kapitel, Platz, Kosten], ...]\nexport const KEYHOUSE = ' + J(KEYHOUSE) + ';\nexport const KEYSLOT = ' + J(KEYSLOT) + ';\n'
    '// SUBSLOT = [[Level, Kosten, Quest-id], ...] für Waffenplatz 2-6\nexport const SUBSLOT = ' + J(SUBSLOT) + ';\n'
    '// WGOLD = [[Waffenstufe, Gold für den nächsten Schritt], ...] (Stützstufen); WSCROLL[stufe-1] = Schriftrollen für den nächsten Schritt\nexport const WGOLD = ' + J(WGOLD) + ';\nexport const WSCROLL = ' + J(WSCROLL) + ';\n'
    '// MAINQ = [[id, Bedingungstyp, Parameter, Menge, Belohnung (xp oder Item), Belohnungsmenge, zählt seit jeher], ...] in Kettenreihenfolge\nexport const MAINQ = ' + J(MAINQ) + ';\n'
    '// LVREW[Level] = Belohnung beim Erreichen\nexport const LVREW = ' + J(LVREW) + ';\nexport const ECON = ' + J(ECON) + ';\n')
open(__file__.replace('tools/import_gamedata.py', 'src/core/content/game_ref.js'), 'w').write(
    '// GENERIERT von tools/import_gamedata.py – nicht von Hand ändern.\n// Quelle: Datentabellen des Spiels, Version 27.2.0 (vom Nutzer bereitgestellte Spieldatei). Nur Zahlen, Schlüssel und Regeln.\n'
    '// ENEMY[id] = [Level, Leben, Angriff, Angriffe/s, Reichweite m, Lauftempo, Rückzugstempo, Sicht m, Aktion m, Kampfabstand m, Wutzeit s, Fluchtzeit s, Haltung Sicht, Haltung Aktion, Haltung Treffer,\n'
    '//             Rudel, Typ, Seltenheit, XP, Gold, Drop-Typ, Drop-Menge, Drop-Stücke, Größe, Skalierung, Rückstoß, Fertigkeiten, Schlüssel,\n'
    '//             Leben als Vielfaches des Spieler-Schadens pro Sekunde (0 = festes Leben), Goldstücke, zweiter Drop: Typ, Menge, Stücke]\n'
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
