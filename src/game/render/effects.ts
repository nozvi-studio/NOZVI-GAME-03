import type Phaser from 'phaser';
import { BOARD } from '../layout';
import type { Palette } from './palette';
import { FONT_UI } from '../uiTokens';
import { trimOldest } from '../juice/juiceMap';

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: number;
}
interface FloatScore { x: number; y: number; life: number; max: number; label: Phaser.GameObjects.Text }
const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const DEFAULT_BURST_SPEED = 0.007;
const DEFAULT_BURST_LIFE_MS = 480;
const SWEEP_BAND = 0.35;
export interface EffectCaps { maxParticles: number; maxFloats: number; gulpMs: number }

// GDD-13 transient rendering state never affects the simulation or its RNG.
export class Effects {
  private particles: Particle[] = [];
  private floats: FloatScore[] = [];
  gulp = 0;
  pop = 0;
  levelFlash = 0;
  private popRate = 0;
  private levelFlashRate = 0;
  private tintColor = 0;
  private tintAlpha = 0;
  private tintMax = 0;
  private tintTarget = 0;
  private tintFadeMs = 1;
  private tintLeftMs = 0;
  private sweepColor = 0;
  private sweepAlpha = 0;
  private sweepT = 0;
  private sweepMs = 1;
  private sweepMoving = false;

  constructor(private scene: Phaser.Scene, private board: Phaser.GameObjects.Container, private cell: number,
    private reduced: boolean, private caps: EffectCaps) {}

  setReduced(r: boolean): void { this.reduced = r; }

  snakePop(ms: number): void { this.pop = 1; this.popRate = 1 / ms; }

  glow(alpha: number, ms: number): void { this.levelFlash = alpha; this.levelFlashRate = alpha / ms; }

  setTint(color: number, alpha: number, fadeMs: number, autoClearMs: number): void {
    this.tintColor = color; this.tintMax = alpha; this.tintTarget = alpha; this.tintFadeMs = fadeMs; this.tintLeftMs = autoClearMs;
  }

  clearTint(fadeMs: number): void { this.tintTarget = 0; this.tintFadeMs = fadeMs; this.tintLeftMs = 0; }

  sweep(color: number, alpha: number, ms: number, moving: boolean): void {
    this.sweepColor = color; this.sweepAlpha = alpha; this.sweepMs = ms; this.sweepMoving = moving; this.sweepT = 1;
  }

  burst(gx: number, gy: number, color: number, n: number, speed = DEFAULT_BURST_SPEED, life = DEFAULT_BURST_LIFE_MS): void {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2, v = this.cell * speed * (0.5 + Math.random());
      this.particles.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: life * (0.7 + Math.random() * 0.5), max: life,
        r: this.cell * (0.06 + Math.random() * 0.07), color });
    }
    trimOldest(this.particles, this.caps.maxParticles);
  }

  floatText(gx: number, gy: number, points: number, big: boolean): void {
    const x = (gx + 0.5) * this.cell, y = (gy + 0.5) * this.cell;
    const label = this.scene.add.text(x, y, `+${points}`, {
      fontFamily: FONT_UI, fontStyle: 'bold',
      fontSize: this.cell * (big ? 0.95 : 0.75), strokeThickness: this.cell * 0.14,
    }).setOrigin(0.5);
    this.board.add(label);
    this.floats.push({ x, y, label, life: 750, max: 750 });
    while (this.floats.length > this.caps.maxFloats) this.floats.shift()!.label.destroy();
  }

  update(dt: number): void {
    let n = 0; // compact in place: no per-frame array allocation
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += this.cell * 0.00002 * dt; p.vx *= 0.985;
      if (p.life > 0) this.particles[n++] = p;
    }
    this.particles.length = n; n = 0;
    for (const f of this.floats) { f.life -= dt; if (f.life <= 0) f.label.destroy(); else this.floats[n++] = f; }
    this.floats.length = n;
    this.gulp = Math.max(0, this.gulp - dt / this.caps.gulpMs);
    this.pop = Math.max(0, this.pop - dt * this.popRate);
    this.levelFlash = Math.max(0, this.levelFlash - dt * this.levelFlashRate);
    if (this.tintLeftMs > 0) { this.tintLeftMs -= dt; if (this.tintLeftMs <= 0) this.clearTint(this.tintFadeMs); }
    const step = dt / this.tintFadeMs * this.tintMax;
    this.tintAlpha = this.tintAlpha < this.tintTarget ? Math.min(this.tintTarget, this.tintAlpha + step) : Math.max(this.tintTarget, this.tintAlpha - step);
    this.sweepT = Math.max(0, this.sweepT - dt / this.sweepMs);
  }

  draw(g: Phaser.GameObjects.Graphics, p: Palette): void {
    for (const particle of this.particles) {
      g.fillStyle(particle.color, Math.min(1, particle.life / particle.max * 1.5))
        .fillCircle(particle.x, particle.y, particle.r);
    }
    for (const f of this.floats) {
      const k = 1 - f.life / f.max;
      f.label.setPosition(f.x, f.y - (this.reduced ? 0 : k * this.cell * 0.9))
        .setAlpha(Math.min(1, f.life / f.max * 2)).setColor(cssColor(p.ink)).setStroke(cssColor(p.panel), this.cell * 0.14);
    }
    if (this.levelFlash > 0) {
      g.lineStyle(this.cell * 0.35, p.gold, this.levelFlash).strokeRect(0, 0, BOARD.size, BOARD.size);
    }
    if (this.tintAlpha > 0) g.fillStyle(this.tintColor, this.tintAlpha).fillRect(0, 0, BOARD.size, BOARD.size);
    if (this.sweepT > 0) {
      const k = 1 - this.sweepT, a = this.sweepAlpha * Math.sin(Math.PI * k);
      if (this.sweepMoving) {
        const band = BOARD.size * SWEEP_BAND;
        g.fillStyle(this.sweepColor, a).fillRect(k * (BOARD.size + band) - band, 0, band, BOARD.size);
      } else g.fillStyle(this.sweepColor, a).fillRect(0, 0, BOARD.size, BOARD.size);
    }
  }

  reset(): void {
    this.particles = [];
    for (const f of this.floats) f.label.destroy();
    this.floats = [];
    this.gulp = 0; this.pop = 0; this.levelFlash = 0;
    this.tintAlpha = 0; this.tintTarget = 0; this.tintLeftMs = 0; this.sweepT = 0;
  }
}
