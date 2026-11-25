// ANIM-SNAKE-R1..R7 typed Phaser wrapper for the Rigby2D snake head + synchronized mango/eat_burst props.
import Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { snakeHeadPoint } from '../render/snake';
import type { RigbyGameObject } from '../vendor/rigby2d/rigby2d-phaser-0.5.1.mjs';
import {
  RIGGED_SKINS,
  SKIN_RIG_REGISTRY,
  createSnakeRigState,
  evalEatProps,
  headingRotationRad,
  playSnakeRig,
  resolveSkinRigConfig,
  rigWorldPoint,
  skinRigEntry,
  stepSnakeRig,
  type RiggedSkinId,
  type SnakeRigAnim,
  type SnakeRigConfig,
  type SnakeRigState,
} from './snakeRigModel';
import type { SkinId } from './skins';

export const SNAKE_RIG_KEY = SKIN_RIG_REGISTRY.snake.key;
export const SNAKE_MANGO_KEY = 'item/mango';
export const SNAKE_BURST_KEY = 'item/eat_burst';

export const SNAKE_RIG_URLS = {
  skeleton: SKIN_RIG_REGISTRY.snake.skeleton,
  atlas: SKIN_RIG_REGISTRY.snake.atlas,
  mango: 'items/mango.png',
  burst: 'items/eat_burst.png',
} as const;

const RIGBY_CACHE_KEY = 'rigby2d';

interface RigbyLoader {
  rigby?: (key: string, skeletonUrl: string, atlasUrl: string) => void;
}

interface RigbyFactory {
  rigby?: (x: number, y: number, key: string, anim: string, loop: boolean) => RigbyGameObject;
}

export class SnakeRig {
  readonly skin: RiggedSkinId;
  readonly rig: RigbyGameObject;
  readonly mango: Phaser.GameObjects.Image | null;
  readonly burst: Phaser.GameObjects.Image | null;
  private readonly cfg: SnakeRigConfig;
  private state: SnakeRigState;
  private visible = true;
  private alpha = 1;

  static isWebGL(scene: Phaser.Scene): boolean {
    return typeof Phaser.WEBGL === 'number' && scene.game?.renderer?.type === Phaser.WEBGL;
  }

  /** ANIM-CAT-R4 true when the given rigged skin's skeleton is cached in Rigby2D. */
  static isLoaded(scene: Phaser.Scene, skin: SkinId = 'snake'): boolean {
    const entry = skinRigEntry(skin);
    if (!entry) return false;
    const cache = scene.cache?.custom?.[RIGBY_CACHE_KEY] as { get?: (k: string) => unknown } | undefined;
    return Boolean(cache?.get?.(entry.key));
  }

  /** ANIM-CAT-R4 preload all registered Rigby2D skin rigs plus shared mango/eat_burst props on WebGL. */
  static preload(scene: Phaser.Scene): boolean {
    if (!SnakeRig.isWebGL(scene)) return false;
    const loader = scene.load as unknown as RigbyLoader | undefined;
    if (typeof loader?.rigby !== 'function') return false;
    for (const skin of RIGGED_SKINS) {
      if (!SnakeRig.isLoaded(scene, skin)) {
        const entry = SKIN_RIG_REGISTRY[skin];
        loader.rigby(entry.key, entry.skeleton, entry.atlas);
      }
    }
    if (scene.textures && !scene.textures.exists(SNAKE_MANGO_KEY)) {
      scene.load.image(SNAKE_MANGO_KEY, SNAKE_RIG_URLS.mango);
    }
    if (scene.textures && !scene.textures.exists(SNAKE_BURST_KEY)) {
      scene.load.image(SNAKE_BURST_KEY, SNAKE_RIG_URLS.burst);
    }
    return true;
  }

  /** ANIM-CAT-R4 create a board-space Rigby2D head for a rigged skin (defaults to snake). */
  static create(
    scene: Phaser.Scene,
    board: Phaser.GameObjects.Container,
    afterLayer: Phaser.GameObjects.GameObject,
    cfg: SnakeRigConfig,
    headCellScale: number,
    skin: RiggedSkinId = 'snake',
  ): SnakeRig {
    return new SnakeRig(scene, board, afterLayer, cfg, headCellScale, skin);
  }

  /** ANIM-SNAKE-R9 / ANIM-CAT-R4 create a standalone overlay rig (no board container or gameplay eat props) for meta/death screens. */
  static createOverlay(scene: Phaser.Scene, cfg: SnakeRigConfig, skin: RiggedSkinId = 'snake'): SnakeRig {
    return new SnakeRig(scene, null, null, cfg, 1, skin);
  }

