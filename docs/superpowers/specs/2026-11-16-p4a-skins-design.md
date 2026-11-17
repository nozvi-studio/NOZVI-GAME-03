# P4a Skins: design (MEC-011)
Status: **Approved (owner 2026-11-17).** Plan: `docs/superpowers/plans/2026-11-16-p4a-skins.md`. Rule IDs `MEC-011-R<n>`; the mechanic spec `docs/specs/mechanics/MEC-011-skins.md` is written from this file in the plan's docs task and then owns the rules.

## 1. Goal and scope
Players collect chibi pet skins for the snake. P4a ships the whole skin loop except the way coins are earned.

- **In:** 5 skins, the Characters screen (direction A, `docs/design/mockups/d3/skins.html`), preview, buy with coins, equip, save v4, the equipped skin on Home and in the run, the Rare presentation for Capy, a debug coin grant.
- **Out (P4b):** marbles after a run (MEC-009), marble machine and wheel (MEC-010), duplicates to coins, pity, Epic skins.
- **Owner decisions 2026-11-16:** skins before the economy; coins come only from the debug grant until the marble machine exists (GDD §8.2 unchanged); first batch of 5; Common and Rare only; direction A; buy equips at once with no confirm dialog; P4a code may start before the P3 exit.

## 2. Skins
| Id | Name | Rarity | Price | Head art | Body / outline (mock values, final in the plan) |
|---|---|---|---|---|---|
| `snake` | Mango Snake | default | 0, always owned | exists | current D3 snake tones |
| `ginger` | Ginger Cat | common | 300 | new | `#F6A04D` / `#7A3E12` |
| `pup` | Pup | common | 300 | new | `#E9C48F` / `#6B4423` |
| `tuxedo` | Tuxedo Cat | common | 300 | new | `#4A5266` / `#1B1F2A` |
| `capy` | Capybara | rare | 800 | exists | `#C79A6B` / `#4A2E1B` |

- **R1** A skin is: an id, a display name, a one-line perk text, a rarity (`default`, `common`, `rare`), a price, a head drawn on the shared rig (ART-001 anchors, ART-003 steps), a body colour and an outline colour. Skins never change gameplay, hit boxes or the head size (D3-R12).
- **R2** Prices per rarity and the rarity of each skin live in `config/balance.json` (`skins`); names and perk lines live in `text.ts`. No number in code.
- **R3** Each new head (Ginger, Pup, Tuxedo) follows ART-003: fixed layers, shared eye and mouth variants, expression set A (`idle`, `idle_blink`, `eat_open`, `eat_chew`, `dead`). The owner approves each head on `?debug=1&artPreview=1` before it counts as done. The placeholder heads in the mockup are not final art.
- **R4** In the run, the snake body and its outline use the equipped skin's colours. The outline must pass the existing board contrast rule (D3-R2) on all 6 biomes; a skin may define a second outline for the dark storm biome, as the snake does today.

## 3. Ownership, coins, equip (pure logic in `src/meta/skins.ts`)
- **R5** State: `coins` (integer >= 0), `ownedSkins` (set of ids, always contains `snake`), `equippedSkin` (an owned id).
- **R6** `buySkin(state, id)`: allowed only when the id exists, is not owned and `coins >= price`. It subtracts the price, adds the skin and equips it. Otherwise the state is unchanged and the result names the reason (`owned`, `coins`, `unknown`).
- **R7** `equipSkin(state, id)`: allowed only for an owned id. Equipping the equipped skin is a no-op.
- **R8** No confirm dialog on buy: coins are earned only by play and there is no real money (GDD §9).
- **R9** The equipped skin is read when a run starts. Changing it never affects a run in progress (the screen is not reachable from a run).
- **R10** `?debug=1` only: a "+500" control on the Characters screen adds coins. It marks nothing else; coins from it are normal coins. Without `debug=1` no code path adds coins in P4a.

## 4. Save
- **R11** Save version 4 adds `coins`, `ownedSkins`, `equippedSkin`. Migration 3 to 4: `coins` 0, `ownedSkins` `['snake']`, `equippedSkin` `'snake'`. The existing rules stay: a newer save is never overwritten, an older save gets one backup.
- **R12** Load sanitises: unknown skin ids are dropped, `snake` is always owned, an equipped skin that is not owned falls back to `snake`, `coins` is clamped to an integer >= 0.
- **R13** Every buy and equip saves at once.

## 5. Characters screen (direction A)
Layout source: `docs/design/mockups/d3/skins.html` section A, 360 x 640 first; taller canvases add space around the stage.

