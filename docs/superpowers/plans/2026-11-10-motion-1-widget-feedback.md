# MOT-1 Widget Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every menu widget (pill and round buttons, cards, theme tiles, switches, HUD pause, greybox button) one consistent press, release, hover, reject and disabled feedback built on the MOT-0 adapter, plus a knob slide on Settings switches.

**Architecture:** A Phaser-free `feedbackCore.ts` (`createFeedback`) holds the state machine (pressed, hover, disabled, navigate latch) and talks only to the injected MOT-0 `Motion` instances. `feedback.ts` wires it to a real scene (`attachFeedback`, `feedbackOf`, `pivotAt`) and `feedbackModel.ts` holds pure math (scales, knob x, colour lerp). Widget factories (`pillButton`, `tap`, `roundIconButton`, `button`, `HudTop`) call the wrapper; scenes only pass kinds and flags. Rebuild-heavy scenes (Settings, Loadout) keep a `prev` map and animate state changes from the previous value.

**Tech Stack:** TypeScript strict, Phaser 3.90, Vitest (Phaser mocked with `vi.mock('phaser')`).

**Spec:** `docs/superpowers/specs/2026-11-10-motion-1-widget-feedback-design.md` (read it first; this plan covers all of it). MOT-0 plan/spec for the adapter: `docs/superpowers/plans/2026-11-10-motion-0-foundation.md`.

## Global Constraints
- Windows test flags: one test file `npx vitest run --configLoader native --pool threads --maxWorkers 2 <pattern>`; full suite `npm test -- --configLoader native --pool threads --maxWorkers 2`; then `npm run typecheck`. Run the full suite only before the last task's merge (AGENTS.md 6b); each task runs only its own tests plus typecheck.
- English only; Conventional Commits ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; add a CHANGELOG `## [Unreleased]` line per commit; no push; do not edit AGENTS.md, CLAUDE.md, `.claude/`, `.github/`.
- Build ONLY on the MOT-0 API: `motionFor(scene)` and `createMotion` (`src/game/motion`). Never call `scene.tweens.add` in new code. New numbers are `balance.motion` keys: `toggleSlideMs` (160) and `disabledAlpha` (0.45) ALREADY exist in `src/core/balance.ts` (`MotionBalance`, schema line `toggleSlideMs: 'int+', disabledAlpha: 'prob'`, validator `disabledAlpha >= 1` fails) and `config/balance.json`, so no balance task is needed; Task 1 adds a test that pins both values.
- Hit rules unchanged (MOT-1-R2): `bindPress` semantics and `stop` flag, `pillHitRect`, `hitSize` / `MIN_HIT_CSS = 48`, every zone size. The hit object is never scaled; only a separate visual is animated.
- Light mode only. Test names carry `MOT-1-Rn`. Reduced motion follows MOT-0-R6 (`reduceMotion()` from `src/game/render/palette.ts`).
- No magic numbers: durations and scales come from `balance.motion`; the card half delta is derived, not a new number.

## Decisions made while planning (spec deviations, all recorded in Task 10 DECISIONS)
1. **`tap()` trailing argument is `fx?: TapFx`** (`{ visual, kind, navigates? }`), not a bare `visual`, because the wrapper also needs the kind and the navigate flag (still optional and trailing; MOT-1-R6 intent kept).
2. **Card half delta needs a second adapter instance.** The MOT-0 adapter reads `pressScale` / `releaseOvershoot` / `hoverScale` from one config, so `feedback.ts` builds one extra `createMotion` per scene with `halfMotionCfg(b.motion)` (kind `card`). Its tween budget is separate (worst case 2 x `maxTweens`, still tiny).
3. **No destroy-time `killTweensOf`.** The adapter has no public "forget target" call, so killing a mid-flight tween would leave a stale entry in its `live` budget set (leak). The wrapper instead sets `dead` on the source `destroy` event (no new motion, no hover or press), and the short tween (max `tapUpMs`) finishes harmlessly on the destroyed object, which also frees the budget slot. Follow-up for MOT-0: a `motion.stop(t)`.
4. **Knob slide uses a tiny update-driven driver (`runSlide`), not a tween.** The adapter has no progress tween and `scene.tweens.add` is forbidden, so `runSlide(scene, ms, frame)` advances a 0..1 value from `scene.events` `update` deltas and calls `frame(t)`; it is cancelled on rebuild, destroy and shutdown.
5. **Reject cases are what the code can detect.** `tapCard` returns the same state only for a locked card; `tapSlot` only for a slot index >= `slotCount`. "Not enough energy" is not a Loadout edit concept, so it is not handled.
6. Navigate delay (`navigates: true`) is also set on the Home `home-l1` link (it starts a scene exactly like Play).

## File map
- Create `src/game/ui/feedbackModel.ts` (pure): `FeedbackKind`, `feedbackScales`, `halfMotionCfg`, `hasHover`, `knobX`, `trackColor`, `borderColor`, `isRejected`.
- Create `src/game/ui/feedbackCore.ts` (Phaser-free): `createFeedback`, `runSlide`, `Feedback`, `FeedbackDeps`, `FeedbackOpts`.
- Create `src/game/ui/feedback.ts`: `attachFeedback`, `feedbackOf`, `pivotAt`.
- Modify `src/game/ui/widgets.ts` (`pillButton`), `src/game/ui/menuWidgets.ts` (`tap`, `roundIconButton`), `src/game/scenes/ui.ts` (`button`), `src/game/hud/HudTop.ts`, `src/game/hud/PauseOverlay.ts`, `src/game/scenes/HomeScene.ts`, `ResultsScene.ts`, `SettingsScene.ts`, `LoadoutScene.ts`.
- Create tests `tests/game/feedbackModel.test.ts`, `feedbackCore.test.ts`, `feedbackAttach.test.ts`, `pillFeedback.test.ts`, `tapFeedback.test.ts`, `buttonFeedback.test.ts`; modify `tests/game/hudViews.test.ts` (stub the wrapper).
- Docs: `docs/CODEMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/STATUS.md`.
- Untouched: `src/game/ui/geometry.ts`, `bindPress` body, `card()` (static graphic), `SkillButtons` (MOT-3).

Branch: work happens on `feat/motion-1-widget-feedback` created from `version/v0.3` (Task 1 step 0).

---

### Task 1: Pure model

**Files:** Create `src/game/ui/feedbackModel.ts`; Test `tests/game/feedbackModel.test.ts`

**Interfaces:**
- Consumes: `MotionBalance` from `src/core/balance`; `clamp01`, `cubicOut`, `lerp` from `src/game/motion/curves`.
- Produces: `type FeedbackKind = 'pill' | 'round' | 'card' | 'switch' | 'hudButton'`; `feedbackScales(kind, cfg): { press: number; release: number; hover: number }`; `halfMotionCfg(cfg: MotionBalance): MotionBalance`; `hasHover(kind): boolean`; `knobX(on: boolean, t: number, knobPx: number): number`; `trackColor(from: number, to: number, t: number): number`; `borderColor(from: number, to: number, t: number): number`; `isRejected<T>(prev: T, next: T): boolean`.

