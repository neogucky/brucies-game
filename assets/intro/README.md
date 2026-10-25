# Das Burgzimmer-Intro

Eine 30,5 Sekunden lange 2D-Sequenz mit getrennten Kulissen und transparenten
Figuren. Die sechs Grafiken wurden mit der integrierten Bildgenerierung erstellt.
Das vorhandene Titelbild und die Spielfiguren dienen als Stil- und Figurenreferenz.
Originaldateien bleiben unverändert; BootScene registriert die ausgeschnittenen
Posen im Browser auf Leinwänden mit festen Größen und gemeinsamer Bodenlinie.

| Grafik | Verwendung | Vollständiger Prompt |
| --- | --- | --- |
| [bedroom.png](bedroom.png) | Burgzimmer, freier Platz für Bett und Helfer, offenes Fenster für den Drachenschatten | [bedroom.txt](prompts/bedroom.txt) |
| [exterior.png](exterior.png) | Blick über die Burg mit freiem Himmel für den Drachen | [exterior.txt](prompts/exterior.txt) |
| [bed.png](bed.png) | Schlafender Ritter, Gähnen, leeres Bett und kampfbereiter Ritter | [bed.txt](prompts/bed.txt) |
| [bed-awake.png](bed-awake.png) | Aufgewachter Ritter schaut zum Helfer | [bed-awake.txt](prompts/bed-awake.txt) |
| [helper.png](helper.png) | Schlafen, neugieriges Schauen, am Fenster spähen und Hüpfen | [helper.txt](prompts/helper.txt) |
| [dragon.png](dragon.png) | Zwei Flugphasen des freundlichen Drachen mit Münzen, Truhe, Edelsteinen und Krone | [dragon.txt](prompts/dragon.txt) |

Die Animation ist keine Videodatei: Bewegungen, Schatten am Fenster, Sprünge,
Funkeln, Überblendungen und Credits werden direkt im Spiel zusammengesetzt.
Die vorgegebene Einstellung für reduzierte Bewegung verkleinert die Sprünge.

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
WAV-Dateien ohne zusätzliche Pakete neu erstellen. Der Startknopf gibt den Ton
über einen eigenen Web-Audio-Kontext frei. Tabwechsel pausieren Bild und Ton;
beim Verlassen werden sämtliche Stimmen und der Kontext geschlossen.

## Abfolge

1. Ritter und Helfer schlafen. „Spielidee von Brucy“ wird eingeblendet.
2. Ein Wusch und ein Drachenschatten am Fenster wecken den Helfer.
3. Der Helfer hüpft ans Fenster. Schnitt zum Drachen mit seiner Schatzladung.
4. „Entwickelt mit Onkel Tim“ erscheint im freien Himmel.
5. Zurück im Zimmer: Der Helfer hüpft zum Bett und weckt den Ritter durch Hüpfen.
6. Der Ritter gähnt, schaut neugierig zum Helfer und springt kampfbereit heraus.
7. Der Titel erscheint; danach öffnet sich das Menü bzw. die gewählte Testwelt.
