import { it, expect } from 'vitest';
import { chooseMove } from '../../tools/bot/policy';
import { runLevel } from '../../tools/bot/runLevel';
import { formatReport } from '../../tools/bot/report';
import type { LevelResult } from '../../tools/bot/runLevel';
import { buildBoard } from '../support/board';
import { loadBalance } from '../support/balance';

const RUN_TEST_TIMEOUT_MS = 60000;
const death = (level: number, cause: string, biome = 2): LevelResult =>
  ({ level, seed: 1, outcome: 'death', cause: cause as never, biome });

it('MEC-004-R19 bot steers away from a wall it would hit next step', () => {
  const s = buildBoard({ head: [16, 8], dir: [1, 0], mango: [16, 2] });
  expect(chooseMove(loadBalance(), s)).toEqual({ x: 0, y: -1 });
});
it('MEC-004-R19 report warns on a family cause above 40% but not on self', () => {
  const { warnings } = formatReport([
    ...['fence', 'fence', 'fence', 'rock'].map(c => death(7, c)),
    ...Array.from({ length: 5 }, () => death(7, 'self')),
    { level: 7, seed: 1, outcome: 'clear' as const, biome: 2 },
  ]);
  expect(warnings).toEqual([]);  // fence 33%, self ignored, L7 cleared once
  const w2 = formatReport(['fence', 'fence', 'rock'].map(c => death(7, c))).warnings;
  expect(w2).toContain('WARN biome 2: fence 67% of deaths (> 40%)');
});
it('MEC-004-R19 report warns when a level has no clear', () => {
  const { warnings } = formatReport([death(9, 'rock', 2), death(9, 'wall', 2)]);
  expect(warnings).toContain('WARN L9 cleared by 0 seeds');
});
it('MEC-004-R19 report lists player causes separately with a context split', () => {
  const { markdown } = formatReport([{ ...death(13, 'wall', 3), context: 'ice' }, death(13, 'self', 3)]);
  expect(markdown).toContain('Player causes');
  expect(markdown).toContain('wall (ice)');
});
it.skipIf(import.meta.env.MODE !== 'bot')('MEC-004-R19 runLevel is deterministic and returns a typed result', () => {
  const b = loadBalance();
  const a = runLevel(b, 1, 1);
  expect(runLevel(b, 1, 1)).toEqual(a);
  expect(a.level).toBe(1);
  expect(['clear', 'death', 'timeout']).toContain(a.outcome);
}, RUN_TEST_TIMEOUT_MS);
