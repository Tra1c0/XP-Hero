// T16/T17/T18: Backend – Auth, Rollen, Content-Versionierung/Rollback, Sync-Konflikt, Codes, Grants, Ranglisten, Idempotenz.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server/server.js';
import { mk } from './helpers.js';
import { serialize } from '../src/core/state.js';

async function boot() {
  const clock = { t: Date.UTC(2026, 10, 26, 12) };
  const app = createApp({ adminPassword: 'geheim-geheim-1', now: () => clock.t, log: () => {} });
  const srv = http.createServer(app.handle); await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = async (path, method = 'GET', body, token, headers = {}) => { const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => null), headers: r.headers }; };
  return { app, srv, call, clock, base, stop: () => { srv.close(); app.close(); } };
}

test('Backend: Profil, Sync mit Revision und Konflikt, Codes, Grants, Idempotenz', async () => {
  const s = await boot();
  try {
    const { game } = mk();
    const reg = await s.call('/api/profile/register', 'POST', { profileId: game.state.profileId });
    assert.equal(reg.status, 200); const tok = reg.data.token;
    assert.equal((await s.call('/api/profile/register', 'POST', { profileId: game.state.profileId })).status, 409);
    assert.equal((await s.call('/api/sync', 'GET')).status, 401);
    const push = (rev, force) => s.call('/api/sync', 'POST', { baseRevision: rev, save: serialize(game.state), summary: { level: 1 }, force }, tok);
    assert.equal((await push(0)).data.revision, 1);
    const stale = await push(0);
    assert.equal(stale.status, 409); assert.equal(stale.data.serverRevision, 1); assert.ok(stale.data.serverSave);
    assert.equal((await push(1)).data.revision, 2);
    assert.equal((await push(0, true)).data.revision, 3, 'explizite Entscheidung überschreibt');
    assert.equal((await s.call('/api/sync', 'POST', { baseRevision: 3, save: '{"sum":"x","body":"{}"}' }, tok)).status, 400, 'beschädigter Stand abgelehnt');
    // Admin: Login, Rollen, Code, Grant
    assert.equal((await s.call('/api/admin/login', 'POST', { user: 'admin', password: 'falsch' })).status, 401);
    const adm = (await s.call('/api/admin/login', 'POST', { user: 'admin', password: 'geheim-geheim-1' })).data.token;
    assert.equal((await s.call('/api/admin/codes', 'GET')).status, 401);
    assert.equal((await s.call('/api/admin/codes', 'POST', { code: 'TEST-1', reward: [{ item: 'gibtsnicht', n: 1 }] }, adm)).status, 400);
    assert.equal((await s.call('/api/admin/codes', 'POST', { code: 'TEST-1', reward: [{ item: 'gems', n: 50 }], maxUses: 1 }, adm)).status, 200);
    const r1 = await s.call('/api/events/redeem', 'POST', { code: 'test-1' }, tok), r2 = await s.call('/api/events/redeem', 'POST', { code: 'TEST-1' }, tok);
    assert.equal(r1.status, 200); assert.equal(r2.data.claimId, r1.data.claimId); assert.equal(r2.data.repeated, true);
    game.cmd('grantExternal', r1.data.claimId, r1.data.reward, 'code');
    assert.throws(() => game.cmd('grantExternal', r2.data.claimId, r2.data.reward, 'code'), /Bereits/);
    assert.equal(game.state.inv.gems, 50, 'Code zahlt trotz Wiederholung genau einmal');
    const other = (await s.call('/api/profile/register', 'POST', {})).data;
    assert.equal((await s.call('/api/events/redeem', 'POST', { code: 'TEST-1' }, other.token)).status, 410, 'Limit erreicht');
    await s.call('/api/admin/users', 'POST', { user: 'redakteur', password: 'lang-genug-123', role: 'editor' }, adm);
    const ed = (await s.call('/api/admin/login', 'POST', { user: 'redakteur', password: 'lang-genug-123' })).data.token;
    assert.equal((await s.call('/api/admin/grants', 'POST', { profileId: game.state.profileId, reward: [{ item: 'gems', n: 5 }], reason: 'x' }, ed)).status, 403, 'Grant nur mit Rolle admin');
    assert.equal((await s.call('/api/admin/grants', 'POST', { profileId: game.state.profileId, reward: [{ item: 'gems', n: 5 }] }, adm)).status, 400, 'Begründung Pflicht');
    assert.equal((await s.call('/api/admin/grants', 'POST', { profileId: game.state.profileId, reward: [{ item: 'gems', n: 5 }], reason: 'Test' }, adm)).status, 200);
    const cl = (await s.call('/api/claims', 'GET', null, tok)).data.claims;
    assert.equal(cl.length, 1);
    await s.call('/api/claims', 'POST', { ids: [cl[0].id] }, tok);
    assert.equal((await s.call('/api/claims', 'GET', null, tok)).data.claims.length, 0);
    const audit = (await s.call('/api/admin/audit', 'GET', null, adm)).data.rows.map((a) => a.action);
    for (const a of ['grant', 'code_upsert', 'login', 'login_failed', 'user_upsert']) assert.ok(audit.includes(a), a);
    // Idempotenz: gleicher Schlüssel -> gespeicherte Antwort, keine zweite Ausführung
    const k = { 'idempotency-key': 'abc' };
    const a1 = await s.call('/api/modes/session', 'POST', { mode: 'tower', param: 1 }, tok, k), a2 = await s.call('/api/modes/session', 'POST', { mode: 'tower', param: 1 }, tok, k);
    assert.equal(a1.data.sessionId, a2.data.sessionId); assert.equal(a2.headers.get('x-idempotent-replay'), '1');
    // Rangliste: unplausibel schnelle Session zählt nicht; gültige zählt; Etage überspringen unmöglich; Sandbox ausgeschlossen
    assert.equal((await s.call('/api/modes/complete', 'POST', { sessionId: a1.data.sessionId, win: true }, tok)).status, 422);
    assert.equal((await s.call('/api/modes/session', 'POST', { mode: 'tower', param: 5 }, tok)).status, 409);
    const se = (await s.call('/api/modes/session', 'POST', { mode: 'tower', param: 1 }, tok)).data.sessionId;
    s.clock.t += 20000;
    assert.equal((await s.call('/api/modes/complete', 'POST', { sessionId: se, win: true }, tok)).data.counted, true);
    assert.equal((await s.call('/api/modes/complete', 'POST', { sessionId: se, win: true }, tok)).data.repeated, true);
    assert.equal((await s.call('/api/leaderboards?board=tower')).data.rows[0].score, 1);
    await s.call(`/api/admin/profiles/${game.state.profileId}/sandbox`, 'POST', { sandbox: true }, adm);
    assert.equal((await s.call('/api/leaderboards?board=tower')).data.rows.length, 0);
    // Online-Invasion: Server rechnet das Duell; ungültige Snapshots abgelehnt
    const snap = { atk: 100, hp: 5000, aps: 1.2, crit: 5, critDmg: 150, ls: 0, level: 3 };
    assert.equal((await s.call('/api/invasion/snapshot', 'POST', { snapshot: { ...snap, atk: -1 } }, other.token)).status, 400);
    await s.call('/api/invasion/snapshot', 'POST', { snapshot: snap }, other.token);
    assert.equal((await s.call('/api/invasion/fight', 'POST', {}, other.token)).status, 404, 'kein Fake-Gegner');
    const third = (await s.call('/api/profile/register', 'POST', {})).data;
    await s.call('/api/invasion/snapshot', 'POST', { snapshot: { ...snap, atk: 50 } }, third.token);
    const f = await s.call('/api/invasion/fight', 'POST', {}, other.token);
    assert.equal(f.data.win, true); assert.equal(f.data.bot, false);
  } finally { s.stop(); }
});

