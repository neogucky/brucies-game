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

Der erste Steinwächter ist als leichterer Einstieg abgestimmt: 12 Lebenspunkte,
langsameres Rollen und Fallen, kleinere Temposteigerungen und 1,6–1,8 Sekunden
Zeit zum Zurückschlagen nach einem Aufprall. Die drei Phasen und der Schutz gegen
dauerhafte Betäubung bleiben erhalten. Der Obsidian-Titan behält seine Stärke.

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

## Urwaldwelt

Der Obsidian-Titan in den Kristalltiefen schaltet die eigenständige **Urwaldwelt** frei.
Auf der Unterweltkarte führt ab Kristalltiefen der Weg nach rechts am Kartenrand
in die Urwaldwelt. Die Urwaldwelt ist kein Unterwelt-Level: Wie Wüste und
Unterwelt hat sie eine eigene begehbare Weltkarte mit Orten und Wegen. Links
beim Urwald-Shop geht es zurück zu Kristalltiefen. Die Karte enthält zwei Level:

- **Kokoskronen:** Äste erklimmen und den Affenkönig besiegen, Belohnung 300 Gold.
  Der König wirft abwechselnd braune, rote explosive und blaue Kokosnüsse sowie
  Steinmonster. Eine farbige Warnung und das sichtbare Wurfobjekt kündigen den
  nächsten Angriff an; jede vollständige Folge enthält alle vier Wurfarten.
- **Lianenpfad:** Nach dem Affenkönig freigeschaltet. Alle Affen vertreiben und die
  goldene Kokosnuss ganz oben erreichen, Belohnung 200 Gold.

Beide Level passen vollständig in einen festen 960×600-Bildausschnitt. Die Kamera
scrollt nicht. Durch Äste kann man von unten springen; beim Herunterfallen landet
man darauf. Alle Äste sind ohne Spezialschuhe erreichbar. Steuerung wie im
Untergrund, einschließlich Inventar, Schwert, Hammer, Landungsschlag, Auto-Aim,
Schild und kleinem Helfer. Esc führt zur Urwaldkarte; nach einer Niederlage startet
Enter mit vollen Herzen neu.

Die Affen tragen Lederrüstungen mit Kokosnuss-Emblem und klettern am Baum zwischen
den Astebenen nach oben und unten. Sie kündigen Würfe sichtbar an und zielen mit
ballistischen Kokosnüssen auf die aktuelle Position des Ritters:

| Affe | Schaden | Fehlschuss / Besonderheit |
| --- | --- | --- |
| Braun | 1 | Zerplatzt auf Boden oder Ast; hinterlässt 5 Sekunden Kleber |
| Rot | 2 | Explosion mit Flächenschaden; auf dem Boden zusätzlich Kleber |
| Blau | 3 | Zerplatzt ohne Explosion und ohne Kleber |

Klebeflächen zeigen ihren eigenen Countdown. Beim Betreten wird der Ritter für
5 Sekunden auf 45 % Lauftempo verlangsamt und kann nicht springen. Der separate
Spieler-Countdown bleibt auch nach dem Verschwinden der Fläche sichtbar. Im
Inventar pausieren beide Countdown-Effekte. Über eine Fläche zu springen ist sicher.

Der Affenkönig wirft zusätzlich die rollenden Steingegner aus der Unterwelt.
Diese rollen höchstens 380 Pixel und können mit Schwert oder Hammer bekämpft werden.
Der Boss ist nach jedem Wurf 1,3 Sekunden verwundbar: zwei Spielertreffer und ein
separater Helfertreffer. Treffer verlängern dieses Fenster nicht.

Direkt zum Testen mit allen Freischaltungen:
`http://localhost:8000/?unlockAll=1&world=jungle`

Die neuen Grafikdateien wurden mit der integrierten Bildgenerierung erstellt.
Dateien und verwendete Prompts stehen in [der Urwald-Assetübersicht](assets/jungle/README.md).

### Urwald-Shop und Bogen

