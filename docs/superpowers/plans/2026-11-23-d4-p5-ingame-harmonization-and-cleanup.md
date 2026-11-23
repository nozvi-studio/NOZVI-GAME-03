# D4-P5 In-Game Harmonization & D3 Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task follows superpowers:test-driven-development (red → green → commit).

**Goal:** Bring the last Phaser-rendered layer (the `GameScene` board and the `HudScene` top/bottom HUD) into the D4 "Duolingo Modern" look, so that going from Home into a run feels like one product. Steps: (1) calm biome backgrounds with no sunburst rays; (2) a softer, lower-chroma checkerboard that still keeps `>= 3:1` board contrast for 6 biomes × 5 skins × 11 hazard families, including Biome 6 Storm; (3) a flat `HudTop` with no pink ribbon; (4) flat `SkillButtons` with semantic cost badges (cyan `#1CB0F6` when affordable, muted `#AFAFAF` when short, never red); (5) fix the swipe-hint finger overlapping the left skill badge in `BottomGroup` at `360×640`; (6) prune the dead D3 Phaser menu, skin and token code while `tokenGuard.test.ts` stays strict and green; (7) Chrome QA across all 6 biomes; (8) close out and merge into `version/v0.3`.

**Architecture:** Pure helpers stay pure. `biomePalette.ts` (`boardLook`, `contrastRatio`, `HAZARD_EDGES`), `backgroundSpec.ts` (`bgSpec`, `paintBackground`) and `d3HudLayout.ts` (`d3HudLayout`, `D3_RUN`) have no Phaser imports, so every visual rule is pinned there by node-environment unit tests. Phaser classes (`HudTop`, `SkillButtons`, `BottomGroup`, `background.ts`) only consume those helpers. The new D4 colour values go into `TOKENS` in `src/game/uiTokens.ts` as a `d4run` group (hex strings read through `toInt`). They mirror `tokens.css` values but are TS tokens, because Phaser cannot read CSS variables. Badge colour comes from a pure `badgeTone(look)` helper in `skillLook.ts`. The finger and hint placement comes from a pure `hintPlacement(layout, hintW)` helper, so the overlap fix can be tested without Phaser.

**Tech Stack:** TypeScript strict, Phaser 3.90, Vite, Vitest (`node` env; `happy-dom` only for existing DOM tests). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-d4-p5-ingame-harmonization-and-cleanup.md` (rules `D4-P5-R1..R3`). Umbrella: `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`. Conventions: `docs/superpowers/plans/2026-11-23-d4-p4-menus-and-overlays.md`.

## Global Constraints

- **Precondition:** D4-P4 is merged into `version/v0.3` and the owner approved the P4 eye-check. `ResultsScene`, `SettingsScene`, `LoadoutScene`, `HomeScene`, `CharactersScene` are thin shims over DOM screens. If not, stop and report.
- Read `AGENTS.md` first. All repository text is in English. Use Conventional Commits. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/d4-p5-ingame-harmonization`, created from `version/v0.3`. One commit per task. After the full suite and typecheck pass, merge back with `git merge --no-ff` (Task 10). No push.
- No new dependency. Do not touch `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.
- **Gameplay rules unchanged.** P5 changes presentation only: board geometry (`boardRect`), hit areas, skill costs, energy rules, input routing and `HudView` outputs stay the same. If a task seems to need a rule change, stop and ask the owner (AGENTS §5).
- **Contrast is a hard gate.** After every palette change, `tests/game/boardContrast.test.ts` must pass with `>= 3:1` for every outline against both checker cells of every biome. If a softer pair fails, darken the outline token, not the cell. If that is not enough, raise cell contrast just enough to pass. Never lower the threshold.
- **tokenGuard stays strict.** `tests/game/tokenGuard.test.ts` must stay green after every commit. Do not add keys to its `WHOLE` allow-list except to *remove* names whose sub-tree is deleted. Every new `TOKENS` key must be read in `src/`.
- No magic numbers: px values live in `D3_RUN` (or a new `D4_RUN` block in `d3HudLayout.ts`), colours in `TOKENS`, timings in `balance.json`/`MOTION`.
- Put requirement IDs in test names (`D4-P5-R1 …`) and a one-line comment at each main implementing function.
- **GitNexus:** at task start run `node .gitnexus/run.cjs status` (analyze if stale). Before you edit or delete any exported symbol, run `impact` on it and record the callers in the task notes. At the end, refresh it in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.
- Commands (Windows, PowerShell):
  - Touched tests only: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`
  - Before each commit: `npx vitest run --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`. Run them one after the other; both must pass.
