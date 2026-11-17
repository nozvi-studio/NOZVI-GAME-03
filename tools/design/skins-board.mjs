// tools/design/skins-board.mjs — writes docs/design/mockups/d3/skins.html (Characters screen direction study, P4a).
// Usage: npx esbuild src/game/art/capyRig.ts --bundle --format=esm --outfile=tmp/qa/skins/rig.mjs && node tools/design/skins-board.mjs
// Snake and Capy heads come from the game rig (headSvg). Ginger, Pup and Tuxedo are placeholder drawings on the same ART-001 anchors.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const rig = await import(pathToFileURL(resolve('tmp/qa/skins/rig.mjs')).href);
const url = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

// Placeholder head on the shared anchors: eyes (14.4, 20.4) / (33.6, 20.4), mouth y 37.6, face box 3.6..44.4 x 9.6..44.4.
function mockHead(p) {
  const eye = (cx) => `<circle cx="${cx}" cy="20.4" r="3.2" fill="#17261B"/><circle cx="${cx + 1}" cy="19.3" r="1.1" fill="#fff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient></defs>`
    + p.ears
    + `<rect x="3.6" y="9.6" width="40.8" height="34.8" rx="16.8" fill="url(#f)" stroke="${p.line}" stroke-width="2"/>`
    + (p.extra ?? '')
    + `<ellipse cx="9" cy="30" rx="4" ry="2.6" fill="#FF8FA3" opacity=".8"/><ellipse cx="39" cy="30" rx="4" ry="2.6" fill="#FF8FA3" opacity=".8"/>`
    + `<ellipse cx="24" cy="34.4" rx="9.6" ry="7" fill="${p.muzzle}" stroke="${p.line}" stroke-width="1.2"/>`
    + `<path d="M21.8 30.6h4.4l-2.2 2.6z" fill="${p.nose}" stroke="${p.line}" stroke-width=".8" stroke-linejoin="round"/>`
    + eye(14.4) + eye(33.6)
    + `<path d="M20.5 36.6Q22.3 38.8 24 36.6Q25.7 38.8 27.500 36.600" fill="none" stroke="${p.line}" stroke-width="1.400" stroke-linecap="round"/>`
    + (p.over ?? '') + `</svg>`;
}
const catEars = (fill, inner, line) => `<path d="M6 20L7 3.500L20 11z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M42 20L41 3.500L28 11z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M9.500 14L10 8l5 3z" fill="${inner}"/><path d="M38.500 14L38 8l-5 3z" fill="${inner}"/>`;
const whiskers = (line) => `<path d="M3 31l7 1.500M3 36l7-1M45 31l-7 1.500M45 36l-7-1" stroke="${line}" stroke-width="1" stroke-linecap="round" fill="none"/>`;

