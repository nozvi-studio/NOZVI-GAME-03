// MOT-2-R1..R5 scene transitions and entrances on top of the MOT-0 adapter. The pure half (createTransition, runEntrance) has no Phaser import.
// Spec: docs/superpowers/specs/2026-11-10-motion-2-menu-flow-design.md sections 2-3.
import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { isMotionOff } from '../flow/debugFlag';
import type { Dir, EntranceStep } from '../flow/entranceOrder';
import { reduceMotion } from '../render/palette';
import { TOKENS, toInt } from '../uiTokens';
import type { Motion, MotionTarget } from './motionCore';
import { motionFor } from './motion';

export type NavKind = 'forward' | 'back' | 'start' | 'quit';
export interface TransitionPlan { fadeMs: number; slide: Dir | null; stagger: boolean; off: boolean }
export interface GoHooks { before?(): void; after?(): void }
export interface TransitionDeps {
  cfg: { fadeMs: number }; softMs: number; reduced(): boolean; off: boolean;
  camera: { fadeOut(ms: number, done: () => void): void; fadeIn(ms: number): void } | null;
  lockInput(): void; start(key: string, data?: object): void;
  navKind: { get(): NavKind | undefined; set(k: NavKind | undefined): void };
}
export interface Transition { goTo(key: string, data: object | undefined, kind: NavKind, hooks?: GoHooks): boolean; enter(): TransitionPlan }

const SLIDE: Record<NavKind, Dir | null> = { forward: 'right', back: 'left', start: null, quit: 'down' };

/** MOT-2-R2/R5 fade length and slide direction for one navigation; reduced = one softMs fade, no slide, no stagger. */
export function transitionPlan(kind: NavKind, cfg: { fadeMs: number }, softMs: number, reduced: boolean, off: boolean): TransitionPlan {
  return reduced ? { fadeMs: softMs, slide: null, stagger: false, off } : { fadeMs: cfg.fadeMs, slide: SLIDE[kind], stagger: true, off };
}
/** MOT-2-R7 Boot holds the 100% frame for what is left of fadeMs after the fonts wait; slow fonts add no extra wait. */
export const bootHoldMs = (waitedMs: number, fadeMs: number): number => Math.max(0, fadeMs - Math.max(0, waitedMs));

export function createTransition(d: TransitionDeps): Transition {
  let pending = false;
  const planFor = (kind: NavKind): TransitionPlan => transitionPlan(kind, d.cfg, d.softMs, d.reduced(), d.off);
  return {
    goTo(key, data, kind, hooks) {
      if (pending) return false; // R3 a double tap never double starts
      pending = true;
      d.lockInput(); d.navKind.set(kind);
      const go = (): void => { hooks?.before?.(); d.start(key, data); hooks?.after?.(); };
      if (d.off || !d.camera) go(); else d.camera.fadeOut(planFor(kind).fadeMs, go);
      return true;
    },
    enter() {
      pending = false; // R3 the flag is reset by the next scene's create (Phaser reuses scene instances)
      const plan = planFor(d.navKind.get() ?? 'start');
      d.navKind.set(undefined);
      if (!plan.off) d.camera?.fadeIn(plan.fadeMs);
      return plan;
    },
  };
}

export type EntranceTargets = Record<string, MotionTarget | MotionTarget[] | undefined>;
/** MOT-2-R5 run an ordered entrance. Missing targets are skipped and take no stagger slot; an array target shares one slot. */
export function runEntrance(m: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn'>, plan: TransitionPlan, steps: EntranceStep[], targets: EntranceTargets): number {
  if (plan.off) return 0;
  let slot = 0;
  for (const s of steps) {
    const found = targets[s.id];
    if (!found) continue;
    const idx = plan.stagger ? slot : 0; slot++;
    const dir = s.from === 'nav' ? plan.slide : s.from ?? null;
    for (const t of Array.isArray(found) ? found : [found]) {
      if (s.motion === 'pop') m.popIn(t, idx);
      else if (s.motion === 'slide' && dir) m.slideIn(t, dir, idx);
      else { t.setAlpha(0); m.fadeIn(t); } // a fade step, or a slide with no direction (start)
    }
  }
  return slot;
}

