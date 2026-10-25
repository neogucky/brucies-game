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

Das Burgzimmer-Intro startet automatisch und zeigt Ritter und Helfer, einen
freundlichen Drachen mit Schätzen und die Credits „Spielidee von Brucy“ /
„Entwickelt mit Onkel Tim“. Nach 30,5 Sekunden öffnet sich immer das Hauptmenü.
Dort lässt sich die Geschichte mit **Intro ansehen** erneut abspielen.
Überspringen funktioniert ausschließlich mit **Leertaste** oder dem dezenten
Overlay unten rechts. Im Touch-Profil trägt das Overlay keinen Tastaturhinweis.
Beim Tabwechsel pausiert die Geschichte und läuft bei der Rückkehr automatisch
weiter. Der Ton versucht automatisch zu starten und wird, falls nötig, bei einer
normalen Berührung oder Taste freigegeben; verpasste Geräusche werden nicht nachgeholt.
Zum direkten Entwicklertest ohne Intro kann weiterhin `&skipIntro=1` angehängt werden.
Die Grafiken, vollständigen Prompts und eigenen Töne liegen in
[assets/intro](assets/intro/README.md).

Alle drei Weltkarten haben geschwungene, deutlich eingefasste Wege. Ritter und
Helfer folgen diesen Wegen; das Tempo bleibt auch bei langen Pfaden und beim
Weltwechsel gleich. Ritter und Ritterin haben sechs streckenabhängige Gehphasen.
Der Helfer schlürft Kokosnusspfützen mit vier eigenen Animationsphasen, während
die Pfütze wie bisher dreimal schneller verschwindet. Die neuen Grafiken und
vollständigen Prompts liegen in
[assets/common/characters/world-travel](assets/common/characters/world-travel/README.md).

Zum Testen mit allen freigeschalteten Leveln direkt die Untergrundkarte öffnen:
`http://localhost:8000/?unlockAll=1`

Das Profil lässt sich unter **Hauptmenü → Einstellungen → Steuerung** auswählen. Ohne verlässliche
Tastaturerkennung startet das Spiel immer mit **iPad mit Tastatur**; eine bewusste
Auswahl wird gespeichert und bleibt auch bei einem neuen Spiel erhalten.

Die Hauptansicht enthält keine Profilauswahl und keine zusätzliche Hilfszeile.
Unter dem Spielfeld stehen nur kleine, zur aktuellen Ansicht passende Aktionen.
Auf Karten und in Shops zeigt die obere Leiste nur Ressourcen und Herzen; im
Level erscheinen kompakte Symbole für ausgerüstete Waffen, Schild, verfügbare
Tränke und den Helfer. Die vollständige Ausrüstung steht im Inventar.
Touch-Richtungstasten erscheinen ausschließlich beim Spielen im Touch-Profil;
Weltkarten und Menüs werden dort direkt angetippt.

| Aktion | iPad mit Tastatur (Standard) | PC | iPad ohne Tastatur |
| --- | --- | --- | --- |
| Bestätigen / Ja / Gespräch weiter | E | Enter | Bestätigen / Ja antippen |
| Zurück / Nein / Inventar schließen | Q | Esc | Zurück / Nein antippen |
| Inventar öffnen | I | Tab | Inventar antippen |
| Bewegen / Auswahl | Pfeile | Pfeile | Richtungsknöpfe |
| Springen | ↑ | ↑ | Springen antippen |
| Nahkampf | Leertaste | Leertaste | Angriff antippen |
| Bogen | Shift | Shift | Schießen antippen |
| Pause / Fortsetzen | P | P | Pause / Weiterspielen antippen |
| Trankslots 1 und 2 | T und G | T und G | Trank 1 / Trank 2 antippen |

Jede Aktion hat pro Tastaturprofil genau eine logische Taste. Andere Profile und
frühere Alternativen (J/N, WASD, Rückschritt, Enter/Esc beim iPad-Profil) lösen
keine Spielaktionen aus. Offene Dialoge und Inventarhinweise wechseln sofort mit
dem Profil. Im Touchprofil stehen an den Knöpfen keine Tastaturkürzel.

