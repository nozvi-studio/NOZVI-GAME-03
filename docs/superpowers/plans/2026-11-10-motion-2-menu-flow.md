# MOT-2 Menu Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every hard menu cut with one transition style (`goTo`), staggered screen entrances, Home idle life and a skippable Results sequence, using only the MOT-0 motion API.

**Architecture:** A Phaser-free `createTransition(deps)` (pending guard, input lock, camera fade, direction rule) is bound to a scene by `transitionFor(scene)` and exposed as `goTo` / `enter` in `src/game/motion/transition.ts`. Entrance orders and the Results timeline are pure data in `src/game/flow/entranceOrder.ts`; the Results runner is Phaser-free in `src/game/flow/resultsSeq.ts`; Home idle math is pure in `src/game/flow/homeIdle.ts`. Scenes only map ids to existing objects and call these helpers. No new `scene.tweens.add` anywhere: all tweening goes through `motionFor(scene)`.

**Tech Stack:** TypeScript strict, Phaser 3.90 (camera `fadeOut`/`fadeIn`, `time.delayedCall`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-motion-2-menu-flow-design.md` (read it first; this plan covers its sections 2, 3, 5, 6, 7, 10). MOT-0 spec: `docs/superpowers/specs/2026-11-10-motion-0-foundation-design.md` (it left `transition.ts` out; this plan creates it).

**Execution order / dependencies (read before starting):**
- **MOT-0 is merged** (`src/game/motion/{curves,motionCore,motion,index}.ts`, `balance.motion` with `idleBreathAmp`, `idleStartMs`, `idlePauseMs`, `resultsSeqMs` already present and validated). No balance task is needed.
- **MOT-1 MUST be merged into `version/v0.3` before this plan starts.** Both edit `HomeScene`, `ResultsScene`, `LoadoutScene`. This plan assumes MOT-1 files exist: `src/game/ui/feedback.ts`, `src/game/ui/feedbackModel.ts`, and the extra visual argument on `tap(scene, x, y, w, h, name, action, visual?)` in `src/game/ui/menuWidgets.ts`. Line areas below refer to the files as they are on `version/v0.3` today; after MOT-1 they shift by a few lines and `tap(...)` calls may carry one more argument. Locate by function name, keep the extra argument untouched. MOT-0-R2 (navigation waits for the release) means `goTo` is called from the action callback, with no second delay (spec section 11).
- Create the execution branch after MOT-1 is merged: `git checkout -b feat/motion-2-menu-flow version/v0.3`.

## Global Constraints
- Windows test flags: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <pattern>`; full suite `npm test -- --configLoader native --pool threads --maxWorkers 2`; `npm run typecheck`. While working run only the touched tests; run the full suite before every merge (AGENTS.md 6b).
- English only. Conventional Commits, each commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; one CHANGELOG `[Unreleased]` line per task in the same commit. No push. Do not edit AGENTS.md, CLAUDE.md, `.claude/`, `.github/`.
- No magic numbers: every duration/scale/offset is a `balance.motion` key (`fadeMs` 180, `slidePx` 28, `staggerMs` 50, `staggerCapMs` 300, `popInMs` 240, `slideInMs` 260, `countUpMs` 900, `pulsePeriodMs` 900, `pulseAmp` 0.04, `idleBreathAmp` 0.02, `idleStartMs` 1200, `idlePauseMs` 4000, `resultsSeqMs` 1500, `maxTweens` 40) or an existing `MENU` constant. The spec's fixed Results offsets (0, 80, 120, 200, 400, 600, 700 ms) are timeline constants in one named object `RESULTS_AT` in `entranceOrder.ts` (spec R9 values, not tunables).
- Never call `scene.tweens.add` in new code; use `motionFor(scene)` (`popIn`, `slideIn`, `fadeIn`, `fadeOut`, `pulse`, `countUp`). `scene.tweens.killTweensOf` is allowed only in the Results skip (Task 7) and is documented there.
- No Phaser imports in `src/game/flow/*` (`import type` only) and none in the pure part of `transition.ts` (`createTransition`, `transitionPlan`, `runEntrance`).
- Light mode only. Scene change <= `fadeMs` out + `fadeMs` in = 360 ms. Reduced motion (MOT-0-R6): one fade of `juice.reduced.softMs`, no slide, no stagger, no idle loops, count-up jumps.
- Names used by QA stay: `home-settings`, `settings-back`, `results-score`, `results-headline`, `results-best`, `results-banner`, `home-export`, `home-primary`, `home-prev`, `home-next`, `loadout-go`, `loadout-back`, `loadout-title`.
- Test names carry `MOT-2-Rn`.
- Before editing a symbol, run `node .gitnexus/run.cjs status` and GitNexus `impact` on `beginRun`, `HomeScene`, `ResultsScene` (AGENTS.md 2c). After the final merge, refresh the index in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

## Rulings on spec ambiguities (lead may veto before execution)
| # | Ambiguity | Ruling |
|---|---|---|
| 1 | R7 says Boot->Home is `goTo(..., 'forward')` "as a fade only", but R2 makes `forward` slide | Boot passes kind `'start'` (fade only, no slide). Home never slides its whole content anyway. |
| 2 | R1 signature has no hooks, but R11 needs `launch('Hud')` after `start('Game')` and R12 needs `stop('Game')` at the end of the fade (stopping it first would show an empty board during the fade) | `goTo(scene, key, data, kind, hooks?: { before?(): void; after?(): void })`. `before` runs just before `scene.start`, `after` just after. |
| 3 | R11 says HudScene "fades its layer in with `fadeIn`": the Hud has dozens of objects | Game and Hud both call `enter(this, [])` in `create`, which runs the camera `fadeIn` (same cream colour). Equivalent look, no per-object alpha. Recorded in DECISIONS. |
| 4 | R8 breathing needs scaleY/scaleX in anti-phase with a custom period; `Motion.pulse` has fixed uniform scale and period | Breath is computed from the pure curve `pulseScale` in `HomeScene.update` and applied with `setScale` (no tween). The Play attention pulse uses `motionFor(scene).pulse` as specified. |
| 5 | R9 "capy head drops in with `backOut`": `Motion` has no drop-with-overshoot call | Head uses `popIn` (Back.easeOut with `overshoot`), same easing family. |
| 6 | R8 "hover on Play stops the pulse": Play is a `pillButton` with no public hover hook | Scene-level `pointerdown` and `gameobjectover` events both call `gate.interact(now)`. MOT-1 hover on Play also kills the pulse tween by target (MOT-0-R4); the gate then restarts it after `idlePauseMs`. |
| 7 | R10 skip must "jump to rest" but `Motion` has no snap | The Results runner stores each target's rest transform before hiding it and restores it itself; in-flight tweens are killed with `tweens.killTweensOf` (the only allowed direct tween call). Stale `liveCount` entries (<= 10) clear on `motion.dispose()` at shutdown. |
| 8 | Hero/Loadout/Results objects use absolute child coordinates inside `scaledBlock`, so scaling a group would scale about the block origin | `captureGroup(scene, parent, anchor, build)` wraps the objects `build` adds into one Container positioned at `anchor` (children shifted by `-anchor`), so `popIn`/`slideIn` act about the item's centre. Names of QA objects stay on the same objects, one container level deeper. |

## File map
- Create `src/game/motion/transition.ts` (pure `createTransition`, `transitionPlan`, `bootHoldMs`, `runEntrance`; Phaser binding `transitionFor`, `goTo`, `enter`, `captureGroup`); export from `src/game/motion/index.ts`.
- Create `src/game/flow/entranceOrder.ts` (`HOME_ORDER`, `loadoutOrder`, `settingsOrder`, `RESULTS_AT`, `resultsTimeline`, `entranceEndMs`).
- Create `src/game/flow/resultsSeq.ts` (`runResultsSequence`).
- Create `src/game/flow/homeIdle.ts` (`breathScale`, `createIdleGate`).
- Modify `src/game/flow/debugFlag.ts` (`isMotionOff`).
- Modify `src/game/scenes/BootScene.ts` (`create`), `HomeScene.ts` (`create`, `play`, `step`, `build`, `heroPanel`, new `update`), `LoadoutScene.ts` (`create`, `back`, `go`, `render`, `skillCard` call site), `SettingsScene.ts` (`create`, `back`, `build`), `ResultsScene.ts` (`create`, `summaryBlock`, `summaryCard`, `bestChip`, `row`, `banner`, `progress`, `footer`), `HudScene.ts` (`create`, `leave`, `toResults`), `GameScene.ts` (`create`), `ui.ts` (`beginRun`).
- Tests (create): `tests/game/transition.test.ts`, `tests/game/entranceOrder.test.ts`, `tests/game/resultsSeq.test.ts`, `tests/game/homeIdle.test.ts`, `tests/game/navGuard.test.ts`. Modify `tests/game/debugFlag.test.ts`, and `tests/game/boot.test.ts` / `settingsScene.test.ts` / `hud.test.ts` only if Task 4 shows a fake scene needs a field.
- Docs: `docs/CODEMAP.md`, `docs/README.md` (only if the doc map lists specs/plans by name), `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/PLAYTEST.md` (eye-check record), `docs/STATUS.md`.

---

### Task 1: `?debug=1&motion=off` flag (R13)

**Files:** Modify `src/game/flow/debugFlag.ts` (append after `isArtPreview`); Test `tests/game/debugFlag.test.ts`

**Interfaces:** Produces `isMotionOff(search: string): boolean` (true only with `debug=1` and `motion=off`).

- [ ] **Step 1: Write the failing test** (append to `tests/game/debugFlag.test.ts`, and add `isMotionOff` to its import from `../../src/game/flow/debugFlag`)
```ts
it('MOT-2-R13 motion=off needs debug=1 and motion=off', () => {
  expect(isMotionOff('?debug=1&motion=off')).toBe(true);
  expect(isMotionOff('?motion=off&debug=1&level=3')).toBe(true);
  for (const s of ['', '?motion=off', '?debug=1', '?debug=1&motion=on', '?debug=0&motion=off']) expect(isMotionOff(s)).toBe(false);
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/debugFlag` -> FAIL (`isMotionOff` is not exported).
- [ ] **Step 3: Implement** (append to `src/game/flow/debugFlag.ts`)
```ts
// MOT-2-R13 `?debug=1&motion=off` makes every MOT-2 motion jump to its rest state (deterministic QA frames).
export function isMotionOff(search: string): boolean {
  return isDebug(search) && new URLSearchParams(search).get('motion') === 'off';
}
```
- [ ] **Step 4:** Re-run the test -> PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add src/game/flow/debugFlag.ts tests/game/debugFlag.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 debug motion=off flag" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG line under `## [Unreleased]`: `- feat(motion): MOT-2 ?debug=1&motion=off flag`.)

---

### Task 2: Entrance orders, Results timeline, Home idle math (pure)

**Files:** Create `src/game/flow/entranceOrder.ts`, `src/game/flow/homeIdle.ts`; Test `tests/game/entranceOrder.test.ts`, `tests/game/homeIdle.test.ts`

**Interfaces:**
- Consumes (MOT-0): `staggerDelay(index, stepMs, capMs)`, `pulseScale(timeMs, periodMs, amp)` from `src/game/motion/curves.ts`; `MotionBalance` from `src/core/balance.ts`.
- Produces:
  - `type Dir = 'left' | 'right' | 'up' | 'down'`
  - `interface EntranceStep { id: string; motion: 'pop' | 'slide' | 'fade'; from?: Dir | 'nav' }` (`'nav'` = the direction of the current transition, resolved by `runEntrance`)
  - `HOME_ORDER: EntranceStep[]`, `loadoutOrder(cardCount: number): EntranceStep[]`, `settingsOrder(rowCount: number): EntranceStep[]`
  - `entranceEndMs(count: number, cfg: Pick<MotionBalance, 'staggerMs' | 'staggerCapMs' | 'popInMs' | 'slideInMs'>): number`
  - `type SeqKind = 'pop' | 'slide' | 'fade' | 'count' | 'pulse'`; `interface SeqItem { item: string; atMs: number; kind: SeqKind }`
  - `RESULTS_AT`, `resultsTimeline(opts: { newBest: boolean; energy: boolean; banner: boolean; next: boolean; again: boolean; marbles?: boolean }, cfg): SeqItem[]`
  - `breathScale(timeMs, cfg: Pick<MotionBalance, 'pulsePeriodMs' | 'idleBreathAmp'>): { sx: number; sy: number }`, `createIdleGate(cfg: Pick<MotionBalance, 'idleStartMs' | 'idlePauseMs'>, t0: number): { allowed(now: number): boolean; interact(now: number): void }`

- [ ] **Step 1: Write the failing tests**

`tests/game/entranceOrder.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { staggerDelay } from '../../src/game/motion/curves';
import { HOME_ORDER, entranceEndMs, loadoutOrder, resultsTimeline, settingsOrder } from '../../src/game/flow/entranceOrder';

const m = json.motion;
const ids = (o: { id: string }[]): string[] => o.map(s => s.id);

describe('MOT-2 entrance orders', () => {
  it('MOT-2-R5 Home order is gear, logo lines, hero, stepper, play, chips, hint', () => {
    expect(ids(HOME_ORDER)).toEqual(['gear', 'logo1', 'logo2', 'hero', 'stepper', 'play', 'chips', 'hint']);
    expect(HOME_ORDER[0]).toMatchObject({ motion: 'pop' });
    expect(HOME_ORDER[1]).toMatchObject({ motion: 'slide', from: 'up' });
    expect(HOME_ORDER[5]).toMatchObject({ motion: 'slide', from: 'down' });
  });
  it('MOT-2-R5 Loadout order follows the list and every card past index 6 enters at the cap', () => {
    const o = loadoutOrder(12);
    expect(ids(o).slice(0, 4)).toEqual(['back', 'title', 'slots', 'chips']);
    expect(ids(o).filter(i => i.startsWith('card'))).toHaveLength(12);
    expect(o[o.length - 1]).toMatchObject({ id: 'go', motion: 'pop' });
    expect(o.find(s => s.id === 'card0')).toMatchObject({ motion: 'slide', from: 'nav' });
    const delays = o.map((_, i) => staggerDelay(i, m.staggerMs, m.staggerCapMs));
    expect(Math.max(...delays)).toBe(m.staggerCapMs);
    expect(delays[o.length - 1]).toBe(m.staggerCapMs);
  });
  it('MOT-2-R5 Settings order is back, title, card, rows, theme, caption', () => {
    expect(ids(settingsOrder(4))).toEqual(['back', 'title', 'card', 'row0', 'row1', 'row2', 'row3', 'theme', 'caption']);
  });
  it('MOT-2-R5 entranceEndMs is the last delay plus the longest motion', () => {
    expect(entranceEndMs(8, m)).toBe(staggerDelay(7, m.staggerMs, m.staggerCapMs) + Math.max(m.popInMs, m.slideInMs));
    expect(entranceEndMs(0, m)).toBe(0);
  });
});

describe('MOT-2-R9 resultsTimeline', () => {
  const all = { newBest: true, energy: true, banner: true, next: true, again: true };
  const at = (tl: ReturnType<typeof resultsTimeline>, item: string) => tl.find(x => x.item === item)!.atMs;
  it('MOT-2-R9 matches the spec times and ends exactly at resultsSeqMs', () => {
    const tl = resultsTimeline(all, m);
    expect(at(tl, 'title')).toBe(0); expect(at(tl, 'head')).toBe(80); expect(at(tl, 'card')).toBe(120);
    expect(at(tl, 'score')).toBe(200); expect(at(tl, 'stat0')).toBe(400); expect(at(tl, 'stat2')).toBe(400 + 2 * m.staggerMs);
    expect(at(tl, 'best')).toBe(200 + m.countUpMs);
    expect(at(tl, 'energy')).toBe(700); expect(at(tl, 'banner')).toBe(700 + m.staggerMs); expect(at(tl, 'next')).toBe(700 + 2 * m.staggerMs);
    const last = tl[tl.length - 1]!;
    expect(last.item).toBe('again');
    expect(last.atMs + m.popInMs).toBe(m.resultsSeqMs);
    expect(at(tl, 'home')).toBe(last.atMs - m.staggerMs);
  });
  it('MOT-2-R9 a plain best chip fades in at 600 and a new best pops and pulses at the count-up end', () => {
    const plain = resultsTimeline({ ...all, newBest: false }, m);
    expect(plain.find(x => x.item === 'best')).toEqual({ item: 'best', atMs: 600, kind: 'fade' });
    expect(plain.some(x => x.item === 'bestStar')).toBe(false);
    const gold = resultsTimeline(all, m);
    expect(gold.find(x => x.item === 'best')!.kind).toBe('pop');
    expect(gold.find(x => x.item === 'bestStar')).toEqual({ item: 'bestStar', atMs: 200 + m.countUpMs, kind: 'pulse' });
  });
  it('MOT-2-R9 absent blocks are skipped without gaps and the marbles slot sits between energy and banner', () => {
    const tl = resultsTimeline({ newBest: false, energy: false, banner: false, next: true, again: false }, m);
    expect(tl.map(x => x.item)).toContain('next'); expect(at(tl, 'next')).toBe(700);
    expect(tl.some(x => x.item === 'energy' || x.item === 'banner' || x.item === 'again')).toBe(false);
    expect(tl[tl.length - 1]).toMatchObject({ item: 'home' });
    expect(tl[tl.length - 1]!.atMs + m.popInMs).toBe(m.resultsSeqMs);
    const withMarbles = resultsTimeline({ ...all, marbles: true }, m);
    expect(withMarbles.map(x => x.item).filter(i => ['energy', 'marbles', 'banner'].includes(i))).toEqual(['energy', 'marbles', 'banner']);
  });
  it('MOT-2-R9 every item starts before the footer and no item is sorted after a later one', () => {
    const tl = resultsTimeline(all, m);
    const times = tl.map(x => x.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
```
`tests/game/homeIdle.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { breathScale, createIdleGate } from '../../src/game/flow/homeIdle';

const m = json.motion;
describe('MOT-2-R8 Home idle', () => {
  it('MOT-2-R8 breath is volume preserving, period 2*pulsePeriodMs, amplitude idleBreathAmp', () => {
    expect(breathScale(0, m)).toEqual({ sx: 1, sy: 1 });
    const peak = breathScale(m.pulsePeriodMs / 2, m); // quarter of the 1800 ms period
    expect(peak.sy).toBeCloseTo(1 + m.idleBreathAmp, 10);
    expect(peak.sx * peak.sy).toBeCloseTo(1, 10);
    const full = breathScale(2 * m.pulsePeriodMs, m);
    expect(full.sy).toBeCloseTo(1, 10);
  });
  it('MOT-2-R8 the pulse waits idleStartMs, pauses idlePauseMs after an interaction, then resumes', () => {
    const g = createIdleGate(m, 1000);
    expect(g.allowed(1000 + m.idleStartMs - 1)).toBe(false);
    expect(g.allowed(1000 + m.idleStartMs)).toBe(true);
    g.interact(5000);
    expect(g.allowed(5000)).toBe(false);
    expect(g.allowed(5000 + m.idlePauseMs - 1)).toBe(false);
    expect(g.allowed(5000 + m.idlePauseMs)).toBe(true);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/entranceOrder tests/game/homeIdle` -> FAIL (modules missing).
- [ ] **Step 3: Implement**

`src/game/flow/entranceOrder.ts`
```ts
// MOT-2-R5/R9 pure entrance orders and the Results timeline: no Phaser, no tweens (spec 2026-11-10-motion-2-menu-flow-design.md sections 2-3).
import type { MotionBalance } from '../../core/balance';
import { staggerDelay } from '../motion/curves';

export type Dir = 'left' | 'right' | 'up' | 'down';
export interface EntranceStep { id: string; motion: 'pop' | 'slide' | 'fade'; from?: Dir | 'nav' }

const pop = (id: string): EntranceStep => ({ id, motion: 'pop' });
const slide = (id: string, from: Dir | 'nav'): EntranceStep => ({ id, motion: 'slide', from });
const fade = (id: string): EntranceStep => ({ id, motion: 'fade' });

/** MOT-2-R5 Home: gear pops, logo slides from the top, the rest slides up from below; the hill is static. */
export const HOME_ORDER: EntranceStep[] = [pop('gear'), slide('logo1', 'up'), slide('logo2', 'up'), pop('hero'),
  slide('stepper', 'down'), slide('play', 'down'), slide('chips', 'down'), slide('hint', 'down')];

/** MOT-2-R5 Loadout: back, title, slots, start chips, one slide per card in list order, action last. */
export const loadoutOrder = (cardCount: number): EntranceStep[] => [pop('back'), fade('title'), pop('slots'), slide('chips', 'nav'),
  ...Array.from({ length: cardCount }, (_, i) => slide(`card${i}`, 'nav')), pop('go')];

/** MOT-2-R5 Settings (full screen): back, title, card background, rows, theme card, caption. */
export const settingsOrder = (rowCount: number): EntranceStep[] => [pop('back'), fade('title'), fade('card'),
  ...Array.from({ length: rowCount }, (_, i) => slide(`row${i}`, 'nav')), slide('theme', 'nav'), fade('caption')];

/** MOT-2-R8 time from the first entrance frame until the last of `count` items has settled. */
export function entranceEndMs(count: number, cfg: Pick<MotionBalance, 'staggerMs' | 'staggerCapMs' | 'popInMs' | 'slideInMs'>): number {
  return count <= 0 ? 0 : staggerDelay(count - 1, cfg.staggerMs, cfg.staggerCapMs) + Math.max(cfg.popInMs, cfg.slideInMs);
}

export type SeqKind = 'pop' | 'slide' | 'fade' | 'count' | 'pulse';
export interface SeqItem { item: string; atMs: number; kind: SeqKind }
/** MOT-2-R9 fixed offsets from the spec, in ms from the sequence start (timeline constants, not tunables). */
export const RESULTS_AT = { title: 0, head: 80, card: 120, score: 200, tiles: 400, plainBest: 600, blocks: 700 } as const;
export interface ResultsParts { newBest: boolean; energy: boolean; banner: boolean; next: boolean; again: boolean; marbles?: boolean }

/** MOT-2-R9 Results sequence: ends exactly at resultsSeqMs (the last footer pop settles at it). Absent parts are skipped without gaps. */
export function resultsTimeline(p: ResultsParts, cfg: Pick<MotionBalance, 'staggerMs' | 'staggerCapMs' | 'popInMs' | 'countUpMs' | 'resultsSeqMs'>): SeqItem[] {
  const out: SeqItem[] = [
    { item: 'title', atMs: RESULTS_AT.title, kind: 'pop' },
    { item: 'head', atMs: RESULTS_AT.head, kind: 'pop' },
    { item: 'card', atMs: RESULTS_AT.card, kind: 'pop' },
    { item: 'headline', atMs: RESULTS_AT.card, kind: 'fade' },
    { item: 'scoreLabel', atMs: RESULTS_AT.card, kind: 'fade' },
    { item: 'score', atMs: RESULTS_AT.score, kind: 'count' },
  ];
  [0, 1, 2].forEach(i => out.push({ item: `stat${i}`, atMs: RESULTS_AT.tiles + staggerDelay(i, cfg.staggerMs, cfg.staggerCapMs), kind: 'pop' }));
  const countEnd = RESULTS_AT.score + cfg.countUpMs;
  if (p.newBest) {
    out.push({ item: 'best', atMs: countEnd, kind: 'pop' }, { item: 'bestStar', atMs: countEnd, kind: 'pulse' });
  } else out.push({ item: 'best', atMs: RESULTS_AT.plainBest, kind: 'fade' });
  const blocks = [p.energy ? 'energy' : null, p.marbles ? 'marbles' : null, p.banner ? 'banner' : null, p.next ? 'next' : null].filter((b): b is string => b !== null);
  blocks.forEach((item, i) => out.push({ item, atMs: RESULTS_AT.blocks + staggerDelay(i, cfg.staggerMs, cfg.staggerCapMs), kind: 'slide' }));
  const againAt = cfg.resultsSeqMs - cfg.popInMs;
  if (p.again) out.push({ item: 'home', atMs: againAt - cfg.staggerMs, kind: 'pop' }, { item: 'again', atMs: againAt, kind: 'pop' });
  else out.push({ item: 'home', atMs: againAt, kind: 'pop' });
  return out.sort((a, b) => a.atMs - b.atMs); // Array.sort is stable: equal times keep the order above
}
```
`src/game/flow/homeIdle.ts`
```ts
// MOT-2-R8 Home idle math (pure). Breath uses the MOT-0 pulse curve; the gate decides when the Play attention pulse may run.
import type { MotionBalance } from '../../core/balance';
import { pulseScale } from '../motion/curves';

/** Volume-preserving squash: scaleY follows the pulse curve (period 2*pulsePeriodMs, amplitude idleBreathAmp), scaleX is its inverse. */
export function breathScale(timeMs: number, cfg: Pick<MotionBalance, 'pulsePeriodMs' | 'idleBreathAmp'>): { sx: number; sy: number } {
  const k = pulseScale(timeMs, 2 * cfg.pulsePeriodMs, cfg.idleBreathAmp);
  return { sx: 1 / k, sy: k };
}

/** The pulse starts idleStartMs after t0 (entrance end) and pauses idlePauseMs after each interaction. */
export function createIdleGate(cfg: Pick<MotionBalance, 'idleStartMs' | 'idlePauseMs'>, t0: number): { allowed(now: number): boolean; interact(now: number): void } {
  let pausedUntil = -Infinity;
  return {
    allowed: now => now >= t0 + cfg.idleStartMs && now >= pausedUntil,
    interact: now => { pausedUntil = now + cfg.idlePauseMs; },
  };
}
```
- [ ] **Step 4:** Re-run the two test files -> PASS. Run `npm run typecheck`. (If the ordering test fails because Results items with equal `atMs` re-sort, keep the insertion order shown above: it is already stable.)
- [ ] **Step 5: Commit**
```bash
git add src/game/flow/entranceOrder.ts src/game/flow/homeIdle.ts tests/game/entranceOrder.test.ts tests/game/homeIdle.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 entrance orders, results timeline, home idle math" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 pure entrance orders, Results timeline and Home idle math`.)

