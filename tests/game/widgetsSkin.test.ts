import { expect, it, vi } from 'vitest';
import { pillGeom } from '../../src/game/ui/geometry';
import { ui } from '../../src/game/ui/layout';
import { PILL_SKIN } from '../../src/game/ui/pillTones';
import { card, chip, pillButton, progressBar } from '../../src/game/ui/widgets';
import { TOKENS } from '../../src/game/uiTokens';
import { sceneHarness } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Geom: { Rectangle: class { static Contains = () => true } } } }));
const fb = { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) };
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: () => fb }));
vi.mock('../../src/game/ui/touchFx', () => ({ tapBurst: vi.fn(), denied: vi.fn() }));
const S = TOKENS.d3.shape;

it('D3-R6 pill tones map to skin tones', () => {
  expect(PILL_SKIN).toEqual({ green: 'primary', orange: 'secondary', cream: 'light', danger: 'danger' });
});
it('D3-R21 pillGeom: the shelf is the lip and the press dip leaves the pressed lip visible', () => {
  const g = pillGeom(200, 60, S.lipBig);
  expect(g.shelf).toBe(ui(S.lipBig)); expect(g.pressedDy).toBe(ui(S.lipBig - S.pressedLip));
  expect(pillGeom(200, 60).shelf).toBe(ui(S.lip));
});
it('D3-R6 pillButton is a lip image under a face image, both from the skin cache', () => {
  const { scene } = sceneHarness();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', () => {}) as unknown as
    { g: { texture: string }; lip: { texture: string; y: number }; c: { list: unknown[] } };
  expect(b.g.texture).toMatch(/^d3\/button\/primary\/rest\//);
  expect(b.lip.texture).toMatch(/^d3\/button\/primary\/lip\//);
  expect(b.lip.y).toBe(ui(S.lipBig));
  expect(b.c.list[0]).toBe(b.lip); expect(b.c.list[1]).toBe(b.g);
});
it('D3-R22 the pressed face shows on pointer down and the rest face comes back on release or slide-off', () => {
  const { scene } = sceneHarness();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', () => {}, 'cream') as unknown as
    { g: { texture: string }; c: { emit(k: string): void } };
  b.c.emit('pointerdown'); expect(b.g.texture).toMatch(/\/light\/pressed\//);
  b.c.emit('pointerout'); expect(b.g.texture).toMatch(/\/light\/rest\//);
  b.c.emit('pointerdown'); b.c.emit('pointerup'); expect(b.g.texture).toMatch(/\/light\/rest\//);
});
it('D3-R6 card is a panel with its lip; chip is a light chip', () => {
  const { scene } = sceneHarness();
  const c = card(scene as never, 10, 20, 300, 200) as unknown as { x: number; y: number; list: { texture: string }[] };
  expect([c.x, c.y]).toEqual([10, 20]);
  expect(c.list.map((o) => o.texture.split('/').slice(0, 4).join('/'))).toEqual(['d3/panel/light/lip', 'd3/panel/light/rest']);
  const ch = chip(scene as never, 0, 0, 'Best 12', '#000000') as unknown as { list: { texture?: string }[] };
  expect(ch.list[1]!.texture).toMatch(/^d3\/chip\/light\/rest\//);
});
it('D3-R6 progressBar crops the fill to the value and hides it at zero', () => {
  const { scene } = sceneHarness();
  const bar = progressBar(scene as never, 0, 0, 200, 20, TOKENS.d3.tone.mango.face[0]);
  const fill = (bar.g as unknown as { list: { visible: boolean; crop?: number[] }[] }).list[1]!;
  expect(fill.visible).toBe(false);
  bar.set(1, 2);
  expect(fill.visible).toBe(true); expect(fill.crop![2]).toBeCloseTo((ui(200) - 2 * ui(S.line)) / 2);
});
