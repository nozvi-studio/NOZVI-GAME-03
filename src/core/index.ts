// src/core/index.ts — the only public entry of src/core
export { parseBalance } from './balance';
export type { Balance, Pair, RockShapeKey, FenceShapeKey, FenceKind, MazeLayout } from './balance';
export type * from './types';
export { createSim, restoreSim } from './sim';
export { biome, isChallenge, quota, levelTickMs, directorIntervalMs, smallHazardCap, familyRow, enabledFamilies, introducedAt, keyLevels, nextKeyLevel, fenceFirstLevel, needFor, tickMsFor } from './level';
export { FAMILIES } from './hazards/registry';
export { unlockedSkills, slotCount, unlockTable } from './skills';
