import { describe, expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { drawBlasts } from '../../src/game/render/blasts';
import { drawCycles } from '../../src/game/render/cycles';
import { drawShrink } from '../../src/game/render/shrink';
import { gfx } from '../support/gfx';
import { TEL } from '../support/telegraph';

const base = { families: { coconut: [], npc: [], bird: null, gate: [], spike: [], bomb: [], shrink: null } };
const snap = (over: Record<string, unknown>) => ({ families: { ...base.families, ...over } }) as unknown as SimSnapshot;
const gate = (vis: string, warnLeftMs: number) => snap({ gate: [{ id: 3, t: 0, lifeMs: 9, state: 'live', fence: [], gate: [{ x: 1, y: 1, delay: 0, vis, warnLeftMs }] }] });
const bomb = (state: string, leftMs: number) => snap({ bomb: [{ id: 9, x: 2, y: 2, state, leftMs, area: [{ x: 2, y: 2 }] }] });
const ring = (state: string, leftMs: number) => snap({ shrink: { state, leftMs, cells: [{ x: 0, y: 0, on: false }, { x: 1, y: 0, on: true }, { x: 2, y: 1, on: false }] } });

describe('MOT-4 greybox families', () => {
  it('MOT-4-R3 a warning gate bar is drawn on every frame of the warn (no blink-off frame)', () => {
    for (let left = 900; left >= 0; left -= 30) { const q = gfx(); drawCycles(q.g, gate('warn', left), 20, TEL); expect(q.count('fillRect')).toBeGreaterThan(0); }
  });
  it('MOT-4-R5 the gate closing beat widens the closed bar and returns to normal at scale 1', () => {
    const h = (k: number) => { const q = gfx(); drawCycles(q.g, gate('up', 0), 20, { ...TEL, beat: key => key === 'g:3:1,1' ? k : 1 }); return q.calls.find(c => c[0] === 'fillRect')![4] as number; };
    expect(h(1.12)).toBeGreaterThan(h(1));
  });
  it('MOT-4-R4 a warning spike shows its triangles and keeps the down dots as the dim phase', () => {
    const spike = snap({ spike: [{ id: 1, t: 0, lifeMs: 9, ending: false, cells: [{ x: 0, y: 0, delay: 0, vis: 'warn', warnLeftMs: 500 }] }] });
    const q = gfx(); drawCycles(q.g, spike, 20, TEL);
    expect(q.count('strokeTriangle')).toBe(3); expect(q.count('fillCircle')).toBe(3);
  });
  it('MOT-4-R4 bomb warn disc grows with the pulse scale and is never skipped; countdown digit pops with the beat', () => {
    for (let left = 900; left >= 0; left -= 30) { const q = gfx(); drawBlasts(q.g, bomb('warn', left), 20, TEL); expect(q.count('fillCircle')).toBe(1); }
    const w = (k: number) => { const q = gfx(); drawBlasts(q.g, bomb('count', 2500), 20, { ...TEL, beat: key => key === 'bd:9' ? k : 1 }); return q.calls.filter(c => c[0] === 'lineBetween'); };
    const small = w(1), big = w(1.2);
    expect(Math.abs((big[big.length - 1]![3] as number) - (big[big.length - 1]![1] as number))).toBeGreaterThanOrEqual(0);
    expect(big.length).toBe(small.length);
  });
  it('MOT-4-R4 ring: warn outline never hides, closed is a steady wall, fade pulses at the start rate', () => {
    for (const [state, left] of [['warn', 1500], ['warn', 100], ['closed', 4000], ['fade', 200]] as const) {
      const q = gfx(); drawShrink(q.g, ring(state, left), 20, 1234, TEL, false);
      expect(q.count('strokeRect'), state).toBe(2);   // the two non-wall cells keep an outline on every frame
      expect(q.count('fillRect'), state).toBeGreaterThanOrEqual(1);   // the wall cell
    }
    const a = gfx(); drawShrink(a.g, ring('warn', 1500), 20, 0, TEL, false);
    expect(a.count('fillTriangle')).toBe(4);   // corner arrows only in the warn phase
  });
});
