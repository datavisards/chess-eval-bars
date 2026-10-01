import type { MapFn, ThicknessShare } from "./types";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

interface EncodeOpts {
  map?: MapFn;
  reverse?: boolean;
}

export function normalize(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 0.5;
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!(hi > lo)) return 0.5;
  return clamp((value - lo) / (hi - lo), 0, 1);
}

export function encode(value: number, min = 0, max = 1, opts?: EncodeOpts): number {
  let t = normalize(value, min, max);
  if (opts?.map) t = clamp(opts.map(t), 0, 1);
  if (opts?.reverse) t = 1 - t;
  return t;
}

export function encodeShare(
  input: ThicknessShare | undefined,
  fallback = 1,
  opts?: EncodeOpts,
): number {
  if (input === undefined) return fallback;
  const reading = typeof input === "number" ? {value: input} : input;
  return encode(reading.value, reading.min ?? 0, reading.max ?? 1, opts);
}

export function zeroLineAt(min = 0, max = 1, opts?: EncodeOpts): number | undefined {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!(lo < 0 && hi > 0)) return undefined;
  return encode(0, min, max, opts);
}