- [ ] **Step 0: Create the branch**
```bash
git checkout version/v0.3 && git checkout -b feat/motion-1-widget-feedback
```
- [ ] **Step 1: Write the failing test** `tests/game/feedbackModel.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { borderColor, feedbackScales, halfMotionCfg, hasHover, isRejected, knobX, trackColor, type FeedbackKind } from '../../src/game/ui/feedbackModel';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;
const KINDS: FeedbackKind[] = ['pill', 'round', 'card', 'switch', 'hudButton'];

describe('MOT-1 feedback model', () => {
  it('MOT-1-R3 scales keep release > 1 > press and stay inside (0, 2) for every kind', () => {
    for (const k of KINDS) {
      const s = feedbackScales(k, cfg);
      expect(s.release).toBeGreaterThan(1); expect(s.press).toBeLessThan(1); expect(s.hover).toBeGreaterThan(1);
      for (const v of [s.press, s.release, s.hover]) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(2); }
    }
  });
  it('MOT-1-R3 full-delta kinds use the balance keys and card uses half deltas derived from them', () => {
    expect(feedbackScales('pill', cfg)).toEqual({ press: cfg.pressScale, release: cfg.releaseOvershoot, hover: cfg.hoverScale });
    const c = feedbackScales('card', cfg);
    expect(c.press).toBeCloseTo(1 - (1 - cfg.pressScale) / 2, 10);
    expect(c.release).toBeCloseTo(1 + (cfg.releaseOvershoot - 1) / 2, 10);
    expect(c.hover).toBeCloseTo(1 + (cfg.hoverScale - 1) / 2, 10);
  });
  it('MOT-1-R3 halfMotionCfg changes only the three scales', () => {
    const h = halfMotionCfg(cfg), s = feedbackScales('card', cfg);
    expect(h).toEqual({ ...cfg, pressScale: s.press, releaseOvershoot: s.release, hoverScale: s.hover });
  });
  it('MOT-1-R3 hover applies to pill, round and card only', () => {
    expect(KINDS.filter(hasHover)).toEqual(['pill', 'round', 'card']);
  });
  it('MOT-1-R8 knobX endpoints are exact and the slide is monotone', () => {
    expect(knobX(true, 0, 10)).toBe(-10); expect(knobX(true, 1, 10)).toBe(10);
    expect(knobX(false, 0, 10)).toBe(10); expect(knobX(false, 1, 10)).toBe(-10);
    const xs = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => knobX(true, t, 10));
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    expect(knobX(true, 9, 10)).toBe(10); expect(knobX(true, -9, 10)).toBe(-10);
  });
  it('MOT-1-R8 trackColor endpoints are exact, the middle is the channel average, borderColor steps at 0.5', () => {
    expect(trackColor(0x112233, 0xaabbcc, 0)).toBe(0x112233); expect(trackColor(0x112233, 0xaabbcc, 1)).toBe(0xaabbcc);
    expect(trackColor(0x000000, 0x0000fe, 0.5)).toBe(0x00007f);
    expect(borderColor(1, 2, 0.49)).toBe(1); expect(borderColor(1, 2, 0.5)).toBe(2);
  });
  it('MOT-1-R11 isRejected is true only for the same state object', () => {
    const a = { n: 1 };
    expect(isRejected(a, a)).toBe(true); expect(isRejected(a, { ...a })).toBe(false);
  });
  it('MOT-1 balance.motion carries the two keys this feature relies on', () => {
    expect(cfg.toggleSlideMs).toBe(160); expect(cfg.disabledAlpha).toBe(0.45);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/feedbackModel` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/ui/feedbackModel.ts`
```ts
// MOT-1 pure feedback math: no Phaser, no allocation per call. Spec: 2026-11-10-motion-1-widget-feedback-design.md sections 3 and 8.
import type { MotionBalance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export type FeedbackKind = 'pill' | 'round' | 'card' | 'switch' | 'hudButton';
export interface FeedbackScales { press: number; release: number; hover: number }

/** MOT-1-R3 per-kind scales. `card` (wide targets) uses half deltas derived from the same balance keys. */
export function feedbackScales(kind: FeedbackKind, cfg: MotionBalance): FeedbackScales {
  if (kind === 'card') {
    return { press: 1 - (1 - cfg.pressScale) / 2, release: 1 + (cfg.releaseOvershoot - 1) / 2, hover: 1 + (cfg.hoverScale - 1) / 2 };
  }
  return { press: cfg.pressScale, release: cfg.releaseOvershoot, hover: cfg.hoverScale };
}
/** Config for the extra `card` adapter: the same balance with only the three scales halved. */
export function halfMotionCfg(cfg: MotionBalance): MotionBalance {
  const s = feedbackScales('card', cfg);
  return { ...cfg, pressScale: s.press, releaseOvershoot: s.release, hoverScale: s.hover };
}
/** MOT-1-R3 hover feedback (fine pointer only, enforced by the adapter): pill, round and card. */
export const hasHover = (kind: FeedbackKind): boolean => kind === 'pill' || kind === 'round' || kind === 'card';

/** MOT-1-R8 knob centre x (px from the track centre) at slide progress t, ending on the `on` side; cubicOut easing. */
export function knobX(on: boolean, t: number, knobPx: number): number {
  const from = on ? -knobPx : knobPx;
  return lerp(from, -from, cubicOut(t));
}
const channel = (from: number, to: number, t: number, shift: number): number =>
  Math.round(lerp((from >> shift) & 255, (to >> shift) & 255, clamp01(t))) << shift;
/** MOT-1-R8 linear per-channel 0xRRGGBB lerp; exact at t = 0 and t = 1. */
export const trackColor = (from: number, to: number, t: number): number =>
  channel(from, to, t, 16) | channel(from, to, t, 8) | channel(from, to, t, 0);
/** MOT-1-R8 the border colour switches at t = 0.5. */
export const borderColor = (from: number, to: number, t: number): number => (t < 0.5 ? from : to);
/** MOT-1-R11 an edit that returns the same state object was refused. */
export const isRejected = <T>(prev: T, next: T): boolean => prev === next;
```
- [ ] **Step 4:** Run the same command -> PASS.
- [ ] **Step 5: Commit** (add `- feat(ui): MOT-1 pure feedback model (scales, knob x, track colour)` under `## [Unreleased]` in `CHANGELOG.md`)
```bash
git add src/game/ui/feedbackModel.ts tests/game/feedbackModel.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 pure feedback model

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Feedback core (state machine) and slide driver

**Files:** Create `src/game/ui/feedbackCore.ts`; Test `tests/game/feedbackCore.test.ts`

**Interfaces:**
- Consumes: `Motion`, `MotionTarget` from `src/game/motion/motionCore` (`pressDown`, `release`, `hover`, `shake`); `FeedbackKind`, `hasHover` (Task 1); `MotionBalance`.
- Produces:
  - `interface FeedbackDeps { motion: Motion; half: Motion; cfg: MotionBalance; reduced: () => boolean; delay: (ms: number, fn: () => void) => void }`
  - `interface FeedbackOpts { navigates?: boolean; dipPx?: number }`
  - `interface Feedback { press(): void; release(): void; over(): void; out(): void; fire(action: () => void): void; pop(): void; reject(): void; setDisabled(on: boolean): void; destroy(): void }`
  - `createFeedback(d: FeedbackDeps, visuals: readonly MotionTarget[], kind: FeedbackKind, opts?: FeedbackOpts): Feedback`
  - `runSlide(host: SlideHost, ms: number, frame: (t: number) => void): () => void` where `interface SlideHost { events: { on(ev: string, fn: (time: number, delta: number) => void): unknown; off(ev: string, fn: (time: number, delta: number) => void): unknown } }`; returns a cancel function.

- [ ] **Step 1: Write the failing test** `tests/game/feedbackCore.test.ts`
```ts
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
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/feedbackCore` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/ui/feedbackCore.ts`
```ts
// MOT-1 Phaser-free widget feedback state machine. Spec: 2026-11-10-motion-1-widget-feedback-design.md sections 2-3.
// Talks only to the injected MOT-0 Motion instances (never scene.tweens). `half` is the half-delta adapter used by kind 'card'.
import type { MotionBalance } from '../../core/balance';
import type { Motion, MotionTarget } from '../motion/motionCore';
import { hasHover, type FeedbackKind } from './feedbackModel';

export interface FeedbackDeps { motion: Motion; half: Motion; cfg: MotionBalance; reduced: () => boolean; delay: (ms: number, fn: () => void) => void }
export interface FeedbackOpts { navigates?: boolean; dipPx?: number }
export interface Feedback {
  press(): void; release(): void; over(): void; out(): void;
  /** Run the widget action: immediately, or after tapUpMs (one-shot) when the widget navigates (MOT-1-R4). */
  fire(action: () => void): void;
  /** One overshoot to rest (selection change, MOT-1-R10). */
  pop(): void;
  /** Refused action: shake, or a flat alpha dip under reduced motion (MOT-1-R11). */
  reject(): void;
  setDisabled(on: boolean): void;
  /** The source object was destroyed: no further motion (see plan decision 3). */
  destroy(): void;
}

export function createFeedback(d: FeedbackDeps, visuals: readonly MotionTarget[], kind: FeedbackKind, opts: FeedbackOpts = {}): Feedback {
  const m = kind === 'card' ? d.half : d.motion;
  const baseY = visuals.map(v => v.y), baseA = visuals.map(v => v.alpha);
  let pressed = false, hovering = false, disabled = false, latched = false, dead = false;
  // MOT-1-R5 the face and label sink by dipPx (shelf static); skipped under reduced motion.
  const dip = (on: boolean): void => {
    const dy = opts.dipPx ?? 0;
    if (dy === 0 || d.reduced()) return;
    visuals.forEach((v, i) => v.setPosition(v.x, baseY[i]! + (on ? dy : 0)));
  };
  return {
    press() {
      if (dead || disabled) return;
      pressed = true; hovering = false;
      for (const v of visuals) m.pressDown(v); // first call also captures the rest transform, before the dip
      dip(true);
    },
    release() {
      if (!pressed) return;
      pressed = false; hovering = false;
      dip(false);
      for (const v of visuals) m.release(v);
    },
    over() {
      if (dead || disabled || pressed || !hasHover(kind)) return;
      hovering = true;
      for (const v of visuals) m.hover(v, true);
    },
    out() {
      if (!hovering) return;
      hovering = false;
      for (const v of visuals) m.hover(v, false);
    },
    fire(action) {
      if (!opts.navigates) { action(); return; }
      if (latched) return;
      latched = true;
      const ms = d.reduced() ? 0 : d.cfg.tapUpMs;
      if (ms === 0) action(); else d.delay(ms, action);
    },
    pop() {
      if (dead) return;
      for (const v of visuals) m.release(v);
    },
    reject() {
      if (dead) return;
      if (d.reduced()) { for (const v of visuals) m.pressDown(v); d.delay(d.cfg.tapDownMs, () => { for (const v of visuals) m.release(v); }); return; }
      for (const v of visuals) m.shake(v);
    },
    setDisabled(on) {
      disabled = on; pressed = false; hovering = false;
      visuals.forEach((v, i) => { v.setAlpha(on ? d.cfg.disabledAlpha : baseA[i]!); });
    },
    destroy() { dead = true; },
  };
}

export interface SlideHost {
  events: { on(ev: string, fn: (time: number, delta: number) => void): unknown; off(ev: string, fn: (time: number, delta: number) => void): unknown };
}
/**
 * MOT-1-R8 update-driven 0..1 progress for the switch slide (the MOT-0 adapter has no progress tween).
 * Calls frame(0) at once, frame(t) per scene update, ends with exactly frame(1), then detaches. Returns a cancel function.
 */
export function runSlide(host: SlideHost, ms: number, frame: (t: number) => void): () => void {
  let elapsed = 0, done = false;
  const stop = (): void => { if (done) return; done = true; host.events.off('update', step); };
  const step = (_time: number, delta: number): void => {
    elapsed += delta;
    const t = Math.min(1, elapsed / ms);
    frame(t);
    if (t >= 1) stop();
  };
  host.events.on('update', step);
  frame(0);
  return stop;
}
```
- [ ] **Step 4:** Run the same command -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 feedback core (press, hover, navigate latch, reject, disabled) and slide driver`)
```bash
git add src/game/ui/feedbackCore.ts tests/game/feedbackCore.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 feedback core and slide driver

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scene wiring (`attachFeedback`, `feedbackOf`, `pivotAt`)

**Files:** Create `src/game/ui/feedback.ts`; Test `tests/game/feedbackAttach.test.ts`

**Interfaces:**
- Consumes: `createFeedback`, `Feedback`, `FeedbackOpts` (Task 2); `FeedbackKind`, `halfMotionCfg` (Task 1); `motionFor` from `src/game/motion` (MOT-0); `createMotion`, `Motion`, `MotionTarget`, `TweenHost` from `src/game/motion/motionCore`; `reduceMotion` from `src/game/render/palette`; `ui` from `src/game/ui/layout`; `Balance` from `src/core`.
- Produces:
  - `interface FeedbackSource { on(event: string, fn: (...args: any[]) => void): unknown }`
  - `interface AttachOpts extends FeedbackOpts { source: FeedbackSource }`
  - `attachFeedback(scene: Phaser.Scene, visual: MotionTarget | MotionTarget[], kind: FeedbackKind, opts: AttachOpts): Feedback` (binds `pointerover`, `pointerout`, `destroy` on `opts.source` and registers the result for `feedbackOf(opts.source)`)
  - `feedbackOf(source: object): Feedback | undefined`
  - `pivotAt(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, cx: number, cy: number): { pivot: Phaser.GameObjects.Container; inner: Phaser.GameObjects.Container }` (pivot sits at (cx, cy) inside `parent`; `inner` sits at (-cx, -cy) inside pivot, so children drawn with ABSOLUTE coordinates keep their place while the pivot scales about its centre)

- [ ] **Step 1: Write the failing test** `tests/game/feedbackAttach.test.ts`
```ts
import { describe, expect, it, vi } from 'vitest';
import { attachFeedback, feedbackOf, pivotAt } from '../../src/game/ui/feedback';
import { Signals, sceneHarness } from '../support/scene';
import { loadBalance } from '../support/balance';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
const cfg = loadBalance().motion;
const target = () => { const t = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1,
  setScale(x: number, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a: number) { t.alpha = a; return t; },
  setPosition(x: number, y = x) { t.x = x; t.y = y; return t; } }; return t; };
const sceneWith = () => {
  const h = sceneHarness(), adds: Record<string, unknown>[] = [];
  h.registry.set('balance', loadBalance());
  Object.assign(h.scene, { tweens: { add: (c: Record<string, unknown>) => { adds.push(c); return { stop: () => {} }; }, killTweensOf: () => {} } });
  Object.assign(h.scene.sys, { game: { device: { input: { touch: false } } } });
  return { h, adds };
};

describe('MOT-1 attachFeedback', () => {
  it('MOT-1-R1 binds hover on the source, tweens through the adapter and registers feedbackOf', () => {
    const { h, adds } = sceneWith(), src = new Signals(), v = target();
    const fb = attachFeedback(h.scene as never, v as never, 'round', { source: src });
    expect(feedbackOf(src)).toBe(fb);
    src.emit('pointerover'); expect(adds[0]).toMatchObject({ targets: v, scaleX: cfg.hoverScale });
    src.emit('pointerout'); expect(adds[1]).toMatchObject({ scaleX: 1 });
  });
  it('MOT-1-R3 card kind goes through the half-delta adapter', () => {
    const { h, adds } = sceneWith(), src = new Signals();
    attachFeedback(h.scene as never, [target() as never], 'card', { source: src }).press();
    expect(adds[0]!.scaleX as number).toBeCloseTo(1 - (1 - cfg.pressScale) / 2, 10);
  });
  it('MOT-1-R7 a destroy event on the source stops further feedback', () => {
    const { h, adds } = sceneWith(), src = new Signals();
    const fb = attachFeedback(h.scene as never, target() as never, 'pill', { source: src });
    src.emit('destroy'); fb.press(); src.emit('pointerover');
    expect(adds.length).toBe(0);
  });
  it('MOT-1-R4 navigates uses scene.time.delayedCall with tapUpMs', () => {
    const { h } = sceneWith(), src = new Signals(); let n = 0;
    attachFeedback(h.scene as never, target() as never, 'pill', { source: src, navigates: true }).fire(() => n++);
    expect(n).toBe(0); expect(h.delayed[0]!.delay).toBe(cfg.tapUpMs);
    h.flush(); expect(n).toBe(1);
  });
  it('MOT-1-R10 pivotAt nests inner at (-cx, -cy) inside a pivot at (cx, cy) inside the parent', () => {
    const { h } = sceneWith(), parent = h.scene.add.container(0, 0);
    const { pivot, inner } = pivotAt(h.scene as never, parent as never, 100, 50);
    expect([pivot.x, pivot.y, inner.x, inner.y]).toEqual([100, 50, -100, -50]);
    expect(parent.list).toContain(pivot); expect(pivot.list).toContain(inner);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/feedbackAttach` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/ui/feedback.ts`
```ts
// MOT-1-R1 the single widget feedback wrapper. Calls only the MOT-0 adapter; never scene.tweens.add.
import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { motionFor } from '../motion';
import { createMotion, type Motion, type MotionTarget, type TweenHost } from '../motion/motionCore';
import { reduceMotion } from '../render/palette';
import { createFeedback, type Feedback, type FeedbackOpts } from './feedbackCore';
import { halfMotionCfg, type FeedbackKind } from './feedbackModel';
import { ui } from './layout';

export interface FeedbackSource { on(event: string, fn: (...args: any[]) => void): unknown }
export interface AttachOpts extends FeedbackOpts { source: FeedbackSource }

const halves = new WeakMap<object, Motion>();
/** Per-scene half-delta adapter for kind `card` (plan decision 2); same host, flags and shake as `motionFor`. */
function halfMotionFor(scene: Phaser.Scene): Motion {
  const cached = halves.get(scene);
  if (cached) return cached;
  const b = scene.registry.get('balance') as Balance;
  const made = createMotion({ tweens: scene.tweens as unknown as TweenHost, cfg: halfMotionCfg(b.motion), softMs: b.juice.reduced.softMs,
    reduced: reduceMotion, finePointer: !scene.sys.game.device.input.touch, ui, shake: { ampPx: b.ui.hud.rejectShakeAmpPx, ms: b.ui.hud.rejectShakeMs } });
  halves.set(scene, made);
  scene.events.once('shutdown', () => { made.dispose(); halves.delete(scene); });
  return made;
}

const registered = new WeakMap<object, Feedback>();
/** The feedback attached to a hit object (`pillButton` container, `tap` zone, HUD button), if any. */
export const feedbackOf = (source: object): Feedback | undefined => registered.get(source);

/** Bind feedback for `visual` (never the hit object, MOT-1-R2) and hover/destroy listeners on `opts.source`. */
export function attachFeedback(scene: Phaser.Scene, visual: MotionTarget | MotionTarget[], kind: FeedbackKind, opts: AttachOpts): Feedback {
  const visuals = (Array.isArray(visual) ? visual : [visual]) as MotionTarget[];
  const b = scene.registry.get('balance') as Balance;
  const fb = createFeedback({ motion: motionFor(scene), half: halfMotionFor(scene), cfg: b.motion, reduced: reduceMotion,
    delay: (ms, fn) => { scene.time.delayedCall(ms, fn); } }, visuals, kind, { navigates: opts.navigates, dipPx: opts.dipPx });
  opts.source.on('pointerover', () => fb.over());
  opts.source.on('pointerout', () => fb.out());
  opts.source.on('destroy', () => fb.destroy());
  registered.set(opts.source, fb);
  return fb;
}

/** Pivot container at (cx, cy) with an offset `inner` so children keep ABSOLUTE coordinates but scale about the pivot centre. */
export function pivotAt(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, cx: number, cy: number):
  { pivot: Phaser.GameObjects.Container; inner: Phaser.GameObjects.Container } {
  const inner = scene.add.container(-cx, -cy);
  const pivot = scene.add.container(cx, cy, [inner]);
  parent.add(pivot);
  return { pivot, inner };
}
```
- [ ] **Step 4:** Run the same command -> PASS; then `npm run typecheck` (checks that real Phaser objects satisfy `MotionTarget`; if a type mismatch appears on `setAlpha`/`setScale`, widen `MotionTarget` use here with `as unknown as MotionTarget` at the call sites in later tasks, do not edit MOT-0).
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 attachFeedback wrapper, feedbackOf registry, pivotAt helper`)
```bash
git add src/game/ui/feedback.ts tests/game/feedbackAttach.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 attachFeedback, feedbackOf and pivotAt

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `pillButton` uses the wrapper (R5, R2)

**Files:** Modify `src/game/ui/widgets.ts:2` (remove `reduceMotion` import), `:22-23` (signature), `:39-42` (replace `move`/`bindPress` lines); Test `tests/game/pillFeedback.test.ts`; Modify `tests/game/hudViews.test.ts` (stub wrapper)

**Interfaces:**
- Consumes: `attachFeedback` (Task 3); `bindPress`, `Button` from `src/game/scenes/ui`; `pillGeom`, `pillHitRect` from `src/game/ui/geometry`.
- Produces: `pillButton(scene, x, y, wMock, hMock, text, name, action, tone = 'green', opts: { navigates?: boolean } = {}): Button` (return type unchanged). The feedback is reachable by `feedbackOf(button.c)`.

- [ ] **Step 1: Write the failing test** `tests/game/pillFeedback.test.ts`
```ts
import { beforeEach, expect, it, vi } from 'vitest';
import { pillGeom, pillHitRect } from '../../src/game/ui/geometry';
import { pillButton } from '../../src/game/ui/widgets';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][], rects: [] as number[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {}, Geom: { Rectangle: class { constructor(...a: number[]) { h.rects.push(a); } static Contains = () => true } } } }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; h.rects.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });

