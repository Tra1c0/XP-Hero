// Menüs und HUD (Platzhalter-Design). Liest den Zustand und ruft ausschließlich game.try(Befehl) auf – nie direkte Zustandsänderung.
import { fmt, fmtTime } from '../core/util.js';
import * as econ from '../core/econ.js';
import * as prog from '../core/progress.js';
import * as gear from '../core/gear.js';
import * as home from '../core/home.js';
import * as meta from '../core/meta.js';
import * as modes from '../core/modes.js';
import { icon, itemIcon, STAT_ICON, heroArt } from './skin.js';
import { BIOMES, WATER as WCOL, hex } from './assets3d.js';

// Lokalisierung: t(Quelltext) -> Übersetzung; ohne Eintrag bleibt der deutsche Quelltext.
const LOCALE = {};
export const t = (s) => LOCALE[s] || s;
export const setLocale = (tbl) => Object.assign(LOCALE, tbl);

let game, net, cur = null, tab = {}, more = {};
const $ = (id) => document.getElementById(id);
export function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) { if (k === 'on') e.addEventListener('click', v); else if (k === 'cls') e.className = v; else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
const btn = (label, on, disabled = false, cls = '') => h('button', { on, disabled, cls: 'b ' + cls }, t(label));
const row = (title, sub, ...right) => h('div', { cls: 'row' }, h('div', { cls: 'grow' }, h('div', { cls: 'ti' }, title), sub ? h('div', { cls: 'sub' }, sub) : null), ...right);
const sec = (title, ...kids) => h('section', {}, h('h3', {}, t(title)), ...kids);
export function itemName(id) {
  if (id.startsWith('piece:')) return `${game.c.get('heroes', id.slice(6)).name}-Scherben`;
  return game.c.by.items.get(id)?.name || id;
}
export const fmtCost = (c) => { const e = Object.entries(c || {}).filter(([, n]) => n > 0); return e.length ? e.map(([i, n]) => `${fmt(n)} ${itemName(i)}`).join(' + ') : t('gratis'); };
const costEl = (c, times = 1) => h('span', { cls: econ.canAfford(game.g, c, times) ? 'cost' : 'cost miss' }, fmtCost(Object.fromEntries(Object.entries(c || {}).map(([i, n]) => [i, n * times]))));
export function fmtReward(list) {
  const agg = {};
  for (const e of list || []) {
    const k = e.item ? itemName(e.item) : e.weapon ? '⚔ ' + game.c.get('weapons', e.weapon).name : e.rune ? '◈ ' + game.c.get('runes', e.rune).name : e.hero ? 'Held ' + e.hero : e.flag ? 'Perk' : e.points ? 'Punkte' : e.heroPieces ? 'Heldenscherben' : e.weaponPool ? 'Waffe' : '?';
    agg[k] = (agg[k] || 0) + (e.n ?? (e.min !== undefined ? 0 : 1)); if (e.min !== undefined) agg[k] = e.min === e.max ? e.min : `${e.min}–${e.max}`;
  }
  return Object.entries(agg).map(([k, n]) => (n === 1 && /^[⚔◈]/.test(k) ? k : `${typeof n === 'number' ? fmt(n) : n} ${k}`)).join(', ');
}
export function toast(msg, ms = 2200) { const e = h('div', { cls: 'toast' }, msg), box = $('toasts'); while (box.children.length >= 3) box.firstChild.remove(); box.append(e); setTimeout(() => e.remove(), ms); }
export function modal(title, body, buttons = [['OK', null]]) {
  const m = h('div', { cls: 'modal' }, h('div', { cls: 'box' }, h('h3', {}, title), h('div', {}, body), h('div', { cls: 'btns' }, buttons.map(([l, f, c]) => btn(l, () => { m.remove(); if (f) f(); }, false, c || '')))));
  document.body.append(m);
}
// Führt einen Befehl aus, zeigt Fehler verständlich und zeichnet das Menü neu.
function act(name, ...args) {
  const r = game.try(name, ...args);
  if (!r.ok) toast(r.error);
  render();
  return r;
}
const reward = (title, r) => { if (r.ok && r.value && r.value.length) toast(`${title}: ${fmtReward(r.value)}`, 3000); };
const confirmBig = (cost, fn) => { if ((cost.gems || 0) >= 500) modal(t('Kauf bestätigen'), `${fmtCost(cost)} ausgeben?`, [['Abbrechen', null], ['Kaufen', fn, 'pri']]); else fn(); };
const has = (f) => !!game.state.unlocks[f];
const STAT = { atk: 'Angriff', hp: 'Leben', cargo: 'Cargo', atkSpeedPct: 'Angriffstempo %', regen: 'Regeneration/s', critChance: 'Krit-Chance %', critDmg: 'Krit-Schaden %', moveSpeedPct: 'Bewegung %', multiHit: 'Doppelangriff %', tripleHit: 'Dreifachangriff %', lifesteal: 'Lebensraub %',
  skillDmgPct: 'Skill-Schaden %', cooldownPct: 'Abklingzeit −%', goldPct: 'Gold %', xpPct: 'XP %', dmgPct: 'Schaden %', bossDmgPct: 'Boss-Schaden %', dropPct: 'Drops %', meleePct: 'Nahkampf %', rangedPct: 'Fernkampf %', synergyPct: 'Synergie %' };
const FEAT = { abilities: 'Ability-Upgrades', shop: 'Shop', weaponVault: 'Waffenkammer', craft: 'Schmieden', codex: 'Monster-Codex', missions: 'Mission Center', slot2: 'Zweiter Waffenslot', tower: 'Challenge Tower', battlePass: 'Battle Pass', sevenDay: '7-Tage-Event',
  carnival: 'Carnival', liveEvent: 'Live-Events', heroShop: 'Helden-Beschwörung', heroes: 'Helden', invasion: 'Invasion', pvp: 'PvP', portal: 'Portal', sTierChest: 'S-Tier-Truhe', heroEvolution: 'Helden-Evolution', heroCollection: 'Helden-Sammlung', traits: 'Traits',
  soul: 'Soul Imprint', raid: 'Boss Raid', tomb: 'Tomb of Heroes', runes: 'Runen', special: 'Special-Upgrades', extra: 'Extra-Upgrades', blessing: 'Blessings', spin: 'Lucky Spin', randomReward: 'Bonusbelohnung', keyhouse: 'Key House' };
const sn = (k) => t(STAT[k] || k), fn = (k) => t(FEAT[k] || k);
const tabs = (key, list) => { if (!list.some((x) => x[0] === tab[key])) tab[key] = list[0][0]; const el = h('div', { cls: 'tabs' }, list.map(([id, label, badge]) => h('button', { cls: 'tab' + (tab[key] === id ? ' on' : '') + (badge ? ' badge' : ''), on: () => { tab[key] = id; render(); } }, t(label))));; requestAnimationFrame(() => { const on = el.querySelector('.on'); if (on) el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2); }); return el; };
const cap = (key, list, n = 40) => { const lim = more[key] || n; return [...list.slice(0, lim), list.length > lim ? btn(`mehr anzeigen (${list.length - lim})`, () => { more[key] = lim + n * 2; render(); }) : null]; };

