// Mystic Art Direction: glossy cartoon inline SVGs for buttons, wordmark, titles, Settings & mango. Pure: no Phaser.
import type { SettingsToggle } from '../flow/settingsView';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type MysticBtnIcon = 'crown' | 'settings' | 'back';

const BTN_ICONS: Record<MysticBtnIcon, string> = {
  // Plump glossy royal crown with warm gold-teal accents & specular shine
  crown: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" class="d4-mystic-btn-svg" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="mb-cr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE45E"/><stop offset="55%" stop-color="#FFB800"/><stop offset="100%" stop-color="#E68600"/></linearGradient>',
    '</defs>',
    '<path d="M5.5 22.5L4.2 11.8c-.2-1.4 1.3-2.3 2.5-1.5l4.8 3.5L14.6 8c.6-1.2 2.2-1.2 2.8 0l3.1 5.8 4.8-3.5c1.2-.8 2.7.1 2.5 1.5l-1.3 10.7a2.5 2.5 0 0 1-2.5 2.2H8a2.5 2.5 0 0 1-2.5-2.2Z" fill="url(#mb-cr-g)" stroke="#093E43" stroke-width="2.4" stroke-linejoin="round"/>',
    '<path d="M8.5 21.5h15" stroke="#FFF4B0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>',
    '<circle cx="16" cy="17.2" r="2.1" fill="#2DD4CF" stroke="#093E43" stroke-width="1.6"/>',
    '<circle cx="10.2" cy="18.2" r="1.4" fill="#FF6B8B"/>',
    '<circle cx="21.8" cy="18.2" r="1.4" fill="#FF6B8B"/>',
    '</svg>',
  ].join(''),
  // Plump glossy 6-tooth casual-game gear with soft rounded lobes & specular highlight
  settings: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" class="d4-mystic-btn-svg" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="mb-gr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5CEAE2"/><stop offset="60%" stop-color="#26B8B4"/><stop offset="100%" stop-color="#14858A"/></linearGradient>',
    '</defs>',
    '<path d="M13.3 4.6c.4-1.3 1.4-1.8 2.7-1.8s2.3.5 2.7 1.8l.4 1.5c.8.2 1.5.5 2.2.9l1.4-.7c1.2-.6 2.3-.3 3.2.6s1.2 2 .6 3.2l-.7 1.4c.4.7.7 1.4.9 2.2l1.5.4c1.3.4 1.8 1.4 1.8 2.7s-.5 2.3-1.8 2.7l-1.5.4c-.2.8-.5 1.5-.9 2.2l.7 1.4c.6 1.2.3 2.3-.6 3.2s-2 1.2-3.2.6l-1.4-.7c-.7.4-1.4.7-2.2.9l-.4 1.5c-.4 1.3-1.4 1.8-2.7 1.8s-2.3-.5-2.7-1.8l-.4-1.5c-.8-.2-1.5-.5-2.2-.9l-1.4.7c-1.2.6-2.3.3-3.2-.6s-1.2-2-.6-3.2l.7-1.4c-.4-.7-.7-1.4-.9-2.2l-1.5-.4c-1.3-.4-1.8-1.4-1.8-2.7s.5-2.3 1.8-2.7l1.5-.4c.2-.8.5-1.5.9-2.2l-.7-1.4c-.6-1.2-.3-2.3.6-3.2s2-1.2 3.2-.6l1.4.7c.7-.4 1.4-.7 2.2-.9l.4-1.5Z" fill="url(#mb-gr-g)" stroke="#093E43" stroke-width="2.3" stroke-linejoin="round"/>',
    '<circle cx="16" cy="16" r="4.6" fill="#E8FAF9" stroke="#093E43" stroke-width="2.3"/>',
    '<path d="M12.2 8.4a8.2 8.2 0 0 1 7.6 0" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>',
    '</svg>',
  ].join(''),
  // Chunky rounded left arrow matching settings.png & character.png
  back: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26" class="d4-mystic-btn-svg" aria-hidden="true">',
    '<defs><linearGradient id="mb-bk-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5CEAE2"/><stop offset="100%" stop-color="#199696"/></linearGradient></defs>',
    '<path d="M15.2 7.5L6.5 16l8.7 8.5c1.1 1 2.8.2 2.8-1.3V19h6.5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H18V8.8c0-1.5-1.7-2.3-2.8-1.3Z" fill="url(#mb-bk-g)" stroke="#093E43" stroke-width="2.4" stroke-linejoin="round"/>',
    '</svg>',
  ].join(''),
};

export function mysticButtonIcon(kind: MysticBtnIcon): string {
  return BTN_ICONS[kind];
}

export function mysticPlayIcon(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="26" height="26" class="d4-mystic-play-svg" aria-hidden="true">',
    '<path d="M7 5.2L22.5 14 7 22.8c-1.3.7-2.8-.2-2.8-1.7V6.9C4.2 5.4 5.7 4.5 7 5.2Z" fill="#FFFFFF" stroke="#164400" stroke-width="2.8" stroke-linejoin="round"/>',
    '</svg>',
  ].join('');
}

