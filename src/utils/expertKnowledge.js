export const EXPERT_WORLDS = {
  desert: { id: 'Wuestenexperte', name: 'Wüstenexperte', map: 'DessertMapScene', mapField: 'desertNode',
    greeting: 'Halt! Professor Knobel, Sandforscher erster Klasse! Ich habe dreizehn Sandkörner gezählt … dann kam der Wind. Zum Glück sind meine Kampftipps besser sortiert.',
    topics: {
      Gegner: [
        ['Wüstenmonster', 'Hör auf das Angriffssignal und achte auf die Vorbereitung. Triffst du zuerst, ist das Monster kurz betäubt und kann in dieser Zeit nicht angreifen. Abstand hilft dir, den nächsten Schlag zu setzen.'],
        ['Anstürmende Gegner', 'Ein lautes Ladegeräusch kündigt einen gefährlichen Angriff an. Laufe aus dem Weg oder triff den Gegner rechtzeitig. Mitten in einer Gruppe stehen zu bleiben kostet schnell Herzen.'],
        ['Körperkontakt', 'Du kannst einen Gegner nicht einfach durchqueren. Beim Hineinlaufen gibt es einmal Berührungsschaden, dann stehst du vor ihm. Ein betäubter Gegner bleibt im Weg, verursacht dabei aber keinen Berührungsschaden.'],
      ],
      Ausrüstung: [
        ['Schwert & Betäubung', 'Das Schwert schlägt schnell. Gehe nur so nah heran, dass die Klinge den Gegner erreicht, und schlage erneut, bevor er sich erholt. Auto-Anvisieren richtet den Schlag auf nahe sichtbare Gegner aus.'],
        ['Schild', 'In der Taverne kostet ein Schild 100 Gold. Er blockiert einen Treffer und lädt sich danach 20 Sekunden auf. Das Schildsymbol zeigt dir, wann er wieder bereit ist.'],
        ['Honigsaft & Helfer', 'Honigsaft kostet 10 Gold und hilft dir oder dem kleinen Helfer. Ein voller Ritter allein ist noch kein Grund, den Helfer zu vergessen! Rüste den Saft in einem der beiden Trankslots aus.'],
        ['Parallele Ausrüstung', 'Primärwaffe, Bogen, Schild, Schuhe und Helfer haben eigene Plätze. Du kannst sie gleichzeitig ausrüsten. Meine Brille hat leider keinen Platz im Inventar – die brauche ich selbst!'],
      ],
      Level: [
        ['Wüstenruine', 'Hilf beim Wiederaufbau der Ruine und sammle unterwegs Gold. Besuche danach die Taverne; die weiteren Wüstenwege werden freigeschaltet.'],
        ['Wüstenendlos', 'Es kommen nach und nach stärkere Gegner. Nutze Betäubungen, achte auf deine Herzen und gönne deinem Schild Zeit zum Aufladen. Gold allein gewinnt keinen Kampf!'],
        ['Fremdweg', 'Der Weg führt zum Steinbruch und weiter in die Unterwelt. Nach dem Abschluss öffnet sich auf der Wüstenkarte der Weg nach unten.'],
      ],
    } },
  underground: { id: 'Unterweltexperte', name: 'Unterweltexperte', map: 'UndergroundMapScene', mapField: 'undergroundNode',
    greeting: 'Du schon wieder! Professor Knobel erkennt man sogar im Dunkeln an der Frisur. Mein Kristall leuchtet, meine Theorie wackelt – aber diese Unterwelttipps sind felsenfest!',
    topics: {
      Gegner: [
        ['Rollende Steingegner', 'Achte auf den Fall von oben und das Rollgeräusch. Ein Treffer soll dich nicht sofort besiegen. Der Power Hammer ist besonders wirksam: Er verursacht gegen Steingegner doppelten Schaden.'],
        ['Steinwächter', 'Der erste Boss hat drei Phasen und 12 Lebenspunkte. Nach einem Aufprall ist er kurz verwundbar: zwei Spielertreffer und ein Helfertreffer sind möglich. Dauerhaft betäuben lässt er sich nicht.'],
        ['Obsidian-Titan', 'Dieser Superboss ist stärker und wird in seinen drei Phasen schneller. Beim Phasenwechsel zieht er sich nach oben zurück und stellt seine obere Ebene wieder her. Ein Falltreffer des Bosses verursacht 3 Schaden.'],
        ['Fledermäuse & Giftbeeren', 'Die süßen Fledermäuse fliegen dicht unter der Decke. Berührung kostet 1 Herz, eine Giftbeere 2. Unterbrich den angekündigten Abwurf mit einem Treffer. Verfehlte Beeren zerplatzen auf dem Boden.'],
        ['Maulwürfe', 'Beobachte, wo sie auftauchen, und höre auf ihre Geräusche. Ein rechtzeitiger Treffer unterbricht den Angriff. Der kleine Helfer kann beim Kampf unterstützen.'],
      ],
      Ausrüstung: [
        ['Power Hammer', 'Im Unterwelt-Shop kostet er 200 Gold. Er schlägt langsamer als das Schwert, macht aber doppelten Schaden gegen Steinmonster. Wähle ihn als Primärwaffe im Inventar.'],
        ['Hammer-Landungsschlag', 'Springe und drücke in der Luft nach unten. Bei der Landung trifft die Welle nahe Gegner auf beiden Seiten und verursacht 50 Prozent zusätzlichen Schaden. Sie bricht auch Erde direkt unter dir auf.'],
        ['Erde, Stein & Ducken', 'Das Schwert gräbt Erde, der Hammer zerbricht zusätzlich normale Steinkacheln. Geduckt schlägst du nur die untere Blockreihe. Schwarze Begrenzungskacheln sind unzerstörbar.'],
        ['Flügelschuhe', 'Die Schuhe kosten im Unterwelt-Shop 300 Gold. In Sprungleveln helfen sie beim Springen und Schweben. Du kannst sie zusammen mit Schild und Bogen tragen.'],
        ['Bogen & Kinderhilfe', 'Der Bogen funktioniert auch hier unten, sobald du ihn im Urwald gekauft hast. Auto-Anvisieren hilft auch mit Schwert und Hammer gegen nahe sichtbare Gegner; Wände begrenzen es weiterhin.'],
      ],
      Level: [
        ['Untergrundpfad', 'Grabe dir einen Weg, suche den Schlüssel und öffne das Tor. Besuche vorher den Shop: Ein Hammer kann dir einige Umwege ersparen.'],
        ['Schlüsselweg', 'Am Ende wartet der Steinwächter. Weiche zuerst aus und nutze nach seinem Aufprall das kurze Zeitfenster. Der Sieg öffnet die Kristalltiefen.'],
        ['Kristalltiefen', 'Hier warten Fledermäuse, fünf Truhen mit je 100 Gold und der Obsidian-Titan. Gesammelte Truhen bleiben gespeichert. Nach dem Titanen öffnet sich der Weg in die Urwaldwelt.'],
      ],
    } },
  jungle: { id: 'Urwaldexperte', name: 'Urwaldexperte', map: 'JungleMapScene', mapField: 'jungleNode',
    greeting: 'Willkommen in meiner Außenstelle! Gleiche Brille, neue Blätter im Haar. Ich erforsche Affen, Lianen und die Frage, warum mein Frühstück immer klebt. Frag nur!',
    topics: {
      Gegner: [
        ['Braune Affen', 'Ihre Kokosnüsse verursachen 1 Schaden. Verfehlte Würfe hinterlassen 10 Sekunden Kleber. Versteckte Affen spähen hinter Blättern hervor; Nähe oder ein Pfeiltreffer lockt sie heraus.'],
        ['Rote Affen', 'Rote Kokosnüsse verursachen 2 Schaden und explodieren. Halte Abstand zur Einschlagstelle! Beim Aufprall auf einen Ast oder den Boden bleibt außerdem Kleber zurück.'],
        ['Blaue Affen', 'Ihre Kokosnüsse verursachen 3 Schaden, explodieren aber nicht und hinterlassen keinen Kleber. Die blaue Farbe ist also keine Einladung zum Kuscheln.'],
        ['Der Affenkönig', 'Er wirft braune, rote und blaue Kokosnüsse sowie Steinmonster. Die Warnung verrät den nächsten Wurf. Direkt danach ist er kurz verwundbar; spare deine Angriffe für dieses Fenster.'],
        ['Kletternde Affen', 'Affen huschen zu einem Baum oder einer erreichbaren Liane, bevor sie die Höhe wechseln. Beobachte diese Kletterstellen. Mitten im freien Raum können auch Affen nicht einfach nach oben laufen.'],
      ],
      Ausrüstung: [
        ['Pfeil & Bogen', 'Der Bogen kostet im Urwald-Shop 300 Gold. Pfeile fliegen leicht ballistisch ungefähr 10 Kacheln weit. Beim Wechsel zwischen Bogen und Nahkampf brauchst du 200 Millisekunden; danach gilt die normale Angriffszeit.'],
        ['Nach oben schießen', 'Halte die Richtung nach oben und schieße. So erwischst du Gegner über dir. Beim Klettern sind deine Hände besetzt: Erst die Liane verlassen, dann eine Waffe benutzen.'],
        ['Urwaldschild', 'Für 200 Gold schickt dieser Schild ein Geschoss zurück. Trifft es einen Gegner, verursacht es seinen normalen Schaden. Danach lädt der Schild wie gewohnt wieder auf.'],
        ['Helfer & Kleber', 'Eine Pfütze bleibt 10 Sekunden, die Verlangsamung nach dem Betreten 5 Sekunden. Du läufst dann langsamer und kannst nicht springen. Der Helfer schlürft nahe Pfützen auf: Sie verschwinden dreimal schneller.'],
      ],
      Level: [
        ['Kokoskronen', 'Folge den Ästen nach oben. Du kannst von unten hindurchspringen und landest von oben darauf. Der Affenkönig wartet in der Baumkrone; sein Sieg gibt 300 Gold und öffnet den Lianenpfad.'],
        ['Lianenpfad', 'Hier fehlen viele Äste. Greife eine Liane mit der Richtung nach oben oder unten und klettere weiter. Seitwärts verlässt du die Liane; seitwärts und nach oben springst du ab. Ziel ist die goldene Kokosnuss.'],
        ['Durch einen Ast fallen', 'Drücke auf einer Plattform zweimal schnell nach unten. Du fällst durch diesen Ast zur nächsten Ebene. Der feste Boden bleibt stehen – eine sehr beruhigende Entdeckung!'],
        ['Rollende Steinmonster', 'Die Steine des Königs prallen an den Bildschirmrändern ab. Achte auch auf zurückrollende Steine! Ihre Rollstrecke ist begrenzt; mit dem Hammer kannst du sie schneller zerbrechen.'],
      ],
    } },
};
