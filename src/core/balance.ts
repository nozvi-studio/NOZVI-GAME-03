// src/core/balance.ts — Balance type + parseBalance (design §6). GDD-7
import type { LevelRow } from './types';
import { DEFAULT_FAMILIES } from './hazards/registry';

export type Pair = [number, number];
export type RockShapeKey = 'single' | 'lineH' | 'lineV' | 'corner' | 'block';
export type FenceShapeKey = 'L' | 'T' | 'Z' | 'F' | 'U' | 'plus';
export type FenceKind = 'line' | FenceShapeKey;
export interface MazeLayout { segments: [number, number, number, number][]; exclude: Pair[] }

/** MEC-003-R22 one slowdown tier, by the level just reached. */
export interface SlowdownTier { from: number; to: number; factor: number; easeMs: number }

export interface Balance {
  board: { cols: number; rows: number };
  snake: { start: Pair[]; startDir: Pair; maxQueuedTurns: number };
  speed: { startMs: number; minMs: number; msPerLevel: number };
  level: { maxLevel: number; perBiome: number; needBase: number; needStepLevels: number; table: LevelRow[] };
  levelUpSlowdown: { tiers: SlowdownTier[] };
  mango: {
    rotBaseMs: number; rotPerEatenMs: number; rotMinMs: number; goldenRotFactor: number; goldenChance: number;
    goldenMinEaten: number; points: { normal: number; golden: number }; progress: { normal: number; golden: number };
    nearHeadDist: number; rottenRockLifeMs: number; placeRetryMs: number;
  };
  fairness: { nearHeadDist: number; frontLaneCells: number; terrainNearHeadDist: number; minWarnMs: number; minWarnTicks: number; escapeHorizonMs: number };
  hazard: { crumbleMs: number };
  rock: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number;
    shapes: Record<RockShapeKey, Pair[]>;
  };
  fence: {
    warnMs: number; lifeMs: number; lifeRandMs: number; tries: number; lineBase: number; lineExtraMax: number;
    gapMinLen: number; mirrorChance: number;
    shapes: Record<FenceShapeKey, Pair[]>;
  };
  maze: { warnMs: number; lifeMs: number; lifeRandMs: number; minCells: number; cooldownMs: number; layouts: MazeLayout[] };
  terrain: {
    periodMs: number; upMs: number; warnMs: number; startDelayMs: number; fadeOutMs: number; lifeMs: number;
    lifeRandMs: number; tries: number; minCells: number; waveChance: number; horizChance: number; waveLenMin: number;
    waveLenRand: number; waveWidth: number; waveDelayMs: number; checkerSize: number; maxActive: number;

  };
  director: {
    firstSpawnMs: number; intervalBaseMs: number; intervalPerLevelMs: number; intervalMinMs: number;
    capBase: number; capPerLevels: number; capMax: number; challengeIntervalFactor: number; challengeCapBonus: number;
  };
  energy: { max: number; orbGain: number; goldenGain: number; orbSpawnIntervalMs: number; orbMax: number; orbLifeMs: number; orbBlinkMs: number; orbFromLevel: number };
  skills: {
    slowmo: { cost: number; durationMs: number; tickFactor: number; unlockLevel: number };
    tailSnip: { cost: number; minLength: number; wallLifeMs: number; unlockLevel: number };
    shield: { cost: number; durationMs: number; rubbleLifeMs: number; bonkPauseTicks: number; unlockLevel: number };
    mangoRain: { cost: number; durationMs: number; dropsMin: number; dropsMax: number; barCapFraction: number; mangoLifeMs: number; mangoBlinkMs: number; unlockLevel: number };
  };
  loadout: { slots: number; secondSlotLevel: number; order: import('./types').SkillId[] };
  checkpoints: { milestones: { reach: number; start: number; requiresClear?: boolean }[]; carryRatio: number; carryMax: number; rampMangoes: number };
  log: { maxEntries: number; sessionGapMs: number };
  flow: { countdownMs: number; countdownDigits: number; maxFrameDeltaMs: number; deathCardDelayMs: number };
  ui: {
    bannerMs: number; swipeMinPx: number; swipeBoardFactor: number;
    haptics: { eatMs: number; level: number[]; deathMs: number }; terrainFadeInMs: number; hazardFlickerMs: number;
  };
}

const ROCK_KEYS: readonly RockShapeKey[] = ['single', 'lineH', 'lineV', 'corner', 'block'];
const FENCE_SHAPE_KEYS: readonly FenceShapeKey[] = ['L', 'T', 'Z', 'F', 'U', 'plus'];
const FENCE_KINDS: readonly FenceKind[] = ['line', ...FENCE_SHAPE_KEYS];

