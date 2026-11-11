import { expect, it } from 'vitest';
import { bgKey, bgSpec, paintBackground, type BgCtx } from '../../src/game/ui/backgroundSpec';
import { TOKENS } from '../../src/game/uiTokens';

it('D3-R10 bgSpec uses the biome stops, ellipse radii and centres from TOKENS.d3.bg', () => {
  const s = bgSpec(2, 540, 1170), b = TOKENS.d3.bg;
  expect(s.stops).toEqual([[0, TOKENS.d3.biomes[1]!.bg[0]], [b.midStop, TOKENS.d3.biomes[1]!.bg[1]], [1, TOKENS.d3.biomes[1]!.bg[2]]]);
  expect(s.cx).toBe(270); expect(s.cy).toBeCloseTo(1170 * b.centerY);
  expect(s.rx).toBeCloseTo(540 * b.rx); expect(s.ry).toBeCloseTo(1170 * b.ry);
  expect(s.rayCy).toBeCloseTo(1170 * b.rayCenterY);
  expect(s.outer).toBe(TOKENS.d3.biomes[1]!.bg[2]);
});
it('D3-R10 ray fan: 20 wedges of rayDeg every 2*rayDeg, first wedge starts at 12 o\'clock', () => {
  const s = bgSpec(1, 540, 960);
  expect(s.wedges.length).toBe(360 / (2 * TOKENS.d3.bg.rayDeg));
  expect(s.wedges[0]!.a0).toBeCloseTo(-Math.PI / 2);
  expect(s.wedges[0]!.a1 - s.wedges[0]!.a0).toBeCloseTo(TOKENS.d3.bg.rayDeg * Math.PI / 180);
  expect(s.rayR).toBeGreaterThanOrEqual(Math.hypot(540, 960));
});
it('D3-R10 biome is clamped to 1..6', () => {
  expect(bgSpec(0, 540, 960).outer).toBe(TOKENS.d3.biomes[0]!.bg[2]);
  expect(bgSpec(9, 540, 960).outer).toBe(TOKENS.d3.biomes[5]!.bg[2]);
});
it('D3-R10 bgKey has biome and integer size', () => {
  expect(bgKey(3, 540, 1169.6)).toBe('d3/bg/3/540x1170');
});
it('D3-R10 paintBackground fills the gradient once and one path per wedge', () => {
  const fills: unknown[] = [];
  const ctx: BgCtx = { fillStyle: '', save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, arc() {}, closePath() {},
    fill() { fills.push(ctx.fillStyle); }, fillRect() { fills.push(ctx.fillStyle); },
    createRadialGradient: () => ({ addColorStop() {} }) };
  const s = bgSpec(1, 540, 960);
  paintBackground(ctx, s);
  expect(fills.length).toBe(1 + s.wedges.length);
});
