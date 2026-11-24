import type Phaser from 'phaser';

export interface RigbyBoneWorld {
  x: number;
  y: number;
  rotation: number;
}

export interface RigbyTrackEntry {
  alpha: number;
  time: number;
}

export interface RigbyAnimationState {
  tracks: (RigbyTrackEntry | null)[];
  apply(skeleton: unknown, pose: unknown): void;
}

export interface RigbyGameObject {
  skeleton: unknown;
  pose: unknown;
  state: RigbyAnimationState;
  timeScale: number;
  setDepth(value: number): this;
  setVisible(value: boolean): this;
  boneWorld(name: string): RigbyBoneWorld | null;
  destroy(): void;
}

export interface RigbyPhaserExports {
  RigbyPlugin: new (scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager, pluginKey: string) => Phaser.Plugins.ScenePlugin;
}

export function rigbyPhaser(phaser: typeof Phaser): RigbyPhaserExports;
