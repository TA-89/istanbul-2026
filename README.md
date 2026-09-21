# Istanbulreise 03.10-07.10.2026

Mobile, statische Webapp für den 3.–7. Oktober 2026. Alle auszuliefernden Dateien liegen in `dist/`. Kein Build, kein API-Schlüssel und kein Backend nötig.

Webapp: **https://ta-89.github.io/istanbul-2026/**

Für Smartphones optimiert: feste Navigation am unteren Bildschirmrand, beim Scrollen sichtbare Tagesauswahl, mindestens 44 px hohe Aktionsflächen und kompakte Karten. Auf sehr schmalen Geräten lässt sich die Tagesauswahl seitlich wischen.

## GPS, Fotos und Flugabgleich

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
- `dist/sw.js`: Offline-Cache. Bei Inhaltsänderungen die Versionsnummer in `CACHE` erhöhen.

## Noch vor der Reise klären

- Kaffee am 04.10. um 16:00: Anbieter nennt 15 und 90 Minuten. Yacht-Treffpunkt bereits 16:45. Vorziehen auf 14:00 empfohlen, **nicht umgebucht**.
- Ebru am 04.10. um 13:00 vorgeschlagen, **nicht reserviert**.
- Dinnerfahrt am 06.10. reserviert; finale Bestätigung und Hotelabholzeit fehlen.
- Rücktransfer am 07.10. noch nicht bestätigt. 06:35 ist lediglich der Planungswert.

Führungs- und Wegzeiten im Programm sind recherchierte Planungsvorschläge. Öffnungen, Verfügbarkeit und Treffpunkte vor Reiseantritt erneut prüfen. Keine Live-Synchronisation mit E-Pass.

## Offline & Lizenzen

Programm, eigenes Foto und Details sind nach dem ersten vollständigen Laden offline verfügbar. Der zuletzt geladene Flugstand ist offline sichtbar und trägt seinen Abrufzeitpunkt. E-Pass-Fotos, Kartenbasis, neue Flugstände und externe Links benötigen Internet. Es werden keine OpenStreetMap-Kacheln für Offline-Nutzung vorab heruntergeladen.

## Prüfungen

`node tests/location.cjs`, `node tests/flights-ui.cjs` und `python -m unittest discover -s tests -p 'test_*.py'` prüfen Ortungszustände, verspätete GPS-Rückmeldungen, exakte Flugzuordnung, Quellenpriorität, Zeitzonen und veraltete Flugstände. Zusätzlich wurden Layout und Bedienung bei 320/390 px im Browser kontrolliert. Die tatsächliche GPS-Genauigkeit hängt vom Handy und Empfang ab.

Panoramafoto: Juraj Patekar, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wv_Istanbul_banner.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), im Layout zugeschnitten. Leaflet 1.9.4: BSD-2-Clause; siehe `dist/vendor/LEAFLET-LICENSE.txt`. Karten: © OpenStreetMap-Mitwirkende.