  private constructor(
    scene: Phaser.Scene,
    board: Phaser.GameObjects.Container | null,
    afterLayer: Phaser.GameObjects.GameObject | null,
    cfg: SnakeRigConfig,
    private readonly headCellScale: number,
    skin: RiggedSkinId,
  ) {
    this.skin = skin;
    this.cfg = resolveSkinRigConfig(cfg, skin);
    const factory = scene.add as unknown as RigbyFactory;
    if (typeof factory?.rigby !== 'function') {
      throw new Error('RigbyPlugin is not registered on scene');
    }
    const key = SKIN_RIG_REGISTRY[skin].key;
    this.rig = factory.rigby(0, 0, key, 'idle', true).setName(board ? `${skin}-rig-head` : `${skin}-rig-meta`);
    this.rig.timeScale = 0;

    if (board && afterLayer) {
      this.mango = scene.textures?.exists(SNAKE_MANGO_KEY)
        ? scene.add.image(0, 0, SNAKE_MANGO_KEY).setVisible(false).setName('snake-rig-mango')
        : null;
      this.burst = scene.textures?.exists(SNAKE_BURST_KEY)
        ? scene.add.image(0, 0, SNAKE_BURST_KEY).setVisible(false).setName('snake-rig-burst')
        : null;

      let idx = board.getIndex(afterLayer) + 1;
      board.addAt(this.rig as unknown as Phaser.GameObjects.GameObject, idx++);
      if (this.mango) board.addAt(this.mango, idx++);
      if (this.burst) board.addAt(this.burst, idx++);
    } else {
      this.mango = null;
      this.burst = null;
    }

    this.state = createSnakeRigState();
    this.applyRigTime();
  }

  get currentAnim(): SnakeRigAnim {
    return this.state.anim;
  }

  play(anim: SnakeRigAnim, opts?: { loop?: boolean }): void {
    this.state = playSnakeRig(anim, opts);
    this.rig.play(this.state.anim, this.state.loop, 0);
    this.rig.timeScale = 0;
    this.applyRigTime();
  }

  reset(): void {
    this.play('idle');
    this.mango?.setVisible(false);
    this.burst?.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.rig.setVisible(visible);
    if (!visible) {
      this.mango?.setVisible(false);
      this.burst?.setVisible(false);
    }
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
    this.rig.setAlpha(alpha);
  }

  update(snapshot: SimSnapshot, dtMs: number, cell: number, tiltDeg = 0, paused = false): void {
    if (!this.visible) return;
    if (!paused) {
      const { state, switched } = stepSnakeRig(this.state, dtMs, this.cfg);
      this.state = state;
      if (switched) {
        this.rig.play(state.anim, state.loop, 0);
        this.rig.timeScale = 0;
      }
    }
    this.applyRigTime();

    const pt = snakeHeadPoint(snapshot, cell);
    const headPx = cell * this.headCellScale;
    const scale = headPx / this.cfg.designHeight;
    const rot = headingRotationRad(snapshot.dir.x, snapshot.dir.y) + (tiltDeg * Math.PI) / 180;
    const pos = rigWorldPoint(pt.x, pt.y, headPx, rot, 0);
    this.rig.setPosition(pos.x, pos.y).setScale(scale).setRotation(rot);

    const props = evalEatProps(this.state, this.cfg, headPx, this.mango?.width ?? 1, this.burst?.width ?? 1);
    if (this.mango) {
      if (props.mango.visible) {
        const mp = rigWorldPoint(pt.x, pt.y, headPx, rot, props.mango.localY);
        this.mango
          .setVisible(true)
          .setPosition(mp.x, mp.y)
          .setScale(props.mango.scale)
          .setRotation(rot + props.mango.rotationRad)
          .setAlpha(props.mango.alpha * this.alpha);
      } else {
        this.mango.setVisible(false);
      }
    }
    if (this.burst) {
      if (props.burst.visible) {
        const bp = rigWorldPoint(pt.x, pt.y, headPx, rot, props.burst.localY);
        this.burst
          .setVisible(true)
          .setPosition(bp.x, bp.y)
          .setScale(props.burst.scale)
          .setRotation(rot)
          .setAlpha(props.burst.alpha * this.alpha);
      } else {
        this.burst.setVisible(false);
      }
    }
  }

  /** ANIM-SNAKE-R9 step and position the standalone meta-screen overlay rig in game coordinates. */
  updateOverlay(dtMs: number, x: number, feetY: number, scale: number, paused = false): void {
    if (!this.visible) return;
    if (!paused) {
      const { state, switched } = stepSnakeRig(this.state, dtMs, this.cfg);
      this.state = state;
      if (switched) {
        this.rig.play(state.anim, state.loop, 0);
        this.rig.timeScale = 0;
      }
    }
    this.applyRigTime();
    this.rig.setPosition(x, feetY).setScale(scale).setRotation(0);
  }

  destroy(): void {
    this.rig.destroy();
    this.mango?.destroy();
    this.burst?.destroy();
  }

  private applyRigTime(): void {
    const entry = this.rig.state.tracks[0];
    if (entry) entry.time = this.state.timeMs / 1000;
    this.rig.state.apply(this.rig.skeleton, this.rig.pose);
  }
}
