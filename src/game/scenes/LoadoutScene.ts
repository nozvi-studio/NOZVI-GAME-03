import Phaser from 'phaser';
import { enter } from '../motion';
import { bridgeOf } from './phaserPort';

/** MOT-1-R10 a picked badge pops when its card gained or changed slot since the last render (never on the first render). */
export const badgeIsNew = (prev: ReadonlyMap<string, number | null> | null, id: string, slot: number | null): boolean =>
  prev !== null && slot !== null && prev.get(id) !== slot;

// D4-P4-R3 thin shim: the DOM screen owns Loadout; close(token) is order-safe.
export class LoadoutScene extends Phaser.Scene {
  private level = 1;
  private debug = false;
  constructor() { super('Loadout'); }

  init(data?: { level?: number; debug?: boolean }): void {
    this.level = data?.level ?? 1;
    this.debug = data?.debug === true;
  }

  create(): void {
    if (this.cameras?.main) enter(this, [], {});
    const bridge = bridgeOf(this);
    if (!bridge) return;
    const token = bridge.open('loadout', { level: this.level, debug: this.debug });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { bridge.close(token); });
  }
}
