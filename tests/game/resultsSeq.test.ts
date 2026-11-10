import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { resultsTimeline } from '../../src/game/flow/entranceOrder';
import { runResultsSequence, type SeqDeps } from '../../src/game/flow/resultsSeq';
import type { MotionTarget } from '../../src/game/motion/motionCore';

const m = json.motion;
const parts = { newBest: true, energy: true, banner: true, next: true, again: true };

function mk(over: Partial<{ reduced: boolean; off: boolean }> = {}) {
  const calls: string[] = [], timers: { at: number; fn: () => void; live: boolean }[] = [];
  const made = (name: string): MotionTarget & { name: string } => {
    const t = { name, x: 5, y: 6, alpha: 1, scaleX: 2, scaleY: 2,
      setScale(x: number, y?: number) { t.scaleX = x; t.scaleY = y ?? x; return t; }, setPosition(x: number, y?: number) { t.x = x; t.y = y ?? t.y; return t; },
      setAlpha(a: number) { t.alpha = a; return t; } };
    return t as never;
  };
  const targets: Record<string, ReturnType<typeof made>> = {};
  for (const k of ['title', 'head', 'card', 'headline', 'scoreLabel', 'score', 'stat0', 'stat1', 'stat2', 'best', 'bestStar', 'energy', 'banner', 'next', 'home', 'again']) targets[k] = made(k);
  const text = { shown: '', setText(s: string) { text.shown = s; return text; } };
  const d: SeqDeps = {
    motion: {
      popIn: (t: never) => calls.push(`pop:${(t as { name: string }).name}`), slideIn: (t: never, from: string) => calls.push(`slide:${(t as { name: string }).name}:${from}`),
      fadeIn: (t: never) => calls.push(`fade:${(t as { name: string }).name}`), pulse: (t: never) => { calls.push(`pulse:${(t as { name: string }).name}`); return () => calls.push('pulseStop'); },
      countUp: (_t: unknown, from: number, to: number) => calls.push(`count:${from}-${to}`),
    },
    later: (ms, fn) => { const e = { at: ms, fn, live: true }; timers.push(e); return { remove: () => { e.live = false; } }; },
    kill: t => calls.push(`kill:${(t as { name: string }).name}`), pulsePeriodMs: m.pulsePeriodMs, reduced: over.reduced === true, off: over.off === true,
  };
  const run = (ms: number) => timers.filter(t => t.live && t.at <= ms).sort((a, b) => a.at - b.at).forEach(t => { t.live = false; t.fn(); });
  return { d, calls, targets, text, timers, run };
}

describe('MOT-2-R9/R10 runResultsSequence', () => {
  it('MOT-2-R9 hides every item first, then plays each item at its time with the right motion', () => {
    const x = mk(); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 1234 });
    expect(Object.values(x.targets).every(t => t.alpha === 0)).toBe(true);
    x.run(0); expect(x.calls).toEqual(['pop:title']);
    x.run(200); expect(x.calls).toContain('count:0-1234'); expect(x.calls).toContain('fade:headline');
    x.run(1100); expect(x.calls).toContain('pop:best'); expect(x.calls).toContain('pulse:bestStar');
    x.run(m.resultsSeqMs); expect(x.calls).toContain('slide:energy:down'); expect(x.calls[x.calls.length - 1]).toBe('pop:again');
  });
  it('MOT-2-R9 the star becomes visible when its pulse starts (pulse itself never touches alpha)', () => {
    const x = mk(); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 10 });
    expect(x.targets.bestStar!.alpha).toBe(0);
    x.run(1100); expect(x.targets.bestStar!.alpha).toBe(1);
  });
  it('MOT-2-R9 the star pulse stops after exactly two periods', () => {
    const x = mk(); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 10 });
    x.run(1100); expect(x.timers.some(t => t.live && t.at === 2 * m.pulsePeriodMs)).toBe(true);
    x.run(1100 + 2 * m.pulsePeriodMs + 1); expect(x.calls).toContain('pulseStop');
  });
  it('MOT-2-R10 skip cancels timers, shows the final score and restores every rest transform', () => {
    const x = mk(); const seq = runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 1234 });
    x.run(300); const title = x.targets.title!; title.setScale(0.1); title.setPosition(99, 99); title.setAlpha(0.3);
    seq.skip();
    expect(x.text.shown).toBe('1234'); expect(seq.done()).toBe(true);
    for (const t of Object.values(x.targets)) expect([t.alpha, t.scaleX, t.scaleY, t.x, t.y]).toEqual([1, 2, 2, 5, 6]);
    const before = x.calls.length; x.run(m.resultsSeqMs); // no timer fires after skip
    expect(x.calls.slice(before).some(c => c.startsWith('pop:') || c.startsWith('slide:'))).toBe(false);
  });
  it('MOT-2-R10 reduced motion shows the final score at once and fades everything in together', () => {
    const x = mk({ reduced: true }); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 77 });
    expect(x.text.shown).toBe('77'); expect(x.timers).toHaveLength(0);
    expect(x.calls.filter(c => c.startsWith('fade:'))).toHaveLength(Object.keys(x.targets).length);
  });
  it('MOT-2-R13 motion=off leaves every target at rest with the final score and plays nothing', () => {
    const x = mk({ off: true }); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 5 });
    expect(x.calls).toEqual([]); expect(x.text.shown).toBe('5'); expect(x.targets.title!.alpha).toBe(1);
  });
  it('MOT-2-R9 timeline ids with no target (marbles slot, missing footer) are skipped', () => {
    const x = mk(); delete (x.targets as Record<string, unknown>).again;
    runResultsSequence(x.d, resultsTimeline({ ...parts, marbles: true }, m), x.targets, { text: x.text, value: 1 });
    x.run(m.resultsSeqMs); expect(x.calls.some(c => c.includes('marbles') || c === 'pop:again')).toBe(false);
  });
  it('MOT-2-R10 done() turns true once the last item has played, so a late tap is a no-op', () => {
    const x = mk(); const seq = runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 9 });
    expect(seq.done()).toBe(false);
    x.run(m.resultsSeqMs); expect(seq.done()).toBe(true);
    const n = x.calls.length; seq.skip(); expect(x.calls.length).toBe(n);
  });
});
