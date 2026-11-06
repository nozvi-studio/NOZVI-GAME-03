import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { snakeHeadPoint } from '../render/snake';
import { capyHeadKey, CAPY_SIZES } from './capyRig';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimConfig, type CapyAnimState } from './capyPose';

const rnd = (): number => Math.random(); // presentation-only blink timing, never the sim RNG

// ART-001 front-facing capy face drawn over the snake head (position follows; the face never rotates with direction).
export class CapyHead {
  readonly image: Phaser.GameObjects.Image;
  private state: CapyAnimState;
  private readonly base: number;

  constructor(scene: Phaser.Scene, board: Phaser.GameObjects.Container, afterLayer: Phaser.GameObjects.GameObject,
    private readonly cfg: CapyAnimConfig, cell: number, private readonly reduced: boolean, now: number) {
    this.image = scene.add.image(0, 0, capyHeadKey('idle', 'board')).setOrigin(0.5).setName('capy-head');
    board.addAt(this.image, board.getIndex(afterLayer) + 1);
    this.base = (cell * cfg.headCellScale) / CAPY_SIZES.board;
    this.state = createCapyAnim(now, cfg, rnd);
  }

  eat(now: number): void { this.state = capyEat(this.state, now); }
  die(now: number): void { this.state = capyDie(this.state, now); }
  reset(now: number): void { this.state = createCapyAnim(now, this.cfg, rnd); }

  update(s: SimSnapshot, now: number, cell: number): void {
    const { state, pose } = capyPose(this.state, now, this.cfg, this.reduced, rnd);
    this.state = state;
    const pt = snakeHeadPoint(s, cell);
    this.image.setTexture(capyHeadKey(pose.expression, 'board'))
      .setPosition(pt.x, pt.y + pose.dy)
      .setScale(this.base * pose.scaleX, this.base * pose.scaleY)
      .setAngle(pose.rotationDeg);
  }
}
