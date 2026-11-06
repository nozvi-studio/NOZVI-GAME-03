# ART-002 — Capybara master still brief (for Codex + agent-sprite-forge)
Status: Fallback (owner 2026-11-06 chose the layered SVG route; use this only if a raster capy is needed) · Depends on: ART-001 (anchors, outline, palette, actions) · Owner runs the commands on the owner's laptop (Windows, Codex CLI, no API key).

## 1. Goal
Produce and approve two master stills of the reference capy: **`capy_body`** (full body, front) and **`capy_head`** (head only). Every later asset (expression stills, clips, atlas, other skins) is derived from these two. Nothing is animated until both are approved.

## 2. Inputs the owner adds (not in the repo yet)
| File | Purpose | Notes |
|---|---|---|
| `assets/raw/reference/style-grumpy-cat-sheet.png` | style reference (outline weight, deadpan eyes, flat shading) | mood only; confirm rights before commit; the spec forbids copying the character |
| `assets/raw/reference/capy-figma-head.png` (added 2026-11-06) | identity reference for `capy_body` (optional) | export the capy `PlayerHead` from Figma at 512 px; note it has no outline yet (ART-001 Q7), so the style reference decides the outline |

If `capy-figma-head.png` is used, add to `capy_body.spec.json`: `"identity_ref": {"path": "../reference/capy-figma-head.png", "what": "the Figma capy head", "copy": "head shape, ear placement, muzzle shape and colours; ignore the missing outline"}`.

## 3. Spec files
`assets/raw/master/capy/specs/capy_body.spec.json` and `capy_head.spec.json` (`generate2dsprite.master_spec.v1`). Key choices: `facing: front`; `class: hero` for the body, `prop` for the head (centred framing); `finish: hd`; `key: blue` (the blush `#FF8FA3` leans to the default magenta key, so magenta is avoided); bans: no leaf/stem/fruit shape, no accessories, no text.

## 4. Steps (owner, PowerShell, from the repo root)
Prerequisite once: clone `0x0funky/agent-sprite-forge`, run `python tools/install_skills.py --apply --host codex`, `pip install -r requirements.txt`. `<skill-dir>` = the installed `generate2dsprite` skill folder.
1. Check routes: `python "<skill-dir>/../generate2dmedia/scripts/forge_doctor.py" --host-tools none`. Expect `codex-cli` ready (no key needed).
2. Body, 3 takes: `python "<skill-dir>/scripts/master_still.py" generate --spec assets/raw/master/capy/specs/capy_body.spec.json --takes 3 --output-dir assets/work/capy_body-gen`
3. Look at `takes.png`. Pick by the checklist (section 5). Fix a near-miss by edit, never re-roll: `... master_still.py edit --run assets/work/capy_body-gen --take N --change "<one change>" --output-dir assets/work/capy_body-edit1`
4. Approve: `... master_still.py approve --run <run> --take N --output-dir assets/raw/master/capy/body`
5. Repeat 2–4 for `capy_head`, output `assets/raw/master/capy/head` (its spec reads `../body/master.png` as the identity reference).
6. Send the approved `master.png` files (or commit them on this branch) so the agent can run the anchor check (section 5).

## 5. Acceptance checklist (look at the pixels)
- Identity: wide rounded-square head, two small round ears on the top corners, large darker muzzle, two nostrils, tiny high-set eyes with a lowered lid line, flat mouth, pink blush. Palette within the ART-001 values.
- Outline: thick, dark warm brown, even weight, closed shapes, same weight on head and body.
- Personality: deadpan and slightly grumpy but cozy; not angry, not sad.
- Anchors (head, proportion of head-box height from the top): eye line about 31 %, nostrils about 60 %, mouth about 80 %; ears centred at about 24 ± 12.6 of 48 horizontally. Agent checks this on the approved image.
- Clean frame: nothing touches an edge, no text, no extra objects, no leaf/stem/fruit, flat blue key with no shadow.
- Readability: shrink to 40 px and to 24 px; eyes, ears and muzzle must still read.
- Colour: `pad`/`approve` warn if more than 0.5 % of the subject leans to the key colour; if they do, switch the key to `green` and regenerate.

## 6. Motion test (after approval, separate task)
Owner's Remotion project is `D:\Working\Agent\remotion-showcase` (local, not visible to the cloud agent). Smallest test: a composition that loads `assets/raw/master/capy/head/master.png`, plays a 12 fps idle (bob, squash and stretch, blink by frame swap), renders a transparent PNG sequence, and drops it into `assets/work/capy_head-idle/`. Success: 8 frames, transparent background, anchors unchanged, loop seam invisible. Then run the forge steps register, loop and package to produce `assets/game/capy/capy.png` and `capy.json`, and load it once in a Phaser scene to verify the Aseprite JSON.

## 7. Out of scope here
Expression stills, clips, atlas, other skins, rarity (ART-001 Q2) and the Figma outline update (ART-001 Q7).