Der Urwald-Shop ist ein Ort auf der Weltkarte. Mit Pfeilen/WASD geht der Ritter
zwischen Shop und Levels; E/Enter öffnet den aktuellen Ort. Antippen eines
benachbarten Orts lässt den Ritter dorthin gehen, erneutes Antippen öffnet ihn.
I öffnet das Inventar, Q führt wie auf den anderen Weltkarten ins Menü.
**Pfeil & Bogen kosten 300 Gold**. Dort gibt es auch Honigsaft und einen Schild.
Ein bereits gekaufter Bogen wird nicht nochmals berechnet. Der Kauf lässt einen
vorhandenen Schild ausgerüstet; mit I das Inventar öffnen und den Bogen unter
**Sekundär** auswählen. Schild, Schuhe und Bogen teilen sich diesen einen Platz.
Die Primärwaffe bleibt ausgerüstet.

**Shift links oder rechts** schießt einen Pfeil, alternativ der Schießen-Knopf
unter dem Spielfeld. Pfeile verursachen 1 Schaden, haben eine leichte Flugkurve,
650 ms Abklingzeit und etwa 10 Kacheln Reichweite (380 Pixel im Urwald). Es werden
keine zusätzlichen Pfeile gekauft. Der Bogen funktioniert in Urwald, Unterwelt
und Wüste, einschließlich Auto-Anvisieren; Wände stoppen die Pfeile und die
Verwundbarkeitsfenster der Bosse bleiben maßgeblich.

### Tastatur und iPad

Die Bedienleiste unter dem Spielfeld bietet große Knöpfe, damit Enter und Esc
nicht erforderlich sind. Das Inventar lässt sich auch durch Antippen bedienen.

| Aktion | Tastatur / Alternative |
| --- | --- |
| Bestätigen, Gespräch weiter, Kaufen | Enter / E oder Bestätigen-Knopf |
| Zurück, Dialog abbrechen | Esc / Q / Rückschritt oder Zurück-Knopf |
| Inventar | Tab / I oder Inventar-Knopf |
| Bogen abfeuern | Shift oder Schießen-Knopf |
| Pause / Fortsetzen | P oder Pause-Knopf; E setzt ebenfalls fort |

Bei einer Ja/Nein-Rückfrage bestätigt E und Q bricht ab. Beide Shift-Tasten und
abweichende Return-/Pfeiltasten-Ereignisse ohne klassischen `keyCode` werden
berücksichtigt. Browser-Tastenkürzel bleiben erhalten. Das Spielfeld behält auch
bei kleinerem Fenster und beim Drehen sein Seitenverhältnis; die Knöpfe bleiben
außerhalb des Spiels. Beim Appwechsel werden gehaltene Tasten zurückgesetzt und
laufende Level pausiert. Nach dem Fortsetzen gilt kurz Schutz vor Treffern.

Diese Varianten werden automatisch und im Browser geprüft. Ein Test mit einer
echten iPad-Tastatur steht noch aus.

## Körperkontakt und Angriffssignale

Der Ritter wird an Gegnerkörpern gestoppt, auch bei schnellen Rollen und Dashes.
Berührungsschaden entsteht pro zusammenhängendem Kontakt einmal; erst Abstand
und erneutes Hineinlaufen lösen ihn wieder aus. Betäubte Gegner bleiben fest,
verursachen dabei aber keinen Berührungsschaden. Gezielte Gegnerangriffe und
Geschosse behalten ihre eigenen Vorwarnungen, Abklingzeiten und Schildregeln.

Affen und Fledermäuse kündigen ihre Angriffe mit einem Warnsignal an; der Wurf
beziehungsweise Abwurf ist auch bei einem Fehlschuss hörbar. Maulwürfe und Bosse
haben Schlag-/Ladegeräusche, Steingegner ein Warn- und Rollgeräusch.

Der Urwaldhändler trägt nun das vertraute Gesicht mit braunem Vollbart, hellem
Hemd und Lederschürze. Bild und Bearbeitungsprompt liegen in `assets/jungle/`.

Welten und Levels werden getrennt gespeichert (`currentWorld`, `unlockedWorlds`
und `currentLevel`, `unlockedLevels`). Alte Spielstände mit dem bisherigen
Unterwelt-Eintrag „Urwald“ werden beim Laden übernommen, ohne Gold, Ausrüstung
oder abgeschlossene Levels zu verlieren.

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
