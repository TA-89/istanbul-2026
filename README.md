# Istanbulreise 03.10-07.10.2026

Mobile Webapp für den 3.–7. Oktober 2026. Alle auszuliefernden Dateien liegen in `dist/`; die Hauptseite läuft statisch auf GitHub Pages. Gemeinsame Favoriten nutzen einen separaten Supabase-Speicher mit einem öffentlichen Verbindungsschlüssel.

Webapp: **https://ta-89.github.io/istanbul-2026/**

Für Smartphones optimiert: feste Navigation am unteren Bildschirmrand, beim Scrollen sichtbare Tagesauswahl, mindestens 44 px hohe Aktionsflächen und kompakte Karten. Auf sehr schmalen Geräten lässt sich die Tagesauswahl seitlich wischen.

## GPS, Fotos und Flugabgleich

- **Favoriten:** Unter „Entdecken“ lassen sich ungebuchte Orte ankreuzen; auf der Karte gibt es den Filter „Favoriten“. Die neun vom Nutzer genannten Startfavoriten sind vorausgewählt. Bereits reservierte Erlebnisse erhalten kein Favoriten-Häkchen.
- **Programmabgleich:** „Tagesplan anpassen“ unter „Entdecken“ zeigt zuerst eine Vorschau mit ersetzten Punkten und bewusst ungeplanten Alternativen. Erst „Programm übernehmen“ ändert den Plan. „Vorheriger Plan“ stellt den vorherigen Stand wieder her; die Favoriten bleiben angekreuzt. Bis zu zehn Stände sind verfügbar. Bei der Startauswahl passen acht Favoriten hinein; die zusätzliche Sunset-Fahrt bleibt eine Alternative.
- **Speicherung:** Die bestehende Verbindung wird weiterverwendet. Die Oberfläche nennt die Merkliste schlicht „Favoriten“. Auf der Startseite gibt es keinen Abgleich-Block mehr; die Programmvorschau und „Vorheriger Plan“ sind unter „Entdecken“ erreichbar. Ein neuer Browser benötigt vorläufig noch den bisherigen Reisecode.
- **Vollbildkarte:** „Vollbild“ in der Tageskarte oder im Kartenreiter öffnet eine bildschirmfüllende Karte mit direkt erreichbaren Filtern, GPS und Schliessen-Taste. Escape bzw. Browser-Zurück schliesst sie. Das funktioniert auch ohne die native Fullscreen-API auf dem iPhone.
- **App-Symbol:** Rote Flagge mit weissem Halbmond und Stern als SVG, iOS-Touch-Icon und Android-/Maskable-PNG. Neue Bildadressen umgehen den alten Icon-Cache; bereits installierte Betriebssystem-Verknüpfungen können eine erneute Installation benötigen.


Der gemeinsame Speicher ist im Projekt `istanbul-reise` eingerichtet. Die echte API und zwei Browser-Sitzungen mit voneinander getrenntem lokalen Speicher wurden getestet. Ein täglicher Verbindungstest vom 21.09. bis 08.10.2026 prüft die Erreichbarkeit, ohne Favoriten oder Zugangsdaten zu lesen; danach stellt das Skript seine Netzabfragen ein. Supabase-Free-Projekte können bei längerer Inaktivität pausieren; die Webseite zeigt Verbindungsfehler und den zuletzt geladenen Stand ausdrücklich an.

