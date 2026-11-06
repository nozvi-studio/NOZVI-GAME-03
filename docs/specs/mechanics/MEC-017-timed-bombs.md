# MEC-017 — Timed bombs

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2b · Date: 2026-11-05

## 1. Purpose & links
- Defines the **bomb** family: a bomb lands like a rock, counts down with its plus-shaped blast area shown, then the area is dangerous for one base tick. Only the head can be hit.
- GDD: §5.1 (biome 5), §5.3, §5.4 row "Timed bombs", §6.3, §7.
- Framework: MEC-004 (AreaBlast block R5, collision R6/R8, fairness R11–R14, flow B R16, verification R17–R18). Design: P2 design §5, §7, §8, §9, §10, §11. Plan Task 9 (TR-B7).
- Related: MEC-006 (Shield absorb L7, Slow-mo).

## 2. Player-facing summary
- **From level 23:** a bomb drops like a rock, then counts 3-2-1 with a cross-shaped area marked around it. When it goes off, the cross is dangerous for one move. Keep your head out of it; your body is safe.
- A Shield absorbs one blast, or, if you run into the bomb with a Shield, it defuses the bomb.

## 3. State & data
`SimState.families.bomb = { bombs: BombInstance[]; nextId }`; `BombInstance = { id, x, y, t, warnMs, landed, blast: BlastState | null }`; `BlastState = { area: Cell[]; countdownMs; activeMs; phase: 'count' | 'active' | 'done' }`.
Descriptor: `{key: 'bomb', cause: 'bomb', capClass: 'small', maxActiveKey: 'bomb.maxActive', breakable: true}`. Save fields: none.

## 4. Rules
- **MEC-017-R1 Landing.** Spawn like a rock `single`: `candidateValid(s, b, [cell], {nearDist: fairness.nearHeadDist, wallCells: [cell]})`; the area is exempt from rule 2 (P2 design §7) but its cells must not be `reserved` at spawn (`extraFree: area`). The bomb warns for `bomb.warnMs` (1200 ≥ 900; cell passable), then lands at the first ms when no snake cell is on it (TimedCells rule).
- **MEC-017-R2 Countdown + area.** On landing the bomb cell is solid (cause `bomb`) and a BFS wall; `blast = {area: plusArea(x, y, bomb.arm, cols, rows), countdownMs: bomb.countdownMs, activeMs: baseTickMs(s, b), phase: 'count'}`. `plusArea` order: centre, +x 1…arm, −x 1…arm, +y 1…arm, −y 1…arm, clipped to the board. The bomb cell (warn and count) is a BFS wall; bomb cell and area are `reserved` in every state.
- **MEC-017-R3 Blast.** At countdown 0 the bomb cell vanishes, `bombBlast {x, y, cells}` is emitted and the area is `active` for `activeMs` = one base tick at activation (no Slow-mo or level-up factor, TR-B7). Each ms while active, if the head is in the area ⇒ `ctx.hitHead('bomb', hx, hy, 'area', s.dir)`, at most once per blast; the head moving into an active area cell is `headHit = 'area'`. Body cells are ignored. Then `done` ⇒ removed.
- **MEC-017-R4 Shield (defuse / absorb).** Area hit with Shield: Shield consumed, no bonk, no rubble (`kind: 'area'`, MEC-006 L7). Head entering the landed bomb cell during `count` with Shield: `onBreak` defuses the bomb (removed, no blast, no `bombBlast` event); bonk as a normal break; no rubble.
- **MEC-017-R5 No chains.** A blast does not affect other bombs, hazards, mangoes, orbs or the body.
- **MEC-017-R6 Introduction.** `level.table` rows L23…30 get `bomb: 2`; bomb is introduced at L23. Small cap, `bomb.maxActive` 1.
- **Level up (flow B).** No level-end hook; a counting bomb keeps counting and can still blast.

## 5. Edge cases
1. **Bomb at a corner:** area clipped (5 cells at (0,0)).
2. **Slow-mo during the blast:** active window stays one base tick (TR-B7).
3. **Head enters the area during the active tick:** `headHit = 'area'` ⇒ death or absorb.
4. **Two overlapping areas (if `maxActive` is raised):** independent; one blast does not change the other's countdown (R5).
5. **Mango inside the area:** impossible to place there (reserved); an existing mango is unchanged.

## 6. Interactions with other mechanics
- **MEC-004:** AreaBlast block; `HitKind 'area'` in `resolveHeadCell` / `applyHeadHit` (absorb path already in P2a code).
- **MEC-006:** Shield absorb and defuse; Slow-mo cannot stretch danger.

## 7. Core API changes
- `FamilyKey` and `CauseKey` add `bomb`. Event `bombBlast {x, y, cells}` (TR-B8).
- Modules `src/core/hazards/blocks/areaBlast.ts` (`plusArea`, `stepBlast`), `src/core/hazards/bomb.ts`.

## 8. Feedback (greybox)
- Warn like rock; landed = black circle + countdown digit `ceil(leftMs / 1000)`; area outline dashed; active = filled area for the tick. Text keys `banner.new.bomb`, `death.bomb` (OQ-B6, provisional, owner review at end of P2).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `bomb.warnMs` | 1200 | lead (≥ 900) |
| `bomb.countdownMs` | 3000 | P2 design §10 |
| `bomb.arm` | 2 | P2 design §10 |
| `bomb.maxActive` / `tries` | 1 / 40 | lead |
| table weight `bomb` | 2 on L23…30 | P2 design §11 |
`parseBalance`: `warnMs ≥ 900`, positive integers.

## 10. Acceptance tests
- `MEC-017-R1 bomb warns at least 900 ms and lands only when no snake cell is on it`
- `MEC-017-R2 plus area has arm 2 and is clipped to the board`
- `MEC-017-R2 countdown lasts 3000 ms and the area is reserved during it`
- `MEC-017-R3 head in the area when the blast fires dies with cause bomb; body in the area is safe`
- `MEC-017-R3 blast is active for exactly one base tick at activation, also during slow-mo`
- `MEC-017-R4 shield absorbs one blast without bonk or rubble; shield breaking the bomb cell defuses it without a bombBlast event`
- `MEC-017-R5 a blast does not affect other bombs, hazards, mangoes or orbs`
- `MEC-017-R6 bomb is introduced at L23 only`
- Fuzz (MEC-004-R17/R18): solo `bomb: 23` and full table (blast extraction in the harness).

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Active window = base tick at activation (TR-B7).
- **L2** Area exempt from rule 2 but not reserved at spawn.
- **L3** Director emits `hazardIncoming`.
### Escalate to owner
- OQ-B6 strings: provisional, owner review at end of P2.
