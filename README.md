# Brucies Game

Prototyp eines Phaser-Spiels mit Hauptmenü, Levelauswahl und dem ersten Level **"Wüstenruine"**.

## Starten

Lokalen Webserver starten (wegen ES-Modulen):

```bash
python -m http.server 8000
```

Dann im Browser öffnen:

```
http://localhost:8000
```

## Steuerung

Zum Testen mit allen freigeschalteten Leveln direkt die Untergrundkarte öffnen:
`http://localhost:8000/?unlockAll=1`

- Pfeiltasten: Bewegung / Auswahl
- Enter: Auswahl / Bestätigen
- Esc: Zurück zur Levelauswahl
- Leertaste: Mit der ausgerüsteten Waffe angreifen
- Tab: Inventar öffnen und zwischen Schwert und Power Hammer wechseln
- Im Untergrund: Springen (W/Pfeil hoch), dann S/Pfeil runter für den Hammer-Landungsschlag

Der Power Hammer kostet im Untergrund-Shop 200 Gold. Er schlägt langsamer zu und
verursacht doppelten Schaden gegen Steingegner. Sein Landungsschlag trifft nahe
Gegner auf beiden Seiten und verursacht zusätzlich 50 % Schaden. Im Untergrund
zerschlägt der Hammer außerdem normale Steinkacheln – auch mit Schlägen nach unten
und beim Landungsschlag. Schwarze Begrenzungskacheln bleiben unzerstörbar.

Die neuen Ritterposen und das Waffensymbol liegen in
`assets/common/characters/power-hammer-atlas.png`. Sie wurden mit der integrierten
Bildgenerierung aus den vorhandenen Figuren erstellt; die verwendete
Bildbeschreibung steht daneben in `power-hammer-atlas.prompt.txt`.

## Spieltests

Mit Node.js ohne zusätzliche Abhängigkeiten ausführen:

```bash
node --test tests/*.test.cjs
```

Die Tests prüfen Kämpfe und Betäubung, Schildaufladung, Inventar und alte
Spielstände sowie Neustarts, Niederlagen und Kartenwechsel.

## Projektstruktur

- `index.html`: Einstiegspunkt
- `style.css`: Grund-Layout
- `src/main.js`: Phaser-Konfiguration
- `src/scenes`: Szenen für Menü, Levelauswahl, Level 1
- `src/saveManager.js`: Spielstand in `localStorage`
