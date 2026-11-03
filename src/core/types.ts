// src/core/types.ts — public API types of the core (design §4, §4.1)
import type { Balance, FenceKind } from './balance';
import type { Rng, RngState } from './rng';

export type Step = -1 | 0 | 1;
export interface Dir { x: Step; y: Step }
export interface Cell { x: number; y: number }

export type CauseKey = 'wall' | 'self' | 'rotten' | 'rock' | 'fence' | 'maze' | 'ground';   // prototype CAUSES L336
export type FamilyKey = 'rock' | 'fence' | 'maze' | 'terrain';
export type CapClass = 'small' | 'big' | 'modifier' | 'none';
export type TimedKey = Exclude<FamilyKey, 'terrain'>;
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
export type HazardInstance = TimedHazard | TerrainHazard;

export interface MangoState { x: number; y: number; golden: boolean; leftMs: number; totalMs: number }
export type SimStatus = 'playing' | 'over';
export interface Outcome { won: boolean; cause?: CauseKey }

export type SimEvent =
  | { type: 'ate'; x: number; y: number; golden: boolean; points: number }
  | { type: 'levelUp'; level: number; unlocked?: UnlockKey }
  | { type: 'landed'; hazardType: TimedKey }
  | { type: 'dust'; x: number; y: number }
  | { type: 'rotted'; x: number; y: number; leftRock: boolean }
  | { type: 'hazardIncoming'; family: UnlockKey }
  | { type: 'died'; cause: CauseKey; x: number; y: number }
  | { type: 'boardFull' };

/** All Sim state. Plain JSON data only: no closures, Map/Set or class instances. */
export interface SimState {
  snake: Cell[];               // head first
  dir: Dir;
  queue: Dir[];                // queued turns, max balance.snake.maxQueuedTurns
  headFrom: Cell;
  tailFrom: Cell;
  acc: number;                 // ms accumulated toward the next snake step
  tickMs: number;
  mango: MangoState | null;
  rottenRocks: Cell[];
  hazards: TimedHazard[];      // rock/fence/maze in spawn order (prototype `hazards`)
  terrains: TerrainHazard[];   // prototype `terrains`
  spawnInMs: number;
  mazeCooldownMs: number;
  score: number;
  eaten: number;
  level: number;               // 0-based
  progress: number;
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
  snake: readonly Cell[];
  dir: Dir;
  heading: Dir;                // last queued direction, else dir (D-pad)
  headFrom: Cell;
  tailFrom: Cell;
  tickAlpha: number;           // status === 'over' ? 1 : min(1, acc / tickMs)  (L1007)
  mango: MangoView | null;
  rottenRocks: readonly Cell[];
  hazards: readonly HazardView[];
  terrains: readonly TerrainView[];
  score: number;
  level: number;
  progress: number;
  need: number;
  tickMs: number;
  status: SimStatus;
  outcome: Outcome | null;
}

export interface Sim {
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
  breakable: boolean;                                  // false for all in P0 (Shield is P1)
}
