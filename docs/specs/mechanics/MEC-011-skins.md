# MEC-011 — Skins, coins, shop & Characters screen (P4a)

**Status:** Implemented (P4a; branch `feat/p4a-skins`) · **Source design:** `docs/superpowers/specs/2026-11-16-p4a-skins-design.md` · **Mockup:** `docs/design/mockups/d3/skins.html` section A (`png/CharactersA.png`).

## 1. Skin catalogue (P4a batch)

| Id | Name (`text.ts`) | Rarity | Price (`balance.skins`) | Body / head / outline / storm outline (`SKIN_BODY`) | Effects (`SKIN_EFFECTS`) |
|---|---|---|---|---|---|
| `snake` | Mango Snake | `default` | 0 (always owned) | `TOKENS.d3.snake` / `TOKENS.d3.outline.snake` / `TOKENS.d3.outlineStorm.snake` | none |
| `ginger` | Ginger Cat | `common` | 300 | `#F6A04D` / `#FFB866` / `#7A3E12` / `#FFE2BF` | none |
| `pup` | Pup | `common` | 300 | `#E9C48F` / `#F4D9AE` / `#6B4423` / `#FFF3DC` | none |
| `tuxedo` | Tuxedo Cat | `common` | 300 | `#4A5266` / `#59627A` / `#1B1F2A` / `#E8ECF5` | none |
| `capy` | Capybara | `rare` | 800 | `#C79A6B` / `#D6AB7C` / `#4A2E1B` / `#F1DCC0` | `eat: true`, `trail: true` |

## 2. Rules

