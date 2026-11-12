import { expect, it } from 'vitest';
import { PAUSE_MOCK, countdownCard, pauseLayout, pauseView } from '../../src/game/hud/overlayModel';
import { HEIGHT, WIDTH } from '../../src/game/layout';
import { t } from '../../src/game/text';
import { d3 } from '../../src/game/ui/layout';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const ctx = { level: 7, biome: 2, hint: { key: 'hud.nextCheckpoint', level: 10 }, settingsAvailable: true };

it('P3b2-R12 PauseD2: Resume / Settings / Quit run, level + biome subtitle, checkpoint chip, no marbles line (P4)', () => {
  const v = pauseView(ctx, t);
  expect(v).toEqual({ title: 'Paused', subtitle: 'Level 7 · Rice Paddy', chip: 'Next checkpoint at L10',
    buttons: [{ id: 'resume', label: 'Resume', tone: 'green' }, { id: 'settings', label: 'Settings', tone: 'cream' }, { id: 'quit', label: 'Quit run', tone: 'danger' }] });
  expect(JSON.stringify(v)).not.toMatch(/marble/i);
});
it('P3b2-R12 Settings is hidden until the scene exists; chip hidden without a hint', () => {
  const v = pauseView({ ...ctx, settingsAvailable: false, hint: null }, t);
  expect(v.buttons.map(x => x.id)).toEqual(['resume', 'quit']); expect(v.chip).toBeNull();
});
it('P3b2-R12 pause dialog layout matches PauseD2 heights (mockup px) and stays on screen', () => {
  const full = pauseLayout(pauseView(ctx, t));
  expect(full.w).toBe(300); expect(full.height).toBeLessThanOrEqual(408);
  expect(full.buttons.map(x => x.h)).toEqual([66, 52, 52]);
  expect(d3(full.height)).toBeLessThanOrEqual(HEIGHT); expect(d3(full.w)).toBeLessThanOrEqual(WIDTH); // fits the 540x960 screen
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
it('UIFIX-R14 Quit run is the only pause button with the danger tone', () => {
  const v = pauseView({ level: 5, biome: 1, hint: null, settingsAvailable: true }, t);
  expect(v.buttons.map(b => [b.id, b.tone])).toEqual([['resume', 'green'], ['settings', 'cream'], ['quit', 'danger']]);
});
it('D3-R15 pause panel matches the board: 300 wide, title 40, chip then buttons', () => {
  const l = pauseLayout(pauseView({ level: 3, biome: 1, hint: { key: 'hud.nextCheckpoint', level: 10 }, settingsAvailable: true }, t));
  expect(l.w).toBe(300); expect(PAUSE_MOCK.titleSize).toBe(40);
  expect(l.chip).not.toBeNull();
  expect(l.buttons.map(b => b.id)).toEqual(['resume', 'settings', 'quit']);
  expect(l.buttons[0]!.y).toBeGreaterThan(l.chip!);
  expect(l.height).toBeLessThanOrEqual(408);
});
