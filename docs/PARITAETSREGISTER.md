# Paritätsregister

Automatisch erzeugt mit `npm run parity` aus `src/core/content/base.js` (Version base-27.2.0-1, Fingerprint 1hjssf554gp).
Quelle aller Referenzangaben: Systemanalyse (Stand 26.11.2026, Referenz 27.2.0, inoffizielle Fan-Daten). Es fand keine eigene Datenextraktion statt.

Status: **D** = belegt (Referenz 27.2.0) · **B** = beobachtet, Details eigen · **R** = rekonstruiert · **E** = EIGENER Wert · **?** = offen / zu verifizieren

Jeder Wert ist im Admin-Panel unter „Content & Balancing“ änderbar; kein Wert steht im Gameplay-Code.

## Tabellen

| Tabelle | Zeilen | Status | Zeilen nach Status | Hinweis |
|---|---|---|---|---|
| items | 32 | D | D:23 ?:1 E:6 B:2 | Währungen/Items laut Abschnitt 11; nicht alle 116 Originalitems bekannt. |
| areas | 20 | D | D:20 | 20 Gebiete, 19 Gates; Kartenlayout/Koordinaten eigen (E). |
| monsters | 154 | E | E:154 | 206 Monster/246 Varianten im Original; hier dokumentierte Beispiele (D) + eigene Platzhalter. |
| variants | 175 | E | D:173 E:2 | Zeilen mit s=D tragen Referenzwerte (Level/HP/ATK bzw. Drops). |
| spawnGroups | 253 | R | D:128 R:115 E:10 | Kapitel 1: 124 platzierte Spawnknoten mit Monster, Position, Respawn und Patrol aus den Szenendaten (D). Kapitel 2/3: 71/58 Gruppen (D), Position eigen. |
| resourceGroups | 7 | E | E:7 | Rohstoffstellen als angreifbare Knoten. |
| behaviors | 6 | E | E:6 | Gegner-KI-Parameter je Typ; Original-KI unbekannt. |
| bossPatterns | 1 | E | E:1 | Generische, eigene Bossfähigkeiten (keine Originalmuster). nova: Geschosse im Kreis nach dem Einschlag, sobald der Boss wütend ist. |
| statuses | 3 | E | E:3 | Statuseffekte: Stack-Limit, Erneuerung, Immunität. |
| chestSpawners | 20 | R | D:18 R:2 | Kapitel 1: Position + Respawn aus Szenendaten (D); Stage 7-12/14-19 Respawn dokumentiert; Rest eigen. |
| giftSpawners | 45 | R | E:28 D:17 | Kapitel 1: 17 Gift-Chest-Spawner mit Position und Respawn 300 s aus Szenendaten (D); Kap. 2/3 eigen. |
| chestTypes | 9 | D | D:9 | Öffnungszeit 120/300/900 s und Inhalte je Bündel aus den Spieldaten; 1-3 Kapitel 1, 4-6 Kapitel 2, 7-9 Kapitel 3. |
| areaChests | 20 | R | R:20 | Je Gebiet eine einmalige Gebietstruhe (Kap. 1: 6 Stage-Truhen der Referenz, Position D neben dem Truhenspawner); Inhalt eigen. |
| giftChestLevels | 400 | R | R:400 | Gold L1=12 und L400=1.983.356 (D); Zwischenwerte geometrisch interpoliert (E). Bonus: Gold x5 + 10 Gems (D). |
| keyHouseSlots | 15 | D | D:15 | 15 Plätze (5 je Kapitel): Kosten aus den Spieldaten; in Kapitel 1 braucht Platz n das Schlüsselhaus auf Stufe n. |
| keyhouseTiers | 5 | D | D:5 | Ausbau des Schlüsselhauses (Kapitel 1): Kosten zur nächsten Stufe. |
| levelRewards | 80 | D | D:80 | Belohnung beim Erreichen eines Levels (alle 5 Level) aus den Spieldaten. |
| playerLevels | 400 | D | D:400 | XP-Schwellen, Grundwerte und XP-Obergrenze je Kill aus den Spieldaten (Level 1-400 von 1.500). |
| upgradeTracks | 43 | R | D:36 R:4 E:3 | Ability 9 nutzbar (+ Critical Damage mit 0 Stufen) / Special 11 (Sternstufen) / Extra 8 / Soul 9 / Blessing 3x50 (D-Zählungen); Werte außer Power eigen. |
| rarities | 9 | E | E:9 | Seltenheitsnamen D; Multiplikatoren/Maxlevel eigen. |
| weaponClasses | 6 | R | R:6 | 6 Klassen und S-Skill-Namen D; Reichweite/Takt/Passiva eigen. |
| skills | 10 | E | E:10 | Skillnamen der S-Reihen D; Parameter eigen. |
| typeBonus | 6 | D | D:6 | Bonus der Waffenart: gilt nur, wenn die Hauptwaffe zur Meisterschaft des aktiven Helden passt (Fan-Wiki). |
| weapons | 84 | R | R:84 | 84 Varianten, 12 Reihen, Namen und Waffen-Fertigkeiten ab Epic mit Gesamtfaktor (D). Fertigkeit löst nach ihrer Abklingzeit aus (D). Schaden je Stufe linear zwischen Stufe-1- und Maximalwert, Maximalstufen und Stufen-Boni aus dem Fan-Wiki (D); Merge-Anzahl 3 (D), Evo-Kosten eigen. Transzendenz offen. |
| smithy | 8 | D | D:8 | Schmiede je Stufe aus den Spieldaten: Raten der Waffen (zusammen 60 %), sonst Schriftrollen (2-10 oder 11-20), nötige Schmiedevorgänge und Kosten für die nächste Stufe. |
| heroes | 26 | R | E:21 B:1 D:4 | 26 Helden, 8 Seltenheitsstufen, Waffenklasse je Platz nach Heldenübersicht der Vorlage (B). Freyja/The Skull/Hana/Vlad: Exotic ohne Evolutionszeilen (D). Namen, Werte und Figuren-Designs eigen. |
| heroLevelCosts | 5 | R | R:5 | Stützstufen 1 und 10..130 je Tiergruppe (D-Struktur); Evolution-Coin-Werte eigen. |
| heroStars | 5 | E | E:5 | Sterne 1-6 (D); Kosten/Optionen eigen. |
| heroCollection | 56 | R | R:56 | Sternsumme je Raritätsgruppe, Schwellen 1 bzw. Dreierschritte (D); Boni eigen. Accountweit. |
| traitQualities | 7 | E | E:7 | Qualitätsstufen bis SSS (B); Gewichte/Multiplikatoren eigen. |
| traitOptions | 9 | E | E:9 | Optionen/Rollgewichte eigen. |
| synergies | 3 | E | E:3 | Synergiegruppen eigen. |
| runes | 115 | E | E:115 | 115 Runen, 4 Typen, 8 Seltenheiten (D-Zählungen); Verteilung, Effekte, Einheiten eigen. |
| runeGrades | 8 | R | R:8 | Levelgrenzen ca. 10-80 je Grad (D); Kosten/Refund eigen. |
| rateGroups | 7 | R | E:5 R:1 D:1 | Rate-Gruppe 4001 = 65/30/4/1 (D); übrige Gewichte eigen. |
| gachaBoxes | 12 | R | R:10 ?:1 D:1 | 26 Boxdefinitionen im Original; hier 12 belegbare (inkl. 8 Runentruhen, Special Hero Chest). Gem-Preise eigen, kein universeller 10er-Preis. |
| buildings | 8 | D | D:8 | Baukosten aus den Spieldaten (D). |
| npcs | 29 | R | E:2 D:26 R:1 | 8 Figuren, 27 Standorte, Szenen-Freischaltung nach Referenz (D-Struktur); alle Dialogtexte und Älteste/Schmied sind eigen. |
| worldObjects | 2 | D | D:2 | Invasionsportale (Positionen der Referenz, dekorativ: Invasion läuft über das Menü) und Lagerfeuer. |
| worlds | 1 | B | B:1 | Zusammenhängende Kapitel-1-Welt: Gelände, Gebietsgrenzen, Fels, Wasser und Farbtöne als Raster aus der Originalkarte (B); Referenzpunkte D; Bauplätze der Basis E. Meter, X=Ost, Z=Nord. |
| unlocks | 7 | D | D:4 E:2 R:1 | Levelgebundene Freischaltungen (D); blessing/spin/special/extra/pvp eigen platziert. |
| quests | 352 | R | R:66 D:280 ?:1 E:5 | Hauptquestkette (Original ca. 850 Einträge nicht erfasst): dokumentierte Unlock-Kopplungen (s=D) + eigene Gebietsquests. Dazu 268 NPC-Kettenquests (id nq_*, Ziel/Menge/Belohnung D, Abgabe beim Questgeber). |
| tracks | 12 | R | R:3 D:4 E:5 | Generische Claim-Tracks (Meilensteine, Missionen, Pässe, Events). Status je Track im Feld s. |
| shop | 61 | R | D:4 E:7 R:34 B:15 ?:1 | Rein spielinterner Katalog. Royal-Perks (D) als erspielbare Einmal-Angebote; Preise eigen. EXP-Perk (Wert 1000, Einheit ungeklärt) nicht angewendet. |
| perks | 5 | D | D:4 ?:1 | Royal-Lifetime-Perkwerte; Einheit von cargo/exp ungeklärt (cargo als flacher Wert angewendet = R, exp nicht angewendet). |
| merchant | 2 | E | E:2 | Rollierender Händler: täglich (UTC) per Seed 4 Angebote; Refresh gegen Gems. Boss-Rank-Shop: 1 Gratis-Refresh/Tag (D-Cap). |
| randomReward | 1 | R | R:1 | IngameRV: 393 Levelzeilen (als Band L8-400, R); Gem-Gewicht 0,10 Menge 10 (D); Orb-Mengenbereiche D, Orb-Gewichte E. Crimson/Azure/Soul unzugeordnet = deaktiviert. |
| spinSegments | 7 | E | E:7 | 7 Segmentdefinitionen (D-Zählung, 192 Originalzeilen nicht erfasst); Bedingungen und Rewardzeilen eigen. |
| towerFloors | 250 | R | E:249 D:1 | 250 Etagen (D); Etage 151 = 35 Gems (D). Gegner, Wellen, übrige Rewards eigen (Gems = 5 + floor(Etage/5)). |
| raidMechs | 6 | R | R:6 | Je Raid-Boss eine Kernmechanik (Normal). D = im Guide genannte Zahlen; period/hpPct/radius/Prozent je Sekunde eigen. |
| raidBosses | 6 | R | R:6 | 6 Raid-Bosse mit Namen aus Ryans Questkette (D); Werte und Wertung eigen. |
| tombTiers | 20 | R | R:20 | 20 Schwierigkeits-/Dropstufen (D); Gegner, Typ-/Raritätsgewichte eigen. |
| invasionTiers | 6 | R | R:6 | 6 Tiers (D); Auf-/Abstieg nach Top-Perzentil, Rewards eigen. |
| events | 1 | E | E:1 | Eigene Live-Events (EventDef). Zeitfenster UTC; per Admin-Panel pflegbar. |
| codes | 0 | E |  | Eigene Belohnungscodes (lokaler Kanal); keine Fremdcodes. Format {id, code, reward, expires, max}. |
| base | 1 | E | E:1 | Basis-Karte. |

