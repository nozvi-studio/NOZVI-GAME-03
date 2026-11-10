import type { Balance, CauseKey, SimEvent, TimedKey } from '../../core';
import type { SfxName } from '../audio/synth';

export type ColorId = 'food' | 'gold' | 'rock' | 'snake' | 'danger' | 'orb' | 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain';
export interface Pt { x: number; y: number }
export type BoardVisual =
  | { kind: 'burst'; x: number; y: number; color: ColorId; count: number; speed: number; lifeMs: number }
  | { kind: 'floatText'; x: number; y: number; points: number; big: boolean }
  | { kind: 'gulp' } | { kind: 'snakePop'; ms: number }
  | { kind: 'levelGlow'; alpha: number; ms: number }
  | { kind: 'shake'; amplitudePx: number; ms: number }
  | { kind: 'tint'; color: ColorId; alpha: number; fadeMs: number; ms: number }
  | { kind: 'tintEnd'; fadeMs: number }
  | { kind: 'biomeSweep'; biome: number; alpha: number; ms: number; sweep: boolean }
  | { kind: 'ringPulse'; x: number; y: number; color: ColorId; scale: number; ms: number }
  | { kind: 'sparkle'; x: number; y: number; color: ColorId; lifeMs: number }
  | { kind: 'turnTilt'; dx: number; dy: number; deg: number; ms: number };
export type HudTarget = 'score' | 'levelBar' | 'energyBar';
export type ScreenVisual =
  | { kind: 'sparks'; from: { x: number; y: number }; count: number; ms: number; staggerMs: number; color: ColorId }
  | { kind: 'barBump'; target: HudTarget; scale: number; ms: number }
  | { kind: 'iconPop'; slot: 0 | 1; color: ColorId; scale: number; ms: number }
  | { kind: 'flash'; color: ColorId; alpha: number; ms: number }
  | { kind: 'flagPlant'; level: number; ms: number }
  | { kind: 'deathFlash'; alpha: number; ms: number; vignette: boolean };
export interface JuiceCue {
  board: BoardVisual[]; screen: ScreenVisual[]; sounds: SfxName[]; haptic: number | number[] | null;
  death: { cause: CauseKey } | null;
}
export interface JuiceCtx {
  balance: Balance; sound: boolean; haptics: boolean; reduced: boolean;
  /** MOT-3-R6 slot of the last shield cast (JuicePlayer remembers it); null/undefined = unknown. */
  shieldSlot?: 0 | 1 | null;
  /** MOT-3-R8 snake head in cell coords for a run-won burst; null/undefined = skip the head burst. */
  head?: Pt | null;
}
/** Derived inputs (not sim events): checkpoint save growth, hazard cells of a landing, a snake turn, a mango (re)spawn (MOT-3, see derived.ts). */
export type JuiceInput = SimEvent
  | { type: 'checkpointUnlocked'; level: number }
  | { type: 'landedAt'; hazardType: TimedKey; cells: Pt[] }
  | { type: 'turned'; dx: number; dy: number }
  | { type: 'mangoSpawned'; x: number; y: number; golden: boolean };
/** HUD positions and bumps, injected by the HUD scene so juice never knows the HUD layout (P3b-2 safe). */
export interface JuiceHud {
  point(target: HudTarget): Pt;
  skillPoint(slot: 0 | 1): Pt;
  bump(target: HudTarget, scale: number, ms: number): void;
  plantFlag(level: number, ms: number): void;
}
