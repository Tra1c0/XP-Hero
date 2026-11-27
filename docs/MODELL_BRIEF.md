# Modell-Auftrag: Figuren, Waffen, Helden

Erzeugt von `tools/model_brief.js`. Grundlage für eigene Modelle; die Gestaltung ist frei.

## Technische Vorgaben

- Blick: schräg von oben (45°), Figur schaut nach Süden zur Kamera. Lesbarkeit von oben zählt mehr als Details von vorn.
- Maßstab: 1 Einheit = 1 Meter. Spielfigur ca. 1,1 m hoch. Die Spalte „Höhe“ ist die Zielhöhe im Spiel.
- Budget (damit es leicht bleibt): Gegner 150–400 Dreiecke, Bosse bis 1.000, Waffen 40–120, Helden 300–600.
- Farbe als Vertex-Farbe oder eine gemeinsame kleine Palettentextur (max. 256×256 für alle Figuren zusammen). Keine Einzeltexturen je Figur.
- Format: glTF 2.0 binär (.glb), Ursprung zwischen den Füßen am Boden, +Y oben, Blick nach +Z.
- Animation: nicht nötig. Hüpfen, Angriffsruck, Treffer-Blinken und Waffenschwung rechnet das Spiel selbst. Waffen als eigenes Modell, Griff im Ursprung, Klinge nach +Y.
- Achtung: Das Spiel zeichnet derzeit nur Grundformen. Für .glb-Modelle muss ein Lader ergänzt werden (offen).

## Gegner (152 Modelle für 173 Varianten)