---

### Task 3: `transition.ts` (`goTo`, `enter`, `runEntrance`, `captureGroup`)

**Files:** Create `src/game/motion/transition.ts`; Modify `src/game/motion/index.ts` (add `export * from './transition';`); Test `tests/game/transition.test.ts`

**Interfaces:**
- Consumes: Task 1 `isMotionOff`; Task 2 `EntranceStep`, `Dir`; MOT-0 `Motion`, `MotionTarget`, `motionFor` (`src/game/motion/motion.ts`), `MotionBalance`; `reduceMotion` (`../render/palette`); `TOKENS`, `toInt` (`../uiTokens`).
- Produces:
  - `type NavKind = 'forward' | 'back' | 'start' | 'quit'`
  - `interface TransitionPlan { fadeMs: number; slide: Dir | null; stagger: boolean; off: boolean }`
  - `transitionPlan(kind, cfg: { fadeMs: number }, softMs: number, reduced: boolean, off: boolean): TransitionPlan`
  - `bootHoldMs(waitedMs: number, fadeMs: number): number`
  - `interface TransitionDeps { cfg: { fadeMs: number }; softMs: number; reduced(): boolean; off: boolean; camera: { fadeOut(ms: number, done: () => void): void; fadeIn(ms: number): void } | null; lockInput(): void; start(key: string, data?: object): void; navKind: { get(): NavKind | undefined; set(k: NavKind | undefined): void } }`
  - `interface Transition { goTo(key: string, data: object | undefined, kind: NavKind, hooks?: GoHooks): boolean; enter(): TransitionPlan }`, `interface GoHooks { before?(): void; after?(): void }`, `createTransition(d: TransitionDeps): Transition`
  - `type EntranceTargets = Record<string, MotionTarget | MotionTarget[] | undefined>`; `runEntrance(m: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn'>, plan: TransitionPlan, steps: EntranceStep[], targets: EntranceTargets): number` (returns the number of animated steps)
  - Phaser bindings: `transitionFor(scene: Phaser.Scene): Transition`, `goTo(scene, key, data?, kind, hooks?): boolean`, `enter(scene, steps, targets): number` (resets the pending flag, runs the camera fade-in, runs the entrance), `captureGroup(scene, parent, anchor: { x: number; y: number }, build: () => void, name?: string): Phaser.GameObjects.Container`

