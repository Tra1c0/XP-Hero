// Waffenteile liegen in Metern entlang der Vorwärtsachse. Der Griffpunkt liegt bei 0.
// Die veröffentlichten Teil-Tupel behalten ihr Format. Drehungen liegen getrennt dazu.
const holz = '#79553b', leder = '#47322d', eisen = '#525d69', stahl = '#97a9bc', silber = '#e1edf2';
const bronze = '#9e6549', messing = '#b8894d', gold = '#eab655', schwarz = '#292434', bein = '#e0cda4';
const eis = '#8dd7ea', glanz = '#c8f3ee', violett = '#55345e', rot = '#8c3343', glut = '#ed7447';
const moos = '#456846', laub = '#89aa5b', petrol = '#234c59', blau = '#426c9b', nachtblau = '#29374d';
const dunklesGold = '#806044', schuppe = '#3b564c', keramik = '#edf0db', rubin = '#b94d61';
const ohneDrehung = Object.freeze([0, 0, 0]);
const drehungen = new WeakMap();

const teil = (form, vorn, rechts, hoehe, breite, dicke, laenge, farbe) =>
  [form, vorn, rechts, hoehe, breite, dicke, laenge, farbe];
const balken = (v, r, h, b, d, l, f) => teil('box', v, r, h, b, d, l, f);
const griff = (laenge, farbe = leder) => balken(0, 0, -.04, .104, .08, laenge, farbe);
const scheibe = (v, r, h, b, d, l, f) => teil('cyl8', v, r, h, b, d, l, f);
const facette = (v, r, h, b, d, l, f) => teil('sphere', v, r, h, b, d, l, f);
const splitter = (v, r, h, b, d, l, f) => teil('rock2', v, r, h, b, d, l, f);
const fassung = (v, r, h, b, d, l, f) => teil('frustum6', v, r, h, b, d, l, f);

const gedreht = (t, gier = 0, neigung = 0, rolle = 0) => [...t, [gier, neigung, rolle]];
const spitze = (v, r, h, b, d, l, f, gier = 0, form = 'pyr4') =>
  gedreht(teil(form, v, r, h, b, l, d, f), gier, Math.PI / 2);
const steg = (form, v0, r0, v1, r1, h, b, d, f) =>
  gedreht(teil(form, (v0 + v1) / 2, (r0 + r1) / 2, h, b, d, Math.hypot(v1 - v0, r1 - r0), f),
    Math.atan2(r1 - r0, v1 - v0));

export function weaponPartRotation(waffenteil) {
  return drehungen.get(waffenteil) || ohneDrehung;
}

// Zerlegt eine Waffe in dieselben Instanzen, die WebGL und die Modellbögen verwenden.
export function weaponInstances(teile, x = 0, y = 0, z = 0, gier = 0, massstab = 1, ausgabe = []) {
  const c = Math.cos(gier), s = Math.sin(gier);
  for (const t of teile) {
    const [form, v, r, h, b, d, l, farbe, leuchten = 0] = t;
    const [drehung, neigung, rolle] = weaponPartRotation(t);
    ausgabe.push([form, x + (r * c + v * s) * massstab, y + h * massstab, z + (-r * s + v * c) * massstab,
      gier + drehung, b * massstab, d * massstab, l * massstab, farbe, leuchten, neigung, rolle]);
  }
  return ausgabe;
}

