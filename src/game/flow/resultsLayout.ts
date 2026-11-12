import { MENU } from '../ui/menuMetrics';
import type { ResultsRow, ResultsView } from './resultsView';

export interface RY { y: number; h: number }               // mock px, screen top = 0
export interface ResultsLayout {
  ribbon: RY & { w: number }; panel: RY & { x: number; w: number };
  headline: number; scoreLabel: number; score: number; best: number; tiles: RY;
  rows: (RY & { kind: ResultsRow['kind'] })[]; tip: RY | null;
  primary: RY & { w: number; id: 'again' | 'home' }; secondary: (RY & { w: number }) | null;
}

// D3-R18 / U5-R5/R6/R8: pure Results rects in mock px (hm = screen height in mock px); a running y cursor walks down the panel.
export function resultsLayout(v: Pick<ResultsView, 'rows' | 'firstRunTip'>, hm: number, hasAgain: boolean): ResultsLayout {
  const m = MENU.results.d3;
  const T = Math.round((hm - m.baseH) * m.tShift);
  const panelY = T + m.panelDy;
  let y = panelY + m.padTop;
  const headline = y; y += m.headlineH + m.headlineGap;
  const scoreLabel = y; y += m.scoreLabelH;
  const score = y; y += m.scoreH;
  const best = y; y += m.bestH + m.bestGap;
  const tiles = { y, h: m.tilesH }; y += m.tilesH + m.tilesGap;
  const rows = v.rows.map((r, i) => {
    if (i > 0) y += m.rowGap;
    const h = m.rowH[r.kind]; const rect = { kind: r.kind, y, h }; y += h; return rect;
  });
  let tip: RY | null = null;
  if (v.firstRunTip) { y += rows.length > 0 ? m.tipGap : 0; tip = { y, h: m.tipH }; y += m.tipH; }
  if (rows.length === 0 && !tip) y -= m.tilesGap;
  const panelBottom = y + m.padBottom;
  const py = Math.max(Math.round(hm * m.primaryRatio), panelBottom + m.panelClear);
  return {
    ribbon: { y: T + m.ribbonDy, h: m.ribbonH, w: m.ribbonW },
    panel: { x: m.panelX, y: panelY, w: m.panelW, h: panelBottom - panelY },
    headline, scoreLabel, score, best, tiles, rows, tip,
    primary: { y: py, h: m.primaryH, w: m.primaryW, id: hasAgain ? 'again' : 'home' },
    secondary: hasAgain ? { y: py + m.secondaryDy, h: m.secondaryH, w: m.secondaryW } : null,
  };
}
