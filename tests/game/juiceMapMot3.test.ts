import { describe, expect, it } from 'vitest';
import { dedupeBumps, mapJuice } from '../../src/game/juice/juiceMap';
import { loadBalance } from '../support/balance';

const b = loadBalance(), j = b.juice, e = j.events;
const on = { balance: b, sound: true, haptics: true, reduced: false };
const red = { ...on, reduced: true };
const kinds = (c: { board: { kind: string }[]; screen: { kind: string }[] }) => [...c.board, ...c.screen].map(v => v.kind);
const broke = { type: 'shieldBroke', x: 4, y: 6, family: 'rock' } as const;

describe('MOT-3-R6 shield break', () => {
  it('burst, ring, shake, tintEnd and an icon pop on the remembered slot; sound kept', () => {
    const c = mapJuice(broke, { ...on, shieldSlot: 1 });
    expect(c.board).toEqual([
      { kind: 'tintEnd', fadeMs: j.skill.tintFadeMs },
      { kind: 'burst', x: 4, y: 6, color: 'shield', count: e.shieldBreakBurst, speed: j.bursts.eat.speed, lifeMs: e.shieldBurstLifeMs },
      { kind: 'ringPulse', x: 4, y: 6, color: 'shield', scale: e.ringScale, ms: e.ringMs },
      { kind: 'shake', amplitudePx: j.death.shakePx * e.shieldShakeFactor, ms: e.shieldShakeMs }]);
    expect(c.screen).toEqual([{ kind: 'iconPop', slot: 1, color: 'shield', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs }]);
    expect(c.sounds).toEqual(['shieldBreak']);
  });
  it('no icon pop when the slot is unknown', () => {
    expect(mapJuice(broke, on).screen).toEqual([]);
  });
  it('MOT-3-R15 reduced: keeps tintEnd and one capped flash; no burst, ring, shake or pop', () => {
    const c = mapJuice(broke, { ...red, shieldSlot: 1 });
    expect(c.board).toEqual([{ kind: 'tintEnd', fadeMs: j.skill.tintFadeMs }]);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'shield', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]);
    expect(c.sounds).toEqual(['shieldBreak']);
  });
  it('MOT-3-R15 sound and haptics settings still gate sounds', () => {
    expect(mapJuice(broke, { ...on, sound: false }).sounds).toEqual([]);
  });
});

describe('MOT-3-R7 skill unlocked', () => {
  const unlocked = (slot: 0 | 1 | null) => ({ type: 'skillUnlocked', skill: 'slowmo', slot }) as const;
  it('slot given: bigger/longer icon pop in the skill colour plus sparks from the board centre', () => {
    const c = mapJuice(unlocked(0), on);
    expect(c.screen).toEqual([
      { kind: 'iconPop', slot: 0, color: 'slowmo', scale: j.skill.iconPopScale * e.unlockPopFactor, ms: j.skill.iconPopMs + e.unlockExtraMs },
      { kind: 'sparks', from: { x: (b.board.cols - 1) / 2, y: (b.board.rows - 1) / 2 }, count: j.orb.sparkCount, ms: j.orb.sparkMs, staggerMs: j.orb.sparkStaggerMs, color: 'slowmo' }]);
    expect(c.sounds).toEqual(['unlock']); expect(c.board).toEqual([]);
  });
  it('slot null: sparks only', () => {
    expect(kinds(mapJuice(unlocked(null), on))).toEqual(['sparks']);
  });
  it('MOT-3-R15 reduced: sound only', () => {
    const c = mapJuice(unlocked(0), red);
    expect(kinds(c)).toEqual([]); expect(c.sounds).toEqual(['unlock']);
  });
});

describe('MOT-3-R8 run won', () => {
  const won = { type: 'runWon', score: 9, timeMs: 1 } as const;
  it('long glow, gold head burst, four corner bursts, gold flash, snake pop; total particles within the cap', () => {
    const c = mapJuice(won, { ...on, head: { x: 7, y: 8 } });
    expect(kinds(c)).toEqual(['levelGlow', 'burst', 'burst', 'burst', 'burst', 'burst', 'snakePop', 'flash']);
    expect(c.board[0]).toEqual({ kind: 'levelGlow', alpha: j.level.glowAlpha, ms: e.winGlowMs });
    expect(c.board[1]).toMatchObject({ x: 7, y: 8, color: 'gold', count: e.winBurstCount });
    const corners = c.board.slice(2, 6).map(v => [(v as { x: number }).x, (v as { y: number }).y]);
    expect(corners).toEqual([[0, 0], [b.board.cols - 1, 0], [0, b.board.rows - 1], [b.board.cols - 1, b.board.rows - 1]]);
    expect(c.board.filter(v => v.kind === 'burst').reduce((n, v) => n + (v as { count: number }).count, 0)).toBeLessThanOrEqual(j.perf.maxParticles);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'gold', alpha: j.skill.flashAlpha, ms: j.skill.flashMs }]);
    expect(e.winGlowMs).toBeLessThanOrEqual(j.death.totalMs); expect(c.sounds).toEqual(['biome']);
  });
  it('without a head the head burst is skipped', () => {
    expect(mapJuice(won, on).board.filter(v => v.kind === 'burst').length).toBe(4);
  });
  it('MOT-3-R15 reduced: capped soft glow only', () => {
    const c = mapJuice(won, { ...red, head: { x: 1, y: 1 } });
    expect(c.board).toEqual([{ kind: 'levelGlow', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]); expect(c.screen).toEqual([]);
  });
});

