// P3b3-R3 menu geometry in mockup px (390x844 reference). Pure data; scenes call ui(MENU.x.y).
export const MENU = {
  padTop: 22, side: 16, round: 44, gap: 12, section: 14,
  widgets: { shelfDy: 6, logoGap: 1, logoSpace: 0.25 },
  hill: { w: 530, topH: 260, topDy: 130, bottomH: 240, bottomDy: 150 },
  logo: { size: 66, lineH: 63, overlap: 4, shadowY: 6, height: 128 },
  boot: { top: 96, heroGap: 46, hero: 240, barGap: 44, barW: 260, barH: 20, textGap: 10, textH: 18,
    barPad: 4, textFont: 15, hillH: 300,
    trail: [[20, 190], [92, 190], [108, 174], [108, 150]], trailRadius: 16, trailStep: 3, shadeR: 15, bodyR: 12.5, hiR: 2, hiDx: -3, hiDy: -4, hiAlpha: 0.45,
    capy: { x: 62, y: 40, size: 116 }, mango: { right: 22, bottom: 34, size: 56, outer: 0.42, inner: 0.36, leaf: { dx: 0.12, dy: -0.3, w: 0.36, h: 0.2 } } },
  home: {
    hero: { w: 358, h: 270, gap: 10, radius: 32 }, stepperH: 36, playH: 74, playHFirst: 96, chipH: 38, hintH: 16, hillPeek: 40,
    stepper: { btn: 36, chipGap: 8, font: 14, arrowFont: 16 },
    play: { label: 38, labelFirst: 52, stroke: 7, strokeFirst: 7, chipH: 32, chipPadL: 10, chipPadR: 14, chipFont: 14, chipIcon: 18, chipRight: 24, labelLeft: 34 },
    chips: { font: 15, padL: 10, padR: 14, padX: 18, gap: 8, icon: 18, iconGap: 6 },
    hintFont: 13,
    trail: [[16, 232], [170, 232], [170, 168], [250, 168], [250, 112]], trailRadius: 34, trailStep: 3, shadeR: 17, bodyR: 14.5, hiR: 2.5, hiDx: -4, hiDy: -5, hiAlpha: 0.45,
    mango: { x: 26, y: 30, size: 58, outer: 0.42, inner: 0.36, leaf: { dx: 0.12, dy: -0.3, w: 0.36, h: 0.2 } },
    capy: { x: 188, y: 42, size: 124 },
  },
  loadout: {
    headH: 44, slotsH: 156, slotCircle: 84, chipsH: 44, cardH: 80, cardGap: 10, cards: 4, goH: 78, goBottom: 30,
    cardW: 358, cardR: 22, slotsR: 26, slotsPadTop: 16, slotsEdge: 8, slotCol: 150, slotRing: 7, slotShelf: 7, slotIcon: 44, slotGap: 8,
    slotLabel: 12, slotName: 15, slotLabelTrack: 1, titleFont: 24, chipFont: 15, chipPad: 14, chipIcon: 20, chipIconGap: 8,
    pickRing: 3, disc: 52, discIcon: 28, padX: 14, textGap: 12, nameFont: 17, nameGap: 3, descFont: 13, costH: 22, costFont: 13, costPadL: 6, costPadR: 8, costGap: 8, costIcon: 12,
    badgeH: 26, badgeFont: 12, badgePad: 10, badgeReserve: 70, lockIcon: 13, lockGap: 5, goW: 350, goLabel: 46, goStroke: 8,
  },
  settings: {
    headH: 44, rowH: 72, rows: 4, divider: 2, themeCardH: 194, captionH: 16,
    cardW: 358, radius: 26, tileInset: 2, titleDy: 14, subDy: 2, captionDy: 8, gap: 14, pad: 16, tile: 44, tileR: 14, icon: 24, textGap: 12, subW: 185, titleFont: 17, subFont: 13, valueFont: 14, headFont: 24,
    sw: { w: 48, h: 28, knob: 10, line: 2 },
    // SettingsD2 theme card: padding 16/14, tiles 113 high with a 64 px rounded swatch; edge = 2 px inset at 25% ink.
    theme: { padX: 14, titleY: 25, subY: 45, tilesY: 66, tileH: 113, gap: 10, r: 20, swatch: 64, swatchTop: 10, swatchR: 14, swatchLine: 2, swatchEdgeAlpha: 0.25, snake: { dx: 12, dy: 26, w: 32, h: 12, r: 6 }, ball: { dx: 46, dy: 30, r: 10 }, labelFont: 16, labelY: 93, line: 2, lineSel: 3 },
  },
  results: {
    headH: 44, cardTop: 50, cardH: 332, bannerH: 60, energyH: 64, progressH: 32, btn: 62, againH: 70, bottom: 30,
    titleSize: 34, titleY: 24, side: 20, btnGap: 12, againLabel: 32, againStroke: 7,
    card: { w: 358, r: 30, pad: 16, headW: 112, headOverlap: 58, headline: 16, headlineY: 81, wrapLines: 1.6, scoreLabel: 13, scoreLabelY: 106, scoreLabelTrack: 1.3, score: 84, scoreY: 158,
      chipY: 226, chipH: 32, chipFont: 15, chipPadL: 12, chipPadR: 16, chipGap: 6, chipIcon: 18, tilesY: 252, tileH: 62, tileGap: 8, tileR: 14, tileLabel: 12, tileLabelY: 14, tileValue: 28, tileValueY: 40 },
    row: { r: 26, padX: 20, gap: 14, icon: 30, label: 17, value: 40 },
    banner: { r: 20, pad: 12, disc: 36, icon: 20, gap: 12, font: 19 },
    progress: { barH: 18, gap: 10, chipH: 32, chipFont: 14, chipPadL: 10, chipPadR: 14, chipIcon: 18, chipGap: 6 },
  },
} as const;