- **R14** Top row: Back, title, coin chip. Stage: the previewed skin (head on a short body in the skin colour) on a podium, name ribbon, rarity chip, perk line. Shelf panel: one row of round tokens, one per skin, then one "Soon" token. One action button in the lower 45% of the screen.
- **R15** Tapping a token previews that skin on the stage. Preview changes nothing in the save. On entry the equipped skin is previewed.
- **R16** Token states: equipped (check badge, "Equipped"), owned ("Owned"), not owned (lock badge, price). The previewed token has the selection ring (D3-R21).
- **R17** Action button by state of the previewed skin: equipped: "Equipped", disabled look; owned: "EQUIP" primary; not owned and affordable: "BUY <price>" primary; not owned and not affordable: "Need <n> more" disabled look, a tap plays the denied shake (D3 denied feedback) and changes nothing.
- **R18** After a buy: the coin chip counts down, the token switches to equipped, the stage plays a short celebration (pop + sparkle burst, sound). Reduced motion: state changes with a fade only.
- **R19** The stage character idles: bob and blink from the existing head animation; a Rare skin shows its sparkle. Reduced motion: still pose.
- **R20** Entry: a "Characters" button on Home. Home shows the equipped skin as its hero. Back returns to Home.
- **R21** The shelf row fits 6 tokens at 360 px. More skins than fit is out of scope for P4a (the row scrolls in a later phase).

## 6. Rare presentation (Capy)
- **R22** Eat effect: a small gold sparkle burst at the mouth when a mango is eaten, on top of the normal eat feedback.
- **R23** Trail: small leaf particles left behind the tail while moving; they fade out and never accumulate (capped pool).
- **R24** Both are cosmetic: drawn under hazards and warnings, never over a telegraph; off with Reduced motion; numbers in `balance.juice`.
- **R25** The effect set is data on the skin (`effects: { eat?, trail? }`), so later skins reuse it. Common skins have none.

## 7. Architecture
| Unit | Does | Depends on |
|---|---|---|
| `src/meta/skins.ts` (new, pure) | catalogue from balance, `buySkin`, `equipSkin`, sanitise | balance, save types |
| `src/meta/save.ts` | v4 fields, migration 3 to 4 | `skins.ts` sanitise |
| `src/game/art/skins.ts`, `capyRig.ts` | 3 new skin definitions on the shared rig; `activeSkin()` reads the session save | rig |
| run render (snake body, head) | body and outline colour from the equipped skin | `activeSkin()` |
| `CharactersScene` + pure `charactersLayout` | the screen (R14..R21) | skin kit widgets, session |
| skin effects (new, small) | eat sparkle, trail pool (R22..R25) | juice player, motion budget |
| `HomeScene` | Characters entry, hero skin | session |

Session exposes `skinsModel()`, `buySkin(id)`, `equipSkin(id)`, `debugAddCoins(n)`; scenes never touch the save directly. Only the equipped skin is preloaded for a run; the Characters screen loads the other heads when it opens.

## 8. Errors and edge cases
- Save write fails: the in-memory state still changes; the next successful save persists it (existing save behaviour).
- A skin id removed in a later version: dropped at load (R12).
- Buy tapped twice quickly: the second call sees `owned` and does nothing (R6).
- Texture for a head not loaded yet when a token is tapped: the stage keeps the previous skin until the load completes.

## 9. Tests
- `src/meta/skins`: buy (ok, owned, not enough coins, unknown id), equip (ok, not owned, same), sanitise, prices from balance. Names carry `MEC-011-R<n>`.
- Save: migration 3 to 4, round trip, newer-version guard unchanged.
- Art: per new skin the ART-003 checks (layers, anchors, outline, every expression resolves).
- Contrast: each skin's outline against every biome board (R4).
- Layout: `charactersLayout` rects inside the canvas, no overlap, action button in the lower 45%, at 640..800.
- Scene: token tap previews, action button label per state, buy then equip flow, denied shake, debug control hidden without `debug=1`.
- Effects: trail pool cap, both effects off with reduced motion.
- Headless screenshots at 360x640 and 360x780; owner device check for feel.

## 10. Docs to change with the code
GDD §8.3 and §11 (done with this spec), `MEC-011-skins.md` (new), ART-003 (open questions closed, status), CODEMAP, docs README, UI-MOCKUPS (Characters board A as the source), DECISIONS, CHANGELOG, STATUS.

## 11. Open points (do not block the plan)
- Final body and outline colours per skin are tuned against the biome contrast test.
- The exact Rare effect numbers are tuned in a browser by the owner.
- Whether the "In the game" strip of direction C is added to the stage later.
