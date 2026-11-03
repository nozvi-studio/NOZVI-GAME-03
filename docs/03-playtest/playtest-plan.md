# Playtest plan

## Principles

- **Watch, don't explain.** Give the device, say "play this", and stay silent. What they don't
  understand is data.
- Friends are polite. Trust behavior (do they keep playing? do they lean in?) over opinions.
- 5 testers per round is enough to find the biggest problems.
- Test on the target device (a phone, portrait) at least once per round.

## What to measure every session

| Metric | How |
|---|---|
| Level reached per run | In-game log |
| Cause of every death | In-game log (`CAUSES` keys) |
| Run length | In-game log |
| Runs played without being asked | Observe |
| Skill uses: when and why | Observe + log |
| "Unfair" moments | Ask: "Was any death not your fault?" |
| Remembered moments | Ask: "What do you remember most?" |

## Questions after the session (max 5)

1. What was the goal of the game, in your words?
2. Which death felt most unfair?
3. When did you feel most clever?
4. What would make you play again tomorrow?
5. Anything that made you laugh?

## Round plan

| Round | Build | Focus | Hypothesis |
|---|---|---|---|
| 1 | Current prototype | Is the core loop fun? | H1 |
| 2 | + stamina, Slow-mo, Tail Snip | Do skills create decisions? | H2 |
| 3 | + wrap zones | Routes or confusion? | H3 |
| 4 | + humor pass | Do people smile / quote jokes? | H4 |

Use `session-template.md` for notes and add one row to `../notion-databases/playtest-log.csv`
(or the Notion database) per session.
