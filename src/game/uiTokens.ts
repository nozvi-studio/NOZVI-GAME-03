// P3-0-R1 D2 design tokens (UI-MOCKUPS §3, PaletteD2). Pure: no Phaser.
export const TOKENS = {
  surface: { cream: '#F8F2E8', card: '#FFFCF6', white: '#FFFFFF', sand: '#EFE6D8', stone: '#E3DCD2', peach: '#FBE3C8' },
  text: { primary: '#5A3B3B', soft: '#8A6A6A', faint: '#B79F8A', slate: '#3F4D5E', logoOutline: '#6B4C82', walnut: '#B98558' },
  green: { face: '#79D391', shade: '#5DB878', deep: '#4A9A63', line: '#3E7A52', mint: '#CFEBD0', mint2: '#C2E4C6' },
  accent: { orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845', pink: '#F6C2D3', periwinkle: '#8EA0FF' },
  sky: { top: '#B3DEF3', bottom: '#9DD3EE', silhouette: '#C4E7F7', stat: '#BCDDF4', lavender: '#C6B0F5', energy: '#3CC6DA' },
  snake: { body: '#6F93F5', shade: '#3F63D1', belly: '#E4ECFF' },
  shadow: { card: { y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 } },
  title: { strokePx: 9, shadowY: 6 },
  screen: { w: 390, h: 844, sidePad: 16 },
  hud: {
    skillOffFace: '#E9F1F7', skillOffIcon: '#9DB1C2', skillActiveIcon: '#2E7F93', skillUsedFace: '#EFE6D8',
    glow: '#FFE98A', glowAlpha: 0.85, shelf: '#508CB4', shelfAlpha: 0.3,
    ring: '#3CC6DA', ringTrack: '#FFFFFF', ringTrackAlpha: 0.75, energyTrack: '#D9EEF3', quota: '#2E9E5B',
    scrim: '#5A3B3B', pauseScrimAlpha: 0.5, countScrimAlpha: 0.28,
    tooltip: '#5A3B3B', tooltipText: '#FFFFFF', mintCard: '#D7EBD2', mintInk: '#234B35',
    slowTint: '#8CC8F0', slowTintAlpha: 0.2, slowBoardAlpha: 0.22,
    countdown: '#F8D468', countdownStrokePx: 22, countdownShadowY: 12, countdownSizePx: 270, cardShadowAlpha: 0.45,
  },
  menu: {
    logoColors: ['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5'],
    heroBands: ['#F6C2D3', '#FBE19A', '#BCDDF4'], heroBandStops: [0.34, 0.67],
    statButter: '#FBE19A', bestSoft: '#FFF3D1', mintBanner: '#D7EBD2', mintBannerText: '#234B35',
    slotRing: '#FFE98A', pickRing: '#7FC98C', costChip: '#E6F5F8', rowDivider: '#F3EBDD',
    themeLight: ['#CFEBD0', '#C2E4C6'], themeDark: ['#3B4A5A', '#33414F'],
  },
} as const;
export const FONT_UI = 'Nunito, system-ui, sans-serif';
export const FONT_TITLE = '"Lilita One", Nunito, system-ui, sans-serif';
export function toInt(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`uiTokens: bad colour ${hex}`);
  return parseInt(hex.slice(1), 16);
}
