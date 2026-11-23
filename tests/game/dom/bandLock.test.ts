// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { setBandColor, setBandLock } from '../../../src/game/viewport';

describe('D4-P1-R1 setBandLock', () => {
  afterEach(() => {
    setBandLock(false);
    document.documentElement.style.background = '';
    document.body.style.background = '';
  });

  it('D4-P1-R1 setBandLock blocks setBandColor while locked', () => {
    setBandLock(true, '#FAF9F5');
    expect(document.body.style.background.toUpperCase()).toBe('#FAF9F5');
    setBandColor('#1F86D8');
    expect(document.body.style.background.toUpperCase()).toBe('#FAF9F5');
    setBandLock(false);
    setBandColor('#1F86D8');
    expect(document.body.style.background.toUpperCase()).toBe('#1F86D8');
  });
});
