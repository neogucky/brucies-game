# Schwert – Variante B mit fester Kamera

Beim Blick nach rechts liegt der rechte Schwertarm vorn. Diese Ansicht verwendet vollständige gemalte Posen: neun stehend, sieben geduckt und acht in der Luft, einschließlich Erholung und jeweils für Ritter/Ritterin.

Beim Blick nach links liegt die rechte Schulter hinter dem Körper. left-far-bodies-v1.png enthält passende Körper für Stand, Ducken und Sprung, jeweils mit drei Gewichts-/Drehposen. Daraus entstehen dreizehn Zwischenpositionen. Oberarm, Unterarm, Hand und Schwert werden hinter dem Körper gezeichnet. Der nahe linke Arm bleibt leer; die rechte Schulter ist tatsächlich verdeckt.

Die ferne Ansicht übernimmt die Schlagbahn aus Variante B: Ausholen, hoher Schnitt, Hüfthöhe, tiefer Nachschwung. Geduckt bleibt der Schnitt niedrig. Die ferne Klinge hat dieselbe sichtbare volle Länge wie die nahe Klinge, einschließlich des hinter dem Körper verdeckten Anteils.

Die unbewaffneten Bewegungsposen verwenden zwei gemessene Handpunkte. In der linken Ansicht bleibt das Schwert am fernen rechten Handschuh und hinter dem Körper, in der rechten Ansicht am nahen rechten Handschuh und davor. Dies gilt auch für Gehen, Rennen, Ducken und Springen.

right-bodies-v1.png ergänzt die passende rechte Schulter für isometrische Angriffe nach rechts. Isometrische Angriffe nach links verwenden ebenfalls die ferne Schulter und Verdeckung.

frames.json, left-far-bodies.json und right-bodies.json speichern Ausschnitte, Silhouettenmasken, Fuß-/Beckenanker und Maßstäbe. tools/inspect-sword-attacks.py misst die Originale, ohne PNGs zu verändern. Die Spielfigur und ihr physischer Körper behalten ihre Maße. Die horizontale Reichweite bleibt gleich; in Sprungleveln treffen stehende Angriffe zwei Tile-Reihen und geduckte nur die untere.

Schwert und Hammer haben getrennte Darstellungen. Hammer-Aufladung, normaler Hammer und Sprungschlag behalten ihre eigenen Abläufe.

Erstellt mit dem eingebauten ImageGen. Die genauen Prompts und ursprünglichen Quelldateien sind in prompts.json festgehalten. Die acht PNGs in diesem Ordner werden direkt im Spiel geladen.
