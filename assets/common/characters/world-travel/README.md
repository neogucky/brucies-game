# Weltkarten und Schlürfanimation

Mit der eingebauten Bildgenerierung erstellt, mit den vorhandenen Spielfiguren
als Referenz. Die Originaldateien enthalten echte Transparenz.

| Grafik | Inhalt | Vollständiger Prompt |
| --- | --- | --- |
| [knight-walk.png](knight-walk.png) | Sechs Gehphasen für Ritter und Ritterin, mit freien Händen und schwingendem Umhang. Obere Reihe Ritter, untere Reihe Ritterin. | [knight-walk.txt](prompts/knight-walk.txt) |
| [helper-drink.png](helper-drink.png) | Vier Schlürfphasen: ansetzen, schlürfen, schlucken, weitertrinken. Reihenfolge links nach rechts, oben nach unten. | [helper-drink.txt](prompts/helper-drink.txt) |

`worldMapAssets.js` extrahiert die einzelnen Silhouetten im Spiel und richtet die
Gehphasen auf derselben Bodenlinie aus. So gelangen überstehende Umhangspitzen
nicht in die benachbarte Phase. Die PNG-Originale bleiben unverändert.

Die Gehphasen folgen der zurückgelegten Strecke. Alle Weltkarten einschließlich
der Übergänge verwenden 260 Kartenpixel pro Sekunde entlang desselben Pfades,
der auch gezeichnet wird. Am Ziel erscheint wieder die ausgerüstete Primärwaffe.

Beim Trinken läuft alle 140 ms eine neue Phase. Die Helferanimation und die
beschleunigte Reinigung benutzen dieselbe Entfernungs- und Höhenprüfung. Nach
dem Verschwinden der Pfütze endet die Trinkpose auch während einer Angriffspause.
