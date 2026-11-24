import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { easeMsFor, skillReadyEdge } from './hudMotion';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3 } from '../ui/layout';
import { drawIcon } from '../ui/icons';
import { denied, tapBurst } from '../ui/touchFx';
import { hudIconKey, skillArtKey, type IconTone } from './hudIcons';
import { badgeRectForSlot, D3_RUN, D4_RUN, type D3HudLayout, type R } from './d3HudLayout';
import { badgeTone, skillLook } from './skillLook';
import type { HudView, SkillState, SkillView } from './hudModel';

const K = D3_RUN.skill;
const cen = (r: R): { x: number; y: number } => ({ x: d3(r.x + r.w / 2), y: d3(r.y + r.h / 2) });

interface Slot {
  c: Phaser.GameObjects.Container;
  vis: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  lock: Phaser.GameObjects.Graphics;
  gauge: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Graphics;
  cost: Phaser.GameObjects.Text;
  key: string;
  down: boolean;
  state: SkillState | null;
  view: SkillView | null;
  chargeTarget: number;
  shownCharge: number;
  charge: { v: number };
  dip: { v: number };
}

// D4-P5-R2 flat round skill buttons, 4px lip, semantic cyan/muted cost badges (zero gloss, zero red badge).
export class SkillButtons {
  private readonly slots: Slot[] = [];
  private readonly motion: Motion;
  private l: D3HudLayout;

  constructor(private readonly scene: Phaser.Scene, l: D3HudLayout, onUse: (slot: 0 | 1) => void, private readonly b: Balance, onDenied?: (slot: 0 | 1) => void) {
    this.l = l;
    this.motion = motionFor(scene);
    const d4run = TOKENS.d4run;
    const dd = d3(K.d);
    for (const slot of [0, 1] as const) {
      const p = cen(l.skills[slot]);
      const body = scene.add.graphics();
      const icon = scene.add.image(0, 0, hudIconKey('slowmo', 'on')).setDisplaySize(d3(K.icon), d3(K.icon));
      const lock = scene.add.graphics().setName(`skill-${slot}-lock`);
      const gauge = scene.add.graphics().setName(`skill-${slot}-face`);
      const badge = scene.add.graphics().setName(`skill-${slot}-badge`);
      const cost = scene.add.text(0, 0, '', {
        fontFamily: FONT_UI,
        fontSize: `${d3(D4_RUN.skill.badgeFont)}px`,
        fontStyle: '900',
        color: d4run.badge.text,
      }).setOrigin(0.5).setName(`skill-${slot}-cost`);
      const vis = scene.add.container(0, 0, [body, icon, lock, gauge, badge, cost]).setName(`skill-${slot}-visual`);
      const c = scene.add.container(p.x, p.y, [vis]).setName(`skill-${slot}`).setSize(dd, dd).setInteractive({ useHandCursor: true });
      const s: Slot = { c, vis, body, icon, lock, gauge, badge, cost, key: '', down: false, state: null, view: null, chargeTarget: -1, shownCharge: 0, charge: { v: 0 }, dip: { v: 1 } };
      c.on('pointerdown', (_p: unknown, _x: number, _y: number, e?: Phaser.Types.Input.EventData) => {
        e?.stopPropagation();
        s.down = true;
        s.key = '';
        this.paint(slot);
        if (skillLook(s.view, slot).locked) { onDenied?.(slot); return; }
        onUse(slot);
      });
      const up = (): void => { if (!s.down) return; s.down = false; s.key = ''; this.paint(slot); };
      c.on('pointerup', up);
      c.on('pointerout', up);
      this.slots.push(s);
    }
  }

  place(l: D3HudLayout): void {
    this.l = l;
    for (const slot of [0, 1] as const) {
      const p = cen(l.skills[slot]);
      this.slots[slot]!.c.setPosition(p.x, p.y);
      this.motion.rebase(this.slots[slot]!.vis);
    }
  }

  apply(skills: HudView['skills']): void {
    for (const slot of [0, 1] as const) this.draw(slot, skills[slot]);
  }

  private draw(slot: 0 | 1, k: SkillView | null): void {
    const s = this.slots[slot]!, cfg = this.b.motion;
    const edge = skillReadyEdge(s.state, k?.state ?? null);
    s.state = k?.state ?? null;
    s.view = k;
    if (!k) { s.key = ''; s.chargeTarget = -1; this.paint(slot); return; }
    if (edge === 'pop') this.motion.release(s.vis);
    else if (edge === 'dip') {
      s.vis.setAlpha(cfg.reducedPressAlpha);
      s.dip.v = cfg.reducedPressAlpha;
      this.motion.ease(s.dip, 1, cfg.readyDipMs, v => { s.vis.setAlpha(v); });
    }
    if (k.charge !== s.chargeTarget) {
      const first = s.chargeTarget < 0, ms = first ? 0 : easeMsFor(s.chargeTarget, k.charge, cfg);
      s.chargeTarget = k.charge;
      this.motion.ease(s.charge, k.charge, ms, v => { s.shownCharge = v; this.paint(slot); });
    }
    this.paint(slot);
  }

  private paint(slot: 0 | 1): void {
    const d4run = TOKENS.d4run;
    const s = this.slots[slot]!, k = s.view, look = skillLook(k, slot), dd = d3(K.d), r = dd / 2, lip = d3(D4_RUN.skill.lip);
    const fill = !k || k.state === 'active' ? 0 : Math.round(Math.min(1, Math.max(0, s.shownCharge)) * K.chargeSteps);
    const pressed = (s.down || k?.state === 'active') && !look.locked;
    const key = `${k ? `${k.id}|${k.state}|${k.ring === null ? 'n' : k.ring.toFixed(2)}|${k.cost}` : 'locked'}|${fill}|${pressed ? 1 : 0}`;
    if (key === s.key) return;
    s.key = key;

    const palette = k && look.tone !== 'off' ? d4run.skill.byId[k.id] : null;
    const faceHex = palette ? palette.face : d4run.skill.off;
    const lipHex = palette ? palette.lip : d4run.skill.offLip;
    const rimHex = palette ? palette.rim : d4run.hud.border;
    const dy = pressed ? lip : 0;

    s.body.clear();
    s.body.fillStyle(toInt(lipHex), 1).fillCircle(0, lip, r);
    s.body.fillStyle(toInt(faceHex), 1).fillCircle(0, dy, r);
    // Subtle top highlight crescent inside the glossy orb (gameplay.png)
    if (!look.locked) {
      s.body.fillStyle(0xffffff, palette ? 0.28 : 0.1).fillEllipse(0, dy - r * 0.42, r * 1.15, r * 0.56);
    }
    s.body.lineStyle(d3(2.5), toInt(rimHex), 1).strokeCircle(0, dy, r);

    const tone: IconTone = look.tone === 'off' ? 'off' : 'on';
    s.icon.setVisible(!look.locked).setY(dy);
    if (k) {
      const artKey = skillArtKey(k.id);
      if (this.scene.textures?.exists?.(artKey)) {
        s.icon.setTexture(artKey).setDisplaySize(d3(K.d * 0.78), d3(K.d * 0.78)).setAlpha(look.tone === 'off' ? 0.52 : 1);
      } else {
        s.icon.setTexture(hudIconKey(k.id, tone)).setDisplaySize(d3(K.icon), d3(K.icon)).setAlpha(1);
      }
    }
    s.lock.clear();
    s.lock.setVisible(look.locked);
    if (look.locked) {
      s.lock.setPosition(0, dy);
      drawIcon(s.lock, 'lock', d3(K.lock), toInt(d4run.skill.offIcon));
    }

    const g = s.gauge.clear();
    if (fill > 0 && fill < K.chargeSteps) {
      const gr = r - d3(K.gaugeInset);
      g.lineStyle(d3(K.gauge), toInt(d4run.energy.fill));
      g.beginPath().arc(0, dy, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill / K.chargeSteps, false).strokePath();
    }
    if (k && k.state === 'active' && k.ring !== null) {
      const rr = r + d3(K.ringOut), end = -Math.PI / 2 + Math.PI * 2 * k.ring;
      g.lineStyle(d3(K.ring), toInt(d4run.hud.surface), K.trackAlpha).strokeCircle(0, dy, rr);
      g.lineStyle(d3(K.ring), toInt(d4run.hud.surface)).beginPath().arc(0, dy, rr, -Math.PI / 2, end, false).strokePath();
    }

    // D4-P5-R2 semantic cost badge: cyan when ready, muted gray when short (never red).
    s.badge.clear();
    s.badge.setVisible(!!k);
    s.cost.setVisible(!!k);
    if (!k) return;

    const bt = badgeTone(look);
    const badgeFill = bt === 'ready' ? d4run.badge.ready : d4run.badge.short;
    s.cost.setText(String(k.cost)).setColor(d4run.badge.text);
    const slotR = this.l.skills[slot];
    const br = badgeRectForSlot(slotR, s.cost.width / d3(1));
    const slotCx = slotR.x + slotR.w / 2, slotCy = slotR.y + slotR.h / 2;
    const bx = d3(br.x + br.w / 2 - slotCx), by = d3(br.y + br.h / 2 - slotCy);
    const bw = d3(br.w), bh = d3(br.h);
    s.badge.fillStyle(toInt(badgeFill), 1).fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    s.badge.lineStyle(d3(D4_RUN.skill.badgeBorder), toInt(d4run.hud.surface), 1).strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    s.cost.setPosition(bx, by);
  }

  point(slot: 0 | 1): { x: number; y: number } { return cen(this.l.skills[slot]); }

  tick(_now: number): void {}

  shake(slot: 0 | 1): void {
    const s = this.slots[slot]!;
    denied(this.scene, s.vis);
  }

  cast(slot: 0 | 1): void {
    const p = this.point(slot);
    tapBurst(this.scene, p.x, p.y, slot === 0 ? 'skillA' : 'skillB');
  }
}
