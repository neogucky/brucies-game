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

## iPhone-Home-Bildschirm

Das Spiel enthält ein eigenes Icon mit Ritter und gelbem Helfer. In Safari die
Seite öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Eine bestehende
Verknüpfung mit altem Symbol bei Bedarf entfernen und neu hinzufügen, sobald die
aktualisierten Dateien veröffentlicht sind. Die Grafiken und der vollständige
Bildprompt stehen in [assets/icons](assets/icons/README.md).

## Steuerung

Das Burgzimmer-Intro startet automatisch und zeigt Ritter und Helfer, einen
freundlichen Drachen mit Schätzen und die Credits „Spielidee von Brucy“ /
„Entwickelt mit Onkel Tim“. Nach 27,8 Sekunden öffnet sich immer das Hauptmenü.
Der Drachenschatten erscheint bereits nach etwa zwei Sekunden. Schlaf-„z“ steigen
vom Ritter auf; Bett und Ritter sind getrennt, sodass das Bett beim animierten
Absprung und der Landung an seinem Platz bleibt.
Dort lassen sich die freigespielten Filme im **Kino** erneut abspielen.
Überspringen funktioniert mit **Leertaste**, **Enter** oder dem dezenten
Overlay unten rechts. Ein gehaltener Tastendruck löst im folgenden Menü keine
weitere Aktion aus; erst nach dem Loslassen reagiert die Taste wieder. Im Touch-Profil trägt das Overlay keinen Tastaturhinweis.
Die Spielfläche übernimmt schon während des Ladens den Tastaturfokus. Eine dabei
gedrückte Leertaste oder Enter-Taste wird als einmaliger Überspringwunsch gemerkt.
Die Eingabe wird am Browserfenster abgefangen, bevor sie Knöpfe oder Phaser
erreichen kann. „Weiterspielen“ startet ausschließlich die gespeicherte Welt,
verwirft abgebrochene Kino-Aufträge und ist gegen doppelte Aktivierung geschützt.
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
| Bestätigen / Gespräch weiter | Enter | Enter | Bestätigen antippen |
| Zurück / Inventar schließen | Q | Esc | Zurück antippen |
| Ja in Ja/Nein-Dialogen | J | J | Ja antippen |
| Nein in Ja/Nein-Dialogen | N | N | Nein antippen |
| Inventar öffnen | I | Tab | Inventar antippen |
| Bewegen / Auswahl | WASD / Pfeile | WASD / Pfeile | Richtungsknöpfe |
| Springen | ↑ | ↑ | Springen antippen |
| Nahkampf | Leertaste | Leertaste | Angriff antippen |
| Bogen | Shift | Shift | Schießen antippen |
| Pause / Fortsetzen | P | P | Pause / Weiterspielen antippen |
| Trankslots 1 und 2 | T und G | T und G | Trank 1 / Trank 2 antippen |

Menüaktionen haben pro Tastaturprofil genau eine Taste. Bewegen funktioniert
mit WASD und Pfeilen. Ja/Nein-Fragen verwenden in beiden Tastaturprofilen
ausschließlich J für Ja und N für Nein. Enter, Q und Esc beantworten diese Fragen
nicht. Frühere Alternativen (E, Rückschritt, Esc beim iPad-Profil) lösen keine
Menüaktionen aus. Offene Dialoge und Inventarhinweise wechseln sofort mit
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

**Hammer aufladen:** Leertaste kurz antippen behält den normalen Schlag.
Gedrückthalten zieht den Hammer zurück: gelbe, rote und schließlich blaue
Blitze zeigen die steigende Kraft. Beim Loslassen saust der Hammer bis zum Boden;
volle blaue Ladung erzeugt eine kleine Druckwelle. Während des Haltens bleibt
das Bewegungstempo bei 80 %. Das Schwert schlägt weiterhin sofort zu.
Im Touch-Profil wird der Angriffsknopf entsprechend gehalten und losgelassen.