- **GPS:** „Mein Standort“ zeigt den Gerätestandort mit Genauigkeitskreis und aktualisiert ihn über `watchPosition`. Browser-Freigabe erforderlich. Verschieben der Karte beendet nur das automatische Zentrieren. „Aus“ entfernt den Punkt und beendet die Abfrage. Im Hintergrund pausiert die Ortung. Keine Speicherung oder Übertragung der Koordinaten durch die App; die beim Zentrieren sichtbaren Kartenkacheln werden von OpenStreetMap geladen. Entfernungen sind Luftlinie.
- **Fotos:** Alle 95 E-Pass-Attraktionen enthalten ein Originalbild von der jeweiligen E-Pass-Seite mit Quellenlink. Bilder werden direkt vom Anbieter und erst bei Bedarf geladen. Euer bereitgestelltes gemeinsames Foto liegt lokal in `dist/assets/wir-zwei.jpeg`.
- **Tipps:** „Tipps“ bezeichnet recherchierte Vorschläge für diese Reise, keine eigenen Reiseerfahrungen. „Mit Vergünstigung“ filtert kostenpflichtige E-Pass-Rabatte.
- **Flüge:** `scripts/update_flights.py` gleicht ausschließlich TK1208 am 03.10.2026, ZRH–IST, und TK1207 am 07.10.2026, IST–ZRH, ab. Die öffentliche Zürcher Flugtafel hat für Zürich Vorrang. FlightStats (Cirium) ergänzt beide Flughäfen, sobald der konkrete Flugtag veröffentlicht ist. Flugnummer, Datum, Richtung und Flughäfen müssen übereinstimmen. Fehlende Werte bleiben Buchungsstand; alte Daten behalten ihren ursprünglichen Abrufzeitpunkt und werden als veraltet markiert. Keine Berechnung fehlender Flugzeiten aus einer angenommenen Dauer.
- **Automatik:** Bei jeder Veröffentlichung und vom 28.09. bis 08.10.2026 ungefähr alle 30 Minuten. GitHub Actions kann verzögert starten. Die Webapp lädt den veröffentlichten Stand beim Öffnen, beim Zurückkehren und alle fünf Minuten; „Stand aktualisieren“ lädt ihn sofort erneut. Dies ist keine garantierte Echtzeit-Flugauskunft. Gates und Status am Flughafen und bei der Airline bestätigen. Die Zeitprüfung verhindert automatische Neuveröffentlichungen nach dem Reisezeitraum und in Folgejahren.

`flights.json` wird beim Deployment frisch erzeugt; der veröffentlichte Abrufzeitpunkt kann deshalb neuer als die Datei im Git-Repository sein. Ein Ausfall einer Quelle stoppt die andere nicht. Keine API-Schlüssel im Browser. Die Reservierungen beim E-Pass werden nicht automatisch verändert.

## Lokal öffnen

Im Ordner `dist` einen lokalen HTTP-Server starten, z. B. `python -m http.server 4173`, und `http://localhost:4173` öffnen. Direktes Öffnen von `index.html` zeigt die Seite ebenfalls, aktiviert aber keinen Service Worker.

## Auf GitHub Pages veröffentlichen

1. Ein Repository erstellen und den Inhalt dieses Ordners einschliesslich `.github/` hochladen. **Nicht den übergeordneten Reiseordner hochladen.**
2. Unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ wählen.
3. Der Workflow veröffentlicht `dist/` nach einem Push auf `main` oder per manuellem Start.
4. Die von GitHub angezeigte HTTPS-Adresse auf dem Handy öffnen und zum Home-Bildschirm hinzufügen.

Alle lokalen App- und Asset-URLs sind relativ; die App funktioniert auch unter einem GitHub-Projektpfad. Die öffentliche Pages-Seite zeigt Reisetermine, Hotel und das bereitgestellte Foto. Originaldokumente, Pass-/Buchungsnummern, QR-Codes, Geburtsdaten und private Kontaktangaben sind nicht enthalten.

## Inhalt pflegen

- `dist/data.js`: Reiseprogramm, Buchungen, offene Punkte und kuratierte Ortsdetails.
- `dist/catalog.js`: 95 E-Pass-Stadtangebote aus dem öffentlichen Katalog, Stand 21.09.2026. Drei Angebote ohne eindeutige Koordinaten sind über Anbieterlinks erreichbar. Tages-/Mehrtagestouren, Inseltransfers und reine Zusatzservices sind ausgelassen.
- `dist/app.js` / `dist/style.css`: Darstellung und Interaktion.
- `dist/modern.css`: Bildkarten, Flugkarten und aktueller mobiler Feinschliff.
- `dist/photos.js`: Bildquellen aller E-Pass-Attraktionen.
- `dist/location.js`: GPS-Anzeige; `dist/flights.js`: Flugdarstellung.
- `dist/planner.js`: recherchierte Alternativen und Schutz bestehender Favoriten/Buchungen.
- `dist/shared-state.js`: gemeinsame Daten, Einzeländerungen, Konfliktprüfung und Offline-Warteschlange.
- `dist/favorites.js` / `dist/favorites.css`: Favoriten, Programmvorschau und Zurück-Funktion.
- `dist/sync-config.js`: ausschliesslich öffentliche Verbindungsdaten; niemals Reisecode oder erhöhte API-Schlüssel.
- `dist/sw.js`: Offline-Cache. Bei Inhaltsänderungen die Versionsnummer in `CACHE` erhöhen.

