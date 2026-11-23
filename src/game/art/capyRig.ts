// Pure skin SVG rig on the ART-001 48-unit anchors. No Phaser import.
// ART-003 / D4-P2-R1: flat cel-shaded Duolingo vector rig with zero SVG ids/defs.
import { SKIN_PALETTES, type SkinId, type SkinPalette } from './skins';

export type EyeVariant = 'open' | 'blink' | 'closed' | 'x' | 'half';
export type MouthVariant = 'smile' | 'open' | 'chew' | 'flat' | 'o';
export type TongueVariant = 'out' | 'side';

export const EXPRESSIONS = {
  idle: { eyes: 'open', mouth: 'smile' },
  idle_blink: { eyes: 'blink', mouth: 'smile' },
  eat_open: { eyes: 'open', mouth: 'open' },
  eat_chew: { eyes: 'closed', mouth: 'chew' },
  dead: { eyes: 'x', mouth: 'o' },
  happy: { eyes: 'closed', mouth: 'smile' },
  alert: { eyes: 'open', mouth: 'o' },
  scared: { eyes: 'open', mouth: 'flat' },
  determined: { eyes: 'half', mouth: 'flat' },
  sleepy: { eyes: 'half', mouth: 'flat' },
  hurt: { eyes: 'closed', mouth: 'o' },
  win: { eyes: 'closed', mouth: 'open' },
  // ART-003 snake-only tongue expressions (the capy skin never uses them).
  idle_tongue: { eyes: 'open', mouth: 'smile', tongue: 'out' },
  eat_tongue: { eyes: 'closed', mouth: 'smile', tongue: 'out' },
  dead_tongue: { eyes: 'x', mouth: 'o', tongue: 'side' },
} as const satisfies Record<string, { eyes: EyeVariant; mouth: MouthVariant; tongue?: TongueVariant }>;
export type CapyExpression = keyof typeof EXPRESSIONS;
const ALL_EXPRESSIONS = Object.keys(EXPRESSIONS) as CapyExpression[];
export const CAPY_EXPRESSIONS = ALL_EXPRESSIONS.filter(e => !('tongue' in EXPRESSIONS[e]));
// ART-003 expressions a skin owns: capy has the 12 base ones, snake adds the tongue ones.
export const skinExpressions = (skin: SkinId): CapyExpression[] => (skin === 'snake' ? ALL_EXPRESSIONS : CAPY_EXPRESSIONS);
// ART-003 the dead face of a skin (snake hangs its tongue).
export const deadFace = (skin: SkinId): CapyExpression => (skin === 'snake' ? 'dead_tongue' : 'dead');
export const BODY_POSES = ['idle', 'win'] as const;
export type CapyBodyPose = (typeof BODY_POSES)[number];
export const CAPY_SIZES = { board: 96, large: 256 } as const;
export type CapySize = keyof typeof CAPY_SIZES;
export const CAPY_BODY_SIZE = { w: 256, h: 384 } as const;