| Datei | Name | Rang | Gebiet | Level | Höhe | Angriff | Varianten |
|---|---|---|---|---|---|---|---|
| `enemy_mandragora.glb` | Mandragora | Normal | Greenhaven | 1 | 0.8 m | Nahkampf |  |
| `enemy_slime.glb` | Slime | Normal | Greenhaven | 2 | 0.8 m | Nahkampf |  |
| `enemy_mushroom.glb` | Mushroom | Normal | Greenhaven | 4–18 | 0.8 m | Nahkampf | Mushroom |
| `enemy_spider.glb` | Spider | Normal | Greenhaven | 5 | 0.8 m | Nahkampf |  |
| `enemy_slime_king.glb` | Slime King | Elite | Greenhaven | 3 | 2.0 m | Nahkampf |  |
| `enemy_boss_a1_1.glb` | Rootling | Boss | Greenhaven | 8 | 3.2 m | Nahkampf |  |
| `enemy_boss_a1_2.glb` | Scarlet | Boss | Sandevil Desert | 17 | 3.2 m | Nahkampf |  |
| `enemy_cactus.glb` | Cactus | Normal | Sandevil Desert | 9 | 0.8 m | Nahkampf |  |
| `enemy_red_spider.glb` | Red Spider | Elite | Sandevil Desert | 13 | 1.5 m | Nahkampf |  |
| `enemy_desert_spider.glb` | Desert Spider | Normal | Sandevil Desert | 15 | 0.8 m | Nahkampf |  |
| `enemy_bat.glb` | Bat | Elite | Sandevil Desert | 13–78 | 1.0 m | Nahkampf | Bat |
| `enemy_goblin.glb` | Goblin | Normal | Sandevil Desert | 13–200 | 0.8 m | Nahkampf | Goblin |
| `enemy_goblin_warrior.glb` | Goblin Warrior | Elite | Sandevil Desert | 12 | 1.0 m | Nahkampf |  |
| `enemy_treasure_goblin.glb` | Treasure Goblin | Spezial | Sandevil Desert | 16–215 | 0.8 m | flieht | Treasure Goblin |
| `enemy_golem.glb` | Golem | Elite | Sandevil Desert | 10 | 2.0 m | Nahkampf |  |
| `enemy_boss_goblin.glb` | Boss Goblin | Selten | Sandevil Desert | 14 | 2.4 m | Nahkampf |  |
| `enemy_mimic.glb` | Mimic | Spezial | Sandevil Desert | 11 | 1.5 m | Nahkampf |  |
| `enemy_red_dragon.glb` | Red Dragon | Selten | Sandevil Desert | 30 | 2.4 m | Nahkampf |  |
| `enemy_boss_a1_3.glb` | Gargoyle | Boss | Ebonhollow | 30 | 3.2 m | Nahkampf |  |
| `enemy_skeleton.glb` | Skeleton | Normal | Ebonhollow | 26 | 0.8 m | Nahkampf |  |
| `enemy_cursed_phantom.glb` | Cursed Phantom | Elite | Ebonhollow | 27 | 1.0 m | Nahkampf |  |
| `enemy_ghost.glb` | Ghost | Elite | Ebonhollow | 15 | 1.0 m | Nahkampf |  |
| `enemy_greedy_murloc.glb` | Greedy Murloc | Selten | Ebonhollow | 25 | 2.4 m | Nahkampf |  |
| `enemy_gold_elephant.glb` | Gold Elephant | Elite | Ebonhollow | 26 | 1.0 m | Nahkampf |  |
| `enemy_murlocs.glb` | Murlocs | Normal | Ebonhollow | 22 | 1.1 m | Nahkampf |  |
| `enemy_warrior_murlocs.glb` | Warrior Murlocs | Elite | Ebonhollow | 23 | 1.5 m | Nahkampf |  |
| `enemy_swamp_treant.glb` | Swamp Treant | Selten | Ebonhollow | 21 | 2.4 m | Nahkampf |  |
| `enemy_boss_a1_4.glb` | Frostfang | Boss | Frostbound | 45 | 3.2 m | Nahkampf |  |
| `enemy_frost_goblin_warrior.glb` | Frost Goblin Warrior | Elite | Frostbound | 38 | 1.0 m | Nahkampf |  |
| `enemy_frost_goblin.glb` | Frost Goblin | Normal | Frostbound | 37 | 0.8 m | Nahkampf |  |
| `enemy_big_foot.glb` | Big Foot | Selten | Frostbound | 40 | 2.4 m | Nahkampf |  |
| `enemy_wolf.glb` | Wolf | Normal | Frostbound | 31 | 0.8 m | Nahkampf |  |
| `enemy_witch.glb` | Witch | Elite | Frostbound | 40 | 1.0 m | Nahkampf |  |
| `enemy_warewolf.glb` | WareWolf | Selten | Frostbound | 35 | 2.4 m | Nahkampf |  |
| `enemy_ice_skeleton.glb` | Ice Skeleton | Normal | Frostbound | 42 | 0.8 m | Nahkampf |  |
| `enemy_boss_a1_5.glb` | Elf Queen | Boss | Verdant Ruins | 60 | 3.2 m | Nahkampf |  |
| `enemy_man_eater_flower.glb` | Man Eater Flower | Selten | Verdant Ruins | 55 | 2.4 m | Nahkampf |  |
| `enemy_wildrose.glb` | Wildrose | Normal | Verdant Ruins | 52 | 1.1 m | Nahkampf |  |
| `enemy_dark_elf.glb` | Dark Elf | Normal | Verdant Ruins | 57 | 1.1 m | Nahkampf |  |
| `enemy_chicken.glb` | Chicken | Normal | Verdant Ruins | 46 | 1.1 m | Nahkampf |  |
| `enemy_giant_chicken.glb` | Giant Chicken | Selten | Verdant Ruins | 50 | 2.4 m | Nahkampf |  |
| `enemy_thorn_wildrose.glb` | Thorn Wildrose | Elite | Verdant Ruins | 53 | 1.5 m | Nahkampf |  |
| `enemy_boss_a1_6.glb` | Baal | Boss | Hellfire Chasm | 100 | 3.2 m | Nahkampf |  |
| `enemy_devil_knight.glb` | Devil Knight | Normal | Hellfire Chasm | 85 | 1.1 m | Nahkampf |  |
| `enemy_hellhound.glb` | Hellhound | Normal | Hellfire Chasm | 61 | 0.8 m | Nahkampf |  |
| `enemy_bone_scamp.glb` | Bone Scamp | Normal | Hellfire Chasm | 75 | 1.1 m | Nahkampf |  |
| `enemy_skull_imp_chief.glb` | Skull Imp Chief | Selten | Hellfire Chasm | 80 | 2.4 m | Nahkampf |  |
| `enemy_red_skull.glb` | Red Skull | Elite | Hellfire Chasm | 78 | 1.5 m | Nahkampf |  |
| `enemy_hellhound_boss.glb` | Hellhound Boss | Selten | Hellfire Chasm | 70 | 2.4 m | Nahkampf |  |
| `enemy_elite_devil_knight.glb` | Elite Devil Knight | Selten | Hellfire Chasm | 90 | 2.4 m | Nahkampf |  |
| `enemy_corrupted_peasant.glb` | Corrupted Peasant | Normal | Fortress of Hope | 98 | 0.8 m | Nahkampf |  |
| `enemy_dark_rider.glb` | Dark Rider | Normal | Fortress of Hope | 108 | 0.8 m | Nahkampf |  |
| `enemy_dwarf_captain.glb` | Dwarf Captain | Selten | Fortress of Hope | 105 | 2.4 m | Nahkampf |  |
| `enemy_fallen_guard.glb` | Fallen Guard | Normal | Fortress of Hope | 100 | 0.8 m | Nahkampf |  |
| `enemy_spirit_guardian.glb` | Spirit Guardian | Selten | Fortress of Hope | 110 | 2.4 m | Nahkampf |  |
| `enemy_tainted_elemental.glb` | Tainted Elemental | Normal | Fortress of Hope | 104 | 0.8 m | Nahkampf |  |
| `enemy_boss_a2_1.glb` | Dark Lord | Boss | Fortress of Hope | 115 | 3.2 m | Nahkampf |  |
| `enemy_scout_raven.glb` | Scout Raven | Elite | Blackbarrow | 113 | 1.0 m | Nahkampf |  |
| `enemy_ashfire_golem.glb` | Ashfire Golem | Elite | Blackbarrow | 117 | 1.0 m | Nahkampf |  |
| `enemy_blood_bones.glb` | Blood Bones | Normal | Blackbarrow | 120 | 0.8 m | Nahkampf |  |
| `enemy_bone_colossus.glb` | Bone Colossus | Selten | Blackbarrow | 125 | 2.4 m | Nahkampf |  |
| `enemy_death_priest.glb` | Death Priest | Elite | Blackbarrow | 122 | 1.0 m | Nahkampf |  |
| `enemy_ghoul.glb` | Ghoul | Normal | Blackbarrow | 115 | 0.8 m | Nahkampf |  |
| `enemy_rot_champion.glb` | Rot Champion | Selten | Blackbarrow | 120 | 2.4 m | Nahkampf |  |
| `enemy_shadow_thief.glb` | Shadow Thief | Normal | Blackbarrow | 125 | 0.8 m | Nahkampf |  |
| `enemy_boss_a2_2.glb` | Banshee | Boss | Blackbarrow | 130 | 3.2 m | Nahkampf |  |
| `enemy_ancient_mane_bear.glb` | Ancient Mane Bear | Normal | Twilight Forest | 130 | 0.8 m | Nahkampf |  |
| `enemy_beast_master.glb` | Beast Master | Selten | Twilight Forest | 140 | 2.4 m | Nahkampf |  |
| `enemy_corrupted_dryad.glb` | Corrupted Dryad | Normal | Twilight Forest | 135 | 1.1 m | Nahkampf |  |
| `enemy_grove_guardian.glb` | Grove Guardian | Elite | Twilight Forest | 133 | 1.0 m | Nahkampf |  |
| `enemy_moonblade_warrior.glb` | Moonblade Warrior | Normal | Twilight Forest | 140 | 0.8 m | Nahkampf |  |
| `enemy_moonshadow.glb` | Moonshadow | Selten | Twilight Forest | 145 | 2.4 m | Nahkampf |  |
| `enemy_stone_titan.glb` | Stone Titan | Selten | Twilight Forest | 142 | 1.3 m | Nahkampf |  |
| `enemy_twisted_dryad.glb` | Twisted Dryad | Elite | Twilight Forest | 137 | 1.5 m | Nahkampf |  |
| `enemy_vine_sentinel.glb` | Vine Sentinel | Selten | Twilight Forest | 135 | 2.4 m | Nahkampf |  |
| `enemy_boss_a2_3.glb` | Volcanus | Boss | Twilight Forest | 150 | 3.2 m | Nahkampf |  |
| `enemy_abyssal_kraken.glb` | Abyssal Kraken | Selten | Water Temple | 155 | 2.4 m | Nahkampf |  |
| `enemy_coral_octopus.glb` | Coral Octopus | Normal | Water Temple | 150 | 0.8 m | Nahkampf |  |
| `enemy_giant_tentacle.glb` | Giant tentacle | Elite | Water Temple | 152 | 1.0 m | Nahkampf |  |
| `enemy_hydra.glb` | Hydra | Selten | Water Temple | 160 | 2.4 m | Nahkampf |  |
| `enemy_mermaid.glb` | Mermaid | Normal | Water Temple | 155 | 0.8 m | Nahkampf |  |
| `enemy_mermaid_guard.glb` | Mermaid Guard | Normal | Water Temple | 160 | 0.8 m | Nahkampf |  |
| `enemy_mermaid_ranger.glb` | Mermaid Ranger | Elite | Water Temple | 157 | 1.0 m | Nahkampf |  |
| `enemy_boss_a2_4.glb` | SeaQueen | Boss | Water Temple | 165 | 3.2 m | Nahkampf |  |
| `enemy_golden_basilisk.glb` | Golden Basilisk | Elite | Redrock Valley | 167 | 1.5 m | Nahkampf |  |
| `enemy_horn_beast.glb` | Horn Beast | Selten | Redrock Valley | 170 | 2.4 m | Nahkampf |  |
| `enemy_mutant_wolf_rider.glb` | Mutant Wolf Rider | Elite | Redrock Valley | 177 | 1.5 m | Nahkampf |  |
| `enemy_spear_troll.glb` | Spear Troll | Elite | Redrock Valley | 172 | 1.5 m | Nahkampf |  |
| `enemy_straw_fighter.glb` | Straw Fighter | Normal | Redrock Valley | 170 | 1.1 m | Nahkampf |  |
| `enemy_straw_lord.glb` | Straw Lord | Selten | Redrock Valley | 175 | 2.4 m | Nahkampf |  |
| `enemy_tusk_warrior.glb` | Tusk Warrior | Normal | Redrock Valley | 165 | 1.1 m | Nahkampf |  |
| `enemy_wolf_rider.glb` | Wolf Rider | Normal | Redrock Valley | 175 | 1.1 m | Nahkampf |  |
| `enemy_boss_a2_5.glb` | Warchief | Boss | Redrock Valley | 180 | 3.2 m | Nahkampf |  |
| `enemy_bone_wyrm.glb` | Bone Wyrm | Elite | Frosthold | 182–182 | 1.5 m | Nahkampf | Bone Wyrm |
| `enemy_crimson_warrior.glb` | Crimson Warrior | Elite | Frosthold | 187–187 | 1.5 m | Nahkampf | Crimson Warrior |
| `enemy_dark_knight.glb` | Dark Knight | Normal | Frosthold | 190–190 | 1.1 m | Nahkampf | Dark Knight |
| `enemy_death_lord.glb` | Death Lord | Selten | Frosthold | 190–190 | 2.4 m | Nahkampf | Death Lord |
| `enemy_frost_boar.glb` | Frost Boar | Selten | Frosthold | 185–185 | 2.4 m | Nahkampf | Frost Boar |
| `enemy_ice_bones.glb` | Ice Bones | Normal | Frosthold | 185–185 | 1.1 m | Nahkampf | Ice Bones |
| `enemy_wraith.glb` | Wraith | Normal | Frosthold | 180–375 | 0.8 m | Nahkampf | Wraith |
| `enemy_boss_a2_6.glb` | Revenant | Boss | Frosthold | 195 | 3.2 m | Nahkampf |  |
| `enemy_boss_a2_7.glb` | Frost King | Boss | Frozen Throne | 200 | 3.2 m | Nahkampf |  |
| `enemy_armor_spider.glb` | Armor Spider | Normal | Downtown | 205 | 1.1 m | Nahkampf |  |
| `enemy_boneguard.glb` | Boneguard | Elite | Downtown | 207 | 1.5 m | Nahkampf |  |
| `enemy_guardcapt.glb` | Guardcapt | Selten | Downtown | 220 | 2.4 m | Nahkampf |  |
| `enemy_hobgoblin.glb` | Hobgoblin | Normal | Downtown | 225 | 1.1 m | Nahkampf |  |
| `enemy_hobgoblin_warrior.glb` | Hobgoblin Warrior | Elite | Downtown | 227 | 1.5 m | Nahkampf |  |
| `enemy_ironweaver.glb` | Ironweaver | Selten | Downtown | 210 | 2.4 m | Nahkampf |  |
| `enemy_skeleton_guard.glb` | Skeleton Guard | Normal | Downtown | 215 | 1.1 m | Nahkampf |  |
| `enemy_boss_a3_1.glb` | Hobchief | Boss | Downtown | 230 | 3.2 m | Nahkampf |  |
| `enemy_death_hound.glb` | Death Hound | Normal | – | 235 | 1.1 m | Nahkampf |  |
| `enemy_dreadhound.glb` | Dreadhound | Selten | Ruined Downtown | 240 | 2.4 m | Nahkampf |  |
| `enemy_magic_golem.glb` | Magic Golem | Elite | Ruined Downtown | 257 | 1.5 m | Nahkampf |  |
| `enemy_mutated_rat.glb` | Mutated Rat | Normal | Ruined Downtown | 230 | 1.1 m | Nahkampf |  |
| `enemy_red_murloc.glb` | Red Murloc | Elite | Ruined Downtown | 247–250 | 1.5 m | Nahkampf | Red Murloc |
| `enemy_scrap_golem.glb` | Scrap Golem | Normal | Ruined Downtown | 255 | 1.1 m | Nahkampf |  |
| `enemy_steel_murloc.glb` | Steel Murloc | Normal | Ruined Downtown | 245 | 1.1 m | Nahkampf |  |
| `enemy_boss_a3_2.glb` | Magma Golem | Boss | Ruined Downtown | 260 | 3.2 m | Nahkampf |  |
| `enemy_ancient_bear.glb` | Ancient Bear | Elite | Hanok Village | 277 | 1.5 m | Nahkampf |  |
| `enemy_blightdru.glb` | Blightdru | Selten | Hanok Village | 280 | 2.4 m | Nahkampf |  |
| `enemy_bonesire.glb` | Bonesire | Selten | Hanok Village | 270 | 2.4 m | Nahkampf |  |
| `enemy_fanglord.glb` | Fanglord | Selten | Hanok Village | 290 | 2.4 m | Nahkampf |  |
| `enemy_forest_bear.glb` | Forest Bear | Normal | Hanok Village | 275 | 1.1 m | Nahkampf |  |
| `enemy_skeleton_archer.glb` | Skeleton Archer | Elite | Hanok Village | 267 | 1.5 m | Nahkampf |  |
| `enemy_skeleton_knight.glb` | Skeleton Knight | Normal | – | 265 | 1.1 m | Nahkampf |  |
| `enemy_treasure_mimic.glb` | Treasure Mimic | Elite | Hanok Village | 285 | 1.5 m | Nahkampf |  |
| `enemy_wolfhound.glb` | Wolfhound | Normal | – | 285 | 1.1 m | Nahkampf |  |
| `enemy_boss_a3_3.glb` | Skullwyrm | Boss | Hanok Village | 300 | 3.2 m | Nahkampf |  |
| `enemy_battle_crab.glb` | Battle Crab | Normal | Jeju Island | 305 | 1.1 m | Nahkampf |  |
| `enemy_bloodshade.glb` | Bloodshade | Selten | Jeju Island | 320 | 2.4 m | Nahkampf |  |
| `enemy_cave_walker.glb` | Cave Walker | Normal | Jeju Island | 325 | 1.1 m | Nahkampf |  |
| `enemy_cavecapt.glb` | Cavecapt | Elite | Jeju Island | 327 | 1.5 m | Nahkampf |  |
| `enemy_deepclaw.glb` | Deepclaw | Selten | Jeju Island | 310 | 2.4 m | Nahkampf |  |
| `enemy_dread_specter.glb` | Dread Specter | Elite | Jeju Island | 317 | 1.5 m | Nahkampf |  |
| `enemy_specter.glb` | Specter | Normal | Jeju Island | 315 | 1.1 m | Nahkampf |  |
| `enemy_boss_a3_4.glb` | Ant King | Boss | Jeju Island | 330 | 3.2 m | Nahkampf |  |
| `enemy_cursed_bear.glb` | Cursed Bear | Elite | Amusement Park | 347 | 1.5 m | Nahkampf |  |
| `enemy_giant_bat.glb` | Giant Bat | Elite | Amusement Park | 357 | 1.5 m | Nahkampf |  |
| `enemy_shadow_rogue.glb` | Shadow Rogue | Normal | Amusement Park | 335 | 1.1 m | Nahkampf |  |
| `enemy_twilight_gargoyle.glb` | Twilight Gargoyle | Normal | Amusement Park | 345 | 1.1 m | Nahkampf |  |
| `enemy_unicorn.glb` | Unicorn | Selten | Amusement Park | 340 | 2.4 m | Nahkampf |  |
| `enemy_vampire_bat.glb` | Vampire Bat | Normal | Amusement Park | 355 | 1.1 m | Nahkampf |  |
| `enemy_voidgoyle.glb` | Voidgoyle | Selten | Amusement Park | 350 | 2.4 m | Nahkampf |  |
| `enemy_boss_a3_5.glb` | Vampire Lord | Boss | Amusement Park | 360 | 3.2 m | Nahkampf |  |
| `enemy_death_walker.glb` | Death Walker | Normal | The Dome | 385–385 | 1.1 m | Nahkampf | Death Walker |
| `enemy_orclord.glb` | Orclord | Selten | The Dome | 370–370 | 2.4 m | Nahkampf | Orclord |
| `enemy_reapers.glb` | Reapers | Elite | The Dome | 387–387 | 1.5 m | Nahkampf | Reapers |
| `enemy_revenant.glb` | Revenant | Selten | The Dome | 380–380 | 2.4 m | Nahkampf | Revenant |
| `enemy_tauren_shaman.glb` | Tauren Shaman | Elite | The Dome | 367–367 | 1.5 m | Nahkampf | Tauren Shaman |
| `enemy_tauren_warrior.glb` | Tauren Warrior | Normal | The Dome | 365–365 | 1.1 m | Nahkampf | Tauren Warrior |
| `enemy_boss_a3_6.glb` | Abyss Lord | Boss | The Dome | 390 | 3.2 m | Nahkampf |  |
| `enemy_boss_a3_7.glb` | Voidlord | Boss | Dimensional Rift | 400 | 3.2 m | Nahkampf |  |

