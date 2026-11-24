// META-BG-R1..R5 persistent parallel Phaser scene rendering the animated Aqua Marsh BgLoop behind DOM meta screens.
import Phaser from 'phaser';
import { BgLoop } from '../bg/bgLoop';
import { coverCamera } from '../bg/coverFit';

export const META_BG_KEY = 'MetaBg';
export const META_BG_READY_EVENT = 'meta-bg-ready';
export const META_BG_FAILED_EVENT = 'meta-bg-failed';

const ASSET_KEY = 'marsh-bg';
const SKELETON_URL = '/bg/marsh-loop/bg.json';
const ATLAS_URL = '/bg/marsh-loop/bg.atlas';
const DEFAULT_WIND = 1.15;
const FALLBACK_BG_HEX = '#043c44';

export class MetaBgScene extends Phaser.Scene {
  private bgLoop: BgLoop | null = null;
  private failed = false;

  constructor() {
    super(META_BG_KEY);
  }

  preload(): void {
    this.failed = false;
    if (this.game.renderer.type !== Phaser.WEBGL) {
      this.failed = true;
      return;
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
    if (!BgLoop.preload(this, ASSET_KEY, SKELETON_URL, ATLAS_URL)) {
      this.failed = true;
    }
  }

  create(): void {
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
    if (this.failed || !this.cache.json.exists(`${ASSET_KEY}:fx`)) {
      this.game.events.emit(META_BG_FAILED_EVENT);
      return;
    }

    try {
      this.cameras.main.setBackgroundColor(FALLBACK_BG_HEX);
      this.bgLoop = BgLoop.create(this, ASSET_KEY).setWind(DEFAULT_WIND);
      this.fitCamera();
      this.scene.sendToBack();
      this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
      this.registry.set('metaBgReady', true);
      this.game.events.emit(META_BG_READY_EVENT);
    } catch {
      this.failed = true;
      this.game.events.emit(META_BG_FAILED_EVENT);
    }
  }

  private fitCamera = (): void => {
    if (!this.bgLoop || !this.cameras?.main) return;
    const cam = this.cameras.main;
    const fit = coverCamera(cam.width, cam.height, this.bgLoop.width, this.bgLoop.height);
    cam.setZoom(fit.zoom);
    cam.centerOn(fit.centerX, fit.centerY);
  };

  private onLoadError = (): void => {
    this.failed = true;
  };

  private onShutdown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.bgLoop = null;
  };
}