Beim ersten Kauf führt **Meister Muck** fünf kurze Übungen vor: normaler Schlag,
gelbe, rote und blaue Ladung sowie Sprung-Landungsschlag. Der Spieler kann schon
während der Vorführung laufen, springen und mitüben. Ein gelungener Versuch zählt
sofort und beendet die Vorführung; nach dem Lob folgt die nächste Übung. Ein
Fehlversuch während der Vorführung gibt einen Hinweis, ohne den Spieler anzuhalten.
Spätere Fehlversuche bekommen passende Hinweise und eine neue Vorführung.
Vorhandene Hammerbesitzer erhalten die Einführung beim nächsten Level mit Hammer.
Das Training lässt sich mit „Später“ verlassen und im Unterwelt-Shop über
„Hammer üben“ jederzeit kostenlos wiederholen. Grafiken und vollständige Prompts:
[assets/common/training](assets/common/training/README.md).

Der Steinwächter am Ende des Steinwächtermines und der Obsidian-Titan in den neuen
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
bei Kokoskronen geht es zurück zu Kristalltiefen. Kokoskronen ist jetzt der
Einstieg an der früheren Shopposition. Nach unten führt ein klarer Pfad zum
Urwaldexperten; der Rückweg von dort beginnt nach links. Nach rechts geht es
erst nach dem Sieg über den Affenkönig zum Shop und weiter zum Lianenpfad.
Jeder Pfad verlässt seinen Ort in einer eindeutigen Richtung; die Richtungstaste
passt zum sichtbaren Abzweig. Die Karte enthält zwei Level:

- **Kokoskronen:** Äste erklimmen und den Affenkönig besiegen, Abschlussbonus 50 Gold.
  Der König wirft abwechselnd braune, rote explosive und blaue Kokosnüsse sowie
  Steinmonster. Eine farbige Warnung und das sichtbare Wurfobjekt kündigen den
  nächsten Angriff an; jede vollständige Folge enthält alle vier Wurfarten.
- **Lianenpfad:** Nach dem Affenkönig freigeschaltet. An Lianen durch große Astlücken klettern und die
  goldene Kokosnuss ganz oben erreichen, Abschlussbonus 25 Gold.

Abschlussboni gibt es nur beim ersten Sieg. Unter Tage geben Steinwächter
und Obsidian-Titan entsprechend 50 und 75 Gold. Im Testmodus `unlockAll=1`
bleiben die Orte unabhängig vom Bossfortschritt erreichbar. Das gespeicherte
Gold und bereits gekaufte Ausrüstung bleiben bei dieser Umstellung erhalten.

Beide Level sind 960 Pixel breit; die Kamera folgt nach oben durch 1820 bzw.
2120 Pixel hohe Baumkronen. Die Kokoskronen haben engere Astfolgen, der Lianenpfad
weniger Plattformen und vier lange Kletterlianen. An einer Liane mit ↑/↓ klettern,
Mit links/rechts umdrehen und seitlich bewegen; erst bei mehr als 15 Pixeln
Abstand zur Lianenmitte lässt der Ritter los. Am oberen Ende greift er den Ast
und zieht sich mit vier eigenen Posen darauf. Beide Figuren haben dafür freie Hände. Zweimal ↓ innerhalb von 300 ms lässt den
Ritter durch den aktuellen Ast auf die nächste Ebene fallen; der Boden bleibt fest.
Während dieses Falls greift er mit ↑ oder W sofort eine noch erreichbare Liane
und klettert hoch, auch direkt nach dem Loslassen oder Hochziehen. ↓ auf einem
Ast bleibt zunächst Ducken; der Doppeldruck wird nicht als Abwärtsklettern abgefangen.
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

Der Urwald-Shop ist ein Ort auf der Weltkarte. Mit WASD, den Pfeilen oder Richtungsknöpfen geht der Ritter
zwischen Shop und Levels; Bestätigen öffnet den aktuellen Ort. Antippen eines
benachbarten Orts lässt den Ritter dorthin gehen, erneutes Antippen öffnet ihn.
Die Inventar- und Zurück-Aktionen hängen vom gewählten Steuerungsprofil ab.
**Pfeil & Bogen kosten 300 Gold**, der reflektierende **Urwaldschild 200 Gold**.
Honigsaft kostet 10 Gold. Alle Shops haben klickbare Warenkarten; gekaufte
Einzelstücke sind ausgegraut und deaktiviert. Der Urwaldhändler erkennt den Ritter
wieder und erzählt, wie er den Schild gegen die Affen entwickelt hat.

