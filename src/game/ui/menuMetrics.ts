// P3b3-R3 menu geometry in mockup px (390x844 reference). Pure data; scenes call ui(MENU.x.y).
export const MENU = {
  padTop: 22, side: 16, round: 44, gap: 12, section: 14,
  widgets: { shelfDy: 6, logoGap: 1, logoSpace: 0.25 },
  hill: { w: 530, topH: 260, topDy: 130, bottomH: 240, bottomDy: 150 },
  logo: { size: 66, lineH: 63, overlap: 4, shadowY: 6, height: 128 },
  boot: { top: 96, heroGap: 46, hero: 240, barGap: 44, barW: 260, barH: 20, textGap: 10, textH: 18 },
  home: { hero: { w: 358, h: 270, gap: 10, radius: 32 }, stepperH: 36, playH: 74, playHFirst: 96, chipH: 38, hintH: 16, hillPeek: 40 },
  loadout: { headH: 44, slotsH: 156, slotCircle: 84, chipsH: 44, cardH: 80, cardGap: 10, cards: 4, goH: 78, goBottom: 30 },
  settings: {
    headH: 44, rowH: 72, rows: 4, divider: 2, themeCardH: 215, captionH: 16,
    cardW: 358, radius: 26, tileInset: 2, titleDy: 14, subDy: 2, captionDy: 8, gap: 14, pad: 16, tile: 44, tileR: 14, icon: 24, textGap: 12, subW: 185, titleFont: 17, subFont: 13, valueFont: 14, headFont: 24,
    sw: { w: 48, h: 28, knob: 10, line: 2 },
    theme: { swatchTop: 10, snake: { dx: 12, dy: 26, h: 12, r: 6 }, ball: { dx: 46, dy: 30, r: 10 }, titleY: 22, subY: 42, tilesY: 62, bottomPad: 16, gap: 10, r: 20, swatch: 32, labelFont: 16, labelY: 96, line: 2, lineSel: 3 },
  },
  results: { headH: 44, cardTop: 50, cardH: 332, bannerH: 60, energyH: 64, progressH: 32, btn: 62, againH: 70, bottom: 30 },
} as const;
