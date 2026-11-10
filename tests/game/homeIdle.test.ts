import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { breathScale, createIdleGate } from '../../src/game/flow/homeIdle';

const m = json.motion;
describe('MOT-2-R8 Home idle', () => {
  it('MOT-2-R8 breath is volume preserving, period 2*pulsePeriodMs, amplitude idleBreathAmp', () => {
    expect(breathScale(0, m)).toEqual({ sx: 1, sy: 1 });
    const peak = breathScale(m.pulsePeriodMs / 2, m); // quarter of the 1800 ms period
    expect(peak.sy).toBeCloseTo(1 + m.idleBreathAmp, 10);
    expect(peak.sx * peak.sy).toBeCloseTo(1, 10);
    const full = breathScale(2 * m.pulsePeriodMs, m);
    expect(full.sy).toBeCloseTo(1, 10);
  });
  it('MOT-2-R8 the pulse waits idleStartMs, pauses idlePauseMs after an interaction, then resumes', () => {
    const g = createIdleGate(m, 1000);
    expect(g.allowed(1000 + m.idleStartMs - 1)).toBe(false);
    expect(g.allowed(1000 + m.idleStartMs)).toBe(true);
    g.interact(5000);
    expect(g.allowed(5000)).toBe(false);
    expect(g.allowed(5000 + m.idlePauseMs - 1)).toBe(false);
    expect(g.allowed(5000 + m.idlePauseMs)).toBe(true);
  });
});