Im Inventar umgeben unabhängige Plätze das Ritterbild: Primärwaffe, Sekundärwaffe,
Rückenschild, Schuhe, Helm und Begleiter. Der feste Gürtel fasst die beiden
Trankplätze (T/G) zusammen und ist kein ausrüstbarer Gegenstand. Bogen,
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
antippen. WASD und Pfeiltasten funktionieren in beiden Tastaturprofilen parallel.
Bestätigen bleibt Enter; Ja/Nein-Fragen werden ausschließlich mit J/N beantwortet.
Die übrigen Tasten richten sich nach dem Profil in den
Einstellungen. Bei unbekanntem Gerät gilt ohne zusätzliche Anzeige das
iPad-Tastaturprofil.

Beim Appwechsel werden gehaltene Tasten zurückgesetzt und laufende Level
pausiert. Fortsetzen hat seine eigene eindeutige Aktion; Zurück aus der Pause
öffnet stattdessen die Rückfrage zum Verlassen. Nach dem Fortsetzen gilt kurz
Schutz vor Treffern. Ein Test mit einer echten iPad-Tastatur steht noch aus.

### Experten in allen Welten

Professor Knobel ist an seiner wilden weißen Frisur, Messingbrille und blauen
Fliege wiederzuerkennen. Die drei kostenlosen Orte sind mit ihrer Welt verfügbar:

- **Wüstenexperte:** von der Wüstenruine nach oben.
- **Unterweltexperte:** vom Unterwelt-Shop nach rechts.
- **Urwaldexperte:** von den Kokoskronen nach unten.

Neue Abenteuer beginnen beim Wüstenexperten. Er hat den Drachen über der alten
Ruine gesehen. Erst nach diesem Gespräch wird die Ruine freigeschaltet.
Danach und bei jedem weiteren Besuch fragt er nach deinen
Entdeckungen. Erst nach der kurzen Begrüßung erscheint die Tafel.

Auf der Tafel stehen **alle Bildkarten gleichzeitig**. Es gibt keine Rubriken,
versteckten Seiten oder Bildlaufleisten. Mit den Pfeiltasten oder WASD wählst du
eine Karte; mit **Enter** oder einem Klick holst du dir einen Tipp. Unbekannte
Karten bleiben grau und bieten noch keinen Tipp. Wichtige Wörter sind fett.
Ein ausgewähltes Thema besteht aus kurzen Abschnitten; **Enter** liest weiter,
**Zurück** führt zu den Karten und von dort zur Weltkarte. Beides geht auch per
Klick. Jede Karte gehört nur zu ihrer Ursprungswelt: In der Wüste stehen
Maulwürfe, rollende Felsen, Schwert, Schild, Flügelschuhe, Honigsaft und der
Beeren sammelnde Helfer. Unter Tage kommen Steinmonster, Steinwächter,
Obsidian-Titan, Fledermaus und Power Hammer hinzu. Im Urwald erklärt der Professor
die drei Affenfarben, den Affenkönig, den Bogen und den Urwaldschild. Dort gehört
das Aufschlürfen von Kokossaft durch den Helfer zum Tipp über braune Affen.
Der Hammer erklärt auch Aufladen, Druckwelle, Landung und das Graben.

Die Sammlung enthält Gegner und Ausrüstung, keine Levelbeschreibungen. Jede
Gegnerfarbe wird einzeln erfasst, sobald der Gegner im sichtbaren Spielbereich
auftaucht. Versteckte Affen und Gegner hinter dem Ladebild zählen noch nicht.
Ausrüstung wird beim Ansehen im Shop oder beim Besitz bekannt. Entdeckungen
bleiben im Spielstand, auch wenn ein Honigsaft später getrunken wird. Ältere
Spielstände übernehmen vorhandene Ausrüstung und erhalten einmal die neue
Begrüßung. Der Testmodus schaltet Wege frei, ohne Begegnungen zu erfinden.
Tipps kosten kein Gold und ändern keine Ausrüstung.

