// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { coinPill, ctaButton, roundIconBtn } from '../../../src/game/dom/screens/screenParts';
import { FakeClock } from './fakeClock';

describe('D4-P3 shared screen parts', () => {
  it('D4-P3 roundIconBtn is a button with data-qa, aria-label and an inline icon svg', () => {
    const onTap = vi.fn();
    const btn = roundIconBtn('back', 'test-back', 'Back', onTap);
    expect(btn.dataset.qa).toBe('test-back');
    expect(btn.getAttribute('aria-label')).toBe('Back');
    expect(btn.querySelector('svg')).not.toBeNull();
    btn.click();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('D4-P3 ctaButton flat tone is aria-disabled but still clickable for denied shake', () => {
    const onTap = vi.fn();
    const btn = ctaButton('test-need', 'Need 300 more', 'flat', onTap, 'lock');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('D4-P3 coinPill set counts up with the injected clock and ends on the value', () => {
    const clock = new FakeClock();
    const pill = coinPill('test-coins', 100);
    pill.set(600, clock);
    clock.advance(400);
    expect(pill.el.querySelector('.d4-num')?.textContent).toBe('600');
    pill.cancel();
  });
});
