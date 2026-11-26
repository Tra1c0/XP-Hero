// Eigenes Backend (optional): Content-Versionen, Profile, Sync, Codes, Grants, Ranglisten, Admin-API, statische Auslieferung.
// Keine externen Abhängigkeiten: node:http + node:sqlite. Keine Werbung, kein Tracking, keine Fremd-Endpunkte.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { buildBaseContent } from '../src/core/content/base.js';
import { validateContent, fingerprint } from '../src/core/content/validate.js';
import { simulateDuel } from '../src/core/modes.js';
import { deserialize } from '../src/core/state.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const rid = (n = 24) => crypto.randomBytes(n).toString('hex');
const pwHash = (pw, salt = rid(16)) => `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
const pwOk = (pw, stored) => { const [salt, h] = stored.split(':'); const a = Buffer.from(h, 'hex'), b = crypto.scryptSync(pw, salt, 32); return a.length === b.length && crypto.timingSafeEqual(a, b); };
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (status, msg) => { throw new HttpError(status, msg); };
const ROLE = { viewer: 1, editor: 2, admin: 3 };

export function createApp({ dbPath = ':memory:', adminPassword = process.env.ADMIN_PASSWORD, now = () => Date.now(), log = console.log, corsOrigin = process.env.CORS_ORIGIN || '' } = {}) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, name TEXT, created INTEGER, sandbox INTEGER DEFAULT 0, save TEXT, summary TEXT, revision INTEGER DEFAULT 0, updated INTEGER);
    CREATE TABLE IF NOT EXISTS content(version TEXT PRIMARY KEY, status TEXT NOT NULL, pack TEXT NOT NULL, fingerprint TEXT, note TEXT, author TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS admins(user TEXT PRIMARY KEY, pw TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user TEXT NOT NULL, expires INTEGER);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, user TEXT, action TEXT, detail TEXT);
    CREATE TABLE IF NOT EXISTS codes(code TEXT PRIMARY KEY, reward TEXT NOT NULL, expires INTEGER, max_uses INTEGER DEFAULT 0, uses INTEGER DEFAULT 0, note TEXT);
    CREATE TABLE IF NOT EXISTS redemptions(code TEXT, profile TEXT, claim_id TEXT, ts INTEGER, PRIMARY KEY(code, profile));
    CREATE TABLE IF NOT EXISTS grants(id TEXT PRIMARY KEY, profile TEXT NOT NULL, reward TEXT NOT NULL, reason TEXT, author TEXT, created INTEGER, claimed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS idem(k TEXT, profile TEXT, status INTEGER, body TEXT, ts INTEGER, PRIMARY KEY(k, profile));
    CREATE TABLE IF NOT EXISTS mode_sessions(id TEXT PRIMARY KEY, profile TEXT, mode TEXT, param INTEGER, started INTEGER, done INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS leaderboard(board TEXT, profile TEXT, name TEXT, score INTEGER, updated INTEGER, PRIMARY KEY(board, profile));
    CREATE TABLE IF NOT EXISTS snapshots(profile TEXT PRIMARY KEY, name TEXT, snap TEXT, rating INTEGER DEFAULT 1000, updated INTEGER);`);
  const q = (sql) => db.prepare(sql);
  const tx = (fn) => { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  const audit = (user, action, detail) => q('INSERT INTO audit(ts,user,action,detail) VALUES(?,?,?,?)').run(now(), user, action, JSON.stringify(detail ?? null).slice(0, 2000));

  // Bootstrap: erster Admin (Passwort aus Umgebung oder einmalig generiert und nur lokal ausgegeben) und Basis-Content.
  if (!q('SELECT 1 FROM admins LIMIT 1').get()) {
    const pw = adminPassword || rid(9);
    q('INSERT INTO admins VALUES(?,?,?)').run('admin', pwHash(pw), 'admin');
    if (!adminPassword) log(`[setup] Admin-Konto angelegt: Benutzer "admin", Passwort "${pw}" (nur jetzt sichtbar; ADMIN_PASSWORD setzen, um es vorzugeben)`);
  }
  if (!q('SELECT 1 FROM content LIMIT 1').get()) {
    const pack = buildBaseContent();
    q('INSERT INTO content VALUES(?,?,?,?,?,?,?)').run(pack.version, 'published', JSON.stringify(pack), fingerprint(pack), 'Basis-Paket', 'system', now());
    q('INSERT OR REPLACE INTO kv VALUES(?,?)').run('active', pack.version);
  }
  const active = () => q('SELECT v FROM kv WHERE k=?').get('active').v;

  // Rate Limit (pro IP, im Speicher)
  const buckets = new Map();
  const limit = (ip, key, max, perMs) => {
    const k = `${ip}:${key}`, t = now(), b = buckets.get(k) || { n: 0, t };
    if (t - b.t > perMs) { b.n = 0; b.t = t; }
    b.n++; buckets.set(k, b);
    if (buckets.size > 5000) for (const [kk, v] of buckets) if (t - v.t > perMs) buckets.delete(kk);
    if (b.n > max) bad(429, 'Zu viele Anfragen – bitte kurz warten');
  };
  const profileOf = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    const p = m && q('SELECT * FROM profiles WHERE token_hash=?').get(sha(m[1]));
    return p || bad(401, 'Nicht angemeldet');
  };
  const adminOf = (req, role = 'viewer') => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    const s = m && q('SELECT * FROM sessions WHERE token_hash=?').get(sha(m[1]));
    if (!s || s.expires < now()) bad(401, 'Admin-Anmeldung erforderlich');
    const a = q('SELECT * FROM admins WHERE user=?').get(s.user) || bad(401, 'Konto existiert nicht mehr');
    if (ROLE[a.role] < ROLE[role]) bad(403, `Rolle ${role} erforderlich`);
    return a;
  };
  const checkReward = (reward, pack) => {
    if (!Array.isArray(reward) || !reward.length || reward.length > 20) bad(400, 'Reward muss eine Liste mit 1-20 Einträgen sein');
    const items = new Set(pack.tables.items.map((i) => i.id)), heroes = new Set(pack.tables.heroes.map((x) => x.id));
    for (const e of reward) {
      const okItem = e && typeof e.item === 'string' && (items.has(e.item) || (e.item.startsWith('piece:') && heroes.has(e.item.slice(6))));
      if (!okItem || !Number.isInteger(e.n) || e.n <= 0 || e.n > 1e12) bad(400, 'Reward-Eintrag ungültig (Item unbekannt oder Menge nicht 1..1e12)');
    }
  };
  const activePack = () => JSON.parse(q('SELECT pack FROM content WHERE version=?').get(active()).pack);

  const routes = [];
  const R = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

  // ---- Öffentlich / Profil
  R('GET', '/api/health', () => ({ ok: true, time: now(), content: active() }));
  R('GET', '/api/content/manifest', () => { const c = q('SELECT version,fingerprint,created FROM content WHERE version=?').get(active()); return { version: c.version, fingerprint: c.fingerprint, serverTime: now() }; });
  R('GET', '/api/content/:version', ({ params }) => { const c = q("SELECT pack FROM content WHERE version=? AND status IN ('published','archived')").get(decodeURIComponent(params.version)) || bad(404, 'Version unbekannt'); return JSON.parse(c.pack); });
  R('POST', '/api/profile/register', ({ body, ip }) => {
    limit(ip, 'reg', 10, 60000);
    const id = typeof body.profileId === 'string' && /^[\w-]{4,40}$/.test(body.profileId) ? body.profileId : 'p_' + rid(8);
    if (q('SELECT 1 FROM profiles WHERE id=?').get(id)) bad(409, 'Profil ist bereits mit einem Gerät verknüpft');
    const token = rid(32);
    q('INSERT INTO profiles(id,token_hash,name,created,updated) VALUES(?,?,?,?,?)').run(id, sha(token), String(body.name || id).slice(0, 24), now(), now());
    return { profileId: id, token };
  });
  R('GET', '/api/profile', ({ req }) => { const p = profileOf(req); return { profileId: p.id, name: p.name, revision: p.revision, sandbox: !!p.sandbox }; });
  R('GET', '/api/sync', ({ req }) => { const p = profileOf(req); return { revision: p.revision, save: p.save, summary: p.summary ? JSON.parse(p.summary) : null }; });
  // Sync mit Revision: nur wer auf der aktuellen Server-Revision aufbaut, darf schreiben. Sonst 409 + Serverstand; nie Addition, nie stilles Überschreiben.
  R('POST', '/api/sync', ({ req, body }) => {
    const p = profileOf(req);
    if (typeof body.save !== 'string' || body.save.length > 3500000) bad(400, 'Spielstand fehlt oder zu groß');
    let st; try { st = deserialize(body.save); } catch { bad(400, 'Spielstand beschädigt (Prüfsumme)'); }
    if (st.profileId !== p.id) bad(400, 'Spielstand gehört zu einem anderen Profil');
    return tx(() => {
      const cur = q('SELECT revision,save,summary FROM profiles WHERE id=?').get(p.id);
      if (cur.revision !== body.baseRevision && !body.force) throw Object.assign(new HttpError(409, 'Konflikt: Server hat einen anderen Stand'), { extra: { conflict: true, serverRevision: cur.revision, serverSave: cur.save, serverSummary: cur.summary ? JSON.parse(cur.summary) : null } });
      const rev = cur.revision + 1;
      q('UPDATE profiles SET save=?, summary=?, revision=?, updated=? WHERE id=?').run(body.save, JSON.stringify(body.summary || {}).slice(0, 500), rev, now(), p.id);
      return { ok: true, revision: rev };
    });
  });
  R('GET', '/api/claims', ({ req }) => { const p = profileOf(req); return { claims: q('SELECT id,reward,reason FROM grants WHERE profile=? AND claimed=0').all(p.id).map((g) => ({ id: g.id, reward: JSON.parse(g.reward), reason: g.reason })) }; });
  R('POST', '/api/claims', ({ req, body }) => { const p = profileOf(req); for (const id of (body.ids || []).slice(0, 100)) q('UPDATE grants SET claimed=? WHERE id=? AND profile=?').run(now(), String(id), p.id); return { ok: true }; });
  // Code einlösen: pro Profil genau einmal; eine Wiederholung liefert dieselbe Claim-ID (der Client bucht idempotent).
  R('POST', '/api/events/redeem', ({ req, body, ip }) => {
    limit(ip, 'redeem', 10, 60000);
    const p = profileOf(req), code = String(body.code || '').trim().toUpperCase();
    return tx(() => {
      const c = q('SELECT * FROM codes WHERE code=?').get(code) || bad(404, 'Code unbekannt');
      const prev = q('SELECT claim_id FROM redemptions WHERE code=? AND profile=?').get(code, p.id);
      if (prev) return { claimId: prev.claim_id, reward: JSON.parse(c.reward), repeated: true };
      if (c.expires && c.expires < now()) bad(410, 'Code abgelaufen');
      if (c.max_uses && c.uses >= c.max_uses) bad(410, 'Code aufgebraucht');
      const claimId = `code:${code}:${p.id}`;
      q('INSERT INTO redemptions VALUES(?,?,?,?)').run(code, p.id, claimId, now());
      q('UPDATE codes SET uses=uses+1 WHERE code=?').run(code);
      return { claimId, reward: JSON.parse(c.reward) };
    });
  });
  // Ranglisten: Tower nur über serverseitig geöffnete Session, Etage = Server-Bestwert + 1, plausible Dauer. Sandbox-Profile ausgeschlossen.
  R('POST', '/api/modes/session', ({ req, body }) => {
    const p = profileOf(req);
    if (body.mode !== 'tower' || !Number.isInteger(body.param)) bad(400, 'Modus/Parameter ungültig');
    const best = (q('SELECT score FROM leaderboard WHERE board=? AND profile=?').get('tower', p.id) || { score: 0 }).score;
    if (body.param < 1 || body.param > best + 1 || body.param > 250) bad(409, `Nur Etage 1..${best + 1} zulässig`);
    const id = rid(12);
    q('INSERT INTO mode_sessions(id,profile,mode,param,started) VALUES(?,?,?,?,?)').run(id, p.id, 'tower', body.param, now());
    return { sessionId: id };
  });
  R('POST', '/api/modes/complete', ({ req, body }) => {
    const p = profileOf(req);
    return tx(() => {
      const s = q('SELECT * FROM mode_sessions WHERE id=? AND profile=?').get(String(body.sessionId), p.id) || bad(404, 'Session unbekannt');
      if (s.done) return { ok: true, repeated: true };
      const el = now() - s.started;
      q('UPDATE mode_sessions SET done=? WHERE id=?').run(now(), s.id);
      if (el < 1500 || el > 15 * 60000) bad(422, 'Sessiondauer unplausibel – nicht gewertet');
      if (body.win && !p.sandbox) q('INSERT INTO leaderboard VALUES(?,?,?,?,?) ON CONFLICT(board,profile) DO UPDATE SET score=MAX(score,excluded.score), updated=excluded.updated').run('tower', p.id, p.name, s.param, now());
      return { ok: true, counted: !!body.win && !p.sandbox };
    });
  });
  R('GET', '/api/leaderboards', ({ url }) => ({ rows: q('SELECT name,score FROM leaderboard WHERE board=? ORDER BY score DESC, updated ASC LIMIT 50').all(url.searchParams.get('board') || 'tower') }));
  // Invasion online: Snapshots echter Profile; das Duell rechnet der Server mit demselben Kern, der Client kann kein Ergebnis setzen.
  R('POST', '/api/invasion/snapshot', ({ req, body }) => {
    const p = profileOf(req), s = body.snapshot || {};
    const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    if (!num(s.atk, 1, 1e13) || !num(s.hp, 1, 1e15) || !num(s.aps, 0.1, 20) || !num(s.crit, 0, 100) || !num(s.critDmg, 100, 5000) || !num(s.ls, 0, 50)) bad(400, 'Snapshot außerhalb gültiger Wertebereiche');
    const snap = { atk: s.atk, hp: s.hp, aps: s.aps, crit: s.crit, critDmg: s.critDmg, ls: s.ls, level: s.level | 0 };
    q('INSERT INTO snapshots(profile,name,snap,updated) VALUES(?,?,?,?) ON CONFLICT(profile) DO UPDATE SET snap=excluded.snap, name=excluded.name, updated=excluded.updated').run(p.id, p.name, JSON.stringify(snap), now());
    return { ok: true };
  });
  R('POST', '/api/invasion/fight', ({ req, ip }) => {
    limit(ip, 'fight', 30, 60000);
    const p = profileOf(req);
    return tx(() => {
      const me = q('SELECT * FROM snapshots WHERE profile=?').get(p.id) || bad(409, 'Zuerst Snapshot hochladen');
      const opp = q('SELECT s.* FROM snapshots s JOIN profiles p ON p.id=s.profile WHERE s.profile<>? AND p.sandbox=? ORDER BY ABS(s.rating-?) LIMIT 1').get(p.id, p.sandbox, me.rating) || bad(404, 'Noch keine anderen Spieler in der Online-Liga');
      const res = simulateDuel({ ...JSON.parse(me.snap), name: me.name }, { ...JSON.parse(opp.snap), name: opp.name }, crypto.randomInt(2 ** 31));
      const d = Math.round(32 * ((res.win ? 1 : 0) - 1 / (1 + 10 ** ((opp.rating - me.rating) / 400))));
      q('UPDATE snapshots SET rating=? WHERE profile=?').run(Math.max(0, me.rating + d), p.id);
      q('UPDATE snapshots SET rating=? WHERE profile=?').run(Math.max(0, opp.rating - d), opp.profile);
      if (!p.sandbox) q('INSERT INTO leaderboard VALUES(?,?,?,?,?) ON CONFLICT(board,profile) DO UPDATE SET score=excluded.score, updated=excluded.updated').run('invasion', p.id, p.name, Math.max(0, me.rating + d), now());
      return { ...res, opp: opp.name, bot: false, delta: d, rating: me.rating + d };
    });
  });

  // ---- Admin
  R('POST', '/api/admin/login', ({ body, ip }) => {
    limit(ip, 'login', 8, 60000);
    const a = q('SELECT * FROM admins WHERE user=?').get(String(body.user || ''));
    if (!a || !pwOk(String(body.password || ''), a.pw)) { audit(String(body.user || '?').slice(0, 40), 'login_failed', { ip }); bad(401, 'Benutzer oder Passwort falsch'); }
    const token = rid(32);
    q('DELETE FROM sessions WHERE expires<?').run(now());
    q('INSERT INTO sessions VALUES(?,?,?)').run(sha(token), a.user, now() + 8 * 3600000);
    audit(a.user, 'login', null);
    return { token, user: a.user, role: a.role };
  });
  R('POST', '/api/admin/logout', ({ req }) => { const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); if (m) q('DELETE FROM sessions WHERE token_hash=?').run(sha(m[1])); return { ok: true }; });
  R('GET', '/api/admin/content', ({ req }) => { adminOf(req); return { active: active(), versions: q('SELECT version,status,fingerprint,note,author,created FROM content ORDER BY created DESC').all() }; });
  R('GET', '/api/admin/content/:version', ({ req, params }) => { adminOf(req); const c = q('SELECT pack FROM content WHERE version=?').get(decodeURIComponent(params.version)) || bad(404, 'Version unbekannt'); return JSON.parse(c.pack); });
  R('POST', '/api/admin/validate', ({ req, body }) => { adminOf(req); return { errors: validateContent(body.pack) }; });
  // Entwurf speichern: wird immer validiert; ungültige Pakete werden nicht gespeichert.
  R('POST', '/api/admin/content', ({ req, body }) => {
    const a = adminOf(req, 'editor'), pack = body.pack, errors = validateContent(pack);
    if (errors.length) throw Object.assign(new HttpError(422, 'Content ungültig'), { extra: { errors } });
    const n = q('SELECT COUNT(*) c FROM content').get().c;
    pack.version = `${String(pack.version).replace(/-r\d+$/, '')}-r${n}`;
    q('INSERT INTO content VALUES(?,?,?,?,?,?,?)').run(pack.version, 'draft', JSON.stringify(pack), fingerprint(pack), String(body.note || '').slice(0, 200), a.user, now());
    audit(a.user, 'content_draft', { version: pack.version, note: body.note });
    return { version: pack.version, fingerprint: fingerprint(pack) };
  });
  // Veröffentlichen/Rollback: atomare Aktivierung; die vorherige Version bleibt abrufbar (last-known-good).
  R('POST', '/api/admin/content/:version/publish', ({ req, params }) => {
    const a = adminOf(req, 'admin'), v = decodeURIComponent(params.version);
    return tx(() => {
      const c = q('SELECT pack,status FROM content WHERE version=?').get(v) || bad(404, 'Version unbekannt');
      const errors = validateContent(JSON.parse(c.pack));
      if (errors.length) throw Object.assign(new HttpError(422, 'Version besteht die aktuelle Validierung nicht'), { extra: { errors } });
      const prev = active();
      q("UPDATE content SET status='archived' WHERE version=?").run(prev);
      q("UPDATE content SET status='published' WHERE version=?").run(v);
      q('INSERT OR REPLACE INTO kv VALUES(?,?)').run('active', v);
      audit(a.user, c.status === 'archived' ? 'content_rollback' : 'content_publish', { version: v, previous: prev });
      return { active: v, previous: prev };
    });
  });
  R('GET', '/api/admin/profiles', ({ req }) => { adminOf(req); return { profiles: q('SELECT id,name,sandbox,revision,summary,created,updated FROM profiles ORDER BY updated DESC LIMIT 200').all().map((p) => ({ ...p, summary: p.summary ? JSON.parse(p.summary) : null })) }; });
  R('POST', '/api/admin/profiles/:id/sandbox', ({ req, params, body }) => {
    const a = adminOf(req, 'admin');
    if (!q('SELECT 1 FROM profiles WHERE id=?').get(params.id)) bad(404, 'Profil unbekannt');
    tx(() => { q('UPDATE profiles SET sandbox=? WHERE id=?').run(body.sandbox ? 1 : 0, params.id); if (body.sandbox) q('DELETE FROM leaderboard WHERE profile=?').run(params.id); });
    audit(a.user, 'profile_sandbox', { id: params.id, sandbox: !!body.sandbox });
    return { ok: true };
  });
  // Kontrollierter Grant: nur Rolle admin, mit Begründung, im Audit-Log; Zustellung beim nächsten Sync des Profils, clientseitig idempotent.
  R('POST', '/api/admin/grants', ({ req, body }) => {
    const a = adminOf(req, 'admin');
    if (!q('SELECT 1 FROM profiles WHERE id=?').get(String(body.profileId))) bad(404, 'Profil unbekannt');
    if (!String(body.reason || '').trim()) bad(400, 'Begründung erforderlich');
    checkReward(body.reward, activePack());
    const id = 'grant_' + rid(8);
    q('INSERT INTO grants(id,profile,reward,reason,author,created) VALUES(?,?,?,?,?,?)').run(id, body.profileId, JSON.stringify(body.reward), String(body.reason).slice(0, 200), a.user, now());
    audit(a.user, 'grant', { id, profile: body.profileId, reward: body.reward, reason: body.reason });
    return { id };
  });
  R('GET', '/api/admin/codes', ({ req }) => { adminOf(req); return { codes: q('SELECT * FROM codes ORDER BY code').all().map((c) => ({ ...c, reward: JSON.parse(c.reward) })) }; });
  R('POST', '/api/admin/codes', ({ req, body }) => {
    const a = adminOf(req, 'editor'), code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) bad(400, 'Code: 4-32 Zeichen A-Z, 0-9, Bindestrich');
    checkReward(body.reward, activePack());
    const exp = body.expires ? Date.parse(body.expires) : null;
    if (body.expires && !Number.isFinite(exp)) bad(400, 'Ablaufdatum ungültig');
    q('INSERT INTO codes(code,reward,expires,max_uses,note) VALUES(?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET reward=excluded.reward, expires=excluded.expires, max_uses=excluded.max_uses, note=excluded.note')
      .run(code, JSON.stringify(body.reward), exp, Math.max(0, body.maxUses | 0), String(body.note || '').slice(0, 200));
    audit(a.user, 'code_upsert', { code, reward: body.reward, expires: body.expires, maxUses: body.maxUses });
    return { code };
  });
  R('DELETE', '/api/admin/codes/:code', ({ req, params }) => { const a = adminOf(req, 'editor'); q('DELETE FROM codes WHERE code=?').run(params.code); audit(a.user, 'code_delete', { code: params.code }); return { ok: true }; });
  R('GET', '/api/admin/audit', ({ req }) => { adminOf(req); return { rows: q('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all() }; });
  R('GET', '/api/admin/users', ({ req }) => { adminOf(req, 'admin'); return { users: q('SELECT user,role FROM admins').all() }; });
  R('POST', '/api/admin/users', ({ req, body }) => {
    const a = adminOf(req, 'admin'), user = String(body.user || '');
    if (!/^[\w.-]{3,32}$/.test(user) || !ROLE[body.role] || String(body.password || '').length < 10) bad(400, 'Benutzer (3-32 Zeichen), Rolle (viewer/editor/admin) und Passwort (min. 10 Zeichen) erforderlich');
    q('INSERT INTO admins VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET pw=excluded.pw, role=excluded.role').run(user, pwHash(body.password), body.role);
    q('DELETE FROM sessions WHERE user=?').run(user);
    audit(a.user, 'user_upsert', { user, role: body.role });
    return { ok: true };
  });
  R('POST', '/api/admin/backup', ({ req }) => { const a = adminOf(req, 'admin'); const f = backup(); audit(a.user, 'backup', { file: path.basename(f) }); return { file: path.basename(f) }; });

  function backup() {
    if (dbPath === ':memory:') bad(400, 'Kein Backup für In-Memory-Datenbank');
    const f = path.join(path.dirname(dbPath), `backup-${new Date(now()).toISOString().replace(/[:.]/g, '-')}.db`);
    db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
    return f;
  }

  // ---- HTTP
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const STATIC = { '/client/': path.join(ROOT, 'src/client'), '/core/': path.join(ROOT, 'src/core'), '/admin/': path.join(ROOT, 'admin') };
  function serveStatic(url, res) {
    if (url.pathname === '/') { res.writeHead(302, { location: '/client/' }); return res.end(); }
    for (const [prefix, dir] of Object.entries(STATIC)) {
      if (!url.pathname.startsWith(prefix)) continue;
      const rel = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html', file = path.resolve(dir, rel);
      if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) break;
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache',
        'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src *; frame-ancestors 'none'", 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Nicht gefunden');
  }
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x'), ip = req.socket.remoteAddress || '?';
    const send = (status, obj) => { const b = JSON.stringify(obj); res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...(corsOrigin ? { 'access-control-allow-origin': corsOrigin, 'access-control-allow-headers': 'content-type, authorization, idempotency-key', 'access-control-allow-methods': 'GET,POST,DELETE' } : {}) }); res.end(b); };
    if (!url.pathname.startsWith('/api/')) return req.method === 'GET' ? serveStatic(url, res) : send(405, { error: 'Methode nicht erlaubt' });
    if (req.method === 'OPTIONS') return send(204, {});
    try {
      limit(ip, 'all', 240, 60000);
      const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname)) || bad(404, 'Unbekannter Endpunkt');
      let body = {};
      if (req.method !== 'GET') {
        const chunks = []; let size = 0;
        for await (const ch of req) { size += ch.length; if (size > 8e6) bad(413, 'Anfrage zu groß'); chunks.push(ch); }
        if (size) { try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { bad(400, 'Ungültiges JSON'); } }
        if (!body || typeof body !== 'object') bad(400, 'Ungültiger Body');
      }
      // Idempotenz für Profil-Mutationen: gleiche Schlüssel liefern die gespeicherte Antwort statt erneuter Ausführung.
      const ik = req.headers['idempotency-key'], auth = /^Bearer (.+)$/.exec(req.headers.authorization || '');
      const idemKey = req.method !== 'GET' && ik && auth && !url.pathname.startsWith('/api/admin/') ? [String(ik).slice(0, 120), sha(auth[1]).slice(0, 16)] : null;
      if (idemKey) { const hit = q('SELECT status,body FROM idem WHERE k=? AND profile=?').get(...idemKey); if (hit) { res.writeHead(hit.status, { 'content-type': 'application/json', 'x-idempotent-replay': '1' }); return res.end(hit.body); } }
      const out = await route.fn({ req, url, body, ip, params: route.re.exec(url.pathname).groups || {} });
      if (idemKey) { q('INSERT OR REPLACE INTO idem VALUES(?,?,?,?,?)').run(...idemKey, 200, JSON.stringify(out), now()); q('DELETE FROM idem WHERE ts<?').run(now() - 86400000); }
      send(200, out);
    } catch (e) {
      if (e instanceof HttpError) return send(e.status, { error: e.message, ...(e.extra || {}) });
      log('[error]', e);
      send(500, { error: 'Interner Fehler' });
    }
  }
  return { handle, db, backup, close: () => db.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp({ dbPath: process.env.DB_PATH || path.join(ROOT, 'data', 'xphero.db') });
  if (process.argv.includes('--backup')) { console.log('Backup geschrieben:', app.backup()); app.close(); } else {
    const port = Number(process.env.PORT || 8787);
    http.createServer(app.handle).listen(port, () => console.log(`XP Hero läuft: Spiel http://localhost:${port}/  ·  Admin http://localhost:${port}/admin/`));
  }
}