// Chunky rounded-stroke SVG wordmark (MANGO / SNAKE) matching main-menu.png
export function mysticWordmarkSvg(top: string, bot: string): string {
  const tTop = esc(top);
  const tBot = esc(bot);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 132" class="d4-mystic-wordmark-svg" role="img" aria-label="', tTop, ' ', tBot, '">',
    '<defs>',
    '<linearGradient id="ms-wm-gold" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#FFF275"/>',
    '<stop offset="48%" stop-color="#FFD028"/>',
    '<stop offset="100%" stop-color="#F59700"/>',
    '</linearGradient>',
    '</defs>',
    '<text x="170" y="69" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="74" letter-spacing="1" fill="#073238" stroke="#073238" stroke-width="16" stroke-linejoin="round" paint-order="stroke fill">', tTop, '</text>',
    '<text x="170" y="124" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="66" letter-spacing="1.5" fill="#073238" stroke="#073238" stroke-width="15" stroke-linejoin="round" paint-order="stroke fill">', tBot, '</text>',
    '<text x="170" y="63" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="74" letter-spacing="1" fill="url(#ms-wm-gold)" stroke="#0A3E44" stroke-width="15" stroke-linejoin="round" paint-order="stroke fill">', tTop, '</text>',
    '<text x="170" y="118" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="66" letter-spacing="1.5" fill="#FFFFFF" stroke="#0A3E44" stroke-width="14" stroke-linejoin="round" paint-order="stroke fill">', tBot, '</text>',
    '</svg>',
  ].join('');
}

export function mysticBoltIcon(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="26" height="26" class="d4-mystic-btn-svg" aria-hidden="true">',
    '<path d="M16 3.5L6.5 15.5h6.5L11.5 24.5 21.5 12.5H15L16 3.5Z" fill="#FFFFFF" stroke="#006B8F" stroke-width="2.2" stroke-linejoin="round"/>',
    '</svg>',
  ].join('');
}

// Chunky rounded-stroke SVG page title (SETTINGS / CHARACTERS / GAME OVER / LOADOUT)
export function mysticPageTitleSvg(text: string, tone: 'white' | 'gold' | 'green' = 'white'): string {
  const safe = esc(text.toUpperCase());
  const fill = tone === 'gold' ? 'url(#ms-pt-gold)' : tone === 'green' ? 'url(#ms-pt-green)' : '#FFFFFF';
  const defs = tone === 'gold'
    ? '<defs><linearGradient id="ms-pt-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF275"/><stop offset="55%" stop-color="#FFD028"/><stop offset="100%" stop-color="#F59700"/></linearGradient></defs>'
    : tone === 'green'
      ? '<defs><linearGradient id="ms-pt-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B8FF5C"/><stop offset="55%" stop-color="#6CE014"/><stop offset="100%" stop-color="#43A800"/></linearGradient></defs>'
      : '';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" class="d4-mystic-title-svg" aria-hidden="true">',
    defs,
    '<text x="160" y="46" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="42" letter-spacing="1" fill="#073238" stroke="#073238" stroke-width="12" stroke-linejoin="round" paint-order="stroke fill">', safe, '</text>',
    '<text x="160" y="41" text-anchor="middle" font-family="Lilita One, Nunito, sans-serif" font-size="42" letter-spacing="1" fill="', fill, '" stroke="#0A3E44" stroke-width="11" stroke-linejoin="round" paint-order="stroke fill">', safe, '</text>',
    '</svg>',
  ].join('');
}

