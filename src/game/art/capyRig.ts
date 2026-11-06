// Pure capy SVG rig on the ART-001 48-unit anchors. No Phaser import.
export type EyeVariant = 'open' | 'blink' | 'closed' | 'x' | 'half';
export type MouthVariant = 'smile' | 'open' | 'chew' | 'flat' | 'o';

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
} as const satisfies Record<string, { eyes: EyeVariant; mouth: MouthVariant }>;
export type CapyExpression = keyof typeof EXPRESSIONS;
export const CAPY_EXPRESSIONS = Object.keys(EXPRESSIONS) as CapyExpression[];
export const BODY_POSES = ['idle', 'win'] as const;
export type CapyBodyPose = (typeof BODY_POSES)[number];
export const CAPY_SIZES = { board: 96, large: 256 } as const;
export type CapySize = keyof typeof CAPY_SIZES;
export const CAPY_BODY_SIZE = { w: 256, h: 384 } as const;

export const CAPY = {
  outline: '#4A2E1B', faceTop: '#D6AB7C', faceBottom: '#C79A6B', ears: '#B1865A', muzzle: '#B1865A',
  pupil: '#17261B', nose: '#4A2E1B', blush: '#FF8FA3', highlight: '#FFFFFF',
  stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
} as const;
export const ART = {
  head: { x: 3.6, y: 9.6, w: 40.8, h: 34.8, r: 16.8 }, ears: [11.4, 36.6], earY: 11.4, earR: 5.5,
  eyeY: 20.4, eyeDx: 9.6, pupilR: 3.2, glintR: 1.1, eyeHalfW: 3,
  cheekY: 30, cheekDx: 15, cheekRx: 4, cheekRy: 2.6,
  noseY: 30.6, nostrils: [20.6, 27.4], nostrilRx: 1.6, nostrilRy: 1.2,
  muzzle: { x: 24, y: 34, rx: 12.6, ry: 8.4 }, mouthY: 37.6, mouthHalfW: 3.5, cx: 24,
  body: { cx: 24, cy: 56, rx: 17, ry: 14, feetY: 68, feetDx: 9, footRx: 6, footRy: 3, armY: 50, armWinY: 40, armDx: 18, armRx: 4, armRy: 3 },
} as const;

