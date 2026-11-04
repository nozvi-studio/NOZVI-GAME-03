import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';
import { createSession } from '../../session';
import { localStore } from '../platform/localStore';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  // GDD-13 validate config, then create the run session (P1-D1) and open Home.
  create(): void {
    const balance = parseBalance(structuredClone(json));
    this.registry.set('balance', balance);
    const store = localStore();
    this.registry.set('store', store);
    // MEC-008-R12 the session loads the save with balance rules; the seed only picks a run (core RNG does the rest).
    const session = createSession({ balance, store,
      newSeed: () => (Math.random() * 2 ** 31) >>> 0, now: () => Date.now() });
    this.registry.set('session', session);
    this.registry.set('save', session.save());
    this.scene.start('Home');
  }
}
