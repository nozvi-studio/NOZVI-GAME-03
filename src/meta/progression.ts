import type { SaveDataV2 } from './save';

export interface Milestone { reach: number; start: number; requiresClear?: boolean }
export interface CheckpointsConfig { milestones: readonly Milestone[]; carryRatio: number; carryMax: number }
export interface ProgressionConfig { checkpoints: CheckpointsConfig }

// MEC-008-R2/R3 unlocks are permanent, even when milestones change.
function unlock(data: SaveDataV2, cfg: ProgressionConfig): { data: SaveDataV2; newCheckpoints: number[] } {
  const checkpoints = new Set(data.unlockedCheckpoints);
  const newCheckpoints: number[] = [];
  for (const m of cfg.checkpoints.milestones) {
    if ((m.requiresClear ? data.fullClear : data.bestLevel >= m.reach) && !checkpoints.has(m.start)) {
      checkpoints.add(m.start); newCheckpoints.push(m.start);
    }
  }
  return { data: { ...data, unlockedCheckpoints: [...checkpoints].sort((a, b) => a - b) }, newCheckpoints };
}

// MEC-008-R1 highest reached level never decreases.
export function applyLevelReached(d: SaveDataV2, level: number, cfg: ProgressionConfig): { data: SaveDataV2; newCheckpoints: number[] } {
  return unlock({ ...d, bestLevel: Math.max(d.bestLevel, level) }, cfg);
}

// MEC-008-R2 only a win earns the requiresClear milestone.
export function applyRunWon(d: SaveDataV2, cfg: ProgressionConfig): { data: SaveDataV2; newCheckpoints: number[] } {
  return unlock({ ...d, fullClear: true }, cfg);
}

// MEC-008-R6 floor the carried fraction and cap it using config.
export function carryEnergy(energy: number, cfg: ProgressionConfig): number {
  return Math.min(cfg.checkpoints.carryMax, Math.floor(energy * cfg.checkpoints.carryRatio));
}

// MEC-008-R11 hint at the lowest milestone not yet unlocked.
export function nextMilestone(d: SaveDataV2, cfg: ProgressionConfig): { reach: number; requiresClear: boolean } | null {
  const m = [...cfg.checkpoints.milestones].sort((a, b) => a.reach - b.reach)
    .find(m => !d.unlockedCheckpoints.includes(m.start));
  return m ? { reach: m.reach, requiresClear: m.requiresClear === true } : null;
}
