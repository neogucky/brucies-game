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
und beim Landungsschlag. Der Landungsschlag bricht auch Erde direkt unter dem
Ritter auf. Geduckte Schläge treffen nur die untere Blockreihe auf Fußhöhe, auch
bei aktiviertem Auto-Anvisieren. Schwarze Begrenzungskacheln bleiben unzerstörbar.

Der Steinwächter am Ende des Schlüsselwegs und der Obsidian-Titan in den neuen
Kristalltiefen haben drei Phasen. Sie sind beim Rollen und Fallen gepanzert:
Nach einem Aufprall sind zwei Spielertreffer und ein zusätzlicher Helfertreffer
möglich. Die Betäubung lässt sich nicht verlängern. Beim Phasenwechsel kehren sie
auf die wiederhergestellte obere Ebene zurück und werden schneller.

Der Sieg über den Steinwächter öffnet die Kristalltiefen auf der Unterweltkarte
(vom Schlüsseltor nach unten/rechts). Dort gibt es fünf dauerhaft gespeicherte
Schatztruhen mit jeweils 100 Gold, erhöhte Nebenwege und einen stärkeren Superboss.
Beide Bosskämpfe enden mit einem Siegesbildschirm und einer Goldbelohnung.

Die Kinderhilfe „Auto-Anvisieren“ aus den Einstellungen funktioniert auch im
Untergrund mit Schwert und Hammer. Sie richtet Schläge auf nahe, sichtbare Gegner
aus und berücksichtigt höher fliegende Fledermäuse. Wände und Waffenreichweite
bleiben dabei maßgeblich.

In den Kristalltiefen patrouillieren vier Fledermäuse dicht unter der Decke. Bei
Hindernissen fliegen sie darunter hindurch und steigen danach wieder nach oben;
auch neu freigelegte Gänge werden berücksichtigt. Eine Berührung verursacht
1 Schaden. Nach einer kurzen sichtbaren Vorbereitung lassen sie Giftbeeren fallen:
Ein Treffer verursacht 2 Schaden, ein Fehlschuss zerplatzt harmlos am Boden oder
auf einer Plattform. Der Schild schützt vor beiden Angriffen. Treffer unterbrechen
den Abwurf, und auch der kleine Helfer kann Fledermäuse angreifen.

Die neuen Ritterposen und das Waffensymbol liegen in
`assets/common/characters/power-hammer-atlas.png`. Sie wurden mit der integrierten
Bildgenerierung aus den vorhandenen Figuren erstellt; die verwendete
Bildbeschreibung steht daneben in `power-hammer-atlas.prompt.txt`.

Die transparenten Fledermausposen (`assets/underground/enemies/cute-bat-atlas.png`)
und die Giftbeere (`assets/underground/enemies/poison-berry.png`) wurden ebenfalls
mit der integrierten Bildgenerierung erstellt. Die jeweiligen Bildbeschreibungen
liegen direkt daneben als `.prompt.txt`.

## Spieltests

Mit Node.js ohne zusätzliche Abhängigkeiten ausführen:

```bash
node --test tests/*.test.cjs
```

Die Tests prüfen Kämpfe und Betäubung, Schildaufladung, Inventar und alte
Spielstände sowie Neustarts, Niederlagen und Kartenwechsel. Weitere Prüfungen
decken Auto-Anvisieren, Fledermaus-Flugwege, unterbrochene Abwürfe sowie
Beerenkollisionen mit Spieler, Schild, Boden und Plattformen ab.

## Projektstruktur

- `index.html`: Einstiegspunkt
- `style.css`: Grund-Layout
- `src/main.js`: Phaser-Konfiguration
- `src/scenes`: Szenen für Menü, Levelauswahl, Level 1
- `src/saveManager.js`: Spielstand in `localStorage`
