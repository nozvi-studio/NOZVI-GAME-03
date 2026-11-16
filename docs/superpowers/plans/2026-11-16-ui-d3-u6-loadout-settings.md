# UI D3 U6 — Loadout and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Loadout and Settings on the D3 boards (D3-R19, D3-R21 selected state), draw one icon set in one stroke style, delete the dead D2 tokens and the dark theme, and close four U5 follow-ups (lost "incoming" strip card, `enqueue` unit test, dead `head` timeline item, hardcoded Results literals).

**Architecture:** Same split as U3..U5. Every layout or content rule is a pure function in a model file (no Phaser, unit tested): new `flow/loadoutLayout.ts`, `flow/settingsLayout.ts`, `ui/skin/ringSpec.ts`, `hud/bannerQueue.ts`, extended `flow/loadoutView.ts` and `flow/settingsView.ts`. Phaser scenes only place skin images (`panel`, `skill`, `bar`, `round`, `chip`) at the rects the models return, keeping the MOT-1 press/pop/slide feedback and MOT-2 entrance targets. The selection ring is one cached texture per shape, drawn under the face, which is lifted by 2 px.

**Tech Stack:** TypeScript strict, Phaser 3, Vitest (Windows: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`), typecheck `npm run typecheck`, headless screenshots with `node tools/qa/shot.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` rules D3-R1 (§4 tokens, "no parallel dead tokens at the end of U6"), D3-R2, D3-R3 (one theme), D3-R19, D3-R21; roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` section "U6 — Loadout and Settings". Visual authority: `docs/design/mockups/d3/boards.html` sections `Loadout`, `Settings`, `States` (+ `d3.css` classes `.panel`, `.skill`, `.toggle`, `.row`, `.tile`; board = 360 mock px wide, `d3()`/`d3m()` map mock px to canvas px) and `docs/design/mockups/d3/png/{Loadout,Settings,States}-360.png`.

## Global Constraints
- Repository text in English. Requirement IDs (`D3-R19`, `D3-R21`, `D3-R1`, `U6-Rn` for the rulings below, `U5-Rn` for follow-ups) in test names and one comment at each main implementing function.
- **Light theme only** (the dark theme is parked, STATUS 2026-11-10; D3-R3). After U6 nothing reads `prefers-color-scheme`-derived theme data; `boardTheme` stays in the save envelope and is ignored (no save version bump).
- No magic numbers in logic: geometry in mock px lives in `MENU.loadout.d3` / `MENU.settings.d3` (`src/game/ui/menuMetrics.ts`, new blocks); colours only from `TOKENS.d3` (`src/game/uiTokens.ts`); timings from `config/balance.json` (`motion.toggleSlideMs`, `ui.hud.bannerQueueMax`, existing). No new balance keys are expected.
- Kept behaviour (tests stay green): MEC-007 edit rules in `loadoutEdit.ts`; MOT-1 feedback (press scale, pick pop `badgeIsNew`, reject shake `isRejected`, toggle slide `slideFrom`/`runSlide`), MOT-2 entrance orders (`loadoutOrder`, `settingsOrder` target keys `back,title,slots,chips,card0..,go` / `back,title,card,row0..,caption`), Settings overlay contract (`{overlay, returnTo}`, `SETTINGS_CLOSED`), Escape/Enter/Space keys, QA object names (`loadout-back`, `loadout-title`, `loadout-go`, `loadout-slot1/2`, `loadout-card-<id>`, `settings-back`, `settings-<id>`), MOT-2 Results cap 1500 ms.
- No change to `src/core/`, `src/meta/`, gameplay numbers, or player-facing strings except removing `settings.theme*`, `settings.light`, `settings.dark` (Task 7).
- Branch `feat/u6-loadout-settings` from `version/v0.3`; tasks commit on it; merge back with `git merge --no-ff` after full `npm test` then `npm run typecheck` (sequential). Each commit adds one line under `## [Unreleased]` in `CHANGELOG.md`.
- Before editing a symbol run GitNexus `impact` (AGENTS §2c); refresh the index in the background after the merge.

## Rulings (lead technical/visual; the boards are ambiguous or inconsistent here)
- **U6-R1 One icon stroke.** One token `TOKENS.d3.shape.iconStroke = 2.6` (24-unit grid, spec D3-R19 "2.6 px rounded strokes") is the stroke of every outlined icon in `ui/icons.ts` (Graphics, `w = iconStroke * size / 24`) and `hud/hudIcons.ts` (SVG `stroke-width`, was 2.4/2.6 mixed). Solid-shape icons stay solid. A new `check` icon (board pick chip) joins `ICON_IDS`.
- **U6-R2 Selection ring.** `ui/skin/ringSpec.ts` gives `ringRecipe(w, h, r, lip, unit)`: a filled rounded shape of colour `TOKENS.d3.logo.mango` (#FFD93B, the board's `--logo-mango`) that is `selectedRing` (4 px) larger than face+lip on every side, painted by `paintRing`, cached by `ringTexture`. The view draws it under the face and lifts face and lip by `selectedLift` (2 px). It is a separate texture, not a `SkinState`, so the existing skin key count does not double (U7 audit <= 120 keys).
- **U6-R3 Slot and disc tones.** Tone follows the skill, like the HUD: `slowmo`, `shield` = `skillA` (violet); `tailSnip`, `mangoRain` = `skillB` (orange); empty slot, locked card disc = `off`. The board paints slot 1 violet and slot 2 orange with Slow-mo and Tail Snip, which this table reproduces. Table `SKILL_TONE` lives in `flow/loadoutView.ts`.
- **U6-R4 Start chips (C1).** The board shows no "Start at L{n}" / energy chips, but the information is useful. They stay as light `chip`s between slots and cards only when the canvas is tall (`hm >= MENU.loadout.d3.chipsMinH` = 700 mock px) and are dropped on the short board so it matches exactly. The player has just chosen the start level on Home, so nothing is lost.
- **U6-R5 Tall boards.** Fixed anchors are the 360x640 board (back 12/12, title top 16, slots top 74, cards top 190 gap 9, Go top = hm - 82). Extra height (up to 800 mock px) goes to the card block: first half to a lower cards top (capped `topExtraMax`), the rest to the gaps (capped `gapExtraMax`); the Go pill stays pinned to the bottom. Never overlapping, tested at hm 640, 779, 800.
- **U6-R6 Settings caption.** The board puts the caption at top 384, which overlaps the panel (84 + 4 rows x 76 + padding + 3 dividers ends at about 404). The caption sits 14 mock px under the real panel bottom. Panel x 14, y 84, w 332; row 76; divider 2; panel padding 4.
- **U6-R7 Toggle.** Track = `bar` skin 60x34 in tone `primary` (on) / `off` (off); knob = 34 px `round` skin, tone `light`, same in both states, centred vertically, travelling +-`(trackW - knob) / 2`, with the skin's own lip as the 3 px drop of the board. MOT-1 slide is kept: knob x uses `knobX(on, p, travel)` and the track cross-fades on/off images with `trackAlpha(fromOn, on, p)` instead of the old colour lerp. Pressed/hover feedback stays `kind: 'switch'` on the knob.
- **U6-R8 Overlay background.** Settings as an overlay over a paused run uses the same `screenBackground(scene, biome 0, dim)` image as the full screen (interactive, swallows taps, MOT-2-R4 fade) instead of the old theme veil rectangle; one look in both modes.
- **U6-R9 Locked card.** Locked skill card = panel at alpha 0.85, `off` disc with the `lock` icon, "Unlocks at L{n}" in the hint colour; no cost chip, no pick chip (board `saturate(.4)` is approximated by the `off` tone, canvas has no filter).
- **U6-R10 Token guard scope.** The guard test flattens every `TOKENS` group except the `d3` sub-trees `bg`, `board`, `tone`, `biomes`, `outline`, `outlineStorm`, `snake` (their keys are read as whole objects, covered by D3-R2/R4/R5 tests) and requires each remaining `group.key` to be read somewhere in `src/` outside `uiTokens.ts`. Unused keys fail with their names; no allow-list.
- **U6-R11 Banner queue is a pure model.** `hud/bannerQueue.ts` holds the queue rules (`BannerQueueState`, `enqueueBanners`, `startBanners`, `advanceBanners`); `BannerLayer` keeps timers and drawing. `show()` keeps reset semantics for level-up queues; run start uses `enqueueAll()` which appends.

## File Structure
- Create `src/game/hud/bannerQueue.ts` — pure queue rules (Task 1).
- Modify `src/game/hud/BannerLayer.ts`, `src/game/scenes/HudScene.ts:132-135` — use the model, `flushRunStart` appends (Task 1).
- Modify `src/game/flow/entranceOrder.ts`, `src/game/scenes/ResultsScene.ts`, `src/game/ui/menuMetrics.ts`, `src/game/uiTokens.ts` — drop `head`, literals to tokens (Task 2).
- Modify `src/game/ui/icons.ts`, `src/game/hud/hudIcons.ts` — one stroke (Task 3).
- Create `src/game/ui/skin/ringSpec.ts`; modify `skinPaint.ts` (export `shape`, add `paintRing`), `skinTextures.ts` (`ringTexture`), `skin/index.ts` (Task 4).
- Create `src/game/flow/loadoutLayout.ts`; modify `src/game/flow/loadoutView.ts`, `menuMetrics.ts` (Task 5).
- Modify `src/game/scenes/LoadoutScene.ts` (Task 6).
- Create `src/game/flow/settingsLayout.ts`; modify `src/game/flow/settingsView.ts`, `src/game/scenes/SettingsScene.ts`, `src/game/text.ts` (Task 7).
- Modify `src/game/uiTokens.ts`, `src/game/render/palette.ts`, `src/game/ui/menuLayout.ts`, `src/game/ui/menuWidgets.ts` (`bgCream`), tests that pin D2 values (Task 8).
- Tests: new `tests/game/bannerQueue.test.ts`, `resultsLiterals.test.ts`, `iconStyle.test.ts`, `ringSpec.test.ts`, `loadoutLayout.test.ts`, `settingsLayout.test.ts`, `tokenGuard.test.ts`; modified `hudBanners.test.ts`, `entranceOrder.test.ts`, `resultsSeq.test.ts`, `icons.test.ts`, `hudIcons.test.ts`, `loadoutView.test.ts`, `settingsView.test.ts`, `uiTokens.test.ts`, `menuTokens.test.ts`, `hudTokens.test.ts`, `uiTheme.test.ts` (deleted), `effectsCaps.test.ts`, `hudViews.test.ts`, `menuLayout.test.ts`, `twoHeights.test.ts`.
- Docs: `CHANGELOG.md`, `docs/CODEMAP.md`, `docs/design/UI-MOCKUPS.md`, `docs/PLAYTEST.md`, `docs/DECISIONS.md`, `docs/STATUS.md`.

---

### Task 1: U5 follow-up A/B — "incoming" card survives run start; `enqueue` rules tested

Root cause (verified by reading): `HudScene.onFlow` case `'go'` calls `flushRunStart()` (`HudScene.ts:132`), which calls `this.banners.show(...)`. `BannerLayer.show` begins with `reset()` (`BannerLayer.ts`, `show(queue) { this.reset(); ... }`), clearing the queue and the card on screen. A hazard "incoming" strip card enqueued by `HudScene.ts:181` (`this.banners.enqueue({kind:'incoming',...})`) in the same frame or just before `go` is dropped, against U5-R2 ("enqueue must never reset a running queue"). `enqueue` itself has no unit test because the rules live inside a Phaser class.

**Files:**
- Create: `src/game/hud/bannerQueue.ts`
- Modify: `src/game/hud/BannerLayer.ts` (`show`, `enqueue`, `next`, `reset`, new `enqueueAll`)
- Modify: `src/game/scenes/HudScene.ts:132-135`
- Test: `tests/game/bannerQueue.test.ts` (new)

**Interfaces:**
- Produces:

```ts
import type { BannerSpec } from './banners';
export interface BannerQueueState { shown: BannerSpec | null; waiting: readonly BannerSpec[] }
export const IDLE_BANNERS: BannerQueueState;
/** Replace everything (level-up semantics): the first spec becomes `shown`, the rest wait; `max` caps shown + waiting. */
export function startBanners(specs: readonly BannerSpec[], max: number): BannerQueueState;
/** Append (U5-R2): a running queue keeps `shown` and order; an idle one starts. The card on screen counts toward `max`; a full queue drops the new specs. */
export function enqueueBanners(q: BannerQueueState, specs: readonly BannerSpec[], max: number): BannerQueueState;
/** The card expired: next waiting spec becomes shown, or idle. */
export function advanceBanners(q: BannerQueueState): BannerQueueState;
```

- [ ] **Step 1: Write the failing tests** (`tests/game/bannerQueue.test.ts`):

```ts
import { expect, it } from 'vitest';
import type { BannerSpec } from '../../src/game/hud/banners';
import { advanceBanners, enqueueBanners, IDLE_BANNERS, startBanners } from '../../src/game/hud/bannerQueue';

const lv = (n: number): BannerSpec => ({ kind: 'levelUp', title: `Level ${n}`, subtitle: 'Fresh start!', chip: null });
const inc: BannerSpec = { kind: 'incoming', text: 'Fence incoming' };
const ch: BannerSpec = { kind: 'challenge', title: 'Challenge: Fence field!' };

it('U5-R2 enqueue on an idle strip starts the card', () => {
  expect(enqueueBanners(IDLE_BANNERS, [inc], 3)).toEqual({ shown: inc, waiting: [] });
});
it('U5-R2 enqueue never resets a running queue: shown stays, order kept', () => {
  const run = startBanners([lv(4), ch], 4);
  const q = enqueueBanners(run, [inc], 4);
  expect(q.shown).toBe(run.shown); expect(q.waiting).toEqual([ch, inc]);
});
it('U5-R2 the card on screen counts toward bannerQueueMax; a full queue drops the new card', () => {
  const q = startBanners([lv(4), ch], 2);
  expect(enqueueBanners(q, [inc], 2)).toEqual(q);
});
it('U5-R2 run-start banners appended behind a running incoming card keep it (regression: flushRunStart used show())', () => {
  const running = enqueueBanners(IDLE_BANNERS, [inc], 4);
  const q = enqueueBanners(running, [ch], 4);
  expect(q.shown).toEqual(inc); expect(q.waiting).toEqual([ch]);
});
it('P3b2-R10 startBanners caps the queue and advance walks it in order, then idles', () => {
  let q = startBanners([lv(4), ch, inc], 2);
  expect(q.shown).toEqual(lv(4)); expect(q.waiting).toEqual([ch]);
  q = advanceBanners(q); expect(q.shown).toEqual(ch);
  q = advanceBanners(q); expect(q).toEqual(IDLE_BANNERS);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/game/bannerQueue.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL, "Failed to resolve import ../../src/game/hud/bannerQueue".

- [ ] **Step 3: Implement the model** (`src/game/hud/bannerQueue.ts`):

```ts
import type { BannerSpec } from './banners';
// U5-R2 / U6-R11 pure banner queue rules; BannerLayer owns timers and drawing.
export interface BannerQueueState { shown: BannerSpec | null; waiting: readonly BannerSpec[] }
export const IDLE_BANNERS: BannerQueueState = { shown: null, waiting: [] };
export function startBanners(specs: readonly BannerSpec[], max: number): BannerQueueState {
  const all = specs.slice(0, Math.max(0, max));
  return all.length === 0 ? IDLE_BANNERS : { shown: all[0]!, waiting: all.slice(1) };
}
/** U5-R2 append; never resets a running queue. */
export function enqueueBanners(q: BannerQueueState, specs: readonly BannerSpec[], max: number): BannerQueueState {
  if (q.shown === null) return startBanners(specs, max);
  const room = Math.max(0, max - 1 - q.waiting.length);
  return room === 0 ? q : { shown: q.shown, waiting: [...q.waiting, ...specs.slice(0, room)] };
}
export function advanceBanners(q: BannerQueueState): BannerQueueState {
  return q.waiting.length === 0 ? IDLE_BANNERS : { shown: q.waiting[0]!, waiting: q.waiting.slice(1) };
}
```

- [ ] **Step 4: Wire `BannerLayer`.** Replace the `queue: BannerSpec[]` field by `private q: BannerQueueState = IDLE_BANNERS`; `bannerMax = () => this.b.ui.hud.bannerQueueMax`. New bodies:

```ts
show(queue: readonly BannerSpec[]): void { this.reset(); this.q = startBanners(queue, this.bannerMax()); this.present(); }
/** U5-R2: one card appended, a running queue is never reset. */
enqueue(spec: BannerSpec): void { this.enqueueAll([spec]); }
/** U6-R11: run-start banners append behind whatever is running. */
enqueueAll(specs: readonly BannerSpec[]): void {
  const wasIdle = this.q.shown === null; this.q = enqueueBanners(this.q, specs, this.bannerMax());
  if (wasIdle) this.present();
}
private present(): void {
  const spec = this.q.shown;
  if (!spec) { this.clear(); this.root.setVisible(false); return; }
  this.clear(); this.render(spec); this.root.setVisible(true); this.enterMotion();
  this.cardTimer = this.scene.time.delayedCall(this.b.ui.bannerMs, () => { this.q = advanceBanners(this.q); this.present(); });
}
```
In `reset()` replace `this.queue = [];` with `this.q = IDLE_BANNERS;`; delete the old `next()`.

- [ ] **Step 5: Fix the call site** (`HudScene.ts:132`):

```ts
private flushRunStart(): void {
  if (this.startBanner.length) this.banners.enqueueAll(this.startBanner.map(title => ({ kind: 'challenge' as const, title })));
  this.startBanner = [];
}
```

- [ ] **Step 6: Run** `npx vitest run tests/game/bannerQueue.test.ts tests/game/hudBanners.test.ts tests/game/hudViews.test.ts --configLoader native --pool threads --maxWorkers 2` and `npm run typecheck`. Expected: PASS (existing `BannerLayer` tests in hudViews keep their names).
- [ ] **Step 7: Commit**

```bash
git add src/game/hud/bannerQueue.ts src/game/hud/BannerLayer.ts src/game/scenes/HudScene.ts tests/game/bannerQueue.test.ts CHANGELOG.md
git commit -m "fix(hud): run-start banners append, incoming card no longer dropped (U5-R2)"
```

### Task 2: U5 follow-up C/D — drop the dead `head` item, Results literals to tokens/balance

Findings: `RESULTS_AT.head` and the `{ item: 'head', ... }` timeline step in `src/game/flow/entranceOrder.ts:32,39` have no target since U5-R4 (`ResultsScene` no longer sets `targets.head`); `resultsSeq` skips it. Literals in `src/game/scenes/ResultsScene.ts`: `NEXT_CHIP_CLEAR_W = 84` (line 25), `NEXT_ICON = '#F5A400'` (line 26), star offset `- 4` and outline `d3(2)` in `best()`, and `TOKENS.accent.orange` passed to `progressBar` in `row()` (a D2 token that Task 8 deletes; `progressBar` only distinguishes energy vs. anything else -> mango, so the value never mattered).

**Files:**
- Modify: `src/game/flow/entranceOrder.ts:32-41`
- Modify: `src/game/scenes/ResultsScene.ts:25-26,~110,~118,~137`
- Modify: `src/game/ui/menuMetrics.ts` (`results` scene metrics block), `src/game/uiTokens.ts` (`d3.results`)
- Test: `tests/game/entranceOrder.test.ts:41`, `tests/game/resultsSeq.test.ts:19,103-110`, new `tests/game/resultsLiterals.test.ts`

**Interfaces:** Produces `TOKENS.d3.results = { energyIcon: '#22B8E6', nextIcon: '#F5A400' }`; `MENU.results` gains `nextChipClearW: 84, bestStarDx: -4, bestStarLine: 2`.

- [ ] **Step 1: Failing tests.** In `tests/game/entranceOrder.test.ts` replace `expect(at(tl, 'head')).toBe(80);` with `expect(tl.some(x => x.item === 'head')).toBe(false); // U5-R4 no head target` (keep the other expectations on that line). In `tests/game/resultsSeq.test.ts` remove `'head'` from the targets list on line 19 and replace the U5-R4 test (lines 103-110) with:

```ts
it('U5-R4 sequence has no head item and keeps the 1500 ms cap', () => {
  const x = mk();
  const tl = resultsTimeline(parts, m);
  expect(tl.some(i => i.item === 'head')).toBe(false);
  const seq = runResultsSequence(x.d, tl, x.targets, { text: x.text, value: 99 });
  x.run(m.resultsSeqMs);
  expect(m.resultsSeqMs).toBeLessThanOrEqual(1500);
  expect(seq.done()).toBe(true);
});
```

New `tests/game/resultsLiterals.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MENU } from '../../src/game/ui/menuMetrics';
import { TOKENS } from '../../src/game/uiTokens';

const src = readFileSync('src/game/scenes/ResultsScene.ts', 'utf8');
it('D3-R1 ResultsScene has no hex colour literal and no D2 token', () => {
  expect(src).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
  expect(src).not.toMatch(/TOKENS\.(accent|surface|green|sky)\./);
});
it('D3-R1 ResultsScene has no local numeric constants (metrics live in MENU.results)', () => {
  expect(src).not.toMatch(/^const [A-Z_]+ = \d+/m);
});
it('D3-R1 results metrics and colours exist', () => {
  expect(MENU.results.nextChipClearW).toBe(84);
  expect(TOKENS.d3.results.nextIcon).toBe('#F5A400');
  expect(TOKENS.d3.results.energyIcon).toBe(TOKENS.d3.tone.energy.face[1]);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/game/entranceOrder.test.ts tests/game/resultsSeq.test.ts tests/game/resultsLiterals.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL (head still present, literals present, `nextChipClearW` undefined).
- [ ] **Step 3: Implement.** `entranceOrder.ts`: `export const RESULTS_AT = { title: 0, card: 120, score: 200, tiles: 400, plainBest: 600, blocks: 700 } as const;` and delete the `head` line of `resultsTimeline`. `uiTokens.ts` inside `d3`: add `results: { energyIcon: '#22B8E6', nextIcon: '#F5A400' },` (`energyIcon` equals `tone.energy.face[1]`). `menuMetrics.ts` in the `results` scene-only block add `nextChipClearW: 84, bestStarDx: -4, bestStarLine: 2,`. `ResultsScene.ts`: delete the two consts (lines 25-26) and use

```ts
const ENERGY_ICON = D.results.energyIcon, NEXT_ICON = D.results.nextIcon;
```
`row()`: `const cw = r.requiresClear ? M.nextChipClearW : M.nextChipW`; `progressBar(this, ..., TOKENS.d3.tone.mango.face[1])` in place of `TOKENS.accent.orange`. `best()`: `d3(M.padX / 2 + M.bestIcon / 2 + M.bestStarDx)` and `.lineStyle(d3(M.bestStarLine), ...)`.
- [ ] **Step 4: Run** the same command plus `npx vitest run tests/game/resultsView.test.ts tests/game/resultsLayout.test.ts --configLoader native --pool threads --maxWorkers 2` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(results): drop dead head item, literals to tokens and MENU (U5 follow-up)` with a CHANGELOG line.

### Task 3: One icon set, one stroke (D3-R19, U6-R1)

**Files:**
- Modify: `src/game/uiTokens.ts` (`d3.shape.iconStroke`), `src/game/ui/icons.ts`, `src/game/hud/hudIcons.ts`
- Test: new `tests/game/iconStyle.test.ts`; update `tests/game/icons.test.ts` id list

**Interfaces:** Produces `TOKENS.d3.shape.iconStroke: 2.6`; `ICON_IDS` gains `'check'` at the end; `hudIconSvg` line icons all carry `stroke-width="2.6"`.

- [ ] **Step 1: Failing test** (`tests/game/iconStyle.test.ts`):

```ts
import { expect, it, vi } from 'vitest';
import { hudIconSvg, ICON_TONES, type IconName } from '../../src/game/hud/hudIcons';
import { drawIcon, ICON_IDS } from '../../src/game/ui/icons';
import { TOKENS } from '../../src/game/uiTokens';

const S = TOKENS.d3.shape.iconStroke;
it('D3-R19 every menu icon draws its outline with the shared stroke width', () => {
  for (const id of ICON_IDS) {
    const widths: number[] = [], g: Record<string, unknown> = {};
    for (const k of ['fillStyle', 'fillCircle', 'strokeCircle', 'fillRoundedRect', 'fillTriangle', 'lineBetween', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'fillPath'])
      g[k] = vi.fn(() => g);
    g.lineStyle = vi.fn((w: number) => { widths.push(w); return g; });
    drawIcon(g as never, id, 48, 0x123456);
    expect(widths, id).toEqual([S * 48 / 24]);
  }
});
it('D3-R19 every HUD icon is either solid or stroked with the shared width', () => {
  for (const name of Object.keys(ICON_TONES) as IconName[]) {
    const svg = hudIconSvg(name), widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
    for (const w of widths) expect(w, name).toBe(S);
  }
});
it('D3-R19 the board icon names exist in both sets', () => {
  expect(ICON_IDS).toContain('check');
  expect(hudIconSvg('slowmo')).toContain(`stroke-width="${S}"`);
});
```
In `tests/game/icons.test.ts` append `'check'` to the expected list.

- [ ] **Step 2: Run** `npx vitest run tests/game/iconStyle.test.ts tests/game/icons.test.ts tests/game/hudIcons.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL (`iconStroke` undefined, 2.4 widths).
- [ ] **Step 3: Implement.** `uiTokens.ts` `d3.shape`: add `iconStroke: 2.6`. `icons.ts`: `import { TOKENS } from '../uiTokens'`, `const u = size / 24, w = TOKENS.d3.shape.iconStroke * u;`, add `'check'` to `ICON_IDS`, and the case `case 'check': g.beginPath(); g.moveTo(-7 * u, 0); g.lineTo(-2 * u, 5 * u); g.lineTo(7 * u, -5 * u); g.strokePath(); break;`. `hudIcons.ts`: replace `const line = (c, sw, body)` by `const line = (c: string, body: string): string => ...stroke-width="${TOKENS.d3.shape.iconStroke}"...` and drop the `sw` argument at every call (`line(c, 2.4, '<circle...')` -> `line(c, '<circle...')`; same for the `2.6` calls and `biome`). Update the redraw of any icon whose path was tuned for 2.4 only if the screenshot pass (Task 9) shows clipping at 24 grid edges.
- [ ] **Step 4: Run** the Step 2 command plus `npx vitest run tests/game/hudViews.test.ts tests/game/menuWidgets*.test.ts --configLoader native --pool threads --maxWorkers 2` (if a pattern matches no file, drop it) and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): one icon stroke token for menu and HUD icons (D3-R19)`.

### Task 4: Selected-state ring texture (D3-R21, U6-R2)

**Files:**
- Create: `src/game/ui/skin/ringSpec.ts`
- Modify: `src/game/ui/skin/skinPaint.ts` (export `shape`, add `paintRing`), `src/game/ui/skin/skinTextures.ts` (`ringKey`, `ringTexture`), `src/game/ui/skin/index.ts`
- Test: new `tests/game/ringSpec.test.ts`

**Interfaces:**
- Produces:

```ts
export interface RingRecipe { w: number; h: number; r: number; color: string; outset: number; lift: number }
/** D3-R21: ring around a face of `w` x `h` (+ `lip` below). Texture is (w + 2*outset) x (h + lip + 2*outset); the face sits `outset` from the left/top, lifted by `lift`. */
export function ringRecipe(w: number, h: number, r: number, lip: number, unit: number): RingRecipe;
export function paintRing(ctx: Ctx2D, rc: RingRecipe): void;
export const ringKey: (w: number, h: number, r: number, lip: number) => string; // 'd3/ring/WxH/r/lip' (ceil)
export function ringTexture(host: TextureHost, w: number, h: number, r: number, lip: number, unit: number): string;
```

- [ ] **Step 1: Failing test:**

```ts
import { expect, it } from 'vitest';
import { ringRecipe, ringTexture, type TextureHost } from '../../src/game/ui/skin';
import { TOKENS } from '../../src/game/uiTokens';

const S = TOKENS.d3.shape;
it('D3-R21 ring is 4 px outside the outline in mango yellow with a 2 px lift (U6-R2)', () => {
  const rc = ringRecipe(78, 78, 39, 6, 1);
  expect(rc.outset).toBe(S.selectedRing); expect(rc.lift).toBe(S.selectedLift);
  expect(rc.color).toBe(TOKENS.d3.logo.mango);
  expect(rc.w).toBe(78 + 2 * 4); expect(rc.h).toBe(78 + 6 + 2 * 4); expect(rc.r).toBe(39 + 4);
});
it('D3-R21 ring scales with the unit and is cached per shape', () => {
  expect(ringRecipe(78, 78, 39, 6, 2.5).outset).toBe(10);
  const made: string[] = [];
  const host: TextureHost = { exists: k => made.includes(k), createCanvas: k => { made.push(k); return { context: ctx(), refresh() {} }; } };
  const a = ringTexture(host, 78, 78, 39, 6, 1), b = ringTexture(host, 78, 78, 39, 6, 1);
  expect(a).toBe(b); expect(made).toHaveLength(1);
});
const ctx = () => new Proxy({}, { get: (_t, p) => p === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => undefined, set: () => true }) as never;
```

- [ ] **Step 2: Run** `npx vitest run tests/game/ringSpec.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL (exports missing).
- [ ] **Step 3: Implement.** `ringSpec.ts`:

```ts
// D3-R21 / U6-R2 selection ring recipe: a filled rounded shape painted under the face (pure).
import { TOKENS } from '../../uiTokens';
export interface RingRecipe { w: number; h: number; r: number; color: string; outset: number; lift: number }
export function ringRecipe(w: number, h: number, r: number, lip: number, unit: number): RingRecipe {
  const S = TOKENS.d3.shape, o = S.selectedRing * unit;
  return { w: w + 2 * o, h: h + lip + 2 * o, r: r + o, color: TOKENS.d3.logo.mango, outset: o, lift: S.selectedLift * unit };
}
```
`skinPaint.ts`: change `function shape` to `export function shape`, append `export function paintRing(ctx: Ctx2D, rc: RingRecipe): void { ctx.clearRect(0, 0, rc.w, rc.h); shape(ctx, 0, 0, rc.w, rc.h, rc.r, 0); ctx.fillStyle = rc.color; ctx.fill(); }` (import the type from `./ringSpec`). `skinTextures.ts`: add

```ts
export const ringKey = (w: number, h: number, r: number, lip: number): string => `d3/ring/${Math.ceil(w)}x${Math.ceil(h)}/${Math.round(r)}/${Math.round(lip)}`;
export function ringTexture(host: TextureHost, w: number, h: number, r: number, lip: number, unit: number): string {
  const key = ringKey(w, h, r, lip);
  if (host.exists(key)) return key;
  const rc = ringRecipe(w, h, r, lip, unit), tex = host.createCanvas(key, Math.ceil(rc.w), Math.ceil(rc.h));
  if (!tex) throw new Error(`skinTextures: cannot create ${key}`);
  paintRing(tex.context, rc); tex.refresh(); return key;
}
```
and `export * from './ringSpec';` in `index.ts`.
- [ ] **Step 4: Run** the Step 2 command plus `npx vitest run tests/game/skinSpec.test.ts tests/game/skinTextures.test.ts --configLoader native --pool threads --maxWorkers 2`, `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(skin): selection ring texture, 4 px mango + 2 px lift (D3-R21)`.

### Task 5: Loadout layout and view model (pure, D3-R19, U6-R3/R4/R5)

**Files:**
- Create: `src/game/flow/loadoutLayout.ts`
- Modify: `src/game/flow/loadoutView.ts`, `src/game/ui/menuMetrics.ts` (`MENU.loadout.d3`)
- Test: new `tests/game/loadoutLayout.test.ts`; extend `tests/game/loadoutView.test.ts`

**Interfaces:**
- Consumes: `Rect` (`ui/menuLayout.ts`), `LoadoutView` (this task extends it).
- Produces:

```ts
// loadoutView.ts additions
export type SkillTone = 'skillA' | 'skillB' | 'off';
export const SKILL_TONE: Record<SkillId, 'skillA' | 'skillB'> = { slowmo: 'skillA', tailSnip: 'skillB', shield: 'skillA', mangoRain: 'skillB' };
// LoadoutView.slots[i] gains tone: SkillTone; SkillCardView gains tone: SkillTone (locked -> 'off')
// loadoutLayout.ts
export interface LoadoutLayout { back: Rect; title: Rect; slots: { face: Rect; label: Rect }[]; chips: Rect[]; cards: Rect[]; go: Rect }
export function loadoutLayout(hm: number, o: { slotCount: 1 | 2; chips: number; cardCount: number }): LoadoutLayout;
```
`MENU.loadout.d3` (mock px, 360 wide): `{ backX: 12, backY: 12, round: 48, titleY: 16, titleH: 40, titleSide: 60, titleFont: 30, slotY: 74, slotSize: 78, slotGap: 20, slotLabelDy: 86, slotLabelH: 14, slotLabelFont: 12, chipsMinH: 700, chipsH: 32, chipsGap: 12, cardsTop: 190, cardX: 12, cardW: 336, cardH: 80, cardGap: 9, goX: 60, goH: 72, goBottom: 10, goClear: 16, topExtraMax: 20, gapExtraMax: 10, padL: 10, padR: 12, disc: 54, discIcon: 28, textGap: 10, nameFont: 19, descFont: 12, descLine: 1.2, costH: 26, costFont: 13, costIcon: 14, pickGap: 5, badgeFont: 13 }`.

- [ ] **Step 1: Failing tests** (`tests/game/loadoutLayout.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import { loadoutLayout, type LoadoutLayout } from '../../src/game/flow/loadoutLayout';
import { MENU } from '../../src/game/ui/menuMetrics';

const L = MENU.loadout.d3;
const flat = (l: LoadoutLayout) => [l.back, l.title, ...l.slots.flatMap(s => [s.face, s.label]), ...l.chips, ...l.cards, l.go];
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
describe('D3-R19 loadoutLayout', () => {
  it('D3-R19 reproduces the 360x640 board anchors', () => {
    const l = loadoutLayout(640, { slotCount: 2, chips: 2, cardCount: 4 });
    expect(l.slots[0]!.face).toEqual({ x: 92, y: 74, w: 78, h: 78 }); expect(l.slots[1]!.face.x).toBe(190);
    expect(l.cards[0]).toEqual({ x: 12, y: 190, w: 336, h: 80 }); expect(l.cards[1]!.y).toBe(190 + 80 + 9);
    expect(l.go).toEqual({ x: 60, y: 640 - 82, w: 240, h: 72 }); expect(l.chips).toEqual([]); // U6-R4 no chips on the short board
  });
  it('U6-R5 one slot is centred; tall boards keep order, no overlap, Go pinned to the bottom (hm 640, 779, 800)', () => {
    expect(loadoutLayout(640, { slotCount: 1, chips: 0, cardCount: 4 }).slots[0]!.face.x).toBe((360 - L.slotSize) / 2);
    for (const hm of [640, 779, 800]) {
      const l = loadoutLayout(hm, { slotCount: 2, chips: 2, cardCount: 4 }), all = flat(l);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlap(all[i]!, all[j]!), `${hm}:${i}/${j}`).toBe(false);
      expect(l.go.y + l.go.h).toBe(hm - L.goBottom);
      expect(l.cards[3]!.y + l.cards[3]!.h).toBeLessThanOrEqual(l.go.y - L.goClear + 0.001);
      for (const r of [...l.slots.map(s => s.face), ...l.cards, l.go]) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(48); // D3-R8
    }
    expect(loadoutLayout(779, { slotCount: 2, chips: 2, cardCount: 4 }).chips).toHaveLength(2); // U6-R4 tall shows chips
  });
});
```
Extend `tests/game/loadoutView.test.ts`:

```ts
it('U6-R3 slot and card tones follow the skill; empty slots and locked cards are off', () => {
  const v = loadoutView(initEdit({ ...model, selection: ['slowmo', null] }), b, { level: 1, carried: 0 }); // use the file's existing model fixture
  expect(v.slots.map(s => s.tone)).toEqual(['skillA', 'off']);
  expect(v.cards.find(c => c.id === 'mangoRain')!.tone).toBe('off');
  expect(v.cards.find(c => c.id === 'tailSnip')!.tone).toBe('skillB');
});
```
(Adapt `model` to the fixture name in that file; keep the three assertions.)

- [ ] **Step 2: Run** `npx vitest run tests/game/loadoutLayout.test.ts tests/game/loadoutView.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL.
- [ ] **Step 3: Implement.** `loadoutView.ts`: add `SKILL_TONE`, `export type SkillTone`, and set `tone: locked ? 'off' : SKILL_TONE[id]` on cards, `tone: skill ? SKILL_TONE[skill] : 'off'` on slots. `loadoutLayout.ts`:

```ts
import { MENU } from '../ui/menuMetrics';
import type { Rect } from '../ui/menuLayout';
const L = MENU.loadout.d3, W = 360;
// D3-R19 / U6-R5 Loadout rects in mock px for a canvas `hm` mock px tall.
export function loadoutLayout(hm: number, o: { slotCount: 1 | 2; chips: number; cardCount: number }): LoadoutLayout {
  const goY = hm - L.goBottom - L.goH;
  const x0 = o.slotCount === 1 ? (W - L.slotSize) / 2 : (W - 2 * L.slotSize - L.slotGap) / 2;
  const slots = Array.from({ length: o.slotCount }, (_, i) => {
    const x = x0 + i * (L.slotSize + L.slotGap);
    return { face: { x, y: L.slotY, w: L.slotSize, h: L.slotSize }, label: { x, y: L.slotY + L.slotLabelDy, w: L.slotSize, h: L.slotLabelH } };
  });
  const showChips = hm >= L.chipsMinH && o.chips > 0, slotsBottom = L.slotY + L.slotLabelDy + L.slotLabelH;
  const chipsY = slotsBottom + L.chipsGap, chipsBlock = showChips ? L.chipsH + L.chipsGap : 0;
  const block = o.cardCount * L.cardH + (o.cardCount - 1) * L.cardGap, base = L.cardsTop + chipsBlock;
  const slack = Math.max(0, goY - L.goClear - (base + block));
  const top = base + Math.min(L.topExtraMax, slack / 2);
  const gap = L.cardGap + (o.cardCount > 1 ? Math.min(L.gapExtraMax, (slack - Math.min(L.topExtraMax, slack / 2)) / (o.cardCount - 1)) : 0);
  const chipW = (W - 2 * L.cardX - (o.chips - 1) * L.chipsGap) / Math.max(1, o.chips);
  return {
    back: { x: L.backX, y: L.backY, w: L.round, h: L.round },
    title: { x: L.titleSide, y: L.titleY, w: W - 2 * L.titleSide, h: L.titleH },
    slots, chips: showChips ? Array.from({ length: o.chips }, (_, i) => ({ x: L.cardX + i * (chipW + L.chipsGap), y: chipsY, w: chipW, h: L.chipsH })) : [],
    cards: Array.from({ length: o.cardCount }, (_, i) => ({ x: L.cardX, y: top + i * (L.cardH + gap), w: L.cardW, h: L.cardH })),
    go: { x: L.goX, y: goY, w: W - 2 * L.goX, h: L.goH },
  };
}
```
(declare the `LoadoutLayout` interface above it). Note: at hm 640 `chipsBlock` is 0 so `base` = 190 as the board; the chip row of the tall board sits between `slotsBottom` and the cards because `base` shifts by `chipsBlock`; `cardsTop` 190 already exceeds `slotsBottom` (172) + chips: when chips show, `chipsY` = 184 and cards start at 190 + 44 = 234.
- [ ] **Step 4: Run** Step 2 command + `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(loadout): pure D3 layout and tone view model (D3-R19)`.

### Task 6: Loadout scene rebuild (D3-R19, D3-R21, U6-R2/R3/R9)

**Files:**
- Modify: `src/game/scenes/LoadoutScene.ts` (whole `create`/`render`/`skillCard`/`infoChip`; keep `pick`, `go`, `back`, `badgeIsNew`, `afterCapture`, `prevSlot`, `targets`)
- Test: `tests/game/loadoutView.test.ts` (`badgeIsNew` stays), new `tests/game/loadoutScene.test.ts` is NOT added (Phaser); view logic is covered by Task 5. Evidence = Task 9 screenshots.

**Interfaces:** Consumes `loadoutLayout`, `SKILL_TONE`/`tone` fields (Task 5), `ringTexture` (Task 4), `screenBackground(scene, 0, true)`, `card`, `chip`, `pillButton`, `titleText`, `skinTexture`/`lipPx`/`hostOf`. All sizes: `d3(px)` canvas px, `d3m(px)` widget mock px.

- [ ] **Step 1: Replace imports and metrics.** Remove `bgCream`, `layoutColumn`, `loadoutColumn`, `loadoutCards`, `isCompactHeight`, `scaledBlock`, `TOKENS.surface/sky/accent` uses and the `DISC` table. Add:

```ts
import { loadoutLayout } from '../flow/loadoutLayout';
import { screenBackground } from '../ui/background';
import { d3, d3Height, d3m } from '../ui/layout';
import { hostOf, lipPx, ringTexture, skinTexture } from '../ui/skin';
import { card, chip, titleText } from '../ui/widgets';
const L = MENU.loadout.d3, D = TOKENS.d3;
```
- [ ] **Step 2: `create()`.** `screenBackground(this, 0, true);` (dim rays, as `Loadout` board); back button at `l.back` centre (`roundIconButton(this, d3(l.back.x + l.back.w/2), d3(l.back.y + l.back.h/2), d3m(l.back.w), 'back', 'loadout-back', ...)`), title `titleText(this, WIDTH/2, d3(l.title.y + l.title.h/2), '', L.titleFont).setName('loadout-title')` (display type white with ink outline per board `.disp`), Go pill at `l.go` via `pillButton(..., 'green', { navigates: true })` + `bigLabel`. Layout is computed in `render()` because slot count and chips are view data; create the Go button after the first `loadoutLayout` call (use `loadoutLayout(d3Height(), { slotCount, chips, cardCount })` once in `create` just for `back`/`go`).
- [ ] **Step 3: `render()` body.** Destroy and rebuild `this.body` as a plain container (no `scaledBlock`: the layout already fits every height) and keep the MOT-2 groups by name:

```ts
const view = loadoutView(this.edit, this.balance, { level: this.level, carried: this.session.homeModel().carriedEnergy });
const l = loadoutLayout(d3Height(), { slotCount: view.slots.length as 1 | 2, chips: this.chipSpecs(view).length, cardCount: view.cards.length });
const blk = (this.body = this.add.container(0, 0));
// slots: MOT-2 group "slots", pivot at each slot centre (MOT-1-R3)
t_.slots = captureGroup(this, blk, { x: WIDTH / 2, y: d3(l.slots[0]!.face.y + L.slotSize / 2) }, () => view.slots.forEach((slot, i) => this.slotView(blk, slot, l.slots[i]!)));
```
`slotView(blk, slot, r)`: size `s = d3(r.face.w)`; `host = hostOf(this)`, `unit = d3(1)`, `lip = lipPx('skill', tone, unit)` where `tone = slot.tone`; images `skinTexture(host, 'skill', tone, s, s, 'lip'|'rest', unit)`; if `slot.active`: `ringTexture(host, s, s, s / 2, lip, unit)` image at the face centre minus `ring.outset` offset and the face/lip images moved up by `ringRecipe(...).lift` (U6-R2); icon `drawIcon` white (`D.white`) 38 mock px at the face centre (`d3(38)`), caption `t('loadout.slot1'|'slot2')` in white 12 px 800 under the face at `r.label` (`.onblue`), skill name below is dropped (board has only "Slot n"). Zone: `tap(this, cx, cy, d3(r.face.w), d3(r.face.h), 'loadout-slot'+(slot.index+1), () => this.pick(() => tapSlot(this.edit, slot.index), zone), { visual: pivot, kind: 'card' })`. Pivot via `pivotAt(this, blk, cx, cy)` exactly as before.
- [ ] **Step 4: Chips** (tall only, the layout returns `[]` otherwise): `chipSpecs(view)` = the old two entries (`home.startAt`, `home.startEnergy`); for each rect build `chip(this, d3(r.x + r.w/2), d3(r.y + r.h/2), text, '', 'loadout-chip', { tone: 'light', lead: L.chipIcon + 4 })` and a `drawIcon` (`flag` / `bolt`, colour `D.text` / `D.results.energyIcon`) at its left; wrap with `captureGroup(..., 'chips')` so `loadoutOrder` still finds `chips` (when absent, `Object.assign(this.targets, t_)` simply has no `chips` key; verify `enter()` skips missing targets as Results does, else assign an empty container).
- [ ] **Step 5: `skillCard(blk, c, rect)`** — panel card + disc + text + chips, in D3 mock px:

```ts
const x = d3(rect.x), y = d3(rect.y), w = d3(rect.w), h = d3(rect.h), cy = y + h / 2, unit = d3(1);
const { pivot, inner } = pivotAt(this, blk, x + w / 2, cy);
const lift = c.slot !== null ? d3(D.shape.selectedLift) : 0;           // D3-R21 selected: 2 px lift
if (c.slot !== null) {                                                  // ring under the panel (U6-R2)
  const lipP = lipPx('panel', 'light', unit), rk = ringTexture(host, w, h, d3(D.shape.radiusPanel), lipP, unit), o = d3(D.shape.selectedRing);
  inner.add(this.add.image(x + w / 2, cy + lipP / 2 - lift, rk));
}
const panel = card(this, x, y - lift, d3m(rect.w), d3m(rect.h)); if (c.locked) panel.setAlpha(L.lockedAlpha); inner.add(panel);   // U6-R9 (add lockedAlpha: 0.85 to MENU.loadout.d3)
const dd = d3(L.disc), dx = x + d3(L.padL) + dd / 2;
inner.add(this.add.image(dx, cy - lift + lipPx('skill', c.tone, unit) / 2, skinTexture(host, 'skill', c.tone, dd, dd, 'lip', unit)));
inner.add(this.add.image(dx, cy - lift, skinTexture(host, 'skill', c.tone, dd, dd, 'rest', unit)));
const ic = this.add.graphics().setPosition(dx, cy - lift); drawIcon(ic, c.locked ? 'lock' : c.id, d3(L.discIcon), toInt(c.locked ? D.tone.off.text : D.white)); inner.add(ic);
```
Text: name `FONT_TITLE` `d3(L.nameFont)` colour `D.text`; desc / `loadout.unlocksAt` `FONT_UI` 800 `d3(L.descFont)` colour `D.tip` with `wordWrap` = card width minus disc, paddings and the right chip column; both blocks vertically centred (existing math: `top = cy - (nameH + gap + descH)/2`). Right column (unlocked cards only, x aligned to `rect.x + rect.w - L.padR`, stacked `L.pickGap` apart, centred on `cy`): cost `chip(this, ..., String(c.cost), '', 'loadout-cost', { tone: 'light', lead: L.costIcon + 4 })` scaled to `L.costH` with a `bolt` icon in `D.results.energyIcon`; if `c.slot !== null` a second chip `chip(..., t('loadout.picked', { n: c.slot + 1 }), '', 'loadout-picked', { tone: 'mango', lead: L.costIcon + 4 })` with a `check` icon in `D.tone.mango.text`. Keep the MOT-1-R10 pops: `badgeIsNew(...)` pushes `motionFor(this).popIn(pickedChip)` and `feedbackOf(zone)?.pop()` into `this.afterCapture`. Zone: `tap(this, x + w/2, cy, w, h, 'loadout-card-' + c.id, () => this.pick(() => tapCard(this.edit, c.id), zone), { visual: pivot, kind: 'card' })`.
- [ ] **Step 6: Verify.** `npm run typecheck`; `npx vitest run tests/game/loadoutView.test.ts tests/game/loadoutEdit.test.ts tests/game/navGuard.test.ts tests/game/feedbackAttach.test.ts --configLoader native --pool threads --maxWorkers 2` (files that exist). Expected: PASS. Then `npm run dev` or `node tools/qa/shot.mjs` Loadout flow once to confirm the scene renders with no console error (full captures in Task 9).
- [ ] **Step 7: Commit** `feat(loadout): D3 panels, skill-skin slots, selection ring, cost and pick chips (D3-R19/R21)`.

### Task 7: Settings layout, bar-style toggles, scene rebuild (D3-R19, D3-R3, U6-R6/R7/R8)

**Files:**
- Create: `src/game/flow/settingsLayout.ts`
- Modify: `src/game/flow/settingsView.ts` (add `trackAlpha`, remove `SettingsTheme`, `settingsCardEdge`, `toggleTrackStyle` and the `TOKENS` import), `src/game/scenes/SettingsScene.ts`, `src/game/ui/menuMetrics.ts` (`MENU.settings.d3`, delete `themeCardH` and the `theme` block), `src/game/text.ts` (delete `settings.theme`, `settings.theme.sub`, `settings.light`, `settings.dark`; grep first that nothing else reads them)
- Test: new `tests/game/settingsLayout.test.ts`; update `tests/game/settingsView.test.ts`

**Interfaces:**
- Produces:

```ts
// settingsLayout.ts
export interface SettingsLayout { back: Rect; title: Rect; panel: Rect; rows: Rect[]; tile: Rect[]; toggle: Rect[]; caption: Rect }
export function settingsLayout(hm: number, rowCount: number): SettingsLayout;
export const knobTravel = (trackW: number, knobD: number): number => (trackW - knobD) / 2;
// settingsView.ts
/** U6-R7 alpha of the ON track image at slide progress p (the OFF image is drawn at 1 - alpha). */
export function trackAlpha(fromOn: boolean, on: boolean, p: number): number;
```
`MENU.settings.d3`: `{ backX: 12, backY: 12, round: 48, titleY: 14, titleH: 44, titleSide: 60, titleFont: 34, panelX: 14, panelY: 84, panelPadY: 4, rowH: 76, divider: 2, rowPadX: 12, tile: 44, tileR: 14, tileLine: 3, icon: 26, textGap: 10, titleFontRow: 16, subFont: 12, subW: 170, toggleW: 60, toggleH: 34, knob: 34, captionGap: 14, captionH: 16, captionFont: 13 }`. Row tile colours (board `.tile` uses `--bg` gradient): `TILE` map per setting in the scene: sound/haptics/dpad/reducedMotion -> `D.tone.energy` / `skillA` / `primary` / `mango` face stops via `skinTexture(host, 'button'?...)` is NOT used; tiles are 44 mock px rounded squares painted as `skinTexture(host, 'chip', tone, ...)`? No: use `'button'` kind would add a lip; use kind `'bar'` with tones `energy`, `skillA`, `primary`, `mango` (filled bars, no lip, no gloss, radius `min(h/2, ...)` rounded; if the bar radius looks round instead of 14, draw the tile as `panel`-less Graphics rounded rect with `tone.face[1]` fill and `tone.line` 3 px stroke — decision at screenshot time, both use tokens only).

- [ ] **Step 1: Failing tests** (`tests/game/settingsLayout.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import { knobTravel, settingsLayout } from '../../src/game/flow/settingsLayout';
import { trackAlpha } from '../../src/game/flow/settingsView';
import { MENU } from '../../src/game/ui/menuMetrics';

const S = MENU.settings.d3;
describe('D3-R19 settingsLayout', () => {
  it('D3-R19 one panel holds four rows; rows and dividers tile the panel exactly (360x640 board)', () => {
    const l = settingsLayout(640, 4);
    expect(l.panel).toEqual({ x: 14, y: 84, w: 332, h: 2 * S.panelPadY + 4 * S.rowH + 3 * S.divider });
    expect(l.rows).toHaveLength(4); expect(l.rows[0]!.y).toBe(84 + S.panelPadY);
    expect(l.rows[1]!.y - l.rows[0]!.y).toBe(S.rowH + S.divider);
    expect(l.toggle[0]).toMatchObject({ w: 60, h: 34 });
  });
  it('U6-R6 the caption sits below the panel at every height (the board mock overlaps)', () => {
    for (const hm of [640, 779, 800]) {
      const l = settingsLayout(hm, 4);
      expect(l.caption.y).toBe(l.panel.y + l.panel.h + S.captionGap);
      expect(l.caption.y + l.caption.h).toBeLessThanOrEqual(hm);
    }
  });
  it('D3-R8 every row is a full-width touch target of at least 48 px', () => {
    for (const r of settingsLayout(640, 4).rows) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(48);
  });
  it('U6-R7 the knob stays inside the track overhang and the slide cross-fades the track', () => {
    expect(knobTravel(60, 34)).toBe(13);
    expect(trackAlpha(false, true, 0)).toBe(0); expect(trackAlpha(false, true, 1)).toBe(1);
    expect(trackAlpha(true, false, 0.25)).toBe(0.75); expect(trackAlpha(true, true, 0.5)).toBe(1); expect(trackAlpha(false, false, 0.5)).toBe(0);
  });
});
```
In `tests/game/settingsView.test.ts` delete the tests of `settingsCardEdge` / `toggleTrackStyle` (they are removed with the code) and add `it('D3-R3 settings rows contain no theme row', ...)` asserting `settingsView(...).rows.map(r => r.id)` equals `['sound','haptics','dpad','reducedMotion']`.

- [ ] **Step 2: Run** `npx vitest run tests/game/settingsLayout.test.ts tests/game/settingsView.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL (modules/exports missing).
- [ ] **Step 3: Implement the pure parts.**

```ts
// settingsLayout.ts
import { MENU } from '../ui/menuMetrics';
import type { Rect } from '../ui/menuLayout';
const S = MENU.settings.d3, W = 360;
export const knobTravel = (trackW: number, knobD: number): number => (trackW - knobD) / 2;
// D3-R19 / U6-R6 Settings rects in mock px (hm accepted for symmetry with the other layouts; the board is top-anchored).
export function settingsLayout(_hm: number, rowCount: number): SettingsLayout {
  const panel = { x: S.panelX, y: S.panelY, w: W - 2 * S.panelX, h: 2 * S.panelPadY + rowCount * S.rowH + (rowCount - 1) * S.divider };
  const rows = Array.from({ length: rowCount }, (_, i) => ({ x: panel.x, y: panel.y + S.panelPadY + i * (S.rowH + S.divider), w: panel.w, h: S.rowH }));
  return {
    back: { x: S.backX, y: S.backY, w: S.round, h: S.round }, title: { x: S.titleSide, y: S.titleY, w: W - 2 * S.titleSide, h: S.titleH }, panel, rows,
    tile: rows.map(r => ({ x: r.x + S.rowPadX, y: r.y + (r.h - S.tile) / 2, w: S.tile, h: S.tile })),
    toggle: rows.map(r => ({ x: r.x + r.w - S.rowPadX - S.toggleW, y: r.y + (r.h - S.toggleH) / 2, w: S.toggleW, h: S.toggleH })),
    caption: { x: 0, y: panel.y + panel.h + S.captionGap, w: W, h: S.captionH },
  };
}
```
(declare `SettingsLayout` above.) `settingsView.ts`: add `export const trackAlpha = (fromOn: boolean, on: boolean, p: number): number => fromOn === on ? (on ? 1 : 0) : on ? p : 1 - p;` and delete `SettingsTheme`, `settingsCardEdge`, `toggleTrackStyle`, the `TOKENS` import.
- [ ] **Step 4: Rebuild `SettingsScene`.** Remove `themeOf/currentPalette/uiTheme/UiTheme`, `applyTheme`, `theme()`, `veil` rectangle, `borderColor/trackColor`, `scaledBlock`, `layoutColumn`, `settingsColumn`. New `create()`: `const bg = screenBackground(this, 0, true)` (U6-R8; in overlay mode `bg.setInteractive()` and the fade-in/out uses `motionFor(this).fadeIn(bg)/fadeOut(bg)` exactly where `veil` was used; confirm `screenBackground` returns the Image, otherwise create a full-screen interactive `Zone` beside it), title `titleText(this, WIDTH/2, d3(l.title.y + l.title.h/2), t('settings.title'), M.titleFont).setName('settings-title')`. `build()`:

```ts
const l = settingsLayout(d3Height(), v.rows.length), host = hostOf(this), unit = d3(1);
t_.card = card(this, d3(l.panel.x), d3(l.panel.y), d3m(l.panel.w), d3m(l.panel.h)); // fades with the title
v.rows.forEach((r, i) => {
  const row = l.rows[i]!, cy = d3(row.y + row.h / 2);
  if (i > 0) { const dv = this.add.rectangle(WIDTH / 2, d3(row.y - M.divider / 2), d3(row.w - 2 * M.rowPadX), d3(M.divider), toInt(M.dividerColor)); /* colour: TOKENS.d3.divider (add '#C6DAEA') */ }
  t_[`row${i}`] = captureGroup(this, this.body!, { x: 0, y: 0 }, () => { /* tile, icon, title, hint, toggle */ });
});
```
Row contents: tile image (`tile[i]`, tone per `TILE: Record<SettingsToggle, D3Tone>` = `{ sound: 'energy', haptics: 'skillA', dpad: 'primary', reducedMotion: 'mango' }`) with the icon (`drawIcon`, `D.white`, `d3(M.icon)`); title `FONT_UI` 900 `d3(M.titleFontRow)` colour `D.text`; hint 800 `d3(M.subFont)` colour `D.tip` wrapped at `d3(M.subW)`; the "On/Off" value text of the old design is dropped (board has none). Toggle (U6-R7): two track images `skinTexture(host, 'bar', 'primary', w, h, 'rest', unit)` and `(…, 'off', …)` centred at the track rect; knob `container` holding `skinTexture(host, 'round', 'light', k, k, 'lip'|'rest', unit)` at `kc.x = trackCx + knobX(r.on, p, d3(knobTravel(S.toggleW, S.knob)))`. `paint(p)`:

```ts
const paint = (p: number): void => {
  kc.x = swX + knobX(r.on, p, d3(knobTravel(M.toggleW, M.knob)));
  const a = trackAlpha(slideFrom(this.prev, r.id, r.on), r.on, p); trackOn.setAlpha(a); trackOff.setAlpha(1 - a);
};
if (slideFrom(this.prev, r.id, r.on) !== r.on && !reduceMotion()) this.slides.push(runSlide(this, slideMs, paint)); else paint(1);
```
Hit zone and QA name unchanged: `tap(this, WIDTH/2, cy, d3(row.w), d3(row.h), 'settings-' + r.id, () => this.change(togglePatch(s, d, r.id)), { visual: kc, kind: 'switch' })`. Caption: `this.add.text(WIDTH/2, d3(l.caption.y + l.caption.h/2), t('settings.autosave'), { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(M.captionFont)}px`, color: D.white }).setOrigin(0.5)` (board `.onblue`).
- [ ] **Step 5: Remove leftovers.** Delete `settings.theme`, `settings.theme.sub`, `settings.light`, `settings.dark` from `src/game/text.ts` after `grep -rn "settings.theme\|settings.light\|settings.dark" src tests` shows no other user (update `tests/game/menuText.test.ts` if it lists them). Delete `MENU.settings.themeCardH` and the `theme` block, `MENU.settings.sw`, old `rowH/rows/...` keys no longer read (the Task 8 guard covers tokens; `menuLayout.test.ts` covers `settingsColumn`, removed in Task 8).
- [ ] **Step 6: Verify.** `npx vitest run tests/game/settingsLayout.test.ts tests/game/settingsView.test.ts tests/game/feedbackAttach.test.ts tests/game/menuText.test.ts --configLoader native --pool threads --maxWorkers 2`, `npm run typecheck`. Expected: PASS. Quick headless capture of Settings (full and overlay) with no console error.
- [ ] **Step 7: Commit** `feat(settings): one D3 panel, bar-style toggles with round knob, no theme card (D3-R19, D3-R3)`.

### Task 8: Remove dead D2 tokens, dark theme and leftovers + guard test (D3-R1, U6-R10)

**Files:**
- Modify: `src/game/uiTokens.ts` (delete `UI_THEME`, `uiTheme`, `UiThemeName`, `UiTheme`, unused `surface/text/green/accent/sky/snake/title/screen/hud/menu/danger` keys, `menu.themeLight/themeDark/cardEdgeDark`), `src/game/render/palette.ts` (delete `DARK`, `themeOf`, make `currentPalette` return `LIGHT` only if still used), `src/game/ui/menuLayout.ts` (delete `loadoutColumn`, `loadoutCards`, `isCompactHeight`, `settingsColumn` and `resultsColumn` leftovers if no user remains), `src/game/ui/menuWidgets.ts` (`bgCream` if unused, `scaledBlock` if unused), `MENU.loadout` / `MENU.settings` D2 keys
- Delete: `tests/game/uiTheme.test.ts`
- Modify tests that pin D2 values: `tests/game/uiTokens.test.ts`, `menuTokens.test.ts`, `hudTokens.test.ts`, `effectsCaps.test.ts:3,10` (drop `DARK`), `hudViews.test.ts:18,213` (drop `uiTheme('dark')` assertion, keep "panel is the light card skin"), `menuLayout.test.ts`, `twoHeights.test.ts`
- Test: new `tests/game/tokenGuard.test.ts`

Audit input (grep run 2026-11-16, uses in `src/` outside `uiTokens.ts`): zero uses today for `accent.periwinkle, green.mint2, green.shade, hud.cardShadowAlpha, hud.charge, hud.chargeAlpha, hud.energyTrack, hud.mintCard, hud.quota, hud.ring, hud.ringTrack, hud.ringTrackAlpha, hud.scrim, hud.shelf, hud.shelfAlpha, hud.skillOffFace, hud.skillUsedFace, hud.slowBoardAlpha, hud.slowTint, hud.slowTintAlpha, menu.bestSoft, menu.heroBands, menu.heroBandStops, menu.mintBanner, menu.themeDark, menu.themeLight, screen.h, screen.sidePad, sky.silhouette, snake.shade, surface.peach, text.faint, text.logoOutline, text.walnut`. After Tasks 6 and 7 the Loadout/Settings scenes no longer read `menu.slotRing, pickRing, costChip, rowDivider, statButter, mintBannerText, cardEdgeDark, sky.stat, sky.lavender, accent.pink, accent.butter, green.mint, surface.sand/stone/card` and the dark `UI_THEME` text/card tokens. The guard test names the exact remaining set; trust it over this list.

- [ ] **Step 1: Failing test** (`tests/game/tokenGuard.test.ts`):

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
import * as palette from '../../src/game/render/palette';

const files = (d: string): string[] => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
const src = files('src').filter(f => !f.replace(/\\/g, '/').endsWith('src/game/uiTokens.ts')).map(f => readFileSync(f, 'utf8')).join('\n');
const WHOLE = new Set(['bg', 'board', 'tone', 'biomes', 'outline', 'outlineStorm', 'snake']); // U6-R10 d3 sub-trees read as whole objects
const keys = (Object.entries(TOKENS) as [string, Record<string, unknown>][]).flatMap(([g, v]) =>
  typeof v === 'object' && v !== null ? Object.keys(v).filter(k => !(g === 'd3' && WHOLE.has(k))).map(k => [g, k] as const) : []);

it('D3-R1 every TOKENS key is read somewhere in src (no dead D2 tokens)', () => {
  const dead = keys.filter(([g, k]) => !new RegExp(`\\b${g}\\.${k}\\b`).test(src) && !(g === 'd3' && new RegExp(`\\b[A-Za-z_.]*\\.${k}\\b`).test(src))).map(([g, k]) => `${g}.${k}`);
  expect(dead).toEqual([]);
});
it('D3-R3 no dark theme left: no UI_THEME, no DARK palette, no theme helpers', () => {
  expect((TOKENS as Record<string, unknown>).themeDark).toBeUndefined();
  expect('DARK' in palette).toBe(false); expect('themeOf' in palette).toBe(false);
  expect(src).not.toMatch(/UI_THEME|uiTheme\(|themeLight|themeDark|settingsCardEdge|toggleTrackStyle/);
});
```
(The `d3` branch accepts alias reads such as `D.stat` / `D.tip`; flat groups require the explicit `group.key` form, which is how all D2 reads are written. If a flat key is read through an alias such as `const H = TOKENS.hud`, change that read to the explicit form instead of weakening the test.)
- [ ] **Step 2: Run** `npx vitest run tests/game/tokenGuard.test.ts --configLoader native --pool threads --maxWorkers 2`. Expected: FAIL listing the dead keys (about 40) and the theme leftovers.
- [ ] **Step 3: Delete in order, running the guard after each group:** (a) `UI_THEME`/`uiTheme`/`UiTheme*` from `uiTokens.ts`, `DARK`/`themeOf` (and `currentPalette` if the guard shows no user) from `palette.ts`; (b) every key the guard lists in `surface/text/green/accent/sky/snake/title/screen/hud/menu/danger` — delete the key, not the group, unless the group empties (then delete it and its `TOKENS.x` pins in tests); (c) `menuLayout.ts` helpers with no user (`grep -rn` each name first), then their tests; (d) D2-only `MENU.loadout`/`MENU.settings` keys no scene reads. Keep `TOKENS.screen.w` (`ui/layout.ts` scale) and `TOKENS.title.*` only while the guard says they are read.
- [ ] **Step 4: Fix pinned tests.** `uiTokens.test.ts` first test keeps only groups that still exist (assert surviving values, delete the rest); `menuTokens.test.ts` / `hudTokens.test.ts` likewise; delete `tests/game/uiTheme.test.ts`; `effectsCaps.test.ts` iterates `[LIGHT]`; `hudViews.test.ts:213` becomes `expect(fills).toContain(toInt(TOKENS.d3.tone.light.face[0]))` only if the original assertion needs a positive form, else delete the dark line.
- [ ] **Step 5: Run** `npx vitest run tests/game/tokenGuard.test.ts tests/game/uiTokens.test.ts tests/game/menuTokens.test.ts tests/game/hudTokens.test.ts tests/game/d3Tokens.test.ts tests/game/menuLayout.test.ts tests/game/twoHeights.test.ts tests/game/effectsCaps.test.ts tests/game/hudViews.test.ts --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`. Expected: PASS (if the contrast tests in `d3Tokens.test.ts` use a removed key, point them at the `d3` equivalent).
- [ ] **Step 6: Commit** `refactor(ui): remove dead D2 tokens and the dark theme, guard test (D3-R1, D3-R3)`.

### Task 9: Screenshot pass, docs, merge

**Files:** `docs/PLAYTEST.md`, `docs/CODEMAP.md`, `docs/design/UI-MOCKUPS.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `CHANGELOG.md`; screenshots in `tmp/qa/u6/` (git-ignored, not committed).

- [ ] **Step 1: Capture** with `node tools/qa/shot.mjs` (how-to in PLAYTEST "How to capture", same step vocabulary as `tmp/qa/u5/`) at 540 x 960 and 540 x 1170 into `tmp/qa/u6/`: Loadout (two slots, slot 1 selected; one slot; no skill unlocked; a locked card; all picked; 779-tall with chips), Settings (full screen: all off, all on, a toggle mid-slide frame if capturable; overlay from Pause), Home -> Loadout -> Go and Settings -> Back round trips, Results with a next-checkpoint row, an "incoming" card shown while a run-start challenge banner is queued (U5 follow-up A). Console must be clean (no errors, no missing texture warnings). Compare side by side with `docs/design/mockups/d3/png/{Loadout,Settings,States}-360.png`; fix findings (icon clipping at stroke 2.6, tile radius, caption spacing) in small commits.
- [ ] **Step 2: Audit counts.** Note in PLAYTEST the skin/ring texture key count (`Object.keys(game.textures.list).filter(k => k.startsWith('d3/')).length`, budget <= 120 for U7).
- [ ] **Step 3: Docs.** `CHANGELOG.md` `[Unreleased]`: one line per task. `docs/CODEMAP.md`: add rows/mentions for `flow/loadoutLayout.ts`, `flow/settingsLayout.ts`, `ui/skin/ringSpec.ts`, `hud/bannerQueue.ts`; remove the deleted names (`UI_THEME`, `loadoutCards`, ...) from the `src/game/` row and keep the file under about 80 lines. `docs/design/UI-MOCKUPS.md`: mark Loadout, Settings, States (selected) as built. `docs/DECISIONS.md`: entry "2026-11-16 U6 rulings U6-R1..R11". `docs/PLAYTEST.md`: entry "U6 Loadout + Settings" with the shot list, findings, and **owner eye-check: PENDING** items: slot ring and 2 px lift readability, pick chip vs. board, toggle knob feel (MOT-1 slide on the new skins), icon set consistency, "incoming" card now surviving run start, no Start chips on the short board (U6-R4).
- [ ] **Step 4:** Full `npm test` (host load timeout -> `--maxWorkers 1`), then `npm run typecheck`; both pass.
- [ ] **Step 5:** `git checkout version/v0.3 && git merge --no-ff feat/u6-loadout-settings`; rewrite `docs/STATUS.md` (U6 merged, next U7 audit and exit), refresh GitNexus in the background (`node .gitnexus/run.cjs analyze --index-only --workers 2`).

---

## Self-Review
- **Spec coverage:** D3-R19 icons (Task 3), Loadout panels/skill slots/cost chips (Tasks 5-6), Settings one panel + bar toggles + no theme card (Task 7), D3-R21 selected ring + lift (Tasks 4, 6), D3-R1 "no dead tokens at end of U6" + `UI_THEME.dark`/`palette.DARK`/`themeLight/themeDark`/`settingsCardEdge`/`toggleTrackStyle` + guard test (Tasks 7, 8), screenshot pass (Task 9), D3-R3 one theme (Global Constraints, Tasks 7-8), D3-R2 contrast untouched (text colours `D.text` on light panels are the already tested pair; the Task 9 capture checks the white caption/title on the ray background). U5 follow-ups: incoming card (Task 1), `enqueue` unit test (Task 1), dead `head` (Task 2), literals (Task 2). Gap kept on purpose: tile painting choice (bar skin vs. Graphics) is decided at the Task 9 screenshot, both token-only.
- **Placeholder scan:** no TBD/TODO; scene steps reference exact existing helpers and show the new calls; Task 6/7 scene bodies are given as replacement blocks plus unchanged-code references (`pick`, `go`, `back`, `badgeIsNew`).
- **Type consistency:** `BannerQueueState`/`startBanners`/`enqueueBanners`/`advanceBanners`/`enqueueAll` (Task 1); `ringRecipe`/`ringTexture`/`paintRing` (Task 4) used in Task 6; `loadoutLayout(hm, {slotCount, chips, cardCount})`, `SKILL_TONE`, `tone` fields (Task 5) used in Task 6; `settingsLayout(hm, rowCount)`, `knobTravel`, `trackAlpha` (Task 7); `TOKENS.d3.results`, `TOKENS.d3.shape.iconStroke`, `MENU.loadout.d3`, `MENU.settings.d3` defined where first needed (`MENU.loadout.d3.lockedAlpha` and `TOKENS.d3.divider` are added in Tasks 6 and 7 where used, and the Task 8 guard confirms they are read).
