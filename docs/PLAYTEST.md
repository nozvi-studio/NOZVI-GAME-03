# PLAYTEST — evidence log

> Newest entry first. AI: read the latest entry only (AGENTS §2b).

## 2026-11-05 — P0 parity: Phaser build vs prototype
- Build: commit `23dd42e`, Phaser 3.90.0, TypeScript 7.0.2. Automated: `npm test` 369 tests in 10.3 s (target < 10 s, slightly over); `npm run test:fuzz` PASS (27.4 s); typecheck and build exit 0.
- Devices: desktop headless Chrome 156 / Windows 11, 1280×800 (independent tester agy, light, dark, reduced motion); phone: owner run 2026-11-04 — **pass** (owner: plays OK, UI matches the original prototype HTML; reported as a whole, not per row).
- Saves: old prototype saves (best score `mango-snake-hard2-best`, sound `mango-snake-sound`) are **not** carried over (design §8). New key `mango-snake.save`.

| Check (design §7.4) | Desktop | Phone | Notes |
|---|---|---|---|
| Start / pause / resume / countdown flow | pass | | Space/P/Esc pause; resume runs countdown |
| Turning feel, buffered double turns, no reverse | pass | | |
| Eating, growth, golden mango | pass | | golden rule also covered by core tests |
| Rot ring and rotten rock | pass | | |
| Level bar and banners at levels 3, 5, 7 | not reached | | no level skip in build; covered by core + QA tests |
| Rocks: appear, warn, land, avoid snake, crumble | pass | | |
| Fences: same | not reached | | unlock L3; covered by core + QA + fuzz |
| Hedge mazes: same | not reached | | unlock L7; covered by core + QA + fuzz |
| Rising ground: same, waits for the snake | not reached | | unlock L5; covered by core + QA + fuzz |
| Death causes and texts (all 7 + board full if reached) | pass | | edge death seen live; all 7 strings match prototype (QA-T8) |
| Best score kept after reload | pass | | |
| Sound toggle kept after reload | pass | | |
| Reduced motion; dark scheme | pass | | |
| No console errors | pass | | Phaser banner + seed `console.info` only |

- Differences found: HUD/overlays drawn as Phaser objects (intentional, design D3/§7.1); 1 ms fixed-step timing (accepted, design §4); new save envelope (intentional, design §8). Bugs: none.
- Verdict: P0 exit criteria (design §1) **met** (desktop + owner phone run); open: a visual check of levels 3–7 hazards (no level-skip hook; consider a dev-only start-level option in P1, which adds `startLevel` anyway).
