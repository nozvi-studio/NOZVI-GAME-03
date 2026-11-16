import { expect, it } from 'vitest';
import { MENU } from '../../src/game/ui/menuMetrics';
import { TOKENS } from '../../src/game/uiTokens';

// Vite raw import: no @types/node needed.
const src = (Object.values(import.meta.glob('../../src/game/scenes/ResultsScene.ts', { query: '?raw', import: 'default', eager: true }))[0] as string);
it('D3-R1 ResultsScene has no hex colour literal and no D2 token', () => {
  expect(src).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
  expect(src).not.toMatch(/TOKENS\.(accent|surface|green|sky)\./);
});
it('D3-R1 ResultsScene has no local numeric constants (metrics live in MENU.results)', () => {
  expect(src).not.toMatch(/^const [A-Z_]+ = \d+/m);
});
it('D3-R1 results metrics and colours exist', () => {
  expect(MENU.results.nextChipClearW).toBe(84);
  expect(TOKENS.d3.results.nextIcon).toBe('#F5A400');
  expect(TOKENS.d3.results.energyIcon).toBe(TOKENS.d3.tone.energy.face[1]);
});
