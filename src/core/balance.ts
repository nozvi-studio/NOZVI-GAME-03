// src/core/balance.ts — Balance type + parseBalance (design §6). GDD-7
export type Pair = [number, number];
export type RockShapeKey = 'single' | 'lineH' | 'lineV' | 'corner' | 'block';
export type FenceShapeKey = 'L' | 'T' | 'Z' | 'F' | 'U' | 'plus';
export type FenceKind = 'line' | FenceShapeKey;
export interface MazeLayout { segments: [number, number, number, number][]; exclude: Pair[] }

export interface Balance {
  board: { cols: number; rows: number };
  snake: { start: Pair[]; startDir: Pair; maxQueuedTurns: number };
  speed: { startMs: number; minMs: number; msPerLevel: number };
  level: { maxLevel: number; needBase: number; needPerLevel: number; unlock: { fence: number; terrain: number; maze: number } };
  mango: {
    rotBaseMs: number; rotPerEatenMs: number; rotMinMs: number; goldenRotFactor: number; goldenChance: number;
    goldenMinEaten: number; points: { normal: number; golden: number }; progress: { normal: number; golden: number };
    nearHeadDist: number;
  };
  fairness: { nearHeadDist: number; frontLaneCells: number; terrainNearHeadDist: number };
  hazard: { crumbleMs: number };
  rock: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number;
    shapePoolByLevel: { minLevel: number; add: RockShapeKey[] }[]; shapes: Record<RockShapeKey, Pair[]>;
  };
  fence: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number; lineBase: number; lineExtraMax: number;
    gapMinLen: number; mirrorChance: number; poolAfterUnlock: { offset: number; add: FenceKind[] }[];
    shapes: Record<FenceShapeKey, Pair[]>;
  };
  maze: { warnMs: number; lifeMs: number; lifeRandMs: number; minCells: number; cooldownMs: number; layouts: MazeLayout[] };
  terrain: {
    periodMs: number; upMs: number; warnMs: number; startDelayMs: number; fadeOutMs: number; lifeMs: number;
    lifeRandMs: number; tries: number; minCells: number; waveChance: number; horizChance: number; waveLenMin: number;
    waveLenRand: number; waveWidth: number; waveDelayMs: number; checkerSize: number; maxActive: number;
    maxActiveLate: number; lateLevel: number;
  };
  director: {
    firstSpawnMs: number; intervalBaseMs: number; intervalPerLevelMs: number; intervalMinMs: number;
    capBase: number; capPerLevels: number; capMax: number; weights: { rock: number; fence: number; terrain: number; maze: number };
  };
  flow: { countdownMs: number; countdownDigits: number; maxFrameDeltaMs: number; deathCardDelayMs: number };
  ui: {
    bannerMs: number; swipeMinPx: number; swipeBoardFactor: number;
    haptics: { eatMs: number; level: number[]; deathMs: number }; terrainFadeInMs: number; hazardFlickerMs: number;
  };
}

const ROCK_KEYS: readonly RockShapeKey[] = ['single', 'lineH', 'lineV', 'corner', 'block'];
const FENCE_SHAPE_KEYS: readonly FenceShapeKey[] = ['L', 'T', 'Z', 'F', 'U', 'plus'];
const FENCE_KINDS: readonly FenceKind[] = ['line', ...FENCE_SHAPE_KEYS];

type Rule = 'int+' | 'int0' | 'num+' | 'prob' | 'pair' | 'pairs' | 'pairs0' | 'ints' | 'quad';
type Check = Rule | Spec | ((v: unknown, path: string) => void);
interface Spec { [key: string]: Check }

function fail(path: string, msg: string): never { throw new Error(`Invalid balance: ${path} ${msg}`); }
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isInt);

const RULES: Record<Rule, [(v: unknown) => boolean, string]> = {
  'int+': [v => isInt(v) && v > 0, 'must be a positive integer'],
  'int0': [v => isInt(v) && v >= 0, 'must be a non-negative integer'],
  'num+': [v => typeof v === 'number' && v > 0, 'must be a positive number'],
  prob: [v => typeof v === 'number' && v >= 0 && v <= 1, 'must be a number in [0, 1]'],
  pair: [isPair, 'must be an [x, y] integer pair'],
  pairs: [v => Array.isArray(v) && v.length > 0 && v.every(isPair), 'must be a non-empty list of [x, y] integer pairs'],
  pairs0: [v => Array.isArray(v) && v.every(isPair), 'must be a list of [x, y] integer pairs'],
  ints: [v => Array.isArray(v) && v.length > 0 && v.every(n => isInt(n) && n > 0), 'must be a non-empty list of positive integers'],
  quad: [v => Array.isArray(v) && v.length === 4 && v.every(n => isInt(n) && n >= 0), 'must be [x1, y1, x2, y2] with non-negative integers'],
};

