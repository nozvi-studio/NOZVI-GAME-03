import { expect, it } from 'vitest';
import { createMotion, type MotionDeps, type MotionTarget } from '../../src/game/motion/motionCore';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;

const target = (): MotionTarget & { log: string[] } => { const t = { x: 10, y: 20, alpha: 1, scaleX: 1, scaleY: 1, log: [] as string[],
  setScale(x: number, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a: number) { t.alpha = a; return t; },
  setPosition(x: number, y = x) { t.x = x; t.y = y; return t; } }; return t; };
const host = () => { const adds: Record<string, unknown>[] = [], kills: object[] = [];
  return { adds, kills, add: (c: Record<string, unknown>) => { adds.push(c); return { stop: () => {} }; }, killTweensOf: (t: object) => { kills.push(t); } }; };
const make = (over: Partial<MotionDeps> = {}) => { const h = host();
  const m = createMotion({ tweens: h, cfg, softMs: 400, reduced: () => false, finePointer: true, ui: n => n * 2, shake: { ampPx: 4, ms: 120 }, ...over }); return { m, h }; };

it('MOT-0-R1 pressDown tweens scale to pressScale and release ends exactly at rest', () => {
  const { m, h } = make(); const t = target();
  m.pressDown(t); expect(h.adds[0]).toMatchObject({ targets: t, scaleX: cfg.pressScale, duration: cfg.tapDownMs });
  (h.adds[0]!.onComplete as () => void)(); expect(t.scaleX).toBeCloseTo(cfg.pressScale, 10);
  m.release(t); expect(h.adds[1]).toMatchObject({ scaleX: cfg.releaseOvershoot });
  (h.adds[1]!.onComplete as () => void)(); (h.adds[2]!.onComplete as () => void)();
  expect(t.scaleX).toBe(1); expect(t.scaleY).toBe(1); expect(t.x).toBe(10); expect(m.liveCount()).toBe(0);
});
it('MOT-0-R4 starting a motion kills the previous motion on the same target', () => {
  const { m, h } = make(); const t = target(); m.pressDown(t); m.release(t);
  expect(h.kills.filter(k => k === t).length).toBeGreaterThanOrEqual(2);
});
it('MOT-0 budget: at maxTweens a new motion snaps to its end state instead of tweening', () => {
  const { m, h } = make(); const many = Array.from({ length: cfg.maxTweens }, target);
  for (const t of many) m.pressDown(t); const before = h.adds.length;
  const extra = target(); m.pressDown(extra);
  expect(h.adds.length).toBe(before); expect(extra.scaleX).toBeCloseTo(cfg.pressScale, 10);
});
it('MOT-0-R6 reduced motion: flat alpha dip on press, fade-only entrances, no shake, static pulse, instant count-up', () => {
  const { m, h } = make({ reduced: () => true }); const t = target(); const txt = { v: '', setText(s: string) { txt.v = s; } };
  m.pressDown(t); expect(t.alpha).toBe(cfg.reducedPressAlpha); expect(t.scaleX).toBe(1); expect(h.adds.length).toBe(0);
  m.release(t); expect(t.alpha).toBe(1);
  m.popIn(t); expect(h.adds[0]).toMatchObject({ alpha: 1, duration: 400 }); expect(h.adds[0]).not.toHaveProperty('scaleX');
  m.slideIn(t, 'left'); expect(h.adds[1]).not.toHaveProperty('x');
  const n = h.adds.length; m.shake(t); const stop = m.pulse(t); stop(); expect(h.adds.length).toBe(n);
  m.countUp(txt, 0, 120); expect(txt.v).toBe('120'); expect(h.adds.length).toBe(n);
});
it('MOT-0-R3 popIn starts small and transparent, staggers by index, ends at rest scale', () => {
  const { m, h } = make(); const t = target(); t.setScale(2); m.popIn(t, 2);
  expect(t.scaleX).toBeCloseTo(2 * cfg.popFromScale, 10); expect(t.alpha).toBe(0);
  expect(h.adds[0]).toMatchObject({ scaleX: 2, alpha: 1, duration: cfg.popInMs, delay: 2 * cfg.staggerMs, ease: 'Back.easeOut', easeParams: [cfg.overshoot] });
});
it('MOT-0-R3 slideIn offsets by ui(slidePx) toward the rest position', () => {
  const { m, h } = make(); const t = target(); m.slideIn(t, 'left');
  expect(t.x).toBe(10 - cfg.slidePx * 2); expect(h.adds[0]).toMatchObject({ x: 10, alpha: 1, duration: cfg.slideInMs });
});
it('MOT-0-R7 hover only on a fine pointer; shake returns to rest', () => {
  const touch = make({ finePointer: false }); const t = target(); touch.m.hover(t, true); expect(touch.h.adds.length).toBe(0);
  const { m, h } = make(); m.hover(t, true); expect(h.adds[0]).toMatchObject({ scaleX: cfg.hoverScale });
  m.shake(t); expect(h.adds[1]).toMatchObject({ yoyo: true }); (h.adds[1]!.onComplete as () => void)(); expect(t.x).toBe(10);
});
it('MOT-0-R5 countUp tweens a progress value and ends exactly on the target number', () => {
  const { m, h } = make(); const txt = { v: '', setText(s: string) { txt.v = s; } }; m.countUp(txt, 0, 1234);
  const c = h.adds[0]!; expect(c.duration).toBe(cfg.countUpMs);
  (c.onUpdate as () => void)(); (c.onComplete as () => void)(); expect(txt.v).toBe('1234');
});
it('MOT-0 dispose clears the live set', () => { const { m } = make(); m.pressDown(target()); m.dispose(); expect(m.liveCount()).toBe(0); });

