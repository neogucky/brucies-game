# Rechtshändiger Power Hammer

near-bodies-v1.png: 18 Körper mit leerer linker Hand; Ritter und Ritterin, jeweils stehend, geduckt und in der Luft. Die rechte Schulter liegt beim Blick nach rechts vorn. Beim Blick nach links nutzt der Hammer die passenden Körper aus sword-b/left-far-bodies-v1.png und bleibt mit dem rechten Arm hinter dem Oberkörper.

Oberarm, Unterarm, Handschuh und Hammer bleiben separate gemalte Teile. Rüstungsbreiten und Handschuhgröße ändern sich weder beim Ausholen noch beim Strecken. Der normale stehende Schlag holt mit dem ganzen Arm aus, führt durch beide Tile-Reihen und endet am Boden. Geduckt stößt der Ritter nach vorn, ausschließlich in der unteren Reihe. Aufladung und Sprungschlag behalten ihre eigenen Abläufe.

Die Breite wird aus mehreren Querschnitten der tatsächlich deckenden Bildpixel
ermittelt. Transparente Ränder sowie die besonders breite Schulterkappe zählen
nicht als Ärmelbreite. Oberarm, Unterarm und Faust werden damit auf den
Figurenmaßstab abgestimmt; derselbe korrigierte Darstellungsweg gilt auch für
die zusammengesetzten Schwertarme und Meister Mucks Vorführungen.

`tests/arm-silhouette.test.cjs` liest die originalen PNGs und misst die
sichtbaren Ärmel nach dem tatsächlichen Bildtransformieren, einschließlich
Drehung und Spiegelung. Eine Kontrollprüfung erkennt ausdrücklich die frühere,
zu dünne Darstellung. `tests/level-animation-review.html?gallery=arms` zeigt
Standpose, Ausholen, Treffer und Nachschwung bei identischem Maßstab nebeneinander.

near-bodies.json enthält gemessene Ausschnitte, Fuß- und Schulteranker. tools/inspect-hammer-bodies.py misst das Original, ohne Bildpixel zu verändern. Die Spielphysik und Schadenswerte bleiben unverändert.

Erstellt mit dem eingebauten ImageGen. Exakter Prompt und Quelldatei stehen in prompts.json.


## Griff und eigener Hammerablauf

[grip-hands-v1.png](grip-hands-v1.png) enthält gemalte geschlossene Griffhände
für die nahe und ferne rechte Hand sowie Lederhandschuhe für Meister Muck.
Erstellt mit dem eingebauten ImageGen; der genaue Prompt und die Quelle stehen
in [grip-prompt.json](grip-prompt.json). [grips.json](grips.json) hält Palmmitte,
Stielachse und Handgelenköffnung als unabhängig vermessene Anker fest.

Der Hammer dreht sich mit der Hand. Der Stiel liegt quer durch die Handfläche;
die Ärmel enden in der gemalten Manschette. Gegriffen wird am Holz, nicht am
goldenen Knauf. Oberarm und Unterarm holen über die Schulter aus und führen
den Hammerkopf nach unten. Beim Bodenkontakt ist der Stiel etwa waagerecht,
sodass die metallene Schlagfläche und nicht die verzierte Kopfseite auftrifft.
Das Schwert behält seinen eigenen Ablauf. Geduckt bleibt es ein tiefer Vorstoß.

Die Pixelregression prüft zusätzlich die tatsächliche Stielachse in der
Handgrafik gegen die Hammerausrichtung und die Verbindung der Manschette mit
dem Unterarm – für beide Ansichten, den Trainer, Aufladen, Abschwung,
Sprungschlag und Rückkehr. Die bestätigten Arm- und Handbreiten bleiben erhalten.


Ausholen und Rückkehr verwenden den tatsächlichen Griffanker der Ruhepose.
Dadurch bleibt der Holzstiel auch beim Wechsel zur normalen Figur an derselben
Stelle. Im Vergleich ist dieser Übergang mit „Zurücknehmen“ einzeln prüfbar.


## Anatomieprüfung und weicherer Zeichenstil

Aktuell sind [grip-hands-v2.png](grip-hands-v2.png) und
[grips-v2.json](grips-v2.json) aktiv. Die kompakte braune Lederhand mit kurzem
blauen Handgelenkschutz entspricht der freien Hand des Ritters. Der Stiel liegt
schräg in der Handfläche. Prompt und Herkunft des eingebauten ImageGen stehen
in [grip-prompt-v2.json](grip-prompt-v2.json); die vorige Grafik bleibt als
Referenz erhalten.

Die Ellbogenberechnung verwendet die natürliche Beugerichtung im Seitenprofil:
Bei vor/über der Schulter gehaltener Hand liegt der Ellbogen vorn und unterhalb
der Verbindung zur Hand. Der umgekehrte Gelenkverlauf ist ausdrücklich ungültig.
Die Projektion begrenzt die Beugung; beim tiefen Vorstoß wird der Arm gestreckt.
Dabei bleibt die Ärmelbreite erhalten. Der tatsächlich gemalte Weg von Manschette
zu Palmmitte wird zusätzlich mit dem Unterarm abgeglichen, damit eine starre
Griffgrafik kein rückwärts geknicktes Handgelenk erzwingt.

Die Armteile bekommen im Renderer etwas weniger Kontrast und Sättigung sowie
sanft geglättete Konturen. Opazität, Breite, Griffpunkt und Waffenreichweite
bleiben davon unabhängig. Es sind lokale Phaser-Pre-FX nur für die drei Armteile;
Körper und Waffen bleiben unverändert. API-Grundlage:
[Phaser 3.80.1 FX](https://github.com/phaserjs/phaser/blob/v3.80.1/src/gameobjects/components/FX.js).

Die Regressionen enthalten unabhängige Referenzposen, eine absichtlich rückwärts
geknickte Kontrollpose, Winkelgrenzen und die Prüfung der gemalten Griffanker.
Die Spielprobe kann Schulter, Ellbogen, Handgelenk und Palmmitte einblenden und
prüft die Gelenke in echten Untergrund- und Urwaldangriffen.


Bei der Tragepose kann der Unterarm stärker zur Kamera zeigen. Seine projizierte
Länge darf dort separat kürzer werden, damit weder Ellbogen noch Handgelenk
umgekehrt beugen. Die deckende Breite bleibt erhalten; die Rückbewegung wird
mit den echten Griffankern der Ruhepose ebenfalls geprüft.