| Rule | Text | Code / test |
|---|---|---|
| **MEC-011-R1** | A skin is an id, display name, one-line perk text, rarity (`default`, `common`, `rare`), price, head drawn on the shared rig (ART-001 anchors, ART-003 steps), body colour and outline colour. Skins never change gameplay, hit boxes or head size (`ui.capy.headCellScale`, D3-R12). | `src/game/art/skins.ts` (`SKIN_IDS`, `SKIN_PALETTES`, `SKIN_BODY`), `tests/game/skins.test.ts` |
| **MEC-011-R2** | Prices per rarity and the rarity of each skin live in `config/balance.json` (`skins`); names and perk lines live in `src/game/text.ts`. No number in code. | `src/core/balance.ts` (`SKIN_NAMES`, `SPEC.skins`), `src/meta/skins.ts` (`skinRarity`, `skinPrice`), `tests/meta/skins.test.ts`, `tests/core/balance.test.ts` |
| **MEC-011-R3** | Each new head (`ginger`, `pup`, `tuxedo`) follows ART-003: fixed layers, shared eye and mouth variants, expression set A (`idle`, `idle_blink`, `eat_open`, `eat_chew`, `dead`) and the 12 shared capy expressions. Owner approves each head on `?debug=1&artPreview=1`. | `src/game/art/capyRig.ts` (`earsAndHead`, `petMuzzleAndNose`), `tests/game/skins.test.ts`, `tests/game/capyRig.test.ts` |
| **MEC-011-R4** | In the run, snake body and outline use the equipped skin's colours. Outline passes the board contrast rule (D3-R2) on all 6 biomes; each skin defines `outlineStorm` for the dark storm biome. | `src/game/render/biomePalette.ts` (`boardLook`), `src/game/art/skins.ts` (`SKIN_BODY`), `tests/game/biomePalette.test.ts`, `tests/game/boardContrast.test.ts` |
| **MEC-011-R5** | State: `coins` (integer >= 0), `ownedSkins` (always contains `snake`), `equippedSkin` (an owned id). Default state: 0 coins, `['snake']`, `'snake'`. | `src/meta/skins.ts` (`defaultSkinState`), `src/session/session.ts` (`skinsModel`), `tests/meta/skins.test.ts`, `tests/session/skins.test.ts` |
| **MEC-011-R6** | `buySkin(state, id, cfg)`: allowed only when `id` exists, is not owned and `coins >= price`. Subtracts price, adds skin and equips it in one step; otherwise state is unchanged with reason `owned` / `coins` / `unknown`. | `src/meta/skins.ts` (`buySkin`), `src/session/session.ts` (`buySkin`), `tests/meta/skins.test.ts`, `tests/session/skins.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R7** | `equipSkin(state, id)`: allowed only for an owned id. Equipping the already-equipped skin is a no-op. | `src/meta/skins.ts` (`equipSkin`), `src/session/session.ts` (`equipSkin`), `tests/meta/skins.test.ts`, `tests/session/skins.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R8** | No confirm dialog on buy: coins are earned only by play and there is no real money (GDD §9). | `src/game/scenes/CharactersScene.ts` (`act`), `tests/game/charactersScene.test.ts` |
| **MEC-011-R9** | The equipped skin is applied at boot and on buy/equip (`setActiveSkin`), and read when a run starts. Changing it never affects a run in progress (Characters is unreachable from a run). | `src/game/art/skins.ts` (`activeSkin`, `setActiveSkin`), `src/game/scenes/BootScene.ts`, `src/game/scenes/GameScene.ts`, `tests/game/boot.test.ts` |
| **MEC-011-R10** | `?debug=1` only: a `+{debugGrant}` control on Characters adds coins (`balance.skins.debugGrant`). Without `debug=1` no code path adds coins in P4a. | `src/meta/skins.ts` (`addCoins`), `src/session/session.ts` (`debugAddCoins`), `src/game/scenes/CharactersScene.ts`, `tests/meta/skins.test.ts`, `tests/session/skins.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R11** | Save version 4 adds `coins`, `ownedSkins`, `equippedSkin`. Migration 3 to 4 sets 0 coins, `['snake']`, `'snake'`. Existing newer-save guard and one-time backup rules stay. | `src/meta/save.ts` (`SAVE_VERSION = 4`, `MIGRATIONS[3]`), `tests/meta/save.test.ts` |
| **MEC-011-R12** | Load sanitises: unknown skin ids are dropped, `snake` is always owned (first, balance order), unowned `equippedSkin` falls back to `snake`, `coins` is clamped to integer >= 0. | `src/meta/skins.ts` (`sanitizeSkins`), `src/meta/save.ts` (`validated`), `tests/meta/skins.test.ts`, `tests/meta/save.test.ts` |
| **MEC-011-R13** | Every buy and equip persists to storage immediately. | `src/session/session.ts` (`buySkin`, `equipSkin`), `tests/session/skins.test.ts` |
| **MEC-011-R14** | Characters top row: Back, title, coin chip. Stage: previewed skin (head on short tube body in skin colour) on podium, name ribbon, rarity chip, perk line. Shelf panel: one row of round tokens + one disabled "Soon" token. One action button in the lower 45%. | `src/game/flow/charactersView.ts`, `src/game/flow/charactersLayout.ts`, `src/game/scenes/CharactersScene.ts`, `tests/game/charactersView.test.ts`, `tests/game/charactersLayout.test.ts` |
| **MEC-011-R15** | Tapping a token previews that skin on the stage without changing the save. On entry the equipped skin is previewed. | `src/game/flow/charactersView.ts`, `src/game/scenes/CharactersScene.ts` (`select`), `tests/game/charactersView.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R16** | Token states: equipped (check badge, "Equipped"), owned ("Owned"), locked (lock badge, price). Previewed token shows the selection ring (D3-R21) and lift. | `src/game/flow/charactersView.ts`, `src/game/scenes/CharactersScene.ts`, `tests/game/charactersView.test.ts` |
| **MEC-011-R17** | Action button by previewed state: equipped → "Equipped" (`off`); owned → "EQUIP" (`primary`); locked & affordable → "BUY {n}" (`primary`); locked & unaffordable → "Need {n} more" (`off`), tap plays denied shake + nope and changes nothing. | `src/game/flow/charactersView.ts`, `src/game/scenes/CharactersScene.ts` (`act`, `denied`), `tests/game/charactersView.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R18** | After a buy: coin chip updates, token switches to equipped, stage plays celebration (hero pop, tap burst, fanfare). Reduced motion: fade only. | `src/game/scenes/CharactersScene.ts` (`celebrate`), `tests/game/charactersScene.test.ts` |
| **MEC-011-R19** | Stage character idles (head bob/tilt tween when motion is on). Reduced motion: still pose. | `src/game/scenes/CharactersScene.ts` (`build`) |
| **MEC-011-R20** | Entry via Characters round icon button (`face` icon) on Home, left of Settings. Home hero tube and head use the equipped skin. Back returns to Home. | `src/game/scenes/HomeScene.ts`, `src/game/ui/menuLayout.ts` (`homeRects`), `src/game/ui/icons.ts` (`face`), `tests/game/menuLayout.test.ts`, `tests/game/icons.test.ts`, `tests/game/navGuard.test.ts`, `tests/game/charactersScene.test.ts` |
| **MEC-011-R21** | Shelf row fits 6 tokens (5 skins + Soon) at 360 mock px with tap targets >= 48 mock px. Scrolling for > 6 skins is out of scope for P4a. | `src/game/flow/charactersLayout.ts`, `tests/game/charactersLayout.test.ts`, `tests/game/uiMinHit.test.ts` |
| **MEC-011-R22** | Rare eat effect: `count` gold 4-point star sparks fly out from the mouth on `'ate'` and fade over `lifeMs`, on top of normal eat feedback. | `src/game/render/skinFxModel.ts` (`skinFxEat`), `src/game/render/skinFx.ts` (`drawSkinFx`), `src/game/scenes/GameScene.ts`, `tests/game/skinFxModel.test.ts` |
| **MEC-011-R23** | Rare trail: one leaf ellipse per `everyMs` behind the tail while moving (`flow.status === 'playing'`), capped at `max` live leaves (oldest dropped). | `src/game/render/skinFxModel.ts` (`skinFxTrail`), `src/game/render/skinFx.ts` (`drawSkinFx`), `src/game/scenes/GameScene.ts`, `tests/game/skinFxModel.test.ts` |
| **MEC-011-R24** | Both effects are cosmetic: drawn on `layers.skinFx` directly above `ground` and below `terrain` and `hazards` (never over a hazard or warning); off with Reduced motion; numbers in `balance.juice.skinFx`. | `src/game/render/skinFxModel.ts`, `src/game/scenes/GameScene.ts`, `tests/game/skinFxModel.test.ts` |
| **MEC-011-R25** | Effect flags live on skin data (`SKIN_EFFECTS: Record<SkinId, { eat: boolean; trail: boolean }>`). Common and default skins have both `false`. | `src/game/art/skins.ts` (`SKIN_EFFECTS`), `tests/game/skins.test.ts`, `tests/game/skinFxModel.test.ts` |

## 3. Balance keys & tokens

- `config/balance.json`:
  - `skins`: `{ order: ["snake","ginger","pup","tuxedo","capy"], rare: ["capy"], prices: { common: 300, rare: 800 }, debugGrant: 500 }`
  - `juice.skinFx`: `{ eat: { count: 6, lifeMs: 420, spreadCells: 0.9, sizeCells: 0.22 }, trail: { everyMs: 140, lifeMs: 700, max: 10, sizeCells: 0.2, driftCells: 0.25 } }`
- `src/game/uiTokens.ts`:
  - `TOKENS.d3.skinFx`: `{ spark: '#FFE36B', leaf: '#6FBF4A', leafEdge: '#2F7A2A' }`

## 4. Out of scope (P4b)

- Earning marbles after a run (MEC-009)
- Marble machine and wheel (MEC-010)
- Duplicate skin to coin conversion, pity counter, Epic skins, scrollable shelf for > 6 tokens
