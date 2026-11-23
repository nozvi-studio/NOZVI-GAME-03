// MEC-003-R21 debug-only console summary helper (shared by Home DOM screen and tests). Pure: no Phaser.
import type { Balance } from '../../core';
import { deathCauseReport, summarizeLog, type RunLog } from '../../meta';

export function installSummarize(balance: Balance, win: { __summarize?: (json: string) => unknown }): void {
  win.__summarize = (json: string) => {
    const log = JSON.parse(json) as RunLog;
    return {
      ...summarizeLog(log, balance.log.sessionGapMs),
      deathReport: deathCauseReport(log, balance.log.sessionGapMs),
    };
  };
}
