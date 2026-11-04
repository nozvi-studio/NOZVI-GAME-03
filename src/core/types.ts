// src/core/types.ts — public API types of the core (design §4, §4.1)
import type { Balance, FenceKind } from './balance';
import type { Rng, RngState } from './rng';

export type Step = -1 | 0 | 1;
export interface Dir { x: Step; y: Step }
export interface Cell { x: number; y: number }

export type SkillId = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain';
export type Loadout = readonly [SkillId | null, SkillId | null];
export interface SimOptions { startLevel?: number; startEnergy?: number; loadout?: Loadout; bestLevel?: number }
export type TableFamily = 'rock' | 'fence' | 'terrain' | 'maze';
export type IntroKey = TableFamily | 'rottenRock';
export interface LevelRow {
  from: number; to: number; weights: Partial<Record<TableFamily, number>>;
  rockShapes: string[]; fenceShapes: string[]; rottenRocks: boolean;
}
export type CauseKey = 'wall' | 'self' | 'rotten' | 'rock' | 'fence' | 'maze' | 'ground' | 'snipWall' | 'rubble';   // prototype CAUSES L336
export type FamilyKey = TableFamily | 'rottenRock' | 'snipWall' | 'rubble';
export type CapClass = 'small' | 'big' | 'modifier' | 'none';
export type TimedKey = 'rock' | 'fence' | 'maze';
export type UnlockKey = 'fence' | 'terrain' | 'maze';

export type TimedPhase = 'warn' | 'solid' | 'crumble';
export interface TimedCell { x: number; y: number; on: boolean; ageMs: number }
export interface TimedHazard {
  family: TimedKey; state: TimedPhase; t: number; warnMs: number; lifeMs: number;
  landed: boolean; cells: TimedCell[]; kind?: FenceKind;               // kind only on fences
}
export type TerrainVis = 'down' | 'warn' | 'up';
export interface TerrainCell { x: number; y: number; delay: number; up: boolean; vis: TerrainVis }
export interface TerrainHazard { family: 'terrain'; t: number; lifeMs: number; cells: TerrainCell[] }
export interface RottenRock { family: 'rottenRock'; x: number; y: number; state: 'solid' | 'crumble'; leftMs: number }
export interface SnipWall { family: 'snipWall'; cells: Cell[]; state: 'solid' | 'crumble'; leftMs: number }
export type HazardInstance = TimedHazard | TerrainHazard | RottenRock | SnipWall;

export interface MangoState { x: number; y: number; golden: boolean; leftMs: number; totalMs: number }
export type SimStatus = 'playing' | 'over';
export interface Outcome { won: boolean; cause?: CauseKey }

export type SimEvent =
  | { type: 'skillUsed'; slot: 0 | 1; skill: SkillId; level: number; energyBefore: number; energyAfter: number }
  | { type: 'skillRejected'; slot: 0 | 1; skill: SkillId | null; reason: 'empty' | 'busy' | 'active' | 'energy' | 'noTarget' }
  | { type: 'skillEnded'; skill: SkillId; reason: 'timeout' | 'consumed' }
  | { type: 'tailSnipped'; cut: number; cells: Cell[] }
  | { type: 'skillUnlocked'; skill: SkillId; slot: 0 | 1 | null }
  | { type: 'slotUnlocked'; slot: 1 }
  | { type: 'energyChanged'; energy: number; delta: number; source: 'orb' | 'golden' | 'skill' }
  | { type: 'orbSpawned'; x: number; y: number }
  | { type: 'orbEaten'; x: number; y: number; gained: number }
  | { type: 'orbExpired'; x: number; y: number }
  | { type: 'rampEnded'; level: number }
  | { type: 'ate'; x: number; y: number; golden: boolean; points: number; progressGain: number; source: 'mango' | 'rain' }
  | { type: 'mangoDeferred' }
  | { type: 'shrunk'; from: number; to: number; removed: Cell[] }
  | { type: 'levelUp'; level: number; biome: number; challenge: boolean; biomeChanged: boolean; unlocked?: IntroKey; clearedLevelTimeMs: number }
  | { type: 'transitionEnd'; level: number }
  | { type: 'runWon'; score: number; timeMs: number }
  | { type: 'landed'; hazardType: TimedKey }
  | { type: 'dust'; x: number; y: number }
  | { type: 'rotted'; x: number; y: number; leftRock: boolean }
  | { type: 'hazardIncoming'; family: UnlockKey }
  | { type: 'died'; cause: CauseKey; x: number; y: number };