const SKINS = [
  { id: 'snake', name: 'Mango', full: 'Mango Snake', rarity: 'Default', price: 0, state: 'equipped', body: '#6F7DFF', line: '#2B3A8F', disc: ['#DCE4FF', '#B9C6FF'], perk: 'The classic. Eyes follow the food.', head: rig.headSvg('snake', 'idle') },
  { id: 'ginger', name: 'Ginger', full: 'Ginger Cat', rarity: 'Common', price: 300, state: 'owned', body: '#F6A04D', line: '#7A3E12', disc: ['#FFE9CF', '#FFD0A0'], perk: 'Orange cat energy. One brain cell.',
    head: mockHead({ top: '#FFB866', bottom: '#F6A04D', line: '#7A3E12', muzzle: '#FFF4E3', nose: '#FF8FA3', ears: catEars('#F6A04D', '#FFC9D4', '#7A3E12'), extra: `<path d="M20 10.500v5M24 10v6.500M28 10.500v5" stroke="#C96F1E" stroke-width="2" stroke-linecap="round"/>`, over: whiskers('#7A3E12') }) },
  { id: 'pup', name: 'Pup', full: 'Pup', rarity: 'Common', price: 300, state: 'buy', body: '#E9C48F', line: '#6B4423', disc: ['#FFF3C9', '#FFE08A'], perk: 'Good boy. Will chase every mango.',
    head: mockHead({ top: '#F4D9AE', bottom: '#E9C48F', line: '#6B4423', muzzle: '#FFF7EA', nose: '#3A2414', ears: `<path d="M7 12c-6 2-7 14-3 20 3 3 7 0 7-5V14z" fill="#9A6236" stroke="#6B4423" stroke-width="2" stroke-linejoin="round"/><path d="M41 12c6 2 7 14 3 20-3 3-7 0-7-5V14z" fill="#9A6236" stroke="#6B4423" stroke-width="2" stroke-linejoin="round"/>` }) },
  { id: 'tuxedo', name: 'Tuxedo', full: 'Tuxedo Cat', rarity: 'Common', price: 300, state: 'buy', body: '#4A5266', line: '#1B1F2A', disc: ['#E3E6F2', '#C4CADD'], perk: 'Dressed for dinner. Dinner is mango.',
    head: mockHead({ top: '#59627A', bottom: '#454D63', line: '#1B1F2A', muzzle: '#FFFFFF', nose: '#FF8FA3', ears: catEars('#454D63', '#FFC9D4', '#1B1F2A'), extra: `<path d="M24 11c3 4 4 9 4 14h-8c0-5 1-10 4-14z" fill="#fff"/>`, over: whiskers('#1B1F2A') }) },
  { id: 'capy', name: 'Capy', full: 'Capybara', rarity: 'Rare', price: 800, state: 'buy', body: '#C79A6B', line: '#4A2E1B', disc: ['#DDF3D6', '#B7E3AC'], perk: 'Sparkle bite · Leaf trail', head: rig.headSvg('capy', 'idle') },
];
const COINS = 120;
const img = (s, px, cls = '') => `<img class="${cls}" src="${url(s.head)}" width="${px}" height="${px}" alt="">`;
const coin = (px = 18) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FFC21A" stroke="#8A4500" stroke-width="2.4"/><circle cx="12" cy="12" r="5.600" fill="none" stroke="#8A4500" stroke-width="2" opacity=".55"/></svg>`;
const use = (id, px = 24) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24"><use href="#${id}"/></svg>`;
const top = (title = 'CHARACTERS') => `<div class="rays dim"></div>
  <div class="round abs" style="left:12px;top:12px">${use('ic-back')}</div>
  <div class="disp abs c" style="left:66px;right:96px;top:15px;font-size:27px">${title}</div>
  <div class="chip abs" style="right:10px;top:16px;height:40px">${coin(22)}${COINS}</div>`;
const rarityChip = (s) => `<span class="chip sm rar ${s.rarity.toLowerCase()}">${s.rarity === 'Rare' ? '★ ' : ''}${s.rarity}</span>`;

// Hero: snake-style tube body with the head on top; the body colour is the skin's block colour (GDD 8.3).
function hero(s, w = 250, h = 150, headPx = 112) {
  return `<div class="hero" style="width:${w}px;height:${h}px">
    <svg class="abs" style="left:0;top:0" width="${w}" height="${h}" viewBox="0 0 250 150">
      <ellipse cx="125" cy="132" rx="96" ry="12" fill="rgba(11,53,96,.28)"/>
      <path d="M22 118h46c20 0 20-34 44-34h28" fill="none" stroke="${s.line}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 118h46c20 0 20-34 44-34h28" fill="none" stroke="${s.body}" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 110h42c15 0 17-30 40-33" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="6" stroke-linecap="round"/>
    </svg>
    ${s.rarity === 'Rare' ? `<i class="spark" style="left:36px;top:18px"></i><i class="spark s2" style="right:22px;top:40px"></i><i class="spark s3" style="right:60px;top:4px"></i>` : ''}
    <div class="abs bob" style="left:${(w - headPx) / 2 + 22}px;top:${h - headPx - 24}px">${img(s, headPx)}</div>
  </div>`;
}
function action(s) {
  if (s.state === 'equipped') return `<div class="btn mid light disabled abs act"><span class="lil" style="font-size:24px">${use('ic-check', 22)} Equipped</span></div>`;
  if (s.state === 'owned') return `<div class="btn mid primary abs act attn"><span>EQUIP</span></div>`;
  if (COINS >= s.price) return `<div class="btn mid primary abs act"><span>BUY ${s.price}</span></div>`;
  return `<div class="btn mid abs act disabled"><span class="lil" style="font-size:21px">${use('ic-lock', 20)} Need ${s.price - COINS} more ${coin(20)}</span></div>`;
}
const badge = (s) => s.state === 'equipped' ? `<b class="bdg ok">${use('ic-check', 14)}</b>` : s.state === 'buy' ? `<b class="bdg lock">${use('ic-lock', 12)}</b>` : '';
const sub = (s) => s.state === 'equipped' ? 'Equipped' : s.state === 'owned' ? 'Owned' : `${coin(13)}${s.price}`;

