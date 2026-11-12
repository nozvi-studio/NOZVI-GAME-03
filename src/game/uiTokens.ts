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
    charge: '#97DB9B', chargeAlpha: 0.7, glow: '#FFE98A', glowAlpha: 0.85, shelf: '#508CB4', shelfAlpha: 0.3,
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
    cardEdgeDark: '#46584B', // UIFIX-R14 edge of Settings cards and toggle tracks on the dark card (#2B3A2F)
    themeLight: ['#CFEBD0', '#C2E4C6'], themeDark: ['#3B4A5A', '#33414F'],
  },
  // D3-R1/R4 "Juicy" visual language (spec 2026-11-10-ui-d3-juicy-design.md §4). Mock px for shape numbers.
  d3: {
    bg: { stops: ['#7FD8FF', '#3FB2F2', '#1F86D8'], centerY: 0.38, rayAlpha: 0.13, dimRays: 0.5, rayDeg: 9,
      rayCenterY: 0.46, rx: 1.2, ry: 0.7, midStop: 0.45 },
    ink: '#145A9C', inkDeep: '#0F4578', board: { frameShadow: '#000000',
      mango: { body: '#FFAB1A', leaf: '#3FC23D', shine: '#FFFFFF', halo: '#FFFFFF' },
      rock: { body: '#9FB0C0', shade: '#7D8FA3', hi: '#FFFFFF' },
      warn: { fill: '#FF5A5A', bang: '#C81E1E' },
      wood: { rail: '#E3AC6D', post: '#CF9150' },
      mud: { fill: '#B8956A', puddle: '#8F6F43' },
      ice: { fill: '#9ED8F2', shine: '#B8E5F7' },
      stone: { top: '#EDEFF4', front: '#A9B0C0', warnFill: '#D3D7E0', warnDash: '#FF9A1F', chevron: '#B35F00' },
      hedge: { fill: '#4FBF7A', glow: '#7CF2D4' },
      lane: { fill: '#FFD45E', coconut: '#7B4A22', coconutHi: '#A8713C' },
      cat: { body: '#9A9A9A', ear: '#6F6F6F' },
      chicken: { body: '#FFFFFF', beak: '#F08A1C' },
      shadow: '#1C1C1C',
      gate: { post: '#8B603D', bar: '#5A3A22', warn: '#D18B2F' },
      spike: { fill: '#707A85', warn: '#D1572F' },
      bomb: { body: '#161616', blast: '#D1352F', digit: '#FFFFFF', warn: '#7A7A7A' },
      shrink: { wall: '#3A1010', hatch: '#8A2020', arrow: '#D1352F' } }, text: '#173B63', white: '#FFFFFF',
    logo: { mango: '#FFD93B', mangoLine: '#8A4500' },
    tone: {
      primary: { face: ['#8DF06A', '#3FC23D', '#2EA634'], line: '#17661F', lip: '#114F18', text: '#FFFFFF', outlined: true },
      secondary: { face: ['#FFF6D6', '#FFE08A', '#FFE08A'], line: '#A86A10', lip: '#7D4D08', text: '#6B3F05', outlined: false },
      danger: { face: ['#FF8A8A', '#F04B4B', '#F04B4B'], line: '#9C1F3F', lip: '#7A1430', text: '#FFFFFF', outlined: true },
      light: { face: ['#FFFFFF', '#E6F1FA', '#E6F1FA'], line: '#145A9C', lip: '#0F4578', text: '#173B63', outlined: false },
      skillA: { face: ['#B48CFF', '#7A47E6', '#7A47E6'], line: '#3B1F7A', lip: '#2A1459', text: '#FFFFFF', outlined: true },
      skillB: { face: ['#FFC457', '#FF8A1F', '#FF8A1F'], line: '#8A4A12', lip: '#6E390B', text: '#FFFFFF', outlined: true },
      off: { face: ['#E9F1F7', '#C9D6E2', '#C9D6E2'], line: '#6F8499', lip: '#566B80', text: '#3F5266', outlined: false },
      ribbon: { face: ['#FF5A7A', '#FF5A7A', '#FF5A7A'], line: '#9C1F3F', lip: '#0F4578', text: '#FFFFFF', outlined: true },
      track: { face: ['#0F4578', '#0F4578', '#0F4578'], line: '#0B3560', lip: '#0B3560', text: '#FFFFFF', outlined: true },
      mango: { face: ['#FFE36B', '#FFAB1A', '#FFAB1A'], line: '#8A4500', lip: '#8A4500', text: '#FFFFFF', outlined: true },
      energy: { face: ['#8FF0FF', '#22B8E6', '#22B8E6'], line: '#0B5E7A', lip: '#0B5E7A', text: '#FFFFFF', outlined: true },
    },
    shape: { line: 3, lineBig: 4, lip: 4, lipSkill: 6, lipBig: 8, pressedLip: 1, glossTop: 0.55, glossBottom: 0.08, glossFrac: 0.36,
      pressedGloss: 0.5, radiusBig: 28, radiusPanel: 22, selectedRing: 4, selectedLift: 2 },
    snake: { body: '#6F7DFF', head: '#7F8CFF', belly: '#CFD6FF', stripe: '#FFFFFF', blush: '#FF8FB1', tongue: '#FF5A7A', eye: '#1C1447' },
    outline: { snake: '#2B2F9E', mango: '#8A4500', rock: '#4A5563', warn: '#C81E1E' },
    outlineStorm: { snake: '#7CF2D4', mango: '#FFF3C4', rock: '#D5DCE6', warn: '#FF9A9A' },
    stormIndex: 5,
    biomes: [
      { bg: ['#7FD8FF', '#3FB2F2', '#1F86D8'], frame: '#1D6B2A', cells: ['#A6E25A', '#93D648'] },
      { bg: ['#8FE8D8', '#3CC4B4', '#1C9A8E'], frame: '#7A6A1C', cells: ['#E3E07A', '#D2D062'] },
      { bg: ['#B9C8FF', '#7F92F0', '#5565D6'], frame: '#2C5D8F', cells: ['#D6F1FF', '#BFE6FA'] },
      { bg: ['#FFD9A0', '#F5A65B', '#DB7A35'], frame: '#6B4A2B', cells: ['#E9D3A6', '#D9BF8A'] },
      { bg: ['#A8E6A0', '#5CC46A', '#2F9E4E'], frame: '#9C4A2A', cells: ['#F6C9A0', '#EDB583'] },
      { bg: ['#6A5ACD', '#41358F', '#241C5C'], frame: '#15103A', cells: ['#4A3F86', '#41377A'] },
    ],
  },
  danger: { text: '#B3261E', line: '#E0A39B' }, // UIFIX-R12/R14 soft red: short-of-energy cost, Quit run
} as const;
export type D3Tone = keyof typeof TOKENS.d3.tone;
export type UiThemeName = 'light' | 'dark';
export interface UiTheme { bg: string; title: string; soft: string; card: string; ink: string; cardSoft: string }
/** UIFIX-R4 text/card colours per resolved theme. Dark: light ink on a raised dark-green card (contrast >= 4.5:1, tested). */
export const UI_THEME: Record<UiThemeName, UiTheme> = {
  light: { bg: TOKENS.surface.cream, title: TOKENS.text.primary, soft: TOKENS.text.soft, card: TOKENS.surface.card, ink: TOKENS.text.primary, cardSoft: TOKENS.text.soft },
  dark: { bg: '#131D15', title: '#F3EFE4', soft: '#C9C2B0', card: '#2B3A2F', ink: '#F3EFE4', cardSoft: '#C9C2B0' },
};
export const uiTheme = (name: UiThemeName): UiTheme => UI_THEME[name];
export const FONT_UI = 'Nunito, system-ui, sans-serif';
export const FONT_TITLE = '"Lilita One", Nunito, system-ui, sans-serif';
export function toInt(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`uiTokens: bad colour ${hex}`);
  return parseInt(hex.slice(1), 16);
}
