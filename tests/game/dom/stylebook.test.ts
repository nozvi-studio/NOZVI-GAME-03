import { describe, expect, it } from 'vitest';
import html from '../../../docs/design/mockups/d4/stylebook.html?raw';

describe('D4-P1-R7 interactive visual stylebook', () => {

  it('D4-P1-R7 links tokens.css and components.css directly', () => {
    expect(html).toContain('href="../../../../src/game/dom/styles/tokens.css"');
    expect(html).toContain('href="../../../../src/game/dom/styles/components.css"');
  });

  it('D4-P1-R7 contains no hex colour literals', () => {
    const stripped = html
      .replace(/<link[^>]*>/gi, '')
      .replace(/url\([^)]*\)/gi, 'url()');
    expect(stripped).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('D4-P1-R7 has palette, typography, components, icons and two phone mockups', () => {
    for (const qa of ['sb-palette', 'sb-type', 'sb-components', 'sb-icons', 'sb-mock-640', 'sb-mock-780', 'mk-characters', 'mk-home']) {
      expect(html, qa).toContain(`data-qa="${qa}"`);
    }
  });

  it('D4-P1-R7 every button, toggle and link has data-qa', () => {
    const tags = html.match(/<(?:button|a)\b[^>]*>/gi) ?? [];
    expect(tags.length).toBeGreaterThan(10);
    for (const tag of tags) {
      expect(tag, tag).toMatch(/data-qa="[^"]+"/);
    }
    const switches = html.match(/<[^>]*role="switch"[^>]*>/gi) ?? [];
    expect(switches.length).toBeGreaterThanOrEqual(2);
    for (const sw of switches) {
      expect(sw, sw).toMatch(/data-qa="[^"]+"/);
    }
  });
});
