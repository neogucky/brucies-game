# Das Burgzimmer-Intro

Eine 27,8 Sekunden lange 2D-Sequenz mit getrennten Kulissen und transparenten
Figuren. Die Grafiken wurden mit der integrierten Bildgenerierung erstellt.
Das vorhandene Titelbild und die Spielfiguren dienen als Stil- und Figurenreferenz.
Originaldateien bleiben unverändert; BootScene registriert die ausgeschnittenen
Posen im Browser auf Leinwänden mit festen Größen und gemeinsamer Bodenlinie.

| Grafik | Verwendung | Vollständiger Prompt |
| --- | --- | --- |
| [bedroom.png](bedroom.png) | Burgzimmer, freier Platz für Bett und Helfer, offenes Fenster; die Drachenprojektion liegt auf dem Holzboden | [bedroom.txt](prompts/bedroom.txt) |
| [exterior.png](exterior.png) | Blick über die Burg mit freiem Himmel für den Drachen | [exterior.txt](prompts/exterior.txt) |
| [bed.png](bed.png) | Leeres Bett als feste Möbelebene; ursprüngliche Ritterposen bleiben als Referenz erhalten | [bed.txt](prompts/bed.txt) |
| [bed-awake.png](bed-awake.png) | Stil- und Figurenreferenz für die getrennten Ritterposen | [bed-awake.txt](prompts/bed-awake.txt) |
| [knight-poses.png](knight-poses.png) | Acht getrennte Ritterposen: Schlafen, Gähnen, Aufwachen, Vorbereitung, Absprung, Flug, Landung und Bereitstehen | [knight-poses.txt](prompts/knight-poses.txt) |
| [helper.png](helper.png) | Schlafen, neugieriges Schauen, am Fenster spähen und Hüpfen | [helper.txt](prompts/helper.txt) |
| [dragon.png](dragon.png) | Zwei Flugphasen des freundlichen Drachen mit Münzen, Truhe, Edelsteinen und Krone | [dragon.txt](prompts/dragon.txt) |

Die Animation ist keine Videodatei: Bewegungen, Schatten auf dem Boden, Sprünge,
Funkeln, Überblendungen und Credits werden direkt im Spiel zusammengesetzt.
Die vorgegebene Einstellung für reduzierte Bewegung verkleinert die Sprünge.
Das Bett verwendet während der gesamten Zimmersequenz dieselbe Textur und
Position. Ritter und Vorderkante des Betts liegen auf getrennten Ebenen. Die
neuen Ritterposen werden nach Gesichtsgröße ausgerichtet; Vorbereitung,
angewinkelte Beine im Flug, Landekniebeuge und Aufrichten erhalten eigene Posen.

## Ton

Die sieben Tondateien einschließlich Musik sind eigene, deterministisch synthetisierte
Aufnahmen. Keine heruntergeladenen Musikstücke oder Sprachaufnahmen.

- [Musik](sounds/music.wav)
- [Schnarchen](sounds/snore.wav)
- [Flügelschlag / Wusch](sounds/whoosh.wav)
- [Hüpfen](sounds/hop.wav)
- [Aufweck-Hüpfer](sounds/boing.wav)
- [Gähnen](sounds/yawn.wav)
- [Aufbruch-Klang](sounds/chime.wav)

Mit [generate_intro_audio.py](../../tools/generate_intro_audio.py) lassen sich die
WAV-Dateien ohne zusätzliche Pakete neu erstellen. Der Film startet ohne Startknopf und versucht auch den Ton automatisch zu starten.
Ein gesperrter Web-Audio-Kontext wird bei einer normalen Berührung/Taste freigegeben,
ohne Geräusche aus vergangenen Szenen nachzuholen. Tabwechsel pausieren Bild und Ton;
beim Verlassen werden sämtliche Stimmen und der Kontext geschlossen.

## Abfolge

1. Ritter und Helfer schlafen. „Spielidee von Brucy“ wird eingeblendet.
2. Bereits nach etwa zwei Sekunden wecken ein Wusch und ein durch das Fenster auf den Holzboden geworfener Drachenschatten den Helfer.
3. Der Helfer hüpft ans Fenster. Schnitt zum Drachen mit seiner Schatzladung.
4. „Entwickelt mit Onkel Tim“ erscheint im freien Himmel.
5. Zurück im Zimmer: Der Helfer hüpft zum Bett und weckt den Ritter durch Hüpfen.
6. Schlaf-„z“ steigen vom Ritter auf, bis er aufwacht. Er gähnt, schaut zum Helfer,
   holt Schwung, springt aus dem Bett und federt die Landung mit den Knien ab.
7. Der Titel erscheint; danach öffnet sich immer das Hauptmenü.

## Perspektive und Bedienung

Die Drachenprojektion ist flach auf dem Boden verzerrt und auf die beleuchtete
Bodenfläche begrenzt. Bett und Figuren liegen vor ihr. Im Außenbild werden
Fensterrahmen, Fensterbank und nahe Burgtürme aus derselben Kulisse über der
Flugebene gezeichnet. Der Helfer bleibt im Vordergrund auf der Fensterbank;
der Drache fliegt im Außenraum hinter der nahen Architektur vorbei.

Das einzige Bedienelement des Films ist ein dezentes „Überspringen“-Overlay
unten rechts. Die zugehörige Taste ist Leertaste in beiden Tastaturprofilen.
Es gibt keinen Startknopf, Ton-Schalter, Erklärungstext oder Gerätenamen.
