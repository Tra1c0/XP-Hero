// Client-Start: Content laden (last-known-good oder eingebaut), Spiel erzeugen, Eingabe, Render- und Simulationsschleife.
import { buildBaseContent } from '../core/content/base.js';
import { validateContent } from '../core/content/validate.js';
import { Game } from '../core/game.js';
import { Renderer } from './render.js';
import { Renderer3D } from './render3d.js';
import * as ui from './ui.js';
import { makeNet } from './net.js';
import { checkForUpdate } from './update.js';

const mem = new Map();
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return mem.get(k) ?? null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { mem.set(k, v); } },
};
function loadPack() {
  try { const raw = store.get('xphero.content'); if (raw) { const p = JSON.parse(raw); if (!validateContent(p).length) return p; } } catch { /* defekter Cache */ }
  return buildBaseContent();
}
let game;
try { game = new Game({ pack: loadPack(), store }); } catch (e) { console.warn('Content-Rollback auf eingebautes Paket:', e); game = new Game({ pack: buildBaseContent(), store }); }
if (game.recovered) setTimeout(() => ui.toast('Spielstand aus Sicherung wiederhergestellt.'), 500);
const net = makeNet(() => game, ui);
ui.init(game, net);
window.__game = game; // Debug-/Testzugriff (kein Admin-Schlüssel, nur der lokale Spielstand)

const cv = document.getElementById('cv');
// 3D-Renderer (WebGL2); ohne WebGL2 oder mit ?r2d bleibt die 2D-Draufsicht als Rückfallebene.
let R;
try { if (new URLSearchParams(location.search).has('r2d')) throw new Error('2D erzwungen'); R = new Renderer3D(document.getElementById('gl'), cv); } catch (e) { console.warn('3D nicht verfügbar:', e.message); document.getElementById('gl').hidden = true; R = new Renderer(cv); }
window.__renderer = R;
addEventListener('resize', () => R.resize());

// Eingabe: virtueller Stick (Pointer) und Tastatur. Manuelle Bewegung hat Vorrang vor Auto-Hunt.
let stick = null;
const keys = new Set();
const setMove = (x, y) => { const p = game.world.p; if (x || y) p.goal = null; if (p.auto && (x || y)) p.auto = false; if (!p.auto && !p.goal) { p.mx = x; p.my = y; } };
// Stick: Ursprung am ersten Berührpunkt. Zieht der Finger über den Rand hinaus, wandert der Ursprung mit (schnelle Richtungswechsel greifen sofort,
// statt erst den ganzen Weg zurück zu brauchen). In der Totzone steht die Figur. Ein zweiter Finger übernimmt den Stick nicht.
const JOY_R = 46, JOY_DEAD = 7, joy = document.getElementById('joy'), knob = joy.firstElementChild;
const joyDraw = (kx, ky) => { joy.hidden = !stick; if (!stick) return; joy.style.transform = `translate(${stick.x - JOY_R}px,${stick.y - JOY_R}px)`; knob.style.transform = `translate(${kx}px,${ky}px)`; };
cv.addEventListener('pointerdown', (e) => { if (stick) return; stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch { /* Zeiger schon weg */ } joyDraw(0, 0); });
cv.addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy);
  if (d > JOY_R) { const over = (d - JOY_R) / d; stick.x += dx * over; stick.y += dy * over; dx -= dx * over; dy -= dy * over; d = JOY_R; }
  if (d <= JOY_DEAD) setMove(0, 0); else { const k = Math.min(1, (d - JOY_DEAD) / (JOY_R - JOY_DEAD) + 0.25) / d; setMove(dx * k, dy * k); }
  joyDraw(dx, dy);
});
const up = (e) => { if (stick && e.pointerId === stick.id) { stick = null; joyDraw(0, 0); setMove(0, 0); if (!game.world.p.auto) { game.world.p.mx = 0; game.world.p.my = 0; } } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(ev, up);
addEventListener('blur', () => { if (stick) up({ pointerId: stick.id }); });
const KEYMAP = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const keyMove = () => { let x = 0, y = 0; for (const k of keys) { x += KEYMAP[k][0]; y += KEYMAP[k][1]; } const d = Math.hypot(x, y) || 1; if (x || y || !game.world.p.auto) setMove(x / d, y / d); };
addEventListener('keydown', (e) => { if (KEYMAP[e.key] && e.target.tagName !== 'INPUT') { keys.add(e.key); keyMove(); } });
addEventListener('keyup', (e) => { if (keys.delete(e.key)) keyMove(); });

// Schleife: Simulation mit festem Tick im Kern; hier nur Zeit zuführen, zeichnen, HUD gebündelt aktualisieren.
const perf = new URLSearchParams(location.search).has('perf'), ft = [];
let last = performance.now(), hudT = 0, saveT = 0;
function frame(ts) {
  const dt = Math.min(0.25, (ts - last) / 1000); last = ts;
  game.tick(dt);
  R.draw(game);
  hudT += dt; saveT += dt;
  if (hudT >= 0.2) {
    hudT = 0;
    const ev = game.drainEvents();
    for (const e of ev) { if (e.type === 'modeStart' && !e.resumed) net.modeStart(e.mode, e.param); if (e.type === 'modeResult') net.modeComplete(e.result); }
    ui.handleEvents(ev); ui.hud();
    if (perf) { const s = [...ft].sort((a, b) => a - b), q = (p) => (s[Math.floor(s.length * p)] || 0).toFixed(1); const el = document.getElementById('perf'); el.hidden = false; el.textContent = `Frame ms p50 ${q(0.5)} p95 ${q(0.95)} p99 ${q(0.99)}\nGegner ${game.world.enemies.length} Proj ${game.world.proj.length} Drops ${game.world.drops.length}`; }
  }
  if (perf) { ft.push(dt * 1000); if (ft.length > 600) ft.shift(); }
  if (saveT >= 10) { saveT = 0; game.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => checkForUpdate(ui), 1500);
// Jedes Öffnen prüft: auch Rückkehr aus dem Hintergrund (Android: Capacitor feuert 'resume' und visibilitychange)
const onOpen = () => checkForUpdate(ui, { minGapMs: 20000 });
document.addEventListener('resume', onOpen);
window.__checkUpdate = (force) => checkForUpdate(ui, { force });
addEventListener('visibilitychange', () => { if (document.hidden) game.save(); else { last = performance.now(); onOpen(); } });
addEventListener('pagehide', () => game.save());

// Android-Zurück-Taste / Browser-Zurück: schließt zuerst Aufdeck-Bild, Dialog oder offenes Fenster. Erst ohne offenes Fenster verlässt Zurück die App.
addEventListener('popstate', () => { const top = document.querySelector('.reveal, .modal'); if (top) { top.remove(); try { history.pushState({ panel: 1 }, ''); } catch { /* egal */ } } else ui.close(); });
// Bildschirm bleibt beim Spielen an (wo der Browser das erlaubt); nach Rückkehr in die App erneut anfordern.
let wake = null;
const keepAwake = async () => { try { if (navigator.wakeLock && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch { wake = null; } };
keepAwake(); document.addEventListener('visibilitychange', keepAwake);
