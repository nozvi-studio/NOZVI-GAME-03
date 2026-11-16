import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
import * as palette from '../../src/game/render/palette';

// Vite raw glob: no @types/node needed. uiTokens.ts itself is excluded (it defines the keys).
const raw = import.meta.glob('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const src = Object.entries(raw).filter(([p]) => !p.endsWith('/game/uiTokens.ts')).map(([, s]) => s).join('\n');
const WHOLE = new Set(['bg', 'board', 'tone', 'biomes', 'outline', 'outlineStorm', 'snake']); // U6-R10 d3 sub-trees read as whole objects
const keys = (Object.entries(TOKENS) as [string, Record<string, unknown>][]).flatMap(([g, v]) =>
  typeof v === 'object' && v !== null ? Object.keys(v).filter(k => !(g === 'd3' && WHOLE.has(k))).map(k => [g, k] as const) : []);
// Word-bounded reads without backslashes: "group.key" (flat groups) or any ".key" alias read (d3).
const B = '([^A-Za-z0-9_]|$)';
const readAs = (a: string, k: string): boolean => new RegExp('(^|[^A-Za-z0-9_])' + a + '[.]' + k + B).test(src);
const readAnyOwner = (k: string): boolean => new RegExp('[A-Za-z_][A-Za-z0-9_]*[.]' + k + B).test(src);

it('D3-R1 U6-R10 every TOKENS key is read somewhere in src (no dead D2 tokens)', () => {
  expect(keys.length).toBeGreaterThan(10);
  const dead = keys.filter(([g, k]) => !readAs(g, k) && !(g === 'd3' && readAnyOwner(k))).map(([g, k]) => `${g}.${k}`);
  expect(dead).toEqual([]);
});
it('D3-R3 no dark theme left: no UI_THEME, no DARK palette, no theme helpers', () => {
  expect((TOKENS as Record<string, unknown>).themeDark).toBeUndefined();
  expect('DARK' in palette).toBe(false);
  expect('themeOf' in palette).toBe(false);
  expect(src).not.toMatch(/UI_THEME|uiTheme[(]|themeLight|themeDark|settingsCardEdge|toggleTrackStyle/);
});
