import type Phaser from 'phaser';
import { BOARD } from '../layout';
import type { Palette } from './palette';
import { FONT_UI } from '../uiTokens';

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: number;
}
interface FloatScore { x: number; y: number; life: number; max: number; label: Phaser.GameObjects.Text }
const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const DEFAULT_BURST_SPEED = 0.007;
const DEFAULT_BURST_LIFE_MS = 480;
type BurstPreset = readonly [count: number, speed: number, lifeMs: number];
// GDD-13 cosmetic burst presets [count, speed, lifeMs], ported from prototype L278–288, L402, L569, L684, L787.
export const PARTICLE_BURSTS: Readonly<Record<'eat' | 'golden' | 'rot' | 'dust' | 'death', BurstPreset>> = {
  eat: [10, DEFAULT_BURST_SPEED, DEFAULT_BURST_LIFE_MS],
  golden: [16, DEFAULT_BURST_SPEED, DEFAULT_BURST_LIFE_MS],
  rot: [8, 0.004, 420],
  dust: [3, 0.004, 320],
  death: [18, 0.009, 650],
};

// GDD-13 transient rendering state never affects the simulation or its RNG.
export class Effects {
  private particles: Particle[] = [];
  private floats: FloatScore[] = [];
  gulp = 0;
  deathFlash = 0;
  levelFlash = 0;

  constructor(private scene: Phaser.Scene, private board: Phaser.GameObjects.Container, private cell: number, private reduced: boolean) {}

  burst(gx: number, gy: number, color: number, n: number, speed = DEFAULT_BURST_SPEED, life = DEFAULT_BURST_LIFE_MS): void {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2, v = this.cell * speed * (0.5 + Math.random());
      this.particles.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: life * (0.7 + Math.random() * 0.5), max: life,
        r: this.cell * (0.06 + Math.random() * 0.07), color });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  floatText(gx: number, gy: number, points: number, big: boolean): void {
    const x = (gx + 0.5) * this.cell, y = (gy + 0.5) * this.cell;
    const label = this.scene.add.text(x, y, `+${points}`, {
      fontFamily: FONT_UI, fontStyle: 'bold',
      fontSize: this.cell * (big ? 0.95 : 0.75), strokeThickness: this.cell * 0.14,
    }).setOrigin(0.5);
    this.board.add(label);
    this.floats.push({ x, y, label, life: 750, max: 750 });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += this.cell * 0.00002 * dt; p.vx *= 0.985;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floats) { f.life -= dt; if (f.life <= 0) f.label.destroy(); }
    this.floats = this.floats.filter(f => f.life > 0);
    this.gulp = Math.max(0, this.gulp - dt / 180);
    this.deathFlash = Math.max(0, this.deathFlash - dt / 600);
    this.levelFlash = Math.max(0, this.levelFlash - dt / 800);
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
    if (this.deathFlash > 0) g.fillStyle(p.danger, this.deathFlash * 0.28).fillRect(0, 0, BOARD.size, BOARD.size);
  }

  reset(): void {
    this.particles = [];
    for (const f of this.floats) f.label.destroy();
    this.floats = [];
    this.gulp = 0; this.deathFlash = 0; this.levelFlash = 0;
  }
}
