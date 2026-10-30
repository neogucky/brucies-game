// Stable IDs connect actual sightings with picture cards. Each short tip explains
// one useful idea; world-specific facts are supplied by that world's professor.
const monkeyHidingTip = 'Manche Affen **verstecken sich im Laub**. Komm näher oder triff sie mit einem Pfeil! Sie klettern an **Bäumen und Lianen**.';
export const EXPERT_CARDS = {
  'mole-normal': { name: 'Maulwurf', texture: 'desert-mole-running', kind: 'enemy', tips: [
    'Ein früher Hieb **betäubt den Maulwurf kurz**. Dann kann er dich nicht angreifen. Schlage wieder zu, bevor er sich erholt!',
    'Hör auf sein **Angriffsgeräusch**. Drängle dich nicht an ihm vorbei: Ein wacher Maulwurf kann dich beim **Zusammenstoß verletzen**.',
  ] },
  'mole-red': { name: 'Roter Maulwurf', texture: 'desert-mole-running', tint: 0xff5a5a, kind: 'enemy', tips: [
    'Der rote Flitzer ist **besonders schnell**. Halte Abstand und schlage zu, bevor er dich erreicht!',
    'Auch er lässt sich **kurz betäuben**. Bleib dran, aber pass auf, dass dich seine Freunde nicht einkreisen!',
  ] },
  'mole-blue': { name: 'Blauer Maulwurf', texture: 'desert-mole-running', tint: 0x4aa3ff, kind: 'enemy', tips: [
    'Der blaue Maulwurf ist **langsamer**, aber **hält mehr aus**. Gib nicht auf, wenn er nach deinem Treffer noch steht!',
    'Triff ihn wieder, solange er **betäubt** ist. Dann bekommt er keine Gelegenheit zum Zurückschlagen.',
  ] },
  'mole-boss': { name: 'Maulwurf-Boss', texture: 'desert-mole-charging', tint: 0xf5d37a, kind: 'enemy', tips: [
    'Wenn der Riese ausholt, **weich aus**! Sein großer Schlag tut ordentlich weh.',
    'Nach dem großen Angriff muss er sich **ausruhen**. **Dann bist du dran!** Hör gut auf sein lautes Ausholen.',
  ] },
  'rolling-rock': { name: 'Rollender Fels', texture: 'desert-stone-rolling', kind: 'enemy', tips: [
    'Der rollende Fels trifft **besonders hart**. **Zerschlage ihn mit deiner Waffe**, bevor er dich erwischt!',
    'Danach bleibt ein **Steinhaufen zum Einsammeln**. Rollt der Fels in einen Maulwurf, bekommt auch der einen ordentlichen Rempler.',
  ] },
  stone: { name: 'Steinmonster', texture: 'underground-stonemonster-standing', kind: 'enemy', tips: [
    'Vorsicht, der Brocken **fällt herab und rollt los**! Mit dem **Hammer** kannst du ihn besonders gut knacken.',
    'Trifft er beim Rollen oder Fallen einen Maulwurf, **verletzt er auch ihn**. Dabei kommt der Brocken zum Stehen.',
    'Nach einem Stück bleibt er **von selbst stehen**. Hörst du Rumpeln, **schau nach oben** und halte Abstand!',
  ] },
  'stone-guardian': { name: 'Steinwächter', texture: 'underground-stonemonster-standing', kind: 'enemy', tips: [
    'Weiche seinem Sturz aus! **Nach dem Aufprall** ist der Wächter kurz verwundbar. Dann kannst du ihn mit dem Hammer erwischen.',
    'Du kannst ihn **nicht ständig betäuben**. Er kehrt nach oben zurück, baut seine Felsen wieder auf und wird **immer schneller**.',
  ] },
  'stone-titan': { name: 'Obsidian-Titan', texture: 'underground-stonemonster-standing', tint: 0xa7d4ff, kind: 'enemy', tips: [
    'Der Titan ist **besonders zäh und gefährlich**. Weiche seinem Sturz und Rollen aus. **Nach dem Aufprall** kannst du ihn kurz treffen.',
    'Er zieht sich nach oben zurück und **stellt seine Felsen wieder her**. Mit jedem neuen Anlauf wird er **flinker**. Bleib geduldig!',
  ] },
  bat: { name: 'Fledermaus', texture: 'cave-bat-glide', kind: 'enemy', tips: [
    'Die Fledermaus fliegt **an der Höhlendecke**. Ein Zusammenstoß zwickt. Ihre **Giftbeeren tun mehr weh**: Spring nicht direkt in ihre Flugbahn!',
    'Triff sie, bevor sie wirft! Ein Treffer **unterbricht den Abwurf**. Mit einem Bogen kannst du auch hoch oben zielen.',
    'Die grünen Beeren **sind giftig**. Sie platzen am Boden und hinterlassen **keine Pfütze**. Das ist kein Snack für deinen Helfer!',
  ] },
  'monkey-brown': { name: 'Brauner Affe', texture: 'monkey-brown', kind: 'enemy', tips: [
    'Die Kokosnuss macht **leichten Schaden**. Sobald der Affe **ausholt**, steht sein Ziel fest. **Weiche dann aus!**',
    'Im Kokossaft **klebst du fest**: Du wirst langsam und kannst **nicht springen**. Die Anzeige verrät, wann du wieder frei bist.',
    'Dein Helfer **schlürft nahe Kokospfützen auf**. So verschwinden sie **viel schneller**. Bleib in seiner Nähe, wenn überall Saft klebt!',
    monkeyHidingTip,
  ] },
  'monkey-red': { name: 'Roter Affe', texture: 'monkey-red', kind: 'enemy', tips: [
    'Seine Kokosnuss **explodiert** und trifft **kräftiger**. Weiche aus, sobald er ausholt. Halte auch Abstand zum Einschlag!',
    'Danach bleibt **klebriger Kokossaft**. Darin wirst du langsam und kannst **nicht springen**. Dein Helfer kann beim Aufräumen helfen.',
    monkeyHidingTip,
  ] },
  'monkey-blue': { name: 'Blauer Affe', texture: 'monkey-blue', kind: 'enemy', tips: [
    'Seine Kokosnuss trifft **besonders heftig**. Sie explodiert nicht und hinterlässt **keinen Kleber**.',
    'Sobald er **ausholt**, hat er sein Ziel gewählt. **Bewege dich dann weg**: Der Affe zielt beim Wurf nicht noch einmal nach.',
    monkeyHidingTip,
  ] },
  'monkey-king': { name: 'Affenkönig', texture: 'monkey-king', kind: 'enemy', tips: [
    'Der König wirft **alle Kokosnussfarben und Steinmonster**! Schau auf seine Warnung und weiche aus, sobald er ausholt.',
    '**Nach dem Wurf** kannst du ihn kurz erwischen. Danach schützt er sich wieder. Warte auf die nächste Gelegenheit!',
    'Seine **Steinmonster prallen an den Rändern ab**. Schau auch hinter dich! Mit dem **Hammer** kannst du die Brocken besonders gut knacken.',
  ] },
  sword: { name: 'Schwert', texture: 'item-sword', kind: 'equipment', tips: [
    'Das Schwert schlägt **sofort und schnell**. Drücke **{attack}**. Triff wieder, während dein Gegner noch **betäubt** ist!',
    'Die **Zielhilfe** dreht dich zu nahen Gegnern. Du kannst sie im Hauptmenü einschalten. Deine Waffe muss den Gegner trotzdem erreichen!',
  ] },
  shield: { name: 'Schild', texture: 'item-shield', kind: 'equipment', tips: [
    'Der Schild **fängt automatisch einen Treffer ab**. Danach braucht er eine Pause. Du musst dafür keine Taste drücken!',
    'Rüste ihn im **Schildplatz** aus. Deine Waffe behältst du trotzdem. Das **Schildsymbol** zeigt, wann er wieder bereit ist.',
  ] },
  honey: { name: 'Honigsaft', texture: 'item-honey', kind: 'equipment', tips: [
    'Mmmh, Honig! Der Saft **heilt dich** und macht einen **versteckten Helfer wieder munter**. Du musst dann nicht auf ihn warten.',
    'Pack Honigsaft in einen **Trankslot**. Trinken geht mit **{potion1}** oder beim anderen Platz mit **{potion2}**. Beide Plätze teilen deinen Vorrat.',
  ] },
  companion: { name: 'Kleiner Helfer', texture: 'item-companion', kind: 'equipment', tips: [
    'Dein kleiner Freund **folgt dir und kämpft mit dir**. Rüste ihn im **Begleiterplatz** aus, damit er dabei ist!',
  ] },
  powerHammer: { name: 'Power Hammer', texture: 'item-power-hammer', kind: 'equipment', tips: [
    'Der Hammer trifft **Steinmonster besonders hart**, schwingt aber langsamer. Wähle ihn **statt des Schwerts** als Hauptwaffe im Inventar.',
    '**Tippe {attack} kurz an** für einen normalen Schlag. **Halte zum Aufladen** und **lass zum Zuschlagen los**. Dabei bewegst du dich **etwas langsamer**.',
    '**Gelbe Blitze** verstärken den Schlag. **Rote Blitze** machen ihn kräftiger. Bei **blauen Blitzen** trifft auch eine kleine **Druckwelle** um dich herum!',
    '**Springe und drücke nach unten**. Bei der Landung trifft dein Hammer **kräftiger auf beiden Seiten**. Das hilft gegen eine ganze Gruppe!',
  ] },
  shoes: { name: 'Flügelschuhe', texture: 'item-winged-shoes', kind: 'equipment', tips: [
    'Die Flügelschuhe machen dich **beim Sprinten schneller**. Tippe eine Richtung **zweimal schnell** und halte sie beim zweiten Mal fest!',
    'Du kannst **Schuhe, Schild und Waffe zusammen tragen**. Dafür hat jedes Teil seinen eigenen Platz im Inventar.',
    'Mit dem Sprint kannst du **Gegner rammen**. Pass vor Mauern auf: Dort wirst du **zurückgestoßen**.',
  ] },
  bow: { name: 'Pfeil und Bogen', texture: 'item-bow', kind: 'equipment', tips: [
    'Rüste den Bogen **als Zweitwaffe** aus. Mit **{shoot}** schießt du. Dein Schwert oder Hammer bleibt dabei ausgerüstet.',
    'Pfeile fliegen **weit und in einem leichten Bogen**. Halte beim Schießen **nach oben**, um über dich zu zielen!',
    'Der **Waffenwechsel braucht einen Augenblick**. Beim Klettern brauchst du **beide Hände**: Erst loslassen, dann schießen!',
  ] },
  jungleShield: { name: 'Urwaldschild', texture: 'item-jungle-shield', kind: 'equipment', tips: [
    'Dieser Schild **wirft Kokosnüsse zurück**. Trifft die Nuss einen Affen, bekommt er ihren Schlag ab! Auch rote Nüsse können dann explodieren.',
    'Nach dem Abwehren braucht der Schild **eine Pause**. Das **Schildsymbol** zeigt dir, wann er wieder bereit ist.',
    'Der Schild schützt dich auch bei einem Zusammenstoß. **Steinmonster wirft er aber nicht zurück**. Denen solltest du weiterhin ausweichen!',
  ] },
};

