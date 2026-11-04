import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { createDpad } from '../../src/game/input/dpad';
import { DPAD } from '../../src/game/layout';
import { sceneHarness } from '../support/scene';

afterEach(() => vi.unstubAllGlobals());
it('GDD-13 D-pad turns on press, releases on out/up, highlights heading and dims reverse', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), turns: unknown[] = [];
  const pad = createDpad(h.scene as unknown as Phaser.Scene, DPAD, d => turns.push(d));
  pad.setHeading({ x: 1, y: 0 });
  const right = h.find('dpad-right'), left = h.find('dpad-left'), up = h.find('dpad-up');
  expect(right.alpha).toBe(1); expect(left.alpha).toBeLessThan(up.alpha);
  up.emit('pointerdown'); expect(turns).toEqual([{ x: 0, y: -1 }]);
  expect(up.scale).toBeLessThan(1);
  up.emit('pointerout'); expect(up.scale).toBe(1);
  up.emit('pointerdown'); up.emit('pointerup'); expect(up.scale).toBe(1);
});