test('Backend: Content-Entwurf, Validierung, Veröffentlichen, Rollback, statische Auslieferung ohne Fremdaufrufe', async () => {
  const s = await boot();
  try {
    const adm = (await s.call('/api/admin/login', 'POST', { user: 'admin', password: 'geheim-geheim-1' })).data.token;
    const man = (await s.call('/api/content/manifest')).data;
    const pack = (await s.call('/api/content/' + man.version)).data;
    const badPack = structuredClone(pack); badPack.tables.shop[0].price = { gems: -1 };
    const rej = await s.call('/api/admin/content', 'POST', { pack: badPack }, adm);
    assert.equal(rej.status, 422); assert.ok(rej.data.errors.length);
    pack.config.xp.factor = 3; pack.tables.variants.find((v) => v.id === 'slime').xp = 99;
    const dr = await s.call('/api/admin/content', 'POST', { pack, note: 'XP x3' }, adm);
    assert.equal(dr.status, 200);
    assert.equal((await s.call('/api/content/manifest')).data.version, man.version, 'Entwurf ist noch nicht aktiv');
    assert.equal((await s.call('/api/content/' + dr.data.version)).status, 404, 'Entwurf nicht öffentlich abrufbar');
    assert.equal((await s.call(`/api/admin/content/${dr.data.version}/publish`, 'POST', {}, adm)).data.active, dr.data.version);
    const live = (await s.call('/api/content/' + (await s.call('/api/content/manifest')).data.version)).data;
    assert.equal(live.config.xp.factor, 3);
    const { game, g } = mk({ pack: live });
    const prog = await import('../src/core/progress.js');
    assert.equal(prog.gainXp(g, 10, 'test'), 30, 'Balancing-Änderung wirkt ohne Client-Neubau');
    assert.ok(game);
    assert.equal((await s.call(`/api/admin/content/${man.version}/publish`, 'POST', {}, adm)).data.active, man.version, 'Rollback');
    assert.equal((await s.call('/api/content/manifest')).data.version, man.version);
    // Statik + Traversal-Schutz
    const html = await (await fetch(s.base + '/client/')).text();
    assert.match(html, /main\.js/);
    assert.equal((await fetch(s.base + '/client/..%2F..%2Fpackage.json')).status, 404);
    assert.equal((await fetch(s.base + '/core/game.js')).status, 200);
  } finally { s.stop(); }
});

test('T16 Keine Werbung, IAP, Tracking oder Fremd-Endpunkte im ausgelieferten Code', async () => {
  const fs = await import('node:fs'), path = await import('node:path');
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|html|css)$/.test(f.name)) files.push(p); } };
  walk('src'); walk('admin'); walk('server');
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    const urls = [...txt.matchAll(/https?:\/\/[\w.-]+/g)].map((m) => m[0]).filter((u) => !/^http:\/\/(localhost|x|127\.0\.0\.1)$/.test(u) && u !== 'https://api.github.com'); // einzige Ausnahme: Update-Prüfung gegen das eigene Repo
    assert.deepEqual(urls, [], `${f}: externe URL`);
    assert.ok(!/admob|tapjoy|googletagmanager|google-analytics|facebook\.net|unityads|billing|supercent/i.test(txt), `${f}: verbotene Einbindung`);
  }
});
