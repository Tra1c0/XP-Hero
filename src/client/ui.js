// Menüs und HUD (Platzhalter-Design). Liest den Zustand und ruft ausschließlich game.try(Befehl) auf – nie direkte Zustandsänderung.
import { fmt, fmtTime } from '../core/util.js';
import * as econ from '../core/econ.js';
import * as prog from '../core/progress.js';
import * as gear from '../core/gear.js';
import * as home from '../core/home.js';
import * as meta from '../core/meta.js';
import * as modes from '../core/modes.js';

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
    agg[k] = (agg[k] || 0) + (e.n ?? (e.min !== undefined ? 0 : 1)); if (e.min !== undefined) agg[k] = `${e.min}–${e.max}`;
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
const tabs = (key, list) => { tab[key] ||= list[0][0]; return h('div', { cls: 'tabs' }, list.map(([id, label]) => h('button', { cls: 'tab' + (tab[key] === id ? ' on' : ''), on: () => { tab[key] = id; render(); } }, t(label)))); };
const cap = (key, list, n = 40) => { const lim = more[key] || n; return [...list.slice(0, lim), list.length > lim ? btn(`mehr anzeigen (${list.length - lim})`, () => { more[key] = lim + n * 2; render(); }) : null]; };

// ---------------------------------------------------------------- Panels
const P = {};
P.quests = () => {
  const g = game.g, list = meta.currentQuests(g), done = Object.keys(game.state.quests.done).length;
  return [sec('Aktive Quests', list.length ? list.map(({ q, state, obj }) => row(q.name, `${obj.map((o) => `${fmt(o.cur)}/${fmt(o.need)}`).join(' · ')} — Belohnung: ${fmtReward(q.reward)}${q.unlock ? ' · schaltet frei: ' + q.unlock.map(fn).join(', ') : ''}`,
    btn('Abschließen', () => reward('Quest', act('claimQuest', q.id)), state !== 'satisfied', 'pri'))) : h('p', {}, t('Alle verfügbaren Quests abgeschlossen.'))),
  h('p', { cls: 'sub' }, `${done} / ${game.c.t.quests.length} Quests abgeschlossen`)];
};
function upgradeRows(family) {
  return game.c.t.upgradeTracks.filter((u) => u.family === family).map((u) => {
    const pv = prog.upgradePreview(game.g, u.id, 1), mx = prog.upgradePreview(game.g, u.id, 'max'), full = pv.from >= u.max;
    return row(`${u.name} ${pv.from}/${u.max}${u.grades ? ` (Grad ${Math.min(u.grades, Math.floor(pv.from / (u.max / u.grades)) + 1)})` : ''}`,
      h('span', {}, `${sn(u.stat)}: ${fmt(pv.effFrom)}${full ? '' : ' → ' + fmt(pv.effTo)} · `, full ? 'MAX' : costEl(pv.next)),
      btn('+1', () => act('buyUpgrade', u.id, 1), full || pv.to === pv.from), btn('+10', () => act('buyUpgrade', u.id, 10), full || pv.to === pv.from),
      btn(`Max (${mx.to - mx.from})`, () => act('buyUpgrade', u.id, 'max'), mx.to === mx.from));
  });
}
P.hero = () => {
  const fams = [['ability', 'Ability', 'abilities'], ['special', 'Special', 'special'], ['extra', 'Extra', 'extra'], ['soul', 'Soul Imprint', 'soul'], ['blessing', 'Blessings', 'blessing']].filter((f) => has(f[2]));
  const st = game.stats;
  return [h('p', { cls: 'sub' }, `ATK ${fmt(st.atk)} · HP ${fmt(st.hp)} · Cargo ${st.cargo} · Krit ${st.critChance.toFixed(1)}% x${st.critDmg}% · Tempo +${st.atkSpeedPct}% · Schaden +${st.dmgPct.toFixed(0)}%`),
    fams.length ? [tabs('up', fams.map((f) => [f[0], f[1]])), ...upgradeRows(fams.find((f) => f[0] === tab.up) ? tab.up : (tab.up = fams[0][0]))] : h('p', {}, t('Baue das Bonfire, um Ability-Upgrades freizuschalten.'))];
};
P.weapons = () => {
  const g = game.g, s = game.state, ws = s.weapons, c = game.c;
  const name = (w) => `${c.get('weapons', w.def).name} L${w.level}`;
  const slotRows = ws.slots.map((uid, i) => {
    const w = uid && ws.list.find((x) => x.uid === uid), locked = i >= ws.unlocked;
    return row(`${i === 0 ? 'Hauptwaffe' : 'Nebenwaffe ' + i}: ${locked ? '🔒' : w ? name(w) : '—'}`, w ? `Schaden ${fmt(prog.weaponDmg(g, w))}` : '', w ? btn('Ablegen', () => act('unequipWeapon', i)) : null);
  });
  const ns = gear.nextWeaponSlot(g);
  const flt = tab.wcls || 'all';
  const list = ws.list.filter((w) => flt === 'all' || c.get('weapons', w.def).cls === flt).sort((a, b) => c.get('weapons', b.def).rarity - c.get('weapons', a.def).rarity || b.level - a.level);
  const out = [sec('Slots', slotRows, ns ? row(`Slot ${ns.slot} freischalten`, ns.quest ? 'per Quest' : h('span', {}, `Level ${ns.level} · `, costEl(ns.cost)), ns.quest ? null : btn('Freischalten', () => act('unlockWeaponSlot'))) : null)];
  if (has('craft')) {
    const tier = gear.smithyTier(g), sm = tier && c.get('smithy', tier), up = home.buildingUpgradeCost(g, 'smithy');
    out.push(sec(`Schmiede (Stufe ${tier}/8)`, tier ? [h('p', { cls: 'sub' }, 'Raten: ' + sm.rates.map((r) => `${c.get('rarities', r.rarity).name} ${r.w}%`).join(' · ') + (sm.otherW ? ` · Sonstiges ${sm.otherW}% (eigener Wert)` : '')),
      row('Schmieden', costEl({ gold: c.cfg.craftCost[tier - 1] }), btn('x1', () => reward('Geschmiedet', act('craft', 1))), btn('x10', () => reward('Geschmiedet', act('craft', 10)))),
      up ? row('Schmiede verbessern', costEl(up), btn('Upgrade', () => act('upgradeBuilding', 'smithy'))) : null] : h('p', {}, t('Smithy in der Basis bauen.'))));
  }
  out.push(sec(`Inventar (${ws.list.length})`, h('div', { cls: 'tabs' }, [['all', 'Alle'], ...c.t.weaponClasses.map((k) => [k.id, k.name])].map(([id, l]) => h('button', { cls: 'tab' + (flt === id ? ' on' : ''), on: () => { tab.wcls = id; render(); } }, l))),
    btn('Alle freien Duplikate verschmelzen', () => { const r = act('mergeAll'); if (r.ok) toast(`${r.value} Verschmelzungen`); }),
    cap('w', list.map((w) => {
      const d = c.get('weapons', w.def), eq = ws.slots.indexOf(w.uid), mp = gear.mergePreview(g, w.uid), mx = c.get('rarities', d.rarity).maxLevel;
      const free = ws.slots.findIndex((u, i) => i < ws.unlocked && !u);
      return h('div', { cls: 'card', style: `border-color:${c.get('rarities', d.rarity).color}` }, h('div', { cls: 'ti' }, `${w.lock ? '🔒 ' : ''}${name(w)}/${mx}${eq >= 0 ? ` · Slot ${eq + 1}` : ''}`),
        h('div', { cls: 'sub' }, `Schaden ${fmt(prog.weaponDmg(g, w))}${d.skill ? ' · Skill: ' + c.get('skills', d.skill).name : ''} · Level-Up: `, w.level < mx ? costEl(gear.weaponLevelCost(g, w, w.level + 1)) : 'MAX',
          mp.next ? h('span', {}, ` · Verschmelzen → ${mp.next.name}: ${mp.ok ? 'möglich' : mp.reason}`) : null),
        h('div', { cls: 'btns' }, btn('Haupt', () => act('equipWeapon', w.uid, 0), eq === 0), ws.unlocked > 1 ? btn('Neben', () => act('equipWeapon', w.uid, free > 0 ? free : 1), eq > 0) : null,
          btn('+1', () => act('weaponLevelUp', w.uid, 1), w.level >= mx), btn('Max', () => act('weaponLevelUp', w.uid, 'max'), w.level >= mx),
          btn('Verschmelzen', () => act('mergeWeapon', w.uid), !mp.ok), btn(w.lock ? 'Entsperren' : 'Sperren', () => act('toggleWeaponLock', w.uid))));
    }))));
  return out;
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
  const cats = [['chests', 'Truhen'], ['daily_gems', 'Gratis'], ['tickets', 'Tickets'], ['materials', 'Material'], ['stage_packs', 'Stage Packs'], ['chapter_packs', 'Chapter Packs'], ['merchant', 'Händler'], ['invasion', 'Invasion'], ['perks', 'Perks']];
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
  const list = [['tower', 'Tower'], ['raid', 'Boss Raid'], ['tomb', 'Tomb'], ['pvp', 'PvP'], ['invasion', 'Invasion']].filter((m) => has(m[0]));
  if (!list.length) return [h('p', {}, t('Modi werden über die Questreihe freigeschaltet.'))];
  out.push(tabs('mode', list));
  if (!list.find((m) => m[0] === tab.mode)) tab.mode = list[0][0];
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
  const nodes = def.nodes.map((n) => ({ n, st: econ.nodeState(g, def, n, ts) })).sort((a, b) => order[a.st] - order[b.st]);
  const ready = nodes.filter((x) => x.st === 'ready').length;
  return sec(`${def.name} (${nodes.filter((x) => x.st === 'claimed').length}/${nodes.length})`, ready > 1 ? btn(`Alle abholen (${ready})`, () => reward(def.name, act('claimAll', id)), false, 'pri') : null,
    cap('t' + id, nodes.map(({ n, st }) => { const [a, b] = econ.progress(g, n.cond, { track: ts }); return row(n.name, `${fmt(Math.min(a, b))}/${fmt(b)} · ${fmtReward(n.reward)}${n.bonusMult ? ` x${n.bonusMult}` : ''}`, st === 'claimed' ? '✓' : st === 'expired' ? 'abgelaufen' : btn('Abholen', () => reward(n.name, act('claimNode', id, n.id)), st !== 'ready', 'pri')); }), 12));
}
P.events = () => {
  const g = game.g, groups = [['missions', 'Missionen', ['daily', 'weekly']], ['level', 'Level', ['levelup']], ['login', 'Login', ['login']], ['events', 'Events', ['sevenDay', 'carnival', ...(game.c.t.events || []).map((e) => e.track.id)]], ['pass', 'Pässe', ['battlepass', 'chapterpass_1', 'chapterpass_2', 'chapterpass_3']], ['codex', 'Codex', ['codex']], ['spin', 'Spin & Codes', []]];
  const out = [tabs('ev', groups.map((x) => [x[0], x[1]]))], gsel = groups.find((x) => x[0] === tab.ev);
  const views = gsel[2].map(trackView).filter(Boolean);
  if (tab.ev === 'spin') {
    const seg = meta.spinSegment(g), free = econ.capLeft(g, 'freeSpin') > 0;
    out.push(has('spin') ? sec(`Lucky Spin (${seg.id})`, h('p', { cls: 'sub' }, seg.rows.map((r) => fmtReward([r])).join(' · ')), btn(free ? 'Gratis drehen' : `Drehen (${fmtCost(game.c.cfg.spin.spinCost)})`, () => { const r = act('spin'); if (r.ok) modal('Lucky Spin', fmtReward(r.value.got)); }, false, 'pri')) : h('p', {}, t('Lucky Spin wird später freigeschaltet.')),
      sec('Code einlösen', h('input', { id: 'code', placeholder: 'Code' }), btn('Einlösen', async () => {
        const code = $('code').value, r = game.try('redeemLocal', code);
        if (r.ok) return reward('Code', r), render();
        if (net && net.online()) { const x = await net.redeem(code); toast(x.ok ? `Code: ${fmtReward(x.got)}` : x.error); render(); } else toast(r.error);
      })));
  } else out.push(views.length ? views : h('p', {}, t('Noch nicht freigeschaltet.')));
  return out;
};
P.map = () => {
  const g = game.g, s = game.state;
  return [h('p', { cls: 'sub' }, `Aktuell: ${s.world.area === 'base' ? 'Basis' : game.c.get('areas', s.world.area).name} · Heimkehr heute: ${s.flags.perk_home ? '∞' : econ.capLeft(g, 'homeReturn')}`),
    row('Basis', '', btn('Heimkehren', () => { if (act('returnHome').ok) close(); }, s.world.area === 'base')),
    sec(has('portal') ? 'Portal' : 'Gebiete (Portal noch nicht gebaut – Reise zu Fuß durch die Tore)', game.c.t.areas.map((a) => row(`${a.chapter}.${a.id.split('_')[1]} ${a.name}${s.world.cleared[a.id] ? ' ✓' : ''}`, `Boss: ${game.c.get('variants', a.boss).name} L${game.c.get('variants', a.boss).level}`,
      has('portal') ? btn('Reisen', () => { if (act('portal', a.id).ok) close(); }, !game.canEnter(a.id) || s.world.area === a.id) : game.canEnter(a.id) ? '' : '🔒'))), trackView('minimap')];
};
P.settings = () => {
  const s = game.state, g = game.g;
  const tog = (k, label) => row(label, '', btn(s.settings[k] ? 'An' : 'Aus', () => act('setSetting', k, !s.settings[k])));
  const gemTot = Object.entries(s.totals.gems || {}).sort((a, b) => b[1] - a[1]);
  return [sec('Einstellungen', tog('autoBoss', 'Auto-Hunt greift Bosse an'), tog('autoReturn', 'Auto-Hunt: bei vollem Cargo heimkehren'), tog('dmgNumbers', 'Schadenszahlen'), tog('reducedFx', 'Reduzierte Effekte'), tog('colorblind', 'Farbblind-Modus (Labels statt Farbe)'),
    row('Schriftgröße', `${Math.round(s.settings.textScale * 100)}%`, btn('−', () => act('setSetting', 'textScale', Math.max(0.8, s.settings.textScale - 0.1))), btn('+', () => act('setSetting', 'textScale', Math.min(1.5, s.settings.textScale + 0.1))))),
  sec('App', row('Nach Updates suchen', 'Lädt die neueste signierte APK, Spielstand bleibt erhalten', btn('Prüfen', async () => { const r = await window.__checkUpdate(true); if (r.status === 'current') toast(`Aktuell (${r.current})`); else if (r.status === 'offline') toast('Keine Verbindung'); else if (r.status === 'error') toast(r.error); }))),
  sec('Spielstand', row(`Profil ${s.profileId}`, `Content ${game.c.version} · Revision ${s.sync.rev}`, btn('Exportieren', () => net.exportSave()), btn('Importieren', () => net.importSave())),
    net ? row('Eigenes Backend (optional)', net.status(), btn('Verbinden/Sync', async () => { toast(await net.sync()); render(); })) : null),
  sec('Gem-Ledger (Summen je Kanal)', gemTot.map(([src, n]) => row(src, '', h('span', { cls: n < 0 ? 'cost miss' : 'cost' }, (n > 0 ? '+' : '') + fmt(n))))),
  sec('Letzte Buchungen', s.ledger.slice(-15).reverse().map((x) => row(`${x.d > 0 ? '+' : ''}${fmt(x.d)} ${itemName(x.item)}`, `${x.src} ${x.ref || ''} · #${x.id}`))),
  h('p', { cls: 'sub' }, `XP-Quellen: ${Object.entries(s.totals['#xp'] || {}).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ') || '—'} · Tagesreset 00:00 UTC, nächster in ${fmtTime((s.period.day + 1) * 86400000 - g.now())}`)];
};

