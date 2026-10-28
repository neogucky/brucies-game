# Wüstengrafiken

Die neuen PNGs wurden mit der integrierten Bildgenerierung erstellt. Sie
verwenden das vorhandene Wüstenspielfeld und den bisherigen Ritter als
Stilreferenzen. Originale bleiben erhalten; Phaser registriert aus den neuen
Atlanten passende Einzeltexturen, ohne die Quelldateien zu verändern.

| Grafik | Verwendung | Vollständiger Prompt |
| --- | --- | --- |
| [ruin-states-v2.png](ruin-states-v2.png) | Zwei Zustände desselben Sandsteintors, mit identischer Bodenlinie und gleichem Maßstab | [ruin-states-v2.txt](prompts/ruin-states-v2.txt) |
| [ruin-repair-steps-v3.png](ruin-repair-steps-v3.png) | Zwei passende Zwischenstufen: aufgeräumtes Fundament und wieder aufgebaute Mauern mit noch fehlenden Zinnen | [ruin-repair-steps-v3.txt](prompts/ruin-repair-steps-v3.txt) |
| [shrub-v2.png](shrub-v2.png) | Gemalte Wüstenbüsche in allen drei Wüstenleveln | [shrub-v2.txt](prompts/shrub-v2.txt) |

Die neue Ruine steht im oberen Teil des Spielfelds auf einem Bodenschatten.
Eine feste Grundfläche verhindert, dass Ritter oder Gegner durch das Mauerwerk
laufen. Truhen, Büsche und Maulwurf-Startpunkte bleiben außerhalb der Ruine.
Der grün leuchtende Münzplatz liegt direkt davor. Die Interaktion richtet sich
nach den Füßen des Ritters und derselben Ellipse, die sichtbar gezeichnet wird.
Ein Fortschrittsbalken am Münzplatz ersetzt den zusätzlichen Textkasten.
Bei ungefähr einem und zwei Dritteln der Reparatur wechselt das Tor zur
nächsten Baustufe. Gespeicherter Baufortschritt zeigt beim erneuten Betreten
sofort den passenden Zustand; die fertige Ruine bleibt das bisherige Asset.

Die Büsche enthalten keine fest gemalten Beeren: Nur die separat dargestellten
roten Früchte können gesammelt werden. Nach der Ernte verschwinden sie und
wachsen wie bisher nach. So zeigt die Grafik den tatsächlichen Vorrat.