export const CAPY = SKIN_PALETTES.capy;
export const ART = {
  head: { x: 3.6, y: 9.6, w: 40.8, h: 34.8, r: 16.8 }, ears: [11.4, 36.6], earY: 11.4, earR: 5.5,
  eyeY: 20.4, eyeDx: 9.6, pupilR: 3.6, glintR: 1.2, glint2R: 0.65, eyeHalfW: 3,
  cheekY: 30, cheekDx: 15, cheekRx: 4, cheekRy: 2.6,
  noseY: 30.6, nostrils: [20.6, 27.4], nostrilRx: 1.6, nostrilRy: 1.2,
  muzzle: { x: 24, y: 34, rx: 12.6, ry: 8.4 }, mouthY: 37.6, mouthHalfW: 3.5, cx: 24,
  // D4-P2-R1 flat cel-shading crown highlight and lower-cheek shade contained inside face silhouette
  crown: { y: 14.2, rx: 10.5, ry: 3.1 },
  shade: { y: 38.2, rx: 13.5, ry: 4.2 },
  leaf: { d: 'M24.2 10.6C25.4 4.8 31.4 2.4 35.8 4.4C33.6 9.4 28.8 11.8 24.2 10.6Z', vein: 'M25.6 9.6Q29.8 7.2 33.6 5.4' },
  body: { cx: 24, cy: 56, rx: 17, ry: 14, feetY: 68, feetDx: 9, footRx: 6, footRy: 3, armY: 50, armWinY: 40, armDx: 18, armRx: 4, armRy: 3,
    chestBlaze: 'M24 44c3.2 4.5 4.2 10 3.2 17h-6.4c-1-7 0-12.5 3.2-17Z' },
  // ART-003 snake head: an egg-shaped skull (wide at the eyes, narrower snout), no ears, no capy muzzle.
  snake: { top: 6.4, bottom: 45.2, left: 2.8, right: 45.2, scleraR: 5.4, muzzle: { cy: 33.4, rx: 11.6, ry: 7.6 }, gloss: { cx: 19, cy: 12.6, rx: 8.4, ry: 3.2 },
    tongueStem: 4.8, tongueFork: 2.4, tongueSpread: 1.7, tongueStroke: 1.9, body: { coilY: 64, coilRx: 20, coilRy: 8, tailX: 41, tailY: 62 } },
  // MEC-011-R3 cat ears (triangles), dog flop ears, cat muzzle and nose, whiskers, ginger stripes, tuxedo blaze.
  cat: { earL: 'M6 20L7 3.5L20 11Z', earR: 'M42 20L41 3.5L28 11Z', innerL: 'M9.5 14L10 8L15 11Z', innerR: 'M38.5 14L38 8L33 11Z',
    muzzle: { cy: 34.4, rx: 9.6, ry: 7 }, nose: 'M21.8 30.6h4.4l-2.2 2.6Z', noseFill: '#FF8FA3',
    whiskers: 'M3 31l7 1.5M3 36l7-1M45 31l-7 1.5M45 36l-7-1', stripes: 'M20 10.5v5M24 10v6.5M28 10.5v5', stripeFill: '#C96F1E', blaze: 'M24 11c3 4 4 9 4 14h-8c0-5 1-10 4-14Z' },
  dog: { earL: 'M7 12c-6 2-7 14-3 20 3 3 7 0 7-5V14Z', earR: 'M41 12c6 2 7 14 3 20-3 3-7 0-7-5V14Z',
    innerL: 'M6.8 15.2c-3.2 1.4-3.8 9.2-1.4 13.2 1.4 1.6 3.6 0 3.6-2.8V16.6Z',
    innerR: 'M41.2 15.2c3.2 1.4 3.8 9.2 1.4 13.2-1.4 1.6-3.6 0-3.6-2.8V16.6Z',
    muzzle: { cy: 34.4, rx: 9.6, ry: 7 }, nose: 'M21.4 30.2h5.2l-2.6 3Z' },
} as const;

export const fmt = (v: number): string => String(+v.toFixed(2));
const n = fmt;
const eyeXs = [ART.cx - ART.eyeDx, ART.cx + ART.eyeDx];

