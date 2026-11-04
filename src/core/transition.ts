import type { Balance } from './balance';
import { FAMILIES } from './hazards/registry';
import { biome, introducedAt, isChallenge, quota } from './level';
import { rampOnLevelUp } from './ramp';
import { applyMidRunUnlocks } from './skills';
import { startLevelUpSlow } from './slowdown';
import { resetLength } from './snake';
import type { SimState, StepCtx } from './types';

// MEC-003-R7 the level-up chain runs inside the eating step; the game never stops (Flow B).
export function startLevelUp(s: SimState, b: Balance, ctx: StepCtx): void {
  const from = s.snake.length;
  const removed = resetLength(s, b.snake.start.length);
  const cleared = s.levelTimeMs, oldBiome = biome(b, s.level);
  s.progress -= quota(b, s.level); s.level += 1; s.levelsCleared += 1;
  s.eatenInLevel = 0; s.levelTimeMs = 0;
  for (const f of FAMILIES) f.onLevelEnd(s, ctx);
  // MEC-003-R11 the director restarts with the new level's formulas; MEC-003-R22 slowdown (re)starts.
  s.spawnInMs = b.director.firstSpawnMs; s.mazeCooldownMs = 0;
  startLevelUpSlow(s, b);
  ctx.emit({ type: 'shrunk', from, to: s.snake.length, removed });
  const unlocked = introducedAt(b, s.level);
  ctx.emit({ type: 'levelUp', level: s.level, biome: biome(b, s.level), challenge: isChallenge(b, s.level),
    biomeChanged: biome(b, s.level) !== oldBiome, ...(unlocked ? { unlocked } : {}), clearedLevelTimeMs: cleared });
  rampOnLevelUp(s, ctx);
  applyMidRunUnlocks(s, b, ctx);
}

// MEC-003-R5/R6 after any mango: the final clear wins; earlier clears start the level-up chain.
export function checkLevelClear(s: SimState, b: Balance, ctx: StepCtx): void {
  if (s.progress < quota(b, s.level)) return;
  if (s.level === b.level.maxLevel) {
    s.mango = null;
    s.levelsCleared = b.level.maxLevel; s.status = 'over'; s.outcome = { won: true };
    ctx.emit({ type: 'runWon', score: s.score, timeMs: s.timeMs });
  } else startLevelUp(s, b, ctx);
}
