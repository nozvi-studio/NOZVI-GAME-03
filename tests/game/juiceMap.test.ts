import { describe, expect, it } from 'vitest';
import { mapJuice, deathTimeline, bannerMotion, trimOldest } from '../../src/game/juice/juiceMap';
import { loadBalance } from '../support/balance';
const b = loadBalance(), j = b.juice;
const on = { balance: b, sound: true, haptics: true, reduced: false };
const red = { ...on, reduced: true };
const kinds = (c: { board: { kind: string }[]; screen: { kind: string }[] }) => [...c.board, ...c.screen].map(v => v.kind);
const ate = (golden: boolean) => ({ type: 'ate', x: 3, y: 4, golden, points: golden ? 5 : 1, progressGain: 1, source: 'mango' } as const);

describe('P3a-R1 eat mango', () => {
  it('gulp, burst, float, score bump, chirp, 12 ms', () => {
    const c = mapJuice(ate(false), on);
    expect(kinds(c)).toEqual(['burst', 'floatText', 'gulp', 'barBump']);
    expect(c.board[0]).toMatchObject({ x: 3, y: 4, color: 'food', ...j.bursts.eat });
    expect(c.screen[0]).toMatchObject({ target: 'score', scale: j.barBump.scale });
    expect(c.sounds).toEqual(['eat']); expect(c.haptic).toBe(j.haptics.eatMs); expect(j.haptics.eatMs).toBe(12);
  });
  it('golden: double chirp sound id, gold burst, big float', () => {
    const c = mapJuice(ate(true), on);
    expect(c.sounds).toEqual(['golden']);
    expect(c.board[0]).toMatchObject({ color: 'gold', ...j.bursts.golden });
    expect(c.board[1]).toMatchObject({ kind: 'floatText', big: true, points: 5 });
  });
});
describe('P3a-R2 eat energy orb', () => {
  it('sparks toward the energy bar, zap, 8 ms', () => {
    const c = mapJuice({ type: 'orbEaten', x: 2, y: 5, gained: 15 }, on);
    expect(c.screen[0]).toMatchObject({ kind: 'sparks', from: { x: 2, y: 5 }, count: j.orb.sparkCount, ms: j.orb.sparkMs, color: 'orb' });
    expect(c.screen[1]).toMatchObject({ kind: 'barBump', target: 'energyBar', scale: j.orb.barBumpScale });
    expect(c.sounds).toEqual(['orb']); expect(c.haptic).toBe(8);
  });
});
describe('P3a-R3 skill cast', () => {
  const cast = (skill: 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain') =>
    ({ type: 'skillUsed', slot: 1, skill, level: 3, energyBefore: 80, energyAfter: 40 } as const);
  it('each skill has its own sound, a coloured flash, an icon pop on its slot, 20 ms', () => {
    const sounds = (['slowmo', 'tailSnip', 'shield', 'mangoRain'] as const).map(s => mapJuice(cast(s), on).sounds[0]);
    expect(sounds).toEqual(['skillSlowmo', 'skillSnip', 'skillShield', 'skillRain']);
    expect(new Set(sounds).size).toBe(4);
    const c = mapJuice(cast('tailSnip'), on);
    expect(c.screen).toEqual([
      { kind: 'flash', color: 'tailSnip', alpha: j.skill.flashAlpha, ms: j.skill.flashMs },
      { kind: 'iconPop', slot: 1, color: 'tailSnip', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs }]);
    expect(c.haptic).toBe(20); expect(c.board).toEqual([]);
  });
  it('Shield tints the board for its duration and skillEnded clears it; Slow-mo is tinted by the HUD, not the mapper', () => {
    expect(mapJuice(cast('slowmo'), on).board).toEqual([]);
    expect(mapJuice(cast('shield'), on).board).toEqual([{ kind: 'tint', color: 'shield', alpha: j.skill.tintAlpha, fadeMs: j.skill.tintFadeMs, ms: b.skills.shield.durationMs }]);
    expect(mapJuice({ type: 'skillEnded', skill: 'shield', reason: 'timeout' }, on).board).toEqual([{ kind: 'tintEnd', fadeMs: j.skill.tintFadeMs }]);
    expect(mapJuice({ type: 'skillEnded', skill: 'slowmo', reason: 'timeout' }, on).board).toEqual([]);
    expect(mapJuice({ type: 'skillEnded', skill: 'tailSnip', reason: 'timeout' }, on).board).toEqual([]);
  });
  it('rejected cast plays "nope" except for an empty slot', () => {
    expect(mapJuice({ type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' }, on).sounds).toEqual(['nope']);
    expect(mapJuice({ type: 'skillRejected', slot: 0, skill: null, reason: 'empty' }, on).sounds).toEqual([]);
  });
});
describe('P3a-R4/R5 level up and biome change', () => {
  const lvl = (biomeChanged: boolean) => ({ type: 'levelUp', level: biomeChanged ? 7 : 3, biome: biomeChanged ? 2 : 1, challenge: false, biomeChanged, clearedLevelTimeMs: 1 } as const);
  it('level up: snake pop, gold glow, level-bar bump, arpeggio, 15-40-15', () => {
    const c = mapJuice(lvl(false), on);
    expect(kinds(c)).toEqual(['snakePop', 'levelGlow', 'barBump']);
    expect(c.board[1]).toMatchObject({ alpha: j.level.glowAlpha, ms: j.level.glowMs });
    expect(c.screen[0]).toMatchObject({ target: 'levelBar' });
    expect(c.sounds).toEqual(['level']); expect(c.haptic).toEqual([15, 40, 15]);
  });
  it('biome change: palette sweep, longer jingle replaces the arpeggio, 30 ms', () => {
    const c = mapJuice(lvl(true), on);
    expect(c.board.find(v => v.kind === 'biomeSweep')).toEqual({ kind: 'biomeSweep', biome: 2, alpha: j.biome.sweepAlpha, ms: j.biome.sweepMs, sweep: true });
    expect(c.sounds).toEqual(['biome']); expect(c.haptic).toBe(30);
  });
});
describe('P3a-R6 checkpoint unlocked', () => {
  it('flag plants on the level bar, fanfare, 40 ms', () => {
    const c = mapJuice({ type: 'checkpointUnlocked', level: 6 }, on);
    expect(c.screen).toEqual([{ kind: 'flagPlant', level: 6, ms: j.checkpoint.flagMs }]);
    expect(c.sounds).toEqual(['checkpoint']); expect(c.haptic).toBe(40);
  });
});
describe('P3a-R7 death', () => {
  const died = { type: 'died', cause: 'fence', x: 1, y: 1 } as const;
  it('shake, red flash with vignette, burst, drop sound, 90 ms, carries the cause for the card', () => {
    const c = mapJuice(died, on);
    expect(c.board.map(v => v.kind)).toEqual(['burst', 'shake']);
    expect(c.board[1]).toEqual({ kind: 'shake', amplitudePx: j.death.shakePx, ms: j.death.shakeMs });
    expect(c.screen).toEqual([{ kind: 'deathFlash', alpha: j.death.flashAlpha, ms: j.death.flashMs, vignette: true }]);
    expect(c.sounds).toEqual(['die']); expect(c.haptic).toBe(90); expect(c.death).toEqual({ cause: 'fence' });
  });
  it('timeline: card then Results within 1.5 s in both modes', () => {
    for (const reduced of [false, true]) {
      const t = deathTimeline(b, reduced);
      expect(t.totalMs).toBeLessThanOrEqual(1500);
      expect(t.cardInMs).toBeLessThan(t.totalMs);
      expect(t.cardInMs + t.skipLockMs).toBeLessThan(t.totalMs);
    }
    expect(deathTimeline(b, true).shakeMs).toBe(0);
  });
});
describe('P3a-R8 reduced motion is applied inside the mapper', () => {
  it('no shake, no particle bursts, no pops or bumps, no skill flash or icon pop, flashes capped', () => {
    const events = [ate(false), ate(true), { type: 'orbEaten', x: 1, y: 1, gained: 15 },
      { type: 'skillUsed', slot: 0, skill: 'slowmo', level: 3, energyBefore: 80, energyAfter: 40 },
      { type: 'levelUp', level: 7, biome: 2, challenge: false, biomeChanged: true, clearedLevelTimeMs: 1 },
      { type: 'levelUp', level: 3, biome: 0, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 },
      { type: 'checkpointUnlocked', level: 10 },
      { type: 'died', cause: 'wall', x: 0, y: 0 }, { type: 'rotted', x: 1, y: 1, leftRock: true }, { type: 'dust', x: 1, y: 1 }] as const;
    for (const e of events) {
      const c = mapJuice(e, red);
      const all = [...c.board, ...c.screen];
      for (const v of all) {
        expect(['shake', 'burst', 'snakePop', 'gulp', 'sparks', 'barBump', 'iconPop', 'flash']).not.toContain(v.kind);
        if ('alpha' in v && (v.kind === 'deathFlash' || v.kind === 'levelGlow' || v.kind === 'biomeSweep')) expect(v.alpha).toBeLessThanOrEqual(j.reduced.flashAlphaMax);
      }
    }
    expect(mapJuice(ate(false), red).board.map(v => v.kind)).toEqual(['floatText']); // info stays, motion goes
    const flag = mapJuice({ type: 'checkpointUnlocked', level: 10 }, red).screen.find(v => v.kind === 'flagPlant');
    expect(flag && flag.kind === 'flagPlant' ? flag.ms : -1).toBe(0); // planted instantly, no motion
    const plain = mapJuice({ type: 'levelUp', level: 3, biome: 0, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }, red);
    expect(kinds(plain)).toEqual(['levelGlow']); // no snakePop, no barBump, no sweep
    expect(plain.board[0]).toMatchObject({ alpha: j.reduced.flashAlphaMax });
    const death = mapJuice({ type: 'died', cause: 'wall', x: 0, y: 0 }, red);
    expect(death.screen).toEqual([{ kind: 'deathFlash', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs, vignette: false }]);
    expect(death.sounds).toEqual(['die']); expect(death.haptic).toBe(90); // sound and haptics are not motion
    expect(mapJuice({ type: 'levelUp', level: 7, biome: 2, challenge: false, biomeChanged: true, clearedLevelTimeMs: 1 }, red).board)
      .toEqual([{ kind: 'levelGlow', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs },
        { kind: 'biomeSweep', biome: 2, alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs, sweep: false }]);
  });
  it('banner motion: slide + scale normally, soft fade when reduced', () => {
    expect(bannerMotion(b, false)).toEqual({ inMs: j.banner.inMs, slidePx: j.banner.slidePx, scaleFrom: j.banner.scaleFrom });
    expect(bannerMotion(b, true)).toEqual({ inMs: j.reduced.softMs, slidePx: 0, scaleFrom: 1 });
  });
});
describe('P3a-R9 settings gating', () => {
  it('sound off drops sounds only; haptics off drops haptics only', () => {
    const e = { type: 'died', cause: 'wall', x: 0, y: 0 } as const;
    expect(mapJuice(e, { ...on, sound: false }).sounds).toEqual([]);
    expect(mapJuice(e, { ...on, sound: false }).haptic).toBe(90);
    expect(mapJuice(e, { ...on, haptics: false }).haptic).toBeNull();
    expect(mapJuice(e, { ...on, haptics: false }).sounds).toEqual(['die']);
    expect(mapJuice(e, { ...on, haptics: false }).board.map(v => v.kind)).toContain('shake');
  });
});
describe('P3a-R11 perf guard', () => {
  it('trimOldest keeps the newest `max` items', () => {
    const a = [1, 2, 3, 4, 5]; trimOldest(a, 3); expect(a).toEqual([3, 4, 5]);
    const s = [1]; trimOldest(s, 3); expect(s).toEqual([1]);
  });
});
describe('legacy sounds keep their mapping', () => {
  it('landed, rotted, rampEnded, shieldBroke, skillUnlocked, runWon', () => {
    expect(mapJuice({ type: 'landed', hazardType: 'rock' }, on).sounds).toEqual(['land']);
    expect(mapJuice({ type: 'rotted', x: 1, y: 1, leftRock: true }, on).sounds).toEqual(['rot']);
    expect(mapJuice({ type: 'rampEnded', level: 1 }, on).sounds).toEqual(['go']);
    expect(mapJuice({ type: 'shieldBroke', x: 1, y: 1, family: 'rock' }, on).sounds).toEqual(['shieldBreak']);
    expect(mapJuice({ type: 'skillUnlocked', skill: 'slowmo', slot: 0 }, on).sounds).toEqual(['unlock']);
    expect(mapJuice({ type: 'runWon', score: 1, timeMs: 1 }, on).sounds).toEqual(['biome']);
    expect(mapJuice({ type: 'mangoDeferred' }, on)).toEqual({ board: [], screen: [], sounds: [], haptic: null, death: null });
  });
});
