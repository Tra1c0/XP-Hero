// Waffenteile [Form, vorn, rechts, Höhe, Breite, Höhe, Länge, Farbe] in Metern.
// Der Griff sitzt am Ursprung. Ein Teil ohne feste Farbe übernimmt die Seltenheitsfarbe.
const holz = '#79523d', leder = '#493631', eisen = '#555e69', stahl = '#9cabb8', silber = '#e0e9ee';
const messing = '#b88a4d', gold = '#edb955', schwarz = '#282636', bein = '#e4d2ac';
const eis = '#8ed3e3', glanz = '#c8f3ee', violett = '#4c355b', rot = '#9c3640', glut = '#ef743f';
const moos = '#4c7050', laub = '#8baa63', petrol = '#25575f', blau = '#426e95';

const teil = (form, vorn, rechts, hoehe, breite, dicke, laenge, farbe) =>
  [form, vorn, rechts, hoehe, breite, dicke, laenge, farbe];
const balken = (v, r, h, b, d, l, f) => teil('box', v, r, h, b, d, l, f);
const griff = (laenge, farbe = leder) => balken(0, 0, -.04, .105, .08, laenge, farbe);
const scheibe = (v, r, h, b, d, l, f) => teil('cyl8', v, r, h, b, d, l, f);
const facette = (v, r, h, b, d, l, f) => teil('sphere', v, r, h, b, d, l, f);
const splitter = (v, r, h, b, d, l, f) => teil('rock2', v, r, h, b, d, l, f);
const fassung = (v, r, h, b, d, l, f) => teil('frustum6', v, r, h, b, d, l, f);

