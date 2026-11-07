import Phaser from 'phaser';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { ui } from '../ui/layout';
import type { ScreenSink } from './JuicePlayer';
import type { ColorId, JuiceHud, ScreenVisual } from './types';

// Mockup px of the juice overlays (DeathD2 vignette, orb spark dots, skill ring). Durations, counts and alphas come from balance.juice.
const M = { spark: 4, ring: 46, ringW: 4, vignetteInset: 7, vignetteSteps: 5, vignetteStep: 14, depth: 900 } as const;

// P3a-R2/R3/R4/R6/R7 screen-space juice (HUD scene): sparks to the energy bar, bar bumps, icon pop, flash, flag plant, death vignette.
export class ScreenFx implements ScreenSink {
  constructor(private readonly scene: Phaser.Scene, private readonly hud: JuiceHud, private readonly color: (id: ColorId) => number,
    private readonly cell: number, private readonly caps: { maxSparks: number }) {}

  play(v: ScreenVisual): void {
    switch (v.kind) {
      case 'sparks': this.sparks(v); break;
      case 'barBump': this.hud.bump(v.target, v.scale, v.ms); break;
      case 'iconPop': this.iconPop(v); break;
      case 'flash': this.flash(v); break;
      case 'flagPlant': this.hud.plantFlag(v.level, v.ms); break;
      case 'deathFlash': this.deathFlash(v); break;
    }
  }

  private sparks(v: Extract<ScreenVisual, { kind: 'sparks' }>): void {
    const n = Math.min(v.count, this.caps.maxSparks), to = this.hud.point('energyBar');
    const x = BOARD.x + (v.from.x + 0.5) * this.cell, y = BOARD.y + (v.from.y + 0.5) * this.cell;
    for (let i = 0; i < n; i++) {
      const dot = this.scene.add.circle(x, y, ui(M.spark), this.color(v.color)).setDepth(M.depth);
      this.scene.tweens.add({ targets: dot, x: to.x, y: to.y, duration: v.ms, delay: i * v.staggerMs, ease: 'Quad.easeIn', onComplete: () => dot.destroy() });
    }
  }
  private iconPop(v: Extract<ScreenVisual, { kind: 'iconPop' }>): void {
    const p = this.hud.skillPoint(v.slot);
    const ring = this.scene.add.circle(p.x, p.y, ui(M.ring)).setStrokeStyle(ui(M.ringW), this.color(v.color)).setDepth(M.depth);
    this.scene.tweens.add({ targets: ring, scale: v.scale * 1.6, alpha: 0, duration: v.ms, onComplete: () => ring.destroy() });
  }
  private flash(v: Extract<ScreenVisual, { kind: 'flash' }>): void {
    const r = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, this.color(v.color), v.alpha).setDepth(M.depth);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: v.ms, onComplete: () => r.destroy() });
  }
  /** P3a-R7: DeathD2 red inset stroke plus an inward-fading border; reduced motion gets a flat low-alpha wash. Depth is below the death card. */
  private deathFlash(v: Extract<ScreenVisual, { kind: 'deathFlash' }>): void {
    const col = this.color('danger'), g = this.scene.add.graphics().setDepth(M.depth);
    if (v.vignette) {
      const inset = ui(M.vignetteInset);
      g.lineStyle(inset, col, v.alpha).strokeRect(inset / 2, inset / 2, WIDTH - inset, HEIGHT - inset);
      for (let i = 0; i < M.vignetteSteps; i++) {
        const w = ui(M.vignetteStep), o = inset + i * w + w / 2;
        g.lineStyle(w, col, v.alpha * (1 - (i + 1) / (M.vignetteSteps + 1))).strokeRect(o, o, WIDTH - 2 * o, HEIGHT - 2 * o);
      }
    } else g.fillStyle(col, v.alpha).fillRect(0, 0, WIDTH, HEIGHT);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: v.ms, onComplete: () => g.destroy() });
  }
}