const listOf = (item: Check) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || v.length === 0) fail(path, 'must be a non-empty list');
  v.forEach((x, i) => check(x, item, `${path}[${i}]`));
};
const namesOf = (allowed: readonly string[]) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || v.length === 0 || !v.every(n => typeof n === 'string' && allowed.includes(n)))
    fail(path, `must be a non-empty list of ${allowed.join(' | ')}`);
};
const recordOf = (keys: readonly string[], item: Check): Spec => Object.fromEntries(keys.map(k => [k, item]));
const timed: Spec = { warnMs: 'int+', lifeMs: 'int+', lifeRandMs: 'int0' };

const SPEC: Spec = {
  board: { cols: 'int+', rows: 'int+' },
  snake: { start: 'pairs', startDir: 'pair', maxQueuedTurns: 'int+' },
  speed: { startMs: 'int+', minMs: 'int+', msPerLevel: 'int0' },
  level: { maxLevel: 'int+', needBase: 'int+', needPerLevel: 'int0', unlock: { fence: 'int0', terrain: 'int0', maze: 'int0' } },
  mango: {
    rotBaseMs: 'int+', rotPerEatenMs: 'int0', rotMinMs: 'int+', goldenRotFactor: 'prob', goldenChance: 'prob',
    goldenMinEaten: 'int0', points: { normal: 'int+', golden: 'int+' }, progress: { normal: 'int+', golden: 'int+' },
    nearHeadDist: 'int+',
  },
  fairness: { nearHeadDist: 'int+', frontLaneCells: 'int+', terrainNearHeadDist: 'int+' },
  hazard: { crumbleMs: 'int+' },
  rock: { ...timed, tries: 'int+', shapePoolByLevel: listOf({ minLevel: 'int0', add: namesOf(ROCK_KEYS) }),
    shapes: recordOf(ROCK_KEYS, 'pairs') },
  fence: { ...timed, tries: 'int+', lineBase: 'int+', lineExtraMax: 'int0', gapMinLen: 'int+', mirrorChance: 'prob',
    poolAfterUnlock: listOf({ offset: 'int0', add: namesOf(FENCE_KINDS) }), shapes: recordOf(FENCE_SHAPE_KEYS, 'pairs') },
  maze: { ...timed, minCells: 'int+', cooldownMs: 'int+', layouts: listOf({ segments: listOf('quad'), exclude: 'pairs0' }) },
  terrain: {
    periodMs: 'int+', upMs: 'int+', warnMs: 'int+', startDelayMs: 'int0', fadeOutMs: 'int0', lifeMs: 'int+',
    lifeRandMs: 'int0', tries: 'int+', minCells: 'int+', waveChance: 'prob', horizChance: 'prob', waveLenMin: 'int+',
    waveLenRand: 'int+', waveWidth: 'int+', waveDelayMs: 'int0', checkerSize: 'int+', maxActive: 'int+',
    maxActiveLate: 'int+', lateLevel: 'int0',
  },
  director: {
    firstSpawnMs: 'int+', intervalBaseMs: 'int+', intervalPerLevelMs: 'int0', intervalMinMs: 'int+', capBase: 'int0',
    capPerLevels: 'int+', capMax: 'int+', weights: { rock: 'num+', fence: 'num+', terrain: 'num+', maze: 'num+' },
  },
  flow: { countdownMs: 'int+', countdownDigits: 'int+', maxFrameDeltaMs: 'int+', deathCardDelayMs: 'int0' },
  ui: {
    bannerMs: 'int+', swipeMinPx: 'num+', swipeBoardFactor: 'prob',
    haptics: { eatMs: 'int+', level: 'ints', deathMs: 'int+' }, terrainFadeInMs: 'int+', hazardFlickerMs: 'int+',
  },
};

function check(v: unknown, c: Check, path: string): void {
  if (typeof c === 'function') { c(v, path); return; }
  if (typeof c === 'object') {
    if (!isObj(v)) fail(path || 'balance', 'must be an object');
    for (const k of Object.keys(c)) check(v[k], c[k] as Check, path ? `${path}.${k}` : k);
    return;
  }
  const [ok, msg] = RULES[c];
  if (!ok(v)) fail(path, msg);
}

/** Validates the balance JSON and returns it typed; throws `Invalid balance: <path> <reason>`. GDD-7 */
export function parseBalance(json: unknown): Balance {
  check(json, SPEC, '');
  const b = json as Balance;
  if (b.speed.minMs > b.speed.startMs) fail('speed.minMs', 'must be ≤ speed.startMs');
  if (b.mango.rotMinMs > b.mango.rotBaseMs) fail('mango.rotMinMs', 'must be ≤ mango.rotBaseMs');
  if (b.terrain.upMs + b.terrain.warnMs >= b.terrain.periodMs) fail('terrain.periodMs', 'must be > upMs + warnMs');
  if (b.snake.start.length < 2) fail('snake.start', 'must have at least 2 cells');
  if (Math.abs(b.snake.startDir[0]) + Math.abs(b.snake.startDir[1]) !== 1) fail('snake.startDir', 'must be one unit step');
  return b;
}
