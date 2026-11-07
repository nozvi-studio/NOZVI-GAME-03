// tests/qa/task8-dpad.qa.test.ts — black-box QA tests for D-pad mapping and interaction
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { createDpad } from '../../src/game/input/dpad';
import { hudLayout } from '../../src/game/hud/hudLayout';
import { sceneHarness } from '../support/scene';

const DPAD = hudLayout(true).dpad!;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QA Task 8: D-Pad Input Mapping and Visual States (Black-Box)', () => {
  it('QA-T8-21 P0-Design §7.3, GDD-13 createDpad creates 4 directional buttons with proper names', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, () => {});

    expect(h.find('dpad-up')).toBeDefined();
    expect(h.find('dpad-down')).toBeDefined();
    expect(h.find('dpad-left')).toBeDefined();
    expect(h.find('dpad-right')).toBeDefined();
  });

  it('QA-T8-22 P0-Design §7.3 pressing dpad-up sends {x: 0, y: -1} and depresses button', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const turns: Array<{ x: number; y: number }> = [];
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, d => turns.push(d));

    const up = h.find('dpad-up');
    up.emit('pointerdown');
    expect(turns).toEqual([{ x: 0, y: -1 }]);
    expect(up.scale).toBeLessThan(1);

    up.emit('pointerup');
    expect(up.scale).toBe(1);
  });

  it('QA-T8-23 P0-Design §7.3 pressing dpad-down sends {x: 0, y: 1}', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const turns: Array<{ x: number; y: number }> = [];
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, d => turns.push(d));

    const down = h.find('dpad-down');
    down.emit('pointerdown');
    expect(turns).toEqual([{ x: 0, y: 1 }]);
  });

  it('QA-T8-24 P0-Design §7.3 pressing dpad-left sends {x: -1, y: 0}', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const turns: Array<{ x: number; y: number }> = [];
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, d => turns.push(d));

    const left = h.find('dpad-left');
    left.emit('pointerdown');
    expect(turns).toEqual([{ x: -1, y: 0 }]);
  });

  it('QA-T8-25 P0-Design §7.3 pressing dpad-right sends {x: 1, y: 0}', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const turns: Array<{ x: number; y: number }> = [];
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, d => turns.push(d));

    const right = h.find('dpad-right');
    right.emit('pointerdown');
    expect(turns).toEqual([{ x: 1, y: 0 }]);
  });

  it('QA-T8-26 P0-Design §7.3 pointerout restores button scale after press', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    createDpad(h.scene as unknown as Phaser.Scene, DPAD, () => {});

    const btn = h.find('dpad-up');
    btn.emit('pointerdown');
    expect(btn.scale).toBeLessThan(1);
    btn.emit('pointerout');
    expect(btn.scale).toBe(1);
  });

  it('QA-T8-27 P0-Design §7.3 setHeading highlights heading and dims reverse button', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const pad = createDpad(h.scene as unknown as Phaser.Scene, DPAD, () => {});

    // Snake moving right: right is heading (1.0), left is reverse (0.35), up/down are neutral (0.85)
    pad.setHeading({ x: 1, y: 0 });
    const right = h.find('dpad-right');
    const left = h.find('dpad-left');
    const up = h.find('dpad-up');
    const down = h.find('dpad-down');

    expect(right.alpha).toBe(1);
    expect(left.alpha).toBe(0.35);
    expect(up.alpha).toBe(0.85);
    expect(down.alpha).toBe(0.85);
  });

  it('QA-T8-28 P0-Design §7.3 setHeading adapts dynamically to vertical headings', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const h = sceneHarness();
    const pad = createDpad(h.scene as unknown as Phaser.Scene, DPAD, () => {});

    // Snake moving up: up is heading (1.0), down is reverse (0.35)
    pad.setHeading({ x: 0, y: -1 });
    expect(h.find('dpad-up').alpha).toBe(1);
    expect(h.find('dpad-down').alpha).toBe(0.35);
    expect(h.find('dpad-left').alpha).toBe(0.85);
    expect(h.find('dpad-right').alpha).toBe(0.85);

    // Turn down: down is heading (1.0), up is reverse (0.35)
    pad.setHeading({ x: 0, y: 1 });
    expect(h.find('dpad-down').alpha).toBe(1);
    expect(h.find('dpad-up').alpha).toBe(0.35);
  });
});
