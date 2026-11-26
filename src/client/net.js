// Optionale Anbindung an das EIGENE Backend. Alles hier ist verzichtbar: ohne Server bleibt das Spiel vollständig spielbar.
// Jede Anfrage hat Timeout; Mutationen tragen einen Idempotency-Key. Keine Tracker, keine Fremd-Endpunkte.
import { serialize, deserialize, migrate } from '../core/state.js';
import { validateContent, indexContent } from '../core/content/validate.js';
import { snapshot } from '../core/modes.js';

export function makeNet(getGame, ui) {
  const KEY = 'xphero.net';
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { cfg = {}; }
  const persist = () => localStorage.setItem(KEY, JSON.stringify(cfg));
  const base = () => (cfg.url || (location.protocol.startsWith('http') ? location.origin : '')).replace(/\/$/, '');
  let sessionId = null, lastErr = '';
  async function api(path, method = 'GET', body) {
    if (!base()) return { ok: false, error: 'Kein Backend konfiguriert' };
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 6000);
    try {
      const r = await fetch(base() + path, { method, signal: ac.signal, headers: { 'content-type': 'application/json', ...(cfg.token ? { authorization: 'Bearer ' + cfg.token } : {}),
        ...(method !== 'GET' ? { 'idempotency-key': `${method}:${path}:${Date.now()}:${Math.random().toString(36).slice(2)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, data } : { ok: false, status: r.status, error: data.error || `Serverfehler ${r.status}`, data };
    } catch (e) { lastErr = 'Server nicht erreichbar'; return { ok: false, error: lastErr }; } finally { clearTimeout(tm); }
  }
  const net = {
    online: () => !!cfg.token,
    status: () => (cfg.token ? `verbunden als ${cfg.profileId}` : `nicht verbunden${lastErr ? ' – ' + lastErr : ''} (Spiel läuft offline)`),
    async ensure() {
      if (cfg.token) return true;
      const g = getGame(), r = await api('/api/profile/register', 'POST', { profileId: g.state.profileId });
      if (!r.ok) return false;
      cfg.token = r.data.token; cfg.profileId = r.data.profileId; persist();
      return true;
    },
    // Sync: Grants abholen (idempotent), Stand mit Revision hochladen. Bei Konflikt entscheidet der Spieler – es wird nie addiert oder blind überschrieben.
    async sync() {
      const g = getGame();
      if (!(await net.ensure())) return 'Backend nicht erreichbar – weiter offline.';
      const cl = await api('/api/claims');
      if (cl.ok && cl.data.claims.length) {
        const done = [];
        for (const c of cl.data.claims) { const r = g.try('grantExternal', c.id, c.reward, 'admin_grant'); if (r.ok || r.code === 'already_claimed') done.push(c.id); }
        if (done.length) { await api('/api/claims', 'POST', { ids: done }); ui.toast(`${done.length} Zustellung(en) vom Server erhalten`); }
      }
      await net.contentUpdate();
      const push = (force) => api('/api/sync', 'POST', { baseRevision: g.state.sync.rev, save: serialize(g.state), summary: { level: g.state.player.level, gems: g.state.inv.gems || 0, tx: g.state.txSeq }, force });
      const r = await push(false);
      if (r.ok) { g.state.sync.rev = r.data.revision; g.save(); return `Synchronisiert (Revision ${r.data.revision}).`; }
      if (r.status === 409) {
        const sv = r.data.serverSummary || {};
        ui.modal('Sync-Konflikt', `Auf dem Server liegt ein anderer Stand (Revision ${r.data.serverRevision}, Level ${sv.level}, ${sv.gems} Gems). Lokal: Level ${g.state.player.level}, ${g.state.inv.gems || 0} Gems. Welcher Stand soll gelten?`, [
          ['Lokal behalten', async () => { const x = await push(true); if (x.ok) { g.state.sync.rev = x.data.revision; g.save(); ui.toast('Lokaler Stand hochgeladen'); } }],
          ['Server übernehmen', () => net.applySave(r.data.serverSave, r.data.serverRevision), 'warn']]);
        return 'Konflikt – bitte entscheiden.';
      }
      return r.error;
    },
    applySave(text, rev) {
      const g = getGame();
      try { const st = migrate(deserialize(text), g.c); if (rev != null) st.sync.rev = rev; localStorage.setItem('xphero.save.0', serialize(st)); localStorage.setItem('xphero.save.meta', JSON.stringify({ slot: 0, n: 0 })); location.reload(); } catch (e) { ui.toast('Spielstand ungültig: ' + e.message); }
    },
    async redeem(code) {
      if (!(await net.ensure())) return { ok: false, error: 'Backend nicht erreichbar' };
      const r = await api('/api/events/redeem', 'POST', { code });
      if (!r.ok) return r;
      const x = getGame().try('grantExternal', r.data.claimId, r.data.reward, 'code');
      return x.ok ? { ok: true, got: x.value } : { ok: false, error: x.error };
    },
    async leaderboard(board) { const r = await api('/api/leaderboards?board=' + board); return r.ok ? r.data.rows : []; },
    async modeStart(mode, param) { if (!cfg.token || mode !== 'tower') return; const r = await api('/api/modes/session', 'POST', { mode, param }); sessionId = r.ok ? r.data.sessionId : null; },
    async modeComplete(res) { if (!cfg.token || !sessionId || res.mode !== 'tower') return; const id = sessionId; sessionId = null; await api('/api/modes/complete', 'POST', { sessionId: id, win: res.win, param: res.param }); },
    async invasionOnline() {
      if (!(await net.ensure())) return { ok: false, error: 'Backend nicht erreichbar' };
      const g = getGame();
      await api('/api/invasion/snapshot', 'POST', { snapshot: snapshot(g.g), name: g.state.profileId.slice(0, 8) });
      return api('/api/invasion/fight', 'POST', {});
    },
    // Content: neue Version laden, validieren, als last-known-good ablegen; wirkt beim nächsten Start. Ungültiges wird verworfen.
    async contentUpdate() {
      const m = await api('/api/content/manifest');
      if (!m.ok || m.data.version === getGame().c.version) return;
      const p = await api('/api/content/' + encodeURIComponent(m.data.version));
      if (!p.ok || validateContent(p.data).length) return;
      try { indexContent(p.data); localStorage.setItem('xphero.content', JSON.stringify(p.data)); ui.toast('Neuer Content geladen – aktiv nach Neustart.'); } catch { /* Speicher voll: alter Stand bleibt */ }
    },
    exportSave() {
      const g = getGame(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([serialize(g.state)], { type: 'application/json' })); a.download = `xphero-${g.state.profileId}.json`; a.click();
    },
    importSave() {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json';
      i.onchange = async () => { if (i.files[0]) net.applySave(await i.files[0].text(), null); };
      i.click();
    },
    setUrl(u) { cfg = { url: u }; persist(); },
  };
  return net;
}