type Rule = 'int+' | 'int0' | 'num+' | 'prob' | 'pair' | 'pairs' | 'pairs0' | 'ints' | 'quad' | 'bool' | 'num0';
type Check = Rule | Spec | ((v: unknown, path: string) => void);
interface Spec { [key: string]: Check }

function fail(path: string, msg: string): never { throw new Error(`balance: ${path} ${msg}`); }
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isInt);

const RULES: Record<Rule, [(v: unknown) => boolean, string]> = {
  bool: [v => typeof v === 'boolean', 'must be a boolean'],
  num0: [v => typeof v === 'number' && Number.isFinite(v) && v >= 0, 'must be a non-negative finite number'],
  'int+': [v => isInt(v) && v > 0, 'must be a positive integer'],
  'int0': [v => isInt(v) && v >= 0, 'must be a non-negative integer'],
  'num+': [v => typeof v === 'number' && Number.isFinite(v) && v > 0, 'must be a positive number'],
  prob: [v => typeof v === 'number' && v >= 0 && v <= 1, 'must be a number in [0, 1]'],
  pair: [isPair, 'must be an [x, y] integer pair'],
  pairs: [v => Array.isArray(v) && v.length > 0 && v.every(isPair), 'must be a non-empty list of [x, y] integer pairs'],
  pairs0: [v => Array.isArray(v) && v.every(isPair), 'must be a list of [x, y] integer pairs'],
  ints: [v => Array.isArray(v) && v.length > 0 && v.every(n => isInt(n) && n > 0), 'must be a non-empty list of positive integers'],
  quad: [v => Array.isArray(v) && v.length === 4 && v.every(n => isInt(n) && n >= 0), 'must be [x1, y1, x2, y2] with non-negative integers'],
};

const listOf = (item: Check, allowEmpty = false) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || (!allowEmpty && v.length === 0)) fail(path, 'must be a non-empty list');
  v.forEach((x, i) => check(x, item, `${path}[${i}]`));
};
const namesOf = (allowed: readonly string[], allowEmpty = false) => (v: unknown, path: string): void => {
  if (!Array.isArray(v) || (!allowEmpty && v.length === 0) || !v.every(n => typeof n === 'string' && allowed.includes(n)))
    fail(path, `must be a non-empty list of ${allowed.join(' | ')}`);
};
const recordOf = (keys: readonly string[], item: Check): Spec => Object.fromEntries(keys.map(k => [k, item]));
const timed: Spec = { warnMs: 'int+', lifeMs: 'int+', lifeRandMs: 'int0' };

