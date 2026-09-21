# Istanbul · Unsere Reise

Mobile, statische Webapp für den 3.–7. Oktober 2026. Alle auszuliefernden Dateien liegen in `dist/`. Kein Build, kein API-Schlüssel und kein Backend nötig.

Webapp: **https://ta-89.github.io/istanbul-2026/**

Für Smartphones optimiert: feste Navigation am unteren Bildschirmrand, beim Scrollen sichtbare Tagesauswahl, mindestens 44 px hohe Aktionsflächen und kompakte Karten. Auf sehr schmalen Geräten lässt sich die Tagesauswahl seitlich wischen.

## Lokal öffnen

Im Ordner `dist` einen lokalen HTTP-Server starten, z. B. `python -m http.server 4173`, und `http://localhost:4173` öffnen. Direktes Öffnen von `index.html` zeigt die Seite ebenfalls, aktiviert aber keinen Service Worker.

## Auf GitHub Pages veröffentlichen

1. Ein Repository erstellen und den Inhalt dieses Ordners einschliesslich `.github/` hochladen. **Nicht den übergeordneten Reiseordner hochladen.**
2. Unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ wählen.
3. Der Workflow veröffentlicht `dist/` nach einem Push auf `main` oder per manuellem Start.
4. Die von GitHub angezeigte HTTPS-Adresse auf dem Handy öffnen und zum Home-Bildschirm hinzufügen.

Alle App- und Asset-URLs sind relativ; die App funktioniert auch unter einem GitHub-Projektpfad. Die öffentliche Pages-Seite macht die darin enthaltenen Reisetermine und das Hotel öffentlich sichtbar. Die Originaldokumente, Pass-/Buchungsnummern, QR-Codes und persönlichen Identifikationsdaten sind nicht enthalten.

## Inhalt pflegen

- `dist/data.js`: Reiseprogramm, Buchungen, offene Punkte und kuratierte Ortsdetails.
- `dist/catalog.js`: 95 E-Pass-Stadtangebote aus dem öffentlichen Katalog, Stand 21.09.2026. Drei Angebote ohne eindeutige Koordinaten sind über Anbieterlinks erreichbar. Tages-/Mehrtagestouren, Inseltransfers und reine Zusatzservices sind ausgelassen.
- `dist/app.js` / `dist/style.css`: Darstellung und Interaktion.
- `dist/sw.js`: Offline-Cache. Bei Inhaltsänderungen die Versionsnummer in `CACHE` erhöhen.

## Noch vor der Reise klären

- Kaffee am 04.10. um 16:00: Anbieter nennt 15 und 90 Minuten. Yacht-Treffpunkt bereits 16:45. Vorziehen auf 14:00 empfohlen, **nicht umgebucht**.
- Ebru am 04.10. um 13:00 vorgeschlagen, **nicht reserviert**.
- Dinnerfahrt am 06.10. reserviert; finale Bestätigung und Hotelabholzeit fehlen.
- Rücktransfer am 07.10. noch nicht bestätigt. 06:35 ist lediglich der Planungswert.

Führungs- und Wegzeiten im Programm sind recherchierte Planungsvorschläge. Öffnungen, Verfügbarkeit und Treffpunkte vor Reiseantritt erneut prüfen. Keine Live-Synchronisation mit E-Pass.

## Offline & Lizenzen

Programm und Details sind nach dem ersten vollständigen Laden offline verfügbar. Die Kartenbasis und externe Links benötigen Internet. Es werden keine OpenStreetMap-Kacheln für Offline-Nutzung vorab heruntergeladen.

Panoramafoto: Juraj Patekar, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wv_Istanbul_banner.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), im Layout zugeschnitten. Leaflet 1.9.4: BSD-2-Clause; siehe `dist/vendor/LEAFLET-LICENSE.txt`. Karten: © OpenStreetMap-Mitwirkende.
