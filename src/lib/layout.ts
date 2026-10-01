import type { BarLayer, ChessEvalBarConfig } from "./types";

export const DEFAULT_MAX_LENGTH = 400;
export const DEFAULT_MAX_THICKNESS = 28;

export function configuredMaxLength(
  cfg: Pick<ChessEvalBarConfig, "maxLength">,
): number | "auto" | undefined {
  return cfg.maxLength;
}

export function configuredMaxThickness(
  source: Pick<ChessEvalBarConfig, "maxThickness"> | Pick<BarLayer, "maxThickness">,
): number | undefined {
  return source.maxThickness;
}

export function resolveMaxThickness(
  layer?: Pick<BarLayer, "maxThickness">,
  cfg?: Pick<ChessEvalBarConfig, "maxThickness">,
  fallback = DEFAULT_MAX_THICKNESS,
): number {
  return configuredMaxThickness(layer ?? {}) ?? configuredMaxThickness(cfg ?? {}) ?? fallback;
}

export function tracksBoardLength(
  cfg: Pick<ChessEvalBarConfig, "maxLength">,
  hasBoard: boolean,
): boolean {
  const size = configuredMaxLength(cfg);
  return size === "auto" || (size === undefined && hasBoard);
}
