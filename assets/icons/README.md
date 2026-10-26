# App-Icon

Das Motiv zeigt den Ritter und den gelben Helfer im Stil des Titelbilds.
Erstellt mit der integrierten Bildgenerierung; das Titelbild
`assets/common/menu/menu.png` diente als Figuren- und Stilreferenz.
Der vollständige Prompt liegt in [prompts/app-icon.txt](prompts/app-icon.txt).

- `app-icon-master.png`: unverändertes Original der Bildgenerierung.
- `../../apple-touch-icon.png`: 180 × 180 Pixel für den iPhone- und iPad-Home-Bildschirm.
- `app-icon-192.png`, `app-icon-512.png`: PNG-Icons für `manifest.webmanifest`.
- `favicon-32.png`: kleines Symbol für Browser-Tabs.

Die kleineren Dateien sind proportionale Exporte des Originals. Das Motiv hat
einen deckenden Hintergrund und keine vorab abgerundeten Ecken; die jeweilige
Plattform setzt ihre eigene Icon-Maske auf.

Die Einbindung folgt [Apples Anleitung für Web-Clips](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
und den [Hinweisen von WebKit zu Home-Screen-Icons](https://webkit.org/blog/13878/).
Alle Verweise sind relativ, damit das Spiel auch in einem Unterordner funktioniert.
Der App-Start führt zur normalen Startseite, ohne Testparameter wie `unlockAll`.
Es wird kein Offline-Cache angelegt.

Nach Veröffentlichung der aktualisierten Dateien die Seite in Safari neu laden
und über **Teilen → Zum Home-Bildschirm** hinzufügen. Zeigt eine vorhandene
Verknüpfung noch das alte Symbol, diese entfernen und neu hinzufügen.