// A: stage + shelf
function frameA(sel) {
  const s = SKINS[sel];
  const tokens = SKINS.map((k, i) => `<div class="tok ${i === sel ? 'selected' : ''} ${k.state}" style="--d0:${k.disc[0]};--d1:${k.disc[1]}">${img(k, 46)}${badge(k)}<em>${sub(k)}</em></div>`).join('')
    + `<div class="tok soon"><span class="lil">?</span><em>Soon</em></div>`;
  return `<div class="phone a">${top()}
    <div class="abs glow" style="left:30px;right:30px;top:74px;height:230px"></div>
    <div class="abs" style="left:55px;top:84px">${hero(s)}</div>
    <div class="abs podium" style="left:60px;right:60px;top:222px"></div>
    <svg class="abs" style="left:72px;top:250px" width="216" height="56"><use href="#ribbon" width="216" height="56"/></svg>
    <div class="disp abs c" style="left:72px;right:72px;top:259px;font-size:24px;--ol:#9C1F3F">${s.full}</div>
    <div class="abs c" style="left:20px;right:20px;top:312px">${rarityChip(s)}<span class="perk onblue">${s.perk}</span></div>
    <div class="panel abs shelf" style="left:10px;right:10px;top:372px;height:132px"><div class="lab shelfh">TAP TO PREVIEW · ${SKINS.filter(k => k.state !== 'buy').length}/${SKINS.length} OWNED</div><div class="toks">${tokens}</div></div>
    ${action(s)}
  </div>`;
}
// B: card grid
function frameB(sel) {
  const s = SKINS[sel];
  const cards = SKINS.map((k, i) => `<div class="card ${i === sel ? 'selected' : ''} ${k.rarity.toLowerCase()}"><div class="pic" style="--d0:${k.disc[0]};--d1:${k.disc[1]}">${img(k, 58)}</div>${badge(k)}<b>${k.name}</b><em>${sub(k)}</em></div>`).join('')
    + `<div class="card soon"><div class="pic"><span class="lil">?</span></div><b>Coming</b><em>Soon</em></div>`;
  return `<div class="phone a">${top()}
    <div class="panel abs" style="left:10px;right:10px;top:72px;height:128px;overflow:hidden">
      <div class="abs" style="left:-6px;top:-2px;transform:scale(.8);transform-origin:0 0">${hero(s, 250, 150, 104)}</div>
      <div class="abs" style="left:196px;right:10px;top:22px"><div class="lil" style="font-size:22px;line-height:1.05">${s.full}</div><div style="margin-top:8px">${rarityChip(s)}</div><div style="font-size:11px;font-weight:800;color:#48688A;margin-top:8px;line-height:1.25">${s.perk}</div></div>
    </div>
    <div class="abs grid" style="left:10px;right:10px;top:212px">${cards}</div>
    ${action(s)}
  </div>`;
}
// C: one skin per page with an in-game strip
function frameC(sel) {
  const s = SKINS[sel];
  const cells = Array.from({ length: 27 }, (_, i) => `<i style="background:${(i + Math.floor(i / 9)) % 2 ? '#9BD86B' : '#8CCB5E'}"></i>`).join('');
  const dots = SKINS.map((_, i) => `<i class="${i === sel ? 'on' : ''}"></i>`).join('');
  return `<div class="phone a">${top()}
    <div class="abs glow" style="left:10px;right:10px;top:70px;height:260px"></div>
    <div class="abs" style="left:34px;top:74px;transform:scale(1.16);transform-origin:0 0">${hero(s)}</div>
    <div class="round abs" style="left:8px;top:150px;width:42px;height:42px">${use('ic-back', 20)}</div>
    <div class="round abs" style="right:8px;top:150px;width:42px;height:42px;transform:scaleX(-1)">${use('ic-back', 20)}</div>
    <div class="disp abs c" style="left:20px;right:20px;top:258px;font-size:30px">${s.full}</div>
    <div class="abs c" style="left:20px;right:20px;top:300px">${rarityChip(s)}<span class="perk onblue">${s.perk}</span></div>
    <div class="abs dots" style="left:0;right:0;top:356px">${dots}</div>
    <div class="panel abs" style="left:10px;right:10px;top:376px;height:138px;padding:8px 10px"><div class="lab" style="color:#48688A;margin-bottom:5px">IN THE GAME</div>
      <div class="strip">${cells}
        <svg class="abs" style="left:0;top:0" width="315" height="105" viewBox="0 0 315 105"><path d="M35 87.500h70v-35h87.500" fill="none" stroke="${s.line}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path d="M35 87.500h70v-35h87.500" fill="none" stroke="${s.body}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(262.500 52.500) scale(30)"><use href="#mango" fill="#FFAB1A" stroke="#8A4500" stroke-width=".07"/></g></svg>
        <div class="abs" style="left:165px;top:25px">${img({ head: s.id === 'snake' || s.id === 'capy' ? rig.headSvg(s.id, 'eat_open') : s.head }, 56)}</div>
        ${s.rarity === 'Rare' ? `<i class="spark" style="left:232px;top:18px"></i><i class="spark s2" style="left:78px;top:60px"></i><i class="spark s3" style="left:40px;top:70px"></i>` : ''}
      </div></div>
    ${action(s)}
  </div>`;
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mango Snake · Characters directions</title>
<link rel="stylesheet" href="d3.css">
<style>
.c { text-align: center; }
.a .act { left: 16px; right: 16px; bottom: 26px; }
.a .act span { display: inline-flex; align-items: center; gap: 7px; }
.a .glow { background: radial-gradient(closest-side, rgba(255,255,255,.55), rgba(255,255,255,0)); }
.a .hero { position: relative; }
.a .bob { animation: bob 2.4s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-7px) rotate(2deg); } }
.a .podium { height: 30px; border-radius: 50%; background: linear-gradient(#FFF6D6, #FFE08A); border: 3px solid var(--tone-secondary-line); box-shadow: 0 6px 0 var(--tone-secondary-lip), 0 12px 14px rgba(0,40,90,.3); }
.a .spark { position: absolute; width: 16px; height: 16px; background: #FFE36B; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); filter: drop-shadow(0 0 3px #fff); animation: tw 1.6s ease-in-out infinite; }
.a .spark.s2 { width: 11px; height: 11px; animation-delay: .5s; } .a .spark.s3 { width: 9px; height: 9px; animation-delay: 1s; }
@keyframes tw { 0%,100% { transform: scale(.5); opacity: .5; } 50% { transform: scale(1.15); opacity: 1; } }
.a .perk { display: block; margin-top: 7px; font-size: 13px; }
.a .chip.rar { height: 26px; font-size: 12px; padding: 0 11px; letter-spacing: .5px; }
.a .chip.rar.rare { background: linear-gradient(var(--tone-skillA-face-0), var(--tone-skillA-face-1)); border-color: var(--tone-skillA-line); box-shadow: 0 3px 0 var(--tone-skillA-lip); color: #fff; }
.a .chip.rar.default { background: linear-gradient(var(--tone-primary-face-0), var(--tone-primary-face-1)); border-color: var(--tone-primary-line); box-shadow: 0 3px 0 var(--tone-primary-lip); color: #fff; }
.a .shelfh { color: #48688A; text-align: center; padding-top: 9px; font-size: 11px; }
.a .toks { display: flex; justify-content: space-between; padding: 10px 9px 0; }
.a .tok { position: relative; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(var(--d0, #E9F1F7), var(--d1, #C9D6E2)); border: 3px solid var(--ink); box-shadow: 0 4px 0 var(--ink-deep); display: grid; place-items: center; }
.a .tok img { margin-top: -2px; }
.a .tok em, .a .card em { font-style: normal; font-size: 11px; font-weight: 900; color: var(--text); display: inline-flex; gap: 2px; align-items: center; justify-content: center; white-space: nowrap; }
.a .tok em { position: absolute; top: 57px; left: -12px; right: -12px; }
.a .tok.selected { transform: translateY(-4px) scale(1.12); outline: 4px solid var(--logo-mango); }
.a .tok.buy img { filter: saturate(.55) brightness(.92); }
.a .tok.soon { color: var(--tone-off-text); font-size: 24px; border-color: var(--tone-off-line); box-shadow: 0 4px 0 var(--tone-off-lip); }
.a .tok.soon em { color: #6F8499; }
.a .bdg { position: absolute; right: -7px; top: -7px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; color: #fff; border: 2.500px solid var(--tone-primary-line); background: var(--tone-primary-face-1); }
.a .bdg.lock { background: var(--tone-off-face-1); border-color: var(--tone-off-line); color: var(--tone-off-text); }
.a .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.a .card { position: relative; border-radius: 18px; background: linear-gradient(var(--tone-light-face-0), var(--tone-light-face-1)); border: 3px solid var(--ink); box-shadow: 0 4px 0 var(--ink-deep); padding: 6px 6px 7px; text-align: center; height: 132px; }
.a .card.rare { border-color: var(--tone-skillA-line); box-shadow: 0 4px 0 var(--tone-skillA-lip); }
.a .card .pic { height: 76px; border-radius: 12px; background: linear-gradient(var(--d0, #E9F1F7), var(--d1, #C9D6E2)); display: grid; place-items: center; color: var(--tone-off-text); font-size: 34px; }
.a .card b { display: block; font-family: Lilita, sans-serif; font-weight: 400; font-size: 16px; margin-top: 4px; line-height: 1.1; }
.a .card.soon { border-color: var(--tone-off-line); box-shadow: 0 4px 0 var(--tone-off-lip); color: var(--tone-off-text); }
.a .card .bdg { right: -6px; top: -8px; }
.a .dots { display: flex; gap: 7px; justify-content: center; }
.a .dots i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.45); border: 2px solid var(--ink-deep); }
.a .dots i.on { background: var(--logo-mango); width: 22px; border-radius: 6px; }
.a .strip { position: relative; width: 315px; height: 105px; display: grid; grid-template-columns: repeat(9, 35px); grid-auto-rows: 35px; border-radius: 10px; overflow: hidden; outline: 3px solid #4E8A2E; }
.note { color: #b9b5aa; font-size: 13px; max-width: 360px; line-height: 1.45; margin-top: 10px; }
</style></head><body>
<h1>Mango Snake · Characters screen directions (P4a)</h1>
<p class="lead">Three directions for the Characters (skins) screen in the D3 "Juicy" language, 360×640. Replaces the flat <code>SkinsD3</code> / <code>SkinBuyD2</code> boards. Snake and Capy heads are the game rig; Ginger, Pup and Tuxedo are placeholder drawings on the same anchors. Mock data: 120 coins, Mango equipped, Ginger owned. Mockups only.</p>
<svg width="0" height="0" style="position:absolute"><defs>
  <g id="mango"><path d="M0-.36c.3 0 .44.2.44.42 0 .26-.2.4-.44.4s-.44-.14-.44-.4C-.44-.16-.3-.36 0-.36z"/></g>
  <g id="ic-back"><path d="M13 5l-7 7 7 7M6 12h13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g id="ic-lock"><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></g>
  <g id="ic-check"><path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
  <symbol id="ribbon" viewBox="0 0 176 56"><path d="M4 10h168l-12 20 12 20H4l12-20z" fill="#0F4578"/><path d="M8 6h160l-12 20 12 20H8l12-20z" fill="#FF5A7A" stroke="#9C1F3F" stroke-width="3"/></symbol>
</defs></svg>
<section class="board" id="A"><h2>A · Stage + shelf</h2><p>The character stands on a podium and moves (idle bob, blink, Rare sparkles). One row of round tokens under it: tap = preview on the stage. One big action button whose label is the state (Equipped / EQUIP / BUY 300 / Need 680 more).</p>
  <div class="frames"><div>${frameA(0)}<div class="cap">A1 equipped</div></div><div>${frameA(1)}<div class="cap">A2 owned, not equipped</div></div><div>${frameA(4)}<div class="cap">A3 Rare, not enough coins</div></div></div></section>
<section class="board" id="B"><h2>B · Card grid</h2><p>Closest to the old board: compact hero panel, 3-column grid of cards (Rare cards get a purple frame), same action button. Shows the most skins at once; the character is small.</p>
  <div class="frames"><div>${frameB(0)}<div class="cap">B1 equipped</div></div><div>${frameB(4)}<div class="cap">B2 Rare, not enough coins</div></div></div></section>
<section class="board" id="C"><h2>C · One skin per page + in-game strip</h2><p>Swipe or tap the arrows to change skin. The panel shows the skin on a real board strip (body colour, eating face, Rare effect), so the player sees what they buy. Slowest for browsing many skins.</p>
  <div class="frames"><div>${frameC(0)}<div class="cap">C1 equipped</div></div><div>${frameC(4)}<div class="cap">C2 Rare, not enough coins</div></div></div></section>
</body></html>
`;
writeFileSync('docs/design/mockups/d3/skins.html', html);
console.log('wrote docs/design/mockups/d3/skins.html', html.length);
