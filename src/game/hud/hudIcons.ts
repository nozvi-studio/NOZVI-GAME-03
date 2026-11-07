import type Phaser from 'phaser';
import { svgDataUrl } from '../art/capyRig';
import { TOKENS } from '../uiTokens';

// P3b2-R14 HUD glyphs as SVG textures (path data from GameD2 / SkillActiveD2 / BannersD2 / PauseD2, 24x24 viewBox).
// Separate from ui/icons.ts (P3b-3 menu glyphs drawn with Graphics): HUD icons need per-tone textures and mockup-exact shapes.
export type IconName = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain' | 'flag' | 'bolt' | 'star' | 'settings' | 'shrink' | 'biome' | 'mango';
export type IconTone = 'ink' | 'soft' | 'off' | 'active';
const TONE: Record<IconTone, string> = { ink: TOKENS.text.primary, soft: TOKENS.text.soft, off: TOKENS.hud.skillOffIcon, active: TOKENS.hud.skillActiveIcon };
export const ICON_TONES: Record<IconName, readonly IconTone[]> = {
  slowmo: ['ink', 'off', 'active'], tailSnip: ['ink', 'off', 'active'], shield: ['ink', 'off', 'active'], mangoRain: ['ink', 'off', 'active'],
  flag: ['ink', 'soft'], bolt: ['ink'], star: ['ink'], settings: ['ink'], shrink: ['ink'], biome: ['ink'], mango: ['ink'],
};
const line = (c: string, sw: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const fill = (c: string, body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="${c}">${body}</g></svg>`;
export function hudIconSvg(n: IconName, tone: IconTone = 'ink'): string {
  const c = TONE[tone];
  switch (n) {
    case 'slowmo': return line(c, 2.4, '<circle cx="12" cy="13.5" r="8"/><path d="M12 9v4.8l3 1.8M9.5 3h5"/>');
    case 'tailSnip': return line(c, 2.4, '<circle cx="6.5" cy="17.5" r="2.7"/><circle cx="17.5" cy="17.5" r="2.7"/><path d="M8.2 15.5L17 4M15.8 15.5L7 4"/>');
    case 'shield': return line(c, 2.4, '<path d="M12 3l8 3v5.5c0 5-3.4 8.5-8 9.5-4.6-1-8-4.5-8-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>');
    case 'mangoRain': return line(c, 2.4, '<path d="M7 14a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17 14z"/><path d="M8 17.5v2M12 17v3M16 17.5v2"/>');
    case 'flag': return line(c, 2.6, '<path d="M6 21V4M6 4h12l-3 4.5L18 13H6"/>');
    case 'settings': return line(c, 2.6, '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.4"/><circle cx="8" cy="17" r="2.4"/>');
    case 'shrink': return line(c, 2.6, '<path d="M3 12h6M15 12h6M6.5 9L9.5 12l-3 3M17.5 9L14.5 12l3 3"/>');
    case 'biome': return line(TOKENS.text.slate, 2.4, '<path d="M12 2v20M3.4 7l17.2 10M20.6 7L3.4 17M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>');
    case 'bolt': return fill(TOKENS.sky.energy, '<path d="M13 2L5 13.5h6L10 22l9-12.5h-6.5L13 2z"/>');
    case 'star': return fill(TOKENS.accent.gold, '<path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>');
    case 'mango': return fill(TOKENS.accent.orange, `<ellipse cx="12" cy="14" rx="7.5" ry="8"/><path fill="${TOKENS.green.deep}" d="M12 6c0-2 2-3.5 4-3.5-.2 2-1.8 3.5-4 3.5z"/>`);
  }
}
export const hudIconKey = (n: IconName, tone: IconTone = 'ink'): string => `hud-icon-${n}-${tone}`;
export const HUD_ICON_PX = 96;
/** P3b2-R14 rasterise every icon/tone once at Boot (same path as the capy textures). */
export function preloadHudIcons(load: Phaser.Loader.LoaderPlugin): void {
  for (const [name, tones] of Object.entries(ICON_TONES) as [IconName, readonly IconTone[]][])
    for (const tone of tones) load.svg(hudIconKey(name, tone), svgDataUrl(hudIconSvg(name, tone)), { width: HUD_ICON_PX, height: HUD_ICON_PX });
}
