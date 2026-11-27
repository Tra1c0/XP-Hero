// Eigene Symbolbibliothek (Inline-SVG, 48er-Raster): dicke dunkle Konturen, kräftige Flächen. Austauschbar ohne Logikänderung.
const O = 'stroke="#33221a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${O} ${extra}/>`;
const C = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${O}/>`;
const SHINE = '<path d="M14 14 Q18 9 25 9" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>';
const ICONS = {
  up: () => P('M24 5 42 24H31V42H17V24H6Z', '#4fd34a') + '<path d="M24 11 34 22" stroke="#b9ffb0" stroke-width="3" fill="none" stroke-linecap="round"/>',
  sword: (c = '#e8eef5') => P('M31 5 42 6 43 17 22 38 10 26Z', c) + P('M7 24 24 41', 'none', 'stroke-width="6" stroke="#33221a"') + '<path d="M7 24 24 41" stroke="#e9b43a" stroke-width="3" stroke-linecap="round"/>' + P('M6 42 13 35', 'none', 'stroke-width="6"') + '<path d="M6 42 13 35" stroke="#9a6a3f" stroke-width="3" stroke-linecap="round"/>',
  anvil: () => P('M6 20H34L44 15V24H35Q32 31 37 35H11Q16 31 13 24H6Z', '#9aa3b5') + P('M9 35H39V42H9Z', '#6e7689') + P('M14 4H30V12H14Z', '#c7cedb') + P('M21 12H24V19H21Z', '#9a6a3f'),
  tower: () => P('M12 43V19H8V8H15V12H21V8H27V12H33V8H40V19H36V43Z', '#8f7ad9') + P('M20 43V32Q24 26 28 32V43Z', '#3b2d6b') + C(18, 24, 2.5, '#ffd24a') + C(30, 24, 2.5, '#ffd24a'),
  shop: () => P('M9 21H39V43H9Z', '#f6ead0') + P('M5 21 10 7H38L43 21Q39 26 34 21 29 26 24 21 19 26 14 21 9 26 5 21Z', '#e5503f') + P('M18 43V30H30V43Z', '#5aa9e6'),
  menu: () => P('M7 7H41V41H7Z', '#9a6a3f') + [16, 24, 32].map((y) => `<path d="M14 ${y}H34" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`).join(''),
  pass: () => P('M24 4 42 14V34L24 44 6 34V14Z', '#8f5ad9') + P('M24 12 27.5 20 36 21 29.5 27 31.5 36 24 31.5 16.5 36 18.5 27 12 21 20.5 20Z', '#ffd24a'),
  missions: () => P('M8 10H40V42H8Z', '#f6ead0') + P('M8 10H40V19H8Z', '#e5503f') + '<path d="M15 30 22 37 34 24" fill="none" stroke="#33221a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 30 22 37 34 24" fill="none" stroke="#4fd34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  map: () => P('M6 12 18 7 30 12 42 7V37L30 42 18 37 6 42Z', '#f3e2b0') + '<path d="M18 7V37M30 12V42" stroke="#33221a" stroke-width="2"/><path d="M21 19 29 29M29 19 21 29" stroke="#e5503f" stroke-width="4" stroke-linecap="round"/>',
  chest: (c = '#b9742f') => P('M7 20H41V41H7Z', c) + P('M7 20Q7 8 24 8 41 8 41 20Z', '#d38b3c') + P('M20 17H28V27H20Z', '#ffd24a') + '<path d="M7 20H41" stroke="#33221a" stroke-width="3"/>',
  coin: (c = '#ffd24a') => C(24, 24, 17, c) + C(24, 24, 10, '#fff1a8') + SHINE,
  gem: (c = '#ef5fd0') => P('M12 8H36L42 20 24 42 6 20Z', c) + '<path d="M6 20H42M12 8 18 20 24 42 30 20 36 8" fill="none" stroke="#33221a" stroke-width="2" stroke-opacity=".6"/>',
  crystal: (c = '#3fd08a') => P('M27 4 38 20 22 44 10 26Z', c) + '<path d="M27 4 22 44M10 26 38 20" stroke="#33221a" stroke-width="2" stroke-opacity=".5" fill="none"/>',
  scroll: () => P('M12 8H38V36Q38 42 32 42H10Q16 42 16 36V8Z', '#f3e2b0') + P('M8 8H38Q42 8 42 13H12Q12 8 8 8Z', '#d9c088') + P('M24 16 30 22 24 30 20 24Z', '#7a5236'),
  key: (c = '#ffd24a') => C(16, 16, 9, c) + P('M22 22 40 40M33 33 38 28M28 28 32 24', 'none', 'stroke-width="7"') + `<path d="M22 22 40 40M33 33 38 28" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  ticket: (c = '#f0c14b') => P('M6 14H42V21Q37 24 42 27V34H6V27Q11 24 6 21Z', c) + P('M24 18 26 22 30 22.5 27 25.5 28 30 24 28 20 30 21 25.5 18 22.5 22 22Z', '#fff'),
  orb: (c = '#ff5a5a') => C(24, 24, 17, c) + SHINE,
  drop: (c = '#ff9a2e') => P('M24 5Q40 24 40 31A16 16 0 0 1 8 31Q8 24 24 5Z', c) + '<path d="M16 28Q16 34 22 36" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>',
  log: () => P('M6 30 30 12 40 20 16 40Z', '#9a6a3f') + C(11, 35, 7, '#e2b77e'),
  rock: () => P('M8 32 14 14 30 8 42 22 36 40H14Z', '#a3a7ad'),
  heart: (c = '#ff5a7a') => P('M24 42Q4 28 6 16 8 6 16 6 22 6 24 12 26 6 32 6 40 6 42 16 44 28 24 42Z', c),
  heartplus: () => ICONS.heart() + P('M28 26H35V21H40V26H46V32H40V38H35V32H28Z', '#4fd34a'),
  bag: () => P('M9 18H39L42 42H6Z', '#d38b3c') + P('M17 18V11Q24 5 31 11V18', 'none') + P('M19 26H29V32H19Z', '#f6ead0'),
  burst: (c = '#ff5a3a') => P('M24 4 29 15 41 9 35 21 46 26 35 30 40 42 28 35 22 46 19 34 6 38 14 27 3 20 16 18 12 6Z', c),
  boot: () => P('M12 6H26V26Q40 28 42 36V42H8V30Q12 26 12 6Z', '#4fb35a') + P('M8 38H42V43H8Z', '#e8eef5'),
  bolt: () => P('M28 4 10 27H22L18 44 38 20H26Z', '#ffd24a'),
  star: (c = '#ffd24a') => P('M24 4 30 17 44 18 33 28 37 42 24 34 11 42 15 28 4 18 18 17Z', c),
  skull: (c = '#f3ead8') => P('M8 22A16 16 0 0 1 40 22Q40 30 34 33V40H14V33Q8 30 8 22Z', c) + C(18, 23, 4.5, '#33221a') + C(30, 23, 4.5, '#33221a') + P('M4 12 10 16M44 12 38 16', 'none', 'stroke-width="6"'),
  talk: () => P('M6 8H42V32H24L14 42V32H6Z', '#fff') + [16, 24, 32].map((x) => `<circle cx="${x}" cy="20" r="2.6" fill="#33221a"/>`).join(''),
  home: () => P('M6 24 24 7 42 24H36V42H12V24Z', '#f6ead0') + P('M3 24 24 5 45 24', 'none', 'stroke-width="7"') + '<path d="M3 24 24 5 45 24" fill="none" stroke="#e5503f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' + P('M20 42V30H28V42Z', '#9a6a3f'),
  target: () => C(24, 24, 18, '#fff') + C(24, 24, 11, '#e5503f') + C(24, 24, 4, '#fff'),
  gift: () => P('M8 20H40V42H8Z', '#ff7fae') + P('M5 12H43V20H5Z', '#ff9cc1') + P('M21 12H27V42H21Z', '#fff3b0') + P('M24 12Q14 2 12 10 14 12 24 12 34 12 36 10 34 2 24 12Z', '#fff3b0'),
  backpack: () => P('M10 16Q10 6 24 6 38 6 38 16V40Q38 43 34 43H14Q10 43 10 40Z', '#5aa9e6') + P('M15 26H33V36H15Z', '#3b7fc0') + P('M19 6V3H29V6', 'none'),
  helmet: () => P('M8 28A16 16 0 0 1 40 28V36H30V26H18V36H8Z', '#ffb02e') + P('M22 6H26V14H22Z', '#e5503f'),
  rune: (c = '#6fd8ff') => P('M24 4 40 24 24 44 8 24Z', c) + '<path d="M24 14V34M18 20 30 28" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  dice: () => P('M8 8H40V40H8Z', '#fff') + [[16, 16], [32, 16], [24, 24], [16, 32], [32, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#33221a"/>`).join(''),
  gear: () => P('M20 4H28L29 10 34 12 39 8 44 14 40 19 42 24 46 27 44 35 38 35 35 39 36 45 28 46 25 41H21L17 45 9 42 11 36 8 32 2 31 3 23 9 21 11 16 7 11 13 6 18 10Z', '#9aa3b5') + C(24, 25, 7, '#4a2f22'),
  dagger: () => P('M34 4 42 12 22 32 14 24Z', '#e8eef5') + P('M10 24 22 36', 'none', 'stroke-width="7"') + '<path d="M10 24 22 36" stroke="#8f5ad9" stroke-width="3" stroke-linecap="round"/>' + P('M7 41 13 35', 'none', 'stroke-width="6"'),
  blunt: () => P('M8 40 24 24', 'none', 'stroke-width="8"') + '<path d="M8 40 24 24" stroke="#9a6a3f" stroke-width="4" stroke-linecap="round"/>' + C(30, 18, 12, '#8a93a6') + P('M30 2V8M44 18H38M30 34V28M16 18H22', 'none', 'stroke-width="5"'),
  crossbow: () => P('M8 40 34 14', 'none', 'stroke-width="8"') + '<path d="M8 40 34 14" stroke="#9a6a3f" stroke-width="4" stroke-linecap="round"/>' + P('M18 8Q40 8 40 30', 'none', 'stroke-width="6"') + '<path d="M18 8Q40 8 40 30" fill="none" stroke="#c7cedb" stroke-width="2.5"/>' + P('M34 14 42 6', 'none', 'stroke-width="4"'),
  gun: () => P('M6 14H42V24H26L24 30H16L12 42H5L9 24H6Z', '#6e7689') + P('M30 14V10H38V14', 'none'),
  staff: () => P('M8 42 30 20', 'none', 'stroke-width="7"') + '<path d="M8 42 30 20" stroke="#9a6a3f" stroke-width="3.5" stroke-linecap="round"/>' + C(33, 15, 10, '#6fd8ff') + SHINE,
  lock: () => P('M10 22H38V42H10Z', '#c9b991') + P('M16 22V15Q16 7 24 7 32 7 32 15V22', 'none', 'stroke-width="5"') + C(24, 31, 3.5, '#33221a'),
  hero: () => `<g ${O}><ellipse cx="24" cy="44" rx="14" ry="3" fill="#0003" stroke="none"/><path d="M15 26H33V38H27V44H21V38H15Z" fill="#ffb02e"/><path d="M8 27H15V36H8ZM33 27H40V36H33Z" fill="#8a5a3c"/><path d="M15 31H33V35H15Z" fill="#7a4a2c"/><rect x="14" y="6" width="20" height="20" rx="5" fill="#ffc94a"/><path d="M22 6H26V26H22Z" fill="#3f8ee0"/><path d="M19 2H29V7H19Z" fill="#7a5236"/></g>`,
};
const ITEM = { gold: ['coin'], gems: ['gem'], exp: ['drop', '#ff9a2e'], orb_red: ['orb', '#ff5a5a'], orb_pink: ['orb', '#ff7fd0'], orb_ice: ['orb', '#7fd8ff'], orb_jungle: ['orb', '#6fd36a'], orb_hell: ['orb', '#b04bff'],
  bluestone: ['crystal', '#5aa9ff'], crystal: ['crystal'], rune_dust: ['star', '#b7f0ff'], weapon_scroll: ['scroll'], wood: ['log'], stone: ['rock'], evo_coin: ['coin', '#c68bff'], attr_point: ['gem', '#6fd36a'], synergy_point: ['gem', '#ffb02e'],
  key_warrior: ['key', '#7fd8ff'], key_stier: ['key', '#c24bff'], key_special_hero: ['key', '#ffd24a'], hero_select_ticket: ['ticket', '#ff7fd0'], ticket_tower: ['ticket', '#8f7ad9'], ticket_invasion: ['ticket', '#5aa9e6'],
  ticket_raid: ['ticket', '#e5503f'], ticket_tomb: ['ticket', '#6fd8ff'], ticket_pvp: ['ticket', '#f0c14b'], invasion_coin: ['coin', '#5aa9e6'], raid_coin: ['coin', '#e5503f'], spin_ticket: ['ticket', '#4fd34a'],
  loot_c1: ['bag'], loot_c2: ['bag'], loot_c3: ['bag'] };
