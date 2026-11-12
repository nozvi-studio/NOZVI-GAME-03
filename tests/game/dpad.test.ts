import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { createDpad } from '../../src/game/input/dpad';
import { d3HudLayout } from '../../src/game/hud/d3HudLayout';
import { d3 } from '../../src/game/ui/layout';
import { sceneHarness } from '../support/scene';

afterEach(() => vi.unstubAllGlobals());
const px = (r: { x: number; y: number; w: number; h: number }) => ({ x: d3(r.x), y: d3(r.y), w: d3(r.w), h: d3(r.h) });
const dp = d3HudLayout(640, true).dpad!;
const spec = { up: px(dp.up), left: px(dp.left), right: px(dp.right), down: px(dp.down) };
it('GDD-13 D-pad turns on press, releases on out/up, highlights heading and dims reverse', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), turns: unknown[] = [];
  const pad = createDpad(h.scene as unknown as Phaser.Scene, spec, d => turns.push(d));
  pad.setHeading({ x: 1, y: 0 });
  const right = h.find('dpad-right'), left = h.find('dpad-left'), up = h.find('dpad-up');
  expect(right.alpha).toBe(1); expect(left.alpha).toBeLessThan(up.alpha);
  up.emit('pointerdown'); expect(turns).toEqual([{ x: 0, y: -1 }]);
  expect(up.scale).toBeLessThan(1);
  up.emit('pointerout'); expect(up.scale).toBe(1);
  up.emit('pointerdown'); up.emit('pointerup'); expect(up.scale).toBe(1);
});
it('P3b2-R16 D-pad can be hidden and shown (settings.dpad)', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(); const pad = createDpad(h.scene as unknown as Phaser.Scene, spec, () => {});
  pad.setVisible(false); expect(h.find('dpad-up').visible).toBe(false); expect(h.find('dpad-up').input?.enabled).toBe(false);
  pad.setVisible(true); expect(h.find('dpad-up').visible).toBe(true); expect(h.find('dpad-up').input?.enabled).toBe(true);
});
