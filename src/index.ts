import { attachEvalBarToBoard, createEvalBar } from "./lib/bar";
import { createLayeredBar } from "./lib/frame";
import { installHoverTooltips } from "./lib/tooltip";
import { themes } from "./lib/themes";
import type { ChessEvalBarConfig, EvalBarApi, Theme, ThemeName } from "./lib/types";

function createChessEvalBar(
  container: string | HTMLElement,
  config: ChessEvalBarConfig = {},
): EvalBarApi {
  installHoverTooltips();
  if (config.layers !== undefined || config.slots !== undefined) {
    return createLayeredBar(container, config);
  }
  return createEvalBar(container, config);
}

type ChessEvalBarFn = typeof createChessEvalBar & {
  attachToBoard: typeof attachEvalBarToBoard;
  themes: Record<ThemeName, Theme>;
};

export const ChessEvalBar: ChessEvalBarFn = Object.assign(createChessEvalBar, {
  attachToBoard: attachEvalBarToBoard,
  themes,
});

export type {
  AttachSide,
  BarEncoding,
  BarLayer,
  ChessEvalBarConfig,
  EvalBarApi,
  FrameSlots,
  LabelAnchor,
  LabelConfig,
  LabelPosition,
  LabelRotate,
  LabelSide,
  LayerAnnotations,
  LengthEncoding,
  Orientation,
  Side,
  Theme,
  ThemeName,
  ThicknessEncoding,
} from "./lib/types";