- [ ] **Step 1: Write the failing test** `tests/game/transition.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { bootHoldMs, createTransition, runEntrance, transitionPlan, type NavKind, type TransitionDeps } from '../../src/game/motion/transition';
import type { MotionTarget } from '../../src/game/motion/motionCore';

const m = json.motion;
const SOFT = json.juice.reduced.softMs;

function fakeDeps(over: Partial<{ reduced: boolean; off: boolean; camera: boolean }> = {}) {
  const log: string[] = [];
  let kind: NavKind | undefined;
  let finishFade: (() => void) | null = null;
  const d: TransitionDeps = {
    cfg: m, softMs: SOFT, reduced: () => over.reduced === true, off: over.off === true,
    camera: over.camera === false ? null : { fadeOut: (ms, done) => { log.push(`out:${ms}`); finishFade = done; }, fadeIn: ms => log.push(`in:${ms}`) },
    lockInput: () => log.push('lock'), start: (key, data) => log.push(`start:${key}:${JSON.stringify(data ?? null)}`),
    navKind: { get: () => kind, set: k => { kind = k; } },
  };
  return { d, log, finish: () => finishFade?.() };
}
const target = (): MotionTarget & { calls: string[] } => {
  const calls: string[] = [];
  return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, calls, setScale() { return this; }, setPosition() { return this; }, setAlpha(a: number) { calls.push(`alpha:${a}`); return this; } } as never;
};
const recMotion = () => {
  const calls: string[] = [];
  return { calls, popIn: (_t: unknown, i = 0) => calls.push(`pop:${i}`), slideIn: (_t: unknown, from: string, i = 0) => calls.push(`slide:${from}:${i}`), fadeIn: () => calls.push('fade') };
};

describe('MOT-2 transitionPlan', () => {
  it('MOT-2-R2 direction rule: forward from the right, back from the left, quit from below, start fade only', () => {
    const slides = (['forward', 'back', 'quit', 'start'] as NavKind[]).map(k => transitionPlan(k, m, SOFT, false, false).slide);
    expect(slides).toEqual(['right', 'left', 'down', null]);
    expect(transitionPlan('forward', m, SOFT, false, false)).toMatchObject({ fadeMs: m.fadeMs, stagger: true, off: false });
  });
  it('MOT-2-R2 a scene change is at most 2 * fadeMs = 360 ms', () => { expect(2 * transitionPlan('forward', m, SOFT, false, false).fadeMs).toBeLessThanOrEqual(360); });
  it('MOT-2-R7 a reduced fade lasts softMs with no slide and no stagger', () => {
    expect(transitionPlan('forward', m, SOFT, true, false)).toEqual({ fadeMs: SOFT, slide: null, stagger: false, off: false });
  });
  it('MOT-2-R7 Boot holds only what is left of fadeMs after the fonts wait', () => {
    expect(bootHoldMs(0, m.fadeMs)).toBe(m.fadeMs); expect(bootHoldMs(50, m.fadeMs)).toBe(m.fadeMs - 50);
    expect(bootHoldMs(900, m.fadeMs)).toBe(0);
  });
});

describe('MOT-2 createTransition.goTo', () => {
  it('MOT-2-R3 locks input at call time, fades out, then starts the scene with the same data', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    expect(tr.goTo('Loadout', { level: 7, debug: true }, 'forward')).toBe(true);
    expect(log).toEqual(['lock', `out:${m.fadeMs}`]);
    finish();
    expect(log[log.length - 1]).toBe('start:Loadout:{"level":7,"debug":true}');
  });
  it('MOT-2-R3 a second goTo while one is pending is dropped; enter() re-arms it', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    expect(tr.goTo('Home', undefined, 'back')).toBe(true);
    expect(tr.goTo('Settings', undefined, 'forward')).toBe(false);
    finish();
    expect(log.filter(l => l.startsWith('start:'))).toEqual(['start:Home:null']);
    tr.enter();
    expect(tr.goTo('Settings', undefined, 'forward')).toBe(true);
  });
  it('MOT-2-R1 hooks run around the scene start (stop Game before, launch Hud after)', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    tr.goTo('Game', undefined, 'start', { before: () => log.push('before'), after: () => log.push('after') });
    finish();
    expect(log.slice(-3)).toEqual(['before', 'start:Game:null', 'after']);
  });
  it('MOT-2-R5 reduced motion uses one softMs fade out and in', () => {
    const { d, log, finish } = fakeDeps({ reduced: true }); const tr = createTransition(d);
    tr.goTo('Home', undefined, 'back'); finish(); tr.enter();
    expect(log).toContain(`out:${SOFT}`); expect(log).toContain(`in:${SOFT}`);
  });
  it('MOT-2-R13 motion=off and a missing camera start at once without any fade', () => {
    for (const over of [{ off: true }, { camera: false }]) {
      const { d, log } = fakeDeps(over); createTransition(d).goTo('Home', { returnTo: 'Home' }, 'back');
      expect(log).toEqual(['lock', 'start:Home:{"returnTo":"Home"}']);
    }
  });
  it('MOT-2-R2 enter() reads the kind set by goTo once, then defaults to start', () => {
    const { d, finish } = fakeDeps(); const tr = createTransition(d);
    tr.goTo('Loadout', undefined, 'forward'); finish();
    expect(tr.enter().slide).toBe('right');
    expect(tr.enter().slide).toBeNull();
  });
  it('MOT-2-R13 enter() fades the camera in unless motion is off', () => {
    const a = fakeDeps(); createTransition(a.d).enter(); expect(a.log).toEqual([`in:${m.fadeMs}`]);
    const b = fakeDeps({ off: true }); createTransition(b.d).enter(); expect(b.log).toEqual([]);
  });
});

describe('MOT-2-R5 runEntrance', () => {
  const plan = transitionPlan('forward', m, SOFT, false, false);
  it('MOT-2-R5 staggers by present items only and resolves nav to the plan direction', () => {
    const mo = recMotion();
    const targets = { a: target(), c: target(), d: target() };
    const n = runEntrance(mo, plan, [{ id: 'a', motion: 'pop' }, { id: 'b', motion: 'pop' }, { id: 'c', motion: 'slide', from: 'nav' }, { id: 'd', motion: 'slide', from: 'down' }], targets);
    expect(n).toBe(3);
    expect(mo.calls).toEqual(['pop:0', 'slide:right:1', 'slide:down:2']);
  });
  it('MOT-2-R5 an array target animates all pieces with the same index', () => {
    const mo = recMotion();
    runEntrance(mo, plan, [{ id: 'x', motion: 'slide', from: 'down' }, { id: 'y', motion: 'pop' }], { x: [target(), target(), target()], y: target() });
    expect(mo.calls).toEqual(['slide:down:0', 'slide:down:0', 'slide:down:0', 'pop:1']);
  });
  it('MOT-2-R2 a nav slide with no direction (start) degrades to a fade from alpha 0', () => {
    const mo = recMotion(); const t = target();
    runEntrance(mo, transitionPlan('start', m, SOFT, false, false), [{ id: 'a', motion: 'slide', from: 'nav' }, { id: 'b', motion: 'fade' }], { a: t, b: t });
    expect(mo.calls).toEqual(['fade', 'fade']); expect(t.calls).toEqual(['alpha:0', 'alpha:0']);
  });
  it('MOT-2-R5 reduced motion gives every item index 0 (no stagger); motion=off animates nothing', () => {
    const mo = recMotion();
    runEntrance(mo, transitionPlan('forward', m, SOFT, true, false), [{ id: 'a', motion: 'pop' }, { id: 'b', motion: 'pop' }], { a: target(), b: target() });
    expect(mo.calls).toEqual(['pop:0', 'pop:0']);
    const off = recMotion();
    expect(runEntrance(off, transitionPlan('forward', m, SOFT, false, true), [{ id: 'a', motion: 'pop' }], { a: target() })).toBe(0);
    expect(off.calls).toEqual([]);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/transition` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/motion/transition.ts`
```ts
// MOT-2-R1..R5 scene transitions and entrances on top of the MOT-0 adapter. The pure half (createTransition, runEntrance) has no Phaser import.
// Spec: docs/superpowers/specs/2026-11-10-motion-2-menu-flow-design.md sections 2-3.
import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { isMotionOff } from '../flow/debugFlag';
import type { Dir, EntranceStep } from '../flow/entranceOrder';
import { reduceMotion } from '../render/palette';
import { TOKENS, toInt } from '../uiTokens';
import type { Motion, MotionTarget } from './motionCore';
import { motionFor } from './motion';

