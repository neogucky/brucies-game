# Orte und Wanderwege der Weltkarten

Die neuen transparenten Ortsgrafiken wurden mit der integrierten Bildgenerierung
erstellt. Das Titelbild diente als Stilreferenz. Die ursprünglichen Bilder bleiben
erhalten; die Karten verwenden die neuen Varianten ohne runde Sockel.

| Grafik | Orte | Vollständiger Prompt |
| --- | --- | --- |
| [places-desert.png](places-desert.png) | Ruine, Taverne, Oase, Steinbruch, geöffneter Tunnel, Wüstenexperte | [places-desert.txt](prompts/places-desert.txt) |
| [places-underground.png](places-underground.png) | Erdgang, Shop, geschlossenes und geöffnetes Schlüsseltor, Kristalltiefen, Unterweltexperte | [places-underground.txt](prompts/places-underground.txt) |
| [places-jungle.png](places-jungle.png) | Kokoskronen, Lianenpfad, Urwald-Shop, Urwaldexperte | [places-jungle.txt](prompts/places-jungle.txt) |

Die Forschungsstation ist in allen Welten an Buchschild, Teleskop und Wimpel
erkennbar. Baumaterialien, Dach und Pflanzen passen zur jeweiligen Welt. Der
Professor erscheint erst beim Besuch im Gespräch.

BootScene richtet die Orte am Boden aus, ohne sie zu verzerren. Einheitliche
Beschriftungen und schlichte Bodenschatten ersetzen leuchtende Sockel.
Der Urwaldexperte liegt auf einer eigenen Lichtung unterhalb der Kokoskronen.

Die Wege zeichnet das Spiel aus denselben Kurven, denen Ritter und Helfer folgen:
unregelmäßige Sandspuren in der Wüste, erdige Pfade mit Blattwerk im Urwald und
felsige Gänge mit Kristallen in der Unterwelt. Sie haben keine Mittelstreifen.
Die Gehgeschwindigkeit bleibt von der Entfernung abhängig.

Die neue Intro-Grafik liegt unter [bed-layers.png](../intro/bed-layers.png);
der vollständige Prompt unter [bed-layers.txt](../intro/prompts/bed-layers.txt).
Auch diese Bett- und Deckenebenen wurden mit der integrierten Bildgenerierung
erstellt. [Aufbau und Animation des Intros](../intro/README.md).
# Landschaft und Übergänge

`underground-terrain.png` ersetzt den alten Unterwelt-Hintergrund im Spiel.
Er enthält freie Stellflächen statt fest eingezeichneter Höhleneingänge; die
bestehenden Ortsgrafiken stehen dort auf zusammenhängenden Felssimsen. Das Tor
liegt im Engpass zwischen Händler und Steinwächtermine. Erst hinter der Mine
führt der Weg zu den Kristalltiefen. Der interne Speichername `Schluesselweg`
bleibt erhalten, damit alte Spielstände funktionieren.

Im Urwald bleibt das vorhandene Hintergrundbild erhalten. Die begehbaren Pfade
werden mit Sand aus einer freien Lichtung des Bildes texturiert. Die Kurven,
denen der Ritter folgt, zeichnen so gleichzeitig den sichtbaren Weg. Jeder
Abzweig führt an seinem Ort zunächst klar nach links, rechts, oben oder unten;
`JUNGLE_PATH_PORTS` legt dieselbe Richtung für Zeichnung und Tastatur fest.
Kokoskronen und Shop haben ihre Plätze getauscht. Von Kokoskronen führen die
Wege links zur Kristallhöhle, unten zum Experten und rechts zum Shop. Eine
bewachsene Barriere sperrt den Shopweg bis zum Sieg in Kokoskronen. Der Experte
bleibt vorher erreichbar. Im Testmodus sind die Sperren geöffnet. Ritter und Helfer
verschwinden beim Laufen hinter hohen Ortsgrafiken, statt auf deren Dächern zu stehen.

`water-world.png` ist die neue Uferkarte der Wasserwelt. Am Urwaldsee gibt es
noch keine spielbaren Level. Über den rechten Weg am Lianenpfad erreicht man
das Ufer; zurück geht es zum Lianenpfad. Das Holzschild mit rotem Ring um Maske
und Schnorchel wird direkt gezeichnet und weist auf die später nötige Ausrüstung hin.

Beide neuen Hintergründe wurden mit der integrierten Bildgenerierung erstellt.
Die PNG-Originale bleiben unverändert. Im Spiel werden kleinere JPEG-Exporte
mit identischer Auflösung geladen, damit die mobilen Geräte weniger laden müssen.
Die vollständigen Prompts stehen in
[prompts/underground-terrain.txt](prompts/underground-terrain.txt) und
[prompts/water-world.txt](prompts/water-world.txt). Die neuen Kletterposen und ihr
Prompt sind in [mantle-atlas.README.md](../common/characters/mantle-atlas.README.md) dokumentiert.
