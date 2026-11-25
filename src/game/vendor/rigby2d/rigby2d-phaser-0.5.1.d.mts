import type Phaser from 'phaser';

export interface RigbyBoneWorld {
  x: number;
  y: number;
  rotation: number;
}

export interface RigbyTrackEntry {
  alpha: number;
  time: number;
  loop?: boolean;
}

export interface RigbyAnimationState {
  tracks: (RigbyTrackEntry | null)[];
  update?(skeleton: unknown, dt: number): void;
  apply(skeleton: unknown, pose: unknown): void;
}

export interface RigbyGameObject {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  skeleton: unknown;
  pose: unknown;
  state: RigbyAnimationState;
  timeScale: number;
  setName(value: string): this;
  setPosition(x: number, y: number): this;
  setScale(x: number, y?: number): this;
  setRotation(radians: number): this;
  setAngle(degrees: number): this;
  setAlpha(value: number): this;
  setDepth(value: number): this;
  setVisible(value: boolean): this;
  play(name: string, loop?: boolean, mix?: number): RigbyTrackEntry;
  boneWorld(name: string): RigbyBoneWorld | null;
  destroy(fromScene?: boolean): void;
}

export interface RigbyPhaserExports {
  RigbyPlugin: new (scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager, pluginKey: string) => Phaser.Plugins.ScenePlugin;
}

export function rigbyPhaser(phaser: typeof Phaser): RigbyPhaserExports;