it('MOT-1-R2 pillButton keeps the face-plus-shelf hit rect and attaches the pill wrapper to face and label only', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = pillButton(scene as never, 100, 200, 200, 60, 'Go', 'p', act, 'green', { navigates: true });
  const geom = pillGeom(200, 60), hit = pillHitRect(geom);
  expect(h.rects.at(-1)).toEqual([hit.x, hit.y, hit.w, hit.h]);
  const [, visuals, kind, opts] = h.calls.at(-1) as [unknown, unknown[], string, Record<string, unknown>];
  expect(visuals[0]).toBe(b.g); expect(visuals[1]).toBe(b.text); expect(visuals.length).toBe(2);
  expect(kind).toBe('pill');
  expect(opts).toMatchObject({ dipPx: geom.pressedDy, navigates: true }); expect(opts.source).toBe(b.c);
});
it('MOT-1-R2 pillButton fires its action only after a press on it, through the wrapper', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', act) as unknown as { c: { emit(k: string): void } };
  b.c.emit('pointerup'); expect(act).not.toHaveBeenCalled(); expect(h.fb.press).not.toHaveBeenCalled();
  b.c.emit('pointerdown'); expect(h.fb.press).toHaveBeenCalledTimes(1);
  b.c.emit('pointerup'); expect(h.fb.release).toHaveBeenCalled(); expect(act).toHaveBeenCalledTimes(1);
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/pillFeedback` -> FAIL (no `attachFeedback` call recorded).
- [ ] **Step 3: Implement** in `src/game/ui/widgets.ts`.
  - Delete the import line `import { reduceMotion } from '../render/palette';` (line 2) and add `import { attachFeedback } from './feedback';` after the `./geometry` import.
  - Replace the signature `name: string, action: () => void, tone: PillTone = 'green'): Button {` with
```ts
  name: string, action: () => void, tone: PillTone = 'green', opts: { navigates?: boolean } = {}): Button {
```
  - Replace the two lines `const move = (dy: number): void => { g.setY(dy); t.setY(dy); };` and `bindPress(c, () => { if (!reduceMotion()) move(geom.pressedDy); }, () => move(0), action);` with
```ts
  // MOT-1-R5 face and label dip by pressedDy and scale about the face centre (shelf static); the hit container is never scaled.
  const fb = attachFeedback(scene, [g, t], 'pill', { source: c, dipPx: geom.pressedDy, navigates: opts.navigates });
  bindPress(c, () => fb.press(), () => fb.release(), () => fb.fire(action));
```
  Also change the comment above the shelf (`// The shelf stays put; the face and label sink on press.`) to stay as is (still true).
  - In `tests/game/hudViews.test.ts` add after the existing `vi.mock('phaser', ...)` block (the file already mocks phaser at line 18; `HudTop` and `PauseOverlay` build real `pillButton`s with `sceneHarness`, which has no `balance` in its registry):
```ts
const stubFb = { press() {}, release() {}, over() {}, out() {}, fire: (a: () => void) => a(), pop() {}, reject() {}, setDisabled() {}, destroy() {} };
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: () => stubFb, feedbackOf: () => stubFb, pivotAt: () => ({ pivot: {}, inner: {} }) }));
```
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 pillFeedback hudViews bindPress` -> PASS; `npm run typecheck` -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 pillButton press dip, scale and overshoot through the feedback wrapper`)
```bash
git add src/game/ui/widgets.ts tests/game/pillFeedback.test.ts tests/game/hudViews.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 pillButton uses the feedback wrapper

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check (after this task, `npm run dev`):** Home play/prev/next, Loadout go: face and label sink and shrink slightly, release overshoots then rests; shelf does not move; hover grows on desktop mouse only (not on touch emulation); with the OS reduced-motion setting on, only a small alpha dip.

---

### Task 5: `tap()` visual and `roundIconButton` (R6)

**Files:** Modify `src/game/ui/menuWidgets.ts:1-10` (imports), `:19-26` (`tap`), `:28-39` (`roundIconButton`); Test `tests/game/tapFeedback.test.ts`

**Interfaces:**
- Consumes: `attachFeedback`, `Feedback` (Task 3); `FeedbackKind` (Task 1); `MotionTarget`.
- Produces:
  - `interface TapFx { visual: MotionTarget | MotionTarget[]; kind: FeedbackKind; navigates?: boolean }`
  - `tap(scene, x, y, w, h, name, action, fx?: TapFx): Phaser.GameObjects.Zone` (without `fx` behaviour is identical to today; the zone is the `feedbackOf` key)
  - `roundIconButton(scene, x, y, diameterMock, icon, name, action, shelf = false, opts: { navigates?: boolean } = {})`

- [ ] **Step 1: Write the failing test** `tests/game/tapFeedback.test.ts`
```ts
import { beforeEach, expect, it, vi } from 'vitest';
import { roundIconButton, tap } from '../../src/game/ui/menuWidgets';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {}, Math: { DegToRad: (d: number) => d } } }));
vi.mock('../../src/game/ui/icons', () => ({ drawIcon: vi.fn() }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });
type Emitter = { emit(k: string): void };

