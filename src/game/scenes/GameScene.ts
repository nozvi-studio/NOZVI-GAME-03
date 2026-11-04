import Phaser from 'phaser';
import { createSim, type Balance, type Sim, type SimEvent, type SimSnapshot, type Step } from '../../core';
import { BOARD, cellPx } from '../layout';
import { clockStep, createClock } from '../flow/clock';
import { createFlow, flowKey, flowOver, flowPause, flowTick, flowTurn, type FlowEffect, type FlowState } from '../flow/runFlow';
import { bindKeyboard } from '../input/keyboard';
import { bindSwipe } from '../input/swipe';
import { BOARD_RADIUS, buildBoardTexture, drawBoardBorder } from '../render/board';
import { Effects, PARTICLE_BURSTS } from '../render/effects';
import { drawHazards, drawTerrains } from '../render/hazards';
import { drawMango } from '../render/mango';
import { currentPalette, reduceMotion, type Palette } from '../render/palette';
import { drawSnake } from '../render/snake';

export class GameScene extends Phaser.Scene {
  balance!: Balance;
  flow: FlowState = createFlow();
  private sim: Sim | null = null;
  private clock = createClock();
  private palette!: Palette;
  private reduced = false;
  private mangoBornAt = 0;
  private board!: Phaser.GameObjects.Container;
  private border!: Phaser.GameObjects.Graphics;
  private boardClip!: Phaser.GameObjects.Graphics;
  private layers!: Record<'terrain' | 'hazards' | 'mango' | 'snake' | 'effects', Phaser.GameObjects.Graphics>;
  private effects!: Effects;

  constructor() { super('Game'); }

