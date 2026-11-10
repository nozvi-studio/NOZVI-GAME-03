import { describe, expect, it } from 'vitest';
import { chipTransition, easeMsFor, energyCue, levelTitleChanged, skillReadyEdge } from '../../src/game/hud/hudMotion';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;

describe('MOT-4 hudMotion', () => {
  it('MOT-4-R9 a spend eases in barSpendMs, a gain in barEaseMs', () => {
    expect(easeMsFor(0.8, 0.4, cfg)).toBe(cfg.barSpendMs); expect(easeMsFor(0.4, 0.8, cfg)).toBe(cfg.barEaseMs); expect(easeMsFor(0.4, 0.4, cfg)).toBe(cfg.barEaseMs);
  });
  it('MOT-4-R11 skillReadyEdge: off -> ready pops, ready -> off dips, everything else is quiet', () => {
    expect(skillReadyEdge('off', 'ready')).toBe('pop'); expect(skillReadyEdge('ready', 'off')).toBe('dip');
    for (const [a, b] of [['off', 'off'], ['ready', 'ready'], ['ready', 'active'], ['active', 'ready'], [null, 'ready'], ['ready', null]] as const) expect(skillReadyEdge(a, b)).toBeNull();
  });
  it('MOT-4-R12 level title: first paint never animates, a change does, the same title does not', () => {
    expect(levelTitleChanged(null, 'Level 1')).toBe(false); expect(levelTitleChanged('Level 1', 'Level 2')).toBe(true); expect(levelTitleChanged('Level 2', 'Level 2')).toBe(false);
  });
  it('MOT-4-R10 energyCue: low at or below the threshold, full at 1, else none', () => {
    expect(energyCue(0.2, cfg.energyLowFrac)).toBe('low'); expect(energyCue(0, cfg.energyLowFrac)).toBe('low');
    expect(energyCue(0.21, cfg.energyLowFrac)).toBe('none'); expect(energyCue(1, cfg.energyLowFrac)).toBe('full'); expect(energyCue(0.99, cfg.energyLowFrac)).toBe('none');
  });
  it('MOT-4-R13 chipTransition: appear, clear, kind change, same kind', () => {
    expect(chipTransition(null, 'ramp')).toBe('in'); expect(chipTransition('ramp', null)).toBe('out');
    expect(chipTransition('ramp', 'checkpoint')).toBe('cross'); expect(chipTransition('ramp', 'ramp')).toBe('none'); expect(chipTransition(null, null)).toBe('none');
  });
});