it('MOT-1-R6 tap without a visual behaves as before and attaches nothing', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const z = tap(scene as never, 0, 0, 50, 50, 'z', act) as unknown as Emitter;
  z.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  z.emit('pointerdown'); z.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1);
  z.emit('pointerdown'); z.emit('pointerout'); z.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1);
  expect(h.calls.length).toBe(0);
});
it('MOT-1-R6 tap with fx animates the visual, never the zone, and keeps the press-started-here rule', () => {
  const { scene } = sceneHarness(), act = vi.fn(), visual = scene.add.container(0, 0);
  const z = tap(scene as never, 0, 0, 50, 50, 'z', act, { visual: visual as never, kind: 'card', navigates: true }) as unknown as Emitter;
  const [, v, kind, opts] = h.calls[0] as [unknown, unknown, string, Record<string, unknown>];
  expect(v).toBe(visual); expect(kind).toBe('card'); expect(opts).toMatchObject({ navigates: true }); expect(opts.source).toBe(z);
  z.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  z.emit('pointerdown'); expect(h.fb.press).toHaveBeenCalledTimes(1);
  z.emit('pointerup'); expect(h.fb.release).toHaveBeenCalled(); expect(act).toHaveBeenCalledTimes(1);
  z.emit('pointerdown'); z.emit('pointerout'); expect(h.fb.release).toHaveBeenCalledTimes(3);
});
it('MOT-1-R6 roundIconButton binds its own container as the round visual and keeps the hit zone size', () => {
  const { scene, objects } = sceneHarness(), act = vi.fn();
  const c = roundIconButton(scene as never, 40, 50, 48, 'back', 'rb', act, false, { navigates: true });
  const [, v, kind, opts] = h.calls[0] as [unknown, unknown, string, Record<string, unknown>];
  expect(v).toBe(c); expect(kind).toBe('round'); expect(opts).toMatchObject({ navigates: true });
  const zone = objects.find(o => o.name === 'rb-hit')!;
  expect(opts.source).toBe(zone); expect(zone.width).toBeGreaterThanOrEqual(48); expect(zone.width).toBe(zone.height);
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tapFeedback` -> FAIL (`tap` takes no `fx`; no attach call).
- [ ] **Step 3: Implement** in `src/game/ui/menuWidgets.ts`.
  - Add imports: `import { attachFeedback } from './feedback';`, `import type { FeedbackKind } from './feedbackModel';`, `import type { MotionTarget } from '../motion/motionCore';`.
  - Replace the `tap` function (lines 19-26) with:
```ts
/** MOT-1-R6 optional feedback for a zone widget: the visual is animated, the zone (hit area) never is. */
export interface TapFx { visual: MotionTarget | MotionTarget[]; kind: FeedbackKind; navigates?: boolean }

/** Press-and-release hit zone (same rule as the greybox `button`): fires only if the press started on it. */
export function tap(scene: Phaser.Scene, x: number, y: number, w: number, h: number, name: string, action: () => void,
  fx?: TapFx): Phaser.GameObjects.Zone {
  const z = scene.add.zone(x, y, w, h).setName(name).setInteractive({ useHandCursor: true });
  const fb = fx ? attachFeedback(scene, fx.visual, fx.kind, { source: z, navigates: fx.navigates }) : undefined;
  let down = false;
  z.on('pointerdown', () => { down = true; fb?.press(); });
  z.on('pointerup', () => { const go = down; down = false; fb?.release(); if (go) { if (fb) fb.fire(action); else action(); } });
  z.on('pointerout', () => { down = false; fb?.release(); });
  return z;
}
```
  - In `roundIconButton` change the signature tail to `action: () => void, shelf = false, opts: { navigates?: boolean } = {}): Phaser.GameObjects.Container {` and replace `tap(scene, x, y, hit, hit, `${name}-hit`, action);` with:
```ts
  tap(scene, x, y, hit, hit, `${name}-hit`, action, { visual: c, kind: 'round', navigates: opts.navigates });
```
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tapFeedback menuLayout hitSize` -> PASS (if no file matches `hitSize`, the pattern just matches the others); `npm run typecheck` -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 tap() optional visual feedback; roundIconButton press and release`)
```bash
git add src/game/ui/menuWidgets.ts tests/game/tapFeedback.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 tap visual and roundIconButton feedback

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check:** Settings back, Loadout back, Home gear, Results home: the white disc dips on press and overshoots on release; hit area (48 css px minimum) feels unchanged at the edge of the disc.

---

### Task 6: Greybox `button()` and `HudTop` pause button (kind `hudButton`)

**Files:** Modify `src/game/scenes/ui.ts:3` (import) and `:40` (`button`); `src/game/hud/HudTop.ts:4` (import), `:14-15` (`M`), `:39` (pause bind); Test `tests/game/buttonFeedback.test.ts`

**Interfaces:**
- Consumes: `attachFeedback` (Task 3), `bindPress` (unchanged).
- Produces: `button()` and `HudTop.pauseButton` animate their inner graphics (`g`/`text`, `pauseG`), not the hit container; `HudTop` still calls `bindPress(..., stop = true)`.

- [ ] **Step 1: Write the failing test** `tests/game/buttonFeedback.test.ts`
```ts
import { beforeEach, expect, it, vi } from 'vitest';
import { button } from '../../src/game/scenes/ui';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });

it('MOT-1-R3 greybox button animates its graphic and label (kind hudButton), not the hit container, and keeps the press rule', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = button(scene as never, 10, 20, 120, 40, 'Go', 'b', act);
  const [, visuals, kind, opts] = h.calls[0] as [unknown, unknown[], string, Record<string, unknown>];
  expect(visuals[0]).toBe(b.g); expect(visuals[1]).toBe(b.text); expect(kind).toBe('hudButton'); expect(opts.source).toBe(b.c);
  const c = b.c as unknown as { emit(k: string): void };
  c.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  c.emit('pointerdown'); c.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1); expect(h.fb.press).toHaveBeenCalledTimes(1);
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 buttonFeedback` -> FAIL.
- [ ] **Step 3: Implement.**
  - `src/game/scenes/ui.ts`: change line 3 to `import { currentPalette, type Palette } from '../render/palette';` (drop `reduceMotion`, no longer used in this file), add `import { attachFeedback } from '../ui/feedback';`, and replace the `bindPress(c, () => { if (!reduceMotion()) c.setScale(.96); }, () => c.setScale(1), action);` line in `button()` with:
```ts
  const fb = attachFeedback(scene, [g, t], 'hudButton', { source: c });
  bindPress(c, () => fb.press(), () => fb.release(), () => fb.fire(action));
```
  - `src/game/hud/HudTop.ts`: add `import { attachFeedback } from '../ui/feedback';`; remove `pressScale: 0.94, ` from `M` (line 15) and `reduceMotion` from the palette import on line 4 (verify with Grep that no other use remains; if one does, keep the import); replace the `bindPress(this.pauseButton, ...)` line with:
```ts
    // MOT-1-R2 the pause disc (pauseG, drawn around the container centre) animates; the 'pause-button' hit container never scales.
    const fb = attachFeedback(scene, this.pauseG, 'hudButton', { source: this.pauseButton });
    bindPress(this.pauseButton, () => fb.press(), () => fb.release(), () => fb.fire(onPause), true);
```
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 buttonFeedback hudViews hudChip bindPress` -> PASS; `npm run typecheck` -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 greybox button and HUD pause button use the feedback wrapper (no hard-coded press scale)`)
```bash
git add src/game/scenes/ui.ts src/game/hud/HudTop.ts tests/game/buttonFeedback.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 hudButton kind for greybox and pause buttons

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check:** during a run, press the pause disc: it shrinks and rebounds without a visible hit-area change; a tap still pauses and does not also steer the snake (the `stop = true` rule).

---

### Task 7: Navigate flags, Pause disabled state, Home link (R4, R12)

**Files:** Modify `src/game/scenes/HomeScene.ts:111-112` (play) and `:140-148` (`home-l1`, imports line 15-16); `src/game/scenes/ResultsScene.ts:121-125`; `src/game/scenes/LoadoutScene.ts:47`; `src/game/hud/PauseOverlay.ts:42-44` (quit), `:59-62` (`setEnabled`); Test `tests/game/hudViews.test.ts` (new case)

**Interfaces:**
- Consumes: `pillButton(..., tone, { navigates })` (Task 4), `roundIconButton(..., shelf, { navigates })` and `tap(..., fx)` (Task 5), `feedbackOf`, `pivotAt` (Task 3), `Feedback.setDisabled` (Task 2).
- Produces: navigating widgets defer their action by `motion.tapUpMs` once (0 under reduced motion): Home play and `home-l1`, Loadout go, Results again and home, Pause quit. `PauseOverlay.setEnabled(false)` greys all three buttons.

- [ ] **Step 1: Write the failing test** (append to `tests/game/hudViews.test.ts`, which already builds a `PauseOverlay` through `sceneHarness`; look at how the existing pause tests construct `PauseOverlay` and `show(...)` a view, and reuse that exact setup for `overlay`). Replace the `stubFb` constant added in Task 4 with a recording version so this assertion is possible:
```ts
const disabled: boolean[] = [];
const stubFb = { press() {}, release() {}, over() {}, out() {}, fire: (a: () => void) => a(), pop() {}, reject() {}, setDisabled: (on: boolean) => { disabled.push(on); }, destroy() {} };
```
  and add (using the existing overlay construction helper in that file, here written as `makeOverlay()` / `view`, which the executor must adapt to the existing local names):
```ts
it('MOT-1-R12 PauseOverlay greys its three buttons while Settings is open and restores them on close', () => {
  const { overlay, scene, view } = makeOverlay();
  overlay.show(view); disabled.length = 0;
  (overlay as unknown as { setEnabled(on: boolean): void }).setEnabled(false);
  expect(disabled).toEqual([true, true, true]);
  disabled.length = 0; scene.game.events.emit('settings-closed'); // SETTINGS_CLOSED constant from flow/settingsView
  expect(disabled).toEqual([false, false, false]);
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 hudViews` -> FAIL (`setDisabled` never called).
- [ ] **Step 3: Implement.**
  - `PauseOverlay.ts`: import `feedbackOf` from `'../ui/feedback'`; change `quit` creation to pass `{ navigates: true }`:
```ts
    const quit = pillButton(scene, WIDTH / 2, 0, inner, m.secondary, '', 'overlay-quit', cb.onQuit, 'danger', { navigates: true });
```
  and replace `setEnabled` with:
```ts
  private setEnabled(on: boolean): void {
    for (const id of IDS) {
      const c = this.btn[id].c, live = on && this.shown.has(id);
      if (c.input) c.input.enabled = live;
      feedbackOf(c)?.setDisabled(!live); // MOT-1-R12 alpha disabledAlpha, no hover or press feedback; hit area unchanged
    }
  }
```
  Note `setEnabled(true)` runs in `show()` after `this.shown` is set, so hidden buttons (no row) stay disabled-looking but are invisible.
  - `HomeScene.ts` line 111: add `{ navigates: true }` as the 10th argument: `pillButton(this, WIDTH / 2, y + ui(ph) / 2, H.hero.w, ph, t('home.play'), 'home-primary', () => this.play(this.homeView().primary.level), 'green', { navigates: true })`. Change the import on line 15 to `import { bgCream, bigLabel, hill, logoLine, roundIconButton, scaledBlock, tap } from '../ui/menuWidgets';` (unchanged) and add `import { pivotAt } from '../ui/feedback';`. Replace the `home-l1` block body (`items.push({ w: ui(link.w), make: cx => { ... } })`, lines 142-148) with:
```ts
      items.push({ w: ui(link.w), make: cx => {
        const tx = this.add.text(cx, cy, label, style(K.font, '800', TOKENS.text.soft)).setOrigin(0.5);
        const ly = cy + tx.height / 2 + ui(K.underlineDy);
        const line = this.add.graphics().lineStyle(ui(K.underline), toInt(TOKENS.text.soft)).lineBetween(cx - tx.width / 2, ly, cx + tx.width / 2, ly);
        // MOT-1-R3 the link text and underline scale together (kind card, half delta) about the link centre; the zone stays unscaled.
        const lc = this.add.container(0, 0), { pivot, inner } = pivotAt(this, lc, cx, cy);
        inner.add([line, tx]);
        lc.add(tap(this, cx, cy, ui(link.w), ui(link.h), 'home-l1', () => this.play(1), { visual: pivot, kind: 'card', navigates: true }));
        return lc;
      } });
```
  (keep the existing `const tx`/`ly`/`line` definitions exactly as they are today; only the trailing `return this.add.container(0, 0, [line, tx, tap(...)])` changes).
  - `ResultsScene.ts` line 121: `roundIconButton(this, ui(R.side + R.btn / 2), cy, R.btn, 'home', RESULTS_BUTTONS.home, home, true, { navigates: true });` and line 125: add `'green', { navigates: true }` after the action argument of the `pillButton(...)` call (`() => beginRun(this, last, 'results'), 'green', { navigates: true }`).
  - `LoadoutScene.ts` line 47: `pillButton(this, WIDTH / 2, goY, L.goW, L.goH, t('loadout.go'), 'loadout-go', () => this.go(), 'green', { navigates: true })`. (Loadout Back and Settings Back stay non-navigating: the spec lists only the five actions above.)
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 hudViews menuLayout homeModel resultsView` -> PASS; `npm run typecheck` -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(ui): MOT-1 confirm-before-navigate delay on Home play/link, Loadout go, Results, Pause quit; Pause buttons grey while Settings is open`)
```bash
git add src/game/scenes/HomeScene.ts src/game/scenes/ResultsScene.ts src/game/scenes/LoadoutScene.ts src/game/hud/PauseOverlay.ts tests/game/hudViews.test.ts CHANGELOG.md
git commit -m "feat(ui): MOT-1 navigate delay flags, Pause disabled state, Home link feedback

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check:** Home Play, Loadout Go, Results Play again/Home, Pause Quit: the pill finishes its release overshoot (about 180 ms) before the scene changes; mashing the button starts the scene once; keyboard Enter/Space on Loadout is NOT delayed (it calls `go()` directly, unchanged). With Settings open over Pause, the three Pause buttons look faded and do not react; closing Settings restores them. `home-l1` link grows slightly (half delta) and its underline moves with the text.

---

### Task 8: Settings switch slide, theme tile feedback, `prev` map (R7, R8, R10)

**Files:** Modify `src/game/scenes/SettingsScene.ts` (imports lines 5-14, fields lines 28-33, `create()` ~lines 43-52, `build()` lines 76-142); Test `tests/game/settingsScene.test.ts` (new cases)

**Interfaces:**
- Consumes: `tap(..., fx)` (Task 5); `feedbackOf`, `pivotAt` (Task 3); `runSlide` (Task 2); `knobX`, `trackColor`, `borderColor` (Task 1); `toggleTrackStyle(on, theme)` (existing, `src/game/flow/settingsView.ts`, returns `{ fill, border, knob }` hex strings); `toInt` (`uiTokens`); `reduceMotion` (`render/palette`); `balance.motion.toggleSlideMs`.
- Produces: `SettingsScene` private state `prev: Map<string, boolean>`, `prevTheme: string | null`, `slides: (() => void)[]`; switch knob slide when `r.on !== prev[r.id]`; theme tile overshoot when the selected tile changed.

- [ ] **Step 1: Write the failing tests** (append to `tests/game/settingsScene.test.ts`; its existing phaser mock already provides `Scene` and `Scenes.Events.SHUTDOWN`). These test the pure decision used by `build()`, extracted as an exported helper so no Phaser scene is needed:
```ts
import { slideFrom, tileChanged } from '../../src/game/scenes/SettingsScene';

it('MOT-1-R8 slideFrom animates only switches whose value differs from the previous build', () => {
  const prev = new Map<string, boolean>([['sound', true], ['haptics', false]]);
  expect(slideFrom(prev, 'sound', true)).toBe(true);    // unchanged -> same start state (no slide)
  expect(slideFrom(prev, 'haptics', true)).toBe(false); // changed -> starts from previous value
  expect(slideFrom(prev, 'dpad', true)).toBe(true);     // first build -> no slide
});
it('MOT-1-R10 tileChanged is true only for the newly selected tile after the first build', () => {
  expect(tileChanged(null, 'light', 'light')).toBe(false); // first build
  expect(tileChanged('light', 'dark', 'dark')).toBe(true);
  expect(tileChanged('light', 'dark', 'light')).toBe(false);
  expect(tileChanged('dark', 'dark', 'dark')).toBe(false);
});
```
  (Put the import line at the top of the file with the other imports.)
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 settingsScene` -> FAIL (`slideFrom` not exported).
- [ ] **Step 3: Implement** in `src/game/scenes/SettingsScene.ts`.
  - Imports: add `import { feedbackOf, pivotAt } from '../ui/feedback';`, `import { runSlide } from '../ui/feedbackCore';`, `import { borderColor, knobX, trackColor } from '../ui/feedbackModel';`, and change `import { currentPalette, osDisplay, themeOf } from '../render/palette';` to include `reduceMotion`.
  - Add module-level pure helpers below the `label` helper:
```ts
/** MOT-1-R8 start state of a switch on rebuild: the previous value when known, else the current one (no slide). */
export const slideFrom = (prev: ReadonlyMap<string, boolean>, id: string, on: boolean): boolean => prev.get(id) ?? on;
/** MOT-1-R10 the tile `opt` plays a selection pop when it is the selected tile and the selection changed since the last build. */
export const tileChanged = (prevTheme: string | null, theme: string, opt: string): boolean => prevTheme !== null && prevTheme !== theme && opt === theme;
```
  - Fields (after `private closing = false;`): `private prev = new Map<string, boolean>(); private prevTheme: string | null = null; private slides: (() => void)[] = [];` and a helper:
```ts
  private cancelSlides(): void { for (const stop of this.slides.splice(0)) stop(); }
```
  - In `create()`, extend the existing SHUTDOWN registration: after `this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));` add `this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelSlides());`.
  - In `build()` right after `this.body?.destroy(true);` add `this.cancelSlides();` and after `const minShrink = ...` add `const slideMs = (this.registry.get('balance') as Balance).motion.toggleSlideMs;`.
  - Replace the switch block (from `const sw = this.add.graphics().setPosition(swX, cy); blk.add(sw);` through the `blk.add(tap(this, WIDTH / 2, cy, cardW, ui(M.rowH), ... ))` line) with:
```ts
      // Track and knob are separate objects so the knob can slide and squash (MOT-1-R8). Track: green on / sand off; 2 px inset outline per state (SettingsD2).
      const sw = this.add.graphics().setPosition(swX, cy); blk.add(sw);
      const lw = ui(M.sw.line), iw = swW - lw, ih = swH - lw, kpx = ui(M.sw.knob);
      const ts = toggleTrackStyle(r.on, v.theme), fts = toggleTrackStyle(slideFrom(this.prev, r.id, r.on), v.theme); // UIFIX-R14 POL-02
      const kg = this.add.graphics(), kc = this.add.container(swX + knobX(r.on, 1, kpx), cy, [kg]); blk.add(kc);
      const paint = (p: number): void => { // p = slide progress 0..1; 1 is the final look
        kc.x = swX + knobX(r.on, p, kpx);
        sw.clear().fillStyle(trackColor(toInt(fts.fill), toInt(ts.fill), p)).fillRoundedRect(-swW / 2, -swH / 2, swW, swH, swH / 2)
          .lineStyle(lw, borderColor(toInt(fts.border), toInt(ts.border), p)).strokeRoundedRect(-iw / 2, -ih / 2, iw, ih, ih / 2);
        kg.clear().fillStyle(toInt(p < 0.5 ? fts.knob : ts.knob)).fillCircle(0, 0, kpx);
      };
      if (slideFrom(this.prev, r.id, r.on) !== r.on && !reduceMotion()) this.slides.push(runSlide(this, slideMs, paint));
      else paint(1); // unchanged switches and reduced motion draw once at rest
      blk.add(tap(this, WIDTH / 2, cy, cardW, ui(M.rowH), `settings-${r.id}`, () => this.change(togglePatch(s, d, r.id)), { visual: kg, kind: 'switch' }));
