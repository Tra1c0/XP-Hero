# XP Hero – eigenständige Umsetzung

Mobiles Action-Idle-RPG nach der Systemanalyse (Referenzstand 27.2.0), als eigener Code mit Platzhalter-Grafik.
Keine Werbung, keine Echtgeldkäufe, kein Tracking, keine fremden Server. Keine externen Abhängigkeiten.

## Starten

```
npm start          # Spiel: http://localhost:8787/   Admin: http://localhost:8787/admin/
npm test           # 20 Tests (Kern, Tutorial-Durchlauf, Backend)
npm run parity     # docs/PARITAETSREGISTER.md neu erzeugen
npm run backup     # Datenbank-Backup nach data/
```

Benötigt Node ≥ 22.13. Beim ersten Start legt der Server das Konto `admin` an; das Passwort kommt aus `ADMIN_PASSWORD`
oder wird einmalig generiert und in der Konsole angezeigt. Weitere Variablen: `PORT`, `DB_PATH`, `CORS_ORIGIN`.

Das Spiel läuft auch ganz ohne Backend: Ordner `src/` mit einem beliebigen statischen Webserver ausliefern und
`client/index.html` öffnen. Spielstand liegt dann nur lokal (Export/Import unter „Mehr“).

## Aufbau

| Schicht | Ort | Inhalt |
|---|---|---|
| Content | `src/core/content/base.js` | Alle Tabellen und Konfigwerte mit Herkunftsstatus D/B/R/E/? |
| Validierung | `src/core/content/validate.js` | Schema, Referenzen, Kosten, Questgraph, Fingerprint |
| Domain | `src/core/econ.js` `progress.js` `gear.js` `home.js` `meta.js` `modes.js` | Wallet/Ledger, XP, Upgrades, Waffen, Gacha, Helden, Traits, Runen, Basis, Truhen, Shop, Quests, Modi |
| Simulation | `src/core/sim.js` | Fester Tick (30 Hz), Gegner-Zustandsmaschine, Kampf, Drops, Auto-Hunt |
| Fassade | `src/core/game.js` | Transaktionale Befehle, Weltwechsel, Persistenz |
| Persistenz | `src/core/state.js` | Prüfsumme, zwei Slots, Migration, Recovery |
| Client | `src/client/` | Canvas-Renderer, Menüs, Eingabe, optionale Netzanbindung (alles Platzhalter-Design) |
| Backend | `server/server.js` | Content-Versionen, Profile, Sync, Codes, Grants, Ranglisten, Admin-API |
| Admin | `admin/` | Content/Balancing-Editor, Events, Codes, Profile/Grants, Audit, Konten, Backup |

Design tauschen: nur `src/client/render.js` und `style.css`. Balancing ändern: Admin-Panel oder `base.js`; der Gameplay-Code enthält keine Zahlen.

## Systemstatus

„implementiert“ heißt: echte Logik mit Kosten, Zuständen, Persistenz und Test. „Werte eigen“ heißt: Mechanik läuft,
die Zahlen sind mangels Originaldaten eigene, gekennzeichnete Werte (siehe `docs/PARITAETSREGISTER.md`).

| System | Status | Test |
|---|---|---|
| Bewegung, Auto-Angriff, Haupt-/Nebenwaffen, Skills, Statuseffekte, Krit, Lifesteal | implementiert, Werte eigen | T19, Tutorial |
| Gegner-KI (Spawn/Idle/Patrol/Aggro/Chase/Attack/Return/Tod/Respawn), Bosse | implementiert, Muster eigen | Tutorial |
| 20 Gebiete, 19 Gates, Spawn-Gruppen 82/71/58, Respawn per Zeitstempel | implementiert; Karten/Koordinaten eigen | Content, Tutorial |
| Account-XP, Level 1–400, Level-Up-Belohnungen (x5 ohne Werbung) | implementiert; XP-Kurve eigen | T04 |
| Wallet, Ledger, Idempotenz, Rollback | implementiert | T05, T17 |
| Ability/Special/Extra/Soul/Blessing | implementiert; Power-Stützzeilen belegt | T12 |
| Waffen (84), Schmiede (8 Stufen), Merge, Slots | implementiert; Stats eigen, Transzendenz offen | T09 |
| Gacha (12 Boxen), Pity, Meilensteine | implementiert; 14 Boxen unbekannt | T08 |
| Helden, Level, Sterne, Mastery, Sammlung | implementiert; Heldenliste eigen | T10 |
| Traits, Sperren, Synergien, Presets | implementiert; Werte eigen | T11 |
| Runen (115), Loadouts, Upgrade, Zerlegen | implementiert; Effekte eigen | T11 |
| Basis (7 Gebäude), Cargo, Key House, Feld-/Gift-/Gebietstruhen | implementiert; 19 Gebäude unbekannt | T07 |
| Shop, Händlerrotation, Stage-/Chapter-Packs, Perks | implementiert; Preise eigen | T06 |
| Quests (87), Unlock-Kopplungen laut Analyse | implementiert; Original ca. 850 Einträge nicht erfasst | Tutorial |
| Tower (250), Raid, Tomb, PvP, Invasion | implementiert; Algorithmen/Rewards eigen | T13, T14 |
| Missionen, 7-Tage-Event, Login, Pässe, Carnival, Live-Events, Spin, Codes | implementiert | T15 |
| Backend, Sync, Admin, Rollen, Audit, Content-Rollback | implementiert | Backend-Tests |

Bekannte Lücken stehen ungeschönt in `docs/KONZEPT.md` (Abschnitt „Nicht umgesetzt“).
