# Nahkampfanimationen im Jump-and-run

Die neuen Grafiken wurden mit der eingebauten Bildgenerierung erstellt. Die
vorhandenen Ritter-, Ritterinnen- und Hammergrafiken dienten als Stilreferenz.
Die PNGs enthalten echte Transparenz; die bisherigen Grafiken bleiben erhalten.

| Grafik | Inhalt | Vollständiger Prompt |
| --- | --- | --- |
| [attack-bodies.png](attack-bodies.png) | Je drei Körperposen für Ritter und Ritterin, stehend und geduckt. Ohne Waffenarm, damit die sichtbare Waffe unabhängig schwingen kann. | [attack-bodies.txt](prompts/attack-bodies.txt) |
| [attack-parts-v2.png](attack-parts-v2.png) | Gerade Oberarm- und Unterarmteile, separater Handschuh und Schwert mit längerer Klinge. Aktuelle Arm- und Schwertgrafik. | [attack-parts-v2.txt](prompts/attack-parts-v2.txt) |
| [attack-parts.png](attack-parts.png) | Enthält weiterhin den verwendeten Power Hammer. Die frühere Schwert- und Armversion bleibt als Referenz erhalten. | [attack-parts.txt](prompts/attack-parts.txt) |

`src/utils/MeleeAnimation.js` registriert pro Figur und Haltung 13 klare
Körperphasen. Kleine Verformungen zwischen den gezeichneten Schlüsselposen
halten die Füße an derselben Bodenlinie. Arm und Waffe bewegen sich zusätzlich
in jedem gerenderten Bild, mit getrennten Schulter-, Ellbogen-, Handgelenk- und Griffpunkten.
Die Physikfigur behält ihre bisherige Größe und Kollisionsform.

Der Schulterdrehpunkt liegt innerhalb des Schulterpanzers. Ober- und Unterarm
werden beim Heranziehen der Hand perspektivisch verkürzt; ihre Dicke und die
Handschuhgröße bleiben erhalten. Der Ellbogen liegt zwischen Schulter und
Handgelenk und kann dadurch nicht hinter die Hand zurückklappen. Bei eng
angelegter Hand verdecken Rüstung und Handschuh die verkürzten Ärmel.

Die aktuelle Schwertgrafik hat eine längere Klinge und einen kompakteren Griff.
Die sichtbare Klinge ist rund die Hälfte länger als in der ersten Animation;
die gesamte Angriffsreichweite bleibt gleich.

Unterwelt und Urwald verwenden für Trefferprüfung und Darstellung dieselben
Angriffsgrenzen. Während des aktiven Schlags reicht die tatsächliche Silhouette
der Schwertspitze bzw. des Hammerkopfs genau bis an die vordere Treffergrenze.
Dazu wird die transparente Waffensilhouette vermessen; gedrehte Ecken des
Hammerkopfs zählen mit. Automatisches Zielen, Blickrichtung und Ducken werden
berücksichtigt. Die rechteckige Hervorhebung im Urwald entfällt. Die ausdrücklich
aktivierten Hitbox-Debugwerkzeuge der Unterwelt bleiben verfügbar.

Reichweite, Schaden, Ausholzeit und Trefferfenster bleiben erhalten. Auf die
Attacke folgt eine kurze rein visuelle Rückbewegung, die einen neuen Angriff
nicht verzögert. Der Hammerschlag in der Luft und seine Landung haben eigene
Waffenhaltungen; die Landung erzeugt keinen zusätzlichen normalen Nahkampftreffer.
Animation und Ausholen bleiben bei geöffneten Pausen- und Inventaransichten
stehen. Bogenwechsel, Klettern, Niederlage und Szenenwechsel räumen die
zusätzlichen Darstellungsebenen auf.

Validierung: automatisierte Reichweiten-, Richtungs-, Haltungs-, Pausen-,
Wechsel- und Aufräumtests in `tests/melee-animation.test.cjs`. Die Tests prüfen
auch, dass der Ellbogen nicht nach innen zurückklappt und der Handschuh beim
Beugen seine Größe behält. Zusätzlich wurden
im laufenden Spiel 32 Randtreffer-Kombinationen überprüft (beide Welten,
Figuren, Waffen, Blickrichtungen und Haltungen), sowie Bogenwechsel und
Lianengriff. Die Randtreffer prüfen jeweils einen Gegner knapp innerhalb und
einen knapp außerhalb der sichtbaren Reichweite.
