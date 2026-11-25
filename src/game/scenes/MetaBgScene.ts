// META-BG-R1..R5 & ANIM-SNAKE-R9 persistent parallel Phaser scene rendering the animated Aqua Marsh BgLoop
// behind DOM meta screens plus the unzoomed Rigby2D snake hero overlay aligned to DOM hero slots.
import Phaser from 'phaser';
import type { Balance } from '../../core';
import { SnakeRig } from '../art/snakeRig';
import {
  RIGGED_SKINS,
  isRiggedSkin,
  metaHeroPlacement,
  resolveSkinRigConfig,
  shouldUseSkinRig,
  type RiggedSkinId,
  type SnakeRigConfig,
} from '../art/snakeRigModel';
import { BgLoop } from '../bg/bgLoop';
import { coverCamera } from '../bg/coverFit';
import type { MetaHeroAnim, MetaHeroSlot } from '../dom/uiBridge';
import { reduceMotion } from '../render/palette';

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
  private heroCam: Phaser.Cameras.Scene2D.Camera | null = null;
  private skinRigs = new Map<RiggedSkinId, SnakeRig>();
  private activeRig: SnakeRig | null = null;
  private rigCfg: SnakeRigConfig | null = null;
  private maxFrameDeltaMs = 100;
  private heroSlot: MetaHeroSlot | null = null;
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
    SnakeRig.preload(this);
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
      this.initSnakeHeroOverlay();
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

  /** ANIM-SNAKE-R9 / ANIM-CAT-R5 bind or clear the active DOM hero slot for the meta Rigby2D rig. */
  setHeroSlot(slot: MetaHeroSlot | null): boolean {
    const prevSkin = this.heroSlot?.skin ?? null;
    this.heroSlot = slot;
    if (this.skinRigs.size === 0 || !this.rigCfg || !slot) {
      this.hideAllRigs();
      return false;
    }
    if (!this.canShowRig(slot)) {
      this.hideAllRigs();
      return false;
    }
    const rig = isRiggedSkin(slot.skin) ? this.skinRigs.get(slot.skin) ?? null : null;
    if (!rig) {
      this.hideAllRigs();
      return false;
    }
    if (this.activeRig && this.activeRig !== rig) {
      this.activeRig.setVisible(false);
    }
    this.activeRig = rig;
    if (slot.initialAnim) {
      rig.play(slot.initialAnim, { loop: slot.loop });
    } else if (prevSkin !== slot.skin) {
      rig.play('idle');
    }
    this.syncHeroTransform(0);
    return true;
  }

  /** ANIM-SNAKE-R9 / ANIM-CAT-R5 trigger a meta animation clip (poke / celebrate / denied / idle) on the active rig. */
  playHeroAnim(anim: MetaHeroAnim, opts?: { loop?: boolean }): void {
    if (!this.activeRig || !this.heroSlot || !this.canShowRig(this.heroSlot)) return;
    this.activeRig.play(anim, opts);
  }

  /** ANIM-SNAKE-R9 current active rig clip name (used by tests and QA). */
  currentHeroAnim(): string | null {
    return this.activeRig?.currentAnim ?? this.skinRigs.values().next().value?.currentAnim ?? null;
  }

  /** ANIM-SNAKE-R9 / ANIM-CAT-R5 true when at least one meta skin rig is loaded and eligible on this renderer. */
  isSnakeRigReady(): boolean {
    return this.skinRigs.size > 0 && Boolean(this.rigCfg && SnakeRig.isWebGL(this));
  }

  update(_time: number, delta: number): void {
    if (!this.activeRig || !this.rigCfg || !this.heroSlot) return;
    if (!this.canShowRig(this.heroSlot)) {
      this.activeRig.setVisible(false);
      return;
    }
    const dt = Number.isFinite(delta) ? Math.min(Math.max(0, delta), this.maxFrameDeltaMs) : 0;
    this.syncHeroTransform(dt);
  }

  private initSnakeHeroOverlay(): void {
    const balance = this.registry?.get('balance') as Balance | undefined;
    const cfg = balance?.ui?.snakeRig;
    if (!cfg || !SnakeRig.isWebGL(this)) return;
    const loadedSkins = RIGGED_SKINS.filter(skin => SnakeRig.isLoaded(this, skin));
    if (loadedSkins.length === 0) return;
    this.rigCfg = cfg;
    this.maxFrameDeltaMs = balance.flow.maxFrameDeltaMs;
    const cam = this.cameras.main;
    this.heroCam = this.cameras.add(0, 0, cam.width, cam.height);
    if (this.bgLoop) this.heroCam.ignore(this.bgLoop.objects as Phaser.GameObjects.GameObject[]);
    for (const skin of loadedSkins) {
      const rig = SnakeRig.createOverlay(this, cfg, skin);
      rig.setVisible(false);
      cam.ignore(rig.rig as unknown as Phaser.GameObjects.GameObject);
      this.skinRigs.set(skin, rig);
    }
    this.registry.set('metaSnakeRigReady', true);
    if (this.heroSlot) this.setHeroSlot(this.heroSlot);
  }

  private hideAllRigs(): void {
    for (const rig of this.skinRigs.values()) rig.setVisible(false);
    this.activeRig = null;
  }

  private canShowRig(slot: MetaHeroSlot): boolean {
    return shouldUseSkinRig({
      isWebGL: SnakeRig.isWebGL(this),
      reduced: reduceMotion(),
      skin: slot.skin,
      rigLoaded: SnakeRig.isLoaded(this, slot.skin),
    });
  }

  private syncHeroTransform(dtMs: number): void {
    if (!this.activeRig || !this.rigCfg || !this.heroSlot || !this.cameras?.main) return;
    const cam = this.cameras.main;
    const canvasRect = this.game?.canvas?.getBoundingClientRect?.();
    const slotRect = this.heroSlot.readRect();
    const cfg = resolveSkinRigConfig(this.rigCfg, this.heroSlot.skin);
    const place = metaHeroPlacement(slotRect, canvasRect, cam.width, cam.height, cfg);
    if (!place.visible) {
      this.activeRig.setVisible(false);
      return;
    }
    this.activeRig.setVisible(true);
    this.activeRig.updateOverlay(dtMs, place.x, place.feetY, place.scale);
  }

  private fitCamera = (): void => {
    if (!this.bgLoop || !this.cameras?.main) return;
    const cam = this.cameras.main;
    const fit = coverCamera(cam.width, cam.height, this.bgLoop.width, this.bgLoop.height);
    cam.setZoom(fit.zoom);
    cam.centerOn(fit.centerX, fit.centerY);
    this.heroCam?.setSize(cam.width, cam.height);
    if (this.heroSlot && this.activeRig) this.syncHeroTransform(0);
  };

  private onLoadError = (): void => {
    this.failed = true;
  };

  private onShutdown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    for (const rig of this.skinRigs.values()) rig.destroy();
    this.skinRigs.clear();
    this.activeRig = null;
    this.heroCam = null;
    this.bgLoop = null;
  };
}