// Die N-Reihe wächst je Klasse von einfachen Werkstoffen zu eigenen Silhouetten.
// Jede Zeile steht in Reihenfolge für Normal bis Exotic.
const NORMAL = {
  dagger: [
    // Vernieteter Schrottdolch, schräg ausgebrochene Spitze.
    [griff(.22, holz), balken(.15, 0, -.039, .21, .075, .085, eisen),
      balken(.34, -.026, -.034, .15, .069, .36, '#74707a'), splitter(.51, -.045, -.034, .14, .067, .24, eisen),
      balken(.16, .071, .037, .066, .027, .08)],
    // Symmetrischer Stahldolch mit schmaler Mittelrippe.
    [griff(.24), scheibe(-.12, 0, -.045, .13, .09, .085, stahl),
      balken(.16, 0, -.037, .31, .079, .073), facette(.43, 0, -.052, .218, .107, .65, stahl),
      balken(.38, 0, .023, .046, .035, .33, silber)],
    // Henkersnagel: eckiger Knebel und überlanger Dorn.
    [griff(.24, schwarz), balken(.17, 0, -.055, .38, .12, .103, eisen),
      balken(.31, 0, -.052, .133, .105, .29, stahl), facette(.59, 0, -.069, .13, .141, .57, silber),
      scheibe(.23, .138, .055, .10, .035, .10)],
    // Spinner mit zwei gegenüberliegenden Schneiden um eine Lagerplatte.
    [griff(.21, schwarz), scheibe(.36, 0, -.061, .43, .13, .42, violett),
      scheibe(.36, 0, .066, .23, .043, .23), facette(.47, -.205, -.05, .29, .11, .32, stahl),
      facette(.25, .205, -.05, .29, .11, .32, silber), splitter(.58, -.23, -.033, .15, .072, .26, stahl),
      splitter(.14, .23, -.032, .15, .072, .21, stahl)],
    // Blutdolch: dunkle Rückenleiste mit roter Bauchschneide.
    [griff(.27, schwarz), balken(.17, .023, -.05, .36, .113, .099, messing),
      splitter(.41, -.028, -.049, .27, .114, .62, rot), facette(.59, .064, -.048, .154, .112, .51, '#c3545b'),
      balken(.41, .015, .052, .075, .053, .24), scheibe(-.135, 0, -.058, .145, .116, .11, messing)],
    // Drachenklaue mit offener Gabel, Schuppen und hellem Horn.
    [griff(.24, rot), fassung(.15, 0, -.064, .32, .145, .19, messing),
      splitter(.37, -.075, -.054, .24, .129, .47, bein), facette(.62, -.137, -.06, .16, .13, .46, '#f5e4b9'),
      facette(.43, .12, -.053, .17, .123, .38, rot), facette(.24, .035, .068, .15, .087, .15),
      splitter(.66, .148, -.037, .15, .094, .23, messing)],
    // Leviathanzahn: langer heller Zahn und seitliche Flossen am Ansatz.
    [griff(.26, petrol), fassung(.19, 0, -.064, .36, .13, .19, blau),
      splitter(.43, 0, -.072, .32, .157, .55, bein), facette(.68, .045, -.08, .215, .16, .43, '#dbe1c8'),
      splitter(.33, -.186, -.05, .16, .114, .34, petrol), facette(.27, .14, -.039, .15, .104, .23, petrol),
      balken(.46, .025, .072, .069, .06, .30)],
    // Strahlenklinge: zwei Schulterstrahlen und kristalline Mittelspitze.
    [griff(.25, '#314a58'), scheibe(.17, 0, -.074, .38, .164, .21, gold),
      facette(.35, -.18, -.07, .17, .155, .38, glanz), facette(.35, .18, -.07, .17, .155, .38, glanz),
      facette(.53, 0, -.085, .24, .20, .66, silber), facette(.45, 0, .075, .115, .105, .27),
      scheibe(-.13, 0, -.062, .147, .136, .096, gold)],
  ],
  sword: [
    // Anfängerschwert: gerade Eisenklinge, kurzer Querbügel, Holzgriff.
    [griff(.27, holz), balken(.21, 0, -.044, .34, .093, .105, eisen),
      balken(.58, 0, -.034, .183, .079, .66, stahl), facette(.91, 0, -.039, .183, .086, .246, stahl),
      balken(.19, .113, .042, .08, .03, .074)],
    // Kampfschwert: gegabelter Knauf, breite Schulter und abgesetzte Schneide.
    [griff(.29), balken(.222, 0, -.056, .43, .116, .111, eisen),
      scheibe(-.155, 0, -.061, .15, .123, .12), balken(.54, 0, -.053, .244, .11, .53, stahl),
      facette(.88, 0, -.058, .251, .123, .52, silber), balken(.52, 0, .044, .057, .038, .45, eisen)],
    // Abgrundtentakel: gekrümmte Masse aus versetzten Segmenten mit Saugnäpfen.
    [griff(.29, violett), scheibe(.21, 0, -.071, .333, .139, .189, schwarz),
      splitter(.44, -.055, -.077, .277, .172, .53, violett), facette(.71, -.169, -.068, .258, .161, .50, '#725478'),
      splitter(.98, -.12, -.044, .214, .114, .34, violett), facette(1.11, .021, -.031, .208, .092, .22, '#8f6684'),
      scheibe(.62, -.185, .073, .105, .065, .106), scheibe(.86, -.111, .059, .101, .061, .113, '#b687a0')],
    // Maisklinge: goldener Kolben, zwei grüne Hüllblätter.
    [griff(.30, '#406142'), fassung(.23, 0, -.066, .35, .142, .25, laub),
      facette(.63, 0, -.084, .308, .177, .87, '#f2cb63'), facette(.92, 0, -.076, .28, .159, .47, '#ffe4a1'),
      facette(.50, -.155, -.058, .20, .136, .58, moos), facette(.48, .143, -.064, .20, .136, .49, laub),
      scheibe(.301, 0, .065, .128, .056, .109)],
    // Frostklinge: breite Eisscholle mit versetzter Spitze und gefrorener Parierstange.
    [griff(.29, blau), fassung(.21, 0, -.07, .48, .155, .197, petrol),
      splitter(.57, -.045, -.089, .354, .181, .73, eis), facette(.91, .01, -.089, .272, .177, .66, '#d7f9f7'),
      splitter(1.20, .052, -.068, .207, .152, .37, eis), balken(.56, .025, .073, .080, .043, .41),
      facette(.29, .19, -.056, .20, .124, .22, silber)],
    // Sonnenschwert: Sonnenscheibe, eingesetzter Kern und breite Flammenschneide.
    [griff(.31, '#573d31'), scheibe(.29, 0, -.104, .57, .212, .54, messing),
      scheibe(.29, 0, .09, .371, .077, .365, gold), facette(.29, 0, .154, .231, .12, .235),
      balken(.76, 0, -.076, .304, .153, .70, '#e99642'), facette(1.06, 0, -.086, .365, .179, .73, '#ffd581'),
      facette(1.42, 0, -.068, .245, .151, .43, '#fff0c1'), scheibe(-.155, 0, -.065, .176, .135, .115, gold)],
    // Abgrundjäger: gegabelte Raubklinge, helle Zähne und dunkler Rücken.
    [griff(.30, schwarz), fassung(.20, 0, -.084, .46, .181, .23, violett),
      balken(.62, .018, -.079, .27, .185, .71, schwarz), splitter(.98, -.146, -.103, .31, .22, .77, violett),
      facette(1.22, -.17, -.078, .20, .169, .72, '#856b98'), facette(1.08, .161, -.071, .22, .166, .55, bein),
      facette(.61, .20, -.067, .19, .157, .31, stahl), balken(.77, -.035, .101, .118, .068, .49)],
    // Göttlicher Schiedsrichter: Wächterflügel, Doppelklinge und zentraler Lichtsteg.
    [griff(.31, petrol), scheibe(-.153, 0, -.067, .172, .137, .13, gold),
      facette(.31, -.235, -.072, .32, .163, .49, gold), facette(.31, .235, -.072, .32, .163, .49, gold),
      facette(.87, -.125, -.104, .211, .206, 1.12, glanz), facette(.87, .125, -.104, .211, .206, 1.12, silber),
      balken(.82, 0, .086, .107, .07, .79), facette(1.34, 0, -.085, .173, .171, .46, silber)],
  ],
  blunt: [
    // Gebrochener Streitkolben: abgerissener Stein und Reparaturring.
    [griff(.29, holz), balken(.34, 0, -.054, .112, .105, .67, holz),
      splitter(.686, -.056, -.112, .34, .26, .28, '#777582'), splitter(.716, .085, -.069, .205, .156, .196, eisen),
      scheibe(.53, 0, -.059, .145, .12, .17)],
    // Vorschlaghammer: zwei schwere, abgesetzte Schlagflächen.
    [griff(.29, holz), balken(.33, 0, -.057, .118, .111, .75, holz),
      balken(.77, 0, -.142, .56, .298, .302, eisen), balken(.77, -.28, -.165, .148, .352, .354, stahl),
      balken(.77, .28, -.165, .148, .352, .354, stahl), balken(.76, 0, .15, .245, .05, .179)],
    // Riesenkeule mit schwerem Holzbulbus und Steinbesatz.
    [griff(.28), balken(.34, 0, -.064, .143, .12, .72, holz),
      splitter(.78, 0, -.159, .539, .388, .635, '#956746'),
      splitter(.86, -.208, .006, .22, .20, .26, eisen), splitter(.98, .085, .10, .22, .19, .22, stahl),
      scheibe(.54, 0, .005, .26, .093, .20)],
    // Wüstenstachel: gebogener Rücken und gestaffelte Stacheln am Kopf.
    [griff(.3, '#815c44'), balken(.37, 0, -.049, .124, .114, .75, holz),
      facette(.86, .047, -.157, .381, .35, .52, '#bb8957'),
      teil('cone6', .76, -.093, .07, .166, .259, .17, bein), teil('cone6', .95, .067, .094, .169, .303, .176, bein),
      splitter(1.14, .066, -.049, .192, .128, .375, '#e5bc7c'), facette(.88, .018, .124, .128, .074, .135)],
    // Tyrannenkeule: schwerer, geflanschter Panzer mit Kronenring.
    [griff(.31, schwarz), balken(.36, 0, -.058, .136, .119, .78, eisen),
      fassung(.92, 0, -.202, .58, .449, .48, violett),
      balken(.89, -.265, -.136, .19, .311, .387, stahl), balken(.89, .265, -.136, .19, .311, .387, stahl),
      scheibe(.92, 0, .213, .36, .096, .337, gold), facette(.92, 0, .291, .166, .092, .166)],
    // Verdammnisstachel: Vorwärtsdorn, dunkles Gegengewicht und glühender Einsatz.
    [griff(.31, schwarz), balken(.39, 0, -.057, .136, .123, .82, violett),
      splitter(.87, 0, -.179, .54, .417, .50, rot), facette(1.18, .028, -.114, .295, .226, .66, '#ca7062'),
      teil('cone6', .85, 0, .18, .176, .263, .18, eisen), splitter(.93, -.233, -.056, .23, .188, .283, schwarz),
      balken(.94, .149, .139, .121, .067, .203)],
    // Totenzermalmer: Knochensattel mit zwei getrennten Schlagköpfen.
    [griff(.31, '#44404a'), balken(.37, 0, -.064, .15, .131, .82, holz),
      splitter(.96, 0, -.174, .48, .394, .48, bein),
      balken(.936, -.286, -.15, .255, .343, .399, schwarz), balken(.936, .286, -.15, .255, .343, .399, schwarz),
      fassung(.94, 0, .167, .245, .125, .218, stahl), facette(.94, 0, .268, .148, .116, .145)],
    // Unsterbliche Sonne: radförmiger Schlagkopf mit vier axialen Zähnen.
    [griff(.32, '#4e3b33'), balken(.38, 0, -.071, .158, .141, .86, messing),
      scheibe(1.00, 0, -.173, .754, .333, .754, messing), scheibe(1.00, 0, .125, .555, .13, .555, gold),
      facette(1, 0, .214, .293, .166, .293), facette(.99, -.388, -.073, .283, .209, .245, '#ffd581'),
      facette(.99, .388, -.073, .283, .209, .245, '#ffd581'), facette(1.393, 0, -.073, .238, .209, .281, '#ffd581')],
  ],
  crossbow: [
    // Hölzerner Schaft mit geradem Bogen und heller Sehne.
    [griff(.31, holz), balken(.30, 0, -.051, .142, .108, .69, holz),
      balken(.55, 0, .018, .858, .092, .105, '#9b744d'), balken(.33, 0, .033, .668, .036, .041, bein),
      balken(.632, 0, .070, .092, .058, .279)],
    // Schwere Armbrust: dicker Metallbügel mit zwei verstärkten Enden.
    [griff(.32, holz), balken(.32, 0, -.072, .23, .156, .71, eisen),
      balken(.568, 0, .054, 1.09, .108, .138, stahl), balken(.46, -.49, .054, .15, .102, .35, eisen),
      balken(.46, .49, .054, .15, .102, .35, eisen), balken(.31, 0, .081, .887, .036, .043),
      balken(.67, 0, .12, .072, .049, .39, silber)],
    // Waldatem: zweigeteilte Bogenblätter mit Spitzen aus hellem Holz.
    [griff(.31, holz), balken(.31, 0, -.053, .181, .116, .79, moos),
      facette(.575, -.256, -.028, .55, .15, .367, laub), facette(.575, .256, -.028, .55, .15, .367, laub),
      facette(.43, -.52, -.04, .224, .132, .294, holz), facette(.43, .52, -.04, .224, .132, .294, holz),
      balken(.64, 0, .093, .093, .069, .37), balken(.282, 0, .052, .946, .031, .054, bein)],
    // Nocturne: Fledermausflügel und freiliegender Nachtbolzen.
    [griff(.29, schwarz), balken(.31, 0, -.059, .157, .117, .79, violett),
      splitter(.56, -.29, -.034, .62, .149, .39, schwarz), splitter(.56, .29, -.034, .62, .149, .39, schwarz),
      facette(.37, -.57, -.022, .27, .137, .44, violett), facette(.37, .57, -.022, .27, .137, .44, violett),
      balken(.643, 0, .085, .087, .054, .43), balken(.214, 0, .06, .99, .027, .038, stahl)],
    // Albtraumauge: gepanzerter Leib mit Pupille oberhalb der Schiene.
    [griff(.29, schwarz), splitter(.35, 0, -.083, .352, .181, .80, rot),
      facette(.55, -.27, -.045, .56, .179, .345, violett), facette(.55, .27, -.045, .56, .179, .345, violett),
      splitter(.41, -.565, -.05, .24, .154, .388, schwarz), splitter(.41, .565, -.05, .24, .154, .388, schwarz),
      scheibe(.49, 0, .075, .248, .119, .24, bein), facette(.5, 0, .174, .119, .075, .123)],
    // Kristallbolzen: zwei separate Eisprismen pro Seite, gerader Leuchtbolzen.
    [griff(.31, petrol), balken(.37, 0, -.053, .194, .123, .89, blau),
      splitter(.579, -.277, -.04, .55, .166, .34, eis), splitter(.579, .277, -.04, .55, .166, .34, eis),
      facette(.53, -.57, -.073, .29, .225, .36, glanz), facette(.53, .57, -.073, .29, .225, .36, glanz),
      facette(.79, 0, .04, .174, .132, .63), balken(.337, 0, .055, 1.06, .029, .04, stahl)],
    // Höllenbolzen: weit ausladende, gehörnte Arme aus Glut und Obsidian.
    [griff(.31, schwarz), balken(.34, 0, -.068, .254, .144, .90, schwarz),
      splitter(.55, -.31, -.056, .63, .176, .42, rot), splitter(.55, .31, -.056, .63, .176, .42, rot),
      teil('cone6', .64, -.61, -.018, .225, .269, .26, glut), teil('cone6', .64, .61, -.018, .225, .269, .26, glut),
      facette(.837, 0, .04, .161, .156, .68), balken(.335, 0, .074, 1.086, .035, .05, messing)],
    // Aufstieg: heller Doppelbogen mit gestaffelten Goldspitzen und Lichtladung.
    [griff(.31, petrol), fassung(.35, 0, -.075, .295, .169, .87, gold),
      facette(.49, -.293, -.058, .62, .177, .33, silber), facette(.49, .293, -.058, .62, .177, .33, silber),
      facette(.40, -.587, -.053, .32, .19, .571, '#e9ce95'), facette(.40, .587, -.053, .32, .19, .571, '#e9ce95'),
      facette(.84, 0, .05, .185, .149, .71), balken(.19, 0, .075, 1.078, .044, .045, glanz)],
  ],
  gun: [
    // Alte Pistole: kleiner, stumpfer Lauf und Holzgriff.
    [balken(.01, 0, -.207, .124, .251, .185, holz), balken(.238, 0, .012, .163, .163, .51, eisen),
      balken(.48, 0, .046, .115, .11, .243, schwarz), balken(.295, .058, .145, .088, .035, .135)],
    // Jagdgewehr: langer Lauf, hölzerner Vorderschaft und Schulterstütze.
    [balken(-.202, 0, -.123, .146, .18, .407, holz), balken(.058, 0, -.186, .117, .237, .194, holz),
      balken(.336, 0, .034, .19, .128, .55, eisen), balken(.458, 0, -.047, .149, .103, .478, holz),
      balken(.816, 0, .07, .099, .09, .58, stahl), balken(.445, 0, .153, .109, .071, .195)],
    // Frostpistole: vereister Rahmen mit seitlicher Kristallkammer.
    [balken(0, 0, -.199, .145, .26, .211, petrol), balken(.306, 0, .014, .254, .182, .62, blau),
      splitter(.535, 0, -.006, .31, .254, .38, eis), facette(.37, .115, .04, .155, .125, .276),
      balken(.706, 0, .036, .119, .108, .208, silber), splitter(.192, -.117, .092, .133, .127, .262, glanz)],
    // Sonnenpistole: wuchtige, rotierende Kammer und kurzer Kupferlauf.
    [balken(.009, 0, -.192, .156, .253, .235, holz), balken(.315, 0, .008, .283, .195, .658, messing),
      scheibe(.336, 0, -.01, .419, .229, .352, gold), scheibe(.336, 0, .201, .179, .052, .168),
      balken(.694, 0, .041, .159, .127, .381, '#df9c62'), balken(.868, 0, .032, .212, .16, .145, schwarz)],
    // Drachenbrüllen: gemauerter Schlund und zwei seitliche Hörner.
    [balken(.039, 0, -.238, .172, .291, .247, rot), balken(.319, 0, .001, .264, .218, .695, schwarz),
      splitter(.636, 0, -.045, .402, .332, .60, rot), facette(.679, -.17, .15, .196, .193, .363, bein),
      facette(.679, .17, .15, .196, .193, .363, bein), balken(.858, 0, .03, .22, .168, .24, eisen),
      facette(.58, 0, .245, .149, .119, .179)],
    // Reliktstrahl: lange Schiene zwischen zwei eingelassenen Elektroden.
    [balken(-.137, 0, -.16, .145, .224, .39, violett), balken(.282, 0, -.02, .28, .23, .757, eisen),
      balken(.808, -.156, .016, .126, .184, .76, messing), balken(.808, .156, .016, .126, .184, .76, messing),
      balken(.79, 0, .092, .137, .094, .568), fassung(.432, 0, .189, .25, .096, .259, stahl),
      scheibe(1.159, 0, -.017, .264, .259, .181, schwarz)],
    // Feuerdrachenkanone: massives Rohr, Kühlrippen und glühende Mündung.
    [balken(.032, 0, -.237, .191, .31, .32, schwarz), splitter(.46, 0, -.101, .452, .389, .85, rot),
      balken(.914, 0, .005, .338, .242, .656, '#ac5547'), balken(1.136, 0, -.023, .459, .309, .268, eisen),
      balken(.695, -.198, .071, .104, .177, .44, messing), balken(.695, .198, .071, .104, .177, .44, messing),
      balken(1.245, 0, .052, .222, .158, .114), teil('cone6', .517, 0, .234, .206, .26, .273, glut)],
    // Himmelsgericht: prismatischer Kern, breite Gabel und Edelmetallabschluss.
    [balken(-.03, 0, -.212, .172, .273, .331, petrol), fassung(.373, 0, -.059, .393, .249, .726, gold),
      balken(.893, -.178, -.020, .164, .154, .823, silber), balken(.893, .178, -.020, .164, .154, .823, silber),
      facette(.844, 0, -.008, .259, .207, .769), facette(1.252, -.168, -.005, .205, .191, .329, glanz),
      facette(1.252, .168, -.005, .205, .191, .329, glanz), scheibe(.391, 0, .154, .247, .072, .275, messing)],
  ],
  staff: [
    // Übungswürfel auf einem geschnittenen Holzstab.
    [griff(.28, holz), balken(.42, 0, -.044, .099, .087, .87, holz),
      balken(.94, 0, -.123, .23, .236, .24, eisen), balken(.94, 0, .105, .138, .045, .139)],
    // Manastab mit klein gefasster Kugel.
    [griff(.28, holz), balken(.45, 0, -.05, .094, .103, .97, holz),
      scheibe(.913, 0, -.057, .216, .117, .16, stahl), facette(1.086, 0, -.121, .259, .257, .265),
      scheibe(-.15, 0, -.061, .144, .122, .117, eisen)],
    // Lunaris: offener Halbmond aus drei Segmenten um einen Mondstein.
    [griff(.28, violett), balken(.46, 0, -.045, .10, .095, 1.00, schwarz),
      facette(1.035, -.106, -.095, .241, .191, .344, stahl), facette(1.192, -.237, -.091, .182, .183, .37, silber),
      facette(1.338, -.10, -.075, .297, .162, .176, silber), facette(1.226, .04, -.074, .161, .161, .163),
      scheibe(.873, 0, -.055, .179, .105, .143, messing)],
    // Gletscherhorn: asymmetrischer, aufwärts gerichteter Eiszahn.
    [griff(.29, blau), balken(.46, 0, -.048, .108, .101, 1.00, blau),
      splitter(1.047, -.035, -.129, .371, .261, .394, eis), facette(1.269, -.125, -.124, .221, .252, .453, glanz),
      teil('cone6', 1.366, -.138, .034, .206, .311, .235, '#d9f3f8'),
      splitter(1.099, .136, -.082, .19, .167, .30), scheibe(.83, 0, -.058, .15, .118, .139, stahl)],
    // Arkanes Auge: große Iris, dunkle Lider und sichtbare Pupillenfassung.
    [griff(.29, violett), balken(.464, 0, -.051, .103, .105, 1.04, schwarz),
      facette(1.171, 0, -.169, .508, .341, .427, violett), scheibe(1.177, 0, .114, .324, .108, .307, bein),
      scheibe(1.177, 0, .210, .198, .076, .193), facette(1.08, -.197, -.043, .233, .176, .229, stahl),
      facette(1.08, .197, -.043, .233, .176, .229, stahl)],
    // Finsternisstab: goldene Korona um eine fast schwarze Scheibe.
    [griff(.31, schwarz), balken(.47, 0, -.055, .118, .114, 1.05, violett),
      scheibe(1.238, 0, -.119, .632, .235, .626, gold), scheibe(1.248, 0, .09, .455, .078, .442, schwarz),
      facette(1.258, .114, .157, .182, .086, .176), facette(1.04, -.252, -.024, .265, .151, .281, messing),
      facette(1.04, .252, -.024, .265, .151, .281, messing), scheibe(-.153, 0, -.059, .165, .129, .107, gold)],
    // Erlöserstab: ausgestellte Flügel und heller Zentralstern.
    [griff(.32, '#495a72'), balken(.50, 0, -.054, .112, .107, 1.11, stahl),
      fassung(1.094, 0, -.083, .359, .184, .276, gold), facette(1.171, -.274, -.08, .28, .173, .498, silber),
      facette(1.171, .274, -.08, .28, .173, .498, silber), facette(1.367, 0, -.12, .292, .255, .485),
      facette(1.163, 0, .111, .144, .088, .208, '#fff4c5'), scheibe(-.155, 0, -.063, .179, .129, .119, messing)],
    // Karmesinzepter: Kronenkäfig mit rubinroter Spitze und leuchtendem Siegel.
    [griff(.32, schwarz), balken(.48, 0, -.058, .124, .119, 1.08, violett),
      fassung(1.109, 0, -.144, .401, .290, .296, messing), facette(1.345, 0, -.156, .374, .328, .528, '#c85065'),
      teil('cone6', 1.367, -.237, -.033, .168, .29, .202, gold),
      teil('cone6', 1.367, .237, -.033, .168, .29, .202, gold),
      facette(1.244, 0, .166, .169, .113, .193), scheibe(-.155, 0, -.066, .185, .136, .115, gold)],
  ],
};

