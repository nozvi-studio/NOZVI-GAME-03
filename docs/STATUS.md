# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-03 by Claude Code **Milestone:** M1 — core loop playable

## Now (in progress)
- [ ] Owner review of the ruleset setup (this PR) and the OPEN items in `docs/GDD.md`

## Next (ordered, max 5)
1. Owner answers the OPEN items in GDD §1, §3, §4, §10, §13 (reference games, target player, platform, skill input, art references).
2. Decide the production stack (TS + Canvas / Phaser / Godot) → DECISIONS entry → fill AGENTS §1 test/lint commands.
3. First playtest of the current prototype (5 testers, no instructions) → create `docs/PLAYTEST.md`.
4. Add a local run log (level, score, cause, duration) to support the playtest.
5. Only if M1 exit criterion passes: write MEC-006 (stamina + skills) and MEC-005 (wrap zones) specs.

## Blockers / open questions for human
- GDD OPEN items above block gameplay code in those sections (AGENTS §5).
- Superpowers is declared in `.claude/settings.json` but not installed in the cloud session used for setup; future agent sessions must confirm it is available or get approval to run the steps manually (AGENTS §4).
- `.claude/settings.json` permissions are not yet verified in a live session (ruleset note).
- Commit `9fe2bb0` on `master` was authored as "Claude"; later commits use the owner's GitHub account.

## Known issues / tech debt
- Prototype is a ~1000-line single file with global state and no tests.
- `MIN_MS` (95 ms) is never reached.
- Mango rot floor (4 s) is reached around level 5; pressure is flat after that.

## Last session summary
- What was done: applied ruleset 0.3.1 Setup files; condensed earlier docs into the GDD; removed duplicate docs and CSVs.
- Last verified step (command + result): prototype loaded in headless Chromium via `python3 -m http.server`, clicked Play, turned once — run started, 0 console errors.
- Commands that failed / work left uncommitted (check `git status`): none.
- What was learned / gotchas: wrap zones (MEC-005) will require the reachability BFS and fairness checks to use a shared wrap helper.