## Rohstoffe und Figuren der Siedlung

| Datei | Name | Hinweis |
|---|---|---|
| `node_tree.glb` | Baum (fällbar) | drei Fassungen: Wiese, Wüste, Schnee |
| `node_rock.glb` | Stein / Erz | zwei Fassungen: Wiese, Schnee |
| `npc_elder.glb` | Älteste | steht still, ca. 1,1 m |
| `npc_smith.glb` | Schmied | steht still, ca. 1,1 m |
| `npc_kain.glb` | Kain | steht still, ca. 1,1 m |
| `npc_taid.glb` | Taid | steht still, ca. 1,1 m |
| `npc_ryan.glb` | Ryan | steht still, ca. 1,1 m |
| `npc_dnew.glb` | Dnew | steht still, ca. 1,1 m |
| `npc_lina.glb` | Lina | steht still, ca. 1,1 m |
| `npc_hana.glb` | Hana | steht still, ca. 1,1 m |
| `npc_menivh.glb` | Menivh | steht still, ca. 1,1 m |
| `npc_chairman.glb` | Chairman | steht still, ca. 1,1 m |

## Helden (26)

Die vier Farben sind die heutigen Farben der Figur im Spiel (Körper, Kopf, Kopfschmuck-Art, Akzent) und nur ein Vorschlag.

