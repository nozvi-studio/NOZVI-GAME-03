# ART-001 — Character Coordinate System (reference character: Capybara)
Status: Draft v2 (owner answers Q1-Q5 applied 2026-11-06) · Phase: P3 prep · Source of truth for: character head anchors, outline/palette rules, action list, frame naming, asset folders.
Design source: Figma canvas "Mango Snake — D2" (board `PlayerHead`, `HeadRigD2`, `ExprHeadD2`). Style reference (mood only, not to be copied): owner-supplied "grumpy purple cat" turnaround/expression sheet.

## 1. Game concept (context for art; GDD owns the rules)
GDD §1, §5, §8.3 and §10 are authoritative; this section only states what the artist must know.
- **Game:** "Mango Snake", a reinvented Snake. Portrait web game (Phaser 3). 30 levels in 6 biomes; the board fights back with obstacles; the player eats mangoes, collects energy, casts skills, then cashes the run in for marbles in a pachinko-style marble machine that drops coins and **skins**.
- **Tone:** cozy, silly and cheeky ("bựa"). Humor lives in reactions and death lines, never in hidden rules. A deadpan, slightly grumpy face is on-brand.
- **What a skin is:** a chibi **head** plus a body of same-coloured blocks that grows like the snake. Skins never change gameplay (GDD §8.3). Rarity shows in presentation: Common = head + colour · Rare = + eat effect/trail · Epic = animated head, custom death reaction and sound.
- **Where the head is seen:** in game at about 24–40 px (HUD/board), on Home at about 124 px, in pickers/shop at 40–80 px, in the marble machine skin drop and results at large size. It is **always front facing**; rotation, body and trail belong to the game.
- **Style (GDD §10.1, owner 2026-11-03):** chunky cartoon for characters, UI and marble machine — thick dark outlines, saturated colours. The board stays flat and readable. Each biome has its own palette.

## 2. Why Capybara is the reference character
It is the hardest shape in the set (wide rounded-square head, small round ears, large muzzle, tiny eyes). If the rig, outline and expressions work on it, the others (snake, cat, dog, tux, cream) reuse the same anchors and only change colours, head shape, ears and marks. One character is perfected first; the rest are clones on the same rig.

## 3. Coordinate system
One 48 × 48 box, origin top-left, y down. All skins hang the face on the same points (taken from `PlayerHead` capy and the `HeadRigD2` anchor board).
| Anchor | Value (capy) | Notes |
|---|---|---|
| Head box | x 3.6–44.4, y 9.6–44.4 | rounded rect, corner radius 16.8 |
| Ears | circles r 5.5 at (11.4, 11.4) and (36.6, 11.4) | drawn behind the head |
| Eyes | y 20.4, x = 24 ± 9.6 | eye line; must stay readable at 40 px |
| Cheeks | y 30, x = 24 ± 15 | blush |
| Nose | y 30.6 (two nostrils at x 20.6 / 27.4) | above the mouth line |
| Muzzle | centre (24, 34), rx 12.6, ry 8.4 | |
| Mouth | y 37.6 (idle / eat / dead all hang here) | tongue root = mouth |
| Pivot | (24, 24) | head centre; scale/rotate around it |
Rules: eyes, nose, mouth never leave their anchors; only head shape, ears and marks move per skin. No leaf, stem or fruit shape on any head (the mango is food).

## 4. Look rules for the raster capy (proposal, owner to confirm)
- **Outline (owner 2026-11-06: follow the GDD):** thick dark warm brown (proposed `#4A2E1B`), about 2 px at 48-box scale (about 5% of head width, about 10 px on a 256 px frame), round joins, same weight on every action. Figma D2 heads (`stroke: none`) must be updated to match; until then Figma is out of date against GDD §10.1.
- **Palette (from Figma):** face `#D6AB7C → #C79A6B`, ears and muzzle `#B1865A`, pupils `#17261B`, nose/mouth `#4A2E1B`, blush `#FF8FA3`. One shared palette per character; no new colours per action.
- **Face personality (from the style reference):** half-lidded eyes with a visible lid line, slight brow asymmetry, flat mouth by default. Pupils get a highlight dot.
- **Shading:** one soft shadow tone and one highlight; no gradients that disappear at 40 px.

