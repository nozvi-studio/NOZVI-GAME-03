import Phaser from 'phaser';
import type { MotionD3Balance } from '../../core/balance';
import type { Step } from '../../core';
import { TOKENS, toInt } from '../uiTokens';
import { chevronPose, pruneTrail, pushTrail, segAlpha, trailOn, type TrailPt } from './steerFxModel';

// Chevron drawing proportions (fractions of one cell), same convention as `M` in dpad.ts.
const CHEV = { ahead: 0.9, half: 0.32, stroke: 0.14, tip: 0.6, minStroke: 2 } as const;

// D3-R25/R28 swipe trail (canvas space, above the board) + chevron at the head (board space). Two Graphics, created once.
export class SteerFx {
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly chev: Phaser.GameObjects.Graphics;
  private readonly buf: TrailPt[] = [];
  private chevAt = -1;
  private dir = { x: 0, y: 0 };
  constructor(scene: Phaser.Scene, board: Phaser.GameObjects.Container, private readonly cell: number,
    private readonly c: MotionD3Balance, private readonly overshoot: number, private reduced: boolean) {
    this.trail = scene.add.graphics().setName('steer-trail').setDepth(10);
    this.chev = scene.add.graphics().setName('steer-chevron');
    board.add(this.chev);
  }
  setReduced(r: boolean): void { this.reduced = r; if (r) { this.buf.length = 0; this.trail.clear(); } }
  point(x: number, y: number, now: number): void { if (trailOn(this.reduced)) pushTrail(this.buf, { x, y, t: now }, this.c.trailMs); }
  endTrail(): void { /* points age out in update(); nothing to do */ }
  chevron(dx: Step, dy: Step, now: number): void { this.dir = { x: dx, y: dy }; this.chevAt = now; }
  reset(): void { this.buf.length = 0; this.chevAt = -1; this.trail.clear(); this.chev.clear(); }
  /** headBoard = head centre in board px (cell * (x + 0.5)), or null when there is no snake. */
  update(now: number, headBoard: { x: number; y: number } | null): void {
    if (this.buf.length) {                     // redraw only while live
      pruneTrail(this.buf, now, this.c.trailMs);
      this.trail.clear();                      // also clears the last frame when the buffer just emptied
      for (let i = 1; i < this.buf.length; i++) {
        const a = this.buf[i - 1]!, b = this.buf[i]!;
        this.trail.lineStyle(this.c.trailPx, toInt(TOKENS.d3.white), segAlpha(b.t, now, this.c)).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    if (this.chevAt < 0) return;
    const pose = chevronPose(now - this.chevAt, this.reduced, this.c, this.overshoot);
    this.chev.clear();
    if (!pose || !headBoard) { if (!pose) this.chevAt = -1; return; }
    const d = this.dir, p = { x: -d.y, y: d.x }, k = this.cell * CHEV.half * pose.scale;
    const ox = headBoard.x + d.x * this.cell * CHEV.ahead, oy = headBoard.y + d.y * this.cell * CHEV.ahead;   // just ahead of the face
    this.chev.lineStyle(Math.max(CHEV.minStroke, this.cell * CHEV.stroke), toInt(TOKENS.d3.white), pose.alpha).beginPath()
      .moveTo(ox + (-d.x + p.x) * k, oy + (-d.y + p.y) * k).lineTo(ox + d.x * k * CHEV.tip, oy + d.y * k * CHEV.tip)
      .lineTo(ox + (-d.x - p.x) * k, oy + (-d.y - p.y) * k).strokePath();
  }
}
