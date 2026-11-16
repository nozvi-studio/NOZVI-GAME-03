// P3-0-R1 D2 design tokens (UI-MOCKUPS §3, PaletteD2). Pure: no Phaser.
export const TOKENS = {
  surface: { cream: '#F8F2E8', card: '#FFFCF6', white: '#FFFFFF', stone: '#E3DCD2' },
  text: { primary: '#5A3B3B', soft: '#8A6A6A', slate: '#3F4D5E' },
  green: { face: '#79D391', deep: '#4A9A63', line: '#3E7A52' },
  accent: { orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845' },
  sky: { top: '#B3DEF3', bottom: '#9DD3EE', energy: '#3CC6DA' },
  snake: { body: '#6F93F5', belly: '#E4ECFF' },
  shadow: { card: { y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 } },
  title: { strokePx: 9, shadowY: 6 },
  screen: { w: 390 },
  hud: {
    skillOffIcon: '#9DB1C2', skillActiveIcon: '#2E7F93', glow: '#FFE98A', glowAlpha: 0.85,
    pauseScrimAlpha: 0.5, countScrimAlpha: 0.28,
    tooltip: '#5A3B3B', tooltipText: '#FFFFFF', mintInk: '#234B35',
    ring: '#3CC6DA', slowTint: '#8CC8F0', slowTintAlpha: 0.2, slowBoardAlpha: 0.22,
  },
  menu: {
    logoColors: ['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5'],
  },
  // D3-R1/R4 "Juicy" visual language (spec 2026-11-10-ui-d3-juicy-design.md §4). Mock px for shape numbers.
  d3: {
    divider: '#C6DAEA', // D3-R19 Settings row divider
    results: { energyIcon: '#22B8E6', nextIcon: '#F5A400' }, // Results board colours of the bolt and the next-checkpoint flag
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
    stat: { level: '#D6336C', eaten: '#A86A10', biome: '#1F86D8' }, tip: '#48688A', // D3-R18 Results tile value colours and first-run tip ink
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
      pressedGloss: 0.5, radiusBig: 28, radiusPanel: 22, selectedRing: 4, selectedLift: 2, iconStroke: 2.6 },
    snake: { body: '#6F7DFF', head: '#7F8CFF', belly: '#CFD6FF', stripe: '#FFFFFF', blush: '#FF8FB1', tongue: '#FF5A7A', eye: '#1C1447' },
    outline: { snake: '#2B2F9E', mango: '#8A4500', rock: '#4A5563', warn: '#C81E1E' },
    outlineStorm: { snake: '#7CF2D4', mango: '#FFF3C4', rock: '#D5DCE6', warn: '#FF9A9A' },
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
export const FONT_UI = 'Nunito, system-ui, sans-serif';
export const FONT_TITLE = '"Lilita One", Nunito, system-ui, sans-serif';
export function toInt(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`uiTokens: bad colour ${hex}`);
  return parseInt(hex.slice(1), 16);
}