  // GDD-13 scene owns presentation, frame time and input; core owns all rules.
  create(): void {
    this.balance = this.registry.get('balance') as Balance;
    this.palette = currentPalette();
    this.reduced = reduceMotion();
    this.cameras.main.setBackgroundColor(this.palette.bg);
    const image = this.add.image(0, 0, buildBoardTexture(this, this.balance, this.palette)).setOrigin(0);
    this.board = this.add.container(BOARD.x, BOARD.y, [image]).setName('board');
    this.layers = {
      terrain: this.add.graphics(), hazards: this.add.graphics(), mango: this.add.graphics(),
      snake: this.add.graphics(), effects: this.add.graphics(),
    };
    this.board.add(Object.values(this.layers));
    this.border = this.add.graphics().setName('board-border').setPosition(BOARD.x, BOARD.y);
    drawBoardBorder(this.border, this.palette);
    this.boardClip = this.add.graphics().setName('board-clip').setPosition(BOARD.x, BOARD.y).setVisible(false);
    this.boardClip.fillStyle(0xffffff).fillRoundedRect(0, 0, BOARD.size, BOARD.size, BOARD_RADIUS);
    this.board.setMask(this.boardClip.createGeometryMask());
    this.effects = new Effects(this, this.board, cellPx(this.balance), this.reduced);
    this.flow = createFlow();
    this.startRun(); // ready screen still shows the initial snake and mango.
    const zone = this.add.zone(BOARD.x, BOARD.y, BOARD.size, BOARD.size).setOrigin(0).setInteractive();
    bindKeyboard(this);
    bindSwipe(this, zone);
    const pause = (): void => { this.apply(flowPause(this.flow)); };
    this.game.events.on(Phaser.Core.Events.BLUR, pause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, pause);
    const theme = window.matchMedia('(prefers-color-scheme: dark)');
    const recolor = (): void => {
      this.palette = currentPalette();
      buildBoardTexture(this, this.balance, this.palette);
      drawBoardBorder(this.border.clear(), this.palette);
      this.cameras.main.setBackgroundColor(this.palette.bg);
    };
    theme.addEventListener('change', recolor);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, pause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, pause);
      theme.removeEventListener('change', recolor);
      this.effects.reset();
      this.board.clearMask(true);
      this.sim = null;
    });
  }

  startRun(): void {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    console.info('[mango-snake] run seed', seed);
    this.sim = createSim(this.balance, seed);
    this.mangoBornAt = this.time.now;
    this.effects.reset();
    this.clock = createClock();
    this.tweens.killTweensOf(this.board);
    this.board.setPosition(BOARD.x, BOARD.y);
  }

  snapshot(): SimSnapshot | null { return this.sim?.snapshot() ?? null; }

  turn(dx: Step, dy: Step): void {
    const result = flowTurn(this.flow, this.balance);
    this.apply(result.effects);
    if (result.forward) this.sim?.turn(dx, dy);
  }

  flowKey(code: 'Space' | 'KeyP' | 'Escape'): void { this.apply(flowKey(this.flow, this.balance, code)); }

  // GDD-13 HUD, keyboard and turn input all apply the same flow effects.
  apply(effects: FlowEffect[]): void {
    for (const effect of effects) {
      if (effect.type === 'newRun') this.startRun();
      this.events.emit('flow', effect);
    }
  }

  update(time: number, deltaMs: number): void {
    if (!this.sim) return;
    const dt = Math.min(Math.max(0, deltaMs), this.balance.flow.maxFrameDeltaMs);
    let events: SimEvent[] = [];
    if (this.flow.status === 'countdown') this.apply(flowTick(this.flow, this.balance, dt));
    else if (this.flow.status === 'playing') {
      this.sim.advance(clockStep(this.clock, deltaMs, this.balance.flow.maxFrameDeltaMs));
      events = this.sim.drainEvents();
    }
    const snapshot = this.sim.snapshot();
    this.handleEvents(events, snapshot);
    this.events.emit('sim-events', events);
    if (snapshot.status === 'over' && this.flow.status !== 'over') {
      flowOver(this.flow);
      this.events.emit('run-over', snapshot);
    }
    this.effects.update(dt);
    this.draw(snapshot, time);
  }

  private handleEvents(events: SimEvent[], snapshot: SimSnapshot): void {
    for (const event of events) {
      switch (event.type) {
        case 'ate':
          this.mangoBornAt = this.time.now;
          this.effects.burst(event.x, event.y, event.golden ? this.palette.gold : this.palette.food,
            ...(event.golden ? PARTICLE_BURSTS.golden : PARTICLE_BURSTS.eat));
          this.effects.floatText(event.x, event.y, event.points, event.golden);
          if (!this.reduced) this.effects.gulp = 1;
          break;
        case 'rotted':
          this.mangoBornAt = this.time.now;
          this.effects.burst(event.x, event.y, this.palette.rock, ...PARTICLE_BURSTS.rot);
          break;
        case 'dust': this.effects.burst(event.x, event.y, this.palette.rock, ...PARTICLE_BURSTS.dust); break;
        case 'levelUp': this.effects.levelFlash = 1; break;
        case 'died': {
          this.effects.deathFlash = 1;
          const head = snapshot.snake[0]!;
          this.effects.burst(head.x, head.y, this.palette.snake, ...PARTICLE_BURSTS.death);
          if (!this.reduced) this.shake();
          break;
        }
      }
    }
  }

  private shake(): void {
    this.tweens.killTweensOf(this.board);
    this.tweens.chain({ targets: this.board, tweens: [
      { x: BOARD.x - 6, y: BOARD.y + 2, duration: 80 },
      { x: BOARD.x + 5, y: BOARD.y - 3, duration: 80 },
      { x: BOARD.x - 3, y: BOARD.y + 1, duration: 80 },
      { x: BOARD.x + 2, y: BOARD.y, duration: 80 },
      { x: BOARD.x, y: BOARD.y, duration: 80 },
    ] });
  }

  private draw(snapshot: SimSnapshot, time: number): void {
    this.boardClip.setPosition(this.board.x, this.board.y);
    this.border.setPosition(this.board.x, this.board.y);
    const cell = cellPx(this.balance), p = this.palette;
    for (const layer of Object.values(this.layers)) layer.clear();
    drawTerrains(this.layers.terrain, snapshot.terrains, cell, p, this.balance, this.reduced);
    drawHazards(this.layers.hazards, snapshot.hazards, cell, p, this.balance, this.reduced);
    drawMango(this.layers.mango, snapshot, cell, p, time, this.reduced, this.mangoBornAt);
    drawSnake(this.layers.snake, snapshot, cell, p, this.effects.gulp);
    this.effects.draw(this.layers.effects, p);
  }
}
