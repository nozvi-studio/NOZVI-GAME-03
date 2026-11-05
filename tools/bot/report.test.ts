import { it } from 'vitest';
import { loadBalance } from '../../tests/support/balance';
import { BOT } from './botConfig';
import { formatReport } from './report';
import { runLevel, type LevelResult } from './runLevel';

it.skipIf(import.meta.env.MODE !== 'bot')('MEC-004-R19 bot report L1-15', () => {
  const b = loadBalance(), results: LevelResult[] = [];
  for (let l = BOT.levels.from; l <= BOT.levels.to; l++) for (let seed = 1; seed <= BOT.seeds; seed++) results.push(runLevel(b, l, seed));
  const { markdown, warnings } = formatReport(results);
  console.log(markdown); console.log(warnings.join('\n'));
}, BOT.timeoutMs * BOT.levels.to * BOT.seeds);
