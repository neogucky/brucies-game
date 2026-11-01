# Gegnerbewegungen

Die fünf transparenten Atlanten wurden mit dem eingebauten `image_gen` erzeugt,
mit den bisherigen Maulwurf- und Affenbildern als Stil- und Figurenreferenz.
Die vollständigen Prompts und Quellen stehen in [prompts.json](prompts.json)
und [color-prompts.json](color-prompts.json).
Die alten Assets bleiben als unveränderte Vergleichsbilder erhalten.

- `mole-motion-v1.png`: vier Lauf-, vier Grab- und vier Angriffsposen.
- `monkey-motion-v1.png`: je vier Lauf-, Kletter-, Wurf- und Ruheposen.
- `monkey-red-motion-v1.png`, `monkey-blue-motion-v1.png`: passende Fellvarianten
  mit denselben Posen und unverändertem Gesicht, Pfoten und Lederrüstung.
- `king-motion-v1.png`: je vier Lauf-, Kletter- und Wurfposen des Affenkönigs.

`frames.json` enthält einzeln gemessene Ausschnitte, Bodenpunkte und Griffpunkte
für die Wurfmunition. Die Frames werden mit einem gemeinsamen Pixelmaßstab pro
Figur registriert. Weiche Alpha-Konturen bleiben erhalten; fremde Silhouetten in
überlappenden Ausschnittrechtecken werden beim Laden ausgeschlossen. Ein Rand
für ausgestreckte Hände, Schaufeln und Schwänze verändert nur die Darstellung;
Phasers Trim-Angaben erhalten die bisherigen Körpermaße, Ursprünge und Trefferflächen.

Laufen/Klettern folgen der zurückgelegten Strecke. Ausholen und Loslassen folgen
dem bestehenden Angriffstiming. Wurfziele werden weiterhin vor dem Ausholen fixiert.
Rote/blaue Affen behalten ihre Fellfarbe auch beim Klettern und Werfen; Gesichter,
Handflächen, Leder und Abzeichen behalten ihre ursprünglichen Farben.
Fledermaus-Flügelschläge sowie rollende Steinmonster nutzen ihre vorhandenen Abläufe.

Prüfen: `node --test tests/enemy-animation.test.cjs` und die bestehende
`tests/level-animation-review.html?gallery=enemies` (eigener Spielstand im Speicher).
Die Galerie zeigt die originale Standpose, vier Bewegungsphasen, Spielgröße und
Vergrößerung in beiden Blickrichtungen. „Gegnerabläufe prüfen“ prüft die Darstellung
und die laufenden Abläufe in den drei Wüstenleveln, der Unterwelt und dem Urwald.
