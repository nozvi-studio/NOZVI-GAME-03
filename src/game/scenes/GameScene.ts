import Phaser from 'phaser';
import type { Balance, SimEvent, SimSnapshot, Step } from '../../core';
import type { Session } from '../../session';
import { CapyHead } from '../art/capyHead';
import { BOARD, cellPx } from '../layout';
import { clockStep, createClock } from '../flow/clock';
import { createFlow, flowKey, flowOver, flowPause, flowStart, flowTick, flowTurn, type FlowEffect, type FlowState } from '../flow/runFlow';
import { bindKeyboard } from '../input/keyboard';
import { bindSwipe } from '../input/swipe';
import { BOARD_RADIUS, buildBoardTexture, drawBoardBorder } from '../render/board';
import { Effects, PARTICLE_BURSTS } from '../render/effects';
import { drawHazards, drawTerrains } from '../render/hazards';
import { drawMango } from '../render/mango';
import { boardLook, type BoardLook } from '../render/biomePalette';
import { currentPalette, reduceMotion, themeOf, type Palette } from '../render/palette';
import { drawSnake } from '../render/snake';
import { drawSkillObjects, drawSkillOverlay } from '../render/skills';
import { drawTiles, drawIceArrow } from '../render/tiles';
import { drawMovers } from '../render/movers';
import { drawCycles } from '../render/cycles';
import { drawBlasts } from '../render/blasts';
import { drawShrink } from '../render/shrink';

export class GameScene extends Phaser.Scene {
  balance!: Balance;
  flow: FlowState = createFlow();
  session!: Session;
  private clock = createClock();
  private palette!: Palette;
  private reduced = false;
  private look!: BoardLook;
  private lookStale = true;
  private mangoBornAt = 0;
  private board!: Phaser.GameObjects.Container;
  private border!: Phaser.GameObjects.Graphics;
  private boardClip!: Phaser.GameObjects.Graphics;
  private layers!: Record<'ground' | 'terrain' | 'hazards' | 'mango' | 'skills' | 'snake' | 'overlay' | 'effects', Phaser.GameObjects.Graphics>;
  private effects!: Effects;
  private capy!: CapyHead;

  constructor() { super('Game'); }

