# Kurze Spieleffekte

`coin-pling-v2.wav` ist das gemeinsame helle Pling beim Münzsammeln.
`spring-boing.wav` ist der nachschwingende Boing-Ton der Sprungfedern.
Beide wurden synthetisiert (44,1 kHz, Mono, PCM 16 Bit) und enthalten keine
fremden Tonaufnahmen. Der ursprüngliche Münzton bleibt erhalten.

Neu erzeugen: `python3 tools/generate-bonus-sounds.py` im Projektordner.

`player-hurt.wav` ist der eigene, tiefe Doppelton bei einem Treffer des Ritters.
`low-health-beep.wav` ist das kurze Monitor-Piepen beim letzten Herz.
Beide sind ebenfalls eigene Synthesen (44,1 kHz, Mono, PCM 16 Bit).
Neu erzeugen: `python3 tools/generate-player-sounds.py`.

`stone-scrape.wav` ist das raue Schaben zweier schwerer Steinplatten beim Öffnen
eines Geheimgangs. Eigene Synthese (44,1 kHz, Mono, PCM 16 Bit).
Neu erzeugen: `python3 tools/generate-secret-switch-sound.py`.
