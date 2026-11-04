# Docs map (read this instead of scanning docs/)
Updated: 2026-11-04

## 1. Document index
Only files listed here exist. Status: Draft / Approved / Deprecated.
| ID | File | Owns (source of truth for) | Status |
|---|---|---|---|
| GDD | `docs/GDD.md` | Product intent, scope, milestones, mechanics index | Draft |
| STATUS | `docs/STATUS.md` | Current state, next steps, blockers | — |
| CODEMAP | `docs/CODEMAP.md` | Where code lives, module boundaries, entry points | — |
| DEC | `docs/DECISIONS.md` | Technical/design trade-offs (ADR-lite) | — |
| — | `CHANGELOG.md` | History | — |
| P0-DESIGN | `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` | P0 architecture, port behavior of MEC-001…004 (prototype rules), test strategy, pinned versions | Approved |
| P0-PLAN | `docs/superpowers/plans/2026-11-03-p0-foundation.md` | P0 task-by-task implementation plan (9 PRs) | Approved |
| P1-DESIGN | `docs/superpowers/specs/2026-11-03-p1-core-loop-design.md` | P1 new core loop design, delivery order, playtest protocol | Approved |
| P1-PLAN | `docs/superpowers/plans/2026-11-03-p1-core-loop.md` | P1 implementation plan (10 PRs) | Approved |
| P2-DESIGN | `docs/superpowers/specs/2026-11-03-p2-content-design.md` | P2 umbrella design (P2a/P2b/P2c), changes to P1 specs | Approved |
| P2A-PLAN | `docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md` | P2a implementation plan (family framework, mud, ice) | Approved |
| ARCH | `docs/ARCHITECTURE.md` | Module boundaries, time model, Sim step order | Draft |
| PLAYTEST | `docs/PLAYTEST.md` | Playtest evidence | — |
| MEC-001 | `docs/specs/mechanics/MEC-001-snake.md` | Snake movement, growth, self-collision, length reset | Approved |
| MEC-002 | `docs/specs/mechanics/MEC-002-mango.md` | Mango placement, golden, rot, rotten rock | Approved |
| MEC-003 | `docs/specs/mechanics/MEC-003-levels-biomes.md` | 30 levels, quotas, speed, transition, run log | Approved |
| MEC-004 | `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` | Obstacle family framework, director, fairness | Approved |
| MEC-006 | `docs/specs/mechanics/MEC-006-energy-skills.md` | Energy orbs, energy bar, 4 skills | Approved |
| MEC-007 | `docs/specs/mechanics/MEC-007-loadout.md` | Skill loadout | Approved |
| MEC-008 | `docs/specs/mechanics/MEC-008-checkpoints.md` | Checkpoints, energy carry-over, save v2 | Approved |
| MEC-012 | `docs/specs/mechanics/MEC-012-ground-tiles.md` | Mud and ice ground tiles | Approved |
<!-- Add rows as specs are created, e.g.:
| MEC-001 | `docs/specs/mechanics/MEC-001-jump.md` | Exact jump rules | Approved |
| INT-001 | `docs/integrations/INT-001-analytics.md` | Analytics events, consent | Draft |
-->

## 2. Routing: what to read per task
Read the "First" column; open "Then" only if the task needs it. Never read every file.
| Task | First | Then (only if needed) |
|---|---|---|
| New gameplay feature | GDD (relevant § only), STATUS | MEC spec, CODEMAP module row, related tests |
| Gameplay bug | MEC spec (or GDD §) for that behavior | CODEMAP module row → that module's files + tests |
| Balance / tuning | GDD §7, balance config | MEC spec §9 |
| Refactor | CODEMAP, ARCHITECTURE | DECISIONS (grep topic), module tests |
| UI / juice | GDD §6, §10 | CODEMAP ui row |
| Analytics / ads / SDK | INT spec | GDD §9, §12; CODEMAP integrations row |
| Playtest follow-up | PLAYTEST (latest entry only) | GDD §12 |
| Release | STATUS, CHANGELOG [Unreleased] | Test results, INT specs |

## 3. Requirement IDs
IDs (GDD-§n, MEC-xxx, INT-xxx) appear in specs, in test names and in a one-line comment at the main implementing function, so `grep -r "MEC-001"` finds spec, code and tests without scanning.
