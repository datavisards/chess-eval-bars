/** Demo helpers — not shipped with the npm package. */

export type Side = "white" | "black";

export interface Wdl {
  win: number;
  draw: number;
  loss: number;
}

export interface CandidateMove {
  move?: string;
  /** Expected score in [0, 1]: p(win) + 0.5 p(draw). */
  score?: number;
  wdl?: Wdl;
}

export interface ChoiceComplexityInput {
  viableMoveCount?: number;
  moveCriticalityIndex?: number | null;
  moveStability?: number;
  forced?: boolean;
  moves?: CandidateMove[];
  leadingMovesByCheckpoint?: string[];
  delta?: number;
  k?: number;
}

export interface ChoiceComplexityMetrics {
  viableMoveCount: number | null;
  moveCriticalityIndex: number | null;
  moveStability: number | null;
  forced: boolean;
  delta?: number;
  k?: number;
}

export interface ClockInput {
  white: number;
  black: number;
  reference?: number;
  increment?: number;
  delay?: number;
  playerToMove?: Side;
  tau?: number;
  epsilon?: number;
}

export interface TimePressureMetrics {
  white: { absolute: number; relative: number };
  black: { absolute: number; relative: number };
  playerToMove?: Side;
  tau: number;
  reference: number;
  increment?: number;
  delay?: number;
  raw: { white: number; black: number };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeWdl(wdl: Wdl): Wdl {
  const sum = wdl.win + wdl.draw + wdl.loss;
  if (sum <= 0) return { win: 0, draw: 1, loss: 0 };
  if (sum > 1.5) {
    return {
      win: wdl.win / sum,
      draw: wdl.draw / sum,
      loss: wdl.loss / sum,
    };
  }
  return wdl;
}

function expectedScore(wdl: Wdl): number {
  const n = normalizeWdl(wdl);
  return n.win + 0.5 * n.draw;
}

const DEFAULT_DELTA = 0.03;
const DEFAULT_TAU = 10;
const DEFAULT_EPSILON = 0.1;

function moveExpectedScore(move: CandidateMove): number | null {
  if (typeof move.score === "number" && Number.isFinite(move.score)) {
    return clamp(move.score, 0, 1);
  }
  if (move.wdl) {
    return clamp(expectedScore(normalizeWdl(move.wdl)), 0, 1);
  }
  return null;
}

function viableMoveCount(
  scores: number[],
  delta: number = DEFAULT_DELTA,
  k?: number,
): number {
  if (scores.length === 0) return 0;
  const inspected = typeof k === "number" ? scores.slice(0, k) : scores;
  const best = inspected[0];
  return inspected.filter((s) => best - s <= delta + 1e-10).length;
}

function moveCriticalityIndex(scores: number[]): number | null {
  if (scores.length <= 1) return null;
  return Math.max(0, scores[0] - scores[1]);
}

function moveStability(leadingMoves: string[]): number | null {
  if (leadingMoves.length === 0) return null;
  const counts = new Map<string, number>();
  for (const move of leadingMoves) {
    counts.set(move, (counts.get(move) ?? 0) + 1);
  }
  let modal = 0;
  for (const n of counts.values()) modal = Math.max(modal, n);
  return modal / leadingMoves.length;
}

function absoluteTimePressure(
  remaining: number,
  reference: number,
  tau: number = DEFAULT_TAU,
): number {
  const tRef = Math.max(reference, 1e-9);
  const t = clamp(remaining, 0, tRef);
  const num = Math.log(1 + t / tau);
  const den = Math.log(1 + tRef / tau);
  if (den === 0) return remaining <= 0 ? 1 : 0;
  return clamp(1 - num / den, 0, 1);
}

function relativeTimePressure(
  player: number,
  opponent: number,
  epsilon: number = DEFAULT_EPSILON,
): number {
  return (opponent - player) / (opponent + player + epsilon);
}

export function clockShare(white: number, black: number): number {
  return white / Math.max(white + black, 1e-6);
}

export function computeChoiceComplexity(input: ChoiceComplexityInput = {}): ChoiceComplexityMetrics {
  const delta = input.delta ?? DEFAULT_DELTA;
  const scores = (input.moves ?? [])
    .map(moveExpectedScore)
    .filter((s): s is number => s !== null)
    .sort((a, b) => b - a);

  const forced = input.forced ?? scores.length === 1;

  const fromMoves = scores.length > 0;
  const nViable = fromMoves
    ? viableMoveCount(scores, delta, input.k)
    : (input.viableMoveCount ?? null);
  const mci = fromMoves
    ? moveCriticalityIndex(scores)
    : (input.moveCriticalityIndex ?? null);
  const ms =
    input.leadingMovesByCheckpoint && input.leadingMovesByCheckpoint.length > 0
      ? moveStability(input.leadingMovesByCheckpoint)
      : (input.moveStability ?? null);

  return {
    viableMoveCount: nViable,
    moveCriticalityIndex: forced && mci === null ? null : mci,
    moveStability: ms,
    forced: Boolean(forced && (scores.length <= 1 || input.forced)),
    delta,
    k: input.k,
  };
}

export function computeTimePressure(clocks: ClockInput): TimePressureMetrics {
  const tau = clocks.tau ?? DEFAULT_TAU;
  const epsilon = clocks.epsilon ?? DEFAULT_EPSILON;
  const reference =
    clocks.reference ?? Math.max(clocks.white, clocks.black, 1);

  const pair = (player: number, opponent: number) => ({
    absolute: absoluteTimePressure(player, reference, tau),
    relative: relativeTimePressure(player, opponent, epsilon),
  });

  return {
    white: pair(clocks.white, clocks.black),
    black: pair(clocks.black, clocks.white),
    playerToMove: clocks.playerToMove,
    tau,
    reference,
    increment: clocks.increment,
    delay: clocks.delay,
    raw: { white: clocks.white, black: clocks.black },
  };
}
