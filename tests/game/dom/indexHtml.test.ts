import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import main from '../../../src/game/main.ts?raw';
import { TOKENS } from '../../../src/game/uiTokens';
import { readRepoText } from './readText';

describe('D4-P1-R1 / R6 / D4-P3-R3 index.html and main.ts wiring', () => {
  it('D4-P1-R1 #ui-root is a direct sibling after #game and page background uses warm --d4-bg', () => {
    const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
    const gameIdx = body.indexOf('<div id="game"></div>');
    const uiIdx = body.indexOf('<div id="ui-root"');
    expect(gameIdx).toBeGreaterThanOrEqual(0);
    expect(uiIdx).toBeGreaterThan(gameIdx);
    expect(html).toContain('background: #FAF9F5');
  });

  it('D4-P1-R6 / D4-P3-R3 main.ts imports D4 CSS, uses TOKENS.d4.bg matching tokens.css, disables Phaser audio, and wires unlock/stageSync/uiHost', async () => {
    const tokensCss = await readRepoText('src/game/dom/styles/tokens.css');
    const bgToken = tokensCss.match(/--d4-bg:\s*(#[0-9a-f]{6})/i)?.[1]?.toUpperCase();
    expect(TOKENS.d4.bg.toUpperCase()).toBe(bgToken);
    expect(main).toContain('backgroundColor: TOKENS.d4.bg');
    expect(main).toContain("import './dom/styles/tokens.css'");
    expect(main).toContain("import './dom/styles/components.css'");
    expect(main).toContain("import './dom/styles/motion.css'");
    expect(main).toContain("import './dom/styles/screens.css'");
    expect(main).toContain("import './dom/styles/overlays.css'");
    expect(main).toContain('noAudio: true');
    expect(main).toContain('installAudioUnlock(');
    expect(main).toContain('startStageSync(');
    expect(main).toContain('createUiHost(');
  });
});