describe('MOT-3-R10 ramp ended (GO)', () => {
  const go = { type: 'rampEnded', level: 4 } as const;
  it('food-coloured flash, snake pop and a level-bar bump; sound kept', () => {
    const c = mapJuice(go, on);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'food', alpha: e.goFlashAlpha, ms: e.goFlashMs },
      { kind: 'barBump', target: 'levelBar', scale: j.barBump.scale, ms: j.barBump.ms }]);
    expect(c.board).toEqual([{ kind: 'snakePop', ms: j.level.popMs }]); expect(c.sounds).toEqual(['go']);
  });
  it('MOT-3-R15 reduced: one flash at flashAlphaMax for softMs, no pop or bump', () => {
    const c = mapJuice(go, red);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'food', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]); expect(c.board).toEqual([]);
  });
});

describe('MOT-3-R9 hazard landed', () => {
  const at = (hazardType: 'rock' | 'fence', n: number) => ({ type: 'landedAt', hazardType, cells: Array.from({ length: n }, (_, i) => ({ x: i, y: 2 })) }) as const;
  it('a rock-coloured dust burst per cell (capped), plus a short shake for flagged families', () => {
    const c = mapJuice(at('rock', 6), on);
    const bursts = c.board.filter(v => v.kind === 'burst');
    expect(bursts.length).toBe(e.landCellsMax);
    expect(bursts[0]).toEqual({ kind: 'burst', x: 0, y: 2, color: 'rock', count: e.landDust, speed: j.bursts.dust.speed, lifeMs: j.bursts.dust.lifeMs });
    expect(c.board.at(-1)).toEqual({ kind: 'shake', amplitudePx: e.landShakePx, ms: e.landShakeMs });
    expect(c.sounds).toEqual([]); // the 'land' sound stays on the sim `landed` event
  });
  it('unflagged family: dust only, no shake', () => {
    expect(kinds(mapJuice(at('fence', 2), on))).toEqual(['burst', 'burst']);
  });
  it('the sim landed event keeps its sound and adds no visual', () => {
    const c = mapJuice({ type: 'landed', hazardType: 'rock' }, on);
    expect(c.sounds).toEqual(['land']); expect(kinds(c)).toEqual([]);
  });
  it('MOT-3-R15 reduced: no dust, no shake', () => {
    expect(kinds(mapJuice(at('rock', 3), red))).toEqual([]);
  });
});
describe('MOT-3-R11 mango spawn puff', () => {
  it('a normal spawn puffs in food colour; golden skips the puff; reduced skips it', () => {
    expect(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: false }, on).board).toEqual(
      [{ kind: 'burst', x: 2, y: 3, color: 'food', count: e.spawnPuffCount, speed: j.bursts.eat.speed, lifeMs: e.spawnPuffLifeMs }]);
    expect(kinds(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: true }, on))).toEqual([]);
    expect(kinds(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: false }, red))).toEqual([]);
  });
});
describe('MOT-3-R12 snake turn', () => {
  it('a tilt toward the new direction; none when reduced; no sound or haptic', () => {
    const c = mapJuice({ type: 'turned', dx: 0, dy: 1 }, on);
    expect(c.board).toEqual([{ kind: 'turnTilt', dx: 0, dy: 1, deg: e.turnTiltDeg, ms: e.turnMs }]);
    expect(c.sounds).toEqual([]); expect(c.haptic).toBeNull();
    expect(kinds(mapJuice({ type: 'turned', dx: 0, dy: 1 }, red))).toEqual([]);
  });
});

describe('MOT-3 dedupeBumps', () => {
  const bump = (target: 'levelBar' | 'score', scale: number) => ({ kind: 'barBump', target, scale, ms: 160 }) as const;
  it('keeps one bump per target with the largest scale at the first position and passes other visuals through', () => {
    const flash = { kind: 'flash', color: 'food', alpha: 0.2, ms: 100 } as const;
    expect(dedupeBumps([bump('levelBar', 1.1), flash, bump('score', 1.15), bump('levelBar', 1.3)]))
      .toEqual([bump('levelBar', 1.3), flash, bump('score', 1.15)]);
    expect(dedupeBumps([])).toEqual([]);
  });
});