// Je Klasse wachsen unterschiedliche Konstruktionen, vom einfachen Werkzeug bis zum Artefakt.
const NORMAL = {
  dagger: [
    // Genieteter Schrottdolch mit ausgebrochener Schneide.
    [griff(.24, holz), balken(.23, -.027, -.043, .14, .079, .24, eisen),
      spitze(.32, -.027, -.002, .14, .073, .24, '#77747c', -.18), scheibe(.19, .014, .032, .069, .03, .069)],
    // Symmetrischer Stahldolch mit breiter Blattschneide und Kreuzschutz.
    [griff(.25), balken(.159, 0, -.047, .35, .094, .084, stahl), facette(.385, 0, -.064, .263, .128, .57, silber),
      spitze(.37, 0, 0, .19, .093, .35, stahl), scheibe(-.135, 0, -.058, .16, .111, .109)],
    // Henkersnagel, ein kantiger Dorn mit weit vorspringendem Gegenknebel.
    [griff(.26, schwarz), balken(.178, 0, -.056, .43, .112, .09, eisen),
      spitze(.21, 0, 0, .133, .146, .63, stahl), balken(.313, .121, -.043, .14, .098, .252, schwarz),
      scheibe(.232, .154, .053, .10, .049, .108)],
    // Spinner, eine Achse mit gegenläufigen Sichelarmen und offenem Bereich.
    [griff(.22, violett), scheibe(.326, 0, -.063, .319, .127, .319, eisen), scheibe(.326, 0, .059, .173, .054, .173),
      steg('box', .31, -.088, .505, -.265, -.036, .104, .074, stahl),
      spitze(.495, -.251, 0, .199, .088, .238, silber, 1.15),
      steg('box', .33, .093, .161, .255, -.036, .105, .074, stahl),
      spitze(.165, .238, 0, .196, .089, .226, silber, -2.03)],
    // Ritualdolch mit dunklem Rückgrat, roter Hakenschneide und Fassung.
    [griff(.28, rot), fassung(.172, 0, -.067, .291, .139, .174, dunklesGold),
      steg('box', .223, -.024, .65, -.159, -.054, .107, .108, schwarz),
      spitze(.335, -.021, 0, .279, .103, .455, rot, .38),
      spitze(.599, .019, 0, .174, .100, .264, rubin, -1.04),
      facette(.301, -.04, .045, .121, .095, .116), scheibe(-.14, 0, -.054, .135, .102, .13, bronze)],
    // Drachenklaue, drei gebogene Knochenkrallen aus einer Schuppenwurzel.
    [griff(.27, schuppe), splitter(.226, 0, -.096, .397, .181, .312, schuppe),
      spitze(.273, -.151, -.027, .179, .157, .435, bein, -.39, 'cone6'),
      spitze(.568, -.269, .024, .13, .095, .264, '#f1e1bb', .9, 'cone6'),
      spitze(.306, .133, -.017, .198, .153, .414, bein, .26, 'cone6'),
      spitze(.335, -.004, .003, .168, .139, .525, '#ede4c6', .06, 'cone6'),
      facette(.235, 0, .07, .135, .103, .152)],
    // Leviathanzahn, eine breite, dreieckige Zahnplatte mit hinterer Flossenfassung.
    [griff(.293, petrol), scheibe(.171, 0, -.087, .353, .17, .203, '#456879'),
      spitze(.308, -.006, .006, .536, .165, .644, '#d8dbbe', .106),
      splitter(.385, -.037, -.073, .397, .15, .31, bein),
      steg('box', .32, -.192, .681, -.126, .056, .053, .053, '#457c83'),
      spitze(.238, -.1, -.009, .187, .098, .274, petrol, -2.15),
      facette(.265, .013, .102, .171, .105, .173)],
    // Strahlensiegel mit offenem Dreizack und langem Zentralprisma.
    [griff(.272, nachtblau), scheibe(.219, 0, -.079, .386, .162, .191, gold),
      spitze(.213, -.126, 0, .164, .145, .39, keramik, -.63), spitze(.213, .126, 0, .164, .145, .39, keramik, .63),
      spitze(.273, 0, -.007, .279, .176, .658, glanz, 0, 'cone6'),
      facette(.281, 0, .07, .156, .128, .152), scheibe(-.142, 0, -.06, .15, .12, .10, gold)],
  ],
  sword: [
    // Kurze gerade Eisenklinge mit schlichtem Bügel.
    [griff(.28, holz), balken(.20, 0, -.045, .316, .092, .094, eisen),
      balken(.556, 0, -.04, .181, .087, .65, stahl), spitze(.858, 0, 0, .185, .088, .198, stahl),
      balken(.19, .106, .039, .081, .027, .073)],
    // Breite geschmiedete Klinge mit eckiger erster Schneide und Mittelrippe.
    [griff(.30), scheibe(-.154, 0, -.07, .168, .139, .109), balken(.222, 0, -.062, .432, .124, .106, eisen),
      balken(.612, 0, -.056, .277, .107, .704, stahl), spitze(.948, 0, -.002, .276, .115, .297, silber),
      balken(.613, 0, .044, .073, .038, .601, '#79899c')],
    // Tentakelschwert, drei sich verjüngende Bögen um einen dunklen Griff.
    [griff(.29, violett), fassung(.208, 0, -.107, .296, .179, .177, schwarz),
      steg('rock2', .24, .014, .663, -.244, -.093, .362, .193, violett),
      steg('sphere', .535, -.212, .988, -.357, -.078, .267, .171, '#77527d'),
      steg('sphere', .884, -.365, 1.203, -.193, -.059, .209, .123, violett),
      spitze(1.126, -.238, .006, .15, .111, .306, '#9a6e8e', 1.17, 'cone6'),
      scheibe(.765, -.285, .049, .113, .058, .111), scheibe(.961, -.32, .04, .092, .045, .093, '#b687a0')],
    // Maisklinge, mit goldenem Kolben und offen auseinanderklappenden Blättern.
    [griff(.31, moos), fassung(.223, 0, -.078, .311, .151, .184, laub),
      facette(.732, 0, -.092, .351, .191, .961, '#efc45b'), spitze(1.043, 0, .006, .284, .169, .33, '#ffe6a4', 0, 'cone6'),
      spitze(.384, -.115, -.003, .237, .149, .57, moos, -.42), spitze(.384, .11, -.003, .22, .147, .51, laub, .45),
      scheibe(.372, 0, .068, .15, .067, .123)],
    // Frostbeil als Schwert, breite einseitige Eisscholle und langer Rücken.
    [griff(.33, nachtblau), steg('box', .197, -.203, .24, .209, -.07, .139, .132, petrol),
      balken(.689, -.061, -.077, .21, .15, .92, '#688da7'),
      splitter(.813, .134, -.116, .48, .237, .82, eis),
      spitze(1.037, .069, -.023, .368, .191, .508, glanz, -.38),
      spitze(.716, .276, -.004, .186, .14, .319, glanz, .74), balken(.766, .076, .072, .081, .052, .33)],
    // Sonnenschwert, großes Sonnenrad am Heft und flammenförmige Messerschneide.
    [griff(.32, rot), scheibe(.345, 0, -.143, .681, .277, .661, messing),
      scheibe(.345, 0, .108, .514, .094, .50, gold), facette(.345, 0, .177, .267, .134, .263),
      steg('box', .555, -.057, 1.163, .064, -.079, .296, .152, '#e99145'),
      spitze(1.052, .061, 0, .376, .172, .691, '#ffd884', -.202, 'cone6'),
      spitze(.616, -.091, .03, .216, .091, .499, '#fff0ad', -.51),
      scheibe(-.164, 0, -.064, .181, .131, .124, gold)],
    // Abgrundprädator, eine grobe Fangzahnreihe und die Spitze eines Harpunenschwerts.
    [griff(.33, schwarz), fassung(.224, -.03, -.069, .446, .151, .181, violett),
      balken(.702, -.087, -.106, .248, .203, .934, schwarz),
      spitze(.999, -.076, -.007, .403, .195, .746, '#81618f', -.164),
      spitze(.744, .05, .005, .233, .145, .365, bein, 1.36),
      spitze(1.044, .055, .014, .205, .167, .356, bein, 1.36),
      spitze(1.304, -.024, .017, .183, .158, .356, '#f0dcad', 1.16), balken(.879, -.084, .093, .102, .052, .562)],
    // Schiedsrichter, ein doppelter Kristall zwischen aufwärts gestellten Goldflügeln.
    [griff(.32, petrol), facette(.264, 0, -.099, .312, .219, .298, gold),
      spitze(.262, -.046, .006, .237, .169, .520, gold, -1.05),
      spitze(.262, .046, .006, .237, .169, .520, gold, 1.05),
      spitze(.401, -.093, .004, .217, .175, 1.155, glanz, -.118, 'cone6'),
      spitze(.401, .093, .004, .217, .175, 1.155, silber, .118, 'cone6'),
      facette(.703, 0, .082, .25, .103, .43), scheibe(-.158, 0, -.069, .181, .133, .119, gold)],
  ],
  blunt: [
    // Zusammengebundener, schief aufgesetzter Schuttkopf.
    [griff(.299, holz), balken(.316, 0, -.056, .112, .105, .667, holz),
      splitter(.71, .075, -.123, .391, .268, .345, '#847d76'),
      steg('box', .575, -.107, .813, .216, .065, .088, .047, leder), scheibe(.507, 0, -.06, .145, .12, .13)],
    // Schwerer Schmiedehammer mit echtem Querbalken und zwei planen Wangen.
    [griff(.299, holz), balken(.323, 0, -.058, .118, .109, .682, holz),
      balken(.753, 0, -.148, .604, .292, .278, eisen), balken(.751, -.294, -.172, .168, .343, .331, stahl),
      balken(.751, .294, -.172, .168, .343, .331, stahl), scheibe(.701, 0, .137, .184, .05, .171)],
    // Riesenkeule als knorriger Wurzelkopf mit Steinbesatz.
    [griff(.301, leder), steg('box', .045, 0, .563, .085, -.072, .135, .119, holz),
      steg('rock2', .407, .016, 1.166, .202, -.17, .581, .397, '#936746'),
      spitze(.739, .123, .006, .267, .242, .387, holz, 1.33, 'cone6'),
      spitze(.859, .008, .054, .221, .188, .305, bein, -1.38, 'cone6'),
      scheibe(.614, .08, .112, .231, .069, .229)],
    // Wüstenstachel, ein gegliederter Skorpionschwanz.
    [griff(.305, holz), balken(.363, 0, -.059, .131, .11, .77, bronze),
      steg('rock2', .475, -.008, .993, .118, -.128, .476, .344, '#b57b54'),
      steg('sphere', .824, .105, 1.167, .264, -.092, .306, .294, '#d3975d'),
      spitze(1.113, .245, .021, .264, .191, .436, bein, -.796, 'cone6'),
      spitze(.808, .002, .097, .163, .149, .31, bein, -1.31), facette(.899, .141, .151, .138, .092, .147)],
    // Tyrannenkeule, eiserne Krone mit metallenen Zinnen.
    [griff(.318, schwarz), balken(.391, 0, -.068, .151, .134, .84, eisen),
      fassung(.967, 0, -.215, .681, .429, .536, violett),
      balken(.976, -.268, .075, .264, .264, .484, gold), balken(.976, .267, .075, .264, .264, .484, gold),
      scheibe(.944, 0, .174, .481, .133, .443, messing), facette(.944, 0, .287, .229, .126, .224)],
    // Verdammnisstachel aus schwerer Platte und drei unterschiedlich langen Dornen.
    [griff(.329, rot), balken(.39, 0, -.069, .151, .13, .82, eisen),
      splitter(.894, -.032, -.181, .615, .393, .566, '#513043'),
      spitze(.921, .105, .027, .347, .258, .664, '#a46158', .26),
      spitze(.829, -.239, .036, .252, .259, .462, schwarz, -1.2),
      teil('cone6', .921, -.159, .121, .205, .323, .222, rubin), facette(.947, .071, .202, .147, .106, .133)],
    // Totenzermalmer, ein breiter Schädel mit dunkler Augenhöhle und Unterkiefer.
    [griff(.33, violett), balken(.392, 0, -.069, .152, .134, .864, schwarz),
      facette(.925, 0, -.177, .654, .436, .665, bein),
      balken(1.153, 0, -.197, .453, .169, .388, '#ac926f'),
      facette(1.063, -.151, .167, .182, .103, .163, schwarz), facette(1.063, .151, .167, .182, .103, .163, schwarz),
      spitze(1.184, -.192, -.011, .168, .163, .303, keramik, -.27, 'cone6'), facette(.874, 0, .219, .166, .137, .146)],
    // Unsterbliche Sonne, kreisförmige Krone mit drei Fensterstrahlen.
    [griff(.32, '#4e3b33'), balken(.387, 0, -.067, .157, .132, .844, messing),
      scheibe(1.066, 0, -.198, .768, .354, .751, gold), scheibe(1.066, 0, .128, .553, .133, .55, dunklesGold),
      facette(1.066, 0, .237, .317, .207, .312),
      spitze(1.066, -.289, -.027, .322, .192, .317, '#ffe4a6', -Math.PI / 2),
      spitze(1.066, .289, -.027, .322, .192, .317, '#ffe4a6', Math.PI / 2),
      spitze(1.32, 0, -.027, .321, .193, .356, '#ffe4a6')],
  ],
  crossbow: [
    // Hölzerne Armbrust mit zwei dünnen Segmenten und gespannter Sehne.
    [balken(.281, 0, -.062, .132, .119, .745, holz),
      steg('box', .51, -.018, .381, -.411, .027, .103, .084, '#a87954'),
      steg('box', .51, .018, .381, .411, .027, .103, .084, '#a87954'),
      balken(.385, 0, .055, .742, .032, .036, bein), balken(.596, 0, .087, .077, .077, .272)],
    // Kurze schwere Belagerungsarmbrust mit Metallbogen und äußerer Verstärkung.
    [griff(.331, holz), balken(.311, 0, -.087, .231, .173, .746, eisen),
      steg('box', .604, 0, .431, -.554, .061, .145, .102, stahl),
      steg('box', .604, 0, .431, .554, .061, .145, .102, stahl),
      balken(.425, -.521, .043, .18, .119, .251, eisen), balken(.425, .521, .043, .18, .119, .251, eisen),
      balken(.333, 0, .104, .991, .028, .037, bein), balken(.68, 0, .127, .082, .059, .329)],
    // Waldatem, lebende Äste mit Blattspitzen und ungleichem Wuchs.
    [griff(.301, holz), balken(.323, 0, -.069, .163, .135, .787, moos),
      steg('rock2', .584, 0, .395, -.583, -.028, .262, .169, '#6f6249'),
      steg('rock2', .584, 0, .523, .526, -.027, .252, .166, '#6f6249'),
      spitze(.46, -.355, .04, .239, .171, .402, laub, -1.36),
      spitze(.52, .324, .032, .223, .174, .354, moos, 1.14),
      steg('box', .372, -.483, .491, .53, .078, .032, .028, bein),
      facette(.647, 0, .097, .153, .121, .197)],
    // Nocturne in Fledermausform mit dünnen Membranen und langem Heck.
    [griff(.311, schwarz), balken(.313, 0, -.059, .16, .122, .83, schwarz),
      spitze(.626, -.119, -.016, .388, .138, .66, violett, -1.91),
      spitze(.626, .119, -.016, .388, .138, .66, violett, 1.91),
      spitze(.466, -.418, .009, .256, .107, .411, schwarz, -2.31),
      spitze(.466, .418, .009, .256, .107, .411, schwarz, 2.31),
      facette(.592, 0, .066, .194, .116, .258), balken(.261, 0, .065, .843, .025, .036, stahl)],
    // Albtraumauge mit offenem Blick und gebogenen knöchernen Wimpern.
    [griff(.313, violett), facette(.437, 0, -.139, .587, .274, .67, rot),
      spitze(.517, -.223, -.003, .26, .166, .564, bein, -1.73, 'cone6'),
      spitze(.517, .223, -.003, .26, .166, .564, bein, 1.73, 'cone6'),
      spitze(.364, -.421, .042, .176, .099, .39, violett, -2.31),
      spitze(.364, .421, .042, .176, .099, .39, violett, 2.31),
      scheibe(.481, 0, .099, .334, .124, .299, bein), facette(.481, 0, .204, .142, .106, .178)],
    // Kristallbolzen mit dreieckigen Glasarmen und langer ausgefahrener Spitze.
    [griff(.318, petrol), fassung(.378, 0, -.075, .252, .164, .907, blau),
      spitze(.48, -.071, -.009, .33, .184, .643, eis, -1.03, 'cone6'),
      spitze(.48, .071, -.009, .33, .184, .643, eis, 1.03, 'cone6'),
      steg('box', .29, -.551, .29, .551, .057, .044, .035, stahl),
      spitze(.607, 0, .092, .192, .148, .639, glanz, 0, 'cone6'), facette(.594, 0, .139, .178, .106, .184)],
    // Höllenbolzen, gezackte Doppelhörner mit glühender Lanze.
    [griff(.319, schwarz), balken(.345, 0, -.067, .244, .142, .872, rot),
      spitze(.496, -.088, .0, .373, .179, .599, schwarz, -1.18, 'cone6'),
      spitze(.496, .088, .0, .373, .179, .599, schwarz, 1.18, 'cone6'),
      spitze(.631, -.48, .043, .233, .118, .433, glut, -.81),
      spitze(.631, .48, .043, .233, .118, .433, glut, .81),
      spitze(.572, 0, .083, .174, .15, .682, '#ebbc7c', 0, 'cone6'), facette(.539, 0, .128, .164, .117, .163)],
    // Aufstieg, geschwungener Zeremonialbogen mit goldenen Enden und Elfenbeingriff.
    [fassung(.32, 0, -.073, .227, .163, .917, keramik),
      steg('sphere', .657, .02, .43, .451, -.057, .245, .174, gold),
      steg('sphere', .657, -.02, .43, -.451, -.057, .245, .174, gold),
      steg('box', .478, .39, .337, .721, -.016, .105, .106, keramik),
      steg('box', .478, -.39, .337, -.721, -.016, .105, .106, keramik),
      balken(.335, 0, .073, 1.34, .028, .026, '#b69057'),
      spitze(.605, 0, .096, .176, .132, .669, glanz, 0, 'cone6'),
      scheibe(.55, 0, .098, .284, .121, .258)],
  ],
  gun: [
    // Alte Holzpistole, stumpfer kurzer Lauf mit aufgesetztem Korn.
    [gedreht(balken(.008, 0, -.216, .127, .269, .187, holz), 0, -.27),
      balken(.245, 0, .018, .163, .153, .513, eisen), balken(.494, 0, .044, .117, .101, .235, schwarz),
      balken(.528, 0, .147, .071, .035, .128)],
    // Jagdgewehr, geschwungene Schulterstütze und sichtbar freiliegender langer Lauf.
    [gedreht(balken(.031, 0, -.192, .127, .244, .188, holz), 0, -.33),
      facette(-.242, 0, -.164, .168, .204, .499, holz), balken(.276, 0, .029, .191, .131, .486, eisen),
      balken(.444, 0, -.045, .152, .103, .498, holz), balken(.889, 0, .078, .105, .094, .69, stahl),
      balken(.382, 0, .152, .115, .066, .177)],
    // Frostpistole mit seitlich aufgeschichtetem Prisma statt Gehäuse.
    [balken(.034, 0, -.189, .135, .25, .241, petrol), balken(.286, -.05, .006, .201, .18, .518, blau),
      spitze(.307, .092, .034, .367, .285, .517, eis, .17, 'cone6'),
      spitze(.32, -.109, .043, .205, .189, .464, glanz, -.22), balken(.682, 0, .043, .12, .118, .204, stahl),
      facette(.372, .008, .179, .153, .125, .178)],
    // Sonnenpistole, eine kleine bronzene Radkammer mit seitlichem Knauf.
    [balken(.019, 0, -.191, .157, .253, .253, leder), balken(.312, 0, -.008, .238, .209, .71, bronze),
      scheibe(.326, 0, -.066, .458, .288, .404, gold), scheibe(.326, 0, .199, .228, .072, .221),
      balken(.74, 0, .031, .199, .166, .398, messing), balken(.899, 0, .015, .267, .195, .139, eisen),
      scheibe(-.088, 0, -.245, .162, .098, .183, messing)],
    // Drachenbrüllen, ein fein gefasster Bronzekopf mit seitlichen Augen und Reißzähnen.
    [gedreht(balken(.044, 0, -.243, .166, .298, .272, schuppe), 0, -.24),
      splitter(.448, 0, -.13, .443, .377, .712, bronze),
      gedreht(fassung(.667, 0, .119, .369, .432, .219, '#b67153'), 0, Math.PI / 2),
      gedreht(balken(.779, 0, -.205, .354, .098, .462, '#664234'), 0, -.19),
      teil('cone6', .887, -.107, -.135, .106, .21, .115, bein),
      spitze(.395, -.162, .171, .164, .161, .321, bein, -2.27, 'cone6'),
      facette(.597, .173, .12, .157, .139, .164), facette(.597, -.173, .12, .157, .139, .164)],
    // Reliktstrahl, großer technischer Ring und gerader Kristall zwischen Schienen.
    [balken(-.066, 0, -.229, .153, .275, .239, leder), balken(.301, 0, -.087, .303, .246, .773, eisen),
      balken(.82, -.195, .009, .123, .213, .94, bronze), balken(.82, .195, .009, .123, .213, .94, bronze),
      facette(.837, 0, .049, .215, .162, .683), gedreht(scheibe(.478, 0, .079, .365, .096, .41, stahl), 0, Math.PI / 2),
      balken(1.258, 0, -.034, .523, .194, .141, schwarz)],
    // Feuerdrachenkanone, ein schwerer rotgeschuppter Schädel mit weit offenem Maul.
    [gedreht(balken(.061, 0, -.253, .183, .318, .296, schwarz), 0, -.29),
      splitter(.492, 0, -.146, .654, .432, .806, rot),
      gedreht(fassung(.703, 0, .173, .576, .589, .271, '#a74d50'), 0, Math.PI / 2),
      gedreht(balken(.938, 0, -.299, .484, .147, .727, '#683540'), 0, -.27),
      spitze(.453, -.217, .16, .232, .187, .434, bein, -2.46, 'cone6'),
      spitze(.453, .217, .16, .232, .187, .434, bein, 2.46, 'cone6'),
      facette(.656, -.22, .201, .193, .158, .207), teil('cone6', 1.054, -.153, -.185, .169, .269, .179, bein)],
    // Himmelsgericht, asymmetrische vergoldete Lanze mit offenem Kern.
    [balken(-.048, 0, -.242, .182, .282, .324, petrol), fassung(.329, 0, -.082, .429, .266, .677, gold),
      spitze(.622, -.161, .036, .209, .171, .79, keramik, -.267),
      spitze(.622, .16, .036, .209, .171, .79, keramik, .39),
      facette(.809, 0, .011, .278, .259, .56), scheibe(.381, 0, .156, .274, .091, .275, messing),
      spitze(.364, -.031, .19, .194, .19, .47, silber, -2.73), spitze(1.026, -.02, .076, .276, .166, .48, glanz, .095)],
  ],
  staff: [
    // Holzstab mit schwerem Übungswürfel.
    [griff(.29, holz), balken(.424, 0, -.044, .093, .093, .881, holz),
      balken(.973, 0, -.135, .261, .262, .273, eisen), balken(.974, 0, .109, .151, .052, .149)],
    // Kurzer Zauberstab mit kleiner Manaperle und sauberem Sockel.
    [griff(.28, leder), balken(.347, 0, -.041, .081, .087, .759, holz),
      fassung(.724, 0, -.059, .199, .122, .194, stahl), facette(.892, 0, -.099, .237, .216, .233),
      scheibe(-.149, 0, -.05, .129, .099, .108, eisen)],
    // Lunaris mit dünnem Silberhalbmond um einen einzelnen Stein.
    [griff(.291, violett), balken(.442, 0, -.045, .101, .096, 1.005, nachtblau),
      steg('sphere', .889, .039, 1.199, -.259, -.104, .224, .198, silber),
      steg('sphere', 1.082, -.232, 1.446, -.242, -.091, .178, .171, silber),
      spitze(1.322, -.253, -.006, .202, .153, .36, silber, .91),
      facette(1.207, .025, -.086, .226, .179, .226), scheibe(.859, 0, -.067, .183, .131, .167, messing)],
    // Gletscherhorn mit breiter Wurzel und zwei hoch stehenden Eiszähnen.
    [griff(.302, blau), balken(.435, 0, -.045, .105, .101, .984, petrol),
      splitter(1.049, -.017, -.127, .338, .252, .453, eis),
      spitze(1.095, -.112, .013, .274, .218, .578, glanz, -.377, 'cone6'),
      gedreht(teil('cone6', 1.272, .084, .011, .212, .414, .186, '#d7f1f4'), .12, .5, -.48),
      facette(1.026, .143, .078, .178, .122, .207), scheibe(.831, 0, -.058, .165, .111, .168, stahl)],
    // Arkanes Auge, eine wuchtige Lidfassung mit Spitzen und leuchtender Pupille.
    [griff(.30, rot), balken(.468, 0, -.049, .117, .103, 1.065, schwarz),
      facette(1.181, 0, -.179, .602, .369, .497, violett),
      facette(1.197, 0, .126, .392, .135, .286, bein), facette(1.201, 0, .232, .173, .103, .163),
      spitze(1.181, -.194, .023, .29, .15, .328, gold, -Math.PI / 2),
      spitze(1.181, .194, .023, .29, .15, .328, gold, Math.PI / 2)],
    // Finsternisstab, dunkler Himmelskörper mit Sonnenkranz und zwei Außenzähnen.
    [griff(.309, schwarz), balken(.481, 0, -.06, .115, .115, 1.076, violett),
      scheibe(1.216, 0, -.174, .696, .342, .696, messing), scheibe(1.228, 0, .139, .531, .089, .524, schwarz),
      facette(1.339, .122, .2, .187, .125, .198),
      spitze(1.334, -.184, .026, .216, .169, .461, gold, .13),
      spitze(1.289, .26, .009, .178, .147, .353, '#e9ba6d', -.36), scheibe(-.154, 0, -.069, .16, .131, .11, gold)],
    // Erlöserstab, heller Stern mit abstehenden beweglich wirkenden Federn.
    [griff(.304, petrol), balken(.496, 0, -.048, .117, .107, 1.066, stahl),
      facette(1.088, 0, -.11, .312, .222, .267, gold),
      spitze(1.066, -.089, .009, .274, .179, .53, silber, -.86),
      spitze(1.066, .089, .009, .274, .179, .53, silber, .86),
      spitze(1.035, -.117, .006, .192, .143, .403, keramik, -1.74),
      spitze(1.035, .117, .006, .192, .143, .403, keramik, 1.74),
      facette(1.34, 0, -.095, .286, .237, .43)],
    // Karmesinzepter, gezackte Goldkrone um eine große rote Tropfenform.
    [griff(.325, schwarz), balken(.459, 0, -.058, .124, .119, 1.075, rot),
      fassung(1.045, 0, -.144, .474, .29, .287, messing),
      facette(1.341, 0, -.162, .386, .34, .587, rubin),
      spitze(1.065, -.193, -.043, .191, .18, .597, gold, -.18, 'cone6'),
      spitze(1.065, .193, -.043, .191, .18, .597, gold, .18, 'cone6'),
      gedreht(teil('cone6', 1.150, -.018, .031, .184, .373, .163, gold), .07, .79, .20),
      facette(1.325, 0, .149, .132, .124, .233)],
  ],
};