## Konfigurationswerte

| Schlüssel | Status | Wert | Hinweis |
|---|---|---|---|
| curves | E | `{"mobHp":[10,2,2.2],"mobAtk":[0.5,1.6],"mobXp":[2,1,1.1],"mobGold":[1,0.6,1.6],"rank":{"normal":{"hp":1,"at…` | Eigene Gegnerkurve; Originalwerte je Variante aus Bestiary importieren. |
| xp | ? | `{"trigger":"kill","factor":1,"capBehavior":"discard","maxLevel":400,"healOnLevelUp":true}` | XP-Auszahlungsort, Rundung (floor), Cap-Verhalten und HP-Behandlung sind eigen. factor = Progressionstempo. |
| rewardFactor | E | `{"gold":1,"drops":1}` | Eigenes Progressionstempo, unabhängig von der Simulation. |
| bonusClaims | ? | `{"mode":"replace","levelUp":true,"giftChest":true}` | Früherer Rewarded-Ad-Bonus (x5) als direkter Gratis-Claim. replace/add ungeklärt. |
| caps | D | `{"towerBonus":5,"pvpReward":5,"pvpTicket":10,"revive":3,"dailyGemShop":2,"bossRankRefresh":1,"randomReward"…` | Erste 6 Keys = dokumentierte Tagescaps (Summe 26). randomReward/freeSpin = E. |
| applyDailyGemShopCapToFreeGems | ? | `false` | Semantik von Daily-Gem-Shop-RV-Cap 2 ungeklärt; standardmäßig nicht auf 9002-9004 angewendet. |
| dailyTickets | E | `{"ticket_tower":5,"ticket_raid":2,"ticket_tomb":3}` | Tägliche Grundtickets (Auffüllen bis zu diesem Wert). |
| player | E | `{"baseCargo":20,"moveSpeed":230,"critChance":5,"critDmg":150,"pickupRadius":90,"regenPct":1,"radius":16}` | Grundwerte Spieler. |
| statCaps | E | `{"critChance":100,"cooldownPct":70,"atkSpeedPct":400,"moveSpeedPct":150,"lifesteal":50,"multiHit":100,"trip…` | Obergrenzen; Kritchance <= 100. |
| combat | R | `{"weaponSkillRadius":110,"subRangeM":4,"fistAps":1.8,"enemyLeashM":8,"enemySpeedCap":300,"subIntervalMult":…` | Nebenwaffen feuern langsamer/schwächer als die Hauptwaffe (eigene Werte). Offline-Respawn ungeklärt. |
| weaponLevelCost | D | `{"gold":[[1,82],[5,106],[11,287],[15,493],[19,863],[23,1322],[28,1919],[33,2878],[39,4688],[45,6880],[52,10…` | Waffenstufe: Gold nach Stützstufen (dazwischen linear), Schriftrollen 2 x Stufe - 1; unabhängig von der Seltenheit (Spieldaten). |
| craftCost | B | `[5,5,5,5,5,5,5,5]` | Schmieden kostet auf jeder Schmiedestufe 5 Kristalle (Vorlage). |
| weaponSlots | D | `[{"slot":1},{"slot":2,"level":5,"cost":{"stone":5},"quest":true},{"slot":3,"level":25,"cost":{"stone":10}},…` | Waffenplätze 2-6: Level und Kosten aus den Spieldaten; Platz 2 schaltet die Questkette frei. |
| traits | ? | `{"slots":5,"presets":3,"rerollCost":{"attr_point":10},"lockSurcharge":0.5}` | Slotzahl, Rollkosten und Lockkosten eigen. |
| runes | ? | `{"slots":6,"slotLevels":[1,60,90,120,160,200],"dismantleRefundPct":80,"milestoneEvery":10,"milestonePct":10}` | Slots und Refund eigen. |
| heroes | E | `{"starter":"h_01","levelPct":2,"selectTicketPieces":50,"raidTeam":3}` | Heldenlevel: +levelPct% ATK/HP je Level über 1. |
| keyhouse | E | `{"speedUpGemsPerMin":1,"chapterBound":true}` | Beschleunigung nur gegen erspielte Gems; kein Ad-Skip. |
| quests | R | `{"npcTurnIn":false}` | false: Aufträge der Figuren starten von selbst und werden über die Questkarte abgeschlossen (die Referenzdaten kennen keinen Abgabe-Schritt beim NPC). true: Annahme und Abgabe beim NPC. |
| homeReturn | E | `{"cost":{}}` | Rückkehr zur Basis: unbegrenzt und kostenlos (Tageslimit auf Nutzerwunsch entfernt). |
| remoteBaseAccess | E | `true` | Komfort: Basis-Menüs von überall (weniger Laufwege). |
| randomReward | E | `{"everySec":300}` | Intervall der Bonusbelohnung im Feld (früher Rewarded Ad). |
| tower | R | `{"entryCost":{"ticket_tower":1},"timerSec":30}` | 30 s ist Modellannahme des DPS-Rechners. |
| raid | E | `{"entryCost":{"ticket_raid":1},"timerSec":60}` |  |
| tomb | E | `{"entryCost":{"ticket_tomb":1},"timerSec":90}` |  |
| pvp | E | `{"entryCost":{"ticket_pvp":1},"k":24,"startRating":1000,"winReward":[{"item":"gold","n":500},{"item":"weapo…` |  |
| invasion | E | `{"entryCost":{"ticket_invasion":1},"k":32,"startRating":1000,"botsPerTier":30,"bankPerHour":20,"bankCap":20…` | Async-PvP gegen gekennzeichnete Bots/Snapshots. |
| spin | ? | `{"unlockConfigRaw":"1,3","spinCost":{"spin_ticket":1}}` | Unlock-Config 1,3: Bedeutung ungeklärt, nicht angewendet. |
| orbAlias | ? | `{"crimson":null,"azure":null,"soul":null}` | Interne Orb-Namen nicht zugeordnet; betroffene Reward-Zeilen sind deaktiviert. |
| world | E | `{"normalPerNode":1,"rareRespawnMinSec":900,"spawnSpreadM":2.5,"activeRadiusM":40,"autoBossSafety":0.7}` | Kapitel-1-Welt: Gegner je normalem Spawnknoten (Original unbekannt), Seltenheitsschwelle nach Respawnzeit, Simulationsradius. |
| ledgerKeep | E | `400` |  |
| saveSlots | E | `2` |  |
| special | D | `{"maxStar":5,"grades":[{"cost":{"gold":35280,"orb_red":10},"bonus":[]},{"cost":{"gold":455400,"orb_red":20}…` | Sternstufen 1-5 aus den Spieldaten (D): Aufstiegskosten und Bonus je Stufe. Dass sich die Boni addieren, ist abgeleitet (R). |
| multiplayer | E | `false` | Solo-Spiel: PvP-Arena und Invasion sind nicht Teil des Spiels. true im Content schaltet sie samt Zubehör wieder ein (Paket mit buildBaseContent({ multiplayer: true }) erzeugen). |

