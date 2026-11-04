import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { drawBoardBorder } from '../../src/game/render/board';
import { LIGHT } from '../../src/game/render/palette';
import { DrawObject } from '../support/scene';

it('GDD-13 board outline follows prototype L72–73: 4px outside an 18px corner', () => {
  const g = new DrawObject();
  drawBoardBorder(g as unknown as Phaser.GameObjects.Graphics, LIGHT);
  expect(g.commands).toEqual([
    ['lineStyle', 4, 0x22311a], ['strokeRoundedRect', -2, -2, 508, 508, 20],
  ]);
});