export type NavKind = 'forward' | 'back' | 'start' | 'quit';
export interface TransitionPlan { fadeMs: number; slide: Dir | null; stagger: boolean; off: boolean }
export interface GoHooks { before?(): void; after?(): void }
export interface TransitionDeps {
  cfg: { fadeMs: number }; softMs: number; reduced(): boolean; off: boolean;
  camera: { fadeOut(ms: number, done: () => void): void; fadeIn(ms: number): void } | null;
  lockInput(): void; start(key: string, data?: object): void;
  navKind: { get(): NavKind | undefined; set(k: NavKind | undefined): void };
}
export interface Transition { goTo(key: string, data: object | undefined, kind: NavKind, hooks?: GoHooks): boolean; enter(): TransitionPlan }

const SLIDE: Record<NavKind, Dir | null> = { forward: 'right', back: 'left', start: null, quit: 'down' };

/** MOT-2-R2/R5 fade length and slide direction for one navigation; reduced = one softMs fade, no slide, no stagger. */
export function transitionPlan(kind: NavKind, cfg: { fadeMs: number }, softMs: number, reduced: boolean, off: boolean): TransitionPlan {
  return reduced ? { fadeMs: softMs, slide: null, stagger: false, off } : { fadeMs: cfg.fadeMs, slide: SLIDE[kind], stagger: true, off };
}
/** MOT-2-R7 Boot holds the 100% frame for what is left of fadeMs after the fonts wait; slow fonts add no extra wait. */
export const bootHoldMs = (waitedMs: number, fadeMs: number): number => Math.max(0, fadeMs - Math.max(0, waitedMs));

export function createTransition(d: TransitionDeps): Transition {
  let pending = false;
  const planFor = (kind: NavKind): TransitionPlan => transitionPlan(kind, d.cfg, d.softMs, d.reduced(), d.off);
  return {
    goTo(key, data, kind, hooks) {
      if (pending) return false; // R3 a double tap never double starts
      pending = true;
      d.lockInput(); d.navKind.set(kind);
      const go = (): void => { hooks?.before?.(); d.start(key, data); hooks?.after?.(); };
      if (d.off || !d.camera) go(); else d.camera.fadeOut(planFor(kind).fadeMs, go);
      return true;
    },
    enter() {
      pending = false; // R3 the flag is reset by the next scene's create (Phaser reuses scene instances)
      const plan = planFor(d.navKind.get() ?? 'start');
      d.navKind.set(undefined);
      if (!plan.off) d.camera?.fadeIn(plan.fadeMs);
      return plan;
    },
  };
}

export type EntranceTargets = Record<string, MotionTarget | MotionTarget[] | undefined>;
/** MOT-2-R5 run an ordered entrance. Missing targets are skipped and take no stagger slot; an array target shares one slot. */
export function runEntrance(m: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn'>, plan: TransitionPlan, steps: EntranceStep[], targets: EntranceTargets): number {
  if (plan.off) return 0;
  let slot = 0;
  for (const s of steps) {
    const found = targets[s.id];
    if (!found) continue;
    const idx = plan.stagger ? slot : 0; slot++;
    const dir = s.from === 'nav' ? plan.slide : s.from ?? null;
    for (const t of Array.isArray(found) ? found : [found]) {
      if (s.motion === 'pop') m.popIn(t, idx);
      else if (s.motion === 'slide' && dir) m.slideIn(t, dir, idx);
      else { t.setAlpha(0); m.fadeIn(t); } // a fade step, or a slide with no direction (start)
    }
  }
  return slot;
}

