// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, icon } from '../../../src/game/dom/icons';

describe('D4-P1-R5 inline SVG icon kit', () => {
  it('D4-P1-R5 exposes exactly the 22 spec icons', () => {
    expect(ICON_NAMES).toEqual([
      'back', 'settings', 'characters', 'coin', 'lock', 'check', 'star', 'trophy',
      'flag', 'bolt', 'play', 'pause', 'home', 'sound', 'haptics', 'dpad',
      'motion', 'mango', 'clock', 'scissors', 'shield', 'rain',
    ]);
  });

  it('D4-P1-R5 every icon parses as a single valid SVG with no raw hex or scripts', () => {
    const host = document.createElement('div');
    for (const name of ICON_NAMES) {
      const markup = icon(name);
      expect(markup, name).not.toMatch(/<script/i);
      expect(markup, name).not.toMatch(/\son\w+=/i);
      expect(markup, name).not.toMatch(/#[0-9a-f]{3,8}/i);
      host.innerHTML = markup;
      expect(host.children.length, name).toBe(1);
      const svg = host.firstElementChild as SVGElement;
      expect(svg.tagName.toLowerCase(), name).toBe('svg');
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24');
      expect(svg.querySelectorAll('path,circle,rect,polyline,line,polygon').length, name).toBeGreaterThanOrEqual(1);
    }
  });

  it('D4-P1-R5 decorative icons are aria-hidden; labelled icons have role img and title', () => {
    const host = document.createElement('div');
    host.innerHTML = icon('back');
    const dec = host.firstElementChild as SVGElement;
    expect(dec.getAttribute('aria-hidden')).toBe('true');
    expect(dec.getAttribute('role')).toBeNull();

    host.innerHTML = icon('settings', { label: 'Open settings' });
    const img = host.firstElementChild as SVGElement;
    expect(img.getAttribute('aria-hidden')).toBeNull();
    expect(img.getAttribute('role')).toBe('img');
    expect(img.querySelector('title')?.textContent).toBe('Open settings');
  });

  it('D4-P1-R5 size option sets width and height', () => {
    const host = document.createElement('div');
    host.innerHTML = icon('coin', { size: 18 });
    const svg = host.firstElementChild as SVGElement;
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
  });
});
