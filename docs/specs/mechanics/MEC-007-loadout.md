# MEC-007 — Skill loadout

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- GDD: §2.2 (session loop: pick 2 skills), §3 (skill buttons, keys, "Play → loadout → countdown", 1-tap confirm), §3b (first run skips the loadout; staged unlocks), §4 (restart cost), §6.2 (2 skills per run), §6.4 (unlocks depend on best level ever reached), §8.4 (save: unlocked skills, last loadout), §10.3 (Loadout screen), §12 (`run_start` carries the loadout).
- Related: MEC-006 (skills, `useSkill`, rejection feedback), MEC-008 (best level, save v2 envelope, start level choice), MEC-003 (level-up events).

## 2. Player-facing summary
- Before a run, the player picks which unlocked skills go into the 2 skill slots (slot 1 = left button, slot 2 = right button).
- The screen remembers the last choice, so one tap on "Go!" starts the run.
- New players skip the screen until their first skill unlocks (reaching level 3). Until level 6 is reached there is only one slot.
- A skill unlocked during a run drops straight into an empty slot, so it can be tried at once.
- In a run: tap the left/right button, or press `J`/`Q` (slot 1) and `K`/`E` (slot 2).

## 3. State & data
- Unlock table (balance): `skills.<id>.unlockLevel` — Slow-mo 3, Tail Snip 6, Shield 11, Mango Rain 16. Order of the table (`loadout.order`) = `slowmo, tailSnip, shield, mangoRain`.
- `unlockedSkills(balance, bestLevel)` = skills with `unlockLevel ≤ bestLevel`, in `loadout.order`. `slotCount(balance, bestLevel)` = 1 if `bestLevel < loadout.secondSlotLevel` (6), else 2. Both are pure functions in `src/core/skills.ts`, exported from `src/core/index.ts`. Rules below write them without the `balance` argument for brevity.
- Loadout value: `[SkillId | null, SkillId | null]`. Index 0 = slot 1, index 1 = slot 2.
- Save field (inside the MEC-008 save v2 envelope): `lastLoadout: [SkillId | null, SkillId | null]`, default `[null, null]`. "Unlocked skills" (GDD §8.4) is not stored; it is derived from the saved best level (MEC-008), so the two can never disagree.
- Core state: `loadout` (copied from options, may change mid-run, R12); `bestLevel` (from options, read-only).
- Loadout screen state (game layer only): `selection` (a loadout value), `activeSlot: 0 | 1` (default 0).

## 4. Rules
**Who sees the screen**
- MEC-007-R1: After "Play from checkpoint" or "Play from L1" on Home (MEC-008), the loadout screen is shown if `unlockedSkills(bestLevel)` is not empty. Otherwise it is skipped and the run starts with `[null, null]`.
- MEC-007-R2: "Play again" on the results screen does not show the loadout screen: it starts the run with `sanitizeLoadout(lastLoadout, bestLevel, table)` (R4), keeping restart at 1 tap. The loadout can be changed by going Home → Play.

**Default selection and validity**
- MEC-007-R3: The screen opens with `selection = sanitizeLoadout(lastLoadout, bestLevel, table)`.
- MEC-007-R4: `sanitizeLoadout(saved, bestLevel, table)` (pure, `src/meta/loadout.ts`; `table` = the unlock levels, `loadout.order` and `loadout.secondSlotLevel` passed in as plain data from balance): (1) treat a missing or wrongly shaped value as `[null, null]`; (2) replace unknown ids and skills that are not unlocked by `null`; (3) replace a duplicate by `null` (keep the first); (4) set slots with index ≥ `slotCount` to `null`; (5) fill each `null` slot below `slotCount`, in slot order, with the first unlocked skill (in `loadout.order`) not already chosen; (6) if slot 1 is `null` and slot 2 is not, move slot 2 into slot 1. The result never has an empty slot while an unchosen unlocked skill exists.
- MEC-007-R5: An invalid saved value is fixed silently (no message); the fixed value is written to `lastLoadout` only when the player confirms.

**Editing on the screen**
- MEC-007-R6: The screen shows `slotCount` slot boxes and all 4 skill cards. Locked cards show a lock and "Reach L{unlockLevel}"; they cannot be picked. Each card shows the skill letter, name, cost and one-line effect.
- MEC-007-R7: Tapping a slot box makes it `activeSlot`. Tapping an unlocked card puts it into `activeSlot`; if the card was in the other slot, the two slots swap. Then `activeSlot` moves to the other slot (if `slotCount` is 2).
- MEC-007-R8: The screen never allows an empty slot while an unchosen unlocked skill exists (the selection starts full after R4, and R7 only replaces or swaps). Slots may not hold the same skill twice.
- MEC-007-R9: "Go!" (also `Enter` / `Space`) confirms with one tap: saves `lastLoadout = selection`, then starts the countdown (GDD §3: 1.5 s). "Back" (also `Esc`) returns Home without saving.

