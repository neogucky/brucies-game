# Drachenspuren

Die Schauplätze wurden mit der integrierten Bildgenerierung (Imagegen) erstellt.
PNG-Originale bleiben erhalten; das Spiel lädt kleinere JPEG-Exporte gleicher
Auflösung. Ritter, Helfer, Fußspuren, Kamerafahrt und Prospekt werden separat
animiert. Der Drache selbst ist in keiner dieser Szenen zu sehen. Die Handlung
wird ohne erklärende Untertitel erzählt: Gesten, Blickrichtungen, Ausrufezeichen
und Kamerawechsel machen die Entdeckungen sichtbar.

Die Wüstenszene wechselt zwischen einer Totalen, einer Nahaufnahme des Funds
und derselben Totalen auf dem Weg in die Höhle. Erst ziehen Ritter und Helfer
gemeinsam durch den Sand. Die Spuren sind von Anfang an fest in der Landschaft;
erst die vergrößerte Aufnahme macht sie deutlich. Der Helfer hält mit einem
roten Ausrufezeichen inne, hüpft zur Spur, beugt sich vor und winkt den Ritter
herbei. In der Nahaufnahme zeigt er darauf, während der Ritter sich hinkniet.
Danach geht der Helfer voraus. Beide Figuren verschwinden erst innerhalb des
dunklen Tunneleingangs. Schnitte verändern keine Positionen in der Landschaft.

Unter Tage liegt der kleine Prospekt von Anfang an neben den verlorenen
Schätzen. Der Helfer entdeckt ihn und ruft den Ritter. Drei eigene Posen zeigen,
wie der Ritter sich bückt, das Blatt aufhebt und es in beiden Händen hält. Erst
dann folgt die eigene Kameraaufnahme über seiner Schulter. Dort schauen beide
auf den Prospekt. Das Blatt wird nie zu einer frei schwebenden Bildschirmkarte.
Nach dem Lesen zeigt der Ritter zum Drachenloch und folgt dem Helfer hindurch.

Im Urwald entdecken sie nasse Spuren zum See. Nach dem gemeinsamen Untersuchen
geht der Helfer voraus, tippt ins Wasser und springt mit einem kleinen Platscher
zurück. Der Ritter bleibt am trockenen Ufer. Eine nähere Seeaufnahme zeigt eine
verlorene Schatztruhe und eine Blasenspur im Wasser. Zum Schluss weist der
Ritter hinaus auf den See. Alle Kameraausschnitte bleiben innerhalb des Bildes.

| Szene | Original | Bildprompt |
| --- | --- | --- |
| Nach dem Fremdweg: Spuren zum Tunnel | [desert-tracks.png](desert-tracks.png) | [desert.txt](prompts/desert.txt) |
| Nach den Kristalltiefen: Drachenloch und verlorene Schätze | [underground-wall.png](underground-wall.png) | [underground.txt](prompts/underground.txt) |
| Nach dem Lianenpfad: Spuren zum See | [jungle-shore.png](jungle-shore.png) | [jungle.txt](prompts/jungle.txt) |

Die neue Nahaufnahme zeigt „Urlaub im Dschungel“ gut lesbar direkt auf dem
gemalten, gehaltenen Prospekt.

| Neue Grafik | Verwendung | Vollständiger Prompt |
| --- | --- | --- |
| [knight-investigate.png](knight-investigate.png) | Aufheben, Aufstehen und Lesen mit freien Händen | [knight-investigate.txt](prompts/knight-investigate.txt) |
| [story-gestures.png](story-gestures.png) | Aufmerksamer, untersuchender und zeigender Ritter; schnuppernder, winkender und zeigender Helfer | [story-gestures.txt](prompts/story-gestures.txt) |
| [underground-reading.png](underground-reading.png) | Eigenständige Aufnahme über der Schulter; das Spiel lädt den kleineren [JPEG-Export](underground-reading.jpg) | [underground-reading.txt](prompts/underground-reading.txt) |

Auch diese Grafiken entstanden mit der integrierten Bildgenerierung. Die
transparenten Atlanten werden im Spiel mit gemeinsamer Bodenlinie registriert.
`paper.wav` und `splash.wav` sind kurze, direkt synthetisierte Papier- und
Wassergeräusche. Sie verwenden dieselbe Lautstärkeregelung wie die übrigen
Introgeräusche.

Die kurzen Sequenzen starten beim Rückweg vom jeweiligen letzten Level zur
Weltkarte und führen automatisch dorthin weiter. Überspringen mit Leertaste,
Enter oder dem dezenten Overlay zählt ebenfalls als angesehen. Beim Appwechsel
pausiert der Film. Offene Hinweise bleiben bis zum Ansehen im Spielstand erhalten.