## Noch vor der Reise klären

- Kaffee am 04.10. um 16:00 bleibt gebucht. Am 23.09. erneut geprüft: E-Pass-Dauerabschnitt ca. 15 Min., FAQ weiterhin 90 Min.; Mail nennt keine Dauer. Der Fussweg zum bestätigten Yacht-Treffpunkt beträgt laut Google Maps 22–25 Min. (1,6–1,8 km). Bei Ende 16:15 und 25–30 Min. Wegreserve ist Ankunft 16:40–16:45 machbar. Keine pauschale Umbuchungsempfehlung mehr: kurze Dauer bestätigen lassen, nur bei längerem Workshop z. B. 14:00 anfragen. Anbieter: reservation@highlightsinturkiye.com; E-Pass: istanbul@istanbulepass.com.
- Ebru am 04.10. um 13:00 vorgeschlagen, **nicht reserviert**.
- Dinnerfahrt am 06.10. **final bestätigt** mit Mail vom 23.09.2026: um 19:15 in der Hotellobby bereit sein, Abholung zwischen 19:15 und 19:45. Fahrer fragt an der Rezeption nach dem Namen. Rücktransfer zum Hotel bestätigt. Die neue Mail nennt selbst kein Reisedatum; Zuordnung über die identische Reservierung zur bisherigen Mail für den 06.10. Die Schiffsabfahrt bleibt ohne erfundene genaue Uhrzeit.
- Rücktransfer am 07.10. noch nicht bestätigt. 06:35 ist lediglich der Planungswert.

Führungs- und Wegzeiten im Programm sind recherchierte Planungsvorschläge. Öffnungen, Verfügbarkeit und Treffpunkte vor Reiseantritt erneut prüfen. Keine Live-Synchronisation mit E-Pass.

## Offline & Lizenzen

Programm, eigenes Foto und Details sind nach dem ersten vollständigen Laden offline verfügbar. Der zuletzt geladene Flugstand ist offline sichtbar und trägt seinen Abrufzeitpunkt. E-Pass-Fotos, Kartenbasis, neue Flugstände und externe Links benötigen Internet. Es werden keine OpenStreetMap-Kacheln für Offline-Nutzung vorab heruntergeladen.

## Prüfungen

`node tests/location.cjs`, `node tests/flights-ui.cjs` und `python -m unittest discover -s tests -p 'test_*.py'` prüfen Ortungszustände, verspätete GPS-Rückmeldungen, exakte Flugzuordnung, Quellenpriorität, Zeitzonen und veraltete Flugstände. `node tests/planner.cjs` kontrolliert Favoritenzuordnung, den unveränderten Buchungsbestand und Planungsgrenzen. `node tests/shared-state.cjs` simuliert zwei getrennte Geräte am selben Dienst, konkurrierende Änderungen, Offline-Warteschlange, Anmeldung und Rückgängig-Funktion. Der simulierte Dienst ersetzt keinen Test der echten Supabase-API. Zusätzlich werden Layout und Bedienung bei 320/390 px im Browser kontrolliert. Die tatsächliche GPS-Genauigkeit hängt vom Handy und Empfang ab.

Panoramafoto: Juraj Patekar, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wv_Istanbul_banner.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), im Layout zugeschnitten. Leaflet 1.9.4: BSD-2-Clause; siehe `dist/vendor/LEAFLET-LICENSE.txt`. Karten: © OpenStreetMap-Mitwirkende.
