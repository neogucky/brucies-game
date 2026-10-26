# Meister Mucks Hammerstunde

Die PNGs wurden mit der eingebauten Bildgenerierung erstellt und enthalten
echte Transparenz. Das Spiel lädt sie aus diesem Projektordner.

| Grafik | Verwendung | Vollständiger Prompt |
| --- | --- | --- |
| [hammer-coach-civilian.png](hammer-coach-civilian.png) | Aktueller Trainer mit Bandana, Hemd und Lederschürze: drei Körperposen und separate Stoffärmel, Unterarm und Hand. Ohne Rüstung. | [trainer-civilian.txt](prompts/trainer-civilian.txt) |
| [hammer-coach-atlas.png](hammer-coach-atlas.png) | Die Strohpuppe unten rechts wird verwendet. Die übrigen Posen gehören zum verworfenen Trainerentwurf mit Rüstung. | [trainer-generation.txt](prompts/trainer-generation.txt), [trainer-arm-registration.txt](prompts/trainer-arm-registration.txt) |

`hammerTrainingAssets.js` registriert die Schnittflächen an festen Fuß- und
Schulterpunkten. Meister Muck verwendet dieselbe Lade- und Schlaganimation wie
der Spieler, mit eigenen Stoff- und Hautgrafiken für den Arm. Das erklärt den
Angriff durch eine tatsächliche Vorführung.

Die Hammersteuerung verwendet diese Grenzen:

- Antippen unter 180 ms: bisheriger normaler Schlag.
- Ab 180 ms: gelbe Blitze, Schaden steigt mit der Haltedauer.
- Ab 750 ms: rote Blitze, weiter steigender Schaden.
- Ab 1500 ms: blaue Blitze, dreifacher Grundschaden und eine kleine Druckwelle.
- Während des Haltens: 80 % Bewegungstempo, ansteigender Ladeton.

Gegen Stein bleibt zusätzlich der bisherige doppelte Hammerschaden erhalten.
Die Druckwelle entsteht beim Bodenkontakt des Hammerkopfs und trifft einen
bereits vom selben Schlag getroffenen Gegner nicht erneut. Wände blockieren
sie. Der normale Schlag und der Sprung-Landungsschlag bleiben verfügbar.

Beim Kauf startet das Training einmalig. Bestehende Hammerbesitzer erhalten es
beim ersten Level mit ausgerüstetem Hammer. „Später“ verlässt das Training;
„Hammer üben“ im Unterwelt-Shop startet es erneut ohne weitere Kosten. Das
Training verändert Ausrüstung, Herzen und Gold nicht. Nur sein Fortschritt
wird gespeichert. Falsche Versuche erklären ausdrücklich, ob zu früh oder zu
spät losgelassen wurde, und wiederholen die passende Vorführung.

Prüfungen: `tests/hammer-charge.test.cjs`, `tests/melee-animation.test.cjs`,
`tests/power-hammer-shop.test.cjs` und die bestehenden Kampfprüfungen. Zusätzlich
wurden alle fünf Übungen, ein zu lange geladener Versuch, Kauf, Abschluss und
Rückkehr zum Shop im laufenden Spiel getestet. Beim Wechsel der Übungen darf
die Physikposition nach `body.reset()` nicht erneut abgeglichen werden: Das
würde die Kollisionsbox als zusätzliche Bewegung unter den Boden verschieben.
