import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { bootHoldMs, cameraPort, createTransition, runEntrance, transitionPlan, type NavKind, type TransitionDeps } from '../../src/game/motion/transition';
import type { MotionTarget } from '../../src/game/motion/motionCore';

const m = json.motion;
const SOFT = json.juice.reduced.softMs;

function fakeDeps(over: Partial<{ reduced: boolean; off: boolean; camera: boolean }> = {}) {
  const log: string[] = [];
  let kind: NavKind | undefined;
  let finishFade: (() => void) | null = null;
  const d: TransitionDeps = {
    cfg: m, softMs: SOFT, reduced: () => over.reduced === true, off: over.off === true,
    camera: over.camera === false ? null : { fadeOut: (ms, done) => { log.push(`out:${ms}`); finishFade = done; }, fadeIn: ms => log.push(`in:${ms}`) },
    lockInput: () => log.push('lock'), start: (key, data) => log.push(`start:${key}:${JSON.stringify(data ?? null)}`),
    navKind: { get: () => kind, set: k => { kind = k; } },
  };
  return { d, log, finish: () => finishFade?.() };
}
const target = (): MotionTarget & { calls: string[] } => {
  const calls: string[] = [];
  return { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, calls, setScale() { return this; }, setPosition() { return this; }, setAlpha(a: number) { calls.push(`alpha:${a}`); return this; } } as never;
};
const recMotion = () => {
  const calls: string[] = [];
  return { calls, popIn: (_t: unknown, i = 0) => calls.push(`pop:${i}`), slideIn: (_t: unknown, from: string, i = 0) => calls.push(`slide:${from}:${i}`), fadeIn: () => calls.push('fade') };
};

describe('MOT-2 transitionPlan', () => {
  it('MOT-2-R2 direction rule: forward from the right, back from the left, quit from below, start fade only', () => {
    const slides = (['forward', 'back', 'quit', 'start'] as NavKind[]).map(k => transitionPlan(k, m, SOFT, false, false).slide);
    expect(slides).toEqual(['right', 'left', 'down', null]);
    expect(transitionPlan('forward', m, SOFT, false, false)).toMatchObject({ fadeMs: m.fadeMs, stagger: true, off: false });
  });
  it('MOT-2-R2 a scene change is at most 2 * fadeMs = 360 ms', () => { expect(2 * transitionPlan('forward', m, SOFT, false, false).fadeMs).toBeLessThanOrEqual(360); });
  it('MOT-2-R7 a reduced fade lasts softMs with no slide and no stagger', () => {
    expect(transitionPlan('forward', m, SOFT, true, false)).toEqual({ fadeMs: SOFT, slide: null, stagger: false, off: false });
  });
  it('MOT-2-R7 Boot holds only what is left of fadeMs after the fonts wait', () => {
    expect(bootHoldMs(0, m.fadeMs)).toBe(m.fadeMs); expect(bootHoldMs(50, m.fadeMs)).toBe(m.fadeMs - 50);
    expect(bootHoldMs(900, m.fadeMs)).toBe(0);
  });
});

describe('MOT-2 createTransition.goTo', () => {
  it('MOT-2-R3 locks input at call time, fades out, then starts the scene with the same data', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    expect(tr.goTo('Loadout', { level: 7, debug: true }, 'forward')).toBe(true);
    expect(log).toEqual(['lock', `out:${m.fadeMs}`]);
    finish();
    expect(log[log.length - 1]).toBe('start:Loadout:{"level":7,"debug":true}');
  });
  it('MOT-2-R3 a second goTo while one is pending is dropped; enter() re-arms it', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    expect(tr.goTo('Home', undefined, 'back')).toBe(true);
    expect(tr.goTo('Settings', undefined, 'forward')).toBe(false);
    finish();
    expect(log.filter(l => l.startsWith('start:'))).toEqual(['start:Home:null']);
    tr.enter();
    expect(tr.goTo('Settings', undefined, 'forward')).toBe(true);
  });
  it('MOT-2-R1 hooks run around the scene start (stop Game before, launch Hud after)', () => {
    const { d, log, finish } = fakeDeps(); const tr = createTransition(d);
    tr.goTo('Game', undefined, 'start', { before: () => log.push('before'), after: () => log.push('after') });
    finish();
    expect(log.slice(-3)).toEqual(['before', 'start:Game:null', 'after']);
  });
  it('MOT-2-R5 reduced motion uses one softMs fade out and in', () => {
    const { d, log, finish } = fakeDeps({ reduced: true }); const tr = createTransition(d);
    tr.goTo('Home', undefined, 'back'); finish(); tr.enter();
    expect(log).toContain(`out:${SOFT}`); expect(log).toContain(`in:${SOFT}`);
  });
  it('MOT-2-R13 motion=off and a missing camera start at once without any fade', () => {
    for (const over of [{ off: true }, { camera: false }]) {
      const { d, log } = fakeDeps(over); createTransition(d).goTo('Home', { returnTo: 'Home' }, 'back');
      expect(log).toEqual(['lock', 'start:Home:{"returnTo":"Home"}']);
    }
  });
  it('MOT-2-R2 enter() reads the kind set by goTo once, then defaults to start', () => {
    const { d, finish } = fakeDeps(); const tr = createTransition(d);
    tr.goTo('Loadout', undefined, 'forward'); finish();
    expect(tr.enter().slide).toBe('right');
    expect(tr.enter().slide).toBeNull();
  });
  it('MOT-2-R13 enter() fades the camera in unless motion is off', () => {
    const a = fakeDeps(); createTransition(a.d).enter(); expect(a.log).toEqual([`in:${m.fadeMs}`]);
    const b = fakeDeps({ off: true }); createTransition(b.d).enter(); expect(b.log).toEqual([]);
  });
});

