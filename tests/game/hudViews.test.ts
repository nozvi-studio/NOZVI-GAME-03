import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { HudTop } from '../../src/game/hud/HudTop';
import { SkillButtons } from '../../src/game/hud/SkillButtons';
import { hudView, type HudSnap } from '../../src/game/hud/hudModel';
import { hudLayout } from '../../src/game/hud/hudLayout';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';
import { sceneHarness } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  Geom: { Rectangle: Object.assign(class { constructor(..._a: number[]) {} }, { Contains: () => false }) } } }));
afterEach(() => vi.unstubAllGlobals());
const b = loadBalance();
const snap = (o: Partial<HudSnap> = {}): HudSnap => ({ level: 7, biome: 2, challenge: false, progress: 3, need: 6, score: 44, energy: 35, energyMax: 100,
  rampActive: false, rampMangoesLeft: 0,
  skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: false, active: false, leftMs: 0 }, { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 }], ...o });

it('P3b2-R15 HudTop shows level, biome, quota, score, energy and the checkpoint chip; pause button is enabled only while a run is live', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), pauses: number[] = [];
  const top = new HudTop(h.scene as unknown as Phaser.Scene, hudLayout(false), () => pauses.push(1));
  top.apply(hudView(snap(), { key: 'hud.nextCheckpoint', level: 10 }, b, t), false, true);
  expect(h.find('level').text).toBe('Level 7'); expect(h.find('biome').text).toBe('Rice Paddy');
  expect(h.find('quota-done').text).toBe('3'); expect(h.find('quota-total').text).toBe('/6');
  expect(h.find('score').text).toBe('44'); expect(h.find('energy').text).toBe('35');
  expect(h.find('next-checkpoint').text).toBe('Next checkpoint at L10'); expect(h.find('next-checkpoint').visible).toBe(true);
  h.find('pause-button').emit('pointerdown'); h.find('pause-button').emit('pointerup'); expect(pauses).toEqual([1]);
  top.apply(hudView(snap(), null, b, t), false, false);
  expect(h.find('pause-button').alpha).toBeLessThan(1); expect(h.find('next-checkpoint').visible).toBe(false);
});
it('P3b2-R15 SkillButtons: hidden for empty slots, pointer down casts (MEC-007-R14), off/ready/active drawn differently', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), used: number[] = [];
  const sk = new SkillButtons(h.scene as unknown as Phaser.Scene, hudLayout(false), s => used.push(s), b);
  sk.apply(hudView(snap({ skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: false, active: false, leftMs: 0 },
    { slot: 1, id: null, cost: 0, affordable: false, active: false, leftMs: 0 }] }), null, b, t).skills);
  expect(h.find('skill-0').visible).toBe(true); expect(h.find('skill-1').visible).toBe(false);
  expect(h.find('skill-0-cost').text).toBe('40');
  h.find('skill-0').emit('pointerdown'); expect(used).toEqual([0]);
  const off = JSON.stringify(h.find('skill-0-face').commands);
  sk.apply(hudView(snap(), null, b, t).skills);
  expect(JSON.stringify(h.find('skill-0-face').commands)).toBe(off);   // slot 0 still off
  expect(h.find('skill-1').visible).toBe(true);
  sk.apply(hudView(snap({ skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: true, active: true, leftMs: 2000 },
    { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 }] }), null, b, t).skills);
  expect(JSON.stringify(h.find('skill-0-face').commands)).not.toBe(off);  // active: ring + pressed face
});
it('P3b2-R15 a rejected cast shakes the button and respects reduced motion', () => {
  const h = sceneHarness(); const moves: unknown[] = [];
  h.scene.tweens.add = (v: unknown) => { moves.push(v); };
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const sk = new SkillButtons(h.scene as unknown as Phaser.Scene, hudLayout(false), () => {}, b);
  sk.apply(hudView(snap(), null, b, t).skills); sk.shake(0); expect(moves).toHaveLength(1);
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  sk.shake(0); expect(moves).toHaveLength(1);
});
