# Hochziehen auf einen Ast

`mantle-atlas.png` wurde mit der integrierten Bildgenerierung aus
`climbing-atlas.png` als Figuren- und Stilreferenz erstellt.
Der vollständige Prompt steht in [prompts/mantle.txt](prompts/mantle.txt).

Vier Posen pro Figur: Ast greifen, hochziehen, Knie aufsetzen, auf dem Ast hocken.
Oben Ritter, unten Ritterin; alle Hände bleiben frei. Das Original ist transparent
und unverändert gespeichert. `registerClimbMantleTextures` extrahiert die acht
zusammenhängenden Figuren, erhält einen gemeinsamen Maßstab und spiegelt sie in
die normale Blickrichtung der Spielfiguren. Klettern und Hochziehen sperren
Nahkampf, Bogen und Waffenwechsel bis zum sicheren Stand auf dem Ast.
