// P3b3-R3 menu geometry in mockup px (390x844 reference). Pure data; scenes call ui(MENU.x.y).
export const MENU = {
  padTop: 22, side: 16, round: 44, gap: 12, section: 14,
  logo: { size: 66, lineH: 63, overlap: 4, shadowY: 6, height: 128 },
  boot: { top: 96, heroGap: 46, hero: 240, barGap: 44, barW: 260, barH: 20, textGap: 10, textH: 18 },
  home: { hero: { w: 358, h: 270, gap: 10, radius: 32 }, stepperH: 36, playH: 74, playHFirst: 96, chipH: 38, hintH: 16, hillPeek: 40 },
  loadout: { headH: 44, slotsH: 156, slotCircle: 84, chipsH: 44, cardH: 80, cardGap: 10, cards: 4, goH: 78, goBottom: 30 },
  settings: { headH: 44, rowH: 72, rows: 4, divider: 2, themeCardH: 215, captionH: 16 },
  results: { headH: 44, cardTop: 50, cardH: 332, bannerH: 60, energyH: 64, progressH: 32, btn: 62, againH: 70, bottom: 30 },
} as const;