**Passing into the core**
- MEC-007-R10: The game calls `createSim(balance, seed, {startLevel, startEnergy, loadout, bestLevel})` (`SimOptions`, MEC-003 §7); `bestLevel = max(1, save.bestLevel)` read before this run updates it (MEC-008-R5).
- MEC-007-R11: createSim throws a `RangeError` (MEC-003 §7) if `loadout` is not a 2-element array, contains an unknown id, contains a duplicate, has a skill that is not unlocked at `bestLevel`, or has a non-null slot 2 while `slotCount(bestLevel)` is 1. (The game layer always passes a sanitized value; the throw catches programming errors.)

**Mid-run unlocks**
- MEC-007-R12: When the run's level becomes L by a level-up (MEC-003) and `L > bestLevel` (options value), for each skill with `unlockLevel === L` the core emits `skillUnlocked {skill, slot}`. The skill goes into the first `null` slot with index < `slotCount(L)` (`slot` = that index), or `slot: null` if there is no such slot (usable from the next run). Reaching `secondSlotLevel` this way also emits `slotUnlocked {slot: 1}` before `skillUnlocked`.
- MEC-007-R13: A mid-run unlock does not change `lastLoadout`; the next loadout screen picks the skill up through R4 step 5.

**Firing**
- MEC-007-R14: Input mapping (game layer): left skill button, `J` or `Q` → `sim.useSkill(0)`; right skill button, `K` or `E` → `sim.useSkill(1)`. Buttons react on pointer down. A button is drawn only for a non-null slot.
- MEC-007-R15: Skill input is not forwarded during countdown, pause or after the run is over (no spend before the run starts). Keyboard auto-repeat is ignored (only the first `keydown`).
- MEC-007-R16: Activation, costs and rejections are MEC-006 rules.

## 5. Edge cases
1. First ever run (best level 1): no loadout screen; no skill buttons; `[null, null]`.
2. Best level 3–5: one slot, Slow-mo is the only unlocked skill; the screen still shows (to teach it), with slot 1 = Slow-mo pre-filled; "Go!" is one tap.
3. First run reaches level 3: `skillUnlocked {skill: 'slowmo', slot: 0}` mid-run; the left button appears and the tooltip shows.
4. Run with `[slowmo, null]` reaches level 6 for the first time: `slotUnlocked {slot: 1}`, then `skillUnlocked {skill: 'tailSnip', slot: 1}`.
5. Run with `[slowmo, tailSnip]` reaches level 11 for the first time: `skillUnlocked {skill: 'shield', slot: null}`; the tooltip says it can be picked next run.
6. A checkpoint start at L4 (best ≥ 10): no mid-run unlock until the run passes the saved best level.
7. Saved `["shield", "shield"]` → `[shield, <first other unlocked>]`.
8. Saved `["mangoRain", "slowmo"]` but best level is 12 (save edited or reset): Mango Rain is locked → step 2 gives `[null, slowmo]`, step 5 fills slot 1 → `[tailSnip, slowmo]` (the kept skill stays in its slot).
9. Saved value from an older save without `lastLoadout`: MEC-008 migration sets `[null, null]`; R4 fills it.
10. Saved id from a future version (unknown string): replaced by `null`, then filled.
11. Only one slot, saved `[null, "tailSnip"]` while best level is 4: slot 2 dropped (index ≥ slotCount, Tail Snip also locked) → `[slowmo, null]`.
12. `K`/`E` pressed with an empty slot 2: no button is drawn, so the game layer does not forward it (no event, no feedback).
13. Both keys pressed in the same frame: two `useSkill` calls in key-event order (MEC-006 edge case 19).

## 6. Interactions with other mechanics
- **MEC-001 snake:** none (skill presses never touch the turn queue).
- **MEC-002 mango:** none.
- **MEC-003 levels:** level-ups drive mid-run unlocks (R12); skill presses are never rejected at a level up (MEC-003-R10).
- **MEC-004 obstacles:** none.
- **MEC-006 skills:** the loadout decides which skills `useSkill(slot)` fires; mid-run unlocks fill empty slots.
- **MEC-008 checkpoints:** owns the save v2 envelope (this spec adds `lastLoadout`), the saved best level used for unlocks and slot count, the Home start choice and `startLevel`/`startEnergy`. `run_start` (GDD §12, local log) includes the loadout.

## 7. Core API changes
- `Loadout`, `SimOptions` and `createSim` are defined once in MEC-003 §7; this spec owns the `loadout` validation (R11) and the meaning of `bestLevel`.
```ts
// pure helpers exported from src/core/index.ts
unlockedSkills(balance, bestLevel): SkillId[];
slotCount(balance, bestLevel): 1 | 2;
// src/meta/index.ts
sanitizeLoadout(saved: unknown, bestLevel: number, table: UnlockTable): Loadout;
```
- `SimEvent` adds `skillUnlocked {skill, slot: 0 | 1 | null}` and `slotUnlocked {slot: 1}`.
- `SimSnapshot.skills` (MEC-006) reflects the current loadout, incl. mid-run unlocks.
- `src/meta` receives the unlock table as plain data, so it keeps not importing `src/core` (P0 boundary).
- Main functions carry `// MEC-007` comments.

