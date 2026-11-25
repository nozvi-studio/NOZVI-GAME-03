// META-BG-R1 typed Phaser wrapper for the Rigby2D animated Aqua Marsh background loop (ported from phaser/src/bg_loop.js).
import Phaser from 'phaser';
import type { RigbyGameObject, RigbyTrackEntry } from '../vendor/rigby2d/rigby2d-phaser-0.5.1.mjs';

const FX_DEPTH = { bg: 0, glow: 1, foliage: 2, fireflies: 6, sparkle: 7 } as const;
const CENTER_GLOW_TINT = 0x4affb8;

interface BgFireflySpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  nx: number;
  ny: number;
  phase_x: number;
  phase_y: number;
  pulse_cycles: number;
  pulse_phase: number;
  alpha_min: number;
  alpha_max: number;
  radius: number;
  tint: number;
}

interface BgGlowSpec {
  x: number;
  y: number;
  cycles: number;
  alphaMin: number;
  alphaMax: number;
}

interface BgSparkleSpec {
  x: number;
  y: number;
  bone?: string;
  localX: number;
  localY: number;
  cycles: number;
  scaleMin: number;
  scaleMax: number;
  rotDeg: number;
}

interface BgFxData {
  width: number;
  height: number;
  windBake: number;
  loopDuration: number;
  bgTexture: string;
  fireflyTexture: string;
  sparkleTexture: string;
  centerGlow: BgGlowSpec;
  fireflies: BgFireflySpec[];
  sparkle: BgSparkleSpec;
}

interface RigbyLoader {
  rigby?: (key: string, skeletonUrl: string, atlasUrl: string) => void;
}

interface RigbyFactory {
  rigby?: (x: number, y: number, key: string, anim: string, loop: boolean) => RigbyGameObject;
}

export class BgLoop {
  readonly width: number;
  readonly height: number;
  private readonly scene: Phaser.Scene;
  private readonly fx: BgFxData;
  private readonly origin: { x: number; y: number };
  private readonly bg: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly skeleton: RigbyGameObject;
  private readonly entry: RigbyTrackEntry | null;
  private readonly fireflies: { sp: Phaser.GameObjects.Image; f: BgFireflySpec; base: number }[];
  private readonly sparkle: Phaser.GameObjects.Image;
  private wind = 1;

  static preload(scene: Phaser.Scene, key: string, skeletonUrl: string, atlasUrl: string): boolean {
    const loader = scene.load as unknown as RigbyLoader;
    if (typeof loader.rigby !== 'function') return false;
    const folder = skeletonUrl.slice(0, skeletonUrl.lastIndexOf('/') + 1);
    loader.rigby(key, skeletonUrl, atlasUrl);
    scene.load.json(`${key}:fx`, skeletonUrl);
    scene.load.once(`filecomplete-json-${key}:fx`, (_k: string, _t: string, data: Record<string, unknown>) => {
      const fx = data?.['x-bgfx'] as BgFxData | undefined;
      if (!fx) return;
      scene.load.image(`${key}:bgTexture`, folder + fx.bgTexture);
      scene.load.image(`${key}:firefly`, folder + fx.fireflyTexture);
      scene.load.image(`${key}:sparkle`, folder + fx.sparkleTexture);
    });
    return true;
  }

  static create(scene: Phaser.Scene, key: string, x = 0, y = 0): BgLoop {
    return new BgLoop(scene, key, x, y);
  }

