import { describe, expect, it } from 'vitest';
import { createMotion, type MotionTarget } from '../../src/game/motion/motionCore';
import { createFeedback, runSlide } from '../../src/game/ui/feedbackCore';
import { halfMotionCfg, type FeedbackKind } from '../../src/game/ui/feedbackModel';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;
const target = (): MotionTarget => { const t = { x: 10, y: 20, alpha: 1, scaleX: 1, scaleY: 1,
  setScale(x: number, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a: number) { t.alpha = a; return t; },
  setPosition(x: number, y = x) { t.x = x; t.y = y; return t; } }; return t; };
const make = (kind: FeedbackKind, over: { reduced?: boolean; fine?: boolean; navigates?: boolean; dipPx?: number; n?: number } = {}) => {
  const adds: Record<string, unknown>[] = [], delays: { ms: number; fn: () => void }[] = [];
  const host = { add: (c: Record<string, unknown>) => { adds.push(c); return { stop: () => {} }; }, killTweensOf: (_t: object) => {} };
  const reduced = () => over.reduced === true;
  const mk = (c: typeof cfg) => createMotion({ tweens: host, cfg: c, softMs: 400, reduced, finePointer: over.fine !== false, ui: n => n, shake: { ampPx: 4, ms: 120 } });
  const motion = mk(cfg), half = mk(halfMotionCfg(cfg));
  const visuals = Array.from({ length: over.n ?? 1 }, target);
  const fb = createFeedback({ motion, half, cfg, reduced, delay: (ms, fn) => { delays.push({ ms, fn }); } }, visuals, kind,
    { navigates: over.navigates, dipPx: over.dipPx });
  const finish = (): void => { for (const a of adds.splice(0)) (a.onComplete as (() => void) | undefined)?.(); };
  return { fb, adds, delays, visuals, motion, finish };
};

