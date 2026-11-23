import Phaser from 'phaser';
import { enter } from '../motion';
import { bridgeOf } from './phaserPort';

// D4-P3-R3 thin shim: the DOM screen owns Home; close(token) is order-safe.
export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  create(): void {
    if (this.cameras?.main) enter(this, [], {});
    const bridge = bridgeOf(this);
    if (!bridge) return;
    const token = bridge.open('home');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { bridge.close(token); });
  }
}
