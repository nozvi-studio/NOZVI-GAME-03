import { expect, it } from 'vitest';
import { hudView, type HudSnap } from '../../src/game/hud/hudModel';
import { stack } from '../../src/game/hud/stack';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const snap = (o: Partial<HudSnap> = {}): HudSnap => ({
  level: 7, biome: 2, challenge: false, progress: 3, need: 6, score: 44, energy: 35, energyMax: 100,
  rampActive: false, rampMangoesLeft: 0, startLevel: 1,
  skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: false, active: false, leftMs: 0 },
    { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 }], ...o });
const hint = { key: 'hud.nextCheckpoint', level: 10 };

it('P3b2-R7 GameD2 default state: level+biome, quota, score, energy, skills, checkpoint chip', () => {
  expect(hudView(snap(), hint, b, t)).toEqual({
    levelTitle: 'Level 7', biomeName: 'Rice Paddy', quota: { done: '3', total: '/6' }, score: '44',
    energy: { text: '35', fill: 0.35 },
    skills: [{ slot: 0, id: 'slowmo', cost: 40, state: 'off', ring: null }, { slot: 1, id: 'tailSnip', cost: 30, state: 'ready', ring: null }],
    chip: { kind: 'checkpoint', text: 'Next checkpoint at L10' } });
});
it('P3b2-R7 empty slot is null; challenge level shows the star; max level shows Max', () => {
  const v = hudView(snap({ challenge: true, level: b.level.maxLevel, skills: [{ slot: 0, id: null, cost: 0, affordable: false, active: false, leftMs: 0 },
    { slot: 1, id: null, cost: 0, affordable: false, active: false, leftMs: 0 }] }), null, b, t);
  expect(v.skills).toEqual([null, null]); expect(v.levelTitle).toBe('Level 30 ★');
  expect(v.quota).toEqual({ done: 'Max', total: '' }); expect(v.chip).toBeNull();
});
it('P3b2-R7 timed skills show a countdown ring from balance durations, Tail Snip has no ring', () => {
  const v = hudView(snap({ skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: true, active: true, leftMs: b.skills.slowmo.durationMs / 2 },
    { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: true, leftMs: 1000 }] }), null, b, t);
  expect(v.skills[0]).toMatchObject({ state: 'active', ring: 0.5 });
  expect(v.skills[1]).toMatchObject({ state: 'active', ring: null });
});
it('P3b2-R7 energy fill clamps; ramp chip replaces the checkpoint chip while the ramp is active', () => {
  expect(hudView(snap({ energy: 140, energyMax: 100 }), null, b, t).energy.fill).toBe(1);
  expect(hudView(snap({ rampActive: true, rampMangoesLeft: 3, startLevel: 6 }), hint, b, t).chip).toEqual({ kind: 'ramp', text: 'Warming up 3' });
  expect(hudView(snap(), { key: 'hud.nextCheckpointClear', level: 12 }, b, t).chip?.text).toBe('Next checkpoint: clear L12');
});
it('P3b2-R7 MEC-008-R8 an L1 start has no ramp effect: no Warming up chip, the checkpoint hint shows instead', () => {
  expect(hudView(snap({ rampActive: true, rampMangoesLeft: 5, startLevel: 1 }), hint, b, t).chip).toEqual({ kind: 'checkpoint', text: 'Next checkpoint at L10' });
  expect(hudView(snap({ rampActive: true, rampMangoesLeft: 5, startLevel: 1 }), null, b, t).chip).toBeNull();
});
it('P3b2-R9 stack places items with gap, margins and padding', () => {
  const r = stack([{ h: 37.4 }, { h: 19 }, { h: 34, mt: 6 }, { h: 66, mt: 16 }, { h: 52, mt: 8 }, { h: 52 }], { gap: 6, padTop: 26, padBottom: 20 });
  expect(r.height).toBeCloseTo(366.4, 5); expect(r.ys[0]).toBe(26); expect(r.ys[2]).toBeCloseTo(100.4, 5);
  expect(stack([], { gap: 6, padTop: 3, padBottom: 4 })).toEqual({ ys: [], height: 7 });
});