- Every commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. Module adds, moves or deletions update `docs/CODEMAP.md` in the same commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/game/uiTokens.ts` (modify) | new `TOKENS.d4run` group (bg tints, softened cells, flat HUD surfaces, badge cyan/muted, mango/energy fill + track); delete dead `d3` keys in Task 8 |
| `src/game/ui/backgroundSpec.ts` (modify) | D4-P5-R1 calm spec: no wedges; flat top→bottom tint gradient; `rayColor`/`wedges` removed |
| `src/game/ui/background.ts` (modify) | consumes the calm spec; texture key bumps to `d4/bg/...` so stale ray textures are never reused |
| `src/game/render/biomePalette.ts` (modify) | D4-P5-R1 softened `groundA/groundB` per biome, rounded tactile `frame`; Storm keeps the light outline set |
| `src/game/scenes/GameScene.ts` / board frame drawer (modify, locate via GitNexus) | rounded board frame from `D4_RUN.board` (radius, 4 px lip), no heavy dark border |
| `src/game/hud/d3HudLayout.ts` (modify) | `level` pill rect replaces `ribbon`; `D4_RUN` metrics (pill, bar, badge); pure `hintPlacement()` |
| `src/game/hud/HudTop.ts` (modify) | D4-P5-R2 flat white pause, Level pill, Score pill, flat mango bar |
| `src/game/hud/skillLook.ts` (modify) | pure `badgeTone(look): 'ready' \| 'short'` |
| `src/game/hud/SkillButtons.ts` (modify) | D4-P5-R2 flat round faces + 4 px lip, no gloss band, cyan/muted badges |
| `src/game/hud/BottomGroup.ts` (modify) | D4-P5-R2 flat energy bar (`#1CB0F6` on track), finger placed through `hintPlacement()` |
| `src/game/ui/skinPaint.ts`, `src/game/ui/skin.ts` (prune) | delete glossy recipes no caller uses (`ribbon`, gloss bands, `danger` chip if unused) |
| `src/game/scenes/{Home,Characters,Loadout,Results,Settings}Scene.ts` + legacy layout/widget modules (prune) | delete old Phaser widget code; keep thin shims |
| `tests/game/boardContrast.test.ts` (extend) | full 6 × 5 × 11 matrix, Storm HUD surfaces, chroma ceiling |
| `tests/game/backgroundSpec.test.ts` (new/extend), `tests/game/d4RunHud.test.ts` (new), `tests/game/hintPlacement.test.ts` (new), `tests/game/skillLook.test.ts` (extend) | pure-rule tests |
| `tests/game/{d3Tokens,hudTokens,menuTokens}.test.ts` (prune/adapt) | drop D3-only assertions; keep any still-live rule |
| `docs/CODEMAP.md`, `docs/README.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `docs/PLAYTEST.md`, `CHANGELOG.md` | records and maps |

---

### Task 0: Kickoff checks and blast-radius inventory

**Files:** none changed (task notes only), except `docs/DECISIONS.md`

- [ ] **Step 1:** Verify the precondition (P4 merged; the five menu scenes are shims). Check the GitNexus status. Run `impact` on `screenBackground`, `bgSpec`, `paintBackground`, `boardLook`, `HAZARD_EDGES`, `D3_RUN`, `d3HudLayout`, `skinTexture`, `lipPx`, `glossBand`, `butterChip`, `progressBar`, `skillLook`. Record the callers.
- [ ] **Step 2:** Locate the board frame drawer: grep `\.frame` / `boardLook(` in `src/game/scenes/` and `src/game/render/`, and record the file. Locate the HUD contrast surfaces used in Storm: grep `outlineStorm` and `STORM`.
- [ ] **Step 3:** Build the dead-code candidate list for Task 8. For each of `HomeScene`, `CharactersScene`, `LoadoutScene`, `ResultsScene`, `SettingsScene`, list its imports. For every legacy module those imports reach (`menuWidgets`, `menuMetrics`, `*Layout.ts`, `pauseLayout`, `PAUSE_MOCK`, `skinPaint` recipes), grep for importers *outside* those scenes and their tests. Only modules with zero external importers are candidates. Note: `BottomGroup` still imports `butterChip` and `D3_HOME`, so those stay unless Task 6 replaces them.
- [ ] **Step 4:** Append to DECISIONS (2026-11-23): "D4-P5: in-run Phaser colours live in `TOKENS.d4run` (TS hex mirrored from `tokens.css`), because Phaser cannot read CSS variables. The board contrast gate (>= 3:1, 6 biomes × 5 skins × 11 hazards) beats aesthetics. When a softened pair fails, the outline darkens first." Commit `docs: D4-P5 kickoff decisions`.

---

### Task 1: Calm gameplay background, no sunburst (`D4-P5-R1`)

**Files:**
- Modify: `src/game/ui/backgroundSpec.ts`, `src/game/ui/background.ts`, `src/game/uiTokens.ts` (`d4run.bg: [top, bottom][]` × 6, low-saturation biome tints; Storm uses a calm deep indigo pair around `#4A3F86`)
- Test: `tests/game/backgroundSpec.test.ts` (extend or create, `node`)

**Interfaces:**
```ts
// backgroundSpec.ts
export interface BgSpec { top: string; bottom: string; outer: string; w: number; h: number; dim: boolean } // no rays, no wedges
export function bgSpec(biome: number, w: number, h: number, dim?: boolean): BgSpec;
export function paintBackground(ctx: BgCtx, s: BgSpec): void; // one linear gradient fillRect, + dim veil when dim
export const bgKey: (biome: number, w: number, h: number, dim?: boolean) => string; // 'd4/bg/<n>/<w>x<h>[/dim]'
```
Rules (comment `// D4-P5-R1 calm biome backdrop: flat/subtle vertical tint, no ray fan`):
- `paintBackground` makes exactly one `fillRect` for the gradient (and one more for the dim veil), with no `arc`/`moveTo` wedge calls.
- Tints come from `TOKENS.d4run.bg[n-1]`. Saturation (HSL) of both stops is `<= 0.45` for biomes 1–5. Storm is exempt from the ceiling but must keep `contrastRatio(white, top) >= 4.5` so the white HUD text stays legible.
- `outer` = `bottom` (the letterbox band matches the base of the gradient).

- [ ] **Step 1: Write failing tests:**
  - `D4-P5-R1 bgSpec has no wedges or ray colour for biomes 1..6`.
  - `D4-P5-R1 paintBackground issues no arc calls (fake BgCtx recorder) and one gradient fill`.
  - `D4-P5-R1 biome 1..5 background stops are low saturation (<= 0.45)`.
  - `D4-P5-R1 Storm background keeps >= 4.5:1 against white HUD text`.
  - `D4-P5-R1 bgKey uses the d4/bg namespace (no stale D3 ray texture reuse)`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/backgroundSpec.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.** Delete the ray fields (`rayCx`, `rayCy`, `rayR`, `rayColor`, `wedges`) and the `rayDeg`/`rayAlpha`/`rayCenterY`/`dimRays` reads. Leave the now-unread `TOKENS.d3.bg` keys for Task 8 if `tokenGuard` still passes (it treats `bg` as a whole sub-tree). If it fails, delete them here.
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG, run the full suite + typecheck, commit** `feat(ui): calm D4 gameplay backgrounds without sunburst (D4-P5-R1)`.

---

### Task 2: Softened checkerboard and full contrast matrix (`D4-P5-R1`)

**Files:**
- Modify: `src/game/render/biomePalette.ts`, `src/game/uiTokens.ts` (`d4run.cells: [a, b][]` × 6, `d4run.frame[]`, optional darker `d4run.outline` overrides)
- Test: `tests/game/boardContrast.test.ts` (extend)

Rules (comment `// D4-P5-R1 softened low-chroma checker; outlines keep >= 3:1 on both cells`):
- `boardLook` reads its cells from `TOKENS.d4run.cells[n-1]` and its frame from `TOKENS.d4run.frame[n-1]`. The skin body/outline logic (MEC-011-R4) and the Storm light outline set stay unchanged.
- Softness: the lightness difference between `groundA` and `groundB` is `<= 0.06` (HSL L), and the chroma of each cell (HSL S × (1 − |2L − 1|)) is `<= 0.25` for biomes 1–5.
- Storm (biome 6) cells stay dark (`luminance <= 0.12`) so the light outline set and the white HUD pills keep contrast.

- [ ] **Step 1: Write failing tests** (keep the three existing D3-R2 tests unchanged and add):
  - `D4-P5-R1 full matrix: 6 biomes x 5 skins x 11 hazards, every hazard edge and the skin outline >= 3:1 on both cells`. Nested loop over `1..6`, `SKIN_IDS`, `Object.entries(HAZARD_EDGES)`. Assert `Object.keys(HAZARD_EDGES).length === 11` and `SKIN_IDS.length === 5` so the matrix cannot silently shrink.
  - `D4-P5-R1 mango and warn outlines >= 3:1 on both cells for every skin and biome`.
  - `D4-P5-R1 biome 1..5 checker is soft: |L(a)-L(b)| <= 0.06 and chroma <= 0.25`.
  - `D4-P5-R1 Storm cells stay dark (luminance <= 0.12) and the HUD light surface (d4run.hud.surface) is >= 3:1 against the Storm frame and background`.
- [ ] **Step 2: Run, expect FAIL** (the softness tests fail on the current D3 cells).
- [ ] **Step 3: Implement.** Tune the tokens, run the test and iterate. Darken outline tokens first, as the contrast-gate rule in Global Constraints says. Record the final pairs and the minimum ratio found in the commit body.
- [ ] **Step 4: Run, expect PASS. CHANGELOG, full suite + typecheck, commit** `feat(art): softened D4 checkerboard with 6x5x11 contrast matrix (D4-P5-R1)`.

---

### Task 3: Rounded tactile board frame (`D4-P5-R1`)

**Files:**
- Modify: the board frame drawer found in Task 0, `src/game/hud/d3HudLayout.ts` (`D4_RUN.board = { radius, lip, stroke }`)
- Test: `tests/game/d4RunHud.test.ts` (new, `node`)

Rules (comment `// D4-P5-R1 rounded tactile board frame, no heavy dark border`):
- The frame = one rounded rect (`D4_RUN.board.radius`, `stroke` px in `look.frame`) plus a 4 px darker bottom lip (`mixInt(frame, ink, t)`, where `t` is a token). It never draws outside `boardRect` + `band.below` (keep the 3 px clear under the mango row from BAND-R1).
- `boardRect` outputs are unchanged (parity test).

- [ ] **Step 1: Write failing tests:** `D4-P5-R1 boardRect parity for hm 640/700/780 (snapshot of x,y,size)` (this one should pass from the start: it is the parity guard); `D4-P5-R1 frame outer extent (stroke + lip) fits inside band.below`; `D4-P5-R1 D4_RUN.board.lip is 4`.
- [ ] **Step 2: Run, expect FAIL** (no `D4_RUN` yet).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: PASS → CHANGELOG, full suite + typecheck, commit** `feat(ui): rounded tactile D4 board frame (D4-P5-R1)`.

---

### Task 4: Flat HudTop, no pink ribbon (`D4-P5-R2`)

**Files:**
- Modify: `src/game/hud/d3HudLayout.ts` (`ribbon` → `level` pill rect; `D4_RUN.top = { pause: 48, pillH, pillFont, bar: { h, radius } }`), `src/game/hud/HudTop.ts`, `src/game/uiTokens.ts` (`d4run.hud.{surface, ink, border, mango, track}` with `mango = #FFC800` and `track = #E5E2DC`)
- Test: `tests/game/d4RunHud.test.ts` (extend)

Rules (comment `// D4-P5-R2 unified flat top bar: white round pause, Level pill, Score pill, flat mango bar`):
- Pause: a flat white circle `48` px (`D4_RUN.top.pause`) with a `border` stroke and a 4 px lip. Same hit container (`pause-button`, same size) and same `bindPress`/`attachFeedback` wiring. Delete the `skinTexture('round','light',…)` gloss.
- Level: a white pill centred where the ribbon was, `Level N` text in `ink` (`FONT_TITLE`, no stroke). The `level` text object keeps the name `'level'` and the MOT-4-R12 slide-in.
- Score: a white pill with the star icon and a tabular number (`fontFeatureSettings` is not available in Phaser, so use a fixed digit advance: pad the measured width to `digits × maxDigitW`, which stops jitter during the tick). `layoutScore`'s right alignment and `point('score')` keep working.
- Mango bar: a flat `Graphics` bar (track `#E5E2DC`, fill `#FFC800`, `radius = h/2`) with no gloss or edge highlight. The `progressBar` API (`set`, `flash`, `edge`) stays as an adapter so `quotaFlash`/MOT-4-R8 keep working; add a `flat: true` option to `progressBar` rather than forking it.
- No `skinTexture(…, 'ribbon', …)` call remains in `src/game/hud/`.
- Public surface unchanged: `pauseButton`, `apply`, `tick`, `point`, `bump`, `scoreText`, `place`.

- [ ] **Step 1: Write failing tests:**
  - `D4-P5-R2 layout exposes a level pill rect and no ribbon` (pure `d3HudLayout(640,false)`).
  - `D4-P5-R2 pause diameter is 48 and the hit rect is unchanged from D3` (parity).
  - `D4-P5-R2 top bar tokens: mango #FFC800 on #E5E2DC, surface white`.
  - `D4-P5-R2 no ribbon skin in the hud sources` (raw glob of `src/game/hud/*.ts`, `not.toMatch(/'ribbon'/)`).
  - Existing `HudTop`/hud scene tests keep passing (adapt only selectors that targeted ribbon images).
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.** CHANGELOG, full suite + typecheck, commit `feat(ui): flat D4 HudTop without pink ribbon (D4-P5-R2)`.

---

### Task 5: Flat SkillButtons and semantic cost badges (`D4-P5-R2`)

**Files:**
- Modify: `src/game/hud/skillLook.ts` (`badgeTone`), `src/game/hud/SkillButtons.ts`, `src/game/uiTokens.ts` (`d4run.badge.{ready: '#1CB0F6', short: '#AFAFAF', text: <dark ink>}`, `d4run.skill.{face, faceOff, lip}`)
- Test: `tests/game/skillLook.test.ts` (extend), `tests/game/d4RunHud.test.ts` (extend)

**Interfaces:**
```ts
// skillLook.ts
// D4-P5-R2 cost badge tone: cyan when affordable, muted gray when short; red is reserved for danger/damage.
export function badgeTone(look: SkillLook): 'ready' | 'short';
```
Rules (comment `// D4-P5-R2 flat round skill buttons, 4px lip, semantic badges`):
- Faces: flat filled circle in the slot tone (or `faceOff`), a 4 px darker lip below (`D4_RUN.skill.lip = 4`), and a pressed state that shifts the face down by the lip (no texture swap). Remove `glossBand`, the mask graphics and the `sweepAt` gloss sweep. The ready edge keeps `motion.release` (pop) and the alpha dip (MOT-4-R11). Under reduced motion there is still no sweep (now trivially).
- Badge: a pill filled with `badge.ready` when `!look.badgeNo`, `badge.short` when `look.badgeNo`, cost text in `badge.text`. **No reference to `tone.danger` in `SkillButtons.ts`.** `shake(slot)` (`denied`) still flashes the badge.
- The rim charge gauge, countdown ring, lock glyph, hit size and `pointerdown` semantics (MEC-007-R14, D3-R1 `onDenied`) stay unchanged.
- Contrast: white on `#1CB0F6` is only about 2.6:1, and white on `#AFAFAF` is about 2.1:1, so white text fails `>= 3:1`. **Default:** the badge text uses a dark ink token `d4run.badge.text` (≈ `#1B3A4B`; tune it until both ratios are `>= 3:1`), and the badge font is ≥ 14 px bold. The test asserts `contrastRatio(badge.text, badge.ready) >= 3` and `contrastRatio(badge.text, badge.short) >= 3`. Record the choice in DECISIONS.

- [ ] **Step 1: Write failing tests:**
  - `D4-P5-R2 badgeTone is ready when affordable and short when not, for both slots`.
  - `D4-P5-R2 badge tokens are #1CB0F6 and #AFAFAF and neither is the danger red`.
  - `D4-P5-R2 SkillButtons source has no danger tone and no glossBand` (raw text check of `SkillButtons.ts`).
  - `D4-P5-R2 skill lip is 4px`.
  - `D4-P5-R2 badge text keeps >= 3:1 on both the ready and short fills`.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.** Run `impact` on `glossBand` and `tapBurst`. Keep `tapBurst` (cast feedback). Delete `glossBand` in Task 8 if this was its last caller. CHANGELOG, full suite + typecheck, commit `feat(ui): flat D4 skill buttons with cyan/muted cost badges (D4-P5-R2)`.

---

### Task 6: Flat energy bar and swipe-hint overlap fix (`D4-P5-R2`)

**Files:**
- Modify: `src/game/hud/d3HudLayout.ts` (pure `hintPlacement`), `src/game/hud/BottomGroup.ts`, `src/game/uiTokens.ts` (`d4run.energy.{fill: '#1CB0F6', track: '#E5E2DC'}`)
- Test: `tests/game/hintPlacement.test.ts` (new, `node`)

**Root cause (measured from current code, 360×640, no D-pad):** the hint rect is `x 100..260`, `y g+42..g+62`. The finger is placed at `hint.cx − 18 − textW/2`, so for a hint text wider than about 124 px the finger tip lands at `x <= 100`, and its body extends to `y ≈ g+48+18`. The left skill (`x 22..100`, `y g..g+78`) has its cost badge anchored bottom-right at about `x 74..104`, `y g+60..g+84`. So the finger body overlaps the badge.

**Interfaces:**
```ts
// D4-P5-R2 first-input finger + hint placement that never enters a skill button or its badge.
export function hintPlacement(l: D3HudLayout, hintW: number, finger: { tip: number; bodyW: number; bodyH: number; gap: number; dy: number }, badge: R[]):
  { hint: { cx: number; cy: number }; finger: { x: number; y: number } } | null; // null when l.hint is null (D-pad)
export function badgeRects(l: D3HudLayout, costW?: number): readonly [R, R];     // badge boxes, same math as SkillButtons.paint
```
Rules:
- Compute the finger box (`tip` circle ∪ body rect, including the `dx` swing amplitude from `balance.motion.d3` finger pose). If it intersects any skill rect or badge rect, first move the finger to the *right* side of the hint text (mirrored). If that also intersects, move it *above* the hint text and centre it horizontally. The hint text itself is clamped to stay between the two skill rects.
- `SkillButtons.paint` and `badgeRects` share one badge-geometry function (no duplicated math).
- Energy bar: flat track `#E5E2DC`, fill `#1CB0F6` via `progressBar(..., { flat: true })` from Task 4. The bolt pulse/pop cues (MOT-4-R10) stay unchanged.

- [ ] **Step 1: Write failing tests:**
  - `D4-P5-R2 finger box never intersects either skill rect or badge at 360x640` (sweep `hintW` from 40 to 200 step 4, and swing extremes `dx` min/max).
  - Same at `360x700` and `360x780`.
  - `D4-P5-R2 hintPlacement is null in D-pad mode`.
  - `D4-P5-R2 badgeRects matches the badge position SkillButtons draws` (shared function identity or equal output).
  - `D4-P5-R2 energy tokens #1CB0F6 on #E5E2DC`.
- [ ] **Step 2: Run, expect FAIL** (the 360×640 overlap reproduces).
- [ ] **Step 3: Implement.** `BottomGroup.placeHint` calls `hintPlacement`. `fingerX/fingerY` come from the result.
- [ ] **Step 4: PASS.** CHANGELOG, full suite + typecheck, commit `fix(ui): swipe hint finger clears the skill badge; flat D4 energy bar (D4-P5-R2)`.

---

### Task 7: Biome 6 Storm HUD legibility pass (`D4-P5-R1`, `D4-P5-R2`)

**Files:** `src/game/uiTokens.ts` (only if a ratio fails), `tests/game/boardContrast.test.ts` (extend)

- [ ] **Step 1: Write failing/guard tests:** for biome 6, `contrastRatio(d4run.hud.ink, d4run.hud.surface) >= 4.5` (pill text); `contrastRatio(d4run.hud.surface, stormBgTop) >= 3` and `>= 3` against `stormBgBottom` (pill edge visible without the outline); `contrastRatio(white, stormBg) >= 4.5` for the energy/quota labels; `d4run.energy.track` vs the Storm background `>= 3` (otherwise give the track a `border` stroke token and test that instead).
- [ ] **Step 2–4:** Tune if needed → PASS → CHANGELOG, full suite + typecheck, commit `test(ui): Storm HUD legibility guards (D4-P5-R1, D4-P5-R2)`.

---

### Task 8: Prune dead D3 Phaser menu, skin and token code (`D4-P5-R3`)

**Files:** candidates from Task 0 Step 3, `src/game/ui/skinPaint.ts`, `src/game/ui/skin.ts`, `src/game/uiTokens.ts`, `tests/game/{d3Tokens,hudTokens,menuTokens}.test.ts`, `tests/game/tokenGuard.test.ts` (allow-list shrink only), `docs/CODEMAP.md`

Procedure (comment at the remaining shim heads: `// D4-P5-R3 thin shim: DOM screen owns the view`):
- [ ] **Step 1:** For each candidate module or export, run GitNexus `impact`. Delete it only if it has zero non-test callers. Delete or move its tests in the same step. Keep the pure models (`resultsView`, `settingsView`, `loadoutView`, `pauseView`, `countdownCard`, `deathLine`, …) and their tests.
- [ ] **Step 2:** In `skinPaint.ts`/`skin.ts` delete recipes with no caller after Tasks 4–6 (expected: `ribbon`, `skill` gloss, `round`/`chip` `light` gloss, `danger` chip, `glossBand` in `touchFx.ts`). Grep `skinTexture(` and `lipPx(` to confirm.
- [ ] **Step 3:** Delete `TOKENS.d3` keys that are no longer read (`ribbon` tone, `bg` ray fields, `cells`/`frame` if fully superseded by `d4run`). Shrink the `WHOLE` set in `tokenGuard.test.ts` to match the deleted sub-trees, and never add to it.
- [ ] **Step 4:** In `d3Tokens.test.ts`, `hudTokens.test.ts`, `menuTokens.test.ts`, delete assertions about deleted keys. Move any still-relevant rule (for example a contrast rule) to `boardContrast.test.ts` or `d4RunHud.test.ts`. Delete a file only when it would be empty.
- [ ] **Step 5: Verify:** `npx vitest run tests/game/tokenGuard.test.ts tests/game/boardContrast.test.ts --configLoader native --pool threads --maxWorkers 2` is green. Then the full suite + typecheck. `npm run build` produces no unresolved import.
- [ ] **Step 6:** Update CODEMAP (removed modules), CHANGELOG. Commit `refactor(ui): prune dead D3 Phaser menus, gloss skins and tokens (D4-P5-R3)`.

---

### Task 9: Chrome QA across 6 biomes (`D4-P5` exit gate)

**Files:** `tmp/qa/d4-p5/` (git-ignored screenshots), `docs/PLAYTEST.md`

- [ ] **Step 1:** `npm run dev`. Hand the scripted QA to the QA worker (agy/Playwright, headless Chrome) with this matrix: biomes 1–6 (use `?debug=1` level jump / `+1` to reach each biome) × viewports `360×640` and `360×780` × D-pad off/on. Capture: the in-run HUD at rest, a skill ready and short (badge cyan vs gray), the first-run steer hint with the finger on a touch emulation, the Storm biome close-up of the HUD pills, plus Pause/Countdown/DeathCard over the new board. Name files `b<n>-<w>x<h>-<dpad|swipe>-<state>.png`.
- [ ] **Step 2:** Assert 0 console errors and 0 page errors per capture (Playwright `console`/`pageerror` listeners). Visual checklist: no rays; a soft checker; snake, mango and hazards clearly readable; no pink ribbon; no red badge; the finger never touches the left badge; the board frame is rounded and not clipped by the band.
- [ ] **Step 3:** Triage findings (fix in this branch with a `fix(ui): D4-P5 QA …` commit, each with a test where the rule is pure). Record the evidence in `docs/PLAYTEST.md` (latest entry). Commit `docs: D4-P5 Chrome QA evidence`.
- [ ] **Step 4:** Ask the owner for the browser + mobile playtest sign-off (60 fps steering, cohesive D4 polish). Do not merge before the sign-off.

---

### Task 10: Close-out and merge to `version/v0.3`

- [ ] **Step 1:** Update `docs/STATUS.md` (≤ 60 lines; D4 rollout complete; next = phase exit `version/v0.3` → `dev`), `docs/DECISIONS.md` (badge text contrast choice, `d4run` token group, finger placement fallback order), `docs/CODEMAP.md` (final D4 architecture: DOM screens/overlays + Phaser board/HUD), `docs/README.md` (mark UI-D4-P5-PLAN status), `CHANGELOG.md`.
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`, one after the other. Both must pass. Use superpowers:verification-before-completion and paste the counts into the task notes.
- [ ] **Step 3:** superpowers:requesting-code-review on the branch diff, then address the findings.
- [ ] **Step 4:** `git checkout version/v0.3` → `git merge --no-ff feat/d4-p5-ingame-harmonization` → full suite + typecheck again on the merged tree. No push. Remove the task worktree if one was used (remove the `node_modules` junction first; never `--force`).
- [ ] **Step 5:** Refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

## Self-Review Checklist

- [ ] R1: no rays (Task 1); softened checker + 6×5×11 matrix + Storm (Tasks 2, 7); rounded frame (Task 3).
- [ ] R2: flat HudTop without ribbon, `#FFC800`/`#E5E2DC` (Task 4); flat skills + cyan/muted badges, no red (Task 5); energy `#1CB0F6` + finger overlap fixed at 360×640 (Task 6).
- [ ] R3: dead D3 menus, gloss skins and tokens pruned, tokenGuard strict and green, token tests adapted, maps updated (Tasks 8, 10).
- [ ] Exit gate: full suite + typecheck, 6-biome Chrome QA at 360×640/360×780 with 0 console errors, owner sign-off, `--no-ff` merge to `version/v0.3` (Tasks 9, 10).