  private constructor(scene: Phaser.Scene, key: string, x: number, y: number) {
    this.scene = scene;
    const raw = scene.cache.json.get(`${key}:fx`) as Record<string, unknown> | undefined;
    const fx = raw?.['x-bgfx'] as BgFxData | undefined;
    if (!fx) throw new Error(`BgLoop missing x-bgfx data for key "${key}"`);
    const factory = scene.add as unknown as RigbyFactory;
    if (typeof factory.rigby !== 'function') throw new Error('RigbyPlugin is not registered on scene');

    this.fx = fx;
    this.width = fx.width;
    this.height = fx.height;
    this.origin = { x, y };

    this.bg = scene.add.image(x + fx.width / 2, y + fx.height / 2, `${key}:bgTexture`).setDepth(FX_DEPTH.bg);

    const g = fx.centerGlow;
    this.glow = scene.add
      .image(x + g.x, y + g.y, `${key}:firefly`)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(CENTER_GLOW_TINT)
      .setScale(7.5, 9.0)
      .setDepth(FX_DEPTH.glow);

    this.skeleton = factory.rigby(x, y, key, 'wind', true).setDepth(FX_DEPTH.foliage);
    this.entry = this.skeleton.state.tracks[0] ?? null;

    this.fireflies = fx.fireflies.map((f) => {
      const sp = scene.add
        .image(x + f.x, y + f.y, `${key}:firefly`)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(f.tint)
        .setDepth(FX_DEPTH.fireflies);
      return { sp, f, base: Math.max(0.22, (f.radius * 3.6) / 64) };
    });

    this.sparkle = scene.add
      .image(0, 0, `${key}:sparkle`)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(FX_DEPTH.sparkle);

    this.setWind(1);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  setWind(w: number): this {
    this.wind = Math.max(0, Math.min(this.fx.windBake, w));
    if (this.entry) this.entry.alpha = this.wind / this.fx.windBake;
    return this;
  }

  get loopTime(): number {
    return this.entry ? this.entry.time % this.fx.loopDuration : 0;
  }

  /** ANIM-SNAKE-R9 display objects owned by BgLoop, so MetaBgScene's unzoomed hero camera can ignore them. */
  get objects(): readonly Phaser.GameObjects.GameObject[] {
    return [
      this.bg,
      this.glow,
      this.skeleton as unknown as Phaser.GameObjects.GameObject,
      this.sparkle,
      ...this.fireflies.map((i) => i.sp),
    ];
  }

  setVisibleParts({ foliage, fireflies, glow }: { foliage?: boolean; fireflies?: boolean; glow?: boolean } = {}): void {
    if (foliage !== undefined) this.skeleton.setVisible(foliage);
    if (fireflies !== undefined) this.fireflies.forEach((i) => i.sp.setVisible(fireflies));
    if (glow !== undefined) {
      this.glow.setVisible(glow);
      this.sparkle.setVisible(glow);
    }
  }

  private update(): void {
    const { fx, origin } = this;
    const phase = (2 * Math.PI * this.loopTime) / fx.loopDuration;

    for (const { sp, f, base } of this.fireflies) {
      const pulse = 0.5 + 0.5 * Math.sin(f.pulse_cycles * phase + f.pulse_phase);
      sp.setPosition(
        origin.x + f.x + f.rx * Math.sin(f.nx * phase + f.phase_x) * (0.4 + 0.6 * this.wind),
        origin.y + f.y + f.ry * Math.cos(f.ny * phase + f.phase_y),
      );
      sp.setAlpha(f.alpha_min + (f.alpha_max - f.alpha_min) * pulse);
      sp.setScale(base * (0.82 + 0.36 * pulse));
    }

    const g = fx.centerGlow;
    const gWave = 0.5 - 0.5 * Math.cos(g.cycles * phase);
    this.glow.setAlpha(g.alphaMin + (g.alphaMax - g.alphaMin) * gWave);

    const s = fx.sparkle;
    const b = s.bone ? this.skeleton.boneWorld(s.bone) : null;
    let sx = origin.x + s.x;
    let sy = origin.y + s.y;
    if (b) {
      const c = Math.cos(b.rotation);
      const n = Math.sin(b.rotation);
      sx = b.x + s.localX * c - s.localY * n;
      sy = b.y + s.localX * n + s.localY * c;
    }
    const sp = 0.5 - 0.5 * Math.cos(s.cycles * phase);
    this.sparkle
      .setPosition(sx, sy)
      .setScale(s.scaleMin + (s.scaleMax - s.scaleMin) * sp)
      .setAlpha(0.25 + 0.7 * sp)
      .setAngle(Math.sin(s.cycles * phase) * s.rotDeg);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    for (const o of [this.bg, this.glow, this.skeleton, this.sparkle, ...this.fireflies.map((i) => i.sp)]) {
      o.destroy();
    }
  }
}
