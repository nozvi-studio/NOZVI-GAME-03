# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-05 by Claude Code (lead) **Milestone:** M1 — P0 done (phone run pending), P1 next · **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1–9 merged into `version/v0.1` (core, meta, Phaser board/HUD/input/audio, QA suites, PLAYTEST, prototype frozen).
- [ ] P0 exit: owner 5-minute phone run (`npm run dev -- --host`) → fill the Phone column in `docs/PLAYTEST.md`.
- [ ] P1 execution: plan `docs/superpowers/plans/2026-11-03-p1-core-loop.md` (10 PRs).

## Next (ordered, max 5)
1. Merge `version/v0.1` → `dev` at P0 exit (after the owner phone run, or with owner approval).
2. P1 Tasks 1–10, one branch each from `version/v0.1` (Codex/Claude implement, agy QA).
3. P1 exit playtest: 5 testers (**owner recruits**); gate via `summarizeLog` + PLAYTEST.
4. P2a plan (9 PRs) → at P2a exit write MEC-013…018 + P2b/P2c plans.

## Phase gates (who checks)
- P0 exit: tests/typecheck + QA + prototype parity (desktop done); owner phone check (open).
- P1 exit: `summarizeLog` + PLAYTEST gate (≥3/5 replay ≥3×, skills in ≥50% runs).
- P2a exit: bot report L7–L15 (lead). P2 exit: all 30 levels, no cause > 40% (owner approves).
- Before P3: owner approves art style tile (GDD §10.1). Before P4/P5: published drop odds (§13).

## Workers and QA process
- Feature code: Codex (`delegate-workers` codex-task.sh) or Claude subagent, chosen per task.
- agy = dedicated tester only: derives black-box cases from MEC specs, writes `tests/qa/` + browser checks; never feature code.
- Lead triages QA failures: code bug → implementer; test error → agy; spec gap → owner. See DECISIONS 2026-11-05.

## Blockers / open questions for human
- Owner phone run for P0 (see PLAYTEST 2026-11-05).
- Spec ambiguities from QA (not blocking): `pick([])`, `chance(p)` outside [0,1], `reachable()` when target is a wall, `parseBalance` unknown keys, `nearHead` front lane past the board edge.
- OPEN: session-length targets §4; reason to come back tomorrow §8.3.

## Known issues / tech debt
- Levels 3–7 hazards (fence, ground, maze) and their banners not yet visually checked in the browser (no level-skip; P1 `startLevel` can enable it).
- `npm test` takes ~10.3 s (target < 10 s).
- QA-T2-17 (MEC-004-R13 warn bound) skipped until P2a.
- `vite.config.ts` / `vitest.config.ts` are not type-checked (need `@types/node`).
- Host low on memory once (2026-11-04): run heavy workers one at a time; agy uses one browser instance.

## Last session summary
- What was done: P0 Tasks 3–9 implemented (Codex), each independently QA'd by agy (unit + browser), triaged and merged; desktop parity check recorded; prototype frozen.
- Last verified step: on `docs/p0-parity`, `npm test` 369 pass / 1 skip / 2 todo, `test:fuzz` pass, typecheck and build exit 0.
- Gotchas: local `main` = old Ant Trail project; never branch from it. Docs use CRLF; no Python on this machine (use Node). Close the shell/IDE handle before removing a worktree on Windows.
