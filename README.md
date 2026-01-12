# Brucies Game

Prototyp eines Phaser-Spiels mit Hauptmenü, Levelauswahl und dem ersten Level **"Wüstenruine"**.

## Starten

Lokalen Webserver starten (wegen ES-Modulen):

```bash
python -m http.server 8000
```

Dann im Browser öffnen:

```
http://localhost:8000
```

## Steuerung

- Pfeiltasten: Bewegung / Auswahl
- Enter: Auswahl / Bestätigen
- Esc: Zurück zur Levelauswahl

## Projektstruktur

- `index.html`: Einstiegspunkt
- `style.css`: Grund-Layout
- `src/main.js`: Phaser-Konfiguration
- `src/scenes`: Szenen für Menü, Levelauswahl, Level 1
- `src/saveManager.js`: Spielstand in `localStorage`