// ---- Phaser binding ----
const cache = new WeakMap<object, Transition>();
const KIND_KEY = 'navKind';
const cream = toInt(TOKENS.surface.cream);

/** MOT-2 per-scene transition. A fake scene without cameras/balance (unit tests) starts immediately. */
export function transitionFor(scene: Phaser.Scene): Transition {
  const hit = cache.get(scene);
  if (hit) return hit;
  const b = scene.registry.get('balance') as Balance | undefined;
  const cam = scene.cameras?.main;
  const r = (cream >> 16) & 255, g = (cream >> 8) & 255, bl = cream & 255;
  const tr = createTransition({
    cfg: b?.motion ?? { fadeMs: 0 }, softMs: b?.juice.reduced.softMs ?? 0, reduced: reduceMotion,
    off: !b || isMotionOff(typeof location === 'undefined' ? '' : location.search),
    camera: cam && b ? { fadeOut: (ms, done) => { cam.once('camerafadeoutcomplete', done); cam.fadeOut(ms, r, g, bl); }, fadeIn: ms => { cam.fadeIn(ms, r, g, bl); } } : null,
    lockInput: () => { if (scene.input) scene.input.enabled = false; },
    start: (key, data) => { scene.scene.start(key, data); },
    navKind: { get: () => scene.registry.get(KIND_KEY) as NavKind | undefined, set: k => { scene.registry.set(KIND_KEY, k); } },
  });
  cache.set(scene, tr);
  return tr;
}

/** MOT-2-R1 the only way a menu scene changes: fade out, then scene.start. Returns false when a goTo is already pending. */
export function goTo(scene: Phaser.Scene, key: string, data: object | undefined, kind: NavKind, hooks?: GoHooks): boolean {
  return transitionFor(scene).goTo(key, data, kind, hooks);
}
/** MOT-2-R2/R3/R5 call at the END of a scene's create(): re-arms goTo, fades the camera in and runs the entrance. */
export function enter(scene: Phaser.Scene, steps: EntranceStep[], targets: EntranceTargets): number {
  const plan = transitionFor(scene).enter();
  return runEntrance(motionFor(scene), plan, steps, targets);
}

/**
 * MOT-2 (ruling 8) wrap the objects that `build()` adds to `parent` into one Container at `anchor`, children shifted by -anchor,
 * so popIn/slideIn act about the item's centre. Hit zones keep their names and final positions.
 */
