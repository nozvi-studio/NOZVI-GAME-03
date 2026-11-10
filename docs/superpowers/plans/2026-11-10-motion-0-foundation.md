# MOT-0 Motion Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the shared motion layer (pure curves, `balance.motion`, one tween adapter with kill-by-target, budget and reduced-motion rules) that MOT-1..4 build on.

**Architecture:** `src/game/motion/curves.ts` is pure math. `motionCore.ts` is a Phaser-free adapter factory `createMotion(deps)` that takes the tween host, config and flags by injection (unit-testable with a recording fake). `motion.ts` wires it to a real `Phaser.Scene` (`motionFor(scene)`). Config lives in `config/balance.json` `motion`, parsed by `src/core/balance.ts`.

**Tech Stack:** TypeScript strict, Phaser 3.90 tweens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-motion-0-foundation-design.md` (read it first; this plan covers its sections 3-7. `transition.ts` (`goTo`/`enter`) is NOT in this plan: it moves to the MOT-2 plan).

## Global Constraints
- Windows test flags: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <pattern>`; full suite `npm test -- --configLoader native --pool threads --maxWorkers 2`; `npm run typecheck`.
- English only; Conventional Commits ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; add a CHANGELOG `[Unreleased]` line per commit; no push.
- No magic numbers: every duration/scale is a `balance.motion` key. No Phaser import in `curves.ts` or `motionCore.ts`. Light mode only.
- Test names carry `MOT-0-Rn`.

## File map
- Create `src/game/motion/curves.ts`, `src/game/motion/motionCore.ts`, `src/game/motion/motion.ts`, `src/game/motion/index.ts`
- Create `tests/game/motionCurves.test.ts`, `tests/game/motionCore.test.ts`, `tests/core/balanceMotion.test.ts`
- Modify `src/core/balance.ts` (type, schema, validator), `config/balance.json`, `docs/CODEMAP.md`, spec table (`reducedPressAlpha`)

---

### Task 1: Pure curves

**Files:** Create `src/game/motion/curves.ts`; Test `tests/game/motionCurves.test.ts`

**Interfaces:** Produces `clamp01(t)`, `lerp(a,b,t)`, `cubicOut(t)`, `sineInOut(t)`, `backOut(t, s?)`, `staggerDelay(index, stepMs, capMs)`, `countUpValue(from, to, t)`, `pulseScale(timeMs, periodMs, amp)`.