export const EXPERT_WORLDS = {
  desert: { id: 'Wuestenexperte', name: 'Wüstenexperte', map: 'DessertMapScene', mapField: 'desertNode',
    introduction: [
      'Willkommen, Herr Ritter! Ich bin Professor Knobel, Experte für Monster und Natur.',
      'Was, du suchst einen grünen Drachen?!',
      'Ja, ein prächtiges Exemplar! Ich habe ihn gestern über der Ruine gesehen.',
      'Komm gerne wieder, wenn du Tipps zu Gegnern brauchst!',
    ],
    returnGreeting: 'Hey Ritter! Erzähl mir, was du auf deinen Reisen gesehen hast. Ich gebe dir einen tollen Tipp dazu!',
    cards: ['mole-normal', 'mole-red', 'mole-blue', 'mole-boss', 'rolling-rock', 'sword', 'shield', 'shoes', 'honey', 'companion'],
    cardTips: {
      'mole-normal': ['Er kommt **aus dem Sand**! Triffst du zuerst, ist er **kurz betäubt**. Dann kann er dich nicht angreifen!', ...EXPERT_CARDS['mole-normal'].tips.slice(1)],
      companion: [
        'Fehlen dir Herzen? Dein Helfer **sammelt nahe Beeren** und **bringt sie zu dir**. So wirst du wieder gesund!',
        'Wirst du getroffen, **hilft er manchmal mit einem Sprungangriff**. Er holt deutlich aus und braucht danach eine Pause.',
        'Wird ihm alles zu viel, **versteckt er sich kurz**. Er kommt von selbst wieder zu dir zurück.',
      ],
    } },
  underground: { id: 'Unterweltexperte', name: 'Unterweltexperte', map: 'UndergroundMapScene', mapField: 'undergroundNode',
    greeting: 'Psst! Hier unten poltert es. Hoffentlich war das nur mein Magen!',
    returnGreeting: 'Hey Höhlenforscher! Was hast du unter der Erde entdeckt? Zeig es mir, dann gebe ich dir Tipps!',
    cards: ['stone', 'stone-guardian', 'stone-titan', 'bat', 'powerHammer'],
    cardTips: {
      powerHammer: [...EXPERT_CARDS.powerHammer.tips,
        'Der Hammer **zerbricht Erde und Stein**. **Geduckt** triffst du nur die unteren Blöcke. Die schwarzen Randfelsen bleiben stehen.',
        'Beim **Sprung-Hammerschlag** zerbricht auch **Erde unter dir**. Pass auf, wo du danach landest!',
        'Auch ein **Sprint mit Flügelschuhen** kann **Erde durchbrechen**. Stein knackst du dagegen mit dem **Hammer**!',
      ],
    } },
  jungle: { id: 'Urwaldexperte', name: 'Urwaldexperte', map: 'JungleMapScene', mapField: 'jungleNode',
    greeting: 'Willkommen im Urwald! Ein Affe hat meine Brille stibitzt. Zum Glück mag er meine stachelige Frisur nicht!',
    returnGreeting: 'Hey Urwaldforscher! Was hast du zwischen den Lianen entdeckt? Zeig es mir, dann gebe ich dir Tipps!',
    cards: ['monkey-brown', 'monkey-red', 'monkey-blue', 'monkey-king', 'bow', 'jungleShield'],
    cardTips: {} },
};

export function getExpertCard(world, id) {
  if (!EXPERT_WORLDS[world]?.cards.includes(id)) return null;
  const card = EXPERT_CARDS[id];
  return card ? { ...card, tips: EXPERT_WORLDS[world]?.cardTips?.[id] || card.tips } : null;
}

export const EXPERT_REWARD_GOLD = 25;
export function claimExpertReward(save, world) {
  const cards = EXPERT_WORLDS[world]?.cards, known = new Set(save.discoveries || []);
  if (!cards?.length || save.expertRewards?.[world] || !cards.every(id => known.has(id))) return save;
  return { ...save, coins: (save.coins || 0) + EXPERT_REWARD_GOLD,
    expertRewards: { ...save.expertRewards, [world]: true } };
}
