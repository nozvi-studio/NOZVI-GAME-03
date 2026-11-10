// src/game/ui/touchFx.ts - bodies arrive in U1 Task 6.
import type Phaser from 'phaser';
import type { MotionTarget } from '../motion/motionCore';
import type { SkinTone } from './skin';
export function tapBurst(_scene: Phaser.Scene, _x: number, _y: number, _tone: SkinTone): void {}
export function denied(_scene: Phaser.Scene, _visual: MotionTarget, _badge?: { setTint(c: number): unknown; clearTint(): unknown }): void {}