## Offene Originaldaten (nicht erfunden, nicht behauptet)

- Vollständige XP-Schwellen je Level und Kill-XP je Gegnervariante; XP-Auszahlungsort und Rundung.
- Formelreihenfolge bei Schaden und Stats; Transzendenzboni der Waffen; StatReduction der Helden.
- 206 Monster / 246 Varianten: nur die dokumentierten Beispiele tragen Referenzwerte.
- Vollständige Heldenliste (24/26), Skill-Prozentwerte, Evolutionsoptionen.
- Fehlende 40 % der Schmiede-Gewichte ab Stufe 2 und mögliche Mehrfachpools.
- 14 der 26 Gacha-Boxen, exakte Gewichte, Pity-Gruppen, Gem-Preise je Box.
- Trait-Slotzahl, Rollgewichte, Lock- und Synergiekosten.
- Rune-Effekte und Einheiten, Levelkosten, Dismantle-Refunds, Typgewichte.
- 19 der 26 Gebäude und alle Materialmengen.
- Alle Shop-SKUs und Ingame-Preise; Paid-Track des Chapter Pass (77.000 Gems) wird bewusst nicht ausgezahlt.
- Ca. 850 Quest- und alle NPC-/Dialogzeilen; Kartenkoordinaten.
- 250 Tower-Etagen (nur Etage 151 = 35 Gems belegt), Raid-, Tomb-, PvP- und Invasion-Algorithmen und -Rewards.
- Zuordnung der internen Orb-Namen Crimson/Azure/Soul; Einheit der Perk-Werte Cargo 2000 / EXP 1000.
- Lucky-Spin-Tabellen (192 Zeilen), Unlock-Config „1,3“, Daily-Gem-Shop-RV-Cap-Semantik.
- Offline-Respawn und Original-KI.