```
  (`this` satisfies `SlideHost`: `Phaser.Scene.events` has `on`/`off`.)
  - Replace the theme tile loop body so each tile draws around its own centre (copy every existing drawing call, replacing `tc` with `tg`, `x0`/`y0` with the local origin, and the swatch/label maths with the same expressions):
```ts
    (['light', 'dark'] as const).forEach((opt, i) => {
      const w = (cardW - 2 * padX - ui(T.gap)) / 2, ax = cardX + padX + i * (w + ui(T.gap)), ay = y + ui(T.tilesY);
      const h = ui(T.tileH), r = ui(T.r), x0 = 0, y0 = 0; // x0, y0: local to tg
      const sel = v.theme === opt, cols = opt === 'light' ? TOKENS.menu.themeLight : TOKENS.menu.themeDark;
      // MOT-1-R10 the tile draws inside a pivot at its centre so press, hover and the selection pop scale about it.
      const { pivot } = pivotAt(this, blk, ax + w / 2, ay + h / 2);
      const tg = this.add.graphics().setPosition(-w / 2, -h / 2); pivot.add(tg);
      tg.fillStyle(toInt(sel ? TOKENS.menu.bestSoft : TOKENS.surface.cream)).fillRoundedRect(x0, y0, w, h, r);
      tg.lineStyle(ui(sel ? T.lineSel : T.line), toInt(sel ? TOKENS.text.primary : TOKENS.surface.stone)).strokeRoundedRect(x0, y0, w, h, r);
      // Rounded swatch: a 2x2 checker whose outer corner cell carries the swatch radius.
      const sq = ui(T.swatch), half = sq / 2, sr = ui(T.swatchR), sx = x0 + w / 2 - half, sy = y0 + ui(T.swatchTop);
      for (let q = 0; q < 4; q++) {
        const col = q % 2, row = q >> 1, corner = (c: number, rr: number) => (c === col && rr === row ? sr : 0);
        tg.fillStyle(toInt(cols[(q + (q >> 1)) % 2]!))
          .fillRoundedRect(sx + half * col, sy + half * row, half, half, { tl: corner(0, 0), tr: corner(1, 0), bl: corner(0, 1), br: corner(1, 1) });
      }
      const lw = ui(T.swatchLine);
      tg.lineStyle(lw, toInt(TOKENS.text.primary), T.swatchEdgeAlpha).strokeRoundedRect(sx + lw / 2, sy + lw / 2, sq - lw, sq - lw, sr - lw / 2);
      tg.fillStyle(toInt(TOKENS.accent.orange)).fillRoundedRect(sx + ui(T.snake.dx), sy + ui(T.snake.dy), ui(T.snake.w), ui(T.snake.h), ui(T.snake.r));
      tg.fillStyle(toInt(TOKENS.menu.slotRing)).fillCircle(sx + ui(T.ball.dx), sy + ui(T.ball.dy), ui(T.ball.r));
      pivot.add(this.add.text(0, -h / 2 + ui(T.labelY), t(opt === 'light' ? 'settings.light' : 'settings.dark'), label(T.labelFont, '900', TOKENS.text.primary)).setOrigin(0.5));
      const zone = tap(this, ax + w / 2, ay + h / 2, w, h, `settings-theme-${opt}`, () => this.change(themePatch(opt)), { visual: pivot, kind: 'card' });
      blk.add(zone);
      if (tileChanged(this.prevTheme, v.theme, opt)) feedbackOf(zone)?.pop();
    });