it('MOT-4-R5 snap goes rest -> peak -> rest in two phases, ends exactly at rest and calls onDone', () => {
  const { m, h } = make(); const t = target(); let done = 0;
  m.snap(t, cfg.telegraphSnapScale, cfg.telegraphSnapMs, () => { done++; });
  expect(h.adds[0]).toMatchObject({ targets: t, scaleX: cfg.telegraphSnapScale, duration: cfg.telegraphSnapMs / 2 });
  (h.adds[0]!.onComplete as () => void)();
  expect(h.adds[1]).toMatchObject({ scaleX: 1, duration: cfg.telegraphSnapMs / 2 });
  (h.adds[1]!.onComplete as () => void)();
  expect(t.scaleX).toBe(1); expect(t.scaleY).toBe(1); expect(done).toBe(1); expect(m.liveCount()).toBe(0);
});
it('MOT-4-R5 snap kills the previous motion on the same target (kill-by-target) and does nothing under reduced motion', () => {
  const a = make(); const t = target(); a.m.snap(t, 1.1, 100); a.m.snap(t, 1.1, 100);
  expect(a.h.kills.filter(k => k === t).length).toBeGreaterThanOrEqual(2);
  const r = make({ reduced: () => true }); let done = 0; const u = target();
  r.m.snap(u, 1.1, 100, () => { done++; });
  expect(r.h.adds.length).toBe(0); expect(u.scaleX).toBe(1); expect(done).toBe(1);
});
it('MOT-4-R7 ease tweens a plain number with onUpdate and finishes exactly on the target', () => {
  const { m, h } = make(); const p = { v: 0 }; const seen: number[] = [];
  m.ease(p, 10, 200, v => { seen.push(v); });
  expect(h.adds[0]).toMatchObject({ targets: p, v: 10, duration: 200 });
  p.v = 4; (h.adds[0]!.onUpdate as () => void)(); (h.adds[0]!.onComplete as () => void)();
  expect(seen).toEqual([4, 10]); expect(p.v).toBe(10); expect(m.liveCount()).toBe(0);
});
it('MOT-4-R9 ease with ms 0, reduced motion or a full budget jumps to the target without a tween', () => {
  const z = make(); const p = { v: 0 }; let last = -1;
  z.m.ease(p, 5, 0, v => { last = v; }); expect(z.h.adds.length).toBe(0); expect(p.v).toBe(5); expect(last).toBe(5);
  const r = make({ reduced: () => true }); const q = { v: 0 };
  r.m.ease(q, 7, 220, v => { last = v; }); expect(r.h.adds.length).toBe(0); expect(q.v).toBe(7); expect(last).toBe(7);
  const full = make(); for (const t of Array.from({ length: cfg.maxTweens }, target)) full.m.pressDown(t);
  const n = full.h.adds.length, w = { v: 0 }; full.m.ease(w, 3, 220, v => { last = v; });
  expect(full.h.adds.length).toBe(n); expect(w.v).toBe(3); expect(last).toBe(3);
});