function eyes(v: EyeVariant, P: SkinPalette, sclera = false): string {
  const y = ART.eyeY, w = ART.eyeHalfW;
  const line = (d: string, lw: number = P.featureStroke): string =>
    `<path d="${d}" fill="none" stroke="${P.pupil}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const one = (x: number): string => {
    switch (v) {
      // D4-P2-R1 dual catchlights inside a translatable pupil group (cx/cy retained for ART-001 anchors).
      case 'open': return (sclera ? `<circle data-part="sclera" cx="${n(x)}" cy="${n(y)}" r="${ART.snake.scleraR}" fill="${P.highlight}" stroke="${P.outline}" stroke-width="${P.innerStroke}"/>` : '')
        + `<g data-part="pupil" data-cx="${n(x)}" data-cy="${n(y)}" cx="${n(x)}" cy="${n(y)}">`
        + `<circle cx="${n(x)}" cy="${n(y)}" r="${ART.pupilR}" fill="${P.pupil}"/>`
        + `<circle data-part="glint" cx="${n(x + 1.1)}" cy="${n(y - 1.2)}" r="${ART.glintR}" fill="${P.highlight}"/>`
        + `<circle data-part="glint" cx="${n(x - 1.2)}" cy="${n(y + 1.1)}" r="${ART.glint2R}" fill="${P.highlight}"/>`
        + '</g>';
      case 'blink': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y)} Q${n(x)} ${n(y + 1.2)} ${n(x + w)} ${n(y)}`)}</g>`;
      case 'closed': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y + 1)} L${n(x)} ${n(y - 1.6)} L${n(x + w)} ${n(y + 1)}`)}</g>`;
      case 'x': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - 2.4)} ${n(y - 2.4)} L${n(x + 2.4)} ${n(y + 2.4)} M${n(x + 2.4)} ${n(y - 2.4)} L${n(x - 2.4)} ${n(y + 2.4)}`)}</g>`;
      case 'half': return `<path data-part="pupil" cx="${n(x)}" cy="${n(y)}" d="M${n(x - ART.pupilR)} ${n(y)} A${ART.pupilR} ${ART.pupilR} 0 0 0 ${n(x + ART.pupilR)} ${n(y)} Z" fill="${P.pupil}"/>`
        + line(`M${n(x - 3.6)} ${n(y)} L${n(x + 3.6)} ${n(y)}`, P.innerStroke);
    }
  };
  return `<g data-layer="eyes" data-eyes="${v}">${eyeXs.map(one).join('')}</g>`;
}

function mouth(v: MouthVariant, P: SkinPalette): string {
  const x = ART.cx, y = ART.mouthY, w = ART.mouthHalfW;
  const stroke = (d: string): string => `<path d="${d}" fill="none" stroke="${P.nose}" stroke-width="${P.featureStroke}" stroke-linecap="round"/>`;
  const body = {
    smile: stroke(`M${n(x - w)} ${n(y - 0.8)} Q${n(x)} ${n(y + 2.6)} ${n(x + w)} ${n(y - 0.8)}`),
    open: `<ellipse cx="${n(x)}" cy="${n(y + 0.8)}" rx="3.2" ry="2.8" fill="${P.nose}"/><ellipse cx="${n(x)}" cy="${n(y + 2)}" rx="1.8" ry="1.1" fill="${P.blush}"/>`,
    chew: stroke(`M${n(x - 3)} ${n(y)} Q${n(x - 1.5)} ${n(y - 1.4)} ${n(x)} ${n(y)} Q${n(x + 1.5)} ${n(y + 1.4)} ${n(x + 3)} ${n(y)}`),
    flat: stroke(`M${n(x - 2.5)} ${n(y)} L${n(x + 2.5)} ${n(y)}`),
    o: `<ellipse cx="${n(x)}" cy="${n(y + 0.4)}" rx="1.8" ry="2.2" fill="${P.nose}"/>`,
  }[v];
  return `<g data-layer="mouth" data-mouth="${v}"><g data-part="mouth" data-y="${n(y)}">${body}</g></g>`;
}

// ART-003 forked red tongue, drawn just below the mouth ('out') or hanging from the mouth corner ('side').
function tongue(v: TongueVariant, P: SkinPalette): string {
  const x = ART.cx, y = ART.mouthY, k = ART.snake, end = y + 1.2 + k.tongueStem;
  const d = v === 'out'
    ? `M${n(x)} ${n(y + 1.2)} L${n(x)} ${n(end)} M${n(x)} ${n(end)} L${n(x - k.tongueSpread)} ${n(end + k.tongueFork)} M${n(x)} ${n(end)} L${n(x + k.tongueSpread)} ${n(end + k.tongueFork)}`
    : `M${n(x + 3.4)} ${n(y + 0.6)} Q${n(x + 6)} ${n(y + 3.4)} ${n(x + 5.2)} ${n(y + 6.4)} M${n(x + 5.2)} ${n(y + 6.4)} L${n(x + 3.8)} ${n(y + 8.4)} M${n(x + 5.2)} ${n(y + 6.4)} L${n(x + 6.8)} ${n(y + 8.2)}`;
  return `<g data-layer="tongue"><path data-part="tongue" d="${d}" fill="none" stroke="${P.tongue}" stroke-width="${ART.snake.tongueStroke}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