Wer alle Karten einer Welt entdeckt hat, erhält beim nächsten Expertenbesuch
ein **Forscherabzeichen und 25 Gold**. Jede Welt vergibt diese Belohnung nur
einmal; das Abzeichen bleibt auf ihrer Tafel sichtbar.

### Versteckte Münzjagden

Jede der drei spielbaren Welten hat einen geheimen Parcours ohne Gegner:

- **Goldoase:** Sandsteinsäulen und Münzbögen auf einer langen Wüstenstrecke.
- **Funkelkammer:** Vierzehn Felssimse mit sichtbaren, animierten Sprungfedern und Boing-Ton.
- **Goldwipfel:** Lianen und Äste zwischen hohen Urwaldbäumen.

Ein versteckter Bodenschalter schaltet den jeweiligen Ort frei. Die Schalter
liegen im Wüstenendlos-Level, im Erdgang und im Lianenpfad. Im Erdgang verbirgt
ein anders getönter Erdblock im oberen mittleren Bereich den Hebel. In Wüste
und Urwald muss eine auffällig gefärbte Pflanze weggeschlagen werden. Ein
freigelegter Hebel bleibt auch aus der Entfernung sichtbar. In der Wüste hebt sich
der helle Busch durch seine gelblichen Blätter ab. Hebel und Busch stehen auf
dem freien Sandstreifen am unteren Kartenrand, abseits von Palmen, Felsen und
Truhen. Der Busch überdeckt den Mechanismus; dieser schimmert durch die Blätter.
Der Hebel bleibt bis zum Wegschlagen des Buschs gesperrt. Im Level ist der bemalte Hebelarm kräftiger
als in der unveränderten Nahaufnahme. Bemalte Hebel aus Sandstein,
Höhlenfels bzw. bemoostem Stein passen zum jeweiligen Hintergrund und stehen
hinter dem Ritter. Eine kreisförmige Bodenmarkierung entfällt. Grafiken und
vollständige Bildprompts liegen in [assets/common/scenery](assets/common/scenery/README.md).
Das Freilegen allein öffnet den Gang noch nicht: Neben dem Hebel wird **Enter**
gedrückt oder der Hebel angetippt. Eine kurze Nahaufnahme zeigt, wie der Ritter
ohne Waffe den Griff fasst und den Hebel umlegt. Ober- und Unterarm behalten
dabei ihre Länge und beugen sich am Ellenbogen. Breite Rüstungsstücke und der
dazu passende Handschuh entsprechen den Körperproportionen der Nahaufnahme.
Gegner, Geschosse und Spielzeit
stehen dabei still. Danach bebt die Umgebung mit einem Steinplatten-Schaben; erst
dann erscheint die Freischaltmeldung. Nach der Sequenz wird die gemeinsame
Animationspause aufgehoben, sodass auch halb ausgegrabene Maulwürfe ihre Bewegung
beenden können. Erst beim nächsten
Kartenbesuch erscheint der neue Ort mit seinem wachsenden Weg.

Goldoase und Goldwipfel enthalten je 90 Münzen, die Funkelkammer nach zwei
zusätzlichen oberen Ebenen 102. Jeder Parcours bietet **einen Versuch mit 60 Sekunden**.
Die Zeit beginnt nach einem kurzen Start-Countdown. Nur tatsächlich gesammelte
Münzen geben Gold; es gibt keinen zusätzlichen Abschlussbonus. Pause und
Bestätigungsdialog halten die Zeit an. Nach einem Appwechsel oder Neuladen
bleiben Münzen, Position und Restzeit erhalten. Ein beendeter Versuch bleibt
auch im Testmodus verbraucht; der Ort zeigt dann das Ergebnis. Wer vorzeitig
aufhören möchte, bestätigt ausdrücklich das Ende seines einzigen Versuchs.
Alle Münzen haben denselben hellen Pling-Ton. Zweimal schnell nach unten
(Pfeiltaste, S oder die Touch-Steuerung) lässt den Ritter durch den aktuellen
Sims fallen; der Boden bleibt fest. Sind alle Münzen eingesammelt, endet der
Versuch sofort und zeigt die gespeicherte benötigte Zeit als Rekord an.

