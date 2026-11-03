# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Claude Code (lead) **Milestone:** M1 — P0 execution starting · **Version branch:** `version/v0.1`

## Now (in progress)
- [ ] P0 Task 1 (scaffold) on `chore/p0-scaffold` from `version/v0.1` — waiting for owner approval of `npm install`.

## Next (ordered, max 5)
1. Branch rule: AGENTS §6 (task branch from `version/v0.1`, merge back with --no-ff, no PR).
2. Execute P0 plan `docs/superpowers/plans/2026-11-03-p0-foundation.md` Task 1 (scaffold) — **owner approves `npm install`**; verify TS 7.0.2 (fallback 6.0.3), Phaser 3.90.0 + Vite 8 build.
3. P0 Tasks 2–9, one branch each (subagent-driven-development + TDD); P0 exit = parity + phone check (owner 5-minute phone test).
4. P1 plan (10 PRs) → P1 exit playtest: 5 testers (**owner recruits**).
5. P2a plan (9 PRs) → at P2a exit write MEC-013…018 + P2b/P2c plans (P2-D1).

## Phase gates (who checks)
- P0 exit: tests/typecheck + Playwright QA + prototype parity; owner phone check.
- P1 exit: `summarizeLog` + PLAYTEST gate (≥3/5 replay ≥3×, skills in ≥50% runs).
- P2a exit: bot report L7–L15 (lead). P2 exit: all 30 levels, no cause > 40% (owner approves).
- Before P3: owner approves art style tile (GDD §10.1). Before P4/P5: published drop odds, target web portals (§13).

## Blockers / open questions for human
- OPEN (not blocking P0–P2): target web portals (before P5) §13; session-length targets §4; reason to come back tomorrow §8.3.
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- Prototype is a ~1000-line single file, reference for the P0 port; frozen at P0 Task 9.
- P0/P1 keep prototype `terrainNearHeadDist` 3; raised to 4 in P2a Task 3 (re-baseline goldens).

## Last session summary
- What was done: reviewed aborted planning work; finished P0 plan (Tasks 5–9) and P1 plan (Tasks 9–10) via subagents; cross-doc conflict review (12 findings) and fixes (shared HazardFamily vocabulary, ARCHITECTURE owns step order, run log in src/session, `main`→`master` branch base); owner decided 3 GDD rule items (base-tick warn, 3 families in biomes 4–5, terrain near-head 4); docs map, DECISIONS, CHANGELOG updated.
- Last verified step: grep shows no `HAZARD_ORDER`/`HazardKey`/`countsTowardCap`/`<!-- CONTINUE -->` left in docs. Docs only, no code.
- Committed on `version/v0.1-design` (dd28b34) and `version/v0.1`; `dev` created from `master`.
- Gotchas: local `main` = old Ant Trail project; never branch from it (rule: AGENTS §6). `phaser@latest` is 4.x; pin 3.90.0.
