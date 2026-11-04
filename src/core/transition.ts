import type { Balance } from './balance';
import { FAMILIES } from './hazards/registry';
import { biome, introducedAt, isChallenge, quota } from './level';
import { rampOnLevelUp } from './ramp';
import { applyMidRunUnlocks } from './skills';
import { placeMango } from './mango';
import { rngFrom } from './rng';
import { resetLength } from './snake';
import type { SimState, StepCtx } from './types';

// MEC-003-R7 step 1: grow/eat already resolved; reset before placing the next mango.
export function startLevelUp(s: SimState, b: Balance, ctx: StepCtx, fromRegularMango: boolean): void {
  const from = s.snake.length;
  const removed = resetLength(s, b.snake.start.length);
  const cleared = s.levelTimeMs, oldBiome = biome(b, s.level);
  s.progress -= quota(b, s.level); s.level += 1; s.levelsCleared += 1;
  s.eatenInLevel = 0; s.levelTimeMs = 0;
  for (const f of FAMILIES) f.onLevelEnd(s, ctx);
  if (fromRegularMango) placeMango(s, b, rngFrom(s.rng));
  s.phase = 'transition'; s.transitionLeftMs = b.level.transitionMs; s.acc = 0;
  ctx.emit({ type: 'shrunk', from, to: s.snake.length, removed });
  const unlocked = introducedAt(b, s.level);
  ctx.emit({ type: 'levelUp', level: s.level, biome: biome(b, s.level), challenge: isChallenge(b, s.level),
    biomeChanged: biome(b, s.level) !== oldBiome, ...(unlocked ? { unlocked } : {}), clearedLevelTimeMs: cleared });
  rampOnLevelUp(s, ctx);
  applyMidRunUnlocks(s, b, ctx);
}

// MEC-003-R7/R11 step 3: restart the snake accumulator and director at transition end.
export function levelStart(s: SimState, b: Balance): void {
  s.phase = 'playing'; s.transitionLeftMs = 0; s.acc = 0;
  s.spawnInMs = b.director.firstSpawnMs; s.mazeCooldownMs = 0;
  s.events.push({ type: 'transitionEnd', level: s.level });
}
