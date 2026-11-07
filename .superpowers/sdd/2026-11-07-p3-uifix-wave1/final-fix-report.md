# UIFIX wave 1 final-review fixes
1. snake.ts: added SNAKE_BODY_CELL (0.78) and SNAKE_HEAD_CELL (0.46), used by rim and body/head drawing.
2. HudTop.ts: no arrow icon exists in hudIcons, so the 'wait' chip shows no icon and text shifts left (exported chipHasIcon; chip key includes kind). Test: tests/game/hudChip.test.ts (UIFIX-R3).
3. HudScene.ts: removed `case 'begin': break;`; typecheck passes.
4. hudLayout.test.ts: new UIFIX-R2 test (board clamp always; bubble bottom <= groupTop when gap fits). hud.test.ts MEC-006 test renamed to include UIFIX-R2. skillTipPlacement unchanged.
5. PauseOverlay.ts: themeOf(currentPalette()) computed once as `mode`.
Output: hudChip/hudLayout/hud tests 39 passed; typecheck clean; full npm test 1416 passed, 7 skipped.