export function icon(name, color, size = 28) {
  // Farbe kann aus Content stammen -> nur echte Hex-Farben zulassen (kein Markup in das SVG)
  if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) color = undefined;
  const f = ICONS[name] || ICONS.star, e = document.createElement('span');
  e.className = 'ic'; e.style.width = e.style.height = size + 'px';
  e.innerHTML = `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${f(color || undefined)}</svg>`;
  return e;
}
export const itemIcon = (id, size) => { const m = id.startsWith('piece:') ? ['helmet'] : ITEM[id] || ['star']; return icon(m[0], m[1], size); };
export const STAT_ICON = { atk: 'sword', cargo: 'bag', hp: 'heart', regen: 'heartplus', critChance: 'burst', critDmg: 'burst', moveSpeedPct: 'boot', atkSpeedPct: 'bolt', multiHit: 'dagger', tripleHit: 'dagger', lifesteal: 'drop',
  skillDmgPct: 'staff', cooldownPct: 'bolt', goldPct: 'coin', xpPct: 'star', dmgPct: 'sword', bossDmgPct: 'skull', dropPct: 'gift', meleePct: 'blunt', rangedPct: 'crossbow', synergyPct: 'dice' };

// ---------------------------------------------------------------- Heldenfiguren (eigene Entwürfe): klobiger Körper, großer Kopf, Kopfschmuck je Held
const HAT = {
  none: () => '', scarf: (a) => `<path d="M17 36H47V43H40L44 52 36 44H17Z" fill="${a}" ${O}/>`,
  helm: (a) => `<path d="M14 26Q14 6 32 6 50 6 50 26V30H14Z" fill="#aab2c2" ${O}/><path d="M22 24H42V29H22Z" fill="#33221a"/><path d="M30 6Q34 -3 40 4 36 5 34 8Z" fill="${a}" ${O}/>`,
  cap: (a) => `<ellipse cx="32" cy="14" rx="23" ry="6" fill="${a}" ${O}/><path d="M20 14Q20 2 32 2 44 2 44 14Z" fill="${a}" ${O}/>`,
  horns: (a) => `<path d="M16 16Q4 12 5 2 12 8 19 9Z" fill="${a}" ${O}/><path d="M48 16Q60 12 59 2 52 8 45 9Z" fill="${a}" ${O}/>`,
  crown: (a) => `<path d="M19 13 21 2 27 9 32 1 37 9 43 2 45 13Z" fill="${a}" ${O}/>`,
  knot: (a) => `<path d="M29 10H35V38H29Z" fill="${a}"/><path d="M27 4H37V11H27Z" fill="#7a5236" ${O}/>`,
  halo: (a) => `<ellipse cx="32" cy="5" rx="13" ry="3.5" fill="none" stroke="#33221a" stroke-width="6"/><ellipse cx="32" cy="5" rx="13" ry="3.5" fill="none" stroke="${a}" stroke-width="3"/>`,
  ears: (a) => `<path d="M17 14 16 1 27 10Z" fill="#e8eef5" ${O}/><path d="M47 14 48 1 37 10Z" fill="#e8eef5" ${O}/><path d="M16 22H48V27H16Z" fill="${a}"/>`,
  flame: (a) => `<path d="M17 16Q12 2 22 6 24 -3 32 4 40 -4 42 6 52 2 47 16Z" fill="${a}" ${O}/>`,
  hood: (a) => `<path d="M11 40Q8 4 32 3 56 4 53 40H46V20Q46 13 32 13 18 13 18 20V40Z" fill="${a}" ${O}/>`,
  witch: (a) => `<path d="M8 15H56L50 19H14Z" fill="#3a2a55" ${O}/><path d="M19 15 34 -5 45 15Z" fill="#3a2a55" ${O}/><path d="M20 12H44V15H20Z" fill="${a}"/>`,
  hair: (a) => `<path d="M12 44Q8 6 32 5 56 6 52 44H45V16H19V44Z" fill="${a}" ${O}/>`,
};
const hexOk = (c, d) => (/^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : d);
export function heroArt(look, size = 64, dim = false) {
  const [b0, h0, hat, a0] = look || [], b = hexOk(b0, '#f5a524'), hd = hexOk(h0, '#ffc94a'), a = hexOk(a0, '#e5503f'), e = document.createElement('span');
  e.className = 'ic'; e.style.width = size + 'px'; e.style.height = Math.round(size * 1.125) + 'px';
  const back = hat === 'hair' || hat === 'hood' ? (HAT[hat] || HAT.none)(a) : '', front = hat === 'hair' || hat === 'hood' ? '' : (HAT[hat] || HAT.none)(a);
  e.innerHTML = `<svg viewBox="0 -6 64 72" width="${size}" height="${Math.round(size * 1.125)}" aria-hidden="true" ${dim ? 'style="filter:brightness(.35) saturate(.6)"' : ''}><ellipse cx="32" cy="63" rx="17" ry="3.5" fill="#0003"/>
    <path d="M22 54H30V63H22ZM34 54H42V63H34Z" fill="#7a4a2c" ${O}/>${back}
    <path d="M9 38H18V52H9ZM46 38H55V52H46Z" fill="${b}" ${O} style="filter:brightness(.82)"/><rect x="17" y="35" width="30" height="21" rx="5" fill="${b}" ${O}/><path d="M17 47H47V51H17Z" fill="#7a4a2c"/><rect x="29" y="46" width="6" height="6" rx="1" fill="#ffd24a" ${O}/>
    <rect x="15" y="9" width="34" height="29" rx="9" fill="${hd}" ${O}/><path d="M20 15Q24 11 30 11" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
    ${hat === 'helm' ? '' : '<rect x="23" y="23" width="4" height="6" rx="2" fill="#33221a"/><rect x="37" y="23" width="4" height="6" rx="2" fill="#33221a"/>'}${front}</svg>`;
  return e;
}
Object.assign(ICONS, {
  thumb: () => P('M8 22H16V42H8Z', '#fff') + P('M16 22 24 6Q30 6 29 14L27 20H38Q43 20 42 26L39 38Q38 42 33 42H16Z', '#fff'),
  back: () => P('M4 24 22 8V17H44V31H22V40Z', '#fff'),
  info: () => C(24, 24, 18, '#9aa3b5') + '<path d="M24 22V34" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="14" r="3" fill="#fff"/>',
  starf: (c = '#ffd24a') => P('M24 4 30 17 44 18 33 28 37 42 24 34 11 42 15 28 4 18 18 17Z', c),
});
