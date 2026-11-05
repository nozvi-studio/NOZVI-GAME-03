// src/core/types.ts — public API types of the core (design §4, §4.1)
import type { Balance, FenceKind } from './balance';
import type { Rng, RngState } from './rng';
import type { CandidateOpts } from './hazards/placement';
import type { TilePatch } from './hazards/blocks/groundTiles';

export type Step = -1 | 0 | 1;
export interface Dir { x: Step; y: Step }
export interface Cell { x: number; y: number }

export type SkillId = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain';
export type Loadout = readonly [SkillId | null, SkillId | null];
export interface SimOptions { startLevel?: number; startEnergy?: number; loadout?: Loadout; bestLevel?: number }
export type TableFamily = 'rock' | 'fence' | 'terrain' | 'maze' | 'mud' | 'ice';
export type IntroKey = TableFamily | 'rottenRock';
export interface LevelRow {
  from: number; to: number; weights: Partial<Record<FamilyKey, number>>;
  rockShapes: string[]; fenceShapes: string[]; rottenRocks: boolean;
}
export type CauseKey = 'wall' | 'self' | 'rotten' | 'rock' | 'fence' | 'maze' | 'ground' | 'snipWall' | 'rubble';   // prototype CAUSES L336
export type FamilyKey = TableFamily | 'rottenRock' | 'snipWall' | 'rubble';
export type TileKind = 'mud' | 'ice';
export type HitKind = 'mover' | 'area';
export interface HitCtx { hitHead(family: FamilyKey, x: number, y: number, kind: HitKind, dir: Dir): void }
export type CapClass = 'small' | 'big' | 'modifier' | 'none';
export type TimedKey = 'rock' | 'fence' | 'maze';
export type UnlockKey = 'fence' | 'terrain' | 'maze';

export type TimedPhase = 'warn' | 'solid' | 'crumble';
export interface TimedCell { x: number; y: number; on: boolean; ageMs: number }
export interface TimedHazard {
  spawnSeq?: number;
  family: TimedKey; state: TimedPhase; t: number; warnMs: number; lifeMs: number;
  landed: boolean; cells: TimedCell[]; kind?: FenceKind;               // kind only on fences
}
export type TerrainVis = 'down' | 'warn' | 'up';
export interface TerrainCell { x: number; y: number; delay: number; up: boolean; vis: TerrainVis }
export interface TerrainHazard { family: 'terrain'; t: number; lifeMs: number; cells: TerrainCell[] }
/** MEC-003-R22 active level-up slowdown; leftMs counts sim ms down to 0. */
export interface LevelUpSlow { factor: number; easeMs: number; leftMs: number }
export interface RottenRock { family: 'rottenRock'; x: number; y: number; state: 'solid' | 'crumble'; leftMs: number }
export interface SnipWall { family: 'snipWall'; cells: Cell[]; state: 'solid' | 'crumble'; leftMs: number }
export interface Rubble { family: 'rubble'; x: number; y: number; state: 'solid' | 'crumble'; leftMs: number }
export type HazardInstance = TimedHazard | TerrainHazard | RottenRock | SnipWall | Rubble;
export interface RainState { castId: number; leftMs: number; elapsedMs: number; drops: number; dropped: number }
export interface RainMango { x: number; y: number; ageMs: number; castId: number }

export interface MangoState { x: number; y: number; golden: boolean; leftMs: number; totalMs: number }
export type SimStatus = 'playing' | 'over';
export interface Outcome { won: boolean; cause?: CauseKey }

export type SimEvent =
  | { type: 'skillUsed'; slot: 0 | 1; skill: SkillId; level: number; energyBefore: number; energyAfter: number }
  | { type: 'skillRejected'; slot: 0 | 1; skill: SkillId | null; reason: 'empty' | 'active' | 'energy' | 'noTarget' }
  | { type: 'skillEnded'; skill: SkillId; reason: 'timeout' | 'consumed' }
  | { type: 'tailSnipped'; cut: number; cells: Cell[] }
  | { type: 'shieldBroke'; x: number; y: number; family: FamilyKey; rubble: Cell | null }
  | { type: 'rainDrop'; x: number; y: number }
  | { type: 'rainDropSkipped' }
  | { type: 'rainMangoExpired'; x: number; y: number }
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
  | { type: 'runWon'; score: number; timeMs: number }
  | { type: 'landed'; hazardType: TimedKey }
  | { type: 'dust'; x: number; y: number }
  | { type: 'rotted'; x: number; y: number; leftRock: boolean }
  | { type: 'hazardIncoming'; family: FamilyKey }
  | { type: 'died'; cause: CauseKey; x: number; y: number; context?: TileKind };

