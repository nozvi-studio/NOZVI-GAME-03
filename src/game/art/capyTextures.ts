import type Phaser from 'phaser';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, capyBodyKey, capyBodySvg, capyHeadKey, capyHeadSvg, svgDataUrl, type CapySize } from './capyRig';

// ART-001 rasterise every capy expression (board + large) and body pose at load time.
export function preloadCapy(load: Phaser.Loader.LoaderPlugin): void {
  for (const e of CAPY_EXPRESSIONS) for (const size of Object.keys(CAPY_SIZES) as CapySize[])
    load.svg(capyHeadKey(e, size), svgDataUrl(capyHeadSvg(e)), { width: CAPY_SIZES[size], height: CAPY_SIZES[size] });
  for (const p of BODY_POSES)
    load.svg(capyBodyKey(p), svgDataUrl(capyBodySvg(p)), { width: CAPY_BODY_SIZE.w, height: CAPY_BODY_SIZE.h });
}
