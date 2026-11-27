# Karten-Auftrag: Requisiten, Boden, Regeln

Erzeugt von `tools/map_brief.js`. Bilder dazu: `docs/sheets/karte_*.png`.

## Was die Karte festlegt (bleibt unverändert)

- **Raster:** 97 × 85 Zellen zu 2 m (`src/core/content/world1_map.js`). Je Zelle: außerhalb, Fels, Boden eines Gebiets oder Wasser, dazu ein Farbton aus 39 Palettenfarben.
- **Feste Plätze:** 1185 Deko-Objekte, 175 fällbare Bäume, 49 Steine/Erze, jeweils mit Position, Drehung und Größe (`src/core/content/scene1_ref.js`).
- **Kollision:** nur das Raster. Requisiten blockieren nicht; sie sind reine Darstellung.

## Damit es nur detaillierter wird und sich nichts verschiebt

1. **Gleicher Name, gleiche Rolle:** Ein neues Modell ersetzt genau eine Requisite der Tabelle unten und trägt ihren Namen (`<name>.glb`).
2. **Gleiche Standfläche und Höhe:** Breite, Tiefe und Höhe der Tabelle auf ±15 % einhalten. Größere Modelle ragen in Wege oder verdecken Gegner.
3. **Ursprung am Boden, mittig:** Y nach oben, Vorderseite nach +Z, 1 Einheit = 1 Meter. Die Karte dreht und skaliert selbst (Drehung in 10°-Schritten, Größe 0,7–1,6).
4. **Varianten statt Einzelstücke:** Pro Requisite 2–4 Varianten liefern (`rock_grey_a.glb`, `rock_grey_b.glb` …). Das Spiel wählt je Platz fest eine aus – so wirkt es abwechslungsreich, ohne dass ein Platz wandert.
5. **Farbe aus der Kartenpalette:** Felsen und Bodendeko nehmen den Farbton ihrer Zelle an (Bild `karte_palette.png`). Modelle dafür in neutralem Hellgrau anlegen; nur Akzente (Blüten, Pilzhüte, Kristalle) fest einfärben.
6. **Budget:** Kleinteile (Gras, Blumen, Steine) höchstens 40 Dreiecke, mittlere (Zaun, Busch, Fels) 60–150, große (Baum, Säule, Statue) 150–350, Gebäude bis 800. Auf der ganzen Karte stehen rund 1.400 feste Objekte plus die Felsbrocken jeder Felszelle.
7. **Material:** ein gemeinsames Material, Vertex-Farben oder die gemeinsame kleine Palettentextur, weiche Normalen. Keine Einzeltexturen, keine Transparenz (Blätter als Flächen modellieren, nicht als Alpha-Karten).

## Was zusätzlich neu sein darf (ändert die Karte nicht)

- **Streu-Deko:** Kleinteile ohne festen Platz (Kiesel, Grasbüschel, Blätter, Risse), die das Spiel regelbasiert auf Bodenzellen verteilt – je Gebiet eine Liste mit Dichte. Diese Streuung ist in Kapitel 1 derzeit aus und kann mit neuen Kleinteilen wieder eingeschaltet werden.
- **Bodenkacheln:** ein dezentes Muster je Gebiet (Kachel, Sandwellen, Schneeflecken) als Vertex-Farbvariation; die Zellfarbe bleibt die Grundlage.
- **Ränder:** Übergangsstücke zwischen Boden und Fels (Geröll, Grasnarbe) und zwischen Boden und Wasser (Ufer).

## Requisiten im Bestand

„Feste Plätze“ = Anzahl in Kapitel 1. „Streuung“ = Gebiete, in denen die Requisite regelbasiert gestreut wird (Kapitel 2/3 und Arenen).

