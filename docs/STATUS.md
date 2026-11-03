# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Claude Code (lead) **Milestone:** M1 — P0 execution · **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Task 1 (scaffold) done, merged into `version/v0.1` (TS 7.0.2 kept; see DECISIONS 2026-11-04).

## Next (ordered, max 5)
1. P0 Task 2 (balance config, parseBalance, RNG, core types, grid/BFS) on `feat/p0-balance-core` from `version/v0.1` — plan `docs/superpowers/plans/2026-11-03-p0-foundation.md`.
2. P0 Tasks 3–9, one branch each (subagent-driven-development + TDD), merge back with `--no-ff`.
3. P0 exit = tests/typecheck + Playwright QA + prototype parity + owner 5-minute phone test.
4. P1 plan (10 PRs) → P1 exit playtest: 5 testers (**owner recruits**).
5. P2a plan (9 PRs) → at P2a exit write MEC-013…018 + P2b/P2c plans (P2-D1).

## Phase gates (who checks)
- P0 exit: tests/typecheck + Playwright QA + prototype parity; owner phone check.
- P1 exit: `summarizeLog` + PLAYTEST gate (≥3/5 replay ≥3×, skills in ≥50% runs).
- P2a exit: bot report L7–L15 (lead). P2 exit: all 30 levels, no cause > 40% (owner approves).
- Before P3: owner approves art style tile (GDD §10.1). Before P4/P5: published drop odds (§13).

## Blockers / open questions for human
- OPEN (not blocking P0–P2): session-length targets §4; reason to come back tomorrow §8.3.
- Decided 2026-11-04: publish target = GitHub Pages (GDD §13); Vite `base` set at deploy time.
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- Prototype is a ~1000-line single file, reference for the P0 port; frozen at P0 Task 9.
- P0/P1 keep prototype `terrainNearHeadDist` 3; raised to 4 in P2a Task 3 (re-baseline goldens).
- `vite.config.ts` / `vitest.config.ts` are not type-checked (need `@types/node`, not allowed in P0).
- Task 1 browser console check (Step 12) only verified by build + HTTP 200 on preview; full console check falls to Playwright QA (agy) at P0 exit.

## Last session summary
- What was done: P0 Task 1 scaffold (package.json pinned, tsconfig, Vite/Vitest config, index.html, hello scene, GDD-13 boundary scanner + 3 tests, ARCHITECTURE.md); fixed version-independent typecheck failures (owner-approved shim + config exclusion); recorded GitHub Pages as publish target.
- Last verified step: `npm test` 3/3, `npm run typecheck` exit 0, `npm run build` exit 0.
- Gotchas: local `main` = old Ant Trail project; never branch from it (AGENTS §6). `phaser@latest` is 4.x; pin 3.90.0. Repo docs use CRLF: edit with tools that keep line endings. No Python on this machine; use Node for scripts.
