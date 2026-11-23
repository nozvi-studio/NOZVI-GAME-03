// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('D4-P1 happy-dom harness', () => {
  it('D4-P1-R6 DOM APIs exist in files that opt into happy-dom', () => {
    const el = document.createElement('div');
    el.dataset.qa = 'probe';
    document.body.appendChild(el);
    expect(document.querySelector('[data-qa="probe"]')).toBe(el);
    expect(typeof window.requestAnimationFrame).toBe('function');
  });
});