| Name | Breite m | Höhe m | Tiefe m | Teile heute | Feste Plätze | Streuung |
|---|---|---|---|---|---|---|
| `tree_round` | 2.0 | 2.9 | 2.0 | 3 | 15 | town, green, verdant |
| `tree_round2` | 1.6 | 2.3 | 1.6 | 3 | 6 | town, green, verdant, ch2 |
| `bush` | 1.3 | 0.9 | 1.3 | 1 | 33 | town, green, verdant |
| `bush_rose` | 1.3 | 0.9 | 1.3 | 3 | – | verdant |
| `rock_grey` | 1.6 | 1.0 | 1.4 | 1 | 98 | town, green, verdant, ch2, ch3, arena |
| `rock_sand` | 1.8 | 1.1 | 1.5 | 1 | 108 | desert |
| `rock_dark` | 1.5 | 0.8 | 1.4 | 1 | 52 | ebon |
| `rock_snow` | 1.6 | 1.0 | 1.5 | 2 | 62 | frost |
| `rock_red` | 1.6 | 1.1 | 1.5 | 1 | 71 | hell |
| `cactus` | 1.1 | 2.0 | 0.5 | 5 | 14 | desert |
| `mesa_s` | 2.6 | 2.4 | 2.2 | 2 | – | desert |
| `deadbush` | 0.9 | 0.6 | 0.9 | 2 | – | desert |
| `deadtree` | 1.5 | 2.3 | 0.4 | 3 | 7 | ebon |
| `grave` | 0.9 | 0.9 | 1.1 | 2 | 11 | ebon |
| `shroom` | 1.1 | 1.1 | 1.1 | 2 | 18 | ebon |
| `pine_snow` | 2.0 | 3.4 | 2.0 | 4 | 1 | frost |
| `ice_crystal` | 1.1 | 2.3 | 1.0 | 2 | – | frost |
| `pillar_broken_s` | 1.2 | 1.6 | 1.2 | 2 | 30 | verdant |
| `obsidian` | 1.4 | 2.6 | 1.1 | 2 | – | hell |
| `crystal_red_s` | 0.5 | 1.4 | 0.5 | 1 | – | hell |
| `fence_s` | 2.0 | 0.9 | 0.1 | 3 | 51 | town |
| `grass` | 0.9 | 1.0 | 0.9 | 5 | 169 | town, green, verdant, ch2 |
| `grass_dark` | 0.4 | 0.5 | 0.3 | 2 | 41 | ebon |
| `flowers_s` | 0.7 | 0.3 | 0.5 | 3 | 80 | town, green, verdant |
| `pebble` | 0.5 | 0.2 | 0.4 | 1 | – | green |
| `pebble_sand` | 0.5 | 0.3 | 0.5 | 1 | – | desert |
| `bones_s` | 0.8 | 0.1 | 0.1 | 2 | 82 | desert, ebon, hell |
| `snow_lump` | 0.9 | 0.3 | 0.8 | 1 | 31 | frost |
| `ice_shard_s` | 0.3 | 0.7 | 0.3 | 1 | 2 | frost |
| `rubble` | 0.8 | 0.3 | 0.6 | 2 | – | verdant, ch3 |
| `ember` | 0.3 | 0.2 | 0.3 | 1 | – | hell |
| `crack` | 1.9 | 0.0 | 0.5 | 2 | – | hell |
| `shroom_s` | 0.5 | 0.5 | 0.5 | 2 | – | ebon |
| `plaza` | 9.0 | 0.1 | 9.0 | 2 | – | – |
| `well` | 2.0 | 2.8 | 2.0 | 5 | – | – |
| `banner` | 0.7 | 3.0 | 0.1 | 2 | – | – |
| `lamp` | 0.4 | 2.5 | 0.4 | 2 | – | – |
| `fence` | 3.8 | 0.9 | 0.1 | 5 | – | – |
| `crates` | 1.5 | 1.4 | 1.0 | 3 | 9 | – |
| `signpost` | 1.3 | 1.6 | 0.1 | 3 | – | – |
| `bigtree` | 4.4 | 5.6 | 4.4 | 6 | – | – |
| `tent` | 2.4 | 1.8 | 2.4 | 2 | – | – |
| `flowers` | 2.3 | 0.3 | 1.9 | 12 | – | – |
| `stump` | 0.9 | 0.5 | 0.9 | 2 | 7 | – |
| `campfire` | 3.3 | 1.3 | 3.2 | 13 | – | – |
| `tent_goblin` | 2.6 | 2.8 | 2.6 | 3 | – | – |
| `mesa` | 5.0 | 4.0 | 4.7 | 3 | – | – |
| `skull_big` | 2.4 | 1.8 | 3.1 | 4 | – | – |
| `arch` | 4.8 | 4.1 | 1.3 | 3 | – | – |
| `bones` | 2.0 | 0.4 | 0.6 | 5 | – | – |
| `graves` | 3.8 | 0.9 | 2.9 | 10 | – | – |
| `statue` | 2.3 | 3.0 | 1.6 | 5 | 4 | – |
| `deadtree_big` | 3.3 | 3.6 | 1.1 | 4 | – | – |
| `lantern` | 0.3 | 2.0 | 0.3 | 2 | 6 | – |
| `shroom_big` | 3.3 | 2.5 | 2.8 | 4 | – | – |
| `tent_snow` | 2.4 | 1.8 | 2.4 | 2 | – | – |
| `icespire` | 2.6 | 4.4 | 1.7 | 3 | – | – |
| `snowman` | 1.1 | 1.5 | 1.1 | 3 | – | – |
| `cave` | 5.0 | 3.1 | 4.0 | 2 | – | – |
| `iceblocks` | 2.0 | 1.6 | 1.4 | 3 | – | – |
| `pillar` | 1.3 | 4.1 | 1.3 | 3 | – | – |
| `pillar_broken` | 2.2 | 1.6 | 1.4 | 3 | – | – |
| `ruin_arch` | 5.5 | 4.4 | 1.6 | 4 | – | – |
| `roses` | 3.5 | 0.9 | 1.9 | 9 | – | – |
| `statue_elf` | 1.6 | 3.3 | 1.6 | 3 | – | – |
| `altar` | 4.2 | 2.5 | 3.4 | 4 | – | – |
| `spike` | 1.8 | 2.6 | 1.4 | 3 | – | – |
| `brazier` | 0.9 | 2.1 | 0.9 | 3 | – | – |
| `skull_totem` | 0.9 | 2.5 | 0.7 | 3 | – | – |
| `crystal_red` | 1.4 | 2.6 | 1.1 | 2 | – | – |
| `invportal` | 2.9 | 0.5 | 2.9 | 5 | – | – |
| `sandpatch` | 12.4 | 0.1 | 9.4 | 3 | – | – |
| `sandpath` | 2.2 | 0.0 | 7.5 | 2 | – | – |
| `storechest` | 1.4 | 0.9 | 1.1 | 5 | – | – |
| `boulder_grey` | 3.6 | 2.0 | 3.0 | 3 | – | – |
| `knight_statue` | 1.5 | 1.9 | 1.3 | 9 | – | – |
| `wanted` | 2.0 | 1.4 | 0.2 | 7 | – | – |
| `flower_o` | 1.1 | 0.2 | 1.1 | 6 | – | – |
| `trunk_purple` | 5.8 | 5.5 | 5.1 | 8 | – | – |
| `shroom_purple` | 2.8 | 3.0 | 2.4 | 5 | 19 | – |
| `crystal_grass` | 1.2 | 1.5 | 0.7 | 6 | – | – |
| `palm` | 2.9 | 3.0 | 2.0 | 6 | 4 | – |
| `grass_frost` | 0.7 | 0.8 | 0.4 | 3 | 24 | – |
| `ore` | 1.3 | 1.3 | 1.2 | 3 | 10 | – |
| `candle` | 0.5 | 0.9 | 0.3 | 4 | 36 | – |
| `egg` | 0.9 | 1.1 | 0.9 | 2 | 17 | – |
| `cobweb` | 2.2 | 0.1 | 2.2 | 3 | 18 | – |
| `plank` | 1.0 | 0.1 | 2.4 | 3 | 49 | – |

## Gebäude

| Name | Breite m | Höhe m | Tiefe m | Teile heute |
|---|---|---|---|---|
| `plot` | 2.6 | 0.1 | 2.6 | 3 |
| `bonfire` | 3.3 | 1.3 | 3.2 | 13 |
| `smithy` | 4.3 | 4.7 | 2.9 | 20 |
| `chesthouse` | 4.1 | 3.1 | 4.3 | 20 |
| `portal` | 5.4 | 3.9 | 3.4 | 20 |
| `raidcamp` | 4.4 | 2.6 | 4.0 | 10 |
| `tower` | 6.2 | 5.4 | 5.4 | 30 |
| `costumeshop` | 5.0 | 3.8 | 4.6 | 10 |
| `lumbermill` | 4.9 | 3.2 | 4.1 | 4 |
| `quarry` | 3.1 | 2.6 | 3.3 | 5 |

## Rohstoffe (im Spiel angreifbar)

- Fällbarer Baum: 175 Plätze, drei Fassungen (Wiese `tree_round`, Wüste `palm`, Schnee `pine_snow`). Braucht zusätzlich einen Stumpf-Zustand nach dem Fällen.
- Stein/Erz: 49 Plätze, zwei Fassungen (`rock_grey`, `ore`).
