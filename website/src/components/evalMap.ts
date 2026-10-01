export const EVAL_MIN = -4;
export const EVAL_MAX = 4;

export function formatPawns(pawns: number): string {
  if (Math.abs(pawns) < 0.005) return '0.00';
  const abs = Math.abs(pawns).toFixed(2);
  return `${pawns > 0 ? '+' : '−'}${abs}`;
}

export function wdlExpected(
  wdl: {win: number; draw: number; loss: number},
  whiteToMove: boolean,
): number {
  const sum = wdl.win + wdl.draw + wdl.loss;
  const p = sum <= 0 ? 0.5 : (wdl.win + 0.5 * wdl.draw) / sum;
  return whiteToMove ? p : 1 - p;
}

export function barFromEngine(opts: {
  whiteToMove: boolean;
  cp?: number;
  mate?: number;
  wdl?: {win: number; draw: number; loss: number};
}): {value: number; min: number; max: number; label: string} {
  const {whiteToMove, cp, mate, wdl} = opts;
  if (typeof mate === 'number') {
    const m = whiteToMove ? mate : -mate;
    return {
      value: m > 0 ? EVAL_MAX : EVAL_MIN,
      min: EVAL_MIN,
      max: EVAL_MAX,
      label: `M${m}`,
    };
  }
  if (typeof cp === 'number') {
    const whiteCp = whiteToMove ? cp : -cp;
    const pawns = whiteCp / 100;
    return {value: pawns, min: EVAL_MIN, max: EVAL_MAX, label: formatPawns(pawns)};
  }
  if (wdl) {
    const p = wdlExpected(wdl, whiteToMove);
    return {value: p, min: 0, max: 1, label: `${Math.round(p * 100)}%`};
  }
  return {value: 0, min: EVAL_MIN, max: EVAL_MAX, label: '0.00'};
}