| Datei | Name | Seltenheit | Waffenart | Körper | Kopf | Kopfschmuck | Akzent |
|---|---|---|---|---|---|---|---|
| `hero_h_01.glb` | Wanderer | normal | Schwert | #f5b21a | #ffd23f | scarf | #e5503f |
| `hero_h_02.glb` | Schildknappe | normal | Schwert | #9aa3b5 | #ffc94a | helm | #e5503f |
| `hero_h_03.glb` | Dornenläufer | normal | Dolch | #4f9a3c | #6fbf4a | cap | #7a4a2c |
| `hero_h_04.glb` | Hornwächter | normal | Stumpfe Waffe | #5b7fe0 | #6f8fe8 | horns | #f3ead8 |
| `hero_h_05.glb` | Hofmagierin | fine | Zauberstab | #b06ad0 | #ffd9a0 | crown | #ffd24a |
| `hero_h_06.glb` | Nachtschütze | fine | Armbrust | #2f2a3a | #ffc94a | none | #e9a23a |
| `hero_h_07.glb` | Barbar | fine | Schwert | #f5a524 | #ffc94a | knot | #3f8ee0 |
| `hero_h_08.glb` | Stierhüter | fine | Stumpfe Waffe | #f3f3f3 | #f3f3f3 | horns | #3b6fd0 |
| `hero_h_09.glb` | Schlackenriese | rare | Stumpfe Waffe | #3a2f2f | #2a2222 | none | #ff8a2a |
| `hero_h_10.glb` | Revolverheld | rare | Schusswaffe | #2a2a2a | #ffc94a | cap | #b3382b |
| `hero_h_11.glb` | Glutteufel | rare | Dolch | #c9372c | #e5503f | horns | #2a2222 |
| `hero_h_12.glb` | Liebesbote | epic | Armbrust | #f6ead0 | #ffd23f | halo | #ff7fb0 |
| `hero_h_13.glb` | Schattenkatze | epic | Dolch | #3a4a6a | #e8eef5 | ears | #e5503f |
| `hero_h_14.glb` | Korsarin | epic | Schusswaffe | #8a2f4a | #ffd9a0 | cap | #e5503f |
| `hero_h_15.glb` | Söldner | legendary | Schusswaffe | #3f5f8f | #ffc94a | helm | #2a2a2a |
| `hero_h_16.glb` | Flammenrufer | legendary | Zauberstab | #2f3f8f | #ffc94a | flame | #ff8a2a |
| `hero_h_17.glb` | Waldläuferin | ancient | Armbrust | #3f9a4a | #ffd9a0 | hood | #2f6b3f |
| `hero_h_18.glb` | Walküre | ancient | Stumpfe Waffe | #5a4a3a | #ffd9a0 | horns | #ffd24a |
| `hero_h_19.glb` | Sonnenpaladin | mythic | Schwert | #f6f6f6 | #ffd24a | halo | #ffb02e |
| `hero_h_20.glb` | Klingenmönch | mythic | Dolch | #f3ead8 | #ff8a2a | hood | #b3382b |
| `hero_h_21.glb` | Eisenkoloss | mythic | Schusswaffe | #d0392c | #e5503f | helm | #ffd24a |
| `hero_h_22.glb` | Sturmhexe | mythic | Zauberstab | #5a3f8f | #ffd9a0 | witch | #ff8a2a |
| `hero_h_freyja.glb` | Freyja | exotic | Zauberstab | #9fd9f5 | #e8f6ff | crown | #5aa9e6 |
| `hero_h_the_skull.glb` | The Skull | exotic | Stumpfe Waffe | #2a2222 | #f3ead8 | crown | #e5503f |
| `hero_h_hana.glb` | Hana | exotic | Schwert | #2a2233 | #ffd9a0 | hair | #b04bd0 |
| `hero_h_vlad.glb` | Vlad | exotic | Dolch | #3a2233 | #c9b8e0 | hair | #2a2222 |

