import Phaser from 'phaser';
import type { Session } from '../../session';
import { HEIGHT, WIDTH } from '../layout';
import { currentPalette } from '../render/palette';
import { t } from '../text';
import { beginRun, button, label } from './ui';

// MEC-003-R20 / MEC-008-R6 greybox run summary; Play again skips Loadout (MEC-007-R2).
export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(): void {
    const session = this.registry.get('session') as Session;
    const s = session.summary();
    this.cameras.main.setBackgroundColor(currentPalette().bg);
    const cx = WIDTH / 2;
    if (s) {
      label(this, cx, 160, s.won ? t('results.won') : t('cause.' + s.cause), 26, 'results-cause').setWordWrapWidth(480).setAlign('center');
      label(this, cx, 250, t('results.level', { level: s.level }), 30, 'results-level');
      label(this, cx, 300, t('results.cleared', { n: s.levelsCleared }), 20, 'results-cleared');
      label(this, cx, 360, t('results.score', { score: s.score }), 34, 'results-score');
      label(this, cx, 410, s.newBest ? t('results.newBest') : t('results.best', { best: s.bestScore }), 22, 'results-best');
      if (s.carriedEnergy > 0) label(this, cx, 460, t('results.carry', { e: s.carriedEnergy }), 20, 'results-carry');
    }
    const last = session.lastStartLevel();
    if (last !== null) button(this, cx, HEIGHT - 260, 300, 76, t('playAgain'), 'results-again',
      () => beginRun(this, last, 'results'), 28);
    button(this, cx, HEIGHT - 160, 220, 60, t('results.home'), 'results-home', () => this.scene.start('Home'), 22);
  }
}
