import type { CauseKey } from '../../src/core/types';
import { PERCENT, WARN_SHARE } from './botConfig';
import type { LevelResult } from './runLevel';

const PLAYER_CAUSES: readonly CauseKey[] = ['wall', 'self'];
const pct = (n: number, d: number) => Math.round((n / d) * PERCENT);

// MEC-004-R19 death-cause report; warnings cover zero-clear levels and dominant family causes.
export function formatReport(results: readonly LevelResult[]): { markdown: string; warnings: string[] } {
  const warnings: string[] = [], out: string[] = [];
  const levels = [...new Set(results.map(r => r.level))].sort((a, b) => a - b);
  out.push('| Level | clear | death | timeout |', '|---|---|---|---|');
  for (const l of levels) {
    const rs = results.filter(r => r.level === l), n = (o: string) => rs.filter(r => r.outcome === o).length;
    out.push(`| ${l} | ${n('clear')} | ${n('death')} | ${n('timeout')} |`);
    if (n('clear') === 0) warnings.push(`WARN L${l} cleared by 0 seeds`);
  }
  const biomes = [...new Set(results.map(r => r.biome))].sort((a, b) => a - b);
  for (const b of biomes) {
    const deaths = results.filter(r => r.biome === b && r.outcome === 'death');
    if (!deaths.length) continue;
    const count = new Map<string, number>(), family = new Map<string, number>();
    for (const d of deaths) {
      const cause = d.cause ?? 'unknown', row = d.context ? `${cause} (${d.context})` : cause;
      count.set(row, (count.get(row) ?? 0) + 1);
      if (!PLAYER_CAUSES.includes(cause as CauseKey)) family.set(cause, (family.get(cause) ?? 0) + 1);
    }
    out.push('', `### Biome ${b}`, '| cause (context) | count | share |', '|---|---|---|');
    const player: string[] = [];
    for (const [row, c] of [...count].sort((x, y) => y[1] - x[1])) {
      const line = `| ${row} | ${c} | ${pct(c, deaths.length)}% |`;
      (PLAYER_CAUSES.some(p => row === p || row.startsWith(`${p} (`)) ? player : out).push(line);
    }
    if (player.length) out.push('', `Player causes (biome ${b})`, '| cause (context) | count | share |', '|---|---|---|', ...player);
    for (const [cause, c] of family) {
      if (c / deaths.length > WARN_SHARE) warnings.push(`WARN biome ${b}: ${cause} ${pct(c, deaths.length)}% of deaths (> ${WARN_SHARE * PERCENT}%)`);
    }
  }
  return { markdown: out.join('\n'), warnings };
}