const SETTING_ICONS: Record<SettingsToggle, string> = {
  sound: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" class="d4-mystic-svg" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="ms-spk-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE047"/><stop offset="65%" stop-color="#FF9F1C"/><stop offset="100%" stop-color="#F2545B"/></linearGradient>',
    '<linearGradient id="ms-spk-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5CE1E6"/><stop offset="100%" stop-color="#2589BD"/></linearGradient>',
    '</defs>',
    '<rect x="4" y="14" width="8" height="12" rx="3.5" fill="url(#ms-spk-cap)" stroke="#0A3E44" stroke-width="2.4"/>',
    '<path d="M11 14L22 7.5c1.6-.9 3.5.2 3.5 2v21c0 1.8-1.9 2.9-3.5 2L11 26V14Z" fill="url(#ms-spk-body)" stroke="#0A3E44" stroke-width="2.4" stroke-linejoin="round"/>',
    '<path d="M25.5 16.5a3.5 3.5 0 0 1 0 7" fill="#46D6E8" stroke="#0A3E44" stroke-width="2.2"/>',
    '<path d="M13 15.5l8-4.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.55"/>',
    '<path d="M30 14.2a8 8 0 0 1 0 11.6" fill="none" stroke="#1E9E9A" stroke-width="2.8" stroke-linecap="round"/>',
    '<path d="M34 10.6a13 13 0 0 1 0 18.8" fill="none" stroke="#1E9E9A" stroke-width="2.8" stroke-linecap="round"/>',
    '</svg>',
  ].join(''),
  haptics: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" class="d4-mystic-svg" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="ms-ph-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#B084E8"/><stop offset="100%" stop-color="#6B469C"/></linearGradient>',
    '<linearGradient id="ms-ph-scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E0FCFF"/><stop offset="100%" stop-color="#7AE7F5"/></linearGradient>',
    '</defs>',
    '<g transform="rotate(-14 20 20)">',
    '<rect x="11" y="5" width="18" height="30" rx="4.5" fill="url(#ms-ph-body)" stroke="#0A3E44" stroke-width="2.4"/>',
    '<rect x="14" y="9" width="12" height="19" rx="2" fill="url(#ms-ph-scr)" stroke="#0A3E44" stroke-width="2"/>',
    '<path d="M15.5 11.5l7.5 0" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.75"/>',
    '<circle cx="20" cy="31.5" r="1.5" fill="#0A3E44"/>',
    '</g>',
    '<path d="M6.5 12c-1.8 2.2-1.8 4.4 0 6.5s1.8 4.3 0 6.5" fill="none" stroke="#1E9E9A" stroke-width="2.6" stroke-linecap="round"/>',
    '<path d="M33.5 14c1.8 2.2 1.8 4.4 0 6.5s-1.8 4.3 0 6.5" fill="none" stroke="#1E9E9A" stroke-width="2.6" stroke-linecap="round"/>',
    '</svg>',
  ].join(''),
  dpad: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" class="d4-mystic-svg" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="ms-dp-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D7F3F2"/><stop offset="100%" stop-color="#85BFC2"/></linearGradient>',
    '</defs>',
    '<path d="M14.5 5h11a2 2 0 0 1 2 2v7.5H35a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7.5V33a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h7.5V7a2 2 0 0 1 2-2Z" fill="url(#ms-dp-bg)" stroke="#0A3E44" stroke-width="2.4" stroke-linejoin="round"/>',
    '<circle cx="20" cy="20" r="3.4" fill="#6BA4AA"/>',
    '<path d="M20 8.5l2.8 4h-5.6Z" fill="#0A3E44"/>',
    '<path d="M20 31.5l2.8-4h-5.6Z" fill="#0A3E44"/>',
    '<path d="M8.5 20l4-2.8v5.6Z" fill="#0A3E44"/>',
    '<path d="M31.5 20l-4-2.8v5.6Z" fill="#0A3E44"/>',
    '</svg>',
  ].join(''),
  reducedMotion: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" class="d4-mystic-svg" aria-hidden="true">',
    '<path d="M14 9l1.8 4.7L20.5 15.5l-4.7 1.8L14 22l-1.8-4.7-4.7-1.8 4.7-1.8Z" fill="#FFD43B" stroke="#9A4800" stroke-width="1.8" stroke-linejoin="round"/>',
    '<path d="M22.5 5.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" fill="#FFE066" stroke="#9A4800" stroke-width="1.4" stroke-linejoin="round"/>',
    '<path d="M7.5 19.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z" fill="#FFB800" stroke="#9A4800" stroke-width="1.4" stroke-linejoin="round"/>',
    '<path d="M9 32L32 9" stroke="#0A3E44" stroke-width="3.2" stroke-linecap="round"/>',
    '<path d="M23.5 23.5l8 8M31.5 23.5l-8 8" stroke="#0A3E44" stroke-width="3.6" stroke-linecap="round"/>',
    '</svg>',
  ].join(''),
};

export function mysticSettingIcon(id: SettingsToggle): string {
  return SETTING_ICONS[id];
}

export function mysticMangoIcon(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="60" height="60" class="d4-mystic-mango-svg" aria-hidden="true">',
    '<defs>',
    '<radialGradient id="ms-mango-g" cx="38%" cy="32%" r="65%"><stop offset="0%" stop-color="#FFF380"/><stop offset="48%" stop-color="#FFD43B"/><stop offset="100%" stop-color="#F08C00"/></radialGradient>',
    '</defs>',
    '<path d="M35 12c1.2-3.5 3.6-5.2 6-5.5" fill="none" stroke="#6B3800" stroke-width="3.5" stroke-linecap="round"/>',
    '<path d="M35 13c11 0 18.5 8 17.5 19.5C51.4 45 40.5 54 27 54c-9.5 0-15-5.8-13.5-13.2 1.2-6 5.5-8.5 6.8-14.2C21.8 19.5 26.8 13 35 13Z" fill="url(#ms-mango-g)" stroke="#9A4800" stroke-width="3" stroke-linejoin="round"/>',
    '<path d="M26 23c2-3.8 6.2-6.2 10.5-5.8" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" opacity="0.72"/>',
    '<circle cx="24.5" cy="27.5" r="2.1" fill="#FFFFFF" opacity="0.78"/>',
    '<path d="M16 14l1.2 3.2L20.4 18.4l-3.2 1.2L16 22.8l-1.2-3.2-3.2-1.2 3.2-1.2Z" fill="#FFF8CC"/>',
    '<path d="M51 39l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z" fill="#FFF8CC"/>',
    '<circle cx="11" cy="33" r="1.8" fill="#FFE66D"/>',
    '</svg>',
  ].join('');
}
