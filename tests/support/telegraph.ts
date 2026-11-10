import { telegraphCtx } from '../../src/game/render/telegraph';
import { loadBalance } from './balance';

/** Shared draw-test fixture: real balance, beat scale always 1. */
export const TEL = telegraphCtx(loadBalance());
