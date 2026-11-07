import type { BoardTheme } from '../../meta';
import { toInt } from '../uiTokens';

// P3b1-R1 per-biome board look (BiomeBoardsD2). Pure: no Phaser.
export interface BoardLook {
  biome: number; theme: BoardTheme; groundA: number; groundB: number;
  grid: number; gridAlpha: number; edge: number; woodEdge: number;
}
// BiomeBoardsD2 light grounds, one pair per biome (GDD §5.1 order).
const LIGHT_GROUNDS: readonly (readonly [string, string])[] = [
  ['#CFEBD0', '#F4E7A6'], ['#D9EDC2', '#EADFA4'], ['#DCEFFB', '#F5FBFF'],
  ['#EBDDBC', '#DCC79B'], ['#F8D2A6', '#F0BF8A'], ['#3B3363', '#332C58'],
];
const STORM = 6;
const NAVY_EDGE = '#2B3248', WHITE = '#FFFFFF', WOOD_EDGE = '#4A2E1B';
const DARK_BASE = '#131D15', DARK_MIX = 0.7;                 // lead decision 1
const GRID = { light: { color: '#FFFFFF', alpha: 0.5 }, dark: { color: '#FFFFFF', alpha: 0.1 }, storm: { color: '#7CF2D4', alpha: 0.28 } } as const;

export function mixInt(a: number, b: number, t: number): number {
  const ch = (s: number): number => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const channel = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (c: number): number => 0.2126 * channel((c >> 16) & 255) + 0.7152 * channel((c >> 8) & 255) + 0.0722 * channel(c & 255);
export function contrastRatio(a: number, b: number): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function boardLook(biome: number, theme: BoardTheme): BoardLook {
  const n = Math.min(STORM, Math.max(1, Math.round(biome)));
  const [a, b] = LIGHT_GROUNDS[n - 1]!;
  const storm = n === STORM, dark = theme === 'dark' && !storm;
  const groundA = dark ? mixInt(toInt(a), toInt(DARK_BASE), DARK_MIX) : toInt(a);
  const groundB = dark ? mixInt(toInt(b), toInt(DARK_BASE), DARK_MIX) : toInt(b);
  const grid = storm ? GRID.storm : theme === 'dark' ? GRID.dark : GRID.light;
  const edge = toInt(storm || theme === 'dark' ? WHITE : NAVY_EDGE);
  return { biome: n, theme, groundA, groundB, grid: toInt(grid.color), gridAlpha: grid.alpha, edge,
    woodEdge: storm || theme === 'dark' ? edge : toInt(WOOD_EDGE) };
}
export const DEFAULT_LOOK: BoardLook = boardLook(1, 'light');