// Zielführung: Figur läuft per Pfadsuche zum Questziel (manuelle Eingabe bricht ab).
function walkTo(q) {
  const goal = game.questGoal(q);
  if (!goal) return toast('Dieses Ziel liegt nicht in diesem Gebiet.');
  if (game.world.mode) return toast('Im Modus nicht möglich.');
  game.world.p.auto = false; game.world.goTo(goal.x, goal.y); close(); toast(`Unterwegs zu: ${goal.label}`);
}
// Gespräch wie in der Vorlage: startet von selbst, sobald man den Kreis eines NPCs mit Anliegen betritt. Sprechblase mit getipptem Text,
// blockiert das Spiel nicht; Tippen blättert weiter, Weggehen beendet sie. Abgaben und neue Aufträge werden sofort verbucht und danach gemeldet.
let speech = null, spokeTo = null;
function endSpeech() { if (!speech) return; clearInterval(speech.iv); clearTimeout(speech.to); speech.el.remove(); const fin = speech.fin; speech = null; if (fin) fin(); }
function talk(o) {
  endSpeech();
  const r = act('talkNpc', o.id);
  if (!r.ok) return;
  const v = r.value, fin = () => {
    for (const c of v.claimed) toast(`✅ ${c.name}: ${fmtReward(c.got)}`, 3200);
    for (const a of v.accepted) toast(`❗ Neuer Auftrag: ${a}`, 3200);
    if (o.raid && has('raid')) modal(v.npc, `Raid: ${game.c.get('raidBosses', o.raid).name}`, [['Schließen', null], ['Starten', () => { if (act('startMode', 'raid', o.raid).ok) close(); }, 'pri']]);
  };
  if (!v.lines.length) return fin();
  const txt = h('span', {}), el = h('div', { cls: 'speech', role: 'status' }, h('b', {}, v.npc), txt);
  speech = { el, fin, npc: o.id, i: 0, iv: null, to: null };
  const show = (i) => {
    if (!speech) return;
    if (i >= v.lines.length) return endSpeech();
    const line = v.lines[i]; let k = 0;
    speech.i = i; speech.full = false; txt.textContent = ''; clearInterval(speech.iv); clearTimeout(speech.to);
    speech.iv = setInterval(() => { if (!speech) return; k += 2; txt.textContent = line.slice(0, k); if (k >= line.length) { clearInterval(speech.iv); speech.full = true; speech.to = setTimeout(() => show(i + 1), 1400 + line.length * 28); } }, 30);
    speech.skip = () => { if (speech.full) show(i + 1); else { clearInterval(speech.iv); txt.textContent = line; speech.full = true; speech.to = setTimeout(() => show(i + 1), 2200); } };
  };
  el.addEventListener('click', () => speech && speech.skip());
  document.body.append(el); show(0);
}
// Je Hud-Takt: Kreis betreten -> ansprechen (einmal je Besuch); Kreis verlassen -> Blase schließen.
function autoTalk(w) {
  const o = w.near && w.near.type === 'npc' ? w.near : null;
  if (speech && (!o || o.id !== speech.npc)) endSpeech();
  if (!o) { spokeTo = null; return; }
  if (spokeTo === o.id || cur || document.querySelector('.modal,.reveal')) return;
  spokeTo = o.id;
  const st = meta.npcStatus(game.g, o);
  if (st === 'turnin' || st === 'offer') talk(o);
}
// ---------------------------------------------------------------- Panels
const P = {};
P.quests = () => {
  const g = game.g, list = meta.currentQuests(g), done = Object.keys(game.state.quests.done).length;
  const giverName = (q) => (game.c.t.npcs.find((n) => (q.at ? n.id === q.at : n.char === q.giver)) || {}).name;
  const offers = game.c.cfg.quests.npcTurnIn ? game.c.t.quests.filter((q) => q.giver && meta.questState(g, q) === 'available') : [];
  return [sec('Aktive Quests', list.length ? list.map(({ q, state, obj }) => row(`${q.giver ? `[${giverName(q)}] ` : ''}${q.name}`, `${obj.map((o) => `${fmt(o.cur)}/${fmt(o.need)}`).join(' · ')} — Belohnung: ${fmtReward(q.reward)}${q.unlock ? ' · schaltet frei: ' + q.unlock.map(fn).join(', ') : ''}`,
    game.questGoal(q) ? btn('Zum Ziel', () => walkTo(q)) : null,
    q.giver && game.c.cfg.quests.npcTurnIn ? (state === 'satisfied' ? h('span', { cls: 'cost' }, `bei ${giverName(q)} abgeben`) : null) : btn('Abschließen', () => reward('Quest', act('claimQuest', q.id)), state !== 'satisfied', 'pri'))) : h('p', {}, t('Alle verfügbaren Quests abgeschlossen.'))),
  offers.length ? sec('Neue Aufträge bei', offers.map((q) => row(giverName(q), q.name, game.questGoal(q) ? btn('Hinlaufen', () => walkTo(q)) : h('span', { cls: 'sub' }, 'in anderem Gebiet')))) : null,
  h('p', { cls: 'sub' }, `${done} / ${game.c.t.quests.length} Quests abgeschlossen`)];
};
// Kauf per Antippen; gedrückt halten kauft weiter (beschleunigend), bis losgelassen wird oder etwas fehlt.
let holdT = null, holdN = 0;
const holdStop = () => { clearTimeout(holdT); holdT = null; };
function buyHold(id) {
  holdStop(); holdN = 0;
  let delay = 380;
  const step = () => { holdT = null; if (!act('buyUpgrade', id, 1).ok || ++holdN >= 500) return; delay = Math.max(45, delay * 0.82); holdT = setTimeout(step, delay); };
  step();
}
for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur']) addEventListener(ev, holdStop);
const upVal = (u, e) => { const v = u.show ? u.show.base + e * u.show.mul : e; return (v >= 1000 ? fmt(v) : String(Math.round(v * 10) / 10)) + (u.unit || ''); };
const upFamily = (family) => game.c.t.upgradeTracks.filter((u) => u.family === family);
const upAvail = (family) => upFamily(family).some((u) => { const pv = prog.upgradePreview(game.g, u.id, 1); return !pv.locked && pv.to > pv.from; });
function upgradeRows(family) {
  const g = game.g;
  return upFamily(family).map((u) => {
    const pv = prog.upgradePreview(g, u.id, 1), full = pv.from >= u.max, capped = !full && pv.from >= pv.lim, can = pv.to > pv.from;
    const ic = h('div', { cls: 'uic' }, icon(STAT_ICON[u.stat] || 'star', null, 38));
    if (pv.locked) return h('div', { cls: 'urow lock ' + family }, ic, h('div', { cls: 'um' }, h('div', { cls: 'un' + (u.name.length > 17 ? ' long' : '') }, u.name), h('div', { cls: 'sub' }, u.desc || sn(u.stat)), h('div', { cls: 'uv ot' }, upVal(u, 0))),
      h('div', { cls: 'ulock' }, icon('lock', '#d8d2cc', 30), h('div', {}, Array.from({ length: u.minStar }, () => icon('starf', '#ffd24a', 17)))));
    const mainCur = pv.next ? (pv.next.gold !== undefined ? 'gold' : pv.next.orb_red !== undefined ? 'orb_red' : Object.keys(pv.next)[0]) : null, extras = pv.next ? Object.entries(pv.next).filter(([i]) => i !== mainCur) : [];
    const buy = pv.next ? h('button', { cls: 'b cost ' + (can ? 'go' : 'miss'), 'aria-label': `${u.name} verbessern` }, itemIcon(mainCur, 24), fmt(pv.next[mainCur])) : null;
    if (buy) { buy.addEventListener('pointerdown', (e) => { e.preventDefault(); buyHold(u.id); }); buy.addEventListener('touchend', holdStop); buy.addEventListener('touchcancel', holdStop); buy.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act('buyUpgrade', u.id, 1); } }); }
    return h('div', { cls: 'urow ' + family }, ic,
      h('div', { cls: 'um' }, h('div', { cls: 'un' + (u.name.length > 17 ? ' long' : '') }, u.name), h('div', { cls: 'sub' }, u.desc || sn(u.stat)),
        h('div', { cls: 'uv ot' }, upVal(u, pv.effFrom), full || capped ? '' : ' > ', full || capped ? null : h('em', {}, upVal(u, pv.effTo))), h('div', { cls: 'ul' }, `Stufe ${pv.lvl} / ${pv.lvlMax}`)),
      h('div', { cls: 'ur' }, full ? h('b', { cls: 'umax ot' }, 'MAX') : capped ? h('b', { cls: 'umax ot' }, icon('starf', '#ffd24a', 22)) : [
        extras.length ? h('div', { cls: 'extra ot' }, extras.map(([i, n]) => h('span', { cls: econ.bal(g, i) >= n ? '' : 'miss' }, itemIcon(i, 17), fmt(n)))) : null, buy]));
  });
}
const chips = (...ids) => h('div', { cls: 'chips' }, ids.map((i) => h('span', { cls: 'chip ot' }, itemIcon(i, 22), fmt(econ.bal(game.g, i)))));
const UPF = [['ability', 'Fähigkeit', 'abilities', '↑'], ['special', 'Spezial', 'special', 'S'], ['extra', 'Extra', 'extra', 'E'], ['soul', 'Soul', 'soul', '↑'], ['blessing', 'Segen', 'blessing', '↑']];
P.hero = () => {
  const g = game.g, s = game.state, fams = UPF.filter((f) => has(f[2]));
  const open = game.c.t.areas.filter((a) => game.canEnter(a.id)), ch = open.length ? open[open.length - 1].chapter : 1;
  const quest = () => [h('div', { cls: 'hq ot' }, 'Hauptquest', h('br'), `Kapitel ${ch}`),
    h('div', { cls: 'bossrow' }, game.c.t.areas.filter((a) => a.chapter === ch).map((a) => h('div', { cls: 'bosst ' + (s.world.cleared[a.id] ? 'ok' : game.canEnter(a.id) ? '' : 'no'), title: game.c.get('variants', a.boss).name }, icon('skull', null, 30)))),
    h('p', { cls: 'sub center' }, 'Besiege alle Gebietsbosse!')];
  if (!fams.length) return [h('div', { cls: 'uphead' }, quest()), h('p', { cls: 'center' }, t('Baue das Bonfire, um Upgrades freizuschalten.'))];
  const f = fams.find((x) => x[0] === tab.up) || fams[0];
  tab.up = f[0];
  const special = () => {
    const p = prog.spProgress(g), look = game.c.get('heroes', s.heroes.active).look, top = p.star >= p.maxStar;
    const card = (n, cls) => h('div', { cls: 'spcard ' + cls }, heroArt(look, 74), h('div', { cls: 'spstars' }, Array.from({ length: p.maxStar }, (_, k) => icon('starf', k < n ? '#ffd24a' : '#7a6a5c', 15))));
    return [h('div', { cls: 'sprow' }, card(p.star, 'now'), h('div', { cls: 'spmid' }, h('div', { cls: 'sparrow' }, top ? '★' : '››››'),
      top ? h('div', { cls: 'ot' }, 'Höchste Sternstufe') : p.bonus.map((b) => h('div', { cls: 'ot' }, `+ ${{ atk: 'Kraft', cooldownPct: 'Fertigkeiten-Abklingzeit' }[b.stat] || sn(b.stat)} `, h('em', {}, `${b.pct ?? b.v}%`)))), top ? null : card(p.star + 1, 'next')),
    h('div', { cls: 'bar spbar' }, h('i', { style: `width:${Math.min(100, (100 * p.cur) / p.total)}%` }), h('span', { cls: 'ot' }, `${p.cur}/${p.total}`)),
    h('p', { cls: 'sub center' }, top ? 'Alle Sternstufen erreicht' : 'Fülle alle Spezial-Upgrades für den nächsten Stern')];
  };
  const cur = { ability: ['orb_pink', 'orb_red', 'gold'], special: ['orb_pink', 'orb_red', 'gold'], extra: ['orb_ice', 'orb_jungle'], soul: ['orb_hell'], blessing: ['exp'] }[f[0]];
  return [h('div', { cls: 'uphead' }, f[0] === 'special' ? special() : quest()), chips(...cur), ...upgradeRows(f[0]),
    h('div', { cls: 'uptabs' }, fams.map((x) => h('button', { cls: 'utab ot' + (x[0] === f[0] ? ' on' : ''), on: () => { tab.up = x[0]; $('pbody').scrollTop = 0; render(); } }, t(x[1]), upAvail(x[0]) ? h('span', { cls: 'ubadge' }, x[3]) : null)))];
};
// Gibt es eine nicht ausgerüstete Waffe, die stärker ist als die schwächste ausgerüstete (oder ist ein freier Slot leer)?
function betterWeapon() {
  const g = game.g, ws = game.state.weapons, eq = ws.slots.slice(0, ws.unlocked), free = ws.list.filter((w) => !ws.slots.includes(w.uid));
  if (!free.length) return false;
  if (eq.some((u) => !u)) return true;
  const min = Math.min(...eq.map((u) => prog.weaponDmg(g, ws.list.find((w) => w.uid === u)))); return free.some((w) => prog.weaponDmg(g, w) > min);
}
const wIcon = (w, size) => icon(game.c.get('weapons', w.def).cls, null, size);
const rarCol = (w) => game.c.get('rarities', game.c.get('weapons', w.def).rarity).color;
// Waffenblatt (Aufbau nach Vorlage): Banner, Kachel + Stärke + Stufenbalken, Option, Fertigkeit, Verbinden, unten Ausrüsten / Aufwerten mit Kosten.
function weaponSheet(w0) {
  const uid = w0.uid, m = h('div', { cls: 'modal' }), shut = () => m.remove();
  m.addEventListener('click', (e) => { if (e.target === m) shut(); });
  const draw = () => {
    const g = game.g, c = game.c, ws = game.state.weapons, w = ws.list.find((x) => x.uid === uid);
    if (!w) return shut();
    const d = c.get('weapons', w.def), rar = c.get('rarities', d.rarity), cl = c.get('weaponClasses', d.cls), eq = ws.slots.indexOf(w.uid), mp = gear.mergePreview(g, w.uid), mx = rar.maxLevel;
    const free = ws.slots.findIndex((u, i) => i > 0 && i < ws.unlocked && !u), cost = w.level < mx ? gear.weaponLevelCost(g, w, w.level + 1) : null, can = cost && econ.canAfford(g, cost);
    const sk = d.skill ? c.get('skills', d.skill) : null, go = (...a) => { act(...a); draw(); };
    const sect = (title, ...kids) => h('div', { cls: 'wsec' }, h('div', { cls: 'wsh ot' }, '✦ ', t(title), ' ✦'), h('div', { cls: 'wsb' }, ...kids));
    const mainEq = eq === 0, better = !mainEq && betterWeapon();
    m.replaceChildren(h('div', { cls: 'box wsheet' },
      h('div', { cls: 'wbanner ot' }, d.name.replace(/\s*\(.*\)$/, ''), h('small', {}, rar.name)), h('button', { cls: 'x', 'aria-label': 'Schließen', on: shut }, '✕'),
      h('div', { cls: 'wtop' }, h('div', { cls: 'wtile', style: `background:${rar.color}` }, h('span', { cls: 'lvt ot' }, `Lv.${w.level}`), wIcon(w, 58)),
        h('div', { cls: 'wpow' }, h('div', { cls: 'ot big' }, icon('sword', null, 26), fmt(prog.weaponDmg(g, w))), h('div', { cls: 'bar wlv' }, h('i', { style: `width:${(100 * w.level) / mx}%` }), h('span', { cls: 'ot' }, `Lv: ${w.level}/${mx}`))),
        h('button', { cls: 'b sq' + (w.lock ? ' warn' : ''), 'aria-label': w.lock ? 'Entsperren' : 'Sperren', title: w.lock ? 'Gesperrt: wird nicht verbunden' : 'Sperren', on: () => go('toggleWeaponLock', w.uid) }, icon('lock', '#fff', 22))),
      cl.passive && cl.passive.v ? sect('Option', h('div', { cls: 'wopt' }, h('span', {}, sn(cl.passive.stat).replace(' %', '')), h('b', { cls: 'ot' }, `${Math.round(cl.passive.v * (1 + d.rarity * 0.25) * 100) / 100}%`))) : null,
      sk ? sect('Fertigkeit', h('div', { cls: 'wskill' }, h('span', { cls: 'wski' }, icon(STAT_ICON.skillDmgPct, null, 30)), h('div', {}, h('b', {}, sk.name), h('div', { cls: 'sub' }, `Trifft ${sk.hits > 1 ? sk.hits + '-mal ' : ''}mit ${Math.round(sk.mult * 100)} % Schaden · Abklingzeit ${sk.cd}s`)))) : null,
      !sk && d.wskill ? sect('Fertigkeit', h('div', { cls: 'wskill' }, h('span', { cls: 'wski' }, icon(STAT_ICON.skillDmgPct, null, 30)), h('div', {}, h('b', {}, d.wskill.name), h('div', { cls: 'sub' }, `Löst nach jedem ${c.cfg.combat.weaponSkillEvery}. Angriff aus: ${Math.round(d.wskill.mult * 100)} % Schaden im Umkreis des Ziels`)))) : null,
      sect('Verbinden', mp.next ? h('div', { cls: 'wmerge' }, h('span', {}, `${d.mergeCount}× gleiche Waffe → ${mp.next.name}`), mp.ok ? btn('Verbinden', () => go('mergeWeapon', w.uid), false, 'blue') : h('span', { cls: 'sub' }, mp.reason)) : h('div', { cls: 'sub' }, 'Endstufe dieser Reihe')),
      h('div', { cls: 'wfoot' },
        h('div', { cls: 'wcol' }, ws.unlocked > 1 && eq !== 0 ? h('div', { cls: 'wmini' }, eq > 0 ? btn('Ablegen', () => go('unequipWeapon', eq), false, 'sm') : btn('Als Nebenwaffe', () => go('equipWeapon', w.uid, free > 0 ? free : 1), false, 'sm blue')) : null,
          h('span', { cls: better ? 'badge thumbb' : '', style: 'position:relative;display:block' }, mainEq ? btn('Ablegen', () => go('unequipWeapon', 0), false, 'big') : btn('Ausrüsten', () => go('equipWeapon', w.uid, 0), false, 'big pri'))),
        h('div', { cls: 'wcol' }, cost ? h('div', { cls: 'wcost ot' }, Object.entries(cost).map(([i, n]) => h('span', { cls: econ.bal(g, i) >= n ? '' : 'miss' }, itemIcon(i, 18), `${fmt(econ.bal(g, i))}/${fmt(n)}`))) : null,
          cost ? h('button', { cls: 'b big ' + (can ? 'go' : ''), on: () => go('weaponLevelUp', w.uid, 1) }, icon('up', null, 22), t('Aufwerten')) : h('b', { cls: 'umax ot' }, 'MAX')))));
  };
  draw(); document.body.append(m);
}
P.weapons = () => {
  const g = game.g, s = game.state, ws = s.weapons, c = game.c, ns = gear.nextWeaponSlot(g);
  const main = ws.slots[0] && ws.list.find((x) => x.uid === ws.slots[0]), mainDmg = main ? prog.weaponDmg(g, main) : 0;
  const slot = (i) => {
    const w = ws.slots[i] && ws.list.find((x) => x.uid === ws.slots[i]), locked = i >= ws.unlocked, req = c.cfg.weaponSlots.find((r) => r.slot === i + 1) || {};
    return h('button', { cls: 'slot6' + (i === 0 ? ' main' : ''), style: w ? `background:${rarCol(w)}` : null, on: () => (w ? weaponSheet(w) : locked ? toast(req.quest ? 'Wird per Quest freigeschaltet.' : `Slot ${i + 1}: ab Level ${req.level}`) : toast('Wähle unten eine Waffe.')) },
      i === 0 ? h('small', {}, 'MAIN') : null, w ? [wIcon(w, 40), h('span', { cls: 'lvt ot' }, `Lv.${w.level}`)] : locked ? [icon('lock', null, 26), req.level ? h('span', { cls: 'cnt ot', style: 'position:absolute;bottom:0;font-size:.6rem' }, `Lv${req.level}`) : null] : h('span', { cls: 'plus' }, '+'));
  };
  const list = [...ws.list].sort((a, b) => c.get('weapons', b.def).rarity - c.get('weapons', a.def).rarity || b.level - a.level);
  const autoEquip = () => { const best = [...ws.list].sort((a, b) => prog.weaponDmg(g, b) - prog.weaponDmg(g, a)).slice(0, ws.unlocked); best.forEach((w, i) => game.try('equipWeapon', w.uid, i)); render(); };
  return [chips('exp', 'weapon_scroll', 'gold', 'gems'),
    h('div', { cls: 'equip' }, h('div', { cls: 'col' }, slot(0), slot(1), slot(2)),
      h('div', { cls: 'mid' }, h('div', { cls: 'power ot' }, icon('burst', '#ff8a2a', 24), fmt(game.stats.atk + mainDmg)), heroArt(c.get('heroes', s.heroes.active).look, 128), h('div', { cls: 'pedestal' }),
        btn('Held', () => open('heroes'), false, 'sm')),
      h('div', { cls: 'col' }, slot(3), slot(4), slot(5))),
    ns && !ns.quest ? row(`Slot ${ns.slot} freischalten`, h('span', {}, `Level ${ns.level} · `, costEl(ns.cost)), btn('Freischalten', () => act('unlockWeaponSlot'), false, 'go')) : null,
    h('div', { cls: 'wbar' }, h('span', { cls: betterWeapon() ? 'badge thumbb' : '', style: 'position:relative' }, btn('Ausrüsten', autoEquip, !ws.list.length, 'pri')), h('b', { cls: 'ot' }, 'Waffe'),
      h('span', { cls: anyMerge() ? 'badge' : '', style: 'position:relative' }, btn('Verbinden', () => open('fusion'), !ws.list.length, 'blue'))),
    list.length ? h('div', { cls: 'grid5' }, cap('w', list.map((w) => h('button', { cls: 'tile' + (ws.slots.includes(w.uid) ? ' eq' : ''), style: `background:${rarCol(w)}`, on: () => weaponSheet(w) }, wIcon(w, 40), h('span', { cls: 'lvt ot' }, `Lv.${w.level}`),
      w.lock ? h('span', { cls: 'lk' }, '🔒') : null, !ws.slots.includes(w.uid) && prog.weaponDmg(g, w) > mainDmg ? h('span', { cls: 'thumb' }, '▲') : null)), 40)) : h('p', { cls: 'center' }, 'Noch keine Waffen. Öffne eine Waffentruhe im Shop oder schmiede am Amboss.')];
};
P.smithy = () => {
  const g = game.g, c = game.c, tier = gear.smithyTier(g), sm = tier && c.get('smithy', tier), up = home.buildingUpgradeCost(g, 'smithy');
  if (!tier) return [h('p', { cls: 'center' }, t('Baue zuerst die Smithy in der Basis.'))];
  return [chips('orb_red', 'orb_pink', 'gold'), sec(`Schmiede Stufe ${tier}/8`, h('p', { cls: 'sub' }, 'Raten: ' + sm.rates.map((r) => `${c.get('rarities', r.rarity).name} ${r.w}%`).join(' · ') + (sm.otherW ? ` · Sonstiges ${sm.otherW}% (eigener Wert)` : '')),
    row('Schmieden', costEl({ crystal: c.cfg.craftCost[tier - 1] }), btn('x1', () => reward('Geschmiedet', act('craft', 1)), false, 'pri'), btn('x10', () => reward('Geschmiedet', act('craft', 10)), false, 'pri')),
    up ? row('Schmiede verbessern', costEl(up), btn('Upgrade', () => act('upgradeBuilding', 'smithy'), false, 'go')) : row('Endstufe erreicht', ''))];
};
const KIND_COL = { currency: '#f7b24a', key: '#f58fb0', ticket: '#cfd8e3', material: '#cfd8e3', cargo: '#b7c7d9' };
P.inv = () => {
  const s = game.state, c = game.c, ids = Object.keys(s.inv).filter((i) => s.inv[i] > 0);
  const tile = (i, n) => h('button', { cls: 'tile', style: `background:${i.startsWith('orb_') ? '#b46bff' : i.startsWith('piece:') ? '#6fb3ff' : KIND_COL[(c.by.items.get(i) || {}).kind] || '#cfd8e3'}`, on: () => toast(`${itemName(i)}: ${fmt(n)}`) }, itemIcon(i, 40), h('span', { cls: 'cnt ot' }, 'x' + fmt(n)));
  const cargo = Object.entries(s.cargo).filter(([, n]) => n > 0);
  return [ids.length ? h('div', { cls: 'grid4' }, ids.map((i) => tile(i, s.inv[i]))) : h('p', { cls: 'center' }, 'Noch leer.'),
    cargo.length ? sec(`Fracht (${home.cargoUsed(game.g)}/${game.stats.cargo})`, h('div', { cls: 'grid4' }, cargo.map(([i, n]) => tile(i, n)))) : null];
};
P.menu = () => {
  // Helden erreicht man über die Ausrüstung; Karte, Basis und Events haben eigene Knöpfe im HUD und stehen deshalb nicht noch einmal im Menü
  const items = [['quests', 'Quests', 'talk'], ['inv', 'Inventar', 'backpack'], ['smithy', 'Schmiede', 'anvil', 'craft'], ['heroes', 'Helden', 'helmet', 'heroes'], ['traits', 'Traits', 'dice', 'traits'],
    ['runes', 'Runen', 'rune', 'runes'], ['settings', 'Mehr', 'gear']];
  return [h('div', { cls: 'grid4' }, items.filter((x) => !x[3] || has(x[3])).map(([id, label, ic]) => h('button', { cls: 'tile menu', on: () => open(id) }, icon(ic, null, 40), h('span', { cls: 'ot' }, label))))];
};
P.base = () => {
  const g = game.g, s = game.state, c = game.c, remote = c.cfg.remoteBaseAccess || s.world.area === 'base';
  const b = c.t.buildings.map((d) => {
    const st = s.buildings[d.id], up = st && home.buildingUpgradeCost(g, d.id), prod = st && d.produce ? home.production(g, d.id) : 0;
    return row(`${d.name}${st ? (d.max > 1 ? ` Stufe ${st.level}/${d.max}` : ' ✓') : ''}`, st ? (d.produce ? `Produziert ${itemName(d.produce.item)}: ${prod}/${d.produce.cap}` : up ? costEl(up) : '') : costEl(d.cost),
      !st ? btn('Bauen', () => act('build', d.id), !remote, 'pri') : null, up ? btn('Upgrade', () => act('upgradeBuilding', d.id), !remote) : null, st && d.produce ? btn('Einsammeln', () => act('collectProduction', d.id), prod <= 0 || !remote) : null);
  });
  const kh = has('keyhouse') ? c.t.keyHouseSlots.map((r, i) => {
    const sl = s.keyhouse.slots[i];
    if (!sl.open) return row(`Slot ${i + 1} (Kap. ${r.chapter}) 🔒`, costEl(r.cost), btn('Freischalten', () => confirmBig(r.cost, () => act('unlockKeySlot', i)), !home.chapterReached(g, r.chapter)));
    if (!sl.chest) return row(`Slot ${i + 1} (Kap. ${r.chapter})`, 'leer');
    const left = sl.chest.readyAt - g.now(), sp = home.chestSpeedUpCost(g, i);
    return row(`Slot ${i + 1}: ${c.get('chestTypes', sl.chest.type).name}`, left > 0 ? `fällig in ${fmtTime(left)}` : 'bereit', left > 0 ? btn(`Beschleunigen (${fmtCost(sp)})`, () => act('speedUpChest', i)) : btn('Abholen', () => reward('Truhe', act('claimChest', i)), false, 'pri'));
  }) : [h('p', {}, t('ChestHouse bauen, um Feldtruhen zu lagern.'))];
  const cargo = Object.entries(s.cargo).map(([i, n]) => `${n} ${itemName(i)}`).join(', ') || 'leer';
  return [sec('Gebäude', b), sec('Key House', kh), sec('Cargo', row(`${home.cargoUsed(g)} / ${game.stats.cargo}`, cargo, btn('Abgeben', () => reward('Abgegeben', act('deliver')), s.world.area !== 'base')))];
};
// ---------------------------------------------------------------- Shop (vier Reiter wie in der Vorlage; keine Echtgeldkäufe)
const shd = (title) => h('div', { cls: 'shd ot' }, h('i', {}, '◆'), t(title), h('i', {}, '◆'));
const rarName = (r) => (RAR_H[['normal', 'fine', 'rare', 'epic', 'legendary', 'ancient', 'mythic', 'exotic'][r]] || [game.c.get('rarities', r).name])[0];
// Belohnungskachel: Symbol und Menge (Gold aus goldKills wird mit dem aktuellen Fortschritt berechnet)
function rtile(e) {
  const g = game.g, c = game.c;
  if (e.goldKills !== undefined) return h('span', { cls: 'rt' }, itemIcon('gold', 30), h('b', { cls: 'ot' }, 'x' + fmt(Math.round(e.goldKills * econ.stageGold(g)))));
  if (e.weaponPool) return h('span', { cls: 'rt', style: `background:${c.get('rarities', e.weaponPool.rarity).color}` }, icon('sword', null, 30), h('b', { cls: 'ot' }, rarName(e.weaponPool.rarity)));
  if (e.weapon) { const d = c.get('weapons', e.weapon); return h('span', { cls: 'rt', style: `background:${c.get('rarities', d.rarity).color}` }, icon(d.cls, null, 30), h('b', { cls: 'ot' }, 'Lv.1')); }
  if (e.heroPieces) return h('span', { cls: 'rt' }, icon('helmet', null, 30), h('b', { cls: 'ot' }, 'x' + e.heroPieces.n));
  if (e.flag) return h('span', { cls: 'rt' }, icon('star', null, 30), h('b', { cls: 'ot' }, 'Perk'));
  if (e.item) return h('span', { cls: 'rt', title: itemName(e.item) }, itemIcon(e.item, 30), h('b', { cls: 'ot' }, 'x' + fmt(e.n ?? e.min)));
  return h('span', { cls: 'rt' }, icon('gift', null, 30));
}
const priceEl = (price) => (Object.keys(price).length ? Object.entries(price).map(([i, n]) => h('span', { cls: 'pr' + (econ.bal(game.g, i) >= n ? '' : ' miss') }, itemIcon(i, 20), fmt(n))) : t('Gratis'));
const buySku = (sku) => confirmBig(sku.price, () => { const r = act('buy', sku.id, 1); if (r.ok) reveal(sku.name, r.value); });
// Aufdeck-Bild nach Truhen und Paketen: ein Fund groß, mehrere als Raster; "Erneut öffnen" wiederholt denselben Kauf.
function reveal(title, list, again) {
  const c = game.c, m = h('div', { cls: 'reveal' }), agg = [];
  for (const e of list || []) { const k = e.item && agg.find((x) => x.item === e.item); if (k) k.n += e.n; else agg.push({ ...e }); }
  const nameOf = (e) => (e.weapon ? c.get('weapons', e.weapon).name.replace(/\s*\(.*\)$/, '') : e.rune ? c.get('runes', e.rune).name : e.item ? itemName(e.item) : title);
  const tagOf = (e) => (e.weapon ? rarName(c.get('weapons', e.weapon).rarity) : e.item ? 'x' + fmt(e.n) : '');
  const one = agg.length === 1 ? agg[0] : null;
  m.append(h('div', { cls: 'rv' }, h('div', { cls: 'rvn ot' }, one ? nameOf(one) : t(title)), one ? h('div', { cls: 'rvtag' }, tagOf(one)) : null,
    h('div', { cls: 'rvglow' + (one ? '' : ' many') }, agg.map((e) => h('div', { cls: 'rvi' }, rtile(e), one ? null : h('small', {}, nameOf(e))))),
    again ? h('button', { cls: 'b go rvagain', on: (ev) => { ev.stopPropagation(); m.remove(); again.run(); } }, h('span', {}, t('Erneut öffnen')), h('b', { cls: 'ot' }, again.label)) : null,
    h('div', { cls: 'rvhint' }, t('Tippen zum Fortfahren'))));
  m.addEventListener('click', () => m.remove());
  document.body.append(m);
}
function openBoxUi(b, n) {
  const g = game.g, co = gear.boxCost(g, b.id, n);
  if (!co) return toast('Dafür fehlen Schlüssel oder Gems.');
  confirmBig(Object.fromEntries(Object.entries(co).map(([i, v]) => [i, v * n])), () => {
    const r = act('openBox', b.id, n), nx = gear.boxCost(g, b.id, n);
    if (r.ok) reveal(b.name, r.value, nx ? { label: Object.entries(nx).map(([i, v]) => `${fmt(v * n)} ${itemName(i)}`).join(' '), run: () => openBoxUi(b, n) } : null);
  });
}
function packCard(sku) {
  const g = game.g, i = meta.skuInfo(g, sku.id), lim = sku.limit, left = Math.max(0, i.left), sold = Number.isFinite(i.left) && left <= 0;
  const tag = !lim ? null : sku.reset === 'daily' ? `Heutige Käufe ${left}/${lim}` : sku.reset === 'weekly' ? `Wöchentliche Käufe ${left}/${lim}` : sku.reset === 'monthly' ? `Monatliche Käufe ${left}/${lim}` : lim === 1 ? 'Einmalig' : `Verbleibende Käufe ${left}/${lim}`;
  const lockTxt = sku.need || (sku.unlock && sku.unlock.cleared ? `${game.c.get('variants', game.c.get('areas', sku.unlock.cleared).boss).name} besiegen` : 'Noch gesperrt');
  return h('div', { cls: `pack hue-${sku.hue || (sku.cat === 'perks' ? 'purple' : sku.cat === 'chapter_packs' ? 'red' : 'green')}` + (i.unlocked && !sold ? '' : ' off') },
    h('div', { cls: 'pkart' }, sku.reward[0] ? rtile(sku.reward[0]).firstChild : icon('gift', null, 56)),
    h('div', { cls: 'pkbody' }, h('div', { cls: 'pkn ot' }, sku.name), tag ? h('div', { cls: 'pktag' }, tag) : null, h('div', { cls: 'pkr' }, sku.reward.map(rtile)),
      !i.unlocked ? h('div', { cls: 'pklock ot' }, icon('lock', '#fff', 18), lockTxt) : sold ? h('div', { cls: 'pklock ot' }, t('Abgeholt')) : h('button', { cls: 'b pkbuy ' + (i.affordable ? 'go' : ''), on: () => buySku(sku) }, priceEl(sku.price))));
}
function exTile(sku) {
  const i = meta.skuInfo(game.g, sku.id), free = !Object.keys(sku.price).length, sold = Number.isFinite(i.left) && i.left <= 0, e = sku.reward[0];
  if (!i.unlocked) return null;
  return h('button', { cls: 'extile' + (sold ? ' off' : '') + (free && !sold ? ' badge' : ''), 'aria-label': sku.name, on: () => (sold ? toast('Heute schon abgeholt.') : buySku(sku)) },
    h('b', { cls: 'ot' }, e.goldKills !== undefined ? fmt(Math.round(e.goldKills * econ.stageGold(game.g))) : e.item ? fmt(e.n) : sku.name), e.item || e.goldKills !== undefined ? itemIcon(e.item || 'gold', 40) : icon('star', null, 40),
    h('span', { cls: 'exp ot' }, sold ? '✓' : priceEl(sku.price)));
}
function boxCards() {
  const g = game.g;
  return game.c.t.gachaBoxes.filter((b) => !b.unlock || econ.check(g, b.unlock)).map((b) => {
    const st = gear.boxState(g, b.id), ms = gear.milestoneAt(b, st.ms), hero = /hero/.test(b.id), rune = /^rune/.test(b.id);
    return h('div', { cls: 'pack box hue-' + (hero ? 'blue' : rune ? 'green' : 'purple') }, h('div', { cls: 'pkart' }, icon(hero ? 'helmet' : rune ? 'rune' : 'chest', null, 60)),
      h('div', { cls: 'pkbody' }, h('div', { cls: 'pkn ot' }, b.name),
        b.pity ? h('div', { cls: 'pktag' }, `Garantie in ${b.pity.n - st.pity} Öffnungen`) : null, ms ? h('div', { cls: 'pktag' }, `Bonus bei ${ms} Öffnungen (${st.opens})`) : null, b.per > 1 ? h('div', { cls: 'pktag' }, `${b.per} Stück je Öffnung`) : null,
        h('div', { cls: 'pkopen' }, b.multi.map((n) => { const co = gear.boxCost(g, b.id, n) || b.costs[b.costs.length - 1], key = Object.keys(co)[0], ok = !!gear.boxCost(g, b.id, n);
          return h('button', { cls: 'b ' + (n > 1 ? 'go' : 'pri') + (ok && /^key/.test(key) ? ' badge' : ''), on: () => openBoxUi(b, n) }, h('span', {}, `${n}x öffnen`), h('span', { cls: 'pr' + (ok ? '' : ' miss') }, itemIcon(key, 18), fmt(co[key] * n))); }))));
  });
}
const SHOP_TABS = [['special', 'Spezial'], ['chests', 'Truhen'], ['recharge', 'Aufladen'], ['exchange', 'Tauschen']];
function shopBadge(id) {
  const g = game.g, c = game.c, free = (cats) => c.t.shop.some((x) => cats.includes(x.cat) && !Object.keys(x.price).length && (() => { const i = meta.skuInfo(g, x.id); return i.unlocked && i.left > 0; })());
  if (id === 'special') return free(['packs', 'stage_packs', 'chapter_packs']);
  if (id === 'chests') return c.t.gachaBoxes.some((b) => (!b.unlock || econ.check(g, b.unlock)) && b.costs.some((co) => /^key/.test(Object.keys(co)[0]) && econ.canAfford(g, co)));
  if (id === 'recharge') return free(['daily_gems', 'tickets']);
  return free(['exchange', 'materials']);
}
P.shop = () => {
  const g = game.g, c = game.c, cur = SHOP_TABS.some((x) => x[0] === tab.shop) ? tab.shop : (tab.shop = 'special'), out = [chips('gold', 'gems')];
  const skus = (cat) => c.t.shop.filter((x) => x.cat === cat), groups = (list) => [...new Set(list.map((x) => x.group || ''))];
  if (cur === 'special') {
    const pk = skus('packs');
    for (const gr of groups(pk)) out.push(shd(gr), pk.filter((x) => (x.group || '') === gr).map(packCard));
    for (const [cat, title] of [['stage_packs', 'Gebiets-Pakete'], ['chapter_packs', 'Kapitel-Pakete'], ['perks', 'Dauerhafte Vorteile']]) if (skus(cat).length) out.push(shd(title), skus(cat).map(packCard));
  } else if (cur === 'chests') out.push(shd('Truhen'), boxCards());
  else if (cur === 'recharge') {
    const gems = skus('daily_gems'), next = gems.find((x) => { const i = meta.skuInfo(g, x.id); return i.unlocked && i.left > 0; });
    out.push(shd('Tägliche Gratis-Edelsteine'), h('div', { cls: 'gemrow' }, gems.map((x) => h('span', { cls: 'gemstep' + (meta.skuInfo(g, x.id).left > 0 ? '' : ' done') }, itemIcon('gems', 30), h('b', { cls: 'ot' }, 'x' + x.reward[0].n))),
      h('button', { cls: 'b go' + (next ? ' badge' : ''), disabled: !next, on: () => next && buySku(next) }, t(next ? 'Erhalten' : 'Morgen wieder'))));
    for (const m of c.t.merchant) {
      const { def, st, unlocked } = meta.merchant(g, m.id);
      if (!unlocked) continue;
      const free = def.freeRefreshCap && econ.capLeft(g, def.freeRefreshCap) > 0;
      out.push(shd(def.name), h('div', { cls: 'exgrid' }, st.offers.map((o) => { const d = def.pool.find((x) => x.id === o.id);
        return h('button', { cls: 'extile mer' + (o.left <= 0 ? ' off' : ''), on: () => (o.left <= 0 ? toast('Ausverkauft.') : reward('Gekauft', act('buyMerchant', m.id, o.id))) }, h('b', { cls: 'ot' }, d.name), d.reward && d.reward[0] ? rtile(d.reward[0]).firstChild : icon('gift', null, 40), h('span', { cls: 'exp ot' }, o.left <= 0 ? '✓' : priceEl(d.price))); })),
        btn(`Neu mischen (${free ? 'gratis' : fmtCost(def.refreshCost)})`, () => act('refreshMerchant', m.id), false, 'go'));
    }
    const tk = skus('tickets').map(exTile).filter(Boolean);
    if (tk.length) out.push(shd('Tickets'), h('div', { cls: 'exgrid' }, tk));
  } else {
    const ex = skus('exchange');
    for (const gr of groups(ex)) out.push(shd(gr), h('div', { cls: 'exgrid' }, ex.filter((x) => x.group === gr).map(exTile)));
    const mat = skus('materials').map(exTile).filter(Boolean);
    if (mat.length) out.push(shd('Weitere Materialien'), h('div', { cls: 'exgrid' }, mat));
  }
  out.push(h('div', { cls: 'uptabs' }, SHOP_TABS.map(([id, label]) => h('button', { cls: 'utab ot' + (id === cur ? ' on' : ''), on: () => { tab.shop = id; $('pbody').scrollTop = 0; render(); } }, t(label), shopBadge(id) ? h('span', { cls: 'ubadge' }, '!') : null))));
  return out;
};
const RAR_H = { normal: ['Gewöhnlich', '#b9c6d6'], fine: ['Ausgezeichnet', '#6fcf4a'], rare: ['Selten', '#4a8fe8'], epic: ['Episch', '#a45ae0'], legendary: ['Legendär', '#f0b429'], ancient: ['Antik', '#e0564a'], mythic: ['Mythisch', '#2fb7a8'], exotic: ['Exotisch', '#f58a6a'] };
const heroCan = (d) => { const g = game.g, o = game.state.heroes.owned[d.id]; return o ? has('heroes') && o.level < 130 && gear.heroLevelCost(g, d.id, o.level + 1) <= econ.bal(g, 'evo_coin') : econ.bal(g, `piece:${d.id}`) >= d.unlockPieces; };
// Übersicht wie in der Vorlage: Effekte aller Helden (Sammlung, accountweit) und Effekte des ausgerüsteten Helden
function heroEffects() {
  const s = game.state, c = game.c, sum = {}, act = c.get('heroes', s.heroes.active), ao = s.heroes.owned[s.heroes.active];
  const stars = {};
  for (const [id, o] of Object.entries(s.heroes.owned)) { const d = c.by.heroes.get(id); if (d) stars[d.rarity] = (stars[d.rarity] || 0) + o.star; }
  if (has('heroCollection')) for (const r of c.t.heroCollection) if ((stars[r.group] || 0) >= r.need) sum[r.bonus.stat] = (sum[r.bonus.stat] || 0) + r.bonus.pct;
  const line = (k, v, plus) => h('div', { cls: 'erow' }, h('span', {}, k), h('b', { cls: v ? 'pos' : 'zero' }, `${plus && v ? '+' : ''}${v}%`));
  const lv = (ao.level - 1) * c.cfg.heroes.levelPct;
  modal('Helden-Effekte', h('div', {}, h('div', { cls: 'etitle' }, '✦ Alle Helden-Effekte ✦'), line('Angriff verstärken', sum.atk || 0), line('KP', sum.hp || 0),
    has('heroCollection') ? null : h('p', { cls: 'sub center' }, 'Die Helden-Sammlung wird später freigeschaltet.'),
    h('div', { cls: 'etitle' }, '✦ Ausrüster-Effekte ✦'), h('div', { cls: 'eq' }, h('span', { cls: 'hcard', style: `background:${RAR_H[act.rarity][1]}` }, heroArt(act.look, 54), h('span', { cls: 'lvt ot' }, `Lv.${ao.level}`)),
      h('div', { style: 'flex:1' }, line('KRAFT', act.atkPct + lv, true), line('HP', act.hpPct + lv, true), line(`Meisterschaft ${c.get('weaponClasses', act.mastery).name}`, act.masteryPct, true)))), [['Schließen', null]]);
}
P.heroes = () => {
  const g = game.g, s = game.state, c = game.c;
  const d = c.by.heroes.get(tab.hero) || c.get('heroes', s.heroes.active), o = s.heroes.owned[d.id], pc = econ.bal(g, `piece:${d.id}`), si = gear.heroStarInfo(g, d.id), rar = RAR_H[d.rarity];
  const lvPct = c.cfg.heroes.levelPct, lv = o ? o.level : 1, bonus = (lv - 1) * lvPct, sk = c.get('skills', d.skill), inTeam = s.heroes.raidTeam.includes(d.id);
  const stat = (ic, a, b) => h('div', { cls: 'hstat' }, icon(ic, null, 26), h('b', { cls: 'ot' }, a, b ? h('em', {}, ' ' + b) : null));
  const skillT = (need, ic, col, tip) => h('button', { cls: 'sktile', style: `background:${col}`, on: () => toast(tip, 3200) }, (o ? o.star : 0) >= need ? icon(ic, null, 30) : icon('lock', null, 26), h('small', {}, '★'.repeat(need)));
  const acts = [];
  if (!o) acts.push(btn(`Freischalten (${pc}/${d.unlockPieces})`, () => act('unlockHero', d.id), pc < d.unlockPieces, 'go'));
  else {
    if (s.heroes.active !== d.id) acts.push(btn('Ausrüsten', () => act('setActiveHero', d.id), false, 'pri'));
    if (has('heroEvolution')) acts.push(btn('Stern-Up', () => (si.available ? act('heroStarUp', d.id) : toast(si.reason)), !si.available, 'blue'));
    if (has('raid')) acts.push(btn(inTeam ? 'Aus Raid-Team' : 'Ins Raid-Team', () => act('setRaidTeam', inTeam ? s.heroes.raidTeam.filter((x) => x !== d.id) : [...s.heroes.raidTeam, d.id]), false, 'sm'));
    acts.push(h('button', { cls: 'b go big', disabled: !has('heroes') || o.level >= 130, on: () => act('heroLevelUp', d.id, 1) }, icon('up', null, 22), ' Verstärken', o.level < 130 ? h('small', {}, ' ', itemIcon('evo_coin', 14), gear.heroLevelCost(g, d.id, o.level + 1)) : null));
  }
  if (econ.bal(g, 'hero_select_ticket') > 0) acts.unshift(btn('Select Ticket', () => act('useSelectTicket', d.id), false, 'sm'));
  return [chips('exp', 'evo_coin', 'hero_select_ticket'),
    h('div', { cls: 'hpage' }, h('div', { cls: 'hban ot', style: `background:${rar[1]}` }, rar[0]),
      h('div', { cls: 'hfig' }, heroArt(d.look, 150, !o), h('div', { cls: 'pedestal' }), h('div', { cls: 'stars' }, [1, 2, 3, 4, 5, 6].map((k) => icon('starf', (o ? o.star : 0) >= k ? '#ffd24a' : '#3a2a1e', 24)))),
      h('div', { cls: 'hinfo' }, h('div', { cls: 'hname' }, icon(d.mastery, null, 24), h('b', { cls: 'ot' }, d.name), h('button', { cls: 'ibtn', 'aria-label': 'Helden-Effekte', on: heroEffects }, icon('info', null, 26))),
        h('div', { cls: 'hbox' }, stat('pass', `Lv.${lv}`), stat('sword', `${d.atkPct + bonus}%`, o && lv < 130 ? `+${lvPct}` : ''), stat('heart', `${d.hpPct + bonus}%`, o && lv < 130 ? `+${lvPct}` : '')),
        h('div', { cls: 'hbox' }, h('div', { cls: 'sub center' }, 'Fertigkeit'), h('div', { cls: 'skrow' }, skillT(1, 'burst', '#c9d3e6', `${sk.name}: Heldenfähigkeit, Abklingzeit ${sk.cd}s`),
          skillT(3, 'sword', '#6fcf4a', 'Ab 3 Sternen: Schaden +15 %, HP +15 %'), skillT(6, 'starf', '#4a8fe8', 'Ab 6 Sternen: Schaden +30 %, HP +30 %'))),
        h('div', { cls: 'sub' }, `Scherben ${pc}${o && has('heroEvolution') && si.available ? ` · Stern-Up: ${fmtCost(si.cost)}` : ''}`))),
    h('div', { cls: 'wbar' }, h('span', {}), h('b', { cls: 'ot' }, 'Alle Helden'), btn('Alle Effekte', heroEffects, false, 'blue')),
    h('div', { cls: 'grid4' }, c.t.heroes.map((x) => { const ox = s.heroes.owned[x.id]; return h('button', { cls: 'hcard' + (x.id === d.id ? ' sel' : '') + (heroCan(x) ? ' badge' : ''), style: `background:${RAR_H[x.rarity][1]}`, on: () => { tab.hero = x.id; render(); } },
      heroArt(x.look, 62, !ox), h('span', { cls: 'lvt ot' }, `Lv.${ox ? ox.level : 1}`), h('span', { cls: 'cls' }, icon(x.mastery, null, 18)), s.heroes.active === x.id ? h('span', { cls: 'eqt ot' }, 'Ausgerüstet') : null); })),
    h('div', { cls: 'pbar' }, h('button', { cls: 'b back', 'aria-label': 'Zurück', on: () => open('weapons') }, icon('back', null, 26)), h('div', { cls: 'btns', style: 'margin:0;justify-content:flex-end;flex:1' }, acts))];
};
// Fusionsseite: Waffe wählen -> Ergebnis, Werte vorher > nachher, benötigte Duplikate; Sammelfusion verbindet alles Mögliche
const anyMerge = () => game.state.weapons.list.some((w) => gear.mergePreview(game.g, w.uid).ok);
P.fusion = () => {
  const g = game.g, c = game.c, ws = game.state.weapons;
  const sel = ws.list.find((w) => w.uid === tab.fuse) || null, mp = sel ? gear.mergePreview(g, sel.uid) : null, d = sel && c.get('weapons', sel.def), nx = mp && mp.next;
  const tileW = (w, cls = '') => h('span', { cls: 'tile ' + cls, style: `background:${rarCol(w)}` }, wIcon(w, 40), h('span', { cls: 'lvt ot' }, `Lv.${w.level}`));
  const empty = (cls = '') => h('span', { cls: 'tile slotx ' + cls }, h('span', { cls: 'plus' }, '+'));
  const dmgAt = (def, lvl) => Math.round((def.dpsAdd + def.perLevel * lvl) * c.get('rarities', def.rarity).mult);
  const need = d ? d.mergeCount : 3, fod = mp ? mp.fodder : [];
  const mats = sel ? [tileW(sel), h('b', { cls: 'ot', style: 'font-size:1.4rem' }, '+'), ...Array.from({ length: need - 1 }, (_, k) => (fod[k] ? tileW(fod[k]) : empty()))] : [empty()];
  const list = ws.list.filter((w) => c.get('weapons', w.def).next).sort((a, b) => (gear.mergePreview(g, b.uid).ok ? 1 : 0) - (gear.mergePreview(g, a.uid).ok ? 1 : 0) || c.get('weapons', b.def).rarity - c.get('weapons', a.def).rarity);
  return [chips('gems', 'weapon_scroll', 'gold'),
    h('div', { cls: 'forge' }, h('div', { cls: 'fres' }, nx ? h('span', { cls: 'tile big', style: `background:${c.get('rarities', nx.rarity).color}` }, icon(nx.cls, null, 54), h('span', { cls: 'lvt ot' }, `Lv.${Math.max(sel.level, ...fod.map((x) => x.level))}`)) : empty('big'),
        nx ? h('div', { cls: 'fcard' }, h('div', { cls: 'hban ot', style: `background:${c.get('rarities', nx.rarity).color};position:static;transform:none;margin:-14px auto 4px;font-size:.7rem` }, c.get('rarities', nx.rarity).name),
          h('b', {}, nx.name), h('div', { cls: 'ot' }, 'SCHADEN: ', dmgAt(d, sel.level), h('em', {}, ' > ' + dmgAt(nx, sel.level))), h('div', { cls: 'ot' }, 'MAX. LEVEL: ', c.get('rarities', d.rarity).maxLevel, h('em', {}, ' > ' + c.get('rarities', nx.rarity).maxLevel)),
          Object.keys(mp.cost || {}).length ? h('div', { cls: 'sub' }, 'Kosten: ', costEl(mp.cost)) : null, mp.ok ? null : h('div', { cls: 'sub', style: 'color:#b3382b' }, mp.reason)) : sel ? h('div', { cls: 'fcard' }, h('b', {}, d.name), h('div', { cls: 'sub' }, 'Endstufe dieser Reihe')) : h('div', { cls: 'fcard' }, h('div', { cls: 'sub' }, 'Wähle unten eine Waffe. Drei gleiche ergeben die nächste Stufe.'))),
      h('div', { cls: 'farrow' }, icon('up', null, 30)), h('div', { cls: 'fmats' }, mats),
      sel ? btn('Verbessern', () => { const r = act('mergeWeapon', sel.uid); if (r.ok) toast(`Neu: ${c.get('weapons', r.value.def).name}`, 2600); }, !mp.ok, 'go') : null),
    h('div', { cls: 'wbar' }, h('button', { cls: 'b back', 'aria-label': 'Zurück', on: () => open('weapons') }, icon('back', null, 22)), h('b', { cls: 'ot' }, 'Auswählen'), btn('Sammelfusion', () => { const r = act('mergeAll'); if (r.ok) toast(`${r.value} Verbindungen`); }, !anyMerge(), 'pri')),
    list.length ? h('div', { cls: 'grid5' }, cap('f', list.map((w) => h('button', { cls: 'tile' + (sel && w.uid === sel.uid ? ' eq' : ''), style: `background:${rarCol(w)};${gear.mergePreview(g, w.uid).ok ? '' : 'filter:brightness(.6)'}`, on: () => { tab.fuse = w.uid; render(); } }, wIcon(w, 40), h('span', { cls: 'lvt ot' }, `Lv.${w.level}`),
      ws.slots.includes(w.uid) ? h('span', { cls: 'cnt ot' }, 'E') : null)), 40)) : h('p', { cls: 'center' }, 'Keine Waffen zum Verbinden.')];
};
P.traits = () => {
  const g = game.g, s = game.state, c = game.c, pr = s.traits.presets[s.traits.active], rc = gear.traitRollCost(g);
  return [h('div', { cls: 'tabs' }, s.traits.presets.map((_, i) => h('button', { cls: 'tab' + (s.traits.active === i ? ' on' : ''), on: () => act('setTraitPreset', i) }, `Preset ${i + 1}`))),
    sec('Slots', pr.slots.map((sl, i) => { if (!sl) return row(`Slot ${i + 1}`, 'leer'); const o = c.get('traitOptions', sl.opt), q = c.get('traitQualities', sl.q); return row(`${sl.lock ? '🔒 ' : ''}${o.name} [${sl.q}]`, `${sn(o.stat)} +${(o.base * q.mult).toFixed(1)} · Synergie ${o.group}`, btn(sl.lock ? 'Entsperren' : 'Sperren', () => act('toggleTraitLock', i))); }),
      row('Neu rollen', h('span', {}, costEl(rc.cost), ` · ${rc.locks} gesperrt, ${rc.free} werden neu gerollt`), btn('Rollen', () => act('rollTraits'), rc.free <= 0, 'pri'))),
    sec('Synergien', c.t.synergies.map((sy) => { const n = pr.slots.filter((x) => x && c.get('traitOptions', x.opt).group === sy.group).length; return row(`${sy.name}: ${n} Slots`, sy.tiers.map((x) => `${x.n}: ${sn(x.stat)} +${x.v}`).join(' · ')); }), upgradeRows('synergy'))];
};
P.runes = () => {
  const g = game.g, s = game.state, c = game.c, hero = s.heroes.active, lo = s.runes.loadouts[hero] || [], nSlots = gear.runeSlots(g);
  const nm = (r) => { const d = c.get('runes', r.def); return `${d.name} L${r.level}`; };
  const flt = tab.rt || 'all', list = s.runes.list.filter((r) => flt === 'all' || c.get('runes', r.def).type === flt).sort((a, b) => c.get('runes', b.def).rarity - c.get('runes', a.def).rarity);
  const junk = s.runes.list.filter((r) => c.get('runes', r.def).rarity <= 2 && !r.lock && !gear.runeEquippedBy(g, r.uid).length);
  return [h('p', { cls: 'sub' }, `Rune Dust ${fmt(econ.bal(g, 'rune_dust'))} · BlueStone ${fmt(econ.bal(g, 'bluestone'))} · Loadout für ${c.get('heroes', hero).name}`),
    sec('Slots', c.cfg.runes.slotLevels.map((lv, i) => { const r = lo[i] && s.runes.list.find((x) => x.uid === lo[i]); return row(`Slot ${i + 1}: ${i >= nSlots ? `🔒 Level ${lv}` : r ? nm(r) : '—'}`, '', r ? btn('Ablegen', () => act('unequipRune', i)) : null); })),
    sec(`Inventar (${s.runes.list.length})`, h('div', { cls: 'tabs' }, ['all', 'hero', 'melee', 'ranged', 'universal'].map((id) => h('button', { cls: 'tab' + (flt === id ? ' on' : ''), on: () => { tab.rt = id; render(); } }, id))),
      btn(`Alle freien Runen ≤ Fine zerlegen (${junk.length})`, () => { const r = act('dismantleRunes', junk.map((x) => x.uid)); if (r.ok) toast(`+${r.value} Rune Dust`); }, !junk.length),
      cap('r', list.map((r) => {
        const d = c.get('runes', r.def), mx = c.get('runeGrades', d.rarity).maxLevel, eq = gear.runeEquippedBy(g, r.uid).length > 0, free = Math.max(0, lo.findIndex((u, i) => i < nSlots && !u));
        return row(`${r.lock ? '🔒 ' : ''}${nm(r)}/${mx}${eq ? ' · ausgerüstet' : ''}`, h('span', {}, `${sn(d.stat)} +${(d.base + d.perLevel * (r.level - 1)).toFixed(1)}${d.pct ? '%' : ''} · `, r.level < mx ? costEl(gear.runeLevelCost(g, r, r.level + 1)) : 'MAX'),
          btn('Anlegen', () => act('equipRune', r.uid, lo.length ? free : 0), eq), btn('+1', () => act('runeLevelUp', r.uid, 1), r.level >= mx), btn(r.lock ? '🔓' : '🔒', () => act('toggleRuneLock', r.uid)),
          btn('Zerlegen', () => { const go = (cf) => { const x = act('dismantleRunes', [r.uid], cf); if (x.ok) toast(`+${x.value} Rune Dust`); }; if (eq || r.lock) modal('Zerlegen bestätigen', 'Diese Rune ist ausgerüstet oder gesperrt.', [['Abbrechen', null], ['Zerlegen', () => go(true), 'warn']]); else go(false); }));
      })))];
};
P.modes = () => {
  const g = game.g, s = game.state, c = game.c, ms = s.modes, out = [];
  const mp = c.cfg.multiplayer, list = [['tower', 'Tower'], ['raid', 'Boss Raid'], ['tomb', 'Tomb'], ['pvp', 'PvP'], ['invasion', 'Invasion']].filter((m) => has(m[0]) && (mp || (m[0] !== 'pvp' && m[0] !== 'invasion')));
  if (!list.length) return [h('p', {}, t('Modi werden über die Questreihe freigeschaltet.'))];
  if (!tab.modeOpen || !list.find((m) => m[0] === tab.mode)) {
    const info = { tower: ['linear-gradient(#8f6be0,#5b3bb0)', 'tower', `Etage ${Math.min(250, ms.tower.best + 1)}`, 'ticket_tower'], invasion: ['linear-gradient(#5db8ff,#2f7fc0)', 'home', `${c.get('invasionTiers', ms.invasion.tier).name} · ${ms.invasion.rating}`, 'ticket_invasion'],
      raid: ['linear-gradient(#e0703a,#8a2f1c)', 'skull', modes.raidBossOfDay(g).name, 'ticket_raid'], tomb: ['linear-gradient(#5a6b9a,#2f3a5c)', 'rune', `Stufe ${Math.min(20, ms.tomb.best + 1)}`, 'ticket_tomb'], pvp: ['linear-gradient(#f0c14b,#b9822a)', 'sword', `Rating ${ms.pvp.rating}`, 'ticket_pvp'] };
    const names = { tower: 'Turm der Herausforderung', invasion: 'Invasionsportal', raid: 'Boss-Raid', tomb: 'Heldengrab', pvp: 'Arena' };
    return [...out, ...list.map(([id]) => h('button', { cls: 'mcard', style: `background:${info[id][0]}`, on: () => { tab.mode = id; tab.modeOpen = true; render(); } }, h('b', { cls: 'ot' }, names[id]),
      h('span', { cls: 'st ot' }, icon(info[id][1], null, 20), info[id][2]), h('br'), h('span', { cls: 'st ot' }, itemIcon(info[id][3], 20), econ.bal(g, info[id][3])), h('span', { cls: 'art' }, icon(info[id][1], null, 76))))];
  }
  out.push(btn('‹ Alle Herausforderungen', () => { tab.modeOpen = false; render(); }, false, 'sm'));
  const start = (mode, param) => { const r = act('startMode', mode, param); if (r.ok) close(); };
  if (ms.session) out.push(row(`Laufende Runde: ${ms.session.mode} ${ms.session.param}`, 'Fortsetzen kostet kein weiteres Ticket.', btn('Fortsetzen', () => start(ms.session.mode, ms.session.param), false, 'pri'), btn('Abbrechen', () => act('abortMode'), false, 'warn')));
  if (tab.mode === 'tower') {
    const next = Math.min(250, ms.tower.best + 1), f = c.get('towerFloors', next);
    out.push(h('p', { cls: 'sub' }, `Höchste Etage ${ms.tower.best}/250 · Tickets ${econ.bal(g, 'ticket_tower')} · Zeitlimit ${c.cfg.tower.timerSec}s`),
      ms.tower.best < 250 ? row(`Etage ${next} (Gegner L${f.level})`, `Erstabschluss: ${fmtReward(f.first)}`, btn('Start', () => start('tower', next), false, 'pri')) : null,
      ms.tower.best > 0 ? row(`Etage ${ms.tower.best} wiederholen`, `Wiederholung: ${fmtReward(c.get('towerFloors', ms.tower.best).repeat)}`, btn('Start', () => start('tower', ms.tower.best))) : null);
  } else if (tab.mode === 'raid') {
    const b = modes.raidBossOfDay(g);
    out.push(h('p', { cls: 'sub' }, `Tickets ${econ.bal(g, 'ticket_raid')} · Team: ${s.heroes.raidTeam.map((id) => c.get('heroes', id).name).join(' → ')} (im Helden-Menü änderbar)`),
      row(`${b.name} (L${b.level}) – Boss des Tages`, `Bestwert ${fmt(ms.raid.best[b.id] || 0)} Schaden · Stufen: ${b.tiers.map((x) => x.pct + '%').join(' / ')} der Boss-HP`, btn('Start', () => start('raid', b.id), false, 'pri')),
      b.tiers.map((x) => row(`ab ${x.pct}%`, fmtReward(x.reward))));
  } else if (tab.mode === 'tomb') {
    const next = Math.min(20, ms.tomb.best + 1);
    out.push(h('p', { cls: 'sub' }, `Tickets ${econ.bal(g, 'ticket_tomb')} · höchste Stufe ${ms.tomb.best}/20`),
      [...new Set([next, ms.tomb.best].filter((x) => x > 0))].map((ti) => { const d = c.get('tombTiers', ti); return row(`Stufe ${ti} (Gegner L${d.level})`, `${d.drops.count} Runen + ${d.drops.dust} Rune Dust`, btn('Start', () => start('tomb', ti), false, ti === next ? 'pri' : '')); }));
  } else {
    const mode = tab.mode, st = ms[mode], fightRes = (r) => { if (r.ok) modal(r.value.win ? 'Sieg' : 'Niederlage', `Gegner: ${r.value.opp} (Bot) · eigene HP ${r.value.hpPct}% · Rating ${r.value.delta >= 0 ? '+' : ''}${r.value.delta}${r.value.rewards.length ? ' · ' + fmtReward(r.value.rewards) : ''}`); };
    out.push(h('p', { cls: 'sub' }, `Rating ${st.rating} · Tickets ${econ.bal(g, 'ticket_' + mode)}${mode === 'invasion' ? ` · Tier ${c.get('invasionTiers', st.tier).name} · Serie ${st.streak} · Saison ${st.season}` : ` · Siege ${st.wins} · Belohnungen heute ${econ.capLeft(g, 'pvpReward')}`}`));
    if (mode === 'invasion') {
      out.push(row(`Coin Bank: ${modes.bankAmount(g)} / ${c.cfg.invasion.bankCap}`, `+${c.cfg.invasion.bankPerHour}/h · Bots können bis zu ${c.cfg.invasion.stealPct}% rauben`, btn('Einsammeln', () => act('collectBank'))),
        row('Verteidigung', st.defense ? `Snapshot ATK ${fmt(st.defense.atk)} / HP ${fmt(st.defense.hp)}` : 'noch nicht gesetzt', btn('Aktuellen Build setzen', () => act('setDefense'))),
        st.revenge.map((b, i) => row(`Vergeltung: ${b.name}`, `${b.stolen} Coins zurückholen (kein Ticket)`, btn('Angreifen', () => fightRes(act('fight', 'invasion', null, { revenge: i })), false, 'warn'))));
    }
    out.push(sec('Gegner (Bots, klar gekennzeichnet)', modes.opponents(g, mode).map((b) => row(b.name, `Rating ${b.rating}`, btn('Kampf', () => fightRes(act('fight', mode, b.id)), false, 'pri'), mode === 'invasion' ? btn('Auto', () => fightRes(act('fight', mode, b.id, { auto: true }))) : null))));
    if (mode === 'invasion') out.push(sec('Verlauf', st.history.slice(0, 8).map((x) => row(`${x.type}: ${x.opp}`, `${x.win ? 'Sieg' : 'Niederlage'}${x.stolen ? ` · ${x.stolen} Coins geraubt` : ''}`))), trackView('invasionpass'));
    if (net && net.online()) out.push(sec('Online-Rangliste (eigenes Backend)', h('div', { id: 'lb' }, btn('Laden', async () => { const r = await net.leaderboard(mode === 'pvp' ? 'tower' : 'invasion'); $('lb').replaceChildren(...(r || []).map((x, i) => row(`${i + 1}. ${x.name}`, `Wert ${x.score}`))); }))));
  }
  return out;
};
function trackView(id) {
  const g = game.g, def = econ.trackDef(g, id), ts = econ.trackActive(g, def);
  if (!ts) return null;
  const order = { ready: 0, open: 1, expired: 2, claimed: 3 };
  const all = def.nodes.map((n) => ({ n, st: econ.nodeState(g, def, n, ts) })), nodes = all.filter((x) => !x.n.milestone).sort((a, b) => order[a.st] - order[b.st]), ms = all.filter((x) => x.n.milestone);
  const ready = all.filter((x) => x.st === 'ready').length, claim = (n) => reward(n.name, act('claimNode', id, n.id));
  const first = (rw) => (rw.find((e) => e.item) || {}).item;
  return h('section', {}, h('h3', {}, `${def.name} (${all.filter((x) => x.st === 'claimed').length}/${all.length})`),
    def.reset ? h('div', { cls: 'center' }, h('span', { cls: 'timer ot' }, '⏱ ', def.reset === 'weekly' ? 'Woche' : fmtTime((game.state.period.day + 1) * 86400000 - g.now()))) : null,
    ms.length ? h('div', { cls: 'track' }, ms.map(({ n, st }) => h('button', { cls: 'tp ot' + (st === 'claimed' ? ' got' : ''), style: 'background:none;border:0;padding:0', on: () => (st === 'ready' ? claim(n) : toast(`${n.name}: ${fmtReward(n.reward)}`)) }, icon(st === 'ready' ? 'gift' : 'chest', null, 34), n.cond.gte ?? ''))) : null,
    ready > 1 ? btn(`Alle annehmen (${ready})`, () => reward(def.name, act('claimAll', id)), false, 'go') : null,
    cap('t' + id, nodes.map(({ n, st }) => {
      const [a, b] = econ.progress(g, n.cond, { track: ts }), pts = n.reward.find((e) => e.points), it = first(n.reward);
      return h('div', { cls: 'mrow' + (st === 'claimed' ? ' done' : '') }, h('div', { cls: 'mi' }, pts ? icon('star', null, 34) : it ? itemIcon(it, 34) : icon('gift', null, 34), pts ? h('span', { cls: 'cnt ot' }, pts.n) : null),
        h('div', { cls: 'mm' }, h('div', { cls: 'mn' }, n.name), h('div', { cls: 'bar' }, h('i', { style: `width:${Math.min(100, (100 * a) / b)}%` }), h('span', { cls: 'ot' }, `${fmt(Math.min(a, b))}/${fmt(b)}`)),
          h('div', { cls: 'mr' }, fmtReward(n.reward.filter((e) => !e.points)) + (n.bonusMult ? ` x${n.bonusMult}` : ''))),
        h('div', { cls: 'mb' }, st === 'claimed' ? '✓' : st === 'expired' ? 'vorbei' : btn('Annehmen', () => claim(n), st !== 'ready', 'go')));
    }), 12));
}
// Gruppen des Events-Fensters; nur Gruppen mit Inhalt werden gezeigt, Gruppen mit abholbaren Belohnungen tragen ein "!".
function eventGroups() {
  const g = game.g, defs = [['missions', 'Missionen', ['daily', 'weekly']], ['level', 'Level', ['levelup']], ['login', 'Login', ['login']], ['events', 'Events', ['sevenDay', 'carnival', ...(game.c.t.events || []).map((e) => e.track.id)]],
    ['pass', 'Pässe', ['battlepass', 'chapterpass_1', 'chapterpass_2', 'chapterpass_3']], ['codex', 'Codex', ['codex']]];
  const out = [];
  for (const [id, label, ids] of defs) {
    let active = false, ready = false;
    for (const tid of ids) { const d = econ.trackDef(g, tid), ts = econ.trackActive(g, d); if (!ts) continue; active = true; if (d.nodes.some((n) => econ.nodeState(g, d, n, ts) === 'ready')) ready = true; }
    if (active) out.push([id, label, ready, ids]);
  }
  out.push(['spin', 'Glücksrad', has('spin') && econ.capLeft(g, 'freeSpin') > 0, []]);
  return out;
}
const SEG_COL = ['#f5a524', '#4aa8e8', '#e5503f', '#8f5ad9', '#5fd04a', '#ef5fd0', '#3fb7a8', '#ffd24a'];
let wheelRot = 0, spinning = false;
function wheel() {
  const g = game.g, seg = meta.spinSegment(g), n = seg.rows.length, step = 360 / n, free = econ.capLeft(g, 'freeSpin') > 0;
  const grad = seg.rows.map((_, i) => `${SEG_COL[i % SEG_COL.length]} ${i * step}deg ${(i + 1) * step}deg`).join(',');
  const wh = h('div', { cls: 'wheel', style: `background:conic-gradient(${grad});transform:rotate(${wheelRot}deg)` }, seg.rows.map((r, i) => h('div', { cls: 'seg', style: `transform:rotate(${(i + 0.5) * step}deg)` },
    h('div', { cls: 'ot' }, itemIcon(r.item, 30), r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`))));
  const box = h('div', { cls: 'wheelbox' }, h('div', { cls: 'pin' }), wh);
  const done = (res) => { spinning = false; modal('Glücksrad', h('div', { cls: 'center' }, fmtReward(res.got))); render(); };
  const go = () => {
    if (spinning) { wh.style.transition = 'none'; return; } // Tippen während der Drehung überspringt sie; das Ergebnis steht bereits fest
    const r = game.try('spin');
    if (!r.ok) return toast(r.error);
    spinning = true;
    const target = 360 - (r.value.index + 0.5) * step, cur = ((wheelRot % 360) + 360) % 360;
    wheelRot += 360 * 5 + ((target - cur + 360) % 360);
    let fin = false; const end = () => { if (fin) return; fin = true; done(r.value); };
    wh.addEventListener('transitionend', end, { once: true }); setTimeout(end, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 3400);
    requestAnimationFrame(() => { wh.style.transform = `rotate(${wheelRot}deg)`; });
  };
  box.append(h('button', { cls: 'b pri hub', on: go }, free ? 'Gratis drehen' : 'Drehen'));
  wh.addEventListener('click', () => { if (spinning) { wh.style.transition = 'none'; wh.style.transform = `rotate(${wheelRot}deg)`; } });
  return [box, h('p', { cls: 'sub center' }, free ? 'Heute ist eine Gratis-Drehung frei.' : `Weitere Drehung: ${fmtCost(game.c.cfg.spin.spinCost)} (du hast ${econ.bal(g, 'spin_ticket')})`)];
}
P.events = () => {
  const groups = eventGroups(), out = [tabs('ev', groups.map((x) => [x[0], x[1], x[2]]))], gsel = groups.find((x) => x[0] === tab.ev);
  if (tab.ev === 'spin') {
    out.push(has('spin') ? wheel() : h('p', { cls: 'center' }, t('Das Glücksrad wird mit Level 8 freigeschaltet.')));
  } else out.push(gsel[3].map(trackView).filter(Boolean));
  return out;
};
P.map = () => {
  const g = game.g, s = game.state, c = game.c, w = game.field, cur = c.by.areas.get(s.world.area), ch = cur ? cur.chapter : 1, list = c.t.areas.filter((a) => a.chapter === ch);
  const names = { 1: 'Verlorene Zuflucht', 2: 'Gefallene Königreiche', 3: 'Besetzte Stadt' };
  const stages = [];
  list.forEach((a, k) => { if (k) stages.push(h('div', { cls: 'stline' + (s.world.cleared[list[k - 1].id] ? ' ok' : '') })); stages.push(h('div', { cls: 'stage ot ' + (s.world.cleared[a.id] ? 'ok' : game.canEnter(a.id) ? 'cur' : ''), title: a.name }, s.world.cleared[a.id] ? '✓' : k + 1)); });
  let big = null;
  if (w.map.kind === 'world') {
    // Übersichtskarte direkt aus dem Begehbarkeitsraster (Gebiete farbig, unentdeckte Teile abgedunkelt statt schwarz)
    const G = w.G, W = G.world, k = 4, small = h('canvas', { width: G.cols, height: G.rows }), sx = small.getContext('2d'), img = sx.createImageData(G.cols, G.rows), fog = s.world.fog[w.map.id] || {};
    for (let i = 0; i < G.kind.length; i++) {
      const kd = G.kind[i], bm = BIOMES[(W.zones[G.zone[i] >= 0 ? G.zone[i] : G.near[i]] || W.zones[0]).biome], col = kd === 1 ? hex(bm.floor[0]) : kd === 0 ? hex(bm.side).map((v) => v * 0.55) : hex(kd === 3 ? WCOL.lava : WCOL.water);
      const r = (i / G.cols) | 0, cc = i % G.cols; let seen = false;
      for (let dr = -3; dr <= 3 && !seen; dr++) for (let dc = -3; dc <= 3 && !seen; dc++) if (fog[(r + dr) * G.cols + cc + dc]) seen = true;
      const f = seen ? 1 : 0.6; img.data.set([col[0] * 255 * f, col[1] * 255 * f, col[2] * 255 * f, 255], i * 4);
    }
    sx.putImageData(img, 0, 0);
    const x = (big = h('canvas', { cls: 'bigmap', width: G.cols * k, height: G.rows * k })).getContext('2d');
    x.imageSmoothingEnabled = false; x.drawImage(small, 0, 0, G.cols * k, G.rows * k);
    x.font = '900 13px system-ui'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#33221a';
    for (const e of w.enemies) if (e.gid && e.v.rank === 'boss') { const px = (e.hx / G.w) * G.cols * k, py = (e.hy / G.h) * G.rows * k; x.fillStyle = e.alive ? '#ff4a4a' : '#888'; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill(); x.stroke(); x.strokeText(`Lv.${e.v.level}`, px, py - 9); x.fillStyle = '#fff'; x.fillText(`Lv.${e.v.level}`, px, py - 9); }
    x.fillStyle = '#4fc3f7'; x.beginPath(); x.arc((w.p.x / G.w) * G.cols * k, (w.p.y / G.h) * G.rows * k, 6, 0, 7); x.fill(); x.stroke();
  }
  return [h('div', { cls: 'hq ot' }, h('span', { style: 'color:#ffd24a' }, `Kapitel ${ch}`), h('br'), names[ch] || ''), h('div', { cls: 'stages' }, stages), big,
    has('portal') ? sec('Portal', c.t.areas.filter((a) => game.canEnter(a.id) || a.chapter === ch).map((a) => row(`${a.chapter}.${a.id.split('_')[1]} ${a.name}${s.world.cleared[a.id] ? ' ✓' : ''}`, `Boss: ${c.get('variants', a.boss).name} Lv.${c.get('variants', a.boss).level}`,
      btn('Reisen', () => { if (act('portal', a.id).ok) close(); }, !game.canEnter(a.id) || s.world.area === a.id, 'go')))) : h('p', { cls: 'sub center' }, 'Baue das Portal in der Basis, um zwischen Gebieten zu reisen.'), trackView('minimap')];
};
P.settings = () => {
  const s = game.state, g = game.g;
  const tog = (k, label) => row(label, '', btn(s.settings[k] ? 'An' : 'Aus', () => act('setSetting', k, !s.settings[k])));
  const gemTot = Object.entries(s.totals.gems || {}).sort((a, b) => b[1] - a[1]);
  return [sec('Einstellungen', row('Auto-Jagd: Ziel', s.settings.autoMode === 'near' ? 'Greift den nächsten Gegner im Gebiet an' : 'Jagt die Gegner der aktuellen Quest, sonst den nächsten', btn(s.settings.autoMode === 'near' ? 'Nächster Gegner' : 'Quest', () => act('setSetting', 'autoMode', s.settings.autoMode === 'near' ? 'quest' : 'near'))), tog('autoBoss', 'Auto-Jagd greift Bosse an'), tog('autoReturn', 'Auto-Jagd: bei voller Fracht heimkehren'), tog('dmgNumbers', 'Schadenszahlen'), tog('reducedFx', 'Reduzierte Effekte'), tog('colorblind', 'Farbblind-Modus (Labels statt Farbe)'),
    row('Schriftgröße', `${Math.round(s.settings.textScale * 100)}%`, btn('−', () => act('setSetting', 'textScale', Math.max(0.8, s.settings.textScale - 0.1))), btn('+', () => act('setSetting', 'textScale', Math.min(1.5, s.settings.textScale + 0.1))))),
  sec('App', row('Nach Updates suchen', 'Lädt die neueste signierte APK, Spielstand bleibt erhalten', btn('Prüfen', async () => { const r = await window.__checkUpdate(true); if (r.status === 'current') toast(`Aktuell (${r.current})`); else if (r.status === 'offline') toast('Keine Verbindung'); else if (r.status === 'none') toast('Es ist noch keine Version veröffentlicht.'); else if (r.status === 'dev') toast('Entwicklungsversion – Updates gibt es nur in der installierten App.'); else if (r.status === 'error') toast(r.error); }))),
  sec('Spielstand', row(`Profil ${s.profileId}`, `Content ${game.c.version} · Revision ${s.sync.rev}`, btn('Exportieren', () => net.exportSave()), btn('Importieren', () => net.importSave())),
    net ? row('Eigenes Backend (optional)', net.status(), btn('Verbinden/Sync', async () => { toast(await net.sync()); render(); })) : null),
  sec('Gem-Ledger (Summen je Kanal)', gemTot.map(([src, n]) => row(src, '', h('span', { cls: n < 0 ? 'cost miss' : 'cost' }, (n > 0 ? '+' : '') + fmt(n))))),
  sec('Letzte Buchungen', s.ledger.slice(-15).reverse().map((x) => row(`${x.d > 0 ? '+' : ''}${fmt(x.d)} ${itemName(x.item)}`, `${x.src} ${x.ref || ''} · #${x.id}`))),
  h('p', { cls: 'sub' }, `XP-Quellen: ${Object.entries(s.totals['#xp'] || {}).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ') || '—'} · Tagesreset 00:00 UTC, nächster in ${fmtTime((s.period.day + 1) * 86400000 - g.now())}`)];
};

const TITLES = { quests: 'Quests', hero: 'Upgrades', weapons: 'Ausrüstung', base: 'Basis', shop: 'Shop', heroes: 'Helden', traits: 'Traits', runes: 'Runen', modes: 'Herausforderungen', events: 'Events', map: 'Karte', settings: 'Mehr',
  inv: 'Inventar', smithy: 'Schmiede', menu: 'Menü', fusion: 'Waffen verbessern' };
const BAR = [['hero', 'up', ['abilities']], ['weapons', 'sword', ['weaponVault']], ['craft', 'anvil', ['craft']], ['modes', 'tower', ['tower', 'raid', 'tomb', 'pvp', 'invasion']], ['shop', 'shop', ['shop']]];
export function open(id) { cur = id; render(); }
export function close() { cur = null; $('panel').hidden = true; drawNav(); }
export function render() {
  if (!cur) return;
  const body = $('pbody'), y = body.scrollTop;
  $('ptitle').textContent = t(TITLES[cur] || cur);
  body.replaceChildren(...P[cur]().flat(3).filter(Boolean));
  $('panel').hidden = false; body.scrollTop = y;
  drawNav();
}
function drawNav() {
  const g = game.g, tier = gear.smithyTier(g), cost = tier ? game.c.cfg.craftCost[tier - 1] : 0;
  const n = notices(), key = BAR.map(([, , f]) => (f.some(has) ? 1 : 0)).join('') + cur + tier + (econ.bal(g, 'crystal') >= cost) + [n.merge, n.better, n.modes, n.shop].join();
  if (drawNav.key === key) return;
  drawNav.key = key;
  $('nav').replaceChildren(...BAR.map(([id, ic, f]) => {
    const ok = f.some(has), locked = () => toast('Noch nicht freigeschaltet – folge den Quests.');
    if (id === 'craft') return h('button', { cls: 'nb craft' + (ok ? '' : ' locked'), 'aria-label': 'Schmieden', on: () => (!ok ? locked() : !tier ? toast('Baue zuerst die Smithy in der Basis.') : reward('Geschmiedet', act('craft', 1))) },
      tier ? h('span', { cls: 'tier ot' }, tier) : null, icon(ic, null, 38), h('span', { cls: 'info ot' }, 'x1', h('small', { cls: econ.bal(g, 'crystal') >= cost ? '' : 'cost miss' }, tier ? [itemIcon('crystal', 13), fmt(cost)] : '—')));
    const mark = ok && ((id === 'modes' && n.modes) || (id === 'shop' && n.shop));
    return h('button', { cls: 'nb' + (cur === id ? ' on' : '') + (ok ? '' : ' locked') + (mark ? ' badge' : ''), 'aria-label': TITLES[id], on: () => (!ok ? locked() : cur === id ? close() : open(id)) }, icon(ic, null, 36),
      id === 'weapons' && ok && n.better ? h('span', { cls: 'thumb' }, icon('thumb', null, 14)) : null,
      id === 'weapons' && ok && n.merge ? h('span', { cls: 'bubble ot', on: (e) => { e.stopPropagation(); open('fusion'); } }, 'Verbinden') : null);
  }));
}

// ---------------------------------------------------------------- HUD (aus dem Zustand abgeleitet, gebündelt 5x/s)
let notes = { t: 0 };
function notices() {
  const now = Date.now();
  if (now - notes.t < 1000) return notes;
  const g = game.g, s = game.state, ready = eventGroups().filter((x) => x[2]).map((x) => x[0]);
  // Jedes "!" führt genau dorthin, wo etwas abzuholen ist: Missionen-Knopf -> Missionen, Stern-Knopf -> erste andere Gruppe mit Belohnung
  notes = { t: now, missions: ready.includes('missions'), passTab: ready.find((x) => x !== 'missions') || null, chest: s.keyhouse.slots.some((x) => x.chest && g.now() >= x.chest.readyAt),
    merge: has('weaponVault') && anyMerge(), better: has('weaponVault') && betterWeapon(), modes: ['tower', 'raid', 'tomb'].some((m) => has(m) && econ.bal(g, 'ticket_' + m) > 0),
    shop: has('shop') && game.c.t.shop.some((x) => x.gemClaim && meta.skuInfo(g, x.id).left > 0) };
  return notes;
}
export function hud() {
  const g = game.g, s = game.state, w = game.world, st = game.stats, p = s.player;
  const need = prog.xpNeed(g, Math.min(p.level, game.c.t.playerLevels.length));
  $('lv').textContent = p.level; $('xpf').style.width = `${Math.min(100, (100 * p.xp) / need)}%`; $('xpt').textContent = `${fmt(p.xp)}/${fmt(need)}`;
  $('c_gold').textContent = fmt(econ.bal(g, 'gold')); $('c_gems').textContent = fmt(econ.bal(g, 'gems')); $('c_third').textContent = fmt(econ.bal(g, 'crystal'));
  const used = home.cargoUsed(g);
  $('cargo').textContent = w.mode ? `${w.mode.kind.toUpperCase()} · Welle ${w.wave + 1}/${w.mode.waves.length} · ${Math.ceil(w.timer)}s` : `FRACHT (${fmt(used)}/${fmt(st.cargo)})`;
  $('cargo').style.setProperty('--p', w.mode ? '0%' : `${Math.min(100, (100 * used) / Math.max(1, st.cargo))}%`);
  $('cargo').className = 'ot' + (!w.mode && used >= st.cargo ? ' full' : '');
  // Quest-Karten (bis zu zwei): Hauptquest zuerst, dann ein NPC-Auftrag
  const qs = w.mode ? [] : meta.currentQuests(g), show = [qs.find((q) => !q.q.giver), qs.find((q) => q.q.giver)].filter(Boolean);
  const key = show.map((q) => q.q.id + q.state + q.obj.map((o) => o.cur).join()).join('|');
  if (hud.qkey !== key) {
    hud.qkey = key;
    $('quests').replaceChildren(...show.map(({ q, state, obj }) => {
      const o = obj[0], kind = q.obj[0].counter || '';
      return h('button', { cls: 'qcard' + (state === 'satisfied' ? ' ready' : ''), on: () => (state === 'satisfied' && !q.giver ? reward('Quest', act('claimQuest', q.id)) : walkTo(q)) },
        h('span', { cls: 'tx ot' }, h('b', {}, q.name), h('div', { cls: 'bar' }, h('i', { style: `width:${Math.min(100, (100 * o.cur) / o.need)}%` }), h('span', {}, state === 'satisfied' ? (q.giver ? 'abgeben' : 'Abholen!') : `${fmt(o.cur)}/${fmt(o.need)}`))),
        h('span', { cls: 'qi' }, icon(kind.startsWith('raid') || kind === 'kill:bossAny' || (q.obj[0].cond && q.obj[0].cond.cleared) ? 'skull' : kind.startsWith('chest') ? 'chest' : kind.startsWith('talk') ? 'talk' : kind.startsWith('kill') ? 'sword' : q.obj[0].cond && q.obj[0].cond.building ? 'home' : 'star', null, 28)));
    }));
  }
  const n = notices();
  $('b_missions').hidden = !has('missions'); $('b_missions').classList.toggle('badge', !!n.missions);
  $('b_pass').classList.toggle('badge', !!n.passTab); $('b_chest').classList.toggle('badge', !!n.chest);
  $('auto').classList.toggle('on', w.p.auto);
  $('homebtn').hidden = !!w.mode || s.world.area === 'base'; $('abort').hidden = !w.mode;
  $('bonus').hidden = !meta.randomRewardReady(g) || !!w.mode;
  if (!w.mode) autoTalk(w);
  $('ctx').hidden = !w.near || !!speech || !!document.querySelector('.modal'); if (w.near) $('ctx').textContent = w.near.type === 'building' ? `${w.near.name} öffnen` : `Mit ${w.near.name} sprechen`;
  $('area').textContent = w.mode ? 'Arena' : s.world.area === 'base' ? 'Basis' : game.c.get('areas', s.world.area).name;
  document.documentElement.style.fontSize = `${16 * s.settings.textScale}px`;
  drawNav();
  if (cur && game.changed && Date.now() - (hud.last || 0) > 1000) { hud.last = Date.now(); game.changed = false; render(); }
}
export function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'toast') toast(e.msg);
    else if (e.type === 'reward') toast(`${e.title}: ${fmtReward(e.got)}`, 3000);
    else if (e.type === 'zone') toast(game.c.get('areas', e.area).name, 1800);
    else if (e.type === 'levelup') toast(`Level ${e.level}!`);
    else if (e.type === 'unlock') toast(`Freigeschaltet: ${fn(e.feature)}`, 3500);
    else if (e.type === 'quest') toast(`Neue Quest: ${e.name}`);
    else if (e.type === 'areaCleared') modal('Gebiet abgeschlossen', 'Das Tor zum nächsten Gebiet ist offen. Minimap-Belohnung unter „Karte“.');
    else if (e.type === 'modeResult') { const r = e.result; modal(r.win ? 'Geschafft' : 'Nicht geschafft', `${r.mode} ${r.param}${r.score ? ` · Schaden ${fmt(r.score)}` : ''}${r.first ? ' · Erstabschluss' : ''}${r.rewards.length ? ' · ' + fmtReward(r.rewards) : ''}`); } else if (e.type === 'sessionResume') modal('Unterbrochene Runde', `${e.session.mode} ${e.session.param} läuft noch.`, [['Abbrechen (kein Reward)', () => act('abortMode'), 'warn'], ['Fortsetzen', () => act('startMode', e.session.mode, e.session.param), 'pri']]);
    else if (e.type === 'dead') { const left = econ.capLeft(game.g, 'revive'); modal('Besiegt', game.world.mode ? 'Die Runde endet.' : `Wiederbelebungen heute: ${left}`, game.world.mode ? [['Runde beenden', () => act('revive', 'base')], ['Wiederbeleben', () => act('revive', 'inplace'), 'pri']] : [['Zur Basis', () => act('revive', 'base')], ['Hier wiederbeleben', () => act('revive', 'inplace'), 'pri']]); }
  }
}
export function init(gm, nt) {
  game = gm; net = nt;
  const put = (id, ic, col, size = 28) => $(id).append(icon(ic, col, size));
  put('b_menu', 'menu'); put('b_pass', 'pass'); put('bonus', 'gift'); put('b_missions', 'missions'); put('b_map', 'map'); put('b_chest', 'chest'); put('homebtn', 'home'); put('auto', 'target');
  document.querySelector('#p_gold .slot').append(icon('coin', null, 26)); document.querySelector('#p_gems .slot').append(icon('gem', null, 26)); document.querySelector('#p_third .slot').append(icon('crystal', null, 26));
  $('pclose').addEventListener('click', close);
  $('b_menu').addEventListener('click', () => (cur === 'menu' ? close() : open('menu')));
  $('b_pass').addEventListener('click', () => { notes.t = 0; tab.ev = notices().passTab || tab.ev || 'level'; open('events'); });
  $('b_missions').addEventListener('click', () => { tab.ev = 'missions'; open('events'); });
  $('b_map').addEventListener('click', () => open('map'));
  $('b_chest').addEventListener('click', () => open('base'));
  $('auto').addEventListener('click', () => { const p = game.world.p; p.auto = !p.auto; p.goal = null; p.mx = p.my = 0; toast(p.auto ? 'Auto-Jagd an' : 'Auto-Jagd aus', 1200); });
  $('homebtn').addEventListener('click', () => act('returnHome'));
  $('abort').addEventListener('click', () => modal('Runde abbrechen?', 'Das Ticket ist verbraucht, es gibt keine Belohnung.', [['Weiter spielen', null], ['Abbrechen', () => act('abortMode'), 'warn']]));
  $('bonus').addEventListener('click', () => reward('Bonus', act('claimRandomReward')));
  $('ctx').addEventListener('click', () => { const o = game.world.near; if (o && o.type === 'npc') talk(o); else open('base'); });
}
