import type { CauseKey, IntroKey, UnlockKey } from '../core';

export const TEXT = {
  title: 'Mango Snake: Hard', header: 'Mango Snake', hard: 'hard', score: 'score', best: 'best',
  start: 'Fill the bar with mangoes to level up. Each level brings new obstacles.',
  play: 'Play', resume: 'Resume', playAgain: 'Play again', paused: 'Paused',
  pausedText: 'You get a short countdown when you resume.',
  landsSoon: 'Lands soon', groundRising: 'Ground rising', mangoRotting: 'Mango rotting',
  over: 'Game over', won: 'You filled the board!', wonWhy: 'No room left for mangoes.',
} as const;

export const CAUSE_TEXT: Record<CauseKey, string> = {
  wall: 'You hit the edge of the board.', self: 'You bit your own tail.',
  rotten: 'You hit a rock left by a rotten mango.', rock: 'A falling rock got you.',
  fence: 'You ran into a fence.', maze: 'You ran into a hedge.', ground: 'The ground rose in front of you.',
  snipWall: 'You hit your discarded tail.', rubble: 'You hit the rubble.',
};
const UNLOCK_NAMES: Record<IntroKey, string> = { rock: 'rocks', rottenRock: 'rotten rocks', fence: 'fences', terrain: 'rising ground', maze: 'hedge mazes', mud: 'mud' };
const INCOMING: Record<UnlockKey, string> = { fence: 'Fence incoming', maze: 'Maze incoming', terrain: 'The ground is shaking' };

// GDD-13 all player-facing P0 labels and messages match design §7.5.
export const levelLabel = (level: number): string => `Level ${level}`;
export const progressLabel = (progress: number, need: number, level: number, maxLevel: number): string =>
  level >= maxLevel ? 'Max level' : `${progress}/${need} mangoes`;
export const levelBanner = (level: number, unlocked?: IntroKey): string =>
  `${levelLabel(level)}: ${unlocked ? `${UNLOCK_NAMES[unlocked]} unlocked` : 'a bit faster'}`;
export const incomingBanner = (family: UnlockKey): string => INCOMING[family];
export const deathMessage = (won: boolean, cause: CauseKey | undefined, score: number, level: number): string =>
  `${won ? TEXT.wonWhy : cause ? CAUSE_TEXT[cause] : ''} Score ${score}, level ${level}.`;
export const bestLine = (kind: 'start' | 'over', best: number, newBest = false, score = 0): string =>
  kind === 'over' && newBest && score > 0 ? 'New best score!' : best > 0 ? `Best score ${best}` : '';

// P1 keyed strings: MEC-003/006/007/008 §8 plus cause.* (MEC-003-R20 quit, clear).
const KEYED: Readonly<Record<string, string>> = {
  'banner.levelUp': 'Level {n}', 'banner.freshStart': 'Fresh start!',
  'banner.biome.1': 'Mango Orchard', 'banner.biome.2': 'Rice Paddy', 'banner.biome.3': 'Frozen Pond',
  'banner.biome.4': 'Rocky Hills', 'banner.biome.5': 'Backyard', 'banner.biome.6': 'Storm Garden',
  'banner.new.rock': 'Rocks unlocked', 'banner.new.rottenRock': 'Rotten mangoes turn to rock!',
  'banner.new.fence': 'Fences unlocked', 'banner.new.terrain': 'Rising ground unlocked', 'banner.new.maze': 'Hedge mazes unlocked',
  'banner.new.mud': 'Mud! You slow down while your head is in it.',
  'death.context.mud': 'You were slowed by mud.',
  'hud.level': 'L{n} · Biome {b}', 'hud.energy': 'Energy {energy}/{max}',
  'skill.slowmo.name': 'Slow-mo', 'skill.tailSnip.name': 'Tail Snip', 'skill.shield.name': 'Shield', 'skill.mangoRain.name': 'Mango Rain',
  'skill.reject.energy': 'Need {cost} energy', 'skill.reject.active': 'Already on!',
  'skill.reject.noTarget': 'Too short to snip',
  'tip.orb.first': 'Energy orb! Fuel for skills',
  'death.snipWall': CAUSE_TEXT.snipWall, 'death.rubble': CAUSE_TEXT.rubble,
  'loadout.title': 'Pick your skills', 'loadout.go': 'Go!', 'loadout.back': 'Back',
  'loadout.slot1': 'Slot 1', 'loadout.slot2': 'Slot 2', 'loadout.locked': 'Reach L{level}',
  'tip.skillUnlocked.slot': '{skill} unlocked! Tap {side} to use it',
  'tip.skillUnlocked.next': '{skill} unlocked! Pick it before your next run',
  'tip.slotUnlocked': 'Second skill slot unlocked!',
  'home.playCheckpoint': 'Play from checkpoint L{level}', 'home.playL1': 'Play from L1', 'home.play': 'Play',
  'home.carry': 'Start energy: {e}',
  'home.exportLog': 'Export log', 'home.exportDone': 'Log copied',
  'banner.checkpoint': 'Next run starts at L{level}!',
  'tip.checkpoint': 'Checkpoints are permanent. Your saved energy comes with you.',
  'hud.nextCheckpoint': 'Next checkpoint at L{level}', 'hud.nextCheckpointClear': 'Next checkpoint: clear L{level}',
  'hud.ramp': 'Warming up {n}',
  'side.left': 'left', 'side.right': 'right',
  'results.level': 'Level {level}', 'results.cleared': 'Levels cleared: {n}', 'results.score': 'Score {score}',
  'results.best': 'Best {best}', 'results.newBest': 'New best!', 'results.carry': 'Energy saved: {e}',
  'results.won': 'You cleared every level!', 'results.home': 'Home', 'pause.quit': 'Quit',
  'playAgain': TEXT.playAgain, 'resume': TEXT.resume, 'paused': TEXT.paused, 'pausedText': TEXT.pausedText,
  'home.soundOn': 'Sound: on', 'home.soundOff': 'Sound: off', 'skill.ready': 'Ready', 'loadout.picked': 'Slot {n}',
  ...Object.fromEntries(Object.entries(CAUSE_TEXT).map(([k, v]) => [`cause.${k}`, v])),
  'cause.quit': 'Quit', 'cause.clear': 'You cleared level 30!',
};

/** Keyed text lookup with `{var}` substitution; an unknown key returns the key itself. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = KEYED[key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m)) : s;
}
