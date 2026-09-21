# Gemeinsame Favoriten und Programm

Die statische Webseite bleibt auf GitHub Pages. Eine Supabase-Datenbank speichert ausschließlich die gemeinsame Favoritenliste, das übernommene Planprofil und bis zu zehn vorherige Planprofile. GPS-Positionen, Reiseunterlagen und Buchungsdaten werden nicht übertragen.

## Einrichtung

1. Ein Supabase-Projekt im Konto des Eigentümers verbinden. In einem bereits bestehenden Projekt vorher nach gleichnamigen Funktionen/Schemas suchen.
2. Die Migration `migrations/20260921_shared_trip.sql` anwenden. Sie legt den privaten, nicht über die Daten-API freigegebenen Bereich `istanbul_private` an. Die drei öffentlichen RPC-Funktionen erlauben ausschließlich die vorgesehenen Aktionen.
3. Den vom Eigentümer bestimmten Reisecode über eine private, parametrisierte Administratorabfrage mit `extensions.crypt(code, extensions.gen_salt('bf',10))` hashen und in `istanbul_private.room.code_hash` für `id=1` setzen. **Code und Hash niemals in Git, Webdateien oder Logs schreiben.** Ohne gesetzten Hash ist die Anmeldung gesperrt.
4. In `dist/sync-config.js` ausschließlich die Projekt-URL und den öffentlichen Publishable-/Anon-Key eintragen. **Keinen Secret- oder Service-Role-Key verwenden.** Die Website dann mit erhöhter Service-Worker-Version veröffentlichen.
5. Anmeldung mit richtigem/falschem Code, gesperrten direkten Tabellenzugriff, parallele Änderungen von zwei getrennten Sitzungen, konfliktbehaftete Planübernahme und Rückgängig-Funktion über die echte API prüfen.

## Verhalten

- Ein gemeinsamer Reisecode, zwei unabhängige Geräte. Der Code wird beim Login über HTTPS übertragen, jedoch weder im Browser gespeichert noch veröffentlicht. Zufällige Sitzungstoken gelten 30 Tage; nur deren SHA-256-Hash liegt in der Datenbank.
- Favoritenänderungen werden als einzelne Setzen/Entfernen-Aktionen atomar unter einer Zeilensperre verarbeitet. Gleichzeitige Änderungen an verschiedenen Orten überschreiben einander nicht. Bei demselben Ort gilt die zuletzt beim Server eingegangene Änderung.
- Planübernahmen vergleichen die gesehene Revision. Eine veraltete Vorschau darf eine neuere Auswahl nicht überschreiben. Zurücksetzen prüft die Planrevision. Wiederholte Mutationsanfragen mit derselben Kennung werden nicht nochmals ausgeführt.
- Alle 20 Sekunden, beim Öffnen und beim Zurückkehren lädt die App den gemeinsamen Stand. Offline gesetzte Häkchen bleiben als ausstehend markiert und werden nach Verbindung übertragen. Planübernahme und Zurücksetzen erfordern eine Verbindung.
- `activePlan` enthält nur die damaligen Favoriten-IDs und die Planerversion. Die Webseite berechnet daraus deterministisch den Reiseplan. Buchungseinträge kommen unverändert aus den Reiseunterlagen im bestehenden Datenbestand.
- Ohne konfigurierte Projektverbindung arbeitet die App ausdrücklich im lokalen Modus. Sie behauptet dann keine Synchronisation und prüft keinen Reisecode. Lokale Testdaten sind kein Nachweis für eine funktionierende Cloud-Verbindung.

## Planungsgrenzen

Der Planer nutzt recherchierte, zeitlich begrenzte Alternativen. Bestehende Favoriten werden vor anderen Vorschlägen geschützt. Unbekannte Öffnungen, Führungen, überfüllte Zeitfenster oder geschlossene Orte werden als Alternativen ohne erfundene Termine aufgeführt. Die neun Startfavoriten ergeben acht geplante Besuche; die zusätzliche Sunset-Fahrt bleibt bei der Ausgangsauswahl frei. Der bekannte Kaffee/Yacht-Konflikt wird nicht stillschweigend verschoben.

Die Datenbank erhält bei der ersten Einrichtung diese neun Favoriten. Vorhandene Raumdaten werden bei späteren Migrationen nicht zurückgesetzt.

## Verifizierter Betrieb und Sicherheitsmodell

Die echte API wurde mit zwei unterschiedlichen Sitzungstoken getestet: paralleles Setzen verschiedener Favoriten, gemeinsames Entfernen, Ablehnung veralteter Vorschauen, gemeinsame Planübernahme, Rückgängig, Wiederholung derselben Anfrage, Ablehnung bereits gebuchter Orte und verweigerter Zugriff auf private Tabellen. Anschliessend wurden dieselben Abläufe in zwei Browser-Ursprüngen mit getrenntem Speicher geprüft. Der Endzustand enthält die neun Startfavoriten und den ursprünglichen Plan.

Die Supabase-Prüfung meldet bei diesem bewusst schmalen RPC-Zugang generische Hinweise: [privilegierte öffentliche Funktionen](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [Aufruf durch angemeldete Rollen](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) und [RLS ohne Lesepolicies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Hier sind sie beabsichtigt: Die Tabellen haben keinerlei direkten Clientzugriff, Login prüft den Code, Lesen/Ändern prüfen den zufälligen Sitzungsschlüssel; Suchpfade sind festgelegt, SQL wird nicht dynamisch zusammengesetzt. Der Bereitschaftstest gibt ausschliesslich ein Boolean zurück. Diese Schutzmechanismen wurden über die echte öffentliche API geprüft.

`20260921_readiness.sql` ergänzt den datenfreien Bereitschaftstest. Der GitHub-Workflow `sync.yml` ruft ihn bis 08.10.2026 täglich auf. Damit wird die Verbindung auch vor der Reise regelmässig genutzt; dies ist keine Verfügbarkeitsgarantie des kostenlosen Dienstes. Nach längerer späterer Inaktivität kann das Projekt im Supabase-Konto wiederhergestellt werden. [Supabase-Projektpausen](https://supabase.com/docs/guides/platform/free-project-pausing)