```
  - At the end of `build()` (after the autosave caption line) add `v.rows.forEach(r => this.prev.set(r.id, r.on)); this.prevTheme = v.theme;`.
  Re-read the file after editing: `rows`, `tc` (theme card background) must still be used for the two card backgrounds and title/sub texts; the old `tc.fillStyle(...)` tile calls must be gone.
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 settingsScene settingsView menuTokens` -> PASS; `npm run typecheck` -> PASS.
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(settings): MOT-1 switch knob slide with track colour lerp, tile press feedback and selection pop`)
```bash
git add src/game/scenes/SettingsScene.ts tests/game/settingsScene.test.ts CHANGELOG.md
git commit -m "feat(settings): MOT-1 switch slide, tile feedback and prev-state map

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check (required, nothing else verifies the slide):** `npm run dev`, open Settings. Toggle Sound: the knob slides (about 160 ms) from its old side with the track fading sand to green, the knob squashes while the finger is down; toggling one row does not animate the other rows; no flicker or jump after the rebuild; tapping Light or Dark makes the newly selected tile bounce once, the other tile does not; reduced-motion on: knob and track jump instantly. Open Settings as the Pause overlay and press Escape mid-slide: no console errors.

---

### Task 9: Loadout card and slot feedback, reject, badge pop (R7, R10, R11)

