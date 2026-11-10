import { describe, expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { HitBeats, telegraphEdges } from '../../src/game/render/hitBeat';
import type { MotionTarget } from '../../src/game/motion/motionCore';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;
const snap = (over: Record<string, unknown>) => ({ hazards: [], families: { gate: [], spike: [], bomb: [], shrink: null }, ...over }) as unknown as SimSnapshot;
const rock = (state: string) => ({ type: 'rock', state, t: 0, warnMs: 1000, lifeMs: 9, cells: [{ x: 3, y: 4, on: state === 'solid', ageMs: 0 }] });

describe('MOT-4-R5 telegraphEdges', () => {
  it('a rock warn -> solid gives one hit edge, a steady state gives none, and no previous snapshot gives none', () => {
    expect(telegraphEdges(snap({ hazards: [rock('warn')] }), snap({ hazards: [rock('solid')] }))).toEqual([{ key: 'h:rock:3,4', kind: 'hit' }]);
    expect(telegraphEdges(snap({ hazards: [rock('warn')] }), snap({ hazards: [rock('warn')] }))).toEqual([]);
    expect(telegraphEdges(snap({ hazards: [rock('solid')] }), snap({ hazards: [rock('solid')] }))).toEqual([]);
    expect(telegraphEdges(null, snap({ hazards: [rock('solid')] }))).toEqual([]);
  });
  it('gate and spike cells: warn -> up per cell', () => {
    const gate = (vis: string) => snap({ families: { gate: [{ id: 3, gate: [{ x: 1, y: 1, vis }] }], spike: [{ id: 4, cells: [{ x: 2, y: 2, vis }] }], bomb: [], shrink: null } });
    expect(telegraphEdges(gate('warn'), gate('up'))).toEqual([{ key: 'g:3:1,1', kind: 'hit' }, { key: 's:4:2,2', kind: 'hit' }]);
    expect(telegraphEdges(gate('down'), gate('up'))).toEqual([]);
  });
  it('bomb lands (warn -> count) is a hit; a digit change while counting is a digit pop; an unchanged digit is nothing', () => {
    const bomb = (state: string, leftMs: number) => snap({ families: { gate: [], spike: [], bomb: [{ id: 9, state, leftMs }], shrink: null } });
    expect(telegraphEdges(bomb('warn', 5), bomb('count', 3000))).toEqual([{ key: 'b:9', kind: 'hit' }]);
    expect(telegraphEdges(bomb('count', 2001), bomb('count', 2000))).toEqual([{ key: 'bd:9', kind: 'digit' }]);   // ceil(2001/1000) = 3, ceil(2000/1000) = 2 -> digit changes
    expect(telegraphEdges(bomb('count', 2500), bomb('count', 2400))).toEqual([]);          // same digit 3
  });
  it('ring warn -> closed is one hit edge', () => {
    const ring = (state: string) => snap({ families: { gate: [], spike: [], bomb: [], shrink: { state, leftMs: 0, cells: [] } } });
    expect(telegraphEdges(ring('warn'), ring('closed'))).toEqual([{ key: 'r', kind: 'hit' }]);
    expect(telegraphEdges(ring('closed'), ring('fade'))).toEqual([]);
  });
});

describe('MOT-4-R5 HitBeats', () => {
  const fakeMotion = () => { const calls: { t: MotionTarget; peak: number; ms: number; done?: () => void }[] = [];
    return { calls, snap: (t: MotionTarget, peak: number, ms: number, done?: () => void) => { calls.push({ t, peak, ms, done }); t.setScale(peak); } }; };
  it('plays hit edges at telegraphSnapScale/Ms and digit edges at digitPopScale/Ms; scale() reads the live proxy and drops it on done', () => {
    const m = fakeMotion(), beats = new HitBeats(m, cfg);
    beats.play([{ key: 'h:rock:3,4', kind: 'hit' }, { key: 'bd:9', kind: 'digit' }]);
    expect(m.calls[0]).toMatchObject({ peak: cfg.telegraphSnapScale, ms: cfg.telegraphSnapMs });
    expect(m.calls[1]).toMatchObject({ peak: cfg.digitPopScale, ms: cfg.digitPopMs });
    expect(beats.scale('h:rock:3,4')).toBe(cfg.telegraphSnapScale); expect(beats.scale('nope')).toBe(1);
    m.calls[0]!.t.setScale(1); m.calls[0]!.done!();
    expect(beats.scale('h:rock:3,4')).toBe(1);
  });
  it('a repeated key reuses its proxy (kill-by-target) and clear() empties the registry', () => {
    const m = fakeMotion(), beats = new HitBeats(m, cfg);
    beats.play([{ key: 'r', kind: 'hit' }]); beats.play([{ key: 'r', kind: 'hit' }]);
    expect(m.calls[0]!.t).toBe(m.calls[1]!.t);
    beats.clear(); expect(beats.scale('r')).toBe(1);
  });
});
