import type { Balance } from '../balance';
import { goodCells } from '../energy';
import { quota } from '../level';
import { rampOnMangoEaten } from '../ramp';
import { rngFrom } from '../rng';
import type { SkillDef } from '../skills';
import { checkLevelClear } from '../transition';
import type { SimState, StepCtx } from '../types';

// MEC-006-R29/R30 drop every scheduled drop that is due; no candidate loses the drop.
function dropDue(s: SimState, b: Balance, ctx: StepCtx): void {
  const r = s.rain!, step = Math.floor(b.skills.mangoRain.durationMs / r.drops);
  while (r.dropped < r.drops && r.elapsedMs >= r.dropped * step) {
    r.dropped += 1;
    const good = goodCells(s, b);
    if (!good.length) { ctx.emit({ type: 'rainDropSkipped' }); continue; }
    const { x, y } = rngFrom(s.rng).pick(good);
    s.rainMangoes.push({ x, y, ageMs: 0, castId: r.castId });
    ctx.emit({ type: 'rainDrop', x, y });
  }
}

// MEC-006-R29/R32 cast: roll the drop count, open the cast budget, drop the first mango now.
export const mangoRainSkill: SkillDef = {
  id: 'mangoRain', active: s => s.rain !== null, precondition: () => true,
  apply(s, b, ctx) {
    const m = b.skills.mangoRain, castId = s.nextCastId++;
    const drops = m.dropsMin + rngFrom(s.rng).int(m.dropsMax - m.dropsMin + 1);
    s.rainBudgets.push({ castId, left: Math.floor(quota(b, s.level) * m.barCapFraction) });
    s.rain = { castId, leftMs: m.durationMs, elapsedMs: 0, drops, dropped: 0 };
    dropDue(s, b, ctx);
  },
  leftMs: s => s.rain?.leftMs ?? 0,
};

// MEC-006-R29..R31 step 11: age and expire rain mangoes, then run the drop schedule.
export function rainTick(s: SimState, b: Balance, ctx: StepCtx): void {
  const m = b.skills.mangoRain;
  s.rainMangoes = s.rainMangoes.filter(r => {
    r.ageMs += 1;
    if (r.ageMs < m.mangoLifeMs) return true;
    ctx.emit({ type: 'rainMangoExpired', x: r.x, y: r.y });
    return false;
  });
  if (s.rain) {
    s.rain.elapsedMs += 1; s.rain.leftMs -= 1;
    dropDue(s, b, ctx);
    if (s.rain.leftMs <= 0) { s.rain = null; ctx.emit({ type: 'skillEnded', skill: 'mangoRain', reason: 'timeout' }); }
  }
  pruneBudgets(s);
}

// MEC-006 section 3 a budget goes when its cast has ended and none of its mangoes remain.
function pruneBudgets(s: SimState): void {
  if (!s.rainBudgets.length) return;
  s.rainBudgets = s.rainBudgets.filter(g => s.rain?.castId === g.castId || s.rainMangoes.some(r => r.castId === g.castId));
}

// MEC-006-R32/R33 eat a rain mango at the new head cell (the snake already grew).
export function eatRain(s: SimState, b: Balance, ctx: StepCtx, x: number, y: number): void {
  const i = s.rainMangoes.findIndex(r => r.x === x && r.y === y);
  if (i < 0) return;
  const [r] = s.rainMangoes.splice(i, 1);
  const budget = s.rainBudgets.find(g => g.castId === r!.castId);
  const progressGain = budget && budget.left > 0 ? 1 : 0;
  if (budget) budget.left -= progressGain;
  const points = b.mango.points.normal;
  s.score += points; s.progress += progressGain;
  ctx.emit({ type: 'ate', x, y, golden: false, points, progressGain, source: 'rain' });
  rampOnMangoEaten(s, b, ctx);                                   // MEC-008-R8
  checkLevelClear(s, b, ctx);                                    // MEC-006-R34 / MEC-002-R8
  s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  pruneBudgets(s);
}