- [ ] **Step 1: Write the failing test** `tests/game/motionCurves.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { backOut, clamp01, countUpValue, cubicOut, lerp, pulseScale, sineInOut, staggerDelay } from '../../src/game/motion/curves';

describe('MOT-0 curves', () => {
  it('MOT-0-R1 easings hit 0 at t=0 and 1 at t=1 and clamp outside', () => {
    for (const f of [cubicOut, sineInOut, (t: number) => backOut(t, 1.7)]) {
      expect(f(0)).toBeCloseTo(0, 10); expect(f(1)).toBeCloseTo(1, 10);
      expect(f(-3)).toBeCloseTo(0, 10); expect(f(9)).toBeCloseTo(1, 10);
    }
  });
  it('MOT-0-R1 backOut overshoots above 1 before settling', () => {
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(t => backOut(t, 1.7)))).toBeGreaterThan(1);
  });
  it('MOT-0-R3 staggerDelay grows by step and is capped', () => {
    expect([0, 1, 2].map(i => staggerDelay(i, 50, 300))).toEqual([0, 50, 100]);
    expect(staggerDelay(99, 50, 300)).toBe(300); expect(staggerDelay(-2, 50, 300)).toBe(0);
  });
  it('MOT-0-R5 countUpValue is monotone, integer and exact at the end', () => {
    const v = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map(t => countUpValue(0, 1234, t));
    expect(v[0]).toBe(0); expect(v[v.length - 1]).toBe(1234);
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeGreaterThanOrEqual(v[i - 1]!);
    expect(v.every(Number.isInteger)).toBe(true);
    expect(countUpValue(50, 10, 1)).toBe(10); expect(countUpValue(50, 10, 0)).toBe(50);
  });
  it('MOT-0-R3 pulseScale is 1 +/- amp with the exact period', () => {
    expect(pulseScale(0, 900, 0.04)).toBeCloseTo(1, 10);
    expect(pulseScale(225, 900, 0.04)).toBeCloseTo(1.04, 10);
    expect(pulseScale(900, 900, 0.04)).toBeCloseTo(1, 10);
    expect(lerp(2, 4, 0.5)).toBe(3); expect(clamp01(2)).toBe(1);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/motionCurves` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/motion/curves.ts`
```ts
// MOT-0 pure motion math: no Phaser, no allocation per call. Spec: 2026-11-10-motion-0-foundation-design.md section 5.
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const cubicOut = (t: number): number => { const u = 1 - clamp01(t); return 1 - u * u * u; };
export const sineInOut = (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
/** Back ease-out: overshoots 1 by an amount set by s (Phaser's default is 1.70158). */
export const backOut = (t: number, s = 1.70158): number => { const x = clamp01(t) - 1; return 1 + x * x * ((s + 1) * x + s); };
/** MOT-0-R3 per-index entrance delay, capped. */
export const staggerDelay = (index: number, stepMs: number, capMs: number): number => Math.min(capMs, Math.max(0, index) * stepMs);
/** MOT-0-R5 integer count-up; exact `to` at t >= 1. */
export const countUpValue = (from: number, to: number, t: number): number => t >= 1 ? to : Math.round(lerp(from, to, cubicOut(t)));
/** MOT-0-R3 attention pulse scale: 1 +/- amp, one full period per periodMs. */
export const pulseScale = (timeMs: number, periodMs: number, amp: number): number => 1 + amp * Math.sin(2 * Math.PI * timeMs / periodMs);
```
- [ ] **Step 4:** Re-run the test -> PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(motion): MOT-0 pure curves` (+ CHANGELOG line).

---

### Task 2: `balance.motion` config, schema and validator

**Files:** Modify `src/core/balance.ts`, `config/balance.json`; Test `tests/core/balanceMotion.test.ts`

**Interfaces:** Produces `Balance['motion']` typed as `MotionBalance` (export the interface from `src/core/balance.ts`; re-export from `src/core/index.ts` if other balance types are).

- [ ] **Step 1: Write the failing test** `tests/core/balanceMotion.test.ts`. Copy the balance loading helper used at the top of `tests/core/balance.test.ts` (same import of the JSON and `parseBalance`) and write:
```ts
// (imports and `raw` = the parsed config/balance.json object, exactly as in tests/core/balance.test.ts)
const withMotion = (patch: Record<string, unknown>) => ({ ...raw, motion: { ...(raw as any).motion, ...patch } });
it('MOT-0 config exposes every balance.motion key', () => {
  const m = parseBalance(raw).motion;
  expect(m.tapDownMs).toBe(80); expect(m.pressScale).toBe(0.94); expect(m.releaseOvershoot).toBe(1.06);
  expect(m.maxTweens).toBe(40); expect(m.reducedPressAlpha).toBe(0.85);
});
it('MOT-0 rejects releaseOvershoot <= 1 and pressScale >= 1', () => {
  expect(() => parseBalance(withMotion({ releaseOvershoot: 1 }))).toThrow(/motion\.releaseOvershoot/);
  expect(() => parseBalance(withMotion({ pressScale: 1 }))).toThrow(/motion\.pressScale/);
});
it('MOT-0 rejects staggerCapMs < staggerMs, telegraphHzEnd <= Start, disabledAlpha >= 1, idleBreathAmp >= pulseAmp', () => {
  expect(() => parseBalance(withMotion({ staggerCapMs: 10 }))).toThrow(/motion\.staggerCapMs/);
  expect(() => parseBalance(withMotion({ telegraphHzEnd: 2 }))).toThrow(/motion\.telegraphHzEnd/);
  expect(() => parseBalance(withMotion({ disabledAlpha: 1 }))).toThrow(/motion\.disabledAlpha/);
  expect(() => parseBalance(withMotion({ idleBreathAmp: 0.05 }))).toThrow(/motion\.idleBreathAmp/);
});
it('MOT-0 rejects resultsSeqMs shorter than 200 + countUpMs + popInMs and non-positive numbers', () => {
  expect(() => parseBalance(withMotion({ resultsSeqMs: 500 }))).toThrow(/motion\.resultsSeqMs/);
  expect(() => parseBalance(withMotion({ tapUpMs: 0 }))).toThrow(/motion\.tapUpMs/);
});
```
- [ ] **Step 2:** Run it -> FAIL.
- [ ] **Step 3: Implement.**
  (a) In `src/core/balance.ts` add above `export interface Balance`:
```ts
/** MOT-0 motion tokens (all tuned by feel; see docs/superpowers/specs/2026-11-10-motion-0-foundation-design.md section 4). */
export interface MotionBalance {
  tapDownMs: number; tapUpMs: number; pressScale: number; releaseOvershoot: number; hoverScale: number; reducedPressAlpha: number;
  popInMs: number; popFromScale: number; slideInMs: number; slidePx: number; fadeMs: number; staggerMs: number; staggerCapMs: number;
  countUpMs: number; pulsePeriodMs: number; pulseAmp: number; overshoot: number; maxTweens: number;
  toggleSlideMs: number; disabledAlpha: number;
  idleBreathAmp: number; idleStartMs: number; idlePauseMs: number; resultsSeqMs: number;
  telegraphHzStart: number; telegraphHzEnd: number; telegraphAlphaMin: number; telegraphScaleAmp: number; telegraphUrgentMs: number;
  telegraphSnapScale: number; telegraphSnapMs: number; digitPopMs: number; hudTickMs: number; barEaseMs: number; barSpendMs: number; energyLowFrac: number;
}
```
  Add `motion: MotionBalance;` to `Balance` right after the `juice: {...};` member.
  (b) In the schema object (next to `juice: {...}` near line 220) add:
```ts
  motion: {
    tapDownMs: 'int+', tapUpMs: 'int+', pressScale: 'num+', releaseOvershoot: 'num+', hoverScale: 'num+', reducedPressAlpha: 'prob',
    popInMs: 'int+', popFromScale: 'num+', slideInMs: 'int+', slidePx: 'num+', fadeMs: 'int+', staggerMs: 'int+', staggerCapMs: 'int+',
    countUpMs: 'int+', pulsePeriodMs: 'int+', pulseAmp: 'num+', overshoot: 'num+', maxTweens: 'int+',
    toggleSlideMs: 'int+', disabledAlpha: 'prob',
    idleBreathAmp: 'num+', idleStartMs: 'int+', idlePauseMs: 'int+', resultsSeqMs: 'int+',
    telegraphHzStart: 'num+', telegraphHzEnd: 'num+', telegraphAlphaMin: 'prob', telegraphScaleAmp: 'num+', telegraphUrgentMs: 'int+',
    telegraphSnapScale: 'num+', telegraphSnapMs: 'int+', digitPopMs: 'int+', hudTickMs: 'int+', barEaseMs: 'int+', barSpendMs: 'int+', energyLowFrac: 'prob',
  },
```
  (if the schema type does not accept this nesting exactly like `juice`, mirror whatever `juice`/`ui.hud` do).
  (c) In the cross-field validation block (near the `jd`/`juice.reduced` checks) add, using the same `fail(path, message)` helper:
```ts
  const mo = b.motion;
  if (mo.pressScale >= 1) fail('motion.pressScale', 'must be < 1');
  if (mo.releaseOvershoot <= 1) fail('motion.releaseOvershoot', 'must be > 1');
  if (mo.hoverScale <= 1) fail('motion.hoverScale', 'must be > 1');
  if (mo.popFromScale >= 1) fail('motion.popFromScale', 'must be < 1');
  if (mo.staggerCapMs < mo.staggerMs) fail('motion.staggerCapMs', 'must be >= staggerMs');
  if (mo.telegraphHzEnd <= mo.telegraphHzStart) fail('motion.telegraphHzEnd', 'must be > telegraphHzStart');
  if (mo.telegraphSnapScale <= 1 || mo.telegraphSnapScale >= 2) fail('motion.telegraphSnapScale', 'must be in (1, 2)');
  if (mo.disabledAlpha >= 1) fail('motion.disabledAlpha', 'must be < 1');
  if (mo.idleBreathAmp >= mo.pulseAmp) fail('motion.idleBreathAmp', 'must be < pulseAmp');
  if (mo.resultsSeqMs < 200 + mo.countUpMs + mo.popInMs) fail('motion.resultsSeqMs', 'must be >= 200 + countUpMs + popInMs');
```
  (d) In `config/balance.json` add after the `juice` block:
```json
  "motion": {
    "tapDownMs": 80, "tapUpMs": 180, "pressScale": 0.94, "releaseOvershoot": 1.06, "hoverScale": 1.03, "reducedPressAlpha": 0.85,
    "popInMs": 240, "popFromScale": 0.85, "slideInMs": 260, "slidePx": 28, "fadeMs": 180, "staggerMs": 50, "staggerCapMs": 300,
    "countUpMs": 900, "pulsePeriodMs": 900, "pulseAmp": 0.04, "overshoot": 1.7, "maxTweens": 40,
    "toggleSlideMs": 160, "disabledAlpha": 0.45,
    "idleBreathAmp": 0.02, "idleStartMs": 1200, "idlePauseMs": 4000, "resultsSeqMs": 1500,
    "telegraphHzStart": 2.0, "telegraphHzEnd": 6.0, "telegraphAlphaMin": 0.55, "telegraphScaleAmp": 0.05, "telegraphUrgentMs": 300,
    "telegraphSnapScale": 1.12, "telegraphSnapMs": 120, "digitPopMs": 160, "hudTickMs": 360, "barEaseMs": 220, "barSpendMs": 160, "energyLowFrac": 0.2
  },
```
  (e) In the spec's section 4 table add the row `| reducedPressAlpha | 0.85 | MOT-0-R6 flat alpha dip on press in reduced motion |`.
- [ ] **Step 4:** Run `tests/core/balanceMotion` and `tests/core/balance` -> PASS; `npm run typecheck`. If another test builds a full `Balance` literal and now fails typecheck, add `motion` there from the JSON (do not weaken it).
- [ ] **Step 5: Commit** `feat(balance): MOT-0 balance.motion block and validator`.

---

### Task 3: Adapter core (kill-by-target, budget, reduced motion)

**Files:** Create `src/game/motion/motionCore.ts`; Test `tests/game/motionCore.test.ts`

**Interfaces:**
- Consumes: Task 1 curves, Task 2 `MotionBalance`.
- Produces:
```ts
export interface MotionTarget { x: number; y: number; alpha: number; scaleX: number; scaleY: number;
  setScale(x: number, y?: number): unknown; setAlpha(a: number): unknown; setPosition(x: number, y?: number): unknown }
export interface TextTarget { setText(s: string): unknown }
export interface TweenHandle { stop(): unknown }
export interface TweenHost { add(cfg: Record<string, unknown>): TweenHandle; killTweensOf(t: object): unknown }
export interface MotionDeps { tweens: TweenHost; cfg: MotionBalance; softMs: number; reduced: () => boolean; finePointer: boolean;
  ui: (mockPx: number) => number; shake: { ampPx: number; ms: number } }
export interface Motion {
  pressDown(t: MotionTarget): void; release(t: MotionTarget): void; hover(t: MotionTarget, on: boolean): void;
  popIn(t: MotionTarget, index?: number): void; slideIn(t: MotionTarget, from: 'left' | 'right' | 'up' | 'down', index?: number): void;
  fadeIn(t: MotionTarget): void; fadeOut(t: MotionTarget): void; shake(t: MotionTarget): void;
  pulse(t: MotionTarget): () => void; countUp(t: TextTarget, from: number, to: number, fmt?: (n: number) => string): void;
  liveCount(): number; dispose(): void;
}
export function createMotion(d: MotionDeps): Motion;
```

- [ ] **Step 1: Write the failing test** `tests/game/motionCore.test.ts` with a recording fake host and fake targets:
```ts
import { describe, expect, it } from 'vitest';
import { createMotion, type MotionDeps, type MotionTarget } from '../../src/game/motion/motionCore';
import { parseBalance } from '../../src/core';
// load the JSON exactly as tests/core/balance.test.ts does, then: const cfg = parseBalance(raw).motion;

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
```
- [ ] **Step 2:** Run it -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/motion/motionCore.ts`. Required behaviour (write the real code; every number from `d.cfg`):
  - `rest(t)`: WeakMap of `{sx, sy, x, y, a}` captured the first time a target is touched.
  - `play(t, cfg, finalState)`: `d.tweens.killTweensOf(t)`; `live.delete(t)`; if `live.size >= d.cfg.maxTweens` call `finalState()` and return null (snap, MOT-0 budget); else `live.add(t)` and `d.tweens.add({ targets: t, ...cfg, onComplete: () => { live.delete(t); finalState(); } })`.
  - `pressDown`: reduced -> `t.setAlpha(r.a * cfg.reducedPressAlpha)`; else `play(t, { scaleX: r.sx * cfg.pressScale, scaleY: r.sy * cfg.pressScale, duration: cfg.tapDownMs, ease: 'Quad.easeOut' }, () => t.setScale(r.sx * cfg.pressScale, r.sy * cfg.pressScale))`.
  - `release`: reduced -> `t.setAlpha(r.a)`; else phase 1 `play(t, { scaleX/scaleY: r.s * cfg.releaseOvershoot, duration: Math.round(cfg.tapUpMs * 0.4), ease: 'Quad.easeOut' }, startPhase2)` and phase 2 `play(t, { scaleX: r.sx, scaleY: r.sy, duration: cfg.tapUpMs - Math.round(cfg.tapUpMs * 0.4), ease: 'Sine.easeInOut' }, () => snapRest(t))` (`startPhase2` runs phase 2; both snap to the exact rest in their final state).
  - `hover(t, on)`: return if `reduced()` or `!d.finePointer`; tween scale to `r.s * (on ? cfg.hoverScale : 1)` over `tapDownMs`.
  - `popIn(t, index = 0)`: `delay = staggerDelay(index, cfg.staggerMs, cfg.staggerCapMs)`. Reduced: `t.setAlpha(0)`, `play(t, { alpha: r.a, duration: d.softMs, delay }, ...)` (no scale key). Else `t.setScale(r.sx * cfg.popFromScale, r.sy * cfg.popFromScale); t.setAlpha(0)`, `play(t, { scaleX: r.sx, scaleY: r.sy, alpha: r.a, duration: cfg.popInMs, delay, ease: 'Back.easeOut', easeParams: [cfg.overshoot] }, () => snapRest(t))`.
  - `slideIn(t, from, index = 0)`: offset `d.ui(cfg.slidePx)` along the axis (`left` -> x - off, `right` -> x + off, `up` -> y - off, `down` -> y + off). Reduced: fade only (as popIn reduced, no x/y key). Else set the start position and alpha 0, `play(t, { x: r.x, y: r.y, alpha: r.a, duration: cfg.slideInMs, delay, ease: 'Cubic.easeOut' }, () => snapRest(t))`.
  - `fadeIn/fadeOut`: `play(t, { alpha: 1 | 0, duration: reduced ? d.softMs : cfg.fadeMs }, () => t.setAlpha(1 | 0))`.
  - `shake`: no-op when reduced; else `play(t, { x: r.x + d.shake.ampPx, duration: d.shake.ms / 4, yoyo: true, repeat: 1 }, () => t.setPosition(r.x, r.y))`.
  - `pulse(t)`: reduced or budget full -> return `() => {}`; else a looping tween `{ scaleX: r.sx * (1 + cfg.pulseAmp), scaleY: ..., duration: cfg.pulsePeriodMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }`; the returned `stop()` calls `d.tweens.killTweensOf(t)`, `live.delete(t)`, `snapRest(t)`.
  - `countUp(t, from, to, fmt = String)`: reduced -> `t.setText(fmt(to))`. Else set a numeric progress property on the target object (`(t as unknown as { motionP: number }).motionP = 0`) and `play(t, { motionP: 1, duration: cfg.countUpMs, ease: 'Linear', onUpdate: () => t.setText(fmt(countUpValue(from, to, host.motionP))) }, () => t.setText(fmt(to)))`.
  - `liveCount()` = `live.size`; `dispose()` clears `live`.
  Note: `play` receives `onUpdate` inside `cfg` and spreads it, so do not clobber it with `onComplete`.
- [ ] **Step 4:** Run `tests/game/motionCore` -> PASS; typecheck.
- [ ] **Step 5: Commit** `feat(motion): MOT-0 adapter core with kill-by-target, budget and reduced motion`.

---

### Task 4: Scene binding, exports, docs, verification, merge

**Files:** Create `src/game/motion/motion.ts`, `src/game/motion/index.ts`; Modify `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/superpowers/specs/2026-11-10-motion-0-foundation-design.md` (move `transition.ts` row to MOT-2)

**Interfaces:** Produces `motionFor(scene: Phaser.Scene): Motion` (cached per scene, disposed on `shutdown`).

- [ ] **Step 1: Implement** `src/game/motion/motion.ts`
```ts
import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { reduceMotion } from '../render/palette';
import { ui } from '../ui/layout';
import { createMotion, type Motion, type TweenHost } from './motionCore';

const cache = new WeakMap<object, Motion>();
/** MOT-0 per-scene motion adapter: kill-by-target, tween budget, reduced motion (spec section 5/6). */
export function motionFor(scene: Phaser.Scene): Motion {
  let m = cache.get(scene);
  if (m) return m;
  const b = scene.registry.get('balance') as Balance;
  m = createMotion({ tweens: scene.tweens as unknown as TweenHost, cfg: b.motion, softMs: b.juice.reduced.softMs, reduced: reduceMotion,
    finePointer: !scene.sys.game.device.input.touch, ui, shake: { ampPx: b.ui.hud.rejectShakeAmpPx, ms: b.ui.hud.rejectShakeMs } });
  const made = m; cache.set(scene, made);
  scene.events.once('shutdown', () => { made.dispose(); cache.delete(scene); });
  return made;
}
```
and `src/game/motion/index.ts`: `export * from './curves'; export * from './motionCore'; export { motionFor } from './motion';`. If `ui` is not exported from `../ui/layout` under that name, use the name the other HUD files import.
- [ ] **Step 2: Smoke-test the binding** with a tiny test in `tests/game/motionCore.test.ts` using `makeScene` from `tests/support/scene.ts` only if it already provides `registry.get('balance')`; otherwise skip (the factory is covered by Task 3) and rely on typecheck.
- [ ] **Step 3: Docs.** Add a `src/game/motion/` row to `docs/CODEMAP.md` (curves, motionCore, motion; MOT-0). In the spec section 5 move the `transition.ts` sentence to "MOT-2 adds `transition.ts`". CHANGELOG: `- feat(motion): MOT-0 motion foundation (curves, balance.motion, adapter)`.
- [ ] **Step 4: Verify (sequential).** `npm test -- --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`; both pass. grep: `grep -rn "scene.tweens.add\|this.tweens.add" src/game/motion` returns nothing.
- [ ] **Step 5: Commit and merge.**
```bash
git add -A && git commit -m "feat(motion): MOT-0 scene binding, exports and docs"
git checkout version/v0.3 && git merge --no-ff feat/motion-0-foundation -m "Merge branch 'feat/motion-0-foundation' into version/v0.3"
```

## Self-review
- Spec coverage: R1 (states: Task 3 press/release/hover), R2 (callers wait `tapUpMs`; documented, enforced in MOT-1), R3 (popIn/slideIn/stagger/pulse), R4 (kill-by-target test), R5 (short motions + countUp), R6 (reduced test), R7 (budget, fine pointer, dispose), section 4 config + validator (Task 2). `transition.ts` is deferred to MOT-2 by design.
- Types: `MotionDeps.cfg` is `MotionBalance`; `Motion` method names are identical in the test and the implementation notes.