/** All Sim state. Plain JSON data only: no closures, Map/Set or class instances. */
export interface SimState {
  families: { rock: TimedHazard[]; fence: TimedHazard[]; maze: TimedHazard[]; terrain: TerrainHazard[]; rottenRock: RottenRock[]; snipWall: SnipWall[]; rubble: Rubble[]; mud: { patches: TilePatch[]; nextId: number }; ice: { patches: TilePatch[]; nextId: number } };
  nextHazardSeq: number;
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
  levelUpSlow: LevelUpSlow | null;
  shield: { leftMs: number } | null;
  rain: RainState | null;
  rainMangoes: RainMango[];
  rainBudgets: { castId: number; left: number }[];
  nextCastId: number;
  orbs: { x: number; y: number; ageMs: number }[];
  orbSpawnMs: number;
  rampActive: boolean;
  rampEaten: number;
  mango: MangoState | null;
  spawnInMs: number;
  mazeCooldownMs: number;
  score: number;
  eatenInRun: number;
  retryMs: number;
  level: number;               // 1-based
  progress: number;
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
  tiles: readonly { family: TileKind; id: number; state: 'warn' | 'active' | 'fade'; leftMs: number; cells: readonly { x: number; y: number; on: boolean }[]; ring?: readonly Cell[] }[];
  headTile: TileKind | null;
  skills: readonly { slot: 0 | 1; id: SkillId | null; cost: number; affordable: boolean; active: boolean; leftMs: number }[];
  slowmo: { leftMs: number } | null;
  levelUpSlow: LevelUpSlow | null;
  snipWall: readonly { x: number; y: number; state: 'solid' | 'crumble'; leftMs: number }[];
  shield: { leftMs: number } | null;
  rubble: readonly Omit<Rubble, 'family'>[];
  rain: { leftMs: number; dropsLeft: number } | null;
  rainMangoes: readonly { x: number; y: number; leftMs: number }[];
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
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): boolean;  // true if queued; ignored (false) after the run is over
  advance(ms: number): void;                     // ms must be a non-negative integer; no-op after `over`
  drainEvents(): SimEvent[];                     // events since the last call, in order
  snapshot(): Readonly<SimSnapshot>;             // read-only view for rendering
  clone(): Sim;                                  // independent copy: structuredClone of the state
}

/** Per-call view for spawning; never stored in SimState. */
export interface SpawnObserver {
  spawned(family: FamilyKey, cells: readonly Cell[], before: SimState, after: SimState): void;
}
export interface SpawnCtx {
  readonly balance: Balance;
  readonly level: number;
  readonly rng: Rng; // Explicit spawn RNG; spawnCtx supplies the simulation stream by default.
  readonly observer?: SpawnObserver;
  /** MEC-004-R10-R12 supplied by spawnCtx to keep descriptors independent of the registry. */
  candidateValid(s: SimState, cells: readonly Cell[], opts: CandidateOpts): boolean;
  /** In bounds, not reserved, not near the head (d defaults to balance.fairness.nearHeadDist). */
  cellFree(x: number, y: number, d?: number): boolean;
}
/** Per-call view for one 1 ms update; never stored in SimState. */
export interface StepCtx {
  readonly balance: Balance;
  snakeOn(x: number, y: number): boolean;
  emit(e: SimEvent): void;
}

export interface InstanceRules<S extends { family: FamilyKey }> {
  key: FamilyKey;
  cause: CauseKey;                                     // rock→'rock', fence→'fence', maze→'maze', terrain→'ground'
  capClass: CapClass;                                  // rock, fence: 'small' (director cap); maze, terrain: 'big'
  maxActiveKey: string | null;                         // balance key of a per-family max; terrain: 'terrain.maxActive'
  emitsIncoming?: boolean;                            // true when the family emits its own incoming warning
  spawn(ctx: SpawnCtx, rng: Rng, s: SimState): S | null; // MEC-004-R10-R12 validates candidates against the live board.
  update(state: S, ctx: StepCtx): 'keep' | 'remove';   // one 1 ms step
  solidAt(state: S, x: number, y: number): boolean;    // collision
  bfsWallAt(state: S, x: number, y: number): boolean;  // reachability walls
  reservedAt(state: S, x: number, y: number): boolean; // placement reserved
  onBreak?(s: SimState, x: number, y: number): void;    // MEC-006-R26 removes one broken solid cell
  breakable: boolean;                                  // MEC-006-R24 Shield can break it; false only for rubble
}

// MEC-004-R2 state-level family contract; descriptors never retain simulation state.
export interface HazardFamily {
  readonly key: FamilyKey;
  readonly breakable: boolean;
  readonly cause: CauseKey | null;
  readonly capClass: CapClass;
  readonly maxActiveKey: string | null;
  readonly emitsIncoming?: boolean; // MEC-004-R9 true when spawn/update owns hazardIncoming.
  spawn(s: SimState, ctx: SpawnCtx): Cell[] | null;
  update(s: SimState, ctx: StepCtx & HitCtx): void;
  snapshot(s: SimState): unknown;
  solidAt(s: SimState, x: number, y: number): boolean;
  bfsWallAt(s: SimState, x: number, y: number): boolean;
  reservedAt(s: SimState, x: number, y: number): boolean;
  count?(s: SimState): number;
  tileAt?(s: SimState, x: number, y: number): TileKind | null;
  headHit?(s: SimState, x: number, y: number): HitKind | null;
  onBreak?(s: SimState, x: number, y: number): void;
}
