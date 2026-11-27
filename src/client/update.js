// In-App-Update: Bei jedem Öffnen der App (Kaltstart und Rückkehr aus dem Hintergrund) die neueste GitHub-Release abfragen.
// Nur in der installierten APK (versionCode > 0). "Später" schließt den Hinweis nur bis zum nächsten Öffnen.
// Ist ein höherer versionCode verfügbar, wird das Update angeboten; der Download öffnet den Android-Installer.
// Gleiche Signatur -> Android installiert über die bestehende App, Spielstand bleibt erhalten.
export const UPDATE_REPO = 'Tra1c0/XP-Hero';
const API = 'https://api.github.com/repos/' + UPDATE_REPO + '/releases/latest';

// Tag-Schema aus dem CI: v0.1.<versionCode>
export const codeFromTag = (tag) => { const m = /(\d+)$/.exec(String(tag || '')); return m ? Number(m[1]) : 0; };

let open = false, last = 0;
export async function checkForUpdate(ui, { force = false, minGapMs = 0 } = {}) {
  if (open && !force) return { status: 'open' };
  if (!force && Date.now() - last < minGapMs) return { status: 'throttled' };
  last = Date.now();
  let cur;
  try { cur = await (await fetch('./version.json', { cache: 'no-store' })).json(); } catch { return { status: 'unknown' }; }
  if (!cur.versionCode && !force) return { status: 'dev' }; // Web-/Entwicklungsversion: keine Prüfung
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 8000);
  let rel;
  try {
    const r = await fetch(API, { signal: ac.signal, headers: { accept: 'application/vnd.github+json' } });
    if (!r.ok) return { status: 'error', error: `Update-Server antwortet ${r.status}` };
    rel = await r.json();
  } catch { return { status: 'offline' }; } finally { clearTimeout(tm); }
  const code = codeFromTag(rel.tag_name), apk = (rel.assets || []).find((a) => a.name.endsWith('.apk'));
  if (!apk || code <= cur.versionCode) return { status: 'current', current: cur.versionName };
  if (open) return { status: 'open' };
  open = true;
  const mb = (apk.size / 1048576).toFixed(1);
  ui.modal(`Update ${rel.name || rel.tag_name}`, `Installiert: ${cur.versionName}. Neu: ${rel.tag_name} (${mb} MB). Dein Spielstand bleibt erhalten. ${rel.body || ''}`, [
    ['Später', () => { open = false; }],
    ['Herunterladen', () => { open = false; location.href = apk.browser_download_url; }, 'pri']]);
  return { status: 'available', code };
}