// Eigenständige S-Grundformen: alle Stufen behalten ihre Silhouette und ihren Griffpunkt.
const SERIE_S = {
  // Tötungsteile: geteilte, gegenläufige Schneiden mit freiliegendem Antrieb.
  dagger: [griff(.28, schwarz), scheibe(.20, 0, -.068, .409, .143, .28, eisen),
    facette(.42, -.147, -.064, .229, .153, .63, silber), splitter(.73, -.156, -.063, .144, .119, .293, glanz),
    facette(.52, .15, -.069, .234, .157, .70, stahl), scheibe(.27, 0, .066, .188, .081, .179),
    balken(.532, .135, .063, .069, .042, .279), scheibe(-.132, 0, -.06, .15, .119, .104, messing)],
  // Großes Finale: mondsichelartige Flanke neben einer hohen, geraden Schneide.
  sword: [griff(.33, schwarz), fassung(.25, 0, -.083, .487, .18, .234, messing),
    balken(.82, .102, -.078, .192, .161, 1.058, silber), facette(1.349, .071, -.095, .196, .196, .48, silber),
    splitter(.54, -.232, -.092, .415, .189, .62, violett), facette(.90, -.262, -.076, .266, .163, .78, stahl),
    facette(.31, -.105, .065, .218, .141, .239), balken(.905, .074, .074, .077, .052, .53)],
  // Titelschlag: breiter Resonanzhammer mit abgestuften Platten.
  blunt: [griff(.32, schwarz), balken(.40, 0, -.068, .15, .133, .913, eisen),
    balken(1.006, 0, -.147, .623, .309, .428, violett), balken(1.006, -.338, -.191, .263, .394, .50, stahl),
    balken(1.006, .338, -.191, .263, .394, .50, stahl),
    scheibe(1.006, 0, .143, .391, .141, .35, messing), facette(1.01, 0, .246, .236, .147, .237),
    balken(1.175, 0, .027, .361, .10, .095)],
  // Übersteuerung: asymmetrisch aufgeladene Armbrust mit Raketenführung.
  crossbow: [griff(.32, schwarz), balken(.352, 0, -.076, .208, .168, .885, eisen),
    splitter(.544, -.295, -.055, .631, .182, .388, petrol), facette(.559, .297, -.052, .634, .182, .357, stahl),
    balken(.37, -.589, -.019, .188, .141, .417, messing), balken(.37, .589, -.019, .188, .141, .417, messing),
    facette(.839, 0, .068, .208, .175, .688), balken(.30, 0, .078, 1.10, .039, .069)],
  // Pulsnova: kurzer Zentralkern zwischen zwei schwebend wirkenden Läufen.
  gun: [balken(.055, 0, -.237, .17, .285, .25, schwarz), balken(.348, 0, -.067, .324, .276, .675, violett),
    balken(.773, -.174, .024, .172, .149, .744, stahl), balken(.773, .174, .024, .172, .149, .744, stahl),
    facette(.737, 0, .006, .221, .194, .65), fassung(.375, 0, .161, .299, .112, .243, messing),
    balken(1.135, -.171, .008, .209, .18, .153, eisen), balken(1.135, .171, .008, .209, .18, .153, eisen)],
  // Walkürenstab: länglicher Stein zwischen zwei gefassten Flügeln.
  staff: [griff(.30, petrol), balken(.493, 0, -.056, .119, .111, 1.09, violett),
    fassung(1.087, 0, -.114, .36, .222, .281, messing),
    facette(1.194, -.296, -.088, .301, .188, .539, silber), facette(1.194, .296, -.088, .301, .188, .539, silber),
    facette(1.353, 0, -.142, .322, .287, .59), facette(1.083, 0, .091, .164, .117, .198),
    scheibe(-.153, 0, -.06, .168, .129, .109, messing)],
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
    return teile.map(([form, v, r, h, b, d, l, farbe]) =>
      [form, v, r, h, b, d, l, farbe ?? akzent, farbe == null ? LEUCHTEN[stufe] : 0]);
  };
  for (const [art, modelleN] of Object.entries(NORMAL)) {
    modelleN.forEach((teile, stufe) => { modelle[`w_${art}_n_${stufe}`] = farbig(teile, stufe); });
    for (let stufe = 3; stufe <= 8; stufe++) modelle[`w_${art}_s_${stufe}`] = farbig(SERIE_S[art], stufe);
  }
  return modelle;
}

export const WEAPON_PARTS = buildWeaponParts();
