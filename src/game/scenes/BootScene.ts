import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';
import { load } from '../../meta';
import { localStore } from '../platform/localStore';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  // GDD-13 validate config before creating the playable scene.
  create(): void {
    const balance = parseBalance(structuredClone(json));
    this.registry.set('balance', balance);
    const store = localStore();
    this.registry.set('store', store);
    this.registry.set('save', load(store));
    this.scene.start('Game');
    this.scene.launch('Hud');
  }
}
