// Haptik: eine zentrale Stelle wie in der Vorlage (dort: ein Hilfsmodul mit festen Voreinstellungen, Mindestabstand zwischen zwei Impulsen,
// Ein/Aus in den Optionen, Kamerawackeln mit Impuls gekoppelt). Die Voreinstellungen heißen wie die üblichen Handy-Presets.
// WELCHES Ereignis welchen Impuls auslöst, steht in der Vorlage im Programmcode und ist nicht einsehbar: die Zuordnung in main.js ist eine eigene (E).
// Einzige Angabe aus den Daten: Geschosse/Treffer lösen KEINEN Impuls aus (Spalte "Haptic" ist bei allen 196 Geschossarten aus).
// Muster = [[Dauer ms, Stärke 0-255], ...]; Stärke 0 = Pause.
export const PRESETS = {
  selection: [[8, 70]], light: [[12, 100]], medium: [[18, 160]], heavy: [[30, 255]], soft: [[22, 80]], rigid: [[10, 220]],
  success: [[14, 130], [70, 0], [24, 230]], warning: [[18, 200], [90, 0], [18, 120]], failure: [[22, 220], [60, 0], [22, 160], [60, 0], [34, 255]],
};
const RANK = { selection: 0, soft: 1, light: 1, rigid: 2, medium: 2, warning: 3, success: 3, heavy: 4, failure: 5 };
const MIN_GAP = 80; // ms zwischen zwei Impulsen (E); ein stärkerer Impuls darf einen schwächeren innerhalb der Sperre ablösen
let enabled = () => true, lastAt = 0, lastRank = -1;
export const setEnabled = (fn) => { enabled = fn; };
export function play(name) {
  const pat = PRESETS[name];
  if (!pat || !enabled()) return false;
  const now = Date.now(), rank = RANK[name] ?? 1;
  if (now - lastAt < MIN_GAP && rank <= lastRank) return false;
  lastAt = now; lastRank = rank;
  try {
    // Android-App: eigene Brücke mit Stärke je Abschnitt; sonst die Vibrations-Schnittstelle des Browsers (nur Dauer)
    if (typeof window !== 'undefined' && window.XPHaptic && window.XPHaptic.play) window.XPHaptic.play(pat.map((p) => p.join(',')).join(';'));
    else if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pat.length === 1 ? pat[0][0] : pat.map((p) => p[0]));
    else return false;
  } catch { return false; }
  return true;
}
