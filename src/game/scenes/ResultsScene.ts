import Phaser from 'phaser';
import { enter } from '../motion';
import { bridgeOf } from './phaserPort';

// D4-P4-R1 thin shim: the DOM screen owns Results; close(token) is order-safe.
export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(): void {
    if (this.cameras?.main) enter(this, [], {});
    const bridge = bridgeOf(this);
    if (!bridge) return;
    const token = bridge.open('results');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { bridge.close(token); });
  }
}
