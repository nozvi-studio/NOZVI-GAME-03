import Phaser from 'phaser';
import type { SettingsEntry } from '../flow/settingsView';
import { enter } from '../motion';
import { bridgeOf } from './phaserPort';

/** MOT-1-R8 start state of a switch on rebuild: the previous value when known, else the current one (no slide). */
export const slideFrom = (prev: ReadonlyMap<string, boolean>, id: string, on: boolean): boolean => prev.get(id) ?? on;

// D4-P4-R2 thin shim: the DOM screen owns Settings (both full screen and overlay fallback).
export class SettingsScene extends Phaser.Scene {
  private entry: SettingsEntry = {};
  constructor() { super('Settings'); }

  init(data: SettingsEntry): void { this.entry = data ?? {}; }

  create(): void {
    if (this.cameras?.main && !this.entry.overlay) enter(this, [], {});
    const bridge = bridgeOf(this);
    if (!bridge) return;
    if (this.entry.overlay) {
      bridge.openSettingsOverlay(() => { this.scene.stop(); });
      return;
    }
    const token = bridge.open('settings', { returnTo: this.entry.returnTo ?? 'Home' });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { bridge.close(token); });
  }
}
