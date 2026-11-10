import type Phaser from 'phaser';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_SIZES, bodyKey, bodySvg, headKey, headSvg, skinExpressions, svgDataUrl, type CapySize } from './capyRig';
import type { SkinId } from './skins';

// ART-003 rasterise every expression (board + large) and body pose of the given skins at load time.
export function preloadSkins(load: Phaser.Loader.LoaderPlugin, skins: readonly SkinId[]): void {
  for (const skin of skins) {
    for (const e of skinExpressions(skin)) for (const size of Object.keys(CAPY_SIZES) as CapySize[])
      load.svg(headKey(skin, e, size), svgDataUrl(headSvg(skin, e)), { width: CAPY_SIZES[size], height: CAPY_SIZES[size] });
    for (const p of BODY_POSES)
      load.svg(bodyKey(skin, p), svgDataUrl(bodySvg(skin, p)), { width: CAPY_BODY_SIZE.w, height: CAPY_BODY_SIZE.h });
  }
}