describe('MOT-2-R5 runEntrance', () => {
  const plan = transitionPlan('forward', m, SOFT, false, false);
  it('MOT-2-R5 staggers by present items only and resolves nav to the plan direction', () => {
    const mo = recMotion();
    const targets = { a: target(), c: target(), d: target() };
    const n = runEntrance(mo, plan, [{ id: 'a', motion: 'pop' }, { id: 'b', motion: 'pop' }, { id: 'c', motion: 'slide', from: 'nav' }, { id: 'd', motion: 'slide', from: 'down' }], targets);
    expect(n).toBe(3);
    expect(mo.calls).toEqual(['pop:0', 'slide:right:1', 'slide:down:2']);
  });
  it('MOT-2-R5 an array target animates all pieces with the same index', () => {
    const mo = recMotion();
    runEntrance(mo, plan, [{ id: 'x', motion: 'slide', from: 'down' }, { id: 'y', motion: 'pop' }], { x: [target(), target(), target()], y: target() });
    expect(mo.calls).toEqual(['slide:down:0', 'slide:down:0', 'slide:down:0', 'pop:1']);
  });
  it('MOT-2-R2 a nav slide with no direction (start) degrades to a fade from alpha 0', () => {
    const mo = recMotion(); const t = target();
    runEntrance(mo, transitionPlan('start', m, SOFT, false, false), [{ id: 'a', motion: 'slide', from: 'nav' }, { id: 'b', motion: 'fade' }], { a: t, b: t });
    expect(mo.calls).toEqual(['fade', 'fade']); expect(t.calls).toEqual(['alpha:0', 'alpha:0']);
  });
  it('MOT-2-R5 reduced motion gives every item index 0 (no stagger); motion=off animates nothing', () => {
    const mo = recMotion();
    runEntrance(mo, transitionPlan('forward', m, SOFT, true, false), [{ id: 'a', motion: 'pop' }, { id: 'b', motion: 'pop' }], { a: target(), b: target() });
    expect(mo.calls).toEqual(['pop:0', 'pop:0']);
    const off = recMotion();
    expect(runEntrance(off, transitionPlan('forward', m, SOFT, false, true), [{ id: 'a', motion: 'pop' }], { a: target() })).toBe(0);
    expect(off.calls).toEqual([]);
  });
});

describe('MOT-2 cameraPort (second visit of a menu scene)', () => {
  const cam = () => { const c = { outs: 0, ins: 0, done: null as null | (() => void),
    once(_e: string, fn: () => void) { c.done = fn; }, fadeOut() { c.outs++; }, fadeIn() { c.ins++; } }; return c; };
  it('MOT-2-R3 resolves scene.cameras.main on every call: Phaser creates a new camera each time a scene restarts', () => {
    let cur = cam(); const first = cur; const port = cameraPort(() => cur, [1, 2, 3]);
    port.fadeOut(180, () => {}); expect(first.outs).toBe(1);
    cur = cam(); // the scene restarted: a fresh camera, the old one is destroyed
    let went = false; port.fadeOut(180, () => { went = true; }); port.fadeIn(180);
    expect(cur.outs).toBe(1); expect(cur.ins).toBe(1); expect(first.outs).toBe(1);
    cur.done?.(); expect(went).toBe(true);
  });
  it('MOT-2-R3 with no camera the port finishes at once instead of hanging with input locked', () => {
    const port = cameraPort(() => undefined, [1, 2, 3]); let went = false;
    port.fadeOut(180, () => { went = true; }); port.fadeIn(180); expect(went).toBe(true);
  });
});