const NAV = [['quests', 'Quests'], ['hero', 'Upgrades', 'abilities'], ['weapons', 'Waffen', 'weaponVault'], ['base', 'Basis'], ['shop', 'Shop', 'shop'], ['heroes', 'Helden', 'heroes'], ['traits', 'Traits', 'traits'], ['runes', 'Runen', 'runes'],
  ['modes', 'Modi', ['tower', 'raid', 'tomb', 'pvp', 'invasion']], ['events', 'Events'], ['map', 'Karte'], ['settings', 'Mehr']];
export function open(id) { cur = id; render(); }
export function close() { cur = null; $('panel').hidden = true; }
export function render() {
  if (!cur) return;
  const body = $('pbody'), y = body.scrollTop;
  $('ptitle').textContent = t(NAV.find((n) => n[0] === cur)[1]);
  body.replaceChildren(...P[cur]().flat(3).filter(Boolean));
  $('panel').hidden = false; body.scrollTop = y;
  drawNav();
}
function drawNav() {
  const vis = NAV.filter(([, , f]) => !f || (Array.isArray(f) ? f.some(has) : has(f)));
  const key = vis.map((v) => v[0]).join() + cur;
  if (drawNav.key === key) return;
  drawNav.key = key;
  $('nav').replaceChildren(...vis.map(([id, label]) => h('button', { cls: 'nb' + (cur === id ? ' on' : ''), on: () => (cur === id ? close() : open(id)) }, t(label))));
}