Gesperrte Orte bleiben auf den Weltkarten vollständig unsichtbar, einschließlich
Namen und Schatten. Beim ersten Kartenbesuch nach einer Freischaltung wächst
der Weg vom bekannten Ort zum neuen Ziel; erst dann erscheint dessen Marker.
Aufgedeckte Wege werden gespeichert. Ein unterbrochener Aufbau wird beim
nächsten Besuch erneut gezeigt. Im Testmodus sind alle Orte sofort sichtbar.
Bestehende Spielstände behalten ihre Freischaltungen.

Nach dem Fremdweg, den Kristalltiefen und dem Lianenpfad folgt jeweils eine kurze
animierte Drachenspur, bevor es zur Weltkarte zurückgeht: Spuren führen zum
Tunnel, ein drachenförmiges Loch samt Urlaubswerbung weist in den Urwald,
weitere Spuren führen zum See. Der Drache selbst bleibt außer Sicht. Jede Szene
läuft einmal und kann mit Leertaste, Enter oder Antippen übersprungen werden.
In der Wüste liegen die dezenten Spuren von Anfang an entfernt im Sand. Der
Helfer bemerkt sie mit einem roten Ausrufezeichen und hüpft hin. Eine Nahaufnahme
zeigt den Fund mit beiden Figuren, dann folgt der Ritter ihm in der Totalen
bis in die Höhle. Beim Schnitt behalten Figuren und Spuren ihre Position.
[Schauplätze und Bildprompts](assets/story/README.md).

`?story=all` spielt Intro, Wüstenspur, Unterwelthinweis und Urwaldspur direkt
hintereinander ab und endet im Hauptmenü. Überspringen geht jeweils zur nächsten
Szene. Die Vorschau verändert keinen Fortschritt und markiert keine Hinweise als
angesehen; Neuladen startet die Vorführung erneut.

Im Hauptmenü öffnet „Kino“ die Filmauswahl. Das Intro ist immer verfügbar;
Wüstenspur, Drachenloch und Seespur erscheinen nach dem jeweiligen Levelabschluss.
Auch ältere Abschlüsse sowie bereits gesehene oder noch anstehende Hinweise
zählen. Alle freigespielten Filme bleiben gleichzeitig sichtbar und lassen sich
einzeln oder mit „Alle ansehen“ in Reihenfolge abspielen. Danach geht es zurück
ins Kino mit derselben Auswahl. Wiederholungen ändern keinen Spielfortschritt.
Der Testmodus `?unlockAll=1` zeigt alle Filme, ohne sie im Spielstand freizuschalten.

[Grafiken und Bildbeschreibungen](assets/common/experts/README.md).

Auf den Karten sind die Experten Forschungsstationen mit Buchschild, Teleskop
und Wimpel; Bauweise und Pflanzen passen zur jeweiligen Welt. Orte stehen direkt
im Gelände. [Neue Ortsgrafiken und Prompts](assets/worldmap/README.md).
Wanderpfade und felsige Gänge teilen ihre Kurven mit der Gehbewegung.

`?unlockAll=1` öffnet alle Welten, Orte und das Schlüsseltor, einschließlich der
Verbindung vom Fremdweg zur Unterwelt. Das setzt keine Levelabschlüsse voraus.
Mit `&world=desert`, `&world=underground` oder `&world=jungle` wird die Welt gewählt;
das Intro endet weiterhin im Hauptmenü. `&skipIntro=1` führt für Tests direkt zur Karte.

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

`tests/intro-navigation.test.cjs` prüft den gesamten Eingabeweg von Laden und
Intro bis zum verzögerten Menüwechsel und „Weiterspielen“ in jeder Welt.
Zusätzlich unter dem laufenden Webserver
[tests/browser-regressions.html](tests/browser-regressions.html) öffnen und
**Intro-Tests starten** drücken. Diese Prüfungen laden die aktuelle Spielseite
mit echtem Phaser, Assets und Szenen: frühe und gehaltene Tasten, Überspringen,
wiederholte Kino-Besuche, automatisches Ende und Fortsetzen per Enter oder Klick.
Der Testspielstand liegt ausschließlich im Arbeitsspeicher. **Hebel prüfen**
zeigt außerdem die drei Nahaufnahmen für Ritter und Ritterin an; Greifen,
Mitte und Ende lassen sich einzeln betrachten. Die normalen Tests sichern neben
den Armlängen auch die Rüstungs- und Handschuhbreite anhand der Atlasmaße ab.

