// Menüs und HUD (Platzhalter-Design). Liest den Zustand und ruft ausschließlich game.try(Befehl) auf – nie direkte Zustandsänderung.
import { fmt, fmtTime } from '../core/util.js';
import * as econ from '../core/econ.js';
import * as prog from '../core/progress.js';
import * as gear from '../core/gear.js';
import * as home from '../core/home.js';
import * as meta from '../core/meta.js';
import * as modes from '../core/modes.js';
import { icon, itemIcon, STAT_ICON } from './skin.js';
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
const STAT = { atk: 'Angriff', hp: 'Leben', cargo: 'Cargo', atkSpeedPct: 'Angriffstempo %', regen: 'Regeneration/s', critChance: 'Krit-Chance %', critDmg: 'Krit-Schaden %', moveSpeedPct: 'Bewegung %', multiHit: 'Doppelangriff %', lifesteal: 'Lebensraub %',
  skillDmgPct: 'Skill-Schaden %', cooldownPct: 'Abklingzeit −%', goldPct: 'Gold %', xpPct: 'XP %', dmgPct: 'Schaden %', bossDmgPct: 'Boss-Schaden %', dropPct: 'Drops %', meleePct: 'Nahkampf %', rangedPct: 'Fernkampf %', synergyPct: 'Synergie %' };
const FEAT = { abilities: 'Ability-Upgrades', shop: 'Shop', weaponVault: 'Waffenkammer', craft: 'Schmieden', codex: 'Monster-Codex', missions: 'Mission Center', slot2: 'Zweiter Waffenslot', tower: 'Challenge Tower', battlePass: 'Battle Pass', sevenDay: '7-Tage-Event',
  carnival: 'Carnival', liveEvent: 'Live-Events', heroShop: 'Helden-Beschwörung', heroes: 'Helden', invasion: 'Invasion', pvp: 'PvP', portal: 'Portal', sTierChest: 'S-Tier-Truhe', heroEvolution: 'Helden-Evolution', heroCollection: 'Helden-Sammlung', traits: 'Traits',
  soul: 'Soul Imprint', raid: 'Boss Raid', tomb: 'Tomb of Heroes', runes: 'Runen', special: 'Special-Upgrades', extra: 'Extra-Upgrades', blessing: 'Blessings', spin: 'Lucky Spin', randomReward: 'Bonusbelohnung', keyhouse: 'Key House' };
const sn = (k) => t(STAT[k] || k), fn = (k) => t(FEAT[k] || k);
const tabs = (key, list) => { if (!list.some((x) => x[0] === tab[key])) tab[key] = list[0][0]; return h('div', { cls: 'tabs' }, list.map(([id, label, badge]) => h('button', { cls: 'tab' + (tab[key] === id ? ' on' : '') + (badge ? ' badge' : ''), on: () => { tab[key] = id; render(); } }, t(label)))); };
const cap = (key, list, n = 40) => { const lim = more[key] || n; return [...list.slice(0, lim), list.length > lim ? btn(`mehr anzeigen (${list.length - lim})`, () => { more[key] = lim + n * 2; render(); }) : null]; };