// ---------------------------------------------------------------- HUD (aus dem Zustand abgeleitet, gebündelt 5x/s)
export function hud() {
  const g = game.g, s = game.state, w = game.world, st = game.stats, p = s.player;
  const need = prog.xpNeed(g, Math.min(p.level, game.c.t.playerLevels.length));
  $('hp').style.width = `${Math.max(0, (100 * w.p.hp) / st.hp)}%`; $('hpt').textContent = `${fmt(Math.ceil(w.p.hp))} / ${fmt(st.hp)}`;
  $('xp').style.width = `${Math.min(100, (100 * p.xp) / need)}%`; $('xpt').textContent = `Lv ${p.level} · ${fmt(p.xp)}/${fmt(need)} XP${st.xpPct ? ` (+${st.xpPct.toFixed(0)}%)` : ''}`;
  $('cur').textContent = `🪙 ${fmt(econ.bal(g, 'gold'))}  💎 ${fmt(econ.bal(g, 'gems'))}  📦 ${home.cargoUsed(g)}/${st.cargo}`;
  const q = meta.currentQuests(g)[0];
  $('quest').textContent = w.mode ? `${w.mode.kind.toUpperCase()} · Welle ${w.wave + 1}/${w.mode.waves.length} · ${Math.ceil(w.timer)}s · Schaden ${fmt(w.dmgDealt)}` : q ? `${q.state === 'satisfied' ? '✅ ' : '❗ '}${q.q.name} ${q.obj.map((o) => `${fmt(o.cur)}/${fmt(o.need)}`).join(' ')}` : '';
  $('quest').className = q && q.state === 'satisfied' && !w.mode ? 'ready' : '';
  $('auto').textContent = w.p.auto ? 'Auto: AN' : 'Auto: AUS'; $('auto').className = 'b' + (w.p.auto ? ' pri' : '');
  $('homebtn').hidden = !!w.mode || s.world.area === 'base'; $('abort').hidden = !w.mode;
  $('bonus').hidden = !meta.randomRewardReady(g) || !!w.mode;
  $('ctx').hidden = !w.near; if (w.near) $('ctx').textContent = w.near.type === 'building' ? `${w.near.name} öffnen` : `${w.near.name}`;
  $('area').textContent = w.mode ? 'Arena' : s.world.area === 'base' ? 'Basis' : game.c.get('areas', s.world.area).name;
  document.documentElement.style.fontSize = `${16 * s.settings.textScale}px`;
  drawNav();
  if (cur && game.changed && Date.now() - (hud.last || 0) > 1000) { hud.last = Date.now(); game.changed = false; render(); }
}
export function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'toast') toast(e.msg);
    else if (e.type === 'reward') toast(`${e.title}: ${fmtReward(e.got)}`, 3000);
    else if (e.type === 'dialog') toast(`${e.name}: „${e.text}“`, 4500); // nicht blockierend: Vorbeilaufen unterbricht das Spiel nicht
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
  $('pclose').addEventListener('click', close);
  $('auto').addEventListener('click', () => { game.world.p.auto = !game.world.p.auto; game.world.p.mx = game.world.p.my = 0; });
  $('homebtn').addEventListener('click', () => act('returnHome'));
  $('abort').addEventListener('click', () => modal('Runde abbrechen?', 'Das Ticket ist verbraucht, es gibt keine Belohnung.', [['Weiter spielen', null], ['Abbrechen', () => act('abortMode'), 'warn']]));
  $('bonus').addEventListener('click', () => reward('Bonus', act('claimRandomReward')));
  $('quest').addEventListener('click', () => { const q = meta.currentQuests(game.g)[0]; if (q && q.state === 'satisfied') reward('Quest', act('claimQuest', q.q.id)); else open('quests'); });
  $('ctx').addEventListener('click', () => open('base'));
}