// Die S-Stufen teilen je Art ein eigenständiges, gut erkennbares Grundmodell.
const SERIE_S = {
  // Doppelkrallen mit sichtbarer Achse und vorwärts gerichteten Klingen.
  dagger: [griff(.28, schwarz), scheibe(.227, 0, -.107, .439, .201, .281, eisen),
    spitze(.297, -.143, -.011, .224, .158, .654, silber, -.187),
    spitze(.268, .143, -.011, .225, .156, .579, glanz, .226),
    spitze(.479, -.166, .037, .142, .114, .343, stahl, .626),
    spitze(.459, .165, .037, .136, .109, .307, stahl, -.69),
    scheibe(.226, 0, .061, .231, .124, .2), scheibe(-.143, 0, -.059, .16, .116, .109, messing)],
  // Ein hoher gerader Klingenarm neben einer gegenläufigen Mondsichel.
  sword: [griff(.333, violett), fassung(.221, 0, -.092, .398, .183, .232, messing),
    balken(.787, .115, -.08, .173, .156, 1.1, silber),
    spitze(1.313, .115, 0, .174, .163, .41, silber),
    steg('rock2', .221, -.08, .772, -.473, -.08, .269, .175, nachtblau),
    steg('sphere', .628, -.419, 1.293, -.435, -.086, .245, .189, stahl),
    spitze(1.162, -.484, .004, .215, .17, .499, silber, 1.016), balken(.826, .128, .068, .071, .056, .603)],
  // Glockenhammer: nach vorne geöffnete Resonanzglocke mit Schlagbolzen.
  blunt: [griff(.329, schwarz), balken(.396, 0, -.066, .152, .133, .878, eisen),
    gedreht(fassung(1.329, 0, .032, .726, .643, .58, bronze), 0, -Math.PI / 2),
    gedreht(scheibe(1.364, 0, .031, .759, .11, .609, gold), 0, -Math.PI / 2),
    gedreht(scheibe(1.392, 0, .032, .541, .067, .441, schwarz), 0, -Math.PI / 2),
    facette(1.441, 0, -.108, .266, .274, .294), balken(.884, -.208, -.157, .299, .251, .375, messing),
    balken(.884, .208, -.157, .299, .251, .375, messing)],
  // Aufziehmechanik, asymmetrische Führungen und ein großer Mittelbolzen.
  crossbow: [griff(.324, schwarz), balken(.348, 0, -.079, .236, .164, .939, eisen),
    steg('box', .556, -.008, .365, -.651, .02, .201, .142, messing),
    steg('rock2', .553, .008, .661, .644, -.014, .262, .181, stahl),
    scheibe(.366, -.572, .092, .259, .105, .27, bronze), scheibe(.646, .553, .083, .268, .102, .274, messing),
    spitze(.603, 0, .121, .222, .179, .687, glanz, 0, 'cone6'), facette(.546, 0, .145, .238, .145, .235)],
  // Pulsnova, ein breites kreisförmiges Gehäuse mit axialer Doppelschiene.
  gun: [gedreht(balken(.039, 0, -.24, .171, .285, .239, schwarz), 0, -.27),
    scheibe(.492, 0, -.201, .631, .383, .589, violett), scheibe(.492, 0, .143, .444, .118, .431, eisen),
    facette(.493, 0, .224, .249, .138, .238),
    steg('box', .606, -.246, 1.28, -.165, .014, .142, .179, stahl),
    steg('box', .606, .246, 1.28, .165, .014, .142, .179, stahl),
    facette(1.075, 0, -.021, .231, .178, .563), balken(-.111, 0, -.046, .171, .164, .227, messing)],
  // Walkürenstab als Standarte mit zwei seitlich gestellten Spitzen.
  staff: [griff(.322, petrol), balken(.501, 0, -.067, .112, .123, 1.112, messing),
    spitze(1.018, -.118, -.004, .267, .164, .533, silber, -1.273),
    spitze(1.018, .118, -.004, .267, .164, .533, silber, 1.273),
    spitze(1.055, -.012, .031, .304, .156, .629, keramik, .02, 'cone6'),
    steg('box', .578, .137, 1.159, .319, -.046, .215, .074, nachtblau),
    facette(1.138, 0, .087, .203, .115, .191), scheibe(-.151, 0, -.06, .169, .122, .113, gold)],
};