## 8. Feedback in P1 (greybox only)
- New `LoadoutScene`: title, 1–2 slot boxes on top (active slot outlined), 2×2 grid of skill cards, big "Go!" button bottom, small "Back" top left. Flat greybox rectangles and text; no art.
- Card states: picked (thick outline + slot number), unlocked (normal), locked (grey + lock glyph + "Reach L{n}"; not color only).
- In-game buttons: left/right bottom corners, as MEC-006 §8.
- Text keys: `loadout.title` ("Pick your skills"), `loadout.go` ("Go!"), `loadout.back`, `loadout.slot1`, `loadout.slot2`, `loadout.locked` ("Reach L{level}"), `tip.skillUnlocked.slot` ("{skill} unlocked! Tap {side} to use it"), `tip.skillUnlocked.next` ("{skill} unlocked! Pick it before your next run"), `tip.slotUnlocked` ("Second skill slot unlocked!").
- Sounds: `uiTap` on card/slot tap, `uiGo` on confirm, `unlock` jingle on `skillUnlocked`.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `loadout.slots` | 2 | GDD §6.2 |
| `loadout.secondSlotLevel` | 6 | GDD §3b |
| `loadout.order` | `["slowmo", "tailSnip", "shield", "mangoRain"]` | GDD §3b unlock order |
| `skills.slowmo.unlockLevel` | 3 | GDD §3b |
| `skills.tailSnip.unlockLevel` | 6 | GDD §3b |
| `skills.shield.unlockLevel` | 11 | GDD §3b |
| `skills.mangoRain.unlockLevel` | 16 | GDD §3b |
`parseBalance` checks: unlock levels are integers in [1, maxLevel] and non-decreasing in `loadout.order`; `secondSlotLevel` is in [1, maxLevel]; `loadout.order` lists each skill id exactly once.

## 10. Acceptance tests
- MEC-007-R1 loadout screen skipped when no skill is unlocked (best level 1–2)
- MEC-007-R2 play again starts with sanitized lastLoadout without the screen
- MEC-007-R4 sanitize: missing, wrong shape, unknown id, locked, duplicate, extra slot, fill order, slot-2-to-slot-1 move
- MEC-007-R4 sanitize never leaves an empty slot while an unchosen unlocked skill exists (table test over best levels 1–30)
- MEC-007-R7 tapping a card in the other slot swaps the slots
- MEC-007-R9 confirm saves lastLoadout; back does not
- MEC-007-R10 createSim receives startLevel, startEnergy, loadout and bestLevel
- MEC-007-R11 createSim throws on duplicate, unknown, locked or slot 2 with one slot
- MEC-007-R12 reaching level 3 first time fills slot 0 with slowmo
- MEC-007-R12 reaching level 6 first time emits slotUnlocked then skillUnlocked tailSnip slot 1
- MEC-007-R12 reaching level 11 with full slots emits skillUnlocked slot null
- MEC-007-R12 no unlock event below or at the saved best level
- MEC-007-R13 mid-run unlock does not change lastLoadout
- MEC-007-R14 keyboard J/Q and K/E map to slots 0 and 1 (pure key-map helper test)
- MEC-007-R15 skill input ignored during countdown, pause and over
- MEC-007 unlockedSkills and slotCount table test for best levels 1–30
- Manual: loadout screen opens, confirms in one tap, no console errors (recorded in PLAYTEST)

## 11. Lead decisions & escalations
**(a) Lead decisions**
- (lead, 2026-11-03) GDD §8.4 "unlocked skills" is derived from the saved best level, not stored (one source of truth; GDD §6.4 already ties unlocks to best level).
- `sanitize` silently fixes invalid saved loadouts and auto-fills empty slots in unlock order (no dead slots; no error screen for a save issue).
- "Play again" skips the loadout screen and reuses the last loadout (keeps the GDD §4 1-tap, ≤ 1 s restart).
- The screen shows from best level 3, even with a single choice (teaches that skills are picked before a run; still 1 tap).
- (lead, 2026-11-03) A skill unlocked mid-run fills an empty slot at once; otherwise it is ready next run. This matches the GDD §3b FTUE tooltip at L3 (the player can use Slow-mo on the level where the tooltip appears); it never replaces a chosen skill.
- `bestLevel` is added to createSim options (the core needs it for unlock checks and mid-run unlocks; it stays deterministic and pure).
- createSim throws on an invalid loadout instead of fixing it (fixing belongs to meta; the core rejects programming errors).
- Tap-slot-then-card editing with automatic swap (two taps per change, no drag; simple greybox).
- Empty slot: no button, key press not forwarded, no "nope" (nothing to explain).
- Skill input is not forwarded during countdown/pause (prevents accidental spends; turns keep the P0 countdown queue).
**(b) Escalate to owner**
- None.
