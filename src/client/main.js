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
cv.addEventListener('pointerdown', (e) => { stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!stick || e.pointerId !== stick.id) return; const dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy); if (d > 6) { const k = Math.min(1, d / 60) / d; setMove(dx * k, dy * k); } });
const up = (e) => { if (stick && e.pointerId === stick.id) { stick = null; setMove(0, 0); if (!game.world.p.auto) { game.world.p.mx = 0; game.world.p.my = 0; } } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
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