const WAFFENKLASSEN_MODELLE = {
  sword: [['box', 0.1, 0, 0, 0.1, 0.1, 0.3, '#7a4a2c'], ['box', 0.27, 0, 0, 0.42, 0.1, 0.08, '#f0c14b'], ['box', 0.75, 0, 0.01, 0.16, 0.07, 0.95, '#e8eef5', 0.15]],
  dagger: [['box', 0.08, 0, 0, 0.09, 0.09, 0.22, '#5a3a6a'], ['box', 0.2, 0, 0, 0.28, 0.09, 0.07, '#b04bd0'], ['box', 0.45, 0, 0.01, 0.12, 0.06, 0.5, '#e8eef5', 0.15]],
  blunt: [['box', 0.35, 0, 0, 0.1, 0.1, 0.8, '#7a4a2c'], ['box', 0.85, 0, -0.12, 0.42, 0.36, 0.36, '#8a8e9c'], ['cone6', 0.85, 0, 0.24, 0.16, 0.2, 0.16, '#c5c8d2']],
  crossbow: [['box', 0.4, 0, 0, 0.14, 0.12, 0.85, '#8a5a3c'], ['box', 0.7, 0, 0.02, 0.9, 0.08, 0.1, '#5a5e6c'], ['box', 0.85, 0, 0.1, 0.06, 0.05, 0.4, '#e8eef5']],
  gun: [['box', 0.35, 0, 0, 0.16, 0.2, 0.7, '#4a4d5c'], ['box', 0.1, 0, -0.16, 0.14, 0.24, 0.16, '#7a4a2c'], ['box', 0.8, 0, 0.06, 0.09, 0.09, 0.3, '#2a2a32']],
  staff: [['box', 0.5, 0, 0, 0.09, 0.09, 1.1, '#7a5236'], ['sphere', 1.1, 0, -0.1, 0.34, 0.34, 0.34, '#7fd8ff', 1]],
  fist: [['box', 0.3, 0, 0, 0.22, 0.22, 0.3, '#f1c9a5']],
};