## 5. Action list and frame budget
Display is small, so keep clips short. Owner delegated the choice (Q4); decision:
- **Head frames: 256 × 256 px** (Home shows the head at 124 CSS px, so 2× DPR needs 248 px). **Body frames: 384 × 384 px** (Skins/Results only, shown at about 160–200 CSS px). Same anchors, scaled by 8 (head) and 8 (body drawn on the same 48-unit grid with the body below y 44.4, so the body frame is a 1.5× canvas around the head anchors).
- **12 fps** for every action (cheap, reads as hand-animated at this size); engine tweens add the smooth motion.
- Budget: about 40 head frames + about 24 body frames fit one 2048 × 2048 atlas page (padding 2, extrude 1). Re-check on a real phone before scaling to other skins.
| Priority | Action | Frames | Loop | Notes |
|---|---|---|---|---|
| A (ships with every skin) | `idle` | 6–8 | yes | blink, slow eye wander, small breathing (head and body) |
| A | `eat` | 6 | no | mouth opens, gulp, returns to idle |
| A | `dead` | 8 | no | X eyes, flop; works with reduced motion (no shake) |
| B (Rare/Epic) | `happy`, `chew`, `alert`, `scared`, `determined`, `hurt`, `sleepy`, `win` | 1–4 each | per action | names match `ExprHeadD2`; static expression stills plus engine tweens are acceptable |
Scope (Q3): the reference capy has a **head set** (every action above) and a **body set** (`idle` and `win` for the Skins and Results screens; more later if needed). In-game bodies stay block-based per GDD §8.3.
Naming: `capy_head_<action>_<nn>.png`, `capy_body_<action>_<nn>.png`, atlas `capy.png` + `capy.json`, animation keys `capy/head/<action>`, `capy/body/<action>`.
Rarity (Q2): not decided. Make the capy as good as possible first (all of section 5), then choose its rarity; the work is not rarity-gated.

## 6. Production pipeline and routes
Pipeline (agent-sprite-forge, MIT): approved master still → one clip or set of stills per action → key background → register to the anchors → loop/retime → finish → pack atlas + JSON (Aseprite-style JSON; Phaser loads it with `load.aseprite`, **not yet verified in Phaser by the tool — verify once by hand**).
Routes without an API key (all run on the owner's machine, not in the cloud agent):
1. **Master still and expression stills:** Codex CLI `image_gen` (signed-in subscription, no key). Output from another tool (for example agy) can be adopted with `master_still.py approve --still <png> --route <name>`.
2. **Motion:** image-to-video needs the Grok CLI (ACP) or a paid API key; the Codex route has no image-to-video. Options that need neither: (a) **per-expression stills + Phaser tweens** (squash/stretch, bob, blink by swapping frames); (b) the owner's **Remotion** setup (code-driven video): animate the approved master layers or stills (transform, squash, eye swaps) and render a PNG sequence or video, which the pipeline accepts as a supplied clip. Option (b) is deterministic, so identity does not drift between frames. Not yet verified: the owner's Remotion repo is not visible to the cloud agent.
3. Keys, if ever used, go in environment variables or the user config file, never in the repo (AGENTS §6).
Every AI-generated frame needs a human look (identity drift, outline weight, palette) before it enters `assets/game/`; keep the tool's licence terms in DECISIONS (GDD §10.1).

## 7. Folders
```
assets/raw/reference/   owner reference images (mood only; check rights before commit)
assets/raw/master/capy/ approved master still + master.json
assets/work/            pipeline scratch, git-ignored
assets/game/capy/       final atlas PNG + JSON that Phaser loads
```

## 8. Open questions for the owner
Answered by the owner 2026-11-06:
- Q1 outline: follow the GDD (thick dark outline). Figma D2 needs the update.
- Q2 rarity: deferred; build the capy to full quality first.
- Q3 scope: head and body.
- Q4 frame size/fps: agent's choice (section 5).
- Q5 tools: Codex CLI installed; a Remotion-based video setup works on the owner's laptop.
Still open:
- Q6. Name/location of the owner's Remotion repo (it is not in this session's GitHub scope) and whether it can take a PNG master and export a PNG sequence.
- Q7. Update the Figma D2 heads with the outline now, or after the capy master is approved?
