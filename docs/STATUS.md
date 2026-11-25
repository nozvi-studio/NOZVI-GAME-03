# STATUS - project memory

**Updated:** 2026-11-25 **Milestone:** Rigby2D snake hero. **Branch stack:** `version/v0.3` <- `feat/d4-art-direction-reskin` (13 commits, unmerged) <- `feat/snake-rigby-head` (`9843631`, ANIM-SNAKE-R1..R7, committed) <- `feat/snake-rigby-meta` (same tip + uncommitted ANIM-SNAKE-R8..R12: 20 files + 2 new tests). **Version branches:** `version/v0.3` (P3/P4a), `version/v0.2` (P2 exit).

## Now (in progress)
- [x] **Rigby2D snake head in gameplay (`feat/snake-rigby-head`, committed `9843631`):** animated head idle/eat/dead with static fallback (ANIM-SNAKE-R1..R7). Not merged into `feat/d4-art-direction-reskin` yet; `feat/snake-rigby-meta` builds on it.
- [x] **Rigby2D Snake Hero on DOM Meta Screens (`feat/snake-rigby-meta`, uncommitted):**
  - Added unzoomed `heroCam` overlay in `MetaBgScene` reusing `SnakeRig.createOverlay()` / `snakeRigModel` (`metaHeroPlacement`, `balance.ui.snakeRig.metaHeadFrac`/`metaFeetFrac`) aligned to DOM hero rects (`Home`, `Characters`, `Results` new best, `Loadout`) for the `snake` skin (`idle`, `poke`, `celebrate`, `denied`), driven via `MetaHeroPort` in `uiBridge`/`bridge`/`phaserPort` with zero Phaser imports in `src/game/dom/`.
  - Hides only `.d4-hero[data-qa="hero-snake"] .d4-hero-img` when `#ui-root.d4-live-bg.d4-live-snake-hero` is active; falls back cleanly to DOM portrait on Reduce Motion, non-WebGL, or non-`snake` skins; sleeps automatically during `GameScene`.
  - Verified `npm run typecheck` (0 errors) and full Vitest suite (`253 passed | 1 skipped`, `2035 passed`).
- [ ] **Blocked on `vite build` & headless Chrome QA (`feat/snake-rigby-meta`):** `node_modules/.bin` and `node_modules/@rolldown/binding-win32-x64-msvc/package.json` are missing in the workspace (last modified externally at 23:52), blocking `vite build` / `vite` dev server until `npm install` is run by the owner.
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
- 2026-11-25: Status review only (no code). Confirmed branch stack above; `node_modules/.bin` still missing (owner `npm install` needed); GitNexus index refreshed. Untracked `docs/design/mystic/challenge/` is not yet documented.
- 2026-11-24: Implemented Rigby2D snake head on DOM meta screens (`ANIM-SNAKE-R8..R12`) on `feat/snake-rigby-meta` (uncommitted): extended `snakeRigModel`/`SnakeRig` with `metaHeroPlacement` + `createOverlay`/`updateOverlay`, added unzoomed `heroCam` overlay in `MetaBgScene`, wired `MetaHeroPort` through `uiBridge`/`bridge`/`phaserPort`/`uiHost`/`main`, bound `Home`/`Characters`/`Results`/`Loadout`, updated `CODEMAP`/`CHANGELOG`/`DECISIONS`, and verified `tsc --noEmit` + full Vitest suite (2035 passed). `vite build` and headless Chrome QA are blocked on missing `node_modules/.bin` and `@rolldown/binding-win32-x64-msvc/package.json` (needs owner `npm install`).