describe('MOT-1 feedback core', () => {
  it('MOT-1-R3 press then release ends exactly at the rest scale and position', () => {
    const { fb, adds, visuals, finish } = make('round');
    fb.press(); expect(adds[0]).toMatchObject({ scaleX: cfg.pressScale, duration: cfg.tapDownMs });
    finish(); fb.release(); expect(adds[0]).toMatchObject({ scaleX: cfg.releaseOvershoot });
    finish(); finish();
    expect(visuals[0]!.scaleX).toBe(1); expect(visuals[0]!.scaleY).toBe(1); expect(visuals[0]!.x).toBe(10); expect(visuals[0]!.y).toBe(20);
  });
  it('MOT-1-R5 pill dips by dipPx on press and returns at once on release, shelf untouched', () => {
    const { fb, visuals, finish } = make('pill', { n: 2, dipPx: 3 });
    fb.press(); expect(visuals.map(v => v.y)).toEqual([23, 23]);
    fb.release(); expect(visuals.map(v => v.y)).toEqual([20, 20]);
    finish(); finish(); expect(visuals.map(v => v.y)).toEqual([20, 20]);
  });
  it('MOT-1-R3 a double press leaves one live tween per target', () => {
    const { fb, motion } = make('round'); fb.press(); fb.press();
    expect(motion.liveCount()).toBe(1);
  });
  it('MOT-1-R3 card kind uses the half-delta scales', () => {
    const { fb, adds } = make('card'); fb.press();
    expect(adds[0]!.scaleX as number).toBeCloseTo(1 - (1 - cfg.pressScale) / 2, 10);
  });
  it('MOT-1-R3 hover scales on fine pointers only, not for hudButton or switch, and release clears the hover flag', () => {
    const a = make('pill'); a.fb.over(); expect(a.adds[0]).toMatchObject({ scaleX: cfg.hoverScale });
    a.fb.out(); expect(a.adds[1]).toMatchObject({ scaleX: 1 });
    const t = make('pill', { fine: false }); t.fb.over(); expect(t.adds.length).toBe(0);
    for (const k of ['hudButton', 'switch'] as const) { const m = make(k); m.fb.over(); expect(m.adds.length).toBe(0); }
    const r = make('round'); r.fb.over(); r.fb.press(); r.fb.release(); const n = r.adds.length; r.fb.out(); expect(r.adds.length).toBe(n);
  });
  it('MOT-1-R6 reduced motion: flat alpha dip, no scale, no dip, hover ignored', () => {
    const { fb, adds, visuals } = make('pill', { reduced: true, dipPx: 3 });
    fb.press(); expect(visuals[0]!.alpha).toBe(cfg.reducedPressAlpha); expect(visuals[0]!.scaleX).toBe(1); expect(visuals[0]!.y).toBe(20);
    fb.release(); expect(visuals[0]!.alpha).toBe(1); fb.over(); expect(adds.length).toBe(0);
  });
  it('MOT-1-R4 navigates defers the action by tapUpMs, ignores a second tap, and is immediate under reduced motion', () => {
    const a = make('pill', { navigates: true }); let n = 0;
    a.fb.fire(() => n++); expect(n).toBe(0); expect(a.delays[0]!.ms).toBe(cfg.tapUpMs);
    a.fb.fire(() => n++); expect(a.delays.length).toBe(1);
    a.delays[0]!.fn(); expect(n).toBe(1);
    const r = make('pill', { navigates: true, reduced: true }); let m = 0; r.fb.fire(() => m++); expect(m).toBe(1); expect(r.delays.length).toBe(0);
    const p = make('pill'); let k = 0; p.fb.fire(() => k++); p.fb.fire(() => k++); expect(k).toBe(2); expect(p.delays.length).toBe(0);
  });
  it('MOT-1-R11 reject shakes without a scale change; reduced motion gives a flat alpha dip that restores', () => {
    const a = make('card'); a.fb.reject();
    expect(a.adds[0]).toHaveProperty('x'); expect(a.adds[0]).not.toHaveProperty('scaleX');
    const r = make('card', { reduced: true }); r.fb.reject();
    expect(r.visuals[0]!.alpha).toBe(cfg.reducedPressAlpha); expect(r.delays[0]!.ms).toBe(cfg.tapDownMs);
    r.delays[0]!.fn(); expect(r.visuals[0]!.alpha).toBe(1);
  });
  it('MOT-1-R12 disabled sets disabledAlpha, suppresses press and hover, and restores alpha', () => {
    const { fb, adds, visuals } = make('pill');
    fb.setDisabled(true); expect(visuals[0]!.alpha).toBe(cfg.disabledAlpha);
    fb.press(); fb.over(); expect(adds.length).toBe(0);
    fb.setDisabled(false); expect(visuals[0]!.alpha).toBe(1);
    fb.press(); expect(adds.length).toBe(1);
  });
  it('MOT-1-R10 pop plays one overshoot ending at rest', () => {
    const { fb, adds, visuals, finish } = make('card'); fb.pop();
    expect(adds[0]!.scaleX as number).toBeCloseTo(1 + (cfg.releaseOvershoot - 1) / 2, 10);
    finish(); finish(); expect(visuals[0]!.scaleX).toBe(1);
  });
  it('MOT-1-R7 destroy stops all feedback', () => {
    const { fb, adds } = make('pill'); fb.destroy(); fb.press(); fb.over(); fb.pop(); fb.reject();
    expect(adds.length).toBe(0);
  });
  it('MOT-1-R8 runSlide reports 0 first, advances by update deltas, ends at exactly 1 and then detaches', () => {
    const ls: ((time: number, delta: number) => void)[] = [], ts: number[] = [];
    const host = { events: { on: (_e: string, f: (a: number, b: number) => void) => { ls.push(f); }, off: (_e: string, f: (a: number, b: number) => void) => { ls.splice(ls.indexOf(f), 1); } } };
    runSlide(host, 160, t => ts.push(t));
    expect(ts).toEqual([0]); ls[0]!(0, 80); expect(ts[1]).toBe(0.5); ls[0]!(0, 200);
    expect(ts[2]).toBe(1); expect(ls.length).toBe(0);
    const cancel = runSlide(host, 160, () => {}); cancel(); expect(ls.length).toBe(0);
  });
});