/** ART-003 / D3 Home board snake skull: an oval filling the 48-unit head box (four cubic arcs, kappa 0.5523). */
function snakeHeadPath(): string {
  const k = ART.snake, cx = ART.cx, cy = (k.top + k.bottom) / 2, rx = (k.right - k.left) / 2, ry = (k.bottom - k.top) / 2;
  const kx = rx * KAPPA, ky = ry * KAPPA;
  return `M${n(cx)} ${n(k.top)} C${n(cx + kx)} ${n(k.top)} ${n(k.right)} ${n(cy - ky)} ${n(k.right)} ${n(cy)}`
    + ` C${n(k.right)} ${n(cy + ky)} ${n(cx + kx)} ${n(k.bottom)} ${n(cx)} ${n(k.bottom)}`
    + ` C${n(cx - kx)} ${n(k.bottom)} ${n(k.left)} ${n(cy + ky)} ${n(k.left)} ${n(cy)}`
    + ` C${n(k.left)} ${n(cy - ky)} ${n(cx - kx)} ${n(k.top)} ${n(cx)} ${n(k.top)} Z`;
}
const KAPPA = 0.5523; // cubic Bezier circle constant (geometry, not tuning)

function celLayers(P: SkinPalette): string {
  return `<ellipse data-part="crown" cx="${ART.cx}" cy="${ART.crown.y}" rx="${ART.crown.rx}" ry="${ART.crown.ry}" fill="${P.crown}"/>`
    + `<ellipse data-part="shade" cx="${ART.cx}" cy="${ART.shade.y}" rx="${ART.shade.rx}" ry="${ART.shade.ry}" fill="${P.shade}"/>`;
}

