import { describe, expect, it } from 'vitest';
import { CAUSE_TEXT, DEATH_LINES, t } from '../../src/game/text';
import { deathSeed, pickDeathLine } from '../../src/game/juice/deathLine';
describe('P3a-R10 death lines', () => {
  it('every death cause has at least one non-empty line (CauseKey is the source list)', () => {
    for (const cause of Object.keys(CAUSE_TEXT) as (keyof typeof CAUSE_TEXT)[]) {
      expect(DEATH_LINES[cause], cause).toBeDefined();
      expect(DEATH_LINES[cause].length, cause).toBeGreaterThanOrEqual(1);
      for (const line of DEATH_LINES[cause]) { expect(line.trim().length).toBeGreaterThan(0); expect(line.length).toBeLessThanOrEqual(40); }
    }
    expect(Object.keys(DEATH_LINES).sort()).toEqual(Object.keys(CAUSE_TEXT).sort());
  });
  it('the pick is seeded: same seed -> same line, and it is always one of the cause lines', () => {
    for (const cause of Object.keys(DEATH_LINES) as (keyof typeof DEATH_LINES)[]) {
      for (let s = 0; s < 20; s++) {
        expect(pickDeathLine(cause, s)).toBe(pickDeathLine(cause, s));
        expect(DEATH_LINES[cause]).toContain(pickDeathLine(cause, s));
      }
    }
    const seen = new Set(Array.from({ length: 50 }, (_, s) => pickDeathLine('fence', s)));
    expect(seen.size).toBeGreaterThan(1);
  });
  it('deathSeed is stable and uses no clock', () => {
    expect(deathSeed(12, 4, 5000)).toBe(deathSeed(12, 4, 5000));
    expect(deathSeed(12, 4, 5000)).not.toBe(deathSeed(13, 4, 5000));
  });
  it('the card title is keyed text', () => { expect(t('death.title')).toBe('RUN OVER'); });
});
