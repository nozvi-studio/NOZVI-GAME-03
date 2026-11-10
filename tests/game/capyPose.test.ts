import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core';
import { capyDie, capyEat, capyPose, createCapyAnim } from '../../src/game/art/capyPose';

const cfg = parseBalance(structuredClone(json)).ui.capy;
const rnd = (): number => 0; // blink gap = blinkMinGapMs

describe('ART-001 capy pose', () => {
  it('ART-001 balance has ui.capy timings', () => {
    expect(cfg.eatOpenMs).toBeGreaterThan(0);
    expect(cfg.blinkMaxGapMs).toBeGreaterThanOrEqual(cfg.blinkMinGapMs);
  });

  it('ART-001 idle breathes and blinks on schedule', () => {
    let st = createCapyAnim(0, cfg, rnd);
    expect(st.nextBlinkAt).toBe(cfg.blinkMinGapMs);
    const a = capyPose(st, cfg.breathPeriodMs / 4, cfg, false, rnd);
    expect(a.pose.expression).toBe('idle');
    expect(a.pose.scaleY).toBeCloseTo(1 + cfg.breathAmp);
    const b = capyPose(st, cfg.blinkMinGapMs + 1, cfg, false, rnd);
    expect(b.pose.expression).toBe('idle_blink');
    st = b.state;
    const c = capyPose(st, cfg.blinkMinGapMs + cfg.blinkMs + 1, cfg, false, rnd);
    expect(c.pose.expression).toBe('idle');
    expect(c.state.nextBlinkAt).toBe(cfg.blinkMinGapMs + cfg.blinkMs + 1 + cfg.blinkMinGapMs);
  });

  it('ART-001 eat plays open, chew, then idle', () => {
    const st = capyEat(createCapyAnim(0, cfg, rnd), 100);
    const open = capyPose(st, 101, cfg, false, rnd).pose;
    expect(open.expression).toBe('eat_open');
    expect(open.scaleX).toBe(cfg.gulpScaleX);
    expect(capyPose(st, 100 + cfg.eatOpenMs + 1, cfg, false, rnd).pose.expression).toBe('eat_chew');
    const done = capyPose(st, 100 + cfg.eatOpenMs + cfg.eatChewMs + 1, cfg, false, rnd);
    expect(done.state.mode).toBe('idle');
  });

  it('ART-001 dead droops and ignores eat; reduced motion only swaps the face', () => {
    const st = capyDie(createCapyAnim(0, cfg, rnd), 0);
    expect(capyEat(st, 10)).toBe(st);
    const end = capyPose(st, cfg.deadDroopMs * 2, cfg, false, rnd).pose;
    expect(end).toMatchObject({ expression: 'dead', rotationDeg: -cfg.deadRotDeg, dy: cfg.deadDropPx });
    const reduced = capyPose(st, cfg.deadDroopMs * 2, cfg, true, rnd).pose;
    expect(reduced).toMatchObject({ expression: 'dead', rotationDeg: 0, dy: 0, scaleX: 1, scaleY: 1 });
  });

  it('ART-001 reduced motion: no breathing and no gulp squash', () => {
    const st = createCapyAnim(0, cfg, rnd);
    expect(capyPose(st, cfg.breathPeriodMs / 4, cfg, true, rnd).pose.scaleY).toBe(1);
    expect(capyPose(capyEat(st, 0), 1, cfg, true, rnd).pose.scaleX).toBe(1);
  });
});

describe('ART-003 snake tongue pose', () => {
  const sn = (now = 0) => createCapyAnim(now, cfg, rnd, 'snake');
  const gapMs = cfg.tongueMinGapMs; // rnd = 0

  it('ART-003 snake idle flicks the tongue on schedule, then reschedules', () => {
    const st = sn();
    expect(st.nextTongueAt).toBe(gapMs);
    expect(capyPose(st, gapMs - 1, cfg, false, rnd).pose.expression).toBe('idle');
    const on = capyPose(st, gapMs + 1, cfg, false, rnd);
    expect(on.pose.expression).toBe('idle_tongue');
    const done = capyPose(on.state, gapMs + cfg.tongueMs + 1, cfg, false, rnd);
    expect(done.pose.expression).toBe('idle');
    expect(done.state.nextTongueAt).toBe(gapMs + cfg.tongueMs + 1 + gapMs);
  });

  it('ART-003 snake shows eat_tongue right after the chew ends, once', () => {
    const t = 100 + cfg.eatOpenMs + cfg.eatChewMs + 1;
    const st = capyEat(sn(), 100);
    const a = capyPose(st, t, cfg, false, rnd);
    expect(a.state.mode).toBe('idle');
    expect(a.pose.expression).toBe('eat_tongue');
    expect(capyPose(a.state, t + cfg.tongueMs - 1, cfg, false, rnd).pose.expression).toBe('eat_tongue');
    expect(capyPose(a.state, t + cfg.tongueMs + 1, cfg, false, rnd).pose.expression).toBe('idle');
  });

  it('ART-003 snake dead hangs the tongue, also with reduced motion', () => {
    const st = capyDie(sn(), 0);
    expect(capyPose(st, 10, cfg, false, rnd).pose.expression).toBe('dead_tongue');
    expect(capyPose(st, 10, cfg, true, rnd).pose.expression).toBe('dead_tongue');
  });

  it('ART-003 snake reduced motion: no flick, no post-chew tongue', () => {
    expect(capyPose(sn(), gapMs + 1, cfg, true, rnd).pose.expression).toBe('idle');
    const a = capyPose(capyEat(sn(), 0), cfg.eatOpenMs + cfg.eatChewMs + 1, cfg, true, rnd);
    expect(a.pose.expression).toBe('idle');
  });

  it('ART-003 capy skin never shows a tongue', () => {
    const st = createCapyAnim(0, cfg, rnd, 'capy');
    expect(capyPose(st, gapMs + 1, cfg, false, rnd).pose.expression).toBe('idle');
    expect(capyPose(capyDie(st, 0), 1, cfg, false, rnd).pose.expression).toBe('dead');
  });

  it('ART-003 snake keeps breath', () => {
    expect(capyPose(sn(), cfg.breathPeriodMs / 4, cfg, false, rnd).pose.scaleY).toBeCloseTo(1 + cfg.breathAmp);
  });
});