Im Inventar schließt nur die Zurück-Aktion; die Inventartaste öffnet es. Ein
Gespräch blättert nur mit Bestätigen weiter. Nach einem Sieg führt nur Bestätigen
zur Karte, nach einer Niederlage startet Bestätigen neu und Zurück führt zur Karte.

Im Untergrund: ↑ zum Springen, dann ↓ in der Luft für den Hammer-Landungsschlag.

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
- **Lianenpfad:** Nach dem Affenkönig freigeschaltet. An Lianen durch große Astlücken klettern und die
  goldene Kokosnuss ganz oben erreichen, Belohnung 200 Gold.

Beide Level sind 960 Pixel breit; die Kamera folgt nach oben durch 1820 bzw.
2120 Pixel hohe Baumkronen. Die Kokoskronen haben engere Astfolgen, der Lianenpfad
weniger Plattformen und vier lange Kletterlianen. An einer Liane mit ↑/↓ klettern,
mit links/rechts loslassen oder mit seitwärts + ↑ abspringen. Zweimal ↓ innerhalb von 300 ms lässt den
Ritter durch den aktuellen Ast auf die nächste Ebene fallen; der Boden bleibt fest.
Beim Klettern verwendet der Ritter eine eigene Pose mit freien Händen; Nahkampf, Bogen und Waffenwechsel sind gesperrt. Alle Strecken sind ohne Spezialschuhe erreichbar. Die Zurück-Aktion öffnet eine Rückfrage zur
Weltkarte; nach einer Niederlage startet die Bestätigen-Aktion mit vollen Herzen neu.

Zu Beginn ist nur ein Affe aktiv. Weitere Affen spähen hinter Blättern hervor und
kommen bei Annäherung oder einem Pfeiltreffer heraus. Versteckte Affen werfen und
blockieren den Ritter nicht; Auto-Aim verrät ihre Verstecke nicht.

Die Affen tragen Lederrüstungen mit Kokosnuss-Emblem und klettern am Baum zwischen
den Astebenen nach oben und unten. Dafür huschen sie zuerst zu einem erreichbaren Baum oder einer Liane; nur dort verändern sie ihre Höhe. Sie kündigen Würfe sichtbar an und zielen mit
ballistischen Kokosnüssen auf die aktuelle Position des Ritters:

| Affe | Schaden | Fehlschuss / Besonderheit |
| --- | --- | --- |
| Braun | 1 | Zerplatzt auf Boden oder Ast; hinterlässt 10 Sekunden Kleber |
| Rot | 2 | Explosion mit Flächenschaden; auf dem Boden zusätzlich Kleber |
| Blau | 3 | Zerplatzt ohne Explosion und ohne Kleber |

Klebeflächen zeigen ihren eigenen Countdown. Beim Betreten wird der Ritter für
5 Sekunden auf 45 % Lauftempo verlangsamt und kann nicht springen. Der separate
Spieler-Countdown bleibt auch nach dem Verschwinden der Fläche sichtbar. Im
Inventar pausieren beide Countdown-Effekte. Über eine Fläche zu springen ist sicher.
Der kleine Helfer läuft zu nahen Pfützen und schlürft sie auf: Sie verschwinden
dann dreimal schneller. Der Countdown berücksichtigt diese Beschleunigung.

Der Affenkönig wirft zusätzlich die rollenden Steingegner aus der Unterwelt.
Diese prallen an beiden Bildschirmrändern ab und rollen insgesamt höchstens
2880 Pixel (drei Bildschirmbreiten). Schwert und Hammer können sie bekämpfen.
Der Boss ist nach jedem Wurf 1,3 Sekunden verwundbar: zwei Spielertreffer und ein
separater Helfertreffer. Treffer verlängern dieses Fenster nicht.

Direkt zum Testen mit allen Freischaltungen:
`http://localhost:8000/?unlockAll=1&world=jungle`

Die neuen Grafikdateien wurden mit der integrierten Bildgenerierung erstellt.
Dateien und verwendete Prompts stehen in [der Urwald-Assetübersicht](assets/jungle/README.md).

### Urwald-Shop und Bogen

