// tests/qa/task7-run-flow.qa.test.ts — independent black-box QA tests for Task 7 run flow
import { describe, expect, it } from 'vitest';
import {
  createFlow,
  flowKey,
  flowOver,
  flowPause,
  flowResume,
  flowStart,
  flowTick,
  flowTogglePause,
  flowTurn,
} from '../../src/game/flow/runFlow';
import { loadBalance } from '../support/balance';

const b = loadBalance();

describe('QA Task 7: Run Flow State Machine (Black-Box)', () => {
  it('QA-T7-11 P0-Design §7.1 createFlow initializes state in ready with zeroed countdown', () => {
    const f = createFlow();
    expect(f.status).toBe('ready');
    expect(f.countLeftMs).toBe(0);
    expect(f.lastCount).toBe(0);
  });

  it('QA-T7-12 P0-Design §7.1 flowStart from ready starts countdown and emits newRun + hideOverlay', () => {
    const f = createFlow();
    const effects = flowStart(f, b);
    expect(effects).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
    expect(f.countLeftMs).toBe(b.flow.countdownMs);
    expect(f.lastCount).toBe(0);
  });

  it('QA-T7-13 P0-Design §7.1 flowStart from over starts countdown and emits newRun + hideOverlay', () => {
    const f = createFlow();
    flowOver(f);
    expect(f.status).toBe('over');
    const effects = flowStart(f, b);
    expect(effects).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
    expect(f.countLeftMs).toBe(b.flow.countdownMs);
  });

  it('QA-T7-14 P0-Design §7.1 flowPause transitions playing to paused and emits showPaused', () => {
    const f = createFlow();
    flowStart(f, b);
    flowTick(f, b, b.flow.countdownMs); // finish countdown
    expect(f.status).toBe('playing');

    const fx = flowPause(f);
    expect(fx).toEqual([{ type: 'showPaused' }]);
    expect(f.status).toBe('paused');
  });

  it('QA-T7-15 P0-Design §7.1 flowPause transitions countdown to paused and emits showPaused', () => {
    const f = createFlow();
    flowStart(f, b);
    expect(f.status).toBe('countdown');

    const fx = flowPause(f);
    expect(fx).toEqual([{ type: 'showPaused' }]);
    expect(f.status).toBe('paused');
  });

  it('QA-T7-16 P0-Design §7.1 flowPause is ignored in ready, over, and paused states', () => {
    const fReady = createFlow();
    expect(flowPause(fReady)).toEqual([]);
    expect(fReady.status).toBe('ready');

    const fOver = createFlow();
    flowOver(fOver);
    expect(flowPause(fOver)).toEqual([]);
    expect(fOver.status).toBe('over');

    const fPaused = createFlow();
    flowStart(fPaused, b);
    flowPause(fPaused);
    expect(flowPause(fPaused)).toEqual([]);
    expect(fPaused.status).toBe('paused');
  });

  it('QA-T7-17 P0-Design §7.1 flowResume from paused initiates fresh countdown and emits hideOverlay', () => {
    const f = createFlow();
    flowStart(f, b);
    flowTick(f, b, 500); // 1000 ms left
    flowPause(f);

    const fx = flowResume(f, b);
    expect(fx).toEqual([{ type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
    // Fresh countdown per §7.1: "resume runs a new countdown"
    expect(f.countLeftMs).toBe(b.flow.countdownMs);
    expect(f.lastCount).toBe(0);
  });

  it('QA-T7-18 P0-Design §7.1 flowResume is ignored outside paused status', () => {
    const f = createFlow();
    expect(flowResume(f, b)).toEqual([]);
    expect(f.status).toBe('ready');

    flowStart(f, b);
    expect(flowResume(f, b)).toEqual([]);
    expect(f.status).toBe('countdown');
  });

  it('QA-T7-19 P0-Design §7.1 flowTogglePause toggles between active and paused', () => {
    const f = createFlow();
    flowStart(f, b);
    flowTick(f, b, b.flow.countdownMs);
    expect(f.status).toBe('playing');

    const pauseFx = flowTogglePause(f, b);
    expect(pauseFx).toEqual([{ type: 'showPaused' }]);
    expect(f.status).toBe('paused');

    const resumeFx = flowTogglePause(f, b);
    expect(resumeFx).toEqual([{ type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
  });

  it('QA-T7-20 P0-Design §7.1 flowKey routes Space, KeyP, Escape per state rules', () => {
    const f = createFlow();
    // In ready: KeyP and Escape do nothing; Space starts run
    expect(flowKey(f, b, 'KeyP')).toEqual([]);
    expect(flowKey(f, b, 'Escape')).toEqual([]);
    expect(f.status).toBe('ready');

    const startFx = flowKey(f, b, 'Space');
    expect(startFx).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');

    // In countdown: KeyP pauses
    expect(flowKey(f, b, 'KeyP')).toEqual([{ type: 'showPaused' }]);
    expect(f.status).toBe('paused');

    // In paused: Escape resumes
    expect(flowKey(f, b, 'Escape')).toEqual([{ type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');

    // Finish countdown to playing
    flowTick(f, b, b.flow.countdownMs);
    expect(f.status).toBe('playing');

    // In playing: Space pauses
    expect(flowKey(f, b, 'Space')).toEqual([{ type: 'showPaused' }]);
    expect(f.status).toBe('paused');

    // In paused: Space resumes
    expect(flowKey(f, b, 'Space')).toEqual([{ type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
  });

  it('QA-T7-21 P0-Design §7.1 flowKey in over state: only Space starts new run', () => {
    const f = createFlow();
    flowOver(f);
    expect(flowKey(f, b, 'KeyP')).toEqual([]);
    expect(flowKey(f, b, 'Escape')).toEqual([]);
    expect(f.status).toBe('over');

    const startFx = flowKey(f, b, 'Space');
    expect(startFx).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f.status).toBe('countdown');
  });

  // updated for P1 runFlow: a turn in ready/over no longer starts a run; runs start only from Home/Loadout/Results
  it('QA-T7-22 P0-Design §7.1 flowTurn forwards only in playing/countdown; drops in ready, over, paused', () => {
    const fReady = createFlow();
    const turnReady = flowTurn(fReady, b);
    expect(turnReady.forward).toBe(false);
    expect(turnReady.effects).toEqual([]);
    expect(fReady.status).toBe('ready');

    flowStart(fReady, b);
    expect(fReady.status).toBe('countdown');

    const turnCountdown = flowTurn(fReady, b);
    expect(turnCountdown.forward).toBe(true);
    expect(turnCountdown.effects).toEqual([]);

    flowTick(fReady, b, b.flow.countdownMs);
    expect(fReady.status).toBe('playing');
    const turnPlaying = flowTurn(fReady, b);
    expect(turnPlaying.forward).toBe(true);
    expect(turnPlaying.effects).toEqual([]);

    flowPause(fReady);
    expect(fReady.status).toBe('paused');
    const turnPaused = flowTurn(fReady, b);
    expect(turnPaused.forward).toBe(false);
    expect(turnPaused.effects).toEqual([]);

    const fOver = createFlow();
    flowOver(fOver);
    const turnOver = flowTurn(fOver, b);
    expect(turnOver.forward).toBe(false);
    expect(turnOver.effects).toEqual([]);
    expect(fOver.status).toBe('over');
  });

  it('QA-T7-23 P0-Design §7.1 flowTick emits 3, 2, 1 then go on completion', () => {
    const f = createFlow();
    flowStart(f, b); // 1500 ms countdown
    expect(f.status).toBe('countdown');

    // First frame tick (16ms elapsed -> 1484 left) -> digit 3
    const fx1 = flowTick(f, b, 16);
    expect(fx1).toEqual([{ type: 'tick', n: 3 }]);

    // Further ticks within same digit bucket do not re-emit
    const fxNoDup = flowTick(f, b, 100);
    expect(fxNoDup).toEqual([]);

    // Cross into digit 2 (>500ms total elapsed)
    const fx2 = flowTick(f, b, 400); // 984 left -> ceil(984/500) = 2
    expect(fx2).toEqual([{ type: 'tick', n: 2 }]);

    // Cross into digit 1
    const fx3 = flowTick(f, b, 500); // 484 left -> ceil(484/500) = 1
    expect(fx3).toEqual([{ type: 'tick', n: 1 }]);

    // Finish countdown
    const fxGo = flowTick(f, b, 484);
    expect(fxGo).toEqual([{ type: 'go' }]);
    expect(f.status).toBe('playing');
  });

  it('QA-T7-24 P0-Design §7.1 flowTick does nothing outside countdown', () => {
    const fReady = createFlow();
    expect(flowTick(fReady, b, 100)).toEqual([]);

    const fPaused = createFlow();
    flowStart(fPaused, b);
    flowPause(fPaused);
    expect(flowTick(fPaused, b, 100)).toEqual([]);

    const fOver = createFlow();
    flowOver(fOver);
    expect(flowTick(fOver, b, 100)).toEqual([]);
  });

  it('QA-T7-25 P0-Design §7.1 large delta in flowTick transitions to playing and emits go', () => {
    const f = createFlow();
    flowStart(f, b);
    const fx = flowTick(f, b, 2000);
    expect(fx.some(e => e.type === 'go')).toBe(true);
    expect(f.status).toBe('playing');
  });
});
