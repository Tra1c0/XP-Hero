// Admin-Panel für das eigene Backend. Anmeldung mit Benutzer/Passwort; das Token liegt nur in sessionStorage (kein eingebetteter Schlüssel).
// Der Content-Editor ist generisch: jede Tabelle und jeder Konfigwert des Pakets ist editierbar, wird serverseitig validiert,
// als Entwurf versioniert und erst durch "Veröffentlichen" aktiv. Rollback = ältere Version erneut veröffentlichen.
const $ = (s) => document.querySelector(s);
const h = (tag, a = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(a)) { if (k === 'on') e.addEventListener('click', v); else if (k === 'cls') e.className = v; else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
let token = sessionStorage.getItem('xphero.admin') || '', me = JSON.parse(sessionStorage.getItem('xphero.admin.me') || 'null'), view = 'content';
let pack = null, loaded = null, tbl = 'config', sel = null, dirty = false;
const say = (m, err) => { const d = h('div', { cls: err ? 'err' : '' }, m); $('#msg').append(d); setTimeout(() => d.remove(), err ? 7000 : 3500); };
async function api(path, method = 'GET', body) {
  const r = await fetch('/api/admin' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') { token = ''; sessionStorage.removeItem('xphero.admin'); render(); }
  if (!r.ok) { say((data.error || 'Fehler ' + r.status) + (data.errors ? ': ' + data.errors.slice(0, 5).join(' | ') : ''), true); return null; }
  return data;
}
const fmtT = (t) => (t ? new Date(t).toLocaleString('de-DE') : '–');
const VIEWS = [['content', 'Content & Balancing'], ['events', 'Events'], ['codes', 'Codes'], ['profiles', 'Profile & Grants'], ['audit', 'Audit-Log'], ['system', 'System']];

async function render() {
  $('#who').textContent = me && token ? `${me.user} (${me.role})` : '';
  $('#nav').replaceChildren(...(token ? [...VIEWS.map(([id, l]) => h('button', { cls: view === id ? 'on' : '', on: () => { view = id; render(); } }, l)), h('button', { on: async () => { await api('/logout', 'POST', {}); token = ''; sessionStorage.clear(); render(); } }, 'Abmelden')] : []));
  const main = $('#main');
  if (!token) return main.replaceChildren(loginView());
  main.replaceChildren(h('p', { cls: 'mut' }, 'Lädt …'));
  main.replaceChildren(...(await V[view]()));
}
function loginView() {
  const u = h('input', { id: 'u', autocomplete: 'username', value: 'admin' }), p = h('input', { id: 'p', type: 'password', autocomplete: 'current-password' });
  const go = async () => { const r = await api('/login', 'POST', { user: u.value, password: p.value }); if (r) { token = r.token; me = r; sessionStorage.setItem('xphero.admin', token); sessionStorage.setItem('xphero.admin.me', JSON.stringify({ user: r.user, role: r.role })); render(); } };
  p.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  return h('div', { cls: 'card', style: 'max-width:360px;margin:40px auto' }, h('h2', {}, 'Anmelden'), h('label', {}, 'Benutzer', u), h('label', {}, 'Passwort', p), h('button', { cls: 'pri', on: go }, 'Anmelden'));
}
const rowKey = (r) => { for (const k of ['id', 'feature', 'floor', 'tier', 'star', 'idx', 'level', 'rarity']) if (r[k] !== undefined) return r[k]; return '?'; };
const statusTag = (s) => h('span', { cls: 'tag ' + (s === '?' ? 'Q' : s), title: 'D belegt · B beobachtet · R rekonstruiert · E eigener Wert · ? offen' }, s || '–');

const V = {};
V.content = async () => {
  const list = await api('/content');
  if (!list) return [];
  if (!pack) { pack = await api('/content/' + encodeURIComponent(list.active)); loaded = list.active; dirty = false; }
  const names = ['config', ...Object.keys(pack.tables)];
  const rows = tbl === 'config' ? Object.keys(pack.config).map((k) => ({ k, label: k, s: (pack.configMeta[k] || {}).status })) : pack.tables[tbl].map((r, i) => ({ k: i, label: `${rowKey(r)}${r.name ? ' – ' + r.name : ''}`, s: r.s }));
  if (sel == null || !rows.some((r) => r.k === sel)) sel = rows.length ? rows[0].k : null;
  const cur = sel == null ? null : tbl === 'config' ? pack.config[sel] : pack.tables[tbl][sel];
  const ta = h('textarea', { spellcheck: 'false' }); ta.value = cur === undefined ? '' : JSON.stringify(cur, null, 2);
  const meta = tbl === 'config' ? pack.configMeta[sel] || {} : pack.meta[tbl] || {};
  const apply = () => { let v; try { v = JSON.parse(ta.value); } catch (e) { return say('Kein gültiges JSON: ' + e.message, true); } if (tbl === 'config') pack.config[sel] = v; else pack.tables[tbl][sel] = v; dirty = true; say('Übernommen (noch nicht gespeichert)'); render(); };
  const note = h('input', { placeholder: 'Änderungsnotiz (für Audit-Log)', style: 'flex:1;min-width:200px' });
  const filter = h('input', { placeholder: 'Filter …', style: 'width:100%;margin-bottom:6px' });
  const listEl = h('div', { cls: 'list' });
  const drawList = () => listEl.replaceChildren(...rows.filter((r) => !filter.value || r.label.toLowerCase().includes(filter.value.toLowerCase())).slice(0, 400).map((r) => h('button', { cls: r.k === sel ? 'on' : '', on: () => { sel = r.k; render(); } }, r.label, ' ', r.s ? statusTag(r.s) : null)));
  filter.addEventListener('input', drawList); drawList();
  return [h('div', { cls: 'card' }, h('div', { cls: 'rowf' }, h('b', {}, `Bearbeitet: ${loaded}${dirty ? ' (ungespeicherte Änderungen)' : ''}`), h('span', { cls: 'mut' }, `Aktiv: ${list.active}`), note,
      h('button', { on: async () => { const r = await api('/validate', 'POST', { pack }); if (r) say(r.errors.length ? `${r.errors.length} Fehler: ${r.errors.slice(0, 4).join(' | ')}` : 'Gültig', r.errors.length > 0); } }, 'Validieren'),
      h('button', { cls: 'pri', on: async () => { const r = await api('/content', 'POST', { pack, note: note.value }); if (r) { say(`Entwurf ${r.version} gespeichert`); loaded = r.version; pack.version = r.version; dirty = false; render(); } } }, 'Als Entwurf speichern'))),
    h('div', { cls: 'grid' }, h('div', {}, h('label', {}, 'Tabelle', h('select', { id: 'tsel' }, names.map((n) => h('option', { value: n, selected: n === tbl }, `${n}${n !== 'config' ? ` (${pack.tables[n].length})` : ''}`)))), filter, listEl),
      h('div', { cls: 'card' }, h('p', {}, statusTag(tbl === 'config' ? meta.status : meta.status), ' ', h('span', { cls: 'mut' }, meta.note || '')),
        ta, h('div', { cls: 'rowf', style: 'margin-top:8px' }, h('button', { cls: 'pri', on: apply }, 'Zeile übernehmen'),
          tbl !== 'config' ? h('button', { on: () => { const c = JSON.parse(JSON.stringify(cur || {})); if (c.id !== undefined) c.id = c.id + '_neu'; pack.tables[tbl].push(c); sel = pack.tables[tbl].length - 1; dirty = true; render(); } }, 'Als neue Zeile duplizieren') : null,
          tbl !== 'config' && cur ? h('button', { cls: 'warn', on: () => { if (confirm('Zeile löschen?')) { pack.tables[tbl].splice(sel, 1); sel = null; dirty = true; render(); } } }, 'Zeile löschen') : null))),
    h('div', { cls: 'card' }, h('h3', {}, 'Versionen'), h('div', { cls: 'wrap' }, h('table', {}, h('tr', {}, ['Version', 'Status', 'Notiz', 'Autor', 'Erstellt', ''].map((x) => h('th', {}, x))),
      list.versions.map((v) => h('tr', {}, h('td', {}, v.version), h('td', {}, v.status + (v.version === list.active ? ' · AKTIV' : '')), h('td', {}, v.note || ''), h('td', {}, v.author), h('td', {}, fmtT(v.created)),
        h('td', {}, h('button', { on: async () => { if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return; pack = await api('/content/' + encodeURIComponent(v.version)); loaded = v.version; dirty = false; sel = null; render(); } }, 'Laden'), ' ',
          v.version !== list.active ? h('button', { cls: v.status === 'archived' ? 'warn' : 'pri', on: async () => { if (!confirm(`${v.version} für alle Spieler aktivieren?`)) return; const r = await api(`/content/${encodeURIComponent(v.version)}/publish`, 'POST', {}); if (r) { say(`Aktiv: ${r.active}`); render(); } } }, v.status === 'archived' ? 'Rollback hierauf' : 'Veröffentlichen') : null))))))];
};
V.events = async () => {
  await V.content();
  const evs = pack.tables.events;
  const f = { id: h('input', { placeholder: 'ev_sommer' }), name: h('input', { placeholder: 'Sommerjagd' }), start: h('input', { type: 'datetime-local' }), end: h('input', { type: 'datetime-local' }), level: h('input', { type: 'number', value: 1, min: 1 }),
    counter: h('input', { value: 'kill:any' }), goals: h('input', { value: '100,500,2000' }), reward: h('input', { value: '[{"item":"gems","n":50}]' }) };
  const add = () => {
    let reward; try { reward = JSON.parse(f.reward.value); } catch { return say('Reward ist kein gültiges JSON', true); }
    if (!f.id.value || !f.start.value || !f.end.value) return say('ID, Start und Ende sind Pflicht', true);
    evs.push({ id: f.id.value, name: f.name.value || f.id.value, start: new Date(f.start.value).toISOString(), end: new Date(f.end.value).toISOString(), graceDays: 2, segment: { level: Number(f.level.value) || 1 },
      track: { id: f.id.value, name: f.name.value || f.id.value, kind: 'event', baseline: true, nodes: f.goals.value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0).map((n) => ({ id: 'n' + n, name: `${f.counter.value} ${n}`, cond: { counter: f.counter.value, gte: n, scope: 'track' }, reward })) } });
    dirty = true; say('Event angelegt – unter „Content & Balancing“ validieren, speichern und veröffentlichen.'); render();
  };
  return [h('div', { cls: 'card' }, h('h3', {}, 'Events im bearbeiteten Paket'), h('div', { cls: 'wrap' }, h('table', {}, h('tr', {}, ['ID', 'Name', 'Start (UTC)', 'Ende (UTC)', 'Ziele', ''].map((x) => h('th', {}, x))),
      evs.map((e, i) => h('tr', {}, h('td', {}, e.id), h('td', {}, e.name), h('td', {}, e.start), h('td', {}, e.end), h('td', {}, e.track.nodes.length), h('td', {}, h('button', { cls: 'warn', on: () => { evs.splice(i, 1); dirty = true; render(); } }, 'Entfernen'))))))),
    h('div', { cls: 'card' }, h('h3', {}, 'Neues Event'), h('div', { cls: 'rowf' }, h('label', {}, 'ID', f.id), h('label', {}, 'Name', f.name), h('label', {}, 'Start', f.start), h('label', {}, 'Ende', f.end), h('label', {}, 'ab Level', f.level)),
      h('div', { cls: 'rowf' }, h('label', {}, 'Zähler (z. B. kill:any, craft, mode:tower:clear)', f.counter), h('label', {}, 'Zielwerte', f.goals), h('label', { style: 'flex:1' }, 'Reward je Ziel (JSON)', f.reward)),
      h('button', { cls: 'pri', on: add }, 'Event hinzufügen'), h('p', { cls: 'mut' }, 'Komplexere Events (eigene Bedingungen, Segmentregeln) lassen sich in der Tabelle „events“ als JSON bearbeiten.'))];
};
V.codes = async () => {
  const r = await api('/codes'); if (!r) return [];
  const f = { code: h('input', { placeholder: 'WILLKOMMEN' }), reward: h('input', { value: '[{"item":"gems","n":100}]', style: 'min-width:260px' }), exp: h('input', { type: 'date' }), max: h('input', { type: 'number', value: 0, min: 0, style: 'width:90px' }), note: h('input', { placeholder: 'Notiz' }) };
  const add = async () => { let reward; try { reward = JSON.parse(f.reward.value); } catch { return say('Reward ist kein gültiges JSON', true); } const x = await api('/codes', 'POST', { code: f.code.value, reward, expires: f.exp.value || null, maxUses: Number(f.max.value), note: f.note.value }); if (x) { say('Code gespeichert'); render(); } };
  return [h('div', { cls: 'card' }, h('h3', {}, 'Neuer Belohnungscode'), h('div', { cls: 'rowf' }, h('label', {}, 'Code', f.code), h('label', {}, 'Reward (JSON)', f.reward), h('label', {}, 'Ablauf', f.exp), h('label', {}, 'Max. Einlösungen (0 = ∞)', f.max), h('label', {}, 'Notiz', f.note), h('button', { cls: 'pri', on: add }, 'Speichern'))),
    h('div', { cls: 'card wrap' }, h('table', {}, h('tr', {}, ['Code', 'Reward', 'Ablauf', 'Einlösungen', 'Notiz', ''].map((x) => h('th', {}, x))), r.codes.length ? r.codes.map((c) => h('tr', {}, h('td', {}, c.code), h('td', {}, JSON.stringify(c.reward)), h('td', {}, fmtT(c.expires)), h('td', {}, `${c.uses}${c.max_uses ? ' / ' + c.max_uses : ''}`), h('td', {}, c.note || ''),
      h('td', {}, h('button', { cls: 'warn', on: async () => { if (confirm('Code löschen?') && (await api('/codes/' + c.code, 'DELETE'))) render(); } }, 'Löschen')))) : h('tr', {}, h('td', { colspan: 6, cls: 'mut' }, 'Noch keine Codes. Jeder Code ist pro Profil genau einmal einlösbar.'))))];
};
V.profiles = async () => {
  const r = await api('/profiles'); if (!r) return [];
  const f = { id: h('input', { placeholder: 'Profil-ID' }), reward: h('input', { value: '[{"item":"gems","n":100}]', style: 'min-width:260px' }), reason: h('input', { placeholder: 'Begründung (Pflicht)', style: 'min-width:220px' }) };
  const grant = async () => { let reward; try { reward = JSON.parse(f.reward.value); } catch { return say('Reward ist kein gültiges JSON', true); } const x = await api('/grants', 'POST', { profileId: f.id.value, reward, reason: f.reason.value }); if (x) say(`Grant ${x.id} angelegt – Zustellung beim nächsten Sync des Profils`); };
  return [h('div', { cls: 'card' }, h('h3', {}, 'Kontrollierter Grant (nur Rolle admin, wird protokolliert)'), h('div', { cls: 'rowf' }, h('label', {}, 'Profil', f.id), h('label', {}, 'Reward (JSON)', f.reward), h('label', {}, 'Begründung', f.reason), h('button', { cls: 'pri', on: grant }, 'Grant anlegen'))),
    h('div', { cls: 'card wrap' }, h('table', {}, h('tr', {}, ['Profil', 'Level', 'Gems', 'Revision', 'Zuletzt', 'Sandbox', ''].map((x) => h('th', {}, x))), r.profiles.length ? r.profiles.map((p) => h('tr', {}, h('td', {}, p.id), h('td', {}, p.summary?.level ?? '–'), h('td', {}, p.summary?.gems ?? '–'), h('td', {}, p.revision), h('td', {}, fmtT(p.updated)), h('td', {}, p.sandbox ? 'ja (keine Ranglisten)' : 'nein'),
      h('td', {}, h('button', { on: () => { f.id.value = p.id; say('Profil in Grant-Formular übernommen'); } }, 'Für Grant wählen'), ' ', h('button', { on: async () => { if (await api(`/profiles/${p.id}/sandbox`, 'POST', { sandbox: !p.sandbox })) render(); } }, p.sandbox ? 'Sandbox aus' : 'Als Testprofil markieren')))) : h('tr', {}, h('td', { colspan: 7, cls: 'mut' }, 'Noch keine Profile. Profile entstehen, wenn ein Spieler im Spiel unter „Mehr“ den Sync aktiviert.'))))];
};
V.audit = async () => { const r = await api('/audit'); return r ? [h('div', { cls: 'card wrap' }, h('table', {}, h('tr', {}, ['Zeit', 'Benutzer', 'Aktion', 'Detail'].map((x) => h('th', {}, x))), r.rows.map((a) => h('tr', {}, h('td', {}, fmtT(a.ts)), h('td', {}, a.user), h('td', {}, a.action), h('td', {}, h('pre', {}, a.detail))))))] : []; };
V.system = async () => {
  const u = await api('/users');
  const f = { user: h('input', { placeholder: 'Benutzer' }), pw: h('input', { type: 'password', placeholder: 'Passwort (min. 10 Zeichen)' }), role: h('select', {}, ['viewer', 'editor', 'admin'].map((r) => h('option', {}, r))) };
  return [h('div', { cls: 'card' }, h('h3', {}, 'Backup'), h('p', { cls: 'mut' }, 'Schreibt eine konsistente Kopie der Datenbank in den Datenordner des Servers. Wiederherstellung: Server stoppen, Datei als xphero.db einsetzen, starten.'), h('button', { on: async () => { const r = await api('/backup', 'POST', {}); if (r) say('Backup: ' + r.file); } }, 'Backup jetzt erstellen')),
    u ? h('div', { cls: 'card' }, h('h3', {}, 'Admin-Konten und Rollen'), h('p', { cls: 'mut' }, 'viewer: nur lesen · editor: Content-Entwürfe, Events, Codes · admin: veröffentlichen, Grants, Konten, Backup'),
      h('table', {}, u.users.map((x) => h('tr', {}, h('td', {}, x.user), h('td', {}, x.role)))), h('div', { cls: 'rowf' }, h('label', {}, 'Benutzer', f.user), h('label', {}, 'Passwort', f.pw), h('label', {}, 'Rolle', f.role),
        h('button', { cls: 'pri', on: async () => { if (await api('/users', 'POST', { user: f.user.value, password: f.pw.value, role: f.role.value })) { say('Konto gespeichert'); render(); } } }, 'Anlegen / ändern'))) : h('div', { cls: 'card mut' }, 'Kontenverwaltung erfordert die Rolle admin.')];
};
document.addEventListener('change', (e) => { if (e.target.id === 'tsel') { tbl = e.target.value; sel = null; render(); } });
render();