// ART-003 / D4-P2-R1 per-skin ears + flat cel-shaded head shape (no SVG gradients/ids).
function earsAndHead(skin: SkinId, P: SkinPalette): string {
  const h = ART.head, o = P.outline;
  if (skin === 'snake') {
    const k = ART.snake;
    return '<g data-layer="ears"></g>'
      + `<g data-layer="head"><path data-part="face" d="${snakeHeadPath()}" fill="${P.faceTop}" stroke="${o}" stroke-width="${P.stroke}" stroke-linejoin="round"/>`
      + celLayers(P)
      + `<ellipse data-part="gloss" cx="${k.gloss.cx}" cy="${k.gloss.cy}" rx="${k.gloss.rx}" ry="${k.gloss.ry}" fill="${P.crown}"/></g>`;
  }
  const face = `<rect data-part="face" x="${h.x}" y="${h.y}" width="${n(h.w)}" height="${n(h.h)}" rx="${h.r}" fill="${P.faceTop}" stroke="${o}" stroke-width="${P.stroke}" stroke-linejoin="round"/>`;
  const tri = (d: string): string => `<path data-part="ear-tri" d="${d}" fill="${P.ears}" stroke="${o}" stroke-width="${P.stroke}" stroke-linejoin="round"/>`;
  if (skin === 'ginger' || skin === 'tuxedo') {
    const c = ART.cat;
    const mark = skin === 'ginger'
      ? `<path data-part="stripe" d="${c.stripes}" fill="none" stroke="${c.stripeFill}" stroke-width="2" stroke-linecap="round"/>`
      : `<path data-part="blaze" d="${c.blaze}" fill="${P.muzzle}"/>`;
    return `<g data-layer="ears">${tri(c.earL)}${tri(c.earR)}<path data-part="ear-inner" d="${c.innerL}" fill="${P.innerEar}"/><path data-part="ear-inner" d="${c.innerR}" fill="${P.innerEar}"/></g>`
      + `<g data-layer="head">${face}${celLayers(P)}${mark}</g>`;
  }
  if (skin === 'pup') {
    const flop = (d: string): string => `<path data-part="ear-flop" d="${d}" fill="${P.ears}" stroke="${o}" stroke-width="${P.stroke}" stroke-linejoin="round"/>`;
    return `<g data-layer="ears">${flop(ART.dog.earL)}${flop(ART.dog.earR)}<path data-part="ear-inner" d="${ART.dog.innerL}" fill="${P.innerEar}"/><path data-part="ear-inner" d="${ART.dog.innerR}" fill="${P.innerEar}"/></g>`
      + `<g data-layer="head">${face}${celLayers(P)}</g>`;
  }
  const leaf = P.leaf && P.leafVein
    ? `<g data-layer="leaf"><path data-part="leaf" d="${ART.leaf.d}" fill="${P.leaf}" stroke="${P.leafVein}" stroke-width="1.3" stroke-linejoin="round"/><path data-part="leaf-vein" d="${ART.leaf.vein}" fill="none" stroke="${P.leafVein}" stroke-width="1" stroke-linecap="round"/></g>`
    : '';
  return `<g data-layer="ears">${ART.ears.map(x => `<circle data-part="ear" cx="${n(x)}" cy="${n(ART.earY)}" r="${ART.earR}" fill="${P.ears}" stroke="${o}" stroke-width="${P.stroke}"/><circle data-part="ear-inner" cx="${n(x)}" cy="${n(ART.earY + 0.5)}" r="2.7" fill="${P.innerEar}"/>`).join('')}</g>`
    + leaf
    + `<g data-layer="head">${face}${celLayers(P)}</g>`;
}

/** ART-003 / D3 Home board: snake muzzle = a light oval under the eyes (no outline), no nostrils. */
function snakeJawAndNostrils(P: SkinPalette): string {
  const m = ART.snake.muzzle;
  return `<g data-layer="muzzle"><ellipse data-part="muzzle" cx="${ART.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}" fill="${P.muzzle}"/></g><g data-layer="nose"></g>`;
}

/** MEC-011-R3 cat and dog muzzle: small light oval, triangle nose; cats add whiskers (drawn in the nose layer, over the muzzle). */
function petMuzzleAndNose(skin: 'ginger' | 'pup' | 'tuxedo', P: SkinPalette): string {
  const cat = skin !== 'pup', m = cat ? ART.cat.muzzle : ART.dog.muzzle;
  const nose = `<path data-part="nose" d="${cat ? ART.cat.nose : ART.dog.nose}" fill="${cat ? ART.cat.noseFill : P.nose}" stroke="${P.outline}" stroke-width="0.8" stroke-linejoin="round"/>`;
  const whiskers = cat ? `<path data-part="whisker" d="${ART.cat.whiskers}" fill="none" stroke="${P.outline}" stroke-width="1" stroke-linecap="round"/>` : '';
  return `<g data-layer="muzzle"><ellipse data-part="muzzle" cx="${ART.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}" fill="${P.muzzle}" stroke="${P.outline}" stroke-width="${P.innerStroke}"/></g>`
    + `<g data-layer="nose">${nose}${whiskers}</g>`;
}

