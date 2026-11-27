// Dauerlauf der Feld-Simulation mit Auto-Jagd: sucht Regelverstöße statt Balancing. Aufruf: node tools/soak.js [Minuten je Gebiet]
// Prüft je Sekunde: Positionen gültig und begehbar, kein Gegner in der Schutzzone, keine Dauerzustände, Auto-Jagd bleibt nicht untätig stehen.
import { mk } from '../tests/helpers.js';
import { walkable, zoneAt, cellAt } from '../src/core/worldgrid.js';
const MIN = Number(process.argv[2] || 6), issues = new Map(), note = (k, d) => { const e = issues.get(k) || { n: 0, d }; e.n++; issues.set(k, e); };
for (let stage = 1; stage <= 6; stage++) {
  const { game, clock, s } = mk({ seed: 100 + stage });
  const g = game.g, area = `a1_${stage}`;
  for (const f of ['abilities', 'weaponVault', 'craft', 'shop', 'portal']) s().unlocks[f] = 1;
  for (let k = 1; k < stage; k++) s().world.cleared[`a1_${k}`] = 1;
  // Spielerstärke grob passend zum Gebiet: Level und Kraft/HP hochsetzen
  s().player.level = [1, 12, 22, 36, 50, 70][stage - 1]; s().upgrades.ab_power = [0, 20, 60, 140, 260, 420][stage - 1]; s().upgrades.ab_hp = [0, 4, 8, 14, 20, 30][stage - 1];
  s().settings.autoReturn = true;
  game.tick(1 / 30); game.cmd('portal', area);
  const w0 = game.world; w0.p.auto = true;
  let kills0 = 0, idle = 0, deaths = 0, lastKills = 0, maxProj = 0, maxDrops = 0; const stT = new Map();
  for (let sec = 0; sec < MIN * 60; sec++) {
    for (let k = 0; k < 30; k++) { game.tick(1 / 30); clock.t += 1000 / 30; }
    for (const ev of game.drainEvents()) if (ev.type === 'dead') deaths++;
    const w = game.world, p = w.p, G = w.G;
    if (!p.alive) { game.cmd('revive', 'base'); game.world.p.auto = true; continue; }
    if (!Number.isFinite(p.x + p.y + p.hp)) note('Spieler: ungültige Zahl', area);
    if (!walkable(G, p.x, p.y)) note(`Spieler steht auf nicht begehbarer Zelle`, area);
    maxProj = Math.max(maxProj, w.proj.length); maxDrops = Math.max(maxDrops, w.drops.length);
    let nearAlive = 0;
    for (const e of w.enemies) {
      if (!e.alive) { stT.delete(e); continue; }
      if (!Number.isFinite(e.x + e.y + e.hp)) note('Gegner: ungültige Zahl', e.v.id);
      const i = cellAt(G, e.x, e.y);
      if (i < 0 || G.kind[i] !== 1) note('Gegner auf Fels/Wasser/außerhalb', `${e.v.id} ${e.gid}`);
      else if (zoneAt(G, e.x, e.y) === 'base') note('Gegner in der Schutzzone', `${e.v.id} ${e.gid}`);
      else if (e.group && e.v.rank !== 'node' && !w.areaOpen(G.zoneIds[G.zone[i]])) note('Gegner steht in gesperrtem Gebiet', `${e.v.id} ${e.gid}`);
      if (e.group && e.group.area !== area && e.st !== 'idle' && e.st !== 'patrol' && e.st !== 'spawn' && !w.areaOpen(e.group.area)) note('Gegner aus gesperrtem Gebiet aktiv', e.v.id);
      const t = stT.get(e); if (!t || t.st !== e.st) stT.set(e, { st: e.st, n: 0 }); else if (++t.n === 90 && !['idle', 'patrol'].includes(e.st)) note(`Gegner 90 s im Zustand ${e.st}`, `${e.v.id} ${e.gid}`);
      if (e.v.rank !== 'node' && e.v.rank !== 'boss' && Math.hypot(e.x - p.x, e.y - p.y) < 30 * 40) nearAlive++;
    }
    const kills = s().counters['kill:any'] || 0;
    if (kills === lastKills && nearAlive > 0 && p.auto) { if (++idle === 45) note('Auto-Jagd: 45 s ohne Kill trotz Gegnern in 30 m', `${area} bei ${Math.round(p.x)}/${Math.round(p.y)} Ziel ${p.tgt ? p.tgt.v.id + ' ' + p.tgt.st + ' hp ' + Math.round(p.tgt.hp) + '/' + p.tgt.maxHp : '-'}`); } else idle = 0;
    if (!p.auto && s().world.area !== 'base') note('Auto-Jagd hat sich selbst abgeschaltet', area);
    lastKills = kills;
  }
  console.log(`${area}: Kills ${s().counters['kill:any'] || 0}, Tode ${deaths}, Level ${s().player.level}, Gold ${s().inv.gold || 0}, Kristalle ${s().inv.crystal || 0}, max. Geschosse ${maxProj}, max. Drops ${maxDrops}, Heimkehr ${s().counters.returnBase || 0}`);
}
console.log(issues.size ? 'AUFFÄLLIG:\n' + [...issues].map(([k, e]) => `- ${k}: ${e.n}x (z. B. ${e.d})`).join('\n') : 'Keine Regelverstöße.');
