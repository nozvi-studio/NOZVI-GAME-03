# P3c — Capy character (SVG layered) design
Status: Approved by owner 2026-11-06 · Phase: P3 (owner chose to start P3 before the P2 exit playtest) · Depends on: ART-001 (anchors, palette, outline, actions).

## 1. Goal
Ship the reference Capybara character in the game: a layered SVG head (and body for Skins/Results) that matches the Figma `PlayerHead` capy (`assets/raw/reference/capy-figma-head.png`) plus the GDD §10.1 thick dark outline, with `idle`, `eat` and `dead` motion on the board head.

## 2. Owner decisions (2026-11-06)
- P3 is split: P3a juice + display foundation, P3b UI screens, P3c capy. Owner chose **P3c first**.
- Personality: **follow Figma** (round eyes with highlight, gentle smile, pink blush) **+ outline**. ART-001 §4 "deadpan" default is replaced; grumpy/deadpan looks become optional B expressions.
- Production route: **agent draws layered SVG** from the ART-001 anchors. The Codex/agent-sprite-forge raster route (ART-002) becomes a fallback, not the default.

## 3. Character model
- 48 × 48 unit box, pivot (24, 24), anchors exactly as ART-001 §3.
- Outline `#4A2E1B`, width 2 units on head and ears, 1.2 on the muzzle; round joins/caps.
- Palette from ART-001 §4 (face gradient `#D6AB7C → #C79A6B`, ears/muzzle `#B1865A`, pupils `#17261B`, nose/mouth `#4A2E1B`, blush `#FF8FA3`, pupil highlight white).
- Fixed layers (back to front): `ears`, `head`, `blush`, `muzzle`, `nose`.
- Swappable layers:
  - eyes: `open` (Figma round + highlight), `blink` (lid line), `closed` (^ ^), `x` (dead), `half` (half-lidded, for B looks)
  - mouth: `smile` (Figma), `open` (eat), `chew`, `flat`, `o`
- Expression = one eyes variant + one mouth variant. Table (single source in code, `src/game/art/capyRig.ts` data):
  | Expression | Eyes | Mouth | Priority |
  |---|---|---|---|
  | idle | open | smile | A |
  | idle_blink | blink | smile | A |
  | eat_open | open | open | A |
  | eat_chew | closed | chew | A |
  | dead | x | o | A |
  | happy | closed | smile | B |
  | alert | open | o | B |
  | scared | open | flat | B |
  | determined | half | flat | B |
  | sleepy | half | flat | B |
  | hurt | closed | o | B |
  | win | closed | open | B |
- Body (Skins/Results only): same palette and outline, round belly below the head, two stub feet; `idle` (breathing) and `win` (hop). In-game body stays block-based (GDD §8.3).

## 4. Rendering
- SVG strings are built by a pure function `buildCapySvg(expression, size)` (no Phaser import, unit-testable) in `src/game/art/` — pure module path chosen so it sits next to its only consumer; it imports nothing from Phaser.
- Phaser loads each expression with `load.svg(key, dataUrl, { width, height })` at two sizes: `board` (96 px; board head is ~36 CSS px at ~3× DPR) and `large` (256 px). Keys: `capy/head/<expression>/<size>`, `capy/body/<pose>/large`. No new dependency, no PNG atlas at this stage.
- The head on the board stays **front facing**: its position follows the snake head; the face texture is not rotated.

## 5. Motion (Phaser tweens in `src/game/`)
- idle: scale breathing ±3 % period ~1.6 s; blink (swap to `idle_blink` ~120 ms) every 2–4 s (seeded from a local RNG, not the sim RNG).
- eat: on mango eaten → `eat_open` 80 ms → `eat_chew` 120 ms → idle; gulp squash (x 1.12 / y 0.9) and return.
- dead: swap to `dead`, droop (rotate −12°, drop 4 px) over 300 ms; with reduced motion only the texture swap.
- All timings and amplitudes live in `config/balance.json` under `art.capy` (no magic numbers).
- Motion is presentation only: no change to sim, tick or RNG streams.

## 6. Preview page
`?artPreview=1` (debug only) opens a scene that shows every expression and body pose at 24, 40, 124 and 256 CSS px on light and dark board backgrounds, with idle/eat/dead playing. Used for the owner's 5" phone check.

## 7. Testing
- Vitest: `buildCapySvg` output contains every fixed layer; eye centres at y 20.4, x 24 ± 9.6; mouth at y 37.6; outline colour and width present; every expression in the table resolves to existing variants; no unknown expression. Test names carry `ART-001`.
- Full `npm test` + `npm run typecheck` before merge; agy browser QA on the board and the preview page (no console errors, capy visible, eat/dead play).

## 8. Out of scope
Other skins, rarity, shop/skin picker, Figma outline update (ART-001 Q7), raster atlas pipeline, P3a juice table, P3b screens.

## 9. Doc updates in the same branch
ART-001 §4 (personality per Figma), §5–6 (SVG route default, raster route fallback); ART-002 status → fallback; DECISIONS entry (P3 before P2 exit; SVG route); CODEMAP for `src/game/art/`; STATUS; CHANGELOG.
