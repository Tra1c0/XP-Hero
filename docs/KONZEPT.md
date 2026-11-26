# Konzept (kurz)

**Ziel:** Ein Spiel mit der Systemtiefe der Analyse, das vollständig offline läuft, dessen Zahlen alle in Daten liegen
und über ein eigenes Admin-Panel pflegbar sind.

**Gegenteil des Wunsches (zu vermeiden):** Menüs, die nichts buchen; erfundene „Originalwerte“; Zahlen im Code;
Serverzwang; versteckte Gratis-Geschenke als Ersatz für Bezahlinhalte.

## Entscheidungen

- **Plattform:** Web (Canvas, Hochformat, ES-Module ohne Build). Grund: leeres Repo, keine Abhängigkeiten, läuft auf
  Handy und Desktop, Kern ist identisch auf Client und Server nutzbar. 2D-Draufsicht ist Platzhalter für die 3D-Ansicht.
- **Ein Kern, überall:** Simulation und Regeln sind reines JS ohne DOM. Der Server validiert Content mit demselben
  Validator und rechnet Online-Duelle mit derselben Kampfsimulation.
- **Offline zuerst:** Der Spielstand ist lokal maßgeblich. Das Backend speichert ihn mit Revision; bei Konflikt
  entscheidet der Spieler, es wird nie addiert.
- **Werbe-Rewards:** Zwangswerbung entfällt. Freiwillige Werbe-Belohnungen sind direkte Claims mit den dokumentierten
  Tagesobergrenzen (`config.caps`).
- **Bezahlinhalte:** Stage-/Chapter-Packs und Royal-Perks sind gegen erspielte Währung kaufbar (eigene Preise).
  Der Paid-Track des Chapter Pass wird nicht ausgezahlt.
- **Komfort (eigene Zusätze, abschaltbar):** Basis-Menüs von überall (`remoteBaseAccess`), automatische Abgabe beim
  Betreten der Basis, Auto-Hunt kehrt bei vollem Cargo heim und läuft zurück, NPC-Texte blockieren nicht.

## Nicht umgesetzt

- Kollisionshindernisse und Navigationsflächen: Karten sind offene Rechtecke. Auto-Hunt hat Stuck-Erkennung, aber
  nichts zum Umlaufen.
- Audio, Haptik, Controller, Farbblind-Modus: Einstellungen sind gespeichert, Audio/Haptik gibt es noch nicht
  (keine Assets); der Farbblind-Schalter ändert derzeit nichts Sichtbares.
- Lokalisierung: Mechanismus vorhanden (`t()` mit Übersetzungstabelle), nur Deutsch gepflegt; Content-Namen sind nicht
  übersetzbar.
- Mehrere Kostenoptionen mischen (z. B. 3 Schlüssel + Gems für einen 10er-Pull): nicht möglich, eine Option deckt den
  ganzen Kauf.
- Serverseitige Prüfung des Spielstands: Der Server prüft Prüfsumme und Profilzugehörigkeit, nicht die Plausibilität
  des Inhalts. Ranglisten sind deshalb nur so vertrauenswürdig wie beschrieben: Tower über Server-Session mit
  Etagenfolge und Dauerprüfung; Invasion wird serverseitig gerechnet, die hochgeladenen Kampfwerte sind aber nur auf
  Wertebereiche geprüft.
- Geräteverknüpfung: Ein Profil ist an das Token eines Geräts gebunden; verlorenes Token = keine Wiederverknüpfung.
- Balancing über das Tutorial hinaus ist nicht durchgespielt. Kapitel 1.2–3.7 sind erreichbar und datenseitig
  vollständig, aber nur Gebiet 1.1 wurde automatisiert bis zum Boss gespielt.
- Messungen auf echten Geräten (FPS, Temperatur, Akku) fehlen; gemessen wurde nur die Simulation unter Node.