### Levelziele und Lesbarkeit

| Level | Ziel und geprüfte Klarheit |
| --- | --- |
| Wüstenruine | 100 Münzen zum Aufbau beitragen. Ein sichtbarer Münzplatz vor dem Tor leuchtet grün, sobald eine Abgabe möglich ist. Auch einzelne Münzen zählen. Fortschritt und bezahltes Gold werden gemeinsam gespeichert; feste Wände halten Ritter und Gegner aus dem Gemäuer. |
| Wüstenendlos | Durchhalten und den später auftauchenden Maulwurf-Boss besiegen. Der Zeittext nennt dieses Ziel, damit der Spieler nicht vergeblich einen Ausgang sucht. |
| Fremdweg | 200 Steine sammeln und den Boss besiegen. Die Zielanzeige sagt auch nach dem Bosskampf, ob noch Steine fehlen. Die kurze Ansage erklärt das Zerschlagen und Einsammeln. |
| Erdgang | Den Schlüssel suchen und damit zum Tor links zurückkehren. Die Zielzeile ändert sich nach dem Fund; der Abschlusstext unterscheidet den Ausgang vom großen Schlüsseltor auf der Karte. |
| Steinwächtermine | Bis zum Steinwächter vordringen. In der Arena weicht das Wegziel der vorhandenen Anzeige für Ausweichen und verwundbare Phasen. |
| Kristalltiefen | Den Obsidian-Titan bezwingen, unterwegs optionale Truhen suchen. Truhen geben wie im Erdgang 25 Gold und bleiben nach dem Öffnen dauerhaft geleert. |
| Kokoskronen | Nach oben zum Affenkönig gelangen. Sein Sieg öffnet Shop und Lianenpfad; die Anzeige verspricht keinen Sieg über alle normalen Affen. |
| Lianenpfad | Die Lianen hinauf zur goldenen Kokosnuss. Ein leuchtender Ring macht das Ziel zwischen anderen Kokosnüssen erkennbar. |
| Goldoase, Funkelkammer, Goldwipfel | Je eine feindfreie Münzjagd mit eigener Landschaft, sichtbarer Restzeit und gespeichertem einzigen Versuch. |

Alle Wüstenlevel verwenden gemalte Büsche mit separat sammelbaren Beeren.
Die Ruine steht mit passenden Schatten, Maßstab und freier Vorfläche im
Spielfeld; Sammelobjekte verstecken sich nicht dahinter.
[Neue Wüstengrafiken und Bildprompts](assets/desert/README.md).

Shopgespräche verdecken das Warenangebot vollständig, bis das Gespräch zu Ende
ist. Danach erscheinen wieder die klickbaren Waren. Begrüßungen und Kauftexte
nennen die tatsächlichen Funktionen von Schild, Hammer und Bogen. Die
Expertentipps bleiben auf die jeweilige Welt begrenzt, der Hammertrainer erklärt
weiterhin Antippen, gelbes, rotes und blaues Aufladen anhand der tatsächlichen
Spielereingabe.

Die Drachenspur-Filme erzählen durch Bewegungen, Gesten und Kameraschnitte statt
durch Untertitel. Unter Tage zeigt eine echte Aufnahme über der Schulter den
Ritter mit dem Prospekt in den Händen. Im Urwald führen nasse Spuren, ein
kleiner Wasserschreck und ein verlorener Schatz zum See.
[Neue Filmassets, Ablauf und vollständige Bildprompts](assets/story/README.md).

Offener Vorschlag zur Balance: Im Wüstenendlos-Level erscheint der Boss erst
nach drei Minuten. Für kürzere Runden mit jüngeren Kindern ließe sich dieser
Vorlauf später verkürzen; die Kampfwerte bleiben bei dieser Überarbeitung
unverändert. Die Wasserwelt ist weiterhin nur ein Ufer ohne spielbare Level.

## Projektstruktur