/** All Sim state. Plain JSON data only: no closures, Map/Set or class instances. */
export interface SimState {
  snake: Cell[];               // head first
  dir: Dir;
  queue: Dir[];                // queued turns, max balance.snake.maxQueuedTurns
  headFrom: Cell;
  tailFrom: Cell;
  acc: number;                 // ms accumulated toward the next snake step
  tickMs: number;
  energy: number;
  loadout: [SkillId | null, SkillId | null];
  bestLevel: number;
  slowmo: { leftMs: number } | null;
  snipWalls: SnipWall[];
  orbs: { x: number; y: number; ageMs: number }[];
  orbSpawnMs: number;
  rampActive: boolean;
  rampEaten: number;
  mango: MangoState | null;
  rottenRocks: RottenRock[];
  hazards: TimedHazard[];      // rock/fence/maze in spawn order (prototype `hazards`)
  terrains: TerrainHazard[];   // prototype `terrains`
  spawnInMs: number;
  mazeCooldownMs: number;
  score: number;
  eatenInRun: number;
  retryMs: number;
  level: number;               // 1-based
  progress: number;
  phase: 'playing' | 'transition';
  transitionLeftMs: number;
  levelTimeMs: number;
  timeMs: number;
  startLevel: number;
  levelsCleared: number;
  eatenInLevel: number;
  status: SimStatus;
  outcome: Outcome | null;
  events: SimEvent[];          // pending, emptied by drainEvents()
  rng: RngState;
}

export interface MangoView { x: number; y: number; golden: boolean; leftMs: number; totalMs: number; ageMs: number }
export interface HazardView {
  type: TimedKey; state: TimedPhase; t: number; warnMs: number; lifeMs: number; kind?: FenceKind;
  cells: readonly TimedCell[];
}
export interface TerrainView { t: number; lifeMs: number; cells: readonly { x: number; y: number; vis: TerrainVis; delay: number }[] }

export interface SimSnapshot {
  skills: readonly { slot: 0 | 1; id: SkillId | null; cost: number; affordable: boolean; active: boolean; leftMs: number }[];
  slowmo: { leftMs: number } | null;
  snipWall: readonly { x: number; y: number; state: 'solid' | 'crumble'; leftMs: number }[];
  energy: number;
  energyMax: number;
  orbs: readonly { x: number; y: number; leftMs: number }[];
  rampActive: boolean;
  rampMangoesLeft: number;
  snake: readonly Cell[];
  dir: Dir;
  heading: Dir;                // last queued direction, else dir (D-pad)
  headFrom: Cell;
  tailFrom: Cell;
  tickAlpha: number;           // status === 'over' ? 1 : min(1, acc / tickMs)  (L1007)
  mango: MangoView | null;
  rottenRocks: readonly Omit<RottenRock, 'family'>[];
  eatenInLevel: number;
  eatenInRun: number;
  hazards: readonly HazardView[];
  terrains: readonly TerrainView[];
  score: number;
  level: number;
  progress: number;
  need: number;
  tickMs: number;
  biome: number;
  challenge: boolean;
  phase: 'playing' | 'transition';
  transitionLeftMs: number;
  levelTimeMs: number;
  timeMs: number;
  startLevel: number;
  levelsCleared: number;
  length: number;
  minLength: number;
  status: SimStatus;
  outcome: Outcome | null;
}

export interface Sim {
  useSkill(slot: 0 | 1): void;                    // synchronous, never buffered
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): void;  // ignored after the run is over
  advance(ms: number): void;                     // ms must be a non-negative integer; no-op after `over`
  drainEvents(): SimEvent[];                     // events since the last call, in order
  snapshot(): Readonly<SimSnapshot>;             // read-only view for rendering
  clone(): Sim;                                  // independent copy: structuredClone of the state
}

/** Per-call view for spawning; never stored in SimState. */
export interface SpawnCtx {
  readonly balance: Balance;
  readonly level: number;
  /** In bounds, not reserved, not near the head (d defaults to balance.fairness.nearHeadDist). */
  cellFree(x: number, y: number, d?: number): boolean;
}
/** Per-call view for one 1 ms update; never stored in SimState. */
export interface StepCtx {
  readonly balance: Balance;
  snakeOn(x: number, y: number): boolean;
  emit(e: SimEvent): void;
}

export interface HazardFamily<S extends { family: FamilyKey }> {
  key: FamilyKey;
  cause: CauseKey;                                     // rock→'rock', fence→'fence', maze→'maze', terrain→'ground'
  capClass: CapClass;                                  // rock, fence: 'small' (director cap); maze, terrain: 'big'
  maxActiveKey: string | null;                         // balance key of a per-family max; terrain: 'terrain.maxActive'
  spawn(ctx: SpawnCtx, rng: Rng): S | null;            // placement rules of design §5, unchanged
  update(state: S, ctx: StepCtx): 'keep' | 'remove';   // one 1 ms step
  solidAt(state: S, x: number, y: number): boolean;    // collision
  bfsWallAt(state: S, x: number, y: number): boolean;  // reachability walls
  reservedAt(state: S, x: number, y: number): boolean; // placement reserved
  onLevelEnd(s: SimState, ctx: StepCtx): void;         // MEC-003-R7; context supplies configured crumble time
  onBreak?(s: SimState, x: number, y: number): void;    // MEC-006-R25; implemented in Task 7
  breakable: boolean;                                  // false for all in P0 (Shield is P1)
}