// ---- Phaser binding ----
const cache = new WeakMap<object, Transition>();
const KIND_KEY = 'navKind';
const cream = toInt(TOKENS.surface.cream);

export interface FadeCamera { once(event: string, fn: () => void): unknown; fadeOut(ms: number, r: number, g: number, b: number): unknown; fadeIn(ms: number, r: number, g: number, b: number): unknown }
/**
 * MOT-2-R3 camera port that resolves the camera on EVERY call. Phaser reuses a scene instance but creates a new main camera each time the
 * scene starts, so a camera captured once goes stale (its fade never completes and input stays locked on the second visit).
 * With no camera the fade completes at once.
 */
export function cameraPort(get: () => FadeCamera | undefined | null, rgb: readonly [number, number, number]): NonNullable<TransitionDeps['camera']> {
  return {
    fadeOut: (ms, done) => { const c = get(); if (!c) { done(); return; } c.once('camerafadeoutcomplete', done); c.fadeOut(ms, rgb[0], rgb[1], rgb[2]); },
    fadeIn: ms => { get()?.fadeIn(ms, rgb[0], rgb[1], rgb[2]); },
  };
}

/** MOT-2 per-scene transition. A fake scene without cameras/balance (unit tests) starts immediately. */
export function transitionFor(scene: Phaser.Scene): Transition {
  const hit = cache.get(scene);
  if (hit) return hit;
  const b = scene.registry.get('balance') as Balance | undefined;
  const rgb = [(cream >> 16) & 255, (cream >> 8) & 255, cream & 255] as const;
  const tr = createTransition({
    cfg: b?.motion ?? { fadeMs: 0 }, softMs: b?.juice.reduced.softMs ?? 0, reduced: reduceMotion,
    off: !b || isMotionOff(typeof location === 'undefined' ? '' : location.search),
    camera: b && scene.cameras ? cameraPort(() => scene.cameras?.main, rgb) : null, // never cache the camera object (see cameraPort)
    lockInput: () => { if (scene.input) scene.input.enabled = false; },
    start: (key, data) => { scene.scene.start(key, data); },
    navKind: { get: () => scene.registry.get(KIND_KEY) as NavKind | undefined, set: k => { scene.registry.set(KIND_KEY, k); } },
  });
  cache.set(scene, tr);
  return tr;
}

/** MOT-2-R1 the only way a menu scene changes: fade out, then scene.start. Returns false when a goTo is already pending. */
export function goTo(scene: Phaser.Scene, key: string, data: object | undefined, kind: NavKind, hooks?: GoHooks): boolean {
  return transitionFor(scene).goTo(key, data, kind, hooks);
}
/** MOT-2-R2/R3/R5 call at the END of a scene's create(): re-arms goTo, fades the camera in and runs the entrance. */
export function enter(scene: Phaser.Scene, steps: EntranceStep[], targets: EntranceTargets): number {
  const plan = transitionFor(scene).enter();
  return runEntrance(motionFor(scene), plan, steps, targets);
}

/**
 * MOT-2 (ruling 8) wrap the objects that `build()` adds to `parent` into one Container at `anchor`, children shifted by -anchor,
 * so popIn/slideIn act about the item's centre. Hit zones keep their names and final positions.
 */
export function captureGroup(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, anchor: { x: number; y: number }, build: () => void, name?: string): Phaser.GameObjects.Container {
  const start = parent.length; build();
  const kids = parent.list.slice(start) as unknown as (Phaser.GameObjects.GameObject & { x: number; y: number })[];
  const group = scene.add.container(anchor.x, anchor.y);
  parent.remove(kids);
  for (const k of kids) { k.x -= anchor.x; k.y -= anchor.y; }
  group.add(kids);
  parent.add(group);
  if (name) group.setName(name);
  return group;
}
