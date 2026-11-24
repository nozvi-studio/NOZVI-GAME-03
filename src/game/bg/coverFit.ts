// META-BG-R3 pure cover-fit camera math for scaling the 572x1024 animated backdrop to any adaptive portrait canvas.

export interface CoverCamera {
  zoom: number;
  centerX: number;
  centerY: number;
}

export function coverCamera(viewW: number, viewH: number, contentW: number, contentH: number): CoverCamera {
  const centerX = contentW > 0 ? contentW / 2 : 0;
  const centerY = contentH > 0 ? contentH / 2 : 0;
  if (viewW <= 0 || viewH <= 0 || contentW <= 0 || contentH <= 0) {
    return { zoom: 1, centerX, centerY };
  }
  return {
    zoom: Math.max(viewW / contentW, viewH / contentH),
    centerX,
    centerY,
  };
}
