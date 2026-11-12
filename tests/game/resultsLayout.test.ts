import { describe, expect, it } from 'vitest';
import { resultsLayout } from '../../src/game/flow/resultsLayout';

const full = { rows: [{ kind: 'checkpoint', level: 10 }, { kind: 'energy', value: 35 }, { kind: 'next', fill: 1, level: 12, requiresClear: false }] as const, firstRunTip: null };
const first = { rows: [{ kind: 'next', fill: 0.2, level: 10, requiresClear: false }] as const, firstRunTip: 'tip' };

describe('D3-R18 results layout', () => {
  for (const hm of [640, 780]) {
    it(`D3-R18 buttons sit in the lower 45% and never overlap the panel (hm ${hm})`, () => {
      const l = resultsLayout(full as never, hm, true);
      expect(l.primary.y).toBeGreaterThanOrEqual(hm * 0.55 - 1);
      expect(l.primary.y).toBeGreaterThanOrEqual(l.panel.y + l.panel.h + 16);
      expect(l.secondary!.y + l.secondary!.h).toBeLessThanOrEqual(hm);
    });
  }
  it('D3-R18 rows keep board order and the panel shrinks without them (U5-R5)', () => {
    const a = resultsLayout(full as never, 640, true), b = resultsLayout({ rows: [], firstRunTip: null }, 640, true);
    expect(a.rows.map(r => r.kind)).toEqual(['checkpoint', 'energy', 'next']);
    expect(b.panel.h).toBeLessThan(a.panel.h); expect(b.rows).toEqual([]);
  });
  it('U5-R6 first run adds the tip below the rows', () => {
    const l = resultsLayout(first as never, 640, true);
    expect(l.tip).not.toBeNull(); expect(l.tip!.y).toBeGreaterThan(l.rows[0]!.y);
  });
  it('U5-R8 without Play again, Home is the primary and there is no secondary', () => {
    const l = resultsLayout(full as never, 640, false);
    expect(l.primary.id).toBe('home'); expect(l.secondary).toBeNull();
  });
  it('D3-R18 ribbon overlaps the panel top like the board', () => {
    const l = resultsLayout(full as never, 640, true);
    expect(l.ribbon.y + l.ribbon.h).toBeGreaterThan(l.panel.y);
  });
});
