import Phaser from 'phaser';
import type { Balance } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { SKIN_BODY, SKIN_IDS, isSkinId, setActiveSkin } from '../art/skins';
import { headKey } from '../art/capyRig';
import { ensureSkinTextures } from '../art/capyTextures';
import { charactersLayout, D3_CHARS, heroPath, type R } from '../flow/charactersLayout';
import { charactersView, type CharactersView } from '../flow/charactersView';
import { charactersOrder } from '../flow/entranceOrder';
import { WIDTH } from '../layout';
import { enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { reduceMotion } from '../render/palette';
import { t } from '../text';
import { screenBackground } from '../ui/background';
import { drawIcon } from '../ui/icons';
import { d3, d3Height, d3m } from '../ui/layout';
import { roundIconButton, tap } from '../ui/menuWidgets';
import { hostOf, lipPx, ringTexture, skinTexture } from '../ui/skin';
import { denied, tapBurst } from '../ui/touchFx';
import { card, chip, pillButton, titleText, type PillTone } from '../ui/widgets';
import { FONT_TITLE, FONT_UI, TOKENS, toInt, type D3Tone } from '../uiTokens';

const D = TOKENS.d3, C = D3_CHARS;
const RARITY_TONE: Record<string, D3Tone> = { default: 'primary', common: 'light', rare: 'skillA' };
const ACTION_TONE: Record<CharactersView['action']['kind'], PillTone> = { equipped: 'cream', equip: 'green', buy: 'green', need: 'cream' };

// MEC-011-R14..R21 Characters screen (board: skins.html section A): stage with the previewed skin, token shelf, one action button.
export class CharactersScene extends Phaser.Scene {
  private session!: Session; private synth!: Synth; private preview = 'snake'; private debug = false;
  private body?: Phaser.GameObjects.Container; private closing = false; private targets: EntranceTargets = {};
  private idle?: { stop(): void }; private pendingPop = false;
  constructor() { super('Characters'); }
  init(data: { debug?: boolean } | undefined): void { this.debug = data?.debug === true; }

  create(): void {
    this.closing = false; this.body = undefined; this.targets = {}; this.pendingPop = false;
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    this.preview = this.session.skinsModel().equipped; // R15
    screenBackground(this, 0, true);
    const l = charactersLayout(d3Height(), SKIN_IDS.length);
    this.targets.back = roundIconButton(this, d3(l.back.x + l.back.w / 2), d3(l.back.y + l.back.h / 2), d3m(l.back.w), 'back', 'chars-back', () => this.back(), false, { navigates: true });
    this.targets.title = titleText(this, WIDTH / 2, d3(l.title.y + l.title.h / 2), t('characters.title'), C.titleH).setName('chars-title');
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { if (e.code === 'Escape') { e.preventDefault(); this.back(); } };
    keys?.on('keydown', onKey);
    const onSkinsLoaded = (): void => { if (!this.closing && this.body && (this.sys?.isActive() ?? true)) this.build(); };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keys?.off('keydown', onKey);
      this.load?.off?.('complete', onSkinsLoaded);
      this.stopIdle();
      this.body = undefined;
    });
    ensureSkinTextures(this, SKIN_IDS, onSkinsLoaded); // other heads load here, not at boot
    this.build();
    enter(this, charactersOrder, this.targets); // MOT-2-R3/R5
  }

  private stopIdle(): void { this.idle?.stop(); this.idle = undefined; }
  private back(): void {
    if (this.closing) return;
    this.closing = true; this.synth.play('uiTap');
    goTo(this, 'Home', undefined, 'back');
  }
  private select(id: string): void { this.preview = id; this.synth.play('uiTap'); this.build(); } // R15
  private act(): void { // R17
    const v = charactersView(this.session.skinsModel(), this.preview);
    if (v.action.kind === 'buy') { if (this.session.buySkin(v.preview).ok) { setActiveSkin(v.preview); this.celebrate(); } }
    else if (v.action.kind === 'equip') { if (this.session.equipSkin(v.preview)) setActiveSkin(v.preview); }
    else if (v.action.kind === 'need') { this.denied(); return; }
    else return;
    this.build();
  }
  private denied(): void {
    this.synth.play('nope');
    const b = this.targets.action as Phaser.GameObjects.Container | undefined;
    if (b) denied(this, b);
  }
  private celebrate(): void { // R18 pop on the hero plus the tap burst; reduced motion is handled inside motionFor
    this.synth.play('unlock');
    const l = charactersLayout(d3Height(), SKIN_IDS.length);
    tapBurst(this, WIDTH / 2, d3(l.stage.y + l.stage.h / 2), 'primary');
    this.pendingPop = true;
  }

  private build(): void {
    this.stopIdle(); this.body?.destroy(true);
    const v = charactersView(this.session.skinsModel(), this.preview), l = charactersLayout(d3Height(), v.tokens.length);
    const host = hostOf(this), unit = d3(1), blk = (this.body = this.add.container(0, 0)), cx = WIDTH / 2;
    const px = (r: R) => ({ cx: d3(r.x + r.w / 2), cy: d3(r.y + r.h / 2) });
    // Coin chip (right-aligned) with a drawn coin in its lead space.
    const coin = d3(C.token.coin), coins = chip(this, 0, 0, String(v.coins), '', 'chars-coins', { tone: 'mango', lead: d3m(C.token.coin * 2 + 4) });
    coins.setPosition(WIDTH - d3(l.coins.right) - coins.width / 2, d3(l.coins.y + l.coins.h / 2));
    this.drawCoin(coins, -coins.width / 2 + d3(C.token.coin + 8), 0, coin);
    blk.add(coins); this.targets.coins = coins;
    // Stage: podium, hero tube and head.
    const sx = d3(l.stage.x), sy = d3(l.stage.y + l.stage.h - C.stageH + C.hero.dy);
    blk.add(card(this, d3(l.podium.x), d3(l.podium.y), d3m(l.podium.w), d3m(l.podium.h)));
    const hero = this.drawHero(v.preview, sx, sy, cx, d3(l.stage.y + l.stage.h / 2)); blk.add(hero); this.targets.hero = hero;
    // Ribbon with the skin name, rarity chip and perk.
    const r = l.ribbon, rw = d3(r.w), rh = d3(r.h), ry = d3(r.y + r.h / 2);
    const rimg = (state: 'lip' | 'rest', y: number) => this.add.image(0, y, skinTexture(host, 'ribbon', 'ribbon', rw, rh, state, unit));
    const name = titleText(this, 0, 0, v.name, C.text.name).setStroke(D.tone.ribbon.line, d3(5)).setName('chars-name');
    const ribbon = this.add.container(cx, ry, [rimg('lip', lipPx('ribbon', 'ribbon', unit)), rimg('rest', 0), name]); blk.add(ribbon); this.targets.ribbon = ribbon;
    blk.add(chip(this, cx, d3(l.rarity.y + l.rarity.h / 2), t(`rarity.${v.rarity}`), '', 'chars-rarity', { tone: RARITY_TONE[v.rarity] ?? 'light' }));
    blk.add(this.add.text(cx, d3(l.perk.y + l.perk.h / 2), v.perk, { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(C.text.perk)}px`, color: D.white,
      stroke: D.inkDeep, strokeThickness: d3(3), align: 'center', wordWrap: { width: d3(l.perk.w) } }).setOrigin(0.5).setName('chars-perk'));
    // Shelf of tokens.
    const shelf = this.add.container(0, 0); blk.add(shelf); this.targets.shelf = shelf;
    shelf.add(card(this, d3(l.shelf.x), d3(l.shelf.y), d3m(l.shelf.w), d3m(l.shelf.h)));
    const owned = v.tokens.filter(k => k.state !== 'locked').length;
    shelf.add(this.add.text(cx, d3(l.shelfLabel.y + l.shelfLabel.h / 2), t('characters.shelf', { n: owned, total: v.tokens.length }),
      { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(C.text.shelf)}px`, color: D.text }).setOrigin(0.5));
    v.tokens.forEach((k, i) => this.token(shelf, k, l.tokens[i]!, l.tokenLabelDy));
    this.soonToken(shelf, l.soon, l.tokenLabelDy);
    // Action button.
    const a = v.action, label = a.kind === 'equipped' ? t('characters.equipped') : a.kind === 'equip' ? t('characters.equip')
      : a.kind === 'buy' ? t('characters.buy', { n: a.price }) : t('characters.need', { n: a.missing });
    const btn = pillButton(this, px(l.action).cx, px(l.action).cy, d3m(l.action.w), d3m(l.action.h), label, 'chars-action', () => this.act(), ACTION_TONE[a.kind]);
    blk.add(btn.c); this.targets.action = btn.c;
    if (this.debug) { // R10
      const grant = (this.registry.get('balance') as Balance).skins.debugGrant;
      const dbg = pillButton(this, px(l.debugCoins).cx, px(l.debugCoins).cy, d3m(l.debugCoins.w), d3m(l.debugCoins.h), t('characters.debugCoins', { n: grant }), 'chars-debug-coins',
        () => { this.session.debugAddCoins(); this.build(); }, 'orange');
      blk.add(dbg.c);
    }
    if (this.pendingPop) { this.pendingPop = false; motionFor(this).popIn(hero, 0); }
  }

  private drawCoin(parent: Phaser.GameObjects.Container, x: number, y: number, r: number): void {
    const g = this.add.graphics().setPosition(x, y), m = D.tone.mango;
    g.fillStyle(toInt(m.line)).fillCircle(0, 0, r).fillStyle(toInt(m.face[1])).fillCircle(0, 0, r * 0.78);
    parent.add(g);
  }

  // R14 tube along the board path in the skin colours, the large head over its end, idle bob (R19). Centred at (ox, oy) so popIn scales from the hero centre.
  private drawHero(skin: string, sx: number, sy: number, ox: number, oy: number): Phaser.GameObjects.Container {
    const H = C.hero, c = this.add.container(ox, oy), g = this.add.graphics(), k = d3(1), id = isSkinId(skin) ? skin : 'snake', pal = SKIN_BODY[id], sh = H.shadow;
    const dx = sx - ox, dy = sy - oy;
    g.fillStyle(toInt(D.inkDeep), sh.alpha).fillEllipse(dx + sh.x * k, dy + sh.y * k, 2 * sh.rx * k, 2 * sh.ry * k);
    const pts = heroPath();
    for (const [col, w] of [[pal?.outline ?? D.outline.snake, H.outlineW], [pal?.body ?? D.snake.body, H.bodyW]] as const) {
      g.fillStyle(toInt(col)); for (const p of pts) g.fillCircle(dx + p.x * k, dy + p.y * k, w * k / 2);
    }
    c.add(g);
    const key = headKey(id, 'idle', 'large');
    if (this.textures.exists(key)) {
      const head = this.add.image(dx + H.head.x * k, dy + H.head.y * k, key).setDisplaySize(H.head.w * k, H.head.w * k).setName('chars-hero');
      c.add(head);
      if (!reduceMotion()) {
        const tw = this.tweens.add({ targets: head, y: head.y - H.bob * k, angle: H.tilt, duration: H.idleMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.idle = { stop: () => { tw.stop(); } };
      }
    }
    return c;
  }

  private token(parent: Phaser.GameObjects.Container, k: CharactersView['tokens'][number], r: R, labelDy: number): void {
    const host = hostOf(this), unit = d3(1), s = d3(r.w), cx = d3(r.x + r.w / 2), lip = lipPx('round', 'light', unit);
    const lift = k.selected ? d3(C.token.lift) : 0, cy = d3(r.y + r.h / 2) - lift;
    if (k.selected) parent.add(this.add.image(cx, cy + lip / 2, ringTexture(host, s, s, s / 2, lip, unit)));
    parent.add(this.add.image(cx, cy + lip, skinTexture(host, 'round', 'light', s, s, 'lip', unit)));
    parent.add(this.add.image(cx, cy, skinTexture(host, 'round', 'light', s, s, 'rest', unit)));
    const hk = isSkinId(k.id) ? headKey(k.id, 'idle', 'board') : '';
    if (hk && this.textures.exists(hk)) parent.add(this.add.image(cx, cy, hk).setDisplaySize(d3(C.token.head), d3(C.token.head)));
    if (k.state !== 'owned') { // check badge (equipped) or lock badge (locked), top right
      const bx = cx + d3(C.token.badgeDx + C.token.badge / 2), by = cy + d3(C.token.badgeDy), bs = d3(C.token.badge);
      const tone = k.state === 'equipped' ? D.tone.primary : D.tone.off, b = this.add.graphics().setPosition(bx, by);
      b.fillStyle(toInt(tone.line)).fillCircle(0, 0, bs / 2).fillStyle(toInt(tone.face[1])).fillCircle(0, 0, bs / 2 - d3(1.5)); parent.add(b);
      const ic = this.add.graphics().setPosition(bx, by);
      drawIcon(ic, k.state === 'equipped' ? 'check' : 'lock', bs * 0.6, toInt(k.state === 'equipped' ? D.white : D.tone.off.text)); parent.add(ic);
    }
    const ly = d3(r.y + labelDy) - lift, style = { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(C.token.label)}px`, color: D.text };
    if (k.state === 'locked') {
      this.drawCoin(parent, cx - d3(C.token.coin * 2.2), ly, d3(C.token.coin));
      parent.add(this.add.text(cx + d3(C.token.coin), ly, String(k.price), style).setOrigin(0.5));
    } else parent.add(this.add.text(cx, ly, t(k.state === 'equipped' ? 'characters.equipped' : 'characters.owned'), style).setOrigin(0.5));
    const hit = Math.max(s, d3(48));
    parent.add(tap(this, cx, d3(r.y + r.h / 2), hit, hit, `chars-token-${k.id}`, () => this.select(k.id)));
  }

  private soonToken(parent: Phaser.GameObjects.Container, r: R, labelDy: number): void {
    const host = hostOf(this), unit = d3(1), s = d3(r.w), cx = d3(r.x + r.w / 2), cy = d3(r.y + r.h / 2);
    parent.add(this.add.image(cx, cy + lipPx('round', 'off', unit), skinTexture(host, 'round', 'off', s, s, 'lip', unit)));
    parent.add(this.add.image(cx, cy, skinTexture(host, 'round', 'off', s, s, 'rest', unit)));
    parent.add(this.add.text(cx, cy, '?', { fontFamily: FONT_TITLE, fontSize: `${d3(C.token.head * 0.6)}px`, color: D.tone.off.text }).setOrigin(0.5));
    parent.add(this.add.text(cx, d3(r.y + labelDy), t('characters.soon'), { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(C.token.label)}px`, color: D.tip }).setOrigin(0.5));
  }
}
