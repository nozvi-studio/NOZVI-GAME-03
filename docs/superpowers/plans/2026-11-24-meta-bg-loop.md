# Meta Animated Background (`BgLoop` / Rigby2D) Implementation Plan

Spec: `docs/superpowers/specs/2026-11-24-meta-bg-loop-design.md`

## Tasks
1. **Assets & Vendored Runtime:**
   - Copy `phaser/demo/assets/*` → `public/bg/marsh-loop/`.
   - Copy `phaser/vendor/rigby2d-phaser-0.5.1.mjs`, `LICENSE-MIT`, `LICENSE-APACHE`, `THIRD_PARTY_NOTICES.md` → `src/game/vendor/rigby2d/`.
   - Add `src/game/vendor/rigby2d/rigby2d-phaser-0.5.1.d.ts` typing `rigbyPhaser`.
2. **TDD `coverFit.ts`:**
   - Write `tests/game/bg/coverFit.test.ts` (540×960, 540×1200, wider/square viewports, zero guard).
   - Implement `src/game/bg/coverFit.ts` and pass test.
3. **Implement `BgLoop` & `MetaBgScene`:**
   - Port `phaser/src/bg_loop.js` to strict TypeScript in `src/game/bg/bgLoop.ts`.
   - Create `src/game/scenes/MetaBgScene.ts` (WebGL guard, async preload, `coverCamera` + resize sync, `sendToBack`, `loaderror` guard, `'meta-bg-ready'` event).
4. **TDD `UiHost` & `PhaserPort` coordination:**
   - Add tests to `tests/game/dom/uiHost.test.ts` for `setMetaBg` live mode, Reduce Motion live toggle, and screen unmount cleanup.
   - Add test verifying `createPhaserPort` ignores `'MetaBg'` in `activeScene()`.
   - Update `src/game/dom/uiBridge.ts`, `src/game/dom/uiHost.ts`, `src/game/scenes/phaserPort.ts`, `src/game/main.ts`, and `src/game/dom/styles/mystic.css`.
5. **Verification:**
   - Run `npm test`, `npm run typecheck`, `npm run build`.
   - Run headless Chrome QA via `tools/qa/shot.mjs` on meta screens & gameplay, verify zero console errors and inspect screenshots.
6. **Docs & Close-out:**
   - Update `docs/DECISIONS.md` (vendored Rigby2D runtime), `docs/CODEMAP.md`, `docs/README.md`, `docs/STATUS.md`, `CHANGELOG.md`.
   - Commit changes cleanly and refresh GitNexus index in background.
