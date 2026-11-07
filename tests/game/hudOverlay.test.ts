import { expect, it } from 'vitest';
import { countdownCard, pauseLayout, pauseView } from '../../src/game/hud/overlayModel';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const ctx = { level: 7, biome: 2, hint: { key: 'hud.nextCheckpoint', level: 10 }, settingsAvailable: true };

it('P3b2-R12 PauseD2: Resume / Settings / Quit run, level + biome subtitle, checkpoint chip, no marbles line (P4)', () => {
  const v = pauseView(ctx, t);
  expect(v).toEqual({ title: 'Paused', subtitle: 'Level 7 · Rice Paddy', chip: 'Next checkpoint at L10',
    buttons: [{ id: 'resume', label: 'Resume' }, { id: 'settings', label: 'Settings' }, { id: 'quit', label: 'Quit run' }] });
  expect(JSON.stringify(v)).not.toMatch(/marble/i);
});
it('P3b2-R12 Settings is hidden until the scene exists; chip hidden without a hint', () => {
  const v = pauseView({ ...ctx, settingsAvailable: false, hint: null }, t);
  expect(v.buttons.map(x => x.id)).toEqual(['resume', 'quit']); expect(v.chip).toBeNull();
});
it('P3b2-R12 pause dialog layout matches PauseD2 heights (mockup px) and stays on screen', () => {
  const full = pauseLayout(pauseView(ctx, t));
  expect(full.w).toBe(310); expect(full.height).toBeCloseTo(366.4, 5);
  expect(full.buttons.map(x => x.h)).toEqual([66, 52, 52]);
  const slim = pauseLayout(pauseView({ ...ctx, settingsAvailable: false, hint: null }, t));
  expect(slim.chip).toBeNull(); expect(slim.height).toBeLessThan(full.height);
  expect(full.buttons[1]!.y).toBeGreaterThan(full.buttons[0]!.y + 66);
});
it('P3b2-R13 CountdownD2 checkpoint card only on a fresh start from a checkpoint with the ramp active', () => {
  expect(countdownCard({ rampActive: true, startLevel: 6 }, true, b, t)).toEqual({ title: 'Starting at L6', subtitle: 'Speed ramps up over 5 mangoes' });
  expect(countdownCard({ rampActive: true, startLevel: 6 }, false, b, t)).toBeNull();   // resume countdown
  expect(countdownCard({ rampActive: true, startLevel: 1 }, true, b, t)).toBeNull();    // L1 start
  expect(countdownCard({ rampActive: false, startLevel: 6 }, true, b, t)).toBeNull();
});