// D4-P2-R1 flat cel layers, no defs or ids (zero DOM collisions). Back to front: ears, (leaf), head, blush, muzzle, nose, eyes, (tongue), mouth.
export function headLayersSvg(skin: SkinId, e: CapyExpression): string {
  const P = SKIN_PALETTES[skin], x = EXPRESSIONS[e], m = ART.muzzle, o = P.outline;
  const t: TongueVariant | undefined = 'tongue' in x ? x.tongue : undefined;
  return earsAndHead(skin, P)
    + `<g data-layer="blush">${[-1, 1].map(s => `<ellipse cx="${n(ART.cx + s * ART.cheekDx)}" cy="${ART.cheekY}" rx="${ART.cheekRx}" ry="${ART.cheekRy}" fill="${P.blush}" opacity="0.8"/>`).join('')}</g>`
    + (skin === 'snake' ? snakeJawAndNostrils(P) : skin !== 'capy' ? petMuzzleAndNose(skin, P) : `<g data-layer="muzzle"><ellipse data-part="muzzle" cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${P.muzzle}" stroke="${o}" stroke-width="${P.innerStroke}"/></g>`
    + `<g data-layer="nose">${ART.nostrils.map(nx => `<ellipse data-part="nostril" cx="${n(nx)}" cy="${n(ART.noseY)}" rx="${ART.nostrilRx}" ry="${ART.nostrilRy}" fill="${P.nose}"/>`).join('')}</g>`)
    + eyes(x.eyes, P, skin === 'snake') + (t ? tongue(t, P) : '') + mouth(x.mouth, P);
}

const wrap = (vb: string, inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;

// ART-003 head for one expression of one skin (front facing, 48 x 48).
export function headSvg(skin: SkinId, e: CapyExpression): string {
  return wrap('0 0 48 48', headLayersSvg(skin, e));
}

// ART-003 body pose (Skins/Results only): body behind, head on the same anchors.
export function bodySvg(skin: SkinId, p: CapyBodyPose): string {
  const P = SKIN_PALETTES[skin];
  const b = ART.body, o = P.outline, st = P.stroke;
  const armY = p === 'win' ? b.armWinY : b.armY;
  const blob = (cx: number, cy: number, rx: number, ry: number): string =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${rx}" ry="${ry}" fill="${P.ears}" stroke="${o}" stroke-width="${st}"/>`;
  const k = ART.snake.body;
  // ART-003 snake body: a coil under the belly and a tail tip instead of capy arms and feet ('win' lifts the tail).
  const coil = `${blob(b.cx, k.coilY, k.coilRx, k.coilRy)}${blob(k.tailX, p === 'win' ? k.tailY - 8 : k.tailY, 3.4, 5)}`;
  const limbs = `${blob(b.cx - b.feetDx, b.feetY, b.footRx, b.footRy)}${blob(b.cx + b.feetDx, b.feetY, b.footRx, b.footRy)}`
    + `${blob(b.cx - b.armDx, armY, b.armRx, b.armRy)}${blob(b.cx + b.armDx, armY, b.armRx, b.armRy)}`;
  const chest = skin === 'tuxedo' ? `<path data-part="blaze" d="${b.chestBlaze}" fill="${P.muzzle}"/>` : '';
  const body = `<g data-layer="body">${skin === 'snake' ? coil : limbs}`
    + `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${P.faceBottom}" stroke="${o}" stroke-width="${st}"/>${chest}</g>`;
  return wrap('0 0 48 72', body + headLayersSvg(skin, p === 'win' ? 'win' : 'idle'));
}

export const capyHeadSvg = (e: CapyExpression): string => headSvg('capy', e);
export const capyBodySvg = (p: CapyBodyPose): string => bodySvg('capy', p);

export const svgDataUrl = (svg: string): string => 'data:image/svg+xml;base64,' + btoa(svg);
export const headKey = (skin: SkinId, e: CapyExpression, size: CapySize): string => `${skin}/head/${e}/${size}`;
export const bodyKey = (skin: SkinId, p: CapyBodyPose): string => `${skin}/body/${p}/large`;
export const capyHeadKey = (e: CapyExpression, size: CapySize): string => headKey('capy', e, size);
export const capyBodyKey = (p: CapyBodyPose): string => bodyKey('capy', p);