const n = (v: number): string => String(+v.toFixed(2));
const eyeXs = [ART.cx - ART.eyeDx, ART.cx + ART.eyeDx];
const line = (d: string, w: number = CAPY.featureStroke): string =>
  `<path d="${d}" fill="none" stroke="${CAPY.pupil}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function eyes(v: EyeVariant): string {
  const y = ART.eyeY, w = ART.eyeHalfW;
  const one = (x: number): string => {
    switch (v) {
      case 'open': return `<circle data-part="pupil" cx="${n(x)}" cy="${n(y)}" r="${ART.pupilR}" fill="${CAPY.pupil}"/>`
        + `<circle cx="${n(x + 1)}" cy="${n(y - 1.1)}" r="${ART.glintR}" fill="${CAPY.highlight}"/>`;
      case 'blink': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y)} Q${n(x)} ${n(y + 1.2)} ${n(x + w)} ${n(y)}`)}</g>`;
      case 'closed': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y + 1)} L${n(x)} ${n(y - 1.6)} L${n(x + w)} ${n(y + 1)}`)}</g>`;
      case 'x': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - 2.4)} ${n(y - 2.4)} L${n(x + 2.4)} ${n(y + 2.4)} M${n(x + 2.4)} ${n(y - 2.4)} L${n(x - 2.4)} ${n(y + 2.4)}`)}</g>`;
      case 'half': return `<path data-part="pupil" cx="${n(x)}" cy="${n(y)}" d="M${n(x - ART.pupilR)} ${n(y)} A${ART.pupilR} ${ART.pupilR} 0 0 0 ${n(x + ART.pupilR)} ${n(y)} Z" fill="${CAPY.pupil}"/>`
        + line(`M${n(x - 3.6)} ${n(y)} L${n(x + 3.6)} ${n(y)}`, CAPY.innerStroke);
    }
  };
  return `<g data-layer="eyes" data-eyes="${v}">${eyeXs.map(one).join('')}</g>`;
}

function mouth(v: MouthVariant): string {
  const x = ART.cx, y = ART.mouthY, w = ART.mouthHalfW;
  const stroke = (d: string): string => `<path d="${d}" fill="none" stroke="${CAPY.nose}" stroke-width="${CAPY.featureStroke}" stroke-linecap="round"/>`;
  const body = {
    smile: stroke(`M${n(x - w)} ${n(y - 0.8)} Q${n(x)} ${n(y + 2.6)} ${n(x + w)} ${n(y - 0.8)}`),
    open: `<ellipse cx="${n(x)}" cy="${n(y + 0.8)}" rx="3.2" ry="2.8" fill="${CAPY.nose}"/><ellipse cx="${n(x)}" cy="${n(y + 2)}" rx="1.8" ry="1.1" fill="${CAPY.blush}"/>`,
    chew: stroke(`M${n(x - 3)} ${n(y)} Q${n(x - 1.5)} ${n(y - 1.4)} ${n(x)} ${n(y)} Q${n(x + 1.5)} ${n(y + 1.4)} ${n(x + 3)} ${n(y)}`),
    flat: stroke(`M${n(x - 2.5)} ${n(y)} L${n(x + 2.5)} ${n(y)}`),
    o: `<ellipse cx="${n(x)}" cy="${n(y + 0.4)}" rx="1.8" ry="2.2" fill="${CAPY.nose}"/>`,
  }[v];
  return `<g data-layer="mouth" data-mouth="${v}"><g data-part="mouth" data-y="${n(y)}">${body}</g></g>`;
}

// ART-001 head layers back to front: ears, head, blush, muzzle, nose, eyes, mouth.
function headLayers(eyesV: EyeVariant, mouthV: MouthVariant): string {
  const h = ART.head, m = ART.muzzle, o = CAPY.outline;
  return `<defs><linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CAPY.faceTop}"/><stop offset="1" stop-color="${CAPY.faceBottom}"/></linearGradient></defs>`
    + `<g data-layer="ears">${ART.ears.map(x => `<circle data-part="ear" cx="${n(x)}" cy="${n(ART.earY)}" r="${ART.earR}" fill="${CAPY.ears}" stroke="${o}" stroke-width="${CAPY.stroke}"/>`).join('')}</g>`
    + `<g data-layer="head"><rect data-part="face" x="${h.x}" y="${h.y}" width="${n(h.w)}" height="${n(h.h)}" rx="${h.r}" fill="url(#face)" stroke="${o}" stroke-width="${CAPY.stroke}" stroke-linejoin="round"/></g>`
    + `<g data-layer="blush">${[-1, 1].map(s => `<ellipse cx="${n(ART.cx + s * ART.cheekDx)}" cy="${ART.cheekY}" rx="${ART.cheekRx}" ry="${ART.cheekRy}" fill="${CAPY.blush}" opacity="0.8"/>`).join('')}</g>`
    + `<g data-layer="muzzle"><ellipse data-part="muzzle" cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${CAPY.muzzle}" stroke="${o}" stroke-width="${CAPY.innerStroke}"/></g>`
    + `<g data-layer="nose">${ART.nostrils.map(x => `<ellipse data-part="nostril" cx="${n(x)}" cy="${n(ART.noseY)}" rx="${ART.nostrilRx}" ry="${ART.nostrilRy}" fill="${CAPY.nose}"/>`).join('')}</g>`
    + eyes(eyesV) + mouth(mouthV);
}

const wrap = (vb: string, inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;

// ART-001 capy head for one expression (front facing, 48 x 48).
export function capyHeadSvg(e: CapyExpression): string {
  const x = EXPRESSIONS[e];
  return wrap('0 0 48 48', headLayers(x.eyes, x.mouth));
}

// ART-001 capy body pose (Skins/Results only): body behind, head on the same anchors.
export function capyBodySvg(p: CapyBodyPose): string {
  const b = ART.body, o = CAPY.outline, st = CAPY.stroke;
  const armY = p === 'win' ? b.armWinY : b.armY;
  const blob = (cx: number, cy: number, rx: number, ry: number): string =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${rx}" ry="${ry}" fill="${CAPY.ears}" stroke="${o}" stroke-width="${st}"/>`;
  const body = `<g data-layer="body">${blob(b.cx - b.feetDx, b.feetY, b.footRx, b.footRy)}${blob(b.cx + b.feetDx, b.feetY, b.footRx, b.footRy)}`
    + `${blob(b.cx - b.armDx, armY, b.armRx, b.armRy)}${blob(b.cx + b.armDx, armY, b.armRx, b.armRy)}`
    + `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="url(#face)" stroke="${o}" stroke-width="${st}"/></g>`;
  const x = EXPRESSIONS[p === 'win' ? 'win' : 'idle'];
  const head = headLayers(x.eyes, x.mouth);
  // defs come from headLayers; body is drawn first so the head overlaps it.
  const defsEnd = head.indexOf('</defs>') + '</defs>'.length;
  return wrap('0 0 48 72', head.slice(0, defsEnd) + body + head.slice(defsEnd));
}

export const svgDataUrl = (svg: string): string => 'data:image/svg+xml;base64,' + btoa(svg);
export const capyHeadKey = (e: CapyExpression, size: CapySize): string => `capy/head/${e}/${size}`;
export const capyBodyKey = (p: CapyBodyPose): string => `capy/body/${p}/large`;