- `index.html`: Einstiegspunkt
- `style.css`: Grund-Layout
- `src/main.js`: Phaser-Konfiguration
- `src/scenes`: Hauptmenü, Kino, Weltkarten, Level, Shops und Hammertraining
- `src/saveManager.js`: Spielstand in `localStorage`

## Karten, Urwaldsee und faire Kokoswürfe

Die Unterwelt hat nun einen Hintergrund ohne doppelte, fest eingezeichnete
Höhleneingänge. Erdgang, Händler, Tor, Steinwächtermine, Kristalltiefen und
Expertenhütte stehen auf den passenden Felssimsen. Durchgehende felsige Wege
machen die Laufstrecken sichtbar. Der Laden heißt auf der Karte Untergrundshop.
Das Schlüsseltor versperrt den einzigen Zugang zur Mine: Der Ritter hält auf der
Shopseite an, bis er es aufschließt. Das offene Tor besteht aus Pfosten und
aufgeschwenkten Gitterflügeln; der Ritter läuft durch den Engpass der Karte statt
in einen gemalten Tunnel. Die internen Level-IDs bleiben für alte Spielstände
erhalten.

Auf der Urwaldkarte folgen die Laufstrecken den vorhandenen gemalten Pfaden,
auch zur Kristallhöhle zurück in die Unterwelt. Vom rechten Rand des Lianenpfads
führt ein Übergang zur Wasserwelt: zunächst nur ein begehbares Ufer am Urwaldsee
mit einem Schnorchel-Schild. Dort gibt es noch keine Level und keinen käuflichen
Schnorchel. Tastatur, Antippen, Inventar und die Rückreise in den Urwald funktionieren
wie auf den anderen Weltkarten. Mit `?unlockAll=1&world=water` lässt sich das Ufer
direkt testen; das Intro führt wie bisher zuerst zum Hauptmenü.

Affen und Affenkönig schauen sich vor einem Wurf zunächst um. Sobald sie
ausholen, werden Ziel und Wurfrichtung festgehalten; danach wird nicht mehr
nachgezielt. Der sicht- und hörbare Wurf und ein kurzes Nachschwingen folgen
darauf. Treffer unterbrechen einen normalen Affen weiterhin.

Die neuen Hintergründe und alle Bildprompts liegen in
[assets/worldmap](assets/worldmap/README.md), die Posen fürs Hochziehen in
[assets/common/characters](assets/common/characters/mantle-atlas.README.md).

Schwert und Power Hammer haben in Unterwelt und Urwald flüssige, mehrteilige
Angriffsanimationen für Ritter und Ritterin, auch geduckt. Die sichtbare Waffe
zeigt die tatsächliche Reichweite; die rechteckige Angriffsmarkierung entfällt.
Grafiken, vollständige Bildprompts und Details zur Animation liegen in
[assets/common/characters/melee](assets/common/characters/melee/README.md).

## Geheimer Testmodus

Die nicht im Spiel beworbene Taste `3` öffnet die Freischaltungen im Hauptmenü,
auf Weltkarten und in Leveln. Sie funktioniert auch im iPad-Tastaturprofil.
Welten sowie einzelne Orte lassen sich sperren und freischalten; mit „Alle Orte
freischalten“ öffnet man die normalen Orte einer Welt auf einmal. Die geheimen
Schalter haben eigene Einstellungen. Im Erdgang ist hier außerdem der vorhandene
Level-Editor erreichbar; `2` und `4` behalten ihre bisherigen Debugfunktionen.

„Übernehmen“ speichert die Änderungen und kehrt ins Hauptmenü zurück. „Abbrechen“
oder erneut `3` verwirft den Entwurf. Während das Menü offen ist, pausiert das Spiel.
Die manuellen Einstellungen bleiben beim Neuladen und auch mit `?unlockAll=1`
erhalten. Eine Weltsperre behält deren Level-Fortschritt, Inventar und Gold.

Ein Schalter-Reset versteckt den Geheimort wieder und entfernt seinen verbrauchten
Versuch, Zwischenstand, gesammelte Levelmünzen und Rekord. Bereits verdientes Gold
bleibt erhalten. Der Hebel kann danach im Level erneut umgelegt werden; alternativ
lässt sich das Geheimlevel über seine Schalter-Einstellung sofort wieder freischalten.