## Waffen (84)

Reihe n = Hauptreihe, s = S-Reihe. Länge = Zielgröße des Modells; sie wächst leicht mit der Seltenheit.

| Datei | Name | Art | Reihe | Seltenheit | Länge | Fernwaffe | Fertigkeit |
|---|---|---|---|---|---|---|---|
| `w_dagger_n_0.glb` | Crude Dagger | Dolch | n | Normal | 0.50 m | nein | – |
| `w_dagger_n_1.glb` | Steel Dagger | Dolch | n | Fine | 0.53 m | nein | – |
| `w_dagger_n_2.glb` | Executioner Nail | Dolch | n | Rare | 0.55 m | nein | – |
| `w_dagger_n_3.glb` | Spinner | Dolch | n | Epic | 0.57 m | nein | Spinner |
| `w_dagger_n_4.glb` | Bloody Dagger | Dolch | n | Legendary | 0.60 m | nein | Stings |
| `w_dagger_n_5.glb` | Dragon Claw | Dolch | n | Ancient | 0.63 m | nein | Nail Drop |
| `w_dagger_n_6.glb` | Leviathan's Fang | Dolch | n | Mythic | 0.65 m | nein | Spinner |
| `w_dagger_n_7.glb` | Absolute Radiance | Dolch | n | Exotic | 0.68 m | nein | Spinner |
| `w_dagger_s_3.glb` | Killing Parts (Epic) | Dolch | s | Epic | 0.57 m | nein | – |
| `w_dagger_s_4.glb` | Killing Parts (Legendary) | Dolch | s | Legendary | 0.60 m | nein | – |
| `w_dagger_s_5.glb` | Killing Parts (Ancient) | Dolch | s | Ancient | 0.63 m | nein | – |
| `w_dagger_s_6.glb` | Killing Parts (Mythic) | Dolch | s | Mythic | 0.65 m | nein | – |
| `w_dagger_s_7.glb` | Killing Parts (Exotic) | Dolch | s | Exotic | 0.68 m | nein | – |
| `w_dagger_s_8.glb` | Killing Parts (Eternal) | Dolch | s | undefined | 0.70 m | nein | – |
| `w_sword_n_0.glb` | Novice Sword | Schwert | n | Normal | 0.90 m | nein | – |
| `w_sword_n_1.glb` | Combat Sword | Schwert | n | Fine | 0.95 m | nein | – |
| `w_sword_n_2.glb` | Tentacle of the Abyss | Schwert | n | Rare | 0.99 m | nein | – |
| `w_sword_n_3.glb` | Corn Sword | Schwert | n | Epic | 1.03 m | nein | Sword Drop |
| `w_sword_n_4.glb` | Frost Blade | Schwert | n | Legendary | 1.08 m | nein | Round Bash |
| `w_sword_n_5.glb` | Sun Sword | Schwert | n | Ancient | 1.13 m | nein | Sword Drop |
| `w_sword_n_6.glb` | Abyss Predator | Schwert | n | Mythic | 1.17 m | nein | Tentacle |
| `w_sword_n_7.glb` | Divine Arbiter | Schwert | n | Exotic | 1.22 m | nein | Sword Drop |
| `w_sword_s_3.glb` | Grand Finale (Epic) | Schwert | s | Epic | 1.03 m | nein | – |
| `w_sword_s_4.glb` | Grand Finale (Legendary) | Schwert | s | Legendary | 1.08 m | nein | – |
| `w_sword_s_5.glb` | Grand Finale (Ancient) | Schwert | s | Ancient | 1.13 m | nein | – |
| `w_sword_s_6.glb` | Grand Finale (Mythic) | Schwert | s | Mythic | 1.17 m | nein | – |
| `w_sword_s_7.glb` | Grand Finale (Exotic) | Schwert | s | Exotic | 1.22 m | nein | – |
| `w_sword_s_8.glb` | Grand Finale (Eternal) | Schwert | s | undefined | 1.26 m | nein | – |
| `w_blunt_n_0.glb` | Broken Mace | Stumpfe Waffe | n | Normal | 0.90 m | nein | – |
| `w_blunt_n_1.glb` | Sledgehammer | Stumpfe Waffe | n | Fine | 0.95 m | nein | – |
| `w_blunt_n_2.glb` | Giant Club | Stumpfe Waffe | n | Rare | 0.99 m | nein | – |
| `w_blunt_n_3.glb` | Desert Spine | Stumpfe Waffe | n | Epic | 1.03 m | nein | Cactus Tremble |
| `w_blunt_n_4.glb` | Tyrant Mace | Stumpfe Waffe | n | Legendary | 1.08 m | nein | Logrolling |
| `w_blunt_n_5.glb` | Doom Spike | Stumpfe Waffe | n | Ancient | 1.13 m | nein | Triple Ground Expl |
| `w_blunt_n_6.glb` | Dead Crusher | Stumpfe Waffe | n | Mythic | 1.17 m | nein | Cactus Tremble |
| `w_blunt_n_7.glb` | Immortal Sun | Stumpfe Waffe | n | Exotic | 1.22 m | nein | Logrolling |
| `w_blunt_s_3.glb` | Title Track (Epic) | Stumpfe Waffe | s | Epic | 1.03 m | nein | – |
| `w_blunt_s_4.glb` | Title Track (Legendary) | Stumpfe Waffe | s | Legendary | 1.08 m | nein | – |
| `w_blunt_s_5.glb` | Title Track (Ancient) | Stumpfe Waffe | s | Ancient | 1.13 m | nein | – |
| `w_blunt_s_6.glb` | Title Track (Mythic) | Stumpfe Waffe | s | Mythic | 1.17 m | nein | – |
| `w_blunt_s_7.glb` | Title Track (Exotic) | Stumpfe Waffe | s | Exotic | 1.22 m | nein | – |
| `w_blunt_s_8.glb` | Title Track (Eternal) | Stumpfe Waffe | s | undefined | 1.26 m | nein | – |
| `w_crossbow_n_0.glb` | Wooden CrossBow | Armbrust | n | Normal | 0.70 m | ja | – |
| `w_crossbow_n_1.glb` | Heavy Crossbow | Armbrust | n | Fine | 0.73 m | ja | – |
| `w_crossbow_n_2.glb` | Forest Breath | Armbrust | n | Rare | 0.77 m | ja | – |
| `w_crossbow_n_3.glb` | Nocturne | Armbrust | n | Epic | 0.80 m | ja | Bat Fire |
| `w_crossbow_n_4.glb` | Nightmare Eye | Armbrust | n | Legendary | 0.84 m | ja | Skull Fire |
| `w_crossbow_n_5.glb` | Crystal Bolt | Armbrust | n | Ancient | 0.88 m | ja | Piercing Arrow |
| `w_crossbow_n_6.glb` | Infernal Bolt | Armbrust | n | Mythic | 0.91 m | ja | Skull Fire |
| `w_crossbow_n_7.glb` | Ascension | Armbrust | n | Exotic | 0.94 m | ja | Bat Fire |
| `w_crossbow_s_3.glb` | Overdrive (Epic) | Armbrust | s | Epic | 0.80 m | ja | – |
| `w_crossbow_s_4.glb` | Overdrive (Legendary) | Armbrust | s | Legendary | 0.84 m | ja | – |
| `w_crossbow_s_5.glb` | Overdrive (Ancient) | Armbrust | s | Ancient | 0.88 m | ja | – |
| `w_crossbow_s_6.glb` | Overdrive (Mythic) | Armbrust | s | Mythic | 0.91 m | ja | – |
| `w_crossbow_s_7.glb` | Overdrive (Exotic) | Armbrust | s | Exotic | 0.94 m | ja | – |
| `w_crossbow_s_8.glb` | Overdrive (Eternal) | Armbrust | s | undefined | 0.98 m | ja | – |
| `w_gun_n_0.glb` | Old Pistol | Schusswaffe | n | Normal | 0.60 m | ja | – |
| `w_gun_n_1.glb` | Hunting Rifle | Schusswaffe | n | Fine | 0.63 m | ja | – |
| `w_gun_n_2.glb` | Frost Pistol | Schusswaffe | n | Rare | 0.66 m | ja | – |
| `w_gun_n_3.glb` | Sun Pistol EX | Schusswaffe | n | Epic | 0.69 m | ja | Magma Fire |
| `w_gun_n_4.glb` | Dragon Roar | Schusswaffe | n | Legendary | 0.72 m | ja | Dragon Breath |
| `w_gun_n_5.glb` | Relic Beam | Schusswaffe | n | Ancient | 0.75 m | ja | Shot Gun |
| `w_gun_n_6.glb` | Fire Dragon Cannon | Schusswaffe | n | Mythic | 0.78 m | ja | Dragon Breath |
| `w_gun_n_7.glb` | Celestial Judgment | Schusswaffe | n | Exotic | 0.81 m | ja | Magma Fire |
| `w_gun_s_3.glb` | Pulse Nova (Epic) | Schusswaffe | s | Epic | 0.69 m | ja | – |
| `w_gun_s_4.glb` | Pulse Nova (Legendary) | Schusswaffe | s | Legendary | 0.72 m | ja | – |
| `w_gun_s_5.glb` | Pulse Nova (Ancient) | Schusswaffe | s | Ancient | 0.75 m | ja | – |
| `w_gun_s_6.glb` | Pulse Nova (Mythic) | Schusswaffe | s | Mythic | 0.78 m | ja | – |
| `w_gun_s_7.glb` | Pulse Nova (Exotic) | Schusswaffe | s | Exotic | 0.81 m | ja | – |
| `w_gun_s_8.glb` | Pulse Nova (Eternal) | Schusswaffe | s | undefined | 0.84 m | ja | – |
| `w_staff_n_0.glb` | Training Cube | Zauberstab | n | Normal | 1.10 m | ja | – |
| `w_staff_n_1.glb` | Mana Wand | Zauberstab | n | Fine | 1.16 m | ja | – |
| `w_staff_n_2.glb` | Lunaris Staff | Zauberstab | n | Rare | 1.21 m | ja | – |
| `w_staff_n_3.glb` | Glacia Horn | Zauberstab | n | Epic | 1.26 m | ja | Icy Road |
| `w_staff_n_4.glb` | Arcane Eye | Zauberstab | n | Legendary | 1.32 m | ja | Electric Field |
| `w_staff_n_5.glb` | Eclipse Rod | Zauberstab | n | Ancient | 1.38 m | ja | Electric Field |
| `w_staff_n_6.glb` | Savior's Staff | Zauberstab | n | Mythic | 1.43 m | ja | Big Fire Ball |
| `w_staff_n_7.glb` | Crimson Scepter | Zauberstab | n | Exotic | 1.49 m | ja | Electric Field |
| `w_staff_s_3.glb` | Valkyrie Commander (Epic) | Zauberstab | s | Epic | 1.26 m | ja | – |
| `w_staff_s_4.glb` | Valkyrie Commander (Legendary) | Zauberstab | s | Legendary | 1.32 m | ja | – |
| `w_staff_s_5.glb` | Valkyrie Commander (Ancient) | Zauberstab | s | Ancient | 1.38 m | ja | – |
| `w_staff_s_6.glb` | Valkyrie Commander (Mythic) | Zauberstab | s | Mythic | 1.43 m | ja | – |
| `w_staff_s_7.glb` | Valkyrie Commander (Exotic) | Zauberstab | s | Exotic | 1.49 m | ja | – |
| `w_staff_s_8.glb` | Valkyrie Commander (Eternal) | Zauberstab | s | undefined | 1.54 m | ja | – |
