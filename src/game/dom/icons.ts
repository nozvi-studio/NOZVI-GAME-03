// D4-P1-R5 inline SVG icon kit (Phosphor Bold/Duotone + Fluent Flat style). Pure: no Phaser.
export const ICON_NAMES = [
  'back', 'settings', 'characters', 'coin', 'lock', 'check', 'star', 'trophy',
  'flag', 'bolt', 'play', 'pause', 'home', 'sound', 'haptics', 'dpad',
  'motion', 'mango', 'clock', 'scissors', 'shield', 'rain',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
export interface IconOpts { size?: number; label?: string; className?: string }

// D4-P1-R5 base grid
const ICON_SIZE = 24;

const PATHS: Record<IconName, string> = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  settings: '<circle cx="12" cy="12" r="3.2" fill="currentColor" fill-opacity="0.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/><circle cx="12" cy="12" r="5.5"/>',
  characters: '<path d="M3.5 17.5L5.5 7.5l4.2 3.8L12 5.5l2.3 5.8 4.2-3.8 2 10H3.5Z" fill="currentColor" fill-opacity="0.22"/><path d="M4.5 20h15"/>',
  coin: '<circle cx="12" cy="12" r="9" style="fill:var(--d4-gold-face);stroke:var(--d4-gold-lip)"/><circle cx="12" cy="12" r="5.2" style="stroke:var(--d4-gold-ink)" fill="none"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="3" fill="currentColor" fill-opacity="0.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2Z" fill="currentColor" fill-opacity="0.22"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" fill="currentColor" fill-opacity="0.22"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v5M8.5 19h7"/>',
  flag: '<path d="M6 21V4"/><path d="M6 5h11l-2.5 4L17 13H6" fill="currentColor" fill-opacity="0.22"/>',
  bolt: '<path d="M13.5 2.8L5.5 13h5.5l-1 8.2L18.5 11H13l.5-8.2Z" fill="currentColor" fill-opacity="0.25"/>',
  play: '<path d="M7 5.2L19 12 7 18.8V5.2Z" fill="currentColor"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/>',
  home: '<path d="M4 11l8-6.5L20 11v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V11Z" fill="currentColor" fill-opacity="0.18"/><path d="M9.5 21v-6h5v6"/>',
  sound: '<path d="M4.5 9.5h4l5-4v13l-5-4h-4v-5Z" fill="currentColor" fill-opacity="0.22"/><path d="M16.8 8.8a4.5 4.5 0 0 1 0 6.4M19.4 6.5a7.8 7.8 0 0 1 0 11"/>',
  haptics: '<rect x="8.5" y="4.5" width="7" height="15" rx="2" fill="currentColor" fill-opacity="0.2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>',
  dpad: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5V4Z" fill="currentColor" fill-opacity="0.2"/>',
  motion: '<circle cx="15" cy="12" r="5.5" fill="currentColor" fill-opacity="0.2"/><path d="M3 8h5M2 12h4M3 16h5"/>',
  mango: '<path d="M12.5 5.5c4.5 0 7.5 3.6 7.5 8 0 4.8-3.6 7.5-7.8 7.5-4.3 0-7.2-3.2-7.2-7.2 0-4.8 3.2-8.3 7.5-8.3Z" style="fill:var(--d4-gold-face);stroke:var(--d4-gold-lip)"/><path d="M13 5c1.5-2.2 3.8-2.8 5.8-2.2-.8 2-2.6 3.1-5.8 2.2Z" style="fill:var(--d4-green-face);stroke:var(--d4-green-lip)"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.18"/><path d="M12 7.5V12l3.2 2"/>',
  scissors: '<circle cx="7" cy="7.5" r="2.8" fill="currentColor" fill-opacity="0.18"/><circle cx="7" cy="16.5" r="2.8" fill="currentColor" fill-opacity="0.18"/><path d="M9.4 9.2L19 16.5M9.4 14.8L19 7.5"/>',
  shield: '<path d="M12 3.2L19 6v5.5c0 4.7-3 7.8-7 9.3-4-1.5-7-4.6-7-9.3V6l7-2.8Z" fill="currentColor" fill-opacity="0.22"/>',
  rain: '<path d="M6.5 14.5h11a3.5 3.5 0 0 0 .5-6.9A5 5 0 0 0 8.2 6.8a3.8 3.8 0 0 0-1.7 7.7Z" fill="currentColor" fill-opacity="0.2"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// D4-P1-R5 renders one uniform-stroke inline SVG icon.
export function icon(name: IconName, opts: IconOpts = {}): string {
  const size = opts.size ?? ICON_SIZE;
  const cls = opts.className ? `d4-icon ${esc(opts.className)}` : 'd4-icon';
  const a11y = opts.label ? `role="img" aria-label="${esc(opts.label)}"` : 'aria-hidden="true"';
  const title = opts.label ? `<title>${esc(opts.label)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" class="${cls}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${title}${PATHS[name]}</svg>`;
}
