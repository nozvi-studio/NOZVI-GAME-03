import Phaser from 'phaser';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { ui } from '../ui/layout';
import type { ScreenSink } from './JuicePlayer';
import type { ColorId, JuiceHud, ScreenVisual } from './types';

// Mockup px of the juice overlays (DeathD2 vignette, orb spark dots, skill ring). Durations, counts and alphas come from balance.juice.
// vignette* mirror the DeathD2 CSS `0 0 0 7px inset, 0 0 90px 14px inset`; the texture is drawn at 1/vignetteDiv size and stretched.
const M = { spark: 4, ring: 46, ringW: 4, vignetteInset: 7, vignetteBlur: 90, vignetteSpread: 14, vignetteGlow: 0.83, vignetteDiv: 4, depth: 900 } as const;
const VIGNETTE_KEY = 'juice-vignette';

// P3a-R2/R3/R4/R6/R7 screen-space juice (HUD scene): sparks to the energy bar, bar bumps, icon pop, flash, flag plant, death vignette.
export class ScreenFx implements ScreenSink {
  constructor(private readonly scene: Phaser.Scene, private readonly hud: JuiceHud, private readonly color: (id: ColorId) => number,
    private readonly cell: number, private readonly caps: { maxSparks: number }, private readonly ringScale: number) {}

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
    this.scene.tweens.add({ targets: ring, scale: v.scale * this.ringScale, alpha: 0, duration: v.ms, onComplete: () => ring.destroy() });
  }
  private flash(v: Extract<ScreenVisual, { kind: 'flash' }>): void {
    const r = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, this.color(v.color), v.alpha).setDepth(M.depth);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: v.ms, onComplete: () => r.destroy() });
  }
  /** P3a-R7: DeathD2 smooth red inset glow plus a solid edge (one cached white texture, tinted danger); reduced motion gets a flat low-alpha wash. Depth is below the death card. */
  private deathFlash(v: Extract<ScreenVisual, { kind: 'deathFlash' }>): void {
    const col = this.color('danger');
    if (v.vignette) {
      this.ensureVignette();
      const im = this.scene.add.image(0, 0, VIGNETTE_KEY).setOrigin(0).setDisplaySize(WIDTH, HEIGHT).setTint(col).setAlpha(v.alpha).setDepth(M.depth);
      this.scene.tweens.add({ targets: im, alpha: 0, duration: v.ms, onComplete: () => im.destroy() });
      return;
    }
    const g = this.scene.add.graphics().setDepth(M.depth);
    g.fillStyle(col, v.alpha).fillRect(0, 0, WIDTH, HEIGHT);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: v.ms, onComplete: () => g.destroy() });
  }
  /** Draws the inset glow once: an even-odd frame whose outer edge lies outside the canvas casts its shadow inward, like a CSS inset box-shadow. */
  private ensureVignette(): void {
    if (this.scene.textures.exists(VIGNETTE_KEY)) return;
    const q = M.vignetteDiv, w = Math.round(WIDTH / q), h = Math.round(HEIGHT / q), k = ui(1) / q;
    const tex = this.scene.textures.createCanvas(VIGNETTE_KEY, w, h);
    if (!tex) return;
    const ctx = tex.getContext(), blur = M.vignetteBlur * k, spread = M.vignetteSpread * k, edge = M.vignetteInset * k, pad = blur * 2;
    ctx.save();
    ctx.globalAlpha = M.vignetteGlow; ctx.fillStyle = 'white'; ctx.shadowColor = 'white'; ctx.shadowBlur = blur;
    ctx.beginPath(); ctx.rect(-pad, -pad, w + 2 * pad, h + 2 * pad); ctx.rect(spread, spread, w - 2 * spread, h - 2 * spread);
    ctx.fill('evenodd');
    ctx.restore();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, edge); ctx.fillRect(0, h - edge, w, edge); ctx.fillRect(0, edge, edge, h - 2 * edge); ctx.fillRect(w - edge, edge, edge, h - 2 * edge);
    tex.refresh();
  }
}
