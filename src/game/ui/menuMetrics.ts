/** D3-R11 logo, 360x150 mock viewBox at scale 1 (boards.html logo()). capMid = cap-height centre / font size (Lilita caps). */
/** textTop/textBottom = inked box of both lines incl. strokes and drop (viewBox units); layout rects use it so the logo does not collide with the header chips or the hero. */
/** inkW = horizontal ink width of the wider line (MANGO/SNAKE in Lilita 70 plus back stroke), viewBox units. */
export const D3_LOGO = { w: 360, h: 150, font: 70, base: [64, 130], drop: 6, stroke: 5, backStroke: 16, capMid: 0.35, textTop: 8, textBottom: 144, inkW: 250 } as const;

/** D3-R11 snake hero in a 360x240 viewBox (boards.html hero()). Cubic segments are [p0, c1, c2, p1]. */
export const D3_HERO = {
  w: 360, h: 240, step: 3,
  body: [[[40, 196], [80, 196], [90, 156], [130, 156]], [[130, 156], [170, 156], [170, 196], [210, 196]], [[210, 196], [250, 196], [250, 126], [210, 106]]],
  highlight: [[[44, 184], [80, 182], [92, 144], [130, 144]]],
  outlineW: 56, bodyW: 46, hiW: 8, hiAlpha: 0.45,
  shadow: { x: 180, y: 222, rx: 130, ry: 14, alpha: 0.25 },
  head: { x: 206, y: 92, w: 144 },
  mango: { x: 74, y: 70, size: 64, rx: 0.44, ry: 0.4, line: 0.06, haloR: 0.6, haloAlpha: 0.35, leaf: { dx: 0.12, dy: -0.42, w: 0.3, h: 0.14 } },
} as const;

/** D3-R10 Boot board 360x640 (mock px); extra canvas height is split above and below the group. */
export const D3_BOOT = { h: 640, logoTop: 150, logoScale: 1, barX: 60, barY: 420, barH: 26, textY: 456, textH: 20, textFont: 15 } as const;

// P3b3-R3 menu geometry in mockup px (390x844 reference). Pure data; scenes call ui(MENU.x.y).
export const MENU = {
  padTop: 22, side: 16, round: 44, gap: 12, section: 14,
  widgets: { shelfDy: 6, logoGap: 1, logoSpace: 0.25, shelfAlpha: 0.6, iconRatio: 0.5 },
  hill: { w: 530, topH: 260, topDy: 130, bottomH: 240, bottomDy: 150 },
  logo: { size: 66, lineH: 63, overlap: 4, shadowY: 6, height: 128 },
  loadout: {
    slotsH: 156, slotCircle: 84, chipsH: 44, cardH: 80, cardGap: 10, cards: 4, goH: 78, goBottom: 30,
    cardW: 358, cardR: 22, slotsR: 26, slotsPadTop: 16, slotsEdge: 8, slotCol: 150, slotRing: 7, slotShelf: 7, ringAlpha: 0.85, shelfAlpha: 0.3, slotIcon: 44, slotGap: 8,
    slotLabel: 12, slotName: 15, slotLabelTrack: 1, titleFont: 24, chipFont: 15, chipPad: 14, chipIcon: 20, chipIconGap: 8,
    pickRing: 3, disc: 52, discIcon: 28, padX: 14, textGap: 12, nameFont: 17, nameGap: 3, descFont: 13, costH: 22, costFont: 13, costPadL: 6, costPadR: 8, costGap: 8, costIcon: 12,
    badgeH: 26, badgeFont: 12, badgePad: 10, badgeReserve: 70, lockIcon: 13, lockGap: 5, goW: 350, goLabel: 46, goStroke: 8,
    compactBelowCssH: 700, compact: { cardH: 64, cardGap: 8 }, // UIFIX-R9 compact skill cards on short screens
  },
  settings: {
    rowH: 72, rows: 4, divider: 2, themeCardH: 194, captionH: 16,
    cardW: 358, radius: 26, tileInset: 2, titleDy: 14, subDy: 2, captionDy: 8, gap: 14, pad: 16, tile: 44, tileR: 14, icon: 24, textGap: 12, subW: 185, titleFont: 17, subFont: 13, valueFont: 14, headFont: 24,
    sw: { w: 48, h: 28, knob: 10, line: 2 },
    // SettingsD2 theme card: padding 16/14, tiles 113 high with a 64 px rounded swatch; edge = 2 px inset at 25% ink.
    theme: { padX: 14, titleY: 25, subY: 45, tilesY: 66, tileH: 113, gap: 10, r: 20, swatch: 64, swatchTop: 10, swatchR: 14, swatchLine: 2, swatchEdgeAlpha: 0.25, snake: { dx: 12, dy: 26, w: 32, h: 12, r: 6 }, ball: { dx: 46, dy: 30, r: 10 }, labelFont: 16, labelY: 93, line: 2, lineSel: 3 },
  },
  results: {
    d3: { baseH: 640, tShift: 0.5, ribbonDy: 18, ribbonH: 72, ribbonW: 250, panelX: 20, panelW: 320, panelDy: 76, padTop: 22, padBottom: 14,
      headlineH: 14, headlineGap: 8, scoreLabelH: 12, scoreH: 64, bestH: 30, bestGap: 6, tilesH: 72, tilesGap: 12,
      rowH: { checkpoint: 34, energy: 24, next: 26 }, rowGap: 10, tipH: 36, tipGap: 14,
      primaryW: 280, primaryH: 72, primaryRatio: 0.734, secondaryW: 168, secondaryH: 48, secondaryDy: 94, panelClear: 16 },
    // D3-R18 scene-only metrics (D3 mock px, 360 wide)
    ribbonFont: 32, ribbonStroke: 6, rayBiome: 1, padX: 16, headlineFont: 14, scoreLabelFont: 12, scoreLabelTrack: 1.2, scoreFont: 64,
    bestFont: 14, bestIcon: 16, bestLead: 22, tileGap: 8, tileLabelFont: 11, tileLabelY: 20, tileValueFont: 24, tileValueY: 48,
    chipFont: 13, rowFont: 13, rowValueFont: 16, rowIcon: 20, barH: 18, nextChipH: 26, nextChipW: 52, nextChipFont: 13, tipFont: 13, tipLine: 1.35,
    primaryLabel: 28, primaryStroke: 6, secondaryFont: 16, secondaryIcon: 20, secondaryGap: 6,
  },
} as const;

/** D3-R11 Home anchors (mock px, 360 wide). `short` = Home 360x640 board, `tall` = Home 390x844 board scaled by 360/390. */
export const D3_HOME = {
  short: { h: 640, chip: 14, logo: 52, hero: 186, heroW: 318, play: 408, start: 512, links: 574, linkSide: 22, linkW: 152 },
  tall: { h: 779, chip: 48, logo: 103, hero: 258, heroW: 343, play: 517, start: 617, links: 679, linkSide: 28, linkW: 146 },
  side: 14, round: 48, bestH: 40, bestW: 132, bestDy: 2, logoScale: 0.92, heroAspect: 2 / 3,
  playX: 40, playH: 84, startX: 70, startH: 48, arrow: 48, arrowGap: 6, linkH: 48, linkFont: 15, hintX: 40, hintH: 36,
  carryInset: 8, chipIconRatio: 1.2, chipIconGap: 6,
} as const;
