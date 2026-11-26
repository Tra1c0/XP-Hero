import { buildBaseContent } from '../src/core/content/base.js';
import { Game } from '../src/core/game.js';

export const T0 = Date.UTC(2026, 10, 26, 12, 0, 0);
export function memStore() { const m = new Map(); return { m, get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v) }; }
export function mk(opt = {}) {
  const clock = { t: opt.t ?? T0 };
  const pack = opt.pack || buildBaseContent();
  const game = new Game({ pack, now: () => clock.t, seed: opt.seed ?? 12345, store: opt.store || null, state: opt.state || null });
  const give = (item, n) => game.cmd('grantExternal', `test:${item}:${Math.random()}`, [{ item, n }], 'test');
  const unlock = (...f) => { for (const x of f) game.state.unlocks[x] = 1; };
  return { game, clock, give, unlock, g: game.g, s: () => game.state };
}
export const code = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };
