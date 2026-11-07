import type { Palette } from '../render/palette';
import { P1_COLORS } from '../render/palette';
import type { ColorId } from './types';

// P3a-R11 maps a juice colour id to a packed colour for the active palette (no hex literals here).
export function colorOf(id: ColorId, p: Palette): number {
  switch (id) {
    case 'food': return p.food;
    case 'gold': return p.gold;
    case 'rock': return p.rock;
    case 'snake': return p.snake;
    case 'danger': return p.danger;
    case 'orb': return P1_COLORS.orb;
    case 'slowmo': return P1_COLORS.slowmo;
    case 'shield': return P1_COLORS.shield;
    case 'tailSnip': return P1_COLORS.snipStripe;
    case 'mangoRain': return P1_COLORS.droplet;
  }
}
