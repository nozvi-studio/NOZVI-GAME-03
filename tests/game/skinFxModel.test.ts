import { describe, expect, it } from 'vitest';
import { createSkinFx, skinFxEat, skinFxStep, skinFxTrail } from '../../src/game/render/skinFxModel';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().juice.skinFx, rnd = () => 0.5, at = { x: 3, y: 4 };
describe('MEC-011 rare skin effects', () => {
  it('MEC-011-R22 an eat spawns `count` sparks that die after lifeMs', () => {
    const s = createSkinFx(cfg, { eat: true, trail: false }, false);
    skinFxEat(s, 1000, at, rnd);
    expect(skinFxStep(s, 1000).filter(p => p.kind === 'spark')).toHaveLength(cfg.eat.count);
    expect(skinFxStep(s, 1000 + cfg.eat.lifeMs + 1)).toHaveLength(0);
  });
  it('MEC-011-R23 the trail spawns one leaf per everyMs while moving and never more than max live leaves', () => {
    const s = createSkinFx(cfg, { eat: false, trail: true }, false);
    for (let t = 0; t <= cfg.trail.everyMs * 40; t += 16) { skinFxTrail(s, t, at, true, rnd); skinFxStep(s, t); }
    const live = skinFxStep(s, cfg.trail.everyMs * 40);
    expect(live.length).toBeGreaterThan(0); expect(live.length).toBeLessThanOrEqual(cfg.trail.max);
  });
  it('MEC-011-R23 no leaves while the snake does not move', () => {
    const s = createSkinFx(cfg, { eat: false, trail: true }, false);
    for (let t = 0; t <= 2000; t += 16) skinFxTrail(s, t, at, false, rnd);
    expect(skinFxStep(s, 2000)).toHaveLength(0);
  });
  it('MEC-011-R24 nothing spawns with reduced motion', () => {
    const s = createSkinFx(cfg, { eat: true, trail: true }, true);
    skinFxEat(s, 0, at, rnd); for (let t = 0; t <= 2000; t += 16) skinFxTrail(s, t, at, true, rnd);
    expect(skinFxStep(s, 100)).toHaveLength(0);
  });
  it('MEC-011-R25 a skin without effects spawns nothing', () => {
    const s = createSkinFx(cfg, { eat: false, trail: false }, false);
    skinFxEat(s, 0, at, rnd); skinFxTrail(s, 500, at, true, rnd);
    expect(skinFxStep(s, 500)).toHaveLength(0);
  });
});
