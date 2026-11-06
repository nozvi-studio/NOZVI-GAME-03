import { it } from 'vitest';
import { loadBalance } from '../../tests/support/balance';
import { boardSizeVerdict, median, reachableFreeCells, type BoardSizeResult } from './boardSize';
import { BOT, PERCENT } from './botConfig';
import { formatReport } from './report';
import { runLevel, type LevelResult } from './runLevel';

/** Wall-clock budget for the whole report: one per-run budget for every level and seed. */
const REPORT_WALL_CLOCK_MS = BOT.timeoutMs * BOT.levels.to * BOT.seeds;
const BOARD_LEVELS = [25, 30] as const;
const BAND_A = { from: 21, to: 25 }, BAND_B = { from: 26, to: 30 };

const clearRate = (rs: readonly LevelResult[], from: number, to: number) => {
  const band = rs.filter(r => r.level >= from && r.level <= to);
  return band.length ? band.filter(r => r.outcome === 'clear').length / band.length : 0;
};

it.skipIf(import.meta.env.MODE !== 'bot')('MEC-004-R19 bot report L1-30', () => {
  const b = loadBalance(), results: LevelResult[] = [], samples = new Map<number, number[]>();
  const boardCells = b.board.cols * b.board.rows;
  for (let l = BOT.levels.from; l <= BOT.levels.to; l++) for (let seed = 1; seed <= BOT.seeds; seed++) {
    const keep = (BOARD_LEVELS as readonly number[]).includes(l);
    results.push(runLevel(b, l, seed, keep ? s => { (samples.get(l) ?? samples.set(l, []).get(l)!).push(reachableFreeCells(s, b)); } : undefined));
  }
  const { markdown, warnings } = formatReport(results);
  console.log(markdown); console.log(warnings.join('\n'));
  if (BOARD_LEVELS.some(l => !(samples.get(l)?.length))) { console.log('board-size: skipped, L25/L30 not in range'); return; }
  const res = (l: number): BoardSizeResult => {
    const m = median(samples.get(l)!);
    return { level: l, medianReachable: m, boardCells, share: m / boardCells, clearRate: clearRate(results, l, l) };
  };
  const r25 = res(25), r30 = res(30);
  const c1 = clearRate(results, BAND_A.from, BAND_A.to), c2 = clearRate(results, BAND_B.from, BAND_B.to);
  const v = boardSizeVerdict(r25, r30, c1, c2);
  console.log(`BOARDSIZE L25 median reachable ${r25.medianReachable} (${Math.round(r25.share * PERCENT)}%), clear ${r25.clearRate}`);
  console.log(`BOARDSIZE L30 median reachable ${r30.medianReachable} (${Math.round(r30.share * PERCENT)}%), clear ${r30.clearRate}`);
  console.log(`BOARDSIZE clear L21-25 ${c1.toFixed(2)} L26-30 ${c2.toFixed(2)} escalate=${v.escalate} ${v.reasons.join('; ')}`);
}, REPORT_WALL_CLOCK_MS);
