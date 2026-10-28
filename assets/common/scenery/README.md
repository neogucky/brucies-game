# Bemalte Geheimhebel

Mit dem eingebauten imagegen-Werkzeug erzeugte, unveränderte transparente
Spritesheets. Jede Datei enthält links den festen Sockel und rechts den
beweglichen Hebelarm. Es gibt keine umgebende Bodenfläche oder Markierung.

- Wüste: [Grafik](lever-desert-v1.png), [vollständiger Prompt](lever-desert-v1.prompt.txt).
- Unterwelt: [Grafik](lever-underground-v1.png), [vollständiger Prompt](lever-underground-v1.prompt.txt).
- Urwald: [Grafik](lever-jungle-v1.png), [vollständiger Prompt](lever-jungle-v1.prompt.txt).

`src/utils/LeverVisual.js` registriert Ausschnitte des Originals als Phaser-Frames.
Hinge und Griff sind je Grafik vermessen. Der Sockel bleibt am Boden; der Arm
dreht sich um das gemalte Gelenk, und der Griff folgt in der Nahaufnahme exakt
der Hand des Ritters bzw. der Ritterin. Die Nahaufnahme verwendet dieselben
Texturen wie das Level. Im Level ist der Arm für bessere Lesbarkeit quer zur
Schaftrichtung verbreitert; die Nahaufnahme behält die ursprünglichen Proportionen.
Sockel und Arm stehen hinter dem gesamten Ritter. Der Wüstenhebel steht auf
freiem Sand am unteren Rand. Der Busch liegt über dem Mechanismus und lässt
ihn durch seine Blätter erahnen. Die Nahaufnahme hat einen größeren Hebel und
feste Längen für Oberarm und Unterarm, die sich am Ellenbogen bewegen. Die
Rüstungsbreite des Ritters bleibt dabei körpergerecht: Oberarm etwa 27 Pixel,
Unterarm etwa 22 Pixel und Handschuh etwa 21 Pixel hoch bei diesem Kameramaßstab.

Die Originale sind 1536 × 1024 Pixel mit echtem Alphakanal. Transparente Bereiche
werden nicht durch Weiß, Schwarz oder eine aus dem Bild abgeleitete Fläche ersetzt.
