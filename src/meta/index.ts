// The only public entry of src/meta.
export { memoryStore } from './storage';
export type { KeyValueStore } from './storage';
export { defaultSave, load, save, SAVE_KEY, SAVE_VERSION, MIGRATIONS } from './save';
export type { Migration, SaveData, SaveDataV2, SaveRules } from './save';
export { defaultSettings, validSettings, resolveDisplay } from './settings';
export type { BoardTheme, DisplayPrefs, Settings } from './settings';
export { applyLevelReached, applyRunWon, carryEnergy, nextMilestone } from './progression';
export type { Milestone, CheckpointsConfig, ProgressionConfig } from './progression';
export { sanitizeLoadout } from './loadout';
export type { UnlockTable } from './loadout';
export { emptyLog, loadLog, nextRun, appendRecord, flushLog, LOG_KEY } from './runLog';
export { summarizeLog, deathCauseReport, PLAYER_CAUSES, NON_DEATH_CAUSES } from './runLog';
export type { LogRecord, RunLog, LogSummary, DeathCauseReport } from './runLog';
