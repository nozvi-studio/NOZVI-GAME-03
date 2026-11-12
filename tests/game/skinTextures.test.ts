// tests/game/skinTextures.test.ts
import { expect, it } from 'vitest';
import { paintSkin, type Ctx2D } from '../../src/game/ui/skin/skinPaint';
import { skinRecipe } from '../../src/game/ui/skin/skinSpec';
import { skinKey, skinTexture, type TextureHost } from '../../src/game/ui/skin/skinTextures';
import { TOKENS } from '../../src/game/uiTokens';

function fakeCtx(): Ctx2D & { fills: unknown[]; grads: [number, string][][]; ops: string[] } {
  const fills: unknown[] = [], grads: [number, string][][] = [], ops: string[] = [];
  const ctx = {
    fillStyle: '' as unknown, fills, grads, ops,
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, clearRect() {},
    save() { ops.push('save'); }, restore() { ops.push('restore'); }, clip() { ops.push('clip'); },
    fill() { fills.push(ctx.fillStyle); ops.push('fill'); },
    createLinearGradient() { const stops: [number, string][] = []; grads.push(stops); return { addColorStop: (o: number, c: string) => { stops.push([o, c]); } }; },
  };
  return ctx;
}
function fakeHost(): TextureHost & { made: string[]; refreshed: number } {
  const keys = new Set<string>();
  const host = { made: [] as string[], refreshed: 0,
    exists: (k: string) => keys.has(k),
    createCanvas(k: string) { keys.add(k); host.made.push(k); return { context: fakeCtx(), refresh: () => { host.refreshed++; } }; } };
  return host;
}

it('D3-R5 paintSkin fills the outline, then the face gradient, then the gloss', () => {
  const ctx = fakeCtx(), rc = skinRecipe('button', 'primary', 200, 80, 'rest', 1);
  paintSkin(ctx, rc);
  expect(ctx.fills.length).toBe(3);
  expect(ctx.fills[0]).toBe(TOKENS.d3.tone.primary.line);
  expect(ctx.grads[0]!.map(([, c]) => c)).toEqual([...TOKENS.d3.tone.primary.face]);
  expect(ctx.grads[0]!.map(([o]) => o)).toEqual([0, 0.5, 1]);
  expect(ctx.grads[1]![0]![1]).toBe(`rgba(255,255,255,${TOKENS.d3.shape.glossTop})`);
});
it('D3-R14 the gloss is clipped to the face so it never leaks past a round skill button', () => {
  const ctx = fakeCtx();
  paintSkin(ctx, skinRecipe('skill', 'primary', 120, 120, 'rest', 1));
  expect(ctx.ops).toEqual(['fill', 'fill', 'save', 'clip', 'fill', 'restore']);
});
it('D3-R5 a lip recipe paints one flat fill', () => {
  const ctx = fakeCtx();
  paintSkin(ctx, skinRecipe('button', 'primary', 200, 80, 'lip', 1));
  expect(ctx.fills.length).toBe(1);
});
it('D3-R5 skinTexture paints once per key and reuses the cached texture', () => {
  const host = fakeHost();
  const a = skinTexture(host, 'button', 'primary', 200.4, 80, 'rest', 1);
  const b = skinTexture(host, 'button', 'primary', 200.4, 80, 'rest', 1);
  expect(a).toBe('d3/button/primary/rest/201x80'); expect(b).toBe(a);
  expect(host.made).toEqual([a]); expect(host.refreshed).toBe(1);
  skinTexture(host, 'button', 'primary', 200.4, 80, 'pressed', 1);
  expect(host.made.length).toBe(2);
});
it('D3-R5 skinKey rounds sizes up to whole pixels', () => {
  expect(skinKey('chip', 'light', 'rest', 99.1, 40)).toBe('d3/chip/light/rest/100x40');
});
it('D3-R5 skinTexture throws when the canvas cannot be created', () => {
  const host: TextureHost = { exists: () => false, createCanvas: () => null };
  expect(() => skinTexture(host, 'chip', 'light', 10, 10, 'rest', 1)).toThrow(/skinTextures/);
});
