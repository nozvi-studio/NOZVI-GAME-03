# STATUS - project memory

**Updated:** 2026-11-19 by Claude (lead, cloud session) **Milestone:** M2 P3 on `version/v0.3` (UI D3 U0..U6 done, U7 next); P2 exit (v0.2) waits on the owner playtest. **Work branch this session:** `ccr-e8439e06-xspfcy` (= `version/v0.3` + the commits below; merge it back into `version/v0.3`).

## Now (in progress)
- [x] 2026-11-19 cloud session: baseline v0.3 1840 pass; terrain A/B bot report (20 seeds, PLAYTEST); owner rulings batch (DECISIONS 2026-11-19); eye-check pack `tmp/qa/eyecheck-2026-11-19/INDEX.md` + driver `tools/qa/eyepack.mjs`; fixed the invulnerable-blink dots (owner "Invisibility" bug, DECISIONS). 1842 pass, typecheck clean.
- [ ] **RESUME HERE (U7):** write the U7 plan (audit + exit) from the roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` §U7 and get owner approval before code. Known items: Loadout back/go/title not repositioned on resize; Pause checkpoint chip drawn twice (U5); Loadout boundary tests hm 641-700; HudScene banner wiring test; d3 texture key count; U2 Task 5 sharpness spike (non-blocking). Eye-check pack findings: finger glyph covers "Swipe to steer!" letters; reduced-motion ice banner cut with an ellipsis; debug "Export log" peeks behind Home chips; checkpoint card lines tight.
- Process: Superpowers is not installed in cloud sessions; owner approved manual design -> plan -> TDD -> verify (2026-11-19).

## Next (ordered, max 5)
1. U7 plan -> owner approval -> execute -> P3 exit device pass (owner).
2. Owner P2 exit playtest log (normal runs, checkpoint L10, >= 30 runs, >= 10 reaching biome 4) -> deathCauseReport verdict; biome 4 coconut (81-100% of bot deaths) is the first tuning candidate (lead tunes per OQ-C5).
3. P4a skins (plan `docs/superpowers/plans/2026-11-16-p4a-skins.md`, 8 tasks, owner approved).
4. Home PLAY-only (owner approved direction 2026-11-19): spec impact pass first (GDD §3/§3b/§6.4/§10.3, MEC-007, MEC-008).
5. Owner backlog 2026-11-17: redesign terrain `b4s2` Avalanche Steps; new Shield effect (replace the blinking circle).

## Owner eye-checks pending (pictures in `tmp/qa/eyecheck-2026-11-19/`)
- U4c chevron, flash, skill-ready sweep, trail (too short-lived headless: device check); U5 cards, death lines, Results; U6 Loadout/Settings, toggle slide; MOT numbers in `balance.motion` / `juice.events`; terrain change L7->L8 and banner; L13/L28 boards; Shield breach feel; BAND-R1 skill pills on the top board rows.
- P3 exit on a device: 60 fps mid-range phone, 5" readability at 360x640, death vignette, tap-skip feel.

## Owner questions still open (strings and small rulings, review with the P3 UI pass)
- Provisional strings: death lines, Settings/Results/HUD copy, Shield/Mango Rain cards, `banner.terrain`, terrain death lines, Task 9 strings, `hud.wait.touch`.
- P3b-3 C1-C10, U4a R1-R6, U5/U6 rulings (DECISIONS); D-pad raise cap; dark card edge (dark theme parked).
- ART-003 skin guide Q1-Q3.

## Known issues / tech debt
- Full fuzz matrix (`npm run test:fuzz`) never finished: 2026-11-19 cloud run lost to container restarts (`rock` passed, 1437 s). Run it on a stable machine.
- L28 clears 4/20 with terrain vs 11/20 without (only outlier; recheck if the playtest agrees).
- Headless: CDP touch does not reach Phaser (eyepack injects mouse events); debug "+1" tap does not register (use `window.__game.registry.get('session').debugSkipTo(n)`).
- Windows: Vitest needs --configLoader native --pool threads --maxWorkers 2; under host load use `--maxWorkers 1`.
- 4 skipped QA (reasons in files). Single 1.28 MB JS chunk. Checkpoints only reach L12 (QA via `?debug=1&level=N`).
- MEC-019-R14 open question: invulnerability after a Shield hit on a normal hazard stays "no" (owner 2026-11-19).

## Last session summary
- 2026-11-19 (cloud lead): see Now. Container restarted four times; work survived because every step was committed and pushed to the session branch.
- 2026-11-17 (local lead): `feat/fixed-terrain` (MEC-019) and `docs/p4a-skins` merged into version/v0.3; owner backlog notes.
- 2026-11-16 (local lead): MEC-019 built (7 tasks), terrain lag fix (earcut radius clamp), BAND-R1 banner band, U6 merged, P4a design + plan.
