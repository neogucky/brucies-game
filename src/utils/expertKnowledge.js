export const EXPERT_WORLDS = {
  desert: { id: 'Wuestenexperte', name: 'Wüstenexperte', map: 'DessertMapScene', mapField: 'desertNode',
    greeting: 'Halt! Professor Knobel, Sandforscher erster Klasse! Ich hatte gerade alle Sandkörner sortiert … dann kam der Wind. Zum Glück bleiben meine Kampftipps an ihrem Platz.',
    returnGreeting: 'Da bist du ja wieder! Noch Sand in den Stiefeln? Dann bist du hier richtig. Meine neueste Wüstentheorie ist zwar verweht, aber deine Fragen kriegen wir zu fassen!',
    boardIntro: 'Ich hole meine Tafel hervor. Such dir einen Wüstenbewohner, einen Ausrüstungstipp oder einen Weg durch den Sand aus – wir machen dich bereit fürs Abenteuer!',
    topics: {
      Gegner: [
        ['Wüstenmonster', 'Spitz die Ohren, bevor ein Monster zuschlägt! Triffst du zuerst, ist es **kurz betäubt** und kann nicht angreifen. Mit **etwas Abstand** kannst du den nächsten Hieb vorbereiten.'],
        ['Anstürmende Gegner', 'Ein lautes Schnauben verrät den Ansturm. Dieser Angriff trifft **besonders hart**! Weiche aus oder **unterbrich ihn rechtzeitig** mit einem Hieb. Lass dich nicht von einer ganzen Meute einkreisen.'],
        ['Körperkontakt', 'An einem wachen Gegner vorbeidrängeln? Das gibt einen schmerzhaften Rempler! Halte **Abstand**. Ein **betäubter Gegner** bleibt im Weg, kann dich beim Berühren aber gerade nicht verletzen.'],
      ],
      Ausrüstung: [
        ['Schwert & Betäubung', 'Das Schwert ist **flink**. Schlage erneut zu, bevor das Monster wieder zu sich kommt. **Auto-Anvisieren** hilft dir, nahe sichtbare Gegner zu treffen – meine Brille hilft dabei leider nicht!'],
        ['Schild', 'Der Händler in der Taverne hat einen Schild für dich. Er **fängt einen Treffer ab** und muss sich danach erholen. Achte auf das **Schildsymbol**: Es verrät dir, wann dein Schutz wieder bereit ist.'],
        ['Honigsaft & Helfer', 'Ein Schluck Honigsaft macht **dich oder deinen Helfer wieder munter**. Pack ihn in einen **Trankslot** am Gürtel. Auch ein tapferer Ritter sollte nach seinem kleinen Freund sehen!'],
        ['Parallele Ausrüstung', 'Waffe, Bogen, Schild, Schuhe und Helfer haben **eigene Plätze im Inventar**. Du kannst sie **zusammen ausrüsten**. Meine Brille behalte ich allerdings – sonst lese ich meine Tafel verkehrt herum!'],
      ],
      Level: [
        ['Wüstenruine', 'Zwischen den alten Mauern steckt noch Leben! Hilf beim **Wiederaufbau** und sammle unterwegs Gold. Danach lohnt sich ein **Besuch in der Taverne**, bevor du die nächsten Wüstenwege erkundest.'],
        ['Wüstenendlos', 'Hier wird die Meute nach und nach **gefährlicher**. Nutze Betäubungen und behalte deine Herzen im Blick. Gönne deinem **Schild eine Verschnaufpause** – Gold allein hält keinen Ansturm auf!'],
        ['Fremdweg', 'Hinter dem Sand wartet der Steinbruch. Meistere den **Fremdweg**, dann öffnet sich der **Abstieg in die Unterwelt**. Nimm einen wachen Blick mit: Unter der Erde lauert mehr als Staub!'],
      ],
    } },
  underground: { id: 'Unterweltexperte', name: 'Unterweltexperte', map: 'UndergroundMapScene', mapField: 'undergroundNode',
    greeting: 'Du schon wieder! Professor Knobel erkennt man sogar im Dunkeln an der Frisur. Mein Kristall leuchtet, meine Theorie wackelt – aber diese Unterwelttipps sind felsenfest!',
    returnGreeting: 'Mein Lieblingshöhlenforscher! Hast du auch dieses Poltern unter der Erde gehört? Ich hoffe, es war nur mein Magen. Bei rollenden Steinen werde sogar ich hellhörig!',
    boardIntro: 'Schauen wir auf meine Tafel, bevor uns hier ein Stein auf die Füße fällt. Du kannst nach Höhlenbewohnern, Ausrüstung oder den Wegen durch die Unterwelt stöbern.',
    topics: {
      Gegner: [
        ['Rollende Steingegner', 'Wenn es über dir rumpelt, schau nach oben! Diese Brocken **fallen herab und rollen los**. Der **Power Hammer knackt Stein besonders gut**. Lass dich nicht zwischen Fels und Wand erwischen.'],
        ['Steinwächter', 'Der Wächter lässt sich **nicht dauerhaft betäuben**. Weiche seinem Sturz aus: **Nach dem Aufprall** kannst du ihn kurz erwischen. Zieht er sich zurück, mach dich für seinen nächsten Anlauf bereit.'],
        ['Obsidian-Titan', 'Dieser Riese trifft **schwer** und wird im Kampf **immer flinker**. Zieht er sich nach oben zurück, baut er seine Felsen wieder auf. Nutze seine Pausen, statt ihm blind hinterherzuspringen!'],
        ['Fledermäuse & Giftbeeren', 'Die kleinen Flatterer sehen süß aus, doch ihre **Giftbeeren tun ordentlich weh**! Schon ein Zusammenstoß zwickt. Ein **rechtzeitiger Treffer** kann den Abwurf stoppen; verfehlte Beeren platzen am Boden.'],
        ['Maulwürfe', 'Wo es scharrt und raschelt, steckt oft ein Maulwurf! **Hör genau hin** und beobachte den Boden. Ein **früher Treffer** unterbricht seinen Angriff. Auch dein kleiner Helfer kann ihm die Stirn bieten.'],
      ],
      Ausrüstung: [
        ['Power Hammer', 'Der Unterwelt-Händler kennt das richtige Werkzeug: Der Power Hammer trifft **besonders hart gegen Stein**, schwingt aber **langsamer als das Schwert**. Wähle ihn als Primärwaffe im Inventar.'],
        ['Hammer-Landungsschlag', 'Springe und drücke in der Luft nach unten. Bei der Landung fegst du **kräftiger über beide Seiten** und brichst auch **Erde unter deinen Füßen** auf. Ein wunderbarer Weckruf für eine ganze Höhle!'],
        ['Erde, Stein & Ducken', 'Mit dem Schwert gräbst du Erde; der **Hammer zerbricht auch Stein**. **Geduckt** triffst du nur die untere Blockreihe. An den schwarzen Randfelsen beiße selbst ich mir lieber nicht die Zähne aus.'],
        ['Flügelschuhe', 'Mit diesen Schuhen werden deine Füße federleicht! Sie helfen beim **Springen und Schweben**. Du kannst sie **zusammen mit Schild und Bogen** tragen – für eine Höhlenexpedition ist das recht gemütlich.'],
        ['Bogen & Kinderhilfe', 'Ein im Urwald gekaufter **Bogen funktioniert auch unter Tage**. Auto-Anvisieren hilft ebenso mit Schwert und Hammer. Deine Ziele müssen **nah und sichtbar** sein; durch eine Felswand schaut keine Brille!'],
      ],
      Level: [
        ['Untergrundpfad', 'Hier kannst du dir deinen **eigenen Weg graben**. Such den **Schlüssel zum Tor** und schau vorher beim Händler vorbei. Ein Hammer im Gepäck erspart so manchen Umweg um einen widerspenstigen Fels.'],
        ['Schlüsselweg', 'Am Ende poltert der **Steinwächter**. Weiche seinem Sturz aus und nutze die Pause danach. Mit deinem Sieg öffnest du die **Kristalltiefen** – ich habe schon glänzende Steine zum Untersuchen bestellt!'],
        ['Kristalltiefen', 'Fledermäuse bewachen **versteckte Schatztruhen**. Deine geborgenen Schätze bleiben dir erhalten. Hinter dem gewaltigen **Obsidian-Titan** wartet schließlich der Weg ins grüne Blättermeer der Urwaldwelt.'],
      ],
    } },
  jungle: { id: 'Urwaldexperte', name: 'Urwaldexperte', map: 'JungleMapScene', mapField: 'jungleNode',
    greeting: 'Da raschelt es im Urwald! Ah, du bist es. Ich bin Professor Knobel. Die Affen wollten meine Brille stibitzen – aber meine stachelige Frisur hat sie verscheucht!',
    returnGreeting: 'Zurück aus dem Urwald? Ausgezeichnet! Seit meinem letzten Kokosnussversuch klebt mein Notizbuch an der Liane. Wenigstens kann es jetzt nicht verloren gehen!',
    boardIntro: 'Zwischen Blätterdach und Lianen steckt allerlei Tücke. Ich hole meine Tafel hervor: Such dir ein Tier, einen Ausrüstungstipp oder einen Urwaldpfad aus.',
    topics: {
      Gegner: [
        ['Braune Affen', 'Braune Affen kichern im Blätterdach. Ihre Kokosnüsse machen **leichten Schaden**. Im Kokossaft **klebst du fest**: Du kommst nur langsam voran und kannst nicht springen.'],
        ['Rote Affen', 'Wenn eine rote Kokosnuss zischt, mach Platz! Sie **explodiert** und trifft dich **kräftiger**. An der Einschlagstelle bleibt klebriger Saft zurück – halte beim Ausweichen Abstand.'],
        ['Blaue Affen', 'Blaue Kokosnüsse sehen harmlos aus, treffen aber **besonders heftig**. Sie hinterlassen **keinen Kleber**. Weiche ihrer Flugbahn aus: Die blaue Farbe ist keine Einladung zum Kuscheln!'],
        ['Der Affenkönig', 'Seine Majestät wirft **alle Kokosnussfarben und sogar Steinmonster**! Achte auf die Warnung vor dem Wurf. **Gleich danach** kannst du ihn kurz erwischen – dann ist Schluss mit königlichem Übermut!'],
        ['Kletternde Affen', 'Affen huschen **zu Bäumen und Lianen**, bevor sie hinaufklettern. Manche verstecken sich im Laub. **Nähe oder ein Pfeil** lockt sie hervor – ein Blätterrascheln kann also ziemlich frech werden!'],
      ],
      Ausrüstung: [
        ['Pfeil & Bogen', 'Der Urwald-Händler hat einen Bogen für dich. Pfeile fliegen **in einem leichten Bogen** und erreichen auch ferne Äste. Der **Waffenwechsel braucht einen Augenblick** – plane ihn vor dem nächsten Affenwurf.'],
        ['Nach oben schießen', '**Halte nach oben und schieße**, um einen Affen über dir zu erwischen. An der Liane brauchst du allerdings **beide Hände zum Klettern**. Erst loslassen, dann wieder die Waffe schwingen!'],
        ['Urwaldschild', 'Dieser Schild **schleudert Geschosse zurück**. Mit etwas Glück bekommt der Werfer seine eigene Kokosnuss ab! Danach braucht dein **Schild eine Pause**, bevor er den nächsten Streich abwehren kann.'],
        ['Helfer & Kleber', 'Im Kokossaft wirst du **langsam und kannst nicht springen**. Dein Helfer ist zum Glück ein Schleckermaul: Er **schlürft nahe Pfützen auf**, damit sie schneller verschwinden. Wie praktisch, dass er Kokos liebt!'],
      ],
      Level: [
        ['Kokoskronen', 'Folge den Ästen **bis ins Blätterdach**. Du springst von unten hindurch und landest von oben darauf. In der Krone wartet der **Affenkönig**; sein Sieg öffnet dir den Weg zum Lianenpfad.'],
        ['Lianenpfad', 'Wo Äste fehlen, helfen **Lianen** weiter. Greife sie mit der Richtung nach oben oder unten. Seitwärts lässt du los; seitwärts und nach oben springst du ab. Hoch im Grün glänzt die **goldene Kokosnuss**!'],
        ['Durch einen Ast fallen', 'Willst du einen Ast tiefer? Drücke **zweimal schnell nach unten**. So landest du auf der nächsten Ebene. Der **feste Boden** bleibt stehen – eine sehr beruhigende Entdeckung für meine Forschungen!'],
        ['Rollende Steinmonster', 'Die Brocken des Königs **prallen an den Rändern ab**. Pass auch hinter dir auf, wenn ein Stein zurückrollt! Mit dem **Hammer** zerbröselst du die ungebetenen Felsbesucher besonders gut.'],
      ],
    } },
};
