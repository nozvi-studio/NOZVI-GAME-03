import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  // GDD-13 validate config before creating the playable scene.
  create(): void {
    const balance = parseBalance(structuredClone(json));
    this.registry.set('balance', balance);
    this.scene.start('Game');
  }
}