**Files:** Modify `src/game/scenes/LoadoutScene.ts` (imports lines 1-16, fields line 28-31, `pick()` line 60, `render()` slots lines 76-101 and cards loop line 110, `skillCard()` lines 123-168); Test `tests/game/loadoutEdit.test.ts` (new case)

**Interfaces:**
- Consumes: `tap(..., fx)` (Task 5); `feedbackOf`, `pivotAt` (Task 3); `isRejected` (Task 1); `motionFor` (MOT-0, for `popIn` of the badge); `tapCard`, `tapSlot`, `LoadoutEditState` (`src/game/flow/loadoutEdit.ts`, untouched).
- Produces: `LoadoutScene.pick(action, zone)`; private `prevSlot: Map<string, number | null> | null`; exported pure `badgeIsNew(prev, id, slot): boolean`.

- [ ] **Step 1: Write the failing tests** (append to `tests/game/loadoutEdit.test.ts`; look at how it builds states and reuse those helpers, here written against the real `initEdit`/`tapCard`/`tapSlot` exports):
```ts
import { badgeIsNew } from '../../src/game/scenes/LoadoutScene';
import { isRejected } from '../../src/game/ui/feedbackModel';

it('MOT-1-R11 a locked card or a slot beyond slotCount returns the same state object (rejected)', () => {
  const s = initEdit(/* the same loadout model fixture the other tests in this file use, with a locked skill and slotCount 1 */);
  const locked = s.unlocked.length < 4 ? (['slowmo', 'tailSnip', 'shield', 'mangoRain'] as const).find(id => !s.unlocked.includes(id))! : null;
  if (locked) expect(isRejected(s, tapCard(s, locked))).toBe(true);
  if (s.slotCount === 1) expect(isRejected(s, tapSlot(s, 1))).toBe(true);
  expect(isRejected(s, tapSlot(s, 0))).toBe(false);
});
it('MOT-1-R10 badgeIsNew is true when a card gains or changes its picked slot after the first render', () => {
  expect(badgeIsNew(null, 'slowmo', 0)).toBe(false);                      // first render: no pop
  const prev = new Map<string, number | null>([['slowmo', null], ['shield', 0]]);
  expect(badgeIsNew(prev, 'slowmo', 1)).toBe(true);
  expect(badgeIsNew(prev, 'shield', 0)).toBe(false);
  expect(badgeIsNew(prev, 'shield', null)).toBe(false);
});
```
  (The first test must use a real fixture from the existing file so a locked card exists; if the file's fixtures have all four unlocked, build the state with `{ ...initEdit(...), unlocked: ['slowmo'], slotCount: 1 }`.)
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 loadoutEdit` -> FAIL (`badgeIsNew` missing).
- [ ] **Step 3: Implement** in `src/game/scenes/LoadoutScene.ts`.
  - Imports: `import { motionFor } from '../motion';`, `import { feedbackOf, pivotAt } from '../ui/feedback';`, `import { isRejected } from '../ui/feedbackModel';`.
  - Module-level helper (below `const L = ...` / the existing helpers):
```ts
/** MOT-1-R10 a picked badge pops when its card gained or changed slot since the last render (never on the first render). */
export const badgeIsNew = (prev: ReadonlyMap<string, number | null> | null, id: string, slot: number | null): boolean =>
  prev !== null && slot !== null && prev.get(id) !== slot;
```
  - Field: `private prevSlot: Map<string, number | null> | null = null;`
  - Replace `pick`:
```ts
  // MOT-1-R11 a refused edit (locked card, slot beyond slotCount) returns the same state: shake the tapped target, no sound, no rebuild.
  private pick(action: () => LoadoutEditState, zone: Phaser.GameObjects.Zone): void {
    const next = action();
    if (isRejected(this.edit, next)) { feedbackOf(zone)?.reject(); return; }
    this.edit = next; this.synth.play('uiTap'); this.render();
  }
```
  - Slots (inside `view.slots.forEach`): replace the opening lines and the object adds so each slot draws inside a pivot at the slot column centre (all existing absolute coordinates keep working):
```ts
      const cx = centres[i]!, cy = y + ui(L.slotsPadTop + L.slotCircle / 2), r = ui(L.slotCircle / 2);
      const { pivot, inner } = pivotAt(this, blk, cx, y + ui(L.slotsH / 2)); // MOT-1-R3 kind card scales about the slot centre
      const c = this.add.graphics(); inner.add(c);
```
    Change the three following `blk.add(...)` calls of the slot body (`ic`, `cap`, the skill-name text) to `inner.add(...)`, and replace the final line of the callback with:
```ts
      const zone = tap(this, cx, y + ui(L.slotsH / 2), ui(L.slotCol), ui(L.slotsH), `loadout-slot${slot.index + 1}`,
        () => this.pick(() => tapSlot(this.edit, slot.index), zone), { visual: pivot, kind: 'card' });
      blk.add(zone);
```
  - Cards loop: `for (const card of view.cards) { this.skillCard(blk, card, cardX, y, cards.cardH); ... }` stays; after the loop add `this.prevSlot = new Map(view.cards.map(c => [c.id, c.slot] as const));`.
  - `skillCard`: rename the first parameter from `blk` to `outer`; after `const w = ..., r = ui(L.cardR);` (first line) insert
```ts
    // MOT-1-R3/R10 the whole card draws inside a pivot at its centre (absolute coordinates preserved) so it can scale; the zone below stays unscaled.
    const { pivot, inner } = pivotAt(this, outer, x + w / 2, y + h / 2), blk = inner;
```
    (everything else in the body keeps using `blk`, now the inner container). Replace the picked-badge block with a container so its background pops with its text:
```ts
      if (c.slot !== null) {
        const badge = this.add.text(0, 0, t('loadout.picked', { n: c.slot + 1 }), text(L.badgeFont, '900', TOKENS.menu.mintBannerText)).setOrigin(0.5);
        const bw = badge.width + 2 * ui(L.badgePad), bh = ui(L.badgeH), bx = x + w - pad - bw;
        const bgG = this.add.graphics().fillStyle(toInt(TOKENS.green.face)).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        const bc = this.add.container(bx + bw / 2, cy, [bgG, badge]); blk.add(bc);
        if (badgeIsNew(this.prevSlot, c.id, c.slot)) motionFor(this).popIn(bc); // MOT-1-R10
      }
```
    Replace the last statement (`blk.add(tap(this, x + w / 2, cy, w, h, ... ))`) with:
```ts
    const zone = tap(this, x + w / 2, cy, w, h, `loadout-card-${c.id}`, () => this.pick(() => tapCard(this.edit, c.id), zone), { visual: pivot, kind: 'card' });
    outer.add(zone);
    if (badgeIsNew(this.prevSlot, c.id, c.slot)) feedbackOf(zone)?.pop(); // MOT-1-R10 the newly picked card bounces once
```
    Locked cards: the zone and its feedback exist as before; a tap returns the same state, so `feedbackOf(zone)?.reject()` shakes the card.
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 loadoutEdit loadoutView` -> PASS; `npm run typecheck` -> PASS. Re-read `skillCard` once: no leftover `blk.add(` that should target `outer`, and `bgG`/`g` drawing order unchanged (the old `g.fillStyle(green)...fillRoundedRect(bx, ...)` badge line is removed).
- [ ] **Step 5: Commit** (CHANGELOG: `- feat(loadout): MOT-1 card and slot press feedback, picked-badge pop, reject shake for refused taps`)
```bash
git add src/game/scenes/LoadoutScene.ts tests/game/loadoutEdit.test.ts CHANGELOG.md
git commit -m "feat(loadout): MOT-1 card feedback, reject shake and badge pop

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Browser eye-check (required):** Loadout with one slot and a locked skill (fresh save): tapping a locked card shakes it, makes no tap sound and does not rebuild; tapping an unlocked card makes it dip, rebound, rebuild with its new "Picked 1" badge popping in and the card bouncing once; unaffected cards do not move; at unlock level 6 (two slots) tapping a slot dips its column and switches the ring; resize the window: no pop on resize rebuild; layout of every card and slot is pixel-identical to before at rest (compare a screenshot from `version/v0.3`).

---

### Task 10: Docs, full verification, merge

**Files:** Modify `docs/CODEMAP.md` (add rows after the `src/game/motion/` row at line 26), `docs/DECISIONS.md` (append), `docs/STATUS.md`, `CHANGELOG.md`

- [ ] **Step 1: CODEMAP.** Add one row (same column order as the `src/game/motion/` row, with the module, purpose, entry, depends on, spec/requirements, tests):
`| `src/game/ui/feedback*.ts` | MOT-1 widget feedback: `feedbackModel.ts` (pure scales, knob x, colour lerp), `feedbackCore.ts` (Phaser-free state machine `createFeedback`, `runSlide`), `feedback.ts` (`attachFeedback`, `feedbackOf`, `pivotAt`; wires MOT-0 `motionFor` plus a half-delta adapter) | `feedback.ts` | `../motion`, `../render/palette`, `./layout` | MOT-1 | tests/game/feedbackModel.test.ts, feedbackCore.test.ts, feedbackAttach.test.ts, pillFeedback.test.ts, tapFeedback.test.ts, buttonFeedback.test.ts |`. Also append `tap()` fx / `pillButton` opts to the existing `widgets.ts` / `menuWidgets.ts` rows if they list their API. If the spec docs list in `docs/README.md` names MOT-1 as a draft, mark its plan link.
- [ ] **Step 2: DECISIONS.** Append one dated entry `2026-11-10 MOT-1 widget feedback` containing the six decisions from the top of this plan (tap `fx` argument, half-delta second adapter, no destroy-time kill plus the proposed MOT-0 `motion.stop(t)` follow-up, update-driven `runSlide`, reject cases actually detectable, `home-l1` navigates).
- [ ] **Step 3: STATUS and CHANGELOG.** Rewrite `docs/STATUS.md` (Now / Next / Blockers / Last session, at most 60 lines) to say MOT-1 is implemented and awaiting the owner's browser eye-check listed in Tasks 4 to 9; add the CHANGELOG line `- docs: MOT-1 CODEMAP, DECISIONS and STATUS`.
- [ ] **Step 4: Full verification** (sequential, both must pass):
```bash
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
```
  Expected: all suites PASS (existing `bindPress`, `hitSize`/`menuLayout`, `settingsView`, `loadoutView`, `hudViews` tests unchanged and green), typecheck clean. Then grep for leftovers: `Grep` for `pressScale` in `src/game/hud/HudTop.ts` and `src/game/scenes/ui.ts` (expect none), for `tweens.add` in `src/game/ui/` (expect none), for `reduceMotion` imports that became unused (expect none).
- [ ] **Step 5: Commit docs**
```bash
git add docs/CODEMAP.md docs/DECISIONS.md docs/STATUS.md docs/README.md CHANGELOG.md
git commit -m "docs: MOT-1 CODEMAP, DECISIONS and STATUS

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
- [ ] **Step 6: Merge into the version branch** (no PR, no push; AGENTS.md section 6):
```bash
git checkout version/v0.3
git merge --no-ff feat/motion-1-widget-feedback -m "Merge branch 'feat/motion-1-widget-feedback' into version/v0.3

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
node .gitnexus/run.cjs analyze --index-only --workers 2
```
  (run the GitNexus refresh in the background; do not commit `.gitnexus/`).

---

## Self-review (spec coverage)
| Spec | Task |
|---|---|
| R1 one wrapper, adapter only | 2, 3 (no `tweens.add` anywhere; Task 10 grep) |
| R2 hit rules unchanged | 4 (`pillHitRect` test), 5 (zone size test, press-started-here test), 6, 8, 9 (zones stay unscaled) |
| R3 states per kind, half delta, hover fine pointer | 1, 2 |
| R4 confirm beats navigate, latch, reduced 0 | 2, 3, 7 |
| R5 pill dip + overshoot, `Button` unchanged | 2, 4 |
| R6 `tap` visual, `roundIconButton` round | 5 (deviation: `fx` object, decision 1) |
| R7 rebuild-safe, `prev` map | 2/3 (`dead` flag, decision 3), 8, 9 |
| R8 switch slide, track lerp, border at 0.5, squash, redraw only while sliding | 1, 2 (`runSlide`), 8 |
| R9 no slider code | none (by design) |
| R10 selection overshoot, badge `popIn` | 8, 9 |
| R11 reject via `next === prev`, no render | 1, 2, 9 (deviation: detectable cases, decision 5) |
| R12 disabled alpha, Pause greys 3 buttons | 2, 7 |
| R13 entrance owner (rest scale read at attach, first motion kills entrance) | adapter rest + kill-by-target already guarantee it; `createFeedback` captures base y/alpha at attach (Task 2); no entrance code here |
| Sec 5 balance keys | already in MOT-0; pinned by Task 1 test |
| Sec 6 reduced motion | 2 (tests), 8 (jump), 4 (dip skipped) |
| Sec 7 performance | one `createFeedback` per widget, no per-frame allocation except the Settings slide repaint while it runs (<= 4 rows x 160 ms) |
| Sec 8 testing | 1, 2, 3, 4, 5, 6, 7, 8, 9; eye-checks listed in 4 to 9 |

Placeholder scan: Tasks 7 and 9 reuse fixtures from existing test files (`hudViews`, `loadoutEdit`) whose local names the executor must read first; those two steps say so explicitly and give the assertions.

Type consistency: `Feedback` methods (`press`, `release`, `over`, `out`, `fire`, `pop`, `reject`, `setDisabled`, `destroy`), `attachFeedback(scene, visual, kind, { source, navigates?, dipPx? })`, `feedbackOf(source)`, `pivotAt(scene, parent, cx, cy)`, `tap(..., fx?: TapFx)`, `pillButton(..., tone, opts)`, `roundIconButton(..., shelf, opts)`, `runSlide(host, ms, frame)`, `slideFrom`, `tileChanged`, `badgeIsNew` are used with identical names and signatures in every task.

## Execution handoff
Plan saved to `docs/superpowers/plans/2026-11-10-motion-1-widget-feedback.md`. Execute with superpowers:subagent-driven-development (one fresh subagent per task, review between tasks) or superpowers:executing-plans inline.
