import Phaser from 'phaser';
import { enter } from '../motion';
import { bridgeOf } from './phaserPort';

// D4-P3-R3 thin shim: the DOM screen owns Characters; close(token) is order-safe.
export class CharactersScene extends Phaser.Scene {
  constructor() { super('Characters'); }

  init(_data?: { debug?: boolean }): void {}

  create(): void {
    if (this.cameras?.main) enter(this, [], {});
    const bridge = bridgeOf(this);
    if (!bridge) return;
    const token = bridge.open('characters');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { bridge.close(token); });
  }
}
