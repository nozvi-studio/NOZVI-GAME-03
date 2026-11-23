import { describe, expect, it } from 'vitest';
import { readRepoText } from './readText';

function parseVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

describe('D4-P1-R2 / R4 tokens.css', async () => {
  const tokensCss = await readRepoText('src/game/dom/styles/tokens.css');
  const vars = parseVars(tokensCss);

  it('D4-P1-R2 tokens define the warm 60-30-10 palette', () => {
    const expected: Record<string, string> = {
      '--d4-bg': '#FAF9F5',
      '--d4-surface': '#F2EFE9',
      '--d4-card': '#FFFFFF',
      '--d4-border': '#E5E2DC',
      '--d4-border-strong': '#D2CEC6',
      '--d4-ink': '#3C3C3C',
      '--d4-ink-muted': '#777777',
      '--d4-disabled-bg': '#E5E2DC',
      '--d4-disabled-ink': '#AFAFAF',
      '--d4-green-face': '#58CC02',
      '--d4-green-lip': '#46A302',
      '--d4-green-tint': '#D7FFB8',
      '--d4-gold-face': '#FFC800',
      '--d4-gold-lip': '#E5A400',
      '--d4-gold-tint': '#FFF5CC',
      '--d4-gold-ink': '#6B4400',
      '--d4-sky-face': '#1CB0F6',
      '--d4-sky-lip': '#1899D6',
      '--d4-sky-tint': '#DDF4FF',
      '--d4-purple-face': '#CE82FF',
      '--d4-purple-lip': '#A568CC',
      '--d4-purple-tint': '#F3E5FF',
      '--d4-red-face': '#FF4B4B',
      '--d4-red-lip': '#EA2B2B',
      '--d4-red-tint': '#FFDFE0',
    };
    for (const [k, v] of Object.entries(expected)) {
      expect(vars[k]?.toUpperCase(), k).toBe(v.toUpperCase());
    }
  });

  it('D4-P1-R4 tokens define the 8pt spacing scale and both font stacks', () => {
    expect(vars['--sp-1']).toBe('4px');
    expect(vars['--sp-2']).toBe('8px');
    expect(vars['--sp-3']).toBe('12px');
    expect(vars['--sp-4']).toBe('16px');
    expect(vars['--sp-6']).toBe('24px');
    expect(vars['--sp-8']).toBe('32px');
    expect(vars['--font-display']).toMatch(/^'Lilita One'/);
    expect(vars['--font-ui']).toMatch(/^Nunito/);
    expect(vars['--hit-min']).toBe('48px');
  });

  it('D4-P1-R2 no hex value is defined twice under different accent names', () => {
    const seen = new Map<string, string>();
    for (const [k, v] of Object.entries(vars)) {
      if (!/^#[0-9a-f]{6}$/i.test(v)) continue;
      const hex = v.toUpperCase();
      const prev = seen.get(hex);
      if (prev) {
        const pair = [prev, k].sort().join(',');
        expect(pair).toBe('--d4-border,--d4-disabled-bg');
      } else {
        seen.set(hex, k);
      }
    }
  });
});

describe('D4-P1-R3 components.css', async () => {
  const raw = await readRepoText('src/game/dom/styles/components.css');
  const stripped = raw.replace(/url\([^)]*\)/gi, 'url()');

  it('D4-P1-R3 exposes every required primitive selector', () => {
    for (const sel of [
      '#ui-root', '.d4-btn', '.d4-btn--disabled', '.d4-btn--cta', '.d4-icon-btn',
      '.d4-chip', '.d4-card', '.d4-card .d4-card', '.d4-bubble', '.d4-toggle',
      '.d4-title', '.d4-num', '.d4-backdrop-pattern', '.reduced-motion',
    ]) {
      expect(raw, sel).toContain(sel);
    }
  });

  it('D4-P1-R3 no gloss gradients or text-stroke', () => {
    expect(stripped).not.toMatch(/linear-gradient|radial-gradient|-webkit-text-stroke|text-stroke/i);
  });

  it('D4-P1-R3 no raw hex outside tokens', () => {
    expect(stripped).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('D4-P1-R3 chip has no drop shadow and disabled button clears box-shadow', () => {
    const chipBlock = raw.match(/\.d4-chip\s*\{[^}]*\}/)?.[0] ?? '';
    expect(chipBlock).not.toContain('box-shadow');
    const disabledBlock = raw.match(/\.d4-btn--disabled,\s*\.d4-btn:disabled\s*\{[^}]*\}/)?.[0] ?? '';
    expect(disabledBlock).toContain('box-shadow: none');
  });
});
