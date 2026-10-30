# Drei Schwertschlag-Entwürfe

Erstellt mit dem eingebauten ImageGen-Werkzeug, mit den vorhandenen Rittergrafiken als Stil- und Proportionsreferenz. Die rechtshändige Grundhaltung bleibt erhalten. Der Realismus betrifft die Bewegung, nicht neue Körperproportionen oder einen anderen Zeichenstil.

- `assets/simple.png`: einfacher ganzer Armschwung, ohne Schritt.
- `assets/grounded.png`: diagonaler Schwung mit Hüft-/Schulterdrehung und Gewichtsverlagerung.
- `assets/realistic.png`: Schwung mit kurzem Schritt, Körperdrehung und kontrolliertem Nachschwung.

Die genauen Generierungs-Prompts und der Modus stehen in `prompts.json`. Die Originale bleiben im generated_images-Ordner erhalten. `tools/inspect-sword-studies.py` misst ausschließlich die sechs vorhandenen Silhouetten und ihre Fußanker; die Bilder werden nicht verzerrt. Der Browser spielt diese sechs gezeichneten Schlüsselbilder ab. Das ist eine Bewegungsstudie zur Auswahl, keine bereits eingebaute fertige Spielanimation. Die Wahl einer Variante ersetzt später den alten prozeduralen Handgelenkschwung.

Das Menü des Spiels wird durch diese Vergleichsseite nicht erweitert.
