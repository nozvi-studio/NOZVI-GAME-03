import { describe, expect, it } from 'vitest';
import {
  SNAKE_RIG_ANIMS,
  animDurationMs,
  createSnakeRigState,
  evalEatProps,
  headingRotationRad,
  playSnakeRig,
  rigWorldPoint,
  shouldUseSnakeRig,
  stepSnakeRig,
} from '../../src/game/art/snakeRigModel';
import { loadBalance } from '../support/balance';

const balance = loadBalance();
const cfg = balance.ui.snakeRig;

describe('ANIM-SNAKE balance config and state machine', () => {
  it('ANIM-SNAKE-R1 balance.ui.snakeRig validates all 6 clip durations and eatProp bounds', () => {
    expect(cfg.designHeight).toBe(200);
    expect(animDurationMs('idle', cfg)).toBe(2000);
    expect(animDurationMs('eat', cfg)).toBe(740);
    expect(animDurationMs('dead', cfg)).toBe(1350);
    expect(animDurationMs('poke', cfg)).toBe(500);
    expect(animDurationMs('celebrate', cfg)).toBe(670);
    expect(animDurationMs('denied', cfg)).toBe(430);
    expect(SNAKE_RIG_ANIMS).toHaveLength(6);

    expect(() => loadBalance(j => { j.ui.snakeRig.eatMs = 0; })).toThrow(/ui\.snakeRig\.eatMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.mangoPullStartMs = 140; })).toThrow(/mangoPullStartMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.mangoFadeStartMs = 140; })).toThrow(/mangoFadeStartMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.mangoEndMs = 800; })).toThrow(/mangoEndMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.burstStartMs = 380; })).toThrow(/burstStartMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.burstEndMs = 800; })).toThrow(/burstEndMs/);
    expect(() => loadBalance(j => { j.ui.snakeRig.eatProp.burstPeakFrac = 1; })).toThrow(/burstPeakFrac/);
  });

  it('ANIM-SNAKE-R2 idle loops seamlessly modulo idleMs and celebrate supports optional looping', () => {
    let st = createSnakeRigState();
    expect(st).toEqual({ anim: 'idle', timeMs: 0, loop: true });

    const r1 = stepSnakeRig(st, 1500, cfg);
    expect(r1.switched).toBe(false);
    expect(r1.state).toEqual({ anim: 'idle', timeMs: 1500, loop: true });

    const r2 = stepSnakeRig(r1.state, 750, cfg);
    expect(r2.switched).toBe(false);
    expect(r2.state).toEqual({ anim: 'idle', timeMs: 250, loop: true });

    const celebLoop = playSnakeRig('celebrate', { loop: true });
    expect(celebLoop.loop).toBe(true);
    const r3 = stepSnakeRig(celebLoop, 700, cfg);
    expect(r3.switched).toBe(false);
    expect(r3.state).toEqual({ anim: 'celebrate', timeMs: 30, loop: true });
  });

  it('ANIM-SNAKE-R3 one-shots (eat, poke, celebrate, denied) return to idle at t=0 on completion', () => {
    for (const anim of ['eat', 'poke', 'celebrate', 'denied'] as const) {
      const dur = animDurationMs(anim, cfg);
      const start = playSnakeRig(anim);
      expect(start).toEqual({ anim, timeMs: 0, loop: false });

      const mid = stepSnakeRig(start, dur - 10, cfg);
      expect(mid.switched).toBe(false);
      expect(mid.state.anim).toBe(anim);
      expect(mid.state.timeMs).toBe(dur - 10);

      const end = stepSnakeRig(mid.state, 10, cfg);
      expect(end.switched).toBe(true);
      expect(end.state).toEqual({ anim: 'idle', timeMs: 0, loop: true });
    }
  });

  it('ANIM-SNAKE-R3 ignores negative or non-finite dtMs safely', () => {
    const start = playSnakeRig('eat');
    expect(stepSnakeRig(start, -50, cfg)).toEqual({ state: start, switched: false });
    expect(stepSnakeRig(start, Number.NaN, cfg)).toEqual({ state: start, switched: false });
  });

  it('ANIM-SNAKE-R4 dead holds strictly on its last frame and never auto-returns to idle', () => {
    const start = playSnakeRig('dead');
    expect(start).toEqual({ anim: 'dead', timeMs: 0, loop: false });

    const mid = stepSnakeRig(start, 900, cfg);
    expect(mid.switched).toBe(false);
    expect(mid.state).toEqual({ anim: 'dead', timeMs: 900, loop: false });

    const end = stepSnakeRig(mid.state, 2000, cfg);
    expect(end.switched).toBe(false);
    expect(end.state).toEqual({ anim: 'dead', timeMs: cfg.deadMs, loop: false });

    const hold = stepSnakeRig(end.state, 500, cfg);
    expect(hold.switched).toBe(false);
    expect(hold.state).toEqual({ anim: 'dead', timeMs: cfg.deadMs, loop: false });
  });

  it('ANIM-SNAKE-R5 eat syncs mango hover/pull/fade and golden eat_burst windows accurately', () => {
    const headPx = 48;
    const scale = headPx / cfg.designHeight;

    // Hidden outside eat
    expect(evalEatProps(createSnakeRigState(), cfg, headPx, 200, 200).mango.visible).toBe(false);
    expect(evalEatProps(createSnakeRigState(), cfg, headPx, 200, 200).burst.visible).toBe(false);
    expect(evalEatProps(playSnakeRig('dead'), cfg, headPx, 200, 200).mango.visible).toBe(false);

    // At t = 0: mango hovering in front of mouth, burst not started
    const at0 = evalEatProps({ anim: 'eat', timeMs: 0, loop: false }, cfg, headPx, 200, 200);
    expect(at0.mango.visible).toBe(true);
    expect(at0.mango.alpha).toBeCloseTo(1);
    expect(at0.mango.localY).toBeCloseTo((-54 + 28) * scale);
    expect(at0.mango.rotationRad).toBeCloseTo(-0.12);
    expect(at0.mango.scale).toBeCloseTo((headPx * 0.42) / 200);
    expect(at0.burst.visible).toBe(false);

    // At t = 100ms: mango pulling in, burst active
    const at100 = evalEatProps({ anim: 'eat', timeMs: 100, loop: false }, cfg, headPx, 200, 200);
    expect(at100.mango.visible).toBe(true);
    expect(at100.mango.scale).toBeLessThan(at0.mango.scale);
    expect(at100.mango.localY).toBeLessThan(at0.mango.localY);
    expect(at100.burst.visible).toBe(true);
    expect(at100.burst.localY).toBeCloseTo(-54 * scale);
    expect(at100.burst.alpha).toBeCloseTo(1);

    // At t = 140ms: mango gone, burst still popping
    const at140 = evalEatProps({ anim: 'eat', timeMs: 140, loop: false }, cfg, headPx, 200, 200);
    expect(at140.mango.visible).toBe(false);
    expect(at140.burst.visible).toBe(true);

    // At t = 381ms: both hidden while tongue licks lips
    const at381 = evalEatProps({ anim: 'eat', timeMs: 381, loop: false }, cfg, headPx, 200, 200);
    expect(at381.mango.visible).toBe(false);
    expect(at381.burst.visible).toBe(false);
  });

  it('ANIM-SNAKE-R6 headingRotationRad and rigWorldPoint pivot the feet-origin rig around head centre', () => {
    expect(headingRotationRad(0, -1)).toBeCloseTo(0);
    expect(headingRotationRad(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(headingRotationRad(0, 1)).toBeCloseTo(Math.PI);
    expect(headingRotationRad(-1, 0)).toBeCloseTo(-Math.PI / 2);
    expect(headingRotationRad(0, 0)).toBe(0);

    // Head centre at (100, 200), headPx = 48 -> halfH = 24
    const up = rigWorldPoint(100, 200, 48, headingRotationRad(0, -1), 0);
    expect(up.x).toBeCloseTo(100);
    expect(up.y).toBeCloseTo(224);

    const right = rigWorldPoint(100, 200, 48, headingRotationRad(1, 0), 0);
    expect(right.x).toBeCloseTo(76);
    expect(right.y).toBeCloseTo(200);

    const down = rigWorldPoint(100, 200, 48, headingRotationRad(0, 1), 0);
    expect(down.x).toBeCloseTo(100);
    expect(down.y).toBeCloseTo(176);

    const left = rigWorldPoint(100, 200, 48, headingRotationRad(-1, 0), 0);
    expect(left.x).toBeCloseTo(124);
    expect(left.y).toBeCloseTo(200);

    // localY = -headPx/2 always lands back on head centre at any angle
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const centre = rigWorldPoint(100, 200, 48, headingRotationRad(dx, dy), -24);
      expect(centre.x).toBeCloseTo(100);
      expect(centre.y).toBeCloseTo(200);
    }
  });

  it('ANIM-SNAKE-R7 fallback activates Rigby2D only for snake skin on WebGL without Reduce Motion when loaded', () => {
    expect(shouldUseSnakeRig({ isWebGL: true, reduced: false, skin: 'snake', rigLoaded: true })).toBe(true);
    expect(shouldUseSnakeRig({ isWebGL: false, reduced: false, skin: 'snake', rigLoaded: true })).toBe(false);
    expect(shouldUseSnakeRig({ isWebGL: true, reduced: true, skin: 'snake', rigLoaded: true })).toBe(false);
    expect(shouldUseSnakeRig({ isWebGL: true, reduced: false, skin: 'capy', rigLoaded: true })).toBe(false);
    expect(shouldUseSnakeRig({ isWebGL: true, reduced: false, skin: 'ginger', rigLoaded: true })).toBe(false);
    expect(shouldUseSnakeRig({ isWebGL: true, reduced: false, skin: 'snake', rigLoaded: false })).toBe(false);
  });
});