export function captureGroup(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, anchor: { x: number; y: number }, build: () => void, name?: string): Phaser.GameObjects.Container {
  const start = parent.length; build();
  const kids = parent.list.slice(start) as unknown as (Phaser.GameObjects.GameObject & { x: number; y: number })[];
  const group = scene.add.container(anchor.x, anchor.y);
  parent.remove(kids);
  for (const k of kids) { k.x -= anchor.x; k.y -= anchor.y; }
  group.add(kids);
  parent.add(group);
  if (name) group.setName(name);
  return group;
}
```
Then add `export * from './transition';` to `src/game/motion/index.ts`.
- [ ] **Step 4:** Re-run `tests/game/transition` -> PASS; run `npm run typecheck` (fix imports if `Balance` is not exported from `../../core`; `motion.ts` already imports it from there).
- [ ] **Step 5: Commit**
```bash
git add src/game/motion/transition.ts src/game/motion/index.ts tests/game/transition.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 transition helper (goTo, enter, runEntrance, captureGroup)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 transition.ts with goTo, enter, entrance runner and group capture`.)

---

### Task 4: Route every menu change through `goTo` (R1, R3, R4, R7, R11, R12, R13)

**Files:** Modify `src/game/scenes/BootScene.ts` (`create`, last line ~99), `HomeScene.ts` (gear callback in `create` ~41, `play` ~87), `LoadoutScene.ts` (`back` ~68), `SettingsScene.ts` (`create` ~35-38, `back` ~55-62), `ResultsScene.ts` (`create` ~33), `HudScene.ts` (`create` end ~101, `leave` ~203, `toResults` ~208), `GameScene.ts` (`create`, end), `ui.ts` (`beginRun` 52-57); Test `tests/game/navGuard.test.ts`; existing `boot.test.ts`, `settingsScene.test.ts`, `hud.test.ts`, `keyboardOverlay.test.ts`, `tests/qa/task8-save-wiring.qa.test.ts` must keep passing.

**Interfaces:** Consumes Task 3 `goTo(scene, key, data, kind, hooks?)`, `enter(scene, steps, targets)`, `bootHoldMs`, `transitionFor`; MOT-0 `motionFor(scene).fadeIn/fadeOut`. Produces: no menu scene calls `scene.start(` directly. Each scene's `create` ends with an `enter(...)` call (empty steps in this task; Tasks 5-7 fill them).

- [ ] **Step 1: Write the failing guard test** `tests/game/navGuard.test.ts`
```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '../../src/game/scenes');
const files = readdirSync(dir).filter(f => f.endsWith('.ts'));
describe('MOT-2-R1 no direct scene.start in menu scenes', () => {
  it('MOT-2-R1 only transition.ts calls scene.start', () => {
    const offenders = files.filter(f => /\bscene\.start\(/.test(readFileSync(join(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('MOT-2-R3 every scene that calls goTo also calls enter in create to re-arm it', () => {
    const missing = files.filter(f => { const s = readFileSync(join(dir, f), 'utf8'); return /\bgoTo\(/.test(s) && !/\benter\(/.test(s); });
    expect(missing).toEqual([]);
  });
});
```
(`beginRun` in `ui.ts` calls `goTo` on the leaving scene; `ui.ts` is exempt from the second check by having no `create`. Adjust the second test to skip `ui.ts`: `files.filter(f => f !== 'ui.ts' && ...)`.)
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/navGuard` -> FAIL (offenders list shows the seven current call sites).
- [ ] **Step 3: Implement.** Add `import { enter, goTo } from '../motion';` (or `'../motion/transition'`) to each scene.
  - `ui.ts` `beginRun` (replace lines 55-56):
```ts
  session.startRun(level, entry, debug);
  goTo(scene, 'Game', undefined, 'start', { after: () => scene.scene.launch('Hud') }); // MOT-2-R11 order: startRun, start Game, launch Hud
```
  - `HomeScene.create` gear callback: `() => { this.synth.play('uiTap'); goTo(this, 'Settings', { returnTo: 'Home' }, 'forward'); }`. `HomeScene.play`: `if (this.session.homeModel().showLoadout) goTo(this, 'Loadout', { level, debug }, 'forward'); else beginRun(this, level, 'home', debug);`. At the very end of `create` (after `this.build();`) add `enter(this, [], {});`.
  - `LoadoutScene.back`: `private back(): void { this.synth.play('uiTap'); goTo(this, 'Home', undefined, 'back'); }`. End of `create` (after the `RESIZE` handler lines): `enter(this, [], {});`.
  - `SettingsScene.back`: replace `if (x.action === 'start') this.scene.start(x.scene);` with `if (x.action === 'start') goTo(this, x.scene, undefined, 'back');`. R4 overlay: in `create` after the veil is created add
    `if (this.veil) { this.veil.setAlpha(0); motionFor(this).fadeIn(this.veil); }` (import `motionFor`); in `back()` replace the `else` branch with
```ts
    else {
      const close = (): void => { this.game.events.emit(SETTINGS_CLOSED); this.scene.stop(); };
      if (this.veil) { motionFor(this).fadeOut(this.veil); this.time.delayedCall(this.fadeMs(), close); } else close();
    }
```
    and add `private fadeMs(): number { const b = this.registry.get('balance') as Balance; return reduceMotion() ? b.juice.reduced.softMs : b.motion.fadeMs; }` (import `reduceMotion` from `../render/palette`; `currentPalette, osDisplay, themeOf` are already imported from there). The full-screen (non-overlay) path ends `create` with `if (!this.entry.overlay) enter(this, [], {});` placed after `this.build();`.
  - `ResultsScene.create`: `const home = (): void => { goTo(this, 'Home', undefined, 'back'); };` and `enter(this, [], {});` as the last line of `create`.
  - `HudScene.leave`: `this.leaving = true; goTo(this, 'Results', undefined, 'quit', { before: () => this.scene.stop('Game') });` `toResults`: `this.overTimer = this.time.delayedCall(delayMs, () => { goTo(this, 'Results', undefined, 'quit', { before: () => this.scene.stop('Game') }); });` (R12: delay unchanged; Quit still passes 0). End of `create` (after `this.refresh(); this.showRunStart();`): `enter(this, [], {});` (R11 camera fade-in; also re-arms `goTo`, needed because the Hud instance is reused).
  - `GameScene.create` (last statement of `create`): `enter(this, [], {});` (R11, same fade as the Hud, so board and HUD appear together; the P0 countdown is untouched).
  - `BootScene.create`: replace the final `void waitForFonts(...)` line with
```ts
    const waitStart = performance.now(); // MOT-2-R7
    void waitForFonts(fontSet, UI_FONT_SPECS, balance.ui.fontLoadTimeoutMs).then(() => {
      const hold = bootHoldMs(performance.now() - waitStart, balance.motion.fadeMs);
      const go = (): void => { goTo(this, next, undefined, 'start'); }; // fade only: Boot has no spatial relation to Home (ruling 1); ArtPreview gets the same fade
      if (hold > 0 && this.time) this.time.delayedCall(hold, go); else go();
    }); // P3-0-R6
```
    (import `bootHoldMs, goTo` from `../motion`; `this.setProgress(1)` already shows the 100% frame at the top of `create`.)
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/navGuard tests/game/boot tests/game/settingsScene tests/game/hud tests/game/keyboardOverlay tests/qa/task8` -> PASS. If an existing fake scene throws on a missing field, give the fake only what `transitionFor` reads: `registry` (Map is fine), optional `cameras`/`input`; `transitionFor` already tolerates their absence, so the usual fix is adding `time: { delayedCall: (_ms: number, fn: () => void) => fn() }` to the Settings overlay fake. Run `npm run typecheck`.
- [ ] **Step 5: Eye-check (browser only, record in `docs/PLAYTEST.md` at Task 8):** `npm run dev`; Boot -> Home fades; Home -> Settings -> Back; Home -> Play -> countdown; die and Results appears; Settings overlay from Pause fades its veil. Confirm no wrong-colour flash and no empty board during the quit fade.
- [ ] **Step 6: Commit**
```bash
git add src/game tests/game
git commit -m "feat(motion): MOT-2 route every menu change through goTo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 goTo fades for all menu navigation, run start/end and Settings overlay`.)

---

### Task 5: Home entrance, stepper chip pop and idle life (R5, R6, R8)

**Files:** Modify `src/game/scenes/HomeScene.ts` (`create` ~33-49, `step` ~76-79, `build` ~91-141, `heroPanel` ~178-201, new `update`); Test: covered by Tasks 2-3 unit tests; scene wiring is eye-checked.

**Interfaces:** Consumes `enter`, `captureGroup`, `HOME_ORDER`, `entranceEndMs`, `breathScale`, `createIdleGate`, `motionFor(scene).pulse/popIn`, `isMotionOff`, `reduceMotion`. Produces fields `private targets: EntranceTargets`, `private entered = false`, `private capy?: Phaser.GameObjects.Image`, `private capyRest = { sx: 1, sy: 1 }`, `private idle: { t0: number; gate: ReturnType<typeof createIdleGate> } | null`, `private stopPulse: (() => void) | null`, `private playBtn?: Phaser.GameObjects.Container`.

- [ ] **Step 1 (no new test file; run the existing suites as the safety net):** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/homeModel tests/game/entranceOrder tests/game/homeIdle` -> PASS before editing.
- [ ] **Step 2: Wire the scene.** In `HomeScene`:
  1. Imports: `import { HOME_ORDER, entranceEndMs } from '../flow/entranceOrder'; import { breathScale, createIdleGate } from '../flow/homeIdle'; import { isMotionOff } from '../flow/debugFlag';` (extend the existing `debugFlag` import) `import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion'; import { reduceMotion } from '../render/palette';`.
  2. Fields (next to `private body?`): the interfaces listed above, with `private entered = false; private targets: EntranceTargets = {};`.
  3. `create`: at the top reset `this.entered = false; this.idle = null; this.stopPulse = null; this.targets = {};`. Keep the gear and logo lines, but capture them: `const gearBtn = roundIconButton(...)` (already returns the Container; keep its callback from Task 4), `const logo1 = logoLine(...)`, `const logo2 = logoLine(...)`; then `this.targets.gear = gearBtn; this.targets.logo1 = logo1; this.targets.logo2 = logo2;`. Replace the end of `create` (`this.build(); enter(this, [], {});` from Task 4) with:
```ts
    this.build();
    this.input.on('pointerdown', () => this.idle?.gate.interact(this.time.now)); // R8 any tap pauses the attention pulse
    this.input.on('gameobjectover', () => this.idle?.gate.interact(this.time.now));
    const n = enter(this, HOME_ORDER, this.targets);
    this.entered = true; // R6 later build() calls (stepper taps) show instantly
    const cfg = (this.registry.get('balance') as Balance).motion;
    if (!reduceMotion() && !isMotionOff(window.location.search)) {
      this.time.delayedCall(entranceEndMs(n, cfg), () => { this.idle = { t0: this.time.now, gate: createIdleGate(cfg, this.time.now) }; });
    }
```
  4. `step`: add `this.idle?.gate.interact(this.time.now);` as the first line (before the existing `this.selected = ...`).
  5. `build`: first lines become `this.stopPulse?.(); this.stopPulse = null; this.body?.destroy(true);` (the pulse is stopped before its target is destroyed). Wrap the hero: replace `this.heroPanel(blk, WIDTH / 2 - ui(H.hero.w) / 2, heroY);` with
```ts
    const hero = captureGroup(this, blk, { x: WIDTH / 2, y: heroY + ui(H.hero.h) / 2 }, () => this.heroPanel(blk, WIDTH / 2 - ui(H.hero.w) / 2, heroY));
    const t: EntranceTargets = { hero };
```
     In the stepper branch, after `blk.add([mid, prev.c, next.c]);` add `t.stepper = [mid, prev.c, next.c]; if (this.entered) motionFor(this).popIn(mid, 0); // R6 confirm the new start-at value`. After `blk.add(play.c);` add `t.play = play.c; this.playBtn = play.c;`. In the chips branch replace `this.chipRow(blk, v, y);` with `t.chips = this.chipRow(blk, v, y);` and make `chipRow` return the containers it adds (in its last loop: `const made: Phaser.GameObjects.Container[] = []; for (const it of items) { const c = it.make(x + it.w / 2) as Phaser.GameObjects.Container; blk.add(c); made.push(c); x += it.w + gap; } return made;` and change its return type to `Phaser.GameObjects.Container[]`). For the hint: `const hint = this.add.text(...).setOrigin(0.5); blk.add(hint); t.hint = hint;`. Finally `Object.assign(this.targets, t);` at the end of `build`.
  6. `heroPanel`: replace the last line with
```ts
    const capy = this.add.image(cc.x, cc.y, capyHeadKey('idle', 'large')).setDisplaySize(ui(C.size), ui(C.size));
    blk.add(capy); this.capy = capy; this.capyRest = { sx: capy.scaleX, sy: capy.scaleY };
```
  7. New method (R8, runs only after the entrance; no tween, spec ruling 4):
```ts
  update(time: number): void {
    const idle = this.idle; if (!idle) return;
    const cfg = (this.registry.get('balance') as Balance).motion;
    if (this.capy) { const k = breathScale(time - idle.t0, cfg); this.capy.setScale(this.capyRest.sx * k.sx, this.capyRest.sy * k.sy); }
    const want = idle.gate.allowed(time);
    if (want && !this.stopPulse && this.playBtn) this.stopPulse = motionFor(this).pulse(this.playBtn);
    else if (!want && this.stopPulse) { this.stopPulse(); this.stopPulse = null; }
  }
```
     (`motionFor(this)` disposes on `shutdown`, which kills the pulse tween; `update` stops with the scene, so no loop outlives Home.)
- [ ] **Step 3:** `npm run typecheck`; `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game` (the Home-related suites) -> PASS.
- [ ] **Step 4: Eye-check (browser only).** Look at: gear pops first, logo lines slide down from the top, hero pops, stepper/Play/chips/hint slide up with a visible 50 ms stagger, total under about 0.6 s; step the checkpoint stepper (only the start-at chip pops, nothing else re-enters); capy breath is calm, not jittery; Play pulse begins about 1.2 s after the entrance, stops on tap and resumes after about 4 s; `?debug=1&motion=off` shows everything at rest at once; reduced motion (Settings toggle) shows a single fade and no idle motion.
- [ ] **Step 5: Commit**
```bash
git add src/game/scenes/HomeScene.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 Home entrance and idle life" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 Home staggered entrance, capy breathing and Play attention pulse`.)

---

### Task 6: Loadout and Settings entrances (R5, R6)

**Files:** Modify `src/game/scenes/LoadoutScene.ts` (`create`, `render` ~71-117), `SettingsScene.ts` (`create`, `build`); no new tests (orders are tested in Task 2).

**Interfaces:** Consumes `enter`, `captureGroup`, `loadoutOrder`, `settingsOrder`, `EntranceTargets`. Produces `private entered = false; private targets: EntranceTargets = {}` on both scenes.

- [ ] **Step 1: LoadoutScene.** Imports: `import { loadoutOrder } from '../flow/entranceOrder'; import { captureGroup, enter, goTo, type EntranceTargets } from '../motion';`. In `create` reset `this.entered = false; this.targets = {};` at the top; capture `const backBtn = roundIconButton(...)` and `const goBtn = pillButton(...)` (it already returns a `Button` whose `.c` is the Container): `this.targets.back = backBtn; this.targets.title = this.title; this.targets.go = goBtn.c;` (`bigLabel(goBtn, ...)` still applies; keep `bigLabel(pillButton(...), ...)` split into the variable first). Replace the Task 4 `enter(this, [], {});` at the end of `create` with:
```ts
    enter(this, loadoutOrder(this.balance.loadout.order.length), this.targets);
    this.entered = true; // R6 pick() and resize re-render instantly
```
  In `render`: reset `const t: EntranceTargets = {};` after `this.body?.destroy(true)`. Wrap the slots panel and both slots: replace the block from `// Slots panel.` through the end of the `view.slots.forEach(...)` with the same code inside `t.slots = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(L.slotsH) / 2 }, () => { ... });` (the closure body is exactly the existing panel and slot code; `y` is not modified inside it). Wrap the chips: `t.chips = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(L.chipsH) / 2 }, () => chips.forEach(...));`. Wrap each card: in `for (const card of view.cards) { ... }` use
```ts
    view.cards.forEach((card, i) => {
      t[`card${i}`] = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(cards.cardH) / 2 }, () => this.skillCard(blk, card, cardX, y, cards.cardH));
      y += ui(cards.cardH + cards.cardGap);
    });
```
  End of `render`: `Object.assign(this.targets, t);`. `enter` runs after the first `render()` (inside `create`), so the targets exist when it runs.
- [ ] **Step 2: SettingsScene.** Imports: `import { settingsOrder } from '../flow/entranceOrder'; import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';`. In `create` (full-screen path only; the overlay keeps the veil fade from Task 4): capture `const backBtn = roundIconButton(...)`, `this.targets = { back: backBtn, title: this.head }`; replace the Task 4 line with
```ts
    if (!this.entry.overlay) { enter(this, settingsOrder(M.rows), this.targets); this.entered = true; }
```
  (`M.rows` is the row count constant already used in `build`; `this.targets` also gets `card`, `row0..`, `theme`, `caption` from `build`.) In `build` (it runs again after `change()`, which must play no entrance: the targets are only registered, `enter` is not called again): reset `const t: EntranceTargets = {};` after `this.body?.destroy(true)`; `t.card = rows;` (the shared card graphics fades with the title); wrap each row's own objects: in `v.rows.forEach((r, i) => {` keep the divider line (`if (i > 0) rows.fillStyle...`) outside, and put everything from `const half = ...` through `blk.add(tap(... 'settings-${r.id}' ...))` inside `t[`row${i}`] = captureGroup(this, blk, { x: WIDTH / 2, y: cy }, () => { ... });`. Wrap the theme card: `t.theme = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(M.themeCardH) / 2 }, () => { ...theme card code from "const T = M.theme" through the end of the (['light','dark'] as const).forEach... });` but keep `tc` (the shared graphics) created inside the closure; caption: `const caption = this.add.text(...).setOrigin(0.5); blk.add(caption); t.caption = caption;`. End: `Object.assign(this.targets, t);`.
- [ ] **Step 3:** `npm run typecheck`; `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/settingsScene tests/game/loadoutEdit tests/game/loadoutView` -> PASS.
- [ ] **Step 4: Eye-check (browser only).** Home -> Play with a checkpoint (Loadout): content slides in from the right, cards enter in list order and later cards all share the 300 ms cap; Back slides from the left; Home -> gear (Settings) slides from the right, rows enter in order; toggling a switch or the theme rebuilds instantly with no re-entrance; Settings opened from Pause shows only the veil fade; Escape and double taps close once.
- [ ] **Step 5: Commit**
```bash
git add src/game/scenes/LoadoutScene.ts src/game/scenes/SettingsScene.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 Loadout and Settings entrances" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 Loadout and Settings staggered entrances`.)

---

### Task 7: Results sequence, count-up and skip (R9, R10)

**Files:** Create `src/game/flow/resultsSeq.ts`; Modify `src/game/scenes/ResultsScene.ts` (`create`, `summaryBlock`, `summaryCard`, `bestChip`, `row`, `banner`, `progress`, `footer`); Test `tests/game/resultsSeq.test.ts`

**Interfaces:**
- Consumes Task 2 `resultsTimeline`, `SeqItem`; Task 3 `captureGroup`; MOT-0 `Motion`, `MotionTarget`, `TextTarget`.
- Produces `interface SeqDeps { motion: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn' | 'pulse' | 'countUp'>; later(ms: number, fn: () => void): { remove(): void }; kill(t: object): void; pulsePeriodMs: number; reduced: boolean; off: boolean }`, `type SeqTargets = Record<string, MotionTarget | undefined>`, `runResultsSequence(d: SeqDeps, timeline: SeqItem[], targets: SeqTargets, score: { text: TextTarget; value: number }): { skip(): void; done(): boolean }`.

- [ ] **Step 1: Write the failing test** `tests/game/resultsSeq.test.ts`
```ts
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
  it('MOT-2-R9 the star pulse stops after exactly two periods', () => {
    const x = mk(); runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 10 });
    x.run(1100); expect(x.timers.some(t => t.live && t.at === 2 * m.pulsePeriodMs)).toBe(true);
    x.run(1100 + 2 * m.pulsePeriodMs + 1); expect(x.calls).toContain('pulseStop');
  });
  it('MOT-2-R10 skip cancels timers, shows the final score and restores every rest transform', () => {
    const x = mk(); const seq = runResultsSequence(x.d, resultsTimeline(parts, m), x.targets, { text: x.text, value: 1234 });
    x.run(300); x.targets.title!.setScale(0.1).setPosition(99, 99).setAlpha(0.3);
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
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/resultsSeq` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/flow/resultsSeq.ts`
```ts
// MOT-2-R9/R10 Results sequence runner (Phaser-free). Plays a resultsTimeline over existing objects; skip() jumps to the rest state.
import type { Motion, MotionTarget, TextTarget } from '../motion/motionCore';
import type { SeqItem } from './entranceOrder';

export interface SeqDeps {
  motion: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn' | 'pulse' | 'countUp'>;
  later(ms: number, fn: () => void): { remove(): void };
  kill(t: object): void; // in-flight tween stop for skip (the one allowed direct tween call, ruling 7)
  pulsePeriodMs: number; reduced: boolean; off: boolean;
}
export type SeqTargets = Record<string, MotionTarget | undefined>;
interface Rest { x: number; y: number; sx: number; sy: number; a: number }

export function runResultsSequence(d: SeqDeps, timeline: SeqItem[], targets: SeqTargets, score: { text: TextTarget; value: number }): { skip(): void; done(): boolean } {
  const final = String(score.value);
  const rests = new Map<string, Rest>(), timers: { remove(): void }[] = [], stops: (() => void)[] = [];
  let finished = false;
  const restore = (): void => {
    for (const [id, r] of rests) { const t = targets[id]!; d.kill(t); t.setScale(r.sx, r.sy); t.setPosition(r.x, r.y); t.setAlpha(r.a); }
  };
  if (d.off) { score.text.setText(final); return { skip: () => {}, done: () => true }; } // R13 rest state, nothing animated
  for (const [id, t] of Object.entries(targets)) if (t) rests.set(id, { x: t.x, y: t.y, sx: t.scaleX, sy: t.scaleY, a: t.alpha });
  if (d.reduced) { // MOT-0-R6 one fade, no stagger, final score at once
    score.text.setText(final);
    for (const t of Object.values(targets)) if (t) { t.setAlpha(0); d.motion.fadeIn(t); }
    return { skip: () => { restore(); }, done: () => true };
  }
  for (const t of Object.values(targets)) t?.setAlpha(0);
  score.text.setText('0');
  const play = (it: SeqItem): void => {
    const t = targets[it.item]; if (!t) return;
    if (it.kind === 'pop') d.motion.popIn(t, 0);
    else if (it.kind === 'slide') d.motion.slideIn(t, 'down', 0); // slides up from below
    else if (it.kind === 'fade') d.motion.fadeIn(t);
    else if (it.kind === 'count') { t.setAlpha(rests.get(it.item)!.a); d.motion.countUp(score.text, 0, score.value); }
    else { // pulse: two periods, then stop (best star on a new best)
      const stop = d.motion.pulse(t); stops.push(stop);
      timers.push(d.later(2 * d.pulsePeriodMs, stop));
    }
  };
  for (const it of timeline) if (targets[it.item]) timers.push(d.later(it.atMs, () => play(it)));
  return {
    skip() {
      if (finished) return; finished = true;
      timers.forEach(t => t.remove()); stops.forEach(s => s());
      restore(); score.text.setText(final); // R10 the score is the exact final integer
    },
    done: () => finished,
  };
}
```
  For `done()`: set `finished = true` when the last timeline item has played (in the `later` callback of the item with the greatest `atMs`: `if (it === last) finished = true` after `play`), so a late tap is a no-op. Add that two-line change in the `for (const it of timeline)` loop (`const last = timeline[timeline.length - 1]`).
- [ ] **Step 4:** Re-run `tests/game/resultsSeq` -> PASS (the pulse-stop timer is registered at pulse time, so its `at` is `2 * pulsePeriodMs` relative to the pulse start; in the test's fake `later` that value is absolute, hence the assertion `t.at === 2 * m.pulsePeriodMs` and `x.run(...)` with a big enough time). Run `npm run typecheck`.
- [ ] **Step 5: Wire `ResultsScene`.** Imports: `import { resultsTimeline } from '../flow/entranceOrder'; import { runResultsSequence, type SeqTargets } from '../flow/resultsSeq'; import { isMotionOff } from '../flow/debugFlag'; import { captureGroup, enter, goTo, motionFor } from '../motion'; import { reduceMotion } from '../render/palette';`. Add `private targets: SeqTargets = {};` and reset it at the top of `create`.
  1. `create`: keep the Task 4 `home` lambda. Capture the title: `this.targets.title = logoLine(...)` (it already returns a Container). `footer(...)` must register `this.targets.home = <roundIconButton return>` and, when drawn, `this.targets.again = b.c` (edit `footer`: `this.targets.home = roundIconButton(...);` and `this.targets.again = b.c;`). Replace the Task 4 final `enter(this, [], {});` with:
```ts
    enter(this, [], {}); // camera fade-in + re-arm goTo (R3); the sequence below is Results' own entrance
    if (s && v) this.playSequence(s.score, v);
```
  2. New method:
```ts
  // MOT-2-R9/R10 the Results sequence, skippable by a tap anywhere (Home / Play again taps still act at once).
  private playSequence(score: number, v: ResultsView): void {
    const cfg = (this.registry.get('balance') as Balance).motion, m = motionFor(this);
    const timeline = resultsTimeline({ newBest: v.bestChip.key === 'results.newBest', energy: v.energySaved !== null, banner: v.checkpointBanner !== null,
      next: v.next !== null, again: this.targets.again !== undefined }, cfg);
    const seq = runResultsSequence({ motion: m, later: (ms, fn) => this.time.delayedCall(ms, fn), kill: t => this.tweens.killTweensOf(t),
      pulsePeriodMs: cfg.pulsePeriodMs, reduced: reduceMotion(), off: isMotionOff(window.location.search) }, timeline, this.targets, { text: this.scoreText!, value: score });
    this.input.on('pointerdown', () => seq.skip());
  }
```
     (add `private scoreText?: Phaser.GameObjects.Text;`; import `Balance` is already there. `tweens.killTweensOf` is the single allowed direct tween call, see Global Constraints.)
  3. `summaryCard`: the card and its text must stay separately addressable. Replace `blk.add(card(this, x0, y0, C.w, R.cardH, C.r));` with `this.targets.card = captureGroup(this, blk, { x: WIDTH / 2, y: y0 + ui(R.cardH) / 2 }, () => blk.add(card(this, x0, y0, C.w, R.cardH, C.r)));`. After the head image is created (`blk.add(this.add.image(...))`) assign it: `const head = this.add.image(...).setDisplaySize(...); blk.add(head); this.targets.head = head;`. After `blk.add(line.setName('results-headline'));` add `this.targets.headline = line;` and after the score label `this.targets.scoreLabel = <that text>;` (keep the `setName` calls). Score: `const score = text(cx, C.scoreY, String(v.score), ...).setName('results-score'); blk.add(score); this.targets.score = score; this.scoreText = score;`. Stat tiles: inside `v.stats.forEach((st, i) => {` wrap the three `blk.add(...)` calls: `this.targets[`stat${i}`] = captureGroup(this, blk, { x: tx + ui(tw) / 2, y: ty + ui(C.tileH) / 2 }, () => { ...the three existing blk.add lines... });`.
  4. `bestChip`: replace `blk.add([bg, star, tx]).setName('results-best');` with `blk.setName('results-best'); // kept on the block as before (QA name)` and build the chip as a group: `this.targets.best = captureGroup(this, blk, { x: cx, y: cy }, () => blk.add([bg, star, tx]), 'results-best-chip'); this.targets.bestStar = star;` (the star graphics is a child of that group; its rest is captured by `runResultsSequence`/`pulse` at call time, in group-local coordinates).
  5. `summaryBlock` blocks: `row(...)` -> `this.targets.energy = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(R.energyH) / 2 }, () => this.row(blk, x0, y, 'bolt', ...));`; `banner(...)` -> `this.targets.banner = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(R.bannerH) / 2 }, () => this.banner(blk, x0, y, v.checkpointBanner.level));`; `progress(...)` -> `this.targets.next = captureGroup(this, blk, { x: WIDTH / 2, y: y + ui(R.progressH) / 2 }, () => this.progress(blk, x0, y, v.next));`. The marbles row stays hidden (P4, D8): no `marbles` target exists, the timeline slot is skipped.
- [ ] **Step 6:** `npm run typecheck`; `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/resultsSeq tests/game/resultsView` -> PASS.
- [ ] **Step 7: Eye-check (browser only).** Die in a run: title pops, capy pops, card pops, score counts up over about 0.9 s and ends on the exact number, tiles pop with a 50 ms stagger, a new best pops with a star pulse (two beats) at the end of the count, a plain best fades in earlier, energy/banner/progress slide up, Home then Play again pop last, all done by about 1.5 s. Tap anywhere mid-sequence: everything jumps to rest with the final score; Home and Play again work from frame 0. `?debug=1&motion=off`: final frame at once. Check the four Results states (normal, new best, checkpoint unlocked, first run).
- [ ] **Step 8: Commit**
```bash
git add src/game/flow/resultsSeq.ts src/game/scenes/ResultsScene.ts tests/game/resultsSeq.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-2 Results sequence with count-up and tap-to-skip" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(CHANGELOG: `- feat(motion): MOT-2 Results sequence (<= 1500 ms), count-up, best-chip pulse, skip on tap`.)

---

### Task 8: Docs, full verification and merge into `version/v0.3`

**Files:** Modify `docs/CODEMAP.md`, `docs/README.md` (only if it lists specs or plans by name), `docs/DECISIONS.md`, `docs/PLAYTEST.md`, `docs/STATUS.md`, `CHANGELOG.md`.

- [ ] **Step 1: CODEMAP.** In the `src/game/motion/` row (it currently lists `curves.ts`, `motionCore.ts`, `motion.ts`, `index.ts`) add `transition.ts` (`goTo`, `enter`, `runEntrance`, `captureGroup`, pure `createTransition`) and append `tests/game/transition.test.ts` to its tests cell. Add one row each, in the same table format as the neighbouring `src/game/flow/*` rows: `src/game/flow/entranceOrder.ts` (entrance orders, `resultsTimeline`, `entranceEndMs`; MOT-2-R5/R9; tests/game/entranceOrder.test.ts), `src/game/flow/resultsSeq.ts` (Results runner; MOT-2-R9/R10; tests/game/resultsSeq.test.ts), `src/game/flow/homeIdle.ts` (breath curve, idle gate; MOT-2-R8; tests/game/homeIdle.test.ts). Add `isMotionOff` to the existing `debugFlag.ts` row and `tests/game/navGuard.test.ts` to the scenes row. In `docs/README.md` add this plan and the MOT-2 spec to the plans/specs list only if MOT-0's plan and spec are listed there.
- [ ] **Step 2: DECISIONS.** Append one dated entry (2026-11-10, "MOT-2 menu flow") with these points: (a) `goTo` takes optional `before`/`after` hooks so Hud can stop Game at the end of the fade and `beginRun` can launch Hud after `start('Game')`; (b) Boot->Home uses kind `'start'` (fade only), not `'forward'`; (c) Game and Hud both run the camera `fadeIn` through `enter()` instead of a Hud-layer alpha tween (R11); (d) Home breath is computed in `update` from `pulseScale` (no tween API for an anti-phase squash); (e) capy head and card use `popIn` for the "drop" (Back.easeOut); (f) `captureGroup` nests QA-named objects one container level deeper (names unchanged); (g) the Results skip uses `tweens.killTweensOf` and local rest snapshots because `Motion` has no snap call. Keep it under 15 lines.
- [ ] **Step 3: Full verification** (sequential):
```bash
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
git grep -n "scene\.tweens\.add\|\.start('" -- src/game/scenes src/game/flow src/game/motion/transition.ts
```
  Expected: all tests PASS, typecheck clean, and the grep prints nothing for `tweens.add` and no `scene.start(` outside `transition.ts` (the `navGuard` test enforces the second).
- [ ] **Step 4: Browser verification and PLAYTEST record** (`npm run dev`, light mode; open the console and confirm no errors). Record one entry in `docs/PLAYTEST.md` (latest-entry-only convention) listing, with pass/fail: slide directions (Home->Loadout/Settings from the right, back from the left, run end from below); scene change feels <= 360 ms; Home entrance order and stagger; breath calm; Play pulse timing and pause on tap; Loadout with a long list; Settings overlay from Pause (veil fade only); Results sequence <= 1.5 s, count-up exactness, skip on tap; reduced motion (single fade, no idle, no count-up); `?debug=1&level=N`, `?debug=1&artPreview=1`, `?debug=1&motion=off` all still work; 60 fps on a phone; no wrong-colour flash during fades. Items that fail go to a follow-up, not silent fixes.
- [ ] **Step 5: STATUS and CHANGELOG.** Rewrite `docs/STATUS.md` (Now / Next / Blockers / Last session, <= 60 lines): MOT-2 merged, next MOT-3. CHANGELOG: `- docs(motion): MOT-2 codemap, decisions and playtest record`.
- [ ] **Step 6: Commit and merge** (no push):
```bash
git add docs CHANGELOG.md
git commit -m "docs: MOT-2 codemap, decisions, playtest and status" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git checkout version/v0.3
git merge --no-ff feat/motion-2-menu-flow -m "Merge branch 'feat/motion-2-menu-flow' into version/v0.3"
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
node .gitnexus/run.cjs analyze --index-only --workers 2
```
  (The last command runs in the background; do not block on it. Run the post-merge test and typecheck before reporting done.)

---

## Self-Review

**1. Spec coverage**
- R1 `goTo` + grep-testable rule: Tasks 3, 4 (`navGuard`). R2 style/direction/360 ms: Task 3 `transitionPlan` tests. R3 input lock, pending guard, reset in create: Task 3 tests, Task 4 (`enter` in every `create`, incl. Hud and Game which are reused instances). R4 overlay veil: Task 4 (Settings). R5 stagger helper and order lists: Tasks 2-3. R6 rebuild safety: Tasks 5-6 (`entered` flag, stepper chip `popIn`, Settings/Loadout rebuilds). R7 Boot handoff: Task 3 `bootHoldMs`, Task 4 Boot. R8 Home idle: Tasks 2, 5. R9 Results sequence: Tasks 2, 7. R10 skip/exact score/footer interactive from frame 0: Task 7. R11 run start: Task 4 (`beginRun`, Game and Hud fade). R12 run end: Task 4 (`leave`, `toResults`, delay unchanged). R13 deep links, `motion=off`, unchanged names/payloads: Tasks 1, 3, 4 and the Global Constraints name list; verified in Task 8 Step 4.
- Section 4 new balance keys: already in MOT-0 (`idleBreathAmp`, `idleStartMs`, `idlePauseMs`, `resultsSeqMs` exist in `config/balance.json`, `MotionBalance`, schema and validator, with a test in `tests/core/balanceMotion.test.ts`), so no balance task. Section 5 reduced motion: `transitionPlan`, `runEntrance`, `runResultsSequence` tests. Section 6 performance: group-level targets only (Home 8 steps, Results ~16 short tweens staggered over time, inside `maxTweens` 40; `liveCount` in Results can briefly exceed 10 only if all items overlap, the budget snap-to-final in `play()` is the safety net). Section 7: all listed unit tests exist (`entranceOrder`, `resultsTimeline`, stagger cap for 12 cards, `goTo` fake-scene tests, `motion=off` parsing); the "adapter tests with the recording `tweens` fake" are covered by `resultsSeq` fakes plus MOT-0's own adapter tests. Section 10 exit criteria: Task 8.
- Deviations from the spec text are all listed under "Rulings" (1-8) and in DECISIONS (Task 8 Step 2).

**2. Placeholder scan:** no TBD/TODO; every code step carries real code. Scene tasks (5-7) give exact function names and line areas and the exact replacement snippets; the repetitive `captureGroup` wrapping of existing code blocks is described by "the closure body is exactly the existing code" with the wrapper call shown, since the inner code is unchanged and already in the repo.

**3. Type consistency:** `NavKind`, `TransitionPlan { fadeMs, slide, stagger, off }`, `TransitionDeps`, `GoHooks { before?, after? }`, `EntranceTargets`, `Dir`, `EntranceStep { id, motion, from? }`, `SeqItem { item, atMs, kind }`, `SeqDeps`, `SeqTargets` are each defined once (Tasks 2, 3, 7) and used with the same names later. `enter(scene, steps, targets)` (Task 3) is called with `(this, [], {})` in Task 4 and with real orders in Tasks 5-7. `goTo(scene, key, data, kind, hooks?)` is used identically everywhere. `resultsTimeline` ids (`title, head, card, headline, scoreLabel, score, stat0-2, best, bestStar, energy, marbles, banner, next, home, again`) match the `this.targets` keys assigned in Task 7.

---

Plan complete and saved to `docs/superpowers/plans/2026-11-10-motion-2-menu-flow.md`. Two execution options: **1. Subagent-Driven (recommended)** or **2. Inline Execution** (executing-plans). Start only after MOT-1 is merged into `version/v0.3`.
