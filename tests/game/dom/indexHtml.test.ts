import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import main from '../../../src/game/main.ts?raw';

describe('D4-P1-R1 / R6 index.html and main.ts wiring', () => {

  it('D4-P1-R1 #ui-root is a direct sibling after #game and page background uses warm --d4-bg', () => {
    const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
    const gameIdx = body.indexOf('<div id="game"></div>');
    const uiIdx = body.indexOf('<div id="ui-root"');
    expect(gameIdx).toBeGreaterThanOrEqual(0);
    expect(uiIdx).toBeGreaterThan(gameIdx);
    expect(html).toContain('background: #FAF9F5');
  });

  it('D4-P1-R6 main.ts imports D4 CSS, disables Phaser audio, and wires unlock, stageSync and uiHost', () => {
    expect(main).toContain("import './dom/styles/tokens.css'");
    expect(main).toContain("import './dom/styles/components.css'");
    expect(main).toContain("import './dom/styles/motion.css'");
    expect(main).toContain('noAudio: true');
    expect(main).toContain('installAudioUnlock(');
    expect(main).toContain('startStageSync(');
    expect(main).toContain('createUiHost(');
  });
});