// Standardwerte für die direkt benutzbare Tabelle. Spiel und Modellbögen lesen ihre Farben aus dem Content.
const BASISFARBEN = ['#bbbbbb', '#66cc66', '#5599ff', '#bb66ff', '#ffbb33', '#ff7733', '#ff4466', '#33dddd', '#ffffff'];
const LEUCHTEN = [0, 0, 0, .24, .37, .50, .64, .80, .96];

function sechsstelligeFarbe(farbe, stufe) {
  if (/^#[0-9a-f]{3}$/i.test(farbe)) return '#' + [...farbe.slice(1)].map((c) => c + c).join('').toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(farbe) ? farbe.toLowerCase() : BASISFARBEN[stufe];
}

export function buildWeaponParts(seltenheiten) {
  const farben = seltenheiten ? Object.fromEntries(seltenheiten.map(({ idx, color }) => [idx, color])) : BASISFARBEN;
  const modelle = Object.assign(Object.create(null), WAFFENKLASSEN_MODELLE);
  const farbig = (teile, stufe) => {
    const akzent = sechsstelligeFarbe(farben[stufe], stufe);
    return teile.map(([form, v, r, h, b, d, l, farbe, drehung]) => {
      const t = [form, v, r, h, b, d, l, farbe ?? akzent, farbe == null ? LEUCHTEN[stufe] : 0];
      if (drehung) drehungen.set(t, drehung);
      return t;
    });
  };
  for (const [art, modelleN] of Object.entries(NORMAL)) {
    modelleN.forEach((teile, stufe) => { modelle[`w_${art}_n_${stufe}`] = farbig(teile, stufe); });
    for (let stufe = 3; stufe <= 8; stufe++) modelle[`w_${art}_s_${stufe}`] = farbig(SERIE_S[art], stufe);
  }
  return modelle;
}

export const WEAPON_PARTS = buildWeaponParts();
