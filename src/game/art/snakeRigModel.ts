// ANIM-SNAKE-R1..R7 pure Phaser-free state machine, eat-prop sync, heading transform, and fallback guard for the Rigby2D snake head.
import type { Balance } from '../../core';
import type { SkinId } from './skins';

export const SNAKE_RIG_ANIMS = ['idle', 'eat', 'dead', 'poke', 'celebrate', 'denied'] as const;
export type SnakeRigAnim = (typeof SNAKE_RIG_ANIMS)[number];
export type SnakeRigConfig = Balance['ui']['snakeRig'];

export interface SnakeRigState {
  readonly anim: SnakeRigAnim;
  readonly timeMs: number;
  readonly loop: boolean;
}

export interface SnakeRigStepResult {
  readonly state: SnakeRigState;
  readonly switched: boolean;
}

export interface EatMangoPose {
  readonly visible: boolean;
  readonly localY: number;
  readonly scale: number;
  readonly rotationRad: number;
  readonly alpha: number;
}

export interface EatBurstPose {
  readonly visible: boolean;
  readonly localY: number;
  readonly scale: number;
  readonly alpha: number;
}

export interface EatPropsPose {
  readonly mango: EatMangoPose;
  readonly burst: EatBurstPose;
}

export interface SnakeRigFallbackInput {
  readonly isWebGL: boolean;
  readonly reduced: boolean;
  readonly skin: SkinId;
  readonly rigLoaded: boolean;
}

const HIDDEN_MANGO: EatMangoPose = { visible: false, localY: 0, scale: 0, rotationRad: 0, alpha: 0 };
const HIDDEN_BURST: EatBurstPose = { visible: false, localY: 0, scale: 0, alpha: 0 };
const HIDDEN_PROPS: EatPropsPose = { mango: HIDDEN_MANGO, burst: HIDDEN_BURST };

function clamp01(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** ANIM-SNAKE-R1 duration of one animation clip in ms, read strictly from balance.ui.snakeRig. */
export function animDurationMs(anim: SnakeRigAnim, cfg: SnakeRigConfig): number {
  switch (anim) {
    case 'idle': return cfg.idleMs;
    case 'eat': return cfg.eatMs;
    case 'dead': return cfg.deadMs;
    case 'poke': return cfg.pokeMs;
    case 'celebrate': return cfg.celebrateMs;
    case 'denied': return cfg.deniedMs;
  }
}

/** ANIM-SNAKE-R2 initial / reset resting idle state. */
export function createSnakeRigState(): SnakeRigState {
  return { anim: 'idle', timeMs: 0, loop: true };
}

/** ANIM-SNAKE-R2..R4 start an animation at t = 0 (idle always loops; celebrate loops only if requested; dead and other one-shots never loop). */
export function playSnakeRig(anim: SnakeRigAnim, opts?: { loop?: boolean }): SnakeRigState {
  const loop = anim === 'idle' || (anim === 'celebrate' && opts?.loop === true);
  return { anim, timeMs: 0, loop };
}

/** ANIM-SNAKE-R2..R4 advance the rig clock by dtMs: looping clips wrap, one-shots return to idle, dead holds its final frame. */
export function stepSnakeRig(state: SnakeRigState, dtMs: number, cfg: SnakeRigConfig): SnakeRigStepResult {
  const step = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
  const dur = animDurationMs(state.anim, cfg);

  if (state.loop) {
    const nextTime = dur > 0 ? (state.timeMs + step) % dur : 0;
    return { state: { ...state, timeMs: nextTime }, switched: false };
  }

  if (state.anim === 'dead') {
    const nextTime = Math.min(dur, state.timeMs + step);
    return { state: { ...state, timeMs: nextTime }, switched: false };
  }

  const nextTime = state.timeMs + step;
  if (nextTime >= dur) {
    return { state: createSnakeRigState(), switched: true };
  }
  return { state: { ...state, timeMs: nextTime }, switched: false };
}

/** ANIM-SNAKE-R5 synchronized mango + eat_burst prop poses in rig local screen space (Y-down, origin at feet). */
export function evalEatProps(
  state: SnakeRigState,
  cfg: SnakeRigConfig,
  headPx: number,
  mangoTexWidth: number,
  burstTexWidth: number,
): EatPropsPose {
  if (state.anim !== 'eat') return HIDDEN_PROPS;
  const p = cfg.eatProp;
  const t = state.timeMs;
  const scale = headPx / cfg.designHeight;
  const mouthLocalY = -p.mouthOffsetY * scale;

  let mango: EatMangoPose = HIDDEN_MANGO;
  if (t < p.mangoEndMs) {
    const pull = smoothstep(p.mangoPullStartMs, p.mangoEndMs, t);
    const mScale = ((headPx * p.mangoWidthFrac) / Math.max(1, mangoTexWidth)) * (1 - p.mangoShrinkFrac * pull);
    mango = {
      visible: true,
      localY: mouthLocalY + (1 - pull) * p.mangoOffsetY * scale,
      scale: mScale,
      rotationRad: p.mangoRotStartRad + p.mangoRotSweepRad * pull,
      alpha: 1 - smoothstep(p.mangoFadeStartMs, p.mangoEndMs, t),
    };
  }

  let burst: EatBurstPose = HIDDEN_BURST;
  if (t >= p.burstStartMs && t <= p.burstEndMs) {
    const k = (t - p.burstStartMs) / (p.burstEndMs - p.burstStartMs);
    const bScale = ((headPx * p.burstWidthFrac) / Math.max(1, burstTexWidth))
      * (p.burstScaleMin + p.burstScaleGain * smoothstep(0, p.burstPeakFrac, k));
    burst = {
      visible: true,
      localY: mouthLocalY,
      scale: bScale,
      alpha: 1 - smoothstep(p.burstPeakFrac, 1, k),
    };
  }

  return { mango, burst };
}

/** ANIM-SNAKE-R6 board heading (dx, dy) to Phaser rotation in radians: up (0,-1) = 0, right (1,0) = +PI/2, down (0,1) = PI, left (-1,0) = -PI/2. */
export function headingRotationRad(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0;
  let rad = Math.atan2(dy, dx) + Math.PI / 2;
  if (rad > Math.PI) rad -= Math.PI * 2;
  if (rad <= -Math.PI) rad += Math.PI * 2;
  return Object.is(rad, -0) ? 0 : rad;
}

/**
 * ANIM-SNAKE-R6 transform a point along the rig's vertical centerline (localY in screen px from the feet origin;
 * 0 = feet origin, -headPx/2 = head centre) into board coordinates so rotation pivots around the head centre (headX, headY).
 */
export function rigWorldPoint(
  headX: number,
  headY: number,
  headPx: number,
  rotationRad: number,
  localY = 0,
): { x: number; y: number } {
  const offset = headPx * 0.5 + localY;
  return {
    x: headX - offset * Math.sin(rotationRad),
    y: headY + offset * Math.cos(rotationRad),
  };
}

/** ANIM-SNAKE-R7 Rigby2D snake head is active only on WebGL, with Reduce Motion off, for the snake skin, when loaded. */
export function shouldUseSnakeRig(input: SnakeRigFallbackInput): boolean {
  return input.isWebGL && !input.reduced && input.skin === 'snake' && input.rigLoaded;
}