// Zielführung: Figur läuft per Pfadsuche zum Questziel (manuelle Eingabe bricht ab).
function walkTo(q) {
  const goal = game.questGoal(q);
  if (!goal) return toast('Dieses Ziel liegt nicht in diesem Gebiet.');
  if (game.world.mode) return toast('Im Modus nicht möglich.');
  game.world.p.auto = false; game.world.goTo(goal.x, goal.y); close(); toast(`Unterwegs zu: ${goal.label}`);
}
// Gespräch: Zeilen nacheinander (überspringbar), danach Abgaben, neue Aufträge und Fortschritt.
function talk(o) {
  const r = act('talkNpc', o.id);
  if (!r.ok) return;
  const v = r.value, parts = [];
  for (const c of v.claimed) parts.push(`✅ ${c.name}: ${fmtReward(c.got)}`);
  for (const a of v.accepted) parts.push(`❗ Neuer Auftrag: ${a}`);
  for (const a of v.active) if (!v.accepted.includes(a.name)) parts.push(`… ${a.name} ${a.obj.map((x) => `${fmt(x.cur)}/${fmt(x.need)}`).join(' ')}`);
  const end = () => {
    const btns = [['Schließen', null]];
    if (o.raid && has('raid')) btns.push([`Raid: ${game.c.get('raidBosses', o.raid).name}`, () => { if (act('startMode', 'raid', o.raid).ok) close(); }, 'pri']);
    if (parts.length || btns.length > 1) modal(v.npc, h('div', {}, parts.length ? parts.map((x) => h('p', {}, x)) : 'Ryan zeigt auf den Raid-Stein.'), btns);
  };
  const step = (i) => { if (i >= v.lines.length) return end(); modal(v.npc, `„${v.lines[i]}“`, [['Überspringen', end], [i + 1 < v.lines.length ? 'Weiter' : 'Ok', () => step(i + 1), 'pri']]); };
  step(0);
}
// ---------------------------------------------------------------- Panels
const P = {};
P.quests = () => {
  const g = game.g, list = meta.currentQuests(g), done = Object.keys(game.state.quests.done).length;
  const giverName = (q) => (game.c.t.npcs.find((n) => (q.at ? n.id === q.at : n.char === q.giver)) || {}).name;
  const offers = game.c.t.quests.filter((q) => q.giver && meta.questState(g, q) === 'available');
  return [sec('Aktive Quests', list.length ? list.map(({ q, state, obj }) => row(`${q.giver ? `[${giverName(q)}] ` : ''}${q.name}`, `${obj.map((o) => `${fmt(o.cur)}/${fmt(o.need)}`).join(' · ')} — Belohnung: ${fmtReward(q.reward)}${q.unlock ? ' · schaltet frei: ' + q.unlock.map(fn).join(', ') : ''}`,
    game.questGoal(q) ? btn('Zum Ziel', () => walkTo(q)) : null,
    q.giver ? (state === 'satisfied' ? h('span', { cls: 'cost' }, `bei ${giverName(q)} abgeben`) : null) : btn('Abschließen', () => reward('Quest', act('claimQuest', q.id)), state !== 'satisfied', 'pri'))) : h('p', {}, t('Alle verfügbaren Quests abgeschlossen.'))),
  offers.length ? sec('Neue Aufträge bei', offers.map((q) => row(giverName(q), q.name, game.questGoal(q) ? btn('Hinlaufen', () => walkTo(q)) : h('span', { cls: 'sub' }, 'in anderem Gebiet')))) : null,
  h('p', { cls: 'sub' }, `${done} / ${game.c.t.quests.length} Quests abgeschlossen`)];
};
function upgradeRows(family) {
  const g = game.g;
  return game.c.t.upgradeTracks.filter((u) => u.family === family).map((u) => {
    const pv = prog.upgradePreview(g, u.id, 1), mx = prog.upgradePreview(g, u.id, 'max'), full = pv.from >= u.max, can = pv.to > pv.from;
    const mainCur = pv.next ? (pv.next.gold !== undefined ? 'gold' : Object.keys(pv.next)[0]) : null, extras = pv.next ? Object.entries(pv.next).filter(([i]) => i !== mainCur) : [];
    return h('div', { cls: 'urow' }, h('div', { cls: 'uic' }, icon(STAT_ICON[u.stat] || 'star', null, 38)),
      h('div', { cls: 'um' }, h('div', { cls: 'un' }, u.name), h('div', { cls: 'sub' }, sn(u.stat) + (u.grades ? ` · Grad ${Math.min(u.grades, Math.floor(pv.from / (u.max / u.grades)) + 1)}` : '')),
        h('div', { cls: 'uv ot' }, fmt(pv.effFrom), full ? '' : ' > ', full ? null : h('em', {}, fmt(pv.effTo))), h('div', { cls: 'ul' }, `Stufe ${pv.from} / ${u.max}`)),
      h('div', { cls: 'ur' }, full ? h('b', { cls: 'ot', style: 'font-size:1.3rem;padding:0 14px' }, 'MAX') : [
        extras.length ? h('div', { cls: 'extra' }, extras.map(([i, n]) => h('span', { cls: econ.bal(g, i) >= n ? 'cost' : 'cost miss' }, itemIcon(i, 16), ' ', fmt(n)))) : null,
        h('button', { cls: 'b cost' + (can ? '' : ' miss'), on: () => act('buyUpgrade', u.id, 1) }, itemIcon(mainCur, 22), fmt(pv.next[mainCur])),
        h('div', { cls: 'mini' }, h('button', { cls: 'b sm', disabled: !can, on: () => act('buyUpgrade', u.id, 10) }, '+10'), h('button', { cls: 'b sm', disabled: mx.to === mx.from, on: () => act('buyUpgrade', u.id, 'max') }, `Max ${mx.to - mx.from}`))]));
  });
}
const chips = (...ids) => h('div', { cls: 'chips' }, ids.map((i) => h('span', { cls: 'chip ot' }, itemIcon(i, 22), fmt(econ.bal(game.g, i)))));
P.hero = () => {
  const fams = [['ability', 'Fähigkeit', 'abilities'], ['special', 'Spezial', 'special'], ['extra', 'Extra', 'extra'], ['soul', 'Soul', 'soul'], ['blessing', 'Segen', 'blessing']].filter((f) => has(f[2]));
  const s = game.state, open = game.c.t.areas.filter((a) => game.canEnter(a.id)), ch = open.length ? open[open.length - 1].chapter : 1;
  const head = [h('div', { cls: 'hq ot' }, 'Hauptquest', h('br'), `Kapitel ${ch}`),
    h('div', { cls: 'bossrow' }, game.c.t.areas.filter((a) => a.chapter === ch).map((a) => h('div', { cls: 'bosst ' + (s.world.cleared[a.id] ? 'ok' : game.canEnter(a.id) ? '' : 'no'), title: game.c.get('variants', a.boss).name }, icon('skull', null, 30)))),
    h('p', { cls: 'sub center' }, 'Besiege alle Gebietsbosse!')];
  if (!fams.length) return [...head, h('p', { cls: 'center' }, t('Baue das Bonfire, um Upgrades freizuschalten.'))];
  const f = fams.find((x) => x[0] === tab.up) || fams[0];
  tab.up = f[0];
  const cur = { ability: ['orb_jungle', 'orb_hell', 'gold'], special: ['orb_pink', 'orb_red'], extra: ['orb_ice', 'orb_jungle'], soul: ['orb_hell'], blessing: ['exp'] }[f[0]];
  return [...head, chips(...cur), ...upgradeRows(f[0]), fams.length > 1 ? tabs('up', fams.map((x) => [x[0], x[1]])) : null];
};
const wIcon = (w, size) => icon(game.c.get('weapons', w.def).cls, null, size);
const rarCol = (w) => game.c.get('rarities', game.c.get('weapons', w.def).rarity).color;
function weaponSheet(w) {
  const g = game.g, c = game.c, ws = game.state.weapons, d = c.get('weapons', w.def), eq = ws.slots.indexOf(w.uid), mp = gear.mergePreview(g, w.uid), mx = c.get('rarities', d.rarity).maxLevel;
  const free = ws.slots.findIndex((u, i) => i > 0 && i < ws.unlocked && !u), b = [];
  if (eq !== 0) b.push(['Haupt', () => act('equipWeapon', w.uid, 0), 'pri']);
  if (ws.unlocked > 1 && eq < 1) b.push(['Neben', () => act('equipWeapon', w.uid, free > 0 ? free : 1), 'blue']);
  if (eq >= 0) b.push(['Ablegen', () => act('unequipWeapon', eq)]);
  if (w.level < mx) b.push(['+1', () => { act('weaponLevelUp', w.uid, 1); }, 'go'], ['Max', () => act('weaponLevelUp', w.uid, 'max'), 'go']);
  if (mp.ok) b.push(['Verbinden', () => act('mergeWeapon', w.uid), 'blue']);
  b.push([w.lock ? 'Entsperren' : 'Sperren', () => act('toggleWeaponLock', w.uid)], ['Schließen', null]);
  modal(d.name, h('div', {}, h('p', {}, `Stufe ${w.level}/${mx} · Schaden ${fmt(prog.weaponDmg(g, w))}${d.skill ? ' · Skill: ' + c.get('skills', d.skill).name : ''}`),
    w.level < mx ? h('p', {}, 'Nächste Stufe: ', costEl(gear.weaponLevelCost(g, w, w.level + 1))) : null,
    mp.next ? h('p', { cls: 'sub' }, `Verbinden → ${mp.next.name}: ${mp.ok ? 'möglich' : mp.reason}`) : h('p', { cls: 'sub' }, 'Endstufe dieser Reihe')), b);
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
      h('div', { cls: 'mid' }, h('div', { cls: 'power ot' }, icon('burst', '#ff8a2a', 24), fmt(game.stats.atk + mainDmg)), icon('hero', null, 132), h('div', { cls: 'pedestal' }),
        has('heroes') ? btn('Held', () => open('heroes'), false, 'sm') : null),
      h('div', { cls: 'col' }, slot(3), slot(4), slot(5))),
    ns && !ns.quest ? row(`Slot ${ns.slot} freischalten`, h('span', {}, `Level ${ns.level} · `, costEl(ns.cost)), btn('Freischalten', () => act('unlockWeaponSlot'), false, 'go')) : null,
    h('div', { cls: 'wbar' }, btn('Ausrüsten', autoEquip, !ws.list.length, 'pri'), h('b', { cls: 'ot' }, 'Waffe'), btn('Verbinden', () => { const r = act('mergeAll'); if (r.ok) toast(`${r.value} Verbindungen`); }, !ws.list.length, 'blue')),
    list.length ? h('div', { cls: 'grid5' }, cap('w', list.map((w) => h('button', { cls: 'tile' + (ws.slots.includes(w.uid) ? ' eq' : ''), style: `background:${rarCol(w)}`, on: () => weaponSheet(w) }, wIcon(w, 40), h('span', { cls: 'lvt ot' }, `Lv.${w.level}`),
      w.lock ? h('span', { cls: 'lk' }, '🔒') : null, !ws.slots.includes(w.uid) && prog.weaponDmg(g, w) > mainDmg ? h('span', { cls: 'thumb' }, '▲') : null)), 40)) : h('p', { cls: 'center' }, 'Noch keine Waffen. Öffne eine Waffentruhe im Shop oder schmiede am Amboss.')];
};
P.smithy = () => {
  const g = game.g, c = game.c, tier = gear.smithyTier(g), sm = tier && c.get('smithy', tier), up = home.buildingUpgradeCost(g, 'smithy');
  if (!tier) return [h('p', { cls: 'center' }, t('Baue zuerst die Smithy in der Basis.'))];
  return [chips('orb_red', 'orb_pink', 'gold'), sec(`Schmiede Stufe ${tier}/8`, h('p', { cls: 'sub' }, 'Raten: ' + sm.rates.map((r) => `${c.get('rarities', r.rarity).name} ${r.w}%`).join(' · ') + (sm.otherW ? ` · Sonstiges ${sm.otherW}% (eigener Wert)` : '')),
    row('Schmieden', costEl({ gold: c.cfg.craftCost[tier - 1] }), btn('x1', () => reward('Geschmiedet', act('craft', 1)), false, 'pri'), btn('x10', () => reward('Geschmiedet', act('craft', 10)), false, 'pri')),
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
  // Karte, Basis und Events haben eigene Knöpfe im HUD und stehen deshalb nicht noch einmal im Menü
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
function boxRows() {
  const g = game.g;
  return game.c.t.gachaBoxes.filter((b) => !b.unlock || econ.check(g, b.unlock)).map((b) => {
    const st = gear.boxState(g, b.id), rate = game.c.get('rateGroups', b.rate), sum = rate.rows.reduce((a, r) => a + r.w, 0), ms = gear.milestoneAt(b, st.ms);
    return h('div', { cls: 'card' }, h('div', { cls: 'ti' }, b.name), h('div', { cls: 'sub' }, `Kosten: ${b.costs.map(fmtCost).join(' oder ')} · ${b.per > 1 ? b.per + ' Stück je Öffnung · ' : ''}Raten: ${rate.rows.map((r) => ((100 * r.w) / sum).toFixed(1) + '%').join(' / ')}`
      + (b.pity ? ` · Pity ${st.pity}/${b.pity.n}` : '') + (ms ? ` · Meilenstein bei ${ms} (${st.opens})` : '')),
    h('div', { cls: 'btns' }, b.multi.map((n) => btn(`x${n}`, () => { const co = gear.boxCost(g, b.id, n); confirmBig(co ? Object.fromEntries(Object.entries(co).map(([i, v]) => [i, v * n])) : {}, () => { const r = act('openBox', b.id, n); if (r.ok) modal(b.name, fmtReward(r.value)); }); }, !gear.boxCost(g, b.id, n)))));
  });
}
P.shop = () => {
  const g = game.g, c = game.c;
  const cats = [['chests', 'Truhen'], ['daily_gems', 'Gratis'], ['tickets', 'Tickets'], ['materials', 'Material'], ['stage_packs', 'Stage Packs'], ['chapter_packs', 'Chapter Packs'], ['merchant', 'Händler'], ['invasion', 'Invasion'], ['perks', 'Perks']]
    .filter(([id]) => id === 'chests' || id === 'merchant' || c.t.shop.some((x) => x.cat === id)); // Reiter ohne Angebote (z. B. Invasion im Solo-Spiel) entfallen
  const out = [h('p', { cls: 'sub' }, `Gold ${fmt(econ.bal(g, 'gold'))} · Gems ${fmt(econ.bal(g, 'gems'))} · Keys W/S/H ${econ.bal(g, 'key_warrior')}/${econ.bal(g, 'key_stier')}/${econ.bal(g, 'key_special_hero')}`), tabs('shop', cats)];
  if (tab.shop === 'chests') out.push(...boxRows());
  else if (tab.shop === 'merchant') for (const m of c.t.merchant) {
    const { def, st, unlocked } = meta.merchant(g, m.id);
    if (!unlocked) continue;
    const free = def.freeRefreshCap && econ.capLeft(g, def.freeRefreshCap) > 0;
    out.push(sec(def.name, st.offers.map((o) => { const d = def.pool.find((x) => x.id === o.id); return row(`${d.name} (${o.left}x)`, costEl(d.price), btn('Kaufen', () => reward('Gekauft', act('buyMerchant', m.id, o.id)), o.left <= 0)); }),
      btn(`Neu mischen (${free ? 'gratis' : fmtCost(def.refreshCost)})`, () => act('refreshMerchant', m.id))));
  } else {
    const rows = c.t.shop.filter((x) => x.cat === tab.shop).map((sku) => {
      const i = meta.skuInfo(g, sku.id);
      if (!i.unlocked && sku.cat !== 'stage_packs' && sku.cat !== 'chapter_packs') return null;
      return row(sku.name, h('span', {}, costEl(sku.price), ` → ${fmtReward(sku.reward)}${Number.isFinite(i.left) ? ` · noch ${Math.max(0, i.left)}` : ''}${i.unlocked ? '' : ' · 🔒 Gebiet abschließen'}`),
        btn(Object.keys(sku.price).length ? 'Kaufen' : 'Abholen', () => confirmBig(sku.price, () => reward(sku.name, act('buy', sku.id, 1))), !i.unlocked || i.left <= 0, 'pri'));
    }).filter(Boolean);
    out.push(rows.length ? rows : h('p', {}, t('Hier ist noch nichts freigeschaltet.')));
  }
  return out;
};
P.heroes = () => {
  const g = game.g, s = game.state, c = game.c;
  const col = has('heroCollection') ? sec('Sammlung (accountweit)', ['rare', 'epic', 'legendary', 'mythic', 'exotic'].map((rar) => {
    const sum = Object.entries(s.heroes.owned).filter(([id]) => c.get('heroes', id).rarity === rar).reduce((a, [, o]) => a + o.star, 0);
    const nx = c.t.heroCollection.find((r) => r.group === rar && r.need > sum);
    return row(`${rar}: ${sum} Sterne`, nx ? `nächster Bonus bei ${nx.need}: ${sn(nx.bonus.stat)} +${nx.bonus.pct}%` : 'alle Boni aktiv');
  })) : null;
  return [h('p', { cls: 'sub' }, `Evolution Coins ${fmt(econ.bal(g, 'evo_coin'))} · Select Tickets ${econ.bal(g, 'hero_select_ticket')} · Raid-Team: ${s.heroes.raidTeam.map((id) => c.get('heroes', id).name).join(', ')}`),
    cap('h', c.t.heroes.map((d) => {
      const o = s.heroes.owned[d.id], pc = econ.bal(g, `piece:${d.id}`), si = gear.heroStarInfo(g, d.id), inTeam = s.heroes.raidTeam.includes(d.id);
      return h('div', { cls: 'card' }, h('div', { cls: 'ti' }, `${d.name} [${d.rarity}] ${o ? `L${o.level} ${'★'.repeat(o.star)}` : '🔒'}${s.heroes.active === d.id ? ' · aktiv' : ''}`),
        h('div', { cls: 'sub' }, `ATK +${d.atkPct}% · HP +${d.hpPct}% · Mastery ${d.mastery} +${d.masteryPct}% · Skill ${c.get('skills', d.skill).name} · Scherben ${pc}`, o && has('heroEvolution') ? h('span', {}, ' · Stern-Up: ', si.available ? costEl(si.cost) : si.reason) : null),
        h('div', { cls: 'btns' }, o ? [btn('Aktivieren', () => act('setActiveHero', d.id), s.heroes.active === d.id), btn(`Level +1 (${o.level < 130 ? gear.heroLevelCost(g, d.id, o.level + 1) : '-'})`, () => act('heroLevelUp', d.id, 1), o.level >= 130),
          btn('+10', () => act('heroLevelUp', d.id, 10), o.level >= 130), has('heroEvolution') ? btn('Stern-Up', () => act('heroStarUp', d.id), !si.available) : null,
          btn(inTeam ? 'Aus Raid-Team' : 'Ins Raid-Team', () => act('setRaidTeam', inTeam ? s.heroes.raidTeam.filter((x) => x !== d.id) : [...s.heroes.raidTeam, d.id]))]
          : btn(`Freischalten (${d.unlockPieces} Scherben)`, () => act('unlockHero', d.id), pc < d.unlockPieces, 'pri'),
        btn('Select Ticket', () => act('useSelectTicket', d.id), econ.bal(g, 'hero_select_ticket') < 1)));
    }), 12), col];
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
  return [sec('Einstellungen', tog('autoBoss', 'Auto-Hunt greift Bosse an'), tog('autoReturn', 'Auto-Hunt: bei vollem Cargo heimkehren'), tog('dmgNumbers', 'Schadenszahlen'), tog('reducedFx', 'Reduzierte Effekte'), tog('colorblind', 'Farbblind-Modus (Labels statt Farbe)'),
    row('Schriftgröße', `${Math.round(s.settings.textScale * 100)}%`, btn('−', () => act('setSetting', 'textScale', Math.max(0.8, s.settings.textScale - 0.1))), btn('+', () => act('setSetting', 'textScale', Math.min(1.5, s.settings.textScale + 0.1))))),
  sec('App', row('Nach Updates suchen', 'Lädt die neueste signierte APK, Spielstand bleibt erhalten', btn('Prüfen', async () => { const r = await window.__checkUpdate(true); if (r.status === 'current') toast(`Aktuell (${r.current})`); else if (r.status === 'offline') toast('Keine Verbindung'); else if (r.status === 'none') toast('Es ist noch keine Version veröffentlicht.'); else if (r.status === 'dev') toast('Entwicklungsversion – Updates gibt es nur in der installierten App.'); else if (r.status === 'error') toast(r.error); }))),
  sec('Spielstand', row(`Profil ${s.profileId}`, `Content ${game.c.version} · Revision ${s.sync.rev}`, btn('Exportieren', () => net.exportSave()), btn('Importieren', () => net.importSave())),
    net ? row('Eigenes Backend (optional)', net.status(), btn('Verbinden/Sync', async () => { toast(await net.sync()); render(); })) : null),
  sec('Gem-Ledger (Summen je Kanal)', gemTot.map(([src, n]) => row(src, '', h('span', { cls: n < 0 ? 'cost miss' : 'cost' }, (n > 0 ? '+' : '') + fmt(n))))),
  sec('Letzte Buchungen', s.ledger.slice(-15).reverse().map((x) => row(`${x.d > 0 ? '+' : ''}${fmt(x.d)} ${itemName(x.item)}`, `${x.src} ${x.ref || ''} · #${x.id}`))),
  h('p', { cls: 'sub' }, `XP-Quellen: ${Object.entries(s.totals['#xp'] || {}).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ') || '—'} · Tagesreset 00:00 UTC, nächster in ${fmtTime((s.period.day + 1) * 86400000 - g.now())}`)];
};

const TITLES = { quests: 'Quests', hero: 'Upgrades', weapons: 'Ausrüstung', base: 'Basis', shop: 'Shop', heroes: 'Helden', traits: 'Traits', runes: 'Runen', modes: 'Herausforderungen', events: 'Events', map: 'Karte', settings: 'Mehr',
  inv: 'Inventar', smithy: 'Schmiede', menu: 'Menü' };
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
  const key = BAR.map(([, , f]) => (f.some(has) ? 1 : 0)).join('') + cur + tier + (econ.bal(g, 'gold') >= cost);
  if (drawNav.key === key) return;
  drawNav.key = key;
  $('nav').replaceChildren(...BAR.map(([id, ic, f]) => {
    const ok = f.some(has), locked = () => toast('Noch nicht freigeschaltet – folge den Quests.');
    if (id === 'craft') return h('button', { cls: 'nb craft' + (ok ? '' : ' locked'), 'aria-label': 'Schmieden', on: () => (!ok ? locked() : !tier ? toast('Baue zuerst die Smithy in der Basis.') : reward('Geschmiedet', act('craft', 1))) },
      tier ? h('span', { cls: 'tier ot' }, tier) : null, icon(ic, null, 44), h('span', { cls: 'info ot' }, 'x1', h('small', { cls: econ.bal(g, 'gold') >= cost ? '' : 'cost miss' }, tier ? [itemIcon('gold', 13), fmt(cost)] : '—')));
    return h('button', { cls: 'nb' + (cur === id ? ' on' : '') + (ok ? '' : ' locked'), 'aria-label': TITLES[id], on: () => (!ok ? locked() : cur === id ? close() : open(id)) }, icon(ic, null, 42));
  }));
}

// ---------------------------------------------------------------- HUD (aus dem Zustand abgeleitet, gebündelt 5x/s)
let notes = { t: 0 };
function notices() {
  const now = Date.now();
  if (now - notes.t < 1000) return notes;
  const g = game.g, s = game.state, ready = eventGroups().filter((x) => x[2]).map((x) => x[0]);
  // Jedes "!" führt genau dorthin, wo etwas abzuholen ist: Missionen-Knopf -> Missionen, Stern-Knopf -> erste andere Gruppe mit Belohnung
  notes = { t: now, missions: ready.includes('missions'), passTab: ready.find((x) => x !== 'missions') || null, chest: s.keyhouse.slots.some((x) => x.chest && g.now() >= x.chest.readyAt) };
  return notes;
}
export function hud() {
  const g = game.g, s = game.state, w = game.world, st = game.stats, p = s.player;
  const need = prog.xpNeed(g, Math.min(p.level, game.c.t.playerLevels.length));
  $('lv').textContent = p.level; $('xpf').style.width = `${Math.min(100, (100 * p.xp) / need)}%`; $('xpt').textContent = `${fmt(p.xp)}/${fmt(need)}`;
  $('c_gold').textContent = fmt(econ.bal(g, 'gold')); $('c_gems').textContent = fmt(econ.bal(g, 'gems')); $('c_third').textContent = fmt(econ.bal(g, 'weapon_scroll'));
  const used = home.cargoUsed(g);
  $('cargo').textContent = w.mode ? `${w.mode.kind.toUpperCase()} · Welle ${w.wave + 1}/${w.mode.waves.length} · ${Math.ceil(w.timer)}s` : `FRACHT (${fmt(used)}/${fmt(st.cargo)})`;
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
  $('ctx').hidden = !w.near || !!document.querySelector('.modal'); if (w.near) $('ctx').textContent = w.near.type === 'building' ? `${w.near.name} öffnen` : `Mit ${w.near.name} sprechen`;
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
  const put = (id, ic, col, size = 34) => $(id).append(icon(ic, col, size));
  put('b_menu', 'menu'); put('b_pass', 'pass'); put('bonus', 'gift'); put('b_missions', 'missions'); put('b_map', 'map'); put('b_chest', 'chest'); put('homebtn', 'home'); put('auto', 'target');
  document.querySelector('#p_gold .slot').append(icon('coin', null, 30)); document.querySelector('#p_gems .slot').append(icon('gem', null, 30)); document.querySelector('#p_third .slot').append(icon('scroll', null, 30));
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
