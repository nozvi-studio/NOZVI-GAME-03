import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { reduceMotion } from '../render/palette';
import { TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';
import { drawCard, hudLabel } from './draw';
import { hudIconKey, type IconTone } from './hudIcons';
import type { HudLayout } from './hudLayout';
import type { HudView, SkillView } from './hudModel';

// Mockup px of the skill button drawing (GameD2 / SkillActiveD2).
const M = { icon: 38, boltIcon: 12, costFont: 14, pressed: 4, shelfUp: 3, shelfDown: 7, glow: 7, ring: 46, ringW: 6, chipPadL: 8, chipPadR: 10, chipGap: 4 } as const;

interface Slot { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image; cost: Phaser.GameObjects.Text; costG: Phaser.GameObjects.Graphics; bolt: Phaser.GameObjects.Image; key: string }

// P3b2-R15 GameD2 / SkillActiveD2 skill buttons: off (greyed), ready (glow ring), active (pressed, countdown ring); cost chip under each.
export class SkillButtons {
  private readonly slots: Slot[] = [];
  constructor(private readonly scene: Phaser.Scene, private readonly l: HudLayout, onUse: (slot: 0 | 1) => void, private readonly b: Balance) {
    for (const slot of [0, 1] as const) {
      const r = l.skills[slot];
      const g = scene.add.graphics().setName(`skill-${slot}-face`), icon = scene.add.image(0, 0, hudIconKey('slowmo')).setDisplaySize(ui(M.icon), ui(M.icon));
      const c = scene.add.container(r.cx, r.cy, [g, icon]).setName(`skill-${slot}`).setSize(2 * r.r, 2 * r.r).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: unknown, _x: number, _y: number, e?: Phaser.Types.Input.EventData) => { e?.stopPropagation(); onUse(slot); }); // MEC-007-R14 reacts on pointer down
      const costG = scene.add.graphics(), bolt = scene.add.image(0, 0, hudIconKey('bolt')).setDisplaySize(ui(M.boltIcon), ui(M.boltIcon));
      const cost = hudLabel(scene, 0, 0, '', M.costFont, TOKENS.text.primary, 800, `skill-${slot}-cost`).setOrigin(0, 0.5);
      this.slots.push({ c, g, icon, cost, costG, bolt, key: '' });
    }
  }
  apply(skills: HudView['skills']): void {
    for (const slot of [0, 1] as const) this.draw(slot, skills[slot]);
  }
  private draw(slot: 0 | 1, k: SkillView | null): void {
    const s = this.slots[slot]!, r = this.l.skills[slot];
    for (const o of [s.c, s.costG, s.cost, s.bolt]) o.setVisible(k !== null);
    if (!k) { s.key = ''; return; }
    s.cost.setText(String(k.cost));
    const key = `${k.id}|${k.state}|${k.ring === null ? 'n' : k.ring.toFixed(2)}|${k.cost}`;
    if (key === s.key) return;
    s.key = key;
    const used = k.state === 'active', pressed = used ? ui(M.pressed) : 0, shelf = ui(used ? M.shelfUp : M.shelfDown);
    const face = k.state === 'off' ? TOKENS.hud.skillOffFace : used && k.ring === null ? TOKENS.hud.skillUsedFace : TOKENS.surface.card;
    const tone: IconTone = k.state === 'off' ? 'off' : used && k.ring !== null ? 'active' : 'ink';
    s.icon.setTexture(hudIconKey(k.id, tone)).setPosition(0, pressed);
    const g = s.g.clear();
    g.fillStyle(toInt(TOKENS.hud.shelf), TOKENS.hud.shelfAlpha).fillCircle(0, pressed + shelf, r.r);
    if (k.state === 'ready') g.lineStyle(ui(M.glow), toInt(TOKENS.hud.glow), TOKENS.hud.glowAlpha).strokeCircle(0, 0, r.r + ui(M.glow) / 2);
    g.fillStyle(toInt(face)).fillCircle(0, pressed, r.r);
    if (used && k.ring !== null) {
      const rr = ui(M.ring), end = -Math.PI / 2 + Math.PI * 2 * k.ring;
      g.lineStyle(ui(M.ringW), toInt(TOKENS.hud.ringTrack), TOKENS.hud.ringTrackAlpha).strokeCircle(0, 0, rr);
      g.lineStyle(ui(M.ringW), toInt(TOKENS.hud.ring)).beginPath().arc(0, 0, rr, -Math.PI / 2, end, false).strokePath();
    }
    // cost chip: bolt + number, centred under the button
    const pad = ui(M.chipPadL), bw = ui(M.boltIcon), gap = ui(M.chipGap);
    const cw = pad + bw + gap + s.cost.width + ui(M.chipPadR), cx = r.cx - cw / 2;
    s.costG.clear(); drawCard(s.costG, cx, r.costY, cw, r.costH, r.costH / 2, TOKENS.surface.card, { shadowAlpha: 0 });
    s.bolt.setPosition(cx + pad + bw / 2, r.costY + r.costH / 2); s.cost.setPosition(cx + pad + bw + gap, r.costY + r.costH / 2);
  }
  /** P3a juice adapter: centre of a skill button (JuiceHud.skillPoint). */
  point(slot: 0 | 1): { x: number; y: number } { const r = this.l.skills[slot]; return { x: r.cx, y: r.cy }; }
  /** MEC-006 §8 / GDD §10.4 "nope" shake on a rejected cast; skipped under reduced motion. */
  shake(slot: 0 | 1): void {
    if (reduceMotion()) return;
    const c = this.slots[slot]!.c, x = this.l.skills[slot].cx, y = this.l.skills[slot].cy, amp = this.b.ui.hud.rejectShakeAmpPx;
    this.scene.tweens.killTweensOf(c); c.setPosition(x, y);
    this.scene.tweens.add({ targets: c, x: x + amp, duration: this.b.ui.hud.rejectShakeMs / 4, yoyo: true, repeat: 1, onComplete: () => c.setPosition(x, y) });
  }
}