const SPEC: Spec = {
  board: { cols: 'int+', rows: 'int+' },
  snake: { start: 'pairs', startDir: 'pair', maxQueuedTurns: 'int+' },
  speed: { startMs: 'int+', minMs: 'int+', msPerLevel: 'int0' },
  level: { maxLevel: 'int+', perBiome: 'int+', needBase: 'int+', needStepLevels: 'int+', table: listOf({
    from: 'int+', to: 'int+', weights: (v, path) => {
      if (!isObj(v)) fail(path, 'must be an object');
      for (const [key, value] of Object.entries(v)) {
        // MEC-004-R1 only registered director families may have table weights.
        if (!DEFAULT_FAMILIES.some(f => f.key === key && f.capClass !== 'none')) fail(path, 'unknown or non-director family ' + key);
        check(value, 'num0', path + '.' + key);
      }
    }, rockShapes: namesOf(ROCK_KEYS, true), fenceShapes: namesOf(FENCE_KINDS, true), rottenRocks: 'bool',
  }) },
  levelUpSlowdown: { tiers: listOf({ from: 'int+', to: 'int+', factor: 'num+', easeMs: 'int+' }, true) },
  mango: {
    rotBaseMs: 'int+', rotPerEatenMs: 'int0', rotMinMs: 'int+', goldenRotFactor: 'prob', goldenChance: 'prob',
    goldenMinEaten: 'int0', points: { normal: 'int+', golden: 'int+' }, progress: { normal: 'int+', golden: 'int+' },
    nearHeadDist: 'int+', rottenRockLifeMs: 'int+', placeRetryMs: 'int+',
  },
  fairness: { nearHeadDist: 'int+', frontLaneCells: 'int+', terrainNearHeadDist: 'int+', minWarnMs: 'int+', minWarnTicks: 'int+', escapeHorizonMs: 'int+' },
  hazard: { crumbleMs: 'int+' },
  rock: { ...timed, tries: 'int+',
    shapes: recordOf(ROCK_KEYS, 'pairs') },
  fence: { ...timed, tries: 'int+', lineBase: 'int+', lineExtraMax: 'int0', gapMinLen: 'int+', mirrorChance: 'prob',
    shapes: recordOf(FENCE_SHAPE_KEYS, 'pairs') },
  maze: { ...timed, minCells: 'int+', cooldownMs: 'int+', layouts: listOf({ segments: listOf('quad'), exclude: 'pairs0' }) },
  terrain: {
    periodMs: 'int+', upMs: 'int+', warnMs: 'int+', startDelayMs: 'int0', fadeOutMs: 'int0', lifeMs: 'int+',
    lifeRandMs: 'int0', tries: 'int+', minCells: 'int+', waveChance: 'prob', horizChance: 'prob', waveLenMin: 'int+',
    waveLenRand: 'int+', waveWidth: 'int+', waveDelayMs: 'int0', checkerSize: 'int+', maxActive: 'int+',

  },
  director: {
    firstSpawnMs: 'int+', intervalBaseMs: 'int+', intervalPerLevelMs: 'int0', intervalMinMs: 'int+', capBase: 'int0',
    capPerLevels: 'int+', capMax: 'int+', challengeIntervalFactor: 'num+', challengeCapBonus: 'int0',
  },
  energy: { max: 'int+', orbGain: 'int+', goldenGain: 'int+', orbSpawnIntervalMs: 'int+', orbMax: 'int+', orbLifeMs: 'int+', orbBlinkMs: 'int+', orbFromLevel: 'int+' },
  skills: {
    slowmo: { cost: 'int+', durationMs: 'int+', tickFactor: 'num+', unlockLevel: 'int+' },
    tailSnip: { cost: 'int+', minLength: 'int+', wallLifeMs: 'int+', unlockLevel: 'int+' },
    shield: { cost: 'int+', durationMs: 'int+', rubbleLifeMs: 'int+', bonkPauseTicks: 'int+', unlockLevel: 'int+' },
    mangoRain: { cost: 'int+', durationMs: 'int+', dropsMin: 'int+', dropsMax: 'int+', barCapFraction: 'prob', mangoLifeMs: 'int+', mangoBlinkMs: 'int+', unlockLevel: 'int+' },
  },
  loadout: { slots: 'int+', secondSlotLevel: 'int+', order: namesOf(['slowmo', 'tailSnip', 'shield', 'mangoRain']) },
  checkpoints: { milestones: listOf((v, path) => {
    check(v, { reach: 'int+', start: 'int+' }, path);
    if (isObj(v) && v.requiresClear !== undefined) check(v.requiresClear, 'bool', path + '.requiresClear');
  }), carryRatio: 'prob', carryMax: 'int0', rampMangoes: 'int+' },
  log: { maxEntries: 'int+', sessionGapMs: 'int+' },
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

/** Validates the balance JSON and returns it typed; throws `balance: <path> <reason>`. GDD-7 */
export function parseBalance(json: unknown): Balance {
  check(json, SPEC, '');
  const b = json as Balance;
  // MEC-004-R9 validate descriptor cap paths once, including disabled families.
  for (const family of DEFAULT_FAMILIES) if (family.maxActiveKey !== null) {
    let value: unknown = b;
    for (const part of family.maxActiveKey.split('.')) value = isObj(value) && Object.hasOwn(value, part) ? value[part] : undefined;
    check(value, 'int+', family.maxActiveKey);
  }
  if (b.speed.minMs > b.speed.startMs) fail('speed.minMs', 'must be ≤ speed.startMs');
  if (b.mango.rotMinMs > b.mango.rotBaseMs) fail('mango.rotMinMs', 'must be ≤ mango.rotBaseMs');
  if (b.terrain.upMs + b.terrain.warnMs >= b.terrain.periodMs) fail('terrain.periodMs', 'must be > upMs + warnMs');
  // MEC-004-R13 warning time uses the L1 base tick, independent of slow effects.
  const minWarnMs = Math.max(b.fairness.minWarnMs, b.fairness.minWarnTicks * b.speed.startMs);
  for (const family of ['rock', 'fence', 'maze', 'terrain'] as const) {
    if (b[family].warnMs < minWarnMs) fail(family + '.warnMs', 'must be >= ' + minWarnMs);
  }
  if (b.snake.start.length < 2) fail('snake.start', 'must have at least 2 cells');
  if (Math.abs(b.snake.startDir[0]) + Math.abs(b.snake.startDir[1]) !== 1) fail('snake.startDir', 'must be one unit step');
  // MEC-001-R6 a reset can only trim after growth.
  if (b.snake.start.length > b.skills.tailSnip.minLength + 1) fail('snake.start', 'must be <= skills.tailSnip.minLength + 1');
  // MEC-002 section 9; MEC-003-R12.
  if (b.mango.goldenRotFactor <= 0) fail('mango.goldenRotFactor', 'must be > 0');
  // MEC-003-R22 slowdown tiers are sorted, disjoint, inside 2..maxLevel and actually slow down.
  let prevTo = 1;
  for (const [i, t] of b.levelUpSlowdown.tiers.entries()) {
    const path = 'levelUpSlowdown.tiers[' + i + ']';
    if (t.from <= prevTo || t.to < t.from || t.to > b.level.maxLevel) fail(path, 'must be sorted, disjoint and inside 2..maxLevel');
    if (t.factor <= 1) fail(path + '.factor', 'must be > 1');
    prevTo = t.to;
  }
  // MEC-003-R14/R16 rows cover every level once, with at most one first introduction.
  let nextLevel = 1;
  const seen = new Set<string>();
  for (const [i, row] of b.level.table.entries()) {
    const path = 'level.table[' + i + ']';
    if (row.from !== nextLevel || row.to < row.from || row.to > b.level.maxLevel) fail(path, 'must cover 1..maxLevel without gaps or overlaps');
    const enabled = Object.keys(row.weights).filter(k => row.weights[k as keyof typeof row.weights]! > 0);
    if (row.rottenRocks) enabled.push('rottenRock');
    const fresh = enabled.filter(k => !seen.has(k));
    if (fresh.length > 1) fail(path, 'introduces more than one family');
    enabled.forEach(k => seen.add(k));
    if ((row.weights.rock ?? 0) > 0 && !row.rockShapes.length) fail(path + '.rockShapes', 'must enable a shape for rock');
    if ((row.weights.fence ?? 0) > 0 && !row.fenceShapes.length) fail(path + '.fenceShapes', 'must enable a shape for fence');
    nextLevel = row.to + 1;
  }
  if (nextLevel !== b.level.maxLevel + 1) fail('level.table', 'must cover 1..maxLevel');
  // MEC-006 section 9 skill and orb timing guards.
  const rain = b.skills.mangoRain;
  if (b.skills.slowmo.tickFactor <= 1) fail('skills.slowmo.tickFactor', 'must be > 1');
  if (rain.barCapFraction <= 0) fail('skills.mangoRain.barCapFraction', 'must be > 0');
  if (rain.dropsMin > rain.dropsMax) fail('skills.mangoRain.dropsMin', 'must be <= dropsMax');
  if (rain.mangoBlinkMs >= rain.mangoLifeMs) fail('skills.mangoRain.mangoBlinkMs', 'must be < mangoLifeMs');
  if (b.energy.orbBlinkMs >= b.energy.orbLifeMs) fail('energy.orbBlinkMs', 'must be < orbLifeMs');
  // MEC-007 section 9 unlock ordering and level bounds.
  const inLevelRange = (n: number) => n >= 1 && n <= b.level.maxLevel;
  if (b.loadout.order.length !== 4 || new Set(b.loadout.order).size !== 4) fail('loadout.order', 'must list each skill exactly once');
  let lastUnlock = 0;
  for (const id of b.loadout.order) {
    const unlock = b.skills[id].unlockLevel;
    if (!inLevelRange(unlock) || unlock < lastUnlock) fail('skills.' + id + '.unlockLevel', 'must be in 1..maxLevel and non-decreasing in loadout.order');
    lastUnlock = unlock;
  }
  if (!inLevelRange(b.loadout.secondSlotLevel)) fail('loadout.secondSlotLevel', 'must be in 1..maxLevel');
  // MEC-008 section 9 checkpoint ranges and carry limits.
  for (const [i, m] of b.checkpoints.milestones.entries()) {
    if (!inLevelRange(m.reach) || !inLevelRange(m.start) || m.start >= m.reach) fail('checkpoints.milestones[' + i + ']', 'requires levels in 1..maxLevel and start < reach');
  }
  if (b.checkpoints.carryRatio <= 0) fail('checkpoints.carryRatio', 'must be > 0');
  if (b.checkpoints.carryMax > b.energy.max) fail('checkpoints.carryMax', 'must be <= energy.max');
  return b;
}