Der Urwald-Shop ist ein Ort auf der Weltkarte. Mit den Pfeilen oder Richtungsknöpfen geht der Ritter
zwischen Shop und Levels; Bestätigen öffnet den aktuellen Ort. Antippen eines
benachbarten Orts lässt den Ritter dorthin gehen, erneutes Antippen öffnet ihn.
Die Inventar- und Zurück-Aktionen hängen vom gewählten Steuerungsprofil ab.
**Pfeil & Bogen kosten 300 Gold**, der reflektierende **Urwaldschild 200 Gold**.
Honigsaft kostet 10 Gold. Alle Shops haben klickbare Warenkarten; gekaufte
Einzelstücke sind ausgegraut und deaktiviert. Der Urwaldhändler erkennt den Ritter
wieder und erzählt, wie er den Schild gegen die Affen entwickelt hat.

Im Inventar umgeben unabhängige Plätze das Ritterbild: Primärwaffe, Sekundärwaffe,
Rückenschild, Schuhe, Helm, Gürtel mit zwei Trankslots (T/G) und Begleiter. Bogen,
Schild und Schuhe können gleichzeitig angelegt werden. Beide Trankslots nutzen
den gemeinsamen Honigvorrat. Vorhandene Spielstände übernehmen die Ausrüstung;
ausdrücklich geleerte Plätze bleiben leer.

Der Urwaldschild blockiert wie der normale Schild und lädt sich in 20 Sekunden
wieder auf. Kokosnüsse und Giftbeeren schleudert er zurück; ein Gegnertreffer
verursacht den normalen Geschossschaden. Rote Kokosnüsse explodieren dabei gegen
Gegner. Körperangriffe und Steine werden geblockt.

**Shift links oder rechts** schießt einen Pfeil, alternativ der Schießen-Knopf
unter dem Spielfeld. Pfeile verursachen 1 Schaden, haben eine leichte Flugkurve,
650 ms Abklingzeit und etwa 10 Kacheln Reichweite (380 Pixel im Urwald). Es werden
keine zusätzlichen Pfeile gekauft. ↑+Shift schießt senkrecht nach oben.
Der erste Wechsel mit Shift zum Bogen bzw. mit Leertaste zurück zum Nahkampf
dauert 200 ms. Weitere Angriffe mit derselben Waffe haben keine Wechselverzögerung;
die normalen Angriffsabklingzeiten bleiben bestehen. Ritter und Ritterin haben
eigene Bogenposen einschließlich eines vollständig nach oben gedrehten Bogens.
Beide haben außerdem Hammerposen. Der Bogen funktioniert in Urwald, Unterwelt
und Wüste, einschließlich Auto-Anvisieren; Wände stoppen die Pfeile und die
Verwundbarkeitsfenster der Bosse bleiben maßgeblich.

### Tastatur und iPad

Die Bedienleiste bietet dieselben Aktionen als große klickbare Knöpfe. Das
Touchprofil ergänzt Richtungen, Springen, Angriff und beide Trankslots. Auch
Heldenauswahl, alle Weltkarten, Shops, Experten, Dialoge und Inventar lassen sich
antippen. Am Profilnamen lässt sich jederzeit erkennen, welche Tasten gelten.

Beim Appwechsel werden gehaltene Tasten zurückgesetzt und laufende Level
pausiert. Fortsetzen hat seine eigene eindeutige Aktion; Zurück aus der Pause
öffnet stattdessen die Rückfrage zum Verlassen. Nach dem Fortsetzen gilt kurz
Schutz vor Treffern. Ein Test mit einer echten iPad-Tastatur steht noch aus.

### Experten in allen Welten

Professor Knobel ist an seiner wilden weißen Frisur, Messingbrille und blauen
Fliege wiederzuerkennen. Die drei kostenlosen Orte sind mit ihrer Welt verfügbar:

- **Wüstenexperte:** von der Wüstenruine nach oben.
- **Unterweltexperte:** vom Unterwelt-Shop nach rechts.
- **Urwaldexperte:** vom Urwald-Shop nach unten.

Die Forschungsstube bietet die Rubriken Gegner, Ausrüstung und Level. Rubriken
und einzelne Tipps sind anklickbar; mit ←/→ wechselt die Rubrik, mit ↑/↓ der Tipp.
Zurück führt zur jeweiligen Weltkarte. Besuche und Kartenposition bleiben
beim Speichern erhalten. Die Tipps kosten kein Gold und ändern keine Ausrüstung.

[Grafiken und Bildbeschreibungen](assets/common/experts/README.md).

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
