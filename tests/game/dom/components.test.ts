// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { readRepoText } from './readText';

describe('D4-P1-R3 components.css computed rules', () => {
  it('D4-P1-R3 enforces 48px touch targets and pointer-events isolation', async () => {
    const tokensCss = await readRepoText('src/game/dom/styles/tokens.css');
    const componentsCss = await readRepoText('src/game/dom/styles/components.css');
    const style = document.createElement('style');
    style.textContent = `${tokensCss}\n${componentsCss}`;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'ui-root';
    const screen = document.createElement('div');
    screen.setAttribute('data-ui-active', '');
    const btn = document.createElement('button');
    btn.className = 'd4-btn d4-btn--green';
    const iconBtn = document.createElement('button');
    iconBtn.className = 'd4-icon-btn';
    screen.append(btn, iconBtn);
    root.appendChild(screen);
    document.body.appendChild(root);

    expect(getComputedStyle(root).pointerEvents).toBe('none');
    expect(getComputedStyle(screen).pointerEvents).toBe('auto');
    expect(getComputedStyle(btn).minHeight).toBe('48px');
    expect(getComputedStyle(iconBtn).width).toBe('48px');
    expect(getComputedStyle(iconBtn).height).toBe('48px');
  });
});
