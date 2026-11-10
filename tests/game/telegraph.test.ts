import { describe, expect, it } from 'vitest';
import { cellKey, hazardKey, steadyPulse, telegraphCtx, telegraphPulse } from '../../src/game/render/telegraph';
import { loadBalance } from '../support/balance';

const b = loadBalance(), cfg = b.motion;

describe('MOT-4 telegraphPulse', () => {
  it('MOT-4-R1 endpoints: progress 0 at full remaining time (start hz, bright), progress 1 at the hit (end hz)', () => {
    const a = telegraphPulse(1000, 1000, cfg);
    expect(a.progress).toBe(0); expect(a.hz).toBeCloseTo(cfg.telegraphHzStart, 10); expect(a.phase).toBe(0); expect(a.alpha).toBeCloseTo(1, 10);
    const z = telegraphPulse(0, 1000, cfg);
    expect(z.progress).toBe(1); expect(z.hz).toBeCloseTo(cfg.telegraphHzEnd, 10);
    expect(telegraphPulse(5000, 1000, cfg).progress).toBe(0); expect(telegraphPulse(-5, 1000, cfg).progress).toBe(1);
  });
  it('MOT-4-R1 hz and phase are monotone non-decreasing as the remaining time falls', () => {
    let hz = -1, phase = -1;
    for (let left = 1000; left >= 0; left -= 7) {
      const p = telegraphPulse(left, 1000, cfg);
      expect(p.hz).toBeGreaterThanOrEqual(hz); expect(p.phase).toBeGreaterThanOrEqual(phase); hz = p.hz; phase = p.phase;
    }
  });
  it('MOT-4-R1 pure: the same snapshot gives the same result, whatever the call order', () => {
    const lefts = [900, 100, 450, 0, 1000, 300, 301, 299];
    const first = lefts.map(l => JSON.stringify(telegraphPulse(l, 1000, cfg)));
    const second = [...lefts].reverse().map(l => JSON.stringify(telegraphPulse(l, 1000, cfg))).reverse();
    expect(second).toEqual(first);
  });
  it('MOT-4-R2 alpha never drops below telegraphAlphaMin and scale stays within 1 +/- amp for every ms of the warn', () => {
    for (let left = 0; left <= 1000; left++) {
      const p = telegraphPulse(left, 1000, cfg);
      expect(p.alpha).toBeGreaterThanOrEqual(cfg.telegraphAlphaMin - 1e-9); expect(p.alpha).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(p.scale - 1)).toBeLessThanOrEqual(cfg.telegraphScaleAmp + 1e-9);
    }
  });
  it('MOT-4-R6 urgent only in the last telegraphUrgentMs', () => {
    expect(telegraphPulse(cfg.telegraphUrgentMs, 1000, cfg).urgent).toBe(true);
    expect(telegraphPulse(cfg.telegraphUrgentMs + 1, 1000, cfg).urgent).toBe(false);
    expect(telegraphPulse(0, 1000, cfg).urgent).toBe(true);
  });
  it('MOT-4 reduced motion: static full alpha and scale 1, but the urgent colour step still applies', () => {
    const p = telegraphPulse(100, 1000, cfg, true);
    expect(p.alpha).toBe(1); expect(p.scale).toBe(1); expect(p.phase).toBe(0); expect(p.urgent).toBe(true);
  });
  it('MOT-4-R4 steadyPulse runs at the start rate regardless of progress (ring fade phase)', () => {
    const p = steadyPulse(1000, cfg);
    expect(p.hz).toBe(cfg.telegraphHzStart); expect(p.phase).toBeCloseTo(cfg.telegraphHzStart, 10); expect(p.urgent).toBe(false);
    expect(steadyPulse(1000, cfg, true).alpha).toBe(1);
  });
  it('MOT-4-R3 every fairness-covered family warns at least fairness.minWarnMs (the warn is never shortened by motion)', () => {
    for (const family of ['rock', 'fence', 'maze', 'terrain', 'mud', 'ice', 'coconut', 'gate', 'spike', 'npc', 'bomb'] as const)
      expect(b[family].warnMs, family).toBeGreaterThanOrEqual(b.fairness.minWarnMs);
  });
  it('MOT-4-R3 the pulse layer never hides a warn frame: alpha stays positive across each family full warn', () => {
    for (const warn of [b.rock.warnMs, b.bomb.warnMs, b.gate.warnMs, b.coconut.warnMs])
      for (let left = warn; left >= 0; left -= 10) expect(telegraphPulse(left, warn, cfg).alpha).toBeGreaterThan(0);
  });
  it('MOT-4 telegraphCtx reads the family warn times from balance and defaults the beat to 1', () => {
    const t = telegraphCtx(b);
    expect(t.warnMs).toEqual({ mud: b.mud.warnMs, ice: b.ice.warnMs, gate: b.gate.warnMs, spike: b.spike.warnMs,
      bomb: b.bomb.warnMs, bombCount: b.bomb.countdownMs, shrink: b.shrink.warnMs });
    expect(t.beat('h:rock:1,1')).toBe(1); expect(telegraphCtx(b, () => 1.1).beat('x')).toBe(1.1);
  });
  it('MOT-4-R5 beat keys: hazards by type and first cell, cycle cells by id and cell', () => {
    expect(hazardKey({ type: 'rock', cells: [{ x: 3, y: 4 }, { x: 4, y: 4 }] })).toBe('h:rock:3,4');
    expect(cellKey('g', 7, 2, 5)).toBe('g:7:2,5'); expect(cellKey('s', 1, 0, 0)).toBe('s:1:0,0');
  });
});