  // GDD-13 scene owns presentation, frame time and input; core owns all rules.
  create(): void {
    this.balance = this.registry.get('balance') as Balance;
    this.session = this.registry.get('session') as Session;
    this.palette = currentPalette();
    this.reduced = reduceMotion();
    this.cameras.main.setBackgroundColor(this.palette.bg);
    this.look = boardLook(1, themeOf(this.palette));
    const image = this.add.image(0, 0, buildBoardTexture(this, this.balance, this.look)).setOrigin(0);
    this.board = this.add.container(BOARD.x, BOARD.y, [image]).setName('board');
    this.layers = {
      ground: this.add.graphics(), terrain: this.add.graphics(), hazards: this.add.graphics(), mango: this.add.graphics(),
      skills: this.add.graphics(), snake: this.add.graphics(), overlay: this.add.graphics(), effects: this.add.graphics(),
    };
    this.board.add(Object.values(this.layers));
    this.border = this.add.graphics().setName('board-border').setPosition(BOARD.x, BOARD.y);
    drawBoardBorder(this.border, this.palette);
    this.boardClip = this.add.graphics().setName('board-clip').setPosition(BOARD.x, BOARD.y).setVisible(false);
    this.boardClip.fillStyle(0xffffff).fillRoundedRect(0, 0, BOARD.size, BOARD.size, BOARD_RADIUS);
    this.board.setMask(this.boardClip.createGeometryMask());
    this.effects = new Effects(this, this.board, cellPx(this.balance), this.reduced);
    this.capy = new CapyHead(this, this.board, this.layers.snake, this.balance.ui.capy, cellPx(this.balance), this.reduced, this.time.now);
    this.flow = createFlow();
    // P1 scene flow: the session run already exists (Home/Loadout/Results); Game opens on the P0 countdown.
    this.apply(flowStart(this.flow, this.balance));
    const zone = this.add.zone(BOARD.x, BOARD.y, BOARD.size, BOARD.size).setOrigin(0).setInteractive();
    bindKeyboard(this);
    bindSwipe(this, zone);
    const pause = (): void => { this.apply(flowPause(this.flow)); };
    const hidden = (): void => { pause(); this.session.hidden(); }; // MEC-008-R7 provisional carry
    this.game.events.on(Phaser.Core.Events.BLUR, pause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, hidden);
    const theme = window.matchMedia('(prefers-color-scheme: dark)');
    const recolor = (): void => {
      this.palette = currentPalette(); this.reduced = reduceMotion(); this.lookStale = true; // texture rebuilt on the next draw
      drawBoardBorder(this.border.clear(), this.palette);
      this.cameras.main.setBackgroundColor(this.palette.bg);
    };
    theme.addEventListener('change', recolor);
    this.game.events.on('settings-closed', recolor);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, pause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, hidden);
      theme.removeEventListener('change', recolor);
      this.game.events.off('settings-closed', recolor);
      this.effects.reset();
      this.board.clearMask(true);
    });
  }

  // Resets presentation for a new session run (the run itself is started by the menu scenes).
  startRun(): void {
    this.mangoBornAt = this.time.now;
    this.effects.reset();
    this.capy.reset(this.time.now);
    this.clock = createClock();
    this.tweens.killTweensOf(this.board);
    this.board.setPosition(BOARD.x, BOARD.y);
  }

  snapshot(): SimSnapshot | null {
    try { return this.session.snapshot(); } catch { return null; }
  }

  turn(dx: Step, dy: Step): void {
    const result = flowTurn(this.flow, this.balance, dx, dy); // MEC-001-R2
    this.apply(result.effects);
    if (result.forward) this.session.turn(dx, dy);
  }

  // P1: keys only pause/resume; a run never starts from ready/over here.
  flowKey(code: 'Space' | 'KeyP' | 'Escape'): void {
    if (this.flow.status === 'ready' || this.flow.status === 'over') return;
    this.apply(flowKey(this.flow, this.balance, code));
  }

  // GDD-13 HUD, keyboard and turn input all apply the same flow effects.
  apply(effects: FlowEffect[]): void {
    for (const effect of effects) {
      if (effect.type === 'newRun') this.startRun();
      if (effect.type === 'showPaused') this.session.pause(); // MEC-008-R7 provisional carry
      this.events.emit('flow', effect);
    }
  }

  update(time: number, deltaMs: number): void {
    if (!this.snapshot()) return;
    const dt = Math.min(Math.max(0, deltaMs), this.balance.flow.maxFrameDeltaMs);
    let events: SimEvent[] = [];
    if (this.flow.status === 'countdown') this.apply(flowTick(this.flow, this.balance, dt));
    else if (this.flow.status === 'playing') {
      events = this.session.frame(clockStep(this.clock, deltaMs, this.balance.flow.maxFrameDeltaMs));
    }
    const snapshot = this.snapshot()!;
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
          this.capy.eat(this.time.now);
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
          this.capy.die(this.time.now);
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
    if (this.lookStale || snapshot.biome !== this.look.biome) {
      this.look = boardLook(snapshot.biome, themeOf(this.palette)); this.lookStale = false;
      buildBoardTexture(this, this.balance, this.look);
    }
    const cell = cellPx(this.balance), p = this.palette;
    for (const layer of Object.values(this.layers)) layer.clear();
    drawTiles(this.layers.ground, snapshot.tiles, cell, time, this.reduced, this.look);
    drawTerrains(this.layers.terrain, snapshot.terrains, cell, this.look, this.balance, this.reduced);
    drawHazards(this.layers.hazards, snapshot.hazards, cell, this.look, this.balance, this.reduced);
    drawCycles(this.layers.hazards, snapshot, cell, time, this.reduced);
    drawMovers(this.layers.hazards, snapshot, cell, time, this.reduced);
    drawBlasts(this.layers.hazards, snapshot, cell, time, this.reduced);
    drawShrink(this.layers.hazards, snapshot, cell, time, this.reduced);
    drawMango(this.layers.mango, snapshot, cell, p, this.look, time, this.reduced, this.mangoBornAt);
    drawSkillObjects(this.layers.skills, snapshot, cell, p, this.look, this.balance, time);
    drawSnake(this.layers.snake, snapshot, cell, p, this.effects.gulp, false);
    this.capy.update(snapshot, time, cell);
    drawSkillOverlay(this.layers.overlay, snapshot, cell, BOARD.size);
    drawIceArrow(this.layers.overlay, snapshot, cell, this.look);
    this.effects.draw(this.layers.effects, p);
  }
}
