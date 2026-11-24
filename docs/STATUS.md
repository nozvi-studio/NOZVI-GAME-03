# STATUS - project memory

**Updated:** 2026-11-24 **Milestone:** Mystic Aqua Marsh visual reskin + live Rigby2D animated meta background implemented on `feat/d4-art-direction-reskin` (stacked on `feat/d4-p5-ingame-harmonization`); **NOT merged** (`version/v0.3` untouched). **Version branches:** `version/v0.3` (P3/P4a), `version/v0.2` (P2 exit).

## Now (in progress)
- [x] **Mystic Aqua Marsh Reskin + Animated `MetaBgScene` (`feat/d4-art-direction-reskin`):**
  - Reskinned all 5 DOM meta screens (`Home`, `Settings`, `Characters`, `Results`, `Loadout`), in-game overlays (`Countdown`, `Pause`, `DeathCard`), and 6-biome Phaser gameplay board/HUD (`Aqua Marsh`, `Berry Jelly`, `Mint Frost`, `Sunny Pop`, `Indigo Plaza`, `Cosmic Fruit`).
  - Integrated Rigby2D animated Aqua Marsh background (`MetaBgScene`, `BgLoop`, `coverFit`, vendored `src/game/vendor/rigby2d/rigby2d-phaser-0.5.1.mjs`, `public/bg/marsh-loop/`) running continuously across all 5 DOM meta screens, sleeping during `GameScene`, and falling back to static `aqua-marsh.webp` on Reduce Motion or non-WebGL (`META-BG-R1..R7`).
  - Verified full Vitest suite, `tsc --noEmit`, `vite build`, and headless Chrome QA (`tmp/qa/meta-bg/`).
- [ ] **Owner LAN/mobile playtest sign-off** before merging stacked D4 + Mystic branch into `version/v0.3`.
- [ ] **P2 exit (`version/v0.2`):** waiting on owner normal-run playtest log (>= 30 runs, >= 10 reaching biome 4, no `?debug=1`) + overnight full fuzz (`npm run test:fuzz`).

## Next (ordered, max 5)
1. Owner playtest sign-off on full D4 + Mystic UI + animated `MetaBgScene` -> merge `feat/d4-art-direction-reskin` into `version/v0.3` with `--no-ff`.
2. Reskin in-game hazard art (`rock` Spiky Puff, `fence` Blocky Jellies, `terrain` Pop-up Cubes, `bomb` Pop Bomb) per `docs/design/mango_snake_art_direction_style_tokens.md` §4.
3. Optional D3 dead-code sweep (legacy Phaser menu widgets/tokens) after merge sign-off.
4. P4b (MEC-009 marbles, MEC-010 marble machine) — **blocked** on owner choice of marble slot odds (mockups `2 / WHEEL 15% / SKIN 5% / 5 / 2` vs GDD §8.2 `10 / 25 / Mystery / 25 / 10`).
5. P2 exit playtest verdict + overnight full fuzz -> merge `version/v0.2` and `version/v0.3` into `dev`.

## Blockers / open decisions
- **D4 + Mystic merge gate:** awaiting owner LAN/mobile playtest sign-off.
- **P4b blocker:** marble machine slot odds mismatch between mockups and GDD §8.2 (DECISIONS 2026-11-16).
- **Batched owner questions:** provisional strings (P3, MEC-019, MEC-011), Shield normal-hit invulnerability, skill pills vs banner band position.

## Known issues / tech debt
- Windows Vitest needs `--configLoader native --pool threads --maxWorkers 2` (`--maxWorkers 1` under load). Do not run Chrome QA and fuzz/bot together.
- `git checkout` / `git commit` / `npm install` require `BypassSandbox: true` on Windows due to `.git/` lock & npm cache permissions.

## Last session summary
- 2026-11-24: Integrated Rigby2D animated Aqua Marsh background (`MetaBgScene`, `src/game/bg/bgLoop.ts`, `coverFit.ts`, `src/game/vendor/rigby2d/`, `public/bg/marsh-loop/`) across all 5 DOM meta screens on `feat/d4-art-direction-reskin` with live Reduce Motion / non-WebGL fallback and automatic sleep during `GameScene`. Verified with full Vitest suite, `tsc --noEmit`, `vite build`, and headless Chrome QA (`tmp/qa/meta-bg/`).
