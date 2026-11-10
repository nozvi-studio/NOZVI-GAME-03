import type Phaser from 'phaser';
import { BOARD } from '../layout';
import type { Palette } from './palette';
import { FONT_UI } from '../uiTokens';
import { trimOldest } from '../juice/juiceMap';
import { cubicOut, lerp, sineInOut, turnTilt } from '../motion/curves';

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: number;
}
interface FloatScore { x: number; y: number; life: number; max: number; label: Phaser.GameObjects.Text }
interface Ring { x: number; y: number; life: number; max: number; scale: number; color: number }
interface Star { x: number; y: number; life: number; max: number; color: number }
const RING_RADIUS_CELL = 0.5; // start radius of a ring pulse in cells
const RING_WIDTH_CELL = 0.08;
const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const DEFAULT_BURST_SPEED = 0.007;
const DEFAULT_BURST_LIFE_MS = 480;
const SWEEP_BAND = 0.35;
export interface EffectCaps { maxParticles: number; maxFloats: number; gulpMs: number; ringMax: number; sparkleMax: number; overshoot: number; sparkleRadius: number; sparkleThickness: number }

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
  private rings: Ring[] = [];
  private stars: Star[] = [];
  /** MOT-3-R12 current head tilt in degrees (signed) and the ease it follows. */
  turnDeg = 0;
  private turnAmp = 0;
  private turnElapsed = 0;
  private turnMs = 1;
  /** MOT-3-R12 0..1 strength of the first-body-segment bulge (the positive part of the tilt ease). */
  get turnBulge(): number { return this.turnAmp === 0 ? 0 : Math.max(0, this.turnDeg / this.turnAmp); }

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

  /** MOT-3-R6 expanding ring in board space; capped by caps.ringMax (oldest dropped). */
  ringPulse(gx: number, gy: number, color: number, scale: number, ms: number): void {
    if (this.reduced) return;
    this.rings.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell, life: ms, max: ms, scale, color });
    trimOldest(this.rings, this.caps.ringMax);
  }
  /** MOT-3-R13 one 4-point star; at most sparkleMax alive, counted inside maxParticles (burst trims around them). */
  sparkle(gx: number, gy: number, color: number, lifeMs: number): void {
    if (this.reduced) return;
    this.stars.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell, life: lifeMs, max: lifeMs, color });
    trimOldest(this.stars, this.caps.sparkleMax);
    trimOldest(this.particles, Math.max(0, this.caps.maxParticles - this.stars.length));
  }
  clearSparkles(): void { this.stars = []; }
  /** MOT-3-R12 tilt toward the new direction (right/down clockwise, left/up counter-clockwise); a new turn restarts the ease. */
  turnTilt(dx: number, dy: number, deg: number, ms: number): void {
    if (this.reduced) return;
    this.turnAmp = deg * (dx !== 0 ? Math.sign(dx) : Math.sign(dy));
    this.turnElapsed = 0; this.turnMs = ms; this.turnDeg = this.turnAmp;
  }

  burst(gx: number, gy: number, color: number, n: number, speed = DEFAULT_BURST_SPEED, life = DEFAULT_BURST_LIFE_MS): void {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2, v = this.cell * speed * (0.5 + Math.random());
      this.particles.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: life * (0.7 + Math.random() * 0.5), max: life,
        r: this.cell * (0.06 + Math.random() * 0.07), color });
    }
    trimOldest(this.particles, Math.max(0, this.caps.maxParticles - this.stars.length));
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
    n = 0;
    for (const r of this.rings) { r.life -= dt; if (r.life > 0) this.rings[n++] = r; }
    this.rings.length = n; n = 0;
    for (const s of this.stars) { s.life -= dt; if (s.life > 0) this.stars[n++] = s; }
    this.stars.length = n;
    if (this.turnAmp !== 0) {
      this.turnElapsed = Math.min(this.turnMs, this.turnElapsed + dt);
      this.turnDeg = turnTilt(this.turnElapsed, this.turnMs, this.turnAmp, this.caps.overshoot);
    }
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
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      g.lineStyle(this.cell * RING_WIDTH_CELL, r.color, 1 - k).strokeCircle(r.x, r.y, this.cell * RING_RADIUS_CELL * lerp(1, r.scale, cubicOut(k)));
    }
    for (const s of this.stars) {
      const f = 1 - s.life / s.max, arm = this.cell * this.caps.sparkleRadius * sineInOut(1 - Math.abs(2 * f - 1)), w = this.cell * this.caps.sparkleThickness;
      g.fillStyle(s.color, 1).fillRect(s.x - arm, s.y - w / 2, arm * 2, w).fillRect(s.x - w / 2, s.y - arm, w, arm * 2);
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
    this.rings = []; this.stars = []; this.turnAmp = 0; this.turnDeg = 0; this.turnElapsed = 0;
    for (const f of this.floats) f.label.destroy();
    this.floats = [];
    this.gulp = 0; this.pop = 0; this.levelFlash = 0;
    this.tintAlpha = 0; this.tintTarget = 0; this.tintLeftMs = 0; this.sweepT = 0;
  }
}
