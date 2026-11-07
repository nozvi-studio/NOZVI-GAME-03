import { expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core/balance';
const mutate = (fn: (j: any) => void): unknown => { const j = structuredClone(json) as any; fn(j); return j; };
it('P3a-R7 balance.juice parses with the GDD §10.4 haptics and a <= 1.5 s death sequence', () => {
  const j = parseBalance(structuredClone(json)).juice;
  expect(j.haptics).toEqual({ eatMs: 12, orbMs: 8, castMs: 20, level: [15, 40, 15], biomeMs: 30, checkpointMs: 40, deathMs: 90 });
  expect(j.death.totalMs).toBeLessThanOrEqual(1500);
  expect(j.reduced.deathTotalMs).toBeLessThanOrEqual(1500);
  expect(j.death.cardInMs).toBeLessThan(j.death.totalMs);
});
it('P3a-R7 rejects a death sequence over 1.5 s or a card that starts after the end', () => {
  expect(() => parseBalance(mutate(j => { j.juice.death.totalMs = 1600; }))).toThrow(/juice.death.totalMs/);
  expect(() => parseBalance(mutate(j => { j.juice.reduced.deathTotalMs = 1600; }))).toThrow(/juice.reduced.deathTotalMs/);
  expect(() => parseBalance(mutate(j => { j.juice.death.cardInMs = 1400; }))).toThrow(/juice.death.cardInMs/);
  expect(() => parseBalance(mutate(j => { j.juice.death.skipLockMs = 1200; }))).toThrow(/juice.death.skipLockMs/);
});
it('P3a-R8 reduced flash alpha is capped at 0.25 (no big flashes)', () => {
  expect(() => parseBalance(mutate(j => { j.juice.reduced.flashAlphaMax = 0.5; }))).toThrow(/juice.reduced.flashAlphaMax/);
});
it('P3a-R11 perf caps are positive ints; missing keys fail', () => {
  expect(() => parseBalance(mutate(j => { j.juice.perf.maxParticles = 0; }))).toThrow(/juice.perf.maxParticles/);
  expect(() => parseBalance(mutate(j => { delete j.juice.bursts.death; }))).toThrow(/juice.bursts.death/);
});
