# STATUS - project memory

**Updated:** 2026-11-05 by Codex **Milestone:** M1 - P1 gate PASSED; P2 content starting. **Version branch:** `version/v0.2`

## Now
- P2a Task 1 implemented on `feat/p2a-ground-tiles` in the supplied `p2a` worktree; all changes intentionally uncommitted.
- Per-family lists now live in `SimState.families`; serialized timed spawn order preserves P1 events and snapshot fields.
- State-level registry descriptors and solid/BFS/reserved/tile/head-hit composites are implemented; Shield and existing fixture readers migrated.
- README already has Approved P2-DESIGN, MEC-004 and MEC-012 rows. CODEMAP, ARCHITECTURE, CHANGELOG and DECISIONS updated.

## Next
1. Lead reviews the uncommitted Task 1 diff and its adaptations in DECISIONS; commit/integrate separately when authorized.
2. Execute P2a Task 2 collision pipeline, including update-time HitCtx dispatch; then remaining P2a tasks.
3. Continue P2b/P2c and their phase-exit checks as recorded in the approved plans.

## Blockers
- No Task 1 implementation blockers. Local GitNexus runner is missing; installed analyze fallback fails with spawn EPERM. Connected index supplied impact evidence.
- GDD MEC-012 row awaits the lead approval required by the brief; GDD is untouched.
- Existing 4 skipped tests and 12 todo tests remain unchanged. Windows Vitest requires native config loader and two thread workers.

## Last session
- TDD: state-layout test failed before migration; requested query suite failed on the missing module before implementation.
- Step 0 full suite: 804 passed. Final Task 1 suite: 815 passed, 4 skipped, 12 todo across 77 files; typecheck passed.
- Read-only independent review found no Critical/Important issues; its one Minor tautological assertion was replaced with a descriptor count check.
- No installs, commits, merges, pushes, dependency changes or protected-file edits. No browser visual QA or phase-exit fuzz requested/run.
